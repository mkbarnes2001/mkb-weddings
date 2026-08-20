import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, CalendarDays, Clock3, Mail, Save, UserRound } from "lucide-react";
import { AdminButton, AdminField, AdminPage, AdminPageHeader, AdminPanel, AdminStatus } from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { CrmContactDetail } from "../types/crm";

function dateLabel(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-GB", value.length <= 10 ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" });
}

export function CRMContact() {
  const { id = "" } = useParams();
  const { auth } = useProfessionalAuth();
  const [detail, setDetail] = useState<CrmContactDetail | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", notes: "", status: "active", marketingConsent: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canManage = auth.permissions.includes("crm:manage");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await AdminApiService.getCrmContact(id);
      setDetail(result);
      setForm({
        firstName: result.contact.firstName,
        lastName: result.contact.lastName,
        email: result.contact.email,
        phone: result.contact.phone,
        notes: result.contact.notes,
        status: result.contact.status || "active",
        marketingConsent: result.contact.marketingConsent,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load contact.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id, auth.workspaceId]);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await AdminApiService.updateCrmContact(id, form);
      setDetail(result);
      setMessage("Contact saved. Linked enquiries, Jobs and portal access now use these details.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save contact.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !detail) return <AdminPage><p className="text-sm text-neutral-500">Loading contact…</p></AdminPage>;
  if (!detail) return <AdminPage><div className="admin-alert admin-alert--error">{error || "Contact not found."}</div></AdminPage>;

  return (
    <AdminPage>
      <AdminPageHeader
        title={detail.contact.displayName || "Contact"}
        description="One reusable client record shared by enquiries, Jobs and client portal access."
        meta={<div className="flex flex-wrap gap-2"><AdminStatus tone={detail.contact.status === "archived" ? "neutral" : "success"}>{detail.contact.status}</AdminStatus><AdminStatus tone="info">{detail.enquiries.length} enquiries</AdminStatus><AdminStatus tone="warning">{detail.jobs.length} Jobs</AdminStatus></div>}
        actions={canManage ? <AdminButton variant="primary" icon={Save} disabled={saving} onClick={() => void save()}>Save contact</AdminButton> : undefined}
      />

      {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
      {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <AdminPanel title="Client details" description="Email changes are checked for duplicate CRM contacts and conflicting client portal identities." icon={UserRound}>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="First name"><input className="admin-input" value={form.firstName} disabled={!canManage} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} /></AdminField>
              <AdminField label="Last name"><input className="admin-input" value={form.lastName} disabled={!canManage} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} /></AdminField>
              <AdminField label="Email"><input className="admin-input" type="email" value={form.email} disabled={!canManage} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></AdminField>
              <AdminField label="Phone"><input className="admin-input" value={form.phone} disabled={!canManage} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></AdminField>
              <AdminField label="Status"><select className="admin-select" value={form.status} disabled={!canManage} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="active">Active</option><option value="archived">Archived</option></select></AdminField>
              <label className="admin-choice-row"><div><strong>Marketing consent</strong><p>Records the contact's current marketing permission. Transactional booking messages are managed separately.</p></div><input type="checkbox" checked={form.marketingConsent} disabled={!canManage} onChange={(event) => setForm((current) => ({ ...current, marketingConsent: event.target.checked }))} /></label>
            </div>
            <div className="mt-4"><AdminField label="Internal notes"><textarea className="admin-textarea min-h-32" value={form.notes} disabled={!canManage} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></AdminField></div>
          </AdminPanel>

          <AdminPanel title="Linked enquiries" description="The same contact can be reused without duplicating client details." icon={Mail}>
            {!detail.enquiries.length ? <p className="text-[10px] text-neutral-500">No linked enquiries.</p> : <div className="crm-linked-records">{detail.enquiries.map((enquiry) => <Link key={enquiry.id} to={`/admin/crm/enquiries/${enquiry.id}`} className="crm-linked-record"><div><strong>{enquiry.reference}</strong><p>{enquiry.role} · {enquiry.venueText || "Venue TBC"}</p></div><div><AdminStatus tone={enquiry.status === "won" ? "success" : enquiry.status === "lost" ? "danger" : "info"}>{enquiry.status}</AdminStatus><span><CalendarDays />{dateLabel(enquiry.eventDate)}</span></div></Link>)}</div>}
          </AdminPanel>

          <AdminPanel title="Linked Jobs" description="Open the operational Job workspace for questionnaires, portal access, suppliers, files and notes." icon={BriefcaseBusiness}>
            {!detail.jobs.length ? <p className="text-[10px] text-neutral-500">No linked Jobs.</p> : <div className="crm-linked-records">{detail.jobs.map((job) => <Link key={job.id} to={`/admin/crm/jobs/${job.id}`} className="crm-linked-record"><div><strong>{job.title}</strong><p>{job.reference} · {job.role}</p></div><div><AdminStatus tone={job.status === "booked" ? "success" : "neutral"}>{job.status}</AdminStatus><span><CalendarDays />{dateLabel(job.eventDate)}</span></div></Link>)}</div>}
          </AdminPanel>
        </div>

        <aside className="grid content-start gap-5">
          <AdminPanel title="Contact record" icon={UserRound} compact>
            <dl className="admin-compact-details"><div><dt>Source</dt><dd>{detail.contact.source || "manual"}</dd></div><div><dt>Privacy consent</dt><dd>{dateLabel(detail.contact.privacyConsentAt)}</dd></div><div><dt>Created</dt><dd>{dateLabel(detail.contact.createdAt)}</dd></div><div><dt>Updated</dt><dd>{dateLabel(detail.contact.updatedAt)}</dd></div></dl>
          </AdminPanel>
          <AdminPanel title="Activity" description="Direct edits to this reusable contact are recorded here." icon={Clock3} compact>
            {!detail.activities.length ? <p className="text-[10px] text-neutral-500">No direct contact activity yet.</p> : <div className="crm-activity-list">{detail.activities.map((item) => <div key={item.id}><span></span><section><strong>{item.summary}</strong><p>{dateLabel(item.createdAt)}{item.actorEmail ? ` · ${item.actorEmail}` : ""}</p></section></div>)}</div>}
          </AdminPanel>
        </aside>
      </div>
    </AdminPage>
  );
}
