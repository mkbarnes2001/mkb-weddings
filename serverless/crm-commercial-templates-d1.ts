import {
  createQuote,
  saveQuoteDraft,
  type QuoteActor,
} from "./crm-quotes-d1";

type D1Db = any;

export type CommercialTemplateActor =
  QuoteActor & {
    accessMode?: string;
  };

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function integer(
  value: unknown,
  fallback = 0,
) {
  if (
    value === undefined
    || value === null
    || value === ""
  ) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? Math.round(parsed)
    : fallback;
}

function booleanValue(
  value: unknown,
  fallback = false,
) {
  if (
    value === undefined
    || value === null
  ) {
    return fallback;
  }

  return Boolean(value);
}

function safeJson(
  value: unknown,
  fallback: any,
) {
  try {
    return JSON.parse(
      text(value)
      || JSON.stringify(fallback),
    );
  } catch {
    return fallback;
  }
}

function objectValue(
  value: unknown,
  fallback: Record<string, unknown> = {},
) {
  return (
    value
    && typeof value === "object"
    && !Array.isArray(value)
  )
    ? value as Record<string, unknown>
    : fallback;
}

function httpError(
  message: string,
  statusCode = 400,
) {
  const error =
    new Error(message) as Error & {
      statusCode?: number;
    };

  error.statusCode = statusCode;

  return error;
}

function requirePermission(
  actor: CommercialTemplateActor,
  permission: "crm:read" | "crm:manage",
  write = false,
) {
  if (!text(actor?.workspaceId)) {
    throw httpError(
      "An active workspace is required.",
      403,
    );
  }

  if (
    !(actor?.permissions || [])
      .includes(permission)
  ) {
    throw httpError(
      `Missing permission: ${permission}.`,
      403,
    );
  }

  if (
    write
    && actor?.accessMode === "support"
  ) {
    throw httpError(
      "Support sessions cannot change commercial templates.",
      403,
    );
  }
}

async function audit(
  db: D1Db,
  actor: CommercialTemplateActor,
  eventType: string,
  entityType: string,
  entityId: string,
  summary: string,
  metadata: Record<string, unknown> = {},
) {
  await db.prepare(`
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
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      CURRENT_TIMESTAMP
    )
  `).bind(
    `audit_${crypto.randomUUID()}`,
    actor.workspaceId,
    text(actor.userId) || null,
    lower(actor.email),
    eventType,
    entityType,
    entityId,
    summary,
    JSON.stringify(metadata),
  ).run();
}

function packageOverride(
  value: unknown,
) {
  const source =
    objectValue(value);

  const result:
    Record<string, unknown> = {};

  if ("name" in source) {
    result.name =
      text(source.name).slice(0, 160);
  }

  if ("description" in source) {
    result.description =
      text(source.description)
        .slice(0, 10000);
  }

  if ("basePriceAmount" in source) {
    result.basePriceAmount =
      Math.max(
        0,
        integer(source.basePriceAmount),
      );
  }

  if ("coverageMinutes" in source) {
    result.coverageMinutes =
      source.coverageMinutes === null
        ? null
        : Math.max(
            0,
            integer(source.coverageMinutes),
          );
  }

  if (
    Array.isArray(source.deliverables)
  ) {
    result.deliverables =
      source.deliverables
        .map(text)
        .filter(Boolean)
        .slice(0, 100);
  }

  if (
    Array.isArray(source.includedItems)
  ) {
    result.includedItems =
      source.includedItems
        .map(text)
        .filter(Boolean)
        .slice(0, 100);
  }

  if ("clientNotes" in source) {
    result.clientNotes =
      text(source.clientNotes)
        .slice(0, 10000);
  }

  return result;
}

function quoteTemplateRow(
  row: any,
) {
  return {
    id: text(row?.id),
    name: text(row?.name),
    description:
      text(row?.description),
    clientIntroduction:
      text(row?.client_introduction),
    clientNotes:
      text(row?.client_notes),
    status: text(row?.status),
    version:
      Number(row?.version || 1),
    default:
      Boolean(row?.is_default),
    expiryDays:
      Number(row?.expiry_days || 0),
    discountType:
      text(
        row?.discount_type
        || "none",
      ),
    discountValue:
      Number(
        row?.discount_value || 0,
      ),
    taxTreatment:
      text(
        row?.tax_treatment
        || "none",
      ),
    taxRateBasisPoints:
      Number(
        row?.tax_rate_basis_points
        || 0,
      ),
    contractTemplateId:
      text(
        row?.contract_template_id,
      ),
    questionnaireTemplateId:
      text(
        row?.questionnaire_template_id,
      ),
    paymentSchedule:
      safeJson(
        row?.payment_schedule_json,
        {},
      ),
    autoCreateInvoice:
      Boolean(row?.auto_create_invoice),
    createdAt: row?.created_at,
    updatedAt: row?.updated_at,
  };
}

