import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../../serverless/venue-d1";
import {
  getProfessionalContext,
  requireProfessionalPermission,
  type ProfessionalContext,
} from "../../../serverless/platform-auth-d1";
import {
  beginWorkspaceStripeSubscriptionCheckout,
  type SubscriptionStripeEnv,
} from "../../../serverless/platform-subscription-stripe";


type Env = SubscriptionStripeEnv & {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string;
  ADMIN_HOSTNAME?: string;
  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
};


async function resolveContext(
  context: any,
): Promise<ProfessionalContext> {
  const existing = context.data?.professionalContext as
    ProfessionalContext | undefined;

  return existing || getProfessionalContext(
    context.env.MKB_DB,
    context.request,
    context.env,
  );
}


export const onRequest: PagesFunction<Env> = async (context) => {
  if (
    !adminApiRequestAllowed(
      context.env as any,
      context.request,
    )
  ) {
    return notFoundResponse();
  }

  try {
    const actor = await resolveContext(context);

    if (!actor.accessGranted) {
      return Response.json(
        { error: "Professional sign-in required." },
        { status: 401 },
      );
    }

    requireProfessionalPermission(
      actor,
      "billing:manage",
    );

    if (actor.accessMode === "support") {
      return Response.json(
        {
          error:
            "Subscription billing cannot be changed while using support access.",
        },
        { status: 403 },
      );
    }

    if (context.request.method !== "POST") {
      return new Response(
        "Method not allowed",
        { status: 405 },
      );
    }

    const body: any = await context.request.json().catch(() => ({}));

    const checkout = await beginWorkspaceStripeSubscriptionCheckout(
      context.env.MKB_DB,
      context.env,
      {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        email: actor.email,
        accessMode: actor.accessMode,
        permissions: actor.permissions,
      },
      {
        planPriceId: String(body?.planPriceId || "").trim(),
        requestUrl: context.request.url,
      },
    );

    return Response.json(
      {
        ok: true,
        checkout,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
};
