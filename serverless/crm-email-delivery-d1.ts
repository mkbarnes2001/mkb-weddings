import { connect } from "cloudflare:sockets";
import {
  getCrmEmailSettings,
  getDecryptedCrmEmailCredential,
  type CrmEmailSettingsActor,
  type CrmEmailSettingsEnv,
} from "./crm-email-settings-d1";

type D1Db = any;

export type CrmEmailDeliveryActor =
  CrmEmailSettingsActor & {
    businessName?: string;
  };

export type CrmEmailDeliveryEnv =
  CrmEmailSettingsEnv & {
    RESEND_API_KEY?: string;
    WEDPLANNED_AUTH_FROM_EMAIL?: string;
    WEDPLANNED_AUTH_FROM_NAME?: string;
    CRM_GOOGLE_CLIENT_ID?: string;
    CRM_GOOGLE_CLIENT_SECRET?: string;
  };

export type CrmEmailDeliveryInput = {
  to: string;
  subject: string;
  body: string;
  businessName?: string;
  trackingPixelUrl?: string;
  idempotencyKey?: string;
  prepareRequest?: (transport: string, body: string, accountIdentity: string) => Promise<string>;
};

export type CrmEmailDeliveryResult = {
  provider:
    "resend" | "gmail" | "smtp";
  providerMessageId: string;
  deliveryMode:
    "managed" | "google" | "smtp";
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
};

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GMAIL_SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

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

function validEmail(
  value: unknown,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(
      lower(value),
    );
}

function safeHeader(
  value: unknown,
) {
  return text(value)
    .replace(
      /[\r\n]+/g,
      " ",
    );
}

function bytesToBase64(
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

  return btoa(binary);
}

function utf8Base64(
  value: string,
) {
  return bytesToBase64(
    new TextEncoder()
      .encode(value),
  );
}

