import { clientSessionCookie, verifyClientMagicLink } from "../../../../serverless/client-auth-d1";

type Env = { MKB_DB: D1Database };

function errorPage(message: string) {
  const safe = message.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
  return `<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Secure sign-in</title></head><body style="font-family:Arial,sans-serif;background:#f7f6f3;color:#111;display:grid;place-items:center;min-height:100vh;margin:0"><main style="max-width:520px;background:white;border:1px solid #ddd;border-radius:18px;padding:32px;text-align:center"><h1 style="font-size:24px">Secure sign-in unavailable</h1><p style="line-height:1.6;color:#555">${safe}</p></main></body></html>`;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const result = await verifyClientMagicLink(context.env.MKB_DB, String(url.searchParams.get("token") || ""));
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
        "Set-Cookie": clientSessionCookie(result.sessionToken, context.request.url),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    return new Response(errorPage(error?.message || "Unable to complete secure sign-in."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }
};
