import { resolvePublicWorkspaceId } from "../../../../serverless/tenant-context";
import { getPublicLeadForm, submitPublicEnquiry } from "../../../../serverless/crm-d1";

type Env = {
  MKB_DB: D1Database;
  RESEND_API_KEY?: string;
  WEDPLANNED_AUTH_FROM_EMAIL?: string;
  WEDPLANNED_AUTH_FROM_NAME?: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function escapeHtml(value: unknown) {
  return text(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function errorResponse(error: any) {
  return Response.json(
    { error: error?.message || "Unable to submit the enquiry.", details: error?.details || [] },
    { status: error?.statusCode || 500, headers: { "Cache-Control": "no-store" } },
  );
}

async function sendNotification(context: any, workspaceId: string, result: any, input: any) {
  const apiKey = text(context.env.RESEND_API_KEY);
  if (!apiKey) return;
  const row = await context.env.MKB_DB.prepare(`
    SELECT notification_email FROM crm_lead_form_settings WHERE workspace_id = ? LIMIT 1
  `).bind(workspaceId).first();
  const recipient = text(row?.notification_email);
  const fromEmail = text(context.env.WEDPLANNED_AUTH_FROM_EMAIL);
  if (!recipient || !fromEmail) return;
  const fromName = text(context.env.WEDPLANNED_AUTH_FROM_NAME || "WedPlanned");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [recipient],
      subject: `New wedding enquiry ${result.reference}`,
      html: `<h2>New wedding enquiry</h2><p><strong>${escapeHtml(result.reference)}</strong></p><p>${escapeHtml(input.firstName)} ${escapeHtml(input.lastName)}</p><p>${escapeHtml(input.email)}</p><p>Date: ${escapeHtml(input.eventDate || "Not supplied")}</p><p>Venue: ${escapeHtml(input.venueText || "Not supplied")}</p><p>${escapeHtml(input.message || "")}</p>`,
    }),
  });
  if (!response.ok) throw new Error(`Lead notification failed (${response.status}).`);
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    return Response.json({ ok: true, form: await getPublicLeadForm(context.env.MKB_DB, workspaceId) }, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (error: any) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    const body: any = await context.request.json().catch(() => ({}));
    const result = await submitPublicEnquiry(context.env.MKB_DB, workspaceId, context.request, body);
    if (result.reference) context.waitUntil(sendNotification(context, workspaceId, result, body).catch(() => undefined));
    return Response.json({ ok: true, enquiry: result }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    return errorResponse(error);
  }
};
