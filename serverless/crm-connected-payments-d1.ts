type D1Db = D1Database;


export type ConnectedPaymentActor = {
  workspaceId: string;
  userId?: string;
  membershipId?: string;
  email?: string;
  permissions?: string[];
  accessMode?: string;
};


export type ConnectedPaymentEnv = {
  WEDPLANNED_STRIPE_SECRET_KEY?: string;
  WEDPLANNED_STRIPE_CONNECT_CLIENT_ID?: string;
  WEDPLANNED_STRIPE_CONNECT_REDIRECT_URI?: string;
  WEDPLANNED_STRIPE_API_BASE?: string;
  WEDPLANNED_STRIPE_CONNECT_BASE?: string;
};


const DEFAULT_PAYMENT_SETUP_RETURN =
  "/admin/crm/payment-setup";

const CONNECTION_STATE_TTL_MS =
  15 * 60 * 1000;


function text(value: unknown) {
  return String(value ?? "").trim();
}


function lower(value: unknown) {
  return text(value).toLowerCase();
}


function truthy(value: unknown) {
  return (
    value === true
    || value === 1
    || value === "1"
    || lower(value) === "true"
  );
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


function requireRead(
  actor: ConnectedPaymentActor,
) {
  if (
    !(actor.permissions || [])
      .includes("crm:read")
  ) {
    throw httpError(
      "You do not have permission to view payment settings.",
      403,
    );
  }
}


function requireManage(
  actor: ConnectedPaymentActor,
) {
  if (
    !(actor.permissions || [])
      .includes("crm:manage")
  ) {
    throw httpError(
      "You do not have permission to manage payments.",
      403,
    );
  }

  if (
    actor.accessMode === "support"
  ) {
    throw httpError(
      "Payment configuration cannot be changed while using support access.",
      403,
    );
  }
}


function safeReturnPath(
  value: unknown,
) {
  const path = text(value);

  if (
    path.startsWith("/admin/")
    && !path.startsWith("//")
  ) {
    return path;
  }

  return DEFAULT_PAYMENT_SETUP_RETURN;
}


function randomToken(
  bytes = 32,
) {
  const values =
    crypto.getRandomValues(
      new Uint8Array(bytes),
    );

  return btoa(
    String.fromCharCode(
      ...values,
    ),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}


async function sha256(
  value: string,
) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder()
        .encode(value),
    );

  return Array.from(
    new Uint8Array(digest),
  )
    .map(
      (byte) =>
        byte.toString(16)
          .padStart(2, "0"),
    )
    .join("");
}


function stripeApiBase(
  env: ConnectedPaymentEnv,
) {
  return text(
    env.WEDPLANNED_STRIPE_API_BASE
    || "https://api.stripe.com",
  ).replace(/\/+$/, "");
}


function stripeConnectBase(
  env: ConnectedPaymentEnv,
) {
  return text(
    env.WEDPLANNED_STRIPE_CONNECT_BASE
    || "https://connect.stripe.com",
  ).replace(/\/+$/, "");
}


const STRIPE_V2_VERSION =
  "2026-08-26.dahlia";