function base64Url(
  value: string,
) {
  return utf8Base64(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function wrapBase64(
  value: string,
) {
  return (
    value.match(
      /.{1,76}/g,
    )
    || []
  ).join("\r\n");
}

function encodedWord(
  value: unknown,
) {
  const clean =
    safeHeader(value);

  return clean
    ? `=?UTF-8?B?${utf8Base64(clean)}?=`
    : "";
}

function escapeHtml(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlFromText(
  body: string,
) {
  return body
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

function trackingPixelHtml(
  value: unknown,
) {
  const url =
    text(value);

  if (
    !/^https:\/\//i.test(url)
  ) {
    return "";
  }

  return `<img src="${escapeHtml(url)}" width="1" height="1" alt="" aria-hidden="true" style="display:block;width:1px;height:1px;border:0;opacity:0" />`;
}

function mimeMessage(
  input: {
    to: string;
    fromName: string;
    fromEmail: string;
    replyToEmail: string;
    subject: string;
    body: string;
    trackingPixelUrl?: string;
  },
) {
  const to =
    lower(input.to);

  const fromEmail =
    lower(input.fromEmail);

  const replyToEmail =
    lower(input.replyToEmail);

  if (
    !validEmail(to)
    || !validEmail(fromEmail)
  ) {
    throw httpError(
      "CRM email sender or recipient is invalid.",
      409,
    );
  }

  if (
    replyToEmail
    && !validEmail(
      replyToEmail,
    )
  ) {
    throw httpError(
      "CRM reply-to email address is invalid.",
      409,
    );
  }

  const boundary =
    `wedplanned_${crypto.randomUUID().replace(/-/g, "")}`;

  const plainPart =
    wrapBase64(
      utf8Base64(
        input.body,
      ),
    );

  const html =
    `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#181818;max-width:620px;margin:auto">${htmlFromText(input.body)}</div>${trackingPixelHtml(input.trackingPixelUrl)}`;

  const htmlPart =
    wrapBase64(
      utf8Base64(
        html,
      ),
    );

  const fromName =
    encodedWord(
      input.fromName
      || "WedPlanned",
    );

  const headers = [
    `To: ${to}`,
    `From: ${fromName} <${fromEmail}>`,
    ...(replyToEmail
      ? [
          `Reply-To: ${replyToEmail}`,
        ]
      : []),
    `Subject: ${encodedWord(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  const parts = [
    ...headers,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    plainPart,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    htmlPart,
    `--${boundary}--`,
    "",
  ];

  return parts.join(
    "\r\n",
  );
}

export function crmEmailDeliveryReadiness(
  settings: any,
  env: CrmEmailDeliveryEnv,
  businessNameInput = "WedPlanned",
) {
  const deliveryMode =
    text(
      settings?.deliveryMode
      || "managed",
    );

  const businessName =
    text(
      businessNameInput
      || "WedPlanned",
    );

  const fromName =
    text(
      settings?.senderName
      || businessName,
    );

  const replyToEmail =
    lower(
      settings?.replyToEmail
      || settings?.senderEmail,
    );

  if (
    deliveryMode === "google"
  ) {
    const fromEmail =
      lower(
        settings?.googleEmail,
      );

    const clientConfigured =
      Boolean(
        text(
          env.CRM_GOOGLE_CLIENT_ID,
        ),
      )
      && Boolean(
        text(
          env.CRM_GOOGLE_CLIENT_SECRET,
        ),
      );

    const credentialEncryptionConfigured =
      text(
        env.CRM_EMAIL_CREDENTIAL_KEY,
      ).length >= 32;

    const deliveryReady =
      Boolean(
        settings?.googleConnected,
      )
      && validEmail(
        fromEmail,
      )
      && clientConfigured
      && credentialEncryptionConfigured;

    let deliveryIssue = "";

    if (
      !settings?.googleConnected
      || !validEmail(fromEmail)
    ) {
      deliveryIssue =
        "Connect a Google account before using Google / Gmail delivery.";
    } else if (
      !clientConfigured
    ) {
      deliveryIssue =
        "Google email delivery is not configured on this deployment.";
    } else if (
      !credentialEncryptionConfigured
    ) {
      deliveryIssue =
        "CRM email credential encryption is not configured on this deployment.";
    }

    return {
      deliveryMode:
        "google" as const,
      provider:
        "gmail" as const,
      providerLabel:
        "Google / Gmail",
      fromName,
      fromEmail,
      replyToEmail,
      deliveryReady,
      deliveryIssue,
    };
  }

  if (
    deliveryMode === "smtp"
  ) {
    const smtpHost =
      lower(
        settings?.smtpHost,
      );

    const smtpPort =
      Number(
        settings?.smtpPort
        || 587,
      );

    const smtpSecurity =
      text(
        settings?.smtpSecurity
        || "starttls",
      );

    const smtpUsername =
      text(
        settings?.smtpUsername,
      );

    const fromEmail =
      lower(
        settings?.senderEmail
        || smtpUsername,
      );

    const credentialEncryptionConfigured =
      text(
        env.CRM_EMAIL_CREDENTIAL_KEY,
      ).length >= 32;

    const validHost =
      Boolean(
        smtpHost,
      )
      && /^[a-z0-9.-]+$/i
        .test(
          smtpHost,
        );

    const validPort =
      Number.isInteger(
        smtpPort,
      )
      && smtpPort > 0
      && smtpPort <= 65535
      && smtpPort !== 25;

    const validSecurity =
      smtpSecurity === "tls"
      || smtpSecurity === "starttls";

    const deliveryReady =
      Boolean(
        settings?.smtpCredentialConfigured,
      )
      && validHost
      && validPort
      && validSecurity
      && Boolean(
        smtpUsername,
      )
      && validEmail(
        fromEmail,
      )
      && credentialEncryptionConfigured;

    let deliveryIssue = "";

    if (
      smtpPort === 25
    ) {
      deliveryIssue =
        "SMTP port 25 is not supported by the Cloudflare Workers runtime. Use your provider's submission port, normally 465 or 587.";
    } else if (
      !settings?.smtpCredentialConfigured
    ) {
      deliveryIssue =
        "Save SMTP credentials before using Custom SMTP delivery.";
    } else if (
      !validHost
    ) {
      deliveryIssue =
        "Enter a valid SMTP hostname.";
    } else if (
      !validPort
    ) {
      deliveryIssue =
        "Enter a valid SMTP submission port.";
    } else if (
      !validSecurity
    ) {
      deliveryIssue =
        "Choose TLS or STARTTLS for Custom SMTP delivery.";
    } else if (
      !smtpUsername
    ) {
      deliveryIssue =
        "Enter an SMTP username.";
    } else if (
      !validEmail(fromEmail)
    ) {
      deliveryIssue =
        "Enter a valid CRM sender email address for Custom SMTP delivery.";
    } else if (
      !credentialEncryptionConfigured
    ) {
      deliveryIssue =
        "CRM email credential encryption is not configured on this deployment.";
    }

    return {
      deliveryMode:
        "smtp" as const,
      provider:
        "smtp" as const,
      providerLabel:
        "Custom SMTP",
      fromName,
      fromEmail,
      replyToEmail,
      deliveryReady,
      deliveryIssue,
      smtpHost,
      smtpPort,
      smtpSecurity:
        smtpSecurity as
          "tls" | "starttls",
      smtpUsername,
    };
  }

  const fromEmail =
    lower(
      env.WEDPLANNED_AUTH_FROM_EMAIL,
    );

  const deliveryReady =
    Boolean(
      text(env.RESEND_API_KEY),
    )
    && validEmail(
      fromEmail,
    );

  return {
    deliveryMode:
      "managed" as const,
    provider:
      "resend" as const,
    providerLabel:
      "Managed by WedPlanned",
    fromName,
    fromEmail,
    replyToEmail,
    deliveryReady,
    deliveryIssue:
      deliveryReady
        ? ""
        : "Managed WedPlanned email delivery is not configured on this deployment.",
  };
}

async function sendManagedEmail(
  env: CrmEmailDeliveryEnv,
  input: {
    to: string;
    fromName: string;
    fromEmail: string;
    replyToEmail: string;
    subject: string;
    body: string;
    trackingPixelUrl?: string;
    idempotencyKey?: string;
    prepareRequest?: (transport: string, body: string, accountIdentity: string) => Promise<string>;
  },
) {
  const apiKey =
    text(
      env.RESEND_API_KEY,
    );

  if (
    !apiKey
    || !validEmail(
      input.fromEmail,
    )
  ) {
    throw httpError(
      "Managed WedPlanned CRM email delivery is not configured.",
      500,
    );
  }

  const candidateBody = JSON.stringify({
  from:
    `${safeHeader(input.fromName || "WedPlanned")} <${lower(input.fromEmail)}>`,
  to: [
    lower(input.to),
  ],
  subject:
    safeHeader(
      input.subject,
    ),
  html:
    `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#181818;max-width:620px;margin:auto">${htmlFromText(input.body)}</div>${trackingPixelHtml(input.trackingPixelUrl)}`,
  text:
    input.body,
  ...(input.replyToEmail
    ? {
        reply_to:
          lower(
            input.replyToEmail,
          ),
      }
    : {}),
});
  const requestBody = input.prepareRequest
    ? await input.prepareRequest("resend", candidateBody, apiKey)
    : candidateBody;

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body:
          requestBody,
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
        payload?.message
        || payload?.error
        || `Email provider returned ${response.status}.`,
      ),
      502,
    );
  }

  return text(
    payload?.id,
  );
}

