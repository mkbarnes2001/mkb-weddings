import {
  sendProfessionalClientActionNotification,
  type ProfessionalNotificationEnv,
} from "./crm-client-action-notifications-d1";
import {
  sendCrmEmail,
  type CrmEmailDeliveryEnv,
} from "./crm-email-delivery-d1";


type D1Db = any;


export type InvoicePaymentReceiptEnv =
  CrmEmailDeliveryEnv
  & ProfessionalNotificationEnv;


export type InvoicePaymentReceiptInput = {
  workspaceId: string;
  paymentId: string;
  attemptId?: string;
};


type DeliveryState =
  | "sent"
  | "already_sent"
  | "resolved_no_send"
  | "in_progress"
  | "not_configured"
  | "review_required";


type DeliveryResult = {
  state: DeliveryState;
};


function text(value: unknown) {
  return String(value ?? "").trim();
}


function lower(value: unknown) {
  return text(value).toLowerCase();
}


function validEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    lower(value),
  );
}


function objectValue(value: unknown) {
  try {
    const parsed = JSON.parse(text(value) || "{}");

    return (
      parsed
      && typeof parsed === "object"
      && !Array.isArray(parsed)
    )
      ? parsed as Record<string, any>
      : {};
  } catch {
    return {};
  }
}


function normaliseHostname(value: unknown) {
  return lower(value)
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\/$/, "");
}


function moneyLabel(
  amountInput: unknown,
  currencyInput: unknown,
) {
  const amount = Number(amountInput || 0);
  const currency = text(currencyInput || "GBP").toUpperCase();

  try {
    return new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency,
      },
    ).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}


function dateTimeLabel(value: unknown) {
  const date = new Date(text(value));

  if (Number.isNaN(date.getTime())) {
    return text(value) || "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "long",
      timeStyle: "short",
    },
  ).format(date);
}


function receiptReference(
  row: any,
) {
  const metadata = objectValue(
    row?.payment_metadata_json,
  );

  const stored = text(
    metadata.receiptReference,
  );

  if (stored) return stored;

  const existing = text(
    row?.payment_reference,
  );

  if (/^RCT-/i.test(existing)) {
    return existing;
  }

  const invoicePart =
    text(row?.invoice_reference)
      .replace(/[^a-z0-9]+/gi, "")
      .toUpperCase()
      .slice(-14)
    || "INVOICE";

  const paymentPart =
    text(row?.payment_id)
      .replace(/^crm_invoice_payment_/i, "")
      .replace(/[^a-z0-9]+/gi, "")
      .toUpperCase()
      .slice(0, 8)
    || "PAYMENT";

  return `RCT-${invoicePart}-${paymentPart}`
    .slice(0, 80);
}


function configurationFailure(error: any) {
  const statusCode = Number(error?.statusCode || 0);
  const message = lower(error?.message);

  return (
    statusCode === 409
    || message.includes("not configured")
    || message.includes("not ready")
    || message.includes("unavailable")
    || message.includes("reconnect")
  );
}


function notificationError(
  message: string,
) {
  const error = new Error(message) as Error & {
    statusCode?: number;
  };

  error.statusCode = 502;

  return error;
}


