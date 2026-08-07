import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ContactRound,
  Download,
  Gauge,
  ImagePlus,
  Globe2,
  Images,
  Palette,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import {
  AdminButton,
  AdminField,
  AdminModuleWordmark,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
} from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import {
  adminModuleIconOptions,
  adminModules,
  defaultAdminModuleConfigurations,
} from "../navigation/adminModules";
import {
  DEFAULT_SUPPLIER_ROLE_DEFINITIONS,
  SUPPLIER_CATEGORY_OPTIONS,
  normaliseSupplierTaxonomy,
  supplierTaxonomyKey,
  type SupplierRoleDefinition,
} from "../data/supplierTaxonomy";
import type {
  PlatformAdministrationPayload,
  PlatformBrandingIdentity,
  PlatformModuleConfiguration,
  WedPlannedOperationsPayload,
} from "../types/platform";

type SectionKey = "overview" | "businesses" | "taxonomy" | "modules" | "assets" | "operations" | "access";

function sectionFromSearch(params: URLSearchParams): SectionKey {
  const value = params.get("section");
  return value === "businesses" || value === "taxonomy" || value === "modules" || value === "assets" || value === "operations" || value === "access" ? value : "overview";
}

function FieldInput({ value, onChange, placeholder = "", type = "text" }: {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return <input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="admin-input" />;
}

function FieldSelect({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="admin-select">{children}</select>;
}

function duplicateTaxonomyName(values: string[]) {
  const seen = new Set<string>();
  for (const value of values) {
    const key = supplierTaxonomyKey(value);
    if (!key) return "Every option needs a name.";
    if (seen.has(key)) return `Duplicate option: ${value.trim()}.`;
    seen.add(key);
  }
  return "";
}

function Metric({ value, label, detail }: { value: ReactNode; label: string; detail: string }) {
  return <div className="admin-module-metric"><strong>{value}</strong><span>{label}</span><small>{detail}</small></div>;
}

function Destination({ to, icon: Icon, title, description, meta }: { to: string; icon: typeof Gauge; title: string; description: string; meta: string }) {
  return <Link to={to} className="admin-module-destination"><span className="admin-module-destination__icon"><Icon /></span><div><strong>{title}</strong><p>{description}</p><div className="admin-module-destination__meta"><AdminStatus tone="info">{meta}</AdminStatus></div></div><ArrowRight className="admin-module-destination__arrow" /></Link>;
}

const DEFAULT_PLATFORM_IDENTITY: PlatformBrandingIdentity = {
  platformName: "WedPlanned",
  wordmarkUrl: "",
  darkWordmarkUrl: "",
  compactWordmarkUrl: "",
  iconUrl: "",
};

function moduleFingerprint(module: PlatformModuleConfiguration) {
  return JSON.stringify({
    moduleKey: module.moduleKey,
    accentColor: module.accentColor,
    pageBackgroundColor: module.pageBackgroundColor,
    sectionBackgroundColor: module.sectionBackgroundColor,
    recordBackgroundColor: module.recordBackgroundColor,
    iconKey: module.iconKey,
    markUrl: module.markUrl,
    wordmarkUrl: module.wordmarkUrl,
    darkWordmarkUrl: module.darkWordmarkUrl,
    compactWordmarkUrl: module.compactWordmarkUrl,
    activeButtonStyle: module.activeButtonStyle,
    panelAccentStyle: module.panelAccentStyle,
    status: module.status,
    sortOrder: module.sortOrder,
  });
}

function identityFingerprint(identity: PlatformBrandingIdentity) {
  return JSON.stringify({
    platformName: identity.platformName,
    wordmarkUrl: identity.wordmarkUrl,
    darkWordmarkUrl: identity.darkWordmarkUrl,
    compactWordmarkUrl: identity.compactWordmarkUrl,
    iconUrl: identity.iconUrl,
  });
}



function PlatformScaleControl({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  help?: string;
}) {
  const safeValue = Math.min(140, Math.max(75, Number(value) || 100));

  return (
    <AdminField label={label} help={help}>
      <div className="platform-scale-control">
        <input
          type="range"
          min="75"
          max="140"
          step="1"
          value={safeValue}
          onChange={(event) => onChange(Number(event.target.value))}
        />

        <label>
          <input
            type="number"
            min="75"
            max="140"
            step="1"
            value={safeValue}
            onChange={(event) => {
              const next = Math.min(
                140,
                Math.max(75, Number(event.target.value) || 100),
              );
              onChange(next);
            }}
          />
          <span>%</span>
        </label>
      </div>
    </AdminField>
  );
}

function PlatformOptionalColourControl({
  label,
  value,
  fallback,
  onChange,
  help,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
  help?: string;
}) {
  const validValue = /^#[0-9A-Fa-f]{6}$/.test(value)
    ? value
    : fallback;

  return (
    <AdminField label={label} help={help}>
      <div className="platform-colour-control platform-colour-control--optional">
        <input
          type="color"
          value={validValue}
          onChange={(event) =>
            onChange(event.target.value.toUpperCase())
          }
        />

        <input
          className="admin-field-input"
          value={value}
          placeholder="Use current default"
          onChange={(event) =>
            onChange(event.target.value.toUpperCase())
          }
        />

        {value ? (
          <button
            type="button"
            className="platform-colour-reset"
            onClick={() => onChange("")}
          >
            Default
          </button>
        ) : null}
      </div>
    </AdminField>
  );
}

export function PlatformAdmin() {
  const { auth } = useProfessionalAuth();
  const [searchParams] = useSearchParams();
  const section = sectionFromSearch(searchParams);
  const [platformAdmin, setPlatformAdmin] = useState<PlatformAdministrationPayload | null>(null);
  const [modules, setModules] = useState<PlatformModuleConfiguration[]>(
    defaultAdminModuleConfigurations,
  );
  const [savedModules, setSavedModules] = useState<
    PlatformModuleConfiguration[]
  >(defaultAdminModuleConfigurations);
  const [platformIdentity, setPlatformIdentity] =
    useState<PlatformBrandingIdentity>(DEFAULT_PLATFORM_IDENTITY);
  const [savedPlatformIdentity, setSavedPlatformIdentity] =
    useState<PlatformBrandingIdentity>(DEFAULT_PLATFORM_IDENTITY);
  const [supplierCategories, setSupplierCategories] = useState<string[]>([...SUPPLIER_CATEGORY_OPTIONS]);
  const [supplierRoles, setSupplierRoles] = useState<SupplierRoleDefinition[]>([...DEFAULT_SUPPLIER_ROLE_DEFINITIONS]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(auth.workspaceId);
  const [operations, setOperations] = useState<WedPlannedOperationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [supportScope, setSupportScope] = useState<"read" | "manage">("read");
  const [supportHours, setSupportHours] = useState(4);
  const [supportReason, setSupportReason] = useState("");
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const [deletionReason, setDeletionReason] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<"logo" | "icon">("logo");
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetInputKey, setAssetInputKey] = useState(0);
  const [assetUploading, setAssetUploading] = useState(false);

  const changedModuleCount = useMemo(
    () => modules.filter((module) => {
      const saved = savedModules.find(
        (candidate) => candidate.moduleKey === module.moduleKey,
      );
      return !saved || moduleFingerprint(module) !== moduleFingerprint(saved);
    }).length,
    [modules, savedModules],
  );

  const identityDirty = useMemo(
    () => identityFingerprint(platformIdentity)
      !== identityFingerprint(savedPlatformIdentity),
    [platformIdentity, savedPlatformIdentity],
  );

  const brandingDirty = changedModuleCount > 0 || identityDirty;

  function apply(
    next: PlatformAdministrationPayload,
    preserveBrandingDraft = false,
  ) {
    setPlatformAdmin(next);

    if (!preserveBrandingDraft) {
      const nextModules = next.modules?.length
        ? next.modules
        : defaultAdminModuleConfigurations;
      const nextIdentity = next.platformIdentity
        || DEFAULT_PLATFORM_IDENTITY;

      setModules(nextModules.map((module) => ({ ...module })));
      setSavedModules(nextModules.map((module) => ({ ...module })));
      setPlatformIdentity({ ...nextIdentity });
      setSavedPlatformIdentity({ ...nextIdentity });
    }

    const taxonomy = normaliseSupplierTaxonomy(
      next.supplierTaxonomy?.categories,
      next.supplierTaxonomy?.roles,
    );
    setSupplierCategories(taxonomy.categories);
    setSupplierRoles(taxonomy.roles);
    setSelectedWorkspaceId((current) => (
      next.workspaces.some((workspace) => workspace.id === current)
        ? current
        : next.workspaces[0]?.id || auth.workspaceId
    ));
  }

  useEffect(() => {
    AdminApiService.getPlatformAdministration()
      .then(apply)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load platform administration."))
      .finally(() => setLoading(false));
  }, [auth.workspaceId]);

  useEffect(() => {
    if (!brandingDirty) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, [brandingDirty]);

  useEffect(() => {
    if (section !== "operations" || !selectedWorkspaceId) return;
    setOperationsLoading(true);
    setError("");
    setDeletionConfirmation("");
    setDeletionReason("");
    AdminApiService.getWedPlannedOperations(selectedWorkspaceId)
      .then(setOperations)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load platform operations."))
      .finally(() => setOperationsLoading(false));
  }, [section, selectedWorkspaceId]);

  async function runAdmin(action: () => Promise<PlatformAdministrationPayload>, success: string) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const next = await action();
      apply(next);
      setMessage(success);
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to save platform administration changes.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function runOperation(action: () => Promise<WedPlannedOperationsPayload>, success: string) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const next = await action();
      setOperations(next);
      setMessage(success);
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to complete the platform operation.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function updateSupplierCategory(index: number, value: string) {
    const previous = supplierCategories[index];
    setSupplierCategories((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
    setSupplierRoles((current) => current.map((role) => supplierTaxonomyKey(role.category) === supplierTaxonomyKey(previous) ? { ...role, category: value } : role));
    setMessage("");
    setError("");
  }

  function removeSupplierCategory(index: number) {
    if (supplierCategories.length <= 1) return setError("Keep at least one supplier category.");
    const removed = supplierCategories[index];
    const next = supplierCategories.filter((_, itemIndex) => itemIndex !== index);
    const replacement = next[Math.min(index, next.length - 1)] || next[0];
    setSupplierCategories(next);
    setSupplierRoles((current) => current.map((role) => supplierTaxonomyKey(role.category) === supplierTaxonomyKey(removed) ? { ...role, category: replacement } : role));
  }

  function moveSupplierCategory(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= supplierCategories.length) return;
    setSupplierCategories((current) => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }

  function moveSupplierRole(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= supplierRoles.length) return;
    setSupplierRoles((current) => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }

  async function saveSupplierTaxonomy() {
    const categoryError = duplicateTaxonomyName(supplierCategories);
    const roleError = duplicateTaxonomyName(supplierRoles.map((role) => role.name));
    if (categoryError || roleError) return setError(categoryError || roleError);
    const categoryKeys = new Set(supplierCategories.map(supplierTaxonomyKey));
    if (supplierRoles.some((role) => !categoryKeys.has(supplierTaxonomyKey(role.category)))) return setError("Each Wedding role must use one of the platform supplier categories.");
    const taxonomy = normaliseSupplierTaxonomy(supplierCategories, supplierRoles);
    await runAdmin(() => AdminApiService.savePlatformSupplierTaxonomy(taxonomy), "Global supplier categories and Wedding roles saved.");
  }

  function updateModule(moduleKey: PlatformModuleConfiguration["moduleKey"], patch: Partial<PlatformModuleConfiguration>) {
    setModules((current) => current.map((module) => module.moduleKey === moduleKey ? { ...module, ...patch } : module));
    setMessage("");
    setError("");
  }

  async function saveBrandingAndModules() {
    if (!brandingDirty) return;

    const saved = await runAdmin(
      () => AdminApiService.savePlatformBrandingAndModules(
        modules,
        platformIdentity,
      ),
      "WedPlanned platform and module branding saved.",
    );

    if (saved) {
      window.dispatchEvent(
        new CustomEvent("wedplanned:branding-updated", {
          detail: {
            modules: modules.map((module) => ({ ...module })),
            platformIdentity: { ...platformIdentity },
          },
        }),
      );
    }
  }

  function resetBrandingDraft() {
    setModules(savedModules.map((module) => ({ ...module })));
    setPlatformIdentity({ ...savedPlatformIdentity });
    setMessage("");
    setError("");
  }

  async function uploadBrandAsset() {
    if (!assetFile) return setError("Choose a PNG, JPEG or WebP logo or icon.");
    setAssetUploading(true);
    setMessage("");
    setError("");
    try {
      const next = await AdminApiService.uploadPlatformBrandAsset(assetName.trim() || assetFile.name.replace(/\.[^.]+$/, ""), assetType, assetFile);
      apply(next, brandingDirty);
      setAssetName("");
      setAssetFile(null);
      setAssetInputKey((current) => current + 1);
      setMessage("Platform brand asset uploaded.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload the platform brand asset.");
    } finally {
      setAssetUploading(false);
    }
  }

  async function deleteBrandAsset(assetId: string, assetLabel: string) {
    if (!window.confirm(`Delete ${assetLabel} from the WedPlanned asset library?`)) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      apply(
        await AdminApiService.deletePlatformBrandAsset(assetId),
        brandingDirty,
      );
      setMessage("Platform brand asset deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete the platform brand asset.");
    } finally {
      setSaving(false);
    }
  }

  const selectedWorkspace = useMemo(() => platformAdmin?.workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null, [platformAdmin?.workspaces, selectedWorkspaceId]);

  if (loading) return <div className="admin-page text-sm text-neutral-500">Loading Platform administration…</div>;
  if (!platformAdmin) return <div className="admin-page rounded-xl bg-red-50 p-5 text-sm text-red-800">{error || "Platform administration is unavailable."}</div>;

  const logoAssets = platformAdmin.brandAssets.filter(
    (asset) => asset.assetType === "logo",
  );
  const iconAssets = platformAdmin.brandAssets.filter(
    (asset) => asset.assetType === "icon",
  );

  return <AdminPage className="platform-admin-page">
    <AdminPageHeader
      eyebrow="WedPlanned · Restricted control plane"
      title="Platform administration"
      description="Manage global WedPlanned configuration separately from the active business workspace. Every write action is restricted to platform administrators and audited server-side."
      meta={<div className="flex flex-wrap gap-2"><AdminStatus tone="info">Schema {platformAdmin.schemaVersion}</AdminStatus><AdminStatus tone="warning">Platform administrator</AdminStatus><span className="text-xs text-neutral-500">{platformAdmin.brand.primaryDomain}</span></div>}
    />

    {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}
    {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}

    {section === "overview" ? <>
      <section className="admin-module-metrics">
        <Metric value={platformAdmin.summary.workspaces} label="Business workspaces" detail={`${platformAdmin.summary.activeWorkspaces} active`} />
        <Metric value={platformAdmin.summary.users} label="Platform users" detail={`${platformAdmin.summary.platformAdmins} platform administrators`} />
        <Metric value={platformAdmin.modules.length} label="Configured modules" detail="Global appearance definitions" />
        <Metric value={platformAdmin.summary.brandAssets} label="WedPlanned assets" detail="Platform-owned reusable logos and icons" />
      </section>
      <section className="admin-module-destination-grid">
        <Destination to="/admin/platform?section=businesses" icon={Building2} title="Businesses & workspaces" description="Review every tenant boundary, business status, membership count and verified-domain footprint." meta={`${platformAdmin.summary.activeWorkspaces} active`} />
        <Destination to="/admin/platform?section=taxonomy" icon={Users} title="Supplier taxonomy" description="Manage the canonical supplier categories and Wedding roles shared by every workspace." meta={`${platformAdmin.supplierTaxonomy.roles.length} roles`} />
        <Destination to="/admin/platform?section=modules" icon={Palette} title="Module configuration" description="Control module accents, page and section colours, icons, marks and navigation treatments." meta={`${platformAdmin.modules.length} modules`} />
        <Destination to="/admin/platform?section=assets" icon={Images} title="Brand assets" description="Upload reusable platform-owned logos and icons, then assign them to modules." meta={`${platformAdmin.brandAssets.length} assets`} />
        <Destination to="/admin/platform?section=operations" icon={ShieldCheck} title="Platform operations" description="Select a business workspace before managing support access, exports or staged deletion." meta="Workspace scoped" />
        <Destination to="/admin/platform?section=access" icon={ContactRound} title="Platform access" description="Review platform identities, roles and the enforced administrator boundary." meta={`${platformAdmin.summary.users} users`} />
      </section>
      <AdminPanel title="Recent platform activity" description="Global and workspace audit events, newest first." icon={ShieldCheck}>
        <div className="platform-admin-audit-list">{platformAdmin.recentAudit.length ? platformAdmin.recentAudit.slice(0, 10).map((event) => <div key={event.id}><strong>{event.summary || event.eventType}</strong><span>{event.actorEmail || "System"} · {new Date(event.createdAt).toLocaleString("en-GB")}</span></div>) : <p className="text-xs text-neutral-500">No platform activity recorded.</p>}</div>
      </AdminPanel>
    </> : null}

    {section === "businesses" ? <AdminPanel title="Businesses and workspaces" description="Read-only platform view of tenant boundaries. Open workspace operations only after selecting the intended business." icon={Building2}>
      <div className="platform-admin-workspace-grid">{platformAdmin.workspaces.map((workspace) => <article key={workspace.id} className="platform-admin-workspace-card"><header><div><strong>{workspace.name}</strong><span>{workspace.slug}</span></div><AdminStatus tone={workspace.status === "active" ? "success" : "warning"}>{workspace.status}</AdminStatus></header><dl><div><dt>Plan</dt><dd>{workspace.plan}</dd></div><div><dt>Members</dt><dd>{workspace.activeMemberCount} active / {workspace.memberCount}</dd></div><div><dt>Domains</dt><dd>{workspace.verifiedDomainCount} verified / {workspace.domainCount}</dd></div><div><dt>Marketplace</dt><dd>{workspace.marketplaceSlug || "Not configured"}</dd></div></dl><Link to={`/admin/platform?section=operations&workspaceId=${encodeURIComponent(workspace.id)}`} onClick={() => setSelectedWorkspaceId(workspace.id)} className="admin-button admin-button--secondary admin-button--sm"><ShieldCheck className="admin-button__icon" />Open operations</Link></article>)}</div>
    </AdminPanel> : null}

    {section === "taxonomy" ? <section className="supplier-taxonomy-manager">
      <header className="supplier-taxonomy-manager__header"><div><p className="admin-eyebrow">Platform-owned canonical options</p><h2>Supplier categories & Wedding roles</h2><p>Business workspaces may select these options but cannot add, rename, reorder or remove them.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setSupplierCategories([...SUPPLIER_CATEGORY_OPTIONS]); setSupplierRoles([...DEFAULT_SUPPLIER_ROLE_DEFINITIONS]); }} className="admin-button admin-button--secondary admin-button--sm"><RotateCcw className="admin-button__icon" />Restore defaults</button><button type="button" disabled={saving} onClick={saveSupplierTaxonomy} className="admin-button admin-button--primary"><Save className="admin-button__icon" />{saving ? "Saving…" : "Save platform taxonomy"}</button></div></header>
      <div className="supplier-taxonomy-manager__grid">
        <section className="supplier-taxonomy-list-card"><div className="supplier-taxonomy-list-card__heading"><div><strong>Supplier categories</strong><span>{supplierCategories.length} platform options</span></div><button type="button" onClick={() => setSupplierCategories((current) => [...current, `New category ${current.length + 1}`])} className="admin-button admin-button--secondary admin-button--sm"><Plus className="admin-button__icon" />Add category</button></div><div className="supplier-taxonomy-list">{supplierCategories.map((category, index) => <div key={`${index}-${category}`} className="supplier-taxonomy-row"><input value={category} onChange={(event) => updateSupplierCategory(index, event.target.value)} aria-label={`Platform supplier category ${index + 1}`} /><div className="supplier-taxonomy-row__actions"><button type="button" disabled={index === 0} onClick={() => moveSupplierCategory(index, -1)} title="Move up"><ChevronUp /></button><button type="button" disabled={index === supplierCategories.length - 1} onClick={() => moveSupplierCategory(index, 1)} title="Move down"><ChevronDown /></button><button type="button" disabled={supplierCategories.length <= 1} onClick={() => removeSupplierCategory(index)} title="Remove category"><Trash2 /></button></div></div>)}</div></section>
        <section className="supplier-taxonomy-list-card"><div className="supplier-taxonomy-list-card__heading"><div><strong>Wedding roles</strong><span>{supplierRoles.length} platform options</span></div><button type="button" onClick={() => setSupplierRoles((current) => [...current, { name: `New role ${current.length + 1}`, category: supplierCategories[0] || "Other" }])} className="admin-button admin-button--secondary admin-button--sm"><Plus className="admin-button__icon" />Add role</button></div><div className="supplier-taxonomy-list">{supplierRoles.map((role, index) => <div key={`${index}-${role.name}`} className="supplier-taxonomy-row supplier-taxonomy-row--role"><input value={role.name} onChange={(event) => setSupplierRoles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} aria-label={`Platform Wedding role ${index + 1}`} /><select value={role.category} onChange={(event) => setSupplierRoles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, category: event.target.value } : item))}>{supplierCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select><div className="supplier-taxonomy-row__actions"><button type="button" disabled={index === 0} onClick={() => moveSupplierRole(index, -1)} title="Move up"><ChevronUp /></button><button type="button" disabled={index === supplierRoles.length - 1} onClick={() => moveSupplierRole(index, 1)} title="Move down"><ChevronDown /></button><button type="button" disabled={supplierRoles.length <= 1} onClick={() => setSupplierRoles((current) => current.filter((_, itemIndex) => itemIndex !== index))} title="Remove role"><Trash2 /></button></div></div>)}</div></section>
      </div>
    </section> : null}

    {section === "modules" ? <section className="platform-branding-editor">
      <header className="platform-branding-editor__toolbar">
        <div className="platform-branding-editor__summary">
          <div>
            <p className="admin-eyebrow">Global platform presentation</p>
            <h2>Branding &amp; modules</h2>
            <p>Assign uploaded artwork and control the shared visual system used across every WedPlanned business.</p>
          </div>
          <AdminStatus tone={brandingDirty ? "warning" : "success"}>
            {brandingDirty
              ? `${changedModuleCount + (identityDirty ? 1 : 0)} unsaved section${changedModuleCount + (identityDirty ? 1 : 0) === 1 ? "" : "s"}`
              : "All changes saved"}
          </AdminStatus>
        </div>

        <div className="platform-branding-editor__actions">
          <Link
            to="/admin/platform?section=assets"
            className="admin-button admin-button--secondary"
          >
            <Images className="admin-button__icon" />
            Manage assets
          </Link>

          <AdminButton
            variant="secondary"
            icon={RotateCcw}
            disabled={saving || !brandingDirty}
            onClick={resetBrandingDraft}
          >
            Reset changes
          </AdminButton>

          <AdminButton
            variant="primary"
            icon={Save}
            disabled={saving || !brandingDirty}
            onClick={saveBrandingAndModules}
          >
            {saving ? "Saving…" : "Save changes"}
          </AdminButton>
        </div>
      </header>

      <AdminPanel
        title="WedPlanned platform identity"
        description="Global artwork used by the application shell and compact mobile presentation."
        icon={Palette}
        actions={
          <AdminStatus tone={identityDirty ? "warning" : "info"}>
            {identityDirty ? "Changed" : "Global"}
          </AdminStatus>
        }
      >
        <div className="platform-identity-editor">
          <div className="platform-identity-preview-grid">
            <div className="platform-identity-preview platform-identity-preview--light">
              <span>Light background wordmark</span>
              {platformIdentity.wordmarkUrl
                ? <img
                    src={platformIdentity.wordmarkUrl}
                    alt={platformIdentity.platformName}
                  />
                : <AdminModuleWordmark
                    label={platformIdentity.platformName}
                  />}
            </div>

            <div className="platform-identity-preview platform-identity-preview--dark">
              <span>Dark background wordmark</span>
              {platformIdentity.darkWordmarkUrl || platformIdentity.wordmarkUrl
                ? <img
                    src={platformIdentity.darkWordmarkUrl || platformIdentity.wordmarkUrl}
                    alt={platformIdentity.platformName}
                  />
                : <AdminModuleWordmark
                    label={platformIdentity.platformName}
                  />}
            </div>

            <div className="platform-identity-preview platform-identity-preview--compact">
              <span>Compact / mobile identity</span>
              {platformIdentity.compactWordmarkUrl
                ? <img
                    src={platformIdentity.compactWordmarkUrl}
                    alt={platformIdentity.platformName}
                  />
                : platformIdentity.iconUrl
                  ? <img
                      src={platformIdentity.iconUrl}
                      alt={platformIdentity.platformName}
                    />
                  : <strong>WP</strong>}
            </div>
          </div>

          <section className="platform-module-control-group">
            <header>
              <strong>Platform artwork</strong>
              <span>Choose uploaded wordmark and icon assets.</span>
            </header>

            <div className="platform-module-field-grid">
              <AdminField label="Accessible platform name">
                <FieldInput
                  value={platformIdentity.platformName}
                  onChange={(value) => {
                    setPlatformIdentity((current) => ({
                      ...current,
                      platformName: value,
                    }));
                    setMessage("");
                    setError("");
                  }}
                />
              </AdminField>

              <AdminField label="Light background wordmark">
                <FieldSelect
                  value={platformIdentity.wordmarkUrl}
                  onChange={(value) => {
                    setPlatformIdentity((current) => ({
                      ...current,
                      wordmarkUrl: value,
                    }));
                    setMessage("");
                    setError("");
                  }}
                >
                  <option value="">Use text fallback</option>
                  {platformIdentity.wordmarkUrl
                    && !logoAssets.some(
                      (asset) => asset.url === platformIdentity.wordmarkUrl,
                    )
                    ? <option value={platformIdentity.wordmarkUrl}>Current assigned asset</option>
                    : null}
                  {logoAssets.map((asset) => (
                    <option key={asset.id} value={asset.url}>
                      {asset.name}
                    </option>
                  ))}
                </FieldSelect>
              </AdminField>

              <AdminField label="Dark background wordmark">
                <FieldSelect
                  value={platformIdentity.darkWordmarkUrl}
                  onChange={(value) => {
                    setPlatformIdentity((current) => ({
                      ...current,
                      darkWordmarkUrl: value,
                    }));
                    setMessage("");
                    setError("");
                  }}
                >
                  <option value="">
                    Use light background wordmark
                  </option>

                  {platformIdentity.darkWordmarkUrl
                    && !logoAssets.some(
                      (asset) =>
                        asset.url === platformIdentity.darkWordmarkUrl,
                    )
                    ? (
                      <option value={platformIdentity.darkWordmarkUrl}>
                        Current assigned asset
                      </option>
                    )
                    : null}

                  {logoAssets.map((asset) => (
                    <option key={asset.id} value={asset.url}>
                      {asset.name}
                    </option>
                  ))}
                </FieldSelect>
              </AdminField>

              <AdminField label="Compact / mobile wordmark">
                <FieldSelect
                  value={platformIdentity.compactWordmarkUrl}
                  onChange={(value) => {
                    setPlatformIdentity((current) => ({
                      ...current,
                      compactWordmarkUrl: value,
                    }));
                    setMessage("");
                    setError("");
                  }}
                >
                  <option value="">Use platform icon</option>
                  {platformIdentity.compactWordmarkUrl
                    && !logoAssets.some(
                      (asset) =>
                        asset.url === platformIdentity.compactWordmarkUrl,
                    )
                    ? <option value={platformIdentity.compactWordmarkUrl}>Current assigned asset</option>
                    : null}
                  {logoAssets.map((asset) => (
                    <option key={asset.id} value={asset.url}>
                      {asset.name}
                    </option>
                  ))}
                </FieldSelect>
              </AdminField>

              <AdminField label="Platform icon">
                <FieldSelect
                  value={platformIdentity.iconUrl}
                  onChange={(value) => {
                    setPlatformIdentity((current) => ({
                      ...current,
                      iconUrl: value,
                    }));
                    setMessage("");
                    setError("");
                  }}
                >
                  <option value="">Use built-in icon</option>
                  {platformIdentity.iconUrl
                    && !iconAssets.some(
                      (asset) => asset.url === platformIdentity.iconUrl,
                    )
                    ? <option value={platformIdentity.iconUrl}>Current assigned asset</option>
                    : null}
                  {iconAssets.map((asset) => (
                    <option key={asset.id} value={asset.url}>
                      {asset.name}
                    </option>
                  ))}
                </FieldSelect>
              </AdminField>
            </div>
          </section>

          <section className="platform-module-control-group">
            <header>
              <strong>Global Admin typography</strong>
              <span>
                Platform-wide font sizing. 100% reproduces the current Admin interface.
                Module-specific controls below can refine these values.
              </span>
            </header>

            <div className="platform-module-field-grid platform-module-field-grid--scales">
              <PlatformScaleControl
                label="Overall Admin text"
                value={platformIdentity.adminFontScale}
                help="Master scale applied across Admin body text, records, forms and supporting content."
                onChange={(value) => {
                  setPlatformIdentity((current) => ({
                    ...current,
                    adminFontScale: value,
                  }));
                  setMessage("");
                  setError("");
                }}
              />

              <PlatformScaleControl
                label="Headings"
                value={platformIdentity.adminHeadingFontScale}
                help="Additional scale for page, panel and operational headings."
                onChange={(value) => {
                  setPlatformIdentity((current) => ({
                    ...current,
                    adminHeadingFontScale: value,
                  }));
                  setMessage("");
                  setError("");
                }}
              />

              <PlatformScaleControl
                label="Buttons & controls"
                value={platformIdentity.adminButtonFontScale}
                help="Additional scale for buttons and primary controls."
                onChange={(value) => {
                  setPlatformIdentity((current) => ({
                    ...current,
                    adminButtonFontScale: value,
                  }));
                  setMessage("");
                  setError("");
                }}
              />

              <PlatformScaleControl
                label="Navigation & menus"
                value={platformIdentity.adminNavigationFontScale}
                help="Additional scale for desktop and mobile navigation labels."
                onChange={(value) => {
                  setPlatformIdentity((current) => ({
                    ...current,
                    adminNavigationFontScale: value,
                  }));
                  setMessage("");
                  setError("");
                }}
              />

              <PlatformScaleControl
                label="Status / helper text"
                value={platformIdentity.adminMetaFontScale}
                help="Additional scale for badges, metadata, helper copy and compact labels."
                onChange={(value) => {
                  setPlatformIdentity((current) => ({
                    ...current,
                    adminMetaFontScale: value,
                  }));
                  setMessage("");
                  setError("");
                }}
              />
            </div>
          </section>

          <section className="platform-module-control-group">
            <header>
              <strong>Global Admin logo sizing</strong>
              <span>
                Default logo scales for page headers, desktop navigation and mobile navigation.
              </span>
            </header>

            <div className="platform-module-field-grid platform-module-field-grid--scales">
              <PlatformScaleControl
                label="Page-header logos"
                value={platformIdentity.pageHeaderLogoScale}
                onChange={(value) => {
                  setPlatformIdentity((current) => ({
                    ...current,
                    pageHeaderLogoScale: value,
                  }));
                  setMessage("");
                  setError("");
                }}
              />

              <PlatformScaleControl
                label="Desktop sidebar logos"
                value={platformIdentity.sidebarLogoScale}
                onChange={(value) => {
                  setPlatformIdentity((current) => ({
                    ...current,
                    sidebarLogoScale: value,
                  }));
                  setMessage("");
                  setError("");
                }}
              />

              <PlatformScaleControl
                label="Mobile logos"
                value={platformIdentity.mobileLogoScale}
                onChange={(value) => {
                  setPlatformIdentity((current) => ({
                    ...current,
                    mobileLogoScale: value,
                  }));
                  setMessage("");
                  setError("");
                }}
              />
            </div>
          </section>

        </div>
      </AdminPanel>

      <div className="platform-module-config-grid">
        {modules.map((module) => {
          const definition = adminModules.find(
            (item) => item.key === module.moduleKey,
          )!;
          const selectedIcon = adminModuleIconOptions.find(
            (option) => option.key === module.iconKey,
          )?.icon || definition.icon;
          const PreviewIcon = selectedIcon;
          const savedModule = savedModules.find(
            (candidate) => candidate.moduleKey === module.moduleKey,
          );
          const moduleDirty = !savedModule
            || moduleFingerprint(module) !== moduleFingerprint(savedModule);
          const markInLibrary = iconAssets.some(
            (asset) => asset.url === module.markUrl,
          );
          const wordmarkInLibrary = logoAssets.some(
            (asset) => asset.url === module.wordmarkUrl,
          );
          const darkWordmarkInLibrary = logoAssets.some(
            (asset) => asset.url === module.darkWordmarkUrl,
          );
          const compactInLibrary = logoAssets.some(
            (asset) => asset.url === module.compactWordmarkUrl,
          );

          return <AdminPanel
            key={module.moduleKey}
            className="platform-module-config-card"
            title={definition.label}
            description={definition.description}
            icon={PreviewIcon}
            actions={
              <AdminStatus tone={moduleDirty ? "warning" : "info"}>
                {moduleDirty ? "Changed" : "Global"}
              </AdminStatus>
            }
          >
            <div
              className="platform-module-preview platform-module-preview--brand"
              style={{
                "--preview-accent": module.accentColor,
                "--preview-page": module.pageBackgroundColor,
                "--preview-surface": module.sectionBackgroundColor,
                "--preview-record": module.recordBackgroundColor,
              } as CSSProperties}
              data-button-style={module.activeButtonStyle}
              data-panel-style={module.panelAccentStyle}
            >
              <span className="platform-module-preview__brand">
                {module.markUrl
                  ? <img
                      className="platform-module-preview__mark"
                      src={module.markUrl}
                      alt=""
                      aria-hidden="true"
                    />
                  : <PreviewIcon />}

                {module.darkWordmarkUrl || module.wordmarkUrl
                  ? <img
                      className="platform-module-preview__wordmark"
                      src={module.darkWordmarkUrl || module.wordmarkUrl}
                      alt={definition.label}
                    />
                  : <AdminModuleWordmark label={definition.shortLabel} />}
              </span>

              <span className="platform-module-preview__nav">
                Active navigation
              </span>
              <span className="platform-module-preview__panel">
                Section surface
              </span>
              <span className="platform-module-preview__record">
                Record card
              </span>
            </div>

            <div className="platform-module-control-stack">
              <section className="platform-module-control-group">
                <header>
                  <strong>Identity</strong>
                  <span>Icon plus light, dark and compact wordmarks.</span>
                </header>

                <div className="platform-module-field-grid">
                  <AdminField label="Fallback icon">
                    <FieldSelect
                      value={module.iconKey}
                      onChange={(value) => updateModule(
                        module.moduleKey,
                        { iconKey: value },
                      )}
                    >
                      {adminModuleIconOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </FieldSelect>
                  </AdminField>

                  <AdminField label="Module icon asset">
                    <FieldSelect
                      value={module.markUrl}
                      onChange={(value) => updateModule(
                        module.moduleKey,
                        { markUrl: value },
                      )}
                    >
                      <option value="">Use fallback icon</option>
                      {module.markUrl && !markInLibrary
                        ? <option value={module.markUrl}>Current assigned asset</option>
                        : null}
                      {iconAssets.map((asset) => (
                        <option key={asset.id} value={asset.url}>
                          {asset.name}
                        </option>
                      ))}
                    </FieldSelect>
                  </AdminField>

                  <AdminField label="Light background wordmark">
                    <FieldSelect
                      value={module.wordmarkUrl}
                      onChange={(value) => updateModule(
                        module.moduleKey,
                        { wordmarkUrl: value },
                      )}
                    >
                      <option value="">Use text fallback</option>
                      {module.wordmarkUrl && !wordmarkInLibrary
                        ? <option value={module.wordmarkUrl}>Current assigned asset</option>
                        : null}
                      {logoAssets.map((asset) => (
                        <option key={asset.id} value={asset.url}>
                          {asset.name}
                        </option>
                      ))}
                    </FieldSelect>
                  </AdminField>

                  <AdminField label="Dark background wordmark">
                    <FieldSelect
                      value={module.darkWordmarkUrl}
                      onChange={(value) => updateModule(
                        module.moduleKey,
                        { darkWordmarkUrl: value },
                      )}
                    >
                      <option value="">
                        Use light background wordmark
                      </option>

                      {module.darkWordmarkUrl
                        && !darkWordmarkInLibrary
                        ? (
                          <option value={module.darkWordmarkUrl}>
                            Current assigned asset
                          </option>
                        )
                        : null}

                      {logoAssets.map((asset) => (
                        <option key={asset.id} value={asset.url}>
                          {asset.name}
                        </option>
                      ))}
                    </FieldSelect>
                  </AdminField>

                  <AdminField label="Compact / mobile wordmark">
                    <FieldSelect
                      value={module.compactWordmarkUrl}
                      onChange={(value) => updateModule(
                        module.moduleKey,
                        { compactWordmarkUrl: value },
                      )}
                    >
                      <option value="">Use desktop wordmark</option>
                      {module.compactWordmarkUrl && !compactInLibrary
                        ? <option value={module.compactWordmarkUrl}>Current assigned asset</option>
                        : null}
                      {logoAssets.map((asset) => (
                        <option key={asset.id} value={asset.url}>
                          {asset.name}
                        </option>
                      ))}
                    </FieldSelect>
                  </AdminField>
                </div>
              </section>

              <section className="platform-module-control-group">
                <header>
                  <strong>Colour system</strong>
                  <span>Page, panel and operational record surfaces.</span>
                </header>

                <div className="platform-module-field-grid">
                  <AdminField label="Accent colour">
                    <div className="platform-colour-control">
                      <input
                        type="color"
                        value={module.accentColor}
                        onChange={(event) => updateModule(
                          module.moduleKey,
                          {
                            accentColor:
                              event.target.value.toUpperCase(),
                          },
                        )}
                      />
                      <FieldInput
                        value={module.accentColor}
                        onChange={(value) => updateModule(
                          module.moduleKey,
                          { accentColor: value.toUpperCase() },
                        )}
                      />
                    </div>
                  </AdminField>

                  <AdminField label="Page background">
                    <div className="platform-colour-control">
                      <input
                        type="color"
                        value={module.pageBackgroundColor}
                        onChange={(event) => updateModule(
                          module.moduleKey,
                          {
                            pageBackgroundColor:
                              event.target.value.toUpperCase(),
                          },
                        )}
                      />
                      <FieldInput
                        value={module.pageBackgroundColor}
                        onChange={(value) => updateModule(
                          module.moduleKey,
                          {
                            pageBackgroundColor:
                              value.toUpperCase(),
                          },
                        )}
                      />
                    </div>
                  </AdminField>

                  <AdminField label="Section background">
                    <div className="platform-colour-control">
                      <input
                        type="color"
                        value={module.sectionBackgroundColor}
                        onChange={(event) => updateModule(
                          module.moduleKey,
                          {
                            sectionBackgroundColor:
                              event.target.value.toUpperCase(),
                          },
                        )}
                      />
                      <FieldInput
                        value={module.sectionBackgroundColor}
                        onChange={(value) => updateModule(
                          module.moduleKey,
                          {
                            sectionBackgroundColor:
                              value.toUpperCase(),
                          },
                        )}
                      />
                    </div>
                  </AdminField>

                  <AdminField
                    label="Record card background"
                    help="Used by repeating lead, Job, client and schedule records."
                  >
                    <div className="platform-colour-control">
                      <input
                        type="color"
                        value={module.recordBackgroundColor}
                        onChange={(event) => updateModule(
                          module.moduleKey,
                          {
                            recordBackgroundColor:
                              event.target.value.toUpperCase(),
                          },
                        )}
                      />
                      <FieldInput
                        value={module.recordBackgroundColor}
                        onChange={(value) => updateModule(
                          module.moduleKey,
                          {
                            recordBackgroundColor:
                              value.toUpperCase(),
                          },
                        )}
                      />
                    </div>
                  </AdminField>
                </div>
              </section>


          <section className="platform-module-control-group">
            <header>
              <strong>Desktop navigation</strong>
              <span>
                Optional module-specific colours for the left sidebar and its navigation buttons.
                Leave a colour blank to retain the existing default behaviour.
              </span>
            </header>

            <div className="platform-module-field-grid">
              <PlatformOptionalColourControl
                label="Sidebar background"
                value={module.desktopNavBackgroundColor}
                fallback="#111111"
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    desktopNavBackgroundColor: value,
                  })
                }
              />

              <PlatformOptionalColourControl
                label="Menu text & icons"
                value={module.desktopNavTextColor}
                fallback="#FFFFFF"
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    desktopNavTextColor: value,
                  })
                }
              />

              <PlatformOptionalColourControl
                label="Normal menu button"
                value={module.desktopNavButtonColor}
                fallback="#191919"
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    desktopNavButtonColor: value,
                  })
                }
              />

              <PlatformOptionalColourControl
                label="Active menu button"
                value={module.desktopNavActiveColor}
                fallback={module.accentColor}
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    desktopNavActiveColor: value,
                  })
                }
              />

              <PlatformOptionalColourControl
                label="Active text & icons"
                value={module.desktopNavActiveTextColor}
                fallback="#FFFFFF"
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    desktopNavActiveTextColor: value,
                  })
                }
              />
            </div>
          </section>

          <section className="platform-module-control-group">
            <header>
              <strong>Mobile navigation</strong>
              <span>
                Independent colours for the mobile module picker, More menu and bottom navigation.
              </span>
            </header>

            <div className="platform-module-field-grid">
              <PlatformOptionalColourControl
                label="Mobile menu background"
                value={module.mobileNavBackgroundColor}
                fallback="#FFFFFF"
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    mobileNavBackgroundColor: value,
                  })
                }
              />

              <PlatformOptionalColourControl
                label="Mobile text & icons"
                value={module.mobileNavTextColor}
                fallback="#222222"
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    mobileNavTextColor: value,
                  })
                }
              />

              <PlatformOptionalColourControl
                label="Normal mobile button"
                value={module.mobileNavButtonColor}
                fallback="#FAF9F7"
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    mobileNavButtonColor: value,
                  })
                }
              />

              <PlatformOptionalColourControl
                label="Active mobile button"
                value={module.mobileNavActiveColor}
                fallback={module.accentColor}
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    mobileNavActiveColor: value,
                  })
                }
              />

              <PlatformOptionalColourControl
                label="Active mobile text & icons"
                value={module.mobileNavActiveTextColor}
                fallback="#FFFFFF"
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    mobileNavActiveTextColor: value,
                  })
                }
              />
            </div>
          </section>

          <section className="platform-module-control-group">
            <header>
              <strong>Typography & logo sizing</strong>
              <span>
                Module-specific scales multiply the global Admin defaults above.
                100% leaves the global value unchanged.
              </span>
            </header>

            <div className="platform-module-field-grid platform-module-field-grid--scales">
              <PlatformScaleControl
                label="All module text"
                value={module.moduleFontScale}
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    moduleFontScale: value,
                  })
                }
              />

              <PlatformScaleControl
                label="Module headings"
                value={module.headingFontScale}
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    headingFontScale: value,
                  })
                }
              />

              <PlatformScaleControl
                label="Module buttons"
                value={module.buttonFontScale}
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    buttonFontScale: value,
                  })
                }
              />

              <PlatformScaleControl
                label="Navigation text"
                value={module.navigationFontScale}
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    navigationFontScale: value,
                  })
                }
              />

              <PlatformScaleControl
                label="Page-header logo"
                value={module.pageHeaderLogoScale}
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    pageHeaderLogoScale: value,
                  })
                }
              />

              <PlatformScaleControl
                label="Sidebar logo"
                value={module.sidebarLogoScale}
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    sidebarLogoScale: value,
                  })
                }
              />

              <PlatformScaleControl
                label="Mobile logo"
                value={module.mobileLogoScale}
                onChange={(value) =>
                  updateModule(module.moduleKey, {
                    mobileLogoScale: value,
                  })
                }
              />
            </div>
          </section>

