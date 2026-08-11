import {
  provisionVerifiedSignupWorkspace,
} from "./platform-administration-d1";

import {
  createProfessionalSignupHandoff,
} from "./platform-auth-d1";

type D1Db = D1Database;

export type PlatformSignupEnv = {
  RESEND_API_KEY?: string;
  WEDPLANNED_AUTH_FROM_EMAIL?: string;
  WEDPLANNED_AUTH_FROM_NAME?: string;
};

const SIGNUP_TTL_MS =
  30 * 60 * 1000;

const EMAIL_WINDOW_MINUTES = 30;
const EMAIL_LIMIT = 3;

const FINGERPRINT_WINDOW_MINUTES = 60;
const FINGERPRINT_LIMIT = 5;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function validEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    lower(value),
  );
}

function httpError(
  message: string,
  statusCode = 400,
  code = "",
) {
  const error =
    new Error(message) as Error & {
      statusCode?: number;
      code?: string;
    };

  error.statusCode = statusCode;
  error.code = code;

  return error;
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
  const buffer =
    crypto.getRandomValues(
      new Uint8Array(bytes),
    );

  let binary = "";

  for (const byte of buffer) {
    binary +=
      String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256(value: string) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        value,
      ),
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

function slugBase(value: unknown) {
  let slug =
    lower(value)
      .normalize("NFKD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .replace(
        /[^a-z0-9]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      )
      .replace(
        /-{2,}/g,
        "-",
      )
      .slice(0, 50);

  if (!slug) {
    slug = "wedding-business";
  }

  if (slug.length < 3) {
    slug =
      `${slug}-business`;
  }

  return slug
    .slice(0, 60)
    .replace(/-+$/g, "");
}

async function requestFingerprint(
  request: Request,
) {
  const ip =
    text(
      request.headers.get(
        "CF-Connecting-IP",
      )
      || "unknown",
    );

  const agent =
    text(
      request.headers.get(
        "User-Agent",
      ),
    ).slice(
      0,
      180,
    );

  return sha256(
    `${ip}|${agent}`,
  );
}

async function uniqueRequestedSlug(
  db: D1Db,
  businessName: string,
) {
  const base =
    slugBase(businessName);

  for (
    let attempt = 1;
    attempt <= 100;
    attempt += 1
  ) {
    const suffix =
      attempt === 1
        ? ""
        : `-${attempt}`;

    const room =
      60 - suffix.length;

    const candidate =
      `${base.slice(0, room)}${suffix}`
        .replace(
          /-+$/g,
          "",
        );

    const conflict =
      await db.prepare(`
        SELECT 1 AS conflict
        FROM (
          SELECT slug AS candidate
          FROM workspaces
          WHERE slug = ?

          UNION ALL

          SELECT marketplace_slug AS candidate
          FROM business_profiles
          WHERE marketplace_slug = ?

          UNION ALL

          SELECT requested_slug AS candidate
          FROM platform_signup_requests
          WHERE requested_slug = ?
            AND status IN (
              'pending',
              'verified',
              'provisioned'
            )
            AND datetime(expires_at)
                > CURRENT_TIMESTAMP
        )
        LIMIT 1
      `).bind(
        candidate,
        candidate,
        candidate,
      ).first();

    if (!conflict) {
      return candidate;
    }
  }

  throw httpError(
    "Unable to reserve a workspace name. Please try another business name.",
    409,
    "slug_unavailable",
  );
}

async function sendVerificationEmail(
  env: PlatformSignupEnv,
  input: {
    to: string;
    ownerName: string;
    businessName: string;
    verifyUrl: string;
  },
) {
  const apiKey =
    text(
      env.RESEND_API_KEY,
    );

  const fromEmail =
    text(
      env.WEDPLANNED_AUTH_FROM_EMAIL,
    );

  const fromName =
    text(
      env.WEDPLANNED_AUTH_FROM_NAME
      || "WedPlanned",
    );

  if (
    !apiKey
    || !fromEmail
  ) {
    throw httpError(
      "WedPlanned signup email delivery is not configured.",
      500,
      "email_not_configured",
    );
  }

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          from:
            `${fromName} <${fromEmail}>`,
          to: [
            input.to,
          ],
          subject:
            "Verify your WedPlanned account",
          html:
            `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#151515;max-width:560px;margin:auto">`
            + `<p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b6b6b">WedPlanned</p>`
            + `<h1 style="font-size:25px;font-weight:600">Verify your professional account</h1>`
            + `<p>Hello ${escapeHtml(input.ownerName)},</p>`
            + `<p>Confirm your email address to create the secure WedPlanned workspace for <strong>${escapeHtml(input.businessName)}</strong>.</p>`
            + `<p style="margin:28px 0"><a href="${escapeHtml(input.verifyUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">Verify and create workspace</a></p>`
            + `<p style="font-size:12px;color:#777">This one-time link expires in 30 minutes. No workspace is created until you verify this email address.</p>`
            + `</div>`,
          text:
            `WedPlanned\n\n`
            + `Hello ${input.ownerName},\n\n`
            + `Confirm your email address to create the WedPlanned workspace for ${input.businessName}.\n\n`
            + `${input.verifyUrl}\n\n`
            + `This one-time link expires in 30 minutes. No workspace is created until you verify this email address.`,
        }),
      },
    );

  if (!response.ok) {
    const payload: any =
      await response
        .json()
        .catch(() => ({}));

    throw httpError(
      text(
        payload?.message
        || payload?.error
        || `Email provider returned ${response.status}.`,
      ),
      502,
      "email_delivery_failed",
    );
  }
}

