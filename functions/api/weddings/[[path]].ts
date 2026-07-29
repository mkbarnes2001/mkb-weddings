import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../../serverless/venue-d1";
import {
  archiveAdminWedding,
  createAdminWedding,
  deleteAdminWeddingPermanently,
  getAdminWedding,
  getWeddingImages,
  getWeddingPublishPreview,
  getWeddingStory,
  getWeddingSuppliers,
  listAdminWeddings,
  publishAdminWedding,
  saveWeddingImages,
  saveWeddingStory,
  saveWeddingSuppliers,
  updateAdminWedding,
} from "../../../serverless/wedding-d1";
import { deleteManagedImage } from "../../../serverless/image-d1";

import { resolveAdminWorkspaceId } from "../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  MKB_IMAGES: R2Bucket;
  ADMIN_API_ENABLED?: string;
  ADMIN_HOSTNAME?: string;
};

function segments(context: any) {
  const value = context.params?.path;
  return Array.isArray(value)
    ? value.map(String)
    : value
      ? [String(value)]
      : [];
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  const workspaceId = await resolveAdminWorkspaceId(context);
  const parts = segments(context);

  // Optional catch-all compatibility: /api/weddings can resolve here.
  if (parts.length === 0) {
    try {
      if (context.request.method === "GET") {
        return Response.json({
          ok: true,
          weddings: await listAdminWeddings(context.env.MKB_DB, workspaceId),
        });
      }

      if (context.request.method === "POST") {
        const payload = await context.request.json<any>();
        const wedding = await createAdminWedding(
          context.env.MKB_DB,
          payload?.wedding,
          workspaceId,
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
  }

  const slug = parts[0] || "";
  const action = parts[1] || "";

  try {
    if (
      parts.length === 3 &&
      action === "images" &&
      context.request.method === "DELETE"
    ) {
      const imageId = parts[2] || "";
      const url = new URL(context.request.url);
      const venueSlug = url.searchParams.get("venueSlug") || "";

      return Response.json({
        ok: true,
        deletion: await deleteManagedImage(
          context.env.MKB_DB,
          context.env.MKB_IMAGES,
          { weddingSlug: slug, imageId, venueSlug },
          workspaceId,
        ),
      });
    }

    if (!slug || parts.length > 2) return notFoundResponse();
    if (!action && context.request.method === "GET") {
      const wedding = await getAdminWedding(context.env.MKB_DB, slug, workspaceId);
      return wedding
        ? Response.json({ ok: true, wedding })
        : Response.json({ error: "Wedding not found." }, { status: 404 });
    }

    if (!action && context.request.method === "PUT") {
      const payload = await context.request.json<any>();
      const wedding = await updateAdminWedding(
        context.env.MKB_DB,
        slug,
        payload?.wedding,
        workspaceId,
      );
      return Response.json({ ok: true, wedding, backupPath: null });
    }

    if (!action && context.request.method === "DELETE") {
      const mode = new URL(context.request.url).searchParams.get("mode") || "archive";
      if (mode === "permanent") {
        const deletion = await deleteAdminWeddingPermanently(context.env.MKB_DB, slug, workspaceId);
        return Response.json({ ok: true, deletion });
      }
      const wedding = await archiveAdminWedding(context.env.MKB_DB, slug, workspaceId);
      return Response.json({ ok: true, wedding, backupPath: null });
    }

    if (action === "images" && context.request.method === "GET") {
      return Response.json({
        ok: true,
        slug,
        document: await getWeddingImages(context.env.MKB_DB, slug, workspaceId),
      });
    }

    if (
      action === "images" &&
      (context.request.method === "POST" || context.request.method === "PUT")
    ) {
      const payload = await context.request.json<any>();
      return Response.json(
        await saveWeddingImages(context.env.MKB_DB, slug, payload?.document, workspaceId),
      );
    }

    if (action === "suppliers" && context.request.method === "GET") {
      return Response.json({
        ok: true,
        rows: await getWeddingSuppliers(context.env.MKB_DB, slug, workspaceId),
      });
    }

    if (
      action === "suppliers" &&
      (context.request.method === "POST" || context.request.method === "PUT")
    ) {
      const payload = await context.request.json<any>();
      return Response.json(
        await saveWeddingSuppliers(context.env.MKB_DB, slug, payload?.rows, workspaceId),
      );
    }

    if (action === "story" && context.request.method === "GET") {
      return Response.json({
        ok: true,
        slug,
        story: await getWeddingStory(context.env.MKB_DB, slug, workspaceId),
      });
    }

    if (
      action === "story" &&
      (context.request.method === "POST" || context.request.method === "PUT")
    ) {
      const payload = await context.request.json<any>();
      return Response.json(
        await saveWeddingStory(context.env.MKB_DB, slug, payload?.story, workspaceId),
      );
    }

    if (action === "publish" && context.request.method === "GET") {
      return Response.json({
        ok: true,
        preview: await getWeddingPublishPreview(context.env.MKB_DB, slug, workspaceId),
      });
    }

    if (action === "publish" && context.request.method === "POST") {
      const payload = await context.request.json<any>();
      return Response.json({
        ok: true,
        publish: await publishAdminWedding(
          context.env.MKB_DB,
          slug,
          payload?.storyEnabled === true,
          workspaceId,
        ),
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    return errorResponse(error);
  }
};
