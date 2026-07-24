type D1Db = any;

export type ClientAuthIdentity = {
  id: string;
  workspaceId: string;
  email: string;
  emailNormalized: string;
  displayName: string;
};

type EmailEnv = {
  RESEND_API_KEY?: string;
  CLIENT_AUTH_EMAIL_PROVIDER?: string;
  CLIENT_AUTH_FROM_EMAIL?: string;
  CLIENT_AUTH_FROM_NAME?: string;
};

const SESSION_COOKIE = "mkb_client_session";
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown) {
  return text(value).toLowerCase();
}

function validEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function escapeHtml(value: unknown) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function randomToken(bytes = 32) {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export function clientSessionCookie(token: string, requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
}

export function clearClientSessionCookie(requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function mapIdentity(row: any): ClientAuthIdentity {
  return {
    id: text(row?.id),
    workspaceId: text(row?.workspace_id),
    email: text(row?.email),
    emailNormalized: text(row?.email_normalized),
    displayName: text(row?.display_name),
  };
}

export async function getAuthenticatedClientIdentity(db: D1Db, request: Request): Promise<ClientAuthIdentity | null> {
  const rawToken = cookieValue(request, SESSION_COOKIE);
  if (!rawToken) return null;
  const tokenHash = await sha256(rawToken);
  const row = await db.prepare(`
    SELECT ci.*
    FROM client_identity_sessions cis
    JOIN client_identities ci ON ci.id = cis.identity_id
    WHERE cis.token_hash = ?
      AND cis.revoked_at IS NULL
      AND datetime(cis.expires_at) > CURRENT_TIMESTAMP
      AND ci.status = 'active'
    LIMIT 1
  `).bind(tokenHash).first();
  if (!row) return null;
  db.prepare(`
    UPDATE client_identity_sessions
    SET last_seen_at = CURRENT_TIMESTAMP
    WHERE token_hash = ?
  `).bind(tokenHash).run().catch(() => {});
  return mapIdentity(row);
}

export async function linkAuthenticatedVisitor(
  db: D1Db,
  identity: ClientAuthIdentity | null,
  galleryId: string,
  visitorKey: string,
) {
  if (!identity?.id || !galleryId) return;
  const cleanVisitorKey = text(visitorKey).slice(0, 160);
  if (cleanVisitorKey) {
    await db.prepare(`
      INSERT INTO client_identity_gallery_visitors (
        gallery_id, visitor_key, identity_id, linked_at, last_seen_at
      ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(gallery_id, visitor_key) DO UPDATE SET
        identity_id = excluded.identity_id,
        last_seen_at = CURRENT_TIMESTAMP
    `).bind(galleryId, cleanVisitorKey, identity.id).run();
  }

  // Once an email has been verified, adopt older device/browser identities for
  // this same gallery and email. This is what makes existing favourites appear
  // when the client signs in on a different device without merging unrelated galleries.
  await db.prepare(`
    INSERT INTO client_identity_gallery_visitors (
      gallery_id, visitor_key, identity_id, linked_at, last_seen_at
    )
    SELECT
      cgv.gallery_id,
      cgv.visitor_key,
      ?,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM client_gallery_visitors cgv
    WHERE cgv.gallery_id = ?
      AND cgv.email_normalized = ?
      AND trim(cgv.visitor_key) <> ''
    ON CONFLICT(gallery_id, visitor_key) DO UPDATE SET
      identity_id = excluded.identity_id,
      last_seen_at = CURRENT_TIMESTAMP
  `).bind(identity.id, galleryId, identity.emailNormalized).run();
}

async function sendMagicLinkEmail(
  env: EmailEnv,
  input: { to: string; businessName: string; galleryTitle: string; loginUrl: string },
) {
  const provider = text(env.CLIENT_AUTH_EMAIL_PROVIDER || "resend").toLowerCase();
  if (provider !== "resend") throw new Error(`Unsupported client-auth email provider: ${provider}`);
  const apiKey = text(env.RESEND_API_KEY);
  const fromEmail = text(env.CLIENT_AUTH_FROM_EMAIL);
  if (!apiKey || !fromEmail) {
    throw new Error("Secure email sign-in is not configured. Add RESEND_API_KEY and CLIENT_AUTH_FROM_EMAIL to the public Pages project.");
  }
  const fromName = text(env.CLIENT_AUTH_FROM_NAME || input.businessName || "Private Gallery");
  const subject = `Secure sign-in for ${input.galleryTitle || "your private gallery"}`;
  const safeTitle = escapeHtml(input.galleryTitle || "your private gallery");
  const safeBusiness = escapeHtml(input.businessName || "Photography Gallery");
  const safeUrl = escapeHtml(input.loginUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [input.to],
      subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#151515;max-width:560px;margin:auto"><p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#666">${safeBusiness}</p><h1 style="font-size:24px;font-weight:500">Secure gallery sign-in</h1><p>Use the button below to sign in securely to <strong>${safeTitle}</strong>. This link expires in 15 minutes and can only be used once.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">Sign in to gallery</a></p><p style="font-size:12px;color:#777">If you did not request this link, you can ignore this email.</p></div>`,
      text: `${input.businessName}\n\nSecure gallery sign-in\n\nOpen this one-time link to sign in to ${input.galleryTitle}:\n${input.loginUrl}\n\nThe link expires in 15 minutes.`,
    }),
  });
  if (!response.ok) {
    const body: any = await response.json().catch(() => ({}));
    throw new Error(text(body?.message || body?.error || `Email provider returned ${response.status}.`));
  }
}

