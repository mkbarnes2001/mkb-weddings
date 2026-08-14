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

function lower(value: unknown) {
  return text(value).toLowerCase();
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

async function provisionBusinessWorkspaceFoundation(
  db: D1Db,
  actor: any,
  input: any,
  provisioningSource: "platform_admin" | "verified_signup",
) {
  const ownerStatus =
    provisioningSource === "verified_signup"
      ? "active"
      : "invited";

  const businessName = text(
    input?.businessName || input?.name,
  ).slice(0, 120);

  const slug = lower(input?.slug);

  const ownerEmail = lower(
    input?.ownerEmail,
  );

  const ownerDisplayName = text(
    input?.ownerDisplayName,
  ).slice(0, 120)
    || ownerEmail.split("@")[0]
    || "Business owner";

  const defaultCountry = text(
    input?.defaultCountry || "GB",
  ).toUpperCase();

  const timezone = text(
    input?.timezone || "Europe/London",
  );

  const currency = text(
    input?.currency || "GBP",
  ).toUpperCase();

  if (!businessName) {
    throw httpError(
      "Business name is required.",
    );
  }

  if (
    slug.length < 3
    || slug.length > 60
    || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    throw httpError(
      "Workspace slug must use 3–60 lowercase letters, numbers or single hyphens.",
    );
  }

  if (!/^\S+@\S+\.\S+$/.test(ownerEmail)) {
    throw httpError(
      "Enter a valid owner email address.",
    );
  }

  if (!/^[A-Z]{2}$/.test(defaultCountry)) {
    throw httpError(
      "Country must use a two-letter code.",
    );
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw httpError(
      "Currency must use a three-letter code.",
    );
  }

  if (
    !timezone
    || timezone.length > 80
    || !/^[A-Za-z0-9_+\-/]+$/.test(timezone)
  ) {
    throw httpError(
      "Enter a valid timezone.",
    );
  }

  const workspaceId =
    `workspace_${slug.replace(/-/g, "_")}`;

  const duplicate = await db.prepare(`
    SELECT id, slug
    FROM workspaces
    WHERE id = ? OR slug = ?
    LIMIT 1
  `).bind(
    workspaceId,
    slug,
  ).first();

  if (duplicate) {
    throw httpError(
      "A business workspace already uses that slug.",
      409,
    );
  }

  const marketplaceDuplicate =
    await db.prepare(`
      SELECT workspace_id
      FROM business_profiles
      WHERE marketplace_slug = ?
      LIMIT 1
    `).bind(slug).first();

  if (marketplaceDuplicate) {
    throw httpError(
      "That marketplace slug is already in use.",
      409,
    );
  }

  const existingUser = await db.prepare(`
    SELECT id, status
    FROM platform_users
    WHERE email_normalized = ?
    LIMIT 1
  `).bind(ownerEmail).first();

  if (
    existingUser
    && text(existingUser.status) === "disabled"
  ) {
    throw httpError(
      "The intended owner account is disabled.",
      409,
    );
  }

  if (
    provisioningSource === "verified_signup"
    && existingUser
  ) {
    throw httpError(
      "A WedPlanned account already exists for this email.",
      409,
    );
  }

  const ownerUserId =
    text(existingUser?.id)
    || `user_${crypto.randomUUID()}`;

  const membershipId =
    `membership_${crypto.randomUUID()}`;

  const legacyMembershipId =
    `workspace_membership_${crypto.randomUUID()}`;

  const auditId =
    `audit_${crypto.randomUUID()}`;

  const starterQuoteTemplateId =
    `crm_quote_template_${crypto.randomUUID()}`;

  const starterQuoteEmailTemplateId =
    `crm_email_template_${crypto.randomUUID()}`;

  const entitlementMetadata = JSON.stringify({
    provisionedBy: provisioningSource,
    release:
      provisioningSource === "verified_signup"
        ? "v1.10.7a"
        : "v1.10.4a",
  });

  const workspaceDocument = provisioningSource === "verified_signup"
    ? JSON.stringify({
        onboarding: {
          version: 1,
          source: "verified_signup",
          state: "active",
          confirmedSteps: [],
          deferredSteps: [],
          startedAt: new Date().toISOString(),
          completedAt: "",
        },
      })
    : "{}";

  const statements: any[] = [
    db.prepare(`
      INSERT INTO workspaces (
        id,
        slug,
        name,
        status,
        plan,
        created_at,
        updated_at
      ) VALUES (
        ?,
        ?,
        ?,
        'active',
        'foundation',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      workspaceId,
      slug,
      businessName,
    ),

    db.prepare(`
      INSERT INTO workspace_settings (
        workspace_id,
        business_name,
        contact_email,
        accent_color,
        default_country,
        timezone,
        currency,
        document_json,
        updated_at
      ) VALUES (
        ?,
        ?,
        ?,
        '#111111',
        ?,
        ?,
        ?,
        ?,
        CURRENT_TIMESTAMP
      )
    `).bind(
      workspaceId,
      businessName,
      ownerEmail,
      defaultCountry,
      timezone,
      currency,
      workspaceDocument,
    ),

    db.prepare(`
      INSERT INTO business_profiles (
        workspace_id,
        public_name,
        legal_name,
        marketplace_slug,
        business_type,
        summary,
        registration_country,
        onboarding_status,
        marketplace_status,
        created_at,
        updated_at
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        'sole_trader',
        '',
        ?,
        'foundation',
        'private',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      workspaceId,
      businessName,
      businessName,
      slug,
      defaultCountry,
    ),

    db.prepare(`
      INSERT INTO platform_users (
        id,
        email_normalized,
        email,
        display_name,
        platform_role,
        status,
        created_at,
        updated_at
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        'member',
        ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(email_normalized) DO UPDATE SET
        email = excluded.email,
        display_name = CASE
          WHEN trim(excluded.display_name) <> ''
            THEN excluded.display_name
          ELSE platform_users.display_name
        END,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      ownerUserId,
      ownerEmail,
      ownerEmail,
      ownerDisplayName,
      ownerStatus,
    ),

    db.prepare(`
      INSERT INTO business_memberships (
        id,
        workspace_id,
        user_id,
        email_normalized,
        email,
        display_name,
        job_title,
        role,
        status,
        permissions_json,
        invited_at,
        created_at,
        updated_at
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        'Owner',
        'owner',
        ?,
        '{}',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      membershipId,
      workspaceId,
      ownerUserId,
      ownerEmail,
      ownerEmail,
      ownerDisplayName,
      ownerStatus,
    ),

    db.prepare(`
      INSERT INTO workspace_memberships (
        id,
        workspace_id,
        user_email,
        role,
        status,
        created_at,
        updated_at
      ) VALUES (
        ?,
        ?,
        ?,
        'owner',
        ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      legacyMembershipId,
      workspaceId,
      ownerEmail,
      ownerStatus,
    ),

    db.prepare(`
      INSERT INTO workspace_entitlements (
        workspace_id,
        feature_key,
        source,
        enabled,
        limit_value,
        metadata_json,
        created_at,
        updated_at
      )
      SELECT
        ?,
        feature_key,
        'manual',
        1,
        NULL,
        ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM platform_features
      WHERE status = 'active'
    `).bind(
      workspaceId,
      entitlementMetadata,
    ),

    // Generic WedCRM commercial foundation for a new business.
    // Catalogue-specific packages/add-ons are intentionally not copied
    // from another workspace.
    db.prepare(`
      INSERT INTO crm_quote_templates (
        id,
        workspace_id,
        name,
        description,
        client_introduction,
        client_notes,
        status,
        version,
        is_default,
        expiry_days,
        discount_type,
        discount_value,
        tax_treatment,
        tax_rate_basis_points,
        contract_template_id,
        questionnaire_template_id,
        payment_schedule_json,
        auto_create_invoice,
        created_at,
        updated_at
      ) VALUES (
        ?,
        ?,
        'Starter Quote',
        'A reusable starting point for client quotes. Add your own packages and optional extras in WedCRM Templates.',
        'Thank you for considering us for your wedding. Review the options below and choose what suits you best.',
        '',
        'active',
        1,
        1,
        14,
        'none',
        0,
        'none',
        0,
        NULL,
        NULL,
        '{}',
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      starterQuoteTemplateId,
      workspaceId,
    ),

    db.prepare(`
      INSERT INTO crm_email_templates (
        id,
        workspace_id,
        name,
        description,
        purpose,
        subject_template,
        body_html,
        body_text,
        attachments_json,
        append_signature,
        status,
        version,
        is_default,
        created_at,
        updated_at
      ) VALUES (
        ?,
        ?,
        'Quote ready',
        'Default email used when sending a client quote.',
        'quote',
        'Your wedding quote is ready',
        '',
        ?,
        '[]',
        1,
        'active',
        1,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      starterQuoteEmailTemplateId,
      workspaceId,
      [
        'Hi {{first_name}},',
        '',
        'Your wedding quote is ready. You can review it securely using the link below:',
        '',
        '{{quote_link}}',
        '',
        'If you have any questions, just reply to this email.',
      ].join("\n"),
    ),

    db.prepare(`
      INSERT INTO crm_email_settings (
        workspace_id,
        delivery_mode,
        sender_name,
        sender_email,
        reply_to_email,
        signature_enabled,
        signature_json,
        google_email,
        smtp_host,
        smtp_port,
        smtp_security,
        smtp_username,
        credential_id,
        last_tested_at,
        last_test_status,
        created_at,
        updated_at
      ) VALUES (
        ?,
        'managed',
        ?,
        '',
        ?,
        1,
        '{}',
        '',
        '',
        587,
        'starttls',
        '',
        NULL,
        NULL,
        '',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      workspaceId,
      businessName,
      ownerEmail,
    ),

    db.prepare(`
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
        ?,
        ?,
        ?,
        'platform.business_workspace.provisioned',
        'workspace',
        ?,
        ?,
        ?,
        CURRENT_TIMESTAMP
      )
    `).bind(
      auditId,
      workspaceId,
      text(actor?.userId) || null,
      lower(actor?.email),
      workspaceId,
      `Provisioned business workspace ${businessName}.`,
      JSON.stringify({
        slug,
        ownerEmail,
        ownerInvitation:
          provisioningSource === "verified_signup"
            ? "verified"
            : "staged",
        emailSent: false,
        provisioningSource,
      }),
    ),
  ];

  await db.batch(statements);

  return {
    workspaceId,
    slug,
    businessName,
    ownerEmail,
    ownerDisplayName,
    ownerUserId,
    membershipId,
    legacyMembershipId,
  };
}

export async function provisionBusinessWorkspace(
  db: D1Db,
  actor: any,
  input: any,
) {
  requirePlatformAdmin(actor);

  await provisionBusinessWorkspaceFoundation(
    db,
    actor,
    input,
    "platform_admin",
  );

  return getPlatformAdministration(
    db,
    actor,
  );
}

export async function provisionVerifiedSignupWorkspace(
  db: D1Db,
  input: any,
) {
  const ownerEmail =
    lower(input?.ownerEmail);

  if (
    !/^\S+@\S+\.\S+$/.test(ownerEmail)
  ) {
    throw httpError(
      "Enter a valid owner email address.",
      400,
    );
  }

  const result =
    await provisionBusinessWorkspaceFoundation(
      db,
      {
        userId: "",
        email: ownerEmail,
      },
      input,
      "verified_signup",
    );

  await db.batch([
    db.prepare(`
      UPDATE platform_users
      SET
        verified_at = COALESCE(
          verified_at,
          CURRENT_TIMESTAMP
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND email_normalized = ?
        AND status = 'active'
    `).bind(
      result.ownerUserId,
      ownerEmail,
    ),

    db.prepare(`
      UPDATE business_memberships
      SET
        accepted_at = COALESCE(
          accepted_at,
          CURRENT_TIMESTAMP
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND workspace_id = ?
        AND user_id = ?
        AND status = 'active'
    `).bind(
      result.membershipId,
      result.workspaceId,
      result.ownerUserId,
    ),
  ]);

  return result;
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
