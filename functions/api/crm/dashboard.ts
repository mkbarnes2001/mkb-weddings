import { getCrmDashboard } from "../../../serverless/crm-dashboard-d1";
import { requireProfessionalContext } from "../../../serverless/platform-auth-d1";
import { resolveWorkspaceEntitlements } from "../../../serverless/platform-entitlements-d1";
import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../serverless/venue-d1";

export const onRequestGet: PagesFunction<any> = async context => {
  if (!adminApiRequestAllowed(context.env, context.request)) return notFoundResponse();
  try {
    const actor = context.data?.professionalContext || await requireProfessionalContext(context.env.MKB_DB, context.request, context.env);
    const entitlements = await resolveWorkspaceEntitlements(context.env.MKB_DB, actor.workspaceId);
    if (!entitlements.byKey.crm?.enabled) return Response.json({ error: "CRM is not available for this workspace." }, { status: 403 });
    const params = new URL(context.request.url).searchParams;
    const dashboard = await getCrmDashboard(context.env.MKB_DB, actor, { from: params.get("from") || "", to: params.get("to") || "", jobType: params.get("jobType") || "" }, {
      bookings: entitlements.byKey.bookings?.enabled === true,
      payments: entitlements.byKey.invoices?.enabled === true,
    });
    return Response.json({ ok: true, dashboard }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
};
