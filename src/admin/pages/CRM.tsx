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
  MapPin,
  MoreVertical,
  Plus,
  Save,
  Search,
  Settings2,
  Target,
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
} from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { CrmEnquiry, CrmEnquiryInput, CrmJob, CrmLeadFormSettings, CrmOverview, CrmWorkflowOverview, QuestionnaireOverview } from "../types/crm";

type View = "pipeline" | "contacts" | "jobs" | "schedule" | "questionnaires" | "workflows" | "lead-form" | "overview";

const validViews: View[] = ["overview", "pipeline", "contacts", "jobs", "schedule", "questionnaires", "workflows", "lead-form"];

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
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (["won", "booked", "active", "completed"].includes(status)) return "success";
  if (["lost", "cancelled"].includes(status)) return "danger";
  if (["new", "open", "sent", "invited"].includes(status)) return "info";
  return "neutral";
}

function nextLeadAction(enquiry: CrmEnquiry) {
  if (enquiry.acceptedJobId || enquiry.status === "won") return "Job created";
  if (enquiry.status === "lost" || enquiry.status === "archived") return "No open action";
  if (!enquiry.contactedAt) return "Review and contact lead";
  if (!enquiry.qualifiedAt) return "Qualify enquiry";
  return "Prepare or follow up quote";
}

function LeadRecord({ enquiry }: { enquiry: CrmEnquiry }) {
  const names = [enquiry.primaryContact?.displayName, enquiry.partnerContact?.displayName].filter(Boolean).join(" & ") || enquiry.reference;
  return (
    <article className="crm-operation-record">
      <Link to={`/admin/crm/enquiries/${enquiry.id}`} className="crm-operation-record__main" aria-label={`Open ${names}`}>
        <div className="crm-operation-record__identity">
          <div className="crm-operation-record__title-row"><span className="crm-record-dot" aria-hidden="true"></span><h3>{names}</h3></div>
          <p>{enquiry.source || "Manual enquiry"} · {enquiry.reference}</p>
        </div>
        <dl className="crm-operation-record__details">
          <div><dt>Wedding day</dt><dd><CalendarDays />{dateLabel(enquiry.eventDate)}</dd></div>
          <div><dt>Venue</dt><dd><MapPin />{enquiry.venueText || "Venue TBC"}</dd></div>
          <div><dt>Next action</dt><dd><Clock3 />{nextLeadAction(enquiry)}</dd></div>
        </dl>
        <div className="crm-operation-record__status">
          <AdminStatus tone={statusTone(enquiry.status)}>{enquiry.stageName || enquiry.status}</AdminStatus>
          <small>{enquiry.lastCommunicationAt ? `Last contact ${dateLabel(enquiry.lastCommunicationAt)}` : "No communication recorded"}</small>
        </div>
      </Link>
      <details className="crm-record-menu">
        <summary aria-label={`Actions for ${names}`}><MoreVertical /></summary>
        <div><Link to={`/admin/crm/enquiries/${enquiry.id}`}>Open enquiry</Link>{enquiry.acceptedJobId ? <Link to={`/admin/crm/jobs/${enquiry.acceptedJobId}`}>Open Job</Link> : null}<Link to="/admin/crm/quotes">Quotes</Link></div>
      </details>
    </article>
  );
}

