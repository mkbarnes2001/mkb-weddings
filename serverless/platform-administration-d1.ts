import {
  getPlatformFoundation,
  savePlatformSupplierTaxonomy,
} from "./platform-foundation-d1";
import {
  getPlatformModuleConfigurations,
  preparePlatformModuleConfigurationsStatements,
  savePlatformModuleConfiguration,
} from "./platform-module-config-d1";
import {
  listPlatformBrandAssets,
} from "./platform-brand-assets-d1";
import {
  getPlatformBrandingIdentity,
  preparePlatformBrandingIdentityStatements,
} from "./platform-branding-d1";

type D1Db = any;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function httpError(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function requirePlatformAdmin(actor: any) {
  if (
    text(actor?.platformRole) !== "platform_admin"
    || !(actor?.permissions || []).includes("platform:admin")
  ) {
    throw httpError(
      "WedPlanned platform administrator access is required.",
      403,
    );
  }

  if (actor?.accessMode === "support") {
    throw httpError(
      "Support sessions cannot access platform administration.",
      403,
    );
  }
}

async function schemaVersion(db: D1Db) {
  const row = await db.prepare(`
    SELECT value
    FROM schema_meta
    WHERE key = 'schema_version'
    LIMIT 1
  `).first();

  return Number(row?.value || 0);
}

export async function getPlatformAdministration(db: D1Db, actor: any) {
  requirePlatformAdmin(actor);

  const [
    version,
    workspaces,
    users,
    recentAudit,
    modules,
    brandAssets,
    platformIdentity,
    foundation,
  ] = await Promise.all([
    schemaVersion(db),
    db.prepare(`
      SELECT
        w.id,
        w.slug,
        w.name,
        w.status,
        w.plan,
        w.created_at,
        w.updated_at,
        COALESCE(NULLIF(bp.public_name, ''), w.name) AS public_name,
        COALESCE(bp.marketplace_slug, '') AS marketplace_slug,
        COALESCE(member_counts.total_members, 0) AS member_count,
        COALESCE(member_counts.active_members, 0) AS active_member_count,
        COALESCE(domain_counts.domain_count, 0) AS domain_count,
        COALESCE(
          domain_counts.verified_domain_count,
          0
        ) AS verified_domain_count
      FROM workspaces w
      LEFT JOIN business_profiles bp
        ON bp.workspace_id = w.id
      LEFT JOIN (
        SELECT
          workspace_id,
          COUNT(*) AS total_members,
          SUM(
            CASE WHEN status = 'active' THEN 1 ELSE 0 END
          ) AS active_members
        FROM business_memberships
        GROUP BY workspace_id
      ) member_counts
        ON member_counts.workspace_id = w.id
      LEFT JOIN (
        SELECT
          workspace_id,
          COUNT(*) AS domain_count,
          SUM(
            CASE WHEN verified = 1 THEN 1 ELSE 0 END
          ) AS verified_domain_count
        FROM workspace_domains
        GROUP BY workspace_id
      ) domain_counts
        ON domain_counts.workspace_id = w.id
      ORDER BY
        CASE w.status WHEN 'active' THEN 0 ELSE 1 END,
        public_name COLLATE NOCASE
    `).all(),
    db.prepare(`
      SELECT
        pu.id,
        pu.email,
        pu.display_name,
        pu.platform_role,
        pu.status,
        pu.last_signed_in_at,
        pu.created_at,
        COALESCE(
          membership_counts.membership_count,
          0
        ) AS membership_count
      FROM platform_users pu
      LEFT JOIN (
        SELECT
          user_id,
          COUNT(*) AS membership_count
        FROM business_memberships
        WHERE status = 'active'
        GROUP BY user_id
      ) membership_counts
        ON membership_counts.user_id = pu.id
      ORDER BY
        CASE pu.platform_role
          WHEN 'platform_admin' THEN 0
          WHEN 'support' THEN 1
          ELSE 2
        END,
        pu.email COLLATE NOCASE
    `).all(),
    db.prepare(`
      SELECT
        id,
        event_type,
        entity_type,
        entity_id,
        summary,
        actor_email,
        created_at
      FROM platform_audit_events
      ORDER BY created_at DESC
      LIMIT 20
    `).all(),
    getPlatformModuleConfigurations(db),
    listPlatformBrandAssets(db, actor),
    getPlatformBrandingIdentity(db),
    getPlatformFoundation(db, actor.workspaceId),
  ]);

  const workspaceRows = workspaces.results || [];
  const userRows = users.results || [];

  return {
    schemaVersion: version,
    brand: {
      name: "WedPlanned",
      primaryDomain: "wedplanned.com",
      ukDomain: "wedplanned.co.uk",
    },
    platformIdentity,
    summary: {
      workspaces: workspaceRows.length,
      activeWorkspaces: workspaceRows.filter(
        (row: any) => text(row.status) === "active",
      ).length,
      users: userRows.length,
      platformAdmins: userRows.filter(
        (row: any) => text(row.platform_role) === "platform_admin",
      ).length,
      brandAssets: brandAssets.length,
    },
    workspaces: workspaceRows.map((row: any) => ({
      id: text(row.id),
      slug: text(row.slug),
      name: text(row.public_name || row.name),
      status: text(row.status),
      plan: text(row.plan),
      marketplaceSlug: text(row.marketplace_slug),
      memberCount: Number(row.member_count || 0),
      activeMemberCount: Number(row.active_member_count || 0),
      domainCount: Number(row.domain_count || 0),
      verifiedDomainCount: Number(row.verified_domain_count || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    users: userRows.map((row: any) => ({
      id: text(row.id),
      email: text(row.email),
      displayName: text(row.display_name),
      platformRole: text(row.platform_role),
      status: text(row.status),
      membershipCount: Number(row.membership_count || 0),
      lastSignedInAt: row.last_signed_in_at || undefined,
      createdAt: row.created_at,
    })),
    modules,
    brandAssets,
    supplierTaxonomy: foundation.supplierTaxonomy,
    recentAudit: (recentAudit.results || []).map((row: any) => ({
      id: text(row.id),
      eventType: text(row.event_type),
      entityType: text(row.entity_type),
      entityId: text(row.entity_id),
      summary: text(row.summary),
      actorEmail: text(row.actor_email),
      createdAt: row.created_at,
    })),
  };
}

export async function updatePlatformModuleConfiguration(
  db: D1Db,
  actor: any,
  input: any,
) {
  requirePlatformAdmin(actor);
  await savePlatformModuleConfiguration(db, actor, input);
  return getPlatformAdministration(db, actor);
}

export async function updatePlatformBrandingAndModules(
  db: D1Db,
  actor: any,
  input: any,
) {
  requirePlatformAdmin(actor);

  const moduleWrite =
    preparePlatformModuleConfigurationsStatements(
      db,
      actor,
      input?.modules,
      false,
    );

  const brandingWrite =
    preparePlatformBrandingIdentityStatements(
      db,
      actor,
      input?.platformIdentity,
      false,
    );

  const auditStatement = db.prepare(`
    INSERT INTO platform_audit_events (
      id,
      workspace_id,
      actor_user_id,
      actor_email,
      event_type,
      entity_type,
      entity_id,
      summary,
      metadata_json,
      created_at
    ) VALUES (
      ?,
      NULL,
      ?,
      ?,
      'platform.branding_and_modules.updated',
      'platform_branding',
      'default',
      ?,
      ?,
      CURRENT_TIMESTAMP
    )
  `).bind(
    `audit_${crypto.randomUUID()}`,
    text(actor?.userId) || null,
    text(actor?.email).toLowerCase(),
    "Updated platform identity and all module appearances.",
    JSON.stringify({
      platformIdentity: brandingWrite.identity,
      modules: moduleWrite.modules,
    }),
  );

  await db.batch([
    ...moduleWrite.statements,
    ...brandingWrite.statements,
    auditStatement,
  ]);

  return getPlatformAdministration(db, actor);
}

export async function updatePlatformSupplierTaxonomy(
  db: D1Db,
  actor: any,
  input: any,
) {
  requirePlatformAdmin(actor);

  await savePlatformSupplierTaxonomy(db, {
    ...input,
    workspaceId: actor.workspaceId,
    actorEmail: actor.email,
  });

  return getPlatformAdministration(db, actor);
}
