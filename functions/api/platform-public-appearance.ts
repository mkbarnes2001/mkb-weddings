import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../serverless/venue-d1";

import {
  getProfessionalContext,
  type ProfessionalContext,
} from "../../serverless/platform-auth-d1";

import {
  getWedPlannedPublicAppearanceAdministration,
  publishWedPlannedPublicAppearance,
  restoreWedPlannedPublicAppearanceVersionToDraft,
  saveWedPlannedPublicAppearanceDraft,
} from "../../serverless/platform-public-site-appearance-d1";

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
  const existing = (
    context.data?.professionalContext
  ) as ProfessionalContext | undefined;

  return existing || getProfessionalContext(
    context.env.MKB_DB,
    context.request,
    context.env,
  );
}

function allowed(actor: ProfessionalContext) {
  return actor.accessGranted
    && actor.platformRole === "platform_admin"
    && actor.permissions.includes("platform:admin")
    && actor.accessMode !== "support";
}

function noStoreJson(
  payload: unknown,
  status = 200,
) {
  return Response.json(
    payload,
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export const onRequest: PagesFunction<Env> = async (
  context,
) => {
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
      return noStoreJson(
        {
          error: "Professional sign-in required.",
        },
        401,
      );
    }

    if (!allowed(actor)) {
      return noStoreJson(
        {
          error:
            "WedPlanned platform administrator access is required.",
        },
        403,
      );
    }

    if (context.request.method === "GET") {
      const appearance =
        await getWedPlannedPublicAppearanceAdministration(
          context.env.MKB_DB,
          actor,
        );

      return noStoreJson({
        ok: true,
        appearance,
      });
    }

    if (context.request.method !== "POST") {
      return new Response(
        "Method not allowed",
        {
          status: 405,
          headers: {
            Allow: "GET, POST",
          },
        },
      );
    }

    const body: any = await context.request
      .json()
      .catch(() => ({}));

    const action = String(
      body?.action || "",
    ).trim();

    let appearance;

    if (action === "saveDraft") {
      appearance =
        await saveWedPlannedPublicAppearanceDraft(
          context.env.MKB_DB,
          actor,
          body?.theme,
        );
    } else if (action === "publish") {
      appearance =
        await publishWedPlannedPublicAppearance(
          context.env.MKB_DB,
          actor,
        );
    } else if (action === "restoreVersionToDraft") {
      appearance =
        await restoreWedPlannedPublicAppearanceVersionToDraft(
          context.env.MKB_DB,
          actor,
          body?.version,
        );
    } else {
      return noStoreJson(
        {
          error:
            "Unsupported WedPlanned public appearance action.",
        },
        400,
      );
    }

    return noStoreJson({
      ok: true,
      appearance,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
