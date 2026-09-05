import {
  processStripeInvoicePaymentEvent,
} from "../../../serverless/crm-connected-payments-d1";

import {
  verifyStripeWebhook,
} from "../../../serverless/stripe-payments";

import {
  deliverInvoicePaymentReceiptNotifications,
  type InvoicePaymentReceiptEnv,
} from "../../../serverless/crm-payment-receipts-d1";


type Env = InvoicePaymentReceiptEnv & {
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

    /*
     * Financial settlement remains authoritative and idempotent in
     * crm_invoice_payments. Delivery is attempted only when that
     * verified settlement resolves a real payment. Duplicate Stripe
     * events safely re-enter the deterministic communication outbox
     * so a previously failed notification can retry without re-sending
     * one already marked sent.
     */
    const settlement: any = result;

    const notifications =
      settlement?.workspaceId
      && settlement?.paymentId
      && !settlement?.rejected
        ? await deliverInvoicePaymentReceiptNotifications(
            context.env.MKB_DB,
            context.env,
            {
              workspaceId:
                settlement.workspaceId,
              paymentId:
                settlement.paymentId,
              attemptId:
                settlement.attemptId,
            },
          )
        : null;

    return Response.json(
      {
        received: true,
        ...result,
        notifications,
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
