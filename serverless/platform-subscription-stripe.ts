import {
  attachWorkspaceSubscriptionCheckoutSession,
  createWorkspaceSubscriptionCheckoutAttempt,
  failWorkspaceSubscriptionCheckoutAttempt,
} from "./platform-subscription-billing-write-d1";


type D1Db = any;


export type SubscriptionStripeEnv = {
  WEDPLANNED_BILLING_STRIPE_SECRET_KEY?: string;
  WEDPLANNED_BILLING_STRIPE_API_BASE?: string;
  WEDPLANNED_BILLING_STRIPE_CHECKOUT_ENABLED?: string;
  WEDPLANNED_BILLING_STRIPE_PORTAL_ENABLED?: string;
  WEDPLANNED_BILLING_STRIPE_LIVE_ENABLED?: string;
  WEDPLANNED_ADMIN_ORIGIN?: string;
};


export type SubscriptionCheckoutActor = {
  workspaceId: string;
  userId: string;
  email?: string;
  accessMode?: string;
  permissions?: string[];
};


export type WorkspaceSubscriptionCheckoutResult = {
  attemptId: string;
  url: string;
  expiresAt: string | null;
};


export type WorkspaceSubscriptionPortalResult = {
  url: string;
};


function text(value: unknown) {
  return String(value ?? "").trim();
}


function lower(value: unknown) {
  return text(value).toLowerCase();
}


function truthy(value: unknown) {
  return ["1", "true", "yes", "on"].includes(lower(value));
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


function stripeApiBase(env: SubscriptionStripeEnv) {
  return text(
    env.WEDPLANNED_BILLING_STRIPE_API_BASE
    || "https://api.stripe.com",
  ).replace(/\/+$/, "");
}


type SubscriptionStripeCapability = "checkout" | "portal";


function stripeSecretKey(
  env: SubscriptionStripeEnv,
  capability: SubscriptionStripeCapability = "checkout",
) {
  const enabled = capability === "portal"
    ? env.WEDPLANNED_BILLING_STRIPE_PORTAL_ENABLED
    : env.WEDPLANNED_BILLING_STRIPE_CHECKOUT_ENABLED;

  if (!truthy(enabled)) {
    throw httpError(
      capability === "portal"
        ? "WedPlanned subscription Customer Portal is not enabled."
        : "WedPlanned subscription Checkout is not enabled.",
      503,
    );
  }

  const key = text(env.WEDPLANNED_BILLING_STRIPE_SECRET_KEY);

  if (!key.startsWith("sk_test_") && !key.startsWith("sk_live_")) {
    throw httpError(
      "WedPlanned subscription Stripe billing is not configured.",
      503,
    );
  }

  if (
    key.startsWith("sk_live_")
    && !truthy(env.WEDPLANNED_BILLING_STRIPE_LIVE_ENABLED)
  ) {
    throw httpError(
      "Live WedPlanned subscription billing is not enabled.",
      503,
    );
  }

  return key;
}


function expectedLivemode(
  env: SubscriptionStripeEnv,
  capability: SubscriptionStripeCapability = "checkout",
) {
  return stripeSecretKey(
    env,
    capability,
  ).startsWith("sk_live_");
}


function safeBillingReturnOrigin(
  env: SubscriptionStripeEnv,
  requestUrl: string,
) {
  const configured = text(env.WEDPLANNED_ADMIN_ORIGIN);
  const source = configured || requestUrl;

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw httpError(
      "WedPlanned billing return origin is invalid.",
      500,
    );
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw httpError(
      "WedPlanned billing return origin is invalid.",
      500,
    );
  }

  return url.origin;
}


