import { ensureBookingPackForAcceptedQuote } from "./crm-booking-pack-d1";
import { getAuthenticatedClientIdentity } from "./client-auth-d1";
import { acceptEnquiry } from "./crm-d1";
import { DEFAULT_CLIENT_PORTAL_ORIGIN } from "./tenant-context";
import { getCrmEmailSettings } from "./crm-email-settings-d1";
import {
  crmEmailDeliveryReadiness,
  sendCrmEmail,
} from "./crm-email-delivery-d1";
import {
  hashCrmEmailEngagementToken,
} from "./crm-email-engagement-d1";


type D1Db = any;

export type QuoteActor = {
  userId?: string;
  email?: string;
  workspaceId: string;
  businessName?: string;
  permissions?: string[];
};

export type QuoteEmailEnv = {
  RESEND_API_KEY?: string;
  WEDPLANNED_AUTH_FROM_EMAIL?: string;
  WEDPLANNED_AUTH_FROM_NAME?: string;
  CLIENT_AUTH_FROM_EMAIL?: string;
  CLIENT_AUTH_FROM_NAME?: string;
  CRM_EMAIL_CREDENTIAL_KEY?: string;
  CRM_GOOGLE_CLIENT_ID?: string;
  CRM_GOOGLE_CLIENT_SECRET?: string;
};

const CLIENT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const INVITATION_TTL_MS = 1000 * 60 * 30;