async function stripeV2JsonRequest(
  env: ConnectedPaymentEnv,
  path: string,
  payload: Record<string, unknown>,
) {
  const response =
    await fetch(
      `${stripeApiBase(env)}${path}`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${stripeSecretKey(env)}`,
          "Content-Type":
            "application/json",
          "Stripe-Version":
            STRIPE_V2_VERSION,
        },
        body:
          JSON.stringify(payload),
      },
    );

  const result: any =
    await response.json()
      .catch(() => ({}));

  if (!response.ok) {
    const message =
      text(
        result?.error?.message
        || result?.message,
      )
      || "Stripe request failed.";

    throw httpError(
      message,
      response.status >= 400
      && response.status < 600
        ? response.status
        : 502,
    );
  }

  return result;
}


function stripeSecretKey(
  env: ConnectedPaymentEnv,
) {
  const value =
    text(
      env.WEDPLANNED_STRIPE_SECRET_KEY,
    );

  if (!value.startsWith("sk_")) {
    throw httpError(
      "WedPlanned Stripe Connect is not configured.",
      503,
    );
  }

  return value;
}


function stripeClientId(
  env: ConnectedPaymentEnv,
) {
  const value =
    text(
      env.WEDPLANNED_STRIPE_CONNECT_CLIENT_ID,
    );

  if (!value.startsWith("ca_")) {
    throw httpError(
      "WedPlanned Stripe Connect client ID is not configured.",
      503,
    );
  }

  return value;
}


export function stripeConnectConfigured(
  env: ConnectedPaymentEnv,
) {
  return (
    text(
      env.WEDPLANNED_STRIPE_SECRET_KEY,
    ).startsWith("sk_")
    && text(
      env.WEDPLANNED_STRIPE_CONNECT_CLIENT_ID,
    ).startsWith("ca_")
  );
}


function stripeRedirectUri(
  env: ConnectedPaymentEnv,
  requestUrl: string,
) {
  const configured =
    text(
      env.WEDPLANNED_STRIPE_CONNECT_REDIRECT_URI,
    );

  if (configured) {
    let parsed: URL;

    try {
      parsed =
        new URL(configured);
    } catch {
      throw httpError(
        "WedPlanned Stripe Connect redirect URI is invalid.",
        500,
      );
    }

    if (
      !["https:", "http:"]
        .includes(parsed.protocol)
    ) {
      throw httpError(
        "WedPlanned Stripe Connect redirect URI is invalid.",
        500,
      );
    }

    return parsed.toString();
  }

  const origin =
    new URL(requestUrl).origin;

  return new URL(
    "/api/crm/payments/stripe/callback",
    origin,
  ).toString();
}


function cleanAccountNumber(
  value: unknown,
  max = 100,
) {
  return text(value)
    .slice(0, max);
}


function cleanBankInstructions(
  value: unknown,
) {
  return text(value)
    .slice(0, 4000);
}


function paymentSettingsPayload(
  row: any,
) {
  return {
    workspaceId:
      text(row?.workspace_id),

    cardPaymentsEnabled:
      Boolean(
        Number(
          row?.card_payments_enabled || 0,
        ),
      ),

    bankTransferEnabled:
      Boolean(
        Number(
          row?.bank_transfer_enabled || 0,
        ),
      ),

    bankAccountName:
      text(row?.bank_account_name),

    bankName:
      text(row?.bank_name),

    bankSortCode:
      text(row?.bank_sort_code),

    bankAccountNumber:
      text(row?.bank_account_number),

    bankIban:
      text(row?.bank_iban),

    bankBic:
      text(row?.bank_bic),

    bankTransferInstructions:
      text(
        row?.bank_transfer_instructions,
      ),

    stripe: {
      connectionStatus:
        text(
          row?.stripe_connection_status
          || "disconnected",
        ),

      accountId:
        text(row?.stripe_account_id),

      accountType:
        text(
          row?.stripe_account_type
          || "standard",
        ),

      country:
        text(row?.stripe_country),

      defaultCurrency:
        text(
          row?.stripe_default_currency,
        ).toUpperCase(),

      detailsSubmitted:
        Boolean(
          Number(
            row?.stripe_details_submitted
            || 0,
          ),
        ),

      chargesEnabled:
        Boolean(
          Number(
            row?.stripe_charges_enabled
            || 0,
          ),
        ),

      payoutsEnabled:
        Boolean(
          Number(
            row?.stripe_payouts_enabled
            || 0,
          ),
        ),

      connectedAt:
        row?.stripe_connected_at || "",

      lastSyncedAt:
        row?.stripe_last_synced_at || "",

      disconnectedAt:
        row?.stripe_disconnected_at || "",
    },

    updatedAt:
      row?.updated_at || "",
  };
}


function disconnectedRow(
  workspaceId: string,
) {
  return {
    workspace_id:
      workspaceId,

    card_payments_enabled:
      0,

    bank_transfer_enabled:
      0,

    bank_account_name: "",
    bank_name: "",
    bank_sort_code: "",
    bank_account_number: "",
    bank_iban: "",
    bank_bic: "",
    bank_transfer_instructions: "",

    stripe_connection_status:
      "disconnected",

    stripe_account_id: "",
    stripe_account_type:
      "standard",

    stripe_country: "",
    stripe_default_currency: "",

    stripe_details_submitted: 0,
    stripe_charges_enabled: 0,
    stripe_payouts_enabled: 0,

    stripe_connected_at: null,
    stripe_last_synced_at: null,
    stripe_disconnected_at: null,

    updated_at: "",
  };
}


async function settingsRow(
  db: D1Db,
  workspaceId: string,
) {
  return db.prepare(`
    SELECT *
    FROM workspace_payment_settings
    WHERE workspace_id = ?
    LIMIT 1
  `)
    .bind(workspaceId)
    .first();
}


async function audit(
  db: D1Db,
  actor: ConnectedPaymentActor,
  eventType: string,
  summary: string,
  metadata: Record<string, unknown> = {},
) {
  await db.prepare(`
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
      'workspace_payment_settings',
      ?,
      ?, ?,
      CURRENT_TIMESTAMP
    )
  `)
    .bind(
      `audit_${crypto.randomUUID()}`,
      actor.workspaceId,
      text(actor.userId) || null,
      lower(actor.email),
      eventType,
      actor.workspaceId,
      summary,
      JSON.stringify(metadata),
    )
    .run();
}


export async function getWorkspacePaymentSettings(
  db: D1Db,
  actor: ConnectedPaymentActor,
) {
  requireRead(actor);

  const row =
    await settingsRow(
      db,
      actor.workspaceId,
    );

  return paymentSettingsPayload(
    row
    || disconnectedRow(
      actor.workspaceId,
    ),
  );
}


export async function saveWorkspacePaymentSettings(
  db: D1Db,
  actor: ConnectedPaymentActor,
  input: any,
) {
  requireManage(actor);

  const current =
    await settingsRow(
      db,
      actor.workspaceId,
    );

  const stripeStatus =
    text(
      current?.stripe_connection_status
      || "disconnected",
    );

  const cardPaymentsEnabled =
    truthy(
      input?.cardPaymentsEnabled,
    );

  if (
    cardPaymentsEnabled
    && stripeStatus !== "ready"
  ) {
    throw httpError(
      "Connect a Stripe account and complete Stripe verification before enabling card payments.",
      409,
    );
  }

  const bankTransferEnabled =
    truthy(
      input?.bankTransferEnabled,
    );

  const bankAccountName =
    cleanAccountNumber(
      input?.bankAccountName,
      160,
    );

  const bankName =
    cleanAccountNumber(
      input?.bankName,
      160,
    );

  const bankSortCode =
    cleanAccountNumber(
      input?.bankSortCode,
      40,
    );

  const bankAccountNumber =
    cleanAccountNumber(
      input?.bankAccountNumber,
      80,
    );

  const bankIban =
    cleanAccountNumber(
      input?.bankIban,
      80,
    );

  const bankBic =
    cleanAccountNumber(
      input?.bankBic,
      40,
    );

  const bankTransferInstructions =
    cleanBankInstructions(
      input?.bankTransferInstructions,
    );

  if (
    bankTransferEnabled
    && !bankAccountNumber
    && !bankIban
    && !bankTransferInstructions
  ) {
    throw httpError(
      "Add bank details or payment instructions before enabling bank transfer.",
    );
  }

  await db.prepare(`
    INSERT INTO workspace_payment_settings (
      workspace_id,
      card_payments_enabled,
      bank_transfer_enabled,
      bank_account_name,
      bank_name,
      bank_sort_code,
      bank_account_number,
      bank_iban,
      bank_bic,
      bank_transfer_instructions,
      created_by_user_id,
      updated_by_user_id,
      created_at,
      updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(workspace_id)
    DO UPDATE SET
      card_payments_enabled =
        excluded.card_payments_enabled,
      bank_transfer_enabled =
        excluded.bank_transfer_enabled,
      bank_account_name =
        excluded.bank_account_name,
      bank_name =
        excluded.bank_name,
      bank_sort_code =
        excluded.bank_sort_code,
      bank_account_number =
        excluded.bank_account_number,
      bank_iban =
        excluded.bank_iban,
      bank_bic =
        excluded.bank_bic,
      bank_transfer_instructions =
        excluded.bank_transfer_instructions,
      updated_by_user_id =
        excluded.updated_by_user_id,
      updated_at =
        CURRENT_TIMESTAMP
  `)
    .bind(
      actor.workspaceId,
      cardPaymentsEnabled ? 1 : 0,
      bankTransferEnabled ? 1 : 0,
      bankAccountName,
      bankName,
      bankSortCode,
      bankAccountNumber,
      bankIban,
      bankBic,
      bankTransferInstructions,
      text(actor.userId) || null,
      text(actor.userId) || null,
    )
    .run();

  await audit(
    db,
    actor,
    "crm.payment_settings.updated",
    "Updated payment method settings.",
    {
      cardPaymentsEnabled,
      bankTransferEnabled,
    },
  );

  return getWorkspacePaymentSettings(
    db,
    {
      ...actor,
      permissions: [
        ...new Set([
          ...(actor.permissions || []),
          "crm:read",
        ]),
      ],
    },
  );
}


async function stripeFormRequest(
  env: ConnectedPaymentEnv,
  path: string,
  body: URLSearchParams,
) {
  const secret =
    stripeSecretKey(env);

  const response =
    await fetch(
      `${stripeConnectBase(env)}${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          new URLSearchParams({
            ...Object.fromEntries(
              body.entries(),
            ),
            client_secret:
              secret,
          }).toString(),
      },
    );

  const payload: any =
    await response.json()
      .catch(() => ({}));

  if (!response.ok) {
    throw httpError(
      text(
        payload?.error_description
        || payload?.error?.message
        || payload?.error
        || "Stripe Connect request failed.",
      ),
      response.status >= 500
        ? 502
        : 400,
    );
  }

  return payload;
}



async function stripeApiFormRequest(
  env: ConnectedPaymentEnv,
  path: string,
  body: URLSearchParams,
) {
  const secret =
    stripeSecretKey(env);

  const response =
    await fetch(
      `${stripeApiBase(env)}${path}`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${secret}`,
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          body.toString(),
      },
    );

  const payload: any =
    await response.json()
      .catch(() => ({}));

  if (!response.ok) {
    throw httpError(
      text(
        payload?.error?.message
        || payload?.error_description
        || payload?.error
        || "Stripe API request failed.",
      ),
      response.status >= 500
        ? 502
        : 400,
    );
  }

  return payload;
}


async function stripeConnectAuthorizedFormRequest(
  env: ConnectedPaymentEnv,
  path: string,
  body: URLSearchParams,
) {
  const secret =
    stripeSecretKey(env);

  const credentials =
    btoa(`${secret}:`);

  const response =
    await fetch(
      `${stripeConnectBase(env)}${path}`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Basic ${credentials}`,
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          body.toString(),
      },
    );

  const payload: any =
    await response.json()
      .catch(() => ({}));

  if (!response.ok) {
    throw httpError(
      text(
        payload?.error_description
        || payload?.error?.message
        || payload?.error
        || "Stripe Connect request failed.",
      ),
      response.status >= 500
        ? 502
        : 400,
    );
  }

  return payload;
}


async function stripeAccount(
  env: ConnectedPaymentEnv,
  accountId: string,
) {
  const secret =
    stripeSecretKey(env);

  const response =
    await fetch(
      `${stripeApiBase(env)}/v1/accounts/${encodeURIComponent(accountId)}`,
      {
        headers: {
          Authorization:
            `Bearer ${secret}`,
        },
      },
    );

  const payload: any =
    await response.json()
      .catch(() => ({}));

  if (!response.ok) {
    throw httpError(
      text(
        payload?.error?.message
        || "Unable to read the connected Stripe account.",
      ),
      response.status >= 500
        ? 502
        : 400,
    );
  }

  return payload;
}


