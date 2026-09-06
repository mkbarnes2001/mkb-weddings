import { bookingError, type BookingSettings } from "../shared/online-booking";

export async function bookingConfigurationOptions(
  db: any,
  workspaceId: string,
) {
  const [workflows, schedules, emails] = await Promise.all([
    db
      .prepare(
        "SELECT id,name,version FROM crm_workflow_templates WHERE workspace_id=? AND status='active' ORDER BY name",
      )
      .bind(workspaceId)
      .all(),
    db
      .prepare(
        "SELECT id,name,deposit_type AS depositType,deposit_value AS depositValue,deposit_due_days_after_acceptance AS depositDueDaysAfterAcceptance,final_balance_due_days_before_event AS finalBalanceDueDaysBeforeEvent FROM crm_payment_schedule_presets WHERE workspace_id=? AND status='active' ORDER BY sort_order,name",
      )
      .bind(workspaceId)
      .all(),
    db
      .prepare(
        "SELECT id,name,subject_template AS subject,body_text AS body,append_signature AS appendSignature FROM crm_email_templates WHERE workspace_id=? AND status='active' AND purpose IN ('booking','general') ORDER BY name",
      )
      .bind(workspaceId)
      .all(),
  ]);
  return {
    workflows: workflows.results,
    schedules: schedules.results,
    emailTemplates: emails.results,
  };
}
export async function resolveBookingReferences(
  db: any,
  workspaceId: string,
  settings: BookingSettings,
) {
  const options = await bookingConfigurationOptions(db, workspaceId);
  for (const service of settings.services) {
    if (service.workflowId) {
      const workflow = options.workflows.find(
        (w: any) => w.id === service.workflowId,
      );
      if (!workflow)
        throw bookingError(
          "Choose an active workflow from this business.",
          409,
        );
      const { results: steps } = await db
        .prepare(
          "SELECT id,name,description,task_type,relative_to,offset_days,priority,sort_order,required FROM crm_workflow_template_steps WHERE workspace_id=? AND template_id=? ORDER BY sort_order,id LIMIT 201",
        )
        .bind(workspaceId, workflow.id)
        .all();
      if (steps.length > 200)
        throw bookingError(
          "This workflow has too many steps for online booking.",
          409,
        );
      (service as any).workflow = { ...workflow, steps };
    }
    if (service.payment === "schedule") {
      const schedule = options.schedules.find(
        (s: any) => s.id === service.scheduleId,
      );
      if (!schedule)
        throw bookingError(
          "Choose an active payment schedule from this business.",
          409,
        );
      service.schedule = schedule;
    }
  }
  if (
    settings.messages?.templateId &&
    !options.emailTemplates.some(
      (t: any) => t.id === settings.messages!.templateId,
    )
  )
    throw bookingError(
      "Choose an active email template from this business.",
      409,
    );
}
export { bookingInvoiceSchedule } from "../shared/booking-invoice-schedule";
