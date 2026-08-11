type D1Db = any;

type CrmCommercialSettingsActor = {
  workspaceId?: string;
  userId?: string;
  email?: string;
  accessMode?: string;
  permissions?: string[];
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

    db.prepare(`
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
    ).first(),

    db.prepare(`
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
    ).all(),

    db.prepare(`
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
    ).all(),
  ]);

  return {
    settings: {
      autoCreateContract:
        settings
          ? Number(
              settings.auto_create_contract,
            ) === 1
          : true,

      autoCreateInvoice:
        settings
          ? Number(
              settings.auto_create_invoice,
            ) === 1
          : true,

      autoAssignQuestionnaire:
        settings
          ? Number(
              settings.auto_assign_questionnaire,
            ) === 1
          : false,

      defaultContractTemplateId:
        text(
          settings
            ?.default_contract_template_id,
        ),

      defaultQuestionnaireTemplateId:
        text(
          settings
            ?.default_questionnaire_template_id,
        ),

      depositType:
        text(
          settings?.deposit_type
          || "none",
        ) as
          | "none"
          | "fixed"
          | "percentage",

      depositValue:
        Number(
          settings?.deposit_value
          || 0,
        ),

      depositDueDaysAfterAcceptance:
        Number(
          settings
            ?.deposit_due_days_after_acceptance
          || 0,
        ),

      finalBalanceDueDaysBeforeEvent:
        Number(
          settings
            ?.final_balance_due_days_before_event
          ?? 30,
        ),

      questionnaireDueDaysBeforeEvent:
        Number(
          settings
            ?.questionnaire_due_days_before_event
          ?? 60,
        ),

      invoiceNotes:
        text(
          settings?.invoice_notes,
        ),

      invoiceTerms:
        text(
          settings?.invoice_terms,
        ),

      updatedAt:
        text(
          settings?.updated_at,
        ),
    },

    invoiceSequence: {
      prefix:
        text(
          invoiceSequence?.prefix
          || "INV",
        ),

      nextNumber:
        Math.max(
          1,
          Number(
            invoiceSequence?.next_number
            || 1,
          ),
        ),

      padding:
        Math.min(
          12,
          Math.max(
            1,
            Number(
              invoiceSequence?.padding
              || 4,
            ),
          ),
        ),

      updatedAt:
        text(
          invoiceSequence?.updated_at,
        ),
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

    db.prepare(`
      SELECT *
      FROM crm_invoice_sequences
      WHERE workspace_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
    ).first(),
  ]);

  const autoCreateContract =
    booleanValue(
      input?.autoCreateContract,
      currentSettings
        ? Number(
            currentSettings
              .auto_create_contract,
          ) === 1
        : true,
    );

  const autoCreateInvoice =
    booleanValue(
      input?.autoCreateInvoice,
      currentSettings
        ? Number(
            currentSettings
              .auto_create_invoice,
          ) === 1
        : true,
    );

  const autoAssignQuestionnaire =
    booleanValue(
      input?.autoAssignQuestionnaire,
      currentSettings
        ? Number(
            currentSettings
              .auto_assign_questionnaire,
          ) === 1
        : false,
    );

  const defaultContractTemplateId =
    input?.defaultContractTemplateId
      === undefined
      ? text(
          currentSettings
            ?.default_contract_template_id,
        )
      : text(
          input
            ?.defaultContractTemplateId,
        );

  const defaultQuestionnaireTemplateId =
    input?.defaultQuestionnaireTemplateId
      === undefined
      ? text(
          currentSettings
            ?.default_questionnaire_template_id,
        )
      : text(
          input
            ?.defaultQuestionnaireTemplateId,
        );

  const depositType =
    text(
      input?.depositType
      ?? currentSettings?.deposit_type
      ?? "none",
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
          input?.depositValue,
          Number(
            currentSettings
              ?.deposit_value
            || 0,
          ),
          "Deposit value",
        );

  const depositDueDaysAfterAcceptance =
    nonNegativeInteger(
      input
        ?.depositDueDaysAfterAcceptance,
      Number(
        currentSettings
          ?.deposit_due_days_after_acceptance
        || 0,
      ),
      "Deposit due timing",
    );

  const finalBalanceDueDaysBeforeEvent =
    nonNegativeInteger(
      input
        ?.finalBalanceDueDaysBeforeEvent,
      Number(
        currentSettings
          ?.final_balance_due_days_before_event
        ?? 30,
      ),
      "Final balance timing",
    );

  const questionnaireDueDaysBeforeEvent =
    nonNegativeInteger(
      input
        ?.questionnaireDueDaysBeforeEvent,
      Number(
        currentSettings
          ?.questionnaire_due_days_before_event
        ?? 60,
      ),
      "Questionnaire due timing",
    );

  const invoiceNotes =
    text(
      input?.invoiceNotes
      ?? currentSettings?.invoice_notes,
    ).slice(
      0,
      5000,
    );

  const invoiceTerms =
    text(
      input?.invoiceTerms
      ?? currentSettings?.invoice_terms,
    ).slice(
      0,
      5000,
    );

  const invoicePrefix =
    text(
      input?.invoicePrefix
      ?? currentSequence?.prefix
      ?? "INV",
    );

  if (
    !/^[A-Za-z0-9][A-Za-z0-9_/-]{0,11}$/
      .test(invoicePrefix)
  ) {
    throw httpError(
      "Invoice prefix must be 1–12 letters, numbers, hyphens, underscores or slashes.",
    );
  }

  const invoicePadding =
    nonNegativeInteger(
      input?.invoicePadding,
      Number(
        currentSequence?.padding
        || 4,
      ),
      "Invoice number padding",
    );

  if (
    invoicePadding < 1
    || invoicePadding > 12
  ) {
    throw httpError(
      "Invoice number padding must be between 1 and 12.",
    );
  }

  await Promise.all([
    requireActiveContractTemplate(
      db,
      workspaceId,
      defaultContractTemplateId,
    ),

    requireActiveQuestionnaireTemplate(
      db,
      workspaceId,
      defaultQuestionnaireTemplateId,
    ),
  ]);

  await db.batch([
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
  ]);

  await recordSettingsAudit(
    db,
    actor,
    {
      autoCreateContract,
      autoCreateInvoice,
      autoAssignQuestionnaire,
      defaultContractTemplateId,
      defaultQuestionnaireTemplateId,
      depositType,
      depositValue,
      depositDueDaysAfterAcceptance,
      finalBalanceDueDaysBeforeEvent,
      questionnaireDueDaysBeforeEvent,
      invoicePrefix,
      invoicePadding,
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
  );
}
