type D1Db = any;

export type CrmCommercialActor = {
  workspaceId: string;
  userId?: string;
  email?: string;
  permissions?: string[];
  accessMode?: string;
};


function text(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}


function lower(
  value: unknown,
) {
  return text(
    value,
  ).toLowerCase();
}


function httpError(
  message: string,
  statusCode = 400,
) {
  const error = new Error(
    message,
  ) as Error & {
    statusCode?: number;
  };

  error.statusCode =
    statusCode;

  return error;
}


function requireCommercialManage(
  actor: CrmCommercialActor,
) {
  if (
    !text(
      actor?.workspaceId,
    )
  ) {
    throw httpError(
      "An active business workspace is required.",
      403,
    );
  }

  if (
    !Array.isArray(
      actor?.permissions,
    )
    || !actor.permissions.includes(
      "crm:manage",
    )
  ) {
    throw httpError(
      "CRM management permission is required.",
      403,
    );
  }

  if (
    text(
      actor?.accessMode,
    ) === "support"
  ) {
    throw httpError(
      "Support sessions cannot record invoice payments.",
      403,
    );
  }
}


function normalisePaidAt(
  value: unknown,
) {
  const incoming = text(
    value,
  );

  if (!incoming) {
    return new Date()
      .toISOString();
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      incoming,
    )
  ) {
    const parsed = new Date(
      `${incoming}T12:00:00.000Z`,
    );

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      throw httpError(
        "Choose a valid payment date.",
        400,
      );
    }

    return parsed.toISOString();
  }

  const parsed = new Date(
    incoming,
  );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw httpError(
      "Choose a valid payment date.",
      400,
    );
  }

  return parsed.toISOString();
}


async function invoiceNetPaid(
  db: D1Db,
  workspaceId: string,
  invoiceId: string,
) {
  const row =
    await db.prepare(`
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN payment_type = 'payment'
                THEN amount
              WHEN payment_type = 'refund'
                THEN -amount
              ELSE 0
            END
          ),
          0
        ) AS net_paid
      FROM crm_invoice_payments
      WHERE workspace_id = ?
        AND invoice_id = ?
    `).bind(
      workspaceId,
      invoiceId,
    ).first();

  return Math.max(
    0,
    Number(
      row?.net_paid || 0,
    ),
  );
}