function stripeConnectionStatus(
  account: any,
) {
  const detailsSubmitted =
    Boolean(
      account?.details_submitted,
    );

  const chargesEnabled =
    Boolean(
      account?.charges_enabled,
    );

  const payoutsEnabled =
    Boolean(
      account?.payouts_enabled,
    );

  if (
    detailsSubmitted
    && chargesEnabled
    && payoutsEnabled
  ) {
    return "ready";
  }

  if (detailsSubmitted) {
    return "restricted";
  }

  return "pending";
}


async function saveStripeAccount(
  db: D1Db,
  actor: ConnectedPaymentActor,
  account: any,
) {
  const accountId =
    text(account?.id);

  if (!accountId.startsWith("acct_")) {
    throw httpError(
      "Stripe did not return a valid connected account.",
      502,
    );
  }

  const status =
    stripeConnectionStatus(
      account,
    );

  const existing =
    await settingsRow(
      db,
      actor.workspaceId,
    );

  const connectedAt =
    existing?.stripe_account_id === accountId
    && existing?.stripe_connected_at
      ? existing.stripe_connected_at
      : new Date().toISOString();

  try {
    await db.prepare(`
      INSERT INTO workspace_payment_settings (
        workspace_id,
        stripe_connection_status,
        stripe_account_id,
        stripe_account_type,
        stripe_country,
        stripe_default_currency,
        stripe_details_submitted,
        stripe_charges_enabled,
        stripe_payouts_enabled,
        stripe_connected_at,
        stripe_last_synced_at,
        stripe_disconnected_at,
        created_by_user_id,
        updated_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, CURRENT_TIMESTAMP, NULL,
        ?, ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(workspace_id)
      DO UPDATE SET
        stripe_connection_status =
          excluded.stripe_connection_status,
        stripe_account_id =
          excluded.stripe_account_id,
        stripe_account_type =
          excluded.stripe_account_type,
        stripe_country =
          excluded.stripe_country,
        stripe_default_currency =
          excluded.stripe_default_currency,
        stripe_details_submitted =
          excluded.stripe_details_submitted,
        stripe_charges_enabled =
          excluded.stripe_charges_enabled,
        stripe_payouts_enabled =
          excluded.stripe_payouts_enabled,
        stripe_connected_at =
          excluded.stripe_connected_at,
        stripe_last_synced_at =
          CURRENT_TIMESTAMP,
        stripe_disconnected_at =
          NULL,
        updated_by_user_id =
          excluded.updated_by_user_id,
        updated_at =
          CURRENT_TIMESTAMP
    `)
      .bind(
        actor.workspaceId,
        status,
        accountId,
        ["standard", "express", "custom"]
          .includes(
            text(account?.type),
          )
          ? text(account.type)
          : "standard",
        text(account?.country)
          .toUpperCase(),
        text(
          account?.default_currency,
        ).toUpperCase(),
        account?.details_submitted
          ? 1
          : 0,
        account?.charges_enabled
          ? 1
          : 0,
        account?.payouts_enabled
          ? 1
          : 0,
        connectedAt,
        text(actor.userId) || null,
        text(actor.userId) || null,
      )
      .run();
  } catch (error: any) {
    if (
      /unique|constraint/i.test(
        text(error?.message),
      )
    ) {
      throw httpError(
        "This Stripe account is already connected to another WedPlanned business.",
        409,
      );
    }

    throw error;
  }

  return status;
}



export async function beginStripeHostedOnboarding(
  db: D1Db,
  env: ConnectedPaymentEnv,
  actor: ConnectedPaymentActor,
  requestUrl: string,
  returnPathInput: unknown,
) {
  requireManage(actor);

  stripeSecretKey(env);

  const returnPath =
    safeReturnPath(
      returnPathInput,
    );

  const current =
    await settingsRow(
      db,
      actor.workspaceId,
    );

  let accountId =
    text(
      current?.stripe_account_id,
    );

  let account: any;

  if (accountId) {
    account =
      await stripeAccount(
        env,
        accountId,
      );

  } else {
    const workspace: any =
      await db.prepare(`
        SELECT
          w.name,
          bp.registration_country,
          ws.default_country
        FROM workspaces AS w
        LEFT JOIN business_profiles AS bp
          ON bp.workspace_id = w.id
        LEFT JOIN workspace_settings AS ws
          ON ws.workspace_id = w.id
        WHERE w.id = ?
        LIMIT 1
      `)
        .bind(
          actor.workspaceId,
        )
        .first();

    const country =
      text(
        workspace?.registration_country
        || workspace?.default_country,
      ).toUpperCase();

    if (!/^[A-Z]{2}$/.test(country)) {
      throw httpError(
        "Set a valid two-letter business country before Stripe setup.",
        400,
      );
    }

    const createdAccount =
      await stripeV2JsonRequest(
        env,
        "/v2/core/accounts",
        {
          contact_email:
            text(actor.email)
            || undefined,

          display_name:
            text(workspace?.name)
            || undefined,

          identity: {
            country:
              country.toLowerCase(),
          },

          configuration: {
            merchant: {
              capabilities: {
                card_payments: {
                  requested: true,
                },
              },
            },
          },

          defaults: {
            responsibilities: {
              fees_collector:
                "stripe",
              losses_collector:
                "stripe",
            },
          },

          dashboard:
            "full",

          metadata: {
            wedplanned_workspace_id:
              actor.workspaceId,
          },

          include: [
            "configuration.merchant",
            "identity",
            "requirements",
            "defaults",
          ],
        },
      );

    accountId =
      text(
        createdAccount?.id,
      );

    if (!accountId.startsWith("acct_")) {
      throw httpError(
        "Stripe did not return a connected account ID.",
        502,
      );
    }

    /*
     * Accounts v2 IDs remain acct_ identifiers and Stripe
     * supports passing them to compatible Accounts v1
     * endpoints. Keep one shared readiness/persistence model.
     */
    account =
      await stripeAccount(
        env,
        accountId,
      );
    accountId =
      text(account?.id);

    if (
      !accountId.startsWith(
        "acct_",
      )
    ) {
      throw httpError(
        "Stripe did not return a connected account.",
        502,
      );
    }

    await saveStripeAccount(
      db,
      actor,
      account,
    );

    await audit(
      db,
      actor,
      "crm.stripe.onboarding.started",
      "Started Stripe hosted account setup.",
      {
        stripeAccountId:
          accountId,
      },
    );
  }

  const status =
    stripeConnectionStatus(
      account,
    );

  if (status === "ready") {
    throw httpError(
      "This Stripe account is already ready.",
      409,
    );
  }

  const origin =
    new URL(
      requestUrl,
    ).origin;

  const refreshUrl =
    new URL(
      "/api/crm/payments/stripe/onboard",
      origin,
    );

  refreshUrl.searchParams.set(
    "action",
    "refresh",
  );

  refreshUrl.searchParams.set(
    "returnPath",
    returnPath,
  );

  const returnUrl =
    new URL(
      "/api/crm/payments/stripe/onboard",
      origin,
    );

  returnUrl.searchParams.set(
    "action",
    "return",
  );

  returnUrl.searchParams.set(
    "returnPath",
    returnPath,
  );

  const accountLink =
    await stripeV2JsonRequest(
      env,
      "/v2/core/account_links",
      {
        account:
          accountId,

        use_case: {
          type:
            "account_onboarding",

          account_onboarding: {
            configurations: [
              "merchant",
            ],

            return_url:
              returnUrl.toString(),

            refresh_url:
              refreshUrl.toString(),
          },
        },
      },
    );
  const authorizationUrl =
    text(
      accountLink?.url,
    );

  if (!authorizationUrl) {
    throw httpError(
      "Stripe did not return an onboarding URL.",
      502,
    );
  }

  const expires =
    text(
      accountLink?.expires_at,
    );

  const expiresTime =
    expires
      ? Date.parse(expires)
      : Number.NaN;

  return {
    authorizationUrl,
    accountId,
    expiresAt:
      Number.isFinite(
        expiresTime,
      )
        ? new Date(
            expiresTime,
          ).toISOString()
        : "",
  };
}


