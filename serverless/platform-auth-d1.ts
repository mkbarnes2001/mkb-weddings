import { getDefaultWorkspaceId, getWorkspace } from "./workspace-d1";
import { recordSupportRequest } from "./platform-operations-d1";

type D1Db = any;

export type PlatformAuthEnv = {
  RESEND_API_KEY?: string;
  WEDPLANNED_AUTH_EMAIL_PROVIDER?: string;
  WEDPLANNED_AUTH_FROM_EMAIL?: string;
  WEDPLANNED_AUTH_FROM_NAME?: string;
  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_AUTH_DEBUG_LINKS?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
  WEDPLANNED_ADMIN_ORIGIN?: string;
};

export type ProfessionalMembershipSummary = {
  id: string;
  workspaceId: string;
  workspaceSlug: string;
  businessName: string;
  marketplaceSlug: string;
  role: string;
  status: string;
  accessMode: "membership" | "support";
  supportGrantId: string;
  supportScope: "" | "read" | "manage";
};

export type ProfessionalContext = {
  accessGranted: boolean;
  authenticated: boolean;
  enforced: boolean;
  mode: "session" | "bootstrap" | "none";
  userId: string;
  email: string;
  displayName: string;
  platformRole: string;
  membershipId: string;
  workspaceId: string;
  workspaceSlug: string;
  businessName: string;
  marketplaceSlug: string;
  role: string;
  permissions: string[];
  memberships: ProfessionalMembershipSummary[];
  accessMode: "membership" | "support" | "bootstrap" | "none";
  supportGrantId: string;
  supportScope: "" | "read" | "manage";
};

const SESSION_COOKIE = "wedplanned_admin_session";
const LOGIN_LINK_TTL_MS = 20 * 60 * 1000;
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ["platform:read", "business:update", "services:update", "members:read", "members:manage", "workspace:switch", "operations:read", "support:manage", "data:export", "deletion:request", "crm:read", "crm:manage"],
  admin: ["platform:read", "business:update", "services:update", "members:read", "members:manage", "workspace:switch", "operations:read", "data:export", "crm:read", "crm:manage"],
  manager: ["platform:read", "business:update", "services:update", "members:read", "workspace:switch", "operations:read", "crm:read", "crm:manage"],
  content: ["platform:read", "business:update", "services:update", "members:read", "workspace:switch", "crm:read"],
  finance: ["platform:read", "members:read", "workspace:switch", "operations:read", "data:export", "crm:read"],
  staff: ["platform:read", "members:read", "workspace:switch", "crm:read", "crm:manage"],
  viewer: ["platform:read", "members:read", "workspace:switch", "crm:read"],
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

function validEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower(value));
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

function safeReturnPath(value: unknown) {
  const candidate = text(value);
  return candidate.startsWith("/admin") && !candidate.startsWith("//") ? candidate : "/admin";
}

