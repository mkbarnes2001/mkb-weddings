import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Clock3,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Pencil,
  PackageCheck,
  Phone,
  Plus,
  Send,
  ShieldX,
  Store,
  Trash2,
  UserRound,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { AdminButton, AdminEmptyState, AdminField, AdminPage, AdminPageHeader, AdminPanel, AdminStatus } from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { CrmJobWorkspace, CrmSupplierSubmission, QuestionnaireField } from "../types/crm";

function dateLabel(value?: string) {
  if (!value) return "Date TBC";
  const parsed = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-GB", value.length <= 10 ? { day: "numeric", month: "short", year: "numeric" } : { dateStyle: "medium", timeStyle: "short" });
}

function money(value: number | null, currency = "GBP") {
  if (value == null) return "Not set";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value / 100);
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (["completed", "active", "linked", "approved", "booked"].includes(status)) return "success";
  if (["in_progress", "opened"].includes(status)) return "info";
  if (["sent", "invited", "pending", "draft"].includes(status)) return "warning";
  if (["revoked", "rejected"].includes(status)) return "danger";
  return "neutral";
}

function answerLabel(value: unknown, field?: QuestionnaireField) {
  if (field?.type === "supplier") {
    const entries = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
    return entries.map((entry: any) => entry?.name || entry?.supplierName || entry?.supplierId || "Supplier").join(", ") || "Not answered";
  }
  if (Array.isArray(value)) return value.join(", ") || "Not answered";
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "Not answered");
}

function workflowState(workspace: CrmJobWorkspace) {
  const portalActive = workspace.portalAccess.some((item) => item.status === "active");
  const completed = workspace.questionnaires.filter((item) => item.status === "completed").length;
  const total = workspace.questionnaires.length;
  const weddingPassed = workspace.job.eventDate ? new Date(`${workspace.job.eventDate}T23:59:59`).getTime() < Date.now() : false;
  return [
    { label: "Lead created", detail: workspace.enquiry?.reference || workspace.job.enquiryId || "Manual Job", complete: true },
    { label: "Job accepted", detail: dateLabel(workspace.job.bookingDate || workspace.job.createdAt), complete: true },
    { label: "Client portal", detail: portalActive ? "Access active" : "Not invited", complete: portalActive },
    { label: "Questionnaires", detail: total ? `${completed} of ${total} completed` : "None assigned", complete: total > 0 && completed === total },
    { label: "Wedding day", detail: dateLabel(workspace.job.eventDate), complete: weddingPassed },
  ];
}

