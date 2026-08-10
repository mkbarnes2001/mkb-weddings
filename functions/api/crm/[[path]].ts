import { recordManualInvoicePayment } from "../../../serverless/crm-commercial-actions-d1";
import { requireProfessionalContext } from "../../../serverless/platform-auth-d1";
import {
  createAdminEnquiry,
  getCrmContact,
  getCrmEnquiry,
  getCrmOverview,
  markEnquiryLost,
  moveEnquiryStage,
  saveLeadFormSettings,
  updateAdminEnquiry,
  updateCrmContact,
} from "../../../serverless/crm-d1";
import {
  approveSupplierSubmission,
  archiveQuestionnaireTemplate,
  assignQuestionnaire,
  createQuestionnaireTemplate,
  createJobClientGallery,
  getCrmJobWorkspace,
  getQuestionnaireInstanceAdmin,
  getQuestionnaireOverview,
  getQuestionnaireTemplate,
  inviteJobClient,
  rejectSupplierSubmission,
  revokeJobClientAccess,
  saveQuestionnaireTemplate,
} from "../../../serverless/client-portal-d1";
import {
  acceptQuoteAsAdmin,
  createQuote,
  getQuote,
  getQuoteCatalogue,
  getQuoteOverview,
  reviseQuote,
  saveAddon,
  savePackage,
  saveQuoteDraft,
  sendQuote,
} from "../../../serverless/crm-quotes-d1";
import {
  applyWorkflowToJob,
  archiveWorkflowTemplate,
  createJobTask,
  createWorkflowTemplate,
  getWorkflowOverview,
  getWorkflowTemplate,
  logJobCommunication,
  saveWorkflowTemplate,
  sendJobEmail,
  updateJobTask,
} from "../../../serverless/crm-workflow-d1";

type Env = {
  MKB_DB: D1Database;
  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
  RESEND_API_KEY?: string;
  CLIENT_AUTH_EMAIL_PROVIDER?: string;
  CLIENT_AUTH_FROM_EMAIL?: string;
  CLIENT_AUTH_FROM_NAME?: string;
  WEDPLANNED_AUTH_FROM_EMAIL?: string;
  WEDPLANNED_AUTH_FROM_NAME?: string;
};

function errorResponse(error: any) {
  return Response.json(
    { error: error?.message || "Unable to complete the CRM request.", details: error?.details || [] },
    { status: error?.statusCode || 500, headers: { "Cache-Control": "private, no-store" } },
  );
}

function routeParts(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || "").split("/").filter(Boolean);
}

