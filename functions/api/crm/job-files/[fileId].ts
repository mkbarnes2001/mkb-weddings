import {
  deleteJobFileForAdmin,
  getCrmJobWorkspace,
  getJobFileForAdmin,
} from "../../../../serverless/client-portal-d1";
import {
  requireProfessionalContext,
} from "../../../../serverless/platform-auth-d1";

type Env = {
  MKB_DB: D1Database;
  MKB_PRIVATE_ASSETS: R2Bucket;
  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
};

async function actorFor(
  context: any,
) {
  return (
    context.data
      ?.professionalContext
    || await requireProfessionalContext(
      context.env.MKB_DB,
      context.request,
      context.env,
    )
  );
}

function requestIds(
  context: any,
) {
  const url =
    new URL(
      context.request.url,
    );

  return {
    jobId:
      String(
        url.searchParams.get(
          "jobId",
        )
        || "",
      ).trim(),
    fileId:
      String(
        context.params.fileId
        || "",
      ).trim(),
  };
}

export const onRequestGet:
  PagesFunction<Env> =
  async (context) => {
    try {
      const actor =
        await actorFor(
          context,
        );

      const {
        jobId,
        fileId,
      } =
        requestIds(
          context,
        );

      const {
        object,
        row,
      } =
        await getJobFileForAdmin(
          context.env.MKB_DB,
          context.env.MKB_PRIVATE_ASSETS,
          actor,
          jobId,
          fileId,
        );

      const headers =
        new Headers();

      object.writeHttpMetadata(
        headers,
      );

      headers.set(
        "Content-Type",
        String(
          row.mime_type
          || "application/octet-stream",
        ),
      );

      headers.set(
        "Content-Disposition",
        `attachment; filename="${String(row.original_filename || "attachment").replace(/"/g, "")}"`,
      );

      headers.set(
        "Cache-Control",
        "private, no-store",
      );

      return new Response(
        object.body,
        {
          headers,
        },
      );
    } catch (error: any) {
      return Response.json(
        {
          error:
            error?.message
            || "Unable to download Job file.",
        },
        {
          status:
            error?.statusCode
            || 500,
          headers: {
            "Cache-Control":
              "private, no-store",
          },
        },
      );
    }
  };


export const onRequestDelete:
  PagesFunction<Env> =
  async (context) => {
    try {
      const actor =
        await actorFor(
          context,
        );

      const {
        jobId,
        fileId,
      } =
        requestIds(
          context,
        );

      await deleteJobFileForAdmin(
        context.env.MKB_DB,
        context.env.MKB_PRIVATE_ASSETS,
        actor,
        jobId,
        fileId,
      );

      return Response.json(
        {
          ok: true,
          workspace:
            await getCrmJobWorkspace(
              context.env.MKB_DB,
              actor,
              jobId,
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
            || "Unable to remove Job file.",
        },
        {
          status:
            error?.statusCode
            || 500,
          headers: {
            "Cache-Control":
              "private, no-store",
          },
        },
      );
    }
  };