export async function recordManualInvoicePayment(
  db: D1Db,
  actor: CrmCommercialActor,
  jobIdInput: string,
  invoiceIdInput: string,
  input: any,
) {
  requireCommercialManage(
    actor,
  );

  const workspaceId = text(
    actor.workspaceId,
  );

  const jobId = text(
    jobIdInput,
  );

  const invoiceId = text(
    invoiceIdInput,
  );

  if (
    !jobId
    || !invoiceId
  ) {
    throw httpError(
      "Invoice not found.",
      404,
    );
  }

  const invoice =
    await db.prepare(`
      SELECT *
      FROM crm_invoices
      WHERE id = ?
        AND job_id = ?
        AND workspace_id = ?
      LIMIT 1
    `).bind(
      invoiceId,
      jobId,
      workspaceId,
    ).first();

  if (!invoice) {
    throw httpError(
      "Invoice not found.",
      404,
    );
  }

  const invoiceStatus = text(
    invoice.status,
  );

  if (
    ![
      "issued",
      "part_paid",
      "paid",
    ].includes(
      invoiceStatus,
    )
  ) {
    throw httpError(
      invoiceStatus === "void"
        ? "A void invoice cannot receive payments."
        : "Issue the invoice before recording payment.",
      409,
    );
  }

  const paymentType = text(
    input?.paymentType,
  );

  if (
    ![
      "payment",
      "refund",
    ].includes(
      paymentType,
    )
  ) {
    throw httpError(
      "Choose payment or refund.",
      400,
    );
  }

  const amount = Number(
    input?.amount,
  );

  if (
    !Number.isSafeInteger(
      amount,
    )
    || amount <= 0
  ) {
    throw httpError(
      "Payment amount must be a positive value in minor currency units.",
      400,
    );
  }

  const method = text(
    input?.method,
  );

  const offlineMethods =
    new Set([
      "manual",
      "bank_transfer",
      "cash",
      "card",
      "other",
    ]);

  if (
    method === "stripe"
    || !offlineMethods.has(
      method,
    )
  ) {
    throw httpError(
      "Choose a supported offline payment method.",
      400,
    );
  }

  const currentNetPaid =
    await invoiceNetPaid(
      db,
      workspaceId,
      invoiceId,
    );

  const invoiceTotal =
    Math.max(
      0,
      Number(
        invoice.total_amount || 0,
      ),
    );

  const currentBalance =
    Math.max(
      0,
      invoiceTotal
        - currentNetPaid,
    );

  if (
    paymentType === "payment"
    && amount > currentBalance
  ) {
    throw httpError(
      "Payment exceeds the outstanding invoice balance.",
      409,
    );
  }

  if (
    paymentType === "refund"
    && amount > currentNetPaid
  ) {
    throw httpError(
      "Refund exceeds the net amount already paid on this invoice.",
      409,
    );
  }

  const paidAt =
    normalisePaidAt(
      input?.paidAt,
    );

  const reference = text(
    input?.reference,
  ).slice(
    0,
    160,
  );

  const notes = text(
    input?.notes,
  ).slice(
    0,
    1000,
  );

  const currency = (
    text(
      invoice.currency,
    )
    || "GBP"
  ).toUpperCase();

  const paymentId =
    `crm_invoice_payment_${crypto.randomUUID()}`;

  const activityId =
    `crm_activity_${crypto.randomUUID()}`;

  const summary =
    paymentType === "refund"
      ? `Recorded refund against invoice ${text(
          invoice.reference,
        )}.`
      : `Recorded manual payment against invoice ${text(
          invoice.reference,
        )}.`;

  const netExpression = `
    COALESCE(
      (
        SELECT
          SUM(
            CASE
              WHEN payment_type = 'payment'
                THEN amount
              WHEN payment_type = 'refund'
                THEN -amount
              ELSE 0
            END
          )
        FROM crm_invoice_payments
        WHERE workspace_id = ?
          AND invoice_id = ?
      ),
      0
    )
  `;

  const insertPayment =
    db.prepare(`
      INSERT INTO crm_invoice_payments (
        id,
        workspace_id,
        invoice_id,
        schedule_item_id,
        payment_type,
        amount,
        currency,
        method,
        reference,
        provider,
        provider_payment_id,
        notes,
        recorded_by_user_id,
        recorded_by_email,
        paid_at,
        created_at,
        metadata_json
      )
      SELECT
        ?,
        invoice.workspace_id,
        invoice.id,
        NULL,
        ?,
        ?,
        invoice.currency,
        ?,
        ?,
        '',
        '',
        ?,
        ?,
        ?,
        ?,
        CURRENT_TIMESTAMP,
        ?
      FROM crm_invoices invoice
      WHERE invoice.id = ?
        AND invoice.job_id = ?
        AND invoice.workspace_id = ?
        AND invoice.status IN (
          'issued',
          'part_paid',
          'paid'
        )
        AND (
          (
            ? = 'payment'
            AND ? <= MAX(
              0,
              invoice.total_amount
                - ${netExpression}
            )
          )
          OR
          (
            ? = 'refund'
            AND ? <= MAX(
              0,
              ${netExpression}
            )
          )
        )
    `).bind(
      paymentId,
      paymentType,
      amount,
      method,
      reference,
      notes,
      text(actor.userId) || null,
      lower(actor.email),
      paidAt,
      JSON.stringify({
        source:
          "admin_manual",
        jobId,
        allocationMode:
          "automatic_fifo",
      }),

      invoiceId,
      jobId,
      workspaceId,

      paymentType,
      amount,
      workspaceId,
      invoiceId,

      paymentType,
      amount,
      workspaceId,
      invoiceId,
    );

  const updateInvoice =
    db.prepare(`
      UPDATE crm_invoices
      SET
        status = CASE
          WHEN
            total_amount > 0
            AND ${netExpression}
              >= total_amount
            THEN 'paid'

          WHEN
            ${netExpression} > 0
            THEN 'part_paid'

          ELSE 'issued'
        END,

        paid_at = CASE
          WHEN
            total_amount > 0
            AND ${netExpression}
              >= total_amount
            THEN COALESCE(
              paid_at,
              ?
            )
          ELSE NULL
        END,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
        AND job_id = ?
        AND workspace_id = ?
        AND status IN (
          'issued',
          'part_paid',
          'paid'
        )
    `).bind(
      workspaceId,
      invoiceId,

      workspaceId,
      invoiceId,

      workspaceId,
      invoiceId,

      paidAt,

      invoiceId,
      jobId,
      workspaceId,
    );

  const recordActivity =
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
        ?,
        ?,
        ?,
        ?,
        ?,
        CURRENT_TIMESTAMP
      WHERE EXISTS (
        SELECT 1
        FROM crm_invoice_payments
        WHERE id = ?
          AND workspace_id = ?
      )
    `).bind(
      activityId,
      workspaceId,
      jobId,

      paymentType === "refund"
        ? "invoice.refund_recorded"
        : "invoice.payment_recorded",

      summary,

      text(actor.userId) || null,
      lower(actor.email),

      JSON.stringify({
        invoiceId,
        invoiceReference:
          text(
            invoice.reference,
          ),
        paymentId,
        paymentType,
        amount,
        currency,
        method,
        reference,
        allocationMode:
          "automatic_fifo",
      }),

      paymentId,
      workspaceId,
    );

  const results =
    await db.batch([
      insertPayment,
      updateInvoice,
      recordActivity,
    ]);

  const inserted = Number(
    results?.[0]?.meta?.changes
    || 0,
  );

  if (inserted !== 1) {
    throw httpError(
      paymentType === "refund"
        ? "Invoice payment history changed before this refund could be recorded. Refresh and try again."
        : "Invoice balance changed before this payment could be recorded. Refresh and try again.",
      409,
    );
  }

  const refreshedInvoice =
    await db.prepare(`
      SELECT
        id,
        reference,
        status,
        total_amount,
        currency,
        paid_at
      FROM crm_invoices
      WHERE id = ?
        AND job_id = ?
        AND workspace_id = ?
      LIMIT 1
    `).bind(
      invoiceId,
      jobId,
      workspaceId,
    ).first();

  const netPaidAfter =
    await invoiceNetPaid(
      db,
      workspaceId,
      invoiceId,
    );

  return {
    id: paymentId,
    invoiceId,
    scheduleItemId: "",
    paymentType,
    amount,
    currency,
    method,
    reference,
    notes,
    paidAt,
    netPaidBefore:
      currentNetPaid,
    netPaidAfter,
    balanceAfter:
      Math.max(
        0,
        Number(
          refreshedInvoice?.total_amount
          || invoiceTotal,
        )
          - netPaidAfter,
      ),
    invoiceStatusAfter:
      text(
        refreshedInvoice?.status,
      ),
  };
}
