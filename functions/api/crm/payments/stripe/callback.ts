import {
  completeStripeConnection,
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


const DEFAULT_RETURN =
  "/admin/crm/payment-setup";


function safeReturnPath(
  value: unknown,
) {
  const path =
    String(value || "").trim();

  return (
    path.startsWith("/admin/")
    && !path.startsWith("//")
  )
    ? path
    : DEFAULT_RETURN;
}


function redirectResult(
  requestUrl: string,
  returnPath: string,
  result: string,
  message = "",
) {
  const origin =
    new URL(requestUrl).origin;

  const destination =
    new URL(
      safeReturnPath(returnPath),
      origin,
    );

  destination.searchParams.set(
    "stripe",
    result,
  );

  if (message) {
    destination.searchParams.set(
      "stripeMessage",
      message.slice(0, 240),
    );
  }

  return Response.redirect(
    destination.toString(),
    302,
  );
}


export const onRequestGet:
PagesFunction<Env> = async (
  context,
) => {
  const url =
    new URL(context.request.url);

  try {
    const actor =
      await requireProfessionalContext(
        context.env.MKB_DB,
        context.request,
        context.env,
      );

    const providerError =
      url.searchParams.get("error");

    if (providerError) {
      return redirectResult(
        context.request.url,
        DEFAULT_RETURN,
        "error",
        url.searchParams.get(
          "error_description",
        )
        || "Stripe connection was not completed.",
      );
    }

    const result =
      await completeStripeConnection(
        context.env.MKB_DB,
        context.env,
        actor,
        context.request.url,
        {
          code:
            url.searchParams.get(
              "code",
            ),
          state:
            url.searchParams.get(
              "state",
            ),
        },
      );

    return redirectResult(
      context.request.url,
      result.returnPath,
      "connected",
    );
  } catch (error: any) {
    return redirectResult(
      context.request.url,
      DEFAULT_RETURN,
      "error",
      error?.message
      || "Unable to complete Stripe connection.",
    );
  }
};