function JobRecord({ job }: { job: CrmJob }) {
  const progress = job.taskTotal ? Math.round((job.taskCompleted / job.taskTotal) * 100) : 0;
  return (
    <article className="crm-operation-record crm-operation-record--job">
      <Link to={`/admin/crm/jobs/${job.id}`} className="crm-operation-record__main" aria-label={`Open ${job.title}`}>
        <div className="crm-operation-record__identity">
          <div className="crm-operation-record__title-row"><span className="crm-record-dot" aria-hidden="true"></span><h3>{job.title}</h3></div>
          <p>{job.reference} · {job.packageName || job.serviceName || job.jobType}</p>
        </div>
        <dl className="crm-operation-record__details">
          <div><dt>Wedding day</dt><dd><CalendarDays />{dateLabel(job.eventDate)}</dd></div>
          <div><dt>Venue</dt><dd><MapPin />{job.venueText || "Venue TBC"}</dd></div>
          <div><dt>Next task</dt><dd><Clock3 />{job.nextTaskTitle || "No pending task"}</dd></div>
        </dl>
        <div className="crm-operation-record__workflow">
          <div><span style={{ width: `${progress}%` }}></span></div>
          <small>{job.taskTotal ? `${job.taskCompleted} of ${job.taskTotal} complete` : "No workflow"}{job.taskOverdue ? ` · ${job.taskOverdue} overdue` : ""}</small>
        </div>
        <div className="crm-operation-record__status">
          <AdminStatus tone={statusTone(job.status)}>{job.status}</AdminStatus>
          <strong>{money(job.valueAmount, job.currency)}</strong>
          <small>{job.clientPortalStatus ? `Portal ${job.clientPortalStatus.replace(/_/g, " ")}` : "Portal not active"}</small>
        </div>
      </Link>
      <details className="crm-record-menu">
        <summary aria-label={`Actions for ${job.title}`}><MoreVertical /></summary>
        <div><Link to={`/admin/crm/jobs/${job.id}`}>Open Job</Link>{job.weddingSlug ? <Link to={`/admin/weddings/${job.weddingSlug}/workspace`}>Open Wedding</Link> : null}{job.quoteId ? <Link to={`/admin/crm/quotes/${job.quoteId}`}>Open quote</Link> : null}</div>
      </details>
    </article>
  );
}

