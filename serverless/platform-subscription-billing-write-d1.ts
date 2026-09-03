type D1Db = any;

type SubscriptionCheckoutAttemptStatus =
  | "created"
  | "open"
  | "completed"
  | "expired"
  | "cancelled"
  | "failed";

type SubscriptionProviderEventStatus =
  | "received"
  | "processed"
  | "ignored"
  | "failed";

export type WorkspaceSubscriptionCheckoutAttempt = {
  id: string;
  workspaceId: string;
  planId: string;
  planPriceId: string;
  requestedByUserId: string | null;
  provider: "stripe";
  providerCheckoutId: string;
  idempotencyKey: string;
  status: SubscriptionCheckoutAttemptStatus;
  currency: string;
  unitAmountMinor: number;
  billingInterval: "month" | "year";
  intervalCount: number;
  expiresAt: string | null;
  completedAt: string | null;
};

export type SubscriptionProviderEventRecord = {
  id: string;
  providerEventId: string;
  eventType: string;
  status: SubscriptionProviderEventStatus;
  duplicate: boolean;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function integer(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function nullableText(value: unknown) {
  const result = text(value);
  return result || null;
}

function httpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function checkoutAttemptFromRow(row: any): WorkspaceSubscriptionCheckoutAttempt {
  return {
    id: text(row.id),
    workspaceId: text(row.workspace_id),
    planId: text(row.plan_id),
    planPriceId: text(row.plan_price_id),
    requestedByUserId: nullableText(row.requested_by_user_id),
    provider: "stripe",
    providerCheckoutId: text(row.provider_checkout_id),
    idempotencyKey: text(row.idempotency_key),
    status: (
      ["open", "completed", "expired", "cancelled", "failed"].includes(text(row.status))
        ? text(row.status)
        : "created"
    ) as SubscriptionCheckoutAttemptStatus,
    currency: text(row.currency).toUpperCase() || "GBP",
    unitAmountMinor: Math.max(0, integer(row.unit_amount_minor)),
    billingInterval: text(row.billing_interval) === "year" ? "year" : "month",
    intervalCount: Math.max(1, integer(row.interval_count, 1)),
    expiresAt: nullableText(row.expires_at),
    completedAt: nullableText(row.completed_at),
  };
}

async function loadCheckoutAttempt(
  db: D1Db,
  workspaceId: string,
  attemptId: string,
) {
  const row = await db.prepare(`
    SELECT *
    FROM workspace_subscription_checkout_attempts
    WHERE id = ?
      AND workspace_id = ?
    LIMIT 1
  `).bind(
    attemptId,
    workspaceId,
  ).first();

  if (!row) {
    throw httpError("Subscription Checkout attempt was not found.", 404);
  }

  return checkoutAttemptFromRow(row);
}

export async function createWorkspaceSubscriptionCheckoutAttempt(
  db: D1Db,
  input: {
    workspaceId: string;
    planPriceId: string;
    requestedByUserId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<WorkspaceSubscriptionCheckoutAttempt> {
  const workspaceId = text(input.workspaceId);
  const planPriceId = text(input.planPriceId);
  const requestedByUserId = text(input.requestedByUserId);

  if (!workspaceId || !planPriceId || !requestedByUserId) {
    throw httpError(
      "Workspace, plan price and requesting professional are required.",
      400,
    );
  }

  const membership = await db.prepare(`
    SELECT membership.id
    FROM business_memberships membership
    JOIN platform_users user
      ON user.id = membership.user_id
    JOIN workspaces workspace
      ON workspace.id = membership.workspace_id
    WHERE membership.workspace_id = ?
      AND membership.user_id = ?
      AND membership.status = 'active'
      AND user.status = 'active'
      AND workspace.status = 'active'
    LIMIT 1
  `).bind(
    workspaceId,
    requestedByUserId,
  ).first();

  if (!membership) {
    throw httpError(
      "The requesting professional does not have active workspace access.",
      403,
    );
  }

  const price = await db.prepare(`
    SELECT
      price.id,
      price.plan_id,
      price.billing_interval,
      price.interval_count,
      price.currency,
      price.unit_amount_minor,
      price.status AS price_status,
      plan.status AS plan_status,
      plan.plan_type
    FROM platform_plan_prices price
    JOIN platform_plans plan
      ON plan.id = price.plan_id
    WHERE price.id = ?
      AND price.status = 'active'
      AND plan.status = 'active'
      AND plan.plan_type IN (
        'commercial',
        'promotional'
      )
    LIMIT 1
  `).bind(
    planPriceId,
  ).first();

  if (!price) {
    throw httpError(
      "The selected subscription price is not available.",
      409,
    );
  }

  const existing = await db.prepare(`
    SELECT *
    FROM workspace_subscription_checkout_attempts
    WHERE workspace_id = ?
      AND plan_price_id = ?
      AND COALESCE(requested_by_user_id, '') = ?
      AND status IN (
        'created',
        'open'
      )
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(
    workspaceId,
    planPriceId,
    requestedByUserId,
  ).first();

  if (existing) {
    return checkoutAttemptFromRow(existing);
  }

  const attemptId =
    `workspace_subscription_checkout_${crypto.randomUUID()}`;

  const idempotencyKey =
    `wedplanned_subscription_${crypto.randomUUID()}`;

  const metadataJson = JSON.stringify({
    ...(input.metadata || {}),
    source: "wednav_billing",
  });

  await db.prepare(`
    INSERT INTO workspace_subscription_checkout_attempts (
      id,
      workspace_id,
      plan_id,
      plan_price_id,
      requested_by_user_id,
      provider,
      idempotency_key,
      status,
      currency,
      unit_amount_minor,
      billing_interval,
      interval_count,
      metadata_json,
      created_at,
      updated_at
    ) VALUES (
      ?,
      ?,
      ?,
      ?,
      ?,
      'stripe',
      ?,
      'created',
      ?,
      ?,
      ?,
      ?,
      ?,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `).bind(
    attemptId,
    workspaceId,
    text(price.plan_id),
    planPriceId,
    requestedByUserId,
    idempotencyKey,
    text(price.currency).toUpperCase() || "GBP",
    Math.max(0, integer(price.unit_amount_minor)),
    text(price.billing_interval) === "year" ? "year" : "month",
    Math.max(1, integer(price.interval_count, 1)),
    metadataJson,
  ).run();

  return loadCheckoutAttempt(
    db,
    workspaceId,
    attemptId,
  );
}

export async function attachWorkspaceSubscriptionCheckoutSession(
  db: D1Db,
  input: {
    workspaceId: string;
    attemptId: string;
    providerCheckoutId: string;
    expiresAt?: string | null;
  },
): Promise<WorkspaceSubscriptionCheckoutAttempt> {
  const workspaceId = text(input.workspaceId);
  const attemptId = text(input.attemptId);
  const providerCheckoutId = text(input.providerCheckoutId);

  if (!workspaceId || !attemptId || !providerCheckoutId) {
    throw httpError(
      "Workspace, Checkout attempt and provider Checkout ID are required.",
      400,
    );
  }

  const result = await db.prepare(`
    UPDATE workspace_subscription_checkout_attempts
    SET
      provider_checkout_id = ?,
      status = 'open',
      expires_at = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND workspace_id = ?
      AND provider = 'stripe'
      AND status = 'created'
  `).bind(
    providerCheckoutId,
    nullableText(input.expiresAt),
    attemptId,
    workspaceId,
  ).run();

  if (integer(result?.meta?.changes) !== 1) {
    throw httpError(
      "Subscription Checkout attempt is not available for provider binding.",
      409,
    );
  }

  return loadCheckoutAttempt(
    db,
    workspaceId,
    attemptId,
  );
}

export async function failWorkspaceSubscriptionCheckoutAttempt(
  db: D1Db,
  input: {
    workspaceId: string;
    attemptId: string;
    failureCode?: string;
    failureMessage?: string;
  },
) {
  const workspaceId = text(input.workspaceId);
  const attemptId = text(input.attemptId);

  if (!workspaceId || !attemptId) {
    throw httpError("Workspace and Checkout attempt are required.", 400);
  }

  await db.prepare(`
    UPDATE workspace_subscription_checkout_attempts
    SET
      status = 'failed',
      failure_code = ?,
      failure_message = ?,
      completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND workspace_id = ?
      AND status IN (
        'created',
        'open'
      )
  `).bind(
    lower(input.failureCode),
    text(input.failureMessage),
    attemptId,
    workspaceId,
  ).run();
}

export async function completeWorkspaceSubscriptionCheckoutAttempt(
  db: D1Db,
  input: {
    workspaceId: string;
    attemptId: string;
  },
) {
  const workspaceId = text(input.workspaceId);
  const attemptId = text(input.attemptId);

  if (!workspaceId || !attemptId) {
    throw httpError(
      "Workspace and Checkout attempt are required.",
      400,
    );
  }

  await db.prepare(`
    UPDATE workspace_subscription_checkout_attempts
    SET
      status = 'completed',
      completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
      failure_code = '',
      failure_message = '',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND workspace_id = ?
      AND provider = 'stripe'
      AND status IN (
        'created',
        'open',
        'completed'
      )
  `).bind(
    attemptId,
    workspaceId,
  ).run();
}


export async function expireWorkspaceSubscriptionCheckoutAttempt(
  db: D1Db,
  input: {
    workspaceId: string;
    attemptId: string;
  },
) {
  const workspaceId = text(input.workspaceId);
  const attemptId = text(input.attemptId);

  if (!workspaceId || !attemptId) {
    throw httpError(
      "Workspace and Checkout attempt are required.",
      400,
    );
  }

  await db.prepare(`
    UPDATE workspace_subscription_checkout_attempts
    SET
      status = CASE
        WHEN status = 'completed' THEN status
        ELSE 'expired'
      END,
      completed_at = CASE
        WHEN status = 'completed' THEN completed_at
        ELSE COALESCE(completed_at, CURRENT_TIMESTAMP)
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND workspace_id = ?
      AND provider = 'stripe'
      AND status IN (
        'created',
        'open',
        'completed',
        'expired'
      )
  `).bind(
    attemptId,
    workspaceId,
  ).run();
}


export async function reopenSubscriptionProviderEventForRetry(
  db: D1Db,
  providerEventIdInput: string,
) {
  const providerEventId = text(providerEventIdInput);

  if (!providerEventId) {
    throw httpError("Provider event ID is required.", 400);
  }

  await db.prepare(`
    UPDATE subscription_provider_events
    SET
      status = 'received',
      failure_code = '',
      failure_message = '',
      processed_at = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE provider = 'stripe'
      AND provider_event_id = ?
      AND status = 'failed'
  `).bind(
    providerEventId,
  ).run();
}


/*
 * The caller must verify the provider webhook signature before invoking this
 * helper. Gate 2D1 deliberately did not expose a webhook route; later gates
 * may call this only after exact raw-body Stripe signature verification.
 */
export async function recordVerifiedSubscriptionProviderEvent(
  db: D1Db,
  input: {
    providerEventId: string;
    eventType: string;
    livemode: boolean;
    workspaceId?: string | null;
    subscriptionId?: string | null;
    checkoutAttemptId?: string | null;
    providerAccountId?: string | null;
    providerCustomerId?: string | null;
    providerSubscriptionId?: string | null;
    providerInvoiceId?: string | null;
    payloadSha256?: string | null;
    providerCreatedAt?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<SubscriptionProviderEventRecord> {
  const providerEventId = text(input.providerEventId);
  const eventType = text(input.eventType);

  if (!providerEventId || !eventType) {
    throw httpError("Provider event ID and type are required.", 400);
  }

  const eventId =
    `subscription_provider_event_${crypto.randomUUID()}`;

  const result = await db.prepare(`
    INSERT OR IGNORE INTO subscription_provider_events (
      id,
      workspace_id,
      subscription_id,
      checkout_attempt_id,
      provider,
      provider_event_id,
      event_type,
      livemode,
      provider_account_id,
      provider_customer_id,
      provider_subscription_id,
      provider_invoice_id,
      payload_sha256,
      status,
      provider_created_at,
      metadata_json,
      created_at,
      updated_at
    ) VALUES (
      ?,
      ?,
      ?,
      ?,
      'stripe',
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      'received',
      ?,
      ?,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `).bind(
    eventId,
    nullableText(input.workspaceId),
    nullableText(input.subscriptionId),
    nullableText(input.checkoutAttemptId),
    providerEventId,
    eventType,
    input.livemode ? 1 : 0,
    nullableText(input.providerAccountId) || "",
    nullableText(input.providerCustomerId) || "",
    nullableText(input.providerSubscriptionId) || "",
    nullableText(input.providerInvoiceId) || "",
    lower(input.payloadSha256),
    nullableText(input.providerCreatedAt),
    JSON.stringify(input.metadata || {}),
  ).run();

  const row = await db.prepare(`
    SELECT id, provider_event_id, event_type, status
    FROM subscription_provider_events
    WHERE provider = 'stripe'
      AND provider_event_id = ?
    LIMIT 1
  `).bind(
    providerEventId,
  ).first();

  if (!row) {
    throw httpError("Subscription provider event could not be recorded.", 500);
  }

  return {
    id: text(row.id),
    providerEventId: text(row.provider_event_id),
    eventType: text(row.event_type),
    status: (
      ["processed", "ignored", "failed"].includes(text(row.status))
        ? text(row.status)
        : "received"
    ) as SubscriptionProviderEventStatus,
    duplicate: integer(result?.meta?.changes) !== 1,
  };
}

export async function finalizeSubscriptionProviderEvent(
  db: D1Db,
  input: {
    providerEventId: string;
    status: "processed" | "ignored" | "failed";
    workspaceId?: string | null;
    subscriptionId?: string | null;
    checkoutAttemptId?: string | null;
    failureCode?: string;
    failureMessage?: string;
  },
) {
  const providerEventId = text(input.providerEventId);

  if (!providerEventId) {
    throw httpError("Provider event ID is required.", 400);
  }

  await db.prepare(`
    UPDATE subscription_provider_events
    SET
      workspace_id = COALESCE(?, workspace_id),
      subscription_id = COALESCE(?, subscription_id),
      checkout_attempt_id = COALESCE(?, checkout_attempt_id),
      status = ?,
      failure_code = ?,
      failure_message = ?,
      processed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE provider = 'stripe'
      AND provider_event_id = ?
      AND status = 'received'
  `).bind(
    nullableText(input.workspaceId),
    nullableText(input.subscriptionId),
    nullableText(input.checkoutAttemptId),
    input.status,
    lower(input.failureCode),
    text(input.failureMessage),
    providerEventId,
  ).run();
}
