import { getAuthenticatedClientIdentity } from "../../../../serverless/client-auth-d1";
import { getPublicClientGallery } from "../../../../serverless/client-gallery-d1";

type Env = {
  MKB_DB: D1Database;
  RESEND_API_KEY?: string;
  CLIENT_AUTH_FROM_EMAIL?: string;
};

function withAuthConfig(env: Env, body: any) {
  return {
    ...(body || {}),
    secureSignInAvailable: Boolean(String(env.RESEND_API_KEY || "").trim() && String(env.CLIENT_AUTH_FROM_EMAIL || "").trim()),
  };
}

function tokenOf(context: any) {
  return String(context.params.token || "").trim();
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const visitorKey = String(url.searchParams.get("visitor") || "").trim();
    const authenticatedIdentity = await getAuthenticatedClientIdentity(context.env.MKB_DB, context.request);
    const result = await getPublicClientGallery(context.env.MKB_DB, tokenOf(context), "", visitorKey, "", "", authenticatedIdentity);
    return Response.json(withAuthConfig(context.env, result.body), {
      status: result.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to load client gallery." }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const authenticatedIdentity = await getAuthenticatedClientIdentity(context.env.MKB_DB, context.request);
    const result = await getPublicClientGallery(
      context.env.MKB_DB,
      tokenOf(context),
      String(body?.pin || ""),
      String(body?.visitorKey || ""),
      String(body?.email || ""),
      String(body?.displayName || ""),
      authenticatedIdentity,
    );
    return Response.json(withAuthConfig(context.env, result.body), {
      status: result.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to unlock client gallery." }, { status: 500 });
  }
};
