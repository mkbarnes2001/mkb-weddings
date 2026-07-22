import { useEffect, useState } from "react";
import { AdminApiService, type WorkspaceRecord } from "../services/AdminApiService";

function Field({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30"
      />
    </label>
  );
}

export function Settings() {
  const [workspace, setWorkspace] = useState<WorkspaceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    AdminApiService.getWorkspace()
      .then(setWorkspace)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load workspace settings."))
      .finally(() => setLoading(false));
  }, []);

  function updateSetting(key: keyof WorkspaceRecord["settings"], value: string) {
    setWorkspace((current) => current ? { ...current, settings: { ...current.settings, [key]: value } } : current);
    setMessage("");
  }

  async function save() {
    if (!workspace) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await AdminApiService.updateWorkspace(workspace);
      setWorkspace(updated);
      setMessage("Workspace settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save workspace settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-neutral-500">Loading workspace settings…</div>;
  if (!workspace) return <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">{error || "Workspace unavailable."}</div>;

  return (
    <div className="space-y-7">
      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">Commercial foundation</p>
        <h1 className="mb-4 font-serif text-4xl leading-tight md:text-6xl">Workspace settings.</h1>
        <p className="max-w-3xl text-white/65">
          MKB Weddings is now workspace #1. These settings establish the tenant boundary used by future CRM, client galleries, storage, users and publishing integrations without changing the current live workflow.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[28px] border border-black/10 bg-white/75 p-7">
          <div className="mb-7">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Studio identity</p>
            <h2 className="mt-2 font-serif text-3xl">{workspace.name}</h2>
            <p className="mt-2 text-sm text-neutral-500">Workspace ID: {workspace.id}</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Workspace name" value={workspace.name} onChange={(name) => setWorkspace({ ...workspace, name })} />
            <Field label="Business name" value={workspace.settings.businessName} onChange={(value) => updateSetting("businessName", value)} />
            <Field label="Website URL" value={workspace.settings.websiteUrl} onChange={(value) => updateSetting("websiteUrl", value)} placeholder="https://…" />
            <Field label="Public hostname" value={workspace.settings.publicHostname} onChange={(value) => updateSetting("publicHostname", value)} />
            <Field label="Admin hostname" value={workspace.settings.adminHostname} onChange={(value) => updateSetting("adminHostname", value)} />
            <Field label="Contact email" value={workspace.settings.contactEmail} onChange={(value) => updateSetting("contactEmail", value)} />
            <Field label="Phone" value={workspace.settings.phone} onChange={(value) => updateSetting("phone", value)} />
            <Field label="Instagram" value={workspace.settings.instagram} onChange={(value) => updateSetting("instagram", value)} placeholder="without @" />
            <Field label="Timezone" value={workspace.settings.timezone} onChange={(value) => updateSetting("timezone", value)} />
            <Field label="Currency" value={workspace.settings.currency} onChange={(value) => updateSetting("currency", value)} />
          </div>

          <div className="mt-7 flex items-center gap-4">
            <button type="button" onClick={save} disabled={saving} className="rounded-full bg-black px-6 py-3 text-sm text-white disabled:opacity-50">
              {saving ? "Saving…" : "Save workspace settings"}
            </button>
            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-black/10 bg-white/75 p-7">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Foundation status</p>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">Workspace</dt><dd>{workspace.slug}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">Status</dt><dd>{workspace.status}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">Plan</dt><dd>{workspace.plan}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">Domains</dt><dd>{workspace.domains.length}</dd></div>
            </dl>
          </div>

          <div className="rounded-[28px] border border-black/10 bg-white/75 p-7">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Registered domains</p>
            <div className="mt-5 space-y-3">
              {workspace.domains.map((domain) => (
                <div key={domain.id} className="rounded-2xl border border-black/10 bg-[#f5f3ef] p-4">
                  <p className="font-medium">{domain.hostname}</p>
                  <p className="mt-1 text-xs text-neutral-500">{domain.purpose} · {domain.verified ? "verified" : "unverified"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Migration strategy</p>
        <h2 className="mt-2 font-serif text-3xl">Add tenant boundaries without destabilising MKB.</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-neutral-600">
          Existing wedding, venue, supplier and gallery tables remain untouched in this release. New commercial modules will be workspace-scoped from day one. Existing tables will be migrated in controlled phases only after each path is verified, so MKB continues to operate as the default workspace throughout the transition.
        </p>
      </section>
    </div>
  );
}
