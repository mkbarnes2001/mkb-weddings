import { professionalSessionCookie, verifyProfessionalAuthLink } from "../../../serverless/platform-auth-d1";

type Env = { MKB_DB: D1Database };

function errorPage(message: string) {
  const safe = String(message || "Unable to complete secure sign-in.").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
  return `<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WedPlanned sign-in</title></head><body style="font-family:Arial,sans-serif;background:#f5f3ef;color:#111;display:grid;place-items:center;min-height:100vh;margin:0"><main style="max-width:520px;background:#fff;border:1px solid #ddd;border-radius:18px;padding:32px;text-align:center"><p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#777">WedPlanned</p><h1 style="font-size:24px">Secure sign-in unavailable</h1><p style="line-height:1.6;color:#555">${safe}</p><p><a href="/admin" style="color:#111">Return to sign-in</a></p></main></body></html>`;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const result = await verifyProfessionalAuthLink(context.env.MKB_DB, String(url.searchParams.get("token") || ""));
    if (!result.ok) {
      return new Response(errorPage(result.error), {
        status: result.status,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
      });
    }
    const destination = new URL(result.returnPath, url.origin).toString();
    return new Response(null, {
      status: 302,
      headers: {
        Location: destination,
        "Set-Cookie": professionalSessionCookie(result.sessionToken, context.request.url),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    return new Response(errorPage(error?.message), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }
};
