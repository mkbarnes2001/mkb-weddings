import { getAuthenticatedClientIdentity } from "../../../../../serverless/client-auth-d1";
import { getPublicClientGallery } from "../../../../../serverless/client-gallery-d1";
import { getPublicPrintStore, mutatePublicPrintStore } from "../../../../../serverless/print-store-d1";
import { stripeCheckoutConfigured } from "../../../../../serverless/stripe-payments";

type Env = { MKB_DB: D1Database; STRIPE_SECRET_KEY?: string; STRIPE_CHECKOUT_ENABLED?: string };

function tokenOf(context: any) {
  return String(context.params.token || "").trim();
}

function errorResponse(error: any) {
  return Response.json(
    { error: error?.message || "Unable to update the Print Store." },
    { status: Number(error?.statusCode || 500), headers: { "Cache-Control": "private, no-store" } },
  );
}

async function authorise(context: any, input: any) {
  const identity = await getAuthenticatedClientIdentity(context.env.MKB_DB, context.request);
  const access = await getPublicClientGallery(
    context.env.MKB_DB,
    tokenOf(context),
    String(input?.pin || ""),
    String(input?.visitorKey || ""),
    String(input?.email || ""),
    String(input?.displayName || ""),
    identity,
  );
  if (access.status !== 200 || access.body?.locked) {
    return { response: Response.json({ error: access.body?.error || "Gallery access is required." }, { status: access.status || 401 }), identity, galleryId: "" };
  }
  return { response: null, identity, galleryId: String(access.body?.id || "") };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const input = {
      pin: url.searchParams.get("pin") || "",
      email: url.searchParams.get("email") || "",
      visitorKey: url.searchParams.get("visitor") || "",
    };
    const access = await authorise(context, input);
    if (access.response) return access.response;
    return Response.json(
      { ok: true, paymentProvider: "stripe", checkoutEnabled: stripeCheckoutConfigured(context.env), ...(await getPublicPrintStore(context.env.MKB_DB, access.galleryId, input.visitorKey, access.identity)) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const access = await authorise(context, body || {});
    if (access.response) return access.response;
    return Response.json(
      { ok: true, paymentProvider: "stripe", checkoutEnabled: stripeCheckoutConfigured(context.env), ...(await mutatePublicPrintStore(context.env.MKB_DB, access.galleryId, String(body?.visitorKey || ""), access.identity, body || {})) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
};
