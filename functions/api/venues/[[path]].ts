import {
  adminApiRequestAllowed,
  archiveAdminVenue,
  createAdminVenue,
  errorResponse,
  getAdminVenue,
  listAdminVenues,
  notFoundResponse,
  publishAdminVenue,
  updateAdminVenue,
} from "../../../serverless/venue-d1";

import { resolveAdminWorkspaceId } from "../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string; ADMIN_HOSTNAME?: string;
};

function segments(context: any) {
  const value = context.params?.path;
  return Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  const workspaceId = await resolveAdminWorkspaceId(context);
  const parts = segments(context);

  /*
   * Cloudflare Pages optional catch-all routes can receive the collection
   * root (/api/venues) as an empty path. Handle that explicitly here so the
   * collection endpoint works regardless of whether Pages resolves the
   * request to index.ts or [[path]].ts.
   */
  if (parts.length === 0) {
    try {
      if (context.request.method === "GET") {
        return Response.json({
          ok: true,
          venues: await listAdminVenues(
            context.env.MKB_DB,
            workspaceId,
          ),
        });
      }

      if (context.request.method === "POST") {
        const payload =
          await context.request.json<any>();

        const venue = await createAdminVenue(
          context.env.MKB_DB,
          payload?.venue,
          workspaceId,
        );

        return Response.json(
          {
            ok: true,
            venue,
          },
          {
            status: 201,
          },
        );
      }

      return new Response(
        "Method not allowed",
        {
          status: 405,
        },
      );
    } catch (error) {
      return errorResponse(error);
    }
  }

  const slug = parts[0] || "";
  const action = parts[1] || "";

  if (!slug || parts.length > 2) {
    return notFoundResponse();
  }

  try {
    if (context.request.method === "GET" && !action) {
      const venue = await getAdminVenue(context.env.MKB_DB, slug, workspaceId);
      return venue
        ? Response.json({ ok: true, venue })
        : Response.json({ error: "Venue not found." }, { status: 404 });
    }

    if (context.request.method === "PUT" && !action) {
      const payload = await context.request.json<any>();
      const venue = await updateAdminVenue(context.env.MKB_DB, slug, payload?.venue, workspaceId);
      return Response.json({ ok: true, venue, backupPath: null });
    }

    if (context.request.method === "DELETE" && !action) {
      const venue = await archiveAdminVenue(context.env.MKB_DB, slug, workspaceId);
      return Response.json({ ok: true, venue, backupPath: null });
    }

    if (context.request.method === "POST" && action === "publish") {
      const publish = await publishAdminVenue(context.env.MKB_DB, slug, workspaceId);
      return Response.json({ ok: true, publish });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    return errorResponse(error);
  }
};