function checkoutExpiry(value: unknown) {
  const seconds = integer(value);
  if (seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}


async function stripeFormRequest(
  env: SubscriptionStripeEnv,
  path: string,
  parameters: URLSearchParams,
  idempotencyKey: string,
  capability: SubscriptionStripeCapability = "checkout",
) {
  const response = await fetch(
    `${stripeApiBase(env)}${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey(env, capability)}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": text(idempotencyKey).slice(0, 255),
      },
      body: parameters.toString(),
    },
  );

  const payload: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw httpError(
      text(payload?.error?.message)
      || "Stripe subscription billing request failed.",
      response.status >= 400 && response.status < 600
        ? response.status
        : 502,
    );
  }

  if (
    Boolean(payload?.livemode)
    !== expectedLivemode(env, capability)
  ) {
    throw httpError(
      "Stripe subscription billing mode did not match the configured key.",
      502,
    );
  }

  return payload;
}



async function stripeJsonGet(
  env: SubscriptionStripeEnv,
  path: string,
  parameters: URLSearchParams,
  capability: SubscriptionStripeCapability = "checkout",
) {
  const query = parameters.toString();

  const response = await fetch(
    `${stripeApiBase(env)}${path}${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${stripeSecretKey(env, capability)}`,
      },
    },
  );

  const payload: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw httpError(
      "Stripe subscription billing lookup failed.",
      502,
    );
  }

  return payload;
}



async function loadCheckoutPrice(
  db: D1Db,
  planPriceId: string,
) {
  const row = await db.prepare(`
    SELECT
      price.id,
      price.plan_id,
      price.provider,
      price.provider_product_id,
      price.provider_price_id,
      price.billing_interval,
      price.interval_count,
      price.currency,
      price.unit_amount_minor,
      price.status AS price_status,
      plan.plan_key,
      plan.name AS plan_name,
      plan.plan_type,
      plan.status AS plan_status,
      plan.is_public
    FROM platform_plan_prices price
    JOIN platform_plans plan
      ON plan.id = price.plan_id
    WHERE price.id = ?
      AND price.provider = 'stripe'
      AND price.status = 'active'
      AND trim(price.provider_product_id) <> ''
      AND trim(price.provider_price_id) <> ''
      AND plan.status = 'active'
      AND plan.is_public = 1
      AND plan.plan_type IN (
        'commercial',
        'promotional'
      )
    LIMIT 1
  `).bind(planPriceId).first();

  if (!row) {
    throw httpError(
      "The selected WedPlanned subscription price is not available.",
      409,
    );
  }

  if (!text(row.provider_price_id).startsWith("price_")) {
    throw httpError(
      "The selected WedPlanned subscription price is not configured for Stripe.",
      409,
    );
  }

  return row;
}


async function assertNoActiveStripeSubscription(
  db: D1Db,
  workspaceId: string,
) {
  const active = await db.prepare(`
    SELECT id
    FROM workspace_subscriptions
    WHERE workspace_id = ?
      AND is_current = 1
      AND provider = 'stripe'
      AND status IN (
        'trialing',
        'active',
        'past_due'
      )
    LIMIT 1
  `).bind(workspaceId).first();

  if (active) {
    throw httpError(
      "This workspace already has an active Stripe subscription.",
      409,
    );
  }
}


async function loadWorkspaceBillingIdentity(
  db: D1Db,
  workspaceId: string,
  fallbackEmail: string,
) {
  const row = await db.prepare(`
    SELECT
      workspace.id,
      COALESCE(
        NULLIF(profile.public_name, ''),
        NULLIF(settings.business_name, ''),
        workspace.name,
        'WedPlanned workspace'
      ) AS business_name,
      COALESCE(
        NULLIF(settings.contact_email, ''),
        ?
      ) AS billing_email
    FROM workspaces workspace
    LEFT JOIN workspace_settings settings
      ON settings.workspace_id = workspace.id
    LEFT JOIN business_profiles profile
      ON profile.workspace_id = workspace.id
    WHERE workspace.id = ?
      AND workspace.status = 'active'
    LIMIT 1
  `).bind(
    text(fallbackEmail),
    workspaceId,
  ).first();

  if (!row) {
    throw httpError(
      "Workspace is not available for subscription billing.",
      404,
    );
  }

  return {
    businessName: text(row.business_name) || "WedPlanned workspace",
    billingEmail: text(row.billing_email),
  };
}


async function findWorkspaceStripeCustomerId(
  db: D1Db,
  workspaceId: string,
): Promise<string | null> {
  const row = await db.prepare(`
    SELECT provider_customer_id
    FROM workspace_billing_customers
    WHERE workspace_id = ?
      AND provider = 'stripe'
      AND trim(provider_customer_id) <> ''
    LIMIT 1
  `).bind(workspaceId).first();

  const customerId = text(row?.provider_customer_id);

  return customerId.startsWith("cus_")
    ? customerId
    : null;
}



async function loadWorkspaceStripeCustomer(
  db: D1Db,
  workspaceId: string,
) {
  const customerId = await findWorkspaceStripeCustomerId(
    db,
    workspaceId,
  );

  if (!customerId) {
    throw httpError(
      "This workspace does not have a Stripe subscription billing account.",
      409,
    );
  }

  return customerId;
}



const PROVIDER_TERMINAL_SUBSCRIPTION_STATUSES = new Set([
  "canceled",
  "incomplete_expired",
]);


const PROVIDER_BLOCKING_SUBSCRIPTION_STATUSES = new Set([
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "paused",
]);


async function assertNoProviderStripeSubscriptionConflict(
  db: D1Db,
  env: SubscriptionStripeEnv,
  workspaceId: string,
) {
  const customerId = await findWorkspaceStripeCustomerId(
    db,
    workspaceId,
  );

  if (!customerId) return;

  const parameters = new URLSearchParams();
  parameters.set("customer", customerId);
  parameters.set("status", "all");
  parameters.set("limit", "100");

  const payload = await stripeJsonGet(
    env,
    "/v1/subscriptions",
    parameters,
    "checkout",
  );

  if (
    text(payload?.object) !== "list"
    || !Array.isArray(payload?.data)
    || typeof payload?.has_more !== "boolean"
  ) {
    throw httpError(
      "Stripe subscription billing lookup returned an invalid response.",
      502,
    );
  }

  if (payload.has_more) {
    throw httpError(
      "WedPlanned could not safely confirm that this workspace has no existing Stripe subscription.",
      503,
    );
  }

  const expectedMode = expectedLivemode(
    env,
    "checkout",
  );

  for (const subscription of payload.data) {
    if (
      text(subscription?.object) !== "subscription"
      || Boolean(subscription?.livemode) !== expectedMode
    ) {
      throw httpError(
        "Stripe subscription billing lookup returned an invalid subscription.",
        502,
      );
    }

    const subscriptionCustomerId = text(
      subscription?.customer
      && typeof subscription.customer === "object"
        ? subscription.customer.id
        : subscription?.customer,
    );

    if (
      subscriptionCustomerId
      && subscriptionCustomerId !== customerId
    ) {
      throw httpError(
        "Stripe subscription billing lookup returned an unexpected Customer.",
        502,
      );
    }

    const status = lower(subscription?.status);

    if (PROVIDER_TERMINAL_SUBSCRIPTION_STATUSES.has(status)) {
      continue;
    }

    if (PROVIDER_BLOCKING_SUBSCRIPTION_STATUSES.has(status)) {
      throw httpError(
        "This workspace already has a Stripe subscription that must be resolved before starting another Checkout.",
        409,
      );
    }

    throw httpError(
      "WedPlanned could not safely confirm that this workspace has no existing Stripe subscription.",
      503,
    );
  }
}



async function ensureWorkspaceStripeCustomer(
  db: D1Db,
  env: SubscriptionStripeEnv,
  actor: SubscriptionCheckoutActor,
) {
  const existing = await db.prepare(`
    SELECT provider_customer_id
    FROM workspace_billing_customers
    WHERE workspace_id = ?
      AND provider = 'stripe'
      AND trim(provider_customer_id) <> ''
    LIMIT 1
  `).bind(actor.workspaceId).first();

  const existingId = text(existing?.provider_customer_id);
  if (existingId) return existingId;

  const identity = await loadWorkspaceBillingIdentity(
    db,
    actor.workspaceId,
    text(actor.email),
  );

  const parameters = new URLSearchParams();
  parameters.set("name", identity.businessName.slice(0, 256));
  if (identity.billingEmail) {
    parameters.set("email", identity.billingEmail.slice(0, 512));
  }
  parameters.set("metadata[workspace_id]", actor.workspaceId);
  parameters.set(
    "metadata[wedplanned_relationship]",
    "platform_subscription",
  );

  const customer = await stripeFormRequest(
    env,
    "/v1/customers",
    parameters,
    `wedplanned_billing_customer_${actor.workspaceId}`,
  );

  const customerId = text(customer?.id);
  if (!customerId.startsWith("cus_")) {
    throw httpError(
      "Stripe did not return a valid subscription billing Customer.",
      502,
    );
  }

  await db.prepare(`
    INSERT INTO workspace_billing_customers (
      workspace_id,
      provider,
      provider_customer_id,
      last_synced_at,
      metadata_json,
      created_at,
      updated_at
    ) VALUES (
      ?,
      'stripe',
      ?,
      CURRENT_TIMESTAMP,
      ?,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(workspace_id)
    DO UPDATE SET
      provider = 'stripe',
      provider_customer_id = excluded.provider_customer_id,
      last_synced_at = CURRENT_TIMESTAMP,
      metadata_json = excluded.metadata_json,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    actor.workspaceId,
    customerId,
    JSON.stringify({
      source: "stripe_api",
      livemode: Boolean(customer?.livemode),
    }),
  ).run();

  return customerId;
}


export async function beginWorkspaceStripeSubscriptionCheckout(
  db: D1Db,
  env: SubscriptionStripeEnv,
  actor: SubscriptionCheckoutActor,
  input: {
    planPriceId: string;
    requestUrl: string;
  },
): Promise<WorkspaceSubscriptionCheckoutResult> {
  const workspaceId = text(actor.workspaceId);
  const userId = text(actor.userId);
  const planPriceId = text(input.planPriceId);

  if (!workspaceId || !userId || !planPriceId) {
    throw httpError(
      "Workspace, requesting professional and plan price are required.",
      400,
    );
  }

  if (!(actor.permissions || []).includes("billing:manage")) {
    throw httpError(
      "You do not have permission to manage subscription billing.",
      403,
    );
  }

  if (actor.accessMode === "support") {
    throw httpError(
      "Subscription billing cannot be changed while using support access.",
      403,
    );
  }

  // Fail before any local write if Stripe billing is not explicitly enabled.
  stripeSecretKey(env);

  await assertNoActiveStripeSubscription(
    db,
    workspaceId,
  );

  await assertNoProviderStripeSubscriptionConflict(
    db,
    env,
    workspaceId,
  );

  const price = await loadCheckoutPrice(
    db,
    planPriceId,
  );

  const attempt = await createWorkspaceSubscriptionCheckoutAttempt(
    db,
    {
      workspaceId,
      planPriceId,
      requestedByUserId: userId,
      metadata: {
        relationship: "platform_subscription",
      },
    },
  );

  const attemptWasAlreadyOpen = attempt.status === "open";
  const existingProviderCheckoutId = text(attempt.providerCheckoutId);

  if (attemptWasAlreadyOpen && !existingProviderCheckoutId.startsWith("cs_")) {
    throw httpError(
      "The existing subscription Checkout attempt is missing its provider Session binding.",
      409,
    );
  }

  let providerSessionCreated = false;

  try {
    const customerId = await ensureWorkspaceStripeCustomer(
      db,
      env,
      actor,
    );

    const returnOrigin = safeBillingReturnOrigin(
      env,
      input.requestUrl,
    );

    const parameters = new URLSearchParams();
    parameters.set("mode", "subscription");
    parameters.set("customer", customerId);
    parameters.set("line_items[0][price]", text(price.provider_price_id));
    parameters.set("line_items[0][quantity]", "1");
    parameters.set("client_reference_id", attempt.id);
    parameters.set(
      "success_url",
      `${returnOrigin}/admin/wedplanned?tab=billing&checkout=returned`,
    );
    parameters.set(
      "cancel_url",
      `${returnOrigin}/admin/wedplanned?tab=billing&checkout=cancelled`,
    );

    const metadata = {
      workspace_id: workspaceId,
      checkout_attempt_id: attempt.id,
      plan_id: text(price.plan_id),
      plan_price_id: planPriceId,
    };

    for (const [key, value] of Object.entries(metadata)) {
      parameters.set(`metadata[${key}]`, value);
      parameters.set(`subscription_data[metadata][${key}]`, value);
    }

    const session = await stripeFormRequest(
      env,
      "/v1/checkout/sessions",
      parameters,
      attempt.idempotencyKey,
    );

    const sessionId = text(session?.id);
    const checkoutUrl = text(session?.url);

    if (!sessionId.startsWith("cs_") || text(session?.mode) !== "subscription") {
      throw httpError(
        "Stripe did not return a valid subscription Checkout Session.",
        502,
      );
    }

    if (!checkoutUrl.startsWith("https://checkout.stripe.com/")) {
      throw httpError(
        "Stripe did not return a valid hosted Checkout URL.",
        502,
      );
    }

    providerSessionCreated = true;

    const expiresAt = checkoutExpiry(session?.expires_at);

    // createWorkspaceSubscriptionCheckoutAttempt deliberately reuses an
    // existing created/open attempt for the same workspace, internal Price and
    // requesting professional. When the attempt is already open, repeating the
    // Stripe request with the same idempotency key must return the same Session.
    // Do not try to bind the already-bound D1 row a second time.
    if (attemptWasAlreadyOpen) {
      if (existingProviderCheckoutId !== sessionId) {
        throw httpError(
          "Stripe returned a different Checkout Session for an existing billing attempt.",
          409,
        );
      }

      return {
        attemptId: attempt.id,
        url: checkoutUrl,
        expiresAt,
      };
    }

    await attachWorkspaceSubscriptionCheckoutSession(
      db,
      {
        workspaceId,
        attemptId: attempt.id,
        providerCheckoutId: sessionId,
        expiresAt,
      },
    );

    return {
      attemptId: attempt.id,
      url: checkoutUrl,
      expiresAt,
    };
  } catch (error) {
    // If Stripe created a Session but local binding failed, preserve the
    // created attempt and its idempotency key. A retry will ask Stripe for the
    // same Session rather than creating a second subscription Checkout. An
    // already-open attempt must also remain open if a later browser retry hits
    // a transient provider error.
    if (!providerSessionCreated && attempt.status === "created") {
      await failWorkspaceSubscriptionCheckoutAttempt(
        db,
        {
          workspaceId,
          attemptId: attempt.id,
          failureCode: "stripe_checkout_failed",
          failureMessage: text((error as any)?.message),
        },
      ).catch(() => undefined);
    }

    throw error;
  }
}


export async function createWorkspaceStripeBillingPortalSession(
  db: D1Db,
  env: SubscriptionStripeEnv,
  actor: SubscriptionCheckoutActor,
  input: {
    requestUrl: string;
  },
): Promise<WorkspaceSubscriptionPortalResult> {
  const workspaceId = text(actor.workspaceId);
  const userId = text(actor.userId);

  if (!workspaceId || !userId) {
    throw httpError(
      "Workspace and requesting professional are required.",
      400,
    );
  }

  if (!(actor.permissions || []).includes("billing:manage")) {
    throw httpError(
      "You do not have permission to manage subscription billing.",
      403,
    );
  }

  if (actor.accessMode === "support") {
    throw httpError(
      "Subscription billing cannot be changed while using support access.",
      403,
    );
  }

  // Customer Portal has its own explicit capability switch. It remains
  // available independently of Checkout so an existing subscriber can still
  // manage or recover billing when new subscription Checkout is disabled.
  stripeSecretKey(
    env,
    "portal",
  );

  const customerId = await loadWorkspaceStripeCustomer(
    db,
    workspaceId,
  );

  const returnOrigin = safeBillingReturnOrigin(
    env,
    input.requestUrl,
  );

  const parameters = new URLSearchParams();
  parameters.set(
    "customer",
    customerId,
  );
  parameters.set(
    "return_url",
    `${returnOrigin}/admin/wedplanned?tab=billing&portal=returned`,
  );

  const session = await stripeFormRequest(
    env,
    "/v1/billing_portal/sessions",
    parameters,
    `wedplanned_billing_portal_${workspaceId}_${crypto.randomUUID()}`,
    "portal",
  );

  const sessionId = text(session?.id);
  const portalUrl = text(session?.url);

  if (
    !sessionId.startsWith("bps_")
    || !portalUrl.startsWith("https://billing.stripe.com/")
  ) {
    throw httpError(
      "Stripe did not return a valid subscription Customer Portal Session.",
      502,
    );
  }

  return {
    url: portalUrl,
  };
}
