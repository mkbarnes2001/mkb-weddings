import { AdminActionButton, AdminActionRouterLink } from "../components/ui/AdminActionControl";
import {
  useEffect,
  useMemo,
  useState } from "react";
import { Link } from "react-router-dom";
import { Archive,
  FileText,
  GripVertical,
  Image as ImageIcon,
  LayoutDashboard,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  Users,
  X } from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import { WeddingService } from "../services/WeddingService";
import type { WeddingPublicationStatus,
  WeddingRecord } from "../types/wedding";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/Badge";
import { AdminPage,
  AdminPageHeader,
  AdminToolbar,
  AdminHeaderRouterLink,
} from "../components/ui/AdminUI";

 type StatusFilter = "all" | WeddingPublicationStatus;

function publicationToneClass(status: WeddingPublicationStatus) {
  if (status === "published") return "admin-status--success";
  if (status === "archived") return "admin-status--neutral";
  return "admin-status--warning";
}

function publicationTextClass(status: WeddingPublicationStatus) {
  if (status === "published") return "text-emerald-700";
  if (status === "archived") return "text-neutral-500";
  return "text-amber-700";
}

function coverFor(wedding: WeddingRecord) {
  return wedding.images.find((image) => image.isCover) || wedding.images[0] || null;
}

function weddingDateHasArrived(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return false;

  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw <= localToday;

  const season = raw.match(/^(spring|summer|autumn|fall|winter)\s+(\d{4})$/i);
  if (season) {
    const month = {
      spring: "03",
      summer: "06",
      autumn: "09",
      fall: "09",
      winter: "12",
    }[season[1].toLowerCase() as "spring" | "summer" | "autumn" | "fall" | "winter"];

    return `${season[2]}-${month}-01` <= localToday;
  }

  const parsed = Date.parse(`1 ${raw}`);
  return Number.isFinite(parsed)
    && new Date(parsed).toISOString().slice(0, 10) <= localToday;
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
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    reloadWeddings()
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load weddings."))
      .finally(() => setLoading(false));
  }, []);

  const storyRecords = useMemo(
    () => weddings.filter((wedding) => weddingDateHasArrived(wedding.weddingDate)),
    [weddings],
  );

  const filteredWeddings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return storyRecords.filter((wedding) => {
      const matchesQuery = !q || [wedding.title, wedding.venue, wedding.couple, wedding.slug, wedding.publicationStatus].some((value) => String(value || "").toLowerCase().includes(q));
      const matchesStatus = statusFilter === "all" || wedding.publicationStatus === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [storyRecords, query, statusFilter]);

  const active = storyRecords.find((wedding) => wedding.slug === activeSlug) || filteredWeddings[0] || null;

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

  if (loading) return <div className="text-neutral-500">Loading weddings…</div>;

  const draftCount = storyRecords.filter((wedding) => wedding.publicationStatus === "draft").length;
  const publishedCount = storyRecords.filter((wedding) => wedding.storyEnabled && wedding.storyStatus === "published" && wedding.storyListVisible).length;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Website content"
        title="Wedding Stories"
        description="New booked weddings originate in CRM Jobs. Website story records appear here only after the wedding date, so future bookings do not create Website placeholders."
        actions={<>
          <AdminHeaderRouterLink to="/admin/weddings/new" className="admin-button admin-button--secondary"><Plus className="admin-button__icon" />Add standalone story</AdminHeaderRouterLink>
          <AdminActionButton type="button" onClick={saveLayout} disabled={!dirty || saving} className="admin-button admin-button--primary"><Save className="admin-button__icon" />{saving ? "Saving…" : dirty ? "Save order" : "Saved"}</AdminActionButton>
        </>}
      />

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3"><MiniStat label="Eligible stories" value={storyRecords.length} /><MiniStat label="Not started / draft" value={draftCount} /><MiniStat label="Published stories" value={publishedCount} /></section>

      <AdminToolbar>
        <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search couples, venues or stories..." className="h-[34px] w-full border border-black/10 bg-white pl-9 pr-3 text-[11px]" /></div>
        <div className="flex flex-wrap gap-1.5">{(["all", "draft", "published", "archived"] as StatusFilter[]).map((status) => <AdminActionButton key={status} type="button" onClick={() => setStatusFilter(status)} className={`admin-button admin-button--sm ${statusFilter === status ? "admin-button--primary" : "admin-button--secondary"}`}>{status}</AdminActionButton>)}</div>
      </AdminToolbar>

      <section className="admin-master-detail admin-master-detail--360">
        <div className="admin-master-detail__main admin-card-grid admin-card-grid--portrait">
          {!filteredWeddings.length ? (
            <div className="rounded-[18px] border border-dashed border-black/10 bg-white/70 p-6 text-[11px] leading-5 text-neutral-500">
              {weddings.length ? "No wedding stories match the current filters." : "No Wedding Workspaces or standalone stories exist in this workspace yet."}
            </div>
          ) : null}
          {filteredWeddings.map((wedding) => {
            const cover = coverFor(wedding);
            const selected = wedding.slug === activeSlug;
            return (
              <article className="admin-wedding-card" key={wedding.slug} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn(wedding.slug)} onClick={() => setActiveSlug(wedding.slug)} style={{ overflow: "hidden", borderRadius: "18px", border: 0, boxShadow: selected ? "0 0 0 2px #111" : "none", background: "transparent", opacity: wedding.storyListVisible || wedding.storyStatus !== "published" ? 1 : 0.62, cursor: "pointer" }}>
                <div style={{ position: "relative", aspectRatio: "4 / 5", background: "#f5f5f5", overflow: "hidden" }}>
                  {cover ? <img src={cover.thumbSrc || cover.fullSrc} alt={cover.aiAlt || wedding.couple} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon className="h-7 w-7 text-neutral-300" /></div>}
                  <div draggable onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = "move"; setDraggedSlug(wedding.slug); }} onDragEnd={() => setDraggedSlug(null)} style={{ position: "absolute", right: "10px", bottom: "10px", width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", background: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.22)", cursor: "grab" }} title="Drag to reorder"><GripVertical className="h-5 w-5" /></div>
                  {!wedding.storyListVisible && wedding.storyStatus === "published" ? <span className="absolute left-2.5 top-2.5 rounded-full bg-black/80 px-2.5 py-1 text-[10px] text-white">Story hidden</span> : null}
                </div>
                <div className="admin-wedding-card__body">
                  <p className="admin-wedding-card__title line-clamp-2">{wedding.couple}</p>
                  <div className="admin-wedding-card__footer">
                    <span className={`admin-wedding-card__status ${publicationTextClass(wedding.publicationStatus)}`}>{wedding.publicationStatus}</span>
                    <AdminActionRouterLink to={`/admin/weddings/${wedding.slug}/workspace`} onClick={(event) => event.stopPropagation()} aria-label={`Open ${wedding.couple} workspace`} title="Open Wedding Workspace" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-black/10 bg-white text-neutral-500 hover:border-black/20 hover:text-neutral-900"><LayoutDashboard className="h-3.5 w-3.5" strokeWidth={1.6} /></AdminActionRouterLink>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="admin-summary-panel admin-record-summary rounded-[18px] border border-black/10 bg-white p-4">
          {!active ? <p className="text-[11px] text-neutral-500">Select a wedding to view details.</p> : <div className="space-y-3.5">
            {coverFor(active) ? <img src={coverFor(active)?.thumbSrc || coverFor(active)?.fullSrc} alt={active.couple} className="max-h-[230px] w-full rounded-xl object-cover" /> : null}

            <div className="admin-wedding-summary-heading min-w-0">
              <p>Wedding story</p>
              <h2>{active.couple}</h2>
              <span>{active.venue} · {active.weddingDate}</span>
            </div>

            <label className={`admin-summary-toggle ${active.storyStatus !== "published" ? "admin-summary-toggle--warning" : ""}`}>
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-neutral-800">Show on Stories & Reviews</span>
                {active.storyStatus !== "published" ? <p className="mt-0.5 text-[9px] leading-4 text-amber-800">Publish the story first to enable this.</p> : null}
              </div>
              <input type="checkbox" checked={active.storyListVisible} disabled={active.storyStatus !== "published"} onChange={(event) => toggleStory(active.slug, event.target.checked)} />
            </label>

            <dl className="admin-compact-details admin-wedding-details">
              <div><dt>Title</dt><dd>{active.title}</dd></div>
              <div><dt>Venue</dt><dd>{active.venue}</dd></div>
              <div><dt>Date</dt><dd>{active.weddingDate}</dd></div>
              <div><dt>Storage</dt><dd>{active.storage}</dd></div>
              <div><dt>Story</dt><dd>{active.storyStatus}</dd></div>
              <div><dt>Order</dt><dd>{weddings.findIndex((wedding) => wedding.slug === active.slug) + 1}</dd></div>
            </dl>

            <div className="admin-wedding-status-row"><StatusBadge status={active.status} /><span className={`admin-status ${publicationToneClass(active.publicationStatus)}`}>{active.publicationStatus}</span></div>

            <div className="admin-wedding-action-panel" aria-label="Wedding actions">
              <AdminActionRouterLink to={`/admin/weddings/${active.slug}/workspace`} className="admin-button admin-button--primary admin-wedding-workspace-button"><LayoutDashboard className="admin-button__icon" strokeWidth={1.6} />Open Wedding Workspace</AdminActionRouterLink>
              <div className="admin-summary-action-grid admin-wedding-action-grid">
                <AdminActionRouterLink to={`/admin/weddings/${active.slug}/story`} className="admin-button admin-button--secondary admin-button--sm"><FileText className="admin-button__icon" strokeWidth={1.6} />Story</AdminActionRouterLink>
                <AdminActionRouterLink to={`/admin/weddings/${active.slug}/images`} className="admin-button admin-button--secondary admin-button--sm"><ImageIcon className="admin-button__icon" strokeWidth={1.6} />Images</AdminActionRouterLink>
                <AdminActionRouterLink to={`/admin/weddings/${active.slug}/suppliers`} className="admin-button admin-button--secondary admin-button--sm"><Users className="admin-button__icon" strokeWidth={1.6} />Suppliers</AdminActionRouterLink>
                <AdminActionRouterLink to={`/admin/weddings/${active.slug}/publish`} className="admin-button admin-button--secondary admin-button--sm"><Upload className="admin-button__icon" strokeWidth={1.6} />Publish</AdminActionRouterLink>
                <AdminActionButton type="button" disabled={destructiveBusy || active.publicationStatus === "archived"} onClick={() => archiveWedding(active)} className="admin-button admin-button--secondary admin-button--sm"><Archive className="admin-button__icon" strokeWidth={1.6} />{active.publicationStatus === "archived" ? "Archived" : "Archive"}</AdminActionButton>
                <AdminActionButton type="button" disabled={destructiveBusy} onClick={() => { setDeleteTarget(active); setDeleteConfirm(""); setError(""); }} className="admin-button admin-button--danger admin-button--sm"><Trash2 className="admin-button__icon" strokeWidth={1.6} />Delete</AdminActionButton>
              </div>
            </div>

            <div className="admin-summary-metrics">
              <div className="admin-summary-metric"><span>Images</span><strong>{active.imageCount}</strong></div>
              <div className="admin-summary-metric"><span>AI rows</span><strong>{active.aiRows}</strong></div>
            </div>
            <div className="admin-wedding-progress space-y-2 rounded-xl bg-neutral-50 p-3"><ProgressBar label="Tags" done={active.tagsComplete} total={active.imageCount} /><ProgressBar label="Alt" done={active.altComplete} total={active.imageCount} /><ProgressBar label="Captions" done={active.captionComplete} total={active.imageCount} /></div>
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
              <AdminActionButton type="button" onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }} className="admin-icon-button" aria-label="Close delete dialog"><X className="h-4 w-4" /></AdminActionButton>
            </div>
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-relaxed text-red-900">
              This permanently removes the wedding record, wedding-specific supplier links, preview sets, story links and wedding assignments. Canonical assets, private originals, master venues, master suppliers and non-live Client Galleries are preserved. A live Client Gallery will block deletion until it is archived.
            </div>
            <label className="mt-5 block text-sm font-medium">Type <strong>DELETE</strong> to confirm</label>
            <input autoFocus value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} className="mt-2 w-full rounded-xl border border-black/15 px-3 py-3" placeholder="DELETE" />
            <div className="mt-5 flex justify-end gap-2">
              <AdminActionButton type="button" onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }} className="admin-action-secondary">Cancel</AdminActionButton>
              <AdminActionButton type="button" disabled={destructiveBusy || deleteConfirm !== "DELETE"} onClick={deleteWedding} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[10px] border border-red-700 bg-red-700 px-4 font-semibold text-white disabled:opacity-40"><Trash2 className="h-4 w-4" />{destructiveBusy ? "Deleting…" : "Permanently delete wedding"}</AdminActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) { return <div className="admin-stat-card"><p>{label}</p><strong>{value}</strong></div>; }
