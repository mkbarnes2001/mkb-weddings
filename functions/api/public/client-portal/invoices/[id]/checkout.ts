import {
  getPublicInvoiceCheckoutContext,
} from "../../../../../../serverless/client-portal-commercial-d1";

import {
  beginStripeInvoiceCheckout,
} from "../../../../../../serverless/crm-connected-payments-d1";

import {
  resolveClientPortalWorkspaceId,
} from "../../../../../../serverless/tenant-context";


type Env = {
  MKB_DB: D1Database;

  WEDPLANNED_STRIPE_SECRET_KEY?: string;
  WEDPLANNED_STRIPE_API_BASE?: string;
};


export const onRequestPost:
PagesFunction<Env> = async (
  context,
) => {
  try {
    const workspaceId =
      await resolveClientPortalWorkspaceId(
        context.env.MKB_DB,
        context.request,
      );

    const invoiceId =
      String(
        context.params.id
        || "",
      ).trim();

    if (!invoiceId) {
      return Response.json(
        {
          error:
            "Invoice is required.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "private, no-store",
          },
        },
      );
    }

    const body: any =
      await context.request
        .json()
        .catch(() => ({}));

    /*
     * This call performs the canonical client identity,
     * invoice visibility and active Job-access checks.
     */
    const checkoutContext =
      await getPublicInvoiceCheckoutContext(
        context.env.MKB_DB,
        context.request,
        workspaceId,
        invoiceId,
      );

    const checkout =
      await beginStripeInvoiceCheckout(
        context.env.MKB_DB,
        context.env,
        {
          workspaceId,

          identityId:
            checkoutContext
              .identity.id,

          clientEmail:
            checkoutContext
              .identity.email,

          invoice:
            checkoutContext
              .invoice,

          scheduleItemId:
            String(
              body?.scheduleItemId
              || "",
            ).trim(),

          requestUrl:
            context.request.url,
        },
      );

    return Response.json(
      {
        ok: true,
        checkout,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      },
    );

  } catch (error: any) {
    return Response.json(
      {
        error:
          error?.message
          || "Unable to start card payment.",
      },
      {
        status:
          Number(
            error?.statusCode
            || 500,
          ),

        headers: {
          "Cache-Control":
            "private, no-store",
        },
      },
    );
  }
};
