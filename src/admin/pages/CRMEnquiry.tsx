import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  PackageCheck,
  Plus,
  Clock3,
  FileText,
  Mail,
  MapPin,
  Save,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  AdminButton,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
} from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { CrmEnquiryDetail, CrmEnquiryInput, CrmOverview, CrmQuote } from "../types/crm";

function dateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function splitName(value = "") {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts.shift() || "", lastName: parts.join(" ") };
}

export function CRMEnquiry() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { auth } = useProfessionalAuth();
  const [detail, setDetail] = useState<CrmEnquiryDetail | null>(null);
  const [overview, setOverview] = useState<CrmOverview | null>(null);
  const [form, setForm] = useState<CrmEnquiryInput>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [quotes, setQuotes] = useState<CrmQuote[]>([]);
  const canManage = auth.permissions.includes("crm:manage");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [nextDetail, nextOverview, quoteOverview] = await Promise.all([
        AdminApiService.getCrmEnquiry(id),
        AdminApiService.getCrmOverview(),
        AdminApiService.getCrmQuoteOverview(),
      ]);
      setDetail(nextDetail);
      setOverview(nextOverview);
      setQuotes(quoteOverview.quotes.filter((quote) => quote.enquiryId === id));
      const primary = nextDetail.contacts.find((contact) => contact.role === "primary");
      const partner = nextDetail.contacts.find((contact) => contact.role === "partner");
      const primaryName = splitName(primary?.displayName || nextDetail.enquiry.primaryContact?.displayName || "");
      const partnerName = splitName(partner?.displayName || nextDetail.enquiry.partnerContact?.displayName || "");
      setForm({
        stageId: nextDetail.enquiry.stageId,
        source: nextDetail.enquiry.source,
        campaign: nextDetail.enquiry.campaign,
        eventType: nextDetail.enquiry.eventType,
        eventDate: nextDetail.enquiry.eventDate,
        dateFlexibility: nextDetail.enquiry.dateFlexibility,
        venueText: nextDetail.enquiry.venueText,
        venueId: nextDetail.enquiry.venueId,
        venueSlug: nextDetail.enquiry.venueSlug,
        serviceInterest: nextDetail.enquiry.serviceInterest,
        packageInterest: nextDetail.enquiry.packageInterest,
        budgetMin: nextDetail.enquiry.budgetMin,
        budgetMax: nextDetail.enquiry.budgetMax,
        currency: nextDetail.enquiry.currency,
        notes: nextDetail.enquiry.notes,
        primaryContact: {
          id: primary?.id || nextDetail.enquiry.primaryContact?.id || "",
          ...primaryName,
          email: primary?.email || nextDetail.enquiry.primaryContact?.email || "",
          phone: primary?.phone || nextDetail.enquiry.primaryContact?.phone || "",
        },
        partnerContact: {
          id: partner?.id || nextDetail.enquiry.partnerContact?.id || "",
          ...partnerName,
          email: partner?.email || nextDetail.enquiry.partnerContact?.email || "",
          phone: partner?.phone || nextDetail.enquiry.partnerContact?.phone || "",
        },
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load enquiry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id, auth.workspaceId]);

  const stage = useMemo(() => overview?.stages.find((item) => item.id === form.stageId), [form.stageId, overview?.stages]);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      setDetail(await AdminApiService.updateCrmEnquiry(id, form));
      setMessage("Enquiry saved.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save enquiry.");
    } finally {
      setSaving(false);
    }
  }

  async function markLost() {
    if (!window.confirm("Mark this enquiry as lost or unavailable?")) return;
    setSaving(true);
    setError("");
    try {
      setDetail(await AdminApiService.markCrmEnquiryLost(id, lostReason));
      setMessage("Enquiry marked as lost.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to mark enquiry as lost.");
    } finally {
      setSaving(false);
    }
  }

  async function createQuote() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const quote = await AdminApiService.createCrmQuote(id);
      navigate(`/admin/crm/quotes/${quote.id}`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to create the quote.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !detail) return <AdminPage><p className="text-sm text-neutral-500">Loading enquiry…</p></AdminPage>;
  if (!detail) return <AdminPage><div className="admin-alert admin-alert--error">{error || "Enquiry not found."}</div></AdminPage>;
  const enquiry = detail.enquiry;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow={<Link to="/admin/crm" className="admin-inline-link inline-flex items-center gap-1"><ArrowLeft size={13} />CRM pipeline</Link>}
        title={enquiry.primaryContact?.displayName || enquiry.reference}
        description={`${enquiry.reference} · ${enquiry.source} enquiry`}
        actions={<div className="flex flex-wrap gap-2">{quotes[0] ? <Link to={`/admin/crm/quotes/${quotes[0].id}`} className="admin-button admin-button--secondary"><PackageCheck className="admin-button__icon" />Open quote</Link> : null}{detail.job ? <Link to={`/admin/crm/jobs/${detail.job.id}`} className="admin-button admin-button--primary"><FileText className="admin-button__icon" />Open Job</Link> : null}{canManage && !detail.job && !quotes.length ? <AdminButton variant="primary" icon={Plus} disabled={saving} onClick={() => void createQuote()}>Create quote</AdminButton> : null}</div>}
        meta={<div className="flex flex-wrap gap-2"><AdminStatus tone={enquiry.status === "won" ? "success" : enquiry.status === "lost" ? "danger" : "info"}>{enquiry.stageName}</AdminStatus>{detail.job ? <AdminStatus tone="success">Job {detail.job.reference}</AdminStatus> : null}</div>}
      />

      {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
      {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <AdminPanel title="Enquiry details" description="These values flow into the quote and are copied into the Job and Wedding when a quote is accepted." icon={BriefcaseBusiness} actions={canManage ? <AdminButton size="sm" variant="primary" icon={Save} disabled={saving} onClick={() => void save()}>Save</AdminButton> : undefined}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AdminField label="Pipeline stage"><select className="admin-select" value={form.stageId || ""} disabled={!canManage || enquiry.status === "won"} onChange={(event) => setForm((current) => ({ ...current, stageId: event.target.value }))}>{(overview?.stages || []).filter((item) => item.type === "open" || item.id === form.stageId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></AdminField>
              <AdminField label="Wedding date"><input className="admin-input" type="date" disabled={!canManage || enquiry.status === "won"} value={form.eventDate || ""} onChange={(event) => setForm((current) => ({ ...current, eventDate: event.target.value }))} /></AdminField>
              <AdminField label="Date flexibility"><input className="admin-input" disabled={!canManage} value={form.dateFlexibility || ""} onChange={(event) => setForm((current) => ({ ...current, dateFlexibility: event.target.value }))} placeholder="Fixed / flexible / month" /></AdminField>
              <AdminField label="Venue"><input className="admin-input" disabled={!canManage} value={form.venueText || ""} onChange={(event) => setForm((current) => ({ ...current, venueText: event.target.value }))} placeholder="Venue or TBC" /></AdminField>
              <AdminField label="Service"><input className="admin-input" disabled={!canManage} value={form.serviceInterest || ""} onChange={(event) => setForm((current) => ({ ...current, serviceInterest: event.target.value }))} /></AdminField>
              <AdminField label="Package interest"><input className="admin-input" disabled={!canManage} value={form.packageInterest || ""} onChange={(event) => setForm((current) => ({ ...current, packageInterest: event.target.value }))} /></AdminField>
              <AdminField label="Budget minimum (£)"><input className="admin-input" type="number" disabled={!canManage} value={form.budgetMin == null ? "" : form.budgetMin / 100} onChange={(event) => setForm((current) => ({ ...current, budgetMin: event.target.value ? Math.round(Number(event.target.value) * 100) : null }))} /></AdminField>
              <AdminField label="Budget maximum (£)"><input className="admin-input" type="number" disabled={!canManage} value={form.budgetMax == null ? "" : form.budgetMax / 100} onChange={(event) => setForm((current) => ({ ...current, budgetMax: event.target.value ? Math.round(Number(event.target.value) * 100) : null }))} /></AdminField>
            </div>
            <div className="mt-4"><AdminField label="Notes"><textarea className="admin-textarea min-h-32" disabled={!canManage} value={form.notes || ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></AdminField></div>
          </AdminPanel>

          <AdminPanel title="Clients" description="Contacts remain reusable if the same person later makes another enquiry." icon={UserRound}>
            <div className="grid gap-5 md:grid-cols-2">
              <ContactEditor title="Primary client" value={form.primaryContact || {}} disabled={!canManage} onChange={(value) => setForm((current) => ({ ...current, primaryContact: value }))} />
              <ContactEditor title="Partner / second client" value={form.partnerContact || {}} disabled={!canManage} onChange={(value) => setForm((current) => ({ ...current, partnerContact: value }))} />
            </div>
          </AdminPanel>

          {detail.job ? (
            <AdminPanel title="Accepted Job" icon={BriefcaseBusiness}>
              <div className="admin-record-grid"><div><span>Reference</span><strong>{detail.job.reference}</strong></div><div><span>Status</span><strong>{detail.job.status}</strong></div><div><span>Event date</span><strong>{detail.job.eventDate}</strong></div><div><span>Wedding</span><strong>{detail.job.weddingSlug || "Not linked"}</strong></div></div>
            </AdminPanel>
          ) : null}
        </div>

        <aside className="space-y-5">
          <AdminPanel title="Summary" icon={FileText} compact>
            <dl className="admin-compact-details"><div><dt>Stage</dt><dd>{stage?.name || enquiry.stageName}</dd></div><div><dt>Date</dt><dd>{form.eventDate || "TBC"}</dd></div><div><dt>Venue</dt><dd>{form.venueText || "TBC"}</dd></div><div><dt>Created</dt><dd>{dateTime(enquiry.createdAt)}</dd></div><div><dt>Updated</dt><dd>{dateTime(enquiry.updatedAt)}</dd></div></dl>
          </AdminPanel>

          {canManage && enquiry.status !== "won" ? (
            <AdminPanel title="Close enquiry" description="Lost enquiries remain in CRM history." icon={XCircle} compact>
              <AdminField label="Reason"><textarea className="admin-textarea" value={lostReason} onChange={(event) => setLostReason(event.target.value)} placeholder="Unavailable date, no response, chose another supplier…" /></AdminField>
              <div className="mt-3"><AdminButton variant="danger" size="sm" disabled={saving} onClick={() => void markLost()}>Mark lost</AdminButton></div>
            </AdminPanel>
          ) : null}

          <AdminPanel title="Quotes" description="Package choices and quote revisions linked to this enquiry." icon={PackageCheck}>
            {!quotes.length ? <div className="admin-empty-state"><PackageCheck /><div><strong>No quote created</strong><p>Create a quote to present package choices and optional extras to the client.</p></div>{canManage && !detail.job ? <AdminButton variant="primary" size="sm" icon={Plus} disabled={saving} onClick={() => void createQuote()}>Create quote</AdminButton> : null}</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Reference</th><th>Version</th><th>Status</th><th>Total</th></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id}><td><Link className="admin-inline-link" to={`/admin/crm/quotes/${quote.id}`}>{quote.reference}</Link></td><td>v{quote.currentVersion?.versionNumber || 1}</td><td><AdminStatus tone={quote.status === "accepted" ? "success" : quote.status === "declined" || quote.status === "expired" ? "danger" : quote.status === "sent" || quote.status === "viewed" ? "info" : "warning"}>{quote.status}</AdminStatus></td><td>{new Intl.NumberFormat("en-GB", { style: "currency", currency: quote.currency || "GBP" }).format((quote.currentVersion?.totalAmount || 0) / 100)}</td></tr>)}</tbody></table></div>}
          </AdminPanel>

          <AdminPanel title="Activity" description="CRM actions are recorded against this enquiry." icon={Clock3} compact>
            <div className="crm-activity-list">{detail.activities.map((item) => <div key={item.id}><span></span><section><strong>{item.summary}</strong><p>{dateTime(item.createdAt)}{item.actorEmail ? ` · ${item.actorEmail}` : ""}</p></section></div>)}</div>
          </AdminPanel>
        </aside>
      </div>
    </AdminPage>
  );
}

function ContactEditor({ title, value, disabled, onChange }: { title: string; value: NonNullable<CrmEnquiryInput["primaryContact"]>; disabled: boolean; onChange: (value: NonNullable<CrmEnquiryInput["primaryContact"]>) => void }) {
  return <div className="rounded-xl bg-neutral-50 p-4"><h3 className="mb-3 text-sm font-semibold">{title}</h3><div className="grid gap-3 sm:grid-cols-2"><AdminField label="First name"><input className="admin-input" disabled={disabled} value={value.firstName || ""} onChange={(event) => onChange({ ...value, firstName: event.target.value })} /></AdminField><AdminField label="Last name"><input className="admin-input" disabled={disabled} value={value.lastName || ""} onChange={(event) => onChange({ ...value, lastName: event.target.value })} /></AdminField><AdminField label="Email"><input className="admin-input" type="email" disabled={disabled} value={value.email || ""} onChange={(event) => onChange({ ...value, email: event.target.value })} /></AdminField><AdminField label="Phone"><input className="admin-input" disabled={disabled} value={value.phone || ""} onChange={(event) => onChange({ ...value, phone: event.target.value })} /></AdminField></div></div>;
}
