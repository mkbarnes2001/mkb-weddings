type D1Db = any;

type CrmContractTemplateActor = {
  workspaceId?: string;
  userId?: string;
  email?: string;
  accessMode?: string;
  permissions?: string[];
};

type ContractTemplateStatus =
  | "active"
  | "archived";

type ContractTemplateSection = {
  id: string;
  heading: string;
  body: string;
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
  actor: CrmContractTemplateActor,
  permission:
    | "crm:read"
    | "crm:manage",
) {
  const workspaceId =
    text(actor?.workspaceId);

  if (!workspaceId) {
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
    permission === "crm:manage"
    && actor?.accessMode === "support"
  ) {
    throw httpError(
      "Support sessions cannot change contract templates.",
      403,
    );
  }

  return workspaceId;
}

function parseSections(
  value: unknown,
): ContractTemplateSection[] {
  let parsed = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = [];
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap(
    (item, index) => {
      if (typeof item === "string") {
        const body = text(item);

        return body
          ? [{
              id:
                `section_${index + 1}`,
              heading: "",
              body,
            }]
          : [];
      }

      if (
        !item
        || typeof item !== "object"
      ) {
        return [];
      }

      const record =
        item as Record<
          string,
          unknown
        >;

      const heading =
        text(
          record.heading
          ?? record.title
          ?? record.name,
        ).slice(
          0,
          180,
        );

      const body =
        text(
          record.body
          ?? record.text
          ?? record.content
          ?? record.description
          ?? record.value,
        ).slice(
          0,
          30000,
        );

      if (
        !heading
        && !body
      ) {
        return [];
      }

      return [{
        id:
          text(record.id)
            .slice(0, 120)
          || `section_${index + 1}`,
        heading,
        body,
      }];
    },
  );
}

function normaliseSections(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    throw httpError(
      "Contract sections must be a list.",
    );
  }

  return value
    .slice(0, 100)
    .map((item, index) => {
      if (
        !item
        || typeof item !== "object"
      ) {
        throw httpError(
          "Each contract section must contain text fields.",
        );
      }

      const record =
        item as Record<
          string,
          unknown
        >;

      return {
        id:
          text(record.id)
            .slice(0, 120)
          || `section_${index + 1}`,
        heading:
          text(
            record.heading,
          ).slice(
            0,
            180,
          ),
        body:
          text(
            record.body,
          ).slice(
            0,
            30000,
          ),
      };
    });
}

function statusValue(
  value: unknown,
  fallback:
    ContractTemplateStatus,
): ContractTemplateStatus {
  const status = text(value);

  if (
    status === "active"
    || status === "archived"
  ) {
    return status;
  }

  return fallback;
}

function validateActiveContent(
  status: ContractTemplateStatus,
  sections:
    ContractTemplateSection[],
) {
  if (
    status === "active"
    && !sections.some(
      (section) =>
        Boolean(
          text(section.body),
        ),
    )
  ) {
    throw httpError(
      "Add contract wording before activating this template.",
    );
  }
}

function hydrate(row: any) {
  return {
    id:
      text(row.id),

    name:
      text(row.name),

    description:
      text(row.description),

    status:
      statusValue(
        row.status,
        "archived",
      ),

    sections:
      parseSections(
        row.content_json,
      ),

    createdAt:
      text(row.created_at),

    updatedAt:
      text(row.updated_at),
  };
}

async function loadRow(
  db: D1Db,
  workspaceId: string,
  templateId: string,
) {
  return db.prepare(`
    SELECT
      id,
      workspace_id,
      name,
      description,
      content_json,
      signature_message,
      status,
      created_at,
      updated_at
    FROM crm_contract_templates
    WHERE workspace_id = ?
      AND id = ?
    LIMIT 1
  `).bind(
    workspaceId,
    text(templateId),
  ).first();
}

async function requireUniqueName(
  db: D1Db,
  workspaceId: string,
  name: string,
  excludeId = "",
) {
  const row =
    await db.prepare(`
      SELECT id
      FROM crm_contract_templates
      WHERE workspace_id = ?
        AND name COLLATE NOCASE = ?
        AND (
          ? = ''
          OR id <> ?
        )
      LIMIT 1
    `).bind(
      workspaceId,
      name,
      excludeId,
      excludeId,
    ).first();

  if (row) {
    throw httpError(
      "A contract template with this name already exists.",
      409,
    );
  }
}

