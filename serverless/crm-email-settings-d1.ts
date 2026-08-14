type D1Db = any;

export type CrmEmailSettingsActor = {
  workspaceId?: string;
  userId?: string;
  email?: string;
  accessMode?: string;
  permissions?: string[];
};

export type CrmEmailSettingsEnv = {
  CRM_EMAIL_CREDENTIAL_KEY?: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function integer(
  value: unknown,
  fallback: number,
) {
  if (
    value === undefined
    || value === null
    || value === ""
  ) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw httpError(
      "Enter a valid whole number.",
    );
  }

  return parsed;
}

function booleanValue(
  value: unknown,
  fallback: boolean,
) {
  if (
    value === undefined
    || value === null
  ) {
    return fallback;
  }

  if (
    value === true
    || value === 1
    || value === "1"
    || value === "true"
  ) {
    return true;
  }

  if (
    value === false
    || value === 0
    || value === "0"
    || value === "false"
  ) {
    return false;
  }

  throw httpError(
    "Choose true or false.",
  );
}

function objectValue(
  value: unknown,
) {
  return (
    value
    && typeof value === "object"
    && !Array.isArray(value)
  )
    ? value as Record<string, unknown>
    : {};
}

function safeJson(
  value: unknown,
  fallback: any,
) {
  try {
    return JSON.parse(
      text(value)
      || JSON.stringify(fallback),
    );
  } catch {
    return fallback;
  }
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

function requirePermission(
  actor: CrmEmailSettingsActor,
  permission: "crm:read" | "crm:manage",
  write = false,
) {
  if (!text(actor.workspaceId)) {
    throw httpError(
      "An active workspace is required.",
      403,
    );
  }

  if (
    !(actor.permissions || [])
      .includes(permission)
  ) {
    throw httpError(
      `Missing permission: ${permission}.`,
      403,
    );
  }

  if (
    write
    && actor.accessMode === "support"
  ) {
    throw httpError(
      "Support sessions cannot change email settings.",
      403,
    );
  }
}

function validEmail(
  value: unknown,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(lower(value));
}

function bytesToBase64(
  bytes: Uint8Array,
) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(
  value: string,
) {
  const binary = atob(value);
  const bytes =
    new Uint8Array(binary.length);

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(index);
  }

  return bytes;
}

async function credentialKey(
  env: CrmEmailSettingsEnv,
) {
  const secret =
    text(
      env.CRM_EMAIL_CREDENTIAL_KEY,
    );

  if (secret.length < 32) {
    throw httpError(
      "CRM email credential encryption is not configured.",
      500,
    );
  }

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder()
        .encode(secret),
    );

  return crypto.subtle.importKey(
    "raw",
    digest,
    {
      name: "AES-GCM",
    },
    false,
    [
      "encrypt",
      "decrypt",
    ],
  );
}

async function encryptCredential(
  env: CrmEmailSettingsEnv,
  payload:
    Record<string, unknown>,
) {
  const key =
    await credentialKey(env);

  const iv =
    crypto.getRandomValues(
      new Uint8Array(12),
    );

  const plaintext =
    new TextEncoder().encode(
      JSON.stringify(payload),
    );

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      plaintext,
    );

  return {
    algorithm: "AES-GCM",
    ciphertext:
      bytesToBase64(
        new Uint8Array(
          encrypted,
        ),
      ),
    iv:
      bytesToBase64(iv),
    keyVersion: 1,
  };
}

export async function decryptEmailCredential(
  env: CrmEmailSettingsEnv,
  row: any,
) {
  if (
    text(row?.algorithm)
    !== "AES-GCM"
  ) {
    throw httpError(
      "Unsupported CRM email credential encryption.",
      500,
    );
  }

  const key =
    await credentialKey(env);

  let ciphertext:
    Uint8Array;

  let iv:
    Uint8Array;

  try {
    ciphertext =
      base64ToBytes(
        text(row.ciphertext),
      );

    iv =
      base64ToBytes(
        text(row.iv),
      );
  } catch {
    throw httpError(
      "CRM email credential data is invalid.",
      500,
    );
  }

  try {
    const decrypted =
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
        },
        key,
        ciphertext,
      );

    return JSON.parse(
      new TextDecoder()
        .decode(decrypted),
    );
  } catch {
    throw httpError(
      "Unable to decrypt CRM email credentials.",
      500,
    );
  }
}