export async function beginStripeConnection(
  db: D1Db,
  env: ConnectedPaymentEnv,
  actor: ConnectedPaymentActor,
  requestUrl: string,
  returnPathInput: unknown,
) {
  requireManage(actor);

  stripeSecretKey(env);

  const clientId =
    stripeClientId(env);

  const returnPath =
    safeReturnPath(
      returnPathInput,
    );

  const redirectUri =
    stripeRedirectUri(
      env,
      requestUrl,
    );

  const rawState =
    randomToken(32);

  const stateHash =
    await sha256(rawState);

  const expiresAt =
    new Date(
      Date.now()
      + CONNECTION_STATE_TTL_MS,
    ).toISOString();

  await db.prepare(`
    DELETE FROM payment_provider_connection_states
    WHERE provider = 'stripe'
      AND (
        consumed_at IS NOT NULL
        OR datetime(expires_at)
          <= CURRENT_TIMESTAMP
      )
  `).run();

  await db.prepare(`
    INSERT INTO payment_provider_connection_states (
      id,
      workspace_id,
      user_id,
      membership_id,
      provider,
      state_hash,
      return_path,
      expires_at,
      metadata_json,
      created_at
    ) VALUES (
      ?, ?, ?, ?, 'stripe',
      ?, ?, ?, ?,
      CURRENT_TIMESTAMP
    )
  `)
    .bind(
      `payment_connection_${crypto.randomUUID()}`,
      actor.workspaceId,
      text(actor.userId) || null,
      text(actor.membershipId),
      stateHash,
      returnPath,
      expiresAt,
      JSON.stringify({
        redirectUri,
      }),
    )
    .run();

  const authorizationUrl =
    new URL(
      `${stripeConnectBase(env)}/oauth/authorize`,
    );

  authorizationUrl.searchParams.set(
    "response_type",
    "code",
  );

  authorizationUrl.searchParams.set(
    "client_id",
    clientId,
  );

  authorizationUrl.searchParams.set(
    "scope",
    "read_write",
  );

  authorizationUrl.searchParams.set(
    "state",
    rawState,
  );

  authorizationUrl.searchParams.set(
    "redirect_uri",
    redirectUri,
  );

  return {
    authorizationUrl:
      authorizationUrl.toString(),
    expiresAt,
  };
}


async function consumeConnectionState(
  db: D1Db,
  actor: ConnectedPaymentActor,
  stateInput: unknown,
) {
  const state =
    text(stateInput);

  if (!state) {
    throw httpError(
      "Stripe connection state is missing.",
    );
  }

  const stateHash =
    await sha256(state);

  const row: any =
    await db.prepare(`
      SELECT *
      FROM payment_provider_connection_states
      WHERE provider = 'stripe'
        AND state_hash = ?
        AND consumed_at IS NULL
      LIMIT 1
    `)
      .bind(stateHash)
      .first();

  if (!row) {
    throw httpError(
      "Stripe connection state is invalid or has already been used.",
    );
  }

  if (
    !row.expires_at
    || Date.parse(row.expires_at)
      <= Date.now()
  ) {
    throw httpError(
      "Stripe connection state has expired.",
    );
  }

  if (
    text(row.workspace_id)
    !== text(actor.workspaceId)
  ) {
    throw httpError(
      "Stripe connection does not belong to this business.",
      403,
    );
  }

  if (
    text(row.user_id)
    && text(row.user_id)
      !== text(actor.userId)
  ) {
    throw httpError(
      "Stripe connection does not belong to this user.",
      403,
    );
  }

  if (
    text(row.membership_id)
    && text(actor.membershipId)
    && text(row.membership_id)
      !== text(actor.membershipId)
  ) {
    throw httpError(
      "Stripe connection membership has changed.",
      403,
    );
  }

  const consumed =
    await db.prepare(`
      UPDATE payment_provider_connection_states
      SET consumed_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND consumed_at IS NULL
    `)
      .bind(row.id)
      .run();

  if (
    Number(
      consumed?.meta?.changes || 0,
    ) !== 1
  ) {
    throw httpError(
      "Stripe connection state has already been used.",
      409,
    );
  }

  return {
    returnPath:
      safeReturnPath(
        row.return_path,
      ),
  };
}


export async function completeStripeConnection(
  db: D1Db,
  env: ConnectedPaymentEnv,
  actor: ConnectedPaymentActor,
  _requestUrl: string,
  input: {
    code?: unknown;
    state?: unknown;
  },
) {
  requireManage(actor);

  const code =
    text(input?.code);

  if (!code) {
    throw httpError(
      "Stripe authorization code is missing.",
    );
  }

  const connectionState =
    await consumeConnectionState(
      db,
      actor,
      input?.state,
    );

  const token =
    await stripeFormRequest(
      env,
      "/oauth/token",
      new URLSearchParams({
        grant_type:
          "authorization_code",
        code,
      }),
    );

  const accountId =
    text(
      token?.stripe_user_id,
    );

  if (!accountId.startsWith("acct_")) {
    throw httpError(
      "Stripe did not return a connected account ID.",
      502,
    );
  }

  const account =
    await stripeAccount(
      env,
      accountId,
    );

  const status =
    await saveStripeAccount(
      db,
      actor,
      account,
    );

  await audit(
    db,
    actor,
    "crm.stripe.connected",
    "Connected Stripe to this business.",
    {
      stripeAccountId:
        accountId,
      status,
    },
  );

  const settings =
    await getWorkspacePaymentSettings(
      db,
      {
        ...actor,
        permissions: [
          ...new Set([
            ...(actor.permissions || []),
            "crm:read",
          ]),
        ],
      },
    );

  return {
    settings,
    returnPath:
      connectionState.returnPath,
  };
}


export async function syncStripeConnection(
  db: D1Db,
  env: ConnectedPaymentEnv,
  actor: ConnectedPaymentActor,
) {
  requireManage(actor);

  const current =
    await settingsRow(
      db,
      actor.workspaceId,
    );

  const accountId =
    text(
      current?.stripe_account_id,
    );

  if (!accountId) {
    throw httpError(
      "No Stripe account is connected.",
      409,
    );
  }

  const account =
    await stripeAccount(
      env,
      accountId,
    );

  const status =
    await saveStripeAccount(
      db,
      actor,
      account,
    );

  if (
    status !== "ready"
    && Boolean(
      Number(
        current?.card_payments_enabled
        || 0,
      ),
    )
  ) {
    await db.prepare(`
      UPDATE workspace_payment_settings
      SET
        card_payments_enabled = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE workspace_id = ?
    `)
      .bind(actor.workspaceId)
      .run();
  }

  return getWorkspacePaymentSettings(
    db,
    {
      ...actor,
      permissions: [
        ...new Set([
          ...(actor.permissions || []),
          "crm:read",
        ]),
      ],
    },
  );
}


async function deauthorizeStripeAccount(
  env: ConnectedPaymentEnv,
  accountId: string,
) {
  await stripeConnectAuthorizedFormRequest(
    env,
    "/oauth/deauthorize",
    new URLSearchParams({
      client_id:
        stripeClientId(env),
      stripe_user_id:
        accountId,
    }),
  );
}