function quoteTemplatePackageRow(
  row: any,
) {
  return {
    id: text(row?.id),
    packageId:
      text(row?.package_id),
    displayOrder:
      Number(row?.display_order || 0),
    recommended:
      Boolean(row?.recommended),
    override:
      safeJson(
        row?.override_json,
        {},
      ),
    package: {
      id: text(row?.package_id),
      name: text(row?.package_name),
      description:
        text(row?.package_description),
      serviceType:
        text(row?.package_service_type),
      internalCode:
        text(row?.package_internal_code),
      priceAmount:
        Number(
          row?.package_price_amount || 0,
        ),
      currency:
        text(
          row?.package_currency
          || "GBP",
        ),
      coverageMinutes:
        row?.package_coverage_minutes
          == null
          ? null
          : Number(
              row
                .package_coverage_minutes,
            ),
      deliverables:
        safeJson(
          row
            ?.package_deliverables_json,
          [],
        ),
      includedItems:
        safeJson(
          row
            ?.package_included_items_json,
          [],
        ),
      clientNotes:
        text(
          row?.package_client_notes,
        ),
      recommended:
        Boolean(
          row?.package_recommended,
        ),
      status:
        text(row?.package_status),
      imageUrl:
        text(row?.package_image_url),
    },
  };
}

function quoteTemplateAddonRow(
  row: any,
) {
  return {
    id: text(row?.id),
    addonId:
      text(row?.addon_id),
    displayOrder:
      Number(row?.display_order || 0),
    defaultSelected:
      Boolean(row?.default_selected),
    override:
      safeJson(
        row?.override_json,
        {},
      ),
    addon: {
      id: text(row?.addon_id),
      name: text(row?.addon_name),
      description:
        text(row?.addon_description),
      priceAmount:
        Number(
          row?.addon_price_amount || 0,
        ),
      currency:
        text(
          row?.addon_currency
          || "GBP",
        ),
      serviceType:
        text(row?.addon_service_type),
      status:
        text(row?.addon_status),
      availabilityScope:
        text(
          row
            ?.addon_availability_scope
          || "all",
        ),
      minimumQuantity:
        Number(
          row?.addon_minimum_quantity
          || 0,
        ),
      maximumQuantity:
        Number(
          row?.addon_maximum_quantity
          || 1,
        ),
      requirement:
        text(
          row?.addon_requirement
          || "optional",
        ),
    },
  };
}

async function quoteTemplatePackages(
  db: D1Db,
  workspaceId: string,
  templateId: string,
) {
  const result =
    await db.prepare(`
      SELECT
        link.*,
        package.name
          AS package_name,
        package.description
          AS package_description,
        package.service_type
          AS package_service_type,
        package.internal_code
          AS package_internal_code,
        package.price_amount
          AS package_price_amount,
        package.currency
          AS package_currency,
        package.coverage_minutes
          AS package_coverage_minutes,
        package.deliverables_json
          AS package_deliverables_json,
        package.included_items_json
          AS package_included_items_json,
        package.client_notes
          AS package_client_notes,
        package.recommended
          AS package_recommended,
        package.status
          AS package_status,
        package.image_url
          AS package_image_url
      FROM crm_quote_template_packages
        AS link
      JOIN crm_packages
        AS package
        ON package.id =
          link.package_id
        AND package.workspace_id =
          link.workspace_id
      WHERE link.workspace_id = ?
        AND link.template_id = ?
      ORDER BY
        link.display_order,
        package.name COLLATE NOCASE
    `).bind(
      workspaceId,
      templateId,
    ).all();

  return (
    result.results || []
  ).map(
    quoteTemplatePackageRow,
  );
}

async function quoteTemplateAddons(
  db: D1Db,
  workspaceId: string,
  templateId: string,
) {
  const result =
    await db.prepare(`
      SELECT
        link.*,
        addon.name
          AS addon_name,
        addon.description
          AS addon_description,
        addon.price_amount
          AS addon_price_amount,
        addon.currency
          AS addon_currency,
        addon.service_type
          AS addon_service_type,
        addon.status
          AS addon_status,
        addon.availability_scope
          AS addon_availability_scope,
        addon.minimum_quantity
          AS addon_minimum_quantity,
        addon.maximum_quantity
          AS addon_maximum_quantity,
        addon.requirement
          AS addon_requirement
      FROM crm_quote_template_addons
        AS link
      JOIN crm_addons
        AS addon
        ON addon.id =
          link.addon_id
        AND addon.workspace_id =
          link.workspace_id
      WHERE link.workspace_id = ?
        AND link.template_id = ?
      ORDER BY
        link.display_order,
        addon.name COLLATE NOCASE
    `).bind(
      workspaceId,
      templateId,
    ).all();

  return (
    result.results || []
  ).map(
    quoteTemplateAddonRow,
  );
}

