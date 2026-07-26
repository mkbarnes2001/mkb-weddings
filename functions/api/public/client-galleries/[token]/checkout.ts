import { getAuthenticatedClientIdentity } from "../../../../../serverless/client-auth-d1";
import { getPublicClientGallery } from "../../../../../serverless/client-gallery-d1";
import {
  attachStripeCheckoutSession,
  getPublicCheckoutOrder,
  preparePublicCheckoutOrder,
  processStripePaymentEvent,
} from "../../../../../serverless/print-store-d1";
import {
  createStripeCheckoutSession,
  retrieveStripeCheckoutSession,
  sanitizedStripeEventPayload,
  stripeCheckoutConfigured,
} from "../../../../../serverless/stripe-payments";

type Env = {
  MKB_DB: D1Database;
  STRIPE_SECRET_KEY?: string;
  STRIPE_SHIPPING_COUNTRIES?: string;
  STRIPE_CHECKOUT_ENABLED?: string;
  STRIPE_API_BASE?: string;
  PUBLIC_SITE_ORIGIN?: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function tokenOf(context: any) {
  return text(context.params.token);
}

function errorResponse(error: any) {
  return Response.json(
    { error: error?.message || "Unable to open secure payment." },
    { status: Number(error?.statusCode || 500), headers: { "Cache-Control": "private, no-store" } },
  );
}

async function authorise(context: any, input: any) {
  const identity = await getAuthenticatedClientIdentity(context.env.MKB_DB, context.request);
  const access = await getPublicClientGallery(
    context.env.MKB_DB,
    tokenOf(context),
    text(input?.pin),
    text(input?.visitorKey || input?.visitor),
    text(input?.email),
    text(input?.displayName),
    identity,
  );
  const accessBody: any = access.body || {};
  if (access.status !== 200 || accessBody.locked) {
    return {
      response: Response.json(
        { error: accessBody.error || "Gallery access is required." },
        { status: access.status || 401, headers: { "Cache-Control": "private, no-store" } },
      ),
      identity,
      galleryId: "",
    };
  }
  return { response: null, identity, galleryId: text(accessBody.id) };
}

function publicOrigin(context: any) {
  const configured = text(context.env.PUBLIC_SITE_ORIGIN).replace(/\/+$/, "");
  if (/^https?:\/\//i.test(configured)) return configured;
  return new URL(context.request.url).origin;
}

function reconciliationEvent(session: any) {
  const status = text(session?.status);
  const paymentStatus = text(session?.payment_status);
  return {
    id: `stripe_reconcile_${text(session?.id)}_${status}_${paymentStatus}`,
    type: status === "expired" ? "checkout.session.expired" : "checkout.session.reconciled",
    created: Math.floor(Date.now() / 1000),
    livemode: Boolean(session?.livemode),
    data: { object: session },
  };
}

async function reconcileClosedSession(db: D1Database, session: any) {
  const status = text(session?.status);
  if (status !== "complete" && status !== "expired") return;
  const event = reconciliationEvent(session);
  await processStripePaymentEvent(db, event, sanitizedStripeEventPayload(event));
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const access = await authorise(context, body || {});
    if (access.response) return access.response;
    if (!stripeCheckoutConfigured(context.env)) {
      return Response.json(
        { error: "Secure card payment is temporarily unavailable. Please contact the photographer." },
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    let order = await preparePublicCheckoutOrder(
      context.env.MKB_DB,
      access.galleryId,
      text(body?.visitorKey),
      access.identity,
      body || {},
    );
    if (["paid", "refunded"].includes(text(order.paymentStatus))) {
      return Response.json({ ok: true, order }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (order.checkoutSessionId) {
      const currentSession = await retrieveStripeCheckoutSession(context.env, order.checkoutSessionId).catch(() => null);
      if (currentSession) {
        await reconcileClosedSession(context.env.MKB_DB, currentSession);
        order = await getPublicCheckoutOrder(
          context.env.MKB_DB,
          access.galleryId,
          order.id,
          text(body?.visitorKey),
          access.identity,
        );
        if (text(currentSession.status) === "open" && text(currentSession.url)) {
          return Response.json(
            { ok: true, checkoutUrl: text(currentSession.url), order },
            { headers: { "Cache-Control": "private, no-store" } },
          );
        }
        if (["paid", "refunded"].includes(text(order.paymentStatus))) {
          return Response.json({ ok: true, order }, { headers: { "Cache-Control": "private, no-store" } });
        }
      }
    }

    const origin = publicOrigin(context);
    const galleryPath = `/client-gallery/${encodeURIComponent(tokenOf(context))}`;
    const successUrl = `${origin}${galleryPath}?checkout=success&order=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}${galleryPath}?checkout=cancelled&order=${encodeURIComponent(order.id)}`;
    const { session, attempt } = await createStripeCheckoutSession(context.env, order, { successUrl, cancelUrl });
    await attachStripeCheckoutSession(context.env.MKB_DB, order.id, session, attempt);
    order = await getPublicCheckoutOrder(
      context.env.MKB_DB,
      access.galleryId,
      order.id,
      text(body?.visitorKey),
      access.identity,
    );
    return Response.json(
      { ok: true, checkoutUrl: text(session?.url), order },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const input = {
      pin: url.searchParams.get("pin") || "",
      email: url.searchParams.get("email") || "",
      visitor: url.searchParams.get("visitor") || "",
    };
    const access = await authorise(context, input);
    if (access.response) return access.response;
    const orderId = text(url.searchParams.get("order"));
    const sessionId = text(url.searchParams.get("session_id"));
    if (!orderId) {
      return Response.json({ error: "Order is required." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
    }

    let order = await getPublicCheckoutOrder(
      context.env.MKB_DB,
      access.galleryId,
      orderId,
      text(input.visitor),
      access.identity,
    );
    if (sessionId && stripeCheckoutConfigured(context.env)) {
      if (order.checkoutSessionId && text(order.checkoutSessionId) !== sessionId) {
        return Response.json(
          { error: "Checkout session does not match this order." },
          { status: 409, headers: { "Cache-Control": "private, no-store" } },
        );
      }
      const session = await retrieveStripeCheckoutSession(context.env, sessionId);
      const sessionOrderId = text(session?.metadata?.order_id || session?.client_reference_id);
      const sessionGalleryId = text(session?.metadata?.gallery_id);
      if (sessionOrderId !== orderId || (sessionGalleryId && sessionGalleryId !== access.galleryId)) {
        return Response.json(
          { error: "Checkout session does not match this gallery order." },
          { status: 409, headers: { "Cache-Control": "private, no-store" } },
        );
      }
      await reconcileClosedSession(context.env.MKB_DB, session);
      order = await getPublicCheckoutOrder(
        context.env.MKB_DB,
        access.galleryId,
        orderId,
        text(input.visitor),
        access.identity,
      );
    }
    return Response.json({ ok: true, order }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
