type D1Db = any;

type CrmCommercialSettingsActor = {
  workspaceId?: string;
  userId?: string;
  email?: string;
  accessMode?: string;
  permissions?: string[];
};

export type CrmCommercialSettingsCapabilities = {
  contracts: boolean;
  invoices: boolean;
  clientPortal: boolean;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
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
  actor: CrmCommercialSettingsActor,
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
      "Support sessions cannot change commercial settings.",
      403,
    );
  }
}

function nonNegativeInteger(
  value: unknown,
  fallback: number,
  label: string,
) {
  if (
    value === undefined
    || value === null
    || value === ""
  ) {
    return fallback;
  }

  const number = Number(value);

  if (
    !Number.isInteger(number)
    || number < 0
  ) {
    throw httpError(
      `${label} must be a non-negative whole number.`,
    );
  }

  return number;
}

function booleanValue(
  value: unknown,
  fallback: boolean,
) {
  if (
    value === undefined
    || value === null
  ) {
    return fallback;
  }

  if (
    value === true
    || value === 1
    || value === "1"
    || value === "true"
  ) {
    return true;
  }

  if (
    value === false
    || value === 0
    || value === "0"
    || value === "false"
  ) {
    return false;
  }

  throw httpError(
    "Commercial automation settings must be true or false.",
  );
}

function templateOption(row: any) {
  return {
    id: text(row?.id),
    name: text(row?.name),
    status: text(row?.status),
  };
}

async function requireActiveContractTemplate(
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

async function requireActiveQuestionnaireTemplate(
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

async function recordSettingsAudit(
  db: D1Db,
  actor: CrmCommercialSettingsActor,
  metadata: Record<string, unknown>,
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
      ?,
      ?,
      ?,
      ?,
      'crm.commercial_settings.updated',
      'crm_booking_settings',
      ?,
      'Updated WedCRM commercial booking settings.',
      ?,
      CURRENT_TIMESTAMP
    )
  `).bind(
    `audit_${crypto.randomUUID()}`,
    text(actor.workspaceId),
    text(actor.userId) || null,
    lower(actor.email),
    text(actor.workspaceId),
    JSON.stringify(metadata),
  ).run();
}

export async function getCrmCommercialSettings(
  db: D1Db,
  actor: CrmCommercialSettingsActor,
  capabilities: CrmCommercialSettingsCapabilities,
) {
  requirePermission(
    actor,
    "crm:read",
  );

  const workspaceId =
    text(actor.workspaceId);

  const [
    settings,
    invoiceSequence,
    contractResult,
    questionnaireResult,
  ] = await Promise.all([
    db.prepare(`
      SELECT
        auto_create_contract,
        auto_create_invoice,
        auto_assign_questionnaire,
        default_contract_template_id,
        default_questionnaire_template_id,
        default_tax_treatment,
        default_tax_rate_basis_points,
        tax_label,
        deposit_type,
        deposit_value,
        deposit_due_days_after_acceptance,
        final_balance_due_days_before_event,
        questionnaire_due_days_before_event,
        invoice_notes,
        invoice_terms,
        updated_at
      FROM crm_booking_settings
      WHERE workspace_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
    ).first(),

    capabilities.invoices
      ? db.prepare(`
          SELECT
            prefix,
            next_number,
            padding,
            updated_at
          FROM crm_invoice_sequences
          WHERE workspace_id = ?
          LIMIT 1
        `).bind(
          workspaceId,
        ).first()
      : Promise.resolve(null),

    capabilities.contracts
      ? db.prepare(`
          SELECT
            id,
            name,
            status
          FROM crm_contract_templates
          WHERE workspace_id = ?
            AND status <> 'archived'
          ORDER BY
            CASE status
              WHEN 'active' THEN 0
              ELSE 1
            END,
            name COLLATE NOCASE
        `).bind(
          workspaceId,
        ).all()
      : Promise.resolve({ results: [] }),

    capabilities.clientPortal
      ? db.prepare(`
          SELECT
            id,
            name,
            status
          FROM crm_questionnaire_templates
          WHERE workspace_id = ?
            AND status <> 'archived'
          ORDER BY
            CASE status
              WHEN 'active' THEN 0
              ELSE 1
            END,
            name COLLATE NOCASE
        `).bind(
          workspaceId,
        ).all()
      : Promise.resolve({ results: [] }),
  ]);

  return {
    settings: {
      autoCreateContract:
        capabilities.contracts
          ? (
              settings
                ? Number(
                    settings.auto_create_contract,
                  ) === 1
                : true
            )
          : false,

      autoCreateInvoice:
        capabilities.invoices
          ? (
              settings
                ? Number(
                    settings.auto_create_invoice,
                  ) === 1
                : true
            )
          : false,

      autoAssignQuestionnaire:
        capabilities.clientPortal
          ? (
              settings
                ? Number(
                    settings.auto_assign_questionnaire,
                  ) === 1
                : false
            )
          : false,

      defaultContractTemplateId:
        capabilities.contracts
          ? text(
              settings
                ?.default_contract_template_id,
            )
          : "",

      defaultQuestionnaireTemplateId:
        capabilities.clientPortal
          ? text(
              settings
                ?.default_questionnaire_template_id,
            )
          : "",

      defaultTaxTreatment:
        (
          ["inclusive", "exclusive"].includes(
            text(
              settings?.default_tax_treatment,
            ),
          )
            ? text(
                settings?.default_tax_treatment,
              )
            : "none"
        ) as
          | "none"
          | "inclusive"
          | "exclusive",

      defaultTaxRateBasisPoints:
        Math.min(
          10000,
          Math.max(
            0,
            Number(
              settings
                ?.default_tax_rate_basis_points
              || 0,
            ),
          ),
        ),

      taxLabel:
        text(
          settings?.tax_label
          || "Tax",
        ) || "Tax",

      depositType:
        capabilities.invoices
          ? text(
              settings?.deposit_type
              || "none",
            ) as
              | "none"
              | "fixed"
              | "percentage"
          : "none",

      depositValue:
        capabilities.invoices
          ? Number(
              settings?.deposit_value
              || 0,
            )
          : 0,

      depositDueDaysAfterAcceptance:
        capabilities.invoices
          ? Number(
              settings
                ?.deposit_due_days_after_acceptance
              || 0,
            )
          : 0,

      finalBalanceDueDaysBeforeEvent:
        capabilities.invoices
          ? Number(
              settings
                ?.final_balance_due_days_before_event
              ?? 30,
            )
          : 30,

      questionnaireDueDaysBeforeEvent:
        capabilities.clientPortal
          ? Number(
              settings
                ?.questionnaire_due_days_before_event
              ?? 60,
            )
          : 60,

      invoiceNotes:
        capabilities.invoices
          ? text(
              settings?.invoice_notes,
            )
          : "",

      invoiceTerms:
        capabilities.invoices
          ? text(
              settings?.invoice_terms,
            )
          : "",

      updatedAt:
        text(
          settings?.updated_at,
        ),
    },

    invoiceSequence: {
      prefix:
        capabilities.invoices
          ? text(
              invoiceSequence?.prefix
              || "INV",
            )
          : "INV",

      nextNumber:
        capabilities.invoices
          ? Math.max(
              1,
              Number(
                invoiceSequence?.next_number
                || 1,
              ),
            )
          : 1,

      padding:
        capabilities.invoices
          ? Math.min(
              12,
              Math.max(
                1,
                Number(
                  invoiceSequence?.padding
                  || 4,
                ),
              ),
            )
          : 4,

      updatedAt:
        capabilities.invoices
          ? text(
              invoiceSequence?.updated_at,
            )
          : "",
    },

    contractTemplates:
      (
        contractResult.results
        || []
      ).map(templateOption),

    questionnaireTemplates:
      (
        questionnaireResult.results
        || []
      ).map(templateOption),
  };
}

