import { getAuthenticatedClientIdentity } from "./client-auth-d1";

type D1Db = any;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function json<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function httpError(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

async function publicIdentity(db: D1Db, request: Request, workspaceId: string) {
  const identity = await getAuthenticatedClientIdentity(db, request);
  if (!identity || identity.workspaceId !== workspaceId) return null;
  return identity;
}

async function authoriseJob(
  db: D1Db,
  workspaceId: string,
  identityId: string,
  jobId: string,
) {
  const row = await db.prepare(`
    SELECT
      access.job_id,
      access.contact_id,
      access.identity_id,
      job.reference AS job_reference,
      job.title AS job_title,
      job.status AS job_status,
      job.event_date,
      job.venue_text,
      contact.display_name AS contact_name,
      contact.email AS contact_email
    FROM crm_job_client_access access
    JOIN crm_jobs job
      ON job.id = access.job_id
     AND job.workspace_id = access.workspace_id
    JOIN crm_contacts contact
      ON contact.id = access.contact_id
     AND contact.workspace_id = access.workspace_id
    WHERE access.workspace_id = ?
      AND access.identity_id = ?
      AND access.job_id = ?
      AND access.status = 'active'
      AND job.status NOT IN ('cancelled', 'archived')
    LIMIT 1
  `).bind(
    workspaceId,
    identityId,
    jobId,
  ).first();

  if (!row) throw httpError("Commercial document not found.", 404);
  return row;
}

function signedPaymentAmount(row: any) {
  const absolute = Math.abs(Number(row?.amount || 0));
  return text(row?.payment_type).toLowerCase() === "refund"
    ? -absolute
    : absolute;
}

function allocateSchedule(scheduleRows: any[], paymentRows: any[]) {
  const today = new Date().toISOString().slice(0, 10);

  const schedule = scheduleRows.map((row: any) => ({
    id: text(row.id),
    scheduleType: text(row.schedule_type || "custom"),
    label: text(row.label),
    amount: Number(row.amount || 0),
    dueDate: text(row.due_date),
    displayOrder: Number(row.display_order || 0),
    paidAmount: 0,
    balanceAmount: Number(row.amount || 0),
    status: "pending",
  }));

  const byId = new Map(
    schedule.map((item) => [item.id, item])
  );

  function addTo(item: any, amount: number) {
    if (amount <= 0) return amount;
    const available = Math.max(
      0,
      item.amount - item.paidAmount,
    );
    const applied = Math.min(available, amount);
    item.paidAmount += applied;
    return amount - applied;
  }

  function removeFrom(item: any, amount: number) {
    if (amount <= 0) return amount;
    const applied = Math.min(
      Math.max(0, item.paidAmount),
      amount,
    );
    item.paidAmount -= applied;
    return amount - applied;
  }

  for (const payment of paymentRows) {
    const signed = signedPaymentAmount(payment);
    const targetId = text(payment.schedule_item_id);
    const target = targetId
      ? byId.get(targetId)
      : undefined;

    if (signed > 0) {
      let remaining = signed;

      if (target) {
        remaining = addTo(target, remaining);
      }

      for (const item of schedule) {
        if (remaining <= 0) break;
        if (target && item.id === target.id) continue;
        remaining = addTo(item, remaining);
      }
    } else if (signed < 0) {
      let remaining = Math.abs(signed);

      if (target) {
        remaining = removeFrom(target, remaining);
      }

      for (const item of [...schedule].reverse()) {
        if (remaining <= 0) break;
        if (target && item.id === target.id) continue;
        remaining = removeFrom(item, remaining);
      }
    }
  }

  for (const item of schedule) {
    item.paidAmount = Math.max(
      0,
      Math.min(item.amount, item.paidAmount),
    );
    item.balanceAmount = Math.max(
      0,
      item.amount - item.paidAmount,
    );

    if (item.balanceAmount <= 0) {
      item.status = "paid";
    } else if (
      item.dueDate
      && item.dueDate.slice(0, 10) < today
    ) {
      item.status = "overdue";
    } else if (item.paidAmount > 0) {
      item.status = "part_paid";
    } else {
      item.status = "pending";
    }
  }

  return schedule;
}

function invoiceFinancials(
  invoice: any,
  scheduleRows: any[],
  paymentRows: any[],
) {
  const totalAmount = Number(invoice?.total_amount || 0);

  const netPaid = paymentRows.reduce(
    (sum: number, row: any) =>
      sum + signedPaymentAmount(row),
    0,
  );

  const paidAmount = Math.max(0, netPaid);
  const balanceAmount = Math.max(
    0,
    totalAmount - paidAmount,
  );

  const schedule = allocateSchedule(
    scheduleRows,
    paymentRows,
  );

  const nextPayment =
    schedule.find((item: any) => item.balanceAmount > 0)
    || null;

  return {
    paidAmount,
    balanceAmount,
    schedule,
    nextPayment,
  };
}

async function invoiceChildren(
  db: D1Db,
  workspaceId: string,
  invoiceId: string,
) {
  const [items, schedule, payments] = await Promise.all([
    db.prepare(`
      SELECT
        id,
        item_type,
        name,
        description,
        quantity,
        unit_price_amount,
        line_total_amount,
        display_order,
        created_at
      FROM crm_invoice_items
      WHERE workspace_id = ?
        AND invoice_id = ?
      ORDER BY display_order, created_at, id
    `).bind(
      workspaceId,
      invoiceId,
    ).all(),

    db.prepare(`
      SELECT
        id,
        schedule_type,
        label,
        amount,
        due_date,
        display_order,
        created_at
      FROM crm_invoice_schedule_items
      WHERE workspace_id = ?
        AND invoice_id = ?
      ORDER BY display_order, due_date, created_at, id
    `).bind(
      workspaceId,
      invoiceId,
    ).all(),

    db.prepare(`
      SELECT
        id,
        schedule_item_id,
        payment_type,
        amount,
        currency,
        method,
        reference,
        notes,
        paid_at,
        created_at
      FROM crm_invoice_payments
      WHERE workspace_id = ?
        AND invoice_id = ?
      ORDER BY paid_at, created_at, id
    `).bind(
      workspaceId,
      invoiceId,
    ).all(),
  ]);

  return {
    items: items.results || [],
    schedule: schedule.results || [],
    payments: payments.results || [],
  };
}

export async function getPublicJobCommercialSummary(
  db: D1Db,
  workspaceId: string,
  identityId: string,
  jobId: string,
) {
  await authoriseJob(
    db,
    workspaceId,
    identityId,
    jobId,
  );

  const [contractsResult, invoicesResult] = await Promise.all([
    db.prepare(`
      SELECT
        contract.id,
        contract.reference,
        contract.title,
        contract.status,
        contract.current_version_id,
        contract.signed_version_id,
        contract.sent_at,
        contract.viewed_at,
        contract.signed_at,
        version.required_signatures,
        (
          SELECT COUNT(*)
          FROM crm_contract_signatures signature
          WHERE signature.workspace_id = contract.workspace_id
            AND signature.contract_id = contract.id
            AND signature.version_id = CASE
              WHEN contract.status = 'signed'
               AND contract.signed_version_id IS NOT NULL
              THEN contract.signed_version_id
              ELSE contract.current_version_id
            END
        ) AS signature_count
      FROM crm_contracts contract
      LEFT JOIN crm_contract_versions version
        ON version.workspace_id = contract.workspace_id
       AND version.contract_id = contract.id
       AND version.id = CASE
         WHEN contract.status = 'signed'
          AND contract.signed_version_id IS NOT NULL
         THEN contract.signed_version_id
         ELSE contract.current_version_id
       END
      WHERE contract.workspace_id = ?
        AND contract.job_id = ?
        AND contract.status IN ('sent', 'viewed', 'signed')
      ORDER BY
        CASE contract.status WHEN 'signed' THEN 1 ELSE 0 END,
        contract.created_at DESC,
        contract.id
    `).bind(
      workspaceId,
      jobId,
    ).all(),

    db.prepare(`
      SELECT
        id,
        reference,
        status,
        currency,
        issue_date,
        due_date,
        total_amount,
        issued_at,
        sent_at,
        paid_at,
        created_at
      FROM crm_invoices
      WHERE workspace_id = ?
        AND job_id = ?
        AND status IN ('issued', 'part_paid', 'paid')
      ORDER BY issue_date DESC, created_at DESC, id
    `).bind(
      workspaceId,
      jobId,
    ).all(),
  ]);

  const contracts = (contractsResult.results || []).map(
    (row: any) => ({
      id: text(row.id),
      reference: text(row.reference),
      title: text(row.title),
      status: text(row.status),
      versionId: text(
        row.status === "signed" && row.signed_version_id
          ? row.signed_version_id
          : row.current_version_id,
      ),
      requiredSignatures: Math.max(
        1,
        Number(row.required_signatures || 1),
      ),
      signatureCount: Number(row.signature_count || 0),
      sentAt: text(row.sent_at),
      viewedAt: text(row.viewed_at),
      signedAt: text(row.signed_at),
    }),
  );

  const invoices = [];

  for (const row of invoicesResult.results || []) {
    const children = await invoiceChildren(
      db,
      workspaceId,
      text(row.id),
    );

    const financials = invoiceFinancials(
      row,
      children.schedule,
      children.payments,
    );

    invoices.push({
      id: text(row.id),
      reference: text(row.reference),
      status: text(row.status),
      currency: text(row.currency || "GBP"),
      issueDate: text(row.issue_date),
      dueDate: text(row.due_date),
      totalAmount: Number(row.total_amount || 0),
      paidAmount: financials.paidAmount,
      balanceAmount: financials.balanceAmount,
      nextPayment: financials.nextPayment,
      issuedAt: text(row.issued_at),
      sentAt: text(row.sent_at),
      paidAt: text(row.paid_at),
    });
  }

  return {
    contracts,
    invoices,
  };
}

export async function getPublicContract(
  db: D1Db,
  request: Request,
  workspaceId: string,
  contractId: string,
) {
  const identity = await publicIdentity(
    db,
    request,
    workspaceId,
  );

  if (!identity) {
    throw httpError(
      "Sign in to view this contract.",
      401,
    );
  }

  const contract = await db.prepare(`
    SELECT
      id,
      job_id,
      reference,
      title,
      status,
      current_version_id,
      signed_version_id,
      sent_at,
      viewed_at,
      signed_at
    FROM crm_contracts
    WHERE workspace_id = ?
      AND id = ?
      AND status IN ('sent', 'viewed', 'signed')
    LIMIT 1
  `).bind(
    workspaceId,
    contractId,
  ).first();

  if (!contract) {
    throw httpError("Contract not found.", 404);
  }

  await authoriseJob(
    db,
    workspaceId,
    identity.id,
    text(contract.job_id),
  );

  const versionId = text(
    text(contract.status) === "signed"
      && contract.signed_version_id
      ? contract.signed_version_id
      : contract.current_version_id,
  );

  if (!versionId) {
    throw httpError(
      "Contract version not found.",
      404,
    );
  }

  const version = await db.prepare(`
    SELECT
      id,
      version_number,
      status,
      title,
      content_json,
      business_snapshot_json,
      client_snapshot_json,
      booking_snapshot_json,
      terms_snapshot_json,
      required_signatures,
      sent_at,
      viewed_at,
      signed_at
    FROM crm_contract_versions
    WHERE workspace_id = ?
      AND contract_id = ?
      AND id = ?
    LIMIT 1
  `).bind(
    workspaceId,
    contractId,
    versionId,
  ).first();

  if (!version) {
    throw httpError(
      "Contract version not found.",
      404,
    );
  }

  const signatures = await db.prepare(`
    SELECT
      identity_id,
      signer_name,
      signer_email,
      actor_type,
      signed_at
    FROM crm_contract_signatures
    WHERE workspace_id = ?
      AND contract_id = ?
      AND version_id = ?
    ORDER BY signed_at, created_at, id
  `).bind(
    workspaceId,
    contractId,
    versionId,
  ).all();

  return {
    id: text(contract.id),
    jobId: text(contract.job_id),
    reference: text(contract.reference),
    title: text(version.title || contract.title),
    status: text(contract.status),
    versionId,
    versionNumber: Number(version.version_number || 1),
    content: json<any>(version.content_json, []),
    business: json<Record<string, unknown>>(
      version.business_snapshot_json,
      {},
    ),
    client: json<Record<string, unknown>>(
      version.client_snapshot_json,
      {},
    ),
    booking: json<Record<string, unknown>>(
      version.booking_snapshot_json,
      {},
    ),
    terms: json<Record<string, unknown>>(
      version.terms_snapshot_json,
      {},
    ),
    requiredSignatures: Math.max(
      1,
      Number(version.required_signatures || 1),
    ),
    currentIdentitySigned:
      (signatures.results || []).some(
        (row: any) =>
          text(row.identity_id)
          === text(identity.id),
      ),
    signatures: (signatures.results || []).map(
      (row: any) => ({
        signerName: text(row.signer_name),
        signerEmail: text(row.signer_email),
        actorType: text(row.actor_type),
        signedAt: text(row.signed_at),
      }),
    ),
    sentAt: text(contract.sent_at || version.sent_at),
    viewedAt: text(contract.viewed_at || version.viewed_at),
    signedAt: text(contract.signed_at || version.signed_at),
  };
}

export async function getPublicInvoice(
  db: D1Db,
  request: Request,
  workspaceId: string,
  invoiceId: string,
) {
  const identity = await publicIdentity(
    db,
    request,
    workspaceId,
  );

  if (!identity) {
    throw httpError(
      "Sign in to view this invoice.",
      401,
    );
  }

  const invoice = await db.prepare(`
    SELECT
      id,
      job_id,
      quote_id,
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
      issued_at,
      sent_at,
      paid_at
    FROM crm_invoices
    WHERE workspace_id = ?
      AND id = ?
      AND status IN ('issued', 'part_paid', 'paid')
    LIMIT 1
  `).bind(
    workspaceId,
    invoiceId,
  ).first();

  if (!invoice) {
    throw httpError("Invoice not found.", 404);
  }

  await authoriseJob(
    db,
    workspaceId,
    identity.id,
    text(invoice.job_id),
  );

  const children = await invoiceChildren(
    db,
    workspaceId,
    invoiceId,
  );

  const financials = invoiceFinancials(
    invoice,
    children.schedule,
    children.payments,
  );

  return {
    id: text(invoice.id),
    jobId: text(invoice.job_id),
    quoteId: text(invoice.quote_id),
    reference: text(invoice.reference),
    status: text(invoice.status),
    currency: text(invoice.currency || "GBP"),
    issueDate: text(invoice.issue_date),
    dueDate: text(invoice.due_date),
    subtotalAmount: Number(invoice.subtotal_amount || 0),
    discountAmount: Number(invoice.discount_amount || 0),
    taxAmount: Number(invoice.tax_amount || 0),
    totalAmount: Number(invoice.total_amount || 0),
    paidAmount: financials.paidAmount,
    balanceAmount: financials.balanceAmount,
    business: json<Record<string, unknown>>(
      invoice.business_snapshot_json,
      {},
    ),
    client: json<Record<string, unknown>>(
      invoice.client_snapshot_json,
      {},
    ),
    booking: json<Record<string, unknown>>(
      invoice.booking_snapshot_json,
      {},
    ),
    notes: text(invoice.notes),
    terms: text(invoice.terms),
    issuedAt: text(invoice.issued_at),
    sentAt: text(invoice.sent_at),
    paidAt: text(invoice.paid_at),

    items: children.items.map((row: any) => ({
      id: text(row.id),
      itemType: text(row.item_type),
      name: text(row.name),
      description: text(row.description),
      quantity: Number(row.quantity || 0),
      unitPriceAmount: Number(row.unit_price_amount || 0),
      lineTotalAmount: Number(row.line_total_amount || 0),
      displayOrder: Number(row.display_order || 0),
    })),

    schedule: financials.schedule,

    payments: children.payments.map((row: any) => ({
      id: text(row.id),
      scheduleItemId: text(row.schedule_item_id),
      paymentType: text(row.payment_type),
      amount: signedPaymentAmount(row),
      currency: text(row.currency || invoice.currency || "GBP"),
      method: text(row.method),
      reference: text(row.reference),
      notes: text(row.notes),
      paidAt: text(row.paid_at),
    })),
  };
}


const CLIENT_CONTRACT_CONSENT_TEXT =
  "I confirm this electronic signature represents my agreement to this contract.";

export async function signPublicContract(
  db: D1Db,
  request: Request,
  workspaceId: string,
  contractIdInput: string,
  input: any,
) {
  const identity = await publicIdentity(
    db,
    request,
    workspaceId,
  );

  if (!identity) {
    throw httpError(
      "Sign in to sign this contract.",
      401,
    );
  }

  const contractId = text(
    contractIdInput,
  );

  if (!contractId) {
    throw httpError(
      "Contract not found.",
      404,
    );
  }

  const contract = await db.prepare(`
    SELECT *
    FROM crm_contracts
    WHERE id = ?
      AND workspace_id = ?
    LIMIT 1
  `).bind(
    contractId,
    workspaceId,
  ).first();

  if (!contract) {
    throw httpError(
      "Contract not found.",
      404,
    );
  }

  const contractStatus = text(
    contract.status,
  );

  if (contractStatus === "signed") {
    throw httpError(
      "This contract has already been signed.",
      409,
    );
  }

  if (contractStatus === "void") {
    throw httpError(
      "This contract is no longer available for signing.",
      409,
    );
  }

  if (
    !["sent", "viewed"].includes(
      contractStatus,
    )
  ) {
    throw httpError(
      "This contract is not ready for signing.",
      409,
    );
  }

  const versionId = text(
    contract.current_version_id,
  );

  if (!versionId) {
    throw httpError(
      "The current contract version is unavailable.",
      409,
    );
  }

  const version = await db.prepare(`
    SELECT *
    FROM crm_contract_versions
    WHERE id = ?
      AND contract_id = ?
      AND workspace_id = ?
    LIMIT 1
  `).bind(
    versionId,
    contractId,
    workspaceId,
  ).first();

  if (!version) {
    throw httpError(
      "The current contract version is unavailable.",
      409,
    );
  }

  if (
    !["sent", "viewed"].includes(
      text(version.status),
    )
  ) {
    throw httpError(
      "This contract version cannot be signed.",
      409,
    );
  }

  const access = await db.prepare(`
    SELECT
      access.contact_id,
      access.role,
      access.identity_id
    FROM crm_job_client_access access
    JOIN crm_jobs job
      ON job.id = access.job_id
     AND job.workspace_id =
       access.workspace_id
    WHERE access.workspace_id = ?
      AND access.identity_id = ?
      AND access.job_id = ?
      AND access.status = 'active'
      AND job.status NOT IN (
        'cancelled',
        'archived'
      )
    LIMIT 1
  `).bind(
    workspaceId,
    text(identity.id),
    text(contract.job_id),
  ).first();

  if (!access) {
    throw httpError(
      "Contract not found.",
      404,
    );
  }

  const requiredSignatures = Math.max(
    1,
    Number(
      version.required_signatures || 1
    ),
  );

  const primaryContactId = text(
    contract.primary_contact_id,
  );

  const accessContactId = text(
    access.contact_id,
  );

  const accessRole = text(
    access.role,
  );

  const signerEligible =
    requiredSignatures <= 1
      ? (
          !primaryContactId
          || primaryContactId
            === accessContactId
        )
      : (
          accessRole === "primary"
          || accessRole === "partner"
        );

  if (!signerEligible) {
    throw httpError(
      "Contract not found.",
      404,
    );
  }

  const signerName = text(
    input?.signerName,
  );

  const signatureText = text(
    input?.signatureText,
  );

  if (
    !signerName
    || signerName.length > 120
  ) {
    throw httpError(
      "Enter your full name using 120 characters or fewer.",
      400,
    );
  }

  if (
    !signatureText
    || signatureText.length > 240
  ) {
    throw httpError(
      "Enter your electronic signature using 240 characters or fewer.",
      400,
    );
  }

  if (input?.confirmed !== true) {
    throw httpError(
      "Confirm your agreement before signing.",
      400,
    );
  }

  const signerEmail = text(
    identity.email,
  ).toLowerCase();

  if (!signerEmail) {
    throw httpError(
      "The signed-in client identity has no email address.",
      409,
    );
  }

  const duplicate = await db.prepare(`
    SELECT id
    FROM crm_contract_signatures
    WHERE workspace_id = ?
      AND contract_id = ?
      AND version_id = ?
      AND identity_id = ?
    LIMIT 1
  `).bind(
    workspaceId,
    contractId,
    versionId,
    text(identity.id),
  ).first();

  if (duplicate) {
    throw httpError(
      "You have already signed this contract version.",
      409,
    );
  }

  const signatureId =
    `crm_contract_signature_${crypto.randomUUID()}`;

  const activityId =
    `crm_activity_${crypto.randomUUID()}`;

  const ipAddress = text(
    request.headers.get(
      "CF-Connecting-IP",
    ),
  ).slice(
    0,
    128,
  );

  const userAgent = text(
    request.headers.get(
      "user-agent",
    ),
  ).slice(
    0,
    500,
  );

  const results = await db.batch([
    db.prepare(`
      INSERT INTO crm_contract_signatures (
        id,
        workspace_id,
        contract_id,
        version_id,
        contact_id,
        identity_id,
        actor_type,
        actor_user_id,
        actor_email,
        signer_name,
        signer_email,
        signature_text,
        consent_text,
        ip_address,
        user_agent,
        audit_json,
        signed_at,
        created_at
      )
      SELECT
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        'client',
        NULL,
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
      WHERE NOT EXISTS (
        SELECT 1
        FROM crm_contract_signatures
        WHERE workspace_id = ?
          AND contract_id = ?
          AND version_id = ?
          AND identity_id = ?
      )
    `).bind(
      signatureId,
      workspaceId,
      contractId,
      versionId,
      accessContactId,
      text(identity.id),
      signerEmail,
      signerName,
      signerEmail,
      signatureText,
      CLIENT_CONTRACT_CONSENT_TEXT,
      ipAddress,
      userAgent,
      JSON.stringify({
        source: "client_portal",
        consentConfirmed: true,
        requiredSignatures,
      }),
      workspaceId,
      contractId,
      versionId,
      text(identity.id),
    ),

    db.prepare(`
      UPDATE crm_contract_versions
      SET
        status = 'signed',
        signed_at = COALESCE(
          signed_at,
          CURRENT_TIMESTAMP
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND contract_id = ?
        AND workspace_id = ?
        AND status IN (
          'sent',
          'viewed'
        )
        AND (
          SELECT COUNT(*)
          FROM crm_contract_signatures signature
          WHERE
            signature.workspace_id = ?
            AND signature.contract_id = ?
            AND signature.version_id = ?
        ) >= ?
    `).bind(
      versionId,
      contractId,
      workspaceId,
      workspaceId,
      contractId,
      versionId,
      requiredSignatures,
    ),

    db.prepare(`
      UPDATE crm_contracts
      SET
        status = 'signed',
        signed_version_id = ?,
        signed_at = COALESCE(
          signed_at,
          CURRENT_TIMESTAMP
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND workspace_id = ?
        AND current_version_id = ?
        AND status IN (
          'sent',
          'viewed'
        )
        AND (
          SELECT COUNT(*)
          FROM crm_contract_signatures signature
          WHERE
            signature.workspace_id = ?
            AND signature.contract_id = ?
            AND signature.version_id = ?
        ) >= ?
    `).bind(
      versionId,
      contractId,
      workspaceId,
      versionId,
      workspaceId,
      contractId,
      versionId,
      requiredSignatures,
    ),

    db.prepare(`
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
      SELECT
        ?,
        ?,
        'job',
        ?,
        'contract.signature_added',
        ?,
        NULL,
        ?,
        ?,
        CURRENT_TIMESTAMP
      WHERE EXISTS (
        SELECT 1
        FROM crm_contract_signatures
        WHERE id = ?
          AND workspace_id = ?
      )
    `).bind(
      activityId,
      workspaceId,
      text(contract.job_id),
      `Client signed contract ${text(
        contract.reference,
      )}.`,
      signerEmail,
      JSON.stringify({
        contractId,
        versionId,
        signatureId,
        contactId:
          accessContactId,
        identityId:
          text(identity.id),
        requiredSignatures,
      }),
      signatureId,
      workspaceId,
    ),
  ]);

  const inserted = Number(
    results?.[0]?.meta?.changes || 0,
  );

  if (inserted !== 1) {
    throw httpError(
      "You have already signed this contract version.",
      409,
    );
  }

  return getPublicContract(
    db,
    request,
    workspaceId,
    contractId,
  );
}
