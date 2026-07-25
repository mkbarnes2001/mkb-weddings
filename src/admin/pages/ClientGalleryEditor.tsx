import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FolderPlus,
  Heart,
  ImagePlus,
  Images,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
  UploadCloud,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import { uploadPrivateOriginal } from "../lib/privateOriginalUpload";
import type { AssetRecord } from "../types/asset";
import type { ClientGalleryAlbum, ClientGalleryDetailPayload, ClientGalleryRecord } from "../types/clientGallery";

function publicUrl(token: string) {
  return `${window.location.protocol}//${window.location.host.replace(/^admin\./, "www.")}/client-gallery/${token}`;
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

type UploadItem = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  stage: string;
  error: string;
};

type WorkspaceTab = "photos" | "activity" | "access" | "settings";

export function ClientGalleryEditor() {
  const { id = "" } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: WorkspaceTab = rawTab === "activity" || rawTab === "access" || rawTab === "settings" ? rawTab : "photos";
  const [detail, setDetail] = useState<ClientGalleryDetailPayload | null>(null);
  const [draft, setDraft] = useState<Partial<ClientGalleryRecord> & { pin?: string }>({});
  const [assetSearch, setAssetSearch] = useState("");
  const [photoSearch, setPhotoSearch] = useState("");
  const [assetResults, setAssetResults] = useState<AssetRecord[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [activeAlbumId, setActiveAlbumId] = useState("");
  const [newAlbumName, setNewAlbumName] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [bulkAlbumId, setBulkAlbumId] = useState("");
  const [contactDraft, setContactDraft] = useState({ email: "", displayName: "", role: "client", allowOriginalDownloads: true });
  const [selectionDraft, setSelectionDraft] = useState({ name: "Album Selection", instructions: "Choose the photographs you would like included.", minImages: 0, maxImages: 0 });

  const load = async () => {
    setError("");
    try {
      const next = await AdminApiService.getClientGallery(id);
      setDetail(next);
      setDraft({ ...next.gallery, pin: undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load client gallery.");
    }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { setSelectedAssets(new Set()); }, [activeAlbumId, activeTab]);

  const selectedWedding = useMemo(
    () => detail?.weddings.find((wedding) => wedding.slug === draft.weddingSlug),
    [detail?.weddings, draft.weddingSlug],
  );
  const originalCount = useMemo(() => (detail?.assets || []).filter((asset) => asset.hasOriginal).length, [detail?.assets]);
  const lastVisitor = useMemo(() => (detail?.visitors || []).slice().sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)))[0], [detail?.visitors]);
  const activeAlbums = useMemo(() => (detail?.albums || []).filter((album) => album.status === "active"), [detail?.albums]);
  const activeAlbum = useMemo(() => activeAlbums.find((album) => album.id === activeAlbumId) || null, [activeAlbums, activeAlbumId]);
  const visiblePhotos = useMemo(() => {
    const query = photoSearch.trim().toLowerCase();
    return (detail?.assets || []).filter((asset) => {
      if (activeAlbumId && !asset.albumIds.includes(activeAlbumId)) return false;
      if (query && !asset.filename.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [detail?.assets, activeAlbumId, photoSearch]);

  const setTab = (tab: WorkspaceTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "photos") next.delete("tab"); else next.set("tab", tab);
    setSearchParams(next);
  };

  const mutateAssets = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await AdminApiService.mutateClientGalleryAssets(id, payload);
      setDetail(next); setDraft((current) => ({ ...current, ...next.gallery, pin: undefined })); setMessage(success);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update gallery images."); }
    finally { setBusy(false); }
  };

  const mutateAlbum = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await AdminApiService.mutateClientGalleryAlbums(id, payload);
      setDetail(next); setDraft((current) => ({ ...current, ...next.gallery, pin: undefined })); setMessage(success);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update gallery albums."); }
    finally { setBusy(false); }
  };

  const mutateContact = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await AdminApiService.mutateClientGalleryContact(id, payload);
      setDetail(next); setDraft((current) => ({ ...current, ...next.gallery, pin: undefined })); setMessage(success);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update gallery access contact."); }
    finally { setBusy(false); }
  };

  const addContact = async () => {
    if (!contactDraft.email.trim()) return;
    await mutateContact({ action: "upsert", ...contactDraft }, "Access contact saved.");
    setContactDraft({ email: "", displayName: "", role: "client", allowOriginalDownloads: true });
  };

  const mutateSelection = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await AdminApiService.mutateClientGallerySelection(id, payload);
      setDetail(next); setDraft((current) => ({ ...current, ...next.gallery, pin: undefined })); setMessage(success);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update client selections."); }
    finally { setBusy(false); }
  };

  const createSelectionRequest = async () => {
    if (!selectionDraft.name.trim()) return;
    await mutateSelection({ action: "createRequest", ...selectionDraft }, "Selection request created.");
    setSelectionDraft({ name: "Album Selection", instructions: "Choose the photographs you would like included.", minImages: 0, maxImages: 0 });
  };

  const copySelectionFilenames = async (filenames: string[]) => {
    const text = filenames.filter(Boolean).join("\n");
    if (!text) return;
    try { await navigator.clipboard?.writeText(text); setMessage(`${filenames.length} filename${filenames.length === 1 ? "" : "s"} copied.`); }
    catch { setError("Unable to copy filenames. Your browser may block clipboard access."); }
  };

  const downloadSelectionCsv = (selection: ClientGalleryDetailPayload["selections"][number]) => {
    const escape = (value: string) => `"${String(value || "").replaceAll('"', '""')}"`;
    const rows = [["filename", "asset_id", "selection", "client_email", "status"], ...selection.assets.map((asset) => [asset.filename, asset.assetId, selection.requestName, selection.email, selection.status])];
    const blob = new Blob([rows.map((row) => row.map((value) => escape(String(value))).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    const safeName = (selection.requestName || "client-selection").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    anchor.href = url; anchor.download = `${safeName || "client-selection"}.csv`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const save = async () => {
    if (!detail) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const payload: any = { ...draft }; if (payload.pin === undefined) delete payload.pin;
      const gallery = await AdminApiService.updateClientGallery(id, payload);
      setDetail({ ...detail, gallery }); setDraft({ ...gallery, pin: undefined }); await load(); setMessage("Gallery settings saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save client gallery."); }
    finally { setBusy(false); }
  };

  const searchAssets = async () => {
    setBusy(true); setError("");
    try {
      const result = await AdminApiService.getAssetLibrary({ q: assetSearch.trim(), wedding: draft.weddingSlug || undefined, limit: 60 });
      const existing = new Set((detail?.assets || []).map((asset) => asset.assetId)); setAssetResults(result.assets.filter((asset) => !existing.has(asset.id)));
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to search Asset Library."); }
    finally { setBusy(false); }
  };

  const addOriginalFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).map((file) => ({ id: crypto.randomUUID(), file, status: file.type === "image/jpeg" ? "queued" as const : "error" as const, progress: 0, stage: file.type === "image/jpeg" ? "Ready" : "Unsupported file", error: file.type === "image/jpeg" ? "" : "Only full-resolution JPEG files are supported." }));
    setUploads((current) => [...current, ...next]); setMessage(""); setError("");
  };
  const updateUpload = (uploadId: string, patch: Partial<UploadItem>) => setUploads((current) => current.map((item) => item.id === uploadId ? { ...item, ...patch } : item));

  const uploadQueuedOriginals = async () => {
    const pending = uploads.filter((item) => item.status === "queued"); if (!pending.length) return;
    setUploading(true); setError(""); setMessage(""); let completed = 0; let failed = 0;
    for (const item of pending) {
      updateUpload(item.id, { status: "uploading", progress: 1, stage: "Starting", error: "" });
      try {
        await uploadPrivateOriginal({ galleryId: id, file: item.file, onProgress: (progress, stage) => updateUpload(item.id, { progress, stage }) });
        completed += 1; updateUpload(item.id, { status: "done", progress: 100, stage: "Complete", error: "" });
      } catch (err) { failed += 1; updateUpload(item.id, { status: "error", progress: 0, stage: "Upload failed", error: err instanceof Error ? err.message : "Upload failed." }); }
    }
    setUploading(false); await load();
    if (failed) setError(`${completed} originals uploaded; ${failed} failed. Failed files can be retried.`); else setMessage(`${completed} full-resolution original${completed === 1 ? "" : "s"} uploaded securely.`);
  };

  const createAlbum = async () => {
    const name = newAlbumName.trim(); if (!name) return;
    await mutateAlbum({ action: "create", name }, "Album created."); setNewAlbumName("");
  };
  const renameAlbum = async (album: ClientGalleryAlbum) => {
    const name = window.prompt("Album name", album.name)?.trim(); if (!name || name === album.name) return;
    await mutateAlbum({ action: "rename", albumId: album.id, name }, "Album renamed.");
  };
  const toggleSelected = (assetId: string) => setSelectedAssets((current) => { const next = new Set(current); if (next.has(assetId)) next.delete(assetId); else next.add(assetId); return next; });
  const selectAllVisible = () => setSelectedAssets((current) => current.size === visiblePhotos.length && visiblePhotos.length ? new Set() : new Set(visiblePhotos.map((asset) => asset.assetId)));
  const addSelectedToAlbum = async () => {
    if (!bulkAlbumId || !selectedAssets.size) return;
    await mutateAlbum({ action: "addAssets", albumId: bulkAlbumId, assetIds: Array.from(selectedAssets) }, `${selectedAssets.size} image${selectedAssets.size === 1 ? "" : "s"} added to album.`); setSelectedAssets(new Set());
  };
  const removeSelectedFromAlbum = async () => {
    if (!activeAlbumId || !selectedAssets.size) return;
    await mutateAlbum({ action: "removeAssets", albumId: activeAlbumId, assetIds: Array.from(selectedAssets) }, `${selectedAssets.size} image${selectedAssets.size === 1 ? "" : "s"} removed from album.`); setSelectedAssets(new Set());
  };

  if (!detail) return <div className="p-8">{error || "Loading client gallery…"}</div>;

  const gallery = detail.gallery;
  const shareUrl = publicUrl(gallery.accessToken);
  const queuedCount = uploads.filter((item) => item.status === "queued").length;
  const tabItems: Array<{ key: WorkspaceTab; label: string; icon: typeof Images }> = [
    { key: "photos", label: "Photos", icon: Images },
    { key: "activity", label: "Client Activity", icon: Activity },
    { key: "access", label: "Access", icon: ShieldCheck },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="p-6 md:p-8" style={{ maxWidth: 1680 }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/admin/client-galleries" className="inline-flex items-center gap-2 text-sm text-neutral-600"><ArrowLeft className="h-4 w-4" /> Client Galleries</Link>
        <div className="flex items-center gap-2 flex-wrap" style={{ position: "relative" }}>
          {draft.weddingSlug ? <Link to={`/admin/weddings/${encodeURIComponent(String(draft.weddingSlug))}/workspace`} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">Wedding Workspace</Link> : null}
          <a href={gallery.status === "live" ? shareUrl : undefined} target="_blank" rel="noreferrer" aria-disabled={gallery.status !== "live"} className={`rounded-lg border border-black/15 bg-white px-3 py-2 text-sm inline-flex items-center gap-2 ${gallery.status !== "live" ? "pointer-events-none opacity-40" : ""}`}><Eye className="h-4 w-4" /> Preview</a>
          <button type="button" onClick={() => setShowShare((value) => !value)} className="rounded-lg bg-black text-white px-4 py-2 text-sm inline-flex items-center gap-2"><Copy className="h-4 w-4" /> Share</button>
          {showShare ? <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xl" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 330, zIndex: 30 }}>
            <div className="flex items-center justify-between gap-3"><strong className="text-sm">Share private gallery</strong><button onClick={() => setShowShare(false)}><X className="h-4 w-4" /></button></div>
            <p className="mt-3 text-xs text-neutral-500 break-all">{shareUrl}</p>
            <button disabled={gallery.status !== "live"} onClick={async () => { await navigator.clipboard?.writeText(shareUrl); setMessage("Private gallery link copied."); setShowShare(false); }} className="mt-3 w-full rounded-lg bg-black text-white px-3 py-2 text-sm disabled:opacity-40">Copy gallery link</button>
            <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">Status: <strong>{gallery.status.toUpperCase()}</strong><br />PIN: <strong>{gallery.pinEnabled ? "Enabled" : "Not enabled"}</strong><br />Email access: <strong>{gallery.requireEmail ? "Required" : "Optional"}</strong></div>
          </div> : null}
        </div>
      </div>

      <div className="mt-5" style={{ display: "grid", gridTemplateColumns: "270px minmax(0, 1fr)", gap: 22, alignItems: "start" }}>
        <aside className="rounded-2xl border border-black/10 bg-white overflow-hidden" style={{ position: "sticky", top: 20 }}>
          <div style={{ aspectRatio: "4/3", background: "#eee", overflow: "hidden" }}>
            {gallery.coverThumb || gallery.coverWeb ? <img src={gallery.coverThumb || gallery.coverWeb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="h-full flex items-center justify-center text-neutral-400"><Images className="h-8 w-8" /></div>}
          </div>
          <div className="p-4 border-b border-black/10">
            <div className="flex items-start justify-between gap-2"><div><h1 className="text-lg font-semibold leading-tight">{gallery.title}</h1><p className="mt-1 text-xs text-neutral-500">{selectedWedding?.venue || gallery.weddingTitle || "Private client gallery"}</p></div><span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[.08em] ${gallery.status === "live" ? "bg-green-50 text-green-800" : "bg-neutral-100 text-neutral-600"}`}>{gallery.status}</span></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-neutral-50 p-2"><span className="block text-neutral-400">Photos</span><strong>{gallery.assetCount}</strong></div><div className="rounded-lg bg-neutral-50 p-2"><span className="block text-neutral-400">Originals</span><strong>{originalCount}</strong></div></div>
          </div>
          <div className="p-4 border-b border-black/10 text-sm">
            <p className="text-[10px] uppercase tracking-[.12em] text-neutral-400">Client</p><p className="mt-1 font-medium">{gallery.clientName || "Not assigned"}</p><p className="text-xs text-neutral-500 truncate">{gallery.clientEmail || "No primary email"}</p>
            <p className="mt-4 text-[10px] uppercase tracking-[.12em] text-neutral-400">Wedding date</p><p className="mt-1 text-sm">{formatDate(selectedWedding?.weddingDate || "")}</p>
            <p className="mt-4 text-[10px] uppercase tracking-[.12em] text-neutral-400">Last visit</p><p className="mt-1 text-sm">{lastVisitor ? formatDate(lastVisitor.lastSeenAt) : "No visits yet"}</p>
          </div>
          {activeTab === "photos" ? <div className="p-3">
            <p className="px-2 py-2 text-[10px] uppercase tracking-[.14em] text-neutral-400">Albums</p>
            <button onClick={() => setActiveAlbumId("")} className={`w-full rounded-lg px-3 py-2 text-left text-sm flex items-center justify-between ${!activeAlbumId ? "bg-black text-white" : "hover:bg-neutral-50"}`}><span>All Photos</span><span className="text-xs opacity-60">{detail.assets.length}</span></button>
            {activeAlbums.map((album) => <div key={album.id} className="mt-1 flex items-center gap-1"><button onClick={() => setActiveAlbumId(album.id)} className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm flex items-center justify-between ${activeAlbumId === album.id ? "bg-black text-white" : "hover:bg-neutral-50"}`}><span className="truncate">{album.name}</span><span className="text-xs opacity-60">{album.assetCount}</span></button><button title="Rename album" onClick={() => renameAlbum(album)} className="rounded-lg p-2 hover:bg-neutral-50">•••</button></div>)}
            <div className="mt-3 flex gap-2"><input value={newAlbumName} onChange={(e) => setNewAlbumName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createAlbum(); }} placeholder="New album" className="min-w-0 flex-1 rounded-lg border border-black/15 px-2 py-2 text-xs" /><button onClick={createAlbum} disabled={busy || !newAlbumName.trim()} title="Add album" className="rounded-lg border border-black/15 p-2 disabled:opacity-30"><Plus className="h-4 w-4" /></button></div>
          </div> : null}
        </aside>

        <div style={{ minWidth: 0 }}>
          <div className="rounded-2xl border border-black/10 bg-white">
            <div className="px-5 pt-5"><div className="flex items-start justify-between gap-4 flex-wrap"><div><p className="text-xs uppercase tracking-[.18em] text-neutral-500">Client Gallery Workspace</p><h2 className="text-3xl mt-1 font-semibold" style={{ letterSpacing: "-.02em" }}>{gallery.title}</h2></div><div className="text-xs text-neutral-500">{gallery.favouriteCount} favourites · {gallery.downloadCount || 0} downloads · {gallery.visitorCount || 0} visitors</div></div></div>
            <nav className="mt-5 px-3 flex gap-1 overflow-x-auto border-t border-black/10" aria-label="Client gallery workspace sections">{tabItems.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setTab(key)} className="px-4 py-3 text-sm inline-flex items-center gap-2 whitespace-nowrap" style={{ borderBottom: activeTab === key ? "2px solid #111" : "2px solid transparent", fontWeight: activeTab === key ? 600 : 400, color: activeTab === key ? "#111" : "#737373" }}><Icon className="h-4 w-4" /> {label}</button>)}</nav>
          </div>

          {message ? <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#f0fdf4", color: "#15803d" }}>{message}</p> : null}
          {error ? <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#fef2f2", color: "#b91c1c" }}>{error}</p> : null}

          {activeTab === "photos" ? <section className="mt-5">
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div><h3 className="text-xl font-semibold">{activeAlbum?.name || "All Photos"}</h3><p className="mt-1 text-xs text-neutral-500">{visiblePhotos.length} photo{visiblePhotos.length === 1 ? "" : "s"}{activeAlbum ? " in this album" : ""}</p></div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="rounded-lg border border-black/15 bg-white px-3 py-2 flex items-center gap-2"><Search className="h-4 w-4 text-neutral-400" /><input value={photoSearch} onChange={(e) => setPhotoSearch(e.target.value)} placeholder="Search photos" className="outline-none text-sm" style={{ width: 160 }} /></div>
                  <button onClick={selectAllVisible} className="rounded-lg border border-black/15 px-3 py-2 text-sm inline-flex items-center gap-2"><Check className="h-4 w-4" /> {selectedAssets.size === visiblePhotos.length && visiblePhotos.length ? "Clear" : "Select all"}</button>
                  <label className="rounded-lg bg-black text-white px-3 py-2 text-sm inline-flex items-center gap-2 cursor-pointer"><UploadCloud className="h-4 w-4" /> Upload photos<input type="file" multiple accept="image/jpeg,.jpg,.jpeg" onChange={(event) => { addOriginalFiles(event.target.files); event.currentTarget.value = ""; }} style={{ display: "none" }} /></label>
                </div>
              </div>

              {selectedAssets.size ? <div className="mt-4 rounded-xl border border-black/10 bg-neutral-50 p-3 flex items-center justify-between gap-3 flex-wrap"><strong className="text-sm">{selectedAssets.size} selected</strong><div className="flex items-center gap-2 flex-wrap"><select value={bulkAlbumId} onChange={(e) => setBulkAlbumId(e.target.value)} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"><option value="">Choose album…</option>{activeAlbums.map((album) => <option key={album.id} value={album.id}>{album.name}</option>)}</select><button disabled={!bulkAlbumId || busy} onClick={addSelectedToAlbum} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-40"><FolderPlus className="h-4 w-4" /> Add to album</button>{activeAlbumId ? <button disabled={busy} onClick={removeSelectedFromAlbum} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">Remove from this album</button> : null}<button onClick={() => setSelectedAssets(new Set())} className="rounded-lg p-2"><X className="h-4 w-4" /></button></div></div> : null}

              {uploads.length ? <div className="mt-4 rounded-xl border border-black/10 p-3"><div className="space-y-2">{uploads.map((item) => <div key={item.id} className="rounded-lg bg-neutral-50 p-3" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 80px 36px", gap: 10, alignItems: "center" }}><div className="min-w-0"><div className="flex items-center gap-2">{item.status === "done" ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : item.status === "error" ? <AlertCircle className="h-4 w-4 text-red-700" /> : <UploadCloud className="h-4 w-4 text-neutral-500" />}<span className="text-xs truncate">{item.file.name}</span></div><div className="mt-2" style={{ height: 4, borderRadius: 99, background: "#ddd" }}><div style={{ width: `${item.progress}%`, height: "100%", background: item.status === "error" ? "#b91c1c" : "#111", borderRadius: 99 }} /></div><p className="mt-1 text-[10px] text-neutral-500">{item.error || item.stage}</p></div><span className="text-xs text-right">{item.progress}%</span>{item.status === "error" ? <button onClick={() => updateUpload(item.id, { status: "queued", progress: 0, stage: "Ready", error: "" })}><RefreshCw className="h-4 w-4" /></button> : <button disabled={item.status === "uploading" || uploading} onClick={() => setUploads((current) => current.filter((upload) => upload.id !== item.id))}><X className="h-4 w-4" /></button>}</div>)}</div><div className="mt-3 flex justify-end"><button disabled={uploading || queuedCount === 0} onClick={uploadQueuedOriginals} className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-40">{uploading ? "Uploading…" : `Upload ${queuedCount} original${queuedCount === 1 ? "" : "s"}`}</button></div></div> : null}

              <div className="mt-4 flex items-center gap-2 flex-wrap"><button disabled={busy || !draft.weddingSlug} onClick={() => mutateAssets({ action: "importWedding" }, "Wedding assets imported.")} className="rounded-lg border border-black/15 px-3 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-40"><ImagePlus className="h-4 w-4" /> Import wedding assets</button><details className="relative"><summary className="list-none cursor-pointer rounded-lg border border-black/15 px-3 py-2 text-sm">Add from Asset Library</summary><div className="mt-2 rounded-xl border border-black/10 bg-white p-3 shadow-lg" style={{ width: "min(720px, 75vw)" }}><div className="flex gap-2"><input value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} placeholder="Search filename, caption or alt…" className="min-w-0 flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm" /><button onClick={searchAssets} disabled={busy} className="rounded-lg border border-black px-4 py-2 text-sm">Search</button></div>{assetResults.length ? <div className="mt-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>{assetResults.map((asset) => <button key={asset.id} onClick={() => mutateAssets({ action: "add", assetIds: [asset.id] }, "Image added.")} className="text-left rounded-lg border border-black/10 overflow-hidden"><img src={asset.files.thumb || asset.files.web} alt="" style={{ width: "100%", height: 80, objectFit: "cover" }} /><span className="block p-2 text-[10px] truncate">+ {asset.filename}</span></button>)}</div> : null}</div></details></div>
            </div>

            <div className="mt-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
              {visiblePhotos.map((asset) => <article key={asset.assetId} className="rounded-xl border border-black/10 overflow-hidden bg-white" style={{ position: "relative" }}>
                <div style={{ aspectRatio: "4/3", position: "relative", background: "#eee" }}><img src={asset.thumbSrc || asset.webSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: asset.hidden ? .42 : 1 }} /><button aria-label={selectedAssets.has(asset.assetId) ? "Deselect photo" : "Select photo"} onClick={() => toggleSelected(asset.assetId)} style={{ position: "absolute", top: 9, right: 9, width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", border: selectedAssets.has(asset.assetId) ? "1px solid #111" : "1px solid rgba(0,0,0,.25)", background: selectedAssets.has(asset.assetId) ? "#111" : "rgba(255,255,255,.94)", color: selectedAssets.has(asset.assetId) ? "#fff" : "#111" }}>{selectedAssets.has(asset.assetId) ? <Check className="h-4 w-4" /> : null}</button>{gallery.coverAssetId === asset.assetId ? <span className="absolute top-2 left-2 rounded-full bg-black text-white px-2 py-1 text-[9px] uppercase">Cover</span> : null}</div>
                <div className="p-3"><p className="text-xs truncate" title={asset.filename}>{asset.filename}</p><div className="mt-2 flex items-center justify-between gap-2"><div className="flex gap-1"><button title="Set cover" onClick={() => mutateAssets({ action: "setCover", assetId: asset.assetId }, "Cover updated.")} className="rounded-lg border border-black/10 p-2"><Star className="h-3.5 w-3.5" /></button><button title={asset.hidden ? "Show" : "Hide"} onClick={() => mutateAssets({ action: "setHidden", assetId: asset.assetId, hidden: !asset.hidden }, asset.hidden ? "Image shown." : "Image hidden.")} className="rounded-lg border border-black/10 p-2">{asset.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button><button title="Remove from gallery" onClick={() => mutateAssets({ action: "remove", assetId: asset.assetId }, "Image removed.")} className="rounded-lg border border-black/10 p-2"><Trash2 className="h-3.5 w-3.5" /></button></div>{asset.hasOriginal ? <span title="Private original stored" className="text-[9px] uppercase tracking-[.08em] text-neutral-400"><Download className="inline h-3 w-3 mr-1" />Original</span> : null}</div></div>
              </article>)}
            </div>
            {!visiblePhotos.length ? <div className="mt-4 rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center text-sm text-neutral-500">{activeAlbum ? "This album is empty. Select photographs from All Photos and add them here." : "No photographs match this view."}</div> : null}
            {activeAlbum ? <div className="mt-5 text-right"><button onClick={() => mutateAlbum({ action: "archive", albumId: activeAlbum.id }, "Album archived.").then(() => setActiveAlbumId(""))} className="text-xs text-red-700 underline underline-offset-4">Archive this album</button></div> : null}
          </section> : null}

          {activeTab === "activity" ? <section className="mt-5 space-y-5">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}><button onClick={() => document.getElementById("favourites-panel")?.scrollIntoView({ behavior: "smooth" })} className="rounded-2xl border border-black/10 bg-white p-5 text-left"><Heart className="h-5 w-5" /><strong className="block mt-3 text-2xl">{gallery.favouriteCount}</strong><span className="text-xs text-neutral-500">Favourites</span></button><button onClick={() => document.getElementById("selections-panel")?.scrollIntoView({ behavior: "smooth" })} className="rounded-2xl border border-black/10 bg-white p-5 text-left"><ClipboardList className="h-5 w-5" /><strong className="block mt-3 text-2xl">{detail.selections.length}</strong><span className="text-xs text-neutral-500">Selection responses</span></button><button onClick={() => document.getElementById("visitors-panel")?.scrollIntoView({ behavior: "smooth" })} className="rounded-2xl border border-black/10 bg-white p-5 text-left"><Users className="h-5 w-5" /><strong className="block mt-3 text-2xl">{gallery.visitorCount || detail.visitors.length}</strong><span className="text-xs text-neutral-500">Visitors</span></button></div>
            <section id="favourites-panel" className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-start justify-between gap-4 flex-wrap"><div><div className="flex items-center gap-2"><Heart className="h-5 w-5" /><h3 className="text-xl font-semibold">Favourites</h3></div><p className="mt-2 text-sm text-neutral-600">Review client favourites as thumbnails or download secure full-resolution originals for album design.</p></div><div className="flex gap-2"><Link to={`/admin/client-galleries/${id}/review?source=favourites&group=combined`} className="rounded-lg border border-black/15 px-4 py-2.5 text-sm inline-flex items-center gap-2"><Eye className="h-4 w-4" /> View</Link>{gallery.favouriteCount > 0 ? <a href={AdminApiService.clientGalleryBulkDownloadUrl(id, { source: "favourites", group: "combined" })} className="rounded-lg bg-black text-white px-4 py-2.5 text-sm inline-flex items-center gap-2"><Download className="h-4 w-4" /> Download all</a> : null}</div></div></section>
            <section id="selections-panel" className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /><h3 className="text-xl font-semibold">Client selections</h3></div><div className="mt-4" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gap: 18, alignItems: "start" }}><div className="space-y-3">{detail.selectionRequests.length ? detail.selectionRequests.map((request) => { const responses = detail.selections.filter((selection) => selection.requestId === request.id); return <div key={request.id} className="rounded-xl border border-black/10 p-4"><div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{request.name}</strong><p className="mt-1 text-xs text-neutral-500">{request.instructions || "No instructions"}</p><p className="mt-2 text-[10px] uppercase tracking-[.08em] text-neutral-400">{responses.length} response{responses.length === 1 ? "" : "s"} · {request.status}</p></div>{request.status === "active" ? <button onClick={() => mutateSelection({ action: "archiveRequest", requestId: request.id }, "Selection request archived.")} title="Archive"><Trash2 className="h-4 w-4" /></button> : null}</div>{responses.map((selection) => <div key={selection.id} className="mt-3 rounded-lg bg-neutral-50 p-3 flex items-center justify-between gap-3 flex-wrap"><div><p className="text-sm">{selection.displayName || selection.email || "Anonymous visitor"}</p><p className="text-[10px] uppercase text-neutral-400">{selection.selectedCount} selected · {selection.status}</p></div><div className="flex gap-1"><Link title="View thumbnails" to={`/admin/client-galleries/${id}/review?source=selection&selectionId=${encodeURIComponent(selection.id)}`} className="rounded-lg border border-black/10 p-2"><Eye className="h-4 w-4" /></Link>{selection.assets.length ? <a title="Download originals" href={AdminApiService.clientGalleryBulkDownloadUrl(id, { source: "selection", selectionId: selection.id })} className="rounded-lg border border-black/10 p-2"><Download className="h-4 w-4" /></a> : null}<button title="Copy filenames" disabled={!selection.assets.length} onClick={() => copySelectionFilenames(selection.assets.map((asset) => asset.filename))} className="rounded-lg border border-black/10 p-2 disabled:opacity-30"><Copy className="h-4 w-4" /></button><button title="Download CSV" disabled={!selection.assets.length} onClick={() => downloadSelectionCsv(selection)} className="rounded-lg border border-black/10 p-2 disabled:opacity-30"><Download className="h-4 w-4" /></button>{selection.status === "submitted" ? <button title="Reopen" onClick={() => mutateSelection({ action: "reopenSelection", selectionId: selection.id }, "Selection reopened for editing.")} className="rounded-lg border border-black/10 p-2"><RotateCcw className="h-4 w-4" /></button> : null}</div></div>)}</div>; }) : <p className="text-sm text-neutral-500">No selection requests yet.</p>}</div><aside className="rounded-xl bg-neutral-50 border border-black/10 p-4"><div className="flex items-center gap-2"><Plus className="h-4 w-4" /><strong className="text-sm">New selection request</strong></div><input value={selectionDraft.name} onChange={(e) => setSelectionDraft({ ...selectionDraft, name: e.target.value })} className="mt-3 w-full rounded-lg border border-black/15 px-3 py-2 text-sm" placeholder="Selection name" /><textarea value={selectionDraft.instructions} onChange={(e) => setSelectionDraft({ ...selectionDraft, instructions: e.target.value })} className="mt-2 w-full rounded-lg border border-black/15 px-3 py-2 text-sm" rows={3} /><div className="mt-2 grid grid-cols-2 gap-2"><input type="number" min="0" value={selectionDraft.minImages} onChange={(e) => setSelectionDraft({ ...selectionDraft, minImages: Math.max(0, Number(e.target.value) || 0) })} className="rounded-lg border border-black/15 px-3 py-2 text-sm" placeholder="Min" /><input type="number" min="0" value={selectionDraft.maxImages} onChange={(e) => setSelectionDraft({ ...selectionDraft, maxImages: Math.max(0, Number(e.target.value) || 0) })} className="rounded-lg border border-black/15 px-3 py-2 text-sm" placeholder="Max" /></div><button disabled={busy || !selectionDraft.name.trim()} onClick={createSelectionRequest} className="mt-3 w-full rounded-lg bg-black text-white px-4 py-2.5 text-sm disabled:opacity-40">Create request</button></aside></div></section>
            <section id="visitors-panel" className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-2"><Users className="h-5 w-5" /><h3 className="text-xl font-semibold">Recent visitors</h3></div>{detail.visitors.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-[10px] uppercase tracking-[.08em] text-neutral-400"><th className="py-2">Visitor</th><th>Role</th><th>Visits</th><th>Last visit</th><th>Originals</th></tr></thead><tbody>{detail.visitors.slice(0, 50).map((visitor) => <tr key={visitor.visitorKey} className="border-t border-black/5"><td className="py-3">{visitor.displayName || visitor.email || "Anonymous"}<span className="block text-xs text-neutral-400">{visitor.email}</span></td><td>{visitor.role.replaceAll("_", " ")}</td><td>{visitor.visitCount}</td><td>{formatDate(visitor.lastSeenAt)}</td><td>{visitor.canDownloadOriginals ? "Allowed" : "View only"}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-neutral-500">No identified visitors yet.</p>}</section>
          </section> : null}

          {activeTab === "access" ? <section className="mt-5" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 18, alignItems: "start" }}>
            <div className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /><h3 className="text-xl font-semibold">Gallery access</h3></div><p className="mt-2 text-sm text-neutral-600">Control email identification, PIN protection, expiry and full-resolution permissions.</p><div className="mt-5 space-y-4"><label className="flex items-start gap-3 rounded-xl border border-black/10 p-4"><input type="checkbox" checked={draft.requireEmail ?? false} onChange={(e) => setDraft({ ...draft, requireEmail: e.target.checked })} /><span><strong className="block text-sm">Require email to enter</strong><span className="block text-xs text-neutral-500 mt-1">Visitors identify themselves before viewing. Secure magic-link sign-in can then sync activity across devices.</span></span></label><label className="flex items-start gap-3 rounded-xl border border-black/10 p-4"><input type="checkbox" checked={draft.allowFavourites ?? true} onChange={(e) => setDraft({ ...draft, allowFavourites: e.target.checked })} /><span><strong className="block text-sm">Allow favourites</strong><span className="block text-xs text-neutral-500 mt-1">Clients and guests can heart photographs.</span></span></label><label className="flex items-start gap-3 rounded-xl border border-black/10 p-4"><input type="checkbox" checked={draft.allowDownloads ?? false} onChange={(e) => setDraft({ ...draft, allowDownloads: e.target.checked })} /><span><strong className="block text-sm">Enable original downloads</strong><span className="block text-xs text-neutral-500 mt-1">Master switch for secure full-resolution delivery.</span></span></label><label className="flex items-start gap-3 rounded-xl border border-black/10 p-4"><input type="checkbox" disabled={!draft.requireEmail || !draft.allowDownloads} checked={draft.allowGuestDownloads ?? false} onChange={(e) => setDraft({ ...draft, allowGuestDownloads: e.target.checked })} /><span><strong className="block text-sm">Allow guest full-resolution downloads</strong><span className="block text-xs text-neutral-500 mt-1">Leave off to reserve originals for authorised client emails.</span></span></label><details className="rounded-xl border border-black/10 p-4"><summary className="cursor-pointer text-sm font-medium">Advanced security</summary><div className="mt-4 space-y-3"><label className="block text-xs uppercase tracking-[.1em] text-neutral-500">New / replacement PIN<input value={draft.pin || ""} onChange={(e) => setDraft({ ...draft, pin: e.target.value })} placeholder={gallery.pinEnabled ? "Leave blank to keep current PIN" : "Optional"} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5 text-sm normal-case tracking-normal" /></label><label className="block text-xs uppercase tracking-[.1em] text-neutral-500">Expiry<input type="datetime-local" value={(draft.expiresAt || "").slice(0,16)} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5 text-sm normal-case tracking-normal" /></label></div></details><button onClick={save} disabled={busy} className="rounded-lg bg-black text-white px-5 py-3 inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> Save access settings</button></div></div>
            <aside className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-2"><UserPlus className="h-5 w-5" /><h3 className="text-lg font-semibold">Authorised client emails</h3></div><p className="mt-2 text-xs text-neutral-500">Contacts can receive client-level permissions and secure sign-in.</p><div className="mt-4 space-y-2">{detail.contacts.map((contact) => <div key={contact.emailNormalized} className="rounded-xl border border-black/10 bg-neutral-50 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium truncate">{contact.displayName || contact.email}</p><p className="text-xs text-neutral-500 truncate">{contact.email}</p><p className="mt-1 text-[10px] uppercase tracking-[.08em] text-neutral-400">{contact.role.replaceAll("_", " ")} · {contact.allowOriginalDownloads ? "originals allowed" : "view only"}</p></div><button title="Remove" onClick={() => mutateContact({ action: "remove", email: contact.email }, "Access contact removed.")}><X className="h-4 w-4" /></button></div></div>)}</div><div className="mt-4 rounded-xl border border-black/10 p-3 space-y-2"><input value={contactDraft.displayName} onChange={(e) => setContactDraft({ ...contactDraft, displayName: e.target.value })} placeholder="Name (optional)" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm" /><input type="email" value={contactDraft.email} onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })} placeholder="client@example.com" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm" /><div className="grid grid-cols-2 gap-2"><select value={contactDraft.role} onChange={(e) => setContactDraft({ ...contactDraft, role: e.target.value })} className="rounded-lg border border-black/15 px-3 py-2 text-sm bg-white"><option value="client">Client</option><option value="primary_client">Primary client</option><option value="family">Family</option><option value="other">Other</option></select><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={contactDraft.allowOriginalDownloads} onChange={(e) => setContactDraft({ ...contactDraft, allowOriginalDownloads: e.target.checked })} /> Full-res</label></div><button disabled={busy || !contactDraft.email.trim()} onClick={addContact} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40"><UserPlus className="h-4 w-4" /> Add contact</button></div></aside>
          </section> : null}

          {activeTab === "settings" ? <section className="mt-5 rounded-2xl border border-black/10 bg-white p-5" style={{ maxWidth: 880 }}><div className="flex items-center gap-2"><Settings className="h-5 w-5" /><h3 className="text-xl font-semibold">Gallery settings</h3></div><p className="mt-2 text-sm text-neutral-600">General gallery identity and wedding linkage. Access and security now live in the Access tab.</p><div className="mt-5" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}><label className="block"><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Title</span><input value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5" /></label><label className="block"><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Status</span><select value={draft.status || "draft"} onChange={(e) => setDraft({ ...draft, status: e.target.value as any })} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5 bg-white"><option value="draft">Draft</option><option value="live">Live</option><option value="archived">Archived</option></select></label><label className="block"><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Client name</span><input value={draft.clientName || ""} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5" /></label><label className="block"><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Primary client email</span><input value={draft.clientEmail || ""} onChange={(e) => setDraft({ ...draft, clientEmail: e.target.value })} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5" /></label><label className="block" style={{ gridColumn: "1 / -1" }}><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Wedding</span><select value={draft.weddingSlug || ""} onChange={(e) => setDraft({ ...draft, weddingSlug: e.target.value })} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5 bg-white"><option value="">No linked wedding</option>{detail.weddings.map((wedding) => <option key={wedding.slug} value={wedding.slug}>{wedding.title || wedding.couple || wedding.slug}</option>)}</select></label><label className="block" style={{ gridColumn: "1 / -1" }}><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Gallery introduction</span><textarea value={draft.intro || ""} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} rows={5} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5" /></label></div><div className="mt-5 flex items-center gap-3"><button onClick={save} disabled={busy} className="rounded-lg bg-black text-white px-5 py-3 inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> Save settings</button>{gallery.status === "live" ? <button onClick={() => navigator.clipboard?.writeText(shareUrl)} className="rounded-lg border border-black/15 px-5 py-3 inline-flex items-center gap-2"><Copy className="h-4 w-4" /> Copy private link</button> : null}</div></section> : null}
        </div>
      </div>
    </div>
  );
}
