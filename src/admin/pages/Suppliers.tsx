import { useEffect, useMemo, useState } from "react";
import { Archive, ExternalLink, Plus, Save, Search, Users } from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import { SupplierService, type MasterSupplier } from "../services/SupplierService";
import { AdminPage, AdminPageHeader, AdminToolbar } from "../components/ui/AdminUI";

const CATEGORIES = [
  "Photography", "Venue", "Videographer", "Florist", "Flowers", "Hair", "Makeup", "Make-up",
  "Wedding Dress", "Dress", "Seamstress", "Suits", "Menswear", "Cake", "Band", "DJ",
  "Ceremony Music", "Stationery", "Transport", "Decor", "Celebrant", "Celebrant / Officiant",
  "Content Creator", "Entertainment", "Ice Cream", "Other",
];

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
      supplier.name, supplier.displayName, supplier.category, supplier.website,
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
    setSaving(true); setError(""); setMessage("");
    try {
      const saved = draft.id
        ? await AdminApiService.updateMasterSupplier(draft as MasterSupplier & { id: string })
        : await AdminApiService.createMasterSupplier(draft);
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

  const activeCount = suppliers.filter((s) => s.status !== "archived").length;
  const linkedWeddingCount = new Set(suppliers.flatMap((s) => s.linkedWeddings.map((w) => w.slug))).size;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Supplier master database"
        title="Suppliers"
        description="Create each business once, reuse it across weddings and maintain contact, web and social details in one place."
        actions={<button type="button" onClick={newSupplier} className="admin-button admin-button--primary"><Plus className="admin-button__icon" />New supplier</button>}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Master suppliers" value={suppliers.length} />
        <Stat label="Active" value={activeCount} />
        <Stat label="Weddings linked" value={linkedWeddingCount} />
      </section>

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 390px", gap: "24px", alignItems: "start" }}>
        <div className="space-y-4">
          <AdminToolbar>
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, category, county or Instagram..." className="h-[34px] w-full border border-black/10 bg-white pl-9 pr-3 text-[11px]" />
            </div>
          </AdminToolbar>

          <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white/80">
            {filtered.length ? filtered.map((supplier) => (
              <button key={supplier.id} type="button" onClick={() => selectSupplier(supplier)} className={`block w-full border-b border-black/5 p-4 text-left last:border-b-0 ${activeId === supplier.id ? "bg-neutral-100" : "hover:bg-white"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{supplier.displayName || supplier.name}</p>
                    <p className="mt-1 text-xs text-neutral-500">{supplier.category || "Uncategorised"}{supplier.county ? ` · ${supplier.county}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] ${supplier.status === "archived" ? "border-neutral-200 bg-neutral-100 text-neutral-500" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{supplier.status}</span>
                    <p className="mt-2 text-xs text-neutral-400">{supplier.linkedWeddingCount} weddings</p>
                  </div>
                </div>
              </button>
            )) : <div className="p-8 text-center text-sm text-neutral-500">No suppliers found.</div>}
          </div>
        </div>

        <aside style={{ position: "sticky", top: "112px", maxHeight: "calc(100vh - 128px)", overflowY: "auto" }} className="rounded-[24px] border border-black/10 bg-white p-5">
          {!draft ? <div className="text-sm text-neutral-500">Select a supplier or create a new one.</div> : (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Supplier details</p>
                <h2 className="mt-2 font-serif text-3xl">{draft.id ? draft.name : "New supplier"}</h2>
              </div>
              <Field label="Business name" value={draft.name} onChange={(value) => patch({ name: value, displayName: draft.displayName || value })} />
              <Field label="Display name" value={draft.displayName} onChange={(value) => patch({ displayName: value })} />
              <label className="block"><span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">Category</span><select value={draft.category} onChange={(e) => patch({ category: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"><option value="">Select category…</option>{draft.category && !CATEGORIES.includes(draft.category) ? <option value={draft.category}>{draft.category}</option> : null}{CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <Field label="Website" value={draft.website} onChange={(value) => patch({ website: value })} placeholder="https://..." />
              <Field label="Instagram" value={draft.instagram} onChange={(value) => patch({ instagram: value.replace(/^@/, "") })} placeholder="supplierhandle" />
              <Field label="Email" value={draft.email} onChange={(value) => patch({ email: value })} />
              <Field label="Phone" value={draft.phone} onChange={(value) => patch({ phone: value })} />
              <Field label="Location" value={draft.location} onChange={(value) => patch({ location: value })} />
              <Field label="County" value={draft.county} onChange={(value) => patch({ county: value })} />
              <Area label="Description" value={draft.description} onChange={(value) => patch({ description: value })} />
              <Area label="Internal notes" value={draft.notes} onChange={(value) => patch({ notes: value })} />

              <button type="button" onClick={save} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-40"><Save className="h-4 w-4" />{saving ? "Saving…" : draft.id ? "Save supplier" : "Create supplier"}</button>
              {draft.id && draft.status !== "archived" ? <button type="button" onClick={archive} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm text-red-700"><Archive className="h-4 w-4" />Archive supplier</button> : null}

              {draft.id ? <div className="border-t border-black/10 pt-5"><div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4" /><p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Linked weddings ({draft.linkedWeddingCount})</p></div>{draft.linkedWeddings.length ? <div className="space-y-2">{draft.linkedWeddings.map((wedding) => <a key={`${wedding.slug}-${wedding.role}`} href={`/admin/weddings/${wedding.slug}/suppliers`} className="block rounded-2xl border border-black/10 p-3 text-sm hover:bg-neutral-50"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{wedding.couple || wedding.title}</p><p className="mt-1 text-xs text-neutral-500">{wedding.role}{wedding.weddingDate ? ` · ${wedding.weddingDate}` : ""}</p></div><ExternalLink className="h-4 w-4 text-neutral-400" /></div></a>)}</div> : <p className="text-sm text-neutral-500">Not linked to a wedding yet.</p>}</div> : null}
            </div>
          )}
        </aside>
      </section>
    </AdminPage>
  );
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-[24px] border border-black/10 bg-white/75 p-5"><p className="text-xs uppercase tracking-[0.16em] text-neutral-500">{label}</p><p className="mt-2 font-serif text-4xl">{value}</p></div>; }
function Field({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="block"><span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">{label}</span><input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm" /></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">{label}</span><textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm" /></label>; }
