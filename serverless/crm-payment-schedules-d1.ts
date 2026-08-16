type D1Db = any;

type CrmPaymentScheduleActor = {
  workspaceId: string;
  userId?: string;
  email?: string;
  permissions?: string[];
  accessMode?: string;
};

type DepositType =
  | "none"
  | "fixed"
  | "percentage";

function text(value: unknown) {
  return String(
    value ?? "",
  ).trim();
}

function integer(
  value: unknown,
  fallback = 0,
) {
  const parsed =
    Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(
    0,
    Math.round(parsed),
  );
}

function httpError(
  message: string,
  statusCode = 400,
  details: string[] = [],
) {
  const error =
    new Error(message) as Error & {
      statusCode?: number;
      details?: string[];
    };

  error.statusCode =
    statusCode;

  error.details =
    details;

  return error;
}

function requirePermission(
  actor: CrmPaymentScheduleActor,
  permission:
    | "crm:read"
    | "crm:manage",
) {
  if (
    !text(actor?.workspaceId)
    || !Array.isArray(
      actor?.permissions,
    )
    || !actor.permissions.includes(
      permission,
    )
  ) {
    throw httpError(
      "You do not have permission to manage payment schedules.",
      403,
    );
  }

  if (
    permission === "crm:manage"
    && actor?.accessMode === "support"
  ) {
    throw httpError(
      "Payment schedules are read-only during support access.",
      403,
    );
  }
}

function depositType(
  value: unknown,
): DepositType {
  const raw =
    text(value);

  if (
    raw === "fixed"
    || raw === "percentage"
  ) {
    return raw;
  }

  return "none";
}

function hydrate(row: any) {
  return {
    id:
      text(row?.id),

    name:
      text(row?.name),

    description:
      text(row?.description),

    status:
      text(row?.status)
      === "archived"
        ? "archived"
        : "active",

    default:
      Boolean(
        row?.is_default,
      ),

    depositType:
      depositType(
        row?.deposit_type,
      ),

    depositValue:
      Number(
        row?.deposit_value
        || 0,
      ),

    depositDueDaysAfterAcceptance:
      Number(
        row
          ?.deposit_due_days_after_acceptance
        || 0,
      ),

    finalBalanceDueDaysBeforeEvent:
      Number(
        row
          ?.final_balance_due_days_before_event
        || 0,
      ),

    sortOrder:
      Number(
        row?.sort_order
        || 0,
      ),

    createdAt:
      text(row?.created_at),

    updatedAt:
      text(row?.updated_at),
  };
}

function normaliseInput(
  input: any,
  current?: any,
) {
  const name =
    text(
      input?.name
      ?? current?.name,
    ).slice(
      0,
      120,
    );

  if (!name) {
    throw httpError(
      "Payment schedule name is required.",
      400,
    );
  }

  const description =
    text(
      input?.description
      ?? current?.description,
    ).slice(
      0,
      500,
    );

  const status =
    text(
      input?.status
      ?? current?.status,
    ) === "archived"
      ? "archived"
      : "active";

  const type =
    depositType(
      input?.depositType
      ?? current?.deposit_type,
    );

  let value =
    integer(
      input?.depositValue
      ?? current?.deposit_value,
      0,
    );

  if (type === "none") {
    value = 0;
  }

  if (
    type === "percentage"
    && value > 10000
  ) {
    throw httpError(
      "Percentage deposit cannot exceed 100%.",
      400,
    );
  }

  const isDefault =
    status === "active"
    && Boolean(
      input?.default
      ?? current?.is_default,
    );

  return {
    name,
    description,
    status,
    default:
      isDefault,

    depositType:
      type,

    depositValue:
      value,

    depositDueDaysAfterAcceptance:
      integer(
        input
          ?.depositDueDaysAfterAcceptance
        ?? current
          ?.deposit_due_days_after_acceptance,
        0,
      ),

    finalBalanceDueDaysBeforeEvent:
      integer(
        input
          ?.finalBalanceDueDaysBeforeEvent
        ?? current
          ?.final_balance_due_days_before_event,
        30,
      ),

    sortOrder:
      integer(
        input?.sortOrder
        ?? current?.sort_order,
        0,
      ),
  };
}

