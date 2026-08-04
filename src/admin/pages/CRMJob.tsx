import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Clock3,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe2,
  Images,
  LayoutDashboard,
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
import { AdminAccordion, AdminButton, AdminEmptyState, AdminField, AdminPage, AdminPageHeader, AdminPanel, AdminStatus } from "../components/ui/AdminUI";
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
  if (["completed", "active", "linked", "approved", "booked", "published", "live", "ready"].includes(status)) return "success";
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

function portalState(workspace: CrmJobWorkspace) {
  const activeAccess = workspace.portalAccess.filter((item) => item.status === "active");
  if (activeAccess.some((item) => Boolean(item.acceptedAt))) return { status: "active", label: "active" };
  if (activeAccess.length) return { status: "invited", label: "invited" };
  return { status: "not_invited", label: "not invited" };
}

function workflowState(workspace: CrmJobWorkspace) {
  const portal = portalState(workspace);
  const completed = workspace.questionnaires.filter((item) => item.status === "completed").length;
  const total = workspace.questionnaires.length;
  const weddingPassed = workspace.job.eventDate ? new Date(`${workspace.job.eventDate}T23:59:59`).getTime() < Date.now() : false;
  return [
    { label: "Lead created", detail: workspace.enquiry?.reference || workspace.job.enquiryId || "Manual Job", complete: true },
    { label: "Job accepted", detail: dateLabel(workspace.job.bookingDate || workspace.job.createdAt), complete: true },
    { label: "Client portal", detail: portal.status === "active" ? "Access active" : portal.status === "invited" ? "Invitation sent" : "Not invited", complete: portal.status === "active" },
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

  async function createClientGalleryFromJob() {
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await AdminApiService.createCrmJobClientGallery(id);
      setWorkspace(result.workspace);
      setMessage(result.idempotent ? "The existing linked client gallery is ready to open." : "Client gallery created from this Job and linked Wedding Workspace.");
    } catch (galleryError) {
      setError(galleryError instanceof Error ? galleryError.message : "Unable to create the client gallery.");
    } finally { setSaving(false); }
  }

  if (loading && !workspace) return <AdminPage><p className="text-sm text-neutral-500">Loading Job workspace…</p></AdminPage>;
  if (!workspace) return <AdminPage><div className="admin-alert admin-alert--error">{error || "Job not found."}</div></AdminPage>;
  const { job } = workspace;
  const workflow = workflowState(workspace);
  const primaryContact = workspace.contacts.find((contact) => contact.role === "primary") || workspace.contacts[0];
  const packageSnapshot = (job.packageSnapshot || {}) as any;
  const selectedAddons = Array.isArray(job.addonsSnapshot) ? job.addonsSnapshot as any[] : [];
  const nextTask = workspace.tasks.find((task) => task.status === "pending");
  const portal = portalState(workspace);
  const lifecycle = workspace.lifecycle;
  const primaryGallery = lifecycle.primaryClientGallery;
  const completedQuestionnaires = workspace.questionnaires.filter((item) => item.status === "completed").length;
  const storyLabel = lifecycle.story.state === "not_started" ? "not started" : lifecycle.story.state;

  return (
    <AdminPage className="crm-job-operations-page">
      <AdminPageHeader
        eyebrow={<Link to="/admin/crm?view=jobs" className="admin-inline-link inline-flex items-center gap-1"><ArrowLeft size={13} />Jobs overview</Link>}
        title={job.title}
        description={`${job.reference} · ${job.serviceName || job.jobType || "Wedding service"}`}
        meta={<div className="flex flex-wrap gap-2"><AdminStatus tone={statusTone(job.status)}>{job.status}</AdminStatus><AdminStatus tone={portal.status === "active" ? "success" : portal.status === "invited" ? "warning" : "neutral"}>portal {portal.label}</AdminStatus><AdminStatus tone="info">{dateLabel(job.eventDate)}</AdminStatus></div>}
        actions={<div className="flex flex-wrap gap-2">{job.quoteId ? <Link className="admin-button admin-button--secondary admin-button--md" to={`/admin/crm/quotes/${job.quoteId}`}><PackageCheck className="admin-button__icon" />Open quote</Link> : null}{job.weddingSlug ? <Link className="admin-button admin-button--primary admin-button--md" to={`/admin/weddings/${job.weddingSlug}/workspace`}><ExternalLink className="admin-button__icon" />Open Wedding Workspace</Link> : null}</div>}
      />
      {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
      {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}

      <AdminPanel className="crm-job-overview-panel">
        <div className="crm-job-overview">
          <div className="crm-job-overview__identity">
            <span className="crm-record-dot" aria-hidden="true"></span>
            <div><p>Active booking</p><h2>{job.title}</h2><small>{primaryContact?.email || "No primary email"}</small></div>
          </div>
          <dl className="crm-job-overview__facts">
            <div><dt>Wedding day</dt><dd><CalendarDays />{dateLabel(job.eventDate)}</dd></div>
            <div><dt>Venue</dt><dd><MapPin />{job.venueText || "Venue TBC"}</dd></div>
            <div><dt>Package</dt><dd><PackageCheck />{job.packageName || "Not set"}</dd></div>
            <div><dt>Booking value</dt><dd><BriefcaseBusiness />{money(job.valueAmount, job.currency)}</dd></div>
            <div><dt>Next task</dt><dd><Clock3 />{nextTask?.title || job.nextTaskTitle || "No pending task"}</dd></div>
            <div><dt>Portal</dt><dd><LockKeyhole />{portal.label}</dd></div>
          </dl>
          <div className="crm-job-overview__progress">
            {workflow.map((step, index) => <div key={step.label} className={step.complete ? "complete" : ""}><span>{step.complete ? <Check /> : index + 1}</span><div><strong>{step.label}</strong><small>{step.detail}</small></div></div>)}
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Wedding delivery and content"
        description="The CRM Job is the booking source. Its linked Wedding Workspace feeds private delivery and Website content without duplicate uploads."
        icon={LayoutDashboard}
        className="crm-wedding-lifecycle-panel"
      >
        <div className="crm-wedding-lifecycle-grid">
          <article className="crm-wedding-lifecycle-card">
            <span className="crm-wedding-lifecycle-card__icon"><LayoutDashboard /></span>
            <div><p>Wedding Workspace</p><strong>{lifecycle.wedding.exists ? "Ready" : "Not linked"}</strong><small>{lifecycle.wedding.exists ? `${lifecycle.wedding.couple || lifecycle.wedding.title} · ${lifecycle.wedding.venue || "Venue TBC"}` : "A booked wedding should have one shared operational workspace."}</small></div>
            {lifecycle.wedding.exists ? <Link className="admin-button admin-button--secondary admin-button--sm" to={`/admin/weddings/${lifecycle.wedding.slug}/workspace`}>Open</Link> : <AdminStatus tone="danger">review</AdminStatus>}
          </article>

          <article className="crm-wedding-lifecycle-card">
            <span className="crm-wedding-lifecycle-card__icon"><Images /></span>
            <div><p>Wedding assets</p><strong>{lifecycle.wedding.assetCount} photographs</strong><small>{lifecycle.wedding.previewCount} selected for the Wedding Day Preview Set.</small></div>
            {lifecycle.wedding.exists ? <Link className="admin-button admin-button--secondary admin-button--sm" to={`/admin/weddings/${lifecycle.wedding.slug}/workspace#preview-upload`}>Manage</Link> : null}
          </article>

          <article className="crm-wedding-lifecycle-card">
            <span className="crm-wedding-lifecycle-card__icon"><Images /></span>
            <div><p>Client Gallery</p><strong>{primaryGallery ? primaryGallery.title : "Not created"}</strong><small>{primaryGallery ? `${primaryGallery.status} · ${lifecycle.clientGalleries.length} linked gallery${lifecycle.clientGalleries.length === 1 ? "" : "s"}` : "Create a private gallery prefilled from this Job."}</small></div>
            {primaryGallery ? <Link className="admin-button admin-button--secondary admin-button--sm" to={`/admin/client-galleries/${primaryGallery.id}`}>Open</Link> : <AdminButton variant="primary" size="sm" icon={Plus} disabled={saving || !canManage || !lifecycle.wedding.exists} onClick={() => void createClientGalleryFromJob()}>Create</AdminButton>}
          </article>

          <article className="crm-wedding-lifecycle-card">
            <span className="crm-wedding-lifecycle-card__icon"><LockKeyhole /></span>
            <div><p>Client portal</p><strong>{portal.label}</strong><small>{workspace.portalAccess.filter((item) => item.status === "active").length} active access record{workspace.portalAccess.filter((item) => item.status === "active").length === 1 ? "" : "s"}.</small></div>
            <a className="admin-button admin-button--secondary admin-button--sm" href="#job-clients">Manage</a>
          </article>

          <article className="crm-wedding-lifecycle-card">
            <span className="crm-wedding-lifecycle-card__icon"><ClipboardList /></span>
            <div><p>Questionnaires</p><strong>{workspace.questionnaires.length ? `${completedQuestionnaires} of ${workspace.questionnaires.length} complete` : "None assigned"}</strong><small>Responses and uploads stay attached to this Job.</small></div>
            <a className="admin-button admin-button--secondary admin-button--sm" href="#job-questionnaires">Manage</a>
          </article>

          <article className="crm-wedding-lifecycle-card">
            <span className="crm-wedding-lifecycle-card__icon"><BookOpen /></span>
            <div><p>Wedding Story</p><strong>{storyLabel}</strong><small>{lifecycle.story.state === "published" ? `${lifecycle.story.publishedImageCount} published story images.` : `${lifecycle.story.draftImageCount} draft story images.`}</small></div>
            {lifecycle.wedding.exists ? <Link className="admin-button admin-button--secondary admin-button--sm" to={`/admin/weddings/${lifecycle.wedding.slug}/content`}>{lifecycle.story.state === "not_started" ? "Start" : "Edit"}</Link> : null}
          </article>

          <article className="crm-wedding-lifecycle-card">
            <span className="crm-wedding-lifecycle-card__icon"><Globe2 /></span>
            <div><p>Website galleries</p><strong>{lifecycle.publicAssignments.total} assignments</strong><small>{lifecycle.publicAssignments.venue} venue · {lifecycle.publicAssignments.moments} moments · {lifecycle.publicAssignments.galleries} collections.</small></div>
            {lifecycle.wedding.exists ? <Link className="admin-button admin-button--secondary admin-button--sm" to={`/admin/weddings/${lifecycle.wedding.slug}/workspace#publishing-destinations`}>Manage</Link> : null}
          </article>
        </div>
      </AdminPanel>

      <div className="crm-job-operations-grid">
        <div className="crm-job-operations-column">
          {job.quoteId ? <AdminAccordion title="Quote and package" description="Accepted commercial details are locked to this booking." icon={PackageCheck} defaultOpen summary={<AdminStatus tone="success">{money(job.valueAmount, job.currency)}</AdminStatus>}>
            <div className="crm-quote-job-summary"><dl className="admin-compact-details"><div><dt>Quote</dt><dd>{job.quoteReference || "—"} · v{job.quoteVersionNumber || 1}</dd></div><div><dt>Accepted</dt><dd>{dateLabel(job.acceptedQuoteAt || job.bookingDate)}</dd></div><div><dt>Package</dt><dd>{packageSnapshot.name || job.packageName || "—"}</dd></div><div><dt>Coverage</dt><dd>{packageSnapshot.coverageMinutes ? `${Math.round(packageSnapshot.coverageMinutes / 60)} hours` : "—"}</dd></div><div><dt>Subtotal</dt><dd>{money(job.bookingSubtotal, job.currency)}</dd></div><div><dt>Discount</dt><dd>{money(job.bookingDiscount, job.currency)}</dd></div><div><dt>Tax</dt><dd>{money(job.bookingTax, job.currency)}</dd></div><div><dt>Total booking value</dt><dd><strong>{money(job.valueAmount, job.currency)}</strong></dd></div></dl><div className="crm-quote-job-details"><section><h4>Included</h4>{Array.isArray(packageSnapshot.includedItems) && packageSnapshot.includedItems.length ? <ul>{packageSnapshot.includedItems.map((item: string) => <li key={item}>{item}</li>)}</ul> : <p>No included-item list stored.</p>}</section><section><h4>Selected add-ons</h4>{selectedAddons.length ? <ul>{selectedAddons.map((addon: any) => <li key={addon.id || addon.addonId || addon.name}><span>{addon.name}</span><strong>{addon.quantity || 1} × {money(addon.unitPriceAmount || 0, addon.currency || job.currency)}</strong></li>)}</ul> : <p>No optional add-ons selected.</p>}</section></div><Link className="admin-button admin-button--secondary admin-button--sm crm-inline-action" to={`/admin/crm/quotes/${job.quoteId}`}><ExternalLink className="admin-button__icon" />Open accepted quote</Link></div>
          </AdminAccordion> : null}

          <AdminAccordion title="Workflow and tasks" description={workspace.workflow ? `${workspace.workflow.templateName} · ${workspace.taskStats.completed} of ${workspace.taskStats.total} complete` : "Apply a workflow or add a one-off task."} icon={Workflow} defaultOpen summary={<AdminStatus tone={workspace.taskStats.overdue ? "danger" : workspace.taskStats.pending ? "warning" : "success"}>{workspace.taskStats.overdue ? `${workspace.taskStats.overdue} overdue` : `${workspace.taskStats.pending} pending`}</AdminStatus>}>
            {!workspace.workflow ? <div className="crm-apply-workflow"><AdminField label="Workflow template"><select className="admin-select" value={workflowTemplateId} disabled={!canManage} onChange={(event) => setWorkflowTemplateId(event.target.value)}><option value="">Choose workflow</option>{workspace.workflowTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}{template.default ? " · default" : ""}</option>)}</select></AdminField><AdminButton variant="primary" icon={Workflow} disabled={saving || !canManage || !workflowTemplateId} onClick={() => void applyWorkflow()}>Apply workflow</AdminButton></div> : null}
            {!workspace.tasks.length ? <AdminEmptyState icon={CheckCircle2} title="No tasks yet" description="Apply a workflow or add a task below." /> : <div className="crm-task-list">{workspace.tasks.filter((task) => task.status !== "cancelled").map((task) => { const overdue = task.status === "pending" && Boolean(task.dueAt && task.dueAt < new Date().toISOString().slice(0, 10)); return <article key={task.id} className={task.status === "completed" ? "complete" : overdue ? "overdue" : ""}><button type="button" aria-label={task.status === "completed" ? "Reopen task" : "Complete task"} disabled={saving || !canManage} onClick={() => void setTaskStatus(task.id, task.status === "completed" ? "pending" : "completed")}>{task.status === "completed" ? <Check /> : null}</button><div><strong>{task.title}</strong>{task.description ? <p>{task.description}</p> : null}<div className="flex flex-wrap gap-2"><AdminStatus tone={overdue ? "danger" : task.dueAt ? "warning" : "neutral"}>{task.dueAt ? dateLabel(task.dueAt) : "No due date"}</AdminStatus><AdminStatus tone={task.priority === "urgent" || task.priority === "high" ? "danger" : "neutral"}>{task.priority}</AdminStatus><AdminStatus tone="info">{task.taskType}</AdminStatus></div></div>{task.status === "pending" && canManage ? <AdminButton variant="ghost" size="sm" icon={Trash2} disabled={saving} onClick={() => void setTaskStatus(task.id, "cancelled")}>Cancel</AdminButton> : null}</article>; })}</div>}
            {canManage ? <div className="crm-task-create"><div className="grid gap-3 md:grid-cols-2"><AdminField label="New task"><input className="admin-input" value={taskDraft.title} onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Call client, review schedule…" /></AdminField><AdminField label="Due date"><input className="admin-input" type="date" value={taskDraft.dueAt} onChange={(event) => setTaskDraft((current) => ({ ...current, dueAt: event.target.value }))} /></AdminField><AdminField label="Type"><select className="admin-select" value={taskDraft.taskType} onChange={(event) => setTaskDraft((current) => ({ ...current, taskType: event.target.value }))}><option value="task">Task</option><option value="email">Email</option><option value="call">Call</option><option value="meeting">Meeting</option><option value="milestone">Milestone</option></select></AdminField><AdminField label="Priority"><select className="admin-select" value={taskDraft.priority} onChange={(event) => setTaskDraft((current) => ({ ...current, priority: event.target.value }))}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></AdminField></div><AdminField label="Description"><textarea className="admin-textarea" value={taskDraft.description} onChange={(event) => setTaskDraft((current) => ({ ...current, description: event.target.value }))} /></AdminField><AdminButton variant="primary" icon={Plus} disabled={saving || !taskDraft.title.trim()} onClick={() => void createTask()}>Add task</AdminButton></div> : null}
          </AdminAccordion>

          <AdminAccordion title="Communication" description="Send email or record calls, meetings, messages and internal notes." icon={MessageCircle} summary={<AdminStatus tone="neutral">{workspace.communications.length} records</AdminStatus>}>
            {canManage ? <div className="crm-communication-compose"><div className="grid gap-3 md:grid-cols-3"><AdminField label="Channel"><select className="admin-select" value={communicationDraft.channel} onChange={(event) => setCommunicationDraft((current) => ({ ...current, channel: event.target.value, direction: event.target.value === "note" ? "internal" : current.direction }))}><option value="note">Internal note</option><option value="email">Email</option><option value="phone">Phone call</option><option value="sms">Message / SMS</option><option value="meeting">Meeting</option></select></AdminField><AdminField label="Direction"><select className="admin-select" value={communicationDraft.direction} onChange={(event) => setCommunicationDraft((current) => ({ ...current, direction: event.target.value }))}><option value="internal">Internal</option><option value="outbound">Outbound</option><option value="inbound">Inbound</option></select></AdminField><AdminField label="Client"><select className="admin-select" value={communicationDraft.contactId} onChange={(event) => setCommunicationDraft((current) => ({ ...current, contactId: event.target.value }))}><option value="">No specific contact</option>{workspace.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.displayName}</option>)}</select></AdminField></div><AdminField label="Subject"><input className="admin-input" value={communicationDraft.subject} onChange={(event) => setCommunicationDraft((current) => ({ ...current, subject: event.target.value }))} placeholder="Optional for calls and notes" /></AdminField><AdminField label="Message / notes"><textarea className="admin-textarea min-h-28" value={communicationDraft.body} onChange={(event) => setCommunicationDraft((current) => ({ ...current, body: event.target.value }))} /></AdminField><div className="flex flex-wrap gap-2"><AdminButton icon={MessageSquareText} disabled={saving || (!communicationDraft.body.trim() && !communicationDraft.subject.trim())} onClick={() => void saveCommunication(false)}>Log communication</AdminButton><AdminButton variant="primary" icon={Mail} disabled={saving || !communicationDraft.contactId || !communicationDraft.subject.trim() || !communicationDraft.body.trim()} onClick={() => void saveCommunication(true)}>Send email</AdminButton></div></div> : null}
            {!workspace.communications.length ? <AdminEmptyState icon={MessageCircle} title="No communication recorded" description="Emails and logged contact history will appear here." /> : <div className="crm-communication-list">{workspace.communications.map((item) => <article key={item.id}><div className="crm-communication-list__icon">{item.channel === "email" ? <Mail /> : item.channel === "phone" ? <Phone /> : item.channel === "meeting" ? <Users /> : <MessageSquareText />}</div><div><div className="flex flex-wrap items-center gap-2"><strong>{item.subject || item.channel.replace(/_/g, " ")}</strong><AdminStatus tone={item.status === "failed" ? "danger" : item.status === "sent" ? "success" : "neutral"}>{item.status}</AdminStatus><AdminStatus tone="info">{item.direction}</AdminStatus></div><p>{item.body}</p><small>{item.contactName || item.contactEmail || "Internal"} · {dateLabel(item.occurredAt)}{item.actorEmail ? ` · ${item.actorEmail}` : ""}</small></div></article>)}</div>}
          </AdminAccordion>
        </div>

        <div className="crm-job-operations-column">
          <div id="job-clients" className="scroll-mt-5"><AdminAccordion title="Clients" description="Contact details and client portal access." icon={Users} defaultOpen summary={<AdminStatus tone="neutral">{workspace.contacts.length}</AdminStatus>}>
            <div className="crm-job-clients">{workspace.contacts.map((contact) => { const access = activeAccessByContact.get(contact.id); return <article key={contact.id}><div><strong>{contact.displayName}</strong><p>{contact.role}</p><a href={contact.email ? `mailto:${contact.email}` : undefined}>{contact.email || "Email required"}</a>{contact.phone ? <span>{contact.phone}</span> : null}</div><div className="crm-job-client-actions"><Link className="admin-button admin-button--secondary admin-button--sm" to={`/admin/crm/contacts/${contact.id}`}><Pencil className="admin-button__icon" />Edit client</Link>{access ? <AdminStatus tone={access.acceptedAt ? "success" : "warning"}>{access.acceptedAt ? "portal active" : "invited"}</AdminStatus> : null}<AdminButton variant="primary" size="sm" icon={Mail} disabled={saving || !canManage || !contact.email} onClick={() => void invite(contact.id)}>{access ? "Send new link" : "Invite client"}</AdminButton>{access ? <AdminButton variant="danger" size="sm" icon={ShieldX} disabled={saving || !canManage} onClick={() => void revoke(access.identityId)}>Revoke</AdminButton> : null}</div></article>; })}</div>
          </AdminAccordion></div>

          <div id="job-questionnaires" className="scroll-mt-5"><AdminAccordion title="Questionnaires" description="Assign forms and review responses." icon={ClipboardList} summary={<AdminStatus tone="neutral">{workspace.questionnaires.length}</AdminStatus>}>
            {canManage ? <div className="crm-questionnaire-assign"><AdminField label="Template"><select className="admin-select" value={templateId} disabled={!canManage} onChange={(event) => setTemplateId(event.target.value)}>{workspace.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></AdminField><AdminField label="Client"><select className="admin-select" value={contactId} disabled={!canManage} onChange={(event) => setContactId(event.target.value)}>{workspace.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.displayName} ({contact.role})</option>)}</select></AdminField><AdminField label="Due date"><input className="admin-input" type="date" value={dueAt} disabled={!canManage} onChange={(event) => setDueAt(event.target.value)} /></AdminField><AdminButton variant="primary" icon={Plus} disabled={saving || !canManage || !templateId || !contactId} onClick={() => void assign()}>Assign questionnaire</AdminButton></div> : null}
            {!workspace.questionnaires.length ? <AdminEmptyState icon={FileText} title="No questionnaires assigned" description="Assign a template above when client information is needed." /> : <div className="grid gap-3">{workspace.questionnaires.map((item) => <article key={item.id} className="questionnaire-instance-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3>{item.title}</h3><p>{item.assignedContactName || "Client not assigned"}{item.dueAt ? ` · due ${dateLabel(item.dueAt)}` : ""}</p></div><AdminStatus tone={statusTone(item.status)}>{item.status.replace(/_/g, " ")}</AdminStatus></div>{item.introduction ? <p className="mt-3 text-[10px] leading-5 text-neutral-500">{item.introduction}</p> : null}<div className="mt-3 grid gap-2">{item.fields.filter((field) => !["heading", "description", "file"].includes(field.type)).map((field) => <div key={field.id} className="questionnaire-response-row"><span>{field.label}</span><strong>{answerLabel(item.responses[field.id], field)}</strong></div>)}</div></article>)}</div>}
          </AdminAccordion></div>

          <AdminAccordion title="Supplier team" description="Approved Wedding suppliers and client suggestions." icon={Store} summary={pendingSubmissions.length ? <AdminStatus tone="warning">{pendingSubmissions.length} review</AdminStatus> : <AdminStatus tone="neutral">{workspace.linkedSuppliers.length} linked</AdminStatus>}>
            {pendingSubmissions.length ? <div className="crm-supplier-review"><div className="crm-supplier-review__heading"><AdminStatus tone="warning">{pendingSubmissions.length} needs review</AdminStatus></div>{pendingSubmissions.map((submission) => { const review = supplierReview[submission.id] || { supplierId: "", role: submission.role, notes: "" }; return <article key={submission.id}><div className="flex items-start justify-between gap-2"><div><strong>{submission.name || "Unnamed supplier"}</strong><p>{submission.website || submission.instagram || submission.email || submission.location || "No contact details supplied"}</p></div><AdminStatus tone="warning">pending</AdminStatus></div><AdminField label="Wedding role"><input className="admin-input" value={review.role} disabled={!canManage} onChange={(event) => setSupplierReview((current) => ({ ...current, [submission.id]: { ...review, role: event.target.value } }))} /></AdminField><AdminField label="Approval action"><select className="admin-select" value={review.supplierId} disabled={!canManage} onChange={(event) => setSupplierReview((current) => ({ ...current, [submission.id]: { ...review, supplierId: event.target.value } }))}><option value="">Create new Supplier Master record</option>{workspace.supplierDirectory.map((supplier) => <option key={supplier.id} value={supplier.id}>Merge into {supplier.name}{supplier.category ? ` · ${supplier.category}` : ""}</option>)}</select></AdminField><AdminField label="Review note"><input className="admin-input" value={review.notes} disabled={!canManage} onChange={(event) => setSupplierReview((current) => ({ ...current, [submission.id]: { ...review, notes: event.target.value } }))} /></AdminField><div className="flex flex-wrap gap-2"><AdminButton variant="primary" size="sm" icon={CheckCircle2} disabled={saving || !canManage} onClick={() => void approveSupplier(submission)}>Approve</AdminButton><AdminButton variant="danger" size="sm" icon={X} disabled={saving || !canManage} onClick={() => void rejectSupplier(submission)}>Reject</AdminButton></div></article>; })}</div> : null}
            {!workspace.linkedSuppliers.length ? <AdminEmptyState icon={Store} title="No suppliers linked" description="Approved supplier selections will appear here." /> : <div className="crm-linked-suppliers">{workspace.linkedSuppliers.map((supplier) => <article key={`${supplier.id}_${supplier.role}`}><div><strong>{supplier.name}</strong><p>{supplier.role}{supplier.location ? ` · ${supplier.location}` : ""}</p></div><AdminStatus tone="success">linked</AdminStatus></article>)}</div>}
          </AdminAccordion>

          <AdminAccordion title="Files" description="Files uploaded through client questionnaires." icon={FolderOpen} summary={<AdminStatus tone="neutral">{allFiles.length}</AdminStatus>}>
            {!allFiles.length ? <AdminEmptyState icon={FolderOpen} title="No files uploaded" description="Client questionnaire uploads will appear here." /> : <div className="crm-job-files">{allFiles.map((file) => <a key={file.id} href={AdminApiService.questionnaireFileUrl(file.questionnaireId, file.id)} target="_blank" rel="noreferrer"><FileText /><span><strong>{file.filename}</strong><small>{file.questionnaireTitle} · {Math.max(1, Math.round(file.fileSize / 1024))} KB</small></span><ExternalLink /></a>)}</div>}
          </AdminAccordion>

          <AdminAccordion title="Notes and activity" description="Original enquiry notes and the latest operational changes." icon={MessageSquareText} summary={<AdminStatus tone="neutral">{workspace.activities.length} events</AdminStatus>}>
            {workspace.enquiry?.notes ? <div className="crm-job-note"><strong>{workspace.enquiry.reference}</strong><p>{workspace.enquiry.notes}</p><small>{workspace.enquiry.source}{workspace.enquiry.campaign ? ` · ${workspace.enquiry.campaign}` : ""} · {dateLabel(workspace.enquiry.createdAt)}</small></div> : <p className="text-[10px] text-neutral-500">No enquiry notes recorded.</p>}
            <div className="crm-activity-list crm-activity-list--spaced">{workspace.activities.map((item) => <div key={item.id}><span></span><section><strong>{item.summary}</strong><p>{dateLabel(item.createdAt)}{item.actorEmail ? ` · ${item.actorEmail}` : ""}</p></section></div>)}</div>
          </AdminAccordion>
        </div>
      </div>
    </AdminPage>
  );
}
