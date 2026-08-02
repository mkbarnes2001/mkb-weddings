import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ClipboardList, ExternalLink, FileText, LockKeyhole, Mail, Send, ShieldX, Users } from "lucide-react";
import { AdminButton, AdminEmptyState, AdminField, AdminPage, AdminPageHeader, AdminPanel, AdminStatus } from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { CrmJobWorkspace } from "../types/crm";

function dateLabel(value: string) {
  if (!value) return "Date TBC";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "completed" || status === "active") return "success";
  if (status === "in_progress" || status === "opened") return "info";
  if (status === "sent" || status === "invited") return "warning";
  if (status === "revoked") return "danger";
  return "neutral";
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
  const canManage = auth.permissions.includes("crm:manage");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await AdminApiService.getCrmJobWorkspace(id);
      setWorkspace(result);
      setTemplateId((current) => current || result.templates.find((item) => item.status === "active")?.id || result.templates[0]?.id || "");
      setContactId((current) => current || result.contacts.find((item) => item.role === "primary")?.id || result.contacts[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Job.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id, auth.workspaceId]);

  const activeAccessByContact = useMemo(() => new Map((workspace?.portalAccess || []).filter((item) => item.status === "active").map((item) => [item.contactId, item])), [workspace?.portalAccess]);

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

  if (loading && !workspace) return <AdminPage><p className="text-sm text-neutral-500">Loading Job workspace…</p></AdminPage>;
  if (!workspace) return <AdminPage><div className="admin-alert admin-alert--error">{error || "Job not found."}</div></AdminPage>;
  const { job } = workspace;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow={<Link to="/admin/crm" className="admin-inline-link inline-flex items-center gap-1"><ArrowLeft size={13} />CRM Jobs</Link>}
        title={job.title}
        description={`${job.reference} · ${job.serviceName || "Wedding service"}`}
        meta={<div className="flex flex-wrap gap-2"><AdminStatus tone="success">{job.status}</AdminStatus><AdminStatus tone={job.clientPortalStatus === "active" ? "success" : job.clientPortalStatus === "invited" ? "warning" : "neutral"}>portal {job.clientPortalStatus.replace(/_/g, " ")}</AdminStatus><AdminStatus tone="info">{dateLabel(job.eventDate)}</AdminStatus></div>}
        actions={job.weddingSlug ? <Link className="admin-button admin-button--secondary admin-button--md" to={`/admin/weddings/${job.weddingSlug}/workspace`}><ExternalLink className="admin-button__icon" />Open Wedding</Link> : undefined}
      />
      {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
      {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <div className="grid gap-4">
          <AdminPanel title="Client portal access" description="Invitations use a one-time magic link. The verified client can return on the same device for 30 days." icon={LockKeyhole}>
            <div className="grid gap-3">
              {workspace.contacts.map((contact) => {
                const access = activeAccessByContact.get(contact.id);
                return <div key={contact.id} className="admin-choice-row"><div><strong>{contact.displayName}</strong><p>{contact.role} · {contact.email || "Email required"}</p>{access ? <div className="mt-2"><AdminStatus tone={access.acceptedAt ? "success" : "warning"}>{access.acceptedAt ? "portal active" : "invited"}</AdminStatus></div> : null}</div><div className="flex gap-2">{access ? <AdminButton variant="danger" size="sm" icon={ShieldX} disabled={saving || !canManage} onClick={() => void revoke(access.identityId)}>Revoke</AdminButton> : null}<AdminButton variant="primary" size="sm" icon={Mail} disabled={saving || !canManage || !contact.email} onClick={() => void invite(contact.id)}>{access ? "Send new link" : "Invite client"}</AdminButton></div></div>;
              })}
            </div>
          </AdminPanel>

          <AdminPanel title="Assigned questionnaires" description="Each assignment is a versioned copy of its template. Client responses save into structured Job data." icon={ClipboardList}>
            {!workspace.questionnaires.length ? <AdminEmptyState icon={FileText} title="No questionnaires assigned" description="Choose a template and client from the assignment panel." /> : <div className="grid gap-3">{workspace.questionnaires.map((item) => <article key={item.id} className="questionnaire-instance-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3>{item.title}</h3><p>{item.assignedContactName || "Client not assigned"}{item.dueAt ? ` · due ${dateLabel(item.dueAt.slice(0, 10))}` : ""}</p></div><AdminStatus tone={statusTone(item.status)}>{item.status.replace(/_/g, " ")}</AdminStatus></div>{item.introduction ? <p className="mt-3 text-[10px] leading-5 text-neutral-500">{item.introduction}</p> : null}<div className="mt-3 grid gap-2">{item.fields.filter((field) => !["heading","description","file"].includes(field.type)).map((field) => <div key={field.id} className="questionnaire-response-row"><span>{field.label}</span><strong>{Array.isArray(item.responses[field.id]) ? (item.responses[field.id] as unknown[]).join(", ") : String(item.responses[field.id] ?? "Not answered")}</strong></div>)}</div>{item.files.length ? <div className="mt-3"><strong className="text-[9px] uppercase tracking-wider text-neutral-500">Files</strong><div className="mt-2 flex flex-wrap gap-2">{item.files.map((file) => <a key={file.id} className="admin-button admin-button--secondary admin-button--sm" href={AdminApiService.questionnaireFileUrl(item.id, file.id)} target="_blank" rel="noreferrer">{file.filename}</a>)}</div></div> : null}</article>)}</div>}
          </AdminPanel>
        </div>

        <div className="grid content-start gap-4">
          <AdminPanel title="Assign questionnaire" description="Assign a reusable template to a client on this Job." icon={Send}>
            <div className="grid gap-3">
              <AdminField label="Template"><select className="admin-select" value={templateId} disabled={!canManage} onChange={(event) => setTemplateId(event.target.value)}>{workspace.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></AdminField>
              <AdminField label="Client"><select className="admin-select" value={contactId} disabled={!canManage} onChange={(event) => setContactId(event.target.value)}><option value="">Choose client</option>{workspace.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.displayName} ({contact.role})</option>)}</select></AdminField>
              <AdminField label="Due date"><input className="admin-input" type="date" value={dueAt} disabled={!canManage} onChange={(event) => setDueAt(event.target.value)} /></AdminField>
              <AdminButton variant="primary" icon={Send} disabled={saving || !canManage || !templateId} onClick={() => void assign()}>Assign questionnaire</AdminButton>
            </div>
          </AdminPanel>
          <AdminPanel title="Job details" icon={CalendarDays} compact>
            <div className="admin-record-grid"><div><span>Wedding date</span><strong>{dateLabel(job.eventDate)}</strong></div><div><span>Venue</span><strong>{job.venueText || "TBC"}</strong></div><div><span>Portal</span><strong>{job.clientPortalStatus.replace(/_/g, " ")}</strong></div><div><span>Questionnaires</span><strong>{workspace.questionnaires.length}</strong></div></div>
          </AdminPanel>
          <AdminPanel title="Recent activity" icon={Users} compact>
            {!workspace.activities.length ? <p className="text-[10px] text-neutral-500">No Job activity yet.</p> : <div className="crm-activity-list">{workspace.activities.slice(0, 12).map((item) => <div key={item.id}><span></span><section><strong>{item.summary}</strong><p>{new Date(item.createdAt).toLocaleString("en-GB")}{item.actorEmail ? ` · ${item.actorEmail}` : ""}</p></section></div>)}</div>}
          </AdminPanel>
        </div>
      </div>
    </AdminPage>
  );
}