<section className="platform-module-control-group">
                <header>
                  <strong>Interaction</strong>
                  <span>Navigation and primary panel treatments.</span>
                </header>

                <div className="platform-module-field-grid">
                  <AdminField label="Active-button appearance">
                    <FieldSelect
                      value={module.activeButtonStyle}
                      onChange={(value) => updateModule(
                        module.moduleKey,
                        {
                          activeButtonStyle:
                            value as PlatformModuleConfiguration["activeButtonStyle"],
                        },
                      )}
                    >
                      <option value="solid">Solid accent</option>
                      <option value="soft">Soft accent</option>
                      <option value="outline">Accent outline</option>
                    </FieldSelect>
                  </AdminField>

                  <AdminField label="Main-panel accent">
                    <FieldSelect
                      value={module.panelAccentStyle}
                      onChange={(value) => updateModule(
                        module.moduleKey,
                        {
                          panelAccentStyle:
                            value as PlatformModuleConfiguration["panelAccentStyle"],
                        },
                      )}
                    >
                      <option value="edge">Accent edge</option>
                      <option value="wash">Accent wash</option>
                      <option value="header">Header accent</option>
                    </FieldSelect>
                  </AdminField>
                </div>
              </section>
            </div>
          </AdminPanel>;
        })}
      </div>
    </section> : null}

    {section === "assets" ? <div className="space-y-5">
      <AdminPanel title="Add platform brand asset" description="Upload reusable transparent wordmarks and icons. PNG and WebP are recommended; JPEG is supported for legacy artwork. Files may be up to 3 MB." icon={ImagePlus}>
        <div className="platform-asset-upload-grid">
          <AdminField label="Asset name"><FieldInput value={assetName} onChange={setAssetName} placeholder="For example: WedPlanned monogram" /></AdminField>
          <AdminField label="Asset type"><FieldSelect value={assetType} onChange={(value) => setAssetType(value as "logo" | "icon")}><option value="logo">Logo / mark</option><option value="icon">Icon</option></FieldSelect></AdminField>
          <AdminField label="Image file"><input key={assetInputKey} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setAssetFile(event.target.files?.[0] || null)} /></AdminField>
          <AdminButton variant="primary" icon={Upload} disabled={assetUploading || !assetFile} onClick={uploadBrandAsset}>{assetUploading ? "Uploading…" : "Upload asset"}</AdminButton>
        </div>
      </AdminPanel>
      <AdminPanel title="WedPlanned asset library" description="Platform-owned artwork for desktop wordmarks, compact mobile identities and module icons. Assigned assets cannot be deleted." icon={Images} actions={<AdminStatus tone="info">{platformAdmin.brandAssets.length} assets</AdminStatus>}>
        {platformAdmin.brandAssets.length ? <div className="platform-brand-asset-grid">{platformAdmin.brandAssets.map((asset) => <article key={asset.id} className="platform-brand-asset-card"><div className="platform-brand-asset-card__preview"><img src={asset.url} alt="" /></div><div className="platform-brand-asset-card__body"><div><strong>{asset.name}</strong><span>{asset.assetType} · {(asset.sizeBytes / 1024).toFixed(0)} KB</span></div><button type="button" className="admin-icon-control admin-icon-control--danger" onClick={() => deleteBrandAsset(asset.id, asset.name)} disabled={saving} title="Delete asset" aria-label={`Delete ${asset.name}`}><Trash2 /></button></div></article>)}</div> : <div className="admin-empty-state"><span className="admin-empty-state__icon"><Images /></span><h3>No platform brand assets</h3><p>Upload a logo or icon above, then assign it to a module from Module configuration.</p></div>}
      </AdminPanel>
    </div> : null}

    {section === "operations" ? <div className="space-y-5">
      <AdminPanel title="Workspace operation boundary" description="Every operation below is explicitly scoped to the selected business workspace." icon={ShieldCheck}>
        <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)] md:items-end"><AdminField label="Business workspace"><FieldSelect value={selectedWorkspaceId} onChange={setSelectedWorkspaceId}>{platformAdmin.workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.status}</option>)}</FieldSelect></AdminField><div className="rounded-xl bg-[#f5f3ef] px-4 py-3 text-xs text-neutral-600">{selectedWorkspace ? <><strong>{selectedWorkspace.name}</strong><span className="ml-2">{selectedWorkspace.activeMemberCount} active members · {selectedWorkspace.verifiedDomainCount} verified domains</span></> : "Select a workspace."}</div></div>
      </AdminPanel>
      {operationsLoading && !operations ? <div className="rounded-2xl bg-white p-6 text-xs text-neutral-500 shadow-sm ring-1 ring-black/[0.06]">Loading workspace operations…</div> : operations ? <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]"><div className="space-y-5">
        <AdminPanel title="Time-bounded support access" description="Open an audited support window for the selected business." icon={ShieldCheck}>{operations.support.activeGrant ? <div className="rounded-xl bg-emerald-50 p-4 text-xs text-emerald-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Support access is active</p><p className="mt-1 text-[10px]">{operations.support.activeGrant.scope === "manage" ? "Managed" : "Read-only"} · expires {new Date(operations.support.activeGrant.expiresAt).toLocaleString("en-GB")}</p></div><AdminButton variant="secondary" disabled={saving} onClick={() => runOperation(() => AdminApiService.revokeWedPlannedSupport(operations.support.activeGrant!.id, selectedWorkspaceId), "Support access revoked.")}>Revoke access</AdminButton></div></div> : <div className="rounded-xl bg-[#f5f3ef] p-4 text-xs text-neutral-600">No active support access for this workspace.</div>}<div className="mt-4 grid gap-3 md:grid-cols-[150px_130px_minmax(0,1fr)_auto] md:items-end"><AdminField label="Access level"><FieldSelect value={supportScope} onChange={(value) => setSupportScope(value as "read" | "manage")}><option value="read">Read only</option><option value="manage">Managed support</option></FieldSelect></AdminField><AdminField label="Duration"><FieldSelect value={String(supportHours)} onChange={(value) => setSupportHours(Number(value))}><option value="1">1 hour</option><option value="4">4 hours</option><option value="24">24 hours</option><option value="72">72 hours</option></FieldSelect></AdminField><AdminField label="Reason"><FieldInput value={supportReason} onChange={setSupportReason} placeholder="Support case or reason" /></AdminField><AdminButton variant="primary" icon={Clock} disabled={saving} onClick={async () => { if (await runOperation(() => AdminApiService.grantWedPlannedSupport(supportScope, supportHours, supportReason, selectedWorkspaceId), "Support access enabled.")) setSupportReason(""); }}>Enable support</AdminButton></div></AdminPanel>
        <AdminPanel title="Workspace data export" description="Create a structured JSON export for the selected business only." icon={Download}><div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#f5f3ef] p-4"><div><p className="text-xs font-semibold">{operations.workspace.name}</p><p className="mt-1 text-[10px] text-neutral-500">Binary photographs are not duplicated; asset and storage references are included.</p></div><AdminButton variant="primary" icon={Download} onClick={() => { window.location.href = AdminApiService.wedPlannedExportUrl(selectedWorkspaceId); }}>Download JSON export</AdminButton></div><div className="mt-4 space-y-2">{operations.exports.length ? operations.exports.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] px-3 py-3 text-[10px]"><span>{item.fileName || "Workspace export"} · {item.recordCount.toLocaleString()} records</span><AdminStatus tone={item.status === "completed" ? "success" : "warning"}>{item.status}</AdminStatus></div>) : <p className="text-xs text-neutral-500">No exports recorded.</p>}</div></AdminPanel>
      </div><div className="space-y-5">
        <AdminPanel title="Business closure" description="Deletion remains staged and does not immediately remove records or assets." icon={AlertTriangle}>{operations.deletion.activeRequest ? <div className="rounded-xl bg-amber-50 p-4 text-xs text-amber-950"><p className="font-semibold">Deletion request open</p><p className="mt-1 text-[10px]">Review after {new Date(operations.deletion.activeRequest.scheduledFor).toLocaleString("en-GB")}</p><AdminButton className="mt-3" variant="secondary" disabled={saving} onClick={() => runOperation(() => AdminApiService.cancelWedPlannedDeletion(operations.deletion.activeRequest!.id, selectedWorkspaceId), "Deletion request cancelled.")}>Cancel request</AdminButton></div> : <div className="space-y-3"><p className="rounded-xl bg-[#f5f3ef] px-3 py-3 text-[10px] text-neutral-600">A {operations.deletion.coolingOffDays}-day cooling-off period starts when submitted.</p><AdminField label={`Type ${operations.workspace.name} to confirm`}><FieldInput value={deletionConfirmation} onChange={setDeletionConfirmation} /></AdminField><AdminField label="Reason"><textarea value={deletionReason} onChange={(event) => setDeletionReason(event.target.value)} rows={3} className="admin-textarea" /></AdminField><AdminButton variant="secondary" icon={AlertTriangle} disabled={saving || deletionConfirmation !== operations.workspace.name} onClick={async () => { if (await runOperation(() => AdminApiService.requestWedPlannedDeletion(deletionConfirmation, deletionReason, selectedWorkspaceId), "Staged deletion request created.")) { setDeletionConfirmation(""); setDeletionReason(""); } }}>Request staged deletion</AdminButton></div>}</AdminPanel>
        <AdminPanel title="Recent support activity" compact><div className="platform-admin-audit-list">{operations.support.recentEvents.length ? operations.support.recentEvents.slice(0, 8).map((event) => <div key={event.id}><strong>{event.eventType.replace(/\./g, " ")}</strong><span>{event.supportEmail || "WedPlanned support"} · {new Date(event.createdAt).toLocaleString("en-GB")}</span></div>) : <p className="text-xs text-neutral-500">No support activity recorded.</p>}</div></AdminPanel>
      </div></div> : null}
    </div> : null}

    {section === "access" ? <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
      <AdminPanel title="Platform identities" description="Platform roles are global. Business roles remain workspace memberships and do not grant platform administration." icon={ContactRound}><div className="platform-admin-user-list">{platformAdmin.users.map((user) => <div key={user.id}><div><strong>{user.displayName || user.email}</strong><span>{user.email} · {user.membershipCount} active workspace membership{user.membershipCount === 1 ? "" : "s"}</span></div><div className="flex items-center gap-2"><AdminStatus tone={user.platformRole === "platform_admin" ? "warning" : user.platformRole === "support" ? "info" : "neutral"}>{user.platformRole.replace(/_/g, " ")}</AdminStatus><AdminStatus tone={user.status === "active" ? "success" : "warning"}>{user.status}</AdminStatus></div></div>)}</div></AdminPanel>
      <div className="space-y-5"><AdminPanel title="Enforced boundary" icon={ShieldCheck} compact><div className="space-y-3 text-xs"><div className="flex justify-between gap-4"><span className="text-neutral-500">Current identity</span><span className="text-right font-medium">{auth.email}</span></div><div className="flex justify-between gap-4"><span className="text-neutral-500">Platform role</span><span className="font-medium">{auth.platformRole}</span></div><div className="flex justify-between gap-4"><span className="text-neutral-500">Server permission</span><span className="font-medium">platform:admin</span></div><div className="flex justify-between gap-4"><span className="text-neutral-500">Support mode</span><span className="font-medium">Blocked from writes</span></div></div></AdminPanel><AdminPanel title="Access rules" icon={Check}><div className="admin-module-guidance"><div><ShieldCheck /><span><strong>Route and API protected</strong><small>Hidden navigation is not the security boundary. The platform-admin API independently checks the global role and permission.</small></span></div><div><Building2 /><span><strong>Workspace owners stay workspace-scoped</strong><small>Owners retain Business profile, services, team, portal and domain settings without access to global controls.</small></span></div><div><Globe2 /><span><strong>Explicit cross-workspace operations</strong><small>A platform administrator must select the target workspace; every operation remains bound to that workspace ID.</small></span></div></div></AdminPanel></div>
    </div> : null}
  </AdminPage>;
}