async function paymentContext(
  db: D1Db,
  input: InvoicePaymentReceiptInput,
) {
  const workspaceId = text(input.workspaceId);
  const paymentId = text(input.paymentId);
  const attemptId = text(input.attemptId);

  if (!workspaceId || !paymentId) {
    throw notificationError(
      "Payment receipt context is incomplete.",
    );
  }

  const row = await db.prepare(`
    SELECT
      payment.id AS payment_id,
      payment.workspace_id,
      payment.invoice_id,
      payment.schedule_item_id,
      payment.payment_type,
      payment.amount,
      payment.currency,
      payment.method,
      payment.reference AS payment_reference,
      payment.paid_at,
      payment.metadata_json AS payment_metadata_json,

      invoice.job_id,
      invoice.primary_contact_id,
      invoice.reference AS invoice_reference,
      invoice.total_amount,
      invoice.client_snapshot_json,
      invoice.business_snapshot_json,

      contact.display_name AS contact_name,
      contact.email AS contact_email,

      attempt.client_email AS attempt_client_email,

      COALESCE(
        NULLIF(trim(workspace_settings.business_name), ''),
        NULLIF(trim(workspace.name), ''),
        'WedPlanned'
      ) AS workspace_business_name,

      COALESCE(
        (
          SELECT NULLIF(trim(domain.hostname), '')
          FROM workspace_domains domain
          WHERE domain.workspace_id = workspace.id
            AND domain.purpose = 'public'
            AND domain.verified = 1
          ORDER BY domain.created_at DESC
          LIMIT 1
        ),
        NULLIF(trim(workspace_settings.public_hostname), ''),
        ''
      ) AS public_hostname,

      COALESCE(
        (
          SELECT SUM(
            CASE
              WHEN ledger.payment_type = 'payment'
                THEN ledger.amount
              WHEN ledger.payment_type = 'refund'
                THEN -ledger.amount
              ELSE 0
            END
          )
          FROM crm_invoice_payments ledger
          WHERE ledger.workspace_id = payment.workspace_id
            AND ledger.invoice_id = payment.invoice_id
        ),
        0
      ) AS net_paid_amount

    FROM crm_invoice_payments payment

    JOIN crm_invoices invoice
      ON invoice.workspace_id = payment.workspace_id
     AND invoice.id = payment.invoice_id

    JOIN workspaces workspace
      ON workspace.id = payment.workspace_id
     AND workspace.status = 'active'

    LEFT JOIN workspace_settings
      ON workspace_settings.workspace_id = workspace.id

    LEFT JOIN crm_contacts contact
      ON contact.workspace_id = invoice.workspace_id
     AND contact.id = invoice.primary_contact_id

    LEFT JOIN crm_invoice_payment_attempts attempt
      ON attempt.workspace_id = payment.workspace_id
     AND attempt.id = COALESCE(
       NULLIF(?, ''),
       CASE
         WHEN json_valid(payment.metadata_json)
           THEN json_extract(
             payment.metadata_json,
             '$.attemptId'
           )
         ELSE ''
       END
     )

    WHERE payment.workspace_id = ?
      AND payment.id = ?
      AND payment.payment_type = 'payment'

    LIMIT 1
  `).bind(
    attemptId,
    workspaceId,
    paymentId,
  ).first();

  if (!row) {
    throw notificationError(
      "The recorded invoice payment could not be loaded for receipt delivery.",
    );
  }

  return row;
}


type CommunicationClaimInput = {
  id: string;
  workspaceId: string;
  contactId: string;
  jobId: string;
  direction: "outbound" | "internal";
  subject: string;
  body: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
};


