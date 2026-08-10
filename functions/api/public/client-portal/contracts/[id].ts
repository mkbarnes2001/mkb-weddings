import { getPublicContract, signPublicContract } from "../../../../../serverless/client-portal-commercial-d1";
import { resolveClientPortalWorkspaceId } from "../../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolveClientPortalWorkspaceId(
      context.env.MKB_DB,
      context.request,
    );

    return Response.json(
      {
        ok: true,
        contract: await getPublicContract(
          context.env.MKB_DB,
          context.request,
          workspaceId,
          String(context.params.id || ""),
        ),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error: any) {
    return Response.json(
      {
        error: error?.message || "Unable to load contract.",
      },
      {
        status: error?.statusCode || 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
};


export const onRequestPost: PagesFunction<Env> =
  async (context) => {
    try {
      const workspaceId =
        await resolveClientPortalWorkspaceId(
          context.env.MKB_DB,
          context.request,
        );

      const body: any =
        await context.request.json().catch(
          () => ({}),
        );

      return Response.json(
        {
          ok: true,
          contract:
            await signPublicContract(
              context.env.MKB_DB,
              context.request,
              workspaceId,
              String(
                context.params.id || ""
              ),
              body,
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
      return Response.json(
        {
          error:
            error?.message
            || "Unable to sign contract.",
        },
        {
          status:
            error?.statusCode || 500,
          headers: {
            "Cache-Control":
              "private, no-store",
          },
        },
      );
    }
  };