export async function disconnectStripeConnection(
  db: D1Db,
  env: ConnectedPaymentEnv,
  actor: ConnectedPaymentActor,
) {
  requireManage(actor);

  const current =
    await settingsRow(
      db,
      actor.workspaceId,
    );

  const accountId =
    text(
      current?.stripe_account_id,
    );

  if (!accountId) {
    return getWorkspacePaymentSettings(
      db,
      {
        ...actor,
        permissions: [
          ...new Set([
            ...(actor.permissions || []),
            "crm:read",
          ]),
        ],
      },
    );
  }

  await deauthorizeStripeAccount(
    env,
    accountId,
  );

  await db.prepare(`
    UPDATE workspace_payment_settings
    SET
      card_payments_enabled = 0,
      stripe_connection_status =
        'disconnected',
      stripe_account_id = '',
      stripe_account_type =
        'standard',
      stripe_country = '',
      stripe_default_currency = '',
      stripe_details_submitted = 0,
      stripe_charges_enabled = 0,
      stripe_payouts_enabled = 0,
      stripe_last_synced_at =
        CURRENT_TIMESTAMP,
      stripe_disconnected_at =
        CURRENT_TIMESTAMP,
      updated_by_user_id = ?,
      updated_at =
        CURRENT_TIMESTAMP
    WHERE workspace_id = ?
  `)
    .bind(
      text(actor.userId) || null,
      actor.workspaceId,
    )
    .run();

  await audit(
    db,
    actor,
    "crm.stripe.disconnected",
    "Disconnected Stripe from this business.",
    {
      stripeAccountId:
        accountId,
    },
  );

  return getWorkspacePaymentSettings(
    db,
    {
      ...actor,
      permissions: [
        ...new Set([
          ...(actor.permissions || []),
          "crm:read",
        ]),
      ],
    },
  );
}


type StripeInvoiceCheckoutInput = {
  workspaceId: string;
  identityId: string;
  clientEmail: string;
  invoice: any;
  scheduleItemId?: string;
  requestUrl: string;
};


function parseInvoiceAttemptMetadata(
  value: unknown,
) {
  try {
    const parsed =
      JSON.parse(
        text(value) || "{}",
      );

    return (
      parsed
      && typeof parsed === "object"
      && !Array.isArray(parsed)
    )
      ? parsed
      : {};
  } catch {
    return {};
  }
}


function stripeCheckoutExpiry(
  value: unknown,
) {
  const seconds =
    Number(value || 0);

  if (
    !Number.isFinite(seconds)
    || seconds <= 0
  ) {
    return "";
  }

  return new Date(
    seconds * 1000,
  ).toISOString();
}


