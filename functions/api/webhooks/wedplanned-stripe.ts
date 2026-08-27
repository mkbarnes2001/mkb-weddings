import {
  processStripeInvoicePaymentEvent,
} from "../../../serverless/crm-connected-payments-d1";

import {
  verifyStripeWebhook,
} from "../../../serverless/stripe-payments";


type Env = {
  MKB_DB: D1Database;

  WEDPLANNED_STRIPE_WEBHOOK_SECRET?: string;

  WEDPLANNED_STRIPE_WEBHOOK_TOLERANCE_SECONDS?: string;
};


export const onRequestPost:
PagesFunction<Env> = async (
  context,
) => {
  try {
    /*
     * Signature verification requires the exact raw request
     * body. Never JSON-parse before verification.
     */
    const rawBody =
      await context.request.text();

    const signature =
      context.request.headers.get(
        "Stripe-Signature",
      )
      || "";

    /*
     * Reuse the canonical Stripe verifier while keeping
     * WedCRM Connect payments on their own signing secret.
     */
    const event =
      await verifyStripeWebhook(
        {
          STRIPE_WEBHOOK_SECRET:
            context.env
              .WEDPLANNED_STRIPE_WEBHOOK_SECRET,

          STRIPE_WEBHOOK_TOLERANCE_SECONDS:
            context.env
              .WEDPLANNED_STRIPE_WEBHOOK_TOLERANCE_SECONDS,
        },
        rawBody,
        signature,
      );

    /*
     * Only a cryptographically verified Stripe event reaches
     * financial reconciliation.
     */
    const result =
      await processStripeInvoicePaymentEvent(
        context.env.MKB_DB,
        event,
      );

    return Response.json(
      {
        received: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );

  } catch (error: any) {
    return Response.json(
      {
        error:
          error?.message
          || "Unable to process WedPlanned Stripe webhook.",
      },
      {
        status:
          Number(
            error?.statusCode
            || 500,
          ),

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
};