export async function getQuoteTemplate(
  db: D1Db,
  actor: CommercialTemplateActor,
  templateIdInput: unknown,
) {
  requirePermission(
    actor,
    "crm:read",
  );

  const templateId =
    text(templateIdInput);

  const row =
    await db.prepare(`
      SELECT *
      FROM crm_quote_templates
      WHERE workspace_id = ?
        AND id = ?
      LIMIT 1
    `).bind(
      actor.workspaceId,
      templateId,
    ).first();

  if (!row) {
    throw httpError(
      "Quote template not found.",
      404,
    );
  }

  const [
    packages,
    addons,
  ] = await Promise.all([
    quoteTemplatePackages(
      db,
      actor.workspaceId,
      templateId,
    ),
    quoteTemplateAddons(
      db,
      actor.workspaceId,
      templateId,
    ),
  ]);

  return {
    ...quoteTemplateRow(row),
    packages,
    addons,
  };
}

export async function listQuoteTemplates(
  db: D1Db,
  actor: CommercialTemplateActor,
) {
  requirePermission(
    actor,
    "crm:read",
  );

  const rows =
    await db.prepare(`
      SELECT id
      FROM crm_quote_templates
      WHERE workspace_id = ?
      ORDER BY
        is_default DESC,
        status = 'active' DESC,
        name COLLATE NOCASE
    `).bind(
      actor.workspaceId,
    ).all();

  const templates = [];

  for (
    const row of rows.results || []
  ) {
    templates.push(
      await getQuoteTemplate(
        db,
        actor,
        row.id,
      ),
    );
  }

  return templates;
}

async function requireContractTemplate(
  db: D1Db,
  workspaceId: string,
  templateId: string,
) {
  if (!templateId) return;

  const row =
    await db.prepare(`
      SELECT id
      FROM crm_contract_templates
      WHERE workspace_id = ?
        AND id = ?
        AND status = 'active'
      LIMIT 1
    `).bind(
      workspaceId,
      templateId,
    ).first();

  if (!row) {
    throw httpError(
      "Choose an active contract template from this workspace.",
      409,
    );
  }
}

async function requireQuestionnaireTemplate(
  db: D1Db,
  workspaceId: string,
  templateId: string,
) {
  if (!templateId) return;

  const row =
    await db.prepare(`
      SELECT id
      FROM crm_questionnaire_templates
      WHERE workspace_id = ?
        AND id = ?
        AND status = 'active'
      LIMIT 1
    `).bind(
      workspaceId,
      templateId,
    ).first();

  if (!row) {
    throw httpError(
      "Choose an active questionnaire template from this workspace.",
      409,
    );
  }
}

async function normalisePackageLinks(
  db: D1Db,
  workspaceId: string,
  value: unknown,
  activeTemplate: boolean,
) {
  const source =
    Array.isArray(value)
      ? value.slice(0, 20)
      : [];

  const seen =
    new Set<string>();

  const result: any[] = [];

  let recommendedCount = 0;

  for (
    let index = 0;
    index < source.length;
    index += 1
  ) {
    const item =
      objectValue(source[index]);

    const packageId =
      text(item.packageId);

    if (!packageId) continue;

    if (seen.has(packageId)) {
      throw httpError(
        "A package can appear only once in a quote template.",
        409,
      );
    }

    const packageRow =
      await db.prepare(`
        SELECT id, status
        FROM crm_packages
        WHERE workspace_id = ?
          AND id = ?
        LIMIT 1
      `).bind(
        workspaceId,
        packageId,
      ).first();

    if (!packageRow) {
      throw httpError(
        "One selected package does not belong to this business.",
        409,
      );
    }

    if (
      activeTemplate
      && text(packageRow.status)
        !== "active"
    ) {
      throw httpError(
        "Active quote templates can use only active packages.",
        409,
      );
    }

    if (
      text(packageRow.status)
        === "archived"
    ) {
      throw httpError(
        "Archived packages cannot be added to a quote template.",
        409,
      );
    }

    const recommended =
      Boolean(item.recommended);

    if (recommended) {
      recommendedCount += 1;
    }

    seen.add(packageId);

    result.push({
      id:
        text(item.id)
        || `crm_quote_template_package_${crypto.randomUUID()}`,
      packageId,
      displayOrder:
        integer(
          item.displayOrder,
          (index + 1) * 10,
        ),
      recommended,
      override:
        packageOverride(
          item.override,
        ),
    });
  }

  if (
    activeTemplate
    && !result.length
  ) {
    throw httpError(
      "An active quote template needs at least one package.",
      409,
    );
  }

  if (recommendedCount > 1) {
    throw httpError(
      "Choose only one recommended package in a quote template.",
      409,
    );
  }

  return result;
}

