import {
  getCrmJobWorkspace,
  uploadJobFileForAdmin,
} from "../../../../../serverless/client-portal-d1";
import {
  requireProfessionalContext,
} from "../../../../../serverless/platform-auth-d1";

type Env = {
  MKB_DB: D1Database;
  MKB_PRIVATE_ASSETS: R2Bucket;
  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
};

export const onRequestPost:
  PagesFunction<Env> =
  async (context) => {
    try {
      const actor =
        context.data?.professionalContext
        || await requireProfessionalContext(
          context.env.MKB_DB,
          context.request,
          context.env,
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
        await uploadJobFileForAdmin(
          context.env.MKB_DB,
          context.env.MKB_PRIVATE_ASSETS,
          actor,
          jobId,
          file,
        );

      return Response.json(
        {
          ok: true,
          file: uploaded,
          workspace:
            await getCrmJobWorkspace(
              context.env.MKB_DB,
              actor,
              jobId,
            ),
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
            || "Unable to upload Job file.",
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