async function googleAccessToken(
  env: CrmEmailDeliveryEnv,
  refreshToken: string,
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
    || !refreshToken
  ) {
    throw httpError(
      "Google email delivery credentials are incomplete.",
      500,
    );
  }

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
            client_id:
              clientId,
            client_secret:
              clientSecret,
            refresh_token:
              refreshToken,
            grant_type:
              "refresh_token",
          }).toString(),
      },
    );

  const payload:
    any =
      await response
        .json()
        .catch(() => ({}));

  if (!response.ok) {
    const code =
      text(
        payload?.error,
      );

    throw httpError(
      code === "invalid_grant"
        ? "Google email authorization is no longer valid. Reconnect the Google account in Email settings."
        : text(
            payload?.error_description
            || payload?.error
            || "Google could not refresh email authorization.",
          ),
      code === "invalid_grant"
        ? 409
        : 502,
    );
  }

  const accessToken =
    text(
      payload?.access_token,
    );

  if (!accessToken) {
    throw httpError(
      "Google did not return an email access token.",
      502,
    );
  }

  return accessToken;
}

async function sendGoogleEmail(
  db: D1Db,
  env: CrmEmailDeliveryEnv,
  actor: CrmEmailDeliveryActor,
  input: {
    to: string;
    fromName: string;
    fromEmail: string;
    replyToEmail: string;
    subject: string;
    body: string;
    trackingPixelUrl?: string;
  },
) {
  const credential =
    await getDecryptedCrmEmailCredential(
      db,
      env,
      actor,
      "google",
    );

  const refreshToken =
    text(
      credential
        ?.payload
        ?.refreshToken,
    );

  if (!refreshToken) {
    throw httpError(
      "Google email authorization is unavailable. Reconnect the Google account in Email settings.",
      409,
    );
  }

  const credentialEmail =
    lower(
      credential
        ?.metadata
        ?.email,
    );

  if (
    credentialEmail
    && credentialEmail
      !== lower(
        input.fromEmail,
      )
  ) {
    throw httpError(
      "The connected Google account does not match the configured CRM sender. Reconnect Google email.",
      409,
    );
  }

  const accessToken =
    await googleAccessToken(
      env,
      refreshToken,
    );

  const raw =
    base64Url(
      mimeMessage(
        input,
      ),
    );

  const response =
    await fetch(
      GMAIL_SEND_URL,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json",
        },
        body:
          JSON.stringify({
            raw,
          }),
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
        payload?.error
          ?.message
        || payload?.error
        || `Gmail returned ${response.status}.`,
      ),
      502,
    );
  }

  const messageId =
    text(
      payload?.id,
    );

  if (!messageId) {
    throw httpError(
      "Gmail accepted the request but did not return a message identifier.",
      502,
    );
  }

  return messageId;
}

