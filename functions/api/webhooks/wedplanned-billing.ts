import {
  verifyStripeWebhook,
} from "../../../serverless/stripe-payments";
import {
  processVerifiedStripeSubscriptionBillingEvent,
} from "../../../serverless/platform-subscription-billing-webhook-d1";


type Env = {
  MKB_DB: D1Database;
  WEDPLANNED_BILLING_STRIPE_WEBHOOK_SECRET?: string;
  WEDPLANNED_BILLING_STRIPE_WEBHOOK_TOLERANCE_SECONDS?: string;
  WEDPLANNED_BILLING_STRIPE_LIVE_ENABLED?: string;
  WEDPLANNED_BILLING_GRACE_DAYS?: string;
};


function text(value: unknown) {
  return String(value ?? "").trim();
}


function truthy(value: unknown) {
  return ["1", "true", "yes", "on"].includes(
    text(value).toLowerCase(),
  );
}


function integer(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}


function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}


async function sha256(value: string) {
  return hex(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    ),
  );
}


export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    // Signature verification requires the exact raw request body. Never parse
    // JSON or reconstruct the payload before verification.
    const rawBody = await context.request.text();
    const signature =
      context.request.headers.get("Stripe-Signature") || "";

    const event = await verifyStripeWebhook(
      {
        STRIPE_WEBHOOK_SECRET:
          context.env.WEDPLANNED_BILLING_STRIPE_WEBHOOK_SECRET,
        STRIPE_WEBHOOK_TOLERANCE_SECONDS:
          context.env.WEDPLANNED_BILLING_STRIPE_WEBHOOK_TOLERANCE_SECONDS,
      },
      rawBody,
      signature,
    );

    // Only cryptographically verified Stripe events reach subscription state.
    const result = await processVerifiedStripeSubscriptionBillingEvent(
      context.env.MKB_DB,
      event,
      {
        payloadSha256: await sha256(rawBody),
        liveEnabled: truthy(
          context.env.WEDPLANNED_BILLING_STRIPE_LIVE_ENABLED,
        ),
        graceDays: integer(
          context.env.WEDPLANNED_BILLING_GRACE_DAYS,
          7,
        ),
      },
    );

    return Response.json(
      {
        received: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error: any) {
    return Response.json(
      {
        error:
          error?.message
          || "Unable to process WedPlanned subscription billing webhook.",
      },
      {
        status: Number(error?.statusCode || 500),
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
};
