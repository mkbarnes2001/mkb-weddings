import { mutatePublicClientGallerySelection } from "../../../../../serverless/client-gallery-d1";

type Env = { MKB_DB: D1Database };

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const result = await mutatePublicClientGallerySelection(
      context.env.MKB_DB,
      String(context.params.token || "").trim(),
      body || {},
    );
    return Response.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to update selection." }, { status: 500 });
  }
};
