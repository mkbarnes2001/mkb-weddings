import {
  saveGoogleEmailCredential,
  type CrmEmailSettingsActor,
  type CrmEmailSettingsEnv,
} from "./crm-email-settings-d1";

type D1Db = any;

export type CrmGoogleOAuthActor =
  CrmEmailSettingsActor & {
    authenticated?: boolean;
    mode?: string;
    membershipId?: string;
    businessName?: string;
  };

export type CrmGoogleOAuthEnv =
  CrmEmailSettingsEnv & {
    CRM_GOOGLE_CLIENT_ID?: string;
    CRM_GOOGLE_CLIENT_SECRET?: string;
    CRM_GOOGLE_REDIRECT_ORIGIN?: string;
  };

const GOOGLE_AUTHORIZATION_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GOOGLE_USERINFO_URL =
  "https://openidconnect.googleapis.com/v1/userinfo";

const GOOGLE_SEND_SCOPE =
  "https://www.googleapis.com/auth/gmail.send";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  GOOGLE_SEND_SCOPE,
];

const OAUTH_STATE_TTL_MS =
  10 * 60 * 1000;

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
  return text(value)
    .toLowerCase();
}

function httpError(
  message: string,
  statusCode = 400,
) {
  const error =
    new Error(message) as Error & {
      statusCode?: number;
    };

  error.statusCode =
    statusCode;

  return error;
}

function requireGoogleActor(
  actor: CrmGoogleOAuthActor,
) {
  if (
    !actor.authenticated
    || actor.mode !== "session"
    || actor.accessMode
      !== "membership"
    || !text(actor.userId)
    || !text(actor.membershipId)
    || !text(actor.workspaceId)
  ) {
    throw httpError(
      "A signed-in workspace membership is required to connect Google email.",
      403,
    );
  }

  if (
    !(actor.permissions || [])
      .includes("crm:manage")
  ) {
    throw httpError(
      "Missing permission: crm:manage.",
      403,
    );
  }
}

function googleClientConfig(
  env: CrmGoogleOAuthEnv,
) {
  const clientId =
    text(
      env.CRM_GOOGLE_CLIENT_ID,
    );

  const clientSecret =
    text(
      env.CRM_GOOGLE_CLIENT_SECRET,
    );

  if (
    !clientId
    || !clientSecret
  ) {
    throw httpError(
      "Google email connection is not configured on this deployment.",
      503,
    );
  }

  return {
    clientId,
    clientSecret,
  };
}

function googleRedirectOrigin(
  env: CrmGoogleOAuthEnv,
  requestUrl: string,
) {
  const configured =
    text(
      env.CRM_GOOGLE_REDIRECT_ORIGIN,
    );

  const raw =
    configured
    || new URL(
      requestUrl,
    ).origin;

  let url: URL;

  try {
    url =
      new URL(raw);
  } catch {
    throw httpError(
      "Google OAuth redirect origin is invalid.",
      500,
    );
  }

  if (
    url.protocol !== "https:"
    && url.hostname
      !== "localhost"
  ) {
    throw httpError(
      "Google OAuth redirect origin must use HTTPS.",
      500,
    );
  }

  return url.origin;
}

function googleRedirectUri(
  env: CrmGoogleOAuthEnv,
  requestUrl: string,
) {
  return (
    googleRedirectOrigin(
      env,
      requestUrl,
    )
    + "/api/crm/email/providers/google/callback"
  );
}

function bytesToBase64Url(
  bytes: Uint8Array,
) {
  let binary = "";

  for (
    const byte
    of bytes
  ) {
    binary +=
      String.fromCharCode(
        byte,
      );
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(
  value: string,
) {
  const normalised =
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const padded =
    normalised
    + "=".repeat(
      (
        4
        - normalised.length % 4
      ) % 4,
    );

  const binary =
    atob(padded);

  const bytes =
    new Uint8Array(
      binary.length,
    );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index,
      );
  }

  return bytes;
}

async function oauthStateKey(
  env: CrmGoogleOAuthEnv,
) {
  const {
    clientSecret,
  } =
    googleClientConfig(env);

  const material =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder()
        .encode(
          `wedplanned-google-oauth-state:${clientSecret}`,
        ),
    );

  return crypto.subtle.importKey(
    "raw",
    material,
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    [
      "sign",
      "verify",
    ],
  );
}

type GoogleOAuthState = {
  version: 1;
  userId: string;
  membershipId: string;
  workspaceId: string;
  redirectUri: string;
  nonce: string;
  expiresAt: number;
};

async function createOAuthState(
  env: CrmGoogleOAuthEnv,
  actor: CrmGoogleOAuthActor,
  redirectUri: string,
) {
  const payload:
    GoogleOAuthState = {
      version: 1,
      userId:
        text(actor.userId),
      membershipId:
        text(actor.membershipId),
      workspaceId:
        text(actor.workspaceId),
      redirectUri,
      nonce:
        crypto.randomUUID(),
      expiresAt:
        Date.now()
        + OAUTH_STATE_TTL_MS,
    };

  const payloadPart =
    bytesToBase64Url(
      new TextEncoder()
        .encode(
          JSON.stringify(
            payload,
          ),
        ),
    );

  const key =
    await oauthStateKey(env);

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder()
        .encode(payloadPart),
    );

  return (
    payloadPart
    + "."
    + bytesToBase64Url(
      new Uint8Array(
        signature,
      ),
    )
  );
}

