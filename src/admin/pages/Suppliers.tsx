import { useEffect, useMemo, useState } from "react";
import { Archive, ExternalLink, Plus, Save, Search, Users } from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import { SupplierService, type MasterSupplier } from "../services/SupplierService";
import { AdminPage, AdminPageHeader, AdminToolbar } from "../components/ui/AdminUI";
import { AdminSearchSelect, type AdminSearchSelectOption } from "../components/ui/AdminSearchSelect";
import { SUPPLIER_CATEGORY_OPTIONS, canonicalSupplierCategory } from "../data/supplierTaxonomy";

const CATEGORY_OPTIONS: AdminSearchSelectOption[] = SUPPLIER_CATEGORY_OPTIONS.map((category) => ({ value: category, label: category }));

const EMPTY: MasterSupplier = {
  id: "", name: "", displayName: "", category: "", website: "", instagram: "",
  email: "", phone: "", location: "", county: "", description: "", notes: "",
  status: "active", linkedWeddingCount: 0, linkedWeddings: [],
};

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<MasterSupplier[]>([]);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MasterSupplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load(preferredId?: string) {
    const service = await SupplierService.load();
    const next = service.getMasterSuppliers();
    setSuppliers(next);
    const id = preferredId || activeId || next[0]?.id || null;
    setActiveId(id);
    setDraft(id ? { ...(next.find((item) => item.id === id) || next[0]) } : null);
  }

  useEffect(() => { load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load suppliers.")); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((supplier) => [
      supplier.name, supplier.displayName, supplier.category, canonicalSupplierCategory(supplier.category), supplier.website,
      supplier.instagram, supplier.email, supplier.location, supplier.county,
    ].some((value) => String(value || "").toLowerCase().includes(q)));
  }, [suppliers, query]);

  function selectSupplier(supplier: MasterSupplier) {
    setActiveId(supplier.id);
    setDraft({ ...supplier, linkedWeddings: [...supplier.linkedWeddings] });
    setMessage(""); setError("");
  }

  function newSupplier() {
    setActiveId(null);
    setDraft({ ...EMPTY });
    setMessage(""); setError("");
  }

  function patch(patchValue: Partial<MasterSupplier>) {
    setDraft((current) => current ? { ...current, ...patchValue } : current);
    setMessage(""); setError("");
  }

  async function save() {
    if (!draft?.name.trim()) { setError("Supplier name is required."); return; }
    const category = canonicalSupplierCategory(draft.category);
    if (!category) { setError("Choose a canonical supplier category from the searchable list."); return; }
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

  const activeCount = suppliers.filter((supplier) => supplier.status !== "archived").length;
  const linkedWeddingCount = new Set(suppliers.flatMap((supplier) => supplier.linkedWeddings.map((wedding) => wedding.slug))).size;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Supplier master database"
        title="Suppliers"
        description="Create each business once, reuse it across weddings and maintain contact, web and social details in one place."
        actions={<button type="button" onClick={newSupplier} className="admin-button admin-button--primary"><Plus className="admin-button__icon" />New supplier</button>}
      />

      <section className="admin-stat-grid">
        <Stat label="Master suppliers" value={suppliers.length} />
        <Stat label="Active" value={activeCount} />
        <Stat label="Weddings linked" value={linkedWeddingCount} />
      </section>

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-900">{message}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-900">{error}</div> : null}

      <section className="admin-master-detail admin-master-detail--390">
        <div className="admin-master-detail__main space-y-3">
          <AdminToolbar>
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, category, county or Instagram..." className="h-[34px] w-full border border-black/10 bg-white pl-9 pr-3 text-[11px]" />
            </div>
          </AdminToolbar>

          <div className="admin-supplier-table">
            <div className="admin-supplier-table__header" aria-hidden="true">
              <span>Supplier</span><span>Category / location</span><span>Status</span><span>Weddings</span>
            </div>
            {filtered.length ? filtered.map((supplier) => (
              <button key={supplier.id} type="button" onClick={() => selectSupplier(supplier)} className={`admin-supplier-row ${activeId === supplier.id ? "admin-supplier-row--active" : ""}`}>
                <span className="admin-supplier-row__name">{supplier.displayName || supplier.name}</span>
                <span className="admin-supplier-row__category">{canonicalSupplierCategory(supplier.category) || supplier.category || "Uncategorised"}{supplier.county ? ` · ${supplier.county}` : supplier.location ? ` · ${supplier.location}` : ""}</span>
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
                  value={canonicalSupplierCategory(draft.category) || draft.category}
                  options={CATEGORY_OPTIONS}
                  onChange={(category) => patch({ category })}
                  placeholder="Search supplier categories…"
                  help="Type to filter, then choose one canonical category. Legacy labels are normalised when saved."
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