function professionalAdminOrigin(env: PlatformAuthEnv, request: Request) {
  const configured = text(env.WEDPLANNED_ADMIN_ORIGIN);
  if (configured) {
    try {
      const origin = new URL(configured);
      if (origin.protocol === "https:" || origin.hostname === "localhost") return origin.origin;
    } catch {
      // Fall back to the request origin when configuration is invalid.
    }
  }
  return new URL(request.url).origin;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function permissionsFor(role: string, platformRole = "member", accessMode: "membership" | "support" = "membership", supportScope: "" | "read" | "manage" = "") {
  if (accessMode === "support") {
    return unique([
      "platform:read",
      "members:read",
      "workspace:switch",
      "operations:read",
      "support:access",
      "crm:read",
      ...(supportScope === "manage" ? ["business:update", "services:update", "crm:manage"] : []),
    ]);
  }
  if (platformRole === "platform_admin") {
    return unique([
      ...ROLE_PERMISSIONS.owner,
      "platform:admin",
    ]);
  }
  return unique(ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer);
}

function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & { statusCode?: number; details?: string[] };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

async function audit(db: D1Db, input: {
  workspaceId?: string;
  actorUserId?: string;
  actorEmail?: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.prepare(`
    INSERT INTO platform_audit_events (
      id, workspace_id, actor_user_id, actor_email, event_type,
      entity_type, entity_id, summary, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    `audit_${crypto.randomUUID()}`,
    text(input.workspaceId) || null,
    text(input.actorUserId) || null,
    lower(input.actorEmail),
    text(input.eventType),
    text(input.entityType),
    text(input.entityId),
    text(input.summary),
    JSON.stringify(input.metadata || {}),
  ).run();
}

export function professionalAuthEnforced(env: PlatformAuthEnv) {
  return truthy(env.WEDPLANNED_AUTH_ENFORCED);
}

export function professionalSessionCookie(token: string, requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
}

export function clearProfessionalSessionCookie(requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

async function loadMemberships(db: D1Db, userId: string): Promise<ProfessionalMembershipSummary[]> {
  const result = await db.prepare(`
    SELECT
      bm.id,
      bm.workspace_id,
      bm.role,
      bm.status,
      w.slug AS workspace_slug,
      COALESCE(NULLIF(bp.public_name, ''), w.name) AS business_name,
      COALESCE(bp.marketplace_slug, '') AS marketplace_slug
    FROM business_memberships bm
    JOIN workspaces w ON w.id = bm.workspace_id AND w.status = 'active'
    LEFT JOIN business_profiles bp ON bp.workspace_id = bm.workspace_id
    WHERE bm.user_id = ? AND bm.status = 'active'
    ORDER BY CASE bm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
             business_name COLLATE NOCASE
  `).bind(userId).all();
  return (result.results || []).map((row: any) => ({
    id: text(row.id),
    workspaceId: text(row.workspace_id),
    workspaceSlug: text(row.workspace_slug),
    businessName: text(row.business_name),
    marketplaceSlug: text(row.marketplace_slug),
    role: text(row.role),
    status: text(row.status),
    accessMode: "membership",
    supportGrantId: "",
    supportScope: "",
  }));
}

async function loadSupportMemberships(db: D1Db, userId: string, platformRole: string): Promise<ProfessionalMembershipSummary[]> {
  if (!["support", "platform_admin"].includes(platformRole)) return [];
  const result = await db.prepare(`
    SELECT
      psg.id,
      psg.workspace_id,
      psg.scope,
      w.slug AS workspace_slug,
      COALESCE(NULLIF(bp.public_name, ''), w.name) AS business_name,
      COALESCE(bp.marketplace_slug, '') AS marketplace_slug
    FROM platform_support_grants psg
    JOIN workspaces w ON w.id = psg.workspace_id AND w.status = 'active'
    LEFT JOIN business_profiles bp ON bp.workspace_id = psg.workspace_id
    WHERE psg.status = 'active'
      AND datetime(psg.expires_at) > CURRENT_TIMESTAMP
    ORDER BY datetime(psg.expires_at) ASC, business_name COLLATE NOCASE
  `).all();
  return (result.results || []).map((row: any) => ({
    id: `support:${text(row.id)}`,
    workspaceId: text(row.workspace_id),
    workspaceSlug: text(row.workspace_slug),
    businessName: text(row.business_name),
    marketplaceSlug: text(row.marketplace_slug),
    role: "support",
    status: "active",
    accessMode: "support",
    supportGrantId: text(row.id),
    supportScope: text(row.scope) === "manage" ? "manage" : "read",
  }));
}

async function loadAccessOptions(db: D1Db, userId: string, platformRole: string): Promise<ProfessionalMembershipSummary[]> {
  const memberships = await loadMemberships(db, userId);
  const support = await loadSupportMemberships(db, userId, platformRole);
  const seen = new Set<string>();
  return [...memberships, ...support].filter((item) => {
    const key = item.workspaceId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function bootstrapContext(db: D1Db, env: PlatformAuthEnv): Promise<ProfessionalContext> {
  const workspaceId = await getDefaultWorkspaceId(db);
  const workspace = await getWorkspace(db, workspaceId);
  const profile = await db.prepare(`SELECT public_name, marketplace_slug FROM business_profiles WHERE workspace_id = ? LIMIT 1`).bind(workspaceId).first();
  const email = lower(env.WEDPLANNED_BOOTSTRAP_EMAIL || workspace?.settings?.contactEmail);
  const membership: ProfessionalMembershipSummary = {
    id: "bootstrap_membership",
    workspaceId,
    workspaceSlug: text(workspace?.slug),
    businessName: text(profile?.public_name || workspace?.name || "MKB Weddings"),
    marketplaceSlug: text(profile?.marketplace_slug),
    role: "owner",
    status: "active",
    accessMode: "membership",
    supportGrantId: "",
    supportScope: "",
  };
  return {
    accessGranted: true,
    authenticated: false,
    enforced: false,
    mode: "bootstrap",
    userId: "",
    email,
    displayName: text(workspace?.settings?.businessName || workspace?.name),
    platformRole: "platform_admin",
    membershipId: membership.id,
    workspaceId,
    workspaceSlug: membership.workspaceSlug,
    businessName: membership.businessName,
    marketplaceSlug: membership.marketplaceSlug,
    role: "owner",
    permissions: permissionsFor("owner", "platform_admin"),
    memberships: [membership],
    accessMode: "bootstrap",
    supportGrantId: "",
    supportScope: "",
  };
}

export async function getProfessionalContext(db: D1Db, request: Request, env: PlatformAuthEnv): Promise<ProfessionalContext> {
  const enforced = professionalAuthEnforced(env);
  const rawToken = cookieValue(request, SESSION_COOKIE);
  if (rawToken) {
    const tokenHash = await sha256(rawToken);
    const row = await db.prepare(`
      SELECT
        ps.id AS session_id,
        ps.user_id,
        ps.active_workspace_id,
        pu.email,
        pu.display_name,
        pu.platform_role,
        pu.status AS user_status
      FROM platform_sessions ps
      JOIN platform_users pu ON pu.id = ps.user_id
      WHERE ps.token_hash = ?
        AND ps.revoked_at IS NULL
        AND datetime(ps.expires_at) > CURRENT_TIMESTAMP
        AND pu.status = 'active'
      LIMIT 1
    `).bind(tokenHash).first();

    if (row) {
      const platformRole = text(row.platform_role || "member");
      const memberships = await loadAccessOptions(db, text(row.user_id), platformRole);
      const active = memberships.find((membership) => membership.workspaceId === text(row.active_workspace_id)) || memberships[0];
      if (active) {
        if (active.workspaceId !== text(row.active_workspace_id)) {
          await db.prepare(`UPDATE platform_sessions SET active_workspace_id = ? WHERE id = ?`).bind(active.workspaceId, text(row.session_id)).run();
        }
        db.prepare(`UPDATE platform_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(text(row.session_id)).run().catch(() => {});
        db.prepare(`UPDATE business_memberships SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(active.id).run().catch(() => {});
        return {
          accessGranted: true,
          authenticated: true,
          enforced,
          mode: "session",
          userId: text(row.user_id),
          email: text(row.email),
          displayName: text(row.display_name),
          platformRole,
          membershipId: active.id,
          workspaceId: active.workspaceId,
          workspaceSlug: active.workspaceSlug,
          businessName: active.businessName,
          marketplaceSlug: active.marketplaceSlug,
          role: active.role,
          permissions: permissionsFor(active.role, platformRole, active.accessMode, active.supportScope),
          memberships,
          accessMode: active.accessMode,
          supportGrantId: active.supportGrantId,
          supportScope: active.supportScope,
        };
      }
    }
  }

  if (!enforced) return bootstrapContext(db, env);

  return {
    accessGranted: false,
    authenticated: false,
    enforced: true,
    mode: "none",
    userId: "",
    email: "",
    displayName: "",
    platformRole: "member",
    membershipId: "",
    workspaceId: "",
    workspaceSlug: "",
    businessName: "",
    marketplaceSlug: "",
    role: "",
    permissions: [],
    memberships: [],
    accessMode: "none",
    supportGrantId: "",
    supportScope: "",
  };
}

export async function requireProfessionalContext(db: D1Db, request: Request, env: PlatformAuthEnv) {
  const context = await getProfessionalContext(db, request, env);
  if (!context.accessGranted) throw httpError("Professional sign-in required.", 401);
  return context;
}

export function requireProfessionalPermission(context: ProfessionalContext, permission: string) {
  if (!context.permissions.includes(permission)) throw httpError("You do not have permission to perform this action.", 403);
}

async function configuredEmailDelivery(env: PlatformAuthEnv) {
  return lower(env.WEDPLANNED_AUTH_EMAIL_PROVIDER || "resend") === "resend"
    && Boolean(text(env.RESEND_API_KEY))
    && Boolean(text(env.WEDPLANNED_AUTH_FROM_EMAIL));
}

async function sendProfessionalEmail(env: PlatformAuthEnv, input: {
  to: string;
  subject: string;
  heading: string;
  intro: string;
  buttonLabel: string;
  url: string;
}) {
  const provider = lower(env.WEDPLANNED_AUTH_EMAIL_PROVIDER || "resend");
  if (provider !== "resend") throw new Error(`Unsupported professional-auth email provider: ${provider}`);
  const apiKey = text(env.RESEND_API_KEY);
  const fromEmail = text(env.WEDPLANNED_AUTH_FROM_EMAIL);
  if (!apiKey || !fromEmail) throw new Error("Professional email authentication is not configured.");
  const fromName = text(env.WEDPLANNED_AUTH_FROM_NAME || "WedPlanned");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [input.to],
      subject: input.subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#151515;max-width:560px;margin:auto"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b6b6b">WedPlanned</p><h1 style="font-size:25px;font-weight:600">${escapeHtml(input.heading)}</h1><p>${escapeHtml(input.intro)}</p><p style="margin:28px 0"><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">${escapeHtml(input.buttonLabel)}</a></p><p style="font-size:12px;color:#777">This link is private and can only be used once.</p></div>`,
      text: `WedPlanned\n\n${input.heading}\n\n${input.intro}\n\n${input.url}\n\nThis link is private and can only be used once.`,
    }),
  });
  if (!response.ok) {
    const body: any = await response.json().catch(() => ({}));
    throw new Error(text(body?.message || body?.error || `Email provider returned ${response.status}.`));
  }
}

