import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../../serverless/venue-d1";
import {
  createAdminWedding,
  listAdminWeddings,
} from "../../../serverless/wedding-d1";

type Env = {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string;
  ADMIN_HOSTNAME?: string;
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    if (context.request.method === "GET") {
      return Response.json({
        ok: true,
        weddings: await listAdminWeddings(context.env.MKB_DB),
      });
    }

    if (context.request.method === "POST") {
      const payload = await context.request.json<any>();
      const wedding = await createAdminWedding(
        context.env.MKB_DB,
        payload?.wedding,
      );

      return Response.json(
        {
          ok: true,
          slug: wedding.slug,
          weddingPath: `d1://weddings/${wedding.slug}`,
          createdFiles: [],
          wedding,
        },
        { status: 201 },
      );
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    return errorResponse(error);
  }
};