async function actorFor(context: any) {
  return context.data?.professionalContext
    || await requireProfessionalContext(context.env.MKB_DB, context.request, context.env);
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const actor = await actorFor(context);
    const parts = routeParts(context.params.path);
    if (!parts.length) {
      return Response.json({ ok: true, crm: await getCrmOverview(context.env.MKB_DB, actor) }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (parts[0] === "enquiries" && parts[1] && parts.length === 2) {
      return Response.json({ ok: true, detail: await getCrmEnquiry(context.env.MKB_DB, actor, parts[1]) }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (parts[0] === "contacts" && parts[1] && parts.length === 2) {
      return Response.json({ ok: true, detail: await getCrmContact(context.env.MKB_DB, actor, parts[1]) }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (parts[0] === "jobs" && parts[1] && parts.length === 2) {
      return Response.json({ ok: true, workspace: await getCrmJobWorkspace(context.env.MKB_DB, actor, parts[1]) }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (parts[0] === "questionnaires" && parts.length === 1) {
      return Response.json({ ok: true, questionnaires: await getQuestionnaireOverview(context.env.MKB_DB, actor) }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (parts[0] === "questionnaires" && parts[1] === "templates" && parts[2] && parts.length === 3) {
      return Response.json({ ok: true, template: await getQuestionnaireTemplate(context.env.MKB_DB, actor, parts[2]) }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (parts[0] === "questionnaires" && parts[1] === "instances" && parts[2] && parts.length === 3) {
      return Response.json({ ok: true, questionnaire: await getQuestionnaireInstanceAdmin(context.env.MKB_DB, actor, parts[2]) }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (parts[0] === "workflows" && parts.length === 1) {
      return Response.json({ ok: true, workflows: await getWorkflowOverview(context.env.MKB_DB, actor) }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (parts[0] === "workflows" && parts[1] === "templates" && parts[2] && parts.length === 3) {
      return Response.json({ ok: true, template: await getWorkflowTemplate(context.env.MKB_DB, actor, parts[2]) }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (parts[0] === "catalogue" && parts.length === 1) {
      return Response.json({ ok: true, catalogue: await getQuoteCatalogue(context.env.MKB_DB, actor) }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (parts[0] === "quotes" && parts.length === 1) {
      return Response.json({ ok: true, quotes: await getQuoteOverview(context.env.MKB_DB, actor) }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (parts[0] === "quotes" && parts[1] && parts.length === 2) {
      return Response.json({ ok: true, quote: await getQuote(context.env.MKB_DB, actor, parts[1]) }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    return Response.json({ error: "CRM route not found." }, { status: 404 });
  } catch (error: any) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const actor = await actorFor(context);
    const parts = routeParts(context.params.path);
    const body: any = await context.request.json().catch(() => ({}));
    if (!parts.length || (parts[0] === "enquiries" && parts.length === 1)) {
      return Response.json({ ok: true, detail: await createAdminEnquiry(context.env.MKB_DB, actor, body) }, { status: 201 });
    }
    if (parts[0] === "lead-form") {
      return Response.json({ ok: true, crm: await saveLeadFormSettings(context.env.MKB_DB, actor, body) });
    }
    if (parts[0] === "enquiries" && parts[1] && parts[2] === "stage") {
      return Response.json({ ok: true, detail: await moveEnquiryStage(context.env.MKB_DB, actor, parts[1], body?.stageId) });
    }
    if (parts[0] === "enquiries" && parts[1] && parts[2] === "lost") {
      return Response.json({ ok: true, detail: await markEnquiryLost(context.env.MKB_DB, actor, parts[1], body?.reason) });
    }
    if (parts[0] === "enquiries" && parts[1] && parts[2] === "accept") {
      return Response.json({ error: "Create and accept a quote to convert this enquiry into a booked Job." }, { status: 409 });
    }
    if (parts[0] === "catalogue" && parts[1] === "packages" && parts.length === 2) {
      return Response.json({ ok: true, package: await savePackage(context.env.MKB_DB, actor, "", body) }, { status: 201 });
    }
    if (parts[0] === "catalogue" && parts[1] === "addons" && parts.length === 2) {
      return Response.json({ ok: true, addon: await saveAddon(context.env.MKB_DB, actor, "", body) }, { status: 201 });
    }
    if (parts[0] === "quotes" && parts.length === 1) {
      return Response.json({ ok: true, quote: await createQuote(context.env.MKB_DB, actor, body) }, { status: 201 });
    }
    if (parts[0] === "quotes" && parts[1] && parts[2] === "revise") {
      return Response.json({ ok: true, quote: await reviseQuote(context.env.MKB_DB, actor, parts[1]) }, { status: 201 });
    }
    if (parts[0] === "quotes" && parts[1] && parts[2] === "send") {
      return Response.json({ ok: true, quote: await sendQuote(context.env.MKB_DB, context.env, actor, parts[1]) });
    }
    if (parts[0] === "quotes" && parts[1] && parts[2] === "accept") {
      return Response.json({ ok: true, conversion: await acceptQuoteAsAdmin(context.env.MKB_DB, actor, parts[1], body) });
    }
    if (parts[0] === "questionnaires" && parts[1] === "templates" && parts.length === 2) {
      return Response.json({ ok: true, template: await createQuestionnaireTemplate(context.env.MKB_DB, actor, body) }, { status: 201 });
    }
    if (parts[0] === "questionnaires" && parts[1] === "templates" && parts[2] && parts[3] === "archive") {
      return Response.json({ ok: true, template: await archiveQuestionnaireTemplate(context.env.MKB_DB, actor, parts[2]) });
    }
    if (
      parts[0] === "jobs"
      && parts[1]
      && parts[2] === "invoices"
      && parts[3]
      && parts[4] === "payments"
      && parts.length === 5
    ) {
      const payment =
        await recordManualInvoicePayment(
          context.env.MKB_DB,
          actor,
          parts[1],
          parts[3],
          body,
        );

      return Response.json(
        {
          ok: true,
          payment,
          workspace:
            await getCrmJobWorkspace(
              context.env.MKB_DB,
              actor,
              parts[1],
            ),
        },
        {
          status: 201,
        },
      );
    }

    if (parts[0] === "jobs" && parts[1] && parts[2] === "client-gallery" && parts.length === 3) {
      const result = await createJobClientGallery(context.env.MKB_DB, actor, parts[1]);
      return Response.json({ ok: true, ...result }, { status: result.idempotent ? 200 : 201 });
    }
    if (parts[0] === "jobs" && parts[1] && parts[2] === "questionnaires") {
      return Response.json({ ok: true, questionnaire: await assignQuestionnaire(context.env.MKB_DB, actor, parts[1], body) }, { status: 201 });
    }
    if (parts[0] === "jobs" && parts[1] && parts[2] === "invite") {
      return Response.json({ ok: true, invitation: await inviteJobClient(context.env.MKB_DB, context.env, actor, parts[1], body, context.request.url) });
    }
    if (parts[0] === "jobs" && parts[1] && parts[2] === "revoke") {
      return Response.json({ ok: true, workspace: await revokeJobClientAccess(context.env.MKB_DB, actor, parts[1], String(body?.identityId || "")) });
    }
    if (parts[0] === "jobs" && parts[1] && parts[2] === "supplier-submissions" && parts[3] && parts[4] === "approve") {
      return Response.json({ ok: true, workspace: await approveSupplierSubmission(context.env.MKB_DB, actor, parts[1], parts[3], body) });
    }
    if (parts[0] === "jobs" && parts[1] && parts[2] === "supplier-submissions" && parts[3] && parts[4] === "reject") {
      return Response.json({ ok: true, workspace: await rejectSupplierSubmission(context.env.MKB_DB, actor, parts[1], parts[3], body) });
    }
    if (parts[0] === "workflows" && parts[1] === "templates" && parts.length === 2) {
      return Response.json({ ok: true, template: await createWorkflowTemplate(context.env.MKB_DB, actor, body) }, { status: 201 });
    }
    if (parts[0] === "workflows" && parts[1] === "templates" && parts[2] && parts[3] === "archive") {
      return Response.json({ ok: true, template: await archiveWorkflowTemplate(context.env.MKB_DB, actor, parts[2]) });
    }
    if (parts[0] === "jobs" && parts[1] && parts[2] === "workflow") {
      await applyWorkflowToJob(context.env.MKB_DB, actor, parts[1], body?.templateId);
      return Response.json({ ok: true, workspace: await getCrmJobWorkspace(context.env.MKB_DB, actor, parts[1]) }, { status: 201 });
    }
    if (parts[0] === "jobs" && parts[1] && parts[2] === "tasks" && parts.length === 3) {
      await createJobTask(context.env.MKB_DB, actor, parts[1], body);
      return Response.json({ ok: true, workspace: await getCrmJobWorkspace(context.env.MKB_DB, actor, parts[1]) }, { status: 201 });
    }
    if (parts[0] === "jobs" && parts[1] && parts[2] === "communications" && parts[3] === "send") {
      await sendJobEmail(context.env.MKB_DB, context.env, actor, parts[1], body);
      return Response.json({ ok: true, workspace: await getCrmJobWorkspace(context.env.MKB_DB, actor, parts[1]) });
    }
    if (parts[0] === "jobs" && parts[1] && parts[2] === "communications" && parts.length === 3) {
      await logJobCommunication(context.env.MKB_DB, actor, parts[1], body);
      return Response.json({ ok: true, workspace: await getCrmJobWorkspace(context.env.MKB_DB, actor, parts[1]) }, { status: 201 });
    }
    return Response.json({ error: "CRM route not found." }, { status: 404 });
  } catch (error: any) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const actor = await actorFor(context);
    const parts = routeParts(context.params.path);
    const body: any = await context.request.json().catch(() => ({}));
    if (parts[0] === "enquiries" && parts[1] && parts.length === 2) {
      return Response.json({ ok: true, detail: await updateAdminEnquiry(context.env.MKB_DB, actor, parts[1], body) });
    }
    if (parts[0] === "contacts" && parts[1] && parts.length === 2) {
      return Response.json({ ok: true, detail: await updateCrmContact(context.env.MKB_DB, actor, parts[1], body) });
    }
    if (parts[0] === "catalogue" && parts[1] === "packages" && parts[2] && parts.length === 3) {
      return Response.json({ ok: true, package: await savePackage(context.env.MKB_DB, actor, parts[2], body) });
    }
    if (parts[0] === "catalogue" && parts[1] === "addons" && parts[2] && parts.length === 3) {
      return Response.json({ ok: true, addon: await saveAddon(context.env.MKB_DB, actor, parts[2], body) });
    }
    if (parts[0] === "quotes" && parts[1] && parts.length === 2) {
      return Response.json({ ok: true, quote: await saveQuoteDraft(context.env.MKB_DB, actor, parts[1], body) });
    }
    if (parts[0] === "questionnaires" && parts[1] === "templates" && parts[2] && parts.length === 3) {
      return Response.json({ ok: true, template: await saveQuestionnaireTemplate(context.env.MKB_DB, actor, parts[2], body) });
    }
    if (parts[0] === "workflows" && parts[1] === "templates" && parts[2] && parts.length === 3) {
      return Response.json({ ok: true, template: await saveWorkflowTemplate(context.env.MKB_DB, actor, parts[2], body) });
    }
    if (parts[0] === "jobs" && parts[1] && parts[2] === "tasks" && parts[3] && parts.length === 4) {
      await updateJobTask(context.env.MKB_DB, actor, parts[1], parts[3], body);
      return Response.json({ ok: true, workspace: await getCrmJobWorkspace(context.env.MKB_DB, actor, parts[1]) });
    }
    return Response.json({ error: "CRM route not found." }, { status: 404 });
  } catch (error: any) {
    return errorResponse(error);
  }
};
