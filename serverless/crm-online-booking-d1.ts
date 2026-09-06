import {
  applyBookingWorkflows,
  bookingThankYou,
  bookingDocumentEvent,
} from "./booking-confirmation-data";
import {
  bookingConfigurationOptions,
  resolveBookingReferences,
  bookingInvoiceSchedule,
} from "./booking-configuration";
import {
  calendarICloudConfigured,
  iCloudCalendarBusy,
} from "./crm-calendar-icloud";
import {
  externalCalendarBusy,
  syncConnectedCalendars,
} from "./crm-calendar-providers";
import {
  bookingError,
  bookingPublicOrigin,
  bookingClientDetails,
  bookingClientFields,
  defaultBookingMessages,
  mergeBookingText,
  bookingLocalInstant,
  bookingLocalParts,
  bookingSlots,
  bookingQuote,
  cleanBookingSettings,
  defaultBookingSettings,
  validBookingDate,
  type BookingSettings,
  type BusyTime,
} from "../shared/online-booking";
import {
  bookingHash,
  calendarGoogleConfigured,
  googleCalendarBusy,
} from "./crm-calendar-google";
import { requireWorkspaceEntitlement } from "./platform-entitlements-d1";
type Db = any;
export function requireBookingActor(actor: any, write = false) {
  if (
    !actor?.workspaceId ||
    !actor.permissions?.includes(write ? "crm:manage" : "crm:read") ||
    (write && actor.accessMode === "support")
  )
    throw bookingError("You do not have permission to manage bookings.", 403);
}
export async function requireBookingFeature(
  db: Db,
  env: any,
  workspaceId: string,
) {
  if (env.CRM_ONLINE_BOOKING_ENABLED !== "true")
    throw bookingError(
      "Online booking is not enabled on this deployment.",
      503,
    );
  await requireWorkspaceEntitlement(db, workspaceId, "crm");
  await requireWorkspaceEntitlement(db, workspaceId, "bookings");
  const ws = await db
    .prepare("SELECT id FROM workspaces WHERE id=? AND status='active'")
    .bind(workspaceId)
    .first();
  if (!ws) throw bookingError("This booking page is unavailable.", 404);
}
export async function bookingPage(db: Db, workspaceId: string) {
  const row = await db
    .prepare("SELECT * FROM crm_online_booking_pages WHERE workspace_id=?")
    .bind(workspaceId)
    .first();
  return row
    ? { ...row, settings: JSON.parse(row.document_json) as BookingSettings }
    : null;
}
export async function getOnlineBookingAdmin(db: Db, env: any, actor: any) {
  requireBookingActor(actor);
  await requireBookingFeature(db, env, actor.workspaceId);
  const page = await bookingPage(db, actor.workspaceId),
    workspace = await db
      .prepare(
        "SELECT w.name,w.slug,s.timezone,s.currency FROM workspaces w LEFT JOIN workspace_settings s ON s.workspace_id=w.id WHERE w.id=?",
      )
      .bind(actor.workspaceId)
      .first();
  const { results: members } = await db
    .prepare(
      "SELECT m.user_id AS userId,u.display_name AS name FROM business_memberships m JOIN platform_users u ON u.id=m.user_id WHERE m.workspace_id=? AND m.status='active'",
    )
    .bind(actor.workspaceId)
    .all();
  const { results: google } = await db
    .prepare(
      "SELECT resource_id AS resourceId,calendar_id AS calendarId,updated_at AS updatedAt FROM crm_google_calendar_connections WHERE workspace_id=?",
    )
    .bind(actor.workspaceId)
    .all();
  const { results: icloud } = await db
    .prepare(
      "SELECT resource_id AS resourceId,calendar_name AS calendarName,updated_at AS updatedAt FROM crm_icloud_calendar_connections WHERE workspace_id=?",
    )
    .bind(actor.workspaceId)
    .all();
  const payment = await db
    .prepare(
      "SELECT card_payments_enabled,stripe_connection_status,stripe_charges_enabled,stripe_payouts_enabled FROM workspace_payment_settings WHERE workspace_id=?",
    )
    .bind(actor.workspaceId)
    .first();
  let publicBookingOrigin = "",
    bookingShareIssue = "";
  try {
    publicBookingOrigin = bookingPublicOrigin(env.CRM_BOOKING_PUBLIC_ORIGIN);
  } catch {
    bookingShareIssue = "The public booking address needs deployment setup.";
  }
  return {
    ...(await bookingConfigurationOptions(db, actor.workspaceId)),
    revision: page?.revision || 0,
    enabled: Boolean(page?.enabled),
    publicBookingEnabled: env.CRM_ONLINE_BOOKING_PUBLIC_ENABLED === "true",
    publicSlug: page?.public_slug || workspace.slug,
    publicBookingOrigin,
    bookingShareIssue,
    bookingEmailsEnabled:
      env.CRM_BOOKING_EMAIL_ENABLED === "true" &&
      Boolean(env.CRM_BOOKING_PUBLIC_ORIGIN),
    settings:
      page?.settings ||
      defaultBookingSettings(
        workspace.timezone || "Europe/London",
        workspace.currency || "GBP",
      ),
    members,
    google,
    googleConfigured: calendarGoogleConfigured(env),
    icloud,
    icloudConfigured: calendarICloudConfigured(env),
    paymentsReady: Boolean(
      payment?.card_payments_enabled &&
        payment?.stripe_connection_status === "ready" &&
        payment?.stripe_charges_enabled &&
        payment?.stripe_payouts_enabled,
    ),
  };
}
export async function saveOnlineBookingPage(
  db: Db,
  env: any,
  actor: any,
  input: any,
) {
  requireBookingActor(actor, true);
  await requireBookingFeature(db, env, actor.workspaceId);
  if (input.enabled && env.CRM_ONLINE_BOOKING_PUBLIC_ENABLED !== "true")
    throw bookingError(
      "Client booking is awaiting activation. You can save your setup as a draft.",
      503,
    );
  const settings = cleanBookingSettings(input.settings),
    slug = String(input.publicSlug || "")
      .trim()
      .toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(slug))
    throw bookingError(
      "Choose a booking address of 3–80 letters, numbers or hyphens.",
    );
  for (const r of settings.resources) {
    if (
      r.userId &&
      !(await db
        .prepare(
          "SELECT id FROM business_memberships WHERE workspace_id=? AND user_id=? AND status='active'",
        )
        .bind(actor.workspaceId, r.userId)
        .first())
    )
      throw bookingError("Choose a team member from this workspace.");
  }
  await resolveBookingReferences(db, actor.workspaceId, settings);
  const currentPage = await bookingPage(db, actor.workspaceId);
  if (
    currentPage &&
    currentPage.public_slug !== slug &&
    (await db
      .prepare(
        "SELECT id FROM crm_calendar_events WHERE workspace_id=? AND kind='booking' LIMIT 1",
      )
      .bind(actor.workspaceId)
      .first())
  )
    throw bookingError(
      "This address is used by existing bookings. Keep it to preserve their access links.",
      409,
    );
  for (const old of currentPage?.settings.resources || []) {
    const next = settings.resources.find((r) => r.id === old.id);
    if (
      (!next || next.userId !== old.userId) &&
      (await db
        .prepare(
          "SELECT id FROM crm_calendar_events WHERE workspace_id=? AND resource_id=? AND ends_at>? AND status IN ('held','requested','confirmed','payment_review') LIMIT 1",
        )
        .bind(actor.workspaceId, old.id, Date.now())
        .first())
    )
      throw bookingError(
        "Move this team member’s future appointments before changing their workspace assignment.",
        409,
      );
  }
  if (
    input.enabled &&
    !settings.services.some(
      (s) =>
        s.active &&
        s.resourceIds.some((id) =>
          settings.resources.some(
            (r) =>
              r.id === id &&
              r.active &&
              (r.hours.length || r.overrides?.some((o) => o.hours.length)),
          ),
        ),
    )
  )
    throw bookingError(
      "Add a service and team availability before enabling booking.",
    );
  if (
    input.enabled &&
    settings.services.some(
      (s) =>
        s.active &&
        (s.amount > 0 ||
          s.addonIds.some((id) =>
            settings.addons.some(
              (a) => a.id === id && a.active && a.amount > 0,
            ),
          )),
    )
  ) {
    await requireWorkspaceEntitlement(db, actor.workspaceId, "invoices");
    const collectsNow = settings.services.some(
      (s) =>
        s.active &&
        (s.payment === "full" ||
          s.payment === "deposit" ||
          (s.payment === "schedule" &&
            s.schedule?.depositType !== "none" &&
            s.schedule?.depositDueDaysAfterAcceptance === 0)) &&
        (s.amount > 0 ||
          s.addonIds.some((id) =>
            settings.addons.some(
              (a) => a.id === id && a.active && a.amount > 0,
            ),
          )),
    );
    if (collectsNow) {
      await requireWorkspaceEntitlement(
        db,
        actor.workspaceId,
        "connected-payments",
      );
      if (
        !(await getOnlineBookingAdmin(db, env, actor)).paymentsReady ||
        !env.WEDPLANNED_STRIPE_SECRET_KEY
      )
        throw bookingError(
          "Complete Payment setup before enabling upfront booking payments.",
          409,
        );
    }
  }
  try {
    if (Number(input.revision) === 0)
      await db
        .prepare(
          "INSERT INTO crm_online_booking_pages(workspace_id,public_slug,enabled,document_json) VALUES(?,?,?,?)",
        )
        .bind(
          actor.workspaceId,
          slug,
          input.enabled ? 1 : 0,
          JSON.stringify(settings),
        )
        .run();
    else {
      const result = await db
        .prepare(
          "UPDATE crm_online_booking_pages SET public_slug=?,enabled=?,document_json=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND revision=?",
        )
        .bind(
          slug,
          input.enabled ? 1 : 0,
          JSON.stringify(settings),
          actor.workspaceId,
          Number(input.revision),
        )
        .run();
      if (!result.meta?.changes)
        throw bookingError(
          "Booking settings changed elsewhere. Refresh before saving.",
          409,
        );
    }
  } catch (e: any) {
    if (/UNIQUE/.test(e.message))
      throw bookingError(
        "That booking address is already used, or settings changed elsewhere.",
        409,
      );
    throw e;
  }
  return getOnlineBookingAdmin(db, env, actor);
}
export async function publicBookingPage(db: Db, env: any, slug: string) {
  if (env.CRM_ONLINE_BOOKING_PUBLIC_ENABLED !== "true")
    throw bookingError("Online booking is unavailable.", 503);
  const row = await db
    .prepare(
      "SELECT p.*,w.name AS business_name FROM crm_online_booking_pages p JOIN workspaces w ON w.id=p.workspace_id WHERE p.public_slug=? AND p.enabled=1",
    )
    .bind(slug)
    .first();
  if (!row) throw bookingError("This booking page is unavailable.", 404);
  await requireBookingFeature(db, env, row.workspace_id);
  return { ...row, settings: JSON.parse(row.document_json) as BookingSettings };
}
export function publicBookingView(page: any) {
  const s: BookingSettings = page.settings;
  return {
    businessName: page.business_name,
    revision: page.revision,
    title: s.title,
    timezone: s.timezone,
    currency: s.currency,
    phoneRequired: s.phoneRequired,
    questions: s.questions,
    fields: bookingClientFields(s),
    privacyUrl: s.privacyUrl,
    terms: s.terms,
    noticeHours: s.noticeHours,
    horizonDays: s.horizonDays,
    services: s.services
      .filter((i) => i.active)
      .map(({ workflowId, ...service }: any) => {
        const { workflow, ...publicService } = service;
        return publicService;
      }),
    addons: s.addons.filter((i) => i.active),
    resources: s.resources
      .filter((i) => i.active)
      .map(({ id, name }) => ({ id, name })),
  };
}
export async function bookingRateLimit(
  db: Db,
  request: Request,
  slug: string,
  write: boolean,
) {
  const now = Date.now(),
    window = write ? 3600000 : 60000,
    key = await bookingHash(
      `${slug}:${request.headers.get("CF-Connecting-IP") || "unknown"}:${write}:${Math.floor(now / window)}`,
    );
  await db
    .prepare("DELETE FROM crm_booking_rate_limits WHERE expires_at<?")
    .bind(now)
    .run();
  const row = await db
    .prepare(
      "INSERT INTO crm_booking_rate_limits(bucket_key,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket_key) DO UPDATE SET count=count+1 RETURNING count",
    )
    .bind(key, now + window)
    .first();
  if (row.count > (write ? 20 : 120))
    throw bookingError("Too many requests. Please try again later.", 429);
}
export async function expireBookingHolds(
  db: Db,
  workspaceId: string,
  now = Date.now(),
) {
  const { results } = await db
    .prepare(
      "SELECT * FROM crm_calendar_events WHERE workspace_id=? AND status='held' AND expires_at<=? AND NOT EXISTS(SELECT 1 FROM crm_invoice_payments p WHERE p.workspace_id=crm_calendar_events.workspace_id AND p.invoice_id=crm_calendar_events.invoice_id)",
    )
    .bind(workspaceId, now)
    .all();
  for (const e of results)
    await db.batch([
      db
        .prepare(
          "UPDATE crm_calendar_events SET status='expired',version=version+1,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND id=? AND status='held' AND NOT EXISTS(SELECT 1 FROM crm_invoice_payments p WHERE p.workspace_id=? AND p.invoice_id=?)",
        )
        .bind(workspaceId, e.id, workspaceId, e.invoice_id),
      db
        .prepare(
          "UPDATE crm_jobs SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND id=? AND status='provisional' AND EXISTS(SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=? AND e.id=? AND e.status='expired')",
        )
        .bind(workspaceId, e.job_id, workspaceId, e.id),
      db
        .prepare(
          "UPDATE crm_invoices SET status='void',voided_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND id=? AND status='issued' AND NOT EXISTS(SELECT 1 FROM crm_invoice_payments p WHERE p.workspace_id=? AND p.invoice_id=?)",
        )
        .bind(workspaceId, e.invoice_id, workspaceId, e.invoice_id),
    ]);
}
export async function calendarBusy(
  db: Db,
  env: any,
  workspaceId: string,
  settings: BookingSettings,
  from: number,
  to: number,
  skipId = "",
): Promise<BusyTime[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM crm_calendar_events WHERE workspace_id=? AND id<>? AND status IN ('held','requested','confirmed') AND (status<>'held' OR expires_at>?) AND busy_from<? AND busy_to>?",
    )
    .bind(workspaceId, skipId, Date.now(), to, from)
    .all();
  const busy: BusyTime[] = results.map((e: any) => ({
    start: e.busy_from,
    end: e.busy_to,
    resourceId: e.resource_id,
  }));
  const { results: jobs } = await db
    .prepare(
      "SELECT id,event_date,assigned_user_id FROM crm_jobs j WHERE workspace_id=? AND status IN ('provisional','booked','active') AND event_date>=? AND event_date<=? AND NOT EXISTS(SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=j.workspace_id AND e.job_id=j.id)",
    )
    .bind(
      workspaceId,
      new Date(from).toISOString().slice(0, 10),
      new Date(to).toISOString().slice(0, 10),
    )
    .all();
  for (const j of settings.conflicts?.jobs === false ? [] : jobs) {
    const day = Date.parse(j.event_date + "T00:00:00Z");
    if (!Number.isFinite(day)) continue;
    const targets = j.assigned_user_id
      ? settings.resources
          .filter((r) => r.userId === j.assigned_user_id)
          .map((r) => r.id)
      : ["*"];
    const start = bookingLocalInstant(j.event_date, "00:00", settings.timezone),
      end = bookingLocalInstant(
        new Date(day + 86400000).toISOString().slice(0, 10),
        "00:00",
        settings.timezone,
      );
    for (const resourceId of targets) busy.push({ start, end, resourceId });
  }
  if (settings.conflicts?.leads) {
    const { results: leads } = await db
      .prepare(
        "SELECT event_date,assigned_user_id FROM crm_enquiries WHERE workspace_id=? AND status='open' AND accepted_job_id IS NULL AND event_date>=? AND event_date<=?",
      )
      .bind(
        workspaceId,
        new Date(from).toISOString().slice(0, 10),
        new Date(to).toISOString().slice(0, 10),
      )
      .all();
    for (const lead of leads) {
      if (!validBookingDate(lead.event_date)) continue;
      const next = new Date(
        Date.parse(lead.event_date + "T12:00:00Z") + 86400000,
      )
        .toISOString()
        .slice(0, 10);
      const targets = lead.assigned_user_id
        ? settings.resources
            .filter((r) => r.userId === lead.assigned_user_id)
            .map((r) => r.id)
        : ["*"];
      for (const resourceId of targets)
        busy.push({
          resourceId,
          start: bookingLocalInstant(
            lead.event_date,
            "00:00",
            settings.timezone,
          ),
          end: bookingLocalInstant(next, "00:00", settings.timezone),
        });
    }
  }
  return [
    ...busy,
    ...(await externalCalendarBusy(
      db,
      env,
      workspaceId,
      settings,
      from,
      to,
      skipId,
    )),
  ];
}
export async function getPublicBookingSlots(
  db: Db,
  env: any,
  page: any,
  input: any,
) {
  const date = String(input.date || "");
  if (!validBookingDate(date)) throw bookingError("Choose a valid date.");
  await expireBookingHolds(db, page.workspace_id);
  const { results: members } = await db
    .prepare(
      "SELECT user_id FROM business_memberships WHERE workspace_id=? AND status='active'",
    )
    .bind(page.workspace_id)
    .all();
  const effectiveSettings: BookingSettings = {
    ...page.settings,
    resources: page.settings.resources.filter(
      (r: any) => !r.userId || members.some((m: any) => m.user_id === r.userId),
    ),
  };
  const base = Date.parse(date + "T00:00:00Z"),
    busy = await calendarBusy(
      db,
      env,
      page.workspace_id,
      effectiveSettings,
      base - 14 * 3600000,
      base + 38 * 3600000,
    );
  return bookingSlots(
    effectiveSettings,
    String(input.serviceId || ""),
    input.addonIds || [],
    date,
    busy,
  );
}
function publicReceipt(e: any, token = "", paidAmount = 0) {
  const doc = JSON.parse(e.document_json);
  return {
    id: e.id,
    reference: doc.reference,
    status: e.status,
    start: e.starts_at,
    end: e.ends_at,
    expiresAt: e.expires_at,
    serviceName: doc.serviceName,
    resourceName: doc.resourceName,
    timezone: doc.timezone,
    currency: doc.currency,
    amount: doc.amount,
    dueNow: e.required_amount,
    paidAmount,
    thankYou: bookingThankYou(e),
    hasInvoice: Boolean(e.invoice_id),
    invoiceSchedule: doc.invoiceSchedule || [],
    mode: e.confirmation_mode,
    ...(token ? { token } : {}),
  };
}
export async function bookingWithToken(
  db: Db,
  slug: string,
  id: string,
  token: string,
) {
  if (!token || token.length > 200)
    throw bookingError("Booking access is invalid.", 403);
  const row = await db
    .prepare(
      "SELECT e.* FROM crm_calendar_events e JOIN crm_online_booking_pages p ON p.workspace_id=e.workspace_id WHERE p.public_slug=? AND e.id=? AND e.token_hash=?",
    )
    .bind(slug, id, await bookingHash(token))
    .first();
  if (!row) throw bookingError("Booking not found.", 404);
  return row;
}
export async function reserveOnlineBooking(
  db: Db,
  env: any,
  page: any,
  input: any,
) {
  const { name, firstName, lastName, email, phone, leadSource, answers } =
    bookingClientDetails(page.settings, input);
  if (
    input.website ||
    !name ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    input.consent !== true
  )
    throw bookingError("Complete the required client details and consent.");
  const key = String(input.idempotencyKey || "");
  if (!/^[a-zA-Z0-9_-]{20,100}$/.test(key))
    throw bookingError("Refresh the booking form and try again.");
  const requestHash = await bookingHash(
    JSON.stringify({
      name,
      email,
      phone,
      firstName,
      lastName,
      leadSource,
      answers,
      serviceId: input.serviceId,
      addonIds: input.addonIds || [],
      resourceId: input.resourceId,
      start: input.start,
    }),
  );
  const existing = await db
    .prepare(
      "SELECT * FROM crm_calendar_events WHERE workspace_id=? AND idempotency_key=?",
    )
    .bind(page.workspace_id, key)
    .first();
  // The client's unguessable retry key is also its receipt capability; no email identity is verified here.
  if (existing) {
    if (existing.request_hash !== requestHash)
      throw bookingError(
        "This request was already used for different booking details.",
        409,
      );
    return publicReceipt(existing, key);
  }
  if (Number(input.revision) !== page.revision) {
    throw bookingError(
      "Session details changed. Reload the booking page to review the latest price and availability.",
      409,
    );
  }
  if (!Number.isFinite(Number(input.start)))
    throw bookingError("Choose a valid appointment time.");
  const q = bookingQuote(page.settings, input.serviceId, input.addonIds || []),
    date = bookingLocalParts(Number(input.start), page.settings.timezone).date;
  const slots = await getPublicBookingSlots(db, env, page, {
    date,
    serviceId: input.serviceId,
    addonIds: input.addonIds || [],
  });
  const slot = slots.find(
    (s) => s.start === Number(input.start) && s.resourceId === input.resourceId,
  );
  if (!slot)
    throw bookingError(
      "That time is no longer available. Choose another time.",
      409,
    );
  if (q.amount > 0)
    await requireWorkspaceEntitlement(db, page.workspace_id, "invoices");
  if (q.dueNow > 0) {
    await requireWorkspaceEntitlement(db, page.workspace_id, "invoices");
    await requireWorkspaceEntitlement(
      db,
      page.workspace_id,
      "connected-payments",
    );
    const ps = await db
      .prepare(
        "SELECT 1 AS ready FROM workspace_payment_settings WHERE workspace_id=? AND card_payments_enabled=1 AND stripe_connection_status='ready' AND stripe_charges_enabled=1 AND stripe_payouts_enabled=1",
      )
      .bind(page.workspace_id)
      .first();
    if (!ps || !env.WEDPLANNED_STRIPE_SECRET_KEY)
      throw bookingError(
        "Online payment is currently unavailable. Please contact the business.",
        503,
      );
  }
  const ws = page.workspace_id,
    id = "ob_" + crypto.randomUUID(),
    enquiryId = "obe_" + crypto.randomUUID(),
    jobId = "obj_" + crypto.randomUUID(),
    contactId = "obc_" + crypto.randomUUID(),
    invoiceId = q.amount ? "obi_" + crypto.randomUUID() : null,
    now = Date.now();
  const resource = page.settings.resources.find(
      (r: any) => r.id === slot.resourceId,
    ),
    reference =
      "OB-" +
      new Date(now).toISOString().slice(0, 10).replace(/-/g, "") +
      "-" +
      id.slice(-8).toUpperCase();
  const status = q.dueNow
    ? "held"
    : q.service.mode === "request"
      ? "requested"
      : "confirmed";
  const doc = {
    reference,
    title: `${q.service.name} · ${name}`,
    serviceId: q.service.id,
    serviceName: q.service.name,
    resourceName: resource.name,
    timezone: page.settings.timezone,
    currency: page.settings.currency,
    amount: q.amount,
    minutes: q.minutes,
    bufferBefore: q.service.bufferBefore,
    bufferAfter: q.service.bufferAfter,
    name,
    firstName,
    lastName,
    leadSource,
    email,
    phone,
    messages: page.settings.messages || defaultBookingMessages(),
    workflow: (q.service as any).workflow || null,
    businessName: page.business_name,
    paymentMode: q.service.payment,
    invoiceSchedule: q.amount
      ? bookingInvoiceSchedule(
          q.service,
          q.amount,
          q.dueNow,
          bookingLocalParts(now, page.settings.timezone).date,
          date,
        )
      : [],
    answers,
    terms: page.settings.terms,
    consentedAt: new Date(now).toISOString(),
    addons: q.addons,
  };
  const statements = [
    db
      .prepare(
        "INSERT OR IGNORE INTO crm_pipeline_stages(id,workspace_id,stage_key,name,is_default) VALUES(?,?,'new','New',1)",
      )
      .bind("crm_stage_" + ws + "_new", ws),
    db
      .prepare(
        "INSERT OR IGNORE INTO crm_contacts(id,workspace_id,first_name,last_name,display_name,email_normalized,email,phone,source,privacy_consent_at) VALUES(?,?,?,?,?,?,?,?,'online_booking',CURRENT_TIMESTAMP)",
      )
      .bind(contactId, ws, firstName, lastName, name, email, email, phone),
    db
      .prepare(
        "INSERT INTO crm_enquiries(id,workspace_id,reference,stage_id,status,source,lead_source,event_type,event_date,service_interest,currency,notes,assigned_user_id,consent_json) VALUES(?,?,?,(SELECT id FROM crm_pipeline_stages WHERE workspace_id=? AND stage_key='new'),?,'online_booking',?,?,?,?,?,?,?,?)",
      )
      .bind(
        enquiryId,
        ws,
        reference,
        ws,
        status === "confirmed" ? "won" : "open",
        leadSource || "Online booking",
        q.service.jobType,
        date,
        q.service.name,
        page.settings.currency,
        JSON.stringify(answers),
        resource.userId || null,
        JSON.stringify({
          privacy: true,
          terms: page.settings.terms,
          at: doc.consentedAt,
        }),
      ),
    db
      .prepare(
        "INSERT INTO crm_enquiry_contacts(enquiry_id,workspace_id,contact_id,role) SELECT ?,?,id,'primary' FROM crm_contacts WHERE workspace_id=? AND email_normalized=?",
      )
      .bind(enquiryId, ws, ws, email),
    db
      .prepare(
        "INSERT INTO crm_jobs(id,workspace_id,reference,enquiry_id,job_type,status,title,booking_date,event_date,service_name,value_amount,currency,assigned_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        jobId,
        ws,
        reference,
        enquiryId,
        q.service.jobType,
        status === "confirmed" ? "booked" : "provisional",
        doc.title,
        status === "confirmed"
          ? bookingLocalParts(now, page.settings.timezone).date
          : "",
        date,
        q.service.name,
        q.amount,
        page.settings.currency,
        resource.userId || null,
      ),
    db
      .prepare(
        "INSERT INTO crm_job_contacts(job_id,workspace_id,contact_id,role) SELECT ?,?,id,'primary' FROM crm_contacts WHERE workspace_id=? AND email_normalized=?",
      )
      .bind(jobId, ws, ws, email),
    db
      .prepare(
        "UPDATE crm_enquiries SET accepted_job_id=? WHERE workspace_id=? AND id=?",
      )
      .bind(jobId, ws, enquiryId),
  ];
  if (invoiceId) {
    const today = bookingLocalParts(now, page.settings.timezone).date;
    statements.push(
      db
        .prepare(
          "INSERT INTO crm_invoices(id,workspace_id,job_id,primary_contact_id,source_id,reference,currency,subtotal_amount,total_amount,issue_date,due_date,business_snapshot_json,client_snapshot_json,booking_snapshot_json) SELECT ?,?,?,id,?,?,?,?,?,?,?,?,?,? FROM crm_contacts WHERE workspace_id=? AND email_normalized=?",
        )
        .bind(
          invoiceId,
          ws,
          jobId,
          id,
          reference,
          page.settings.currency,
          q.amount,
          q.amount,
          today,
          doc.invoiceSchedule.map((x: any) => x.date).sort()[0] || today,
          JSON.stringify({ businessName: page.business_name }),
          JSON.stringify({ name, email, phone }),
          JSON.stringify(doc),
          ws,
          email,
        ),
    );
    for (const [index, item] of [
      { name: q.service.name, amount: q.service.amount },
      ...q.addons,
    ].entries())
      statements.push(
        db
          .prepare(
            "INSERT INTO crm_invoice_items(id,workspace_id,invoice_id,name,unit_price_amount,line_total_amount,display_order) VALUES(?,?,?,?,?,?,?)",
          )
          .bind(
            invoiceId + "_" + index,
            ws,
            invoiceId,
            item.name,
            item.amount,
            item.amount,
            index,
          ),
      );
    for (const [index, item] of doc.invoiceSchedule.entries())
      statements.push(
        db
          .prepare(
            "INSERT INTO crm_invoice_schedule_items(id,workspace_id,invoice_id,schedule_type,label,amount,due_date,display_order) VALUES(?,?,?,?,?,?,?,?)",
          )
          .bind(
            invoiceId + item.suffix,
            ws,
            invoiceId,
            item.type,
            item.label,
            item.amount,
            item.date,
            index,
          ),
      );
    statements.push(
      db
        .prepare(
          "UPDATE crm_invoices SET status='issued',issued_at=CURRENT_TIMESTAMP WHERE id=? AND workspace_id=?",
        )
        .bind(invoiceId, ws),
    );
  }
  statements.push(
    db
      .prepare(
        `INSERT INTO crm_calendar_events(id,workspace_id,resource_id,staff_user_id,kind,status,starts_at,ends_at,busy_from,busy_to,local_date,expires_at,page_revision,enquiry_id,job_id,invoice_id,required_amount,confirmation_mode,idempotency_key,token_hash,request_hash,document_json) VALUES(?,?,?,?,'booking',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        id,
        ws,
        slot.resourceId,
        resource.userId || null,
        status,
        slot.start,
        slot.end,
        slot.start - q.service.bufferBefore * 60000,
        slot.end + q.service.bufferAfter * 60000,
        date,
        q.dueNow ? now + 40 * 60000 : null,
        page.revision,
        enquiryId,
        jobId,
        invoiceId,
        q.dueNow,
        q.service.mode,
        key,
        await bookingHash(key),
        requestHash,
        JSON.stringify(doc),
      ),
  );
  statements.push(
    db
      .prepare(
        "INSERT INTO crm_activities(id,workspace_id,entity_type,entity_id,event_type,summary,metadata_json) VALUES(?,?,'job',?,'online_booking.created',?,?)",
      )
      .bind(
        "oba_" + crypto.randomUUID(),
        ws,
        jobId,
        "Online booking " + reference,
        JSON.stringify({ calendarEventId: id, status }),
      ),
  );
  try {
    await db.batch(statements);
  } catch (e: any) {
    if (/UNIQUE|available|settings changed|occupies/.test(e.message)) {
      const retry = await db
        .prepare(
          "SELECT * FROM crm_calendar_events WHERE workspace_id=? AND idempotency_key=?",
        )
        .bind(ws, key)
        .first();
      if (retry && retry.request_hash === requestHash)
        return publicReceipt(retry, key);
      throw bookingError(
        "That time or booking configuration changed. Refresh availability.",
        409,
      );
    }
    throw e;
  }
  await applyBookingWorkflows(db, ws, id);
  return publicReceipt(
    await db
      .prepare(
        "SELECT * FROM crm_calendar_events WHERE id=? AND workspace_id=?",
      )
      .bind(id, ws)
      .first(),
    key,
  );
}
async function netPaid(db: Db, e: any) {
  const row = await db
    .prepare(
      "SELECT COALESCE(SUM(CASE WHEN payment_type='payment' THEN amount ELSE -amount END),0) AS paid FROM crm_invoice_payments WHERE workspace_id=? AND invoice_id=?",
    )
    .bind(e.workspace_id, e.invoice_id)
    .first();
  return Number(row.paid);
}
export async function reconcileBookingPayments(
  db: Db,
  env: any,
  workspaceId: string,
  invoiceId = "",
) {
  const { results } = await db
    .prepare(
      "SELECT * FROM crm_calendar_events WHERE workspace_id=? AND (?='' OR invoice_id=?) AND invoice_id IS NOT NULL AND status IN ('held','expired','cancelled','declined') AND required_amount>0 AND COALESCE(json_extract(document_json,'$.paymentReceivedAtCancellation'),0)=0 AND EXISTS(SELECT 1 FROM crm_invoice_payments p WHERE p.workspace_id=crm_calendar_events.workspace_id AND p.invoice_id=crm_calendar_events.invoice_id) ORDER BY updated_at LIMIT 200",
    )
    .bind(workspaceId, invoiceId, invoiceId)
    .all();
  for (const e of results) {
    const paid = await netPaid(db, e);
    if (
      paid < e.required_amount &&
      (e.status !== "held" || e.expires_at > Date.now())
    )
      continue;
    let status = e.confirmation_mode === "request" ? "requested" : "confirmed";
    if (
      paid < e.required_amount ||
      e.status !== "held" ||
      e.expires_at <= Date.now()
    )
      status = "payment_review";
    else
      try {
        const page = await bookingPage(db, workspaceId);
        const busy = await externalCalendarBusy(
          db,
          env,
          workspaceId,
          page.settings,
          e.busy_from,
          e.busy_to,
          e.id,
        );
        if (
          busy.some(
            (b) =>
              (b.resourceId === "*" || b.resourceId === e.resource_id) &&
              b.start < e.busy_to &&
              b.end > e.busy_from,
          )
        )
          status = "payment_review";
      } catch {
        status = "payment_review";
      }
    const commit = async (next: string) =>
      db.batch([
        db
          .prepare(
            "UPDATE crm_calendar_events SET status=?,version=?,google_sync_status='pending',updated_at=CURRENT_TIMESTAMP WHERE id=? AND workspace_id=?",
          )
          .bind(next, e.version + 1, e.id, workspaceId),
        db
          .prepare(
            "UPDATE crm_jobs SET status=?,booking_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND workspace_id=?",
          )
          .bind(
            next === "confirmed" ? "booked" : "provisional",
            next === "confirmed"
              ? bookingLocalParts(
                  Date.now(),
                  JSON.parse(e.document_json).timezone,
                ).date
              : "",
            e.job_id,
            workspaceId,
          ),
        db
          .prepare(
            "UPDATE crm_enquiries SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND workspace_id=?",
          )
          .bind(
            next === "confirmed" ? "won" : "open",
            e.enquiry_id,
            workspaceId,
          ),
      ]);
    try {
      await commit(status);
    } catch (error: any) {
      if (/available|occupies/.test(error.message))
        await commit("payment_review");
      else if (!/version changed/.test(error.message)) throw error;
    }
  }
  await applyBookingWorkflows(db, workspaceId);
}
export async function getBookingReceipt(
  db: Db,
  env: any,
  slug: string,
  id: string,
  token: string,
) {
  let e = await bookingDocumentEvent(db, slug, id, token);
  await requireBookingFeature(db, env, e.workspace_id);
  if (e.invoice_id)
    await reconcileBookingPayments(db, env, e.workspace_id, e.invoice_id);
  await expireBookingHolds(db, e.workspace_id);
  e = await bookingDocumentEvent(db, slug, id, token);
  await applyBookingWorkflows(db, e.workspace_id, e.id);
  return publicReceipt(e, "", e.invoice_id ? await netPaid(db, e) : 0);
}
export async function getBookingCalendar(
  db: Db,
  env: any,
  actor: any,
  from: string,
  to: string,
) {
  requireBookingActor(actor);
  await requireBookingFeature(db, env, actor.workspaceId);
  if (
    !validBookingDate(from) ||
    !validBookingDate(to) ||
    from > to ||
    Date.parse(to) - Date.parse(from) > 93 * 86400000
  )
    throw bookingError("Choose a calendar range of up to 93 days.");
  await reconcileBookingPayments(db, env, actor.workspaceId);
  await applyBookingWorkflows(db, actor.workspaceId);
  await expireBookingHolds(db, actor.workspaceId);
  const { results } = await db
    .prepare(
      "SELECT * FROM crm_calendar_events WHERE workspace_id=? AND starts_at<? AND ends_at>? ORDER BY starts_at",
    )
    .bind(
      actor.workspaceId,
      Date.parse(to + "T00:00:00Z") + 38 * 3600000,
      Date.parse(from + "T00:00:00Z") - 14 * 3600000,
    )
    .all();
  const { results: jobs } = await db
    .prepare(
      "SELECT j.id,j.title,j.event_date AS date,j.assigned_user_id AS userId,j.status FROM crm_jobs j WHERE j.workspace_id=? AND j.event_date>=? AND j.event_date<=? AND j.status NOT IN ('cancelled','archived') AND NOT EXISTS(SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=j.workspace_id AND e.job_id=j.id) ORDER BY j.event_date",
    )
    .bind(actor.workspaceId, from, to)
    .all();
  let googleBusy: BusyTime[] = [],
    googleError = "";
  const page = await bookingPage(db, actor.workspaceId);
  if (page)
    try {
      googleBusy = await googleCalendarBusy(
        db,
        env,
        actor.workspaceId,
        page.settings,
        Date.parse(from + "T00:00:00Z") - 14 * 3600000,
        Date.parse(to + "T00:00:00Z") + 38 * 3600000,
        "",
        true,
      );
    } catch {
      googleError =
        "Google availability could not be refreshed. Reconnect or retry from Calendar.";
    }
  let icloudBusy: BusyTime[] = [],
    icloudError = "";
  if (page) {
    try {
      icloudBusy = await iCloudCalendarBusy(
        db,
        env,
        actor.workspaceId,
        page.settings,
        Date.parse(from + "T00:00:00Z") - 14 * 3600000,
        Date.parse(to + "T00:00:00Z") + 38 * 3600000,
        "",
        true,
      );
    } catch {
      icloudError =
        "iCloud availability could not be refreshed. Reconnect or retry from Calendar.";
    }
  }
  return {
    icloudBusy,
    icloudError,
    googleBusy,
    googleError,
    events: results.map((e: any) => ({
      id: e.id,
      resourceId: e.resource_id,
      kind: e.kind,
      status: e.status,
      start: e.starts_at,
      end: e.ends_at,
      date: e.local_date,
      jobId: e.job_id,
      invoiceId: e.invoice_id,
      version: e.version,
      googleStatus: e.google_sync_status,
      icloudStatus: e.icloud_sync_status,
      ...JSON.parse(e.document_json),
    })),
    jobs,
  };
}
export async function changeCalendarEvent(
  db: Db,
  env: any,
  actor: any,
  id: string,
  input: any,
) {
  requireBookingActor(actor, true);
  await requireBookingFeature(db, env, actor.workspaceId);
  const page = await bookingPage(db, actor.workspaceId);
  if (!page) throw bookingError("Set up online booking first.", 409);
  const current = id
    ? await db
        .prepare(
          "SELECT * FROM crm_calendar_events WHERE workspace_id=? AND id=?",
        )
        .bind(actor.workspaceId, id)
        .first()
    : null;
  if (id && !current) throw bookingError("Calendar entry not found.", 404);
  const action = String(input.action || "block");
  if (current && current.version !== Number(input.version))
    throw bookingError("This booking changed. Refresh the calendar.", 409);
  let status = current?.status || "confirmed",
    start = current?.starts_at,
    end = current?.ends_at,
    resourceId = current?.resource_id || String(input.resourceId || "*"),
    doc = current
      ? JSON.parse(current.document_json)
      : {
          title: String(input.title || "Unavailable")
            .trim()
            .slice(0, 120),
          timezone: page.settings.timezone,
        };
  if (action === "confirm") {
    if (!current || !["requested", "payment_review"].includes(status))
      throw bookingError("This booking cannot be confirmed.", 409);
    if (
      current.required_amount > 0 &&
      (await netPaid(db, current)) < current.required_amount
    )
      throw bookingError("Payment has not been received.", 409);
    status = "confirmed";
  } else if (action === "cancel" || action === "decline") {
    if (!current) throw bookingError("Booking not found.", 404);
    status = action === "decline" ? "declined" : "cancelled";
    doc.paymentReceivedAtCancellation =
      current.required_amount > 0 &&
      (await netPaid(db, current)) >= current.required_amount;
  } else if (action === "reschedule" || action === "block") {
    if (
      current &&
      ["held", "expired", "cancelled", "declined"].includes(status)
    )
      throw bookingError("This booking cannot be moved.", 409);
    start = Number(input.start);
    end = Number(input.end);
    resourceId = String(input.resourceId || resourceId);
  } else throw bookingError("Choose a valid calendar action.");
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    end - start > 7 * 86400000
  )
    throw bookingError("Choose valid start and end times.");
  const resource = page.settings.resources.find(
    (r: any) => r.id === resourceId,
  );
  if (
    !["cancel", "decline"].includes(action) &&
    resourceId !== "*" &&
    (!resource || !resource.active)
  )
    throw bookingError("Choose an active team member.");
  if (
    current?.kind === "booking" &&
    action === "reschedule" &&
    !page.settings.services
      .find((s: any) => s.id === doc.serviceId)
      ?.resourceIds.includes(resourceId)
  )
    throw bookingError("This team member is not assigned to the service.");
  if (current?.kind === "booking" && resourceId === "*")
    throw bookingError("Assign this appointment to a team member.");
  const from = start - (doc.bufferBefore || 0) * 60000,
    to = end + (doc.bufferAfter || 0) * 60000,
    date = bookingLocalParts(start, page.settings.timezone).date;
  if (["confirmed", "requested"].includes(status)) {
    const busy = await calendarBusy(
      db,
      env,
      actor.workspaceId,
      page.settings,
      from,
      to,
      current?.id || "",
    );
    if (
      busy.some(
        (b) =>
          (resourceId === "*" ||
            b.resourceId === "*" ||
            b.resourceId === resourceId) &&
          b.start < to &&
          b.end > from,
      )
    )
      throw bookingError(
        "This time conflicts with another booking or calendar entry.",
        409,
      );
  }
  if (current?.kind === "blocked")
    doc.title = String(input.title || doc.title || "Unavailable")
      .trim()
      .slice(0, 120);
  doc.resourceName = resource?.name || doc.resourceName || "Whole business";
  doc.timezone = page.settings.timezone;
  doc.endLocalDate = bookingLocalParts(end - 1, page.settings.timezone).date;
  const statements = [];
  if (current) {
    statements.push(
      db
        .prepare(
          "UPDATE crm_calendar_events SET status=?,starts_at=?,ends_at=?,busy_from=?,busy_to=?,local_date=?,resource_id=?,staff_user_id=?,document_json=?,google_sync_status='pending',version=?,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND id=?",
        )
        .bind(
          status,
          start,
          end,
          from,
          to,
          date,
          resourceId,
          resource?.userId || null,
          JSON.stringify(doc),
          current.version + 1,
          actor.workspaceId,
          id,
        ),
    );
    if (current.job_id)
      statements.push(
        db
          .prepare(
            "UPDATE crm_jobs SET status=?,event_date=?,assigned_user_id=?,booking_date=CASE WHEN ?='confirmed' AND booking_date='' THEN ? ELSE booking_date END,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND id=?",
          )
          .bind(
            ["cancelled", "declined"].includes(status)
              ? "cancelled"
              : status === "confirmed"
                ? "booked"
                : "provisional",
            date,
            resource ? resource.userId || null : current.staff_user_id || null,
            status,
            bookingLocalParts(Date.now(), page.settings.timezone).date,
            actor.workspaceId,
            current.job_id,
          ),
      );
    if (current.enquiry_id && action === "confirm")
      statements.push(
        db
          .prepare(
            "UPDATE crm_enquiries SET status='won',updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND id=?",
          )
          .bind(actor.workspaceId, current.enquiry_id),
      );
  } else
    statements.push(
      db
        .prepare(
          "INSERT INTO crm_calendar_events(id,workspace_id,resource_id,staff_user_id,kind,status,starts_at,ends_at,busy_from,busy_to,local_date,idempotency_key,document_json) VALUES(?,?,?,?,'blocked','confirmed',?,?,?,?,?,?,?)",
        )
        .bind(
          "block_" + crypto.randomUUID(),
          actor.workspaceId,
          resourceId,
          resource?.userId || null,
          start,
          end,
          from,
          to,
          date,
          crypto.randomUUID(),
          JSON.stringify(doc),
        ),
    );
  try {
    await db.batch(statements);
  } catch (e: any) {
    if (/available|occupies|version changed/.test(e.message))
      throw bookingError("The calendar changed. Choose another time.", 409);
    throw e;
  }
  await applyBookingWorkflows(db, actor.workspaceId);
  return {
    ok: true,
    sync: await syncConnectedCalendars(db, env, actor.workspaceId),
  };
}
