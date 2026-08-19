import {
  clearClientSessionCookie,
  clientSessionCookie,
  getAuthenticatedClientIdentity,
} from "../../../../serverless/client-auth-d1";
import { verifyPortalMagicLink } from "../../../../serverless/client-portal-d1";
import {
  recordCrmEmailClick,
} from "../../../../serverless/crm-email-engagement-d1";

type Env = { MKB_DB: D1Database };

function errorPage(message: string) {
  const safe = message.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
  return `<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Client portal sign-in</title></head><body style="font-family:Arial,sans-serif;background:#f5f3ef;color:#111;display:grid;place-items:center;min-height:100vh;margin:0"><main style="max-width:520px;background:#fff;border:1px solid #ddd;border-radius:18px;padding:32px;text-align:center"><h1 style="font-size:24px">Client portal sign-in unavailable</h1><p style="line-height:1.6;color:#555">${safe}</p></main></body></html>`;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const result = await verifyPortalMagicLink(context.env.MKB_DB, String(url.searchParams.get("token") || ""));
    if (!result.ok) {
      if (
        "identityId" in result
        && "returnPath" in result
        && result.identityId
        && result.returnPath
      ) {
        const authenticatedIdentity =
          await getAuthenticatedClientIdentity(
            context.env.MKB_DB,
            context.request,
          );

        if (
          authenticatedIdentity?.id
          === result.identityId
        ) {
          return new Response(null, {
            status: 302,
            headers: {
              Location:
                new URL(
                  result.returnPath,
                  url.origin,
                ).toString(),
              "Cache-Control":
                "private, no-store",
            },
          });
        }

        const reauthUrl =
          new URL(
            result.returnPath,
            url.origin,
          );

        reauthUrl.searchParams.set(
          "reauth",
          "1",
        );

        return new Response(null, {
          status: 302,
          headers: {
            Location:
              reauthUrl.toString(),
            "Set-Cookie":
              clearClientSessionCookie(
                context.request.url,
              ),
            "Cache-Control":
              "private, no-store",
          },
        });
      }

      return new Response(errorPage(result.error), {
        status: result.status,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
      });
    }

    const engagementToken =
      String(
        url.searchParams
          .get("engagement")
        || "",
      );

    if (engagementToken) {
      try {
        await recordCrmEmailClick(
          context.env.MKB_DB,
          engagementToken,
        );
      } catch {
        // Engagement telemetry must never block
        // successful client authentication.
      }
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: new URL(result.returnPath, url.origin).toString(),
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
