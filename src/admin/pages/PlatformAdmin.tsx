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
  Globe2,
  Images,
  Palette,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
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
  PlatformModuleConfiguration,
  WedPlannedOperationsPayload,
} from "../types/platform";

type SectionKey = "overview" | "businesses" | "taxonomy" | "modules" | "operations" | "access";

function sectionFromSearch(params: URLSearchParams): SectionKey {
  const value = params.get("section");
  return value === "businesses" || value === "taxonomy" || value === "modules" || value === "operations" || value === "access" ? value : "overview";
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

const moduleLabels = new Map(adminModules.map((module) => [module.key, module.label]));

export function PlatformAdmin() {
  const { auth } = useProfessionalAuth();
  const [searchParams] = useSearchParams();
  const section = sectionFromSearch(searchParams);
  const [platformAdmin, setPlatformAdmin] = useState<PlatformAdministrationPayload | null>(null);
  const [modules, setModules] = useState<PlatformModuleConfiguration[]>(defaultAdminModuleConfigurations);
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

  function apply(next: PlatformAdministrationPayload) {
    setPlatformAdmin(next);
    setModules(next.modules?.length ? next.modules : defaultAdminModuleConfigurations);
    const taxonomy = normaliseSupplierTaxonomy(next.supplierTaxonomy?.categories, next.supplierTaxonomy?.roles);
    setSupplierCategories(taxonomy.categories);
    setSupplierRoles(taxonomy.roles);
    setSelectedWorkspaceId((current) => next.workspaces.some((workspace) => workspace.id === current) ? current : next.workspaces[0]?.id || auth.workspaceId);
  }

  useEffect(() => {
    AdminApiService.getPlatformAdministration()
      .then(apply)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load platform administration."))
      .finally(() => setLoading(false));
  }, [auth.workspaceId]);

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

  async function saveModule(module: PlatformModuleConfiguration) {
    await runAdmin(() => AdminApiService.savePlatformModuleConfiguration(module), `${moduleLabels.get(module.moduleKey) || module.moduleKey} module appearance saved.`);
  }

  const selectedWorkspace = useMemo(() => platformAdmin?.workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null, [platformAdmin?.workspaces, selectedWorkspaceId]);

  if (loading) return <div className="admin-page text-sm text-neutral-500">Loading Platform administration…</div>;
  if (!platformAdmin) return <div className="admin-page rounded-xl bg-red-50 p-5 text-sm text-red-800">{error || "Platform administration is unavailable."}</div>;

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
        <Metric value={platformAdmin.supplierTaxonomy.categories.length} label="Supplier categories" detail={`${platformAdmin.supplierTaxonomy.roles.length} Wedding roles`} />
      </section>
      <section className="admin-module-destination-grid">
        <Destination to="/admin/platform?section=businesses" icon={Building2} title="Businesses & workspaces" description="Review every tenant boundary, business status, membership count and verified-domain footprint." meta={`${platformAdmin.summary.activeWorkspaces} active`} />
        <Destination to="/admin/platform?section=taxonomy" icon={Users} title="Supplier taxonomy" description="Manage the canonical supplier categories and Wedding roles shared by every workspace." meta={`${platformAdmin.supplierTaxonomy.roles.length} roles`} />
        <Destination to="/admin/platform?section=modules" icon={Palette} title="Module configuration" description="Control module accents, icons, marks, active buttons and main-panel treatments." meta={`${platformAdmin.modules.length} modules`} />
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

    {section === "modules" ? <div className="platform-module-config-grid">{modules.map((module) => {
      const definition = adminModules.find((item) => item.key === module.moduleKey)!;
      const selectedIcon = adminModuleIconOptions.find((option) => option.key === module.iconKey)?.icon || definition.icon;
      const PreviewIcon = selectedIcon;
      return <AdminPanel key={module.moduleKey} title={definition.label} description={definition.description} icon={PreviewIcon} actions={<AdminStatus tone="info">Global</AdminStatus>}>
        <div className="platform-module-preview" style={{ "--preview-accent": module.accentColor } as CSSProperties} data-button-style={module.activeButtonStyle} data-panel-style={module.panelAccentStyle}><span className="platform-module-preview__button"><PreviewIcon />{definition.shortLabel}</span><span className="platform-module-preview__nav">Active navigation</span><span className="platform-module-preview__panel">Main-panel accent</span></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <AdminField label="Accent colour"><div className="platform-colour-control"><input type="color" value={module.accentColor} onChange={(event) => updateModule(module.moduleKey, { accentColor: event.target.value.toUpperCase() })} /><FieldInput value={module.accentColor} onChange={(value) => updateModule(module.moduleKey, { accentColor: value.toUpperCase() })} /></div></AdminField>
          <AdminField label="Module icon"><FieldSelect value={module.iconKey} onChange={(value) => updateModule(module.moduleKey, { iconKey: value })}>{adminModuleIconOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</FieldSelect></AdminField>
          <AdminField label="Active-button appearance"><FieldSelect value={module.activeButtonStyle} onChange={(value) => updateModule(module.moduleKey, { activeButtonStyle: value as PlatformModuleConfiguration["activeButtonStyle"] })}><option value="solid">Solid accent</option><option value="soft">Soft accent</option><option value="outline">Accent outline</option></FieldSelect></AdminField>
          <AdminField label="Main-panel accent"><FieldSelect value={module.panelAccentStyle} onChange={(value) => updateModule(module.moduleKey, { panelAccentStyle: value as PlatformModuleConfiguration["panelAccentStyle"] })}><option value="edge">Accent edge</option><option value="wash">Accent wash</option><option value="header">Header accent</option></FieldSelect></AdminField>
          <AdminField label="Logo or mark URL" help="Use an https:// URL or same-origin path. Leave empty to use the selected icon." className="md:col-span-2"><FieldInput value={module.markUrl} onChange={(value) => updateModule(module.moduleKey, { markUrl: value })} placeholder="https://… or /assets/mark.svg" /></AdminField>
        </div>
        <div className="mt-4 flex justify-end"><AdminButton variant="primary" icon={Save} disabled={saving} onClick={() => saveModule(module)}>{saving ? "Saving…" : `Save ${definition.shortLabel}`}</AdminButton></div>
      </AdminPanel>;
    })}</div> : null}

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
