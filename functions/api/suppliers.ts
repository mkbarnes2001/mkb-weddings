import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../serverless/venue-d1";
import { listAdminSuppliers } from "../../serverless/wedding-d1";
import {
  archiveMasterSupplier,
  createMasterSupplier,
  listMasterSuppliers,
  updateMasterSupplier,
} from "../../serverless/supplier-d1";

import { resolveAdminWorkspaceId } from "../../serverless/tenant-context";

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
    const workspaceId = await resolveAdminWorkspaceId(context);
    if (context.request.method === "GET") {
      const url = new URL(context.request.url);
      if (url.searchParams.get("view") === "master") {
        return Response.json({
          ok: true,
          suppliers: await listMasterSuppliers(context.env.MKB_DB, true, workspaceId),
        });
      }
      return Response.json({
        ok: true,
        rows: await listAdminSuppliers(context.env.MKB_DB, workspaceId),
      });
    }

    if (context.request.method === "POST") {
      const payload = await context.request.json();
      const supplier = await createMasterSupplier(context.env.MKB_DB, payload?.supplier || payload, workspaceId);
      return Response.json({ ok: true, supplier }, { status: 201 });
    }

    if (context.request.method === "PUT") {
      const payload = await context.request.json();
      const supplier = await updateMasterSupplier(context.env.MKB_DB, payload?.supplier || payload, workspaceId);
      return Response.json({ ok: true, supplier });
    }

    if (context.request.method === "DELETE") {
      const url = new URL(context.request.url);
      const id = url.searchParams.get("id") || "";
      const supplier = await archiveMasterSupplier(context.env.MKB_DB, id, workspaceId);
      return Response.json({ ok: true, supplier });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    return errorResponse(error);
  }
};
