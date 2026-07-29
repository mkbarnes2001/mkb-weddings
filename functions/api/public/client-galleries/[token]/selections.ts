import { getAuthenticatedClientIdentity } from "../../../../../serverless/client-auth-d1";
import { mutatePublicClientGallerySelection } from "../../../../../serverless/client-gallery-d1";
import { resolvePublicWorkspaceId } from "../../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const authenticatedIdentity = await getAuthenticatedClientIdentity(context.env.MKB_DB, context.request);
    const result = await mutatePublicClientGallerySelection(
      context.env.MKB_DB,
      String(context.params.token || "").trim(),
      body || {},
      authenticatedIdentity,
      await resolvePublicWorkspaceId(context.env.MKB_DB, context.request),
    );
    return Response.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to update selection." }, { status: 500 });
  }
};