async function normaliseAddonLinks(
  db: D1Db,
  workspaceId: string,
  value: unknown,
  activeTemplate: boolean,
) {
  const source =
    Array.isArray(value)
      ? value.slice(0, 50)
      : [];

  const seen =
    new Set<string>();

  const result: any[] = [];

  for (
    let index = 0;
    index < source.length;
    index += 1
  ) {
    const item =
      objectValue(source[index]);

    const addonId =
      text(item.addonId);

    if (!addonId) continue;

    if (seen.has(addonId)) {
      throw httpError(
        "An add-on can appear only once in a quote template.",
        409,
      );
    }

    const addonRow =
      await db.prepare(`
        SELECT id, status
        FROM crm_addons
        WHERE workspace_id = ?
          AND id = ?
        LIMIT 1
      `).bind(
        workspaceId,
        addonId,
      ).first();

    if (!addonRow) {
      throw httpError(
        "One selected add-on does not belong to this business.",
        409,
      );
    }

    if (
      activeTemplate
      && text(addonRow.status)
        !== "active"
    ) {
      throw httpError(
        "Active quote templates can use only active add-ons.",
        409,
      );
    }

    if (
      text(addonRow.status)
        === "archived"
    ) {
      throw httpError(
        "Archived add-ons cannot be added to a quote template.",
        409,
      );
    }

    seen.add(addonId);

    result.push({
      id:
        text(item.id)
        || `crm_quote_template_addon_${crypto.randomUUID()}`,
      addonId,
      displayOrder:
        integer(
          item.displayOrder,
          (index + 1) * 10,
        ),
      defaultSelected:
        Boolean(
          item.defaultSelected,
        ),
      override:
        objectValue(
          item.override,
        ),
    });
  }

  return result;
}

async function normaliseQuoteTemplate(
  db: D1Db,
  actor: CommercialTemplateActor,
  input: any,
  current: any = null,
) {
  const name =
    text(
      input?.name
      ?? current?.name,
    ).slice(0, 160);

  if (!name) {
    throw httpError(
      "Enter a quote template name.",
    );
  }

  const statusInput =
    text(
      input?.status
      ?? current?.status
      ?? "draft",
    );

  const status =
    [
      "draft",
      "active",
      "archived",
    ].includes(statusInput)
      ? statusInput
      : "draft";

  const makeDefault =
    booleanValue(
      input?.default,
      Boolean(current?.default),
    );

  if (
    makeDefault
    && status !== "active"
  ) {
    throw httpError(
      "Only an active quote template can be the default.",
      409,
    );
  }

  const contractTemplateId =
    text(
      input?.contractTemplateId
      ?? current
        ?.contractTemplateId,
    );

  const questionnaireTemplateId =
    text(
      input
        ?.questionnaireTemplateId
      ?? current
        ?.questionnaireTemplateId,
    );

  await Promise.all([
    requireContractTemplate(
      db,
      actor.workspaceId,
      contractTemplateId,
    ),
    requireQuestionnaireTemplate(
      db,
      actor.workspaceId,
      questionnaireTemplateId,
    ),
  ]);

  const packageSource =
    input?.packages
    ?? current?.packages?.map(
      (item: any) => ({
        id: item.id,
        packageId:
          item.packageId,
        displayOrder:
          item.displayOrder,
        recommended:
          item.recommended,
        override:
          item.override,
      }),
    )
    ?? [];

  const addonSource =
    input?.addons
    ?? current?.addons?.map(
      (item: any) => ({
        id: item.id,
        addonId:
          item.addonId,
        displayOrder:
          item.displayOrder,
        defaultSelected:
          item.defaultSelected,
        override:
          item.override,
      }),
    )
    ?? [];

  const [
    packages,
    addons,
  ] = await Promise.all([
    normalisePackageLinks(
      db,
      actor.workspaceId,
      packageSource,
      status === "active",
    ),
    normaliseAddonLinks(
      db,
      actor.workspaceId,
      addonSource,
      status === "active",
    ),
  ]);

  const discountTypeInput =
    text(
      input?.discountType
      ?? current?.discountType
      ?? "none",
    );

  const discountType =
    [
      "none",
      "fixed",
      "percentage",
    ].includes(discountTypeInput)
      ? discountTypeInput
      : "none";

  const taxTreatmentInput =
    text(
      input?.taxTreatment
      ?? current?.taxTreatment
      ?? "none",
    );

  const taxTreatment =
    [
      "none",
      "inclusive",
      "exclusive",
    ].includes(taxTreatmentInput)
      ? taxTreatmentInput
      : "none";

  return {
    name,
    description:
      text(
        input?.description
        ?? current?.description,
      ).slice(0, 10000),
    clientIntroduction:
      text(
        input?.clientIntroduction
        ?? current
          ?.clientIntroduction,
      ).slice(0, 20000),
    clientNotes:
      text(
        input?.clientNotes
        ?? current?.clientNotes,
      ).slice(0, 20000),
    status,
    default: makeDefault,
    expiryDays:
      Math.min(
        3650,
        Math.max(
          0,
          integer(
            input?.expiryDays
            ?? current?.expiryDays,
            14,
          ),
        ),
      ),
    discountType,
    discountValue:
      Math.max(
        0,
        integer(
          input?.discountValue
          ?? current?.discountValue,
        ),
      ),
    taxTreatment,
    taxRateBasisPoints:
      Math.max(
        0,
        integer(
          input
            ?.taxRateBasisPoints
          ?? current
            ?.taxRateBasisPoints,
        ),
      ),
    contractTemplateId,
    questionnaireTemplateId,
    paymentSchedule:
      objectValue(
        input?.paymentSchedule
        ?? current
          ?.paymentSchedule,
      ),
    autoCreateInvoice:
      booleanValue(
        input?.autoCreateInvoice,
        current
          ? Boolean(
              current
                .autoCreateInvoice,
            )
          : true,
      ),
    packages,
    addons,
  };
}

