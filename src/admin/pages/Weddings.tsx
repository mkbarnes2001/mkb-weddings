import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, FileText, GripVertical, Image as ImageIcon, LayoutDashboard, Plus, Save, Search, Trash2, Users, X } from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import { WeddingService } from "../services/WeddingService";
import type { WeddingPublicationStatus, WeddingRecord } from "../types/wedding";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/Badge";
import { AdminPage, AdminPageHeader, AdminToolbar } from "../components/ui/AdminUI";

 type StatusFilter = "all" | WeddingPublicationStatus;

function publicationClasses(status: WeddingPublicationStatus) {
  if (status === "published") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "archived") return "border-neutral-200 bg-neutral-100 text-neutral-600";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function coverFor(wedding: WeddingRecord) {
  return wedding.images.find((image) => image.isCover) || wedding.images[0] || null;
}

export function Weddings() {
  const [weddings, setWeddings] = useState<WeddingRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [draggedSlug, setDraggedSlug] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WeddingRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [destructiveBusy, setDestructiveBusy] = useState(false);

  async function reloadWeddings(preferredSlug?: string) {
    const service = await WeddingService.load();
    const rows = service.getWeddings();
    setWeddings(rows);
    setActiveSlug((current) => {
      const preferred = preferredSlug || current;
      return preferred && rows.some((row) => row.slug === preferred) ? preferred : rows[0]?.slug || null;
    });
    return rows;
  }

  useEffect(() => {
    reloadWeddings().catch((err) => setError(err instanceof Error ? err.message : "Unable to load weddings."));
  }, []);

  const filteredWeddings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return weddings.filter((wedding) => {
      const matchesQuery = !q || [wedding.title, wedding.venue, wedding.couple, wedding.slug, wedding.publicationStatus].some((value) => String(value || "").toLowerCase().includes(q));
      const matchesStatus = statusFilter === "all" || wedding.publicationStatus === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [weddings, query, statusFilter]);

  const active = weddings.find((wedding) => wedding.slug === activeSlug) || null;

  function dropOn(targetSlug: string) {
    if (!draggedSlug || draggedSlug === targetSlug) { setDraggedSlug(null); return; }
    setWeddings((current) => {
      const moving = current.find((wedding) => wedding.slug === draggedSlug);
      if (!moving) return current;
      const remaining = current.filter((wedding) => wedding.slug !== draggedSlug);
      const index = remaining.findIndex((wedding) => wedding.slug === targetSlug);
      const next = [...remaining];
      next.splice(index < 0 ? next.length : index, 0, moving);
      return next.map((wedding, order) => ({ ...wedding, storySortOrder: order + 1 }));
    });
    setDirty(true); setMessage(""); setDraggedSlug(null);
  }

  function toggleStory(slug: string, enabled: boolean) {
    setWeddings((current) => current.map((wedding) => wedding.slug === slug ? { ...wedding, storyListVisible: enabled } : wedding));
    setDirty(true); setMessage(""); setError("");
  }

  async function saveLayout() {
    setSaving(true); setError(""); setMessage("");
    try {
      await AdminApiService.saveWeddingListSettings(weddings.map((wedding, index) => ({
        slug: wedding.slug,
        sortOrder: index + 1,
        storyVisible: wedding.storyListVisible,
      })));
      setDirty(false);
      setMessage("Wedding story order and visibility saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save wedding order.");
    } finally { setSaving(false); }
  }

  async function archiveWedding(wedding: WeddingRecord) {
    if (!window.confirm(`Archive ${wedding.couple}? The wedding and all linked data will be preserved.`)) return;
    setDestructiveBusy(true); setError(""); setMessage("");
    try {
      await AdminApiService.archiveWedding(wedding.slug);
      await reloadWeddings(wedding.slug);
      setMessage(`${wedding.couple} archived. Nothing was deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive wedding.");
    } finally {
      setDestructiveBusy(false);
    }
  }

  async function deleteWedding() {
    if (!deleteTarget || deleteConfirm !== "DELETE") return;
    setDestructiveBusy(true); setError(""); setMessage("");
    try {
      await AdminApiService.deleteWeddingPermanently(deleteTarget.slug);
      const deletedName = deleteTarget.couple;
      setDeleteTarget(null);
      setDeleteConfirm("");
      await reloadWeddings();
      setMessage(`${deletedName} permanently deleted. Canonical assets, private originals, venues and suppliers were preserved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete wedding.");
    } finally {
      setDestructiveBusy(false);
    }
  }

  if (!weddings.length && !error) return <div className="text-neutral-500">Loading weddings…</div>;

  const draftCount = weddings.filter((wedding) => wedding.publicationStatus === "draft").length;
  const publishedCount = weddings.filter((wedding) => wedding.storyEnabled && wedding.storyStatus === "published" && wedding.storyListVisible).length;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Wedding repository"
        title="Weddings"
        description="Manage wedding records, public story visibility and display order without affecting linked suppliers, galleries or assets."
        actions={<>
          <Link to="/admin/weddings/new" className="admin-button admin-button--secondary"><Plus className="admin-button__icon" />New wedding</Link>
          <button type="button" onClick={saveLayout} disabled={!dirty || saving} className="admin-button admin-button--primary"><Save className="admin-button__icon" />{saving ? "Saving…" : dirty ? "Save order" : "Saved"}</button>
        </>}
      />

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3"><MiniStat label="Total" value={weddings.length} /><MiniStat label="Draft / hidden" value={draftCount} /><MiniStat label="Visible stories" value={publishedCount} /></section>

      <AdminToolbar>
        <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search couples, venues or weddings..." className="h-[34px] w-full border border-black/10 bg-white pl-9 pr-3 text-[11px]" /></div>
        <div className="flex flex-wrap gap-1.5">{(["all", "draft", "published", "archived"] as StatusFilter[]).map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`admin-button admin-button--sm ${statusFilter === status ? "admin-button--primary" : "admin-button--secondary"}`}>{status}</button>)}</div>
      </AdminToolbar>

      <section className="admin-master-detail admin-master-detail--360">
        <div className="admin-master-detail__main admin-card-grid admin-card-grid--portrait">
          {filteredWeddings.map((wedding) => {
            const cover = coverFor(wedding);
            const selected = wedding.slug === activeSlug;
            return (
              <article key={wedding.slug} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn(wedding.slug)} onClick={() => setActiveSlug(wedding.slug)} style={{ overflow: "hidden", borderRadius: "18px", border: selected ? "2px solid #111" : "1px solid rgba(0,0,0,0.12)", background: "#fff", opacity: wedding.storyListVisible || wedding.storyStatus !== "published" ? 1 : 0.62, cursor: "pointer" }}>
                <div style={{ position: "relative", aspectRatio: "4 / 5", background: "#f5f5f5", overflow: "hidden" }}>
                  {cover ? <img src={cover.thumbSrc || cover.fullSrc} alt={cover.aiAlt || wedding.couple} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon className="h-7 w-7 text-neutral-300" /></div>}
                  <div draggable onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = "move"; setDraggedSlug(wedding.slug); }} onDragEnd={() => setDraggedSlug(null)} style={{ position: "absolute", right: "10px", bottom: "10px", width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", background: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.22)", cursor: "grab" }} title="Drag to reorder"><GripVertical className="h-5 w-5" /></div>
                  {!wedding.storyListVisible && wedding.storyStatus === "published" ? <span className="absolute left-2.5 top-2.5 rounded-full bg-black/80 px-2.5 py-1 text-[10px] text-white">Story hidden</span> : null}
                </div>
                <div className="p-3">
                  <p className="truncate font-serif text-lg">{wedding.couple}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] ${publicationClasses(wedding.publicationStatus)}`}>{wedding.publicationStatus}</span>
                    <Link to={`/admin/weddings/${wedding.slug}/workspace`} onClick={(event) => event.stopPropagation()} aria-label={`Open ${wedding.couple} workspace`} title="Open Wedding Workspace" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-neutral-700 hover:bg-neutral-50"><LayoutDashboard className="h-4 w-4" /></Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="admin-summary-panel rounded-[24px] border border-black/10 bg-white p-5">
          {!active ? <p className="text-sm text-neutral-500">Select a wedding to view details.</p> : <div className="space-y-5">
            {coverFor(active) ? <img src={coverFor(active)?.thumbSrc || coverFor(active)?.fullSrc} alt={active.couple} className="max-h-[260px] w-full rounded-2xl object-cover" /> : null}
            <div><p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Wedding</p><h2 className="mt-2 font-serif text-3xl">{active.couple}</h2><p className="mt-2 text-sm text-neutral-500">{active.venue} · {active.weddingDate}</p></div>

            <label className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${active.storyStatus === "published" ? "border-black/10" : "border-amber-200 bg-amber-50"}`}><div><span className="text-sm">Show story on Stories & Reviews</span>{active.storyStatus !== "published" ? <p className="mt-1 text-xs text-amber-800">Publish the wedding story first to enable this.</p> : null}</div><input type="checkbox" checked={active.storyListVisible} disabled={active.storyStatus !== "published"} onChange={(event) => toggleStory(active.slug, event.target.checked)} /></label>

            <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-700 space-y-2"><p><span className="text-neutral-400">Title:</span> {active.title}</p><p><span className="text-neutral-400">Venue:</span> {active.venue}</p><p><span className="text-neutral-400">Date:</span> {active.weddingDate}</p><p><span className="text-neutral-400">Storage:</span> {active.storage}</p><p><span className="text-neutral-400">Story status:</span> {active.storyStatus}</p><p><span className="text-neutral-400">Public order:</span> {weddings.findIndex((wedding) => wedding.slug === active.slug) + 1}</p></div>

            <div className="grid grid-cols-2 gap-3"><Small label="Images" value={active.imageCount} /><Small label="AI rows" value={active.aiRows} /></div>
            <div className="space-y-3"><ProgressBar label="Tags" done={active.tagsComplete} total={active.imageCount} /><ProgressBar label="Alt" done={active.altComplete} total={active.imageCount} /><ProgressBar label="Captions" done={active.captionComplete} total={active.imageCount} /></div>
            <div className="flex items-center gap-2"><StatusBadge status={active.status} /><span className={`rounded-full border px-3 py-1 text-xs ${publicationClasses(active.publicationStatus)}`}>{active.publicationStatus}</span></div>

            <Link to={`/admin/weddings/${active.slug}/workspace`} className="block w-full rounded-full bg-black px-5 py-3 text-center text-sm text-white">Open Wedding Workspace</Link>
            <div className="grid grid-cols-2 gap-2"><Link to={`/admin/weddings/${active.slug}/story`} className="flex items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm"><FileText className="h-4 w-4" />Story</Link><Link to={`/admin/weddings/${active.slug}/images`} className="flex items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm"><ImageIcon className="h-4 w-4" />Images</Link><Link to={`/admin/weddings/${active.slug}/suppliers`} className="flex items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm"><Users className="h-4 w-4" />Suppliers</Link><Link to={`/admin/weddings/${active.slug}/publish`} className="flex items-center justify-center rounded-full border border-black/10 px-4 py-2.5 text-sm">Publish</Link></div>
            <div className="border-t border-black/10 pt-4">
              <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-neutral-400">Record actions</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={destructiveBusy || active.publicationStatus === "archived"} onClick={() => archiveWedding(active)} className="admin-action-secondary text-xs"><Archive className="h-4 w-4" />{active.publicationStatus === "archived" ? "Archived" : "Archive"}</button>
                <button type="button" disabled={destructiveBusy} onClick={() => { setDeleteTarget(active); setDeleteConfirm(""); setError(""); }} className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100"><Trash2 className="h-4 w-4" />Delete</button>
              </div>
            </div>
          </div>}
        </aside>
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-wedding-title">
          <div className="w-full max-w-lg rounded-[22px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-red-600">Permanent deletion</p>
                <h2 id="delete-wedding-title" className="mt-2 text-2xl font-semibold">Delete {deleteTarget.couple}?</h2>
              </div>
              <button type="button" onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }} className="admin-icon-button" aria-label="Close delete dialog"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-relaxed text-red-900">
              This permanently removes the wedding record, wedding-specific supplier links, preview sets, story links and wedding assignments. Canonical assets, private originals, master venues, master suppliers and non-live Client Galleries are preserved. A live Client Gallery will block deletion until it is archived.
            </div>
            <label className="mt-5 block text-sm font-medium">Type <strong>DELETE</strong> to confirm</label>
            <input autoFocus value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} className="mt-2 w-full rounded-xl border border-black/15 px-3 py-3" placeholder="DELETE" />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }} className="admin-action-secondary">Cancel</button>
              <button type="button" disabled={destructiveBusy || deleteConfirm !== "DELETE"} onClick={deleteWedding} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[10px] border border-red-700 bg-red-700 px-4 font-semibold text-white disabled:opacity-40"><Trash2 className="h-4 w-4" />{destructiveBusy ? "Deleting…" : "Permanently delete wedding"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) { return <div className="rounded-[24px] border border-black/10 bg-white/75 p-5"><p className="text-xs uppercase tracking-[0.16em] text-neutral-500">{label}</p><p className="mt-2 font-serif text-4xl">{value}</p></div>; }
function Small({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-black/10 p-3"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 font-serif text-2xl">{value}</p></div>; }
