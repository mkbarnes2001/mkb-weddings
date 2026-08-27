type D1Db = D1Database;


export type PaymentsOverviewActor = {
  workspaceId: string;
  permissions?: string[];
};


type ScheduleRow = {
  id: string;
  amount?: number;
  due_date?: string | null;
  schedule_type?: string;
  label?: string;
  display_order?: number;
  created_at?: string;
};


type PaymentRow = {
  amount?: number;
  payment_type?: string;
  schedule_item_id?: string | null;
  paid_at?: string;
  created_at?: string;
};


function text(value: unknown) {
  return String(value ?? "").trim();
}


function number(
  value: unknown,
  fallback = 0,
) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? Math.round(parsed)
    : fallback;
}


function requireRead(
  actor: PaymentsOverviewActor,
) {
  if (
    !(actor.permissions || [])
      .includes("crm:read")
  ) {
    const error =
      new Error(
        "You do not have permission to view payments.",
      ) as Error & {
        statusCode?: number;
      };

    error.statusCode = 403;

    throw error;
  }
}


function dateOnly(
  value: unknown,
) {
  const raw = text(value);

  return /^\d{4}-\d{2}-\d{2}$/
    .test(raw)
      ? raw
      : "";
}


function addUtcDays(
  date: string,
  days: number,
) {
  const parsed =
    new Date(
      `${date}T12:00:00Z`,
    );

  parsed.setUTCDate(
    parsed.getUTCDate()
    + days,
  );

  return parsed
    .toISOString()
    .slice(0, 10);
}


function signedPaymentAmount(
  row: PaymentRow,
) {
  const amount =
    Math.abs(
      number(row.amount),
    );

  const kind =
    text(
      row.payment_type
      || "payment",
    ).toLowerCase();

  return (
    kind === "refund"
    || kind === "reversal"
  )
    ? -amount
    : amount;
}


export function allocateInvoiceScheduleRows(
  scheduleRowsInput: ScheduleRow[],
  paymentRowsInput: PaymentRow[],
  todayInput = "",
) {
  const today =
    dateOnly(todayInput)
    || new Date()
      .toISOString()
      .slice(0, 10);

  const dueSoonLimit =
    addUtcDays(
      today,
      30,
    );

  const scheduleRows =
    [...(scheduleRowsInput || [])]
      .sort(
        (left, right) => {
          const leftOrder =
            number(
              left.display_order,
            );

          const rightOrder =
            number(
              right.display_order,
            );

          if (
            leftOrder
            !== rightOrder
          ) {
            return (
              leftOrder
              - rightOrder
            );
          }

          const leftDue =
            dateOnly(
              left.due_date,
            );

          const rightDue =
            dateOnly(
              right.due_date,
            );

          if (
            leftDue
            !== rightDue
          ) {
            if (!leftDue) {
              return 1;
            }

            if (!rightDue) {
              return -1;
            }

            return leftDue
              .localeCompare(
                rightDue,
              );
          }

          return text(
            left.created_at,
          ).localeCompare(
            text(
              right.created_at,
            ),
          )
          || text(left.id)
            .localeCompare(
              text(right.id),
            );
        },
      );

  const allocatedBySchedule =
    new Map<string, number>();

  let unallocatedNet = 0;
  let paidNet = 0;
  let lastPaymentAt = "";

  for (
    const payment
    of paymentRowsInput || []
  ) {
    const signedAmount =
      signedPaymentAmount(
        payment,
      );

    paidNet += signedAmount;

    const scheduleItemId =
      text(
        payment
          .schedule_item_id,
      );

    if (scheduleItemId) {
      allocatedBySchedule.set(
        scheduleItemId,
        (
          allocatedBySchedule
            .get(
              scheduleItemId,
            )
          || 0
        )
        + signedAmount,
      );
    } else {
      unallocatedNet +=
        signedAmount;
    }

    const paymentAt =
      text(
        payment.paid_at
        || payment.created_at,
      );

    if (
      paymentAt
      && paymentAt
        > lastPaymentAt
    ) {
      lastPaymentAt =
        paymentAt;
    }
  }

  let automaticPool =
    Math.max(
      0,
      unallocatedNet,
    );

  const rows =
    scheduleRows.map(
      (row) => {
        const amount =
          Math.max(
            0,
            number(row.amount),
          );

        const directNet =
          allocatedBySchedule
            .get(
              text(row.id),
            )
          || 0;

        const directApplied =
          Math.min(
            amount,
            Math.max(
              0,
              directNet,
            ),
          );

        const remainingAfterDirect =
          Math.max(
            0,
            amount
            - directApplied,
          );

        const automaticApplied =
          Math.min(
            remainingAfterDirect,
            automaticPool,
          );

        automaticPool =
          Math.max(
            0,
            automaticPool
            - automaticApplied,
          );

        const paidAmount =
          Math.min(
            amount,
            directApplied
            + automaticApplied,
          );

        const outstandingAmount =
          Math.max(
            0,
            amount
            - paidAmount,
          );

        const dueDate =
          dateOnly(
            row.due_date,
          );

        let status:
          | "outstanding"
          | "overdue"
          | "due_soon"
          | "paid" =
            "outstanding";

        if (
          outstandingAmount
          <= 0
        ) {
          status = "paid";
        } else if (
          dueDate
          && dueDate < today
        ) {
          status = "overdue";
        } else if (
          dueDate
          && dueDate
            <= dueSoonLimit
        ) {
          status = "due_soon";
        }

        return {
          id:
            text(row.id),

          scheduleType:
            text(
              row.schedule_type
              || "custom",
            ),

          label:
            text(
              row.label
              || "Invoice balance",
            ),

          amount,
          paidAmount,
          outstandingAmount,
          dueDate,
          status,
        };
      },
    );

  return {
    rows,
    paidNet:
      Math.max(
        0,
        paidNet,
      ),
    unallocatedNet,
    unallocatedRemainder:
      automaticPool,
    lastPaymentAt,
  };
}


