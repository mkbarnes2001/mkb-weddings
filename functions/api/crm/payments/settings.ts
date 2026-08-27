import {
  getWorkspacePaymentSettings,
  saveWorkspacePaymentSettings,
  stripeConnectConfigured,
} from "../../../../serverless/crm-connected-payments-d1";
import {
  requireProfessionalContext,
} from "../../../../serverless/platform-auth-d1";


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


function errorResponse(error: any) {
  return Response.json(
    {
      error:
        error?.message
        || "Unable to manage payment settings.",
    },
    {
      status:
        Number(error?.statusCode || 500),
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}


export const onRequestGet:
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
      await getWorkspacePaymentSettings(
        context.env.MKB_DB,
        actor,
      );

    return Response.json(
      {
        ok: true,
        settings,
        stripeConnectConfigured:
          stripeConnectConfigured(
            context.env,
          ),
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      },
    );
  } catch (error: any) {
    return errorResponse(error);
  }
};


export const onRequestPut:
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

    const body: any =
      await context.request
        .json()
        .catch(() => ({}));

    const settings =
      await saveWorkspacePaymentSettings(
        context.env.MKB_DB,
        actor,
        body,
      );

    return Response.json(
      {
        ok: true,
        settings,
        stripeConnectConfigured:
          stripeConnectConfigured(
            context.env,
          ),
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      },
    );
  } catch (error: any) {
    return errorResponse(error);
  }
};