export async function requestClientMagicLink(
  db: D1Db,
  env: EmailEnv,
  input: { galleryToken: string; email: string; visitorKey?: string; origin: string },
) {
  const email = text(input.email);
  if (!validEmail(email)) return { status: 400, body: { error: "Enter a valid email address." } };
  const gallery = await db.prepare(`
    SELECT cg.id, cg.workspace_id, cg.title, cg.client_name, cg.expires_at,
           COALESCE(ws.business_name, 'Photography Gallery') AS business_name
    FROM client_galleries cg
    LEFT JOIN workspace_settings ws ON ws.workspace_id = cg.workspace_id
    WHERE cg.access_token = ? AND cg.status = 'live'
    LIMIT 1
  `).bind(text(input.galleryToken)).first();
  if (!gallery) return { status: 404, body: { error: "Gallery not found." } };
  const expiresAt = text(gallery.expires_at);
  if (expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) <= Date.now()) {
    return { status: 410, body: { error: "This gallery has expired." } };
  }

  const workspaceId = text(gallery.workspace_id);
  const emailNormalized = normalizeEmail(email);
  await db.prepare(`
    INSERT INTO client_identities (
      id, workspace_id, email_normalized, email, display_name, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, '', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(workspace_id, email_normalized) DO UPDATE SET
      email = excluded.email,
      updated_at = CURRENT_TIMESTAMP
  `).bind(`identity_${crypto.randomUUID()}`, workspaceId, emailNormalized, email).run();
  const identityRow = await db.prepare(`
    SELECT * FROM client_identities
    WHERE workspace_id = ? AND email_normalized = ? AND status = 'active'
    LIMIT 1
  `).bind(workspaceId, emailNormalized).first();
  if (!identityRow) return { status: 500, body: { error: "Unable to create secure sign-in." } };
  const identity = mapIdentity(identityRow);

  const recent = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM client_identity_magic_links
    WHERE identity_id = ? AND gallery_id = ?
      AND created_at >= datetime('now', '-10 minutes')
  `).bind(identity.id, text(gallery.id)).first();
  if (Number(recent?.total || 0) >= 3) {
    return { status: 200, body: { ok: true, message: "A secure sign-in email was recently sent. Check your inbox and spam folder before requesting another." } };
  }

  const rawToken = randomToken(32);
  const tokenHash = await sha256(rawToken);
  const linkId = `magic_${crypto.randomUUID()}`;
  const returnPath = `/client-gallery/${encodeURIComponent(text(input.galleryToken))}?signedIn=1`;
  const magicExpiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString();
  await db.prepare(`
    INSERT INTO client_identity_magic_links (
      id, identity_id, gallery_id, token_hash, visitor_key, return_path, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    linkId,
    identity.id,
    text(gallery.id),
    tokenHash,
    text(input.visitorKey).slice(0, 160),
    returnPath,
    magicExpiresAt,
  ).run();

  const origin = new URL(input.origin).origin;
  const loginUrl = `${origin}/api/public/client-auth/verify?token=${encodeURIComponent(rawToken)}`;
  try {
    await sendMagicLinkEmail(env, {
      to: email,
      businessName: text(gallery.business_name),
      galleryTitle: text(gallery.title || gallery.client_name || "Private Gallery"),
      loginUrl,
    });
  } catch (error) {
    await db.prepare(`DELETE FROM client_identity_magic_links WHERE id = ?`).bind(linkId).run().catch(() => {});
    throw error;
  }

  return { status: 200, body: { ok: true, message: `Secure sign-in link sent to ${email}. It expires in 15 minutes.` } };
}

