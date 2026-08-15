import {
  deleteJobFileForClient,
  getJobFileForClient,
} from "../../../../../../../serverless/client-portal-d1";
import {
  resolveClientPortalWorkspaceId,
} from "../../../../../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  MKB_PRIVATE_ASSETS: R2Bucket;
};

async function contextIds(
  context: any,
) {
  return {
    workspaceId:
      await resolveClientPortalWorkspaceId(
        context.env.MKB_DB,
        context.request,
      ),
    jobId:
      String(
        context.params.jobId
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
      const {
        workspaceId,
        jobId,
        fileId,
      } =
        await contextIds(
          context,
        );

      const {
        object,
        row,
      } =
        await getJobFileForClient(
          context.env.MKB_DB,
          context.env.MKB_PRIVATE_ASSETS,
          context.request,
          workspaceId,
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
            || "Unable to download file.",
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
      const {
        workspaceId,
        jobId,
        fileId,
      } =
        await contextIds(
          context,
        );

      const result =
        await deleteJobFileForClient(
          context.env.MKB_DB,
          context.env.MKB_PRIVATE_ASSETS,
          context.request,
          workspaceId,
          jobId,
          fileId,
        );

      return Response.json(
        result,
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
            || "Unable to remove file.",
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