export async function requestExternalBusinessSignup(
  db: D1Db,
  env: PlatformSignupEnv,
  request: Request,
  input: any,
) {
  const businessName =
    text(
      input?.businessName,
    ).slice(
      0,
      120,
    );

  const ownerDisplayName =
    text(
      input?.ownerDisplayName,
    ).slice(
      0,
      120,
    );

  const email =
    lower(
      input?.email,
    );

  if (
    businessName.length < 2
  ) {
    throw httpError(
      "Enter your business name.",
      400,
      "invalid_business_name",
    );
  }

  if (
    ownerDisplayName.length < 2
  ) {
    throw httpError(
      "Enter your name.",
      400,
      "invalid_owner_name",
    );
  }

  if (
    !validEmail(email)
  ) {
    throw httpError(
      "Enter a valid email address.",
      400,
      "invalid_email",
    );
  }

  db.prepare(`
    DELETE FROM platform_signup_requests
    WHERE
      (
        status = 'failed'
        AND datetime(updated_at)
            < datetime(
              'now',
              '-7 days'
            )
      )
      OR
      (
        status = 'pending'
        AND datetime(expires_at)
            < datetime(
              'now',
              '-7 days'
            )
      )
  `).run().catch(
    () => {},
  );

  const fingerprint =
    await requestFingerprint(
      request,
    );

  const emailRecent =
    await db.prepare(`
      SELECT COUNT(*) AS total
      FROM platform_signup_requests
      WHERE email_normalized = ?
        AND created_at >= datetime(
          'now',
          ?
        )
    `).bind(
      email,
      `-${EMAIL_WINDOW_MINUTES} minutes`,
    ).first();

  if (
    Number(
      emailRecent?.total
      || 0,
    ) >= EMAIL_LIMIT
  ) {
    throw httpError(
      "Too many signup links have been requested for this email. Please try again later.",
      429,
      "rate_limited",
    );
  }

  const fingerprintRecent =
    await db.prepare(`
      SELECT COUNT(*) AS total
      FROM platform_signup_requests
      WHERE request_fingerprint = ?
        AND created_at >= datetime(
          'now',
          ?
        )
    `).bind(
      fingerprint,
      `-${FINGERPRINT_WINDOW_MINUTES} minutes`,
    ).first();

  if (
    Number(
      fingerprintRecent?.total
      || 0,
    ) >= FINGERPRINT_LIMIT
  ) {
    throw httpError(
      "Too many signup requests have been made from this device. Please try again later.",
      429,
      "rate_limited",
    );
  }

  const existingUser =
    await db.prepare(`
      SELECT id, status
      FROM platform_users
      WHERE email_normalized = ?
      LIMIT 1
    `).bind(
      email,
    ).first();

  if (existingUser) {
    throw httpError(
      "A WedPlanned account already exists for this email. Sign in instead.",
      409,
      "existing_account",
    );
  }

  const requestedSlug =
    await uniqueRequestedSlug(
      db,
      businessName,
    );

  await db.prepare(`
    UPDATE platform_signup_requests
    SET
      status = 'failed',
      failure_reason =
        'Replaced by a newer signup request.',
      updated_at =
        CURRENT_TIMESTAMP
    WHERE email_normalized = ?
      AND status = 'pending'
      AND consumed_at IS NULL
  `).bind(
    email,
  ).run();

  const rawToken =
    randomToken(32);

  const tokenHash =
    await sha256(
      rawToken,
    );

  const expiresAt =
    new Date(
      Date.now()
      + SIGNUP_TTL_MS,
    ).toISOString();

  const signupId =
    `signup_${crypto.randomUUID()}`;

  await db.prepare(`
    INSERT INTO platform_signup_requests (
      id,
      email_normalized,
      email,
      owner_display_name,
      business_name,
      requested_slug,
      token_hash,
      request_fingerprint,
      status,
      delivery_status,
      delivery_error,
      failure_reason,
      expires_at,
      created_at,
      updated_at
    ) VALUES (
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      'pending',
      'pending',
      '',
      '',
      ?,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `).bind(
    signupId,
    email,
    email,
    ownerDisplayName,
    businessName,
    requestedSlug,
    tokenHash,
    fingerprint,
    expiresAt,
  ).run();

  const verifyUrl =
    new URL(
      "/api/signup/verify",
      request.url,
    );

  verifyUrl.searchParams.set(
    "token",
    rawToken,
  );

  try {
    await sendVerificationEmail(
      env,
      {
        to: email,
        ownerName:
          ownerDisplayName,
        businessName,
        verifyUrl:
          verifyUrl.toString(),
      },
    );

    await db.prepare(`
      UPDATE platform_signup_requests
      SET
        delivery_status = 'sent',
        delivery_error = '',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND status = 'pending'
    `).bind(
      signupId,
    ).run();
  } catch (error: any) {
    await db.prepare(`
      UPDATE platform_signup_requests
      SET
        status = 'failed',
        delivery_status = 'failed',
        delivery_error = ?,
        failure_reason =
          'Verification email delivery failed.',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      text(
        error?.message,
      ).slice(
        0,
        500,
      ),
      signupId,
    ).run();

    throw error;
  }

  return {
    ok: true,
    message:
      "Check your email to verify your WedPlanned account.",
    expiresAt,
  };
}

export async function verifyExternalBusinessSignup(
  db: D1Db,
  rawTokenInput: unknown,
) {
  const rawToken =
    text(
      rawTokenInput,
    );

  if (!rawToken) {
    throw httpError(
      "This verification link is invalid or has expired.",
      400,
      "invalid_token",
    );
  }

  const tokenHash =
    await sha256(
      rawToken,
    );

  const signup =
    await db.prepare(`
      SELECT *
      FROM platform_signup_requests
      WHERE token_hash = ?
      LIMIT 1
    `).bind(
      tokenHash,
    ).first();

  if (
    !signup
    || text(signup.status)
        !== "pending"
    || text(signup.consumed_at)
  ) {
    throw httpError(
      "This verification link is invalid or has already been used.",
      400,
      "invalid_token",
    );
  }

  if (
    !text(signup.expires_at)
    || Date.parse(
      text(
        signup.expires_at,
      ),
    ) <= Date.now()
  ) {
    await db.prepare(`
      UPDATE platform_signup_requests
      SET
        status = 'failed',
        failure_reason =
          'Verification link expired.',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND status = 'pending'
    `).bind(
      text(
        signup.id,
      ),
    ).run();

    throw httpError(
      "This verification link has expired.",
      400,
      "expired_token",
    );
  }

  const consumed =
    await db.prepare(`
      UPDATE platform_signup_requests
      SET
        status = 'verified',
        consumed_at =
          CURRENT_TIMESTAMP,
        verified_at =
          CURRENT_TIMESTAMP,
        failure_reason = '',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND token_hash = ?
        AND status = 'pending'
        AND consumed_at IS NULL
        AND datetime(expires_at)
            > CURRENT_TIMESTAMP
    `).bind(
      text(
        signup.id,
      ),
      tokenHash,
    ).run();

  if (
    Number(
      consumed?.meta?.changes
      || 0,
    ) !== 1
  ) {
    throw httpError(
      "This verification link is no longer available.",
      409,
      "token_consumed",
    );
  }

  let provisioned;

  try {
    provisioned =
      await provisionVerifiedSignupWorkspace(
        db,
        {
          businessName:
            text(
              signup.business_name,
            ),
          slug:
            text(
              signup.requested_slug,
            ),
          ownerEmail:
            lower(
              signup.email,
            ),
          ownerDisplayName:
            text(
              signup.owner_display_name,
            ),
          defaultCountry:
            "GB",
          timezone:
            "Europe/London",
          currency:
            "GBP",
        },
      );
  } catch (error: any) {
    await db.prepare(`
      UPDATE platform_signup_requests
      SET
        status = 'failed',
        failure_reason = ?,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      text(
        error?.message,
      ).slice(
        0,
        500,
      ),
      text(
        signup.id,
      ),
    ).run();

    throw error;
  }

  await db.prepare(`
    UPDATE platform_signup_requests
    SET
      status = 'provisioned',
      workspace_id = ?,
      provisioned_at =
        CURRENT_TIMESTAMP,
      failure_reason = '',
      updated_at =
        CURRENT_TIMESTAMP
    WHERE id = ?
      AND status = 'verified'
  `).bind(
    provisioned.workspaceId,
    text(
      signup.id,
    ),
  ).run();

  let handoff;

  try {
    handoff =
      await createProfessionalSignupHandoff(
        db,
        {
          userId:
            provisioned.ownerUserId,
          workspaceId:
            provisioned.workspaceId,
          email:
            provisioned.ownerEmail,
          returnPath:
            "/admin",
        },
      );
  } catch {
    /*
     * Provisioning has already completed at this point. Do not
     * roll the signup back to failed and do not make the consumed
     * email-verification token reusable. The active owner can
     * recover safely through the existing professional sign-in
     * flow, which issues a fresh one-time login link.
     */
    await db.prepare(`
      UPDATE platform_signup_requests
      SET
        failure_reason =
          'Admin sign-in handoff failed. Use normal sign-in recovery.',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND status = 'provisioned'
        AND workspace_id = ?
    `).bind(
      text(
        signup.id,
      ),
      provisioned.workspaceId,
    ).run();

    throw httpError(
      "Your WedPlanned workspace has been created, but automatic sign-in could not be completed. Continue to Sign in and request a new secure sign-in link.",
      503,
      "handoff_failed",
    );
  }

  return {
    ok: true,
    workspaceId:
      provisioned.workspaceId,
    handoffToken:
      handoff.rawToken,
    handoffExpiresAt:
      handoff.expiresAt,
  };
}