async function ensureSettings(
  db: D1Db,
  workspaceId: string,
) {
  await db.prepare(`
    INSERT OR IGNORE INTO
      crm_email_settings (
        workspace_id,
        delivery_mode,
        smtp_port,
        smtp_security,
        created_at,
        updated_at
      ) VALUES (
        ?,
        'managed',
        587,
        'starttls',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
  `).bind(
    workspaceId,
  ).run();
}

async function credentialRow(
  db: D1Db,
  workspaceId: string,
  provider:
    "google" | "smtp",
) {
  return db.prepare(`
    SELECT
      id,
      workspace_id,
      provider,
      algorithm,
      ciphertext,
      iv,
      key_version,
      metadata_json,
      created_at,
      updated_at
    FROM crm_email_credentials
    WHERE workspace_id = ?
      AND provider = ?
    LIMIT 1
  `).bind(
    workspaceId,
    provider,
  ).first();
}

function hydrateSettings(
  row: any,
  credentials:
    {
      google: boolean;
      smtp: boolean;
    },
) {
  return {
    deliveryMode:
      text(
        row?.delivery_mode
        || "managed",
      ),
    senderName:
      text(row?.sender_name),
    senderEmail:
      text(row?.sender_email),
    replyToEmail:
      text(row?.reply_to_email),
    signatureEnabled:
      Boolean(
        row?.signature_enabled,
      ),
    signature:
      safeJson(
        row?.signature_json,
        {},
      ),
    googleEmail:
      text(row?.google_email),
    googleConnected:
      credentials.google,
    smtpHost:
      text(row?.smtp_host),
    smtpPort:
      Number(
        row?.smtp_port || 587,
      ),
    smtpSecurity:
      text(
        row?.smtp_security
        || "starttls",
      ),
    smtpUsername:
      text(row?.smtp_username),
    smtpCredentialConfigured:
      credentials.smtp,
    lastTestedAt:
      row?.last_tested_at
      || undefined,
    lastTestStatus:
      text(
        row?.last_test_status,
      ),
    createdAt:
      row?.created_at,
    updatedAt:
      row?.updated_at,
  };
}

