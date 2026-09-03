import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../serverless/venue-d1";
import {
  getProfessionalContext,
  requireProfessionalPermission,
  type ProfessionalContext,
} from "../../serverless/platform-auth-d1";
import {
  getWorkspaceSubscriptionBillingOverview,
} from "../../serverless/platform-subscription-billing-d1";

type Env = {
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
      "billing:read",
    );

    if (context.request.method !== "GET") {
      return new Response(
        "Method not allowed",
        { status: 405 },
      );
    }

    const billing = await getWorkspaceSubscriptionBillingOverview(
      context.env.MKB_DB,
      actor.workspaceId,
    );

    return Response.json(
      {
        ok: true,
        billing,
        auth: actor,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
};
