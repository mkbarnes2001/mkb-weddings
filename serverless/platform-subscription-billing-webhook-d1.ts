import {
  completeWorkspaceSubscriptionCheckoutAttempt,
  expireWorkspaceSubscriptionCheckoutAttempt,
  finalizeSubscriptionProviderEvent,
  recordVerifiedSubscriptionProviderEvent,
  reopenSubscriptionProviderEventForRetry,
} from "./platform-subscription-billing-write-d1";


type D1Db = any;


export type SubscriptionBillingWebhookOptions = {
  payloadSha256: string;
  liveEnabled?: boolean;
  graceDays?: number;
};


export type SubscriptionBillingWebhookResult = {
  providerEventId: string;
  eventType: string;
  status: "processed" | "ignored";
  duplicate: boolean;
  workspaceId: string | null;
  subscriptionId: string | null;
  checkoutAttemptId: string | null;
};


type SubscriptionMapping = {
  workspaceId: string;
  planId: string;
  planPriceId: string;
  providerPriceId: string;
  providerCustomerId: string;
  checkoutAttemptId: string | null;
};


const SUPPORTED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.expired",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);


function text(value: unknown) {
  return String(value ?? "").trim();
}


function integer(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}


function bool(value: unknown) {
  return value === true || value === 1 || value === "1";
}


function nullableText(value: unknown) {
  const result = text(value);
  return result || null;
}


function httpError(message: string, statusCode: number, code?: string) {
  const error = new Error(message) as Error & {
    statusCode?: number;
    code?: string;
  };
  error.statusCode = statusCode;
  error.code = code;
  return error;
}