type SmtpResponse = {
  code: number;
  lines: string[];
  text: string;
};

function smtpError(
  action: string,
  response: SmtpResponse,
) {
  return httpError(
    `SMTP ${action} failed: ${safeHeader(response.text).slice(0, 500)}`,
    502,
  );
}

function smtpSession(
  socket: any,
) {
  const reader =
    socket.readable
      .getReader();

  const writer =
    socket.writable
      .getWriter();

  const decoder =
    new TextDecoder();

  const encoder =
    new TextEncoder();

  let buffer = "";

  async function readLine() {
    while (
      !buffer.includes("\n")
    ) {
      const result =
        await reader.read();

      if (
        result.done
      ) {
        throw httpError(
          "SMTP server closed the connection unexpectedly.",
          502,
        );
      }

      buffer +=
        decoder.decode(
          result.value,
          {
            stream: true,
          },
        );
    }

    const index =
      buffer.indexOf("\n");

    const line =
      buffer
        .slice(
          0,
          index + 1,
        )
        .replace(
          /\r?\n$/,
          "",
        );

    buffer =
      buffer.slice(
        index + 1,
      );

    return line;
  }

  async function readResponse():
    Promise<SmtpResponse> {
    const first =
      await readLine();

    if (
      !/^\d{3}[ -]/.test(
        first,
      )
    ) {
      throw httpError(
        `SMTP server returned an invalid response: ${safeHeader(first).slice(0, 300)}`,
        502,
      );
    }

    const code =
      Number(
        first.slice(
          0,
          3,
        ),
      );

    const lines = [
      first,
    ];

    if (
      first.charAt(3)
      === "-"
    ) {
      const terminator =
        `${code} `;

      while (true) {
        const line =
          await readLine();

        lines.push(
          line,
        );

        if (
          line.startsWith(
            terminator,
          )
        ) {
          break;
        }

        if (
          lines.length > 100
        ) {
          throw httpError(
            "SMTP server returned too many response lines.",
            502,
          );
        }
      }
    }

    return {
      code,
      lines,
      text:
        lines.join(" | "),
    };
  }

  function expect(
    response: SmtpResponse,
    codes: number[],
    action: string,
  ) {
    if (
      !codes.includes(
        response.code,
      )
    ) {
      throw smtpError(
        action,
        response,
      );
    }

    return response;
  }

  async function write(
    value: string,
  ) {
    await writer.write(
      encoder.encode(
        value,
      ),
    );
  }

  async function command(
    value: string,
    codes: number[],
    action: string,
  ) {
    await write(
      `${value}\r\n`,
    );

    return expect(
      await readResponse(),
      codes,
      action,
    );
  }

  function release() {
    try {
      reader.releaseLock();
    } catch {
      // Connection may already be closed.
    }

    try {
      writer.releaseLock();
    } catch {
      // Connection may already be closed.
    }
  }

  return {
    command,
    expect,
    readResponse,
    write,
    release,
  };
}