export function CRM() {
  const { auth } = useProfessionalAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get("view") as View | null;
  const [crm, setCrm] = useState<CrmOverview | null>(null);
  const [view, setViewState] = useState<View>(requestedView && validViews.includes(requestedView) ? requestedView : "pipeline");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadFilter, setLeadFilter] = useState("open");
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatus, setJobStatus] = useState("active");
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [scheduleRange, setScheduleRange] = useState("upcoming");
  const [pipelineDisplay, setPipelineDisplay] = useState<"board" | "list">("list");
  const [showCreate, setShowCreate] = useState(false);
  const [newEnquiry, setNewEnquiry] = useState<CrmEnquiryInput>({ ...emptyEnquiry, primaryContact: { ...emptyEnquiry.primaryContact }, partnerContact: { ...emptyEnquiry.partnerContact } });
  const canManage = auth.permissions.includes("crm:manage");

  async function load() {
    setLoading(true);
    setError("");
    try { setCrm(await AdminApiService.getCrmOverview()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load CRM."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [auth.workspaceId]);
  useEffect(() => {
    const next = searchParams.get("view") as View | null;
    setViewState(next && validViews.includes(next) ? next : "pipeline");
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
    return (crm?.enquiries || []).filter((enquiry) => {
      if (leadFilter === "open" && enquiry.status !== "open") return false;
      if (leadFilter !== "all" && leadFilter !== "open" && enquiry.status !== leadFilter) return false;
      return !query || [enquiry.reference, enquiry.primaryContact?.displayName, enquiry.partnerContact?.displayName, enquiry.venueText, enquiry.source, enquiry.stageName].some((value) => String(value || "").toLowerCase().includes(query));
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [crm?.enquiries, leadSearch, leadFilter]);

  const filteredJobs = useMemo(() => {
    const query = jobSearch.trim().toLowerCase();
    return (crm?.jobs || []).filter((job) => {
      if (jobStatus === "active" && ["completed", "cancelled", "archived"].includes(job.status)) return false;
      if (jobStatus !== "all" && jobStatus !== "active" && job.status !== jobStatus) return false;
      return !query || [job.reference, job.title, job.serviceName, job.packageName, job.venueText, job.nextTaskTitle].some((value) => String(value || "").toLowerCase().includes(query));
    }).sort((a, b) => (a.eventDate || "9999").localeCompare(b.eventDate || "9999"));
  }, [crm?.jobs, jobSearch, jobStatus]);

  const scheduleItems = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const query = scheduleSearch.trim().toLowerCase();
    return (crm?.jobs || []).flatMap((job) => {
      const items: Array<{ id: string; date: string; type: "wedding" | "task"; title: string; detail: string; job: CrmJob }> = [];
      if (job.eventDate) items.push({ id: `${job.id}-event`, date: job.eventDate, type: "wedding", title: job.title, detail: job.venueText || "Venue TBC", job });
      if (job.nextTaskDueAt && job.nextTaskTitle) items.push({ id: `${job.id}-task`, date: job.nextTaskDueAt.slice(0, 10), type: "task", title: job.nextTaskTitle, detail: job.title, job });
      return items;
    }).filter((item) => {
      if (scheduleRange === "upcoming" && item.date < today) return false;
      return !query || [item.title, item.detail, item.job.reference, item.job.venueText].some((value) => String(value || "").toLowerCase().includes(query));
    }).sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
  }, [crm?.jobs, scheduleSearch, scheduleRange]);

  async function createEnquiry() {
    setSaving(true); setError(""); setMessage("");
    try {
      const detail = await AdminApiService.createCrmEnquiry({ ...newEnquiry, currency: crm?.workspace.currency || "GBP" });
      setShowCreate(false);
      setNewEnquiry({ ...emptyEnquiry, primaryContact: { ...emptyEnquiry.primaryContact }, partnerContact: { ...emptyEnquiry.partnerContact } });
      setMessage(`${detail.enquiry.reference} created.`);
      await load();
    } catch (createError) { setError(createError instanceof Error ? createError.message : "Unable to create enquiry."); }
    finally { setSaving(false); }
  }

  async function saveLeadForm(settings: CrmLeadFormSettings) {
    setSaving(true); setError(""); setMessage("");
    try { setCrm(await AdminApiService.saveCrmLeadForm(settings)); setMessage("Public lead form settings saved."); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save lead form settings."); }
    finally { setSaving(false); }
  }

  if (loading && !crm) return <AdminPage><p className="text-sm text-neutral-500">Loading CRM…</p></AdminPage>;

  const pageTitle: Record<View, string> = {
    overview: "WedCRM overview",
    pipeline: "Leads overview",
    contacts: "Clients",
    jobs: "Jobs overview",
    schedule: "Schedule",
    questionnaires: "Questionnaires",
    workflows: "Workflows",
    "lead-form": "Lead form",
  };

  return (
    <AdminPage className="crm-operations-page">
      <AdminPageHeader
        eyebrow="WedCRM · Client operations"
        title={view === "overview"
          ? "Dashboard"
          : pageTitle[view]}
        description="A clear operational view of leads, bookings, deadlines and client activity across this workspace."
        actions={<div className="flex flex-wrap gap-2"><Link to="/admin/crm/catalogue" className="admin-button admin-button--secondary admin-button--md"><Settings2 className="admin-button__icon" />Catalogue</Link><Link to="/admin/crm/quotes" className="admin-button admin-button--secondary admin-button--md"><FileQuestion className="admin-button__icon" />Quotes</Link>{canManage ? <AdminButton variant="primary" icon={Plus} onClick={() => setShowCreate((current) => !current)}>New enquiry</AdminButton> : null}</div>}
        meta={crm ? <div className="flex flex-wrap gap-2"><AdminStatus tone="info">{crm.stats.open} open leads</AdminStatus><AdminStatus tone="success">{crm.stats.jobs} jobs</AdminStatus><AdminStatus tone="neutral">{crm.contacts.length} clients</AdminStatus></div> : undefined}
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

      {view === "overview" ? <div className="grid gap-4">
        <section className="admin-module-metrics">
          <div className="admin-module-metric"><strong>{crm?.stats.open || 0}</strong><span>Open leads</span><small>{crm?.stats.new || 0} new</small></div>
          <div className="admin-module-metric"><strong>{crm?.stats.jobs || 0}</strong><span>Jobs</span><small>{(crm?.jobs || []).filter((job) => job.status === "booked").length} booked</small></div>
          <div className="admin-module-metric"><strong>{crm?.contacts.length || 0}</strong><span>Clients</span><small>Workspace contacts</small></div>
          <div className="admin-module-metric"><strong>{scheduleItems.length}</strong><span>Upcoming schedule</span><small>Weddings and deadlines</small></div>
        </section>
        <section className="admin-module-destination-grid">
          <Link to="/admin/crm" className="admin-module-destination"><span className="admin-module-destination__icon"><Target /></span><div><strong>Leads</strong><p>Review new enquiries, pipeline status and next actions.</p><div className="admin-module-destination__meta"><AdminStatus tone="info">{crm?.stats.open || 0} open</AdminStatus></div></div><ExternalLink className="admin-module-destination__arrow" /></Link>
          <Link to="/admin/crm?view=jobs" className="admin-module-destination"><span className="admin-module-destination__icon"><BriefcaseBusiness /></span><div><strong>Jobs</strong><p>Open booked workspaces, workflows, communications and client portal access.</p><div className="admin-module-destination__meta"><AdminStatus tone="success">{crm?.stats.jobs || 0} jobs</AdminStatus></div></div><ExternalLink className="admin-module-destination__arrow" /></Link>
          <Link to="/admin/crm/quotes" className="admin-module-destination"><span className="admin-module-destination__icon"><FileQuestion /></span><div><strong>Packages & quotes</strong><p>Manage catalogue packages and send immutable quote versions.</p></div><ExternalLink className="admin-module-destination__arrow" /></Link>
          <Link to="/admin/crm?view=questionnaires" className="admin-module-destination"><span className="admin-module-destination__icon"><ClipboardList /></span><div><strong>Questionnaires</strong><p>Build templates and track assigned client questionnaires.</p></div><ExternalLink className="admin-module-destination__arrow" /></Link>
        </section>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
          <AdminPanel title="Upcoming schedule" description="The next weddings and Job deadlines across this workspace." icon={CalendarDays}>
            {!scheduleItems.length ? <AdminEmptyState icon={CalendarDays} title="Nothing scheduled" description="Wedding dates and Job deadlines will appear here." /> : <div className="crm-schedule-list">{scheduleItems.slice(0, 6).map((item) => <Link key={item.id} to={`/admin/crm/jobs/${item.job.id}`} className={`crm-schedule-record crm-schedule-record--${item.type}`}><time dateTime={item.date}><strong>{new Date(`${item.date}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit" })}</strong><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span></time><div><AdminStatus tone={item.type === "wedding" ? "success" : "warning"}>{item.type}</AdminStatus><h3>{item.title}</h3><p>{item.detail}</p></div><ExternalLink /></Link>)}</div>}
          </AdminPanel>
          <AdminPanel title="Client operations" description="Communications remain attached to the relevant lead, client or Job record." icon={Mail}>
            <div className="admin-module-guidance"><div><Mail /><span><strong>Communications</strong><small>Send email or record calls, meetings, messages and notes from each Job workspace.</small></span></div><div><Workflow /><span><strong>Workflows</strong><small>Reusable task sequences control operational delivery after booking.</small></span></div><div><UserRound /><span><strong>Client records</strong><small>Contacts retain linked enquiries, Jobs, activity and communication history.</small></span></div></div>
          </AdminPanel>
        </div>
      </div> : null}

      {view === "pipeline" ? <div className="grid gap-4">
        <div className="crm-operations-toolbar">
          <div className="crm-search-control"><Search /><input value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} placeholder="Search lead name, venue or reference" /></div>
          <select className="admin-select" value={leadFilter} onChange={(event) => setLeadFilter(event.target.value)}><option value="open">Open leads</option><option value="all">All leads</option><option value="won">Accepted</option><option value="lost">Lost</option><option value="archived">Archived</option></select>
          <div className="crm-view-toggle"><AdminButton size="sm" variant={pipelineDisplay === "list" ? "primary" : "secondary"} icon={List} onClick={() => setPipelineDisplay("list")}>List</AdminButton><AdminButton size="sm" variant={pipelineDisplay === "board" ? "primary" : "secondary"} icon={Columns3} onClick={() => setPipelineDisplay("board")}>Board</AdminButton></div>
        </div>
        {pipelineDisplay === "list" ? (!filteredEnquiries.length ? <AdminEmptyState icon={ClipboardList} title="No enquiries found" description="Adjust the search or create the first enquiry." /> : <div className="crm-operations-list">{filteredEnquiries.map((enquiry) => <LeadRecord key={enquiry.id} enquiry={enquiry} />)}</div>) : <div className="crm-pipeline" aria-label="Enquiry pipeline">{(crm?.stages || []).map((stage) => { const enquiries = filteredEnquiries.filter((enquiry) => enquiry.stageId === stage.id); return <section key={stage.id} className="crm-stage-column"><div className="crm-stage-column__header"><span>{stage.name}</span><strong>{enquiries.length}</strong></div><div className="crm-stage-column__body">{!enquiries.length ? <p className="crm-stage-empty">No enquiries</p> : null}{enquiries.map((enquiry) => <Link key={enquiry.id} to={`/admin/crm/enquiries/${enquiry.id}`} className="crm-enquiry-card"><div className="flex items-start justify-between gap-3"><strong>{enquiry.primaryContact?.displayName || enquiry.reference}</strong><span>{enquiry.reference}</span></div>{enquiry.partnerContact?.displayName ? <p>{enquiry.partnerContact.displayName}</p> : null}<dl><div><CalendarDays />{dateLabel(enquiry.eventDate)}</div><div><BriefcaseBusiness />{enquiry.venueText || "Venue TBC"}</div></dl><small>{nextLeadAction(enquiry)}</small></Link>)}</div></section>; })}</div>}
      </div> : null}

      {view === "jobs" ? <div className="grid gap-4">
        <div className="crm-operations-toolbar">
          <div className="crm-search-control"><Search /><input value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} placeholder="Search job name, venue or reference" /></div>
          <select className="admin-select" value={jobStatus} onChange={(event) => setJobStatus(event.target.value)}><option value="active">Active jobs</option><option value="all">All jobs</option><option value="booked">Booked</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
        </div>
        {!filteredJobs.length ? <AdminEmptyState icon={BriefcaseBusiness} title="No jobs found" description="Accept a quote or adjust the current filters." /> : <div className="crm-operations-list">{filteredJobs.map((job) => <JobRecord key={job.id} job={job} />)}</div>}
      </div> : null}

      {view === "schedule" ? <div className="grid gap-4">
        <div className="crm-operations-toolbar">
          <div className="crm-search-control"><Search /><input value={scheduleSearch} onChange={(event) => setScheduleSearch(event.target.value)} placeholder="Search schedule" /></div>
          <select className="admin-select" value={scheduleRange} onChange={(event) => setScheduleRange(event.target.value)}><option value="upcoming">Upcoming</option><option value="all">All dates</option></select>
        </div>
        {!scheduleItems.length ? <AdminEmptyState icon={CalendarDays} title="Nothing scheduled" description="Wedding dates and next Job deadlines will appear here." /> : <div className="crm-schedule-list">{scheduleItems.map((item) => <Link key={item.id} to={`/admin/crm/jobs/${item.job.id}`} className={`crm-schedule-record crm-schedule-record--${item.type}`}><time dateTime={item.date}><strong>{new Date(`${item.date}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit" })}</strong><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span></time><div><AdminStatus tone={item.type === "wedding" ? "success" : "warning"}>{item.type}</AdminStatus><h3>{item.title}</h3><p>{item.detail}</p></div><ExternalLink /></Link>)}</div>}
      </div> : null}

      {view === "contacts" ? <div className="grid gap-4"><div className="crm-operations-toolbar"><div className="crm-search-control"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clients" /></div></div>{!filteredContacts.length ? <AdminEmptyState icon={UserRound} title="No clients yet" description="Clients appear when a lead form or manual enquiry is created." /> : <div className="crm-client-list">{filteredContacts.map((contact) => <Link key={contact.id} to={`/admin/crm/contacts/${contact.id}`}><span className="crm-client-avatar">{contact.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{contact.displayName}</strong><p>{contact.email || "No email"}{contact.phone ? ` · ${contact.phone}` : ""}</p></div><AdminStatus tone={contact.status === "active" ? "success" : "neutral"}>{contact.status}</AdminStatus></Link>)}</div>}</div> : null}

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
