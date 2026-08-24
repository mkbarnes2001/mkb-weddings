import {
  useEffect,
  useMemo,
  useState } from "react";
import { Link,
  useNavigate,
  useSearchParams } from "react-router-dom";
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
  LayoutDashboard,
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
  AdminHeaderRouterLink,
} from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import { CrmPaymentSchedulePresets } from "../components/CrmPaymentSchedulePresets";
import type { CrmCommercialSettingsInput, CrmCommercialSettingsPayload, CrmEnquiry, CrmEnquiryInput, CrmJob, CrmLeadFormSettings, CrmOverview, CrmWorkflowOverview, QuestionnaireOverview, CrmContractTemplate, CrmLeadFormField, CrmLeadFormFieldType } from "../types/crm";

type View = "pipeline" | "contacts" | "jobs" | "schedule" | "questionnaires" | "workflows" | "commercial-settings" | "lead-form" | "overview";

const validViews: View[] = ["overview", "pipeline", "contacts", "jobs", "schedule", "questionnaires", "workflows", "commercial-settings", "lead-form"];

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

function compactDateLabel(
  value: string,
) {
  if (!value) {
    return "—";
  }

  const parsed =
    /^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
      ? new Date(
          `${value}T12:00:00`,
        )
      : new Date(value);

  return Number.isNaN(
    parsed.getTime(),
  )
    ? value
    : parsed.toLocaleDateString(
        "en-GB",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
      );
}

function mailStatusTone(
  status: CrmEnquiry["mailStatus"],
): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "failed") {
    return "danger";
  }

  if (status === "clicked") {
    return "info";
  }

  if (status === "opened") {
    return "success";
  }

  if (
    status === "sent"
    || status === "delivered"
  ) {
    return "warning";
  }

  return "neutral";
}

