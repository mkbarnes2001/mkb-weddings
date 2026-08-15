import {
  uploadJobFileForClient,
} from "../../../../../../serverless/client-portal-d1";
import {
  resolveClientPortalWorkspaceId,
} from "../../../../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  MKB_PRIVATE_ASSETS: R2Bucket;
};

export const onRequestPost:
  PagesFunction<Env> =
  async (context) => {
    try {
      const workspaceId =
        await resolveClientPortalWorkspaceId(
          context.env.MKB_DB,
          context.request,
        );

      const jobId =
        String(
          context.params.jobId
          || "",
        ).trim();

      const form =
        await context.request
          .formData();

      const file =
        form.get(
          "file",
        );

      if (!(file instanceof File)) {
        return Response.json(
          {
            error:
              "Choose a file to upload.",
          },
          {
            status: 400,
            headers: {
              "Cache-Control":
                "private, no-store",
            },
          },
        );
      }

      const uploaded =
        await uploadJobFileForClient(
          context.env.MKB_DB,
          context.env.MKB_PRIVATE_ASSETS,
          context.request,
          workspaceId,
          jobId,
          file,
        );

      return Response.json(
        {
          ok: true,
          file: uploaded,
        },
        {
          status: 201,
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
            || "Unable to upload file.",
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