function smtpAuthMechanisms(
  response: SmtpResponse,
) {
  const mechanisms =
    new Set<string>();

  for (
    const rawLine
    of response.lines
  ) {
    const line =
      rawLine
        .replace(
          /^\d{3}[ -]/,
          "",
        )
        .trim();

    const match =
      line.match(
        /^AUTH(?:=|\s+)(.+)$/i,
      );

    if (!match) {
      continue;
    }

    for (
      const mechanism
      of match[1]
        .split(/\s+/)
        .map(
          (value) =>
            value
              .trim()
              .toUpperCase(),
        )
        .filter(Boolean)
    ) {
      mechanisms.add(
        mechanism,
      );
    }
  }

  return mechanisms;
}

function smtpSupportsStartTls(
  response: SmtpResponse,
) {
  return response.lines
    .some(
      (line) =>
        /^250[- ]STARTTLS(?:\s|$)/i
          .test(line),
    );
}

function smtpDotStuff(
  value: string,
) {
  return value
    .split("\r\n")
    .map(
      (line) =>
        line.startsWith(".")
          ? `.${line}`
          : line,
    )
    .join("\r\n");
}

function smtpDataPayload(
  value: string,
) {
  const stuffed =
    smtpDotStuff(
      value,
    );

  return stuffed.endsWith(
    "\r\n",
  )
    ? `${stuffed}.\r\n`
    : `${stuffed}\r\n.\r\n`;
}

async function smtpAuthenticate(
  session: ReturnType<
    typeof smtpSession
  >,
  ehlo: SmtpResponse,
  username: string,
  password: string,
) {
  const mechanisms =
    smtpAuthMechanisms(
      ehlo,
    );

  if (
    mechanisms.has(
      "PLAIN",
    )
  ) {
    const payload =
      utf8Base64(
        `\u0000${username}\u0000${password}`,
      );

    await session.command(
      `AUTH PLAIN ${payload}`,
      [
        235,
        503,
      ],
      "authentication",
    );

    return;
  }

  if (
    mechanisms.has(
      "LOGIN",
    )
  ) {
    await session.command(
      "AUTH LOGIN",
      [
        334,
      ],
      "authentication",
    );

    await session.command(
      utf8Base64(
        username,
      ),
      [
        334,
      ],
      "authentication username",
    );

    await session.command(
      utf8Base64(
        password,
      ),
      [
        235,
        503,
      ],
      "authentication password",
    );

    return;
  }

  throw httpError(
    "The SMTP server does not advertise AUTH PLAIN or AUTH LOGIN after TLS negotiation.",
    409,
  );
}