function mailStatusLabel(
  status: CrmEnquiry["mailStatus"],
) {
  if (status === "clicked") {
    return "Link clicked";
  }

  if (status === "opened") {
    return "Opened";
  }

  if (status === "delivered") {
    return "Delivered";
  }

  if (status === "sent") {
    return "Sent";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "None";
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

function LeadRecord({
  enquiry,
}: {
  enquiry: CrmEnquiry;
}) {
  const people =
    [
      enquiry.primaryContact
        ?.displayName,
      enquiry.partnerContact
        ?.displayName,
    ].filter(Boolean);

  const names =
    people.length
      ? people.join(" & ")
      : enquiry.reference;

  const service =
    enquiry.serviceInterest
    || enquiry.eventType
    || "Wedding";

  const mailDate =
    enquiry.mailStatusAt
      ? compactDateLabel(
          enquiry.mailStatusAt,
        )
      : "";

  return (
    <article className="crm-lead-row">
      <Link
        to={`/admin/crm/enquiries/${enquiry.id}`}
        className="crm-lead-row__main"
        aria-label={`Open ${names}`}
      >
        <div
          className="crm-lead-cell crm-lead-cell--created"
          data-label="Created"
        >
          <time dateTime={enquiry.createdAt}>
            {compactDateLabel(
              enquiry.createdAt,
            )}
          </time>
        </div>

        <div
          className="crm-lead-cell crm-lead-cell--identity"
          data-label="Lead"
        >
          <strong>{names}</strong>
          <small>
            {enquiry.reference}
            {enquiry.stageName
              ? ` · ${enquiry.stageName}`
              : ""}
          </small>
        </div>

        <div
          className="crm-lead-cell"
          data-label="Service"
        >
          <span>{service}</span>
        </div>

        <div
          className="crm-lead-cell"
          data-label="Event date"
        >
          <time dateTime={enquiry.eventDate}>
            {compactDateLabel(
              enquiry.eventDate,
            )}
          </time>
        </div>

        <div
          className="crm-lead-cell crm-lead-cell--mail"
          data-label="Mail status"
          title={
            enquiry.mailSubject
              || undefined
          }
        >
          <AdminStatus
            tone={mailStatusTone(
              enquiry.mailStatus,
            )}
          >
            {mailStatusLabel(
              enquiry.mailStatus,
            )}
          </AdminStatus>

          {mailDate ? (
            <small>{mailDate}</small>
          ) : null}
        </div>

        <div
          className="crm-lead-cell crm-lead-cell--next"
          data-label="Next action"
        >
          <span>
            {nextLeadAction(
              enquiry,
            )}
          </span>
        </div>
      </Link>

      <details className="crm-record-menu crm-lead-row__menu">
        <summary
          aria-label={`Actions for ${names}`}
        >
          <MoreVertical />
        </summary>

        <div>
          <Link
            to={`/admin/crm/enquiries/${enquiry.id}`}
          >
            Open lead
          </Link>

          {enquiry.acceptedJobId ? (
            <Link
              to={`/admin/crm/jobs/${enquiry.acceptedJobId}`}
            >
              Open Job
            </Link>
          ) : null}
        </div>
      </details>
    </article>
  );
}

function JobRecord({
  job,
}: {
  job: CrmJob;
}) {
  const progress =
    job.taskTotal
      ? Math.round(
          (
            job.taskCompleted
            / job.taskTotal
          ) * 100,
        )
      : 0;

  return (
    <article className="crm-operation-record crm-operation-record--job">
      <Link
        to={`/admin/crm/jobs/${job.id}`}
        className="crm-operation-record__main"
        aria-label={`Open ${job.title}`}
      >
        <div className="crm-operation-record__identity">
          <div className="crm-operation-record__title-row">
            <span
              className="crm-record-dot"
              aria-hidden="true"
            />

            <h3>{job.title}</h3>
          </div>

          <p>
            {job.reference}
            {" · "}
            {job.packageName
              || job.serviceName
              || job.jobType}
          </p>
        </div>

        <dl className="crm-operation-record__details">
          <div>
            <dt>Wedding day</dt>
            <dd>
              <CalendarDays />
              {dateLabel(job.eventDate)}
            </dd>
          </div>

          <div>
            <dt>Venue</dt>
            <dd>
              <MapPin />
              {job.venueText || "Venue TBC"}
            </dd>
          </div>

          <div>
            <dt>Next task</dt>
            <dd>
              <Clock3 />
              {job.nextTaskTitle
                || "No pending task"}
            </dd>
          </div>
        </dl>

        <div className="crm-operation-record__workflow">
          <div>
            <span
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <small>
            {job.taskTotal
              ? `${job.taskCompleted} of ${job.taskTotal} complete`
              : "No workflow"}
            {job.taskOverdue
              ? ` · ${job.taskOverdue} overdue`
              : ""}
          </small>
        </div>

        <div className="crm-operation-record__status">
          <AdminStatus
            tone={statusTone(job.status)}
          >
            {job.status}
          </AdminStatus>

          <strong>
            {money(
              job.valueAmount,
              job.currency,
            )}
          </strong>
        </div>
      </Link>

      <div
        className="crm-job-record-actions"
        aria-label={`Actions for ${job.title}`}
      >
        <Link
          className="admin-icon-control"
          to={`/admin/crm/jobs/${job.id}`}
          aria-label={`Open Job ${job.title}`}
          title="Open Job"
        >
          <ExternalLink aria-hidden="true" />
        </Link>

        {job.weddingSlug ? (
          <Link
            className="admin-icon-control"
            to={`/admin/weddings/${job.weddingSlug}/workspace`}
            aria-label={`Open Wedding Workspace for ${job.title}`}
            title="Open Wedding Workspace"
          >
            <LayoutDashboard aria-hidden="true" />
          </Link>
        ) : null}

        {job.quoteId ? (
          <Link
            className="admin-icon-control"
            to={`/admin/crm/quotes/${job.quoteId}`}
            aria-label={`Open quote for ${job.title}`}
            title="Open quote"
          >
            <FileQuestion aria-hidden="true" />
          </Link>
        ) : null}
      </div>
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
    "commercial-settings": "Commercial settings",
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
        actions={<div className="flex flex-wrap gap-2"><AdminHeaderRouterLink to="/admin/crm/catalogue" className="admin-button admin-button--secondary admin-button--md"><Settings2 className="admin-button__icon" />Catalogue</AdminHeaderRouterLink><AdminHeaderRouterLink to="/admin/crm/quotes" className="admin-button admin-button--secondary admin-button--md"><FileQuestion className="admin-button__icon" />Quotes</AdminHeaderRouterLink>{canManage ? <AdminButton variant="primary" icon={Plus} onClick={() => setShowCreate((current) => !current)}>New enquiry</AdminButton> : null}</div>}
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
        {pipelineDisplay === "list" ? (!filteredEnquiries.length ? <AdminEmptyState icon={ClipboardList} title="No enquiries found" description="Adjust the search or create the first enquiry." /> : <div className="crm-lead-list"><div className="crm-lead-list__header" aria-hidden="true"><span>Created</span><span>Lead</span><span>Service</span><span>Event date</span><span>Mail Status</span><span>Next action</span><span></span></div>{filteredEnquiries.map((enquiry) => <LeadRecord key={enquiry.id} enquiry={enquiry} />)}</div>) : <div className="crm-pipeline" aria-label="Enquiry pipeline">{(crm?.stages || []).map((stage) => { const enquiries = filteredEnquiries.filter((enquiry) => enquiry.stageId === stage.id); return <section key={stage.id} className="crm-stage-column"><div className="crm-stage-column__header"><span>{stage.name}</span><strong>{enquiries.length}</strong></div><div className="crm-stage-column__body">{!enquiries.length ? <p className="crm-stage-empty">No enquiries</p> : null}{enquiries.map((enquiry) => <Link key={enquiry.id} to={`/admin/crm/enquiries/${enquiry.id}`} className="crm-enquiry-card"><div className="flex items-start justify-between gap-3"><strong>{enquiry.primaryContact?.displayName || enquiry.reference}</strong><span>{enquiry.reference}</span></div>{enquiry.partnerContact?.displayName ? <p>{enquiry.partnerContact.displayName}</p> : null}<dl><div><CalendarDays />{dateLabel(enquiry.eventDate)}</div><div><BriefcaseBusiness />{enquiry.venueText || "Venue TBC"}</div></dl><small>{nextLeadAction(enquiry)}</small></Link>)}</div></section>; })}</div>}
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
      {view === "commercial-settings" ? <CommercialSettings workspaceId={auth.workspaceId} canManage={canManage && auth.accessMode !== "support"} /> : null}
      {view === "lead-form" && crm ? <LeadFormSettings settings={crm.leadForm} saving={saving} canManage={canManage} onSave={saveLeadForm} /> : null}
    </AdminPage>
  );
}

function CommercialSettings({
  workspaceId,
  canManage,
}: {
  workspaceId: string;
  canManage: boolean;
}) {
  const navigate = useNavigate();

  const [payload, setPayload] =
    useState<CrmCommercialSettingsPayload | null>(null);

  const [
    contractTemplates,
    setContractTemplates,
  ] = useState<CrmContractTemplate[]>([]);

  const [
    contractTemplatesLoading,
    setContractTemplatesLoading,
  ] = useState(true);

  const [
    creatingContractTemplate,
    setCreatingContractTemplate,
  ] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setMessage("");

    AdminApiService.getCrmCommercialSettings()
      .then((next) => {
        if (active) setPayload(next);
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load commercial settings.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workspaceId]);

  useEffect(() => {
    let active = true;

    setContractTemplatesLoading(true);

    AdminApiService
      .listCrmContractTemplates()
      .then((templates) => {
        if (active) {
          setContractTemplates(
            templates,
          );
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load contract templates.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setContractTemplatesLoading(
            false,
          );
        }
      });

    return () => {
      active = false;
    };
  }, [workspaceId]);

  function patchSettings(
    patch: Partial<CrmCommercialSettingsPayload["settings"]>,
  ) {
    setPayload((current) =>
      current
        ? {
            ...current,
            settings: {
              ...current.settings,
              ...patch,
            },
          }
        : current,
    );
    setMessage("");
    setError("");
  }

  function patchInvoiceSequence(
    patch: Partial<CrmCommercialSettingsPayload["invoiceSequence"]>,
  ) {
    setPayload((current) =>
      current
        ? {
            ...current,
            invoiceSequence: {
              ...current.invoiceSequence,
              ...patch,
            },
          }
        : current,
    );
    setMessage("");
    setError("");
  }

  async function createContractTemplate() {
    if (!canManage) {
      return;
    }

    setCreatingContractTemplate(
      true,
    );
    setError("");
    setMessage("");

    try {
      const template =
        await AdminApiService
          .createCrmContractTemplate({
            name:
              "New contract template",
            description: "",
            status: "archived",
            sections: [],
          });

      navigate(
        `/admin/crm/contracts/templates/${template.id}`,
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create contract template.",
      );
    } finally {
      setCreatingContractTemplate(
        false,
      );
    }
  }

  async function save() {
    if (!payload || !canManage) return;

    const input: CrmCommercialSettingsInput = {
      autoCreateContract:
        payload.settings.autoCreateContract,
      autoCreateInvoice:
        payload.settings.autoCreateInvoice,
      autoAssignQuestionnaire:
        payload.settings.autoAssignQuestionnaire,
      defaultContractTemplateId:
        payload.settings.defaultContractTemplateId,
      defaultQuestionnaireTemplateId:
        payload.settings.defaultQuestionnaireTemplateId,
      depositType:
        payload.settings.depositType,
      depositValue:
        payload.settings.depositValue,
      depositDueDaysAfterAcceptance:
        payload.settings.depositDueDaysAfterAcceptance,
      finalBalanceDueDaysBeforeEvent:
        payload.settings.finalBalanceDueDaysBeforeEvent,
      questionnaireDueDaysBeforeEvent:
        payload.settings.questionnaireDueDaysBeforeEvent,
      invoiceNotes:
        payload.settings.invoiceNotes,
      invoiceTerms:
        payload.settings.invoiceTerms,
      invoicePrefix:
        payload.invoiceSequence.prefix,
      invoicePadding:
        payload.invoiceSequence.padding,
    };

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved =
        await AdminApiService.saveCrmCommercialSettings(input);
      setPayload(saved);
      setMessage("Commercial settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save commercial settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading && !payload) {
    return (
      <AdminPanel
        title="Commercial settings"
        description="Loading workspace booking and invoice defaults."
        icon={Settings2}
      >
        <p className="text-[10px] text-neutral-500">
          Loading commercial settings…
        </p>
      </AdminPanel>
    );
  }

  if (!payload) {
    return (
      <AdminPanel
        title="Commercial settings"
        description="Workspace booking and invoice defaults are unavailable."
        icon={Settings2}
      >
        <p className="text-[10px] text-red-700">
          {error || "Unable to load commercial settings."}
        </p>
      </AdminPanel>
    );
  }

  const depositValue =
    payload.settings.depositType === "none"
      ? 0
      : payload.settings.depositValue / 100;

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-xl bg-red-50 p-3 text-[10px] text-red-800">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl bg-emerald-50 p-3 text-[10px] text-emerald-800">
          {message}
        </div>
      ) : null}

      {!canManage ? (
        <div className="rounded-xl bg-neutral-100 p-3 text-[10px] text-neutral-600">
          Commercial settings are read-only in this session.
        </div>
      ) : null}

      <AdminPanel
        title="Booking automation"
        description="Choose what WedCRM prepares automatically after a quote is accepted."
        icon={Settings2}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="admin-choice-row">
            <div>
              <strong>Create contract automatically</strong>
              <p>
                Generate the booking contract from the active
                workspace default template.
              </p>
            </div>
            <input
              type="checkbox"
              checked={payload.settings.autoCreateContract}
              disabled={!canManage || saving}
              onChange={(event) =>
                patchSettings({
                  autoCreateContract: event.target.checked,
                })
              }
            />
          </label>

          <AdminField
            label="Default contract template"
            help="Only active workspace templates can be selected."
          >
            <select
              className="admin-select"
              value={
                payload.settings.defaultContractTemplateId || ""
              }
              disabled={!canManage || saving}
              onChange={(event) =>
                patchSettings({
                  defaultContractTemplateId:
                    event.target.value || null,
                })
              }
            >
              <option value="">
                No default contract template
              </option>
              {payload.contractTemplates.map((template) => (
                <option
                  key={template.id}
                  value={template.id}
                >
                  {template.name}
                </option>
              ))}
            </select>
          </AdminField>

          <label className="admin-choice-row">
            <div>
              <strong>Create invoice automatically</strong>
              <p>
                Build the first invoice and payment schedule from
                the accepted quote snapshot.
              </p>
            </div>
            <input
              type="checkbox"
              checked={payload.settings.autoCreateInvoice}
              disabled={!canManage || saving}
              onChange={(event) =>
                patchSettings({
                  autoCreateInvoice: event.target.checked,
                })
              }
            />
          </label>

          <label className="admin-choice-row">
            <div>
              <strong>Assign questionnaire automatically</strong>
              <p>
                Add the selected questionnaire to the booking pack
                when the quote becomes a Job.
              </p>
            </div>
            <input
              type="checkbox"
              checked={payload.settings.autoAssignQuestionnaire}
              disabled={!canManage || saving}
              onChange={(event) =>
                patchSettings({
                  autoAssignQuestionnaire: event.target.checked,
                })
              }
            />
          </label>

          <AdminField
            label="Default questionnaire"
            help="Only active workspace templates can be selected."
          >
            <select
              className="admin-select"
              value={
                payload.settings.defaultQuestionnaireTemplateId || ""
              }
              disabled={!canManage || saving}
              onChange={(event) =>
                patchSettings({
                  defaultQuestionnaireTemplateId:
                    event.target.value || null,
                })
              }
            >
              <option value="">
                No default questionnaire
              </option>
              {payload.questionnaireTemplates.map((template) => (
                <option
                  key={template.id}
                  value={template.id}
                >
                  {template.name}
                </option>
              ))}
            </select>
          </AdminField>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Contract templates"
        description="Build reusable contract wording. Existing generated contracts keep their saved snapshots when templates are changed later."
        icon={FileQuestion}
        actions={
          canManage ? (
            <AdminButton
              variant="primary"
              size="sm"
              icon={Plus}
              disabled={
                creatingContractTemplate
              }
              onClick={() =>
                void createContractTemplate()
              }
            >
              {creatingContractTemplate
                ? "Creating…"
                : "New template"}
            </AdminButton>
          ) : undefined
        }
      >
        {contractTemplatesLoading ? (
          <p className="text-[10px] text-neutral-500">
            Loading contract templates…
          </p>
        ) : !contractTemplates.length ? (
          <AdminEmptyState
            icon={FileQuestion}
            title="No contract templates"
            description="Create an inactive template, enter your own contract wording, then activate it when ready."
          />
        ) : (
          <div className="questionnaire-template-grid">
            {contractTemplates.map(
              (template) => (
                <Link
                  key={template.id}
                  to={
                    `/admin/crm/contracts/templates/${template.id}`
                  }
                  className="questionnaire-template-card"
                >
                  <div>
                    <strong>
                      {template.name}
                    </strong>

                    <p>
                      {template.description
                        || "No description"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <AdminStatus
                      tone={
                        template.status
                          === "active"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {template.status
                        === "active"
                        ? "active"
                        : "inactive"}
                    </AdminStatus>

                    {payload.settings
                      .defaultContractTemplateId
                      === template.id ? (
                      <AdminStatus tone="success">
                        default
                      </AdminStatus>
                    ) : null}

                    <AdminStatus tone="info">
                      {template.sections.length}
                      {" "}
                      section
                      {template.sections.length
                        === 1
                        ? ""
                        : "s"}
                    </AdminStatus>
                  </div>
                </Link>
              ),
            )}
          </div>
        )}
      </AdminPanel>

      <CrmPaymentSchedulePresets canManage={canManage} />

      <AdminPanel
        title="Legacy payment fallback"
        description="Set the default deposit and deadline rules used when a booking invoice is generated."
        icon={Settings2}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AdminField label="Deposit type">
            <select
              className="admin-select"
              value={payload.settings.depositType}
              disabled={!canManage || saving}
              onChange={(event) => {
                const depositType =
                  event.target.value as
                    CrmCommercialSettingsPayload["settings"]["depositType"];

                patchSettings({
                  depositType,
                  depositValue: 0,
                });
              }}
            >
              <option value="none">
                No automatic deposit
              </option>
              <option value="fixed">
                Fixed amount
              </option>
              <option value="percentage">
                Percentage
              </option>
            </select>
          </AdminField>

          <AdminField
            label={
              payload.settings.depositType === "percentage"
                ? "Deposit (%)"
                : "Deposit (£)"
            }
            help={
              payload.settings.depositType === "percentage"
                ? "Percentage of the accepted booking total."
                : "Fixed deposit amount in the workspace currency."
            }
          >
            <input
              className="admin-input"
              type="number"
              min="0"
              max={
                payload.settings.depositType === "percentage"
                  ? 100
                  : undefined
              }
              step="0.01"
              value={depositValue}
              disabled={
                !canManage
                || saving
                || payload.settings.depositType === "none"
              }
              onChange={(event) => {
                const raw =
                  Math.max(
                    0,
                    Number(event.target.value || 0),
                  );

                const bounded =
                  payload.settings.depositType === "percentage"
                    ? Math.min(raw, 100)
                    : raw;

                patchSettings({
                  depositValue:
                    Math.round(bounded * 100),
                });
              }}
            />
          </AdminField>

          <AdminField
            label="Deposit due after acceptance"
            help="Number of days after quote acceptance."
          >
            <input
              className="admin-input"
              type="number"
              min="0"
              value={
                payload.settings.depositDueDaysAfterAcceptance
              }
              disabled={!canManage || saving}
              onChange={(event) =>
                patchSettings({
                  depositDueDaysAfterAcceptance:
                    Math.max(
                      0,
                      Number(event.target.value || 0),
                    ),
                })
              }
            />
          </AdminField>

          <AdminField
            label="Final balance before event"
            help="Number of days before the wedding or event."
          >
            <input
              className="admin-input"
              type="number"
              min="0"
              value={
                payload.settings.finalBalanceDueDaysBeforeEvent
              }
              disabled={!canManage || saving}
              onChange={(event) =>
                patchSettings({
                  finalBalanceDueDaysBeforeEvent:
                    Math.max(
                      0,
                      Number(event.target.value || 0),
                    ),
                })
              }
            />
          </AdminField>

          <AdminField
            label="Questionnaire due before event"
            help="Default questionnaire deadline in days before the event."
          >
            <input
              className="admin-input"
              type="number"
              min="0"
              value={
                payload.settings.questionnaireDueDaysBeforeEvent
              }
              disabled={!canManage || saving}
              onChange={(event) =>
                patchSettings({
                  questionnaireDueDaysBeforeEvent:
                    Math.max(
                      0,
                      Number(event.target.value || 0),
                    ),
                })
              }
            />
          </AdminField>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Invoice numbering"
        description="Control the workspace invoice prefix and display width without resetting the live sequence."
        icon={Settings2}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <AdminField
            label="Invoice prefix"
            help="For example INV."
          >
            <input
              className="admin-input"
              value={payload.invoiceSequence.prefix}
              maxLength={20}
              disabled={!canManage || saving}
              onChange={(event) =>
                patchInvoiceSequence({
                  prefix:
                    event.target.value
                      .toUpperCase()
                      .slice(0, 20),
                })
              }
            />
          </AdminField>

          <AdminField
            label="Number padding"
            help="4 displays invoice 27 as 0027."
          >
            <input
              className="admin-input"
              type="number"
              min="1"
              max="12"
              value={payload.invoiceSequence.padding}
              disabled={!canManage || saving}
              onChange={(event) =>
                patchInvoiceSequence({
                  padding:
                    Math.max(
                      1,
                      Math.min(
                        12,
                        Number(event.target.value || 1),
                      ),
                    ),
                })
              }
            />
          </AdminField>

          <AdminField
            label="Next invoice number"
            help="Operational sequence state. Saving settings never resets this number."
          >
            <input
              className="admin-input"
              type="number"
              value={payload.invoiceSequence.nextNumber}
              disabled
              readOnly
            />
          </AdminField>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Invoice wording"
        description="Default client-facing notes and payment terms copied into newly generated invoices."
        icon={Settings2}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <AdminField label="Invoice notes">
            <textarea
              className="admin-textarea min-h-28"
              value={payload.settings.invoiceNotes}
              disabled={!canManage || saving}
              onChange={(event) =>
                patchSettings({
                  invoiceNotes: event.target.value,
                })
              }
            />
          </AdminField>

          <AdminField label="Invoice terms">
            <textarea
              className="admin-textarea min-h-28"
              value={payload.settings.invoiceTerms}
              disabled={!canManage || saving}
              onChange={(event) =>
                patchSettings({
                  invoiceTerms: event.target.value,
                })
              }
            />
          </AdminField>
        </div>
      </AdminPanel>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <AdminButton
          variant="primary"
          icon={Save}
          disabled={!canManage || saving}
          onClick={() => void save()}
        >
          {saving
            ? "Saving…"
            : "Save commercial settings"}
        </AdminButton>
      </div>
    </div>
  );
}

const LEAD_FORM_FIELD_TYPE_OPTIONS: Array<{
  value: CrmLeadFormFieldType;
  label: string;
}> = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Multiple choice" },
  { value: "checkbox", label: "Checkbox" },
  { value: "address", label: "Address" },
  { value: "venue", label: "Venue" },
];

function cloneLeadFormSettings(
  settings: CrmLeadFormSettings,
): CrmLeadFormSettings {
  return {
    ...settings,
    fields: (settings.fields || []).map((field) => ({
      ...field,
      options: [...(field.options || [])],
    })),
  };
}

function LeadFormSettings({ settings, saving, canManage, onSave }: { settings: CrmLeadFormSettings; saving: boolean; canManage: boolean; onSave: (settings: CrmLeadFormSettings) => Promise<void> }) {

  const [
    expandedLeadFieldId,
    setExpandedLeadFieldId,
  ] = useState("");

  const [
    leadFieldDragIndex,
    setLeadFieldDragIndex,
  ] = useState<number | null>(
    null,
  );


  const [draft, setDraft] = useState<CrmLeadFormSettings>(
    () => cloneLeadFormSettings(settings),
  );

  useEffect(
    () => setDraft(cloneLeadFormSettings(settings)),
    [settings],
  );

  function patchField(
    index: number,
    patch: Partial<CrmLeadFormField>,
  ) {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map(
        (field, fieldIndex) =>
          fieldIndex === index
            ? {
                ...field,
                ...patch,
              }
            : field,
      ),
    }));
  }

  function moveField(
    index: number,
    direction: -1 | 1,
  ) {
    const target = index + direction;

    if (
      target < 0
      || target >= draft.fields.length
    ) {
      return;
    }

    setDraft((current) => {
      const fields = [...current.fields];

      [
        fields[index],
        fields[target],
      ] = [
        fields[target],
        fields[index],
      ];

      return {
        ...current,
        fields,
      };
    });
  }

  function removeField(
    index: number,
  ) {
    const field =
      draft.fields[index];

    if (
      !field
      || field.locked
    ) {
      return;
    }

    setDraft(
      (current) => {
        const removed =
          current.fields[
            index
          ];

        if (
          !removed
          || removed.locked
        ) {
          return current;
        }

        const fields =
          current.fields.filter(
            (_, fieldIndex) =>
              fieldIndex
              !== index,
          );

        if (
          !removed.systemKey
        ) {
          return {
            ...current,
            fields,
          };
        }

        const availableFields = [
          ...(
            current.availableFields
            || []
          ).filter(
            (candidate) =>
              candidate.systemKey
              !== removed.systemKey,
          ),
          {
            ...removed,
            options: [
              ...removed.options,
            ],
          },
        ];

        return {
          ...current,
          fields,
          availableFields,
        };
      },
    );
  }


  function restoreCrmField(
    systemKey: string,
  ) {
    if (!systemKey) {
      return;
    }

    const template =
      (
        draft.availableFields
        || []
      ).find(
        (field) =>
          field.systemKey
          === systemKey,
      );

    if (!template) {
      return;
    }

    setDraft(
      (current) => ({
        ...current,
        fields: [
          ...current.fields,
          {
            ...template,
            enabled: true,
            options: [
              ...template.options,
            ],
          },
        ],
        availableFields:
          (
            current.availableFields
            || []
          ).filter(
            (field) =>
              field.systemKey
              !== systemKey,
          ),
      }),
    );

    setExpandedLeadFieldId(
      template.id,
    );
  }


  function addQuestion() {
    const id = [
      "custom",
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 8),
    ].join("_");

    const field: CrmLeadFormField = {
      id,
      type: "short_text",
      label: "New question",
      help: "",
      placeholder: "",
      required: false,
      enabled: true,
      options: [],
      systemKey: "",
      locked: false,
    };

    setDraft((current) => ({
      ...current,
      fields: [
        ...current.fields,
        field,
      ],
    }));
  }

  return (
    <div className="space-y-4">
      <AdminPanel
        title="Public lead form"
        description="Control the enquiry page, confirmation email and the exact questions prospective clients complete."
        icon={Settings2}
        actions={
          <a
            href="/enquire"
            target="_blank"
            rel="noreferrer"
            className="admin-button admin-button--secondary admin-button--sm"
          >
            <ExternalLink className="admin-button__icon" />
            Preview form
          </a>
        }
      >
          <div className="crm-lead-form-settings">
            <div className="crm-lead-form-settings__switches">
              <label className="crm-lead-form-settings__switch">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  disabled={!canManage || saving}
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        enabled:
                          event.target.checked,
                      }),
                    )
                  }
                />

                <span>
                  <strong>
                    Accept public enquiries
                  </strong>

                  <small>
                    {draft.enabled
                      ? "Public form active"
                      : "Public form unavailable"}
                  </small>
                </span>
              </label>

              <label className="crm-lead-form-settings__switch">
                <input
                  type="checkbox"
                  checked={
                    draft.autoresponderEnabled
                  }
                  disabled={!canManage || saving}
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        autoresponderEnabled:
                          event.target.checked,
                      }),
                    )
                  }
                />

                <span>
                  <strong>
                    Acknowledgement email
                  </strong>

                  <small>
                    {draft.autoresponderEnabled
                      ? "Automatic reply enabled"
                      : "Automatic reply disabled"}
                  </small>
                </span>
              </label>
            </div>

            <div className="crm-lead-form-settings__core">
              <AdminField label="Form title">
                <input
                  className="admin-input"
                  value={draft.title}
                  disabled={!canManage || saving}
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        title:
                          event.target.value,
                      }),
                    )
                  }
                />
              </AdminField>

              <AdminField label="Default service">
                <input
                  className="admin-input"
                  value={draft.defaultService}
                  disabled={!canManage || saving}
                  placeholder="Wedding photography"
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        defaultService:
                          event.target.value,
                      }),
                    )
                  }
                />
              </AdminField>

              <AdminField label="Notification email">
                <input
                  className="admin-input"
                  type="email"
                  value={draft.notificationEmail}
                  disabled={!canManage || saving}
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        notificationEmail:
                          event.target.value,
                      }),
                    )
                  }
                />
              </AdminField>

              <AdminField label="Public URL">
                <input
                  className="admin-input"
                  value={
                    draft.publicPath
                    || "/enquire"
                  }
                  disabled
                />
              </AdminField>

              <AdminField
                label="Introduction"
                className="crm-lead-form-settings__wide"
              >
                <textarea
                  className="admin-textarea crm-lead-form-settings__textarea"
                  rows={2}
                  value={draft.intro}
                  disabled={!canManage || saving}
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        intro:
                          event.target.value,
                      }),
                    )
                  }
                />
              </AdminField>
            </div>

            <details className="crm-lead-form-settings__section">
              <summary>
                <span>
                  <strong>
                    Acknowledgement email
                  </strong>

                  <small>
                    Subject and confirmation message
                  </small>
                </span>

                <span
                  className={
                    draft.autoresponderEnabled
                      ? "is-active"
                      : ""
                  }
                >
                  {draft.autoresponderEnabled
                    ? "Enabled"
                    : "Disabled"}
                </span>
              </summary>

              <div className="crm-lead-form-settings__section-body">
                <AdminField label="Subject">
                  <input
                    className="admin-input"
                    value={
                      draft.autoresponderSubject
                    }
                    disabled={!canManage || saving}
                    onChange={(event) =>
                      setDraft(
                        (current) => ({
                          ...current,
                          autoresponderSubject:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </AdminField>

                <AdminField
                  label="Message"
                  className="crm-lead-form-settings__wide"
                >
                  <textarea
                    className="admin-textarea"
                    rows={3}
                    value={
                      draft.autoresponderMessage
                    }
                    disabled={!canManage || saving}
                    onChange={(event) =>
                      setDraft(
                        (current) => ({
                          ...current,
                          autoresponderMessage:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </AdminField>
              </div>
            </details>

            <details className="crm-lead-form-settings__section">
              <summary>
                <span>
                  <strong>
                    Confirmation & privacy
                  </strong>

                  <small>
                    Thank-you message and consent text
                  </small>
                </span>

                <span>
                  Review
                </span>
              </summary>

              <div className="crm-lead-form-settings__section-body">
                <AdminField label="Thank-you heading">
                  <input
                    className="admin-input"
                    value={draft.thankYouTitle}
                    disabled={!canManage || saving}
                    onChange={(event) =>
                      setDraft(
                        (current) => ({
                          ...current,
                          thankYouTitle:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </AdminField>

                <label className="crm-lead-form-settings__inline-flag">
                  <input
                    type="checkbox"
                    checked={
                      draft.consentRequired
                    }
                    disabled={!canManage || saving}
                    onChange={(event) =>
                      setDraft(
                        (current) => ({
                          ...current,
                          consentRequired:
                            event.target.checked,
                        }),
                      )
                    }
                  />

                  <span>
                    <strong>
                      Require privacy consent
                    </strong>

                    <small>
                      Client must confirm before submission
                    </small>
                  </span>
                </label>

                <AdminField
                  label="Thank-you message"
                  className="crm-lead-form-settings__wide"
                >
                  <textarea
                    className="admin-textarea"
                    rows={2}
                    value={draft.thankYouMessage}
                    disabled={!canManage || saving}
                    onChange={(event) =>
                      setDraft(
                        (current) => ({
                          ...current,
                          thankYouMessage:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </AdminField>

                <AdminField
                  label="Privacy consent text"
                  className="crm-lead-form-settings__wide"
                >
                  <textarea
                    className="admin-textarea"
                    rows={2}
                    value={draft.privacyText}
                    disabled={!canManage || saving}
                    onChange={(event) =>
                      setDraft(
                        (current) => ({
                          ...current,
                          privacyText:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </AdminField>
              </div>
            </details>
          </div>
</AdminPanel>

      <AdminPanel
          title="Form fields"
          description="Build the public enquiry form from compact CRM fields. First name, email and wedding date are protected required fields."
          icon={FileQuestion}
          actions={
            canManage
              ? (
                  <div className="crm-lead-form-builder-panel__actions">
                    <select
                      className="admin-select crm-lead-form-builder-add-field"
                      aria-label="Add CRM field"
                      value=""
                      disabled={
                        saving
                        || !(
                          draft.availableFields
                          || []
                        ).length
                      }
                      onChange={(event) => {
                        const systemKey =
                          event.target.value;

                        if (systemKey) {
                          restoreCrmField(
                            systemKey,
                          );
                        }
                      }}
                    >
                      <option value="">
                        Add CRM field…
                      </option>

                      {(
                        draft.availableFields
                        || []
                      ).map(
                        (field) => (
                          <option
                            key={
                              field.systemKey
                            }
                            value={
                              field.systemKey
                            }
                          >
                            {field.label}
                          </option>
                        ),
                      )}
                    </select>

                    <AdminButton
                      size="sm"
                      variant="secondary"
                      icon={Plus}
                      disabled={saving}
                      onClick={addQuestion}
                    >
                      Add custom question
                    </AdminButton>
                  </div>
                )
              : undefined
          }
          className="crm-lead-form-builder-panel"
        >
          <div className="crm-lead-form-builder">
            {draft.fields.map(
              (field, index) => {
                const custom =
                  !field.systemKey;

                const choices =
                  field.type === "select"
                  || field.type === "radio";

                const expanded =
                  expandedLeadFieldId
                  === field.id;

                const fieldTypeLabel =
                  LEAD_FORM_FIELD_TYPE_OPTIONS
                    .find(
                      (option) =>
                        option.value
                        === field.type,
                    )
                    ?.label
                  || field.type;

                return (
                  <article
                    key={field.id}
                    className={
                      `crm-lead-form-builder-field${
                        expanded
                          ? " is-expanded"
                          : ""
                      }`
                    }
                    draggable={
                      canManage
                      && !saving
                    }
                    onDragStart={() =>
                      setLeadFieldDragIndex(
                        index,
                      )
                    }
                    onDragOver={(event) =>
                      event.preventDefault()
                    }
                    onDrop={() => {
                      if (
                        leadFieldDragIndex
                        !== null
                        && leadFieldDragIndex
                          !== index
                      ) {
                        moveField(
                          leadFieldDragIndex,
                          index
                          - leadFieldDragIndex,
                        );
                      }

                      setLeadFieldDragIndex(
                        null,
                      );
                    }}
                    onDragEnd={() =>
                      setLeadFieldDragIndex(
                        null,
                      )
                    }
                  >
                    <div
                      className="crm-lead-form-builder-field__handle"
                      title="Drag to reorder"
                      aria-hidden="true"
                    >
                      <span>⋮⋮</span>
                    </div>

                    <div className="crm-lead-form-builder-field__content">
                      <div className="crm-lead-form-builder-field__summary">
                        <button
                          type="button"
                          className="crm-lead-form-builder-field__toggle"
                          aria-expanded={expanded}
                          onClick={() =>
                            setExpandedLeadFieldId(
                              expanded
                                ? ""
                                : field.id,
                            )
                          }
                        >
                          <span className="crm-lead-form-builder-field__identity">
                            <strong>
                              {field.label
                                || "Untitled field"}
                            </strong>

                            <span className="crm-lead-form-builder-field__meta">
                              <span>
                                {custom
                                  ? "Custom question"
                                  : `CRM · ${field.systemKey}`}
                              </span>

                              <span>
                                {fieldTypeLabel}
                              </span>

                              <span
                                className={
                                  field.enabled
                                    ? "is-on"
                                    : "is-off"
                                }
                              >
                                {field.enabled
                                  ? "Visible"
                                  : "Hidden"}
                              </span>

                              <span
                                className={
                                  field.required
                                    ? "is-required"
                                    : ""
                                }
                              >
                                {field.required
                                  ? "Required"
                                  : "Optional"}
                              </span>

                              {field.locked ? (
                                <span className="is-locked">
                                  Protected
                                </span>
                              ) : null}
                            </span>
                          </span>

                          <span
                            className="crm-lead-form-builder-field__chevron"
                            aria-hidden="true"
                          >
                            ⌄
                          </span>
                        </button>

                        <div className="crm-lead-form-builder-field__actions">
                          <button
                            type="button"
                            className="admin-icon-control"
                            disabled={
                              !canManage
                              || saving
                              || index === 0
                            }
                            onClick={() =>
                              moveField(
                                index,
                                -1,
                              )
                            }
                            aria-label={`Move ${field.label} up`}
                            title="Move up"
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            className="admin-icon-control"
                            disabled={
                              !canManage
                              || saving
                              || index
                                === draft.fields.length - 1
                            }
                            onClick={() =>
                              moveField(
                                index,
                                1,
                              )
                            }
                            aria-label={`Move ${field.label} down`}
                            title="Move down"
                          >
                            ↓
                          </button>

                          {!field.locked ? (
                            <button
                              type="button"
                              className="admin-icon-control admin-icon-control--danger"
                              disabled={
                                !canManage
                                || saving
                              }
                              onClick={() => {
                                removeField(
                                  index,
                                );

                                if (
                                  expanded
                                ) {
                                  setExpandedLeadFieldId(
                                    "",
                                  );
                                }
                              }}
                              aria-label={`Remove ${field.label}`}
                              title="Remove field"
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {expanded ? (
                        <div className="crm-lead-form-builder-field__editor">
                          <div className="crm-lead-form-builder-field__grid">
                            <AdminField label="Field label">
                              <input
                                className="admin-input"
                                value={field.label}
                                disabled={
                                  !canManage
                                  || saving
                                }
                                onChange={(event) =>
                                  patchField(
                                    index,
                                    {
                                      label:
                                        event.target.value,
                                    },
                                  )
                                }
                              />
                            </AdminField>

                            <AdminField
                              label="Field type"
                              help={
                                field.systemKey
                                  ? "CRM mapped fields keep their fixed data type."
                                  : "Choose how this custom question is answered."
                              }
                            >
                              <select
                                className="admin-select"
                                value={field.type}
                                disabled={
                                  !canManage
                                  || saving
                                  || Boolean(
                                    field.systemKey,
                                  )
                                }
                                onChange={(event) =>
                                  patchField(
                                    index,
                                    {
                                      type:
                                        event.target.value as CrmLeadFormFieldType,
                                    },
                                  )
                                }
                              >
                                {LEAD_FORM_FIELD_TYPE_OPTIONS.map(
                                  (option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </AdminField>

                            <AdminField label="Help text">
                              <input
                                className="admin-input"
                                value={field.help}
                                disabled={
                                  !canManage
                                  || saving
                                }
                                placeholder="Optional guidance below the field"
                                onChange={(event) =>
                                  patchField(
                                    index,
                                    {
                                      help:
                                        event.target.value,
                                    },
                                  )
                                }
                              />
                            </AdminField>

                            <AdminField label="Placeholder">
                              <input
                                className="admin-input"
                                value={
                                  field.placeholder
                                }
                                disabled={
                                  !canManage
                                  || saving
                                  || field.type
                                    === "checkbox"
                                  || field.type
                                    === "radio"
                                }
                                placeholder="Optional example or prompt"
                                onChange={(event) =>
                                  patchField(
                                    index,
                                    {
                                      placeholder:
                                        event.target.value,
                                    },
                                  )
                                }
                              />
                            </AdminField>
                          </div>

                            {choices ? (
                              <AdminField
                                label="Choices"
                                help="Add each option separately. Press Enter to add the next option."
                              >
                                <div className="crm-lead-form-choice-editor">
                                  <div className="crm-lead-form-choice-list">
                                    {field.options.map(
                                      (
                                        option,
                                        optionIndex,
                                      ) => (
                                        <div
                                          key={
                                            `${field.id}_${optionIndex}`
                                          }
                                          className="crm-lead-form-choice-row"
                                        >
                                          <span
                                            className="crm-lead-form-choice-row__number"
                                            aria-hidden="true"
                                          >
                                            {optionIndex + 1}
                                          </span>

                                          <input
                                            id={
                                              `crm-lead-form-choice-${field.id}-${optionIndex}`
                                            }
                                            className="admin-input"
                                            value={option}
                                            disabled={
                                              !canManage
                                              || saving
                                            }
                                            placeholder={
                                              `Option ${optionIndex + 1}`
                                            }
                                            onChange={(event) => {
                                              const next = [
                                                ...field.options,
                                              ];

                                              next[
                                                optionIndex
                                              ] =
                                                event.target
                                                  .value;

                                              patchField(
                                                index,
                                                {
                                                  options:
                                                    next,
                                                },
                                              );
                                            }}
                                            onKeyDown={(event) => {
                                              if (
                                                event.key
                                                !== "Enter"
                                              ) {
                                                return;
                                              }

                                              event.preventDefault();

                                              const next = [
                                                ...field.options,
                                              ];

                                              next.splice(
                                                optionIndex
                                                  + 1,
                                                0,
                                                "",
                                              );

                                              patchField(
                                                index,
                                                {
                                                  options:
                                                    next,
                                                },
                                              );

                                              window.setTimeout(
                                                () =>
                                                  document
                                                    .getElementById(
                                                      `crm-lead-form-choice-${field.id}-${optionIndex + 1}`,
                                                    )
                                                    ?.focus(),
                                                0,
                                              );
                                            }}
                                          />

                                          <button
                                            type="button"
                                            className="admin-icon-control admin-icon-control--danger"
                                            disabled={
                                              !canManage
                                              || saving
                                            }
                                            aria-label={
                                              `Remove option ${optionIndex + 1}`
                                            }
                                            title="Remove option"
                                            onClick={() =>
                                              patchField(
                                                index,
                                                {
                                                  options:
                                                    field.options
                                                      .filter(
                                                        (
                                                          _,
                                                          itemIndex,
                                                        ) =>
                                                          itemIndex
                                                          !== optionIndex,
                                                      ),
                                                },
                                              )
                                            }
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ),
                                    )}
                                  </div>

                                  <AdminButton
                                    size="sm"
                                    variant="secondary"
                                    icon={Plus}
                                    disabled={
                                      !canManage
                                      || saving
                                      || field.options
                                        .length
                                        >= 50
                                    }
                                    onClick={() => {
                                      const next = [
                                        ...field.options,
                                        "",
                                      ];

                                      patchField(
                                        index,
                                        {
                                          options:
                                            next,
                                        },
                                      );

                                      window.setTimeout(
                                        () =>
                                          document
                                            .getElementById(
                                              `crm-lead-form-choice-${field.id}-${next.length - 1}`,
                                            )
                                            ?.focus(),
                                        0,
                                      );
                                    }}
                                  >
                                    Add option
                                  </AdminButton>
                                </div>
                              </AdminField>
                            ) : null}

                          {field.systemKey ? (
                            <div className="crm-lead-form-builder-field__mapping">
                              <strong>
                                CRM mapping
                              </strong>

                              <span>
                                {field.systemKey}
                              </span>

                              {field.locked ? (
                                <small>
                                  This field is required by the booking workflow and cannot be hidden or made optional.
                                </small>
                              ) : (
                                <small>
                                  This mapping is fixed so submitted enquiries continue populating the correct CRM field.
                                </small>
                              )}
                            </div>
                          ) : null}

                          <div className="crm-lead-form-builder-field__flags">
                            <label>
                              <input
                                type="checkbox"
                                checked={
                                  field.enabled
                                }
                                disabled={
                                  !canManage
                                  || saving
                                  || field.locked
                                }
                                onChange={(event) =>
                                  patchField(
                                    index,
                                    {
                                      enabled:
                                        event.target
                                          .checked,
                                    },
                                  )
                                }
                              />

                              <span>
                                <strong>
                                  Visible
                                </strong>

                                <small>
                                  Show on public form
                                </small>
                              </span>
                            </label>

                            <label>
                              <input
                                type="checkbox"
                                checked={
                                  field.required
                                }
                                disabled={
                                  !canManage
                                  || saving
                                  || field.locked
                                  || !field.enabled
                                }
                                onChange={(event) =>
                                  patchField(
                                    index,
                                    {
                                      required:
                                        event.target
                                          .checked,
                                    },
                                  )
                                }
                              />

                              <span>
                                <strong>
                                  Required
                                </strong>

                                <small>
                                  Must be completed before submission
                                </small>
                              </span>
                            </label>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              },
            )}
          </div>

          {!draft.fields.length ? (
            <div className="admin-empty-state">
              <h3>
                No form fields configured
              </h3>

              <p>
                Add a CRM field or custom question to start building the form.
              </p>
            </div>
          ) : null}
        </AdminPanel>

      {canManage ? (
        <div className="flex justify-end">
          <AdminButton
            variant="primary"
            icon={Save}
            disabled={saving}
            onClick={() => void onSave(draft)}
          >
            {saving
              ? "Saving…"
              : "Save lead form"}
          </AdminButton>
        </div>
      ) : null}
    </div>
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