async function writeQuoteTemplate(
  db: D1Db,
  actor: CommercialTemplateActor,
  templateId: string,
  value: any,
  create: boolean,
) {
  const statements: any[] = [];

  if (value.default) {
    statements.push(
      db.prepare(`
        UPDATE crm_quote_templates
        SET
          is_default = 0,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE workspace_id = ?
          AND id <> ?
      `).bind(
        actor.workspaceId,
        templateId,
      ),
    );
  }

  if (create) {
    statements.push(
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
          created_by_user_id,
          updated_by_user_id,
          created_at,
          updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          1, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `).bind(
        templateId,
        actor.workspaceId,
        value.name,
        value.description,
        value.clientIntroduction,
        value.clientNotes,
        value.status,
        value.default ? 1 : 0,
        value.expiryDays,
        value.discountType,
        value.discountValue,
        value.taxTreatment,
        value.taxRateBasisPoints,
        value.contractTemplateId
          || null,
        value
          .questionnaireTemplateId
          || null,
        JSON.stringify(
          value.paymentSchedule,
        ),
        value.autoCreateInvoice
          ? 1
          : 0,
        text(actor.userId)
          || null,
        text(actor.userId)
          || null,
      ),
    );
  } else {
    statements.push(
      db.prepare(`
        UPDATE crm_quote_templates
        SET
          name = ?,
          description = ?,
          client_introduction = ?,
          client_notes = ?,
          status = ?,
          version = version + 1,
          is_default = ?,
          expiry_days = ?,
          discount_type = ?,
          discount_value = ?,
          tax_treatment = ?,
          tax_rate_basis_points = ?,
          contract_template_id = ?,
          questionnaire_template_id = ?,
          payment_schedule_json = ?,
          auto_create_invoice = ?,
          updated_by_user_id = ?,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE workspace_id = ?
          AND id = ?
      `).bind(
        value.name,
        value.description,
        value.clientIntroduction,
        value.clientNotes,
        value.status,
        value.default ? 1 : 0,
        value.expiryDays,
        value.discountType,
        value.discountValue,
        value.taxTreatment,
        value.taxRateBasisPoints,
        value.contractTemplateId
          || null,
        value
          .questionnaireTemplateId
          || null,
        JSON.stringify(
          value.paymentSchedule,
        ),
        value.autoCreateInvoice
          ? 1
          : 0,
        text(actor.userId)
          || null,
        actor.workspaceId,
        templateId,
      ),
    );
  }

  statements.push(
    db.prepare(`
      DELETE FROM
        crm_quote_template_packages
      WHERE workspace_id = ?
        AND template_id = ?
    `).bind(
      actor.workspaceId,
      templateId,
    ),
  );

  statements.push(
    db.prepare(`
      DELETE FROM
        crm_quote_template_addons
      WHERE workspace_id = ?
        AND template_id = ?
    `).bind(
      actor.workspaceId,
      templateId,
    ),
  );

  for (
    const item of value.packages
  ) {
    statements.push(
      db.prepare(`
        INSERT INTO
          crm_quote_template_packages (
            id,
            workspace_id,
            template_id,
            package_id,
            display_order,
            recommended,
            override_json,
            created_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            CURRENT_TIMESTAMP
          )
      `).bind(
        item.id,
        actor.workspaceId,
        templateId,
        item.packageId,
        item.displayOrder,
        item.recommended ? 1 : 0,
        JSON.stringify(
          item.override,
        ),
      ),
    );
  }

  for (
    const item of value.addons
  ) {
    statements.push(
      db.prepare(`
        INSERT INTO
          crm_quote_template_addons (
            id,
            workspace_id,
            template_id,
            addon_id,
            display_order,
            default_selected,
            override_json,
            created_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            CURRENT_TIMESTAMP
          )
      `).bind(
        item.id,
        actor.workspaceId,
        templateId,
        item.addonId,
        item.displayOrder,
        item.defaultSelected
          ? 1
          : 0,
        JSON.stringify(
          item.override,
        ),
      ),
    );
  }

  await db.batch(statements);
}

export async function createQuoteTemplate(
  db: D1Db,
  actor: CommercialTemplateActor,
  input: any,
) {
  requirePermission(
    actor,
    "crm:manage",
    true,
  );

  const value =
    await normaliseQuoteTemplate(
      db,
      actor,
      input,
    );

  const duplicate =
    await db.prepare(`
      SELECT id
      FROM crm_quote_templates
      WHERE workspace_id = ?
        AND lower(name) =
          lower(?)
      LIMIT 1
    `).bind(
      actor.workspaceId,
      value.name,
    ).first();

  if (duplicate) {
    throw httpError(
      "A quote template with this name already exists.",
      409,
    );
  }

  const templateId =
    `crm_quote_template_${crypto.randomUUID()}`;

  await writeQuoteTemplate(
    db,
    actor,
    templateId,
    value,
    true,
  );

  await audit(
    db,
    actor,
    "crm.quote_template.created",
    "crm_quote_template",
    templateId,
    `Created quote template: ${value.name}.`,
    {
      status: value.status,
      packageCount:
        value.packages.length,
      addonCount:
        value.addons.length,
    },
  );

  return getQuoteTemplate(
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
    templateId,
  );
}

export async function saveQuoteTemplate(
  db: D1Db,
  actor: CommercialTemplateActor,
  templateIdInput: unknown,
  input: any,
) {
  requirePermission(
    actor,
    "crm:manage",
    true,
  );

  const templateId =
    text(templateIdInput);

  const current =
    await getQuoteTemplate(
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
      templateId,
    );

  const value =
    await normaliseQuoteTemplate(
      db,
      actor,
      input,
      current,
    );

  const duplicate =
    await db.prepare(`
      SELECT id
      FROM crm_quote_templates
      WHERE workspace_id = ?
        AND lower(name) =
          lower(?)
        AND id <> ?
      LIMIT 1
    `).bind(
      actor.workspaceId,
      value.name,
      templateId,
    ).first();

  if (duplicate) {
    throw httpError(
      "A quote template with this name already exists.",
      409,
    );
  }

  await writeQuoteTemplate(
    db,
    actor,
    templateId,
    value,
    false,
  );

  await audit(
    db,
    actor,
    "crm.quote_template.updated",
    "crm_quote_template",
    templateId,
    `Updated quote template: ${value.name}.`,
    {
      status: value.status,
      packageCount:
        value.packages.length,
      addonCount:
        value.addons.length,
    },
  );

  return getQuoteTemplate(
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
    templateId,
  );
}

export async function archiveQuoteTemplate(
  db: D1Db,
  actor: CommercialTemplateActor,
  templateIdInput: unknown,
) {
  requirePermission(
    actor,
    "crm:manage",
    true,
  );

  const template =
    await getQuoteTemplate(
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
      templateIdInput,
    );

  await db.prepare(`
    UPDATE crm_quote_templates
    SET
      status = 'archived',
      is_default = 0,
      version = version + 1,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE workspace_id = ?
      AND id = ?
  `).bind(
    text(actor.userId) || null,
    actor.workspaceId,
    template.id,
  ).run();

  await audit(
    db,
    actor,
    "crm.quote_template.archived",
    "crm_quote_template",
    template.id,
    `Archived quote template: ${template.name}.`,
  );

  return getQuoteTemplate(
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
    template.id,
  );
}

function emailTemplateRow(
  row: any,
) {
  return {
    id: text(row?.id),
    name: text(row?.name),
    description:
      text(row?.description),
    purpose:
      text(
        row?.purpose
        || "general",
      ),
    subjectTemplate:
      text(row?.subject_template),
    bodyHtml:
      text(row?.body_html),
    bodyText:
      text(row?.body_text),
    attachments:
      safeJson(
        row?.attachments_json,
        [],
      ),
    appendSignature:
      Boolean(row?.append_signature),
    status:
      text(row?.status),
    version:
      Number(row?.version || 1),
    default:
      Boolean(row?.is_default),
    createdAt: row?.created_at,
    updatedAt: row?.updated_at,
  };
}

export async function listEmailTemplates(
  db: D1Db,
  actor: CommercialTemplateActor,
) {
  requirePermission(
    actor,
    "crm:read",
  );

  const result =
    await db.prepare(`
      SELECT *
      FROM crm_email_templates
      WHERE workspace_id = ?
      ORDER BY
        purpose,
        is_default DESC,
        status = 'active' DESC,
        name COLLATE NOCASE
    `).bind(
      actor.workspaceId,
    ).all();

  return (
    result.results || []
  ).map(emailTemplateRow);
}

export async function getEmailTemplate(
  db: D1Db,
  actor: CommercialTemplateActor,
  templateIdInput: unknown,
) {
  requirePermission(
    actor,
    "crm:read",
  );

  const row =
    await db.prepare(`
      SELECT *
      FROM crm_email_templates
      WHERE workspace_id = ?
        AND id = ?
      LIMIT 1
    `).bind(
      actor.workspaceId,
      text(templateIdInput),
    ).first();

  if (!row) {
    throw httpError(
      "Email template not found.",
      404,
    );
  }

  return emailTemplateRow(row);
}

function normaliseEmailTemplate(
  input: any,
  current: any = null,
) {
  const name =
    text(
      input?.name
      ?? current?.name,
    ).slice(0, 160);

  if (!name) {
    throw httpError(
      "Enter an email template name.",
    );
  }

  const purposeInput =
    text(
      input?.purpose
      ?? current?.purpose
      ?? "general",
    );

  const purposes = [
    "general",
    "quote",
    "booking",
    "questionnaire",
    "invoice",
    "autoresponder",
  ];

  const purpose =
    purposes.includes(
      purposeInput,
    )
      ? purposeInput
      : "general";

  const statusInput =
    text(
      input?.status
      ?? current?.status
      ?? "draft",
    );

  const status =
    [
      "draft",
      "active",
      "archived",
    ].includes(statusInput)
      ? statusInput
      : "draft";

  const makeDefault =
    booleanValue(
      input?.default,
      Boolean(current?.default),
    );

  if (
    makeDefault
    && status !== "active"
  ) {
    throw httpError(
      "Only an active email template can be the default.",
      409,
    );
  }

  const attachmentsSource =
    input?.attachments
    ?? current?.attachments
    ?? [];

  const attachments =
    Array.isArray(
      attachmentsSource,
    )
      ? attachmentsSource
          .slice(0, 20)
          .map((item) =>
            objectValue(item)
          )
      : [];

  return {
    name,
    description:
      text(
        input?.description
        ?? current?.description,
      ).slice(0, 10000),
    purpose,
    subjectTemplate:
      text(
        input?.subjectTemplate
        ?? current?.subjectTemplate,
      ).slice(0, 500),
    bodyHtml:
      text(
        input?.bodyHtml
        ?? current?.bodyHtml,
      ).slice(0, 200000),
    bodyText:
      text(
        input?.bodyText
        ?? current?.bodyText,
      ).slice(0, 100000),
    attachments,
    appendSignature:
      booleanValue(
        input?.appendSignature,
        current
          ? Boolean(
              current
                .appendSignature,
            )
          : true,
      ),
    status,
    default: makeDefault,
  };
}

async function duplicateEmailName(
  db: D1Db,
  workspaceId: string,
  purpose: string,
  name: string,
  excludeId = "",
) {
  return db.prepare(`
    SELECT id
    FROM crm_email_templates
    WHERE workspace_id = ?
      AND purpose = ?
      AND lower(name) =
        lower(?)
      AND (? = '' OR id <> ?)
    LIMIT 1
  `).bind(
    workspaceId,
    purpose,
    name,
    excludeId,
    excludeId,
  ).first();
}

export async function createEmailTemplate(
  db: D1Db,
  actor: CommercialTemplateActor,
  input: any,
) {
  requirePermission(
    actor,
    "crm:manage",
    true,
  );

  const value =
    normaliseEmailTemplate(input);

  const duplicate =
    await duplicateEmailName(
      db,
      actor.workspaceId,
      value.purpose,
      value.name,
    );

  if (duplicate) {
    throw httpError(
      "An email template with this name already exists for this purpose.",
      409,
    );
  }

  const templateId =
    `crm_email_template_${crypto.randomUUID()}`;

  const statements: any[] = [];

  if (value.default) {
    statements.push(
      db.prepare(`
        UPDATE crm_email_templates
        SET
          is_default = 0,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE workspace_id = ?
          AND purpose = ?
      `).bind(
        actor.workspaceId,
        value.purpose,
      ),
    );
  }

  statements.push(
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
        created_by_user_id,
        updated_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, 1, ?, ?, ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      templateId,
      actor.workspaceId,
      value.name,
      value.description,
      value.purpose,
      value.subjectTemplate,
      value.bodyHtml,
      value.bodyText,
      JSON.stringify(
        value.attachments,
      ),
      value.appendSignature
        ? 1
        : 0,
      value.status,
      value.default ? 1 : 0,
      text(actor.userId) || null,
      text(actor.userId) || null,
    ),
  );

  await db.batch(statements);

  await audit(
    db,
    actor,
    "crm.email_template.created",
    "crm_email_template",
    templateId,
    `Created email template: ${value.name}.`,
    {
      purpose: value.purpose,
      status: value.status,
    },
  );

  return getEmailTemplate(
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
    templateId,
  );
}

export async function saveEmailTemplate(
  db: D1Db,
  actor: CommercialTemplateActor,
  templateIdInput: unknown,
  input: any,
) {
  requirePermission(
    actor,
    "crm:manage",
    true,
  );

  const templateId =
    text(templateIdInput);

  const current =
    await getEmailTemplate(
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
      templateId,
    );

  const value =
    normaliseEmailTemplate(
      input,
      current,
    );

  const duplicate =
    await duplicateEmailName(
      db,
      actor.workspaceId,
      value.purpose,
      value.name,
      templateId,
    );

  if (duplicate) {
    throw httpError(
      "An email template with this name already exists for this purpose.",
      409,
    );
  }

  const statements: any[] = [];

  if (value.default) {
    statements.push(
      db.prepare(`
        UPDATE crm_email_templates
        SET
          is_default = 0,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE workspace_id = ?
          AND purpose = ?
          AND id <> ?
      `).bind(
        actor.workspaceId,
        value.purpose,
        templateId,
      ),
    );
  }

  statements.push(
    db.prepare(`
      UPDATE crm_email_templates
      SET
        name = ?,
        description = ?,
        purpose = ?,
        subject_template = ?,
        body_html = ?,
        body_text = ?,
        attachments_json = ?,
        append_signature = ?,
        status = ?,
        version = version + 1,
        is_default = ?,
        updated_by_user_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE workspace_id = ?
        AND id = ?
    `).bind(
      value.name,
      value.description,
      value.purpose,
      value.subjectTemplate,
      value.bodyHtml,
      value.bodyText,
      JSON.stringify(
        value.attachments,
      ),
      value.appendSignature
        ? 1
        : 0,
      value.status,
      value.default ? 1 : 0,
      text(actor.userId) || null,
      actor.workspaceId,
      templateId,
    ),
  );

  await db.batch(statements);

  await audit(
    db,
    actor,
    "crm.email_template.updated",
    "crm_email_template",
    templateId,
    `Updated email template: ${value.name}.`,
    {
      purpose: value.purpose,
      status: value.status,
    },
  );

  return getEmailTemplate(
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
    templateId,
  );
}

export async function archiveEmailTemplate(
  db: D1Db,
  actor: CommercialTemplateActor,
  templateIdInput: unknown,
) {
  requirePermission(
    actor,
    "crm:manage",
    true,
  );

  const template =
    await getEmailTemplate(
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
      templateIdInput,
    );

  await db.prepare(`
    UPDATE crm_email_templates
    SET
      status = 'archived',
      is_default = 0,
      version = version + 1,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE workspace_id = ?
      AND id = ?
  `).bind(
    text(actor.userId) || null,
    actor.workspaceId,
    template.id,
  ).run();

  await audit(
    db,
    actor,
    "crm.email_template.archived",
    "crm_email_template",
    template.id,
    `Archived email template: ${template.name}.`,
    {
      purpose: template.purpose,
    },
  );

  return getEmailTemplate(
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
    template.id,
  );
}

function expiryDate(
  days: number,
) {
  const date = new Date();

  date.setUTCDate(
    date.getUTCDate()
    + Math.max(0, days),
  );

  return date
    .toISOString()
    .slice(0, 10);
}

export async function createQuoteFromTemplate(
  db: D1Db,
  actor: CommercialTemplateActor,
  input: any,
) {
  requirePermission(
    actor,
    "crm:manage",
    true,
  );

  const templateId =
    text(input?.templateId);

  if (!templateId) {
    throw httpError(
      "Choose a quote template.",
    );
  }

  const active =
    await db.prepare(`
      SELECT id
      FROM crm_quote_templates
      WHERE workspace_id = ?
        AND id = ?
        AND status = 'active'
      LIMIT 1
    `).bind(
      actor.workspaceId,
      templateId,
    ).first();

  if (!active) {
    throw httpError(
      "Choose an active quote template from this workspace.",
      409,
    );
  }

  const template =
    await getQuoteTemplate(
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
      templateId,
    );

  if (!template.packages.length) {
    throw httpError(
      "This quote template has no package options.",
      409,
    );
  }

  for (
    const option of template.packages
  ) {
    if (
      option.package.status
      !== "active"
    ) {
      throw httpError(
        "This quote template contains a package that is no longer active.",
        409,
      );
    }
  }

  for (
    const option of template.addons
  ) {
    if (
      option.addon.status
      !== "active"
    ) {
      throw httpError(
        "This quote template contains an add-on that is no longer active.",
        409,
      );
    }
  }

  const globalAddonIds =
    template.addons.map(
      (item: any) =>
        item.addonId,
    );

  const quote =
    await createQuote(
      db,
      actor,
      {
        enquiryId:
          input?.enquiryId,
        currency:
          input?.currency,
      },
    );

  const clientNotes =
    [
      template
        .clientIntroduction,
      template.clientNotes,
    ]
      .map(text)
      .filter(Boolean)
      .join("\n\n");

  const options =
    template.packages.map(
      (item: any) => ({
        packageId:
          item.packageId,
        ...packageOverride(
          item.override,
        ),
        recommended:
          item.recommended,
        displayOrder:
          item.displayOrder,
        addonIds:
          globalAddonIds,
        items: [],
      }),
    );

  return saveQuoteDraft(
    db,
    actor,
    quote.id,
    {
      options,
      clientNotes,
      internalNotes:
        text(input?.internalNotes),
      expiresAt:
        expiryDate(
          template.expiryDays,
        ),
      discountType:
        template.discountType,
      discountValue:
        template.discountValue,
      taxTreatment:
        template.taxTreatment,
      taxRateBasisPoints:
        template
          .taxRateBasisPoints,
      currency:
        quote.currency,
      templateSnapshot: {
        id: template.id,
        name: template.name,
        version:
          template.version,
        packageIds:
          template.packages.map(
            (item: any) =>
              item.packageId,
          ),
        addonIds:
          globalAddonIds,
      },
    },
  );
}