function auditStatement(
  db: D1Db,
  actor: CrmPaymentScheduleActor,
  eventType: string,
  presetId: string,
  summary: string,
  metadata: Record<string, unknown>,
) {
  return db.prepare(`
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
      ?, ?, ?, ?, ?,
      'crm_payment_schedule_preset',
      ?, ?, ?,
      CURRENT_TIMESTAMP
    )
  `).bind(
    `audit_${crypto.randomUUID()}`,
    actor.workspaceId,
    text(actor.userId)
      || null,
    text(actor.email)
      .toLowerCase(),
    eventType,
    presetId,
    summary,
    JSON.stringify(metadata),
  );
}

export async function listCrmPaymentSchedulePresets(
  db: D1Db,
  actor: CrmPaymentScheduleActor,
  includeArchived = false,
) {
  requirePermission(
    actor,
    "crm:read",
  );

  const result =
    await db.prepare(`
      SELECT *
      FROM crm_payment_schedule_presets
      WHERE workspace_id = ?
        AND (
          ? = 1
          OR status = 'active'
        )
      ORDER BY
        CASE
          WHEN status = 'active'
            THEN 0
          ELSE 1
        END,
        is_default DESC,
        sort_order,
        name COLLATE NOCASE
    `).bind(
      actor.workspaceId,
      includeArchived
        ? 1
        : 0,
    ).all();

  return (
    result.results
    || []
  ).map(hydrate);
}

export async function getCrmPaymentSchedulePreset(
  db: D1Db,
  actor: CrmPaymentScheduleActor,
  presetId: string,
  includeArchived = false,
) {
  requirePermission(
    actor,
    "crm:read",
  );

  const row =
    await db.prepare(`
      SELECT *
      FROM crm_payment_schedule_presets
      WHERE workspace_id = ?
        AND id = ?
        AND (
          ? = 1
          OR status = 'active'
        )
      LIMIT 1
    `).bind(
      actor.workspaceId,
      text(presetId),
      includeArchived
        ? 1
        : 0,
    ).first();

  return row
    ? hydrate(row)
    : null;
}