export async function claimCommunication(db: D1Db, input: CommunicationClaimInput) {
  const leaseToken = crypto.randomUUID();
  const metadata: Record<string, any> = { ...input.metadata, _receiptVersion: 1, _receiptLease: leaseToken };
  const inserted = await db.prepare(`
    INSERT OR IGNORE INTO crm_communications (
      id, workspace_id, contact_id, job_id, channel, direction, subject, body,
      status, provider, provider_message_id, failure_reason, occurred_at, actor_email,
      metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'email', ?, ?, ?, 'draft', '', '', '', ?, '', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(input.id, input.workspaceId, input.contactId || null, input.jobId, input.direction,
    input.subject, input.body, input.occurredAt, JSON.stringify(metadata)).run();
  if (Number(inserted?.meta?.changes || 0) === 1) {
    return { claimed: true, state: "claimed", leaseToken, snapshot: {subject: input.subject, body: input.body, metadata} } as const;
  }
  const existing = await db.prepare(`SELECT * FROM crm_communications WHERE id = ? AND workspace_id = ? LIMIT 1`)
    .bind(input.id, input.workspaceId).first();
  if (text(existing?.status) === "sent") return { claimed: false, state: "already_sent" } as const;
  const saved = objectValue(existing?.metadata_json);
  if (saved._receiptResolution?.outcome === "do_not_resend") return { claimed: false, state: "resolved_no_send" } as const;
  const request = saved._receiptRequest;
  // Unknown older attempts and sends without provider deduplication cannot safely
  // be replayed. A failed row with a visible reason remains available for review.
  if (saved._receiptVersion !== 1 || request?.reviewRequired || (request && (
    request.transport !== "resend" || !Number.isFinite(Date.parse(request.startedAt)) ||
    Date.now() - Date.parse(request.startedAt) >= 23 * 60 * 60 * 1000
  ))) {
    // Do not disturb a current worker's lease. Its eventual completion may still
    // establish delivery; an expired/failed attempt needs human reconciliation.
    const held = await db.prepare(`UPDATE crm_communications SET status = 'failed',
      failure_reason = 'Delivery outcome needs review before another email can be sent.',
      metadata_json = json_set(metadata_json, '$._receiptReviewRequired', json('true')), updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workspace_id = ? AND status <> 'sent' AND metadata_json = ?
        AND (status = 'failed' OR datetime(updated_at) <= datetime('now', '-10 minutes'))`)
      .bind(input.id, input.workspaceId, existing.metadata_json).run();
    return { claimed: false, state: Number(held?.meta?.changes || 0) ? "review_required" : "in_progress" } as const;
  }
  const reclaimed = await db.prepare(`
    UPDATE crm_communications SET status = 'draft', failure_reason = '',
      metadata_json = json_set(metadata_json, '$._receiptLease', ?), updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workspace_id = ? AND metadata_json = ?
      AND (status = 'failed' OR (status = 'draft' AND datetime(updated_at) <= datetime('now', '-10 minutes')))
  `).bind(leaseToken, input.id, input.workspaceId, existing?.metadata_json || '{}').run();
  if (Number(reclaimed?.meta?.changes || 0) === 1) {
    return { claimed: true, state: "claimed", leaseToken,
      snapshot: { subject: existing.subject, body: existing.body, metadata: { ...saved, _receiptLease: leaseToken } as Record<string, any> } } as const;
  }
  return { claimed: false, state: "in_progress" } as const;
}

// Called immediately before transport delivery. Persist exact bytes and a hash
// of the transport credential identity; never persist an API key or password.
export function prepareReceiptRequest(db: D1Db, workspaceId: string, id: string, leaseToken: string) {
  return async (transport: string, body: string, accountIdentity: string) => {
    const row = await db.prepare(`SELECT metadata_json FROM crm_communications WHERE id = ? AND workspace_id = ?
      AND status = 'draft' AND json_extract(metadata_json, '$._receiptLease') = ?`)
      .bind(id, workspaceId, leaseToken).first();
    if (!row) throw notificationError("Receipt delivery lease changed. Retry after the current attempt completes.");
    const metadata = objectValue(row.metadata_json);
    const previous = metadata._receiptRequest;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(accountIdentity));
    const account = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    if (previous && (previous.reviewRequired || previous.transport !== "resend" || transport !== "resend" || previous.account !== account ||
      !Number.isFinite(Date.parse(previous.startedAt)) || Date.now() - Date.parse(previous.startedAt) >= 23 * 60 * 60 * 1000)) {
      await db.prepare(`UPDATE crm_communications SET failure_reason = 'Delivery transport changed or safe retry window ended; review required.',
        metadata_json = json_set(metadata_json, '$._receiptRequest.reviewRequired', json('true'), '$._receiptReviewRequired', json('true'))
        WHERE id = ? AND workspace_id = ? AND status = 'draft' AND json_extract(metadata_json, '$._receiptLease') = ?`)
        .bind(id, workspaceId, leaseToken).run();
      throw notificationError("Receipt delivery needs review before another email can be sent.");
    }
    const request = previous || { transport, account, body, startedAt: new Date().toISOString() };
    const stored = await db.prepare(`UPDATE crm_communications SET metadata_json = json_set(metadata_json, '$._receiptRequest', json(?)),
      updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND status = 'draft'
      AND json_extract(metadata_json, '$._receiptLease') = ? AND metadata_json = ?`)
      .bind(JSON.stringify(request), id, workspaceId, leaseToken, row.metadata_json).run();
    if (!Number(stored?.meta?.changes || 0)) throw notificationError("Receipt delivery lease changed before sending.");
    return request.body as string;
  };
}


export async function markCommunicationSent(
  db: D1Db,
  input: {
    id: string;
    workspaceId: string;
    leaseToken: string;
    provider: string;
    providerMessageId: string;
    metadata: Record<string, unknown>;
  },
) {
  const result = await db.prepare(`
    UPDATE crm_communications
    SET
      status = 'sent',
      provider = ?,
      provider_message_id = ?,
      failure_reason = '',
      delivered_at = CURRENT_TIMESTAMP,
      metadata_json = json_patch(metadata_json, ?),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND workspace_id = ?
      AND status = 'draft'
      AND json_extract(metadata_json, '$._receiptLease') = ?
  `).bind(
    text(input.provider),
    text(input.providerMessageId),
    JSON.stringify(input.metadata),
    input.id,
    input.workspaceId,
    input.leaseToken,
  ).run();
  if (!Number(result?.meta?.changes || 0)) throw notificationError("Receipt completion lease changed; delivery needs reconciliation.");
}


export async function markCommunicationFailed(
  db: D1Db,
  input: {
    id: string;
    workspaceId: string;
    leaseToken: string;
    provider: string;
    reason: string;
    metadata: Record<string, unknown>;
  },
) {
  const result = await db.prepare(`
    UPDATE crm_communications
    SET
      status = 'failed',
      provider = ?,
      provider_message_id = '',
      failure_reason = ?,
      metadata_json = json_patch(metadata_json, ?),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND workspace_id = ?
      AND status = 'draft'
      AND json_extract(metadata_json, '$._receiptLease') = ?
  `).bind(
    text(input.provider),
    text(input.reason).slice(0, 1000),
    JSON.stringify(input.metadata),
    input.id,
    input.workspaceId,
    input.leaseToken,
  ).run();
  if (!Number(result?.meta?.changes || 0)) throw notificationError("Receipt failure lease changed; delivery needs reconciliation.");
}


async function deliverClientReceipt(
  db: D1Db,
  env: InvoicePaymentReceiptEnv,
  context: any,
  details: {
    receiptReference: string;
    businessName: string;
    clientName: string;
    clientEmail: string;
    invoiceReference: string;
    amount: number;
    currency: string;
    totalPaidAmount: number;
    balanceAmount: number;
    paidAt: string;
    portalUrl: string;
  },
): Promise<DeliveryResult> {
  const communicationId =
    `crm_communication_payment_receipt_${text(context.payment_id)}`;

  let subject =
    `${details.businessName}: Payment receipt ${details.receiptReference}`
      .slice(0, 240);

  let body =
    `Payment receipt\n\n`
    + `Hi ${details.clientName || "there"},\n\n`
    + `We have received your payment.\n\n`
    + `Receipt reference: ${details.receiptReference}\n`
    + `Invoice: ${details.invoiceReference}\n`
    + `Payment date: ${dateTimeLabel(details.paidAt)}\n`
    + `Payment method: Card payment\n`
    + `Amount received: ${moneyLabel(details.amount, details.currency)}\n`
    + `Total paid to date: ${moneyLabel(details.totalPaidAmount, details.currency)}\n`
    + `Remaining balance: ${moneyLabel(details.balanceAmount, details.currency)}\n`
    + (
      details.portalUrl
        ? `\nView your invoice and receipt in the Client Portal:\n${details.portalUrl}\n`
        : ""
    )
    + `\nThank you,\n${details.businessName}`;

  let metadata: Record<string, any> = {
    receiptDetails: details,
    automated: true,
    kind: "invoice_payment_receipt",
    paymentId: text(context.payment_id),
    invoiceId: text(context.invoice_id),
    invoiceReference: details.invoiceReference,
    receiptReference: details.receiptReference,
    amount: details.amount,
    currency: details.currency,
    balanceAmount: details.balanceAmount,
    recipient: details.clientEmail,
  };

  const claim = await claimCommunication(
    db,
    {
      id: communicationId,
      workspaceId: text(context.workspace_id),
      contactId: text(context.primary_contact_id),
      jobId: text(context.job_id),
      direction: "outbound",
      subject,
      body,
      occurredAt: details.paidAt,
      metadata,
    },
  );

  if (!claim.claimed) {
    return {
      state: claim.state,
    } as DeliveryResult;
  }
  subject = claim.snapshot.subject;
  body = claim.snapshot.body;
  metadata = { ...claim.snapshot.metadata };
  delete metadata._receiptRequest;
  details = metadata.receiptDetails;

  if (!validEmail(details.clientEmail)) {
    await markCommunicationFailed(
      db,
      {
        id: communicationId,
        workspaceId: text(context.workspace_id),
        leaseToken: claim.leaseToken,
        provider: "",
        reason: "Client email is not configured.",
        metadata: {
          ...metadata,
          deliveryState: "not_configured",
        },
      },
    );

    return {
      state: "not_configured",
    };
  }

  try {
    const delivery = await sendCrmEmail(
      db,
      env,
      {
        workspaceId: text(context.workspace_id),
        accessMode: "system",
        permissions: [
          "crm:read",
          "crm:manage",
        ],
        businessName: details.businessName,
      },
      {
        idempotencyKey: communicationId,
        prepareRequest: prepareReceiptRequest(db, text(context.workspace_id), communicationId, claim.leaseToken),
        to: details.clientEmail,
        subject,
        body,
        businessName: details.businessName,
      },
    );

    await markCommunicationSent(
      db,
      {
        id: communicationId,
        workspaceId: text(context.workspace_id),
        leaseToken: claim.leaseToken,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId,
        metadata: {
          ...metadata,
          deliveryMode: delivery.deliveryMode,
          deliveryState: "sent",
        },
      },
    );

    return {
      state: "sent",
    };
  } catch (error: any) {
    const notConfigured = configurationFailure(error);

    await markCommunicationFailed(
      db,
      {
        id: communicationId,
        workspaceId: text(context.workspace_id),
        leaseToken: claim.leaseToken,
        provider: "",
        reason: text(error?.message),
        metadata: {
          ...metadata,
          deliveryState: notConfigured
            ? "not_configured"
            : "failed",
        },
      },
    );

    if (notConfigured && claim.snapshot.metadata._receiptRequest) {
      throw notificationError("Previously attempted receipt delivery is now unconfigured; review or restore its original transport.");
    }
    if (notConfigured) {
      return {
        state: "not_configured",
      };
    }

    throw error;
  }
}


async function deliverProfessionalNotification(
  db: D1Db,
  env: InvoicePaymentReceiptEnv,
  context: any,
  details: {
    receiptReference: string;
    clientName: string;
    clientEmail: string;
    invoiceReference: string;
    amount: number;
    currency: string;
    balanceAmount: number;
    paidAt: string;
  },
): Promise<DeliveryResult> {
  const communicationId =
    `crm_communication_payment_notification_${text(context.payment_id)}`;

  let subject =
    `Payment received · ${details.invoiceReference}`;

  let body =
    `${details.clientName || "A client"} paid ${moneyLabel(details.amount, details.currency)} against invoice ${details.invoiceReference}.\n`
    + `Receipt ${details.receiptReference}. Remaining balance ${moneyLabel(details.balanceAmount, details.currency)}.`;

  let metadata: Record<string, any> = {
    receiptDetails: details,
    automated: true,
    kind: "professional_payment_received",
    paymentId: text(context.payment_id),
    invoiceId: text(context.invoice_id),
    invoiceReference: details.invoiceReference,
    receiptReference: details.receiptReference,
    amount: details.amount,
    currency: details.currency,
    balanceAmount: details.balanceAmount,
  };

  const claim = await claimCommunication(
    db,
    {
      id: communicationId,
      workspaceId: text(context.workspace_id),
      contactId: text(context.primary_contact_id),
      jobId: text(context.job_id),
      direction: "internal",
      subject,
      body,
      occurredAt: details.paidAt,
      metadata,
    },
  );

  if (!claim.claimed) {
    return {
      state: claim.state,
    } as DeliveryResult;
  }
  subject = claim.snapshot.subject;
  body = claim.snapshot.body;
  metadata = { ...claim.snapshot.metadata };
  delete metadata._receiptRequest;
  details = metadata.receiptDetails;

  try {
    const delivery =
      await sendProfessionalClientActionNotification(
        db,
        env,
        {
          workspaceId: text(context.workspace_id),
          jobId: text(context.job_id),
          action: "payment_received",
          idempotencyKey: communicationId,
          prepareRequest: prepareReceiptRequest(db, text(context.workspace_id), communicationId, claim.leaseToken),
          documentTitle: details.invoiceReference,
          clientName: details.clientName,
          clientEmail: details.clientEmail,
          invoiceReference: details.invoiceReference,
          receiptReference: details.receiptReference,
          amount: details.amount,
          currency: details.currency,
          balanceAmount: details.balanceAmount,
          paidAt: details.paidAt,
        },
      );

    if (!delivery.sent) {
      if (claim.snapshot.metadata._receiptRequest) throw notificationError("Previously attempted notification delivery is now unconfigured; review or restore its original transport.");
      await markCommunicationFailed(
        db,
        {
          id: communicationId,
          workspaceId: text(context.workspace_id),
          leaseToken: claim.leaseToken,
          provider: "",
          reason: text(delivery.reason || "not_configured"),
          metadata: {
            ...metadata,
            deliveryState: "not_configured",
          },
        },
      );

      return {
        state: "not_configured",
      };
    }

    await markCommunicationSent(
      db,
      {
        id: communicationId,
        workspaceId: text(context.workspace_id),
        leaseToken: claim.leaseToken,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId,
        metadata: {
          ...metadata,
          deliveryState: "sent",
        },
      },
    );

    return {
      state: "sent",
    };
  } catch (error: any) {
    await markCommunicationFailed(
      db,
      {
        id: communicationId,
        workspaceId: text(context.workspace_id),
        leaseToken: claim.leaseToken,
        provider: "resend",
        reason: text(error?.message),
        metadata: {
          ...metadata,
          deliveryState: "failed",
        },
      },
    );

    throw error;
  }
}


export async function deliverInvoicePaymentReceiptNotifications(
  db: D1Db,
  env: InvoicePaymentReceiptEnv,
  input: InvoicePaymentReceiptInput,
) {
  const context = await paymentContext(
    db,
    input,
  );

  const clientSnapshot = objectValue(
    context.client_snapshot_json,
  );

  const businessSnapshot = objectValue(
    context.business_snapshot_json,
  );

  const businessName = text(
    businessSnapshot.businessName
    || businessSnapshot.publicName
    || context.workspace_business_name
    || "WedPlanned",
  );

  const clientName = text(
    context.contact_name
    || clientSnapshot.displayName
    || clientSnapshot.firstName
    || "Client",
  );

  const clientEmail = lower(
    context.attempt_client_email
    || context.contact_email
    || clientSnapshot.email,
  );

  const amount = Number(
    context.amount || 0,
  );

  const currency = text(
    context.currency || "GBP",
  ).toUpperCase();

  const totalPaidAmount = Math.max(
    0,
    Number(context.net_paid_amount || 0),
  );

  const balanceAmount = Math.max(
    0,
    Number(context.total_amount || 0)
      - totalPaidAmount,
  );

  const paidAt = text(context.paid_at);
  const invoiceReference = text(
    context.invoice_reference,
  );

  const resolvedReceiptReference =
    receiptReference(context);

  const publicHostname = normaliseHostname(
    context.public_hostname,
  );

  const portalUrl = publicHostname
    ? `https://${publicHostname}/client-portal?workspace=${encodeURIComponent(
        text(context.workspace_id),
      )}`
    : "";

  let client: DeliveryResult = {
    state: "in_progress",
  };

  let professional: DeliveryResult = {
    state: "in_progress",
  };

  const retryableErrors: string[] = [];

  try {
    client = await deliverClientReceipt(
      db,
      env,
      context,
      {
        receiptReference: resolvedReceiptReference,
        businessName,
        clientName,
        clientEmail,
        invoiceReference,
        amount,
        currency,
        totalPaidAmount,
        balanceAmount,
        paidAt,
        portalUrl,
      },
    );
  } catch (error: any) {
    retryableErrors.push(
      `client receipt: ${text(error?.message)}`,
    );
  }

  try {
    professional = await deliverProfessionalNotification(
      db,
      env,
      context,
      {
        receiptReference: resolvedReceiptReference,
        clientName,
        clientEmail,
        invoiceReference,
        amount,
        currency,
        balanceAmount,
        paidAt,
      },
    );
  } catch (error: any) {
    retryableErrors.push(
      `professional notification: ${text(error?.message)}`,
    );
  }

  // A live or abandoned claim is unfinished work. Keep the webhook retryable
  // until it is sent, fails, or its lease expires and a retry can reclaim it.
  if ([client.state, professional.state].includes("review_required")) {
    retryableErrors.push("notification delivery requires review; automatic resend is blocked");
  }
  if (client.state === "in_progress" || professional.state === "in_progress") {
    retryableErrors.push("notification delivery is still in progress");
  }
  if (retryableErrors.length) {
    throw notificationError(
      `Payment was recorded, but notification delivery will retry: ${retryableErrors.join("; ")}`,
    );
  }

  return {
    receiptReference: resolvedReceiptReference,
    client: client.state,
    professional: professional.state,
  };
}


export async function resolveReceiptReview(db: D1Db, actor: {workspaceId: string; userId?: string; email?: string; permissions?: string[]; accessMode?: string},
  jobId: string, communicationId: string, input: any) {
  const fail = (message: string, statusCode: number) => Object.assign(new Error(message), {statusCode});
  if (!(actor.permissions || []).includes("crm:manage") || !actor.userId || actor.accessMode === "support") throw fail("You cannot resolve receipt reviews in this session.", 403);
  const outcome = text(input?.outcome), reason = text(input?.reason);
  if (!["confirmed_delivered", "do_not_resend"].includes(outcome) || !reason || reason.length > 2000) {
    throw fail("Choose an outcome and record your delivery evidence or reason (up to 2,000 characters).", 400);
  }
  const row = await db.prepare(`SELECT * FROM crm_communications WHERE id = ? AND workspace_id = ? AND job_id = ?`)
    .bind(communicationId, actor.workspaceId, jobId).first();
  if (!row) throw fail("Receipt communication not found.", 404);
  const metadata = objectValue(row.metadata_json);
  if (row.status !== "failed" || !metadata._receiptReviewRequired || metadata._receiptResolution ||
      !["invoice_payment_receipt", "professional_payment_received"].includes(metadata.kind)) {
    throw fail("This receipt is not awaiting review. Reload the Job.", 409);
  }
  const resolution = { outcome, reason, userId: actor.userId, email: text(actor.email), resolvedAt: new Date().toISOString() };
  const guard = db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM crm_communications
    WHERE id = ? AND workspace_id = ? AND job_id = ? AND status = 'failed' AND metadata_json = ?)
    THEN 1 ELSE json('receipt_review_conflict') END`).bind(communicationId, actor.workspaceId, jobId, row.metadata_json);
  try {
    await db.batch([
      guard,
      db.prepare(`UPDATE crm_communications SET status = ?, failure_reason = '',
        metadata_json = json_set(metadata_json, '$._receiptResolution', json(?), '$._receiptReviewRequired', json('false')),
        updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND job_id = ?`)
        .bind(outcome === "confirmed_delivered" ? "sent" : "logged", JSON.stringify(resolution), communicationId, actor.workspaceId, jobId),
      db.prepare(`INSERT INTO crm_activities(id, workspace_id, entity_type, entity_id, event_type, summary, actor_user_id, actor_email, metadata_json, created_at)
        VALUES (?, ?, 'job', ?, 'receipt.review_resolved', ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
        .bind(`crm_activity_${crypto.randomUUID()}`, actor.workspaceId, jobId,
          `Receipt review: ${outcome === "confirmed_delivered" ? "confirmed delivered" : "do not resend"}. ${reason}`,
          actor.userId, text(actor.email), JSON.stringify({communicationId, ...resolution, previousStatus: row.status, previousFailureReason: row.failure_reason})),
    ]);
  } catch (error) {
    const current = await db.prepare(`SELECT status, metadata_json FROM crm_communications WHERE id = ? AND workspace_id = ?`).bind(communicationId, actor.workspaceId).first();
    if (!current || current.status !== row.status || current.metadata_json !== row.metadata_json) throw fail("Receipt review changed while saving. Reload before retrying.", 409);
    throw error;
  }
  return {ok: true, outcome};
}