function text(value: unknown) { return String(value ?? "").trim(); }
function lower(value: unknown) { return text(value).toLowerCase(); }
function integer(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}
function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  return text(value).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}
function safeJson(value: unknown, fallback: any = {}) {
  try { return JSON.parse(text(value) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & { statusCode?: number; details?: string[] };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
function requirePermission(actor: QuoteActor, permission: string) {
  if (!(actor.permissions || []).includes(permission)) throw httpError("You do not have permission to perform this CRM action.", 403);
}
function validEmail(value: unknown) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower(value)); }
function randomToken(bytes = 32) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...values)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function shortCode() { return crypto.randomUUID().replace(/-/g, "").slice(0, 7).toUpperCase(); }
function quoteReference() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `QUO-${day}-${shortCode()}`;
}
function escapeHtml(value: unknown) {
  return text(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}
function currency(value: unknown, fallback = "GBP") {
  const next = text(value || fallback).toUpperCase();
  return /^[A-Z]{3}$/.test(next) ? next : fallback;
}
function quoteType(value: unknown) {
  return text(value) === "fixed"
    ? "fixed"
    : "pick_and_choose";
}
function dateOnly(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  const parsed = new Date(raw.length <= 10 ? `${raw}T12:00:00Z` : raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}
function quoteExpired(value: unknown) {
  const raw = text(value);
  if (!raw) return false;
  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? Date.parse(`${raw}T23:59:59.999Z`) : Date.parse(raw);
  return Number.isFinite(timestamp) && timestamp < Date.now();
}
function hydratePackage(row: any, addonIds: string[] = []) {
  return {
    id: text(row.id), name: text(row.name), serviceType: text(row.service_type), internalCode: text(row.internal_code),
    description: text(row.description), priceAmount: Number(row.price_amount || 0), currency: text(row.currency || "GBP"),
    coverageMinutes: row.coverage_minutes == null ? null : Number(row.coverage_minutes), deliverables: safeJson(row.deliverables_json, []),
    includedItems: safeJson(row.included_items_json, []), clientNotes: text(row.client_notes), displayOrder: Number(row.display_order || 0),
    recommended: Boolean(row.recommended), status: text(row.status), imageUrl: text(row.image_url), addonIds,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function hydrateAddon(row: any) {
  return {
    id: text(row.id), name: text(row.name), description: text(row.description), priceAmount: Number(row.price_amount || 0),
    currency: text(row.currency || "GBP"), serviceType: text(row.service_type), status: text(row.status),
    displayOrder: Number(row.display_order || 0), availabilityScope: text(row.availability_scope || "all"),
    minimumQuantity: Number(row.minimum_quantity || 0), maximumQuantity: Number(row.maximum_quantity || 1),
    requirement: text(row.requirement || "optional"), imageUrl: text(row.image_url),
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function hydrateOption(row: any, items: any[] = [], addons: any[] = []) {
  return {
    id: text(row.id), packageId: text(row.package_id), optionType: text(row.option_type), name: text(row.name),
    description: text(row.description), serviceType: text(row.service_type), internalCode: text(row.internal_code),
    basePriceAmount: Number(row.base_price_amount || 0), currency: text(row.currency || "GBP"),
    coverageMinutes: row.coverage_minutes == null ? null : Number(row.coverage_minutes), deliverables: safeJson(row.deliverables_json, []),
    includedItems: safeJson(row.included_items_json, []), clientNotes: text(row.client_notes), recommended: Boolean(row.recommended),
    displayOrder: Number(row.display_order || 0), imageUrl: text(row.image_url),
    packageSnapshot: safeJson(row.package_snapshot_json, {}),
    items, addons,
  };
}
function hydrateVersion(row: any, options: any[] = []) {
  return {
    id: text(row.id), quoteId: text(row.quote_id), versionNumber: Number(row.version_number || 1),
    previousVersionId: text(row.previous_version_id), status: text(row.status), clientNotes: text(row.client_notes),
    internalNotes: text(row.internal_notes), expiresAt: row.expires_at || "", discountType: text(row.discount_type || "none"),
    discountValue: Number(row.discount_value || 0), taxTreatment: text(row.tax_treatment || "none"),
    taxRateBasisPoints: Number(row.tax_rate_basis_points || 0), subtotalAmount: Number(row.subtotal_amount || 0),
    discountAmount: Number(row.discount_amount || 0), taxAmount: Number(row.tax_amount || 0), totalAmount: Number(row.total_amount || 0),
    currency: text(row.currency || "GBP"), sentAt: row.sent_at || undefined, viewedAt: row.viewed_at || undefined,
    acceptedAt: row.accepted_at || undefined, declinedAt: row.declined_at || undefined,
    provider: text(row.provider), providerMessageId: text(row.provider_message_id), failureReason: text(row.failure_reason),
    snapshot: safeJson(row.snapshot_json, {}), createdAt: row.created_at, updatedAt: row.updated_at, options,
  };
}
function hydrateQuote(row: any, currentVersion: any = null, versions: any[] = []) {
  return {
    id: text(row.id), enquiryId: text(row.enquiry_id), primaryContactId: text(row.primary_contact_id),
    reference: text(row.reference), status: text(row.status), quoteType: quoteType(row.quote_type),
    currentVersionId: text(row.current_version_id),
    acceptedVersionId: text(row.accepted_version_id), acceptedJobId: text(row.accepted_job_id), currency: text(row.currency || "GBP"),
    clientName: text(row.client_name), partnerName: text(row.partner_name), clientEmail: text(row.client_email), eventDate: text(row.event_date), venueText: text(row.venue_text),
    enquiryReference: text(row.enquiry_reference), serviceInterest: text(row.service_interest), createdAt: row.created_at, updatedAt: row.updated_at,
    currentVersion, versions,
  };
}

async function recordActivity(db: D1Db, actor: Partial<QuoteActor>, workspaceId: string, entityType: "enquiry" | "job", entityId: string, eventType: string, summary: string, metadata: any = {}) {
  await db.prepare(`INSERT INTO crm_activities (id, workspace_id, entity_type, entity_id, event_type, summary, actor_user_id, actor_email, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(
    `crm_activity_${crypto.randomUUID()}`, workspaceId, entityType, entityId, eventType, summary, text(actor.userId) || null, lower(actor.email), JSON.stringify(metadata),
  ).run();
}
async function audit(db: D1Db, actor: QuoteActor, eventType: string, entityType: string, entityId: string, summary: string, metadata: any = {}) {
  await db.prepare(`INSERT INTO platform_audit_events (id, workspace_id, actor_user_id, actor_email, event_type, entity_type, entity_id, summary, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(
    `audit_${crypto.randomUUID()}`, actor.workspaceId, text(actor.userId) || null, lower(actor.email), eventType, entityType, entityId, summary, JSON.stringify(metadata),
  ).run();
}

export async function getQuoteCatalogue(db: D1Db, actor: QuoteActor) {
  requirePermission(actor, "crm:read");
  const [packageRows, addonRows, linkRows] = await Promise.all([
    db.prepare(`SELECT * FROM crm_packages WHERE workspace_id = ? ORDER BY status = 'archived', display_order, name COLLATE NOCASE`).bind(actor.workspaceId).all(),
    db.prepare(`SELECT * FROM crm_addons WHERE workspace_id = ? ORDER BY status = 'archived', display_order, name COLLATE NOCASE`).bind(actor.workspaceId).all(),
    db.prepare(`SELECT package_id, addon_id FROM crm_package_addons WHERE workspace_id = ?`).bind(actor.workspaceId).all(),
  ]);
  const links = new Map<string, string[]>();
  for (const row of linkRows.results || []) links.set(text(row.package_id), [...(links.get(text(row.package_id)) || []), text(row.addon_id)]);
  return {
    packages: (packageRows.results || []).map((row: any) => hydratePackage(row, links.get(text(row.id)) || [])),
    addons: (addonRows.results || []).map(hydrateAddon),
  };
}

export async function savePackage(db: D1Db, actor: QuoteActor, packageIdInput: unknown, input: any) {
  requirePermission(actor, "crm:manage");
  const packageId = text(packageIdInput) || `crm_package_${crypto.randomUUID()}`;
  const name = text(input?.name);
  if (!name) throw httpError("Enter a package name.");
  const status = ["active", "hidden", "archived"].includes(text(input?.status)) ? text(input.status) : "active";
  const row = await db.prepare(`SELECT id FROM crm_packages WHERE id = ? AND workspace_id = ?`).bind(packageId, actor.workspaceId).first();
  const statements: any[] = [];
  if (row) {
    statements.push(db.prepare(`UPDATE crm_packages SET name = ?, service_type = ?, internal_code = ?, description = ?, price_amount = ?, currency = ?, coverage_minutes = ?, deliverables_json = ?, included_items_json = ?, client_notes = ?, display_order = ?, recommended = ?, status = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(
      name, text(input?.serviceType || "wedding"), text(input?.internalCode), text(input?.description), Math.max(0, integer(input?.priceAmount)), currency(input?.currency), input?.coverageMinutes === null || text(input?.coverageMinutes) === "" ? null : Math.max(0, integer(input?.coverageMinutes)), JSON.stringify(list(input?.deliverables)), JSON.stringify(list(input?.includedItems)), text(input?.clientNotes), integer(input?.displayOrder), input?.recommended ? 1 : 0, status, text(input?.imageUrl), packageId, actor.workspaceId,
    ));
  } else {
    statements.push(db.prepare(`INSERT INTO crm_packages (id, workspace_id, name, service_type, internal_code, description, price_amount, currency, coverage_minutes, deliverables_json, included_items_json, client_notes, display_order, recommended, status, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(
      packageId, actor.workspaceId, name, text(input?.serviceType || "wedding"), text(input?.internalCode), text(input?.description), Math.max(0, integer(input?.priceAmount)), currency(input?.currency), input?.coverageMinutes === null || text(input?.coverageMinutes) === "" ? null : Math.max(0, integer(input?.coverageMinutes)), JSON.stringify(list(input?.deliverables)), JSON.stringify(list(input?.includedItems)), text(input?.clientNotes), integer(input?.displayOrder), input?.recommended ? 1 : 0, status, text(input?.imageUrl),
    ));
  }
  statements.push(db.prepare(`DELETE FROM crm_package_addons WHERE workspace_id = ? AND package_id = ?`).bind(actor.workspaceId, packageId));
  for (const addonId of Array.isArray(input?.addonIds) ? input.addonIds.map(text).filter(Boolean) : []) {
    const addon = await db.prepare(`SELECT id FROM crm_addons WHERE id = ? AND workspace_id = ?`).bind(addonId, actor.workspaceId).first();
    if (!addon) throw httpError("One selected add-on does not belong to this business.", 409);
    statements.push(db.prepare(`INSERT INTO crm_package_addons (workspace_id, package_id, addon_id) VALUES (?, ?, ?)`).bind(actor.workspaceId, packageId, addonId));
  }
  await db.batch(statements);
  await audit(db, actor, row ? "crm.package.updated" : "crm.package.created", "crm_package", packageId, `${row ? "Updated" : "Created"} package ${name}.`, { status });
  const catalogue = await getQuoteCatalogue(db, { ...actor, permissions: [...new Set([...(actor.permissions || []), "crm:read"])] });
  return catalogue.packages.find((item: any) => item.id === packageId);
}

export async function saveAddon(db: D1Db, actor: QuoteActor, addonIdInput: unknown, input: any) {
  requirePermission(actor, "crm:manage");
  const addonId = text(addonIdInput) || `crm_addon_${crypto.randomUUID()}`;
  const name = text(input?.name);
  if (!name) throw httpError("Enter an add-on name.");
  const minimum = Math.max(0, integer(input?.minimumQuantity));
  const maximum = Math.max(minimum, integer(input?.maximumQuantity, 1));
  const status = ["active", "hidden", "archived"].includes(text(input?.status)) ? text(input.status) : "active";
  const requirement = ["optional", "recommended", "mandatory"].includes(text(input?.requirement)) ? text(input.requirement) : "optional";
  const scope = text(input?.availabilityScope) === "selected" ? "selected" : "all";
  const row = await db.prepare(`SELECT id FROM crm_addons WHERE id = ? AND workspace_id = ?`).bind(addonId, actor.workspaceId).first();
  if (row) {
    await db.prepare(`UPDATE crm_addons SET name = ?, description = ?, price_amount = ?, currency = ?, service_type = ?, status = ?, display_order = ?, availability_scope = ?, minimum_quantity = ?, maximum_quantity = ?, requirement = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(
      name, text(input?.description), Math.max(0, integer(input?.priceAmount)), currency(input?.currency), text(input?.serviceType || "wedding"), status, integer(input?.displayOrder), scope, minimum, maximum, requirement, text(input?.imageUrl), addonId, actor.workspaceId,
    ).run();
  } else {
    await db.prepare(`INSERT INTO crm_addons (id, workspace_id, name, description, price_amount, currency, service_type, status, display_order, availability_scope, minimum_quantity, maximum_quantity, requirement, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(
      addonId, actor.workspaceId, name, text(input?.description), Math.max(0, integer(input?.priceAmount)), currency(input?.currency), text(input?.serviceType || "wedding"), status, integer(input?.displayOrder), scope, minimum, maximum, requirement, text(input?.imageUrl),
    ).run();
  }
  await audit(db, actor, row ? "crm.addon.updated" : "crm.addon.created", "crm_addon", addonId, `${row ? "Updated" : "Created"} add-on ${name}.`, { status, requirement });
  const catalogue = await getQuoteCatalogue(db, { ...actor, permissions: [...new Set([...(actor.permissions || []), "crm:read"])] });
  return catalogue.addons.find((item: any) => item.id === addonId);
}

async function fullVersion(db: D1Db, workspaceId: string, versionId: string) {
  const row = await db.prepare(`SELECT * FROM crm_quote_versions WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(versionId, workspaceId).first();
  if (!row) return null;
  const [optionRows, itemRows, addonRows] = await Promise.all([
    db.prepare(`SELECT * FROM crm_quote_options WHERE workspace_id = ? AND version_id = ? ORDER BY display_order, name COLLATE NOCASE`).bind(workspaceId, versionId).all(),
    db.prepare(`SELECT * FROM crm_quote_option_items WHERE workspace_id = ? AND version_id = ? ORDER BY display_order, created_at`).bind(workspaceId, versionId).all(),
    db.prepare(`SELECT * FROM crm_quote_option_addons WHERE workspace_id = ? AND version_id = ? ORDER BY display_order, name COLLATE NOCASE`).bind(workspaceId, versionId).all(),
  ]);
  const itemsByOption = new Map<string, any[]>();
  for (const item of itemRows.results || []) itemsByOption.set(text(item.option_id), [...(itemsByOption.get(text(item.option_id)) || []), {
    id: text(item.id), itemType: text(item.item_type), name: text(item.name), description: text(item.description), quantity: Number(item.quantity || 1), unitPriceAmount: Number(item.unit_price_amount || 0), displayOrder: Number(item.display_order || 0),
  }]);
  const addonsByOption = new Map<string, any[]>();
  for (const addon of addonRows.results || []) addonsByOption.set(text(addon.option_id), [...(addonsByOption.get(text(addon.option_id)) || []), {
    id: text(addon.id), addonId: text(addon.addon_id), name: text(addon.name), description: text(addon.description), unitPriceAmount: Number(addon.unit_price_amount || 0), currency: text(addon.currency || "GBP"), minimumQuantity: Number(addon.minimum_quantity || 0), maximumQuantity: Number(addon.maximum_quantity || 1), defaultQuantity: Number(addon.default_quantity || 0), requirement: text(addon.requirement || "optional"), displayOrder: Number(addon.display_order || 0), imageUrl: text(addon.image_url), addonSnapshot: safeJson(addon.addon_snapshot_json, {}),
  }]);
  return hydrateVersion(row, (optionRows.results || []).map((option: any) => hydrateOption(option, itemsByOption.get(text(option.id)) || [], addonsByOption.get(text(option.id)) || [])));
}

const QUOTE_SELECT = `SELECT q.*, e.reference AS enquiry_reference, e.event_date, e.venue_text, e.service_interest, c.display_name AS client_name, c.email AS client_email, COALESCE((SELECT partner.display_name FROM crm_enquiry_contacts partner_link JOIN crm_contacts partner ON partner.id = partner_link.contact_id AND partner.workspace_id = partner_link.workspace_id WHERE partner_link.workspace_id = q.workspace_id AND partner_link.enquiry_id = q.enquiry_id AND partner_link.role = 'partner' LIMIT 1), '') AS partner_name FROM crm_quotes q JOIN crm_enquiries e ON e.id = q.enquiry_id AND e.workspace_id = q.workspace_id JOIN crm_contacts c ON c.id = q.primary_contact_id AND c.workspace_id = q.workspace_id`;

async function expireQuotes(db: D1Db, workspaceId: string) {
  await db.batch([
    db.prepare(`UPDATE crm_quote_versions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND status IN ('sent','viewed') AND expires_at IS NOT NULL AND date(expires_at) < date('now')`).bind(workspaceId),
    db.prepare(`UPDATE crm_quotes SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND status IN ('sent','viewed') AND EXISTS (SELECT 1 FROM crm_quote_versions version WHERE version.id = crm_quotes.current_version_id AND version.workspace_id = crm_quotes.workspace_id AND version.status = 'expired')`).bind(workspaceId),
  ]);
}

export async function getQuoteOverview(db: D1Db, actor: QuoteActor) {
  requirePermission(actor, "crm:read");
  await expireQuotes(db, actor.workspaceId);
  const [quotes, catalogue] = await Promise.all([
    db.prepare(`${QUOTE_SELECT} WHERE q.workspace_id = ? ORDER BY q.updated_at DESC`).bind(actor.workspaceId).all(),
    getQuoteCatalogue(db, actor),
  ]);
  const hydrated = [];
  for (const row of quotes.results || []) hydrated.push(hydrateQuote(row, text(row.current_version_id) ? await fullVersion(db, actor.workspaceId, text(row.current_version_id)) : null));
  return { quotes: hydrated, ...catalogue };
}

export async function getQuote(db: D1Db, actor: QuoteActor, quoteId: string) {
  requirePermission(actor, "crm:read");
  await expireQuotes(db, actor.workspaceId);
  const row = await db.prepare(`${QUOTE_SELECT} WHERE q.workspace_id = ? AND q.id = ? LIMIT 1`).bind(actor.workspaceId, quoteId).first();
  if (!row) throw httpError("Quote not found.", 404);
  const versions = await db.prepare(`SELECT id FROM crm_quote_versions WHERE workspace_id = ? AND quote_id = ? ORDER BY version_number DESC`).bind(actor.workspaceId, quoteId).all();
  const hydratedVersions = [];
  for (const version of versions.results || []) hydratedVersions.push(await fullVersion(db, actor.workspaceId, text(version.id)));
  return hydrateQuote(row, hydratedVersions.find((item: any) => item?.id === text(row.current_version_id)) || null, hydratedVersions.filter(Boolean));
}

async function primaryContactForEnquiry(db: D1Db, workspaceId: string, enquiryId: string) {
  return db.prepare(`SELECT c.* FROM crm_enquiry_contacts link JOIN crm_contacts c ON c.id = link.contact_id AND c.workspace_id = link.workspace_id WHERE link.workspace_id = ? AND link.enquiry_id = ? AND link.role = 'primary' LIMIT 1`).bind(workspaceId, enquiryId).first();
}

export async function createQuote(db: D1Db, actor: QuoteActor, input: any) {
  requirePermission(actor, "crm:manage");
  const enquiryId = text(input?.enquiryId);
  const enquiry = await db.prepare(`SELECT * FROM crm_enquiries WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(enquiryId, actor.workspaceId).first();
  if (!enquiry) throw httpError("Enquiry not found.", 404);
  if (text(enquiry.accepted_job_id)) throw httpError("This enquiry has already been converted to a Job.", 409);
  const existingQuote = await db.prepare(`${QUOTE_SELECT} WHERE q.workspace_id = ? AND q.enquiry_id = ? LIMIT 1`).bind(actor.workspaceId, enquiryId).first();
  if (existingQuote) return getQuote(db, { ...actor, permissions: [...new Set([...(actor.permissions || []), "crm:read"])] }, text(existingQuote.id));
  const contact = await primaryContactForEnquiry(db, actor.workspaceId, enquiryId);
  if (!contact) throw httpError("A primary client is required before creating a quote.", 409);
  const quoteId = `crm_quote_${crypto.randomUUID()}`;
  const versionId = `crm_quote_version_${crypto.randomUUID()}`;
  const reference = quoteReference();
  const quoteCurrency = currency(input?.currency || enquiry.currency || "GBP");
  const quoteTypeValue = quoteType(input?.quoteType);
  await db.batch([
    db.prepare(`INSERT INTO crm_quotes (id, workspace_id, enquiry_id, primary_contact_id, reference, status, quote_type, currency, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(quoteId, actor.workspaceId, enquiryId, contact.id, reference, quoteTypeValue, quoteCurrency, text(actor.userId) || null),
    db.prepare(`INSERT INTO crm_quote_versions (id, workspace_id, quote_id, version_number, status, currency, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, 1, 'draft', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(versionId, actor.workspaceId, quoteId, quoteCurrency, text(actor.userId) || null),
    db.prepare(`UPDATE crm_quotes SET current_version_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(versionId, quoteId, actor.workspaceId),
  ]);
  await recordActivity(db, actor, actor.workspaceId, "enquiry", enquiryId, "quote.created", `Created quote ${reference}.`, { quoteId, versionId });
  await audit(db, actor, "crm.quote.created", "crm_quote", quoteId, `Created quote ${reference}.`, { enquiryId, versionId });
  return getQuote(db, { ...actor, permissions: [...new Set([...(actor.permissions || []), "crm:read"])] }, quoteId);
}

function percentageDiscount(subtotal: number, value: number) { return Math.round(subtotal * Math.min(10000, Math.max(0, value)) / 10000); }
function totals(subtotal: number, discountType: string, discountValue: number, taxTreatment: string, taxRateBasisPoints: number) {
  const discount = discountType === "fixed" ? Math.min(subtotal, Math.max(0, discountValue)) : discountType === "percentage" ? percentageDiscount(subtotal, discountValue) : 0;
  const discounted = Math.max(0, subtotal - discount);
  const rate = Math.max(0, taxRateBasisPoints) / 10000;
  const tax = taxTreatment === "exclusive" ? Math.round(discounted * rate) : taxTreatment === "inclusive" && rate > 0 ? Math.round(discounted - discounted / (1 + rate)) : 0;
  return { subtotal, discount, tax, total: taxTreatment === "exclusive" ? discounted + tax : discounted };
}

async function packageRow(db: D1Db, workspaceId: string, packageId: string) {
  return db.prepare(`SELECT * FROM crm_packages WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(packageId, workspaceId).first();
}
async function addonRowsForOption(db: D1Db, workspaceId: string, packageId: string, requestedIds: string[], existingOptionId = "", versionId = "") {
  const [rows, links, existingRows] = await Promise.all([
    db.prepare(`SELECT * FROM crm_addons WHERE workspace_id = ? ORDER BY display_order, name COLLATE NOCASE`).bind(workspaceId).all(),
    packageId ? db.prepare(`SELECT addon_id FROM crm_package_addons WHERE workspace_id = ? AND package_id = ?`).bind(workspaceId, packageId).all() : Promise.resolve({ results: [] }),
    existingOptionId ? db.prepare(`SELECT addon_id FROM crm_quote_option_addons WHERE workspace_id = ? AND version_id = ? AND option_id = ?`).bind(workspaceId, versionId, existingOptionId).all() : Promise.resolve({ results: [] }),
  ]);
  const requested = new Set(requestedIds);
  const linked = new Set((links.results || []).map((row: any) => text(row.addon_id)));
  const existing = new Set((existingRows.results || []).map((row: any) => text(row.addon_id)));
  return (rows.results || []).filter((row: any) => {
    const addonId = text(row.id);
    const eligible = text(row.availability_scope) === "all" || linked.has(addonId);
    const active = text(row.status) === "active";
    return (requested.has(addonId) && ((active && eligible) || existing.has(addonId))) || (active && eligible && text(row.requirement) === "mandatory");
  });
}

export async function saveQuoteDraft(db: D1Db, actor: QuoteActor, quoteId: string, input: any) {
  requirePermission(actor, "crm:manage");
  const quote = await db.prepare(`SELECT * FROM crm_quotes WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(quoteId, actor.workspaceId).first();
  if (!quote) throw httpError("Quote not found.", 404);
  const version = await db.prepare(`SELECT * FROM crm_quote_versions WHERE id = ? AND quote_id = ? AND workspace_id = ? LIMIT 1`).bind(quote.current_version_id, quoteId, actor.workspaceId).first();
  if (!version) throw httpError("Current quote version not found.", 409);
  if (text(version.status) !== "draft") throw httpError("A sent quote cannot be edited. Create a new revision first.", 409);
  const quoteCurrency = currency(input?.currency || quote.currency || "GBP");
  const quoteTypeValue = quoteType(quote.quote_type);
  const options = Array.isArray(input?.options) ? input.options : [];
  if (!options.length) throw httpError("Add at least one package option to the quote.");
  if (quoteTypeValue === "fixed" && options.length !== 1) {
    throw httpError("A fixed quote must contain exactly one package option.");
  }
  const discountType = ["fixed", "percentage"].includes(text(input?.discountType)) ? text(input.discountType) : "none";
  const discountValue = Math.max(0, integer(input?.discountValue));
  const taxTreatment = ["inclusive", "exclusive"].includes(text(input?.taxTreatment)) ? text(input.taxTreatment) : "none";
  const taxRate = Math.max(0, integer(input?.taxRateBasisPoints));
  const statements: any[] = [
    db.prepare(`DELETE FROM crm_quote_option_addons WHERE workspace_id = ? AND version_id = ?`).bind(actor.workspaceId, version.id),
    db.prepare(`DELETE FROM crm_quote_option_items WHERE workspace_id = ? AND version_id = ?`).bind(actor.workspaceId, version.id),
    db.prepare(`DELETE FROM crm_quote_options WHERE workspace_id = ? AND version_id = ?`).bind(actor.workspaceId, version.id),
  ];
  const snapshotOptions: any[] = [];
  let lowestSubtotal: number | null = null;
  for (let index = 0; index < options.length; index += 1) {
    const inputOption = options[index] || {};
    const optionId = `crm_quote_option_${crypto.randomUUID()}`;
    const packageId = text(inputOption.packageId);
    const catalogue = packageId ? await packageRow(db, actor.workspaceId, packageId) : null;
    if (packageId && !catalogue) throw httpError("A selected package is unavailable or belongs to another business.", 409);
    if (catalogue && text(catalogue.status) !== "active") {
      const existingOptionId = text(inputOption.id);
      const existingOption = existingOptionId ? await db.prepare(`SELECT id FROM crm_quote_options WHERE id = ? AND workspace_id = ? AND version_id = ? AND package_id = ? LIMIT 1`).bind(existingOptionId, actor.workspaceId, version.id, packageId).first() : null;
      if (!existingOption) throw httpError("A hidden or archived package cannot be newly added to a quote.", 409);
    }
    const optionType = catalogue ? "catalogue" : "bespoke";
    const name = text(inputOption.name || catalogue?.name);
    if (!name) throw httpError(`Package option ${index + 1} needs a name.`);
    const basePrice = Math.max(0, integer(inputOption.basePriceAmount ?? catalogue?.price_amount));
    const optionSnapshot = {
      source: optionType, packageId: catalogue ? text(catalogue.id) : null, name, description: text(inputOption.description ?? catalogue?.description),
      serviceType: text(inputOption.serviceType ?? catalogue?.service_type ?? "wedding"), internalCode: text(inputOption.internalCode ?? catalogue?.internal_code),
      basePriceAmount: basePrice, currency: quoteCurrency, coverageMinutes: inputOption.coverageMinutes ?? catalogue?.coverage_minutes ?? null,
      deliverables: list(inputOption.deliverables ?? safeJson(catalogue?.deliverables_json, [])), includedItems: list(inputOption.includedItems ?? safeJson(catalogue?.included_items_json, [])),
      clientNotes: text(inputOption.clientNotes ?? catalogue?.client_notes),
      imageUrl: text(inputOption.imageUrl ?? catalogue?.image_url),
      recommended: Boolean(inputOption.recommended ?? catalogue?.recommended), displayOrder: integer(inputOption.displayOrder, (index + 1) * 10),
    };
    statements.push(db.prepare(`INSERT INTO crm_quote_options (id, workspace_id, version_id, package_id, option_type, name, description, service_type, internal_code, base_price_amount, currency, coverage_minutes, deliverables_json, included_items_json, client_notes, image_url, recommended, display_order, package_snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(
      optionId, actor.workspaceId, version.id, catalogue ? catalogue.id : null, optionType, optionSnapshot.name, optionSnapshot.description, optionSnapshot.serviceType, optionSnapshot.internalCode, basePrice, quoteCurrency, optionSnapshot.coverageMinutes, JSON.stringify(optionSnapshot.deliverables), JSON.stringify(optionSnapshot.includedItems), optionSnapshot.clientNotes, optionSnapshot.imageUrl, optionSnapshot.recommended ? 1 : 0, optionSnapshot.displayOrder, JSON.stringify(optionSnapshot),
    ));
    let optionSubtotal = basePrice;
    const snapshotItems: any[] = [];
    for (const [itemIndex, item] of (Array.isArray(inputOption.items) ? inputOption.items : []).entries()) {
      const quantity = Math.max(1, integer(item?.quantity, 1));
      const unitPrice = Math.max(0, integer(item?.unitPriceAmount));
      const itemName = text(item?.name);
      if (!itemName) continue;
      const itemSnapshot = { name: itemName, description: text(item?.description), quantity, unitPriceAmount: unitPrice, displayOrder: integer(item?.displayOrder, (itemIndex + 1) * 10) };
      snapshotItems.push(itemSnapshot);
      optionSubtotal += quantity * unitPrice;
      statements.push(db.prepare(`INSERT INTO crm_quote_option_items (id, workspace_id, version_id, option_id, item_type, name, description, quantity, unit_price_amount, display_order, snapshot_json, created_at) VALUES (?, ?, ?, ?, 'custom', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(
        `crm_quote_item_${crypto.randomUUID()}`, actor.workspaceId, version.id, optionId, itemSnapshot.name, itemSnapshot.description, quantity, unitPrice, itemSnapshot.displayOrder, JSON.stringify(itemSnapshot),
      ));
    }
    const requestedAddonIds =
      quoteTypeValue === "fixed"
        ? []
        : Array.isArray(inputOption.addonIds)
          ? inputOption.addonIds.map(text)
          : [];

    const selectedAddonRows =
      await addonRowsForOption(
        db,
        actor.workspaceId,
        catalogue
          ? text(catalogue.id)
          : "",
        requestedAddonIds,
        text(inputOption.id),
        text(version.id),
      );
    const snapshotAddons: any[] = [];
    for (const addon of selectedAddonRows) {
      const minimum = Number(addon.minimum_quantity || 0);
      const maximum = Number(addon.maximum_quantity || 1);
      const defaultQuantity = text(addon.requirement) === "mandatory" ? Math.max(1, minimum) : 0;
      const addonSnapshot = { addonId: text(addon.id), name: text(addon.name), description: text(addon.description), unitPriceAmount: Number(addon.price_amount || 0), currency: quoteCurrency, minimumQuantity: minimum, maximumQuantity: maximum, defaultQuantity, requirement: text(addon.requirement), displayOrder: Number(addon.display_order || 0), imageUrl: text(addon.image_url) };
      snapshotAddons.push(addonSnapshot);
      if (text(addon.requirement) === "mandatory") optionSubtotal += addonSnapshot.unitPriceAmount * defaultQuantity;
      statements.push(db.prepare(`INSERT INTO crm_quote_option_addons (id, workspace_id, version_id, option_id, addon_id, name, description, unit_price_amount, currency, minimum_quantity, maximum_quantity, default_quantity, requirement, display_order, image_url, addon_snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(
        `crm_quote_addon_${crypto.randomUUID()}`, actor.workspaceId, version.id, optionId, addon.id, addonSnapshot.name, addonSnapshot.description, addonSnapshot.unitPriceAmount, quoteCurrency, minimum, maximum, defaultQuantity, addonSnapshot.requirement, addonSnapshot.displayOrder, addonSnapshot.imageUrl, JSON.stringify(addonSnapshot),
      ));
    }
    lowestSubtotal = lowestSubtotal == null ? optionSubtotal : Math.min(lowestSubtotal, optionSubtotal);
    snapshotOptions.push({ ...optionSnapshot, id: optionId, items: snapshotItems, addons: snapshotAddons, subtotalAmount: optionSubtotal });
  }
  const representative = totals(lowestSubtotal || 0, discountType, discountValue, taxTreatment, taxRate);
  const existingVersionSnapshot =
    safeJson(
      version.snapshot_json,
      {},
    );

  const bookingPackDraft =
    await normaliseQuoteBookingPackDraft(
      db,
      actor.workspaceId,
      input?.bookingPack,
      existingVersionSnapshot
        ?.bookingPackDraft,
    );

  const versionSnapshot = { quoteId, versionId: text(version.id), versionNumber: Number(version.version_number || 1), quoteType: quoteTypeValue, options: snapshotOptions, discountType, discountValue, taxTreatment, taxRateBasisPoints: taxRate, currency: quoteCurrency, clientNotes: text(input?.clientNotes), expiresAt: dateOnly(input?.expiresAt) || null, template: input?.templateSnapshot && typeof input.templateSnapshot === "object" ? input.templateSnapshot : null, ...(bookingPackDraft ? { bookingPackDraft } : {}) };
  statements.push(db.prepare(`UPDATE crm_quote_versions SET client_notes = ?, internal_notes = ?, expires_at = ?, discount_type = ?, discount_value = ?, tax_treatment = ?, tax_rate_basis_points = ?, subtotal_amount = ?, discount_amount = ?, tax_amount = ?, total_amount = ?, currency = ?, snapshot_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND status = 'draft'`).bind(
    text(input?.clientNotes), text(input?.internalNotes), dateOnly(input?.expiresAt) || null, discountType, discountValue, taxTreatment, taxRate, representative.subtotal, representative.discount, representative.tax, representative.total, quoteCurrency, JSON.stringify(versionSnapshot), version.id, actor.workspaceId,
  ));
  statements.push(db.prepare(`UPDATE crm_quotes SET currency = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(quoteCurrency, quoteId, actor.workspaceId));
  await db.batch(statements);
  await recordActivity(db, actor, actor.workspaceId, "enquiry", text(quote.enquiry_id), "quote.updated", `Updated quote ${text(quote.reference)} version ${Number(version.version_number || 1)}.`, { quoteId, versionId: version.id });
  return getQuote(db, { ...actor, permissions: [...new Set([...(actor.permissions || []), "crm:read"])] }, quoteId);
}

export async function reviseQuote(db: D1Db, actor: QuoteActor, quoteId: string) {
  requirePermission(actor, "crm:manage");
  const quote = await db.prepare(`SELECT * FROM crm_quotes WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(quoteId, actor.workspaceId).first();
  if (!quote) throw httpError("Quote not found.", 404);
  const current = await fullVersion(db, actor.workspaceId, text(quote.current_version_id));
  if (!current) throw httpError("Current quote version not found.", 409);
  if (current.status === "accepted") throw httpError("An accepted quote cannot be revised.", 409);
  if (current.status === "draft") return getQuote(db, { ...actor, permissions: [...new Set([...(actor.permissions || []), "crm:read"])] }, quoteId);
  const newVersionId = `crm_quote_version_${crypto.randomUUID()}`;
  const nextNumber = current.versionNumber + 1;
  await db.batch([
    db.prepare(`UPDATE crm_quote_versions SET status = 'superseded', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND status IN ('sent','viewed','declined','expired')`).bind(current.id, actor.workspaceId),
    db.prepare(`INSERT INTO crm_quote_versions (id, workspace_id, quote_id, version_number, previous_version_id, status, client_notes, internal_notes, expires_at, discount_type, discount_value, tax_treatment, tax_rate_basis_points, subtotal_amount, discount_amount, tax_amount, total_amount, currency, snapshot_json, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(
      newVersionId, actor.workspaceId, quoteId, nextNumber, current.id, current.clientNotes, current.internalNotes, current.expiresAt || null, current.discountType, current.discountValue, current.taxTreatment, current.taxRateBasisPoints, current.subtotalAmount, current.discountAmount, current.taxAmount, current.totalAmount, current.currency, JSON.stringify(quoteRevisionSnapshot(current.snapshot, newVersionId, nextNumber, current.id)), text(actor.userId) || null,
    ),
    db.prepare(`UPDATE crm_quotes SET current_version_id = ?, status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(newVersionId, quoteId, actor.workspaceId),
  ]);
  const statements: any[] = [];
  for (const option of current.options) {
    const optionId = `crm_quote_option_${crypto.randomUUID()}`;
    statements.push(db.prepare(`INSERT INTO crm_quote_options (id, workspace_id, version_id, package_id, option_type, name, description, service_type, internal_code, base_price_amount, currency, coverage_minutes, deliverables_json, included_items_json, client_notes, recommended, display_order, package_snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(
      optionId, actor.workspaceId, newVersionId, option.packageId || null, option.optionType, option.name, option.description, option.serviceType, option.internalCode, option.basePriceAmount, option.currency, option.coverageMinutes, JSON.stringify(option.deliverables), JSON.stringify(option.includedItems), option.clientNotes, option.recommended ? 1 : 0, option.displayOrder, JSON.stringify(option.packageSnapshot),
    ));
    for (const item of option.items) statements.push(db.prepare(`INSERT INTO crm_quote_option_items (id, workspace_id, version_id, option_id, item_type, name, description, quantity, unit_price_amount, display_order, snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(
      `crm_quote_item_${crypto.randomUUID()}`, actor.workspaceId, newVersionId, optionId, item.itemType || "custom", item.name, item.description, item.quantity, item.unitPriceAmount, item.displayOrder, JSON.stringify(item),
    ));
    for (const addon of option.addons) statements.push(db.prepare(`INSERT INTO crm_quote_option_addons (id, workspace_id, version_id, option_id, addon_id, name, description, unit_price_amount, currency, minimum_quantity, maximum_quantity, default_quantity, requirement, display_order, addon_snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(
      `crm_quote_addon_${crypto.randomUUID()}`, actor.workspaceId, newVersionId, optionId, addon.addonId || null, addon.name, addon.description, addon.unitPriceAmount, addon.currency, addon.minimumQuantity, addon.maximumQuantity, addon.defaultQuantity, addon.requirement, addon.displayOrder, JSON.stringify(addon.addonSnapshot || addon),
    ));
  }
  if (statements.length) await db.batch(statements);
  await recordActivity(db, actor, actor.workspaceId, "enquiry", text(quote.enquiry_id), "quote.revised", `Created quote ${text(quote.reference)} version ${nextNumber}.`, { quoteId, versionId: newVersionId, previousVersionId: current.id });
  await audit(db, actor, "crm.quote.revised", "crm_quote", quoteId, `Created version ${nextNumber} of ${text(quote.reference)}.`, { previousVersionId: current.id, versionId: newVersionId });
  return getQuote(db, { ...actor, permissions: [...new Set([...(actor.permissions || []), "crm:read"])] }, quoteId);
}

async function portalOrigin(db: D1Db, workspaceId: string) {
  const domain = await db.prepare(`SELECT hostname FROM workspace_domains WHERE workspace_id = ? AND purpose = 'public' AND verified = 1 ORDER BY created_at DESC LIMIT 1`).bind(workspaceId).first();
  const hostname = lower(domain?.hostname).replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (hostname && !hostname.includes("admin")) return `https://${hostname}`;
  return DEFAULT_CLIENT_PORTAL_ORIGIN;
}
async function ensureIdentity(db: D1Db, workspaceId: string, contact: any) {
  const email = lower(contact.email);
  if (!validEmail(email)) throw httpError("The primary client needs a valid email address before the quote can be sent.", 409);
  const existing = await db.prepare(`SELECT * FROM client_identities WHERE workspace_id = ? AND email_normalized = ? LIMIT 1`).bind(workspaceId, email).first();
  if (existing) {
    await db.prepare(`UPDATE client_identities SET email = ?, display_name = ?, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(email, text(contact.display_name), existing.id).run();
    return existing;
  }
  const id = `client_identity_${crypto.randomUUID()}`;
  await db.prepare(`INSERT INTO client_identities (id, workspace_id, email_normalized, email, display_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(id, workspaceId, email, email, text(contact.display_name)).run();
  return { id, email, email_normalized: email, display_name: text(contact.display_name) };
}
async function createInvitation(db: D1Db, workspaceId: string, quote: any, version: any, contact: any, identity: any) {
  const rawToken = randomToken(32);
  const tokenHash = await sha256(rawToken);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
  const workspace = await db.prepare(`SELECT slug FROM workspaces WHERE id = ? LIMIT 1`).bind(workspaceId).first();
  const query = new URLSearchParams({ workspace: text(workspace?.slug) || workspaceId, quote: text(quote.id) });
  const returnPath = `/client-portal?${query.toString()}`;
  const invitationId = `crm_quote_invitation_${crypto.randomUUID()}`;
  await db.batch([
    db.prepare(`UPDATE crm_quote_invitations SET consumed_at = COALESCE(consumed_at, CURRENT_TIMESTAMP) WHERE workspace_id = ? AND quote_id = ? AND consumed_at IS NULL`).bind(workspaceId, quote.id),
    db.prepare(`UPDATE crm_quote_client_access SET status = 'revoked', revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND quote_id = ? AND identity_id <> ? AND status = 'active'`).bind(workspaceId, quote.id, identity.id),
    db.prepare(`INSERT INTO crm_quote_client_access (quote_id, workspace_id, contact_id, identity_id, status, invited_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(quote_id, identity_id) DO UPDATE SET contact_id = excluded.contact_id, status = 'active', invited_at = CURRENT_TIMESTAMP, revoked_at = NULL, updated_at = CURRENT_TIMESTAMP`).bind(quote.id, workspaceId, contact.id, identity.id),
    db.prepare(`INSERT INTO crm_quote_invitations (id, workspace_id, quote_id, version_id, contact_id, identity_id, token_hash, return_path, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(invitationId, workspaceId, quote.id, version.id, contact.id, identity.id, tokenHash, returnPath, expiresAt),
  ]);
  return { invitationId, rawToken, expiresAt, returnPath };
}
async function sendQuoteEmail(env: QuoteEmailEnv, input: { to: string; businessName: string; clientName: string; reference: string; loginUrl: string; eventDate: string; expiresAt: string }) {
  const apiKey = text(env.RESEND_API_KEY);
  const fromEmail = lower(env.WEDPLANNED_AUTH_FROM_EMAIL || env.CLIENT_AUTH_FROM_EMAIL);
  const fromName = text(env.WEDPLANNED_AUTH_FROM_NAME || env.CLIENT_AUTH_FROM_NAME || input.businessName || "WedPlanned");
  if (!apiKey || !fromEmail) throw httpError("Quote email is not configured. Add RESEND_API_KEY and WEDPLANNED_AUTH_FROM_EMAIL to the public and Admin Pages projects.", 500);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`, to: [input.to], subject: `Your quote ${input.reference} from ${input.businessName}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#151515;max-width:580px;margin:auto"><p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#666">${escapeHtml(input.businessName)}</p><h1 style="font-size:25px;font-weight:600">Your quote is ready</h1><p>Hello ${escapeHtml(input.clientName || "")},</p><p>Review package choices and optional extras for ${escapeHtml(input.eventDate || "your event")}.</p><p style="margin:28px 0"><a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">Review quote</a></p><p style="font-size:12px;color:#777">This one-time sign-in link expires in 30 minutes. The quote remains available in your secure client portal until its stated expiry date.</p></div>`,
      text: `${input.businessName}\n\nYour quote ${input.reference} is ready.\n${input.loginUrl}\n\nThis one-time sign-in link expires in 30 minutes.`,
    }),
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(text(body?.message || body?.error || "Unable to send quote email."), 502);
  return { provider: "resend", providerMessageId: text(body?.id) };
}

function escapeEmailHtml(
  value: unknown,
) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mergeQuoteEmailVariables(
  value: unknown,
  variables:
    Record<string, string>,
) {
  return String(value ?? "").replace(
    /\{\{\s*([a-z_]+)\s*\}\}/gi,
    (
      match,
      key,
    ) => {
      const normalised =
        lower(key);

      return Object.prototype
        .hasOwnProperty.call(
          variables,
          normalised,
        )
        ? variables[normalised]
        : match;
    },
  );
}

function emailSignatureText(
  settings: any,
) {
  if (
    !settings?.signatureEnabled
  ) {
    return "";
  }

  const signature =
    settings?.signature
    && typeof settings.signature
      === "object"
      ? settings.signature
      : {};

  const identity = [
    text(signature.name),
    text(signature.jobTitle),
    text(signature.businessName),
  ].filter(Boolean);

  const contact = [
    text(signature.phone),
    text(signature.website),
  ].filter(Boolean);

  return [
    identity.join(" · "),
    contact.join(" · "),
    text(signature.text),
  ].filter(Boolean).join("\n");
}

function appendEmailSignature(
  body: string,
  signature: string,
) {
  if (!signature) {
    return body;
  }

  return [
    body.trim(),
    signature.trim(),
  ].filter(Boolean).join(
    "\n\n",
  );
}

function finalQuoteEmailBody(
  body: string,
  loginUrl: string,
) {
  const token =
    /\{\{\s*quote_link\s*\}\}/gi;

  if (token.test(body)) {
    return body.replace(
      /\{\{\s*quote_link\s*\}\}/gi,
      loginUrl,
    );
  }

  return `${body.trim()}\n\nReview your quote securely:\n${loginUrl}`;
}

function loggedQuoteEmailBody(
  body: string,
) {
  const token =
    /\{\{\s*quote_link\s*\}\}/gi;

  if (token.test(body)) {
    return body.replace(
      /\{\{\s*quote_link\s*\}\}/gi,
      "[secure quote link]",
    );
  }

  return `${body.trim()}\n\n[secure quote link]`;
}

async function quoteSendEmailContext(
  db: D1Db,
  env: QuoteEmailEnv,
  actor: QuoteActor,
  quoteIdInput: unknown,
  templateIdInput: unknown = "",
) {
  const quoteId =
    text(quoteIdInput);

  const quote =
    await db.prepare(
      `${QUOTE_SELECT}
       WHERE q.workspace_id = ?
         AND q.id = ?
       LIMIT 1`,
    ).bind(
      actor.workspaceId,
      quoteId,
    ).first();

  if (!quote) {
    throw httpError(
      "Quote not found.",
      404,
    );
  }

  const version =
    await fullVersion(
      db,
      actor.workspaceId,
      text(
        quote.current_version_id,
      ),
    );

  if (!version) {
    throw httpError(
      "Current quote version not found.",
      409,
    );
  }

  const [
    workspace,
    templateRows,
    settings,
  ] = await Promise.all([
    db.prepare(`
      SELECT
        COALESCE(
          settings.business_name,
          workspace.name,
          ?
        ) AS business_name
      FROM workspaces workspace
      LEFT JOIN workspace_settings settings
        ON settings.workspace_id =
          workspace.id
      WHERE workspace.id = ?
      LIMIT 1
    `).bind(
      text(
        actor.businessName
        || "WedPlanned",
      ),
      actor.workspaceId,
    ).first(),

    db.prepare(`
      SELECT
        id,
        name,
        subject_template,
        body_text,
        attachments_json,
        append_signature,
        is_default
      FROM crm_email_templates
      WHERE workspace_id = ?
        AND purpose = 'quote'
        AND status = 'active'
      ORDER BY
        is_default DESC,
        name COLLATE NOCASE
    `).bind(
      actor.workspaceId,
    ).all(),

    getCrmEmailSettings(
      db,
      {
        ...actor,
        permissions: [
          ...new Set([
            ...(actor.permissions || []),
            "crm:read",
          ]),
        ],
      },
    ),
  ]);

  const templates =
    templateRows.results || [];

  const requestedTemplateId =
    text(templateIdInput);

  let selectedTemplate:
    any = null;

  if (requestedTemplateId) {
    selectedTemplate =
      templates.find(
        (row: any) =>
          text(row.id)
          === requestedTemplateId,
      );

    if (!selectedTemplate) {
      throw httpError(
        "Choose an active quote email template from this workspace.",
        409,
      );
    }
  } else {
    selectedTemplate =
      templates[0] || null;
  }

  const businessName =
    text(
      workspace?.business_name
      || actor.businessName
      || "WedPlanned",
    );

  const clientName =
    text(
      quote.client_name,
    );

  const firstName =
    clientName
      .split(/\s+/)
      .filter(Boolean)[0]
    || clientName;

  const variables = {
    client_name:
      clientName,
    first_name:
      firstName,
    business_name:
      businessName,
    quote_reference:
      text(quote.reference),
    event_date:
      text(quote.event_date),
    venue:
      text(quote.venue_text),
    expiry_date:
      text(version.expiresAt),
    quote_link:
      "{{quote_link}}",
  };

  const fallbackSubject =
    "Your wedding quote is ready";

  const fallbackBody = [
    "Hi {{first_name}},",
    "",
    "Your wedding quote is ready. You can review your package options and additional extras securely using the link below:",
    "",
    "{{quote_link}}",
    "",
    "If you have any questions, just reply to this email.",
  ].join("\n");

  let subject =
    mergeQuoteEmailVariables(
      text(
        selectedTemplate
          ?.subject_template
        || fallbackSubject,
      ),
      variables,
    );

  let body =
    mergeQuoteEmailVariables(
      text(
        selectedTemplate
          ?.body_text
        || fallbackBody,
      ),
      variables,
    );

  const appendSignature =
    selectedTemplate
      ? Boolean(
          selectedTemplate
            .append_signature,
        )
      : true;

  if (appendSignature) {
    body =
      appendEmailSignature(
        body,
        emailSignatureText(
          settings,
        ),
      );
  }

  const attachments =
    selectedTemplate
      ? safeJson(
          selectedTemplate
            .attachments_json,
          [],
        )
      : [];

  const readiness =
    crmEmailDeliveryReadiness(
      settings,
      env,
      businessName,
    );

  const deliveryMode =
    readiness.deliveryMode;

  const fromName =
    readiness.fromName;

  const fromEmail =
    readiness.fromEmail;

  const replyToEmail =
    readiness.replyToEmail;

  let deliveryReady =
    readiness.deliveryReady;

  let deliveryIssue =
    readiness.deliveryIssue;

  if (
    Array.isArray(attachments)
    && attachments.length
  ) {
    deliveryReady = false;
    deliveryIssue =
      "This template contains attachments. Attachment delivery is not enabled yet.";
  }

  return {
    quote,
    version,
    settings,
    selectedTemplate,
    preview: {
      quoteId:
        text(quote.id),
      reference:
        text(quote.reference),
      to:
        lower(
          quote.client_email,
        ),
      clientName,
      businessName,
      templateId:
        text(
          selectedTemplate?.id,
        ),
      templateName:
        text(
          selectedTemplate?.name
          || "Standard quote email",
        ),
      templates:
        templates.map(
          (row: any) => ({
            id:
              text(row.id),
            name:
              text(row.name),
            default:
              Boolean(
                row.is_default,
              ),
          }),
        ),
      subject,
      body,
      fromName,
      fromEmail,
      replyToEmail,
      deliveryMode,
      providerLabel:
        readiness.providerLabel,
      deliveryReady,
      deliveryIssue,
      secureLinkMergeField:
        "{{quote_link}}",
      attachments:
        Array.isArray(
          attachments,
        )
          ? attachments
          : [],
      attachmentDeliveryReady:
        false,
    },
  };
}


function quoteBookingPackObject(
  value: unknown,
): Record<string, any> {
  if (
    value
    && typeof value === "object"
    && !Array.isArray(value)
  ) {
    return value as Record<string, any>;
  }

  try {
    const parsed =
      JSON.parse(
        text(value) || "{}",
      );

    return (
      parsed
      && typeof parsed === "object"
      && !Array.isArray(parsed)
    )
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function quoteRevisionSnapshot(
  snapshotInput: unknown,
  versionId: string,
  versionNumber: number,
  previousVersionId: string,
) {
  const snapshot = {
    ...quoteBookingPackObject(
      snapshotInput,
    ),
  };

  // A revision starts a fresh commercial decision.
  // Never carry the previous sent booking pack forward
  // as an immutable selection.
  delete snapshot.bookingPack;
  delete snapshot.bookingPackDraft;

  return {
    ...snapshot,
    versionId,
    versionNumber,
    previousVersionId,
  };
}


async function normaliseQuoteBookingPackDraft(
  db: D1Db,
  workspaceId: string,
  input: unknown,
  fallbackInput: unknown,
) {
  const incoming =
    quoteBookingPackObject(input);

  const fallback =
    quoteBookingPackObject(
      fallbackInput,
    );

  const owns = (
    source: Record<string, any>,
    key: string,
  ) =>
    Object.prototype
      .hasOwnProperty.call(
        source,
        key,
      );

  const keys = [
    "contractTemplateId",
    "questionnaireTemplateId",
    "autoCreateInvoice",
    "paymentScheduleId",
  ];

  const supplied =
    keys.some(
      (key) =>
        owns(incoming, key)
        || owns(fallback, key),
    );

  if (!supplied) {
    return null;
  }

  const incomingContract =
    owns(
      incoming,
      "contractTemplateId",
    );

  const incomingQuestionnaire =
    owns(
      incoming,
      "questionnaireTemplateId",
    );

  const incomingPaymentSchedule =
    owns(
      incoming,
      "paymentScheduleId",
    );

  let contractTemplateId =
    text(
      incomingContract
        ? incoming.contractTemplateId
        : fallback.contractTemplateId,
    );

  let questionnaireTemplateId =
    text(
      incomingQuestionnaire
        ? incoming.questionnaireTemplateId
        : fallback
            .questionnaireTemplateId,
    );

  let paymentScheduleId =
    text(
      incomingPaymentSchedule
        ? incoming.paymentScheduleId
        : fallback.paymentScheduleId,
    );

  const autoCreateInvoice =
    Boolean(
      owns(
        incoming,
        "autoCreateInvoice",
      )
        ? incoming.autoCreateInvoice
        : fallback.autoCreateInvoice,
    );

  const [
    contractTemplate,
    questionnaireTemplate,
  ] = await Promise.all([
    contractTemplateId
      ? db.prepare(`
          SELECT id
          FROM crm_contract_templates
          WHERE workspace_id = ?
            AND id = ?
            AND status = 'active'
          LIMIT 1
        `).bind(
          workspaceId,
          contractTemplateId,
        ).first()
      : Promise.resolve(null),

    questionnaireTemplateId
      ? db.prepare(`
          SELECT id
          FROM crm_questionnaire_templates
          WHERE workspace_id = ?
            AND id = ?
            AND status = 'active'
          LIMIT 1
        `).bind(
          workspaceId,
          questionnaireTemplateId,
        ).first()
      : Promise.resolve(null),
  ]);

  const paymentSchedulePreset =
    paymentScheduleId
      ? await db.prepare(`
          SELECT id
          FROM crm_payment_schedule_presets
          WHERE workspace_id = ?
            AND id = ?
            AND status = 'active'
          LIMIT 1
        `).bind(
          workspaceId,
          paymentScheduleId,
        ).first()
      : null;

  if (
    contractTemplateId
    && !contractTemplate
  ) {
    if (incomingContract) {
      throw httpError(
        "Choose an active contract template from this workspace.",
        409,
      );
    }

    contractTemplateId = "";
  }

  if (
    questionnaireTemplateId
    && !questionnaireTemplate
  ) {
    if (incomingQuestionnaire) {
      throw httpError(
        "Choose an active questionnaire template from this workspace.",
        409,
      );
    }

    questionnaireTemplateId = "";
  }

  if (
    paymentScheduleId
    && !paymentSchedulePreset
  ) {
    if (
      incomingPaymentSchedule
    ) {
      throw httpError(
        "Choose an active payment schedule from this workspace.",
        409,
      );
    }

    paymentScheduleId = "";
  }

  return {
    contractTemplateId,
    questionnaireTemplateId,
    autoCreateInvoice,
    paymentScheduleId,
  };
}

async function quoteBookingPackPreview(
  db: D1Db,
  workspaceId: string,
  version: any,
) {
  const snapshot =
    quoteBookingPackObject(
      version?.snapshot,
    );

  const existing =
    quoteBookingPackObject(
      snapshot.bookingPack,
    );

  const draftSelection =
    quoteBookingPackObject(
      snapshot.bookingPackDraft,
    );

  const hasDraftContractTemplateId =
    Object.prototype.hasOwnProperty.call(
      draftSelection,
      "contractTemplateId",
    );

  const hasDraftQuestionnaireTemplateId =
    Object.prototype.hasOwnProperty.call(
      draftSelection,
      "questionnaireTemplateId",
    );

  const hasDraftAutoCreateInvoice =
    Object.prototype.hasOwnProperty.call(
      draftSelection,
      "autoCreateInvoice",
    );

  const hasDraftPaymentScheduleId =
    Object.prototype.hasOwnProperty.call(
      draftSelection,
      "paymentScheduleId",
    );

  const template =
    quoteBookingPackObject(
      snapshot.template,
    );

  const [
    settings,
    contractResult,
    questionnaireResult,
  ] = await Promise.all([
    db.prepare(`
      SELECT *
      FROM crm_booking_settings
      WHERE workspace_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
    ).first(),

    db.prepare(`
      SELECT
        id,
        name
      FROM crm_contract_templates
      WHERE workspace_id = ?
        AND status = 'active'
      ORDER BY
        name COLLATE NOCASE,
        updated_at DESC
    `).bind(
      workspaceId,
    ).all(),

    db.prepare(`
      SELECT
        id,
        name,
        version
      FROM crm_questionnaire_templates
      WHERE workspace_id = ?
        AND status = 'active'
      ORDER BY
        name COLLATE NOCASE,
        updated_at DESC
    `).bind(
      workspaceId,
    ).all(),
  ]);

  const paymentScheduleResult =
    await db.prepare(`
      SELECT
        id,
        name,
        description,
        status,
        is_default,
        deposit_type,
        deposit_value,
        deposit_due_days_after_acceptance,
        final_balance_due_days_before_event,
        sort_order,
        created_at,
        updated_at
      FROM crm_payment_schedule_presets
      WHERE workspace_id = ?
        AND status = 'active'
      ORDER BY
        is_default DESC,
        sort_order,
        name COLLATE NOCASE
    `).bind(
      workspaceId,
    ).all();

  const paymentSchedules =
    (
      paymentScheduleResult.results
      || []
    ).map(
      (row: any) => ({
        id:
          text(row.id),

        name:
          text(row.name),

        description:
          text(row.description),

        status:
          "active" as const,

        default:
          Boolean(
            row.is_default,
          ),

        depositType:
          text(
            row.deposit_type,
          ) || "none",

        depositValue:
          Math.max(
            0,
            Number(
              row.deposit_value
              || 0,
            ),
          ),

        depositDueDaysAfterAcceptance:
          Math.max(
            0,
            Number(
              row
                .deposit_due_days_after_acceptance
              || 0,
            ),
          ),

        finalBalanceDueDaysBeforeEvent:
          Math.max(
            0,
            Number(
              row
                .final_balance_due_days_before_event
              || 0,
            ),
          ),

        sortOrder:
          Number(
            row.sort_order
            || 0,
          ),

        createdAt:
          text(row.created_at),

        updatedAt:
          text(row.updated_at),
      }),
    );

  const contracts =
    (contractResult.results || []).map(
      (row: any) => ({
        id:
          text(row.id),
        name:
          text(row.name),
        version:
          Math.max(
            1,
            Number(
              row.version || 1,
            ),
          ),
      }),
    );

  const questionnaires =
    (
      questionnaireResult.results
      || []
    ).map(
      (row: any) => ({
        id:
          text(row.id),
        name:
          text(row.name),
        version:
          Math.max(
            1,
            Number(
              row.version || 1,
            ),
          ),
      }),
    );

  const frozen =
    Boolean(
      text(existing.frozenAt),
    );

  const frozenContract =
    quoteBookingPackObject(
      existing.contract,
    );

  const frozenQuestionnaire =
    quoteBookingPackObject(
      existing.questionnaire,
    );

  const frozenInvoice =
    quoteBookingPackObject(
      existing.invoice,
    );

  const frozenPaymentSchedule =
    quoteBookingPackObject(
      frozenInvoice.paymentSchedule,
    );

  const templateContractId =
    text(
      template.contractTemplateId,
    );

  const templateQuestionnaireId =
    text(
      template.questionnaireTemplateId,
    );

  const liveContractId =
    Number(
      settings?.auto_create_contract
      || 0,
    ) === 1
      ? text(
          settings
            ?.default_contract_template_id,
        )
      : "";

  const liveQuestionnaireId =
    Number(
      settings
        ?.auto_assign_questionnaire
      || 0,
    ) === 1
      ? text(
          settings
            ?.default_questionnaire_template_id,
        )
      : "";

  const validContractIds =
    new Set(
      contracts.map(
        (item: any) => item.id,
      ),
    );

  const validQuestionnaireIds =
    new Set(
      questionnaires.map(
        (item: any) => item.id,
      ),
    );

  const requestedContractId =
    frozen
      ? text(
          frozenContract.templateId,
        )
      : hasDraftContractTemplateId
        ? text(
            draftSelection
              .contractTemplateId,
          )
        : (
            templateContractId
            || liveContractId
          );

  const requestedQuestionnaireId =
    frozen
      ? text(
          frozenQuestionnaire
            .templateId,
        )
      : hasDraftQuestionnaireTemplateId
        ? text(
            draftSelection
              .questionnaireTemplateId,
          )
        : (
            templateQuestionnaireId
            || liveQuestionnaireId
          );

  const defaultPaymentSchedule =
    paymentSchedules.find(
      (item: any) =>
        item.default,
    )
    || paymentSchedules[0]
    || null;

  const requestedPaymentScheduleId =
    frozen
      ? text(
          frozenPaymentSchedule
            .presetId,
        )
      : hasDraftPaymentScheduleId
        ? text(
            draftSelection
              .paymentScheduleId,
          )
        : text(
            defaultPaymentSchedule
              ?.id,
          );

  const selectedPaymentSchedule =
    frozen
      ? null
      : (
          paymentSchedules.find(
            (item: any) =>
              item.id
              === requestedPaymentScheduleId,
          )
          || null
        );

  const paymentScheduleId =
    frozen
      ? requestedPaymentScheduleId
      : text(
          selectedPaymentSchedule
            ?.id,
        );

  const contractTemplateId =
    frozen
      ? requestedContractId
      : (
          validContractIds.has(
            requestedContractId,
          )
            ? requestedContractId
            : ""
        );

  const questionnaireTemplateId =
    frozen
      ? requestedQuestionnaireId
      : (
          validQuestionnaireIds.has(
            requestedQuestionnaireId,
          )
            ? requestedQuestionnaireId
            : ""
        );

  const draftInvoiceSetting =
    hasDraftAutoCreateInvoice
      ? Boolean(
          draftSelection
            .autoCreateInvoice,
        )
      : null;

  const templateInvoiceSetting =
    typeof template
      .autoCreateInvoice
      === "boolean"
      ? template.autoCreateInvoice
      : null;

  const autoCreateInvoice =
    frozen
      ? Boolean(
          frozenInvoice.enabled,
        )
      : draftInvoiceSetting
        ?? templateInvoiceSetting
        ?? (
          Number(
            settings
              ?.auto_create_invoice
            || 0,
          ) === 1
        );

  const paymentSchedule =
    quoteBookingPackObject(
      frozen
        ? frozenInvoice
            .paymentSchedule
        : selectedPaymentSchedule
          ? {
              presetId:
                selectedPaymentSchedule.id,

              name:
                selectedPaymentSchedule.name,

              depositType:
                selectedPaymentSchedule.depositType,

              depositValue:
                selectedPaymentSchedule.depositValue,

              depositDueDaysAfterAcceptance:
                selectedPaymentSchedule
                  .depositDueDaysAfterAcceptance,

              finalBalanceDueDaysBeforeEvent:
                selectedPaymentSchedule
                  .finalBalanceDueDaysBeforeEvent,
            }
          : template.paymentSchedule,
    );

  const paymentScheduleChoices =
    [...paymentSchedules];

  if (
    frozen
    && paymentScheduleId
    && !paymentScheduleChoices.some(
      (item: any) =>
        item.id
        === paymentScheduleId,
    )
  ) {
    paymentScheduleChoices.unshift({
      id:
        paymentScheduleId,

      name:
        text(
          frozenPaymentSchedule.name,
        )
        || "Sent payment schedule",

      description:
        "Frozen with this quote version.",

      status:
        "active",

      default:
        false,

      depositType:
        text(
          frozenInvoice.depositType,
        )
        || "none",

      depositValue:
        Math.max(
          0,
          Number(
            frozenInvoice.depositValue
            || 0,
          ),
        ),

      depositDueDaysAfterAcceptance:
        Math.max(
          0,
          Number(
            frozenInvoice
              .depositDueDaysAfterAcceptance
            || 0,
          ),
        ),

      finalBalanceDueDaysBeforeEvent:
        Math.max(
          0,
          Number(
            frozenInvoice
              .finalBalanceDueDaysBeforeEvent
            || 0,
          ),
        ),

      sortOrder:
        0,

      createdAt:
        "",

      updatedAt:
        "",
    });
  }

  return {
    frozen,
    legacyFallback:
      !frozen
      && text(version?.status)
        !== "draft",

    contractTemplateId,

    questionnaireTemplateId,

    autoCreateInvoice,

    paymentScheduleId,

    paymentSchedules:
      paymentScheduleChoices,

    contractTemplates:
      contracts,

    questionnaireTemplates:
      questionnaires,

    invoice: {
      depositType:
        text(
          frozen
            ? frozenInvoice
                .depositType
            : selectedPaymentSchedule
                ?.depositType
              || settings
                ?.deposit_type,
        ) || "none",

      depositValue:
        Math.max(
          0,
          Number(
            frozen
              ? frozenInvoice
                  .depositValue
              : (
                  selectedPaymentSchedule
                    ?.depositValue
                  ?? settings
                    ?.deposit_value
                  ?? 0
                ),
          ),
        ),

      depositDueDaysAfterAcceptance:
        Math.max(
          0,
          Number(
            frozen
              ? frozenInvoice
                  .depositDueDaysAfterAcceptance
              : (
                  selectedPaymentSchedule
                    ?.depositDueDaysAfterAcceptance
                  ?? settings
                    ?.deposit_due_days_after_acceptance
                  ?? 0
                ),
          ),
        ),

      finalBalanceDueDaysBeforeEvent:
        Math.max(
          0,
          Number(
            frozen
              ? frozenInvoice
                  .finalBalanceDueDaysBeforeEvent
              : (
                  selectedPaymentSchedule
                    ?.finalBalanceDueDaysBeforeEvent
                  ?? settings
                    ?.final_balance_due_days_before_event
                  ?? 30
                ),
          ),
        ),

      questionnaireDueDaysBeforeEvent:
        Math.max(
          0,
          Number(
            frozen
              ? frozenQuestionnaire
                  .dueDaysBeforeEvent
              : settings
                  ?.questionnaire_due_days_before_event
              || 60,
          ),
        ),

      invoiceNotes:
        text(
          frozen
            ? frozenInvoice.notes
            : settings
                ?.invoice_notes,
        ),

      invoiceTerms:
        text(
          frozen
            ? frozenInvoice.terms
            : settings
                ?.invoice_terms,
        ),

      paymentSchedule,
    },
  };
}

function mergeContractTemplateContent(
  value: unknown,
  variables: Record<string, string>,
) {
  const raw =
    String(value ?? "").trim()
    || "[]";

  let parsed: any;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // Preserve malformed legacy content rather than
    // silently replacing or discarding it.
    return raw;
  }

  function mergeValue(
    input: any,
  ): any {
    if (
      typeof input === "string"
    ) {
      return input.replace(
        /%([a-z_]+)%/gi,
        (
          match,
          key,
        ) => {
          const normalised =
            lower(key);

          return Object.prototype
            .hasOwnProperty.call(
              variables,
              normalised,
            )
            ? variables[normalised]
            : match;
        },
      );
    }

    if (Array.isArray(input)) {
      return input.map(
        (item) =>
          mergeValue(item),
      );
    }

    if (
      input
      && typeof input === "object"
    ) {
      return Object.fromEntries(
        Object.entries(input).map(
          ([key, item]) => [
            key,
            mergeValue(item),
          ],
        ),
      );
    }

    return input;
  }

  return JSON.stringify(
    mergeValue(parsed),
  );
}

async function buildQuoteBookingPackSnapshot(
  db: D1Db,
  workspaceId: string,
  version: any,
  input: any,
  businessName: string,
) {
  if (
    text(version?.status)
    !== "draft"
  ) {
    const snapshot =
      quoteBookingPackObject(
        version?.snapshot,
      );

    const existing =
      quoteBookingPackObject(
        snapshot.bookingPack,
      );

    return text(existing.frozenAt)
      ? existing
      : null;
  }

  const preview =
    await quoteBookingPackPreview(
      db,
      workspaceId,
      version,
    );

  const incoming =
    quoteBookingPackObject(
      input,
    );

  const hasContractOverride =
    Object.prototype.hasOwnProperty.call(
      incoming,
      "contractTemplateId",
    );

  const hasQuestionnaireOverride =
    Object.prototype.hasOwnProperty.call(
      incoming,
      "questionnaireTemplateId",
    );

  const hasInvoiceOverride =
    Object.prototype.hasOwnProperty.call(
      incoming,
      "autoCreateInvoice",
    );

  const contractTemplateId =
    hasContractOverride
      ? text(
          incoming.contractTemplateId,
        )
      : preview.contractTemplateId;

  const questionnaireTemplateId =
    hasQuestionnaireOverride
      ? text(
          incoming
            .questionnaireTemplateId,
        )
      : preview
          .questionnaireTemplateId;

  const autoCreateInvoice =
    hasInvoiceOverride
      ? Boolean(
          incoming.autoCreateInvoice,
        )
      : preview.autoCreateInvoice;

  const [
    contractTemplate,
    questionnaireTemplate,
  ] = await Promise.all([
    contractTemplateId
      ? db.prepare(`
          SELECT *
          FROM crm_contract_templates
          WHERE workspace_id = ?
            AND id = ?
            AND status = 'active'
          LIMIT 1
        `).bind(
          workspaceId,
          contractTemplateId,
        ).first()
      : Promise.resolve(null),

    questionnaireTemplateId
      ? db.prepare(`
          SELECT *
          FROM crm_questionnaire_templates
          WHERE workspace_id = ?
            AND id = ?
            AND status = 'active'
          LIMIT 1
        `).bind(
          workspaceId,
          questionnaireTemplateId,
        ).first()
      : Promise.resolve(null),
  ]);

  if (
    contractTemplateId
    && !contractTemplate
  ) {
    throw httpError(
      "Choose an active contract template from this workspace.",
      409,
    );
  }

  if (
    questionnaireTemplateId
    && !questionnaireTemplate
  ) {
    throw httpError(
      "Choose an active questionnaire template from this workspace.",
      409,
    );
  }

  const template =
    quoteBookingPackObject(
      version?.snapshot?.template,
    );

  return {
    schemaVersion: 1,

    frozenAt:
      new Date().toISOString(),

    source:
      "quote_send",

    quoteTemplate: {
      id:
        text(template.id),
      name:
        text(template.name),
      version:
        Math.max(
          0,
          Number(
            template.version || 0,
          ),
        ),
    },

    contract:
      contractTemplate
        ? {
            templateId:
              text(
                contractTemplate.id,
              ),

            name:
              text(
                contractTemplate.name,
              ),

            version:
              Math.max(
                1,
                Number(
                  contractTemplate
                    .version || 1,
                ),
              ),

            contentJson:
              mergeContractTemplateContent(
                contractTemplate
                  .content_json
                || "[]",
                {
                  business_name:
                    text(
                      businessName,
                    ),
                },
              ),

            requiredSignatures:
              1,
          }
        : null,

    questionnaire:
      questionnaireTemplate
        ? {
            templateId:
              text(
                questionnaireTemplate
                  .id,
              ),

            name:
              text(
                questionnaireTemplate
                  .name,
              ),

            description:
              text(
                questionnaireTemplate
                  .description,
              ),

            version:
              Math.max(
                1,
                Number(
                  questionnaireTemplate
                    .version || 1,
                ),
              ),

            schemaJson:
              text(
                questionnaireTemplate
                  .schema_json
                || "[]",
              ),

            dueDaysBeforeEvent:
              preview.invoice
                .questionnaireDueDaysBeforeEvent,
          }
        : null,

    invoice: {
      enabled:
        autoCreateInvoice,

      depositType:
        preview.invoice
          .depositType,

      depositValue:
        preview.invoice
          .depositValue,

      depositDueDaysAfterAcceptance:
        preview.invoice
          .depositDueDaysAfterAcceptance,

      finalBalanceDueDaysBeforeEvent:
        preview.invoice
          .finalBalanceDueDaysBeforeEvent,

      notes:
        preview.invoice
          .invoiceNotes,

      terms:
        preview.invoice
          .invoiceTerms,

      paymentSchedule:
        preview.invoice
          .paymentSchedule,
    },
  };
}

export async function getQuoteSendPreview(
  db: D1Db,
  env: QuoteEmailEnv,
  actor: QuoteActor,
  quoteIdInput: unknown,
  templateIdInput: unknown = "",
) {
  requirePermission(
    actor,
    "crm:read",
  );

  const context =
    await quoteSendEmailContext(
      db,
      env,
      actor,
      quoteIdInput,
      templateIdInput,
    );

  return {
    ...context.preview,
    bookingPack:
      await quoteBookingPackPreview(
        db,
        actor.workspaceId,
        context.version,
      ),
  };
}

export async function sendQuote(
  db: D1Db,
  env: QuoteEmailEnv,
  actor: QuoteActor,
  quoteIdInput: unknown,
  input: any = {},
) {
  requirePermission(
    actor,
    "crm:manage",
  );

  const quoteId =
    text(quoteIdInput);

  const context =
    await quoteSendEmailContext(
      db,
      env,
      actor,
      quoteId,
      input?.templateId,
    );

  const quote =
    context.quote;

  const version =
    context.version;

  const preview =
    context.preview;

  if (
    !text(
      quote.event_date,
    )
  ) {
    throw httpError(
      "Add the wedding/event date before sending this quote.",
      409,
    );
  }

  const bookingPack =
    await buildQuoteBookingPackSnapshot(
      db,
      actor.workspaceId,
      version,
      input?.bookingPack,
      preview.businessName,
    );

  const sentVersionSnapshot =
    quoteBookingPackObject(
      version.snapshot,
    );

  delete sentVersionSnapshot
    .bookingPackDraft;

  // Prepare the immutable sent-version snapshot in memory.
  // It is persisted only after external email delivery succeeds.
  // A failed send therefore leaves the draft fully editable.
  const successfulSendSnapshot =
    text(version.status) === "draft"
    && bookingPack
      ? JSON.stringify({
          ...sentVersionSnapshot,
          bookingPack,
        })
      : "";

  if (
    !version.options.length
  ) {
    throw httpError(
      "Add at least one package option before sending the quote.",
      409,
    );
  }

  if (
    quoteExpired(
      version.expiresAt,
    )
  ) {
    throw httpError(
      "Choose a future quote expiry date before sending.",
      409,
    );
  }

  if (
    !preview.deliveryReady
  ) {
    throw httpError(
      preview.deliveryIssue
      || "CRM email delivery is not ready.",
      409,
    );
  }

  const subject =
    text(
      input?.subject
      || preview.subject,
    );

  const body =
    text(
      input?.body
      || preview.body,
    );

  if (!subject) {
    throw httpError(
      "Enter an email subject.",
    );
  }

  if (!body) {
    throw httpError(
      "Enter an email message.",
    );
  }

  const contact =
    await primaryContactForEnquiry(
      db,
      actor.workspaceId,
      text(quote.enquiry_id),
    );

  if (!contact) {
    throw httpError(
      "The quote primary client could not be found.",
      409,
    );
  }

  if (
    !validEmail(
      contact.email,
    )
  ) {
    throw httpError(
      "The primary client needs a valid email address before the quote can be sent.",
      409,
    );
  }

  const identity =
    await ensureIdentity(
      db,
      actor.workspaceId,
      contact,
    );

  const invitation =
    await createInvitation(
      db,
      actor.workspaceId,
      quote,
      version,
      contact,
      identity,
    );

  const origin =
    await portalOrigin(
      db,
      actor.workspaceId,
    );

  const loginUrl =
    `${origin}/api/public/client-portal/verify?token=${encodeURIComponent(invitation.rawToken)}`;

  const engagementToken =
    (
      crypto.randomUUID()
      + crypto.randomUUID()
    ).replace(
      /-/g,
      "",
    );

  const engagementTokenHash =
    await hashCrmEmailEngagementToken(
      engagementToken,
    );

  const trackedLoginUrl =
    `${loginUrl}&engagement=${encodeURIComponent(engagementToken)}`;

  const trackingPixelUrl =
    `${origin}/api/public/crm/email-open?token=${encodeURIComponent(engagementToken)}`;

  const finalBody =
    finalQuoteEmailBody(
      body,
      trackedLoginUrl,
    );

  const communicationBody =
    loggedQuoteEmailBody(
      body,
    );

  const attemptedProvider =
    preview.deliveryMode
      === "google"
      ? "gmail"
      : preview.deliveryMode
        === "smtp"
        ? "smtp"
        : "resend";

  let delivery:
    {
      provider: string;
      providerMessageId: string;
    };

  try {
    delivery =
      await sendCrmEmail(
        db,
        env,
        actor,
        {
          to:
            lower(
              contact.email,
            ),
          subject,
          body:
            finalBody,
          trackingPixelUrl:
            trackingPixelUrl,
          businessName:
            preview.businessName,
        },
      );
  } catch (error: any) {
    await db.batch([
      db.prepare(`
        UPDATE crm_quote_invitations
        SET consumed_at =
          COALESCE(
            consumed_at,
            CURRENT_TIMESTAMP
          )
        WHERE id = ?
          AND workspace_id = ?
      `).bind(
        invitation.invitationId,
        actor.workspaceId,
      ),

      db.prepare(`
        INSERT INTO crm_communications (
          id,
          workspace_id,
          contact_id,
          enquiry_id,
          quote_id,
          quote_version_id,
          channel,
          direction,
          subject,
          body,
          status,
          provider,
          provider_message_id,
          failure_reason,
          occurred_at,
          actor_user_id,
          actor_email,
          metadata_json,
          created_at,
          updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          'email',
          'outbound',
          ?, ?,
          'failed',
          ?,
          '',
          ?,
          CURRENT_TIMESTAMP,
          ?, ?, ?,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `).bind(
        `crm_communication_${crypto.randomUUID()}`,
        actor.workspaceId,
        contact.id,
        quote.enquiry_id,
        quote.id,
        version.id,
        subject,
        communicationBody,
        attemptedProvider,
        text(error?.message),
        text(actor.userId) || null,
        lower(actor.email),
        JSON.stringify({
          quoteId,
          versionId:
            version.id,
          templateId:
            preview.templateId
            || null,
          deliveryMode:
            preview.deliveryMode,
          to:
            lower(
              contact.email,
            ),
          replyTo:
            preview.replyToEmail
            || null,
        }),
      ),
    ]);

    throw error;
  }

  await db.batch([
    db.prepare(`
      UPDATE crm_quote_versions
      SET
        snapshot_json =
          CASE
            WHEN status = 'draft'
              AND ? <> ''
              THEN ?
            ELSE snapshot_json
          END,
        status =
          CASE
            WHEN status = 'draft'
              THEN 'sent'
            ELSE status
          END,
        sent_at =
          COALESCE(
            sent_at,
            CURRENT_TIMESTAMP
          ),
        provider = ?,
        provider_message_id = ?,
        failure_reason = '',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND workspace_id = ?
    `).bind(
      successfulSendSnapshot,
      successfulSendSnapshot,
      delivery.provider,
      delivery.providerMessageId,
      version.id,
      actor.workspaceId,
    ),

    db.prepare(`
      UPDATE crm_quotes
      SET
        status =
          CASE
            WHEN status = 'draft'
              THEN 'sent'
            ELSE status
          END,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND workspace_id = ?
    `).bind(
      quote.id,
      actor.workspaceId,
    ),

    db.prepare(`
      INSERT INTO crm_communications (
        id,
        workspace_id,
        contact_id,
        enquiry_id,
        quote_id,
        quote_version_id,
        channel,
        direction,
        subject,
        body,
        status,
        provider,
        provider_message_id,
        open_tracking_token_hash,
        failure_reason,
        occurred_at,
        actor_user_id,
        actor_email,
        metadata_json,
        created_at,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        'email',
        'outbound',
        ?, ?,
        'sent',
        ?, ?, ?,
        '',
        CURRENT_TIMESTAMP,
        ?, ?, ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      `crm_communication_${crypto.randomUUID()}`,
      actor.workspaceId,
      contact.id,
      quote.enquiry_id,
      quote.id,
      version.id,
      subject,
      communicationBody,
      delivery.provider,
      delivery.providerMessageId,
      engagementTokenHash,
      text(actor.userId) || null,
      lower(actor.email),
      JSON.stringify({
        quoteId,
        versionId:
          version.id,
        templateId:
          preview.templateId
          || null,
        templateName:
          preview.templateName,
        deliveryMode:
          preview.deliveryMode,
        to:
          lower(
            contact.email,
          ),
        replyTo:
          preview.replyToEmail
          || null,
        expiresAt:
          version.expiresAt
          || null,
      }),
    ),
  ]);

  await recordActivity(
    db,
    actor,
    actor.workspaceId,
    "enquiry",
    text(quote.enquiry_id),
    "quote.sent",
    `Sent quote ${text(quote.reference)} version ${version.versionNumber} to ${lower(contact.email)}.`,
    {
      quoteId,
      versionId:
        version.id,
      templateId:
        preview.templateId
        || null,
      deliveryMode:
        preview.deliveryMode,
      providerMessageId:
        delivery.providerMessageId,
    },
  );

  await audit(
    db,
    actor,
    "crm.quote.sent",
    "crm_quote",
    quoteId,
    `Sent quote ${text(quote.reference)} version ${version.versionNumber}.`,
    {
      versionId:
        version.id,
      templateId:
        preview.templateId
        || null,
      deliveryMode:
        preview.deliveryMode,
      provider:
        delivery.provider,
      providerMessageId:
        delivery.providerMessageId,
    },
  );

  return getQuote(
    db,
    {
      ...actor,
      permissions: [
        ...new Set([
          ...(actor.permissions || []),
          "crm:read",
        ]),
      ],
    },
    quoteId,
  );
}

async function quoteAccessForIdentity(db: D1Db, workspaceId: string, identityId: string) {
  return db.prepare(`${QUOTE_SELECT} JOIN crm_quote_client_access access ON access.quote_id = q.id AND access.workspace_id = q.workspace_id WHERE q.workspace_id = ? AND access.identity_id = ? AND access.status = 'active' AND q.status IN ('sent','viewed','accepted','declined','expired') ORDER BY q.updated_at DESC`).bind(workspaceId, identityId).all();
}

export async function getPublicQuotesForIdentity(db: D1Db, workspaceId: string, identityId: string) {
  const rows = await quoteAccessForIdentity(db, workspaceId, identityId);
  return (rows.results || []).map((row: any) => ({ id: text(row.id), reference: text(row.reference), status: text(row.status), eventDate: text(row.event_date), venueText: text(row.venue_text), currentVersionId: text(row.current_version_id), acceptedJobId: text(row.accepted_job_id), updatedAt: row.updated_at }));
}

async function publicIdentity(db: D1Db, request: Request, workspaceId: string) {
  const identity = await getAuthenticatedClientIdentity(db, request);
  return identity && identity.workspaceId === workspaceId ? identity : null;
}

export async function getPublicQuote(db: D1Db, request: Request, workspaceId: string, quoteId: string) {
  const identity = await publicIdentity(db, request, workspaceId);
  if (!identity) throw httpError("Sign in to view this quote.", 401);
  const access = await db.prepare(`SELECT * FROM crm_quote_client_access WHERE workspace_id = ? AND quote_id = ? AND identity_id = ? AND status = 'active' LIMIT 1`).bind(workspaceId, quoteId, identity.id).first();
  if (!access) throw httpError("Quote not found.", 404);
  const row = await db.prepare(`${QUOTE_SELECT} WHERE q.workspace_id = ? AND q.id = ? LIMIT 1`).bind(workspaceId, quoteId).first();
  if (!row) throw httpError("Quote not found.", 404);
  const version = await fullVersion(db, workspaceId, text(row.current_version_id));
  if (!version) throw httpError("Quote version not found.", 404);
  if (["draft", "superseded"].includes(version.status)) throw httpError("This quote version is no longer available.", 409);
  if (quoteExpired(version.expiresAt) && !["accepted", "declined"].includes(version.status)) {
    await db.batch([
      db.prepare(`UPDATE crm_quote_versions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND status IN ('sent','viewed')`).bind(version.id, workspaceId),
      db.prepare(`UPDATE crm_quotes SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND status IN ('sent','viewed')`).bind(quoteId, workspaceId),
    ]);
    version.status = "expired";
  } else if (version.status === "sent") {
    await db.batch([
      db.prepare(`UPDATE crm_quote_versions SET status = 'viewed', viewed_at = COALESCE(viewed_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND status = 'sent'`).bind(version.id, workspaceId),
      db.prepare(`UPDATE crm_quotes SET status = 'viewed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND status = 'sent'`).bind(quoteId, workspaceId),
      db.prepare(`UPDATE crm_quote_client_access SET last_viewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE quote_id = ? AND workspace_id = ? AND identity_id = ?`).bind(quoteId, workspaceId, identity.id),
    ]);
    await recordActivity(db, { email: identity.email }, workspaceId, "enquiry", text(row.enquiry_id), "quote.viewed", `Client viewed quote ${text(row.reference)} version ${version.versionNumber}.`, { quoteId, versionId: version.id, identityId: identity.id });
    version.status = "viewed";
    version.viewedAt = new Date().toISOString();
  }
  let acceptance: any = null;
  if (version.status === "accepted") {
    const accepted = await db.prepare(`SELECT option_id, accepted_at, subtotal_amount, discount_amount, tax_amount, total_amount, currency, selected_package_snapshot_json, selected_addons_snapshot_json FROM crm_quote_acceptances WHERE workspace_id = ? AND quote_id = ? AND version_id = ? LIMIT 1`).bind(workspaceId, quoteId, version.id).first();
    if (accepted) acceptance = {
      optionId: text(accepted.option_id), acceptedAt: accepted.accepted_at || "", subtotalAmount: Number(accepted.subtotal_amount || 0),
      discountAmount: Number(accepted.discount_amount || 0), taxAmount: Number(accepted.tax_amount || 0), totalAmount: Number(accepted.total_amount || 0),
      currency: text(accepted.currency || version.currency), selectedPackage: safeJson(accepted.selected_package_snapshot_json, {}),
      selectedAddons: safeJson(accepted.selected_addons_snapshot_json, []),
    };
  }
  return { quote: { ...hydrateQuote(row, version), acceptance }, identity: { id: identity.id, displayName: identity.displayName, email: identity.email } };
}

function selectionFor(option: any, selections: any) {
  const quantities = new Map<string, number>();
  for (const entry of Array.isArray(selections) ? selections : []) quantities.set(text(entry?.id || entry?.addonId), integer(entry?.quantity));
  const selected = [];
  for (const addon of option.addons || []) {
    let quantity = quantities.has(addon.id) ? Number(quantities.get(addon.id)) : addon.defaultQuantity;
    if (addon.requirement === "mandatory") quantity = Math.max(quantity, Math.max(1, addon.minimumQuantity));
    else if (quantity > 0) quantity = Math.max(quantity, addon.minimumQuantity);
    quantity = Math.max(0, Math.min(addon.maximumQuantity, quantity));
    if (quantity > 0) selected.push({ ...addon, quantity, lineTotalAmount: quantity * addon.unitPriceAmount });
  }
  return selected;
}

async function acceptQuoteCore(db: D1Db, actor: QuoteActor, quoteId: string, input: any, request?: Request, identity?: any) {
  const row = await db.prepare(`${QUOTE_SELECT} WHERE q.workspace_id = ? AND q.id = ? LIMIT 1`).bind(actor.workspaceId, quoteId).first();
  if (!row) throw httpError("Quote not found.", 404);
  if (text(row.accepted_job_id)) {
    const existing = await db.prepare(`SELECT id, reference FROM crm_jobs WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(row.accepted_job_id, actor.workspaceId).first();
    if (existing) {
      const bookingPack = await ensureBookingPackForAcceptedQuote(db, actor, {
        quoteId,
        jobId: text(existing.id),
      });
      return {
        quoteId,
        jobId: text(existing.id),
        jobReference: text(existing.reference),
        idempotent: true,
        bookingPack,
      };
    }
  }
  const version = await fullVersion(db, actor.workspaceId, text(row.current_version_id));
  if (!version) throw httpError("Current quote version not found.", 409);
  if (!["sent", "viewed"].includes(version.status)) throw httpError("This quote is not available for acceptance.", 409);
  if (quoteExpired(version.expiresAt)) {
    await db.batch([
      db.prepare(`UPDATE crm_quote_versions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND status IN ('sent','viewed')`).bind(version.id, actor.workspaceId),
      db.prepare(`UPDATE crm_quotes SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND status IN ('sent','viewed')`).bind(quoteId, actor.workspaceId),
    ]);
    throw httpError("This quote has expired.", 409);
  }
  const quoteTypeValue =
    quoteType(
      row.quote_type,
    );

  if (
    quoteTypeValue === "fixed"
    && version.options.length !== 1
  ) {
    throw httpError(
      "A fixed quote must contain exactly one package option.",
      409,
    );
  }

  const option =
    quoteTypeValue === "fixed"
      ? version.options[0]
      : version.options.find(
          (item: any) =>
            item.id
            === text(input?.optionId),
        );

  if (!option) {
    throw httpError(
      "Choose a valid package option.",
      409,
    );
  }

  const selectedAddons =
    selectionFor(
      option,
      quoteTypeValue === "fixed"
        ? []
        : input?.addons,
    );
  const baseAndItems = option.basePriceAmount + option.items.reduce((sum: number, item: any) => sum + item.quantity * item.unitPriceAmount, 0);
  const subtotal = baseAndItems + selectedAddons.reduce((sum: number, item: any) => sum + item.lineTotalAmount, 0);
  const calculated = totals(subtotal, version.discountType, version.discountValue, version.taxTreatment, version.taxRateBasisPoints);
  const packageSnapshot = { id: option.id, packageId: option.packageId || null, optionType: option.optionType, name: option.name, description: option.description, serviceType: option.serviceType, internalCode: option.internalCode, basePriceAmount: option.basePriceAmount, currency: option.currency, coverageMinutes: option.coverageMinutes, deliverables: option.deliverables, includedItems: option.includedItems, clientNotes: option.clientNotes, items: option.items };
  const acceptanceId = `crm_quote_acceptance_${quoteId}`;
  const clientIp = request ? text(request.headers.get("CF-Connecting-IP")) : "";
  const ipHash = clientIp ? await sha256(`${actor.workspaceId}|${clientIp}`) : "";
  const contact = await db.prepare(`SELECT * FROM crm_contacts WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(row.primary_contact_id, actor.workspaceId).first();
  if (!contact) throw httpError("Primary client not found.", 409);
  const acceptedAt = new Date().toISOString();
  const conversionActor = { ...actor, permissions: [...new Set([...(actor.permissions || []), "crm:manage", "crm:read"])] };
  const quoteSnapshot = { quoteId, reference: text(row.reference), versionId: version.id, versionNumber: version.versionNumber, clientNotes: version.clientNotes, discountType: version.discountType, discountValue: version.discountValue, taxTreatment: version.taxTreatment, taxRateBasisPoints: version.taxRateBasisPoints };
  const conversion = await acceptEnquiry(db, conversionActor, text(row.enquiry_id), {
    valueAmount: calculated.total, packageName: option.name, serviceName: option.serviceType || text(row.service_interest),
    quoteId, quoteVersionId: version.id, quoteReference: text(row.reference), quoteVersionNumber: version.versionNumber,
    acceptedQuoteAt: acceptedAt, bookingSubtotal: calculated.subtotal, bookingDiscount: calculated.discount,
    bookingTax: calculated.tax, packageSnapshot, addonsSnapshot: selectedAddons, quoteSnapshot,
  });
  const jobId = text(conversion.job?.id);
  if (!jobId) throw httpError("Unable to create or reuse the booked Job.", 409);
  const conversionQuoteId = text(conversion.job?.quoteId);
  if (conversionQuoteId && conversionQuoteId !== quoteId) throw httpError("The enquiry is already linked to a Job created from another quote.", 409);
  const recordedAcceptance = await db.prepare(`SELECT id, total_amount, currency FROM crm_quote_acceptances WHERE workspace_id = ? AND quote_id = ? LIMIT 1`).bind(actor.workspaceId, quoteId).first();
  if (recordedAcceptance) {
    const bookingPack = await ensureBookingPackForAcceptedQuote(db, actor, {
      quoteId,
      jobId,
    });
    return {
      quoteId,
      jobId,
      jobReference: text(conversion.job?.reference),
      idempotent: true,
      totalAmount: Number(recordedAcceptance.total_amount || 0),
      currency: text(recordedAcceptance.currency || version.currency),
      bookingPack,
    };
  }
  const statements: any[] = [
    db.prepare(`UPDATE crm_jobs SET status = 'booked', service_name = ?, package_name = ?, value_amount = ?, currency = ?, quote_id = ?, quote_version_id = ?, quote_reference = ?, quote_version_number = ?, accepted_quote_at = ?, booking_subtotal = ?, booking_discount = ?, booking_tax = ?, package_snapshot_json = ?, addons_snapshot_json = ?, quote_snapshot_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND enquiry_id = ? AND (quote_id IS NULL OR quote_id = ?)` ).bind(
      option.serviceType || text(row.service_interest), option.name, calculated.total, version.currency, quoteId, version.id, text(row.reference), version.versionNumber, acceptedAt,
      calculated.subtotal, calculated.discount, calculated.tax, JSON.stringify(packageSnapshot), JSON.stringify(selectedAddons), JSON.stringify(quoteSnapshot),
      jobId, actor.workspaceId, text(row.enquiry_id), quoteId,
    ),
    db.prepare(`INSERT OR IGNORE INTO crm_quote_acceptances (id, workspace_id, quote_id, version_id, option_id, contact_id, identity_id, actor_type, actor_user_id, actor_email, accepted_at, client_ip_hash, user_agent, subtotal_amount, discount_amount, tax_amount, total_amount, currency, selected_package_snapshot_json, selected_addons_snapshot_json, audit_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(
      acceptanceId, actor.workspaceId, quoteId, version.id, option.id, contact.id, identity?.id || null, identity ? "client" : "admin", text(actor.userId) || null, lower(actor.email || identity?.email), ipHash, request ? text(request.headers.get("user-agent")).slice(0, 500) : "", calculated.subtotal, calculated.discount, calculated.tax, calculated.total, version.currency, JSON.stringify(packageSnapshot), JSON.stringify(selectedAddons), JSON.stringify({ quoteReference: text(row.reference), versionNumber: version.versionNumber, actorType: identity ? "client" : "admin", confirmation: Boolean(input?.confirmed) }),
    ),
  ];
  for (const addon of selectedAddons) statements.push(db.prepare(`INSERT OR IGNORE INTO crm_quote_acceptance_addons (id, workspace_id, acceptance_id, quote_option_addon_id, addon_id, name, quantity, unit_price_amount, line_total_amount, snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(
    `${acceptanceId}_${addon.id}`, actor.workspaceId, acceptanceId, addon.id, addon.addonId || null, addon.name, addon.quantity, addon.unitPriceAmount, addon.lineTotalAmount, JSON.stringify(addon),
  ));
  statements.push(
    db.prepare(`UPDATE crm_quote_versions SET status = 'accepted', accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP), subtotal_amount = ?, discount_amount = ?, tax_amount = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND status IN ('sent','viewed')`).bind(calculated.subtotal, calculated.discount, calculated.tax, calculated.total, version.id, actor.workspaceId),
    db.prepare(`UPDATE crm_quotes SET status = 'accepted', accepted_version_id = ?, accepted_job_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND accepted_job_id IS NULL`).bind(version.id, jobId, quoteId, actor.workspaceId),
  );
  if (identity) {
    statements.push(db.prepare(`UPDATE crm_quote_client_access SET accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE quote_id = ? AND workspace_id = ? AND identity_id = ?`).bind(quoteId, actor.workspaceId, identity.id));
    statements.push(db.prepare(`INSERT INTO crm_job_client_access (job_id, workspace_id, contact_id, identity_id, role, status, invited_at, accepted_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'primary', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(job_id, identity_id) DO UPDATE SET contact_id = excluded.contact_id, status = 'active', accepted_at = COALESCE(crm_job_client_access.accepted_at, CURRENT_TIMESTAMP), revoked_at = NULL, updated_at = CURRENT_TIMESTAMP`).bind(jobId, actor.workspaceId, contact.id, identity.id));
    statements.push(db.prepare(`UPDATE crm_jobs SET client_portal_status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(jobId, actor.workspaceId));
  }
  await db.batch(statements);
  const bookingPack = await ensureBookingPackForAcceptedQuote(db, actor, {
    quoteId,
    jobId,
  });
  await recordActivity(db, actor, actor.workspaceId, "enquiry", text(row.enquiry_id), "quote.accepted", `${identity ? "Client" : "Admin"} accepted quote ${text(row.reference)} version ${version.versionNumber}.`, { quoteId, versionId: version.id, jobId, totalAmount: calculated.total, optionId: option.id });
  await recordActivity(db, actor, actor.workspaceId, "job", jobId, "quote.accepted", `Booking created from accepted quote ${text(row.reference)} version ${version.versionNumber}.`, { quoteId, versionId: version.id, totalAmount: calculated.total });
  await audit(db, actor, "crm.quote.accepted", "crm_quote", quoteId, `Accepted quote ${text(row.reference)} and created ${text(conversion.job?.reference)}.`, { jobId, versionId: version.id, totalAmount: calculated.total, actorType: identity ? "client" : "admin" });
  return {
    quoteId,
    jobId,
    jobReference: text(conversion.job?.reference),
    idempotent: Boolean(conversion.idempotent),
    totalAmount: calculated.total,
    currency: version.currency,
    bookingPack,
  };
}

export async function acceptQuoteAsAdmin(db: D1Db, actor: QuoteActor, quoteId: string, input: any) {
  requirePermission(actor, "crm:manage");
  if (input?.confirmed !== true) throw httpError("Confirm that the client accepted this quote offline before creating the Job.", 409);
  return acceptQuoteCore(db, actor, quoteId, input);
}

export async function acceptQuoteAsClient(db: D1Db, request: Request, workspaceId: string, quoteId: string, input: any) {
  const identity = await publicIdentity(db, request, workspaceId);
  if (!identity) throw httpError("Sign in to accept this quote.", 401);
  const access = await db.prepare(`SELECT * FROM crm_quote_client_access WHERE workspace_id = ? AND quote_id = ? AND identity_id = ? AND status = 'active' LIMIT 1`).bind(workspaceId, quoteId, identity.id).first();
  if (!access) throw httpError("Quote not found.", 404);
  if (input?.confirmed !== true) throw httpError("Confirm the quote acceptance before continuing.", 409);
  return acceptQuoteCore(db, { workspaceId, email: identity.email, businessName: "", permissions: ["crm:manage"] }, quoteId, input, request, identity);
}

export async function declineQuoteAsClient(db: D1Db, request: Request, workspaceId: string, quoteId: string, input: any) {
  const identity = await publicIdentity(db, request, workspaceId);
  if (!identity) throw httpError("Sign in to decline this quote.", 401);
  const row = await db.prepare(`${QUOTE_SELECT} JOIN crm_quote_client_access access ON access.quote_id = q.id AND access.workspace_id = q.workspace_id WHERE q.workspace_id = ? AND q.id = ? AND access.identity_id = ? AND access.status = 'active' LIMIT 1`).bind(workspaceId, quoteId, identity.id).first();
  if (!row) throw httpError("Quote not found.", 404);
  const version = await fullVersion(db, workspaceId, text(row.current_version_id));
  if (!version || !["sent", "viewed"].includes(version.status)) throw httpError("This quote cannot be declined.", 409);
  await db.batch([
    db.prepare(`UPDATE crm_quote_versions SET status = 'declined', declined_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND status IN ('sent','viewed')`).bind(version.id, workspaceId),
    db.prepare(`UPDATE crm_quotes SET status = 'declined', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND status IN ('sent','viewed')`).bind(quoteId, workspaceId),
    db.prepare(`INSERT INTO crm_communications (id, workspace_id, contact_id, enquiry_id, quote_id, quote_version_id, channel, direction, subject, body, status, occurred_at, actor_email, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'note', 'inbound', ?, ?, 'logged', CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(
      `crm_communication_${crypto.randomUUID()}`, workspaceId, row.primary_contact_id, row.enquiry_id, quoteId, version.id, `Quote ${text(row.reference)} declined`, text(input?.reason), lower(identity.email), JSON.stringify({ quoteId, versionId: version.id }),
    ),
  ]);
  await recordActivity(db, { email: identity.email }, workspaceId, "enquiry", text(row.enquiry_id), "quote.declined", `Client declined quote ${text(row.reference)} version ${version.versionNumber}.`, { quoteId, versionId: version.id, reason: text(input?.reason) });
  return { ok: true, status: "declined" };
}

export async function requestQuotePortalMagicLink(db: D1Db, env: QuoteEmailEnv, workspaceId: string, emailInput: unknown, quoteIdInput?: unknown) {
  const email = lower(emailInput);
  if (!validEmail(email)) return false;
  const identity = await db.prepare(`SELECT * FROM client_identities WHERE workspace_id = ? AND email_normalized = ? AND status = 'active' LIMIT 1`).bind(workspaceId, email).first();
  if (!identity) return false;
  const rows = await quoteAccessForIdentity(db, workspaceId, text(identity.id));
  const requestedQuoteId = text(quoteIdInput);
  const quote = (rows.results || []).find(
    (item: any) =>
      ["sent", "viewed"].includes(
        text(item.status),
      )
      && (
        !requestedQuoteId
        || text(item.id) === requestedQuoteId
      ),
  );
  if (!quote) return false;
  const version = await fullVersion(db, workspaceId, text(quote.current_version_id));
  if (!version || !["sent", "viewed"].includes(version.status)) return false;
  const contact = await db.prepare(`SELECT * FROM crm_contacts WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(quote.primary_contact_id, workspaceId).first();
  if (!contact) return false;
  const recent = await db.prepare(`SELECT COUNT(*) AS total FROM crm_quote_invitations WHERE workspace_id = ? AND identity_id = ? AND created_at >= datetime('now', '-10 minutes')`).bind(workspaceId, identity.id).first();
  if (Number(recent?.total || 0) >= 3) return true;
  const invitation = await createInvitation(db, workspaceId, quote, version, contact, identity);
  const origin = await portalOrigin(db, workspaceId);
  const workspace = await db.prepare(`SELECT COALESCE(NULLIF(business_name,''), 'WedPlanned') AS business_name FROM workspace_settings WHERE workspace_id = ? LIMIT 1`).bind(workspaceId).first();
  await sendQuoteEmail(env, { to: email, businessName: text(workspace?.business_name || "WedPlanned"), clientName: text(contact.display_name), reference: text(quote.reference), loginUrl: `${origin}/api/public/client-portal/verify?token=${encodeURIComponent(invitation.rawToken)}`, eventDate: text(quote.event_date), expiresAt: invitation.expiresAt });
  return true;
}

export async function verifyQuotePortalMagicLink(db: D1Db, rawToken: string) {
  const tokenHash = await sha256(text(rawToken));
  const row = await db.prepare(`SELECT invitation.*, identity.email, identity.display_name, identity.status AS identity_status FROM crm_quote_invitations invitation JOIN client_identities identity ON identity.id = invitation.identity_id AND identity.workspace_id = invitation.workspace_id JOIN crm_quote_client_access access ON access.quote_id = invitation.quote_id AND access.workspace_id = invitation.workspace_id AND access.identity_id = invitation.identity_id AND access.status = 'active' JOIN crm_quotes quote ON quote.id = invitation.quote_id AND quote.workspace_id = invitation.workspace_id AND quote.current_version_id = invitation.version_id WHERE invitation.token_hash = ? LIMIT 1`).bind(tokenHash).first();
  if (!row) return null;
  if (text(row.identity_status) !== "active") return { ok: false, status: 400, error: "This sign-in link is invalid or has expired." } as const;
  const returnPath = text(row.return_path).startsWith("/") ? text(row.return_path) : "/client-portal";
  if (text(row.consumed_at)) return { ok: false, status: 400, error: "This sign-in link has already been used.", identityId: text(row.identity_id), returnPath } as const;
  if (!text(row.expires_at) || Date.parse(text(row.expires_at)) <= Date.now()) return { ok: false, status: 400, error: "This sign-in link has expired.", identityId: text(row.identity_id), returnPath } as const;
  const consumed = await db.prepare(`UPDATE crm_quote_invitations SET consumed_at = CURRENT_TIMESTAMP WHERE id = ? AND consumed_at IS NULL AND datetime(expires_at) > CURRENT_TIMESTAMP`).bind(row.id).run();
  if (Number(consumed?.meta?.changes || 0) !== 1) return { ok: false, status: 400, error: "This sign-in link is invalid, expired or has already been used.", identityId: text(row.identity_id), returnPath } as const;
  const rawSession = randomToken(32);
  const sessionHash = await sha256(rawSession);
  const sessionExpiresAt = new Date(Date.now() + CLIENT_SESSION_TTL_MS).toISOString();
  await db.batch([
    db.prepare(`UPDATE client_identities SET verified_at = COALESCE(verified_at, CURRENT_TIMESTAMP), last_authenticated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(row.identity_id),
    db.prepare(`INSERT INTO client_identity_sessions (id, identity_id, token_hash, expires_at, last_seen_at, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(`session_${crypto.randomUUID()}`, row.identity_id, sessionHash, sessionExpiresAt),
  ]);
  return { ok: true, status: 200, sessionToken: rawSession, returnPath } as const;
}