export async function getCrmEmailSettings(
  db: D1Db,
  actor: CrmEmailSettingsActor,
) {
  requirePermission(
    actor,
    "crm:read",
  );

  const workspaceId =
    text(actor.workspaceId);

  const [
    row,
    googleCredential,
    smtpCredential,
  ] = await Promise.all([
    db.prepare(`
      SELECT *
      FROM crm_email_settings
      WHERE workspace_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
    ).first(),
    credentialRow(
      db,
      workspaceId,
      "google",
    ),
    credentialRow(
      db,
      workspaceId,
      "smtp",
    ),
  ]);

  return hydrateSettings(
    row,
    {
      google:
        Boolean(
          googleCredential,
        ),
      smtp:
        Boolean(
          smtpCredential,
        ),
    },
  );
}

async function audit(
  db: D1Db,
  actor: CrmEmailSettingsActor,
  eventType: string,
  summary: string,
  metadata:
    Record<string, unknown> = {},
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
      'crm_email_settings',
      ?,
      ?,
      ?,
      CURRENT_TIMESTAMP
    )
  `).bind(
    `audit_${crypto.randomUUID()}`,
    actor.workspaceId,
    text(actor.userId) || null,
    lower(actor.email),
    eventType,
    actor.workspaceId,
    summary,
    JSON.stringify(metadata),
  ).run();
}

async function storeCredential(
  db: D1Db,
  env: CrmEmailSettingsEnv,
  workspaceId: string,
  provider:
    "google" | "smtp",
  payload:
    Record<string, unknown>,
  metadata:
    Record<string, unknown> = {},
) {
  const encrypted =
    await encryptCredential(
      env,
      payload,
    );

  const existing =
    await credentialRow(
      db,
      workspaceId,
      provider,
    );

  const id =
    text(existing?.id)
    || `crm_email_credential_${crypto.randomUUID()}`;

  await db.prepare(`
    INSERT INTO crm_email_credentials (
      id,
      workspace_id,
      provider,
      algorithm,
      ciphertext,
      iv,
      key_version,
      metadata_json,
      created_at,
      updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(
      workspace_id,
      provider
    ) DO UPDATE SET
      algorithm =
        excluded.algorithm,
      ciphertext =
        excluded.ciphertext,
      iv =
        excluded.iv,
      key_version =
        excluded.key_version,
      metadata_json =
        excluded.metadata_json,
      updated_at =
        CURRENT_TIMESTAMP
  `).bind(
    id,
    workspaceId,
    provider,
    encrypted.algorithm,
    encrypted.ciphertext,
    encrypted.iv,
    encrypted.keyVersion,
    JSON.stringify(metadata),
  ).run();

  const saved =
    await credentialRow(
      db,
      workspaceId,
      provider,
    );

  if (!saved) {
    throw httpError(
      "Unable to save encrypted CRM email credentials.",
      500,
    );
  }

  return saved;
}

export async function getDecryptedCrmEmailCredential(
  db: D1Db,
  env: CrmEmailSettingsEnv,
  actor: CrmEmailSettingsActor,
  providerInput: unknown,
) {
  requirePermission(
    actor,
    "crm:manage",
    true,
  );

  const provider =
    text(providerInput);

  if (
    provider !== "google"
    && provider !== "smtp"
  ) {
    throw httpError(
      "Choose Google or SMTP.",
    );
  }

  const workspaceId =
    text(actor.workspaceId);

  const row =
    await credentialRow(
      db,
      workspaceId,
      provider,
    );

  if (!row) {
    return null;
  }

  const payload =
    await decryptEmailCredential(
      env,
      row,
    );

  return {
    id:
      text(row.id),
    provider:
      text(row.provider),
    payload:
      objectValue(payload),
    metadata:
      safeJson(
        row.metadata_json,
        {},
      ),
  };
}

export async function saveGoogleEmailCredential(
  db: D1Db,
  env: CrmEmailSettingsEnv,
  actor: CrmEmailSettingsActor,
  input: {
    refreshToken?: unknown;
    email?: unknown;
    scope?: unknown;
  },
) {
  requirePermission(
    actor,
    "crm:manage",
    true,
  );

  const workspaceId =
    text(actor.workspaceId);

  const refreshToken =
    text(input?.refreshToken);

  const email =
    lower(input?.email);

  const scope =
    text(input?.scope);

  if (!refreshToken) {
    throw httpError(
      "Google did not return an offline refresh token. Reconnect Google and approve access again.",
      409,
    );
  }

  if (
    !email
    || !validEmail(email)
  ) {
    throw httpError(
      "Google did not return a valid account email address.",
      409,
    );
  }

  await ensureSettings(
    db,
    workspaceId,
  );

  const credential =
    await storeCredential(
      db,
      env,
      workspaceId,
      "google",
      {
        refreshToken,
      },
      {
        email,
        scope,
        connectedByUserId:
          text(actor.userId)
          || null,
      },
    );

  await db.prepare(`
    UPDATE crm_email_settings
    SET
      google_email = ?,
      credential_id =
        CASE
          WHEN delivery_mode = 'google'
            THEN ?
          ELSE credential_id
        END,
      last_tested_at = NULL,
      last_test_status = '',
      updated_at =
        CURRENT_TIMESTAMP
    WHERE workspace_id = ?
  `).bind(
    email,
    credential.id,
    workspaceId,
  ).run();

  await audit(
    db,
    actor,
    "crm.email.google.connected",
    `Connected Google email account ${email}.`,
    {
      provider: "google",
      email,
      scope,
    },
  );

  return getCrmEmailSettings(
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

export async function saveCrmEmailSettings(
  db: D1Db,
  env: CrmEmailSettingsEnv,
  actor: CrmEmailSettingsActor,
  input: any,
) {
  requirePermission(
    actor,
    "crm:manage",
    true,
  );

  const current =
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

  const workspaceId =
    text(actor.workspaceId);

  await ensureSettings(
    db,
    workspaceId,
  );

  const deliveryModeInput =
    text(
      input?.deliveryMode
      ?? current.deliveryMode,
    );

  const deliveryModes = [
    "managed",
    "google",
    "smtp",
  ];

  if (
    !deliveryModes.includes(
      deliveryModeInput,
    )
  ) {
    throw httpError(
      "Choose managed, Google or SMTP email delivery.",
    );
  }

  const deliveryMode =
    deliveryModeInput;

  const senderName =
    text(
      input?.senderName
      ?? current.senderName,
    ).slice(0, 160);

  const senderEmail =
    lower(
      input?.senderEmail
      ?? current.senderEmail,
    );

  const replyToEmail =
    lower(
      input?.replyToEmail
      ?? current.replyToEmail,
    );

  if (
    senderEmail
    && !validEmail(senderEmail)
  ) {
    throw httpError(
      "Enter a valid sender email address.",
    );
  }

  if (
    replyToEmail
    && !validEmail(replyToEmail)
  ) {
    throw httpError(
      "Enter a valid reply-to email address.",
    );
  }

  const signatureEnabled =
    booleanValue(
      input?.signatureEnabled,
      current.signatureEnabled,
    );

  const signature =
    objectValue(
      input?.signature
      ?? current.signature,
    );

  const googleEmail =
    lower(
      input?.googleEmail
      ?? current.googleEmail,
    );

  if (
    googleEmail
    && !validEmail(googleEmail)
  ) {
    throw httpError(
      "Enter a valid Google email address.",
    );
  }

  const smtpHost =
    text(
      input?.smtpHost
      ?? current.smtpHost,
    ).slice(0, 255);

  const smtpPort =
    integer(
      input?.smtpPort,
      current.smtpPort || 587,
    );

  if (
    smtpPort <= 0
    || smtpPort > 65535
  ) {
    throw httpError(
      "SMTP port must be between 1 and 65535.",
    );
  }

  const smtpSecurityInput =
    text(
      input?.smtpSecurity
      ?? current.smtpSecurity,
    );

  if (
    smtpPort === 25
  ) {
    throw httpError(
      "SMTP port 25 is not supported by the Cloudflare Workers runtime. Use your provider's submission port, normally 465 or 587.",
      409,
    );
  }

  const smtpSecurity =
    [
      "tls",
      "starttls",
    ].includes(
      smtpSecurityInput,
    )
      ? smtpSecurityInput
      : "starttls";

  const smtpUsername =
    text(
      input?.smtpUsername
      ?? current.smtpUsername,
    ).slice(0, 320);

  const smtpPassword =
    text(input?.smtpPassword);

  let smtpCredential =
    await credentialRow(
      db,
      workspaceId,
      "smtp",
    );

  if (smtpPassword) {
    smtpCredential =
      await storeCredential(
        db,
        env,
        workspaceId,
        "smtp",
        {
          password:
            smtpPassword,
        },
        {
          username:
            smtpUsername,
          host:
            smtpHost,
        },
      );
  }

  const googleCredential =
    await credentialRow(
      db,
      workspaceId,
      "google",
    );

  if (
    deliveryMode === "smtp"
  ) {
    if (!smtpHost) {
      throw httpError(
        "Enter an SMTP host before enabling custom SMTP.",
        409,
      );
    }

    if (!smtpUsername) {
      throw httpError(
        "Enter an SMTP username before enabling custom SMTP.",
        409,
      );
    }

    if (!smtpCredential) {
      throw httpError(
        "Enter the SMTP password before enabling custom SMTP.",
        409,
      );
    }
  }

  if (
    deliveryMode === "google"
    && !googleCredential
  ) {
    throw httpError(
      "Connect a Google account before enabling Google email delivery.",
      409,
    );
  }

  const credentialId =
    deliveryMode === "smtp"
      ? text(
          smtpCredential?.id,
        )
      : deliveryMode === "google"
        ? text(
            googleCredential?.id,
          )
        : "";

  await db.prepare(`
    UPDATE crm_email_settings
    SET
      delivery_mode = ?,
      sender_name = ?,
      sender_email = ?,
      reply_to_email = ?,
      signature_enabled = ?,
      signature_json = ?,
      google_email = ?,
      smtp_host = ?,
      smtp_port = ?,
      smtp_security = ?,
      smtp_username = ?,
      credential_id = ?,
      last_tested_at = NULL,
      last_test_status = '',
      updated_at =
        CURRENT_TIMESTAMP
    WHERE workspace_id = ?
  `).bind(
    deliveryMode,
    senderName,
    senderEmail,
    replyToEmail,
    signatureEnabled ? 1 : 0,
    JSON.stringify(signature),
    googleEmail,
    smtpHost,
    smtpPort,
    smtpSecurity,
    smtpUsername,
    credentialId || null,
    workspaceId,
  ).run();

  await audit(
    db,
    actor,
    "crm.email_settings.updated",
    "Updated CRM email delivery settings.",
    {
      deliveryMode,
      senderEmail:
        senderEmail || null,
      replyToEmail:
        replyToEmail || null,
      smtpHost:
        smtpHost || null,
      smtpPort,
      smtpSecurity,
      smtpCredentialConfigured:
        Boolean(
          smtpCredential,
        ),
      googleConnected:
        Boolean(
          googleCredential,
        ),
    },
  );

  return getCrmEmailSettings(
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

export async function disconnectCrmEmailProvider(
  db: D1Db,
  actor: CrmEmailSettingsActor,
  providerInput: unknown,
) {
  requirePermission(
    actor,
    "crm:manage",
    true,
  );

  const provider =
    text(providerInput);

  if (
    provider !== "google"
    && provider !== "smtp"
  ) {
    throw httpError(
      "Choose Google or SMTP.",
    );
  }

  const workspaceId =
    text(actor.workspaceId);

  await ensureSettings(
    db,
    workspaceId,
  );

  const current =
    await db.prepare(`
      SELECT delivery_mode
      FROM crm_email_settings
      WHERE workspace_id = ?
      LIMIT 1
    `).bind(
      workspaceId,
    ).first();

  await db.batch([
    db.prepare(`
      DELETE FROM crm_email_credentials
      WHERE workspace_id = ?
        AND provider = ?
    `).bind(
      workspaceId,
      provider,
    ),
    db.prepare(`
      UPDATE crm_email_settings
      SET
        delivery_mode =
          CASE
            WHEN delivery_mode = ?
              THEN 'managed'
            ELSE delivery_mode
          END,
        credential_id =
          CASE
            WHEN delivery_mode = ?
              THEN NULL
            ELSE credential_id
          END,
        google_email =
          CASE
            WHEN ? = 'google'
              THEN ''
            ELSE google_email
          END,
        last_tested_at = NULL,
        last_test_status = '',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE workspace_id = ?
    `).bind(
      provider,
      provider,
      provider,
      workspaceId,
    ),
  ]);

  await audit(
    db,
    actor,
    "crm.email_provider.disconnected",
    `Disconnected CRM ${provider} email delivery.`,
    {
      provider,
      previousDeliveryMode:
        text(
          current?.delivery_mode,
        ),
    },
  );

  return getCrmEmailSettings(
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