async function sendSmtpEmail(
  db: D1Db,
  env: CrmEmailDeliveryEnv,
  actor: CrmEmailDeliveryActor,
  input: {
    to: string;
    fromName: string;
    fromEmail: string;
    replyToEmail: string;
    subject: string;
    body: string;
    trackingPixelUrl?: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecurity:
      "tls" | "starttls";
    smtpUsername: string;
  },
) {
  if (
    input.smtpPort === 25
  ) {
    throw httpError(
      "SMTP port 25 is not supported by the Cloudflare Workers runtime. Use your provider's submission port, normally 465 or 587.",
      409,
    );
  }

  if (
    !/^[a-z0-9.-]+$/i
      .test(
        input.smtpHost,
      )
  ) {
    throw httpError(
      "Enter a valid SMTP hostname.",
      409,
    );
  }

  if (
    !Number.isInteger(
      input.smtpPort,
    )
    || input.smtpPort <= 0
    || input.smtpPort > 65535
  ) {
    throw httpError(
      "Enter a valid SMTP submission port.",
      409,
    );
  }

  const credential =
    await getDecryptedCrmEmailCredential(
      db,
      env,
      actor,
      "smtp",
    );

  const password =
    text(
      credential
        ?.payload
        ?.password,
    );

  if (!password) {
    throw httpError(
      "SMTP credentials are unavailable. Save the SMTP password again in Email settings.",
      409,
    );
  }

  const username =
    text(
      input.smtpUsername,
    );

  if (!username) {
    throw httpError(
      "SMTP username is unavailable.",
      409,
    );
  }

  let socket: any = null;
  let session:
    ReturnType<
      typeof smtpSession
    >
    | null = null;

  try {
    socket =
      connect(
        {
          hostname:
            input.smtpHost,
          port:
            input.smtpPort,
        },
        {
          secureTransport:
            input.smtpSecurity
              === "tls"
              ? "on"
              : "starttls",
        },
      );

    await socket.opened;

    session =
      smtpSession(
        socket,
      );

    session.expect(
      await session
        .readResponse(),
      [
        220,
      ],
      "greeting",
    );

    let ehlo =
      await session.command(
        "EHLO wedplanned.com",
        [
          250,
        ],
        "EHLO",
      );

    if (
      input.smtpSecurity
      === "starttls"
    ) {
      if (
        !smtpSupportsStartTls(
          ehlo,
        )
      ) {
        throw httpError(
          "The SMTP server does not advertise STARTTLS.",
          409,
        );
      }

      await session.command(
        "STARTTLS",
        [
          220,
        ],
        "STARTTLS",
      );

      session.release();

      socket =
        socket.startTls();

      await socket.opened;

      session =
        smtpSession(
          socket,
        );

      ehlo =
        await session.command(
          "EHLO wedplanned.com",
          [
            250,
          ],
          "EHLO after STARTTLS",
        );
    }

    await smtpAuthenticate(
      session,
      ehlo,
      username,
      password,
    );

    await session.command(
      `MAIL FROM:<${lower(input.fromEmail)}>`,
      [
        250,
      ],
      "MAIL FROM",
    );

    await session.command(
      `RCPT TO:<${lower(input.to)}>`,
      [
        250,
        251,
      ],
      "RCPT TO",
    );

    await session.command(
      "DATA",
      [
        354,
      ],
      "DATA",
    );

    const message =
      mimeMessage({
        to:
          input.to,
        fromName:
          input.fromName,
        fromEmail:
          input.fromEmail,
        replyToEmail:
          input.replyToEmail,
        subject:
          input.subject,
        body:
          input.body,
        trackingPixelUrl:
          input.trackingPixelUrl,
      });

    await session.write(
      smtpDataPayload(
        message,
      ),
    );

    const accepted =
      session.expect(
        await session
          .readResponse(),
        [
          250,
        ],
        "message delivery",
      );

    try {
      await session.command(
        "QUIT",
        [
          221,
        ],
        "QUIT",
      );
    } catch {
      // Message has already been accepted; QUIT failure
      // does not convert successful delivery to failure.
    }

    const finalLine =
      accepted.lines[
        accepted.lines.length - 1
      ]
      || accepted.text;

    return (
      safeHeader(
        finalLine,
      ).slice(
        0,
        500,
      )
      || `smtp_${crypto.randomUUID()}`
    );
  } finally {
    if (session) {
      session.release();
    }

    if (socket) {
      try {
        socket.close();
      } catch {
        // Ignore transport cleanup errors.
      }
    }
  }
}