async function stripeConnectedCheckoutRequest(
  env: ConnectedPaymentEnv,
  accountId: string,
  parameters: URLSearchParams,
  idempotencyKey: string,
) {
  const response =
    await fetch(
      `${stripeApiBase(env)}/v1/checkout/sessions`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${stripeSecretKey(env)}`,

          "Content-Type":
            "application/x-www-form-urlencoded",

          "Stripe-Account":
            accountId,

          "Idempotency-Key":
            idempotencyKey,
        },

        body:
          parameters.toString(),
      },
    );

  const payload: any =
    await response.json()
      .catch(() => ({}));

  if (!response.ok) {
    throw httpError(
      text(
        payload?.error?.message,
      )
      || "Unable to create Stripe Checkout.",
      response.status >= 400
      && response.status < 600
        ? response.status
        : 502,
    );
  }

  return payload;
}


export async function beginStripeInvoiceCheckout(
  db: D1Db,
  env: ConnectedPaymentEnv,
  input: StripeInvoiceCheckoutInput,
) {
  const workspaceId =
    text(input.workspaceId);

  const identityId =
    text(input.identityId);

  const invoice =
    input.invoice || {};

  const invoiceId =
    text(invoice.id);

  const jobId =
    text(invoice.jobId);

  const requestedScheduleItemId =
    text(input.scheduleItemId);

  if (
    !workspaceId
    || !identityId
    || !invoiceId
    || !jobId
  ) {
    throw httpError(
      "Invoice payment context is invalid.",
      400,
    );
  }

  if (
    ![
      "issued",
      "part_paid",
    ].includes(
      text(invoice.status),
    )
  ) {
    throw httpError(
      "This invoice does not have a payable balance.",
      409,
    );
  }

  const paymentSettings: any =
    await db.prepare(`
      SELECT
        card_payments_enabled,
        stripe_connection_status,
        stripe_account_id,
        stripe_charges_enabled,
        stripe_payouts_enabled
      FROM workspace_payment_settings
      WHERE workspace_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
    ).first();

  if (
    !paymentSettings
    || Number(
      paymentSettings
        .card_payments_enabled
      || 0,
    ) !== 1
  ) {
    throw httpError(
      "Card payments are not enabled for this business.",
      409,
    );
  }

  const accountId =
    text(
      paymentSettings
        .stripe_account_id,
    );

  if (
    text(
      paymentSettings
        .stripe_connection_status,
    ) !== "ready"
    || !accountId.startsWith("acct_")
    || Number(
      paymentSettings
        .stripe_charges_enabled
      || 0,
    ) !== 1
    || Number(
      paymentSettings
        .stripe_payouts_enabled
      || 0,
    ) !== 1
  ) {
    throw httpError(
      "Stripe is not ready to accept client payments.",
      409,
    );
  }

  const schedule =
    Array.isArray(
      invoice.schedule,
    )
      ? invoice.schedule
      : [];

  const selectedSchedule =
    requestedScheduleItemId
      ? schedule.find(
          (item: any) =>
            text(item?.id)
            === requestedScheduleItemId
            && Number(
              item?.balanceAmount
              || 0,
            ) > 0,
        )
      : schedule.find(
          (item: any) =>
            Number(
              item?.balanceAmount
              || 0,
            ) > 0,
        );

  if (
    requestedScheduleItemId
    && !selectedSchedule
  ) {
    throw httpError(
      "The selected payment instalment is not available.",
      409,
    );
  }

  const amount =
    selectedSchedule
      ? Number(
          selectedSchedule
            .balanceAmount
          || 0,
        )
      : Number(
          invoice.balanceAmount
          || 0,
        );

  if (
    !Number.isInteger(amount)
    || amount <= 0
  ) {
    throw httpError(
      "This invoice does not have a payable balance.",
      409,
    );
  }

  const currency =
    (
      text(
        invoice.currency
        || "GBP",
      )
      || "GBP"
    ).toUpperCase();

  if (
    !/^[A-Z]{3}$/
      .test(currency)
  ) {
    throw httpError(
      "Invoice currency is invalid.",
      409,
    );
  }

  const scheduleItemId =
    selectedSchedule
      ? text(
          selectedSchedule.id,
        )
      : "";

  /*
   * A repeated click should reuse a still-valid Stripe
   * Checkout Session for the same client/payment obligation.
   */
  const existingAttempt: any =
    await db.prepare(`
      SELECT *
      FROM crm_invoice_payment_attempts
      WHERE workspace_id = ?
        AND invoice_id = ?
        AND COALESCE(
          schedule_item_id,
          ''
        ) = ?
        AND COALESCE(
          client_identity_id,
          ''
        ) = ?
        AND amount = ?
        AND currency = ?
        AND status IN (
          'created',
          'open'
        )
      ORDER BY
        created_at DESC
      LIMIT 1
    `).bind(
      workspaceId,
      invoiceId,
      scheduleItemId,
      identityId,
      amount,
      currency,
    ).first();

  if (existingAttempt) {
    const existingMetadata =
      parseInvoiceAttemptMetadata(
        existingAttempt
          .metadata_json,
      );

    const existingUrl =
      text(
        existingMetadata
          .checkoutUrl,
      );

    const existingExpiry =
      text(
        existingAttempt
          .expires_at,
      );

    const stillValid =
      !existingExpiry
      || (
        Number.isFinite(
          Date.parse(
            existingExpiry,
          ),
        )
        && Date.parse(
          existingExpiry,
        ) > Date.now()
      );

    if (
      text(
        existingAttempt.status,
      ) === "open"
      && existingUrl
      && stillValid
    ) {
      return {
        checkoutUrl:
          existingUrl,

        attemptId:
          text(
            existingAttempt.id,
          ),

        checkoutId:
          text(
            existingAttempt
              .provider_checkout_id,
          ),

        amount,
        currency,
      };
    }

    await db.prepare(`
      UPDATE crm_invoice_payment_attempts
      SET
        status = 'cancelled',
        completed_at =
          COALESCE(
            completed_at,
            CURRENT_TIMESTAMP
          ),
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND workspace_id = ?
        AND status IN (
          'created',
          'open'
        )
    `).bind(
      existingAttempt.id,
      workspaceId,
    ).run();
  }

  const attemptId =
    `crm_invoice_payment_attempt_${crypto.randomUUID()}`;

  const idempotencyKey =
    `wedplanned_invoice_${crypto.randomUUID()}`;

  const clientEmail =
    lower(
      input.clientEmail,
    );

  const baseMetadata = {
    source:
      "client_portal",

    jobId,

    invoiceReference:
      text(
        invoice.reference,
      ),

    scheduleLabel:
      text(
        selectedSchedule?.label,
      ),
  };

  await db.prepare(`
    INSERT INTO crm_invoice_payment_attempts (
      id,
      workspace_id,
      invoice_id,
      schedule_item_id,
      client_identity_id,
      provider,
      provider_account_id,
      idempotency_key,
      status,
      amount,
      currency,
      client_email,
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
      ?,
      'created',
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
    invoiceId,
    scheduleItemId
      || null,
    identityId,
    accountId,
    idempotencyKey,
    amount,
    currency,
    clientEmail,
    JSON.stringify(
      baseMetadata,
    ),
  ).run();

  const requestUrl =
    new URL(
      input.requestUrl,
    );

  const workspaceSlug =
    requestUrl
      .searchParams
      .get("workspace")
    || "";

  const successUrl =
    new URL(
      "/client-portal",
      requestUrl.origin,
    );

  const cancelUrl =
    new URL(
      "/client-portal",
      requestUrl.origin,
    );

  if (workspaceSlug) {
    successUrl.searchParams.set(
      "workspace",
      workspaceSlug,
    );

    cancelUrl.searchParams.set(
      "workspace",
      workspaceSlug,
    );
  }

  successUrl.searchParams.set(
    "invoice",
    invoiceId,
  );

  successUrl.searchParams.set(
    "payment",
    "success",
  );

  cancelUrl.searchParams.set(
    "invoice",
    invoiceId,
  );

  cancelUrl.searchParams.set(
    "payment",
    "cancelled",
  );

  const paymentLabel =
    text(
      selectedSchedule?.label,
    )
    || (
      text(
        invoice.reference,
      )
        ? `Invoice ${text(invoice.reference)}`
        : "Invoice payment"
    );

  const parameters =
    new URLSearchParams();

  parameters.set(
    "mode",
    "payment",
  );

  parameters.set(
    "success_url",
    successUrl.toString(),
  );

  parameters.set(
    "cancel_url",
    cancelUrl.toString(),
  );

  parameters.set(
    "payment_method_types[0]",
    "card",
  );

  if (clientEmail) {
    parameters.set(
      "customer_email",
      clientEmail,
    );
  }

  parameters.set(
    "line_items[0][quantity]",
    "1",
  );

  parameters.set(
    "line_items[0][price_data][currency]",
    currency.toLowerCase(),
  );

  parameters.set(
    "line_items[0][price_data][unit_amount]",
    String(amount),
  );

  parameters.set(
    "line_items[0][price_data][product_data][name]",
    paymentLabel.slice(
      0,
      120,
    ),
  );

  const stripeMetadata = {
    wedplanned_attempt_id:
      attemptId,

    wedplanned_workspace_id:
      workspaceId,

    wedplanned_invoice_id:
      invoiceId,

    wedplanned_schedule_item_id:
      scheduleItemId,
  };

  for (
    const [key, value]
    of Object.entries(
      stripeMetadata,
    )
  ) {
    parameters.set(
      `metadata[${key}]`,
      value,
    );

    parameters.set(
      `payment_intent_data[metadata][${key}]`,
      value,
    );
  }

  try {
    const session =
      await stripeConnectedCheckoutRequest(
        env,
        accountId,
        parameters,
        idempotencyKey,
      );

    const checkoutId =
      text(
        session?.id,
      );

    const checkoutUrl =
      text(
        session?.url,
      );

    if (
      !checkoutId.startsWith(
        "cs_",
      )
      || !checkoutUrl
    ) {
      throw httpError(
        "Stripe did not return a Checkout Session.",
        502,
      );
    }

    const paymentIntentId =
      typeof session?.payment_intent
        === "object"
        ? text(
            session
              ?.payment_intent
              ?.id,
          )
        : text(
            session
              ?.payment_intent,
          );

    const expiresAt =
      stripeCheckoutExpiry(
        session?.expires_at,
      );

    await db.prepare(`
      UPDATE crm_invoice_payment_attempts
      SET
        provider_checkout_id = ?,
        provider_payment_id = ?,
        status = 'open',
        expires_at = ?,
        metadata_json = ?,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND workspace_id = ?
        AND status = 'created'
    `).bind(
      checkoutId,
      paymentIntentId,
      expiresAt || null,
      JSON.stringify({
        ...baseMetadata,
        checkoutUrl,
      }),
      attemptId,
      workspaceId,
    ).run();

    return {
      checkoutUrl,
      attemptId,
      checkoutId,
      amount,
      currency,
    };

  } catch (error: any) {
    await db.prepare(`
      UPDATE crm_invoice_payment_attempts
      SET
        status = 'failed',
        failure_code =
          'checkout_create_failed',
        failure_message = ?,
        completed_at =
          CURRENT_TIMESTAMP,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND workspace_id = ?
        AND status = 'created'
    `).bind(
      text(
        error?.message,
      ).slice(
        0,
        1000,
      ),
      attemptId,
      workspaceId,
    ).run();

    throw error;
  }
}


function stripeInvoiceEventPaymentIntentId(
  object: any,
) {
  if (
    text(object?.object)
    === "payment_intent"
  ) {
    return text(
      object?.id,
    );
  }

  const value =
    object?.payment_intent;

  if (
    value
    && typeof value === "object"
  ) {
    return text(
      value.id,
    );
  }

  return text(value);
}


function stripeInvoiceEventAmount(
  object: any,
) {
  if (
    text(object?.object)
    === "payment_intent"
  ) {
    return Number(
      object?.amount_received
      ?? object?.amount
      ?? 0,
    );
  }

  return Number(
    object?.amount_total
    ?? object?.amount
    ?? 0,
  );
}


function stripeInvoiceEventCurrency(
  object: any,
) {
  return text(
    object?.currency,
  ).toUpperCase();
}


function invoicePaymentReceiptReference(
  invoiceReferenceInput: unknown,
  paymentIdInput: unknown,
) {
  const invoiceReference =
    text(invoiceReferenceInput)
      .replace(/[^a-z0-9]+/gi, "")
      .toUpperCase()
      .slice(-14)
    || "INVOICE";

  const paymentReference =
    text(paymentIdInput)
      .replace(/^crm_invoice_payment_/i, "")
      .replace(/[^a-z0-9]+/gi, "")
      .toUpperCase()
      .slice(0, 8)
    || "PAYMENT";

  return `RCT-${invoiceReference}-${paymentReference}`
    .slice(0, 80);
}


export async function processStripeInvoicePaymentEvent(
  db: D1Db,
  event: any,
) {
  const eventId =
    text(
      event?.id,
    );

  const eventType =
    text(
      event?.type,
    );

  const accountId =
    text(
      event?.account,
    );

  const object =
    event?.data?.object
    || {};

  if (
    !eventId
    || !eventType
  ) {
    throw httpError(
      "Stripe event is invalid.",
      400,
    );
  }

  const metadata =
    object?.metadata
    && typeof object.metadata
      === "object"
      ? object.metadata
      : {};

  const metadataAttemptId =
    text(
      metadata
        .wedplanned_attempt_id,
    );

  const checkoutId =
    text(
      object?.object,
    ) === "checkout.session"
      ? text(
          object?.id,
        )
      : "";

  const paymentIntentId =
    stripeInvoiceEventPaymentIntentId(
      object,
    );

  /*
   * Resolve the immutable WedCRM attempt using metadata first,
   * then provider identifiers as defensive fallbacks.
   */
  let attempt: any =
    metadataAttemptId
      ? await db.prepare(`
          SELECT *
          FROM crm_invoice_payment_attempts
          WHERE id = ?
            AND provider = 'stripe'
          LIMIT 1
        `).bind(
          metadataAttemptId,
        ).first()
      : null;

  if (
    !attempt
    && checkoutId
  ) {
    attempt =
      await db.prepare(`
        SELECT *
        FROM crm_invoice_payment_attempts
        WHERE provider = 'stripe'
          AND provider_checkout_id = ?
        LIMIT 1
      `).bind(
        checkoutId,
      ).first();
  }

  if (
    !attempt
    && paymentIntentId
  ) {
    attempt =
      await db.prepare(`
        SELECT *
        FROM crm_invoice_payment_attempts
        WHERE provider = 'stripe'
          AND provider_payment_id = ?
        LIMIT 1
      `).bind(
        paymentIntentId,
      ).first();
  }

  /*
   * This endpoint can receive unrelated Connect events.
   * Unknown events are acknowledged and ignored.
   */
  if (!attempt) {
    return {
      processed: false,
      duplicate: false,
      ignored: true,
    };
  }

  const attemptId =
    text(
      attempt.id,
    );

  const workspaceId =
    text(
      attempt.workspace_id,
    );

  const invoiceId =
    text(
      attempt.invoice_id,
    );

  const scheduleItemId =
    text(
      attempt.schedule_item_id,
    );

  const expectedAccountId =
    text(
      attempt.provider_account_id,
    );

  /*
   * Direct-charge events must identify the exact connected
   * Stripe account on which WedPlanned created Checkout.
   */
  if (
    !accountId.startsWith(
      "acct_",
    )
    || accountId
      !== expectedAccountId
  ) {
    return {
      processed: false,
      duplicate: false,
      ignored: false,
      rejected: true,
      attemptId,
      reason:
        "connected_account_mismatch",
    };
  }

  const paidEvent =
    eventType
      === "checkout.session.async_payment_succeeded"
    || eventType
      === "payment_intent.succeeded"
    || (
      eventType
        === "checkout.session.completed"
      && text(
        object?.payment_status,
      ) === "paid"
    );

  const processingEvent =
    eventType
      === "checkout.session.completed"
    && text(
      object?.payment_status,
    ) !== "paid";

  const failedEvent =
    eventType
      === "checkout.session.async_payment_failed"
    || eventType
      === "payment_intent.payment_failed";

  const expiredEvent =
    eventType
      === "checkout.session.expired";

  if (
    !paidEvent
    && !processingEvent
    && !failedEvent
    && !expiredEvent
  ) {
    return {
      processed: false,
      duplicate: false,
      ignored: true,
      attemptId,
    };
  }

  /*
   * Non-terminal asynchronous state.
   */
  if (processingEvent) {
    await db.prepare(`
      UPDATE crm_invoice_payment_attempts
      SET
        status = 'processing',

        provider_checkout_id =
          CASE
            WHEN trim(?) <> ''
              THEN ?
            ELSE provider_checkout_id
          END,

        provider_payment_id =
          CASE
            WHEN trim(?) <> ''
              THEN ?
            ELSE provider_payment_id
          END,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
        AND workspace_id = ?
        AND status NOT IN (
          'succeeded',
          'cancelled'
        )
    `).bind(
      checkoutId,
      checkoutId,

      paymentIntentId,
      paymentIntentId,

      attemptId,
      workspaceId,
    ).run();

    return {
      processed: true,
      duplicate: false,
      ignored: false,
      attemptId,
      status:
        "processing",
    };
  }

  /*
   * Provider terminal failure/expiry must never regress a
   * previously verified successful payment.
   */
  if (
    failedEvent
    || expiredEvent
  ) {
    const status =
      expiredEvent
        ? "expired"
        : "failed";

    await db.prepare(`
      UPDATE crm_invoice_payment_attempts
      SET
        status = ?,

        provider_checkout_id =
          CASE
            WHEN trim(?) <> ''
              THEN ?
            ELSE provider_checkout_id
          END,

        provider_payment_id =
          CASE
            WHEN trim(?) <> ''
              THEN ?
            ELSE provider_payment_id
          END,

        failure_code = ?,

        failure_message = ?,

        completed_at =
          COALESCE(
            completed_at,
            CURRENT_TIMESTAMP
          ),

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
        AND workspace_id = ?
        AND status <> 'succeeded'
    `).bind(
      status,

      checkoutId,
      checkoutId,

      paymentIntentId,
      paymentIntentId,

      eventType,

      text(
        object
          ?.last_payment_error
          ?.message,
      ).slice(
        0,
        1000,
      ),

      attemptId,
      workspaceId,
    ).run();

    return {
      processed: true,
      duplicate: false,
      ignored: false,
      attemptId,
      status,
    };
  }

  /*
   * From here onward the provider says payment succeeded.
   * Verify it exactly against the immutable Checkout attempt.
   */
  const amount =
    stripeInvoiceEventAmount(
      object,
    );

  const currency =
    stripeInvoiceEventCurrency(
      object,
    );

  const expectedAmount =
    Number(
      attempt.amount
      || 0,
    );

  const expectedCurrency =
    text(
      attempt.currency,
    ).toUpperCase();

  if (
    !Number.isInteger(amount)
    || amount !== expectedAmount
    || currency !== expectedCurrency
  ) {
    await db.prepare(`
      UPDATE crm_invoice_payment_attempts
      SET
        status = 'failed',
        failure_code =
          'amount_currency_mismatch',
        failure_message = ?,
        completed_at =
          COALESCE(
            completed_at,
            CURRENT_TIMESTAMP
          ),
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND workspace_id = ?
        AND status <> 'succeeded'
    `).bind(
      `Expected ${expectedAmount} ${expectedCurrency}; Stripe returned ${amount} ${currency || "UNKNOWN"}.`,
      attemptId,
      workspaceId,
    ).run();

    return {
      processed: false,
      duplicate: false,
      ignored: false,
      rejected: true,
      attemptId,
      reason:
        "amount_currency_mismatch",
    };
  }

  const resolvedPaymentIntentId =
    paymentIntentId
    || text(
      attempt.provider_payment_id,
    );

  if (
    !resolvedPaymentIntentId
      .startsWith(
        "pi_",
      )
  ) {
    return {
      processed: false,
      duplicate: false,
      ignored: false,
      rejected: true,
      attemptId,
      reason:
        "payment_intent_missing",
    };
  }

  /*
   * The provider/payment identity is the settlement
   * idempotency boundary. Repeated Checkout + PaymentIntent
   * events must never create a second CRM payment.
   */
  const existingPayment =
    await db.prepare(`
      SELECT
        id,
        reference,
        metadata_json
      FROM crm_invoice_payments
      WHERE workspace_id = ?
        AND provider = 'stripe'
        AND provider_payment_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
      resolvedPaymentIntentId,
    ).first();

  if (existingPayment) {
    await db.prepare(`
      UPDATE crm_invoice_payment_attempts
      SET
        status = 'succeeded',

        provider_checkout_id =
          CASE
            WHEN trim(?) <> ''
              THEN ?
            ELSE provider_checkout_id
          END,

        provider_payment_id = ?,

        failure_code = '',
        failure_message = '',

        completed_at =
          COALESCE(
            completed_at,
            CURRENT_TIMESTAMP
          ),

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
        AND workspace_id = ?
    `).bind(
      checkoutId,
      checkoutId,

      resolvedPaymentIntentId,

      attemptId,
      workspaceId,
    ).run();

    return {
      processed: false,
      duplicate: true,
      ignored: false,
      attemptId,
      workspaceId,
      invoiceId,
      paymentId:
        text(
          existingPayment.id,
        ),
      receiptReference:
        text(
          parseInvoiceAttemptMetadata(
            existingPayment.metadata_json,
          ).receiptReference
          || existingPayment.reference,
        ),
    };
  }

  // A signed payment may arrive after an online reservation has expired.
  // Only our saved booking attempt can reopen its own voided invoice; provider
  // metadata alone cannot select or reopen a different commercial document.
  const bookingAttempt = parseInvoiceAttemptMetadata(attempt.metadata_json);
  const lateBooking = bookingAttempt.source === "online_booking"
    && text(bookingAttempt.calendarEventId).startsWith("ob_")
    && text(bookingAttempt.jobId).startsWith("obj_");
  const invoice: any = await db.prepare(`
    SELECT id, job_id, reference, status, total_amount, currency
    FROM crm_invoices WHERE id = ? AND workspace_id = ?
    AND (status IN ('issued','part_paid','paid') OR
      (status = 'void' AND ? = 1 AND source_id = ? AND job_id = ?))
    LIMIT 1
  `).bind(invoiceId, workspaceId, lateBooking ? 1 : 0,
    text(bookingAttempt.calendarEventId), text(bookingAttempt.jobId)).first();

  if (!invoice) {
    return {
      processed: false,
      duplicate: false,
      ignored: false,
      rejected: true,
      attemptId,
      reason:
        "invoice_unavailable",
    };
  }

  if (
    text(
      invoice.currency,
    ).toUpperCase()
    !== expectedCurrency
  ) {
    return {
      processed: false,
      duplicate: false,
      ignored: false,
      rejected: true,
      attemptId,
      reason:
        "invoice_currency_mismatch",
    };
  }

  /*
   * A scheduled payment must still point to an obligation
   * belonging to this exact invoice/workspace.
   */
  if (scheduleItemId) {
    const scheduleItem =
      await db.prepare(`
        SELECT id
        FROM crm_invoice_schedule_items
        WHERE id = ?
          AND workspace_id = ?
          AND invoice_id = ?
        LIMIT 1
      `).bind(
        scheduleItemId,
        workspaceId,
        invoiceId,
      ).first();

    if (!scheduleItem) {
      return {
        processed: false,
        duplicate: false,
        ignored: false,
        rejected: true,
        attemptId,
        reason:
          "schedule_item_mismatch",
      };
    }
  }

  const paymentId =
    `crm_invoice_payment_${crypto.randomUUID()}`;

  const activityId =
    `crm_activity_${crypto.randomUUID()}`;

  const paidAt =
    new Date().toISOString();

  const receiptReference =
    invoicePaymentReceiptReference(
      invoice.reference,
      paymentId,
    );

  const paymentMetadata = {
    source:
      "stripe_connect_checkout",

    attemptId,

    stripeAccountId:
      expectedAccountId,

    stripeEventId:
      eventId,

    stripeEventType:
      eventType,

    checkoutId,

    paymentIntentId:
      resolvedPaymentIntentId,

    scheduleItemId,

    receiptReference,
  };

  /*
   * INSERT ... WHERE NOT EXISTS gives us a second
   * concurrency-safe idempotency guard in addition to the
   * existing provider/payment uniqueness contract.
   */
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
        ?,
        ?,
        ?,
        'payment',
        ?,
        ?,
        'stripe',
        ?,
        'stripe',
        ?,
        'Stripe Checkout payment',
        NULL,
        '',
        ?,
        CURRENT_TIMESTAMP,
        ?

      WHERE NOT EXISTS (
        SELECT 1
        FROM crm_invoice_payments
        WHERE workspace_id = ?
          AND provider = 'stripe'
          AND provider_payment_id = ?
      )
    `).bind(
      paymentId,
      workspaceId,
      invoiceId,
      scheduleItemId
        || null,

      expectedAmount,
      expectedCurrency,

      receiptReference,
      resolvedPaymentIntentId,

      paidAt,

      JSON.stringify(
        paymentMetadata,
      ),

      workspaceId,
      resolvedPaymentIntentId,
    );

  /*
   * Reuse the existing CRM financial model: invoice status is
   * derived from the append-only net payment ledger.
   */
  const updateInvoice =
    db.prepare(`
      UPDATE crm_invoices
      SET
        status = CASE
          WHEN
            total_amount > 0
            AND COALESCE(
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
            ) >= total_amount
            THEN 'paid'

          WHEN COALESCE(
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
          ) > 0
            THEN 'part_paid'

          ELSE 'issued'
        END,

        paid_at = CASE
          WHEN
            total_amount > 0
            AND COALESCE(
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
            ) >= total_amount
            THEN COALESCE(
              paid_at,
              ?
            )
          ELSE NULL
        END,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
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
      workspaceId,
    );

  const updatedAttemptMetadata = {
    ...parseInvoiceAttemptMetadata(
      attempt.metadata_json,
    ),

    stripeAccountId:
      expectedAccountId,

    stripeEventId:
      eventId,

    stripeEventType:
      eventType,

    checkoutId:
      checkoutId
      || text(
        attempt.provider_checkout_id,
      ),

    paymentIntentId:
      resolvedPaymentIntentId,
  };

  const updateAttempt =
    db.prepare(`
      UPDATE crm_invoice_payment_attempts
      SET
        status = 'succeeded',

        provider_checkout_id =
          CASE
            WHEN trim(?) <> ''
              THEN ?
            ELSE provider_checkout_id
          END,

        provider_payment_id = ?,

        failure_code = '',
        failure_message = '',

        completed_at =
          COALESCE(
            completed_at,
            CURRENT_TIMESTAMP
          ),

        metadata_json = ?,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
        AND workspace_id = ?
    `).bind(
      checkoutId,
      checkoutId,

      resolvedPaymentIntentId,

      JSON.stringify(
        updatedAttemptMetadata,
      ),

      attemptId,
      workspaceId,
    );

  /*
   * Activity exists only when this invocation actually owns
   * the newly inserted CRM payment.
   */
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
        'invoice.payment_recorded',
        ?,
        NULL,
        '',
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
      text(
        invoice.job_id,
      ),

      `Stripe payment received for invoice ${text(invoice.reference)}.`,

      JSON.stringify({
        invoiceId,
        paymentId,
        amount:
          expectedAmount,
        currency:
          expectedCurrency,
        method:
          "stripe",
        provider:
          "stripe",
        providerPaymentId:
          resolvedPaymentIntentId,
        scheduleItemId,
        stripeAccountId:
          expectedAccountId,
      }),

      paymentId,
      workspaceId,
    );

  const reopenBookingInvoice = lateBooking && invoice.status === "void" ? [
    db.prepare(`UPDATE crm_invoices SET status='issued',voided_at=NULL,
      updated_at=CURRENT_TIMESTAMP WHERE id=? AND workspace_id=? AND status='void'
      AND source_id=? AND job_id=?`).bind(invoiceId,workspaceId,
        text(bookingAttempt.calendarEventId),text(bookingAttempt.jobId)),
  ] : [];
  const results =
    await db.batch([
      ...reopenBookingInvoice,
      insertPayment,
      updateInvoice,
      updateAttempt,
      recordActivity,
    ]);

  const inserted =
    Number(
      results?.[reopenBookingInvoice.length]
        ?.meta
        ?.changes
      || 0,
    );

  /*
   * A concurrent delivery may have inserted the same provider
   * payment between our pre-check and batch. The attempt still
   * ends succeeded, but this invocation is reported duplicate.
   */
  if (inserted !== 1) {
    const repeated =
      await db.prepare(`
        SELECT
          id,
          reference,
          metadata_json
        FROM crm_invoice_payments
        WHERE workspace_id = ?
          AND provider = 'stripe'
          AND provider_payment_id = ?
        LIMIT 1
      `).bind(
        workspaceId,
        resolvedPaymentIntentId,
      ).first();

    if (repeated) {
      return {
        processed: false,
        duplicate: true,
        ignored: false,
        attemptId,
        workspaceId,
        invoiceId,
        paymentId:
          text(
            repeated.id,
          ),
        receiptReference:
          text(
            parseInvoiceAttemptMetadata(
              repeated.metadata_json,
            ).receiptReference
            || repeated.reference,
          ),
      };
    }

    throw httpError(
      "Stripe payment could not be reconciled to the CRM ledger.",
      409,
    );
  }

  return {
    processed: true,
    duplicate: false,
    ignored: false,
    attemptId,
    workspaceId,
    invoiceId,
    jobId:
      text(invoice.job_id),
    invoiceReference:
      text(invoice.reference),
    paymentId,
    receiptReference,
    paidAt,
    amount:
      expectedAmount,
    currency:
      expectedCurrency,
  };
}
