import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { AdminApiService, type WorkspaceRecord } from "../services/AdminApiService";
import { SupplierService, type MasterSupplier } from "../services/SupplierService";
import { AdminPage, AdminPageHeader, AdminToolbar } from "../components/ui/AdminUI";
import { AdminSearchSelect, type AdminSearchSelectOption } from "../components/ui/AdminSearchSelect";
import {
  DEFAULT_SUPPLIER_ROLE_DEFINITIONS,
  SUPPLIER_CATEGORY_OPTIONS,
  configuredSupplierCategory,
  normaliseSupplierTaxonomy,
  supplierTaxonomyKey,
  type SupplierRoleDefinition,
} from "../data/supplierTaxonomy";

const EMPTY: MasterSupplier = {
  id: "", name: "", displayName: "", category: "", website: "", instagram: "",
  email: "", phone: "", location: "", county: "", description: "", notes: "",
  status: "active", linkedWeddingCount: 0, linkedWeddings: [],
};

type SortKey = "supplier" | "category";
type SortDirection = "asc" | "desc";

function duplicateName(values: string[]) {
  const seen = new Set<string>();
  for (const value of values) {
    const key = supplierTaxonomyKey(value);
    if (!key) return "Every option needs a name.";
    if (seen.has(key)) return `Duplicate option: ${value.trim()}.`;
    seen.add(key);
  }
  return "";
}

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<MasterSupplier[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceRecord | null>(null);
  const [categories, setCategories] = useState<string[]>([...SUPPLIER_CATEGORY_OPTIONS]);
  const [roles, setRoles] = useState<SupplierRoleDefinition[]>([...DEFAULT_SUPPLIER_ROLE_DEFINITIONS]);
  const [manageLists, setManageLists] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("supplier");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MasterSupplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load(preferredId?: string) {
    const [service, nextWorkspace] = await Promise.all([
      SupplierService.load(),
      AdminApiService.getWorkspace(),
    ]);
    const next = service.getMasterSuppliers();
    const taxonomy = normaliseSupplierTaxonomy(
      nextWorkspace.settings.supplierCategories,
      nextWorkspace.settings.supplierRoles,
    );
    setSuppliers(next);
    setWorkspace(nextWorkspace);
    setCategories(taxonomy.categories);
    setRoles(taxonomy.roles);
    const id = preferredId || activeId || next[0]?.id || null;
    setActiveId(id);
    setDraft(id ? { ...(next.find((item) => item.id === id) || next[0]) } : null);
  }

  useEffect(() => { load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load suppliers.")); }, []);

  const categoryOptions = useMemo<AdminSearchSelectOption[]>(
    () => categories.map((category) => ({ value: category, label: category })),
    [categories],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? suppliers.filter((supplier) => [
          supplier.name, supplier.displayName, supplier.category,
          configuredSupplierCategory(supplier.category, categories), supplier.website,
          supplier.instagram, supplier.email, supplier.location, supplier.county,
        ].some((value) => String(value || "").toLowerCase().includes(q)))
      : [...suppliers];

    return rows.sort((left, right) => {
      if (left.status === "archived" && right.status !== "archived") return 1;
      if (left.status !== "archived" && right.status === "archived") return -1;
      const leftName = left.displayName || left.name;
      const rightName = right.displayName || right.name;
      const leftCategory = configuredSupplierCategory(left.category, categories) || left.category || "Uncategorised";
      const rightCategory = configuredSupplierCategory(right.category, categories) || right.category || "Uncategorised";
      const comparison = sortKey === "category"
        ? leftCategory.localeCompare(rightCategory, undefined, { sensitivity: "base" }) || leftName.localeCompare(rightName, undefined, { sensitivity: "base" })
        : leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [suppliers, query, sortKey, sortDirection, categories]);

  function selectSupplier(supplier: MasterSupplier) {
    setActiveId(supplier.id);
    setDraft({ ...supplier, linkedWeddings: [...supplier.linkedWeddings] });
    setMessage(""); setError("");
  }

  function newSupplier() {
    setManageLists(false);
    setActiveId(null);
    setDraft({ ...EMPTY });
    setMessage(""); setError("");
  }

  function patch(patchValue: Partial<MasterSupplier>) {
    setDraft((current) => current ? { ...current, ...patchValue } : current);
    setMessage(""); setError("");
  }

  function changeSort(nextKey: SortKey) {
    if (sortKey === nextKey) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else { setSortKey(nextKey); setSortDirection("asc"); }
  }

  async function save() {
    if (!draft?.name.trim()) { setError("Supplier name is required."); return; }
    const category = configuredSupplierCategory(draft.category, categories);
    if (!category) { setError("Choose a supplier category from the searchable master list."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const payload = { ...draft, category };
      const saved = draft.id
        ? await AdminApiService.updateMasterSupplier(payload as MasterSupplier & { id: string })
        : await AdminApiService.createMasterSupplier(payload);
      await load(saved.id);
      setMessage(draft.id ? "Supplier updated." : "Supplier created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save supplier.");
    } finally { setSaving(false); }
  }

  async function archive() {
    if (!draft?.id) return;
    if (!window.confirm(`Archive ${draft.name}? Existing wedding links will be preserved.`)) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const saved = await AdminApiService.archiveMasterSupplier(draft.id);
      await load(saved.id);
      setMessage("Supplier archived. Existing wedding relationships were preserved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive supplier.");
    } finally { setSaving(false); }
  }

  function updateCategory(index: number, value: string) {
    const previous = categories[index];
    setCategories((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
    setRoles((current) => current.map((role) => supplierTaxonomyKey(role.category) === supplierTaxonomyKey(previous) ? { ...role, category: value } : role));
    setMessage(""); setError("");
  }

  function removeCategory(index: number) {
    if (categories.length <= 1) { setError("Keep at least one supplier category."); return; }
    const removed = categories[index];
    const next = categories.filter((_, itemIndex) => itemIndex !== index);
    const replacement = next[Math.min(index, next.length - 1)] || next[0];
    setCategories(next);
    setRoles((current) => current.map((role) => supplierTaxonomyKey(role.category) === supplierTaxonomyKey(removed) ? { ...role, category: replacement } : role));
    setMessage(""); setError("");
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    setCategories((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function moveRole(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= roles.length) return;
    setRoles((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function saveMasterLists() {
    if (!workspace) return;
    const categoryError = duplicateName(categories);
    const roleError = duplicateName(roles.map((role) => role.name));
    if (categoryError || roleError) { setError(categoryError || roleError); return; }
    const categoryKeys = new Set(categories.map(supplierTaxonomyKey));
    if (roles.some((role) => !categoryKeys.has(supplierTaxonomyKey(role.category)))) {
      setError("Each Wedding role must use one of the configured supplier categories.");
      return;
    }
    const taxonomy = normaliseSupplierTaxonomy(categories, roles);
    setSaving(true); setError(""); setMessage("");
    try {
      const saved = await AdminApiService.updateWorkspace({
        id: workspace.id,
        settings: {
          ...workspace.settings,
          supplierCategories: taxonomy.categories,
          supplierRoles: taxonomy.roles,
        },
      });
      setWorkspace(saved);
      setCategories(saved.settings.supplierCategories);
      setRoles(saved.settings.supplierRoles);
      setMessage("Supplier category and Wedding role lists saved for this workspace.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save supplier master lists.");
    } finally { setSaving(false); }
  }

  const activeCount = suppliers.filter((supplier) => supplier.status !== "archived").length;
  const linkedWeddingCount = new Set(suppliers.flatMap((supplier) => supplier.linkedWeddings.map((wedding) => wedding.slug))).size;
  const SortIcon = sortDirection === "asc" ? ArrowDownAZ : ArrowUpAZ;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Supplier master database"
        title="Suppliers"
        description="Create each business once, reuse it across weddings and maintain controlled supplier categories and Wedding roles."
        actions={<div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setManageLists((value) => !value); setMessage(""); setError(""); }} className="admin-button admin-button--secondary"><ListChecks className="admin-button__icon" />{manageLists ? "Back to suppliers" : "Manage categories & roles"}</button><button type="button" onClick={newSupplier} className="admin-button admin-button--primary"><Plus className="admin-button__icon" />New supplier</button></div>}
      />

      <section className="admin-stat-grid">
        <Stat label="Master suppliers" value={suppliers.length} />
        <Stat label="Active" value={activeCount} />
        <Stat label="Weddings linked" value={linkedWeddingCount} />
      </section>

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-900">{message}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-900">{error}</div> : null}

      {manageLists ? (
        <section className="supplier-taxonomy-manager">
          <header className="supplier-taxonomy-manager__header">
            <div><p className="admin-eyebrow">Master dropdown selections</p><h2>Supplier categories & Wedding roles</h2><p>These workspace-level lists feed every searchable supplier selector. Removing an option does not rewrite historic wedding records.</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setCategories([...SUPPLIER_CATEGORY_OPTIONS]); setRoles([...DEFAULT_SUPPLIER_ROLE_DEFINITIONS]); setMessage(""); setError(""); }} className="admin-button admin-button--secondary admin-button--sm"><RotateCcw className="admin-button__icon" />Restore defaults</button><button type="button" disabled={saving} onClick={saveMasterLists} className="admin-button admin-button--primary"><Save className="admin-button__icon" />{saving ? "Saving…" : "Save master lists"}</button></div>
          </header>
          <div className="supplier-taxonomy-manager__grid">
            <section className="supplier-taxonomy-list-card">
              <div className="supplier-taxonomy-list-card__heading"><div><strong>Supplier categories</strong><span>{categories.length} options</span></div><button type="button" onClick={() => setCategories((current) => [...current, `New category ${current.length + 1}`])} className="admin-button admin-button--secondary admin-button--sm"><Plus className="admin-button__icon" />Add category</button></div>
              <div className="supplier-taxonomy-list">
                {categories.map((category, index) => <div key={`${index}-${category}`} className="supplier-taxonomy-row"><input value={category} onChange={(event) => updateCategory(index, event.target.value)} aria-label={`Supplier category ${index + 1}`} /><div className="supplier-taxonomy-row__actions"><button type="button" disabled={index === 0} onClick={() => moveCategory(index, -1)} title="Move up"><ChevronUp /></button><button type="button" disabled={index === categories.length - 1} onClick={() => moveCategory(index, 1)} title="Move down"><ChevronDown /></button><button type="button" disabled={categories.length <= 1} onClick={() => removeCategory(index)} title="Remove category"><Trash2 /></button></div></div>)}
              </div>
            </section>

            <section className="supplier-taxonomy-list-card">
              <div className="supplier-taxonomy-list-card__heading"><div><strong>Wedding roles</strong><span>{roles.length} options</span></div><button type="button" onClick={() => setRoles((current) => [...current, { name: `New role ${current.length + 1}`, category: categories[0] || "Other" }])} className="admin-button admin-button--secondary admin-button--sm"><Plus className="admin-button__icon" />Add role</button></div>
              <div className="supplier-taxonomy-list">
                {roles.map((role, index) => <div key={`${index}-${role.name}`} className="supplier-taxonomy-row supplier-taxonomy-row--role"><input value={role.name} onChange={(event) => setRoles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} aria-label={`Wedding role ${index + 1}`} /><select value={role.category} onChange={(event) => setRoles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, category: event.target.value } : item))}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select><div className="supplier-taxonomy-row__actions"><button type="button" disabled={index === 0} onClick={() => moveRole(index, -1)} title="Move up"><ChevronUp /></button><button type="button" disabled={index === roles.length - 1} onClick={() => moveRole(index, 1)} title="Move down"><ChevronDown /></button><button type="button" disabled={roles.length <= 1} onClick={() => setRoles((current) => current.filter((_, itemIndex) => itemIndex !== index))} title="Remove role"><Trash2 /></button></div></div>)}
              </div>
            </section>
          </div>
        </section>
      ) : (
        <section className="admin-master-detail admin-master-detail--390">
          <div className="admin-master-detail__main space-y-3">
            <AdminToolbar>
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, category, county or Instagram..." className="h-[34px] w-full border border-black/10 bg-white pl-9 pr-3 text-[11px]" />
              </div>
            </AdminToolbar>

            <div className="admin-supplier-table admin-supplier-table--compact">
              <div className="admin-supplier-table__header">
                <button type="button" onClick={() => changeSort("supplier")} aria-pressed={sortKey === "supplier"}><span>Supplier</span>{sortKey === "supplier" ? <SortIcon /> : null}</button>
                <button type="button" onClick={() => changeSort("category")} aria-pressed={sortKey === "category"}><span>Category / location</span>{sortKey === "category" ? <SortIcon /> : null}</button>
                <span>Status</span><span>Weddings</span>
              </div>
              {filtered.length ? filtered.map((supplier) => (
                <button key={supplier.id} type="button" onClick={() => selectSupplier(supplier)} className={`admin-supplier-row ${activeId === supplier.id ? "admin-supplier-row--active" : ""}`}>
                  <span className="admin-supplier-row__name">{supplier.displayName || supplier.name}</span>
                  <span className="admin-supplier-row__category">{configuredSupplierCategory(supplier.category, categories) || supplier.category || "Uncategorised"}{supplier.county ? ` · ${supplier.county}` : supplier.location ? ` · ${supplier.location}` : ""}</span>
                  <span className={`admin-supplier-row__status ${supplier.status === "archived" ? "is-archived" : ""}`}>{supplier.status}</span>
                  <span className="admin-supplier-row__count">{supplier.linkedWeddingCount}</span>
                </button>
              )) : <div className="p-8 text-center text-[11px] text-neutral-500">No suppliers found.</div>}
            </div>
          </div>

          <aside className="admin-summary-panel admin-record-summary rounded-[18px] border border-black/10 bg-white p-4">
            {!draft ? <div className="text-[11px] text-neutral-500">Select a supplier or create a new one.</div> : (
              <div className="space-y-3.5">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Supplier details</p>
                  <h2 className="mt-1.5 break-words text-[19px] font-semibold leading-[1.15] tracking-[-0.025em]">{draft.id ? draft.name : "New supplier"}</h2>
                </div>

                <div className="admin-quiet-form">
                  <Field label="Business name" value={draft.name} onChange={(value) => patch({ name: value, displayName: draft.displayName || value })} />
                  <Field label="Display name" value={draft.displayName} onChange={(value) => patch({ displayName: value })} />
                  <AdminSearchSelect
                    label="Category"
                    value={configuredSupplierCategory(draft.category, categories) || draft.category}
                    options={categoryOptions}
                    onChange={(category) => patch({ category })}
                    placeholder="Search supplier categories…"
                    help="The options are managed from Supplier master lists."
                    allowClear={false}
                  />
                  <Field label="Website" value={draft.website} onChange={(value) => patch({ website: value })} placeholder="https://..." />
                  <Field label="Instagram" value={draft.instagram} onChange={(value) => patch({ instagram: value.replace(/^@/, "") })} placeholder="supplierhandle" />
                  <Field label="Email" value={draft.email} onChange={(value) => patch({ email: value })} />
                  <Field label="Phone" value={draft.phone} onChange={(value) => patch({ phone: value })} />
                  <Field label="Location" value={draft.location} onChange={(value) => patch({ location: value })} />
                  <Field label="County" value={draft.county} onChange={(value) => patch({ county: value })} />
                  <Area label="Description" value={draft.description} onChange={(value) => patch({ description: value })} />
                  <Area label="Internal notes" value={draft.notes} onChange={(value) => patch({ notes: value })} />
                </div>

                <button type="button" onClick={save} disabled={saving} className="admin-button admin-button--primary w-full"><Save className="admin-button__icon" />{saving ? "Saving…" : draft.id ? "Save supplier" : "Create supplier"}</button>
                {draft.id && draft.status !== "archived" ? <button type="button" onClick={archive} disabled={saving} className="admin-button admin-button--danger w-full"><Archive className="admin-button__icon" />Archive supplier</button> : null}

                {draft.id ? <div className="rounded-xl bg-neutral-50 p-3"><div className="mb-2 flex items-center gap-2"><Users className="h-3.5 w-3.5 text-neutral-400" strokeWidth={1.6} /><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Linked weddings ({draft.linkedWeddingCount})</p></div>{draft.linkedWeddings.length ? <div className="space-y-1.5">{draft.linkedWeddings.map((wedding) => <a key={`${wedding.slug}-${wedding.role}`} href={`/admin/weddings/${wedding.slug}/suppliers`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-[10px] hover:bg-neutral-100"><span className="min-w-0"><strong className="block truncate font-medium">{wedding.couple || wedding.title}</strong><span className="mt-0.5 block truncate text-[9px] text-neutral-500">{wedding.role}{wedding.weddingDate ? ` · ${wedding.weddingDate}` : ""}</span></span><ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={1.6} /></a>)}</div> : <p className="text-[10px] text-neutral-500">Not linked to a wedding yet.</p>}</div> : null}
              </div>
            )}
          </aside>
        </section>
      )}
    </AdminPage>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="admin-stat-card"><p>{label}</p><strong>{value}</strong></div>;
}

function Field({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="admin-quiet-field"><span>{label}</span><input value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="admin-quiet-field"><span>{label}</span><textarea value={value || ""} onChange={(event) => onChange(event.target.value)} rows={3} /></label>;
}
