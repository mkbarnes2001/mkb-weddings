import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, CalendarDays, CheckCircle2, Download, FileText, LogOut, Mail, Paperclip, Save, Send, Trash2 } from "lucide-react";

type PortalQuestionnaire = {
  id: string;
  jobId: string;
  title: string;
  introduction: string;
  status: string;
  dueAt: string;
  fields: Array<{ id: string; type: string; label: string; help: string; required: boolean; options: string[] }>;
  responses: Record<string, unknown>;
  files: Array<{ id: string; fieldKey: string; filename: string; fileSize: number; uploadedAt: string }>;
  lastSavedAt?: string;
  completedAt?: string;
};

type PortalJob = {
  id: string;
  reference: string;
  title: string;
  status: string;
  eventDate: string;
  serviceName: string;
  venueText: string;
  weddingSlug: string;
  contactName: string;
  questionnaires: PortalQuestionnaire[];
};

type PortalPayload = {
  authenticated: boolean;
  identity: { id: string; email: string; displayName: string } | null;
  business?: { name: string; logoUrl: string; accentColor: string; contactEmail: string };
  jobs: PortalJob[];
};

function formatDate(value: string) {
  if (!value) return "Date TBC";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

async function jsonRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
  return body as T;
}

export function ClientPortal() {
  const [portal, setPortal] = useState<PortalPayload | null>(null);
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get("questionnaire") || "");
  const [questionnaire, setQuestionnaire] = useState<PortalQuestionnaire | null>(null);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadPortal() {
    setLoading(true);
    setError("");
    try {
      const result = await jsonRequest<{ ok: true; portal: PortalPayload }>("/api/public/client-portal");
      setPortal(result.portal);
      if (!selectedId && result.portal.authenticated) {
        const firstOpen = result.portal.jobs.flatMap((job) => job.questionnaires).find((item) => item.status !== "completed");
        if (firstOpen) setSelectedId(firstOpen.id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load client portal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPortal(); }, []);

  useEffect(() => {
    if (!selectedId || !portal?.authenticated) { setQuestionnaire(null); return; }
    setSaving(true);
    setError("");
    jsonRequest<{ ok: true; questionnaire: PortalQuestionnaire }>(`/api/public/client-portal/questionnaires/${encodeURIComponent(selectedId)}`)
      .then((result) => { setQuestionnaire(result.questionnaire); setResponses(result.questionnaire.responses || {}); })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load questionnaire."))
      .finally(() => setSaving(false));
  }, [selectedId, portal?.authenticated]);

  const selectedJob = useMemo(() => portal?.jobs.find((job) => job.questionnaires.some((item) => item.id === selectedId)) || null, [portal?.jobs, selectedId]);

  async function requestLink() {
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await jsonRequest<{ ok: true; message: string }>("/api/public/client-portal/request-link", { method: "POST", body: JSON.stringify({ email }) });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send sign-in link.");
    } finally { setSaving(false); }
  }

  async function save(submit = false) {
    if (!questionnaire) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await jsonRequest<{ ok: true; questionnaire: PortalQuestionnaire }>(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}`, { method: "PUT", body: JSON.stringify({ responses, submit }) });
      setQuestionnaire(result.questionnaire);
      setResponses(result.questionnaire.responses || {});
      setMessage(submit ? "Questionnaire submitted. Thank you." : "Progress saved. You can safely return later.");
      await loadPortal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save questionnaire.");
    } finally { setSaving(false); }
  }

  async function upload(fieldKey: string, file: File | undefined) {
    if (!questionnaire || !file) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const form = new FormData();
      form.set("fieldKey", fieldKey);
      form.set("file", file);
      const response = await fetch(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}/files`, { method: "POST", credentials: "include", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Unable to upload file.");
      const refreshed = await jsonRequest<{ ok: true; questionnaire: PortalQuestionnaire }>(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}`);
      setQuestionnaire(refreshed.questionnaire);
      setResponses(refreshed.questionnaire.responses || {});
      setMessage(`${file.name} uploaded.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload file.");
    } finally { setSaving(false); }
  }

  async function removeFile(fileId: string) {
    if (!questionnaire || !window.confirm("Remove this file?")) return;
    setSaving(true); setError("");
    try {
      await jsonRequest(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
      const refreshed = await jsonRequest<{ ok: true; questionnaire: PortalQuestionnaire }>(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}`);
      setQuestionnaire(refreshed.questionnaire);
      setMessage("File removed.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove file.");
    } finally { setSaving(false); }
  }

  async function signOut() {
    await fetch("/api/public/client-auth/sign-out", { method: "POST", credentials: "include" }).catch(() => {});
    setPortal({ authenticated: false, identity: null, jobs: [] });
    setSelectedId("");
    setQuestionnaire(null);
  }

  const accent = portal?.business?.accentColor || "#111111";

  if (loading && !portal) return <div className="client-portal-shell"><div className="client-portal-loading">Loading client portal…</div></div>;

  if (!portal?.authenticated) {
    return (
      <div className="client-portal-shell" style={{ "--portal-accent": accent } as CSSProperties}>
        <Helmet><title>Client portal</title><meta name="robots" content="noindex,nofollow" /></Helmet>
        <main className="client-portal-signin">
          <div className="client-portal-brand">{portal?.business?.logoUrl ? <img src={portal.business.logoUrl} alt="" /> : <span>WP</span>}</div>
          <p className="client-portal-eyebrow">Secure client portal</p>
          <h1>Open your wedding workspace</h1>
          <p>Enter the email address linked to your booking. We will send a one-time sign-in link.</p>
          {error ? <div className="client-portal-alert client-portal-alert--error">{error}</div> : null}
          {message ? <div className="client-portal-alert client-portal-alert--success">{message}</div> : null}
          <label><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <button onClick={() => void requestLink()} disabled={saving || !email.trim()}><Mail />Send secure sign-in link</button>
        </main>
      </div>
    );
  }

  return (
    <div className="client-portal-shell" style={{ "--portal-accent": accent } as CSSProperties}>
      <Helmet><title>{portal.business?.name || "WedPlanned"} client portal</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <header className="client-portal-header">
        <div><p>{portal.business?.name || "WedPlanned"}</p><strong>Client portal</strong></div>
        <div className="client-portal-user"><span>{portal.identity?.displayName || portal.identity?.email}</span><button onClick={() => void signOut()}><LogOut />Sign out</button></div>
      </header>
      <div className="client-portal-layout">
        <aside className="client-portal-sidebar">
          <p className="client-portal-eyebrow">Your bookings</p>
          {portal.jobs.map((job) => <section key={job.id} className="client-portal-job"><h2>{job.title}</h2><p><CalendarDays />{formatDate(job.eventDate)}</p><p>{job.venueText || "Venue TBC"}</p><div>{job.questionnaires.map((item) => <button key={item.id} className={selectedId === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><FileText /><span>{item.title}<small>{item.status.replace(/_/g, " ")}</small></span>{item.status === "completed" ? <CheckCircle2 /> : null}</button>)}</div></section>)}
          {!portal.jobs.length ? <p className="client-portal-muted">No active bookings are linked to this email.</p> : null}
        </aside>
        <main className="client-portal-main">
          {error ? <div className="client-portal-alert client-portal-alert--error">{error}</div> : null}
          {message ? <div className="client-portal-alert client-portal-alert--success">{message}</div> : null}
          {!questionnaire ? <div className="client-portal-empty"><FileText /><h2>Select a questionnaire</h2><p>Choose a questionnaire from your booking to continue.</p></div> : (
            <article className="portal-questionnaire-card">
              <div className="portal-questionnaire-heading"><button className="client-portal-back" onClick={() => setSelectedId("")}><ArrowLeft />Back</button><span>{selectedJob?.title}</span><h1>{questionnaire.title}</h1>{questionnaire.introduction ? <p>{questionnaire.introduction}</p> : null}<div className="portal-questionnaire-meta"><span>{questionnaire.status.replace(/_/g, " ")}</span>{questionnaire.dueAt ? <span>Due {formatDate(questionnaire.dueAt)}</span> : null}{questionnaire.lastSavedAt ? <span>Saved {new Date(questionnaire.lastSavedAt).toLocaleString("en-GB")}</span> : null}</div></div>
              <div className="portal-questionnaire-fields">
                {questionnaire.fields.map((field) => {
                  if (field.type === "heading") return <h2 key={field.id}>{field.label}</h2>;
                  if (field.type === "description") return <p key={field.id} className="portal-question-description">{field.label}</p>;
                  const value = responses[field.id];
                  const files = questionnaire.files.filter((file) => file.fieldKey === field.id);
                  return <label key={field.id} className="portal-question-field"><span>{field.label}{field.required ? <b> *</b> : null}</span>{field.help ? <small>{field.help}</small> : null}{field.type === "short_text" ? <input value={String(value ?? "")} disabled={questionnaire.status === "completed"} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.value }))} /> : null}{field.type === "long_text" ? <textarea value={String(value ?? "")} disabled={questionnaire.status === "completed"} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.value }))} /> : null}{field.type === "select" ? <select value={String(value ?? "")} disabled={questionnaire.status === "completed"} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.value }))}><option value="">Choose an option</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : null}{field.type === "radio" ? <div className="portal-choice-list">{field.options.map((option) => <label key={option}><input type="radio" name={field.id} checked={value === option} disabled={questionnaire.status === "completed"} onChange={() => setResponses((current) => ({ ...current, [field.id]: option }))} />{option}</label>)}</div> : null}{field.type === "checkbox" ? <div className="portal-choice-list">{field.options.map((option) => { const selected = Array.isArray(value) ? value as string[] : []; return <label key={option}><input type="checkbox" checked={selected.includes(option)} disabled={questionnaire.status === "completed"} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.checked ? [...selected, option] : selected.filter((item) => item !== option) }))} />{option}</label>; })}</div> : null}{field.type === "file" ? <div className="portal-file-field"><input type="file" disabled={saving || questionnaire.status === "completed"} onChange={(event) => { const file = event.target.files?.[0]; void upload(field.id, file); event.currentTarget.value = ""; }} /><div className="portal-file-list">{files.map((file) => <div key={file.id}><Paperclip /><a href={`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}/files/${encodeURIComponent(file.id)}`} target="_blank" rel="noreferrer"><span>{file.filename}</span><small>{formatBytes(file.fileSize)}</small></a>{questionnaire.status !== "completed" ? <button type="button" onClick={() => void removeFile(file.id)}><Trash2 /></button> : <Download />}</div>)}</div></div> : null}</label>;
                })}
              </div>
              <footer className="portal-questionnaire-actions">{questionnaire.status === "completed" ? <div className="client-portal-complete"><CheckCircle2 /><span>Submitted {questionnaire.completedAt ? new Date(questionnaire.completedAt).toLocaleString("en-GB") : ""}</span></div> : <><button className="secondary" disabled={saving} onClick={() => void save(false)}><Save />Save progress</button><button disabled={saving} onClick={() => void save(true)}><Send />Submit questionnaire</button></>}</footer>
            </article>
          )}
        </main>
      </div>
    </div>
  );
}
