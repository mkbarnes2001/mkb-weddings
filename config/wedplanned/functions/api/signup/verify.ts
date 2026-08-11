import {
  verifyExternalBusinessSignup,
} from "../../../../../serverless/platform-signup-d1";

type Env = {
  MKB_DB: D1Database;
  WEDPLANNED_ADMIN_ORIGIN?: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function escapeHtml(value: unknown) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function errorPage(
  message: string,
  code = "",
) {
  const safe =
    escapeHtml(
      message
      || "Unable to verify this signup.",
    );

  const recoveryAction =
    code === "handoff_failed"
      ? `<p><a href="/sign-in" style="color:#111;font-weight:600">Continue to sign in</a></p>`
      : `<p><a href="/get-started" style="color:#111">Return to Get started</a></p>`;

  return `<!doctype html>
<html>
<head>
<meta name="robots" content="noindex,nofollow">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WedPlanned signup</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f5f3ef;color:#111;display:grid;place-items:center;min-height:100vh;margin:0">
<main style="max-width:520px;background:#fff;border:1px solid #ddd;border-radius:18px;padding:32px;text-align:center">
<p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#777">WedPlanned</p>
<h1 style="font-size:24px">Unable to complete signup</h1>
<p style="line-height:1.6;color:#555">${safe}</p>
${recoveryAction}
</main>
</body>
</html>`;
}

export const onRequestGet:
  PagesFunction<Env> =
async (context) => {
  try {
    const url =
      new URL(
        context.request.url,
      );

    const result =
      await verifyExternalBusinessSignup(
        context.env.MKB_DB,
        url.searchParams.get(
          "token",
        ),
      );

    const adminOrigin =
      text(
        context.env
          .WEDPLANNED_ADMIN_ORIGIN,
      )
      || "https://admin.mkbweddings.co.uk";

    const destination =
      new URL(
        "/api/platform-auth/verify",
        adminOrigin,
      );

    destination.searchParams.set(
      "token",
      result.handoffToken,
    );

    return new Response(
      null,
      {
        status: 302,
        headers: {
          Location:
            destination.toString(),
          "Cache-Control":
            "private, no-store",
          "Referrer-Policy":
            "no-referrer",
        },
      },
    );
  } catch (error: any) {
    return new Response(
      errorPage(
        error?.message,
        String(
          error?.code
          || "",
        ),
      ),
      {
        status:
          error?.statusCode
          || 500,
        headers: {
          "Content-Type":
            "text/html; charset=utf-8",
          "Cache-Control":
            "private, no-store",
          "Referrer-Policy":
            "no-referrer",
        },
      },
    );
  }
};
