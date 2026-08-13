import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../serverless/venue-d1";
import {
  archiveBusinessServiceArea,
  getPlatformFoundation,
  saveBusinessCategories,
  saveBusinessOnboarding,
  saveBusinessServiceArea,
  savePlatformSupplierTaxonomy,
  updateBusinessMember,
  updateBusinessProfile,
} from "../../serverless/platform-foundation-d1";
import {
  getProfessionalContext,
  issueProfessionalInvitation,
  requireProfessionalPermission,
  type ProfessionalContext,
} from "../../serverless/platform-auth-d1";

type Env = {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string;
  ADMIN_HOSTNAME?: string;
  RESEND_API_KEY?: string;
  WEDPLANNED_AUTH_EMAIL_PROVIDER?: string;
  WEDPLANNED_AUTH_FROM_EMAIL?: string;
  WEDPLANNED_AUTH_FROM_NAME?: string;
  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_AUTH_DEBUG_LINKS?: string;
  WEDPLANNED_ADMIN_ORIGIN?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
};


function platformError(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function permissionForAction(action: string) {
  if (["saveBusiness", "saveOnboarding"].includes(action)) return "business:update";
  if (["saveCategories", "saveServiceArea", "archiveServiceArea"].includes(action)) return "services:update";
  if (["inviteMember", "updateMember"].includes(action)) return "members:manage";
  if (action === "saveSupplierTaxonomy") return "platform:admin";
  return "platform:read";
}

async function resolveContext(context: any): Promise<ProfessionalContext> {
  const fromMiddleware = context.data?.professionalContext as ProfessionalContext | undefined;
  return fromMiddleware || getProfessionalContext(context.env.MKB_DB, context.request, context.env);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const auth = await resolveContext(context);
    if (!auth.accessGranted) {
      return Response.json({ error: "Professional sign-in required." }, { status: 401 });
    }

    if (context.request.method === "GET") {
      requireProfessionalPermission(auth, "platform:read");
      const platform = await getPlatformFoundation(context.env.MKB_DB, auth.workspaceId);
      return Response.json({ ok: true, platform, auth }, { headers: { "Cache-Control": "no-store" } });
    }

    if (context.request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await context.request.json().catch(() => ({} as any)) as any;
    const action = String(body?.action || "").trim();
    requireProfessionalPermission(auth, permissionForAction(action));

    let platform;
    let invitation: Record<string, unknown> | undefined;
    if (action === "saveBusiness") platform = await updateBusinessProfile(context.env.MKB_DB, { ...(body.business || body), workspaceId: auth.workspaceId, actorEmail: auth.email });
    else if (action === "saveOnboarding") platform = await saveBusinessOnboarding(context.env.MKB_DB, { ...body, workspaceId: auth.workspaceId, actorEmail: auth.email });
    else if (action === "saveSupplierTaxonomy") {
      if (auth.platformRole !== "platform_admin") throw platformError("Only a WedPlanned platform administrator can manage the supplier taxonomy.", 403);
      platform = await savePlatformSupplierTaxonomy(context.env.MKB_DB, { ...body, workspaceId: auth.workspaceId, actorEmail: auth.email });
    }
    else if (action === "saveCategories") platform = await saveBusinessCategories(context.env.MKB_DB, { ...body, workspaceId: auth.workspaceId, actorEmail: auth.email });
    else if (action === "saveServiceArea") platform = await saveBusinessServiceArea(context.env.MKB_DB, { ...(body.serviceArea || body), workspaceId: auth.workspaceId, actorEmail: auth.email });
    else if (action === "archiveServiceArea") platform = await archiveBusinessServiceArea(context.env.MKB_DB, { ...body, workspaceId: auth.workspaceId, actorEmail: auth.email });
    else if (action === "inviteMember") {
      invitation = await issueProfessionalInvitation(context.env.MKB_DB, context.env, context.request, auth, body.member || body);
      platform = await getPlatformFoundation(context.env.MKB_DB, auth.workspaceId);
    }
    else if (action === "updateMember") {
      const incoming = body.member || body;
      const existing = await context.env.MKB_DB.prepare(`
        SELECT id, user_id, role, status FROM business_memberships
        WHERE id = ? AND workspace_id = ? LIMIT 1
      `).bind(String(incoming?.id || ""), auth.workspaceId).first();
      if (!existing) throw platformError("Team membership not found.", 404);
      const nextRole = String(incoming?.role || existing.role || "staff");
      const nextStatus = String(incoming?.status || existing.status || "invited");
      if (auth.role !== "owner" && auth.platformRole !== "platform_admin" && (String(existing.role) === "owner" || nextRole === "owner")) {
        throw platformError("Only a business owner can change owner memberships.", 403);
      }
      if (String(existing.user_id || "") === auth.userId && nextStatus === "disabled") {
        throw platformError("You cannot disable your own active membership.", 400);
      }
      if (String(existing.role) === "owner" && String(existing.status) === "active" && (nextRole !== "owner" || nextStatus !== "active")) {
        const owners = await context.env.MKB_DB.prepare(`
          SELECT COUNT(*) AS total FROM business_memberships
          WHERE workspace_id = ? AND role = 'owner' AND status = 'active'
        `).bind(auth.workspaceId).first();
        if (Number(owners?.total || 0) <= 1) throw platformError("A business must keep at least one active owner.", 400);
      }
      platform = await updateBusinessMember(context.env.MKB_DB, { ...incoming, workspaceId: auth.workspaceId, actorEmail: auth.email });
    }
    else return Response.json({ error: "Unsupported platform action." }, { status: 400 });

    return Response.json({ ok: true, platform, auth, ...(invitation ? { invitation } : {}) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