function isoFromUnix(value: unknown) {
  const seconds = integer(value);
  if (seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}


function unixFromIso(value: unknown) {
  const milliseconds = Date.parse(text(value));
  return Number.isFinite(milliseconds)
    ? Math.trunc(milliseconds / 1000)
    : 0;
}


function graceDays(value: unknown) {
  return Math.max(1, Math.min(30, integer(value, 7)));
}


function graceExpiry(now: Date, days: number) {
  return new Date(
    now.getTime() + days * 24 * 60 * 60 * 1000,
  ).toISOString();
}


function providerObjectId(value: any) {
  if (typeof value === "string") return text(value);
  return text(value?.id);
}


function customerIdFromObject(object: any) {
  return providerObjectId(object?.customer);
}


function subscriptionIdFromInvoice(object: any) {
  const direct = providerObjectId(object?.subscription);
  if (direct) return direct;

  return providerObjectId(
    object?.parent?.subscription_details?.subscription,
  );
}


function firstSubscriptionPriceId(object: any) {
  const items = Array.isArray(object?.items?.data)
    ? object.items.data
    : [];

  for (const item of items) {
    const priceId = providerObjectId(item?.price);
    if (priceId) return priceId;
  }

  return "";
}


function firstSubscriptionPeriod(object: any) {
  const items = Array.isArray(object?.items?.data)
    ? object.items.data
    : [];
  const first = items[0] || {};

  return {
    start:
      isoFromUnix(object?.current_period_start)
      || isoFromUnix(first?.current_period_start),
    end:
      isoFromUnix(object?.current_period_end)
      || isoFromUnix(first?.current_period_end),
  };
}


function mapStripeSubscriptionStatus(value: unknown) {
  const status = text(value);

  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due") return "past_due";
  if (status === "canceled") return "cancelled";

  // Stripe states that must never grant WedPlanned access without a
  // successful subscription lifecycle transition.
  if (
    status === "incomplete"
    || status === "incomplete_expired"
    || status === "unpaid"
    || status === "paused"
  ) {
    return "expired";
  }

  return "expired";
}


async function loadWorkspaceCustomer(
  db: D1Db,
  workspaceId: string,
  providerCustomerId: string,
) {
  const row = await db.prepare(`
    SELECT workspace_id, provider_customer_id
    FROM workspace_billing_customers
    WHERE workspace_id = ?
      AND provider = 'stripe'
      AND provider_customer_id = ?
    LIMIT 1
  `).bind(
    workspaceId,
    providerCustomerId,
  ).first();

  if (!row) {
    throw httpError(
      "Stripe subscription Customer does not belong to the WedPlanned workspace.",
      409,
      "customer_workspace_mismatch",
    );
  }

  return row;
}


async function workspaceFromCustomer(
  db: D1Db,
  providerCustomerId: string,
) {
  if (!providerCustomerId) return "";

  const row = await db.prepare(`
    SELECT workspace_id
    FROM workspace_billing_customers
    WHERE provider = 'stripe'
      AND provider_customer_id = ?
    LIMIT 1
  `).bind(
    providerCustomerId,
  ).first();

  return text(row?.workspace_id);
}


async function loadAttemptForCheckoutEvent(
  db: D1Db,
  object: any,
) {
  const objectId = text(object?.id);
  const metadata = object?.metadata || {};
  const attemptId = text(
    metadata?.checkout_attempt_id
    || object?.client_reference_id,
  );
  const workspaceId = text(metadata?.workspace_id);
  const providerCustomerId = customerIdFromObject(object);

  if (!attemptId || !workspaceId || !providerCustomerId) {
    throw httpError(
      "Stripe subscription Checkout metadata is incomplete.",
      409,
      "checkout_metadata_missing",
    );
  }

  const row = await db.prepare(`
    SELECT
      attempt.id,
      attempt.workspace_id,
      attempt.plan_id,
      attempt.plan_price_id,
      attempt.provider_checkout_id,
      attempt.status,
      price.provider_price_id
    FROM workspace_subscription_checkout_attempts attempt
    JOIN platform_plan_prices price
      ON price.id = attempt.plan_price_id
    WHERE attempt.id = ?
      AND attempt.workspace_id = ?
      AND attempt.provider = 'stripe'
    LIMIT 1
  `).bind(
    attemptId,
    workspaceId,
  ).first();

  if (!row) {
    throw httpError(
      "Stripe subscription Checkout attempt was not found for this workspace.",
      409,
      "checkout_attempt_mismatch",
    );
  }

  if (text(row.provider_checkout_id) !== objectId) {
    throw httpError(
      "Stripe subscription Checkout Session did not match the stored attempt.",
      409,
      "checkout_session_mismatch",
    );
  }

  if (
    text(metadata?.plan_id)
    && text(metadata?.plan_id) !== text(row.plan_id)
  ) {
    throw httpError(
      "Stripe subscription Checkout Plan did not match the stored attempt.",
      409,
      "checkout_plan_mismatch",
    );
  }

  if (
    text(metadata?.plan_price_id)
    && text(metadata?.plan_price_id) !== text(row.plan_price_id)
  ) {
    throw httpError(
      "Stripe subscription Checkout Price did not match the stored attempt.",
      409,
      "checkout_price_mismatch",
    );
  }

  await loadWorkspaceCustomer(
    db,
    workspaceId,
    providerCustomerId,
  );

  return {
    attemptId,
    workspaceId,
    planId: text(row.plan_id),
    planPriceId: text(row.plan_price_id),
    providerCustomerId,
  };
}


async function resolveSubscriptionMapping(
  db: D1Db,
  object: any,
): Promise<SubscriptionMapping> {
  const metadata = object?.metadata || {};
  const providerCustomerId = customerIdFromObject(object);
  const providerPriceId = firstSubscriptionPriceId(object);

  if (!providerCustomerId || !providerPriceId) {
    throw httpError(
      "Stripe subscription Customer or Price was missing.",
      409,
      "subscription_routing_missing",
    );
  }

  const metadataWorkspaceId = text(metadata?.workspace_id);
  const customerWorkspaceId = await workspaceFromCustomer(
    db,
    providerCustomerId,
  );
  const workspaceId = metadataWorkspaceId || customerWorkspaceId;

  if (!workspaceId || !customerWorkspaceId || workspaceId !== customerWorkspaceId) {
    throw httpError(
      "Stripe subscription Customer did not resolve to the expected WedPlanned workspace.",
      409,
      "subscription_workspace_mismatch",
    );
  }

  const metadataPlanPriceId = text(metadata?.plan_price_id);

  const row = await db.prepare(`
    SELECT
      price.id,
      price.plan_id,
      price.provider_price_id,
      price.billing_interval,
      price.interval_count,
      price.currency,
      price.unit_amount_minor,
      plan.status AS plan_status,
      price.status AS price_status
    FROM platform_plan_prices price
    JOIN platform_plans plan
      ON plan.id = price.plan_id
    WHERE price.provider = 'stripe'
      AND price.provider_price_id = ?
      AND (? = '' OR price.id = ?)
    LIMIT 1
  `).bind(
    providerPriceId,
    metadataPlanPriceId,
    metadataPlanPriceId,
  ).first();

  if (!row) {
    throw httpError(
      "Stripe subscription Price did not map to a WedPlanned Plan Price.",
      409,
      "subscription_price_mapping_missing",
    );
  }

  if (
    text(row.price_status) === "retired"
    || text(row.plan_status) !== "active"
  ) {
    throw httpError(
      "Stripe subscription mapped to an unavailable WedPlanned Plan.",
      409,
      "subscription_plan_unavailable",
    );
  }

  const planId = text(row.plan_id);
  const planPriceId = text(row.id);

  if (text(metadata?.plan_id) && text(metadata?.plan_id) !== planId) {
    throw httpError(
      "Stripe subscription Plan metadata did not match the mapped Price.",
      409,
      "subscription_plan_mismatch",
    );
  }

  const checkoutAttemptId = nullableText(metadata?.checkout_attempt_id);

  if (checkoutAttemptId) {
    const attempt = await db.prepare(`
      SELECT id
      FROM workspace_subscription_checkout_attempts
      WHERE id = ?
        AND workspace_id = ?
        AND plan_id = ?
        AND plan_price_id = ?
        AND provider = 'stripe'
      LIMIT 1
    `).bind(
      checkoutAttemptId,
      workspaceId,
      planId,
      planPriceId,
    ).first();

    if (!attempt) {
      throw httpError(
        "Stripe subscription Checkout attempt metadata did not match WedPlanned state.",
        409,
        "subscription_checkout_attempt_mismatch",
      );
    }
  }

  return {
    workspaceId,
    planId,
    planPriceId,
    providerPriceId,
    providerCustomerId,
    checkoutAttemptId,
  };
}


async function hasNewerProcessedProviderEvent(
  db: D1Db,
  providerSubscriptionId: string,
  providerCreatedAt: string | null,
  eventTypes: string[],
) {
  if (!providerSubscriptionId || !providerCreatedAt || !eventTypes.length) {
    return false;
  }

  const placeholders = eventTypes.map(() => "?").join(", ");
  const row = await db.prepare(`
    SELECT id
    FROM subscription_provider_events
    WHERE provider = 'stripe'
      AND provider_subscription_id = ?
      AND status = 'processed'
      AND provider_created_at IS NOT NULL
      AND datetime(provider_created_at) > datetime(?)
      AND event_type IN (${placeholders})
    LIMIT 1
  `).bind(
    providerSubscriptionId,
    providerCreatedAt,
    ...eventTypes,
  ).first();

  return Boolean(row);
}


async function upsertStripeSubscription(
  db: D1Db,
  event: any,
  object: any,
  mapping: SubscriptionMapping,
  options: SubscriptionBillingWebhookOptions,
) {
  const providerSubscriptionId = text(object?.id);

  if (!providerSubscriptionId.startsWith("sub_")) {
    throw httpError(
      "Stripe subscription event did not contain a valid Subscription ID.",
      409,
      "subscription_id_invalid",
    );
  }

  const existing = await db.prepare(`
    SELECT *
    FROM workspace_subscriptions
    WHERE provider = 'stripe'
      AND provider_subscription_id = ?
    LIMIT 1
  `).bind(
    providerSubscriptionId,
  ).first();

  const providerCreatedAt = isoFromUnix(event?.created);
  if (
    await hasNewerProcessedProviderEvent(
      db,
      providerSubscriptionId,
      providerCreatedAt,
      [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "invoice.paid",
        "invoice.payment_failed",
      ],
    )
  ) {
    return {
      ignored: true,
      reason: "stale_subscription_event",
      workspaceId: mapping.workspaceId,
      subscriptionId: nullableText(existing?.id),
      checkoutAttemptId: mapping.checkoutAttemptId,
      providerSubscriptionId,
    };
  }

  if (existing && text(existing.workspace_id) !== mapping.workspaceId) {
    throw httpError(
      "Stripe Subscription is already owned by another WedPlanned workspace.",
      409,
      "subscription_workspace_conflict",
    );
  }

  const now = new Date();
  const internalStatus = mapStripeSubscriptionStatus(object?.status);
  const period = firstSubscriptionPeriod(object);
  const trialStart = isoFromUnix(object?.trial_start);
  const trialEnd = isoFromUnix(object?.trial_end);
  const cancelAt = isoFromUnix(object?.cancel_at);
  const cancelledAt = isoFromUnix(object?.canceled_at);
  const endedAt = isoFromUnix(object?.ended_at);

  let pastDueSince = nullableText(existing?.past_due_since);
  let graceExpiresAt = nullableText(existing?.grace_expires_at);

  if (internalStatus === "past_due") {
    pastDueSince = pastDueSince || now.toISOString();
    graceExpiresAt = graceExpiresAt || graceExpiry(
      now,
      graceDays(options.graceDays),
    );
  } else if (internalStatus === "active" || internalStatus === "trialing") {
    pastDueSince = null;
    graceExpiresAt = null;
  }

  const subscriptionId = text(existing?.id)
    || `workspace_subscription_${crypto.randomUUID()}`;
  const makeCurrent = !existing || bool(existing?.is_current);

  const metadataJson = JSON.stringify({
    source: "stripe_webhook",
    livemode: Boolean(event?.livemode),
    provider_status: text(object?.status),
    provider_event_created: integer(event?.created),
  });

  const statements: any[] = [];

  if (makeCurrent) {
    statements.push(
      db.prepare(`
        UPDATE workspace_subscriptions
        SET
          is_current = 0,
          updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = ?
          AND is_current = 1
          AND id <> ?
      `).bind(
        mapping.workspaceId,
        subscriptionId,
      ),
    );
  }

  if (existing) {
    statements.push(
      db.prepare(`
        UPDATE workspace_subscriptions
        SET
          plan_id = ?,
          plan_price_id = ?,
          provider = 'stripe',
          provider_price_id = ?,
          status = ?,
          billing_interval = ?,
          current_period_start = ?,
          current_period_end = ?,
          trial_start = ?,
          trial_end = ?,
          cancel_at_period_end = ?,
          cancel_at = ?,
          cancelled_at = ?,
          ended_at = ?,
          past_due_since = ?,
          grace_expires_at = ?,
          last_provider_event_id = ?,
          last_synced_at = CURRENT_TIMESTAMP,
          is_current = ?,
          metadata_json = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND workspace_id = ?
          AND provider = 'stripe'
          AND provider_subscription_id = ?
      `).bind(
        mapping.planId,
        mapping.planPriceId,
        mapping.providerPriceId,
        internalStatus,
        text(object?.items?.data?.[0]?.price?.recurring?.interval) === "year"
          ? "year"
          : "month",
        period.start,
        period.end,
        trialStart,
        trialEnd,
        bool(object?.cancel_at_period_end) ? 1 : 0,
        cancelAt,
        cancelledAt,
        endedAt,
        pastDueSince,
        graceExpiresAt,
        text(event?.id),
        makeCurrent ? 1 : 0,
        metadataJson,
        subscriptionId,
        mapping.workspaceId,
        providerSubscriptionId,
      ),
    );
  } else {
    statements.push(
      db.prepare(`
        INSERT INTO workspace_subscriptions (
          id,
          workspace_id,
          plan_id,
          plan_price_id,
          provider,
          provider_subscription_id,
          provider_price_id,
          status,
          billing_interval,
          current_period_start,
          current_period_end,
          trial_start,
          trial_end,
          cancel_at_period_end,
          cancel_at,
          cancelled_at,
          ended_at,
          past_due_since,
          grace_expires_at,
          last_provider_event_id,
          last_synced_at,
          is_current,
          metadata_json,
          created_at,
          updated_at
        ) VALUES (
          ?, ?, ?, ?, 'stripe', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `).bind(
        subscriptionId,
        mapping.workspaceId,
        mapping.planId,
        mapping.planPriceId,
        providerSubscriptionId,
        mapping.providerPriceId,
        internalStatus,
        text(object?.items?.data?.[0]?.price?.recurring?.interval) === "year"
          ? "year"
          : "month",
        period.start,
        period.end,
        trialStart,
        trialEnd,
        bool(object?.cancel_at_period_end) ? 1 : 0,
        cancelAt,
        cancelledAt,
        endedAt,
        pastDueSince,
        graceExpiresAt,
        text(event?.id),
        makeCurrent ? 1 : 0,
        metadataJson,
      ),
    );
  }

  statements.push(
    db.prepare(`
      UPDATE workspace_billing_customers
      SET
        last_synced_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE workspace_id = ?
        AND provider = 'stripe'
        AND provider_customer_id = ?
    `).bind(
      mapping.workspaceId,
      mapping.providerCustomerId,
    ),
  );

  await db.batch(statements);

  if (mapping.checkoutAttemptId) {
    await completeWorkspaceSubscriptionCheckoutAttempt(
      db,
      {
        workspaceId: mapping.workspaceId,
        attemptId: mapping.checkoutAttemptId,
      },
    );
  }

  return {
    workspaceId: mapping.workspaceId,
    subscriptionId,
    checkoutAttemptId: mapping.checkoutAttemptId,
    providerSubscriptionId,
  };
}


async function processCheckoutEvent(
  db: D1Db,
  event: any,
) {
  const object = event?.data?.object || {};
  const mode = text(object?.mode);

  if (mode !== "subscription") {
    return {
      ignored: true,
      workspaceId: null,
      subscriptionId: null,
      checkoutAttemptId: null,
      reason: "checkout_mode_not_subscription",
    };
  }

  const attempt = await loadAttemptForCheckoutEvent(
    db,
    object,
  );

  if (text(event?.type) === "checkout.session.completed") {
    await completeWorkspaceSubscriptionCheckoutAttempt(
      db,
      {
        workspaceId: attempt.workspaceId,
        attemptId: attempt.attemptId,
      },
    );
  } else {
    await expireWorkspaceSubscriptionCheckoutAttempt(
      db,
      {
        workspaceId: attempt.workspaceId,
        attemptId: attempt.attemptId,
      },
    );
  }

  return {
    ignored: false,
    workspaceId: attempt.workspaceId,
    subscriptionId: null,
    checkoutAttemptId: attempt.attemptId,
  };
}


async function processSubscriptionEvent(
  db: D1Db,
  event: any,
  options: SubscriptionBillingWebhookOptions,
) {
  const object = event?.data?.object || {};
  const mapping = await resolveSubscriptionMapping(
    db,
    object,
  );

  const result = await upsertStripeSubscription(
    db,
    event,
    object,
    mapping,
    options,
  );

  if (!result?.ignored && result?.providerSubscriptionId) {
    await reconcilePendingInvoiceEventsForSubscription(
      db,
      mapping,
      text(result.providerSubscriptionId),
      options,
    );
  }

  return {
    ignored: Boolean(result?.ignored),
    ...result,
  };
}


async function loadExistingSubscriptionForInvoice(
  db: D1Db,
  object: any,
) {
  const providerCustomerId = customerIdFromObject(object);
  const providerSubscriptionId = subscriptionIdFromInvoice(object);

  if (!providerCustomerId || !providerSubscriptionId) {
    return null;
  }

  const row = await db.prepare(`
    SELECT
      subscription.id,
      subscription.workspace_id,
      subscription.status,
      subscription.past_due_since,
      subscription.grace_expires_at,
      customer.provider_customer_id
    FROM workspace_subscriptions subscription
    JOIN workspace_billing_customers customer
      ON customer.workspace_id = subscription.workspace_id
     AND customer.provider = 'stripe'
    WHERE subscription.provider = 'stripe'
      AND subscription.provider_subscription_id = ?
      AND customer.provider_customer_id = ?
    LIMIT 1
  `).bind(
    providerSubscriptionId,
    providerCustomerId,
  ).first();

  return row || null;
}


async function processInvoiceEvent(
  db: D1Db,
  event: any,
  options: SubscriptionBillingWebhookOptions,
) {
  const object = event?.data?.object || {};
  const providerCustomerId = customerIdFromObject(object);
  const providerSubscriptionId = subscriptionIdFromInvoice(object);

  if (!providerCustomerId || !providerSubscriptionId) {
    return {
      ignored: true,
      workspaceId: null,
      subscriptionId: null,
      checkoutAttemptId: null,
      reason: "invoice_routing_missing",
    };
  }

  const row = await loadExistingSubscriptionForInvoice(
    db,
    object,
  );

  if (!row) {
    const workspaceId = await workspaceFromCustomer(
      db,
      providerCustomerId,
    );

    if (!workspaceId) {
      return {
        ignored: true,
        workspaceId: null,
        subscriptionId: null,
        checkoutAttemptId: null,
        reason: "invoice_customer_not_resolved",
      };
    }

    // Stripe does not guarantee event delivery order. A genuine invoice can
    // arrive before customer.subscription.created even though both belong to
    // the same successful Checkout. Keep the verified event retryable rather
    // than acknowledging it as a permanent no-op. The later subscription
    // event also reconciles these pending invoice events from the ledger.
    throw httpError(
      "Stripe invoice arrived before its WedPlanned subscription state was available.",
      503,
      "invoice_subscription_pending",
    );
  }

  const workspaceId = text(row.workspace_id);
  const subscriptionId = text(row.id);
  const providerCreatedAt = isoFromUnix(event?.created);
  const now = new Date();
  const invoiceId = text(object?.id);

  if (
    await hasNewerProcessedProviderEvent(
      db,
      providerSubscriptionId,
      providerCreatedAt,
      [
        // A subscription-created event may legitimately be newer than an
        // invoice that arrived first and was deferred pending subscription
        // state. Do not make that invoice permanently stale merely because
        // the missing subscription row has now been created.
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "invoice.paid",
        "invoice.payment_failed",
      ],
    )
  ) {
    return {
      ignored: true,
      workspaceId,
      subscriptionId,
      checkoutAttemptId: null,
      reason: "stale_invoice_event",
    };
  }

  if (text(event?.type) === "invoice.paid") {
    await db.prepare(`
      UPDATE workspace_subscriptions
      SET
        status = CASE
          WHEN status IN ('cancelled', 'expired') THEN status
          ELSE 'active'
        END,
        past_due_since = CASE
          WHEN status IN ('cancelled', 'expired') THEN past_due_since
          ELSE NULL
        END,
        grace_expires_at = CASE
          WHEN status IN ('cancelled', 'expired') THEN grace_expires_at
          ELSE NULL
        END,
        last_invoice_paid_at = CURRENT_TIMESTAMP,
        last_provider_event_id = ?,
        last_synced_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND workspace_id = ?
        AND provider = 'stripe'
    `).bind(
      text(event?.id),
      subscriptionId,
      workspaceId,
    ).run();
  } else {
    const existingGrace = nullableText(row.grace_expires_at);
    const existingPastDue = nullableText(row.past_due_since);

    await db.prepare(`
      UPDATE workspace_subscriptions
      SET
        status = CASE
          WHEN status IN ('cancelled', 'expired') THEN status
          ELSE 'past_due'
        END,
        past_due_since = CASE
          WHEN status IN ('cancelled', 'expired') THEN past_due_since
          ELSE ?
        END,
        grace_expires_at = CASE
          WHEN status IN ('cancelled', 'expired') THEN grace_expires_at
          ELSE ?
        END,
        last_invoice_payment_failed_at = CURRENT_TIMESTAMP,
        last_provider_event_id = ?,
        last_synced_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND workspace_id = ?
        AND provider = 'stripe'
    `).bind(
      existingPastDue || now.toISOString(),
      existingGrace || graceExpiry(now, graceDays(options.graceDays)),
      text(event?.id),
      subscriptionId,
      workspaceId,
    ).run();
  }

  return {
    ignored: false,
    workspaceId,
    subscriptionId,
    checkoutAttemptId: null,
    providerInvoiceId: invoiceId,
  };
}


async function reconcilePendingInvoiceEventsForSubscription(
  db: D1Db,
  mapping: SubscriptionMapping,
  providerSubscriptionId: string,
  options: SubscriptionBillingWebhookOptions,
) {
  const pending = await db.prepare(`
    SELECT
      provider_event_id,
      event_type,
      provider_invoice_id,
      provider_created_at
    FROM subscription_provider_events
    WHERE provider = 'stripe'
      AND provider_customer_id = ?
      AND provider_subscription_id = ?
      AND status = 'failed'
      AND failure_code = 'invoice_subscription_pending'
      AND event_type IN ('invoice.paid', 'invoice.payment_failed')
    ORDER BY
      datetime(COALESCE(provider_created_at, created_at)) ASC,
      created_at ASC
  `).bind(
    mapping.providerCustomerId,
    providerSubscriptionId,
  ).all();

  const rows = Array.isArray(pending?.results)
    ? pending.results
    : [];

  for (const row of rows) {
    const providerEventId = text(row?.provider_event_id);
    const eventType = text(row?.event_type);

    if (!providerEventId || !eventType) continue;

    await reopenSubscriptionProviderEventForRetry(
      db,
      providerEventId,
    );

    const deferredEvent = {
      id: providerEventId,
      type: eventType,
      created: unixFromIso(row?.provider_created_at),
      data: {
        object: {
          id: text(row?.provider_invoice_id),
          object: "invoice",
          customer: mapping.providerCustomerId,
          subscription: providerSubscriptionId,
        },
      },
    };

    try {
      const result = await processInvoiceEvent(
        db,
        deferredEvent,
        options,
      );
      const status = result.ignored ? "ignored" : "processed";

      await finalizeSubscriptionProviderEvent(
        db,
        {
          providerEventId,
          status,
          workspaceId: result.workspaceId,
          subscriptionId: result.subscriptionId,
          checkoutAttemptId: result.checkoutAttemptId,
          failureCode: result.reason || "",
          failureMessage: result.reason
            ? "Deferred verified Stripe invoice event did not resolve to mutable subscription state."
            : "",
        },
      );
    } catch (error: any) {
      await finalizeSubscriptionProviderEvent(
        db,
        {
          providerEventId,
          status: "failed",
          failureCode: text(error?.code) || "subscription_invoice_reconcile_failed",
          failureMessage: text(error?.message),
        },
      ).catch(() => undefined);
    }
  }
}


export async function processVerifiedStripeSubscriptionBillingEvent(
  db: D1Db,
  event: any,
  options: SubscriptionBillingWebhookOptions,
): Promise<SubscriptionBillingWebhookResult> {
  const providerEventId = text(event?.id);
  const eventType = text(event?.type);
  const object = event?.data?.object || {};
  const livemode = Boolean(event?.livemode);
  const expectedLivemode = Boolean(options.liveEnabled);
  const providerAccountId = text(event?.account);
  const providerCustomerId = customerIdFromObject(object);
  const providerSubscriptionId = eventType.startsWith("customer.subscription.")
    ? text(object?.id)
    : subscriptionIdFromInvoice(object)
      || providerObjectId(object?.subscription);
  const providerInvoiceId = eventType.startsWith("invoice.")
    ? text(object?.id)
    : "";

  if (!providerEventId || !eventType || !object) {
    throw httpError(
      "Stripe subscription billing event is invalid.",
      400,
      "provider_event_invalid",
    );
  }

  if (livemode !== expectedLivemode) {
    throw httpError(
      "Stripe subscription billing event mode did not match the configured webhook mode.",
      409,
      "provider_event_mode_mismatch",
    );
  }

  const record = await recordVerifiedSubscriptionProviderEvent(
    db,
    {
      providerEventId,
      eventType,
      livemode,
      providerAccountId,
      providerCustomerId,
      providerSubscriptionId,
      providerInvoiceId,
      payloadSha256: text(options.payloadSha256),
      providerCreatedAt: isoFromUnix(event?.created),
      metadata: {
        object_id: text(object?.id),
        object_type: text(object?.object),
      },
    },
  );

  if (
    record.duplicate
    && (record.status === "processed" || record.status === "ignored")
  ) {
    return {
      providerEventId,
      eventType,
      status: record.status,
      duplicate: true,
      workspaceId: null,
      subscriptionId: null,
      checkoutAttemptId: null,
    };
  }

  if (record.duplicate && record.status === "failed") {
    await reopenSubscriptionProviderEventForRetry(
      db,
      providerEventId,
    );
  }

  try {
    if (providerAccountId) {
      await finalizeSubscriptionProviderEvent(
        db,
        {
          providerEventId,
          status: "ignored",
          failureCode: "connected_account_event_ignored",
          failureMessage:
            "WedPlanned subscription billing accepts platform-account Stripe events only.",
        },
      );

      return {
        providerEventId,
        eventType,
        status: "ignored",
        duplicate: record.duplicate,
        workspaceId: null,
        subscriptionId: null,
        checkoutAttemptId: null,
      };
    }

    if (!SUPPORTED_EVENTS.has(eventType)) {
      await finalizeSubscriptionProviderEvent(
        db,
        {
          providerEventId,
          status: "ignored",
          failureCode: "unsupported_event",
          failureMessage: "Verified Stripe Billing event is not handled by WedPlanned.",
        },
      );

      return {
        providerEventId,
        eventType,
        status: "ignored",
        duplicate: record.duplicate,
        workspaceId: null,
        subscriptionId: null,
        checkoutAttemptId: null,
      };
    }

    let result: any;

    if (eventType.startsWith("checkout.session.")) {
      result = await processCheckoutEvent(db, event);
    } else if (eventType.startsWith("customer.subscription.")) {
      result = await processSubscriptionEvent(db, event, options);
    } else {
      result = await processInvoiceEvent(db, event, options);
    }

    const status = result.ignored ? "ignored" : "processed";

    await finalizeSubscriptionProviderEvent(
      db,
      {
        providerEventId,
        status,
        workspaceId: result.workspaceId,
        subscriptionId: result.subscriptionId,
        checkoutAttemptId: result.checkoutAttemptId,
        failureCode: result.reason || "",
        failureMessage: result.reason
          ? "Verified Stripe Billing event did not resolve to mutable subscription state."
          : "",
      },
    );

    return {
      providerEventId,
      eventType,
      status,
      duplicate: record.duplicate,
      workspaceId: nullableText(result.workspaceId),
      subscriptionId: nullableText(result.subscriptionId),
      checkoutAttemptId: nullableText(result.checkoutAttemptId),
    };
  } catch (error: any) {
    await finalizeSubscriptionProviderEvent(
      db,
      {
        providerEventId,
        status: "failed",
        failureCode: text(error?.code) || "subscription_webhook_failed",
        failureMessage: text(error?.message),
      },
    ).catch(() => undefined);

    throw error;
  }
}
