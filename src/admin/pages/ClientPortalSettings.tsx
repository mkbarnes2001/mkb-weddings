import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import { ExternalLink, Image, Monitor, Save, Smartphone, Upload } from "lucide-react";
import { AdminApiService, type WorkspaceRecord } from "../services/AdminApiService";
import { AdminButton, AdminField, AdminLinkButton, AdminPage, AdminPageHeader, AdminPanel, AdminStatus, AdminTabs, AdminTab } from "../components/ui/AdminUI";

type PreviewMode = "desktop" | "mobile";

type PortalVars = CSSProperties & {
  "--portal-accent": string;
  "--portal-secondary": string;
  "--portal-background": string;
  "--portal-on-accent": string;
};

function contrastColour(hex: string) {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "111111";
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#171717" : "#ffffff";
}

const PLATFORM_PORTAL_ORIGIN = "https://mkb-weddings.pages.dev";

function portalUrl(workspace: WorkspaceRecord) {
  const hostname = workspace.settings.publicHostname || workspace.domains.find((item) => item.purpose === "public" && item.verified)?.hostname;
  const origin = hostname ? `https://${hostname.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : PLATFORM_PORTAL_ORIGIN;
  const url = new URL("/client-portal", origin);
  url.searchParams.set("workspace", workspace.slug || workspace.id);
  return url.toString();
}

function TextField({ label, value, onChange, help, multiline = false }: { label: string; value: string; onChange: (value: string) => void; help?: string; multiline?: boolean }) {
  return (
    <AdminField label={label} help={help}>
      {multiline ? <textarea className="admin-textarea" value={value} rows={4} onChange={(event) => onChange(event.target.value)} /> : <input className="admin-input" value={value} onChange={(event) => onChange(event.target.value)} />}
    </AdminField>
  );
}

function ColourField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const pickerValue = /^#[0-9a-f]{6}$/i.test(value) ? value : "#111111";
  return (
    <AdminField label={label}>
      <div className="portal-brand-colour-field">
        <input type="color" value={pickerValue} onChange={(event) => onChange(event.target.value)} />
        <input className="admin-input" value={value} pattern="#[0-9A-Fa-f]{6}" onChange={(event) => onChange(event.target.value)} />
      </div>
    </AdminField>
  );
}

export function ClientPortalSettings() {
  const [workspace, setWorkspace] = useState<WorkspaceRecord | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "banner" | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    AdminApiService.getWorkspace()
      .then(setWorkspace)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load client portal settings."))
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof WorkspaceRecord["settings"], value: string) {
    setWorkspace((current) => current ? { ...current, settings: { ...current.settings, [key]: value } } : current);
    setMessage("");
  }

  async function uploadAsset(kind: "logo" | "banner", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setUploading(kind);
    setMessage("");
    setError("");
    try {
      const asset = await AdminApiService.uploadPortalAsset(kind, file);
      update(kind === "logo" ? "logoUrl" : "portalBannerUrl", asset.url);
      setMessage(`${kind === "logo" ? "Logo" : "Banner"} uploaded. Save the portal settings to publish it.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload portal image.");
    } finally {
      setUploading("");
    }
  }

  async function save() {
    if (!workspace) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await AdminApiService.updateWorkspace(workspace);
      setWorkspace(updated);
      setMessage("Client portal branding saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save client portal branding.");
    } finally {
      setSaving(false);
    }
  }

  const previewStyle = useMemo<PortalVars | undefined>(() => workspace ? ({
    "--portal-accent": workspace.settings.accentColor || "#111111",
    "--portal-secondary": workspace.settings.portalSecondaryColor || "#f1efe9",
    "--portal-background": workspace.settings.portalBackgroundColor || "#f7f6f3",
    "--portal-on-accent": contrastColour(workspace.settings.accentColor || "#111111"),
  }) : undefined, [workspace]);

  if (loading) return <div className="text-neutral-500">Loading client portal settings…</div>;
  if (!workspace) return <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">{error || "Workspace unavailable."}</div>;

  const settings = workspace.settings;
  const openUrl = portalUrl(workspace);

  return (
    <AdminPage className="portal-branding-admin">
      <AdminPageHeader
        eyebrow="Client experience"
        title="Client portal"
        description="Brand the secure workspace your clients use for quotes, questionnaires and booking activity. These settings are isolated to the active business workspace."
        actions={<><AdminLinkButton href={openUrl} target="_blank" rel="noreferrer" variant="secondary" icon={ExternalLink}>Open portal</AdminLinkButton><AdminButton variant="primary" icon={Save} onClick={() => void save()} disabled={saving || Boolean(uploading)}>{saving ? "Saving…" : "Save branding"}</AdminButton></>}
        meta={<AdminStatus tone="success">Workspace branded</AdminStatus>}
      />

      {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}
      {error ? <div className="admin-alert admin-alert--danger">{error}</div> : null}

      <div className="portal-branding-grid">
        <div className="portal-branding-controls">
          <AdminPanel title="Logo and banner" description="Use a transparent logo where possible. Wide landscape images work best for the portal banner." icon={Image}>
            <div className="portal-branding-upload-grid">
              <div className="portal-branding-upload">
                <div className="portal-branding-upload__preview portal-branding-upload__preview--logo">{settings.logoUrl ? <img src={settings.logoUrl} alt="Business logo preview" /> : <span>{workspace.name.slice(0, 2).toUpperCase()}</span>}</div>
                <div><strong>Business logo</strong><p>PNG, JPEG or WebP. Maximum 8 MB.</p><label className="admin-button admin-button--secondary admin-button--sm"><Upload className="admin-button__icon" />{uploading === "logo" ? "Uploading…" : "Upload logo"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={(event) => void uploadAsset("logo", event)} /></label></div>
              </div>
              <div className="portal-branding-upload">
                <div className="portal-branding-upload__preview portal-branding-upload__preview--banner">{settings.portalBannerUrl ? <img src={settings.portalBannerUrl} alt="Portal banner preview" /> : <span>Banner image</span>}</div>
                <div><strong>Portal banner</strong><p>Recommended ratio around 3:1 or wider.</p><label className="admin-button admin-button--secondary admin-button--sm"><Upload className="admin-button__icon" />{uploading === "banner" ? "Uploading…" : "Upload banner"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={(event) => void uploadAsset("banner", event)} /></label></div>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="Brand colours" description="The portal automatically selects readable text against the primary colour.">
            <div className="portal-branding-field-grid">
              <ColourField label="Primary colour" value={settings.accentColor} onChange={(value) => update("accentColor", value)} />
              <ColourField label="Secondary colour" value={settings.portalSecondaryColor} onChange={(value) => update("portalSecondaryColor", value)} />
              <ColourField label="Page background" value={settings.portalBackgroundColor} onChange={(value) => update("portalBackgroundColor", value)} />
            </div>
          </AdminPanel>

          <AdminPanel title="Welcome content" description="Keep this concise. It appears on the client portal home screen.">
            <div className="portal-branding-fields">
              <TextField label="Welcome heading" value={settings.portalWelcomeHeading} onChange={(value) => update("portalWelcomeHeading", value)} />
              <TextField label="Welcome message" value={settings.portalWelcomeMessage} onChange={(value) => update("portalWelcomeMessage", value)} multiline />
              <TextField label="Footer text" value={settings.portalFooterText} onChange={(value) => update("portalFooterText", value)} help="Optional business or support text shown at the bottom of the portal." />
            </div>
          </AdminPanel>
        </div>

        <div className="portal-branding-preview-column">
          <AdminPanel title="Live preview" description="A representative client view using your current unsaved settings." actions={<AdminTabs><AdminTab active={previewMode === "desktop"} onClick={() => setPreviewMode("desktop")}><Monitor /> Desktop</AdminTab><AdminTab active={previewMode === "mobile"} onClick={() => setPreviewMode("mobile")}><Smartphone /> Mobile</AdminTab></AdminTabs>}>
            <div className={`portal-branding-device portal-branding-device--${previewMode}`}>
              <div className="portal-branding-preview" style={previewStyle}>
                <div className="portal-branding-preview__hero" style={settings.portalBannerUrl ? { backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.22), rgba(0,0,0,.05)), url(${settings.portalBannerUrl})` } : undefined}>
                  <div className="portal-branding-preview__identity">{settings.logoUrl ? <img src={settings.logoUrl} alt="" /> : <span>{workspace.name.slice(0, 2).toUpperCase()}</span>}<div><strong>{settings.businessName || workspace.name}</strong><small>Client portal</small></div></div>
                </div>
                <nav><b>Home</b><span>Quotes</span><span>Questionnaires</span></nav>
                <main><p className="portal-branding-preview__eyebrow">Welcome, Louise</p><h3>{settings.portalWelcomeHeading}</h3><p>{settings.portalWelcomeMessage}</p><div className="portal-branding-preview__event"><small>Your wedding</small><strong>Louise & William</strong><span>6 August 2026 · Killeavy Castle</span></div><div className="portal-branding-preview__cards"><article><small>Quote</small><strong>Accepted</strong></article><article><small>Questionnaire</small><strong>Complete</strong></article></div></main>
              </div>
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminPage>
  );
}
