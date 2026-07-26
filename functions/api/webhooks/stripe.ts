import { processStripePaymentEvent } from "../../../serverless/print-store-d1";
import { sanitizedStripeEventPayload, verifyStripeWebhook } from "../../../serverless/stripe-payments";

type Env = {
  MKB_DB: D1Database;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_WEBHOOK_TOLERANCE_SECONDS?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const rawBody = await context.request.text();
    const signature = context.request.headers.get("Stripe-Signature") || "";
    const event = await verifyStripeWebhook(context.env, rawBody, signature);
    const result = await processStripePaymentEvent(
      context.env.MKB_DB,
      event,
      sanitizedStripeEventPayload(event),
    );
    return Response.json({ received: true, ...result });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Unable to process Stripe webhook." },
      { status: Number(error?.statusCode || 500) },
    );
  }
};
