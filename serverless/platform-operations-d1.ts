type D1Db = any;

export type OperationsActor = {
  userId?: string;
  email?: string;
  role?: string;
  platformRole?: string;
  workspaceId: string;
  businessName?: string;
  permissions?: string[];
  accessMode?: string;
};

const SUPPORT_DURATIONS = new Set([1, 4, 24, 72]);
const SUPPORT_SCOPES = new Set(["read", "manage"]);
const DELETION_COOLING_OFF_DAYS = 14;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & { statusCode?: number; details?: string[] };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function requirePermission(actor: OperationsActor, permission: string) {
  if (!(actor.permissions || []).includes(permission)) {
    throw httpError("You do not have permission to perform this action.", 403);
  }
}

function safeJson(value: unknown, fallback: any = {}) {
  try {
    return JSON.parse(text(value) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

async function audit(db: D1Db, actor: OperationsActor, input: {
  eventType: string;
  entityType?: string;
  entityId?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.prepare(`
    INSERT INTO platform_audit_events (
      id, workspace_id, actor_user_id, actor_email, event_type,
      entity_type, entity_id, summary, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    `audit_${crypto.randomUUID()}`,
    actor.workspaceId,
    text(actor.userId) || null,
    lower(actor.email),
    text(input.eventType),
    text(input.entityType),
    text(input.entityId),
    text(input.summary),
    JSON.stringify(input.metadata || {}),
  ).run();
}

function supportGrantState(row: any) {
  if (text(row?.status) === "revoked") return "revoked";
  const expiresAt = Date.parse(text(row?.expires_at));
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return "expired";
  return "active";
}

function hydrateSupportGrant(row: any) {
  return {
    id: text(row.id),
    workspaceId: text(row.workspace_id),
    scope: text(row.scope || "read"),
    status: supportGrantState(row),
    reason: text(row.reason),
    grantedByEmail: text(row.granted_by_email),
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at || undefined,
    revokedByEmail: text(row.revoked_by_email),
  };
}

function hydrateExportEvent(row: any) {
  return {
    id: text(row.id),
    status: text(row.status),
    format: text(row.format),
    fileName: text(row.file_name),
    tableCount: Number(row.table_count || 0),
    recordCount: Number(row.record_count || 0),
    requestedByEmail: text(row.requested_by_email),
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
  };
}

function hydrateDeletionRequest(row: any) {
  return {
    id: text(row.id),
    status: text(row.status),
    reason: text(row.reason),
    confirmationName: text(row.confirmation_name),
    requestedByEmail: text(row.requested_by_email),
    scheduledFor: row.scheduled_for,
    retention: safeJson(row.retention_json, {}),
    cancelledAt: row.cancelled_at || undefined,
    cancelledByEmail: text(row.cancelled_by_email),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPlatformOperations(db: D1Db, actor: OperationsActor) {
  requirePermission(actor, "operations:read");
  const [workspace, supportRows, exportRows, deletionRows, supportEventRows] = await Promise.all([
    db.prepare(`
      SELECT w.id, w.slug, w.name, w.status, w.plan,
             COALESCE(NULLIF(bp.public_name, ''), w.name) AS business_name
      FROM workspaces w
      LEFT JOIN business_profiles bp ON bp.workspace_id = w.id
      WHERE w.id = ?
      LIMIT 1
    `).bind(actor.workspaceId).first(),
    db.prepare(`
      SELECT * FROM platform_support_grants
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT 12
    `).bind(actor.workspaceId).all(),
    db.prepare(`
      SELECT * FROM workspace_export_events
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT 12
    `).bind(actor.workspaceId).all(),
    db.prepare(`
      SELECT * FROM workspace_deletion_requests
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT 8
    `).bind(actor.workspaceId).all(),
    db.prepare(`
      SELECT id, grant_id, support_email, event_type, method, path, status_code, created_at
      FROM platform_support_events
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(actor.workspaceId).all(),
  ]);
  if (!workspace) throw httpError("Business workspace not found.", 404);

  const supportGrants = (supportRows.results || []).map(hydrateSupportGrant);
  const activeSupportGrant = supportGrants.find((grant: any) => grant.status === "active") || null;
  const deletionRequests = (deletionRows.results || []).map(hydrateDeletionRequest);

  return {
    schemaVersion: 32,
    workspace: {
      id: text(workspace.id),
      slug: text(workspace.slug),
      name: text(workspace.business_name || workspace.name),
      status: text(workspace.status),
      plan: text(workspace.plan),
    },
    support: {
      activeGrant: activeSupportGrant,
      grants: supportGrants,
      recentEvents: (supportEventRows.results || []).map((row: any) => ({
        id: text(row.id),
        grantId: text(row.grant_id),
        supportEmail: text(row.support_email),
        eventType: text(row.event_type),
        method: text(row.method),
        path: text(row.path),
        statusCode: row.status_code == null ? null : Number(row.status_code),
        createdAt: row.created_at,
      })),
    },
    exports: (exportRows.results || []).map(hydrateExportEvent),
    deletion: {
      activeRequest: deletionRequests.find((request: any) => ["requested", "approved", "executing"].includes(request.status)) || null,
      requests: deletionRequests,
      coolingOffDays: DELETION_COOLING_OFF_DAYS,
      protectedRecords: [
        "Payment, fulfilment and tax-related records are reviewed before any deletion is executed.",
        "Security, support and audit events are retained separately from ordinary workspace content.",
        "Private asset binaries are never deleted by the request itself; deletion remains a staged platform operation.",
      ],
    },
  };
}

export async function grantSupportAccess(db: D1Db, actor: OperationsActor, input: any) {
  requirePermission(actor, "support:manage");
  if (actor.accessMode === "support") throw httpError("Support users cannot grant support access.", 403);
  const scope = lower(input?.scope || "read");
  const hours = Number(input?.hours || 4);
  const reason = text(input?.reason).slice(0, 500);
  if (!SUPPORT_SCOPES.has(scope)) throw httpError("Choose read-only or manage support access.");
  if (!SUPPORT_DURATIONS.has(hours)) throw httpError("Choose a supported access duration.");

  await db.prepare(`
    UPDATE platform_support_grants
    SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP,
        revoked_by_user_id = ?, revoked_by_email = ?, updated_at = CURRENT_TIMESTAMP
    WHERE workspace_id = ? AND status = 'active' AND datetime(expires_at) > CURRENT_TIMESTAMP
  `).bind(text(actor.userId) || null, lower(actor.email), actor.workspaceId).run();

  const id = `support_grant_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  await db.prepare(`
    INSERT INTO platform_support_grants (
      id, workspace_id, scope, status, reason,
      granted_by_user_id, granted_by_email, granted_at, expires_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, 'active', ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    id,
    actor.workspaceId,
    scope,
    reason,
    text(actor.userId) || null,
    lower(actor.email),
    expiresAt,
  ).run();

  await audit(db, actor, {
    eventType: "support.access.granted",
    entityType: "support_grant",
    entityId: id,
    summary: `Granted ${scope === "manage" ? "managed" : "read-only"} WedPlanned support access for ${hours} hour${hours === 1 ? "" : "s"}.`,
    metadata: { scope, hours, reason },
  });
  return getPlatformOperations(db, actor);
}

export async function revokeSupportAccess(db: D1Db, actor: OperationsActor, grantIdInput: unknown) {
  requirePermission(actor, "support:manage");
  if (actor.accessMode === "support") throw httpError("Support users cannot revoke support access.", 403);
  const grantId = text(grantIdInput);
  const result = await db.prepare(`
    UPDATE platform_support_grants
    SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP,
        revoked_by_user_id = ?, revoked_by_email = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workspace_id = ? AND status = 'active'
  `).bind(text(actor.userId) || null, lower(actor.email), grantId, actor.workspaceId).run();
  if (Number(result?.meta?.changes || 0) !== 1) throw httpError("Active support access was not found.", 404);

  await audit(db, actor, {
    eventType: "support.access.revoked",
    entityType: "support_grant",
    entityId: grantId,
    summary: "Revoked WedPlanned support access.",
  });
  return getPlatformOperations(db, actor);
}

export async function requestWorkspaceDeletion(db: D1Db, actor: OperationsActor, input: any) {
  requirePermission(actor, "deletion:request");
  if (actor.accessMode === "support") throw httpError("Support users cannot request business deletion.", 403);
  const workspace = await db.prepare(`
    SELECT COALESCE(NULLIF(bp.public_name, ''), w.name) AS business_name
    FROM workspaces w
    LEFT JOIN business_profiles bp ON bp.workspace_id = w.id
    WHERE w.id = ?
    LIMIT 1
  `).bind(actor.workspaceId).first();
  if (!workspace) throw httpError("Business workspace not found.", 404);
  const businessName = text(workspace.business_name);
  const confirmationName = text(input?.confirmationName);
  if (confirmationName !== businessName) {
    throw httpError(`Type ${businessName} exactly to request deletion.`);
  }
  const open = await db.prepare(`
    SELECT id FROM workspace_deletion_requests
    WHERE workspace_id = ? AND status IN ('requested', 'approved', 'executing')
    LIMIT 1
  `).bind(actor.workspaceId).first();
  if (open) throw httpError("A business deletion request is already open.", 409);

  const id = `workspace_delete_${crypto.randomUUID()}`;
  const scheduledFor = new Date(Date.now() + DELETION_COOLING_OFF_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const retention = {
    destructiveExecution: false,
    paymentAndFulfilmentRecords: "review",
    platformAuditEvents: "protected",
    privateAssets: "staged",
  };
  await db.prepare(`
    INSERT INTO workspace_deletion_requests (
      id, workspace_id, requested_by_user_id, requested_by_email,
      status, reason, confirmation_name, scheduled_for, retention_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'requested', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    id,
    actor.workspaceId,
    text(actor.userId) || null,
    lower(actor.email),
    text(input?.reason).slice(0, 1000),
    confirmationName,
    scheduledFor,
    JSON.stringify(retention),
  ).run();

  await audit(db, actor, {
    eventType: "workspace.deletion.requested",
    entityType: "workspace",
    entityId: actor.workspaceId,
    summary: `Requested staged deletion of ${businessName}.`,
    metadata: { requestId: id, scheduledFor },
  });
  return getPlatformOperations(db, actor);
}

export async function cancelWorkspaceDeletion(db: D1Db, actor: OperationsActor, requestIdInput: unknown) {
  requirePermission(actor, "deletion:request");
  if (actor.accessMode === "support") throw httpError("Support users cannot cancel business deletion.", 403);
  const requestId = text(requestIdInput);
  const result = await db.prepare(`
    UPDATE workspace_deletion_requests
    SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP,
        cancelled_by_user_id = ?, cancelled_by_email = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workspace_id = ? AND status IN ('requested', 'approved')
  `).bind(text(actor.userId) || null, lower(actor.email), requestId, actor.workspaceId).run();
  if (Number(result?.meta?.changes || 0) !== 1) throw httpError("Open deletion request was not found.", 404);

  await audit(db, actor, {
    eventType: "workspace.deletion.cancelled",
    entityType: "workspace",
    entityId: actor.workspaceId,
    summary: "Cancelled the staged business deletion request.",
    metadata: { requestId },
  });
  return getPlatformOperations(db, actor);
}

const DIRECT_EXPORT_TABLES = [
  "workspace_settings",
  "workspace_domains",
  "workspace_memberships",
  "business_profiles",
  "business_category_links",
  "business_service_areas",
  "business_memberships",
  "workspace_entitlements",
  "platform_audit_events",
  "platform_support_grants",
  "platform_support_events",
  "workspace_export_events",
  "workspace_deletion_requests",
  "crm_pipeline_stages",
  "crm_contacts",
  "crm_enquiries",
  "crm_enquiry_contacts",
  "crm_jobs",
  "crm_job_contacts",
  "crm_activities",
  "crm_lead_form_settings",
  "crm_questionnaire_templates",
  "crm_questionnaire_instances",
  "crm_questionnaire_responses",
  "crm_questionnaire_files",
  "crm_job_client_access",
  "crm_portal_invitations",
  "crm_supplier_submissions",
  "crm_workflow_templates",
  "crm_workflow_template_steps",
  "crm_job_workflows",
  "crm_tasks",
  "crm_communications",
  "crm_packages",
  "crm_addons",
  "crm_package_addons",
  "crm_quotes",
  "crm_quote_versions",
  "crm_quote_options",
  "crm_quote_option_items",
  "crm_quote_option_addons",
  "crm_quote_client_access",
  "crm_quote_invitations",
  "crm_quote_acceptances",
  "crm_quote_acceptance_addons",
  "venues",
  "weddings",
  "images",
  "venue_images",
  "wedding_images",
  "story_images",
  "published_story_images",
  "wedding_suppliers",
  "suppliers",
  "wedding_supplier_links",
  "moments",
  "custom_collections",
  "collection_images",
  "content_pages",
  "assets",
  "asset_upload_sessions",
  "asset_download_events",
  "asset_wedding_links",
  "asset_venue_links",
  "asset_moment_links",
  "asset_gallery_links",
  "location_types",
  "location_areas",
  "location_gallery_settings",
  "client_identities",
  "client_galleries",
  "commerce_products",
  "commerce_price_lists",
  "commerce_carts",
  "commerce_orders",
  "commerce_print_assets",
  "commerce_lab_submissions",
];

const CHILD_EXPORT_QUERIES: Record<string, string> = {
  asset_files: `SELECT child.* FROM asset_files child JOIN assets parent ON parent.id = child.asset_id WHERE parent.workspace_id = ?`,
  asset_capture_metadata: `SELECT child.* FROM asset_capture_metadata child JOIN assets parent ON parent.id = child.asset_id WHERE parent.workspace_id = ?`,
  venue_location_links: `SELECT child.* FROM venue_location_links child JOIN venues parent ON parent.slug = child.venue_slug WHERE parent.workspace_id = ?`,
  wedding_preview_assets: `SELECT child.* FROM wedding_preview_assets child JOIN wedding_preview_sets parent ON parent.id = child.preview_set_id WHERE parent.workspace_id = ?`,
  client_gallery_access_settings: `SELECT child.* FROM client_gallery_access_settings child JOIN client_galleries parent ON parent.id = child.gallery_id WHERE parent.workspace_id = ?`,
  client_gallery_albums: `SELECT child.* FROM client_gallery_albums child JOIN client_galleries parent ON parent.id = child.gallery_id WHERE parent.workspace_id = ?`,
  client_gallery_album_assets: `SELECT child.* FROM client_gallery_album_assets child JOIN client_gallery_albums album ON album.id = child.album_id JOIN client_galleries parent ON parent.id = album.gallery_id WHERE parent.workspace_id = ?`,
  client_gallery_assets: `SELECT child.* FROM client_gallery_assets child JOIN client_galleries parent ON parent.id = child.gallery_id WHERE parent.workspace_id = ?`,
  client_gallery_branding: `SELECT child.* FROM client_gallery_branding child JOIN client_galleries parent ON parent.id = child.gallery_id WHERE parent.workspace_id = ?`,
  client_gallery_contacts: `SELECT child.* FROM client_gallery_contacts child JOIN client_galleries parent ON parent.id = child.gallery_id WHERE parent.workspace_id = ?`,
  client_gallery_display_settings: `SELECT child.* FROM client_gallery_display_settings child JOIN client_galleries parent ON parent.id = child.gallery_id WHERE parent.workspace_id = ?`,
  client_gallery_favourites: `SELECT child.* FROM client_gallery_favourites child JOIN client_galleries parent ON parent.id = child.gallery_id WHERE parent.workspace_id = ?`,
  client_gallery_selection_requests: `SELECT child.* FROM client_gallery_selection_requests child JOIN client_galleries parent ON parent.id = child.gallery_id WHERE parent.workspace_id = ?`,
  client_gallery_selections: `SELECT child.* FROM client_gallery_selections child JOIN client_galleries parent ON parent.id = child.gallery_id WHERE parent.workspace_id = ?`,
  client_gallery_selection_assets: `SELECT child.* FROM client_gallery_selection_assets child JOIN client_gallery_selections selection_row ON selection_row.id = child.selection_id JOIN client_galleries parent ON parent.id = selection_row.gallery_id WHERE parent.workspace_id = ?`,
  client_gallery_store_settings: `SELECT child.* FROM client_gallery_store_settings child JOIN client_galleries parent ON parent.id = child.gallery_id WHERE parent.workspace_id = ?`,
  client_gallery_visitors: `SELECT child.* FROM client_gallery_visitors child JOIN client_galleries parent ON parent.id = child.gallery_id WHERE parent.workspace_id = ?`,
  client_identity_gallery_visitors: `SELECT child.* FROM client_identity_gallery_visitors child JOIN client_galleries parent ON parent.id = child.gallery_id WHERE parent.workspace_id = ?`,
  commerce_product_variants: `SELECT child.* FROM commerce_product_variants child JOIN commerce_products parent ON parent.id = child.product_id WHERE parent.workspace_id = ?`,
  commerce_price_list_items: `SELECT child.* FROM commerce_price_list_items child JOIN commerce_price_lists parent ON parent.id = child.price_list_id WHERE parent.workspace_id = ?`,
  commerce_cart_items: `SELECT child.* FROM commerce_cart_items child JOIN commerce_carts parent ON parent.id = child.cart_id WHERE parent.workspace_id = ?`,
  commerce_order_items: `SELECT child.* FROM commerce_order_items child JOIN commerce_orders parent ON parent.id = child.order_id WHERE parent.workspace_id = ?`,
  commerce_payment_events: `SELECT child.* FROM commerce_payment_events child JOIN commerce_orders parent ON parent.id = child.order_id WHERE parent.workspace_id = ?`,
  commerce_lab_submission_items: `SELECT child.* FROM commerce_lab_submission_items child JOIN commerce_lab_submissions parent ON parent.id = child.submission_id WHERE parent.workspace_id = ?`,
  commerce_lab_events: `SELECT child.* FROM commerce_lab_events child JOIN commerce_lab_submissions parent ON parent.id = child.submission_id WHERE parent.workspace_id = ?`,
};

const EXPORT_REDACTIONS: Record<string, string[]> = {
  client_galleries: ["access_token", "pin_hash"],
  crm_portal_invitations: ["token_hash"],
  crm_quote_invitations: ["token_hash"],
  crm_questionnaire_files: ["storage_key"],
  commerce_print_assets: ["access_token"],
  asset_upload_sessions: ["multipart_upload_id"],
};

function redactExportRows(tableName: string, rows: any[]) {
  const fields = EXPORT_REDACTIONS[tableName] || [];
  if (!fields.length) return rows;
  return rows.map((row) => {
    const copy = { ...row };
    for (const field of fields) {
      if (field in copy && copy[field]) copy[field] = "[redacted]";
    }
    return copy;
  });
}

export async function createWorkspaceExport(db: D1Db, actor: OperationsActor) {
  requirePermission(actor, "data:export");
  if (actor.accessMode === "support") throw httpError("Support sessions cannot download a business data export.", 403);
  const workspace = await db.prepare(`SELECT * FROM workspaces WHERE id = ? LIMIT 1`).bind(actor.workspaceId).first();
  if (!workspace) throw httpError("Business workspace not found.", 404);

  const eventId = `workspace_export_${crypto.randomUUID()}`;
  const safeSlug = text(workspace.slug || "workspace").replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  const day = new Date().toISOString().slice(0, 10);
  const fileName = `wedplanned-${safeSlug || "workspace"}-export-${day}.json`;
  await db.prepare(`
    INSERT INTO workspace_export_events (
      id, workspace_id, requested_by_user_id, requested_by_email,
      status, format, file_name, created_at
    ) VALUES (?, ?, ?, ?, 'processing', 'json', ?, CURRENT_TIMESTAMP)
  `).bind(eventId, actor.workspaceId, text(actor.userId) || null, lower(actor.email), fileName).run();

  try {
    const tables: Record<string, any[]> = {};
    tables.workspaces = [workspace];

    const directStatements = DIRECT_EXPORT_TABLES.map((tableName) =>
      db.prepare(`SELECT * FROM ${tableName} WHERE workspace_id = ?`).bind(actor.workspaceId)
    );
    const childEntries = Object.entries(CHILD_EXPORT_QUERIES);
    const childStatements = childEntries.map(([, sql]) => db.prepare(sql).bind(actor.workspaceId));
    const results = await db.batch([...directStatements, ...childStatements]);

    DIRECT_EXPORT_TABLES.forEach((tableName, index) => {
      tables[tableName] = redactExportRows(tableName, results[index]?.results || []);
    });
    childEntries.forEach(([tableName], index) => {
      const result = results[DIRECT_EXPORT_TABLES.length + index];
      tables[tableName] = redactExportRows(tableName, result?.results || []);
    });

    const tableCount = Object.keys(tables).length;
    const recordCount = Object.values(tables).reduce((sum, rows) => sum + rows.length, 0);
    const schema = await db.prepare(`SELECT value FROM schema_meta WHERE key = 'schema_version' LIMIT 1`).first();
    const payload = {
      exportVersion: 1,
      generatedAt: new Date().toISOString(),
      schemaVersion: Number(schema?.value || 27),
      workspaceId: actor.workspaceId,
      businessName: text(actor.businessName || workspace.name),
      recordCount,
      tableCount,
      notes: [
        "This export contains structured workspace data and asset/storage references, not binary image files.",
        "Authentication links, professional sessions, client magic links and client session tokens are excluded.",
        "Gallery PIN hashes, portal and quote invitation hashes, legacy gallery capability tokens, print-asset access tokens and active multipart-upload identifiers are redacted.",
      ],
      tables,
    };

    await db.prepare(`
      UPDATE workspace_export_events
      SET table_count = ?, record_count = ?, completed_at = CURRENT_TIMESTAMP,
          metadata_json = ?, status = 'completed'
      WHERE id = ? AND workspace_id = ?
    `).bind(tableCount, recordCount, JSON.stringify({ schemaVersion: payload.schemaVersion }), eventId, actor.workspaceId).run();
    await audit(db, actor, {
      eventType: "workspace.export.completed",
      entityType: "workspace_export",
      entityId: eventId,
      summary: `Downloaded a workspace data export containing ${recordCount} records across ${tableCount} tables.`,
      metadata: { fileName, recordCount, tableCount },
    });
    return { fileName, payload };
  } catch (error: any) {
    await db.prepare(`
      UPDATE workspace_export_events
      SET status = 'failed', completed_at = CURRENT_TIMESTAMP,
          metadata_json = ?
      WHERE id = ? AND workspace_id = ?
    `).bind(JSON.stringify({ error: text(error?.message).slice(0, 500) }), eventId, actor.workspaceId).run();
    throw error;
  }
}

export async function recordSupportRequest(db: D1Db, input: {
  grantId?: string;
  workspaceId: string;
  supportUserId?: string;
  supportEmail?: string;
  eventType: string;
  method?: string;
  path?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}) {
  await db.prepare(`
    INSERT INTO platform_support_events (
      id, grant_id, workspace_id, support_user_id, support_email,
      event_type, method, path, status_code, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    `support_event_${crypto.randomUUID()}`,
    text(input.grantId) || null,
    input.workspaceId,
    text(input.supportUserId) || null,
    lower(input.supportEmail),
    text(input.eventType),
    text(input.method),
    text(input.path).slice(0, 500),
    input.statusCode == null ? null : Number(input.statusCode),
    JSON.stringify(input.metadata || {}),
  ).run();
}
