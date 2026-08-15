type D1Db = any;

function text(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

export async function hashCrmEmailEngagementToken(
  value: unknown,
) {
  const token =
    text(value);

  if (!token) {
    return "";
  }

  const encoded =
    new TextEncoder()
      .encode(token);

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      encoded,
    );

  return Array.from(
    new Uint8Array(digest),
  )
    .map(
      (byte) =>
        byte
          .toString(16)
          .padStart(2, "0"),
    )
    .join("");
}

async function engagementCommunication(
  db: D1Db,
  token: unknown,
) {
  const hash =
    await hashCrmEmailEngagementToken(
      token,
    );

  if (!hash) {
    return null;
  }

  return db.prepare(`
    SELECT
      id,
      workspace_id,
      enquiry_id,
      quote_id,
      quote_version_id,
      status
    FROM crm_communications
    WHERE open_tracking_token_hash = ?
      AND channel = 'email'
      AND direction = 'outbound'
    LIMIT 1
  `).bind(
    hash,
  ).first();
}

export async function recordCrmEmailOpen(
  db: D1Db,
  token: unknown,
) {
  const communication =
    await engagementCommunication(
      db,
      token,
    );

  if (
    !communication
    || text(
      communication.status,
    ) !== "sent"
  ) {
    return {
      matched: false,
    };
  }

  await db.prepare(`
    UPDATE crm_communications
    SET
      delivered_at =
        COALESCE(
          delivered_at,
          CURRENT_TIMESTAMP
        ),
      opened_at =
        COALESCE(
          opened_at,
          CURRENT_TIMESTAMP
        ),
      updated_at =
        CURRENT_TIMESTAMP
    WHERE id = ?
      AND workspace_id = ?
      AND status = 'sent'
  `).bind(
    communication.id,
    communication.workspace_id,
  ).run();

  return {
    matched: true,
  };
}

export async function recordCrmEmailClick(
  db: D1Db,
  token: unknown,
) {
  const communication =
    await engagementCommunication(
      db,
      token,
    );

  if (
    !communication
    || text(
      communication.status,
    ) !== "sent"
  ) {
    return {
      matched: false,
    };
  }

  await db.prepare(`
    UPDATE crm_communications
    SET
      delivered_at =
        COALESCE(
          delivered_at,
          CURRENT_TIMESTAMP
        ),
      clicked_at =
        COALESCE(
          clicked_at,
          CURRENT_TIMESTAMP
        ),
      updated_at =
        CURRENT_TIMESTAMP
    WHERE id = ?
      AND workspace_id = ?
      AND status = 'sent'
  `).bind(
    communication.id,
    communication.workspace_id,
  ).run();

  return {
    matched: true,
  };
}
