import { resolveWorkspaceEntitlements } from "./platform-entitlements-d1";
type D1Db = any;

export type BookingPackActor = {
  workspaceId: string;
  userId?: string;
  email?: string;
  businessName?: string;
};

export type BookingPackResult = {
  jobId: string;
  acceptanceId: string;
  invoice: {
    id: string;
    reference: string;
    status: string;
    created: boolean;
  } | null;
  contract: {
    id: string;
    reference: string;
    status: string;
    created: boolean;
  } | null;
  questionnaire: {
    id: string;
    status: string;
    created: boolean;
  } | null;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function integer(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.trunc(parsed)
    : fallback;
}

function json<T>(
  value: unknown,
  fallback: T,
): T {
  if (
    value !== null
    && typeof value === "object"
  ) {
    return value as T;
  }

  const raw = text(value);

  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function dateOnly(value: unknown) {
  const raw = text(value).slice(0, 10);

  return /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? raw
    : "";
}

function shiftDate(
  value: string,
  days: number,
) {
  const source = dateOnly(value);

  if (!source) return "";

  const date = new Date(
    `${source}T12:00:00Z`,
  );

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setUTCDate(
    date.getUTCDate() + days,
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function notBefore(
  candidate: string,
  minimum: string,
) {
  if (!candidate) return minimum;
  if (!minimum) return candidate;

  return candidate < minimum
    ? minimum
    : candidate;
}

function invoiceReference(
  prefix: unknown,
  number: unknown,
  padding: unknown,
) {
  const safePrefix =
    text(prefix)
    || "INV";

  const safeNumber =
    Math.max(
      1,
      integer(number, 1),
    );

  const safePadding =
    Math.min(
      12,
      Math.max(
        1,
        integer(padding, 4),
      ),
    );

  return `${safePrefix}-${String(
    safeNumber,
  ).padStart(
    safePadding,
    "0",
  )}`;
}

async function ensureCommercialSetup(
  db: D1Db,
  workspaceId: string,
) {
  await db.batch([
    db.prepare(`
      INSERT OR IGNORE INTO
        crm_booking_settings (
          workspace_id
        )
      VALUES (?)
    `).bind(
      workspaceId,
    ),

    db.prepare(`
      INSERT OR IGNORE INTO
        crm_invoice_sequences (
          workspace_id
        )
      VALUES (?)
    `).bind(
      workspaceId,
    ),
  ]);
}

async function bookingSettings(
  db: D1Db,
  workspaceId: string,
) {
  return db.prepare(`
    SELECT *
    FROM crm_booking_settings
    WHERE workspace_id = ?
    LIMIT 1
  `).bind(
    workspaceId,
  ).first();
}

async function commercialSource(
  db: D1Db,
  workspaceId: string,
  quoteId: string,
  jobId: string,
) {
  const acceptance = await db.prepare(`
    SELECT *
    FROM crm_quote_acceptances
    WHERE workspace_id = ?
      AND quote_id = ?
    LIMIT 1
  `).bind(
    workspaceId,
    quoteId,
  ).first();

  if (!acceptance) return null;

  const [
    job,
    quote,
    contact,
    workspace,
    profile,
  ] = await Promise.all([
    db.prepare(`
      SELECT *
      FROM crm_jobs
      WHERE workspace_id = ?
        AND id = ?
      LIMIT 1
    `).bind(
      workspaceId,
      jobId,
    ).first(),

    db.prepare(`
      SELECT *
      FROM crm_quotes
      WHERE workspace_id = ?
        AND id = ?
      LIMIT 1
    `).bind(
      workspaceId,
      quoteId,
    ).first(),

    db.prepare(`
      SELECT *
      FROM crm_contacts
      WHERE workspace_id = ?
        AND id = ?
      LIMIT 1
    `).bind(
      workspaceId,
      acceptance.contact_id,
    ).first(),

    db.prepare(`
      SELECT
        business_name,
        contact_email,
        website_url,
        instagram,
        default_country,
        timezone,
        currency
      FROM workspace_settings
      WHERE workspace_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
    ).first(),

    db.prepare(`
      SELECT
        public_name,
        legal_name,
        business_type,
        registration_country,
        company_number,
        tax_number
      FROM business_profiles
      WHERE workspace_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
    ).first(),
  ]);

  if (
    !job
    || !quote
    || !contact
  ) {
    throw new Error(
      "Accepted quote booking source is incomplete.",
    );
  }

  if (
    text(job.quote_id)
    && text(job.quote_id) !== quoteId
  ) {
    throw new Error(
      "Accepted quote does not match the booked Job.",
    );
  }

  return {
    acceptance,
    job,
    quote,
    contact,
    workspace: workspace || {},
    profile: profile || {},
  };
}

async function activePortalAccess(
  db: D1Db,
  workspaceId: string,
  jobId: string,
  contactId: string,
) {
  const row = await db.prepare(`
    SELECT identity_id
    FROM crm_job_client_access
    WHERE workspace_id = ?
      AND job_id = ?
      AND contact_id = ?
      AND status = 'active'
    LIMIT 1
  `).bind(
    workspaceId,
    jobId,
    contactId,
  ).first();

  return row || null;
}

function businessSnapshot(
  source: any,
) {
  return {
    workspaceId:
      text(source.workspace_id),

    businessName:
      text(source.business_name),

    publicName:
      text(source.public_name),

    legalName:
      text(source.legal_name),

    businessType:
      text(source.business_type),

    contactEmail:
      lower(source.contact_email),

    websiteUrl:
      text(source.website_url),

    instagram:
      text(source.instagram),

    country:
      text(
        source.registration_country
        || source.default_country,
      ),

    companyNumber:
      text(source.company_number),

    taxNumber:
      text(source.tax_number),

    timezone:
      text(source.timezone),

    currency:
      text(source.currency || "GBP"),
  };
}

function clientSnapshot(
  contact: any,
) {
  return {
    id: text(contact.id),
    displayName:
      text(contact.display_name),
    firstName:
      text(contact.first_name),
    lastName:
      text(contact.last_name),
    email:
      lower(contact.email),
    phone:
      text(contact.phone),
  };
}

function bookingSnapshot(
  job: any,
  acceptance: any,
) {
  return {
    jobId:
      text(job.id),

    jobReference:
      text(job.reference),

    title:
      text(job.title),

    eventDate:
      text(job.event_date),

    venue:
      text(job.venue_text),

    serviceName:
      text(job.service_name),

    packageName:
      text(job.package_name),

    currency:
      text(
        acceptance.currency
        || job.currency
        || "GBP",
      ),

    subtotalAmount:
      Number(
        acceptance.subtotal_amount
        || 0,
      ),

    discountAmount:
      Number(
        acceptance.discount_amount
        || 0,
      ),

    taxAmount:
      Number(
        acceptance.tax_amount
        || 0,
      ),

    totalAmount:
      Number(
        acceptance.total_amount
        || 0,
      ),

    quoteId:
      text(acceptance.quote_id),

    quoteVersionId:
      text(acceptance.version_id),

    quoteReference:
      text(job.quote_reference),

    acceptedAt:
      text(acceptance.accepted_at),

    package:
      json(
        acceptance
          .selected_package_snapshot_json,
        {},
      ),

    addons:
      json(
        acceptance
          .selected_addons_snapshot_json,
        [],
      ),
  };
}

async function ensureInvoice(
  db: D1Db,
  actor: BookingPackActor,
  settings: any,
  source: any,
  snapshots: {
    business: any;
    client: any;
    booking: any;
  },
  hasPortalAccess: boolean,
) {
  if (
    Number(
      settings.auto_create_invoice
      || 0,
    ) !== 1
  ) {
    return null;
  }

  const workspaceId =
    actor.workspaceId;

  const acceptanceId =
    text(source.acceptance.id);

  const existing =
    await db.prepare(`
      SELECT
        id,
        reference,
        status
      FROM crm_invoices
      WHERE workspace_id = ?
        AND quote_acceptance_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
      acceptanceId,
    ).first();

  if (existing) {
    return {
      id: text(existing.id),
      reference:
        text(existing.reference),
      status:
        text(existing.status),
      created: false,
    };
  }

  const sequence =
    await db.prepare(`
      UPDATE crm_invoice_sequences
      SET
        next_number =
          next_number + 1,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE workspace_id = ?
      RETURNING
        prefix,
        padding,
        next_number - 1
          AS issued_number
    `).bind(
      workspaceId,
    ).first();

  if (!sequence) {
    throw new Error(
      "Invoice sequence is not configured.",
    );
  }

  const reference =
    invoiceReference(
      sequence.prefix,
      sequence.issued_number,
      sequence.padding,
    );

  const invoiceId =
    `crm_invoice_${acceptanceId}`;

  const acceptedDate =
    dateOnly(
      source.acceptance.accepted_at,
    )
    || new Date()
      .toISOString()
      .slice(0, 10);

  const eventDate =
    dateOnly(source.job.event_date);

  const totalAmount =
    Math.max(
      0,
      integer(
        source.acceptance.total_amount,
      ),
    );

  const subtotalAmount =
    Math.max(
      0,
      integer(
        source.acceptance.subtotal_amount,
      ),
    );

  const depositType =
    text(settings.deposit_type);

  const depositValue =
    Math.max(
      0,
      integer(settings.deposit_value),
    );

  let depositAmount = 0;

  if (depositType === "fixed") {
    depositAmount =
      Math.min(
        totalAmount,
        depositValue,
      );
  } else if (
    depositType === "percentage"
  ) {
    depositAmount =
      Math.min(
        totalAmount,
        Math.round(
          totalAmount
          * Math.min(
            10000,
            depositValue,
          )
          / 10000,
        ),
      );
  }

  const finalAmount =
    Math.max(
      0,
      totalAmount - depositAmount,
    );

  const depositDue =
    shiftDate(
      acceptedDate,
      Math.max(
        0,
        integer(
          settings
            .deposit_due_days_after_acceptance,
        ),
      ),
    )
    || acceptedDate;

  const calculatedFinalDue =
    eventDate
      ? shiftDate(
          eventDate,
          -Math.max(
            0,
            integer(
              settings
                .final_balance_due_days_before_event,
              30,
            ),
          ),
        )
      : acceptedDate;

  const finalDue =
    notBefore(
      calculatedFinalDue,
      acceptedDate,
    );

  const dueDate =
    finalAmount > 0
      ? finalDue
      : depositDue;

  const packageSnapshot =
    json<any>(
      source.acceptance
        .selected_package_snapshot_json,
      {},
    );

  const addons =
    json<any[]>(
      source.acceptance
        .selected_addons_snapshot_json,
      [],
    );

  const addonTotal =
    addons.reduce(
      (
        sum: number,
        addon: any,
      ) => (
        sum
        + Math.max(
            0,
            integer(
              addon.lineTotalAmount,
              integer(addon.quantity, 1)
              * integer(
                  addon.unitPriceAmount,
                ),
            ),
          )
      ),
      0,
    );

  const packageLineTotal =
    Math.max(
      0,
      subtotalAmount - addonTotal,
    );

  const quoteSnapshot =
    json<any>(
      source.job
        .quote_snapshot_json,
      {},
    );

  const invoiceBookingSnapshot = {
    ...snapshots.booking,
    taxLabel:
      text(
        quoteSnapshot.taxLabel,
      )
      || "Tax",
  };

  const statements: any[] = [
    db.prepare(`
      INSERT OR IGNORE INTO
        crm_invoices (
          id,
          workspace_id,
          job_id,
          primary_contact_id,
          quote_id,
          quote_version_id,
          quote_acceptance_id,
          source_kind,
          source_id,
          reference,
          status,
          currency,
          issue_date,
          due_date,
          subtotal_amount,
          discount_amount,
          tax_amount,
          total_amount,
          business_snapshot_json,
          client_snapshot_json,
          booking_snapshot_json,
          notes,
          terms,
          created_by_user_id,
          created_at,
          updated_at
        )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        'accepted_quote',
        ?, ?,
        'draft',
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      invoiceId,
      workspaceId,
      source.job.id,
      source.contact.id,
      source.quote.id,
      source.acceptance.version_id,
      acceptanceId,
      acceptanceId,
      reference,
      text(
        source.acceptance.currency
        || source.job.currency
        || "GBP",
      ),
      acceptedDate,
      dueDate || null,
      subtotalAmount,
      Math.max(
        0,
        integer(
          source.acceptance
            .discount_amount,
        ),
      ),
      Math.max(
        0,
        integer(
          source.acceptance
            .tax_amount,
        ),
      ),
      totalAmount,
      JSON.stringify(
        snapshots.business,
      ),
      JSON.stringify(
        snapshots.client,
      ),
      JSON.stringify(
        invoiceBookingSnapshot,
      ),
      text(
        settings.invoice_notes,
      ),
      text(
        settings.invoice_terms,
      ),
      text(actor.userId) || null,
    ),
  ];

  statements.push(
    db.prepare(`
      INSERT OR IGNORE INTO
        crm_invoice_items (
          id,
          workspace_id,
          invoice_id,
          item_type,
          name,
          description,
          quantity,
          unit_price_amount,
          line_total_amount,
          display_order,
          source_snapshot_json,
          created_at
        )
      VALUES (
        ?, ?, ?,
        'package',
        ?, ?,
        1,
        ?,
        ?,
        10,
        ?,
        CURRENT_TIMESTAMP
      )
    `).bind(
      `${invoiceId}_package`,
      workspaceId,
      invoiceId,
      text(
        packageSnapshot.name
        || source.job.package_name
        || "Booking package",
      ),
      text(
        packageSnapshot.description,
      ),
      packageLineTotal,
      packageLineTotal,
      JSON.stringify(
        packageSnapshot,
      ),
    ),
  );

  addons.forEach(
    (
      addon: any,
      index: number,
    ) => {
      const quantity =
        Math.max(
          1,
          integer(
            addon.quantity,
            1,
          ),
        );

      const unitPrice =
        Math.max(
          0,
          integer(
            addon.unitPriceAmount,
          ),
        );

      const lineTotal =
        Math.max(
          0,
          integer(
            addon.lineTotalAmount,
            quantity * unitPrice,
          ),
        );

      statements.push(
        db.prepare(`
          INSERT OR IGNORE INTO
            crm_invoice_items (
              id,
              workspace_id,
              invoice_id,
              item_type,
              name,
              description,
              quantity,
              unit_price_amount,
              line_total_amount,
              display_order,
              source_snapshot_json,
              created_at
            )
          VALUES (
            ?, ?, ?,
            'addon',
            ?, ?,
            ?, ?, ?,
            ?,
            ?,
            CURRENT_TIMESTAMP
          )
        `).bind(
          `${invoiceId}_addon_${index + 1}`,
          workspaceId,
          invoiceId,
          text(
            addon.name
            || "Add-on",
          ),
          text(addon.description),
          quantity,
          unitPrice,
          lineTotal,
          20 + index,
          JSON.stringify(addon),
        ),
      );
    },
  );

  if (depositAmount > 0) {
    statements.push(
      db.prepare(`
        INSERT OR IGNORE INTO
          crm_invoice_schedule_items (
            id,
            workspace_id,
            invoice_id,
            schedule_type,
            label,
            amount,
            due_date,
            display_order,
            metadata_json,
            created_at
          )
        VALUES (
          ?, ?, ?,
          'deposit',
          'Booking deposit',
          ?,
          ?,
          10,
          ?,
          CURRENT_TIMESTAMP
        )
      `).bind(
        `${invoiceId}_deposit`,
        workspaceId,
        invoiceId,
        depositAmount,
        depositDue || null,
        JSON.stringify({
          depositType,
          depositValue,
        }),
      ),
    );
  }

  if (finalAmount > 0) {
    statements.push(
      db.prepare(`
        INSERT OR IGNORE INTO
          crm_invoice_schedule_items (
            id,
            workspace_id,
            invoice_id,
            schedule_type,
            label,
            amount,
            due_date,
            display_order,
            metadata_json,
            created_at
          )
        VALUES (
          ?, ?, ?,
          'final',
          'Final balance',
          ?,
          ?,
          20,
          ?,
          CURRENT_TIMESTAMP
        )
      `).bind(
        `${invoiceId}_final`,
        workspaceId,
        invoiceId,
        finalAmount,
        finalDue || null,
        JSON.stringify({
          daysBeforeEvent:
            Math.max(
              0,
              integer(
                settings
                  .final_balance_due_days_before_event,
                30,
              ),
            ),
        }),
      ),
    );
  }

  statements.push(
    db.prepare(`
      UPDATE crm_invoices
      SET
        status = 'issued',
        issued_at =
          COALESCE(
            issued_at,
            CURRENT_TIMESTAMP
          ),
        sent_at = CASE
          WHEN ? = 1
            THEN COALESCE(
              sent_at,
              CURRENT_TIMESTAMP
            )
          ELSE sent_at
        END,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND workspace_id = ?
        AND status = 'draft'
    `).bind(
      hasPortalAccess ? 1 : 0,
      invoiceId,
      workspaceId,
    ),
  );

  await db.batch(statements);

  const invoice =
    await db.prepare(`
      SELECT
        id,
        reference,
        status
      FROM crm_invoices
      WHERE workspace_id = ?
        AND quote_acceptance_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
      acceptanceId,
    ).first();

  if (!invoice) {
    throw new Error(
      "Automatic invoice generation failed.",
    );
  }

  return {
    id: text(invoice.id),
    reference:
      text(invoice.reference),
    status:
      text(invoice.status),
    created: true,
  };
}

async function ensureContract(
  db: D1Db,
  actor: BookingPackActor,
  settings: any,
  source: any,
  snapshots: {
    business: any;
    client: any;
    booking: any;
  },
  invoice: any,
  hasPortalAccess: boolean,
) {
  if (
    Number(
      settings.auto_create_contract
      || 0,
    ) !== 1
  ) {
    return null;
  }

  const templateId =
    text(
      settings
        .default_contract_template_id,
    );

  if (!templateId) {
    return null;
  }

  const workspaceId =
    actor.workspaceId;

  const acceptanceId =
    text(source.acceptance.id);

  const existing =
    await db.prepare(`
      SELECT
        id,
        reference,
        status
      FROM crm_contracts
      WHERE workspace_id = ?
        AND quote_acceptance_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
      acceptanceId,
    ).first();

  if (existing) {
    return {
      id: text(existing.id),
      reference:
        text(existing.reference),
      status:
        text(existing.status),
      created: false,
    };
  }

  const frozenContract =
    source?.bookingPack
      ?.contract
    && typeof source
      .bookingPack
      .contract === "object"
      ? source
          .bookingPack
          .contract
      : null;

  const template =
    frozenContract
    && text(
      frozenContract.templateId,
    ) === templateId
      ? {
          id:
            templateId,
          name:
            text(
              frozenContract.name,
            ),
          version:
            Math.max(
              1,
              integer(
                frozenContract.version,
                1,
              ),
            ),
          content_json:
            text(
              frozenContract
                .contentJson
              || "[]",
            ),
        }
      : await db.prepare(`
          SELECT *
          FROM crm_contract_templates
          WHERE workspace_id = ?
            AND id = ?
            AND status = 'active'
          LIMIT 1
        `).bind(
          workspaceId,
          templateId,
        ).first();

  if (!template) {
    return null;
  }

  const contractId =
    `crm_contract_${acceptanceId}`;

  const versionId =
    `${contractId}_v1`;

  const reference =
    `CON-${
      text(source.quote.reference)
      || text(source.job.reference)
    }`;

  const initialStatus =
    hasPortalAccess
      ? "sent"
      : "draft";

  const termsSnapshot = {
    invoiceId:
      text(invoice?.id),

    invoiceReference:
      text(invoice?.reference),

    invoiceTerms:
      text(
        settings.invoice_terms,
      ),

    depositType:
      text(settings.deposit_type),

    depositValue:
      Math.max(
        0,
        integer(
          settings.deposit_value,
        ),
      ),

    finalBalanceDueDaysBeforeEvent:
      Math.max(
        0,
        integer(
          settings
            .final_balance_due_days_before_event,
          30,
        ),
      ),
  };

  await db.batch([
    db.prepare(`
      INSERT OR IGNORE INTO
        crm_contracts (
          id,
          workspace_id,
          job_id,
          primary_contact_id,
          template_id,
          quote_acceptance_id,
          source_kind,
          source_id,
          reference,
          title,
          status,
          created_by_user_id,
          created_at,
          updated_at
        )
      VALUES (
        ?, ?, ?, ?, ?, ?,
        'accepted_quote',
        ?, ?, ?,
        'draft',
        ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      contractId,
      workspaceId,
      source.job.id,
      source.contact.id,
      template.id,
      acceptanceId,
      acceptanceId,
      reference,
      text(
        template.name
        || "Booking contract",
      ),
      text(actor.userId) || null,
    ),

    db.prepare(`
      INSERT OR IGNORE INTO
        crm_contract_versions (
          id,
          workspace_id,
          contract_id,
          version_number,
          status,
          title,
          content_json,
          business_snapshot_json,
          client_snapshot_json,
          booking_snapshot_json,
          terms_snapshot_json,
          required_signatures,
          created_by_user_id,
          sent_at,
          created_at,
          updated_at
        )
      VALUES (
        ?, ?, ?,
        1,
        ?, ?, ?,
        ?, ?, ?, ?,
        1,
        ?,
        CASE
          WHEN ? = 'sent'
            THEN CURRENT_TIMESTAMP
          ELSE NULL
        END,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      versionId,
      workspaceId,
      contractId,
      initialStatus,
      text(
        template.name
        || "Booking contract",
      ),
      text(
        template.content_json
        || "[]",
      ),
      JSON.stringify(
        snapshots.business,
      ),
      JSON.stringify(
        snapshots.client,
      ),
      JSON.stringify(
        snapshots.booking,
      ),
      JSON.stringify(
        termsSnapshot,
      ),
      text(actor.userId) || null,
      initialStatus,
    ),

    db.prepare(`
      UPDATE crm_contracts
      SET
        current_version_id = ?,
        status = ?,
        sent_at = CASE
          WHEN ? = 'sent'
            THEN COALESCE(
              sent_at,
              CURRENT_TIMESTAMP
            )
          ELSE sent_at
        END,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND workspace_id = ?
        AND current_version_id IS NULL
    `).bind(
      versionId,
      initialStatus,
      initialStatus,
      contractId,
      workspaceId,
    ),
  ]);

  const contract =
    await db.prepare(`
      SELECT
        id,
        reference,
        status
      FROM crm_contracts
      WHERE workspace_id = ?
        AND quote_acceptance_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
      acceptanceId,
    ).first();

  if (!contract) {
    throw new Error(
      "Automatic contract generation failed.",
    );
  }

  return {
    id: text(contract.id),
    reference:
      text(contract.reference),
    status:
      text(contract.status),
    created: true,
  };
}

async function ensureQuestionnaire(
  db: D1Db,
  actor: BookingPackActor,
  settings: any,
  source: any,
  hasPortalAccess: boolean,
) {
  if (
    Number(
      settings.auto_assign_questionnaire
      || 0,
    ) !== 1
  ) {
    return null;
  }

  const templateId =
    text(
      settings
        .default_questionnaire_template_id,
    );

  if (!templateId) {
    return null;
  }

  const workspaceId =
    actor.workspaceId;

  const existing =
    await db.prepare(`
      SELECT
        id,
        status
      FROM crm_questionnaire_instances
      WHERE workspace_id = ?
        AND job_id = ?
        AND template_id = ?
        AND assigned_contact_id = ?
      ORDER BY created_at
      LIMIT 1
    `).bind(
      workspaceId,
      source.job.id,
      templateId,
      source.contact.id,
    ).first();

  if (existing) {
    return {
      id: text(existing.id),
      status:
        text(existing.status),
      created: false,
    };
  }

  const frozenQuestionnaire =
    source?.bookingPack
      ?.questionnaire
    && typeof source
      .bookingPack
      .questionnaire
      === "object"
      ? source
          .bookingPack
          .questionnaire
      : null;

  const template =
    frozenQuestionnaire
    && text(
      frozenQuestionnaire
        .templateId,
    ) === templateId
      ? {
          id:
            templateId,
          name:
            text(
              frozenQuestionnaire
                .name,
            ),
          description:
            text(
              frozenQuestionnaire
                .description,
            ),
          version:
            Math.max(
              1,
              integer(
                frozenQuestionnaire
                  .version,
                1,
              ),
            ),
          schema_json:
            text(
              frozenQuestionnaire
                .schemaJson
              || "[]",
            ),
        }
      : await db.prepare(`
          SELECT *
          FROM crm_questionnaire_templates
          WHERE workspace_id = ?
            AND id = ?
            AND status = 'active'
          LIMIT 1
        `).bind(
          workspaceId,
          templateId,
        ).first();

  if (!template) {
    return null;
  }

  const acceptedDate =
    dateOnly(
      source.acceptance.accepted_at,
    )
    || new Date()
      .toISOString()
      .slice(0, 10);

  const eventDate =
    dateOnly(source.job.event_date);

  const calculatedDue =
    eventDate
      ? shiftDate(
          eventDate,
          -Math.max(
            0,
            integer(
              settings
                .questionnaire_due_days_before_event,
              60,
            ),
          ),
        )
      : acceptedDate;

  const dueAt =
    notBefore(
      calculatedDue,
      acceptedDate,
    );

  const initialStatus =
    hasPortalAccess
      ? "sent"
      : "draft";

  const id =
    `crm_questionnaire_booking_${
      text(source.acceptance.id)
    }`;

  await db.prepare(`
    INSERT OR IGNORE INTO
      crm_questionnaire_instances (
        id,
        workspace_id,
        job_id,
        template_id,
        assigned_contact_id,
        title,
        introduction,
        schema_json,
        template_version,
        status,
        due_at,
        sent_at,
        created_by_user_id,
        created_at,
        updated_at
      )
    VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?,
      ?,
      ?,
      CASE
        WHEN ? = 'sent'
          THEN CURRENT_TIMESTAMP
        ELSE NULL
      END,
      ?,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `).bind(
    id,
    workspaceId,
    source.job.id,
    template.id,
    source.contact.id,
    text(template.name)
      .slice(0, 180),
    text(template.description)
      .slice(0, 1200),
    text(
      template.schema_json
      || "[]",
    ),
    Math.max(
      1,
      integer(
        template.version,
        1,
      ),
    ),
    initialStatus,
    dueAt || null,
    initialStatus,
    text(actor.userId) || null,
  ).run();

  const questionnaire =
    await db.prepare(`
      SELECT
        id,
        status
      FROM crm_questionnaire_instances
      WHERE workspace_id = ?
        AND id = ?
      LIMIT 1
    `).bind(
      workspaceId,
      id,
    ).first();

  if (!questionnaire) {
    throw new Error(
      "Automatic questionnaire assignment failed.",
    );
  }

  return {
    id: text(questionnaire.id),
    status:
      text(questionnaire.status),
    created: true,
  };
}

async function recordBookingPackActivity(
  db: D1Db,
  actor: BookingPackActor,
  source: any,
  result: {
    invoice: any;
    contract: any;
    questionnaire: any;
  },
) {
  const created = [
    result.invoice?.created
      ? "invoice"
      : "",
    result.contract?.created
      ? "contract"
      : "",
    result.questionnaire?.created
      ? "questionnaire"
      : "",
  ].filter(Boolean);

  if (!created.length) return;

  await db.prepare(`
    INSERT INTO crm_activities (
      id,
      workspace_id,
      entity_type,
      entity_id,
      event_type,
      summary,
      actor_user_id,
      actor_email,
      metadata_json,
      created_at
    )
    VALUES (
      ?,
      ?,
      'job',
      ?,
      'booking_pack.generated',
      ?,
      ?,
      ?,
      ?,
      CURRENT_TIMESTAMP
    )
  `).bind(
    `crm_activity_${crypto.randomUUID()}`,
    actor.workspaceId,
    source.job.id,
    `Generated booking pack: ${
      created.join(", ")
    }.`,
    text(actor.userId) || null,
    lower(actor.email),
    JSON.stringify({
      acceptanceId:
        text(source.acceptance.id),

      invoiceId:
        text(result.invoice?.id),

      contractId:
        text(result.contract?.id),

      questionnaireId:
        text(
          result.questionnaire?.id,
        ),
    }),
  ).run();
}


async function frozenBookingPackForAcceptedQuote(
  db: D1Db,
  workspaceId: string,
  source: any,
) {
  const versionId =
    text(
      source?.acceptance
        ?.version_id,
    );

  const quoteId =
    text(
      source?.quote?.id,
    );

  if (
    !versionId
    || !quoteId
  ) {
    return null;
  }

  const row =
    await db.prepare(`
      SELECT
        snapshot_json
      FROM crm_quote_versions
      WHERE workspace_id = ?
        AND id = ?
        AND quote_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
      versionId,
      quoteId,
    ).first();

  if (!row) {
    return null;
  }

  const snapshot =
    json<any>(
      row.snapshot_json,
      {},
    );

  const pack =
    snapshot?.bookingPack;

  if (
    !pack
    || typeof pack !== "object"
    || !text(pack.frozenAt)
  ) {
    return null;
  }

  return pack;
}

function settingsWithFrozenBookingPack(
  liveSettings: any,
  pack: any,
) {
  const contract =
    pack?.contract
    && typeof pack.contract
      === "object"
      ? pack.contract
      : null;

  const questionnaire =
    pack?.questionnaire
    && typeof pack.questionnaire
      === "object"
      ? pack.questionnaire
      : null;

  const invoice =
    pack?.invoice
    && typeof pack.invoice
      === "object"
      ? pack.invoice
      : {};

  return {
    ...liveSettings,

    auto_create_contract:
      contract ? 1 : 0,

    default_contract_template_id:
      contract
        ? text(
            contract.templateId,
          )
        : null,

    auto_assign_questionnaire:
      questionnaire ? 1 : 0,

    default_questionnaire_template_id:
      questionnaire
        ? text(
            questionnaire
              .templateId,
          )
        : null,

    auto_create_invoice:
      invoice.enabled
        ? 1
        : 0,

    deposit_type:
      text(
        invoice.depositType,
      ) || "none",

    deposit_value:
      Math.max(
        0,
        integer(
          invoice.depositValue,
        ),
      ),

    deposit_due_days_after_acceptance:
      Math.max(
        0,
        integer(
          invoice
            .depositDueDaysAfterAcceptance,
        ),
      ),

    final_balance_due_days_before_event:
      Math.max(
        0,
        integer(
          invoice
            .finalBalanceDueDaysBeforeEvent,
          30,
        ),
      ),

    questionnaire_due_days_before_event:
      Math.max(
        0,
        integer(
          questionnaire
            ?.dueDaysBeforeEvent,
          60,
        ),
      ),

    invoice_notes:
      text(invoice.notes),

    invoice_terms:
      text(invoice.terms),
  };
}

type JobBookingCapabilities = {
  contracts: boolean;
  invoices: boolean;
  clientPortal: boolean;
};

async function jobBookingCapabilities(
  db: D1Db,
  workspaceId: string,
): Promise<JobBookingCapabilities> {
  const resolved =
    await resolveWorkspaceEntitlements(
      db,
      workspaceId,
    );

  return {
    contracts:
      resolved.byKey.contracts?.enabled
      === true,

    invoices:
      resolved.byKey.invoices?.enabled
      === true,

    clientPortal:
      resolved.byKey["client-portal"]?.enabled
      === true,
  };
}


export async function ensureBookingPackForAcceptedQuote(
  db: D1Db,
  actor: BookingPackActor,
  input: {
    quoteId: string;
    jobId: string;
  },
): Promise<BookingPackResult | null> {
  const workspaceId =
    text(actor.workspaceId);

  const quoteId =
    text(input.quoteId);

  const jobId =
    text(input.jobId);

  if (
    !workspaceId
    || !quoteId
    || !jobId
  ) {
    throw new Error(
      "Workspace, quote and Job are required for booking-pack generation.",
    );
  }

  await ensureCommercialSetup(
    db,
    workspaceId,
  );

  const source =
    await commercialSource(
      db,
      workspaceId,
      quoteId,
      jobId,
    );

  if (!source) {
    return null;
  }

  const liveSettings =
    await bookingSettings(
      db,
      workspaceId,
    );

  if (!liveSettings) {
    throw new Error(
      "Commercial booking settings are unavailable.",
    );
  }

  const frozenBookingPack =
    await frozenBookingPackForAcceptedQuote(
      db,
      workspaceId,
      source,
    );

  source.bookingPack =
    frozenBookingPack;

  const settings =
    frozenBookingPack
      ? settingsWithFrozenBookingPack(
          liveSettings,
          frozenBookingPack,
        )
      : liveSettings;

  const capabilities =
    await jobBookingCapabilities(
      db,
      workspaceId,
    );

  const portalAccess =
    capabilities.clientPortal
      ? await activePortalAccess(
          db,
          workspaceId,
          jobId,
          text(source.contact.id),
        )
      : null;

  const hasPortalAccess =
    Boolean(portalAccess);

  const combinedBusiness = {
    workspace_id:
      workspaceId,
    ...source.workspace,
    ...source.profile,
  };

  const snapshots = {
    business:
      businessSnapshot(
        combinedBusiness,
      ),

    client:
      clientSnapshot(
        source.contact,
      ),

    booking:
      bookingSnapshot(
        source.job,
        source.acceptance,
      ),
  };

  const invoice =
    capabilities.invoices
      ? await ensureInvoice(
          db,
          actor,
          settings,
          source,
          snapshots,
          hasPortalAccess,
        )
      : null;

  const contract =
    capabilities.contracts
      ? await ensureContract(
          db,
          actor,
          settings,
          source,
          snapshots,
          invoice,
          hasPortalAccess,
        )
      : null;

  const questionnaire =
    capabilities.clientPortal
      ? await ensureQuestionnaire(
          db,
          actor,
          settings,
          source,
          hasPortalAccess,
        )
      : null;

  await recordBookingPackActivity(
    db,
    actor,
    source,
    {
      invoice,
      contract,
      questionnaire,
    },
  );

  return {
    jobId,
    acceptanceId:
      text(source.acceptance.id),
    invoice,
    contract,
    questionnaire,
  };
}

function commercialText(value: unknown) {
  return String(value ?? "").trim();
}

function commercialNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function commercialJson(value: unknown) {
  if (value && typeof value === "object") return value as Record<string, any>;
  try {
    const parsed = JSON.parse(commercialText(value) || "{}");
    return parsed && typeof parsed === "object" ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

function commercialHttpError(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

export async function getJobCommercialWorkspace(
  db: D1Db,
  actor: any,
  jobIdInput: unknown,
) {
  const workspaceId = commercialText(actor?.workspaceId);
  const jobId = commercialText(jobIdInput);

  if (!workspaceId) {
    throw commercialHttpError(
      "Professional workspace context is required.",
      403,
    );
  }

  if (!(actor?.permissions || []).includes("crm:read")) {
    throw commercialHttpError(
      "CRM read access is required.",
      403,
    );
  }

  if (!jobId) {
    throw commercialHttpError("Job ID is required.");
  }

  const capabilities =
    await jobBookingCapabilities(
      db,
      workspaceId,
    );

  const job = await db.prepare(`
    SELECT *
    FROM crm_jobs
    WHERE id = ? AND workspace_id = ?
    LIMIT 1
  `).bind(jobId, workspaceId).first();

  if (!job) {
    throw commercialHttpError("Job not found.", 404);
  }

  const quoteId = commercialText(job.quote_id);

  const [invoice, contract, acceptance, quoteRow] = await Promise.all([
    capabilities.invoices
      ? db.prepare(`
          SELECT *
          FROM crm_invoices
          WHERE workspace_id = ? AND job_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `).bind(workspaceId, jobId).first()
      : Promise.resolve(null),

    capabilities.contracts
      ? db.prepare(`
          SELECT *
          FROM crm_contracts
          WHERE workspace_id = ? AND job_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `).bind(workspaceId, jobId).first()
      : Promise.resolve(null),

    quoteId
      ? db.prepare(`
          SELECT *
          FROM crm_quote_acceptances
          WHERE workspace_id = ? AND quote_id = ?
          ORDER BY accepted_at DESC
          LIMIT 1
        `).bind(workspaceId, quoteId).first()
      : Promise.resolve(null),

    quoteId
      ? db.prepare(`
          SELECT id, reference
          FROM crm_quotes
          WHERE workspace_id = ? AND id = ?
          LIMIT 1
        `).bind(workspaceId, quoteId).first()
      : Promise.resolve(null),
  ]);

  let invoicePayload: any = null;

  if (invoice) {
    const [scheduleResult, paymentResult] = await Promise.all([
      db.prepare(`
        SELECT *
        FROM crm_invoice_schedule_items
        WHERE workspace_id = ? AND invoice_id = ?
        ORDER BY display_order, due_date, created_at, id
      `).bind(workspaceId, invoice.id).all(),

      db.prepare(`
        SELECT *
        FROM crm_invoice_payments
        WHERE workspace_id = ? AND invoice_id = ?
        ORDER BY created_at, id
      `).bind(workspaceId, invoice.id).all(),
    ]);

    const scheduleRows = scheduleResult.results || [];
    const paymentRows = paymentResult.results || [];

    const allocatedBySchedule = new Map<string, number>();
    let unallocatedNet = 0;
    let paidNet = 0;

    for (const row of paymentRows) {
      const amount = Math.abs(commercialNumber(
        row.amount
        ?? row.amount_amount
        ?? row.payment_amount
        ?? row.value_amount
      ));

      const kind = commercialText(
        row.payment_type
        ?? row.record_type
        ?? row.type
        ?? "payment"
      ).toLowerCase();

      const signedAmount = (
        kind === "refund"
        || kind === "reversal"
      )
        ? -amount
        : amount;

      paidNet += signedAmount;

      const scheduleItemId = commercialText(
        row.schedule_item_id
      );

      if (scheduleItemId) {
        allocatedBySchedule.set(
          scheduleItemId,
          (allocatedBySchedule.get(scheduleItemId) || 0)
            + signedAmount,
        );
      } else {
        unallocatedNet += signedAmount;
      }
    }

    let unallocatedAvailable = Math.max(0, unallocatedNet);
    const today = new Date().toISOString().slice(0, 10);

    const schedule = scheduleRows.map((row: any) => {
      const id = commercialText(row.id);
      const amount = Math.max(
        0,
        commercialNumber(row.amount),
      );

      let applied = Math.max(
        0,
        allocatedBySchedule.get(id) || 0,
      );

      if (applied < amount && unallocatedAvailable > 0) {
        const additional = Math.min(
          amount - applied,
          unallocatedAvailable,
        );
        applied += additional;
        unallocatedAvailable -= additional;
      }

      const balance = Math.max(0, amount - applied);
      const dueDate = commercialText(row.due_date);

      const status = balance === 0
        ? "paid"
        : applied > 0
          ? "part_paid"
          : dueDate && dueDate < today
            ? "overdue"
            : "pending";

      return {
        id,
        label: commercialText(
          row.label || row.schedule_type || "Payment"
        ),
        scheduleType: commercialText(
          row.schedule_type || "custom"
        ),
        amount,
        dueDate,
        status,
        paidAmount: applied,
        balanceAmount: balance,
      };
    });

    const totalAmount = Math.max(
      0,
      commercialNumber(invoice.total_amount),
    );

    const paidAmount = Math.max(0, paidNet);
    const balanceAmount = Math.max(
      0,
      totalAmount - paidAmount,
    );

    const nextPayment = schedule.find(
      (item: any) => item.status !== "paid",
    ) || null;

    invoicePayload = {
      id: commercialText(invoice.id),
      reference: commercialText(invoice.reference),
      status: commercialText(invoice.status || "draft"),
      currency: commercialText(
        invoice.currency || job.currency || "GBP"
      ),
      issueDate: commercialText(invoice.issue_date),
      dueDate: commercialText(invoice.due_date),
      subtotalAmount: Math.max(
        0,
        commercialNumber(invoice.subtotal_amount),
      ),
      discountAmount: Math.max(
        0,
        commercialNumber(invoice.discount_amount),
      ),
      taxAmount: Math.max(
        0,
        commercialNumber(invoice.tax_amount),
      ),
      taxLabel:
        commercialText(
          json<any>(
            invoice.booking_snapshot_json,
            {},
          ).taxLabel
          || "Tax",
        ),
      totalAmount,
      paidAmount,
      balanceAmount,
      nextPayment,
      schedule,
    };
  }

  let contractPayload: any = null;

  if (contract) {
    const currentVersionId = commercialText(
      contract.current_version_id
    );

    const version = currentVersionId
      ? await db.prepare(`
          SELECT *
          FROM crm_contract_versions
          WHERE workspace_id = ?
            AND contract_id = ?
            AND id = ?
          LIMIT 1
        `).bind(
          workspaceId,
          contract.id,
          currentVersionId,
        ).first()
      : await db.prepare(`
          SELECT *
          FROM crm_contract_versions
          WHERE workspace_id = ?
            AND contract_id = ?
          ORDER BY version_number DESC, created_at DESC
          LIMIT 1
        `).bind(
          workspaceId,
          contract.id,
        ).first();

    const signaturesResult = await db.prepare(`
      SELECT *
      FROM crm_contract_signatures
      WHERE workspace_id = ?
        AND contract_id = ?
      ORDER BY created_at, id
    `).bind(
      workspaceId,
      contract.id,
    ).all();

    const allSignatures = signaturesResult.results || [];
    const versionId = commercialText(
      version?.id || currentVersionId
    );

    const signatures = versionId
      ? allSignatures.filter(
          (row: any) =>
            commercialText(row.version_id) === versionId
        )
      : allSignatures;

    const latestSignature = signatures.length
      ? signatures[signatures.length - 1]
      : null;

    contractPayload = {
      id: commercialText(contract.id),
      reference: commercialText(contract.reference),
      title: commercialText(
        contract.title || "Booking contract"
      ),
      status: commercialText(contract.status || "draft"),
      currentVersionId: versionId,
      versionNumber: commercialNumber(
        version?.version_number
      ),
      versionStatus: commercialText(
        version?.status || contract.status || "draft"
      ),
      sentAt: commercialText(
        version?.sent_at || contract.sent_at
      ),
      requiredSignatures: Math.max(
        1,
        commercialNumber(version?.required_signatures || 1),
      ),
      signatureCount: signatures.length,
      signedAt: commercialText(
        contract.signed_at
        || latestSignature?.signed_at
        || latestSignature?.created_at
      ),
      content: commercialJson(
        version?.content_json,
      ),
      terms: commercialJson(
        version?.terms_snapshot_json,
      ),
    };
  }

  const packageSnapshot = commercialJson(
    acceptance?.selected_package_snapshot_json
  );

  const quotePayload = quoteId
    ? {
        id: quoteId,
        reference: commercialText(
          quoteRow?.reference || job.quote_reference
        ),
        acceptedAt: commercialText(
          acceptance?.accepted_at
          || job.accepted_quote_at
        ),
        totalAmount: Math.max(
          0,
          commercialNumber(
            acceptance?.total_amount
            ?? job.value_amount
          ),
        ),
        currency: commercialText(
          acceptance?.currency
          || job.currency
          || "GBP"
        ),
        packageName: commercialText(
          packageSnapshot.name
          || packageSnapshot.packageName
          || job.package_name
        ),
      }
    : null;

  return {
    quote: quotePayload,
    invoice: invoicePayload,
    contract: contractPayload,
  };
}
