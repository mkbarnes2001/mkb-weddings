import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Columns3,
  ExternalLink,
  FileQuestion,
  List,
  Mail,
  Plus,
  Save,
  Search,
  Settings2,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";
import {
  AdminButton,
  AdminEmptyState,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
  AdminTab,
  AdminTabs,
} from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { CrmEnquiryInput, CrmLeadFormSettings, CrmOverview, CrmWorkflowOverview, QuestionnaireOverview } from "../types/crm";

type View = "pipeline" | "contacts" | "jobs" | "questionnaires" | "workflows" | "lead-form";

const emptyEnquiry: CrmEnquiryInput = {
  source: "manual",
  eventType: "wedding",
  serviceInterest: "Wedding photography",
  currency: "GBP",
  primaryContact: { firstName: "", lastName: "", email: "", phone: "" },
  partnerContact: { firstName: "", lastName: "", email: "", phone: "" },
};

function money(value: number | null, currency = "GBP") {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value / 100);
}

function dateLabel(value: string) {
  if (!value) return "Date TBC";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function CRM() {
  const { auth } = useProfessionalAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get("view") as View | null;
  const [crm, setCrm] = useState<CrmOverview | null>(null);
  const [view, setViewState] = useState<View>(requestedView && ["pipeline", "contacts", "jobs", "questionnaires", "workflows", "lead-form"].includes(requestedView) ? requestedView : "pipeline");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatus, setJobStatus] = useState("active");
  const [pipelineDisplay, setPipelineDisplay] = useState<"board" | "list">("board");
  const [showCreate, setShowCreate] = useState(false);
  const [newEnquiry, setNewEnquiry] = useState<CrmEnquiryInput>({ ...emptyEnquiry, primaryContact: { ...emptyEnquiry.primaryContact }, partnerContact: { ...emptyEnquiry.partnerContact } });
  const canManage = auth.permissions.includes("crm:manage");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setCrm(await AdminApiService.getCrmOverview());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load CRM.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [auth.workspaceId]);
  useEffect(() => {
    const next = searchParams.get("view") as View | null;
    if (next && ["pipeline", "contacts", "jobs", "questionnaires", "workflows", "lead-form"].includes(next)) setViewState(next);
  }, [searchParams]);

  function setView(next: View) {
    setViewState(next);
    setSearchParams(next === "pipeline" ? {} : { view: next }, { replace: true });
  }

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return crm?.contacts || [];
    return (crm?.contacts || []).filter((contact) => [contact.displayName, contact.email, contact.phone].some((value) => value.toLowerCase().includes(query)));
  }, [crm?.contacts, search]);

  const filteredEnquiries = useMemo(() => {
    const query = leadSearch.trim().toLowerCase();
    if (!query) return crm?.enquiries || [];
    return (crm?.enquiries || []).filter((enquiry) => [enquiry.reference, enquiry.primaryContact?.displayName, enquiry.partnerContact?.displayName, enquiry.venueText, enquiry.source, enquiry.stageName].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [crm?.enquiries, leadSearch]);

  const filteredJobs = useMemo(() => {
    const query = jobSearch.trim().toLowerCase();
    return (crm?.jobs || []).filter((job) => {
      if (jobStatus === "active" && ["completed", "cancelled", "archived"].includes(job.status)) return false;
      if (jobStatus !== "all" && jobStatus !== "active" && job.status !== jobStatus) return false;
      return !query || [job.reference, job.title, job.serviceName, job.venueText, job.nextTaskTitle].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [crm?.jobs, jobSearch, jobStatus]);

  async function createEnquiry() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const detail = await AdminApiService.createCrmEnquiry({ ...newEnquiry, currency: crm?.workspace.currency || "GBP" });
      setShowCreate(false);
      setNewEnquiry({ ...emptyEnquiry, primaryContact: { ...emptyEnquiry.primaryContact }, partnerContact: { ...emptyEnquiry.partnerContact } });
      setMessage(`${detail.enquiry.reference} created.`);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create enquiry.");
    } finally {
      setSaving(false);
    }
  }

  async function saveLeadForm(settings: CrmLeadFormSettings) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      setCrm(await AdminApiService.saveCrmLeadForm(settings));
      setMessage("Public lead form settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save lead form settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !crm) return <AdminPage><p className="text-sm text-neutral-500">Loading CRM…</p></AdminPage>;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="CRM · Enquiries and jobs"
        title="Client pipeline"
        description="Capture leads, prepare package choices and convert accepted quotes into Jobs and Wedding records without retyping client details."
        actions={<div className="flex flex-wrap gap-2"><Link to="/admin/crm/catalogue" className="admin-button admin-button--secondary admin-button--md"><Settings2 className="admin-button__icon" />Catalogue</Link><Link to="/admin/crm/quotes" className="admin-button admin-button--secondary admin-button--md"><FileQuestion className="admin-button__icon" />Quotes</Link>{canManage ? <AdminButton variant="primary" icon={Plus} onClick={() => setShowCreate((current) => !current)}>New enquiry</AdminButton> : null}</div>}
        meta={crm ? <div className="flex flex-wrap gap-2"><AdminStatus tone="info">{crm.stats.new} new</AdminStatus><AdminStatus tone="neutral">{crm.stats.open} open</AdminStatus><AdminStatus tone="success">{crm.stats.won} accepted</AdminStatus><AdminStatus tone="warning">{crm.stats.jobs} jobs</AdminStatus></div> : undefined}
      />

      {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
      {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}

      {showCreate ? (
        <AdminPanel title="Create enquiry" description="Use this for phone, email or social-media leads. Website submissions arrive automatically." icon={Plus}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminField label="First name"><input className="admin-input" value={newEnquiry.primaryContact?.firstName || ""} onChange={(event) => setNewEnquiry((current) => ({ ...current, primaryContact: { ...current.primaryContact, firstName: event.target.value } }))} /></AdminField>
            <AdminField label="Last name"><input className="admin-input" value={newEnquiry.primaryContact?.lastName || ""} onChange={(event) => setNewEnquiry((current) => ({ ...current, primaryContact: { ...current.primaryContact, lastName: event.target.value } }))} /></AdminField>
            <AdminField label="Email"><input className="admin-input" type="email" value={newEnquiry.primaryContact?.email || ""} onChange={(event) => setNewEnquiry((current) => ({ ...current, primaryContact: { ...current.primaryContact, email: event.target.value } }))} /></AdminField>
            <AdminField label="Phone"><input className="admin-input" value={newEnquiry.primaryContact?.phone || ""} onChange={(event) => setNewEnquiry((current) => ({ ...current, primaryContact: { ...current.primaryContact, phone: event.target.value } }))} /></AdminField>
            <AdminField label="Partner first name"><input className="admin-input" value={newEnquiry.partnerContact?.firstName || ""} onChange={(event) => setNewEnquiry((current) => ({ ...current, partnerContact: { ...current.partnerContact, firstName: event.target.value } }))} /></AdminField>
            <AdminField label="Wedding date"><input className="admin-input" type="date" value={newEnquiry.eventDate || ""} onChange={(event) => setNewEnquiry((current) => ({ ...current, eventDate: event.target.value }))} /></AdminField>
            <AdminField label="Venue"><input className="admin-input" value={newEnquiry.venueText || ""} onChange={(event) => setNewEnquiry((current) => ({ ...current, venueText: event.target.value }))} placeholder="Venue or TBC" /></AdminField>
            <AdminField label="Service interest"><input className="admin-input" value={newEnquiry.serviceInterest || ""} onChange={(event) => setNewEnquiry((current) => ({ ...current, serviceInterest: event.target.value }))} /></AdminField>
          </div>
          <div className="mt-4"><AdminField label="Notes"><textarea className="admin-textarea min-h-24" value={newEnquiry.notes || ""} onChange={(event) => setNewEnquiry((current) => ({ ...current, notes: event.target.value }))} /></AdminField></div>
          <div className="mt-4 flex gap-2"><AdminButton variant="primary" onClick={() => void createEnquiry()} disabled={saving}>Create enquiry</AdminButton><AdminButton onClick={() => setShowCreate(false)}>Cancel</AdminButton></div>
        </AdminPanel>
      ) : null}

      <AdminTabs>
        <AdminTab active={view === "pipeline"} onClick={() => setView("pipeline")}>Pipeline</AdminTab>
        <AdminTab active={view === "contacts"} onClick={() => setView("contacts")}>Contacts</AdminTab>
        <AdminTab active={view === "jobs"} onClick={() => setView("jobs")}>Jobs</AdminTab>
        <AdminTab active={view === "questionnaires"} onClick={() => setView("questionnaires")}>Questionnaires</AdminTab>
        <AdminTab active={view === "workflows"} onClick={() => setView("workflows")}>Workflows</AdminTab>
        <AdminTab active={view === "lead-form"} onClick={() => setView("lead-form")}>Lead form</AdminTab>
      </AdminTabs>

      {view === "pipeline" ? (
        <div className="grid gap-4">
          <div className="admin-toolbar flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2"><AdminButton size="sm" variant={pipelineDisplay === "board" ? "primary" : "secondary"} icon={Columns3} onClick={() => setPipelineDisplay("board")}>Board</AdminButton><AdminButton size="sm" variant={pipelineDisplay === "list" ? "primary" : "secondary"} icon={List} onClick={() => setPipelineDisplay("list")}>List</AdminButton></div>
            <div className="relative min-w-[240px]"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" /><input className="admin-input pl-9" value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} placeholder="Search leads" /></div>
          </div>
          {pipelineDisplay === "board" ? <div className="crm-pipeline" aria-label="Enquiry pipeline">
            {(crm?.stages || []).map((stage) => {
              const enquiries = filteredEnquiries.filter((enquiry) => enquiry.stageId === stage.id);
              return (
                <section key={stage.id} className="crm-stage-column">
                  <div className="crm-stage-column__header"><span>{stage.name}</span><strong>{enquiries.length}</strong></div>
                  <div className="crm-stage-column__body">
                    {!enquiries.length ? <p className="crm-stage-empty">No enquiries</p> : null}
                    {enquiries.map((enquiry) => (
                      <Link key={enquiry.id} to={`/admin/crm/enquiries/${enquiry.id}`} className="crm-enquiry-card">
                        <div className="flex items-start justify-between gap-3"><strong>{enquiry.primaryContact?.displayName || enquiry.reference}</strong><span>{enquiry.reference}</span></div>
                        {enquiry.partnerContact?.displayName ? <p>{enquiry.partnerContact.displayName}</p> : null}
                        <dl><div><CalendarDays />{dateLabel(enquiry.eventDate)}</div><div><BriefcaseBusiness />{enquiry.venueText || "Venue TBC"}</div></dl>
                        <small>{enquiry.source}{enquiry.budgetMax ? ` · ${money(enquiry.budgetMax, enquiry.currency)}` : ""}</small>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div> : <AdminPanel title="Lead list" description="A compact operational view of every enquiry, its stage and latest communication." icon={List}>
            {!filteredEnquiries.length ? <AdminEmptyState icon={ClipboardList} title="No enquiries found" description="Adjust the search or create the first enquiry." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Created</th><th>Client</th><th>Wedding</th><th>Stage</th><th>Source</th><th>Last communication</th></tr></thead><tbody>{filteredEnquiries.map((enquiry) => <tr key={enquiry.id}><td>{dateLabel(enquiry.createdAt.slice(0, 10))}</td><td><Link className="admin-inline-link" to={`/admin/crm/enquiries/${enquiry.id}`}>{enquiry.primaryContact?.displayName || enquiry.reference}</Link><div className="text-[10px] text-neutral-500">{enquiry.reference}{enquiry.partnerContact?.displayName ? ` · ${enquiry.partnerContact.displayName}` : ""}</div></td><td>{dateLabel(enquiry.eventDate)}<div className="text-[10px] text-neutral-500">{enquiry.venueText || "Venue TBC"}</div></td><td><AdminStatus tone={enquiry.status === "won" ? "success" : enquiry.status === "lost" ? "danger" : "info"}>{enquiry.stageName}</AdminStatus></td><td>{enquiry.source}</td><td>{enquiry.lastCommunicationAt ? dateLabel(enquiry.lastCommunicationAt.slice(0,10)) : "No communication"}</td></tr>)}</tbody></table></div>}
          </AdminPanel>}
        </div>
      ) : null}

      {view === "contacts" ? (
        <AdminPanel title="Contacts" description="Contacts are reusable across enquiries and future Jobs." icon={Users} actions={<div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" /><input className="admin-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts" /></div>}>
          {!filteredContacts.length ? <AdminEmptyState icon={UserRound} title="No contacts yet" description="Contacts will appear when a lead form or manual enquiry is created." /> : (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Source</th><th>Updated</th></tr></thead><tbody>{filteredContacts.map((contact) => <tr key={contact.id}><td><Link className="admin-inline-link" to={`/admin/crm/contacts/${contact.id}`}>{contact.displayName}</Link></td><td>{contact.email || "—"}</td><td>{contact.phone || "—"}</td><td>{contact.source}</td><td>{dateLabel(contact.updatedAt.slice(0, 10))}</td></tr>)}</tbody></table></div>
          )}
        </AdminPanel>
      ) : null}

      {view === "jobs" ? (
        <AdminPanel title="Accepted jobs" description="Search active work, see workflow progress and identify the next task." icon={BriefcaseBusiness} actions={<div className="flex flex-wrap gap-2"><select className="admin-select min-w-[150px]" value={jobStatus} onChange={(event) => setJobStatus(event.target.value)}><option value="active">Active jobs</option><option value="all">All jobs</option><option value="booked">Booked</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" /><input className="admin-input pl-9" value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} placeholder="Search jobs" /></div></div>}>
          {!filteredJobs.length ? <AdminEmptyState icon={ClipboardList} title="No jobs found" description="Accept a quote or adjust the current filters." /> : (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Wedding date</th><th>Job</th><th>Workflow progress</th><th>Next task</th><th>Status</th><th>Value</th></tr></thead><tbody>{filteredJobs.map((job) => { const progress = job.taskTotal ? Math.round((job.taskCompleted / job.taskTotal) * 100) : 0; return <tr key={job.id}><td>{dateLabel(job.eventDate)}</td><td><Link className="admin-inline-link" to={`/admin/crm/jobs/${job.id}`}>{job.title}</Link><div className="text-[10px] text-neutral-500">{job.reference} · {job.serviceName || job.jobType}</div></td><td><div className="crm-progress"><span style={{ width: `${progress}%` }}></span></div><div className="mt-1 text-[9px] text-neutral-500">{job.taskTotal ? `${job.taskCompleted} of ${job.taskTotal} complete` : "No workflow applied"}{job.taskOverdue ? ` · ${job.taskOverdue} overdue` : ""}</div></td><td>{job.nextTaskTitle || "No pending task"}<div className="text-[10px] text-neutral-500">{job.nextTaskDueAt ? dateLabel(job.nextTaskDueAt) : ""}</div></td><td><AdminStatus tone={job.status === "booked" || job.status === "active" ? "success" : job.status === "cancelled" ? "danger" : "neutral"}>{job.status}</AdminStatus></td><td>{money(job.valueAmount, job.currency)}</td></tr>; })}</tbody></table></div>
          )}
        </AdminPanel>
      ) : null}

      {view === "questionnaires" ? <QuestionnaireLibrary workspaceId={auth.workspaceId} canManage={canManage} /> : null}

      {view === "workflows" ? <WorkflowLibrary workspaceId={auth.workspaceId} canManage={canManage} /> : null}

      {view === "lead-form" && crm ? <LeadFormSettings settings={crm.leadForm} saving={saving} canManage={canManage} onSave={saveLeadForm} /> : null}
    </AdminPage>
  );
}

function LeadFormSettings({ settings, saving, canManage, onSave }: { settings: CrmLeadFormSettings; saving: boolean; canManage: boolean; onSave: (settings: CrmLeadFormSettings) => Promise<void> }) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);
  return (
    <AdminPanel title="Public lead form" description="The public website form resolves the business from its verified domain; the browser cannot choose a workspace." icon={Settings2} actions={<a href="/enquire" target="_blank" rel="noreferrer" className="admin-button admin-button--secondary admin-button--sm"><ExternalLink className="admin-button__icon" />Preview form</a>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="admin-choice-row"><div><strong>Accept public enquiries</strong><p>Disable this to make the endpoint unavailable without deleting pipeline data.</p></div><input type="checkbox" checked={draft.enabled} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} /></label>
        <AdminField label="Notification email"><input className="admin-input" type="email" value={draft.notificationEmail} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, notificationEmail: event.target.value }))} /></AdminField>
        <label className="admin-choice-row"><div><strong>Send acknowledgement email</strong><p>Automatically confirm receipt to the person who submits the public form.</p></div><input type="checkbox" checked={draft.autoresponderEnabled} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, autoresponderEnabled: event.target.checked }))} /></label>
        <AdminField label="Acknowledgement subject" help="Variables: {{first_name}}, {{reference}}, {{business_name}}, {{event_date}}, {{venue}}"><input className="admin-input" value={draft.autoresponderSubject} disabled={!canManage || !draft.autoresponderEnabled} onChange={(event) => setDraft((current) => ({ ...current, autoresponderSubject: event.target.value }))} /></AdminField>
        <AdminField label="Acknowledgement message" help="Sent as plain, accessible email content. Variables shown above are supported."><textarea className="admin-textarea min-h-32" value={draft.autoresponderMessage} disabled={!canManage || !draft.autoresponderEnabled} onChange={(event) => setDraft((current) => ({ ...current, autoresponderMessage: event.target.value }))} /></AdminField>
        <AdminField label="Form title"><input className="admin-input" value={draft.title} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></AdminField>
        <AdminField label="Default service" help="Copied into new website enquiries; leave blank for a neutral form."><input className="admin-input" value={draft.defaultService} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, defaultService: event.target.value }))} placeholder="Wedding photography" /></AdminField>
        <AdminField label="Public URL" help="Custom form paths will be added with the hosted-site routing release."><input className="admin-input" value="/enquire" disabled /></AdminField>
        <AdminField label="Introduction"><textarea className="admin-textarea" value={draft.intro} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, intro: event.target.value }))} /></AdminField>
        <AdminField label="Privacy consent text"><textarea className="admin-textarea" value={draft.privacyText} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, privacyText: event.target.value }))} /></AdminField>
        <AdminField label="Thank-you heading"><input className="admin-input" value={draft.thankYouTitle} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, thankYouTitle: event.target.value }))} /></AdminField>
        <AdminField label="Thank-you message"><textarea className="admin-textarea" value={draft.thankYouMessage} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, thankYouMessage: event.target.value }))} /></AdminField>
      </div>
      {canManage ? <div className="mt-4"><AdminButton variant="primary" icon={Save} disabled={saving} onClick={() => void onSave(draft)}>Save lead form</AdminButton></div> : null}
    </AdminPanel>
  );
}