function auditStatement(
  db: D1Db,
  actor:
    CrmContractTemplateActor,
  workspaceId: string,
  eventType: string,
  templateId: string,
  summary: string,
  metadata:
    Record<string, unknown>,
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
      ?,
      ?,
      ?,
      ?,
      ?,
      'crm_contract_template',
      ?,
      ?,
      ?,
      CURRENT_TIMESTAMP
    )
  `).bind(
    `audit_${crypto.randomUUID()}`,
    workspaceId,
    text(actor?.userId)
      || null,
    lower(actor?.email),
    eventType,
    templateId,
    summary,
    JSON.stringify(metadata),
  );
}

export async function listCrmContractTemplates(
  db: D1Db,
  actor:
    CrmContractTemplateActor,
) {
  const workspaceId =
    requirePermission(
      actor,
      "crm:read",
    );

  const result =
    await db.prepare(`
      SELECT
        id,
        workspace_id,
        name,
        description,
        content_json,
        signature_message,
        status,
        created_at,
        updated_at
      FROM crm_contract_templates
      WHERE workspace_id = ?
      ORDER BY
        CASE status
          WHEN 'active' THEN 0
          ELSE 1
        END,
        updated_at DESC,
        name COLLATE NOCASE
    `).bind(
      workspaceId,
    ).all();

  return (
    result.results || []
  ).map(hydrate);
}

export async function getCrmContractTemplate(
  db: D1Db,
  actor:
    CrmContractTemplateActor,
  templateId: string,
) {
  const workspaceId =
    requirePermission(
      actor,
      "crm:read",
    );

  const row =
    await loadRow(
      db,
      workspaceId,
      templateId,
    );

  if (!row) {
    throw httpError(
      "Contract template not found.",
      404,
    );
  }

  return hydrate(row);
}

export async function createCrmContractTemplate(
  db: D1Db,
  actor:
    CrmContractTemplateActor,
  input: any,
) {
  const workspaceId =
    requirePermission(
      actor,
      "crm:manage",
    );

  const id =
    `crm_contract_template_${crypto.randomUUID()}`;

  const name =
    text(
      input?.name
      || "New contract template",
    ).slice(
      0,
      180,
    );

  const description =
    text(
      input?.description,
    ).slice(
      0,
      900,
    );

  const sections =
    normaliseSections(
      Array.isArray(
        input?.sections,
      )
        ? input.sections
        : [],
    );

  /*
   * Schema 39 has no draft state.
   * New templates deliberately begin archived/inactive
   * so empty legal wording cannot be selected by booking
   * automation.
   */
  const status:
    ContractTemplateStatus =
      "archived";

  await requireUniqueName(
    db,
    workspaceId,
    name,
  );

  await db.batch([
    db.prepare(`
      INSERT INTO crm_contract_templates (
        id,
        workspace_id,
        name,
        description,
        content_json,
        signature_message,
        status,
        created_at,
        updated_at
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        '',
        ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      id,
      workspaceId,
      name,
      description,
      JSON.stringify(sections),
      status,
    ),

    auditStatement(
      db,
      actor,
      workspaceId,
      "crm.contract_template.created",
      id,
      `Created inactive contract template: ${name}.`,
      {
        name,
        status,
      },
    ),
  ]);

  return getCrmContractTemplate(
    db,
    actor,
    id,
  );
}

export async function saveCrmContractTemplate(
  db: D1Db,
  actor:
    CrmContractTemplateActor,
  templateId: string,
  input: any,
) {
  const workspaceId =
    requirePermission(
      actor,
      "crm:manage",
    );

  const current =
    await loadRow(
      db,
      workspaceId,
      templateId,
    );

  if (!current) {
    throw httpError(
      "Contract template not found.",
      404,
    );
  }

  const name =
    text(
      input?.name
      ?? current.name,
    ).slice(
      0,
      180,
    );

  if (!name) {
    throw httpError(
      "Contract template name is required.",
    );
  }

  const description =
    text(
      input?.description
      ?? current.description,
    ).slice(
      0,
      900,
    );

  const sections =
    input?.sections === undefined
      ? parseSections(
          current.content_json,
        )
      : normaliseSections(
          input.sections,
        );

  const status =
    statusValue(
      input?.status,
      statusValue(
        current.status,
        "archived",
      ),
    );

  validateActiveContent(
    status,
    sections,
  );

  await requireUniqueName(
    db,
    workspaceId,
    name,
    templateId,
  );

  const statements = [
    db.prepare(`
      UPDATE crm_contract_templates
      SET
        name = ?,
        description = ?,
        content_json = ?,
        status = ?,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE workspace_id = ?
        AND id = ?
    `).bind(
      name,
      description,
      JSON.stringify(sections),
      status,
      workspaceId,
      templateId,
    ),
  ];

  if (status !== "active") {
    statements.push(
      db.prepare(`
        UPDATE crm_booking_settings
        SET
          default_contract_template_id =
            NULL,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE workspace_id = ?
          AND default_contract_template_id = ?
      `).bind(
        workspaceId,
        templateId,
      ),
    );
  }

  statements.push(
    auditStatement(
      db,
      actor,
      workspaceId,
      "crm.contract_template.updated",
      templateId,
      `Updated contract template: ${name}.`,
      {
        name,
        status,
        previousStatus:
          text(current.status),
      },
    ),
  );

  await db.batch(
    statements,
  );

  return getCrmContractTemplate(
    db,
    actor,
    templateId,
  );
}

export async function archiveCrmContractTemplate(
  db: D1Db,
  actor:
    CrmContractTemplateActor,
  templateId: string,
) {
  const workspaceId =
    requirePermission(
      actor,
      "crm:manage",
    );

  const current =
    await loadRow(
      db,
      workspaceId,
      templateId,
    );

  if (!current) {
    throw httpError(
      "Contract template not found.",
      404,
    );
  }

  const name =
    text(current.name);

  await db.batch([
    db.prepare(`
      UPDATE crm_contract_templates
      SET
        status = 'archived',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE workspace_id = ?
        AND id = ?
    `).bind(
      workspaceId,
      templateId,
    ),

    db.prepare(`
      UPDATE crm_booking_settings
      SET
        default_contract_template_id =
          NULL,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE workspace_id = ?
        AND default_contract_template_id = ?
    `).bind(
      workspaceId,
      templateId,
    ),

    auditStatement(
      db,
      actor,
      workspaceId,
      "crm.contract_template.archived",
      templateId,
      `Archived contract template: ${name}.`,
      {
        name,
        previousStatus:
          text(current.status),
      },
    ),
  ]);

  return getCrmContractTemplate(
    db,
    actor,
    templateId,
  );
}