export async function saveCrmCommercialSettings(
  db: D1Db,
  actor: CrmCommercialSettingsActor,
  input: any,
  capabilities: CrmCommercialSettingsCapabilities,
) {
  requirePermission(
    actor,
    "crm:manage",
    true,
  );

  const workspaceId =
    text(actor.workspaceId);

  const [
    currentSettings,
    currentSequence,
  ] = await Promise.all([
    db.prepare(`
      SELECT *
      FROM crm_booking_settings
      WHERE workspace_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
    ).first(),

    capabilities.invoices
      ? db.prepare(`
          SELECT *
          FROM crm_invoice_sequences
          WHERE workspace_id = ?
          LIMIT 1
        `).bind(
          workspaceId,
        ).first()
      : Promise.resolve(null),
  ]);

  const autoCreateContract =
    capabilities.contracts
      ? booleanValue(
          input?.autoCreateContract,
          currentSettings
            ? Number(
                currentSettings
                  .auto_create_contract,
              ) === 1
            : true,
        )
      : (
          currentSettings
            ? Number(
                currentSettings
                  .auto_create_contract,
              ) === 1
            : false
        );

  const autoCreateInvoice =
    capabilities.invoices
      ? booleanValue(
          input?.autoCreateInvoice,
          currentSettings
            ? Number(
                currentSettings
                  .auto_create_invoice,
              ) === 1
            : true,
        )
      : (
          currentSettings
            ? Number(
                currentSettings
                  .auto_create_invoice,
              ) === 1
            : false
        );

  const autoAssignQuestionnaire =
    capabilities.clientPortal
      ? booleanValue(
          input?.autoAssignQuestionnaire,
          currentSettings
            ? Number(
                currentSettings
                  .auto_assign_questionnaire,
              ) === 1
            : false,
        )
      : (
          currentSettings
            ? Number(
                currentSettings
                  .auto_assign_questionnaire,
              ) === 1
            : false
        );

  const defaultContractTemplateId =
    capabilities.contracts
      ? (
          input?.defaultContractTemplateId
            === undefined
            ? text(
                currentSettings
                  ?.default_contract_template_id,
              )
            : text(
                input
                  ?.defaultContractTemplateId,
              )
        )
      : text(
          currentSettings
            ?.default_contract_template_id,
        );

  const defaultQuestionnaireTemplateId =
    capabilities.clientPortal
      ? (
          input?.defaultQuestionnaireTemplateId
            === undefined
            ? text(
                currentSettings
                  ?.default_questionnaire_template_id,
              )
            : text(
                input
                  ?.defaultQuestionnaireTemplateId,
              )
        )
      : text(
          currentSettings
            ?.default_questionnaire_template_id,
        );

  const defaultTaxTreatment =
    text(
      input?.defaultTaxTreatment
      ?? currentSettings
        ?.default_tax_treatment
      ?? "none",
    );

  if (
    ![
      "none",
      "inclusive",
      "exclusive",
    ].includes(
      defaultTaxTreatment,
    )
  ) {
    throw httpError(
      "Default tax treatment must be none, inclusive or exclusive.",
    );
  }

  const defaultTaxRateBasisPoints =
    defaultTaxTreatment === "none"
      ? 0
      : nonNegativeInteger(
          input
            ?.defaultTaxRateBasisPoints,
          Number(
            currentSettings
              ?.default_tax_rate_basis_points
            || 0,
          ),
          "Default tax rate",
        );

  if (
    defaultTaxRateBasisPoints
    > 10000
  ) {
    throw httpError(
      "Default tax rate must be between 0% and 100%.",
    );
  }

  const taxLabelInput =
    input?.taxLabel === undefined
      ? (
          currentSettings
            ?.tax_label
          ?? "Tax"
        )
      : input.taxLabel;

  const taxLabel =
    text(
      taxLabelInput,
    );

  if (
    !taxLabel
    || taxLabel.length > 40
  ) {
    throw httpError(
      "Tax label must be between 1 and 40 characters.",
    );
  }

  const depositType =
    text(
      capabilities.invoices
        ? (
            input?.depositType
            ?? currentSettings?.deposit_type
            ?? "none"
          )
        : (
            currentSettings?.deposit_type
            ?? "none"
          ),
    );

  if (
    ![
      "none",
      "fixed",
      "percentage",
    ].includes(
      depositType,
    )
  ) {
    throw httpError(
      "Deposit type must be none, fixed or percentage.",
    );
  }

  const depositValue =
    depositType === "none"
      ? 0
      : nonNegativeInteger(
          capabilities.invoices
            ? input?.depositValue
            : undefined,
          Number(
            currentSettings
              ?.deposit_value
            || 0,
          ),
          "Deposit value",
        );

  const depositDueDaysAfterAcceptance =
    nonNegativeInteger(
      capabilities.invoices
        ? input
            ?.depositDueDaysAfterAcceptance
        : undefined,
      Number(
        currentSettings
          ?.deposit_due_days_after_acceptance
        || 0,
      ),
      "Deposit due timing",
    );

  const finalBalanceDueDaysBeforeEvent =
    nonNegativeInteger(
      capabilities.invoices
        ? input
            ?.finalBalanceDueDaysBeforeEvent
        : undefined,
      Number(
        currentSettings
          ?.final_balance_due_days_before_event
        ?? 30,
      ),
      "Final balance timing",
    );

  const questionnaireDueDaysBeforeEvent =
    nonNegativeInteger(
      capabilities.clientPortal
        ? input
            ?.questionnaireDueDaysBeforeEvent
        : undefined,
      Number(
        currentSettings
          ?.questionnaire_due_days_before_event
        ?? 60,
      ),
      "Questionnaire due timing",
    );

  const invoiceNotes =
    text(
      capabilities.invoices
        ? (
            input?.invoiceNotes
            ?? currentSettings?.invoice_notes
          )
        : currentSettings?.invoice_notes,
    ).slice(
      0,
      5000,
    );

  const invoiceTerms =
    text(
      capabilities.invoices
        ? (
            input?.invoiceTerms
            ?? currentSettings?.invoice_terms
          )
        : currentSettings?.invoice_terms,
    ).slice(
      0,
      5000,
    );

  const invoicePrefix =
    text(
      capabilities.invoices
        ? (
            input?.invoicePrefix
            ?? currentSequence?.prefix
            ?? "INV"
          )
        : (
            currentSequence?.prefix
            ?? "INV"
          ),
    );

  if (
    capabilities.invoices
    && !/^[A-Za-z0-9][A-Za-z0-9_/-]{0,11}$/
      .test(invoicePrefix)
  ) {
    throw httpError(
      "Invoice prefix must be 1–12 letters, numbers, hyphens, underscores or slashes.",
    );
  }

  const invoicePadding =
    nonNegativeInteger(
      capabilities.invoices
        ? input?.invoicePadding
        : undefined,
      Number(
        currentSequence?.padding
        || 4,
      ),
      "Invoice number padding",
    );

  if (
    capabilities.invoices
    && (
      invoicePadding < 1
      || invoicePadding > 12
    )
  ) {
    throw httpError(
      "Invoice number padding must be between 1 and 12.",
    );
  }

  await Promise.all([
    capabilities.contracts
      ? requireActiveContractTemplate(
          db,
          workspaceId,
          defaultContractTemplateId,
        )
      : Promise.resolve(),

    capabilities.clientPortal
      ? requireActiveQuestionnaireTemplate(
          db,
          workspaceId,
          defaultQuestionnaireTemplateId,
        )
      : Promise.resolve(),
  ]);

  const writes = [
    db.prepare(`
      INSERT INTO crm_booking_settings (
        workspace_id,
        auto_create_contract,
        auto_create_invoice,
        auto_assign_questionnaire,
        default_contract_template_id,
        default_questionnaire_template_id,
        deposit_type,
        deposit_value,
        deposit_due_days_after_acceptance,
        final_balance_due_days_before_event,
        questionnaire_due_days_before_event,
        invoice_notes,
        invoice_terms,
        created_at,
        updated_at
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(workspace_id)
      DO UPDATE SET
        auto_create_contract =
          excluded.auto_create_contract,
        auto_create_invoice =
          excluded.auto_create_invoice,
        auto_assign_questionnaire =
          excluded.auto_assign_questionnaire,
        default_contract_template_id =
          excluded.default_contract_template_id,
        default_questionnaire_template_id =
          excluded.default_questionnaire_template_id,
        deposit_type =
          excluded.deposit_type,
        deposit_value =
          excluded.deposit_value,
        deposit_due_days_after_acceptance =
          excluded.deposit_due_days_after_acceptance,
        final_balance_due_days_before_event =
          excluded.final_balance_due_days_before_event,
        questionnaire_due_days_before_event =
          excluded.questionnaire_due_days_before_event,
        invoice_notes =
          excluded.invoice_notes,
        invoice_terms =
          excluded.invoice_terms,
        updated_at =
          CURRENT_TIMESTAMP
    `).bind(
      workspaceId,
      autoCreateContract ? 1 : 0,
      autoCreateInvoice ? 1 : 0,
      autoAssignQuestionnaire ? 1 : 0,
      defaultContractTemplateId
        || null,
      defaultQuestionnaireTemplateId
        || null,
      depositType,
      depositValue,
      depositDueDaysAfterAcceptance,
      finalBalanceDueDaysBeforeEvent,
      questionnaireDueDaysBeforeEvent,
      invoiceNotes,
      invoiceTerms,
    ),

    db.prepare(`
      UPDATE crm_booking_settings
      SET
        default_tax_treatment = ?,
        default_tax_rate_basis_points = ?,
        tax_label = ?,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE workspace_id = ?
    `).bind(
      defaultTaxTreatment,
      defaultTaxRateBasisPoints,
      taxLabel,
      workspaceId,
    ),

  ];

  if (capabilities.invoices) {
    writes.push(
      db.prepare(`
        INSERT INTO crm_invoice_sequences (
          workspace_id,
          prefix,
          padding,
          updated_at
        ) VALUES (
          ?,
          ?,
          ?,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(workspace_id)
        DO UPDATE SET
          prefix =
            excluded.prefix,
          padding =
            excluded.padding,
          updated_at =
            CURRENT_TIMESTAMP
      `).bind(
        workspaceId,
        invoicePrefix,
        invoicePadding,
      ),
    );
  }

  await db.batch(writes);

  await recordSettingsAudit(
    db,
    actor,
    {
      defaultTaxTreatment,
      defaultTaxRateBasisPoints,
      taxLabel,
      ...(capabilities.contracts
        ? {
            autoCreateContract,
            defaultContractTemplateId,
          }
        : {}),
      ...(capabilities.invoices
        ? {
            autoCreateInvoice,
            depositType,
            depositValue,
            depositDueDaysAfterAcceptance,
            finalBalanceDueDaysBeforeEvent,
            invoicePrefix,
            invoicePadding,
          }
        : {}),
      ...(capabilities.clientPortal
        ? {
            autoAssignQuestionnaire,
            defaultQuestionnaireTemplateId,
            questionnaireDueDaysBeforeEvent,
          }
        : {}),
    },
  );

  return getCrmCommercialSettings(
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
    capabilities,
  );
}