export function CRMJob() {
  const { id = "" } = useParams();
  const { auth } = useProfessionalAuth();
  const [workspace, setWorkspace] = useState<CrmJobWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [contactId, setContactId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [supplierReview, setSupplierReview] = useState<Record<string, { supplierId: string; role: string; notes: string }>>({});
  const [workflowTemplateId, setWorkflowTemplateId] = useState("");
  const [taskDraft, setTaskDraft] = useState({ title: "", description: "", taskType: "task", priority: "normal", dueAt: "" });
  const [communicationDraft, setCommunicationDraft] = useState({ channel: "note", direction: "internal", contactId: "", subject: "", body: "" });
  const canManage = auth.permissions.includes("crm:manage");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await AdminApiService.getCrmJobWorkspace(id);
      setWorkspace(result);
      setTemplateId((current) => current || result.templates.find((item) => item.status === "active")?.id || result.templates[0]?.id || "");
      setContactId((current) => current || result.contacts.find((item) => item.role === "primary")?.id || result.contacts[0]?.id || "");
      setWorkflowTemplateId((current) => current || result.workflowTemplates.find((item) => item.default)?.id || result.workflowTemplates[0]?.id || "");
      setCommunicationDraft((current) => ({ ...current, contactId: current.contactId || result.contacts.find((item) => item.role === "primary")?.id || result.contacts[0]?.id || "" }));
      setSupplierReview((current) => {
        const next = { ...current };
        for (const submission of result.supplierSubmissions) if (!next[submission.id]) next[submission.id] = { supplierId: submission.resolvedSupplierId || submission.supplierId || "", role: submission.role || "Supplier", notes: "" };
        return next;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Job.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id, auth.workspaceId]);

  const activeAccessByContact = useMemo(() => new Map((workspace?.portalAccess || []).filter((item) => item.status === "active").map((item) => [item.contactId, item])), [workspace?.portalAccess]);
  const allFiles = useMemo(() => (workspace?.questionnaires || []).flatMap((item) => item.files.map((file) => ({ ...file, questionnaireId: item.id, questionnaireTitle: item.title }))), [workspace?.questionnaires]);
  const pendingSubmissions = useMemo(() => (workspace?.supplierSubmissions || []).filter((item) => item.status === "pending"), [workspace?.supplierSubmissions]);

  async function assign() {
    if (!templateId || !contactId) { setError("Choose the client who should complete this questionnaire."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      await AdminApiService.assignQuestionnaire(id, { templateId, contactId, dueAt: dueAt || undefined });
      setMessage("Questionnaire assigned. Send a portal invitation when ready.");
      await load();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Unable to assign questionnaire.");
    } finally { setSaving(false); }
  }

  async function invite(clientId: string) {
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await AdminApiService.inviteCrmClient(id, clientId);
      setMessage(result.message);
      await load();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to invite client.");
    } finally { setSaving(false); }
  }

  async function revoke(identityId: string) {
    if (!window.confirm("Revoke this client's portal access?")) return;
    setSaving(true); setError(""); setMessage("");
    try {
      setWorkspace(await AdminApiService.revokeCrmClientAccess(id, identityId));
      setMessage("Client portal access revoked.");
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke access.");
    } finally { setSaving(false); }
  }

  async function approveSupplier(submission: CrmSupplierSubmission) {
    const review = supplierReview[submission.id] || { supplierId: "", role: submission.role || "Supplier", notes: "" };
    const action = review.supplierId ? "merge this suggestion into the selected Supplier Master record" : "create a new Supplier Master record";
    if (!window.confirm(`Approve ${submission.name || "this supplier"} and ${action}?`)) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await AdminApiService.approveCrmSupplierSubmission(id, submission.id, { supplierId: review.supplierId || undefined, role: review.role, reviewNotes: review.notes });
      setWorkspace(result);
      setMessage(review.supplierId ? "Supplier suggestion merged and linked to the Wedding." : "Supplier approved, added to Supplier Master and linked to the Wedding.");
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Unable to approve supplier.");
    } finally { setSaving(false); }
  }

  async function rejectSupplier(submission: CrmSupplierSubmission) {
    if (!window.confirm(`Reject ${submission.name || "this supplier suggestion"}?`)) return;
    setSaving(true); setError(""); setMessage("");
    try {
      setWorkspace(await AdminApiService.rejectCrmSupplierSubmission(id, submission.id, supplierReview[submission.id]?.notes || ""));
      setMessage("Supplier suggestion rejected.");
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "Unable to reject supplier.");
    } finally { setSaving(false); }
  }

  async function applyWorkflow() {
    if (!workflowTemplateId) { setError("Choose a workflow template."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      setWorkspace(await AdminApiService.applyCrmWorkflow(id, workflowTemplateId));
      setMessage("Workflow applied and Job tasks created.");
    } catch (workflowError) { setError(workflowError instanceof Error ? workflowError.message : "Unable to apply workflow."); }
    finally { setSaving(false); }
  }

  async function createTask() {
    if (!taskDraft.title.trim()) { setError("Enter a task title."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      setWorkspace(await AdminApiService.createCrmJobTask(id, taskDraft));
      setTaskDraft({ title: "", description: "", taskType: "task", priority: "normal", dueAt: "" });
      setMessage("Task added.");
    } catch (taskError) { setError(taskError instanceof Error ? taskError.message : "Unable to add task."); }
    finally { setSaving(false); }
  }

  async function setTaskStatus(taskId: string, status: "pending" | "completed" | "cancelled") {
    setSaving(true); setError(""); setMessage("");
    try {
      setWorkspace(await AdminApiService.updateCrmJobTask(id, taskId, { status }));
      setMessage(status === "completed" ? "Task completed." : status === "cancelled" ? "Task cancelled." : "Task reopened.");
    } catch (taskError) { setError(taskError instanceof Error ? taskError.message : "Unable to update task."); }
    finally { setSaving(false); }
  }

  async function saveCommunication(sendEmail = false) {
    if (!communicationDraft.body.trim() && !communicationDraft.subject.trim()) { setError("Enter communication details."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const next = sendEmail
        ? await AdminApiService.sendCrmJobEmail(id, { ...communicationDraft, channel: "email", direction: "outbound" })
        : await AdminApiService.logCrmJobCommunication(id, communicationDraft);
      setWorkspace(next);
      setCommunicationDraft((current) => ({ ...current, subject: "", body: "" }));
      setMessage(sendEmail ? "Email sent and recorded." : "Communication logged.");
    } catch (communicationError) { setError(communicationError instanceof Error ? communicationError.message : "Unable to save communication."); }
    finally { setSaving(false); }
  }

  if (loading && !workspace) return <AdminPage><p className="text-sm text-neutral-500">Loading Job workspace…</p></AdminPage>;
  if (!workspace) return <AdminPage><div className="admin-alert admin-alert--error">{error || "Job not found."}</div></AdminPage>;
  const { job } = workspace;
  const workflow = workflowState(workspace);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow={<Link to="/admin/crm?view=jobs" className="admin-inline-link inline-flex items-center gap-1"><ArrowLeft size={13} />CRM Jobs</Link>}
        title={job.title}
        description={`${job.reference} · ${job.serviceName || job.jobType || "Wedding service"}`}
        meta={<div className="flex flex-wrap gap-2"><AdminStatus tone={statusTone(job.status)}>{job.status}</AdminStatus><AdminStatus tone={job.clientPortalStatus === "active" ? "success" : job.clientPortalStatus === "invited" ? "warning" : "neutral"}>portal {job.clientPortalStatus.replace(/_/g, " ")}</AdminStatus><AdminStatus tone="info">{dateLabel(job.eventDate)}</AdminStatus></div>}
        actions={job.weddingSlug ? <Link className="admin-button admin-button--secondary admin-button--md" to={`/admin/weddings/${job.weddingSlug}/workspace`}><ExternalLink className="admin-button__icon" />Open Wedding</Link> : undefined}
      />
      {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
      {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}

      <div className="crm-job-workspace">
        <div className="crm-job-workspace__main">
          {job.quoteId ? <AdminPanel title="Quote summary" description="The accepted quote version and commercial snapshots are immutable." icon={PackageCheck} actions={<Link className="admin-button admin-button--secondary admin-button--sm" to={`/admin/crm/quotes/${job.quoteId}`}><ExternalLink className="admin-button__icon" />Open quote</Link>}>
            {(() => { const pkg = (job.packageSnapshot || {}) as any; const addons = Array.isArray(job.addonsSnapshot) ? job.addonsSnapshot as any[] : []; return <div className="crm-quote-job-summary"><dl className="admin-compact-details"><div><dt>Quote</dt><dd>{job.quoteReference || "—"} · v{job.quoteVersionNumber || 1}</dd></div><div><dt>Accepted</dt><dd>{dateLabel(job.acceptedQuoteAt || job.bookingDate)}</dd></div><div><dt>Package</dt><dd>{pkg.name || job.packageName || "—"}</dd></div><div><dt>Coverage</dt><dd>{pkg.coverageMinutes ? `${Math.round(pkg.coverageMinutes / 60)} hours` : "—"}</dd></div><div><dt>Subtotal</dt><dd>{money(job.bookingSubtotal, job.currency)}</dd></div><div><dt>Discount</dt><dd>{money(job.bookingDiscount, job.currency)}</dd></div><div><dt>Tax</dt><dd>{money(job.bookingTax, job.currency)}</dd></div><div><dt>Total booking value</dt><dd><strong>{money(job.valueAmount, job.currency)}</strong></dd></div></dl><div className="crm-quote-job-details"><section><h4>Included</h4>{Array.isArray(pkg.includedItems) && pkg.includedItems.length ? <ul>{pkg.includedItems.map((item: string) => <li key={item}>{item}</li>)}</ul> : <p>No included-item list stored.</p>}</section><section><h4>Selected add-ons</h4>{addons.length ? <ul>{addons.map((addon: any) => <li key={addon.id || addon.addonId || addon.name}><span>{addon.name}</span><strong>{addon.quantity || 1} × {money(addon.unitPriceAmount || 0, addon.currency || job.currency)}</strong></li>)}</ul> : <p>No optional add-ons selected.</p>}</section></div></div>; })()}
          </AdminPanel> : null}

          <AdminPanel title="Workflow" description="A live view of the booking milestones already supported by WedPlanned." icon={ClipboardList}>
            <div className="crm-job-workflow">{workflow.map((step, index) => <div key={step.label} className={step.complete ? "complete" : ""}><span>{step.complete ? <Check /> : index + 1}</span><section><strong>{step.label}</strong><p>{step.detail}</p></section></div>)}</div>
          </AdminPanel>

          <AdminPanel title="Tasks and workflow" description={workspace.workflow ? `${workspace.workflow.templateName} · ${workspace.taskStats.completed} of ${workspace.taskStats.total} complete` : "Apply a reusable workflow or add a one-off Job task."} icon={Workflow} actions={<div className="flex flex-wrap gap-2"><AdminStatus tone={workspace.taskStats.overdue ? "danger" : workspace.taskStats.pending ? "warning" : "success"}>{workspace.taskStats.overdue ? `${workspace.taskStats.overdue} overdue` : `${workspace.taskStats.pending} pending`}</AdminStatus>{workspace.workflow ? <AdminStatus tone={statusTone(workspace.workflow.status)}>{workspace.workflow.status}</AdminStatus> : null}</div>}>
            {!workspace.workflow ? <div className="crm-apply-workflow"><AdminField label="Workflow template"><select className="admin-select" value={workflowTemplateId} disabled={!canManage} onChange={(event) => setWorkflowTemplateId(event.target.value)}><option value="">Choose workflow</option>{workspace.workflowTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}{template.default ? " · default" : ""}</option>)}</select></AdminField><AdminButton variant="primary" icon={Workflow} disabled={saving || !canManage || !workflowTemplateId} onClick={() => void applyWorkflow()}>Apply workflow</AdminButton></div> : null}
            {!workspace.tasks.length ? <AdminEmptyState icon={CheckCircle2} title="No tasks yet" description="Apply a workflow or add a task below." /> : <div className="crm-task-list">{workspace.tasks.filter((task) => task.status !== "cancelled").map((task) => { const overdue = task.status === "pending" && Boolean(task.dueAt && task.dueAt < new Date().toISOString().slice(0, 10)); return <article key={task.id} className={task.status === "completed" ? "complete" : overdue ? "overdue" : ""}><button type="button" aria-label={task.status === "completed" ? "Reopen task" : "Complete task"} disabled={saving || !canManage} onClick={() => void setTaskStatus(task.id, task.status === "completed" ? "pending" : "completed")}>{task.status === "completed" ? <Check /> : null}</button><div><strong>{task.title}</strong>{task.description ? <p>{task.description}</p> : null}<div className="flex flex-wrap gap-2"><AdminStatus tone={overdue ? "danger" : task.dueAt ? "warning" : "neutral"}>{task.dueAt ? dateLabel(task.dueAt) : "No due date"}</AdminStatus><AdminStatus tone={task.priority === "urgent" || task.priority === "high" ? "danger" : "neutral"}>{task.priority}</AdminStatus><AdminStatus tone="info">{task.taskType}</AdminStatus></div></div>{task.status === "pending" && canManage ? <AdminButton variant="ghost" size="sm" icon={Trash2} disabled={saving} onClick={() => void setTaskStatus(task.id, "cancelled")}>Cancel</AdminButton> : null}</article>; })}</div>}
            {canManage ? <div className="crm-task-create"><div className="grid gap-3 md:grid-cols-2"><AdminField label="New task"><input className="admin-input" value={taskDraft.title} onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Call client, review schedule…" /></AdminField><AdminField label="Due date"><input className="admin-input" type="date" value={taskDraft.dueAt} onChange={(event) => setTaskDraft((current) => ({ ...current, dueAt: event.target.value }))} /></AdminField><AdminField label="Type"><select className="admin-select" value={taskDraft.taskType} onChange={(event) => setTaskDraft((current) => ({ ...current, taskType: event.target.value }))}><option value="task">Task</option><option value="email">Email</option><option value="call">Call</option><option value="meeting">Meeting</option><option value="milestone">Milestone</option></select></AdminField><AdminField label="Priority"><select className="admin-select" value={taskDraft.priority} onChange={(event) => setTaskDraft((current) => ({ ...current, priority: event.target.value }))}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></AdminField></div><AdminField label="Description"><textarea className="admin-textarea" value={taskDraft.description} onChange={(event) => setTaskDraft((current) => ({ ...current, description: event.target.value }))} /></AdminField><AdminButton variant="primary" icon={Plus} disabled={saving || !taskDraft.title.trim()} onClick={() => void createTask()}>Add task</AdminButton></div> : null}
          </AdminPanel>

          <AdminPanel title="Communication" description="Send an email or log calls, meetings, messages and internal notes against this Job." icon={MessageCircle}>
            {canManage ? <div className="crm-communication-compose"><div className="grid gap-3 md:grid-cols-3"><AdminField label="Channel"><select className="admin-select" value={communicationDraft.channel} onChange={(event) => setCommunicationDraft((current) => ({ ...current, channel: event.target.value, direction: event.target.value === "note" ? "internal" : current.direction }))}><option value="note">Internal note</option><option value="email">Email</option><option value="phone">Phone call</option><option value="sms">Message / SMS</option><option value="meeting">Meeting</option></select></AdminField><AdminField label="Direction"><select className="admin-select" value={communicationDraft.direction} onChange={(event) => setCommunicationDraft((current) => ({ ...current, direction: event.target.value }))}><option value="internal">Internal</option><option value="outbound">Outbound</option><option value="inbound">Inbound</option></select></AdminField><AdminField label="Client"><select className="admin-select" value={communicationDraft.contactId} onChange={(event) => setCommunicationDraft((current) => ({ ...current, contactId: event.target.value }))}><option value="">No specific contact</option>{workspace.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.displayName}</option>)}</select></AdminField></div><AdminField label="Subject"><input className="admin-input" value={communicationDraft.subject} onChange={(event) => setCommunicationDraft((current) => ({ ...current, subject: event.target.value }))} placeholder="Optional for calls and notes" /></AdminField><AdminField label="Message / notes"><textarea className="admin-textarea min-h-28" value={communicationDraft.body} onChange={(event) => setCommunicationDraft((current) => ({ ...current, body: event.target.value }))} /></AdminField><div className="flex flex-wrap gap-2"><AdminButton icon={MessageSquareText} disabled={saving || (!communicationDraft.body.trim() && !communicationDraft.subject.trim())} onClick={() => void saveCommunication(false)}>Log communication</AdminButton><AdminButton variant="primary" icon={Mail} disabled={saving || !communicationDraft.contactId || !communicationDraft.subject.trim() || !communicationDraft.body.trim()} onClick={() => void saveCommunication(true)}>Send email</AdminButton></div></div> : null}
            {!workspace.communications.length ? <AdminEmptyState icon={MessageCircle} title="No communication recorded" description="Emails and logged contact history will appear here." /> : <div className="crm-communication-list">{workspace.communications.map((item) => <article key={item.id}><div className="crm-communication-list__icon">{item.channel === "email" ? <Mail /> : item.channel === "phone" ? <Phone /> : item.channel === "meeting" ? <Users /> : <MessageSquareText />}</div><div><div className="flex flex-wrap items-center gap-2"><strong>{item.subject || item.channel.replace(/_/g, " ")}</strong><AdminStatus tone={item.status === "failed" ? "danger" : item.status === "sent" ? "success" : "neutral"}>{item.status}</AdminStatus><AdminStatus tone="info">{item.direction}</AdminStatus></div><p>{item.body}</p><small>{item.contactName || item.contactEmail || "Internal"} · {dateLabel(item.occurredAt)}{item.actorEmail ? ` · ${item.actorEmail}` : ""}</small></div></article>)}</div>}
          </AdminPanel>

          <AdminPanel title="Questionnaires" description="Assigned questionnaires, responses and submission status." icon={ClipboardList}>
            {!workspace.questionnaires.length ? <AdminEmptyState icon={FileText} title="No questionnaires assigned" description="Use the assignment panel on this page to add one." /> : <div className="grid gap-3">{workspace.questionnaires.map((item) => <article key={item.id} className="questionnaire-instance-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3>{item.title}</h3><p>{item.assignedContactName || "Client not assigned"}{item.dueAt ? ` · due ${dateLabel(item.dueAt)}` : ""}</p></div><AdminStatus tone={statusTone(item.status)}>{item.status.replace(/_/g, " ")}</AdminStatus></div>{item.introduction ? <p className="mt-3 text-[10px] leading-5 text-neutral-500">{item.introduction}</p> : null}<div className="mt-3 grid gap-2">{item.fields.filter((field) => !["heading", "description", "file"].includes(field.type)).map((field) => <div key={field.id} className="questionnaire-response-row"><span>{field.label}</span><strong>{answerLabel(item.responses[field.id], field)}</strong></div>)}</div></article>)}</div>}
          </AdminPanel>

          <AdminPanel title="Files" description="Files uploaded through questionnaires are collected here for the Job." icon={FolderOpen}>
            {!allFiles.length ? <AdminEmptyState icon={FolderOpen} title="No files uploaded" description="Client questionnaire uploads will appear here." /> : <div className="crm-job-files">{allFiles.map((file) => <a key={file.id} href={AdminApiService.questionnaireFileUrl(file.questionnaireId, file.id)} target="_blank" rel="noreferrer"><FileText /><span><strong>{file.filename}</strong><small>{file.questionnaireTitle} · {Math.max(1, Math.round(file.fileSize / 1024))} KB</small></span><ExternalLink /></a>)}</div>}
          </AdminPanel>

          <AdminPanel title="Notes" description="Original enquiry notes are kept visible on the operational Job." icon={MessageSquareText}>
            {workspace.enquiry?.notes ? <div className="crm-job-note"><strong>{workspace.enquiry.reference}</strong><p>{workspace.enquiry.notes}</p><small>{workspace.enquiry.source}{workspace.enquiry.campaign ? ` · ${workspace.enquiry.campaign}` : ""} · {dateLabel(workspace.enquiry.createdAt)}</small></div> : <AdminEmptyState icon={MessageSquareText} title="No enquiry notes" description="Notes added to the originating enquiry will appear here." />}
          </AdminPanel>
        </div>

        <aside className="crm-job-workspace__side">
          <AdminPanel title="Job" icon={BriefcaseBusiness} compact>
            <dl className="admin-compact-details"><div><dt>Type</dt><dd>{job.jobType || "Wedding"}</dd></div><div><dt>Service</dt><dd>{job.serviceName || "—"}</dd></div><div><dt>Package</dt><dd>{job.packageName || "—"}</dd></div><div><dt>Wedding day</dt><dd>{dateLabel(job.eventDate)}</dd></div><div><dt>Venue</dt><dd>{job.venueText || "Venue TBC"}</dd></div><div><dt>Booking value</dt><dd>{money(job.valueAmount, job.currency)}</dd></div></dl>
          </AdminPanel>

          <AdminPanel title="Clients" description="Edit the reusable contact, send portal access or revoke it." icon={Users} compact>
            <div className="crm-job-clients">{workspace.contacts.map((contact) => { const access = activeAccessByContact.get(contact.id); return <article key={contact.id}><div><strong>{contact.displayName}</strong><p>{contact.role}</p><a href={contact.email ? `mailto:${contact.email}` : undefined}>{contact.email || "Email required"}</a>{contact.phone ? <span>{contact.phone}</span> : null}</div><div className="crm-job-client-actions"><Link className="admin-button admin-button--secondary admin-button--sm" to={`/admin/crm/contacts/${contact.id}`}><Pencil className="admin-button__icon" />Edit client</Link>{access ? <AdminStatus tone={access.acceptedAt ? "success" : "warning"}>{access.acceptedAt ? "portal active" : "invited"}</AdminStatus> : null}<AdminButton variant="primary" size="sm" icon={Mail} disabled={saving || !canManage || !contact.email} onClick={() => void invite(contact.id)}>{access ? "Send new link" : "Invite client"}</AdminButton>{access ? <AdminButton variant="danger" size="sm" icon={ShieldX} disabled={saving || !canManage} onClick={() => void revoke(access.identityId)}>Revoke</AdminButton> : null}</div></article>; })}</div>
          </AdminPanel>

          <AdminPanel title="Supplier team" description="Supplier Master links sync to the Wedding. New client suggestions require review." icon={Store} compact>
            {pendingSubmissions.length ? <div className="crm-supplier-review"><div className="crm-supplier-review__heading"><AdminStatus tone="warning">{pendingSubmissions.length} needs review</AdminStatus></div>{pendingSubmissions.map((submission) => { const review = supplierReview[submission.id] || { supplierId: "", role: submission.role, notes: "" }; return <article key={submission.id}><div className="flex items-start justify-between gap-2"><div><strong>{submission.name || "Unnamed supplier"}</strong><p>{submission.website || submission.instagram || submission.email || submission.location || "No contact details supplied"}</p></div><AdminStatus tone="warning">pending</AdminStatus></div><AdminField label="Wedding role"><input className="admin-input" value={review.role} disabled={!canManage} onChange={(event) => setSupplierReview((current) => ({ ...current, [submission.id]: { ...review, role: event.target.value } }))} /></AdminField><AdminField label="Approval action" help="Leave as Create new, or merge into an existing Supplier Master record."><select className="admin-select" value={review.supplierId} disabled={!canManage} onChange={(event) => setSupplierReview((current) => ({ ...current, [submission.id]: { ...review, supplierId: event.target.value } }))}><option value="">Create new Supplier Master record</option>{workspace.supplierDirectory.map((supplier) => <option key={supplier.id} value={supplier.id}>Merge into {supplier.name}{supplier.category ? ` · ${supplier.category}` : ""}</option>)}</select></AdminField><AdminField label="Review note"><input className="admin-input" value={review.notes} disabled={!canManage} onChange={(event) => setSupplierReview((current) => ({ ...current, [submission.id]: { ...review, notes: event.target.value } }))} /></AdminField><div className="flex flex-wrap gap-2"><AdminButton variant="primary" size="sm" icon={CheckCircle2} disabled={saving || !canManage} onClick={() => void approveSupplier(submission)}>Approve</AdminButton><AdminButton variant="danger" size="sm" icon={X} disabled={saving || !canManage} onClick={() => void rejectSupplier(submission)}>Reject</AdminButton></div></article>; })}</div> : null}
            {!workspace.linkedSuppliers.length ? <p className="text-[10px] text-neutral-500">No approved suppliers linked yet.</p> : <div className="crm-linked-suppliers">{workspace.linkedSuppliers.map((supplier) => <article key={`${supplier.id}_${supplier.role}`}><div><strong>{supplier.name}</strong><p>{supplier.role}{supplier.location ? ` · ${supplier.location}` : ""}</p></div><AdminStatus tone="success">linked</AdminStatus></article>)}</div>}
          </AdminPanel>

          <AdminPanel title="Assign questionnaire" description="Assign a versioned template to one client on this Job." icon={Send} compact>
            <div className="grid gap-3"><AdminField label="Template"><select className="admin-select" value={templateId} disabled={!canManage} onChange={(event) => setTemplateId(event.target.value)}>{workspace.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></AdminField><AdminField label="Client"><select className="admin-select" value={contactId} disabled={!canManage} onChange={(event) => setContactId(event.target.value)}>{workspace.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.displayName} ({contact.role})</option>)}</select></AdminField><AdminField label="Due date"><input className="admin-input" type="date" value={dueAt} disabled={!canManage} onChange={(event) => setDueAt(event.target.value)} /></AdminField><AdminButton variant="primary" icon={Plus} disabled={saving || !canManage || !templateId || !contactId} onClick={() => void assign()}>Assign questionnaire</AdminButton></div>
          </AdminPanel>

          <AdminPanel title="Recent activity" description="Operational changes recorded against this Job." icon={LockKeyhole} compact>
            {!workspace.activities.length ? <p className="text-[10px] text-neutral-500">No activity recorded.</p> : <div className="crm-activity-list">{workspace.activities.map((item) => <div key={item.id}><span></span><section><strong>{item.summary}</strong><p>{dateLabel(item.createdAt)}{item.actorEmail ? ` · ${item.actorEmail}` : ""}</p></section></div>)}</div>}
          </AdminPanel>
        </aside>
      </div>
    </AdminPage>
  );
}