function statusRank(
  status: string,
) {
  if (status === "overdue") {
    return 0;
  }

  if (status === "due_soon") {
    return 1;
  }

  if (status === "outstanding") {
    return 2;
  }

  return 3;
}


export async function getCrmPaymentsOverview(
  db: D1Db,
  actor: PaymentsOverviewActor,
) {
  requireRead(actor);

  const [
    invoicesResult,
    scheduleResult,
    paymentsResult,
    workspaceSettings,
  ] =
    await Promise.all([
      db.prepare(`
        SELECT
          invoice.*,

          job.reference
            AS job_reference,

          job.title
            AS job_title,

          job.event_date
            AS job_event_date,

          COALESCE(
            primary_contact.display_name,
            (
              SELECT contact.display_name
              FROM crm_job_contacts job_contact
              JOIN crm_contacts contact
                ON contact.id =
                   job_contact.contact_id
               AND contact.workspace_id =
                   job_contact.workspace_id
              WHERE
                job_contact.workspace_id =
                  invoice.workspace_id
                AND job_contact.job_id =
                  invoice.job_id
              ORDER BY
                CASE job_contact.role
                  WHEN 'primary' THEN 0
                  WHEN 'billing' THEN 1
                  WHEN 'partner' THEN 2
                  ELSE 3
                END,
                job_contact.created_at
              LIMIT 1
            ),
            ''
          ) AS client_name,

          COALESCE(
            primary_contact.email,
            (
              SELECT contact.email
              FROM crm_job_contacts job_contact
              JOIN crm_contacts contact
                ON contact.id =
                   job_contact.contact_id
               AND contact.workspace_id =
                   job_contact.workspace_id
              WHERE
                job_contact.workspace_id =
                  invoice.workspace_id
                AND job_contact.job_id =
                  invoice.job_id
              ORDER BY
                CASE job_contact.role
                  WHEN 'primary' THEN 0
                  WHEN 'billing' THEN 1
                  WHEN 'partner' THEN 2
                  ELSE 3
                END,
                job_contact.created_at
              LIMIT 1
            ),
            ''
          ) AS client_email

        FROM crm_invoices invoice

        JOIN crm_jobs job
          ON job.id =
             invoice.job_id
         AND job.workspace_id =
             invoice.workspace_id

        LEFT JOIN crm_contacts
          AS primary_contact
          ON primary_contact.id =
             invoice.primary_contact_id
         AND primary_contact.workspace_id =
             invoice.workspace_id

        WHERE
          invoice.workspace_id = ?
          AND invoice.status
            NOT IN (
              'draft',
              'void'
            )

        ORDER BY
          invoice.created_at DESC,
          invoice.id DESC
      `)
        .bind(
          actor.workspaceId,
        )
        .all(),

      db.prepare(`
        SELECT schedule.*
        FROM crm_invoice_schedule_items
          AS schedule

        JOIN crm_invoices invoice
          ON invoice.id =
             schedule.invoice_id
         AND invoice.workspace_id =
             schedule.workspace_id

        WHERE
          schedule.workspace_id = ?
          AND invoice.status
            NOT IN (
              'draft',
              'void'
            )

        ORDER BY
          schedule.invoice_id,
          schedule.display_order,
          schedule.due_date,
          schedule.created_at,
          schedule.id
      `)
        .bind(
          actor.workspaceId,
        )
        .all(),

      db.prepare(`
        SELECT payment.*
        FROM crm_invoice_payments
          AS payment

        JOIN crm_invoices invoice
          ON invoice.id =
             payment.invoice_id
         AND invoice.workspace_id =
             payment.workspace_id

        WHERE
          payment.workspace_id = ?
          AND invoice.status
            NOT IN (
              'draft',
              'void'
            )

        ORDER BY
          payment.invoice_id,
          payment.created_at,
          payment.id
      `)
        .bind(
          actor.workspaceId,
        )
        .all(),

      db.prepare(`
        SELECT currency
        FROM workspace_settings
        WHERE workspace_id = ?
        LIMIT 1
      `)
        .bind(
          actor.workspaceId,
        )
        .first(),
    ]);

  const scheduleByInvoice =
    new Map<string, any[]>();

  for (
    const row
    of scheduleResult.results || []
  ) {
    const invoiceId =
      text(row.invoice_id);

    scheduleByInvoice.set(
      invoiceId,
      [
        ...(
          scheduleByInvoice
            .get(invoiceId)
          || []
        ),
        row,
      ],
    );
  }

  const paymentsByInvoice =
    new Map<string, any[]>();

  for (
    const row
    of paymentsResult.results || []
  ) {
    const invoiceId =
      text(row.invoice_id);

    paymentsByInvoice.set(
      invoiceId,
      [
        ...(
          paymentsByInvoice
            .get(invoiceId)
          || []
        ),
        row,
      ],
    );
  }

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const rows: any[] = [];

  for (
    const invoice
    of invoicesResult.results || []
  ) {
    const invoiceId =
      text(invoice.id);

    let scheduleRows =
      scheduleByInvoice
        .get(invoiceId)
      || [];

    if (!scheduleRows.length) {
      scheduleRows = [
        {
          id:
            `${invoiceId}:balance`,

          schedule_type:
            "custom",

          label:
            "Invoice balance",

          amount:
            Math.max(
              0,
              number(
                invoice.total_amount,
              ),
            ),

          due_date:
            invoice.due_date,

          display_order: 0,
          created_at:
            invoice.created_at,
        },
      ];
    }

    const allocation =
      allocateInvoiceScheduleRows(
        scheduleRows,
        paymentsByInvoice
          .get(invoiceId)
        || [],
        today,
      );

    const invoiceCurrency =
      text(
        invoice.currency
        || workspaceSettings
          ?.currency
        || "GBP",
      ).toUpperCase();

    for (
      const schedule
      of allocation.rows
    ) {
      rows.push({
        id:
          `${invoiceId}:${schedule.id}`,

        invoiceId,

        invoiceReference:
          text(
            invoice.reference,
          ),

        invoiceStatus:
          text(
            invoice.status,
          ),

        scheduleItemId:
          schedule.id
            .endsWith(":balance")
              ? ""
              : schedule.id,

        scheduleType:
          schedule.scheduleType,

        label:
          schedule.label,

        dueDate:
          schedule.dueDate,

        amount:
          schedule.amount,

        paidAmount:
          schedule.paidAmount,

        outstandingAmount:
          schedule
            .outstandingAmount,

        status:
          schedule.status,

        currency:
          invoiceCurrency,

        lastPaymentAt:
          allocation.lastPaymentAt,

        client: {
          id:
            text(
              invoice
                .primary_contact_id,
            ),

          name:
            text(
              invoice.client_name,
            ),

          email:
            text(
              invoice.client_email,
            ),
        },

        job: {
          id:
            text(invoice.job_id),

          reference:
            text(
              invoice.job_reference,
            ),

          title:
            text(
              invoice.job_title,
            ),

          eventDate:
            text(
              invoice.job_event_date,
            ),
        },
      });
    }
  }

  rows.sort(
    (left, right) =>
      statusRank(left.status)
      - statusRank(right.status)
      || (
        left.dueDate
        || "9999-12-31"
      ).localeCompare(
        right.dueDate
        || "9999-12-31",
      )
      || left.invoiceReference
        .localeCompare(
          right.invoiceReference,
        ),
  );

  const currency =
    text(
      workspaceSettings?.currency
      || rows[0]?.currency
      || "GBP",
    ).toUpperCase();

  const summary = {
    currency,

    outstandingAmount: 0,
    outstandingCount: 0,

    overdueAmount: 0,
    overdueCount: 0,

    dueSoonAmount: 0,
    dueSoonCount: 0,

    paidAmount: 0,
    paidCount: 0,
  };

  for (const row of rows) {
    summary.paidAmount +=
      Math.max(
        0,
        number(row.paidAmount),
      );

    if (
      row.status === "paid"
    ) {
      summary.paidCount += 1;
      continue;
    }

    summary.outstandingAmount +=
      Math.max(
        0,
        number(
          row.outstandingAmount,
        ),
      );

    summary.outstandingCount += 1;

    if (
      row.status === "overdue"
    ) {
      summary.overdueAmount +=
        row.outstandingAmount;

      summary.overdueCount += 1;
    }

    if (
      row.status === "due_soon"
    ) {
      summary.dueSoonAmount +=
        row.outstandingAmount;

      summary.dueSoonCount += 1;
    }
  }

  return {
    generatedAt:
      new Date().toISOString(),

    summary,
    rows,
  };
}
