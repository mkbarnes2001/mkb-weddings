import { requireProfessionalContext } from "../../../serverless/platform-auth-d1";
import { createWorkspaceExport } from "../../../serverless/platform-operations-d1";

type Env = {
  MKB_DB: D1Database;
  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const actor = context.data?.professionalContext
      || await requireProfessionalContext(context.env.MKB_DB, context.request, context.env);
    const result = await createWorkspaceExport(context.env.MKB_DB, actor);
    return new Response(JSON.stringify(result.payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.fileName.replace(/\"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to create the workspace export.", details: error?.details || [] }, {
      status: error?.statusCode || 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
};