async function createAuthLink(db: D1Db, input: {
  userId: string;
  membershipId?: string;
  email: string;
  purpose: "login" | "invitation";
  returnPath?: string;
}) {
  const rawToken = randomToken(32);
  const tokenHash = await sha256(rawToken);
  const ttl = input.purpose === "invitation" ? INVITATION_TTL_MS : LOGIN_LINK_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl).toISOString();
  const linkId = `auth_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO platform_auth_links (
      id, user_id, membership_id, email_normalized, purpose,
      token_hash, return_path, expires_at, delivery_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
  `).bind(
    linkId,
    input.userId,
    text(input.membershipId) || null,
    lower(input.email),
    input.purpose,
    tokenHash,
    safeReturnPath(input.returnPath),
    expiresAt,
  ).run();
  return { linkId, rawToken, expiresAt };
}

async function markLinkDelivery(db: D1Db, linkId: string, status: "sent" | "manual" | "failed", error = "") {
  await db.prepare(`
    UPDATE platform_auth_links
    SET delivery_status = ?, delivery_error = ?
    WHERE id = ?
  `).bind(status, text(error).slice(0, 500), linkId).run();
}

export async function requestProfessionalLoginLink(db: D1Db, env: PlatformAuthEnv, request: Request, input: { email?: string; returnPath?: string }) {
  const email = lower(input.email);
  if (!validEmail(email)) throw httpError("Enter a valid email address.", 400);
  const genericMessage = "If this email belongs to an active WedPlanned account, a secure sign-in link will be sent.";

  const user = await db.prepare(`
    SELECT pu.id, pu.email, pu.display_name
    FROM platform_users pu
    WHERE pu.email_normalized = ? AND pu.status = 'active'
      AND (
        EXISTS (
          SELECT 1 FROM business_memberships bm
          JOIN workspaces w ON w.id = bm.workspace_id AND w.status = 'active'
          WHERE bm.user_id = pu.id AND bm.status = 'active'
        )
        OR (
          pu.platform_role IN ('support', 'platform_admin')
          AND EXISTS (
            SELECT 1 FROM platform_support_grants psg
            JOIN workspaces w ON w.id = psg.workspace_id AND w.status = 'active'
            WHERE psg.status = 'active' AND datetime(psg.expires_at) > CURRENT_TIMESTAMP
          )
        )
      )
    LIMIT 1
  `).bind(email).first();
  if (!user) return { message: genericMessage };

  const recent = await db.prepare(`
    SELECT COUNT(*) AS total FROM platform_auth_links
    WHERE email_normalized = ? AND purpose = 'login'
      AND created_at >= datetime('now', '-10 minutes')
  `).bind(email).first();
  if (Number(recent?.total || 0) >= 3) return { message: genericMessage };

  await db.prepare(`
    UPDATE platform_auth_links SET revoked_at = CURRENT_TIMESTAMP
    WHERE email_normalized = ? AND purpose = 'login'
      AND consumed_at IS NULL AND revoked_at IS NULL
  `).bind(email).run();

  const link = await createAuthLink(db, {
    userId: text(user.id),
    email,
    purpose: "login",
    returnPath: input.returnPath,
  });
  const origin = professionalAdminOrigin(env, request);
  const loginUrl = `${origin}/api/platform-auth/verify?token=${encodeURIComponent(link.rawToken)}`;

  if (await configuredEmailDelivery(env)) {
    try {
      await sendProfessionalEmail(env, {
        to: text(user.email || email),
        subject: "Your secure WedPlanned sign-in link",
        heading: "Sign in to WedPlanned",
        intro: "Use this one-time link to open your professional workspace. It expires in 20 minutes.",
        buttonLabel: "Sign in securely",
        url: loginUrl,
      });
      await markLinkDelivery(db, link.linkId, "sent");
    } catch (error: any) {
      await markLinkDelivery(db, link.linkId, "failed", error?.message);
      return { message: genericMessage };
    }
  } else if (truthy(env.WEDPLANNED_AUTH_DEBUG_LINKS)) {
    await markLinkDelivery(db, link.linkId, "manual");
    return { message: genericMessage, debugUrl: loginUrl };
  } else {
    await markLinkDelivery(db, link.linkId, "failed", "Email delivery is not configured.");
    return { message: genericMessage };
  }

  return { message: genericMessage };
}

