import {
  beginStripeHostedOnboarding,
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
  const destination =
    new URL(
      safeReturnPath(
        returnPath,
      ),
      new URL(
        requestUrl,
      ).origin,
    );

  destination.searchParams.set(
    "stripe",
    result,
  );

  if (message) {
    destination.searchParams.set(
      "stripeMessage",
      message.slice(
        0,
        240,
      ),
    );
  }

  return Response.redirect(
    destination.toString(),
    302,
  );
}


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

    const body: any =
      await context.request
        .json()
        .catch(() => ({}));

    const connection =
      await beginStripeHostedOnboarding(
        context.env.MKB_DB,
        context.env,
        actor,
        context.request.url,
        body?.returnPath,
      );

    return Response.json(
      {
        ok: true,
        connection,
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
          || "Unable to start Stripe setup.",
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


export const onRequestGet:
PagesFunction<Env> = async (
  context,
) => {
  const url =
    new URL(
      context.request.url,
    );

  const returnPath =
    safeReturnPath(
      url.searchParams.get(
        "returnPath",
      ),
    );

  try {
    const actor =
      await requireProfessionalContext(
        context.env.MKB_DB,
        context.request,
        context.env,
      );

    const action =
      String(
        url.searchParams.get(
          "action",
        )
        || "",
      );

    if (action === "refresh") {
      const connection =
        await beginStripeHostedOnboarding(
          context.env.MKB_DB,
          context.env,
          actor,
          context.request.url,
          returnPath,
        );

      return Response.redirect(
        connection.authorizationUrl,
        302,
      );
    }

    if (action !== "return") {
      return redirectResult(
        context.request.url,
        returnPath,
        "error",
        "Invalid Stripe onboarding return.",
      );
    }

    const settings =
      await syncStripeConnection(
        context.env.MKB_DB,
        context.env,
        actor,
      );

    const ready =
      settings
        ?.stripe
        ?.connectionStatus
        === "ready";

    return redirectResult(
      context.request.url,
      returnPath,
      ready
        ? "connected"
        : "pending",
      ready
        ? ""
        : "Stripe setup is not complete yet.",
    );

  } catch (error: any) {
    return redirectResult(
      context.request.url,
      returnPath,
      "error",
      error?.message
      || "Unable to complete Stripe setup.",
    );
  }
};