async function verifyOAuthState(
  env: CrmGoogleOAuthEnv,
  actor: CrmGoogleOAuthActor,
  stateInput: unknown,
  redirectUri: string,
) {
  const state =
    text(stateInput);

  const [
    payloadPart,
    signaturePart,
    ...extra
  ] = state.split(".");

  if (
    !payloadPart
    || !signaturePart
    || extra.length
  ) {
    throw httpError(
      "Google connection state is invalid.",
      400,
    );
  }

  let signature:
    Uint8Array;

  let payload:
    GoogleOAuthState;

  try {
    signature =
      base64UrlToBytes(
        signaturePart,
      );

    payload =
      JSON.parse(
        new TextDecoder()
          .decode(
            base64UrlToBytes(
              payloadPart,
            ),
          ),
      );
  } catch {
    throw httpError(
      "Google connection state is invalid.",
      400,
    );
  }

  const key =
    await oauthStateKey(env);

  const validSignature =
    await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder()
        .encode(payloadPart),
    );

  if (!validSignature) {
    throw httpError(
      "Google connection state could not be verified.",
      403,
    );
  }

  if (
    payload.version !== 1
    || !payload.expiresAt
    || payload.expiresAt
      < Date.now()
  ) {
    throw httpError(
      "Google connection state has expired.",
      403,
    );
  }

  if (
    text(payload.userId)
      !== text(actor.userId)
    || text(
      payload.membershipId,
    ) !== text(
      actor.membershipId,
    )
    || text(
      payload.workspaceId,
    ) !== text(
      actor.workspaceId,
    )
    || text(
      payload.redirectUri,
    ) !== redirectUri
  ) {
    throw httpError(
      "Google connection state does not match the active workspace session.",
      403,
    );
  }

  return payload;
}

async function exchangeGoogleCode(
  env: CrmGoogleOAuthEnv,
  code: string,
  redirectUri: string,
) {
  const {
    clientId,
    clientSecret,
  } =
    googleClientConfig(env);

  const response =
    await fetch(
      GOOGLE_TOKEN_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          new URLSearchParams({
            code,
            client_id:
              clientId,
            client_secret:
              clientSecret,
            redirect_uri:
              redirectUri,
            grant_type:
              "authorization_code",
          }).toString(),
      },
    );

  const payload:
    any =
      await response
        .json()
        .catch(() => ({}));

  if (!response.ok) {
    throw httpError(
      text(
        payload?.error_description
        || payload?.error
        || "Google rejected the authorization code.",
      ),
      502,
    );
  }

  const accessToken =
    text(
      payload?.access_token,
    );

  const refreshToken =
    text(
      payload?.refresh_token,
    );

  if (
    !accessToken
    || !refreshToken
  ) {
    throw httpError(
      "Google did not return the offline credentials required for CRM email delivery. Reconnect and approve access again.",
      409,
    );
  }

  return {
    accessToken,
    refreshToken,
    scope:
      text(payload?.scope),
  };
}

async function googleUserEmail(
  accessToken: string,
) {
  const response =
    await fetch(
      GOOGLE_USERINFO_URL,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    );

  const profile:
    any =
      await response
        .json()
        .catch(() => ({}));

  if (!response.ok) {
    throw httpError(
      "Google account details could not be verified.",
      502,
    );
  }

  const email =
    lower(
      profile?.email,
    );

  if (
    !email
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(email)
    || profile?.email_verified
      === false
  ) {
    throw httpError(
      "Google did not return a verified account email address.",
      409,
    );
  }

  return email;
}

export async function beginGoogleEmailOAuth(
  env: CrmGoogleOAuthEnv,
  actor: CrmGoogleOAuthActor,
  requestUrl: string,
) {
  requireGoogleActor(actor);

  const {
    clientId,
  } =
    googleClientConfig(env);

  const redirectUri =
    googleRedirectUri(
      env,
      requestUrl,
    );

  const state =
    await createOAuthState(
      env,
      actor,
      redirectUri,
    );

  const params =
    new URLSearchParams({
      client_id:
        clientId,
      redirect_uri:
        redirectUri,
      response_type:
        "code",
      scope:
        GOOGLE_SCOPES.join(" "),
      access_type:
        "offline",
      prompt:
        "consent",
      include_granted_scopes:
        "true",
      state,
    });

  return {
    authorizationUrl:
      `${GOOGLE_AUTHORIZATION_URL}?${params.toString()}`,
    redirectUri,
  };
}

export async function completeGoogleEmailOAuth(
  db: D1Db,
  env: CrmGoogleOAuthEnv,
  actor: CrmGoogleOAuthActor,
  requestUrl: string,
) {
  requireGoogleActor(actor);

  const url =
    new URL(
      requestUrl,
    );

  const providerError =
    text(
      url.searchParams
        .get("error"),
    );

  if (providerError) {
    throw httpError(
      providerError
        === "access_denied"
        ? "Google email connection was cancelled."
        : "Google could not complete the email connection.",
      400,
    );
  }

  const code =
    text(
      url.searchParams
        .get("code"),
    );

  const state =
    text(
      url.searchParams
        .get("state"),
    );

  if (
    !code
    || !state
  ) {
    throw httpError(
      "Google connection callback is incomplete.",
      400,
    );
  }

  const redirectUri =
    googleRedirectUri(
      env,
      requestUrl,
    );

  await verifyOAuthState(
    env,
    actor,
    state,
    redirectUri,
  );

  const tokens =
    await exchangeGoogleCode(
      env,
      code,
      redirectUri,
    );

  const email =
    await googleUserEmail(
      tokens.accessToken,
    );

  const settings =
    await saveGoogleEmailCredential(
      db,
      env,
      actor,
      {
        refreshToken:
          tokens.refreshToken,
        email,
        scope:
          tokens.scope,
      },
    );

  return {
    email,
    settings,
  };
}