export async function issueProfessionalInvitation(db: D1Db, env: PlatformAuthEnv, request: Request, actor: ProfessionalContext, input: any) {
  requireProfessionalPermission(actor, "members:manage");
  const email = lower(input?.email);
  const displayName = text(input?.displayName);
  const jobTitle = text(input?.jobTitle);
  const role = text(input?.role || "staff");
  if (!validEmail(email)) throw httpError("Enter a valid team-member email address.");
  if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) throw httpError("Choose a valid team role.");
  if (role === "owner" && actor.role !== "owner" && actor.platformRole !== "platform_admin") {
    throw httpError("Only a business owner can invite another owner.", 403);
  }

  const existingUser = await db.prepare(`SELECT id FROM platform_users WHERE email_normalized = ? LIMIT 1`).bind(email).first();
  const userId = text(existingUser?.id) || `user_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO platform_users (
      id, email_normalized, email, display_name, platform_role, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'member', 'invited', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(email_normalized) DO UPDATE SET
      email = excluded.email,
      display_name = CASE WHEN trim(excluded.display_name) <> '' THEN excluded.display_name ELSE platform_users.display_name END,
      status = CASE WHEN platform_users.status = 'disabled' THEN 'disabled' ELSE platform_users.status END,
      updated_at = CURRENT_TIMESTAMP
  `).bind(userId, email, email, displayName).run();

  const existingMembership = await db.prepare(`
    SELECT id FROM business_memberships WHERE workspace_id = ? AND email_normalized = ? LIMIT 1
  `).bind(actor.workspaceId, email).first();
  const membershipId = text(existingMembership?.id) || `membership_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO business_memberships (
      id, workspace_id, user_id, email_normalized, email, display_name,
      job_title, role, status, permissions_json, invited_at,
      invited_by_user_id, invitation_last_sent_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'invited', '{}', CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(workspace_id, email_normalized) DO UPDATE SET
      user_id = excluded.user_id,
      email = excluded.email,
      display_name = excluded.display_name,
      job_title = excluded.job_title,
      role = excluded.role,
      status = CASE WHEN business_memberships.status = 'active' THEN 'active' ELSE 'invited' END,
      invited_at = CURRENT_TIMESTAMP,
      invited_by_user_id = excluded.invited_by_user_id,
      invitation_last_sent_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    membershipId,
    actor.workspaceId,
    userId,
    email,
    email,
    displayName,
    jobTitle,
    role,
    text(actor.userId) || null,
  ).run();

  await db.prepare(`
    UPDATE platform_auth_links SET revoked_at = CURRENT_TIMESTAMP
    WHERE membership_id = ? AND purpose = 'invitation'
      AND consumed_at IS NULL AND revoked_at IS NULL
  `).bind(membershipId).run();

  const link = await createAuthLink(db, {
    userId,
    membershipId,
    email,
    purpose: "invitation",
    returnPath: "/admin/wedplanned?tab=team",
  });
  const origin = professionalAdminOrigin(env, request);
  const invitationUrl = `${origin}/api/platform-auth/verify?token=${encodeURIComponent(link.rawToken)}`;
  let delivery: "sent" | "manual" = "manual";

  if (await configuredEmailDelivery(env)) {
    try {
      await sendProfessionalEmail(env, {
        to: email,
        subject: `You have been invited to ${actor.businessName} on WedPlanned`,
        heading: `Join ${actor.businessName}`,
        intro: `You have been invited as ${role}. Accept the invitation to create your secure WedPlanned session. The link expires in seven days.`,
        buttonLabel: "Accept invitation",
        url: invitationUrl,
      });
      await markLinkDelivery(db, link.linkId, "sent");
      delivery = "sent";
    } catch (error: any) {
      await markLinkDelivery(db, link.linkId, "manual", error?.message);
      delivery = "manual";
    }
  } else {
    await markLinkDelivery(db, link.linkId, "manual");
  }

  await audit(db, {
    workspaceId: actor.workspaceId,
    actorUserId: actor.userId,
    actorEmail: actor.email,
    eventType: "business.member.invited",
    entityType: "membership",
    entityId: membershipId,
    summary: `Invited ${email} as ${role}.`,
    metadata: { delivery },
  });

  return {
    membershipId,
    delivery,
    ...(delivery === "manual" ? { invitationUrl } : {}),
    expiresAt: link.expiresAt,
  };
}

export async function verifyProfessionalAuthLink(db: D1Db, rawToken: string) {
  const tokenHash = await sha256(text(rawToken));
  const row = await db.prepare(`
    SELECT
      pal.*,
      pu.email,
      pu.display_name,
      pu.platform_role,
      pu.status AS user_status,
      bm.workspace_id,
      bm.status AS membership_status,
      bm.role AS membership_role
    FROM platform_auth_links pal
    JOIN platform_users pu ON pu.id = pal.user_id
    LEFT JOIN business_memberships bm ON bm.id = pal.membership_id
    WHERE pal.token_hash = ?
    LIMIT 1
  `).bind(tokenHash).first();

  if (!row || text(row.user_status) === "disabled") return { ok: false, status: 400, error: "This secure link is invalid or has expired." } as const;
  if (text(row.consumed_at)) return { ok: false, status: 400, error: "This secure link has already been used." } as const;
  if (text(row.revoked_at)) return { ok: false, status: 400, error: "This secure link has been replaced or revoked." } as const;
  if (!text(row.expires_at) || Date.parse(text(row.expires_at)) <= Date.now()) return { ok: false, status: 400, error: "This secure link has expired." } as const;

  const consumed = await db.prepare(`
    UPDATE platform_auth_links
    SET consumed_at = CURRENT_TIMESTAMP
    WHERE id = ? AND consumed_at IS NULL AND revoked_at IS NULL
      AND datetime(expires_at) > CURRENT_TIMESTAMP
  `).bind(text(row.id)).run();
  if (Number(consumed?.meta?.changes || 0) !== 1) return { ok: false, status: 400, error: "This secure link is no longer available." } as const;

  if (text(row.purpose) === "invitation") {
    if (!text(row.membership_id) || !text(row.workspace_id) || text(row.membership_status) === "disabled") {
      return { ok: false, status: 400, error: "This invitation is no longer active." } as const;
    }
    await db.prepare(`
      UPDATE business_memberships
      SET status = 'active', accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP),
          last_active_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(text(row.membership_id), text(row.user_id)).run();
  }

  await db.prepare(`
    UPDATE platform_users
    SET status = 'active', verified_at = COALESCE(verified_at, CURRENT_TIMESTAMP),
        last_authenticated_at = CURRENT_TIMESTAMP, last_signed_in_at = CURRENT_TIMESTAMP,
        last_login_method = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(text(row.purpose) === "invitation" ? "invitation" : "magic_link", text(row.user_id)).run();

  const memberships = await loadAccessOptions(db, text(row.user_id), text(row.platform_role || "member"));
  const preferredWorkspaceId = text(row.workspace_id);
  const active = memberships.find((membership) => membership.workspaceId === preferredWorkspaceId) || memberships[0];
  if (!active) return { ok: false, status: 403, error: "No active business or support access is available for this account." } as const;

  const rawSession = randomToken(32);
  const sessionHash = await sha256(rawSession);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const sessionId = `session_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO platform_sessions (
      id, user_id, token_hash, active_workspace_id, expires_at, last_seen_at, created_at
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(sessionId, text(row.user_id), sessionHash, active.workspaceId, expiresAt).run();

  await audit(db, {
    workspaceId: active.workspaceId,
    actorUserId: text(row.user_id),
    actorEmail: text(row.email),
    eventType: text(row.purpose) === "invitation" ? "auth.invitation.accepted" : "auth.login.completed",
    entityType: "session",
    entityId: sessionId,
    summary: text(row.purpose) === "invitation"
      ? `Accepted invitation to ${active.businessName}.`
      : active.accessMode === "support"
        ? `Signed in with support access to ${active.businessName}.`
        : `Signed in to ${active.businessName}.`,
  });
  if (active.accessMode === "support") {
    await recordSupportRequest(db, {
      grantId: active.supportGrantId,
      workspaceId: active.workspaceId,
      supportUserId: text(row.user_id),
      supportEmail: text(row.email),
      eventType: "support.session.started",
      method: "AUTH",
      path: "/api/platform-auth/verify",
      statusCode: 200,
      metadata: { scope: active.supportScope },
    });
  }

  db.prepare(`DELETE FROM platform_sessions WHERE datetime(expires_at) <= datetime('now', '-1 day') OR revoked_at IS NOT NULL`).run().catch(() => {});
  db.prepare(`DELETE FROM platform_auth_links WHERE datetime(expires_at) <= datetime('now', '-7 days')`).run().catch(() => {});

  return {
    ok: true,
    status: 200,
    sessionToken: rawSession,
    returnPath: safeReturnPath(row.return_path),
    workspaceId: active.workspaceId,
  } as const;
}

export async function switchProfessionalWorkspace(db: D1Db, request: Request, env: PlatformAuthEnv, workspaceIdInput: string) {
  const context = await requireProfessionalContext(db, request, env);
  requireProfessionalPermission(context, "workspace:switch");
  if (!context.authenticated) throw httpError("Sign in before switching business workspaces.", 401);
  const workspaceId = text(workspaceIdInput);
  const membership = context.memberships.find((item) => item.workspaceId === workspaceId);
  if (!membership) throw httpError("You do not have access to that business.", 403);
  const rawToken = cookieValue(request, SESSION_COOKIE);
  const tokenHash = await sha256(rawToken);
  const result = await db.prepare(`
    UPDATE platform_sessions
    SET active_workspace_id = ?, last_seen_at = CURRENT_TIMESTAMP
    WHERE token_hash = ? AND user_id = ? AND revoked_at IS NULL
      AND datetime(expires_at) > CURRENT_TIMESTAMP
  `).bind(workspaceId, tokenHash, context.userId).run();
  if (Number(result?.meta?.changes || 0) !== 1) throw httpError("Unable to switch business workspace.", 409);
  await audit(db, {
    workspaceId,
    actorUserId: context.userId,
    actorEmail: context.email,
    eventType: membership.accessMode === "support" ? "support.workspace.activated" : "auth.workspace.switched",
    entityType: "workspace",
    entityId: workspaceId,
    summary: membership.accessMode === "support"
      ? `Activated ${membership.supportScope} support access to ${membership.businessName}.`
      : `Switched to ${membership.businessName}.`,
  });
  if (membership.accessMode === "support") {
    await recordSupportRequest(db, {
      grantId: membership.supportGrantId,
      workspaceId,
      supportUserId: context.userId,
      supportEmail: context.email,
      eventType: "support.workspace.activated",
      method: "POST",
      path: "/api/platform-auth/switch-workspace",
      statusCode: 200,
      metadata: { scope: membership.supportScope },
    });
  }
  return getProfessionalContext(db, request, env);
}

export async function revokeProfessionalSession(db: D1Db, request: Request) {
  const rawToken = cookieValue(request, SESSION_COOKIE);
  if (!rawToken) return;
  const tokenHash = await sha256(rawToken);
  await db.prepare(`
    UPDATE platform_sessions SET revoked_at = CURRENT_TIMESTAMP
    WHERE token_hash = ? AND revoked_at IS NULL
  `).bind(tokenHash).run();
}