export async function sendCrmEmail(
  db: D1Db,
  env: CrmEmailDeliveryEnv,
  actor: CrmEmailDeliveryActor,
  input: CrmEmailDeliveryInput,
): Promise<CrmEmailDeliveryResult> {
  if (
    !(actor.permissions || [])
      .includes("crm:manage")
  ) {
    throw httpError(
      "Missing permission: crm:manage.",
      403,
    );
  }

  const to =
    lower(
      input.to,
    );

  const subject =
    text(
      input.subject,
    );

  const body =
    text(
      input.body,
    );

  if (!validEmail(to)) {
    throw httpError(
      "Enter a valid CRM email recipient.",
      409,
    );
  }

  if (!subject) {
    throw httpError(
      "Enter an email subject.",
    );
  }

  if (!body) {
    throw httpError(
      "Enter an email message.",
    );
  }

  const settings =
    await getCrmEmailSettings(
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

  const readiness =
    crmEmailDeliveryReadiness(
      settings,
      env,
      text(
        input.businessName
        || actor.businessName
        || "WedPlanned",
      ),
    );

  if (
    !readiness.deliveryReady
  ) {
    throw httpError(
      readiness.deliveryIssue
      || "CRM email delivery is not ready.",
      409,
    );
  }

  if (
    readiness.deliveryMode
    === "google"
  ) {
    await input.prepareRequest?.("gmail", JSON.stringify({ to, subject, body, fromEmail: readiness.fromEmail }), readiness.fromEmail);
    const providerMessageId =
      await sendGoogleEmail(
        db,
        env,
        actor,
        {
          to,
          fromName:
            readiness.fromName,
          fromEmail:
            readiness.fromEmail,
          replyToEmail:
            readiness.replyToEmail,
          subject,
          body,
          trackingPixelUrl:
            input.trackingPixelUrl,
        },
      );

    return {
      provider: "gmail",
      providerMessageId,
      deliveryMode:
        "google",
      fromName:
        readiness.fromName,
      fromEmail:
        readiness.fromEmail,
      replyToEmail:
        readiness.replyToEmail,
    };
  }

  if (
    readiness.deliveryMode
    === "smtp"
  ) {
    await input.prepareRequest?.("smtp", JSON.stringify({ to, subject, body, fromEmail: readiness.fromEmail }), `${readiness.smtpHost}/${readiness.smtpUsername}`);
    const providerMessageId =
      await sendSmtpEmail(
        db,
        env,
        actor,
        {
          to,
          fromName:
            readiness.fromName,
          fromEmail:
            readiness.fromEmail,
          replyToEmail:
            readiness.replyToEmail,
          subject,
          body,
          trackingPixelUrl:
            input.trackingPixelUrl,
          smtpHost:
            readiness.smtpHost,
          smtpPort:
            readiness.smtpPort,
          smtpSecurity:
            readiness.smtpSecurity,
          smtpUsername:
            readiness.smtpUsername,
        },
      );

    return {
      provider: "smtp",
      providerMessageId,
      deliveryMode:
        "smtp",
      fromName:
        readiness.fromName,
      fromEmail:
        readiness.fromEmail,
      replyToEmail:
        readiness.replyToEmail,
    };
  }

  if (
    readiness.deliveryMode
    !== "managed"
  ) {
    throw httpError(
      "The selected CRM email transport is not enabled yet.",
      409,
    );
  }

  const providerMessageId =
    await sendManagedEmail(
      env,
      {
        idempotencyKey: input.idempotencyKey,
        prepareRequest: input.prepareRequest,
        to,
        fromName:
          readiness.fromName,
        fromEmail:
          readiness.fromEmail,
        replyToEmail:
          readiness.replyToEmail,
        subject,
        body,
        trackingPixelUrl:
          input.trackingPixelUrl,
      },
    );

  return {
    provider: "resend",
    providerMessageId,
    deliveryMode:
      "managed",
    fromName:
      readiness.fromName,
    fromEmail:
      readiness.fromEmail,
    replyToEmail:
      readiness.replyToEmail,
  };
}
