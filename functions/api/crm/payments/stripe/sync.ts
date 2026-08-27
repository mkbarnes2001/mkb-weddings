import {
  syncStripeConnection,
} from "../../../../../serverless/crm-connected-payments-d1";
import {
  requireProfessionalContext,
} from "../../../../../serverless/platform-auth-d1";


type Env = {
  MKB_DB: D1Database;

  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;

  WEDPLANNED_STRIPE_SECRET_KEY?: string;
  WEDPLANNED_STRIPE_CONNECT_CLIENT_ID?: string;
  WEDPLANNED_STRIPE_CONNECT_REDIRECT_URI?: string;
  WEDPLANNED_STRIPE_API_BASE?: string;
  WEDPLANNED_STRIPE_CONNECT_BASE?: string;
};


export const onRequestPost:
PagesFunction<Env> = async (
  context,
) => {
  try {
    const actor =
      await requireProfessionalContext(
        context.env.MKB_DB,
        context.request,
        context.env,
      );

    const settings =
      await syncStripeConnection(
        context.env.MKB_DB,
        context.env,
        actor,
      );

    return Response.json(
      {
        ok: true,
        settings,
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
          || "Unable to refresh Stripe connection.",
      },
      {
        status:
          Number(error?.statusCode || 500),
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      },
    );
  }
};