function QuestionnaireLibrary({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<QuestionnaireOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setOverview(await AdminApiService.getQuestionnaireOverview()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load questionnaires."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [workspaceId]);

  async function createTemplate() {
    setSaving(true);
    setError("");
    try {
      const template = await AdminApiService.createQuestionnaireTemplate({ name: "New questionnaire", description: "", status: "draft", fields: [] });
      navigate(`/admin/crm/questionnaires/${template.id}`);
    } catch (createError) { setError(createError instanceof Error ? createError.message : "Unable to create questionnaire template."); }
    finally { setSaving(false); }
  }

  return (
    <div className="grid gap-4">
      {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
      <AdminPanel title="Questionnaire templates" description="Build reusable forms, then assign a versioned copy to an accepted Job." icon={FileQuestion} actions={canManage ? <AdminButton variant="primary" size="sm" icon={Plus} disabled={saving} onClick={() => void createTemplate()}>New template</AdminButton> : undefined}>
        {loading ? <p className="text-[10px] text-neutral-500">Loading questionnaires…</p> : !overview?.templates.length ? <AdminEmptyState icon={FileQuestion} title="No questionnaire templates" description="Create a reusable questionnaire for your client workflow." /> : <div className="questionnaire-template-grid">{overview.templates.map((template) => <Link key={template.id} to={`/admin/crm/questionnaires/${template.id}`} className="questionnaire-template-card"><div><strong>{template.name}</strong><p>{template.description || "No description"}</p></div><div className="flex gap-2"><AdminStatus tone={template.status === "active" ? "success" : "neutral"}>{template.status}</AdminStatus><AdminStatus tone="info">{template.fields.length} fields</AdminStatus></div></Link>)}</div>}
      </AdminPanel>
      <AdminPanel title="Assigned questionnaires" description="Questionnaires assigned to Jobs appear here for quick progress review." icon={ClipboardList}>
        {!overview?.instances.length ? <AdminEmptyState icon={ClipboardList} title="No assigned questionnaires" description="Open an accepted Job to assign a template and invite the client." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Questionnaire</th><th>Job</th><th>Client</th><th>Status</th><th>Updated</th></tr></thead><tbody>{overview.instances.map((item) => <tr key={item.id}><td><strong>{item.title}</strong></td><td><Link className="admin-inline-link" to={`/admin/crm/jobs/${item.jobId}`}>{item.jobTitle || item.jobReference || "Open Job"}</Link></td><td>{item.assignedContactName || "Any portal client"}</td><td><AdminStatus tone={item.status === "completed" ? "success" : item.status === "in_progress" || item.status === "opened" ? "info" : item.status === "sent" ? "warning" : "neutral"}>{item.status.replace(/_/g, " ")}</AdminStatus></td><td>{dateLabel(item.updatedAt.slice(0,10))}</td></tr>)}</tbody></table></div>}
      </AdminPanel>
    </div>
  );
}

function WorkflowLibrary({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<CrmWorkflowOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setOverview(await AdminApiService.getCrmWorkflowOverview()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load workflows."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [workspaceId]);

  async function createTemplate() {
    setSaving(true); setError("");
    try {
      const template = await AdminApiService.createCrmWorkflowTemplate({ name: "New workflow", description: "", status: "draft", steps: [] });
      navigate(`/admin/crm/workflows/${template.id}`);
    } catch (createError) { setError(createError instanceof Error ? createError.message : "Unable to create workflow template."); }
    finally { setSaving(false); }
  }

  const pendingTasks = overview?.tasks.filter((task) => task.status === "pending") || [];
  const overdue = pendingTasks.filter((task) => task.dueAt && task.dueAt < new Date().toISOString().slice(0, 10));
  const jobById = new Map<string, CrmWorkflowOverview["jobs"][number]>((overview?.jobs || []).map((job) => [job.id, job]));

  return <div className="grid gap-4">
    {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
    <AdminPanel title="Workflow templates" description="Build reusable task sequences. The default template is applied automatically when an enquiry becomes a Job." icon={Workflow} actions={canManage ? <AdminButton variant="primary" size="sm" icon={Plus} disabled={saving} onClick={() => void createTemplate()}>New workflow</AdminButton> : undefined}>
      {loading ? <p className="text-[10px] text-neutral-500">Loading workflows…</p> : !overview?.templates.length ? <AdminEmptyState icon={Workflow} title="No workflow templates" description="Create a workflow to automate the first Job task list." /> : <div className="questionnaire-template-grid">{overview.templates.map((template) => <Link key={template.id} to={`/admin/crm/workflows/${template.id}`} className="questionnaire-template-card"><div><strong>{template.name}</strong><p>{template.description || "No description"}</p></div><div className="flex flex-wrap gap-2"><AdminStatus tone={template.status === "active" ? "success" : "neutral"}>{template.status}</AdminStatus>{template.default ? <AdminStatus tone="success">default</AdminStatus> : null}<AdminStatus tone="info">{template.steps.length} tasks</AdminStatus></div></Link>)}</div>}
    </AdminPanel>
    <AdminPanel title="Task overview" description="Pending tasks across all Jobs, ordered by due date." icon={Clock3} actions={<div className="flex gap-2"><AdminStatus tone="warning">{pendingTasks.length} pending</AdminStatus>{overdue.length ? <AdminStatus tone="danger">{overdue.length} overdue</AdminStatus> : null}</div>}>
      {!pendingTasks.length ? <AdminEmptyState icon={CheckCircle2} title="No pending tasks" description="New Job workflows and manually created tasks will appear here." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Due</th><th>Task</th><th>Job</th><th>Type</th><th>Priority</th></tr></thead><tbody>{pendingTasks.slice(0, 200).map((task) => { const job = jobById.get(task.jobId); const isOverdue = Boolean(task.dueAt && task.dueAt < new Date().toISOString().slice(0, 10)); return <tr key={task.id}><td><AdminStatus tone={isOverdue ? "danger" : task.dueAt ? "warning" : "neutral"}>{task.dueAt ? dateLabel(task.dueAt) : "No date"}</AdminStatus></td><td><strong>{task.title}</strong><div className="text-[10px] text-neutral-500">{task.description}</div></td><td>{job ? <Link className="admin-inline-link" to={`/admin/crm/jobs/${job.id}`}>{job.title}</Link> : "—"}</td><td>{task.taskType}</td><td>{task.priority}</td></tr>; })}</tbody></table></div>}
    </AdminPanel>
  </div>;
}