export async function createCrmPaymentSchedulePreset(
  db: D1Db,
  actor: CrmPaymentScheduleActor,
  input: any,
) {
  requirePermission(
    actor,
    "crm:manage",
  );

  const value =
    normaliseInput(
      input,
    );

  const presetId =
    `crm_payment_schedule_preset_${crypto.randomUUID()}`;

  const statements: any[] =
    [];

  if (value.default) {
    statements.push(
      db.prepare(`
        UPDATE crm_payment_schedule_presets
        SET
          is_default = 0,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE workspace_id = ?
          AND status = 'active'
          AND is_default = 1
      `).bind(
        actor.workspaceId,
      ),
    );
  }

  statements.push(
    db.prepare(`
      INSERT INTO crm_payment_schedule_presets (
        id,
        workspace_id,
        name,
        description,
        status,
        is_default,
        deposit_type,
        deposit_value,
        deposit_due_days_after_acceptance,
        final_balance_due_days_before_event,
        sort_order,
        created_by_user_id,
        updated_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      presetId,
      actor.workspaceId,
      value.name,
      value.description,
      value.status,
      value.default
        ? 1
        : 0,
      value.depositType,
      value.depositValue,
      value
        .depositDueDaysAfterAcceptance,
      value
        .finalBalanceDueDaysBeforeEvent,
      value.sortOrder,
      text(actor.userId)
        || null,
      text(actor.userId)
        || null,
    ),
  );

  statements.push(
    auditStatement(
      db,
      actor,
      "crm.payment_schedule_preset.created",
      presetId,
      `Created payment schedule preset ${value.name}.`,
      {
        name:
          value.name,
        default:
          value.default,
        depositType:
          value.depositType,
        depositValue:
          value.depositValue,
      },
    ),
  );

  await db.batch(
    statements,
  );

  return getCrmPaymentSchedulePreset(
    db,
    actor,
    presetId,
    true,
  );
}

export async function saveCrmPaymentSchedulePreset(
  db: D1Db,
  actor: CrmPaymentScheduleActor,
  presetId: string,
  input: any,
) {
  requirePermission(
    actor,
    "crm:manage",
  );

  const existing =
    await db.prepare(`
      SELECT *
      FROM crm_payment_schedule_presets
      WHERE workspace_id = ?
        AND id = ?
      LIMIT 1
    `).bind(
      actor.workspaceId,
      text(presetId),
    ).first();

  if (!existing) {
    throw httpError(
      "Payment schedule preset not found.",
      404,
    );
  }

  const value =
    normaliseInput(
      input,
      existing,
    );

  const statements: any[] =
    [];

  if (value.default) {
    statements.push(
      db.prepare(`
        UPDATE crm_payment_schedule_presets
        SET
          is_default = 0,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE workspace_id = ?
          AND id <> ?
          AND status = 'active'
          AND is_default = 1
      `).bind(
        actor.workspaceId,
        text(presetId),
      ),
    );
  }

  statements.push(
    db.prepare(`
      UPDATE crm_payment_schedule_presets
      SET
        name = ?,
        description = ?,
        status = ?,
        is_default = ?,
        deposit_type = ?,
        deposit_value = ?,
        deposit_due_days_after_acceptance = ?,
        final_balance_due_days_before_event = ?,
        sort_order = ?,
        updated_by_user_id = ?,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE workspace_id = ?
        AND id = ?
    `).bind(
      value.name,
      value.description,
      value.status,
      value.default
        ? 1
        : 0,
      value.depositType,
      value.depositValue,
      value
        .depositDueDaysAfterAcceptance,
      value
        .finalBalanceDueDaysBeforeEvent,
      value.sortOrder,
      text(actor.userId)
        || null,
      actor.workspaceId,
      text(presetId),
    ),
  );

  statements.push(
    auditStatement(
      db,
      actor,
      "crm.payment_schedule_preset.updated",
      text(presetId),
      `Updated payment schedule preset ${value.name}.`,
      {
        name:
          value.name,
        status:
          value.status,
        default:
          value.default,
        depositType:
          value.depositType,
        depositValue:
          value.depositValue,
      },
    ),
  );

  await db.batch(
    statements,
  );

  return getCrmPaymentSchedulePreset(
    db,
    actor,
    text(presetId),
    true,
  );
}

export async function archiveCrmPaymentSchedulePreset(
  db: D1Db,
  actor: CrmPaymentScheduleActor,
  presetId: string,
) {
  requirePermission(
    actor,
    "crm:manage",
  );

  const existing =
    await db.prepare(`
      SELECT *
      FROM crm_payment_schedule_presets
      WHERE workspace_id = ?
        AND id = ?
      LIMIT 1
    `).bind(
      actor.workspaceId,
      text(presetId),
    ).first();

  if (!existing) {
    throw httpError(
      "Payment schedule preset not found.",
      404,
    );
  }

  if (
    text(existing.status)
    === "archived"
  ) {
    return hydrate(
      existing,
    );
  }

  await db.batch([
    db.prepare(`
      UPDATE crm_payment_schedule_presets
      SET
        status = 'archived',
        is_default = 0,
        updated_by_user_id = ?,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE workspace_id = ?
        AND id = ?
    `).bind(
      text(actor.userId)
        || null,
      actor.workspaceId,
      text(presetId),
    ),

    auditStatement(
      db,
      actor,
      "crm.payment_schedule_preset.archived",
      text(presetId),
      `Archived payment schedule preset ${text(existing.name)}.`,
      {
        name:
          text(existing.name),
      },
    ),
  ]);

  return getCrmPaymentSchedulePreset(
    db,
    actor,
    text(presetId),
    true,
  );
}
