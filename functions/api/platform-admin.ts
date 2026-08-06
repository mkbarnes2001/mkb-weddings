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
  getPlatformAdministration,
  updatePlatformBrandingAndModules,
  updatePlatformModuleConfiguration,
  updatePlatformSupplierTaxonomy,
} from "../../serverless/platform-administration-d1";

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

    if (
      actor.platformRole !== "platform_admin"
      || !actor.permissions.includes("platform:admin")
      || actor.accessMode === "support"
    ) {
      return Response.json(
        {
          error:
            "WedPlanned platform administrator access is required.",
        },
        { status: 403 },
      );
    }

    if (context.request.method === "GET") {
      const platformAdmin = await getPlatformAdministration(
        context.env.MKB_DB,
        actor,
      );

      return Response.json(
        {
          ok: true,
          platformAdmin,
          auth: actor,
        },
        {
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    if (context.request.method !== "POST") {
      return new Response(
        "Method not allowed",
        { status: 405 },
      );
    }

    const body: any = await context.request
      .json()
      .catch(() => ({}));

    const action = String(body?.action || "");
    let platformAdmin;

    if (action === "saveModuleConfiguration") {
      platformAdmin = await updatePlatformModuleConfiguration(
        context.env.MKB_DB,
        actor,
        body?.module || body,
      );
    } else if (action === "saveBrandingAndModules") {
      platformAdmin = await updatePlatformBrandingAndModules(
        context.env.MKB_DB,
        actor,
        body,
      );
    } else if (action === "saveSupplierTaxonomy") {
      platformAdmin = await updatePlatformSupplierTaxonomy(
        context.env.MKB_DB,
        actor,
        body,
      );
    } else {
      return Response.json(
        {
          error:
            "Unsupported platform administration action.",
        },
        { status: 400 },
      );
    }

    return Response.json(
      {
        ok: true,
        platformAdmin,
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