export async function verifyClientMagicLink(db: D1Db, rawToken: string) {
  const tokenHash = await sha256(text(rawToken));
  const row = await db.prepare(`
    SELECT
      ciml.*,
      ci.workspace_id,
      ci.email,
      ci.email_normalized,
      ci.display_name,
      ci.status AS identity_status
    FROM client_identity_magic_links ciml
    JOIN client_identities ci ON ci.id = ciml.identity_id
    WHERE ciml.token_hash = ?
    LIMIT 1
  `).bind(tokenHash).first();
  if (!row || text(row.identity_status) !== "active") return { ok: false, status: 400, error: "This sign-in link is invalid or has expired." } as const;
  if (text(row.consumed_at)) return { ok: false, status: 400, error: "This sign-in link has already been used." } as const;
  if (!text(row.expires_at) || Date.parse(text(row.expires_at)) <= Date.now()) return { ok: false, status: 400, error: "This sign-in link has expired." } as const;

  const identity: ClientAuthIdentity = {
    id: text(row.identity_id),
    workspaceId: text(row.workspace_id),
    email: text(row.email),
    emailNormalized: text(row.email_normalized),
    displayName: text(row.display_name),
  };
  const consumed = await db.prepare(`
    UPDATE client_identity_magic_links
    SET consumed_at = CURRENT_TIMESTAMP
    WHERE id = ? AND consumed_at IS NULL AND datetime(expires_at) > CURRENT_TIMESTAMP
  `).bind(text(row.id)).run();
  if (Number(consumed?.meta?.changes || 0) !== 1) {
    return { ok: false, status: 400, error: "This sign-in link is invalid, expired or has already been used." } as const;
  }
  await db.prepare(`
    UPDATE client_identities
    SET verified_at = COALESCE(verified_at, CURRENT_TIMESTAMP),
        last_authenticated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(identity.id).run();
  await linkAuthenticatedVisitor(db, identity, text(row.gallery_id), text(row.visitor_key));

  const rawSession = randomToken(32);
  const sessionHash = await sha256(rawSession);
  const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db.prepare(`
    INSERT INTO client_identity_sessions (
      id, identity_id, token_hash, expires_at, last_seen_at, created_at
    ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(`session_${crypto.randomUUID()}`, identity.id, sessionHash, sessionExpiresAt).run();
  db.prepare(`DELETE FROM client_identity_sessions WHERE datetime(expires_at) <= CURRENT_TIMESTAMP OR revoked_at IS NOT NULL`).run().catch(() => {});
  db.prepare(`DELETE FROM client_identity_magic_links WHERE datetime(expires_at) <= datetime('now', '-1 day')`).run().catch(() => {});

  const returnPath = text(row.return_path).startsWith("/") ? text(row.return_path) : "/";
  return { ok: true, status: 200, sessionToken: rawSession, returnPath, identity } as const;
}

export async function revokeClientSession(db: D1Db, request: Request) {
  const rawToken = cookieValue(request, SESSION_COOKIE);
  if (!rawToken) return;
  const tokenHash = await sha256(rawToken);
  await db.prepare(`
    UPDATE client_identity_sessions
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE token_hash = ? AND revoked_at IS NULL
  `).bind(tokenHash).run();
}
