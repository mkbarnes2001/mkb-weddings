import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowUpDown,
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
  GripVertical,
  Heart,
  ImagePlus,
  Images,
  MoreVertical,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShoppingBag,
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
import type { ClientGalleryStoreAdminPayload } from "../types/printStore";

function publicUrl(token: string) {
  return `${window.location.protocol}//${window.location.host.replace(/^admin\./, "www.")}/client-gallery/${token}`;
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

const BRANDING_PRESETS = [
  { name: "Studio monochrome", accentColor: "#111111", backgroundColor: "#f7f6f3", surfaceColor: "#ffffff", textColor: "#111111" },
  { name: "Warm ivory", accentColor: "#6b4f3a", backgroundColor: "#f5efe6", surfaceColor: "#fffaf3", textColor: "#2b211a" },
  { name: "Soft slate", accentColor: "#334155", backgroundColor: "#f1f5f9", surfaceColor: "#ffffff", textColor: "#0f172a" },
] as const;

function headingFontFamily(value: string) {
  if (value === "modern") return '"Montserrat", "Avenir Next", Arial, sans-serif';
  if (value === "classic") return 'Georgia, "Times New Roman", serif';
  return '"Canela", "Playfair Display", Georgia, serif';
}

function contrastText(value: string) {
  const hex = value.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111111" : "#ffffff";
}

type UploadItem = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  stage: string;
  error: string;
};

type WorkspaceTab = "photos" | "activity" | "access" | "branding" | "store" | "settings";

export function ClientGalleryEditor() {
  const { id = "" } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: WorkspaceTab = rawTab === "activity" || rawTab === "access" || rawTab === "branding" || rawTab === "store" || rawTab === "settings" ? rawTab : "photos";
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
  const [brandingDraft, setBrandingDraft] = useState<ClientGalleryDetailPayload["branding"] | null>(null);
  const [brandingUploading, setBrandingUploading] = useState(false);
  const [openPhotoMenuId, setOpenPhotoMenuId] = useState("");
  const [photoMenuAlbumId, setPhotoMenuAlbumId] = useState("");
  const [previewAssetId, setPreviewAssetId] = useState("");
  const [activeAlbumId, setActiveAlbumId] = useState("");
  const [newAlbumName, setNewAlbumName] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [bulkAlbumId, setBulkAlbumId] = useState("");
  const [draggedAssetId, setDraggedAssetId] = useState("");
  const [dragOverAssetId, setDragOverAssetId] = useState("");
  const [contactDraft, setContactDraft] = useState({ email: "", displayName: "", role: "client", allowOriginalDownloads: true });
  const [selectionDraft, setSelectionDraft] = useState({ name: "Album Selection", instructions: "Choose the photographs you would like included.", minImages: 0, maxImages: 0 });
  const [storeData, setStoreData] = useState<ClientGalleryStoreAdminPayload | null>(null);
  const [storeDraft, setStoreDraft] = useState<ClientGalleryStoreAdminPayload["settings"] | null>(null);

  const load = async () => {
    setError("");
    try {
      const next = await AdminApiService.getClientGallery(id);
      setDetail(next);
      setDraft({ ...next.gallery, pin: undefined });
      setBrandingDraft(next.branding);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load client gallery.");
    }
  };

  const loadStore = async () => {
    setError("");
    try {
      const next = await AdminApiService.getClientGalleryStore(id);
      setStoreData(next);
      setStoreDraft({ ...next.settings });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load gallery store settings.");
    }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (activeTab === "store") loadStore(); }, [id, activeTab]);
  useEffect(() => { setSelectedAssets(new Set()); setOpenPhotoMenuId(""); setDraggedAssetId(""); setDragOverAssetId(""); }, [activeAlbumId, activeTab]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.("[data-photo-menu]")) setOpenPhotoMenuId("");
    };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpenPhotoMenuId(""); setPreviewAssetId(""); } };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", key); };
  }, []);

  const selectedWedding = useMemo(
    () => detail?.weddings.find((wedding) => wedding.slug === draft.weddingSlug),
    [detail?.weddings, draft.weddingSlug],
  );
  const lastVisitor = useMemo(() => (detail?.visitors || []).slice().sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)))[0], [detail?.visitors]);
  const activeAlbums = useMemo(() => (detail?.albums || []).filter((album) => album.status === "active"), [detail?.albums]);
  const activeAlbum = useMemo(() => activeAlbums.find((album) => album.id === activeAlbumId) || null, [activeAlbums, activeAlbumId]);
  const visiblePhotos = useMemo(() => {
    const query = photoSearch.trim().toLowerCase();
    const photos = (detail?.assets || []).filter((asset) => {
      if (activeAlbumId && !asset.albumIds.includes(activeAlbumId)) return false;
      if (query && !asset.filename.toLowerCase().includes(query)) return false;
      return true;
    });
    const sortMode = detail?.gallery.sortMode || "custom";
    return photos.slice().sort((left, right) => {
      if (sortMode === "filename") {
        return left.filename.localeCompare(right.filename, undefined, { numeric: true, sensitivity: "base" });
      }
      if (sortMode === "capture_time") {
        return String(left.capturedAt || "").localeCompare(String(right.capturedAt || ""))
          || left.filename.localeCompare(right.filename, undefined, { numeric: true, sensitivity: "base" });
      }
      const leftOrder = activeAlbumId ? left.albumSortOrders[activeAlbumId] ?? Number.MAX_SAFE_INTEGER : left.sortOrder;
      const rightOrder = activeAlbumId ? right.albumSortOrders[activeAlbumId] ?? Number.MAX_SAFE_INTEGER : right.sortOrder;
      return leftOrder - rightOrder || left.filename.localeCompare(right.filename, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [detail?.assets, detail?.gallery.sortMode, activeAlbumId, photoSearch]);

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

  const saveBranding = async () => {
    if (!brandingDraft) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const branding = await AdminApiService.updateClientGalleryBranding(id, {
        logoMode: brandingDraft.logoMode,
        accentColor: brandingDraft.accentColor,
        backgroundColor: brandingDraft.backgroundColor,
        surfaceColor: brandingDraft.surfaceColor,
        textColor: brandingDraft.textColor,
        headingFont: brandingDraft.headingFont,
        showStudioName: brandingDraft.showStudioName,
      });
      setBrandingDraft(branding);
      setDetail((current) => current ? { ...current, branding } : current);
      setMessage("Client gallery branding saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save gallery branding."); }
    finally { setBusy(false); }
  };

  const resetBranding = async () => {
    if (!window.confirm("Reset this gallery to the studio branding defaults?")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const branding = await AdminApiService.updateClientGalleryBranding(id, { action: "reset" });
      setBrandingDraft(branding);
      setDetail((current) => current ? { ...current, branding } : current);
      setMessage("Branding reset to studio defaults.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to reset gallery branding."); }
    finally { setBusy(false); }
  };

  const uploadBrandingLogo = async (file: File | null) => {
    if (!file) return;
    setBrandingUploading(true); setError(""); setMessage("");
    try {
      const branding = await AdminApiService.uploadClientGalleryBrandingLogo(id, file);
      setBrandingDraft(branding);
      setDetail((current) => current ? { ...current, branding } : current);
      setMessage("Custom gallery logo uploaded.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to upload gallery logo."); }
    finally { setBrandingUploading(false); }
  };

  const runPhotoAction = async (payload: Record<string, unknown>, success: string) => {
    setOpenPhotoMenuId("");
    await mutateAssets(payload, success);
  };

  const addPhotoToAlbum = async (assetId: string) => {
    if (!photoMenuAlbumId) return;
    setOpenPhotoMenuId("");
    await mutateAlbum({ action: "addAssets", albumId: photoMenuAlbumId, assetIds: [assetId] }, "Image added to album.");
    setPhotoMenuAlbumId("");
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

  const setPhotoSortMode = async (sortMode: "custom" | "capture_time" | "filename") => {
    await mutateAssets({ action: "setSortMode", sortMode }, sortMode === "custom" ? "Custom photo order enabled." : sortMode === "filename" ? "Photos ordered by filename." : "Photos ordered by capture time.");
  };

  const saveStoreSettings = async () => {
    if (!storeDraft) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await AdminApiService.updateClientGalleryStore(id, storeDraft);
      setStoreData(next);
      setStoreDraft({ ...next.settings });
      setMessage(storeDraft.enabled ? "Print Store enabled for this gallery." : "Print Store settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save gallery store settings.");
    } finally { setBusy(false); }
  };

  const reorderVisiblePhotos = async (targetAssetId: string) => {
    const sourceAssetId = draggedAssetId;
    setDraggedAssetId("");
    setDragOverAssetId("");
    if (!sourceAssetId || sourceAssetId === targetAssetId || detail?.gallery.sortMode !== "custom" || photoSearch.trim()) return;
    const assetIds = visiblePhotos.map((asset) => asset.assetId);
    const fromIndex = assetIds.indexOf(sourceAssetId);
    const toIndex = assetIds.indexOf(targetAssetId);
    if (fromIndex < 0 || toIndex < 0) return;
    assetIds.splice(toIndex, 0, assetIds.splice(fromIndex, 1)[0]);
    if (activeAlbumId) {
      await mutateAlbum({ action: "reorderAssets", albumId: activeAlbumId, assetIds }, "Album photo order updated.");
    } else {
      await mutateAssets({ action: "reorder", assetIds }, "Gallery photo order updated.");
    }
  };

  if (!detail) return <div className="p-8">{error || "Loading client gallery…"}</div>;

  const gallery = detail.gallery;
  const shareUrl = publicUrl(gallery.accessToken);
  const queuedCount = uploads.filter((item) => item.status === "queued").length;
  const previewAsset = detail.assets.find((asset) => asset.assetId === previewAssetId) || null;
  const settingsTabs: Array<{ key: Extract<WorkspaceTab, "settings" | "access" | "store">; label: string; description: string }> = [
    { key: "settings", label: "General", description: "Identity, status and wedding details" },
    { key: "access", label: "Access & privacy", description: "Email, PIN, downloads and contacts" },
    { key: "store", label: "Shopping cart / store", description: "Products, pricing and client ordering" },
  ];
  const isSettingsArea = activeTab === "settings" || activeTab === "access" || activeTab === "store";
  const primaryTab = isSettingsArea ? "settings" : activeTab;
  const primaryTabs: Array<{ key: "photos" | "activity" | "settings" | "branding"; label: string; icon: typeof Images }> = [
    { key: "photos", label: "Photos", icon: Images },
    { key: "activity", label: "Activity", icon: Activity },
    { key: "settings", label: "Settings", icon: Settings },
    { key: "branding", label: "Branding", icon: Palette },
  ];

  return (
    <div className="client-gallery-editor-page p-4 sm:p-6 lg:p-8" style={{ maxWidth: 1680 }}>
      <style>{`
        .client-gallery-editor-shell {
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }
        .client-gallery-editor-sidebar {
          position: sticky;
          top: 18px;
          overflow: hidden;
        }
        .client-gallery-primary-tabs {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 4px;
          padding: 12px;
          border-bottom: 1px solid rgba(0,0,0,.08);
        }
        .client-gallery-primary-tab {
          min-width: 0;
          border-radius: 10px;
          padding: 10px 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          line-height: 1.1;
          color: #737373;
        }
        .client-gallery-primary-tab[data-active="true"] {
          background: #111;
          color: #fff;
          font-weight: 600;
        }
        .client-gallery-context-menu {
          padding: 12px;
        }
        .client-gallery-context-menu button,
        .client-gallery-context-menu a {
          width: 100%;
        }
        .client-gallery-settings-column {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 18px;
          max-width: 960px;
          align-items: start;
        }
        .client-gallery-branding-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(330px, .72fr);
          gap: 18px;
          align-items: start;
        }
        .client-gallery-activity-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
          gap: 10px;
        }
        .client-gallery-activity-stat {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 14px;
          border-radius: 14px;
          text-align: left;
          transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
        }
        .client-gallery-activity-stat:hover {
          border-color: rgba(0,0,0,.22);
          box-shadow: 0 8px 22px rgba(0,0,0,.055);
          transform: translateY(-1px);
        }
        .client-gallery-activity-stat-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #f5f5f5;
          color: #262626;
        }
        .client-gallery-activity-stat-copy {
          min-width: 0;
          flex: 1 1 auto;
        }
        .client-gallery-activity-stat-value {
          display: block;
          font-size: 18px;
          line-height: 1;
          font-weight: 650;
          color: #171717;
        }
        .client-gallery-activity-stat-label {
          display: block;
          margin-top: 4px;
          font-size: 10.5px;
          line-height: 1.25;
          color: #737373;
        }
        .client-gallery-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .client-gallery-panel-actions,
        .client-gallery-response-actions {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }
        .client-gallery-panel-actions > *,
        .client-gallery-response-actions > * {
          flex: 0 0 auto;
          white-space: nowrap;
        }
        .client-gallery-response-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .client-gallery-activity-split {
          display: grid;
          grid-template-columns: minmax(0,1fr) 330px;
          gap: 18px;
          align-items: start;
        }
        .client-gallery-photo-toolbar {
          display: grid;
          grid-template-columns: auto auto minmax(118px, 145px) minmax(150px, 1fr) auto auto;
          gap: 6px;
          align-items: center;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,.08);
        }
        .client-gallery-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 16px;
        }
        .client-gallery-store-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 16px;
        }
        @media (max-width: 1180px) {
          .client-gallery-editor-shell { grid-template-columns: 245px minmax(0,1fr); gap: 18px; }
          .client-gallery-branding-grid { grid-template-columns: minmax(0,1fr); }
          .client-gallery-branding-grid aside { position: static !important; }
          .client-gallery-activity-split { grid-template-columns: minmax(0,1fr); }
          .client-gallery-photo-toolbar { grid-template-columns: repeat(3, minmax(0,1fr)); }
          .client-gallery-editor-actions { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(132px, max-content)); justify-content: end; }
          .client-gallery-editor-actions > * { min-width: 0; }
        }
        @media (max-width: 860px) {
          .client-gallery-editor-shell { grid-template-columns: minmax(0,1fr); }
          .client-gallery-editor-sidebar { position: static; }
          .client-gallery-sidebar-overview {
            display: grid;
            grid-template-columns: minmax(180px, .9fr) minmax(0, 1.1fr);
          }
          .client-gallery-sidebar-cover { min-height: 100%; }
          .client-gallery-sidebar-cover img { min-height: 100%; }
          .client-gallery-context-menu { max-height: none; }
          .client-gallery-activity-stats { grid-template-columns: repeat(3, minmax(150px,1fr)); }
        }
        @media (max-width: 640px) {
          .client-gallery-editor-page { padding-left: 12px !important; padding-right: 12px !important; }
          .client-gallery-editor-topbar { align-items: stretch; }
          .client-gallery-editor-actions { width: 100%; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)) !important; justify-content: stretch !important; }
          .client-gallery-editor-actions > a,
          .client-gallery-editor-actions > button { width: 100%; min-height: 40px; justify-content: center; white-space: nowrap; }
          .client-gallery-editor-shell { gap: 14px; }
          .client-gallery-sidebar-overview { grid-template-columns: minmax(0,1fr); }
          .client-gallery-primary-tabs { position: sticky; top: 0; z-index: 5; background: #fff; }
          .client-gallery-primary-tab { padding: 9px 3px; font-size: 9px; }
          .client-gallery-context-menu { padding: 10px; }
          .client-gallery-activity-stats { grid-template-columns: minmax(0,1fr); }
          .client-gallery-activity-stat { padding: 12px 13px; }
          .client-gallery-panel-actions { width: 100%; }
          .client-gallery-panel-actions > * { flex: 1 1 118px; justify-content: center; }
          .client-gallery-response-actions { width: 100%; }
          .client-gallery-response-actions > * { flex: 0 0 auto; }
          .client-gallery-photo-toolbar { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .client-gallery-photo-toolbar > * { width: 100%; }
          .client-gallery-form-grid,
          .client-gallery-store-grid { grid-template-columns: minmax(0,1fr); }
          .client-gallery-form-grid > [style*="grid-column"],
          .client-gallery-store-grid > .col-span-2 { grid-column: auto !important; }
          .client-gallery-settings-column > div,
          .client-gallery-settings-column > aside,
          .client-gallery-branding-grid > div,
          .client-gallery-branding-grid > aside { border-radius: 14px; }
        }
      `}</style>
      <div className="client-gallery-editor-topbar flex items-center justify-between gap-4 flex-wrap">
        <Link to="/admin/client-galleries" className="inline-flex items-center gap-2 text-sm text-neutral-600"><ArrowLeft className="h-4 w-4" /> Client Galleries</Link>
        <div className="client-gallery-editor-actions flex items-center gap-2 flex-wrap" style={{ position: "relative" }}>
          {draft.weddingSlug ? <Link to={`/admin/weddings/${encodeURIComponent(String(draft.weddingSlug))}/workspace`} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">Wedding Workspace</Link> : null}
          <a href={gallery.status === "live" ? shareUrl : undefined} target="_blank" rel="noreferrer" aria-disabled={gallery.status !== "live"} className={`rounded-lg border border-black/15 bg-white px-3 py-2 text-sm inline-flex items-center gap-2 ${gallery.status !== "live" ? "pointer-events-none opacity-40" : ""}`}><Eye className="h-4 w-4" /> Preview</a>
          <button type="button" onClick={() => setShowShare((value) => !value)} className="rounded-lg bg-black text-white px-4 py-2 text-sm inline-flex items-center gap-2"><Copy className="h-4 w-4" /> Share</button>
          {showShare ? <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xl" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: "min(330px, calc(100vw - 24px))", zIndex: 30 }}>
            <div className="flex items-center justify-between gap-3"><strong className="text-sm">Share private gallery</strong><button onClick={() => setShowShare(false)}><X className="h-4 w-4" /></button></div>
            <p className="mt-3 text-xs text-neutral-500 break-all">{shareUrl}</p>
            <button disabled={gallery.status !== "live"} onClick={async () => { await navigator.clipboard?.writeText(shareUrl); setMessage("Private gallery link copied."); setShowShare(false); }} className="mt-3 w-full rounded-lg bg-black text-white px-3 py-2 text-sm disabled:opacity-40">Copy gallery link</button>
            <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">Status: <strong>{gallery.status.toUpperCase()}</strong><br />PIN: <strong>{gallery.pinEnabled ? "Enabled" : "Not enabled"}</strong><br />Email access: <strong>{gallery.requireEmail ? "Required" : "Optional"}</strong></div>
          </div> : null}
        </div>
      </div>

      <div className="client-gallery-editor-shell mt-5">
        <aside className="client-gallery-editor-sidebar rounded-2xl border border-black/10 bg-white">
          <div className="client-gallery-sidebar-overview">
            <div className="client-gallery-sidebar-cover" style={{ aspectRatio: "4/3", background: "#eee", overflow: "hidden" }}>
              {gallery.coverThumb || gallery.coverWeb ? <img src={gallery.coverThumb || gallery.coverWeb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div className="h-full flex items-center justify-center text-neutral-400"><Images className="h-8 w-8" /></div>}
            </div>
            <div>
              <div className="p-4 border-b border-black/10">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h1 className="text-lg font-semibold leading-tight break-words">{gallery.title}</h1><p className="mt-1 text-xs text-neutral-500 break-words">{selectedWedding?.venue || gallery.weddingTitle || "Private client gallery"}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] uppercase tracking-[.08em] ${gallery.status === "live" ? "bg-green-50 text-green-800" : "bg-neutral-100 text-neutral-600"}`}>{gallery.status}</span></div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-neutral-50 p-2"><span className="block text-neutral-400">Photos</span><strong>{gallery.assetCount}</strong></div><div className="rounded-lg bg-neutral-50 p-2"><span className="block text-neutral-400">Shoot date</span><strong>{formatDate(selectedWedding?.weddingDate || "")}</strong></div></div>
              </div>
              <div className="p-4 border-b border-black/10 text-sm">
                <div className="rounded-xl border border-black/10 p-3"><p className="text-[10px] uppercase tracking-[.12em] text-neutral-400">Client</p><p className="mt-1 font-medium break-words">{gallery.clientName || "Not assigned"}</p><p className="text-xs text-neutral-500 break-all">{gallery.clientEmail || "No primary email"}</p></div>
                <div className="mt-3 rounded-xl border border-black/10 p-3"><p className="text-[10px] uppercase tracking-[.12em] text-neutral-400">Last visit</p><p className="mt-1 text-sm">{lastVisitor ? formatDate(lastVisitor.lastSeenAt) : "No visits yet"}</p></div>
              </div>
            </div>
          </div>

          <div className="client-gallery-primary-tabs" aria-label="Client gallery workspace sections">
            {primaryTabs.map(({ key, label, icon: Icon }) => <button key={key} type="button" data-active={primaryTab === key ? "true" : "false"} onClick={() => setTab(key === "settings" ? (isSettingsArea ? activeTab : "settings") : key)} className="client-gallery-primary-tab"><Icon className="h-5 w-5" /><span>{label}</span></button>)}
          </div>

          {activeTab === "photos" ? <div className="client-gallery-context-menu">
            <p className="px-2 py-2 text-[10px] uppercase tracking-[.14em] text-neutral-400">Photos</p>
            <button onClick={() => setActiveAlbumId("")} className={`rounded-lg px-3 py-2.5 text-left text-sm flex items-center justify-between ${!activeAlbumId ? "bg-black text-white" : "hover:bg-neutral-50"}`}><span>All Photos</span><span className="text-xs opacity-60">{detail.assets.length}</span></button>
            {activeAlbums.map((album) => <div key={album.id} className="mt-1 flex items-center gap-1"><button onClick={() => setActiveAlbumId(album.id)} className={`min-w-0 flex-1 rounded-lg px-3 py-2.5 text-left text-sm flex items-center justify-between ${activeAlbumId === album.id ? "bg-black text-white" : "hover:bg-neutral-50"}`}><span className="truncate">{album.name}</span><span className="text-xs opacity-60">{album.assetCount}</span></button><button title="Rename album" onClick={() => renameAlbum(album)} className="w-auto rounded-lg p-2 hover:bg-neutral-50">•••</button></div>)}
            <div className="mt-3 flex gap-2"><input value={newAlbumName} onChange={(e) => setNewAlbumName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createAlbum(); }} placeholder="New album" className="min-w-0 flex-1 rounded-lg border border-black/15 px-2 py-2 text-xs" /><button onClick={createAlbum} disabled={busy || !newAlbumName.trim()} title="Add album" className="w-auto rounded-lg border border-black/15 p-2 disabled:opacity-30"><Plus className="h-4 w-4" /></button></div>
          </div> : null}

          {activeTab === "activity" ? <div className="client-gallery-context-menu">
            <p className="px-2 py-2 text-[10px] uppercase tracking-[.14em] text-neutral-400">Client activity</p>
            <button onClick={() => document.getElementById("favourites-panel")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-neutral-50"><span>Favourites</span><span className="text-xs text-neutral-400">{gallery.favouriteCount}</span></button>
            <button onClick={() => document.getElementById("selections-panel")?.scrollIntoView({ behavior: "smooth" })} className="mt-1 rounded-lg px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-neutral-50"><span>Selections</span><span className="text-xs text-neutral-400">{detail.selections.length}</span></button>
            <button onClick={() => document.getElementById("visitors-panel")?.scrollIntoView({ behavior: "smooth" })} className="mt-1 rounded-lg px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-neutral-50"><span>Visitors</span><span className="text-xs text-neutral-400">{gallery.visitorCount || detail.visitors.length}</span></button>
          </div> : null}

          {isSettingsArea ? <div className="client-gallery-context-menu">
            <p className="px-2 py-2 text-[10px] uppercase tracking-[.14em] text-neutral-400">Settings</p>
            {settingsTabs.map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`mt-1 rounded-lg px-3 py-3 text-left ${activeTab === item.key ? "bg-black text-white" : "hover:bg-neutral-50"}`}><strong className="block text-sm font-medium">{item.label}</strong><span className={`mt-1 block text-[11px] leading-snug ${activeTab === item.key ? "text-white/65" : "text-neutral-400"}`}>{item.description}</span></button>)}
          </div> : null}

          {activeTab === "branding" ? <div className="client-gallery-context-menu"><p className="px-2 py-2 text-[10px] uppercase tracking-[.14em] text-neutral-400">Branding</p><div className="rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-500">Logo, colours and typography for this private gallery.</div></div> : null}
        </aside>

        <div className="client-gallery-editor-main" style={{ minWidth: 0 }}>
          {message ? <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#f0fdf4", color: "#15803d" }}>{message}</p> : null}
          {error ? <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#fef2f2", color: "#b91c1c" }}>{error}</p> : null}

          {activeTab === "photos" ? <section className="mt-5">
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <div>
                <h3 className="text-xl font-semibold">{activeAlbum?.name || "All Photos"}</h3>
                <p className="mt-1 text-xs text-neutral-500">{visiblePhotos.length} photo{visiblePhotos.length === 1 ? "" : "s"}{activeAlbum ? " in this album" : ""}</p>
              </div>
              <div className="client-gallery-photo-toolbar">
                <button
                  disabled={busy || !draft.weddingSlug}
                  title="Import images already linked to this wedding"
                  onClick={() => mutateAssets({ action: "importWedding" }, "Wedding assets imported.")}
                  className="disabled:opacity-40"
                  style={{ height: 32, border: "1px solid rgba(0,0,0,.15)", borderRadius: 8, background: "#fff", padding: "0 9px", fontSize: 10, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap" }}
                >
                  <ImagePlus style={{ width: 13, height: 13 }} /> Import
                </button>
                <details style={{ position: "relative" }}>
                  <summary
                    title="Add from Asset Library"
                    className="list-none cursor-pointer"
                    style={{ height: 32, border: "1px solid rgba(0,0,0,.15)", borderRadius: 8, background: "#fff", padding: "0 9px", fontSize: 10, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap" }}
                  >
                    <Images style={{ width: 13, height: 13 }} /> Library
                  </summary>
                  <div className="rounded-xl border border-black/10 bg-white p-3 shadow-lg" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: "min(720px, 72vw)", zIndex: 60 }}>
                    <div className="flex gap-2"><input value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} placeholder="Search filename, caption or alt…" className="min-w-0 flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm" /><button onClick={searchAssets} disabled={busy} className="rounded-lg border border-black px-4 py-2 text-sm">Search</button></div>
                    {assetResults.length ? <div className="mt-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>{assetResults.map((asset) => <button key={asset.id} onClick={() => mutateAssets({ action: "add", assetIds: [asset.id] }, "Image added.")} className="text-left rounded-lg border border-black/10 overflow-hidden"><img src={asset.files.thumb || asset.files.web} alt="" style={{ width: "100%", height: 80, objectFit: "cover" }} /><span className="block p-2 text-[10px] truncate">+ {asset.filename}</span></button>)}</div> : null}
                  </div>
                </details>
                <label title="Choose gallery photo order" style={{ height: 32, minWidth: 0, border: "1px solid rgba(0,0,0,.15)", borderRadius: 8, background: "#fff", padding: "0 8px", display: "flex", alignItems: "center", gap: 4 }}>
                  <ArrowUpDown style={{ width: 13, height: 13, color: "#a3a3a3", flex: "0 0 auto" }} />
                  <select value={gallery.sortMode} onChange={(event) => setPhotoSortMode(event.target.value as "custom" | "capture_time" | "filename")} disabled={busy} style={{ minWidth: 0, width: "100%", border: 0, background: "transparent", outline: "none", fontSize: 10 }}>
                    <option value="custom">Custom order</option><option value="capture_time">Capture time</option><option value="filename">Filename</option>
                  </select>
                </label>
                <div style={{ height: 32, minWidth: 0, border: "1px solid rgba(0,0,0,.15)", borderRadius: 8, background: "#fff", padding: "0 9px", display: "flex", alignItems: "center", gap: 5 }}>
                  <Search style={{ width: 13, height: 13, color: "#a3a3a3", flex: "0 0 auto" }} />
                  <input value={photoSearch} onChange={(e) => setPhotoSearch(e.target.value)} placeholder="Search photos" style={{ minWidth: 0, width: "100%", border: 0, outline: "none", fontSize: 10, background: "transparent" }} />
                </div>
                <button
                  onClick={selectAllVisible}
                  style={{ height: 32, border: "1px solid rgba(0,0,0,.15)", borderRadius: 8, background: "#fff", padding: "0 9px", fontSize: 10, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap" }}
                >
                  <Check style={{ width: 13, height: 13 }} /> {selectedAssets.size === visiblePhotos.length && visiblePhotos.length ? "Clear" : "Select all"}
                </button>
                <label
                  title="Upload full-resolution JPEGs"
                  style={{ height: 32, borderRadius: 8, background: "#111", color: "#fff", padding: "0 10px", fontSize: 10, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap", cursor: "pointer" }}
                >
                  <UploadCloud style={{ width: 13, height: 13 }} /> Upload
                  <input type="file" multiple accept="image/jpeg,.jpg,.jpeg" onChange={(event) => { addOriginalFiles(event.target.files); event.currentTarget.value = ""; }} style={{ display: "none" }} />
                </label>
              </div>
              {gallery.sortMode === "custom" ? <p className="mt-3 text-[11px] text-neutral-400">Drag photographs using the handle to set a custom order{photoSearch.trim() ? ". Clear search before dragging." : "."}</p> : gallery.sortMode === "capture_time" ? <p className="mt-3 text-[11px] text-neutral-400">Capture-time order uses EXIF when available; older images fall back to their import time.</p> : null}

              {selectedAssets.size ? <div className="mt-4 rounded-xl border border-black/10 bg-neutral-50 p-3 flex items-center justify-between gap-3 flex-wrap"><strong className="text-sm">{selectedAssets.size} selected</strong><div className="flex items-center gap-2 flex-wrap"><select value={bulkAlbumId} onChange={(e) => setBulkAlbumId(e.target.value)} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"><option value="">Choose album…</option>{activeAlbums.map((album) => <option key={album.id} value={album.id}>{album.name}</option>)}</select><button disabled={!bulkAlbumId || busy} onClick={addSelectedToAlbum} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-40"><FolderPlus className="h-4 w-4" /> Add to album</button>{activeAlbumId ? <button disabled={busy} onClick={removeSelectedFromAlbum} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">Remove from this album</button> : null}<button onClick={() => setSelectedAssets(new Set())} className="rounded-lg p-2"><X className="h-4 w-4" /></button></div></div> : null}

              {uploads.length ? <div className="mt-4 rounded-xl border border-black/10 p-3"><div className="space-y-2">{uploads.map((item) => <div key={item.id} className="rounded-lg bg-neutral-50 p-3" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 80px 36px", gap: 10, alignItems: "center" }}><div className="min-w-0"><div className="flex items-center gap-2">{item.status === "done" ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : item.status === "error" ? <AlertCircle className="h-4 w-4 text-red-700" /> : <UploadCloud className="h-4 w-4 text-neutral-500" />}<span className="text-xs truncate">{item.file.name}</span></div><div className="mt-2" style={{ height: 4, borderRadius: 99, background: "#ddd" }}><div style={{ width: `${item.progress}%`, height: "100%", background: item.status === "error" ? "#b91c1c" : "#111", borderRadius: 99 }} /></div><p className="mt-1 text-[10px] text-neutral-500">{item.error || item.stage}</p></div><span className="text-xs text-right">{item.progress}%</span>{item.status === "error" ? <button onClick={() => updateUpload(item.id, { status: "queued", progress: 0, stage: "Ready", error: "" })}><RefreshCw className="h-4 w-4" /></button> : <button disabled={item.status === "uploading" || uploading} onClick={() => setUploads((current) => current.filter((upload) => upload.id !== item.id))}><X className="h-4 w-4" /></button>}</div>)}</div><div className="mt-3 flex justify-end"><button disabled={uploading || queuedCount === 0} onClick={uploadQueuedOriginals} className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-40">{uploading ? "Uploading…" : `Upload ${queuedCount} original${queuedCount === 1 ? "" : "s"}`}</button></div></div> : null}

            </div>

            <div className="mt-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", columnGap: 14, rowGap: 18 }}>
              {visiblePhotos.map((asset) => {
                const canDrag = gallery.sortMode === "custom" && !photoSearch.trim();
                const isDragging = draggedAssetId === asset.assetId;
                const isDragTarget = dragOverAssetId === asset.assetId && draggedAssetId && draggedAssetId !== asset.assetId;
                return <article
                  key={asset.assetId}
                  draggable={canDrag}
                  onDragStart={(event) => { if (!canDrag) return; setDraggedAssetId(asset.assetId); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", asset.assetId); }}
                  onDragOver={(event) => { if (!canDrag || !draggedAssetId) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOverAssetId(asset.assetId); }}
                  onDragLeave={() => { if (dragOverAssetId === asset.assetId) setDragOverAssetId(""); }}
                  onDrop={(event) => { event.preventDefault(); reorderVisiblePhotos(asset.assetId); }}
                  onDragEnd={() => { setDraggedAssetId(""); setDragOverAssetId(""); }}
                  style={{ minWidth: 0, position: "relative", opacity: isDragging ? .48 : 1 }}
                >
                  <div style={{ position: "relative", border: isDragTarget ? "2px solid #111" : "1px solid rgba(0,0,0,.10)", borderRadius: 10, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "visible" }}>
                    <div style={{ aspectRatio: "4/3", position: "relative", background: "#eee", overflow: "visible", borderRadius: 9 }}>
                      <img src={asset.thumbSrc || asset.webSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: asset.hidden ? .42 : 1, display: "block", borderRadius: 9 }} />
                      <button aria-label={selectedAssets.has(asset.assetId) ? "Deselect photo" : "Select photo"} onClick={() => toggleSelected(asset.assetId)} style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", border: selectedAssets.has(asset.assetId) ? "1px solid #111" : "1px solid rgba(0,0,0,.25)", background: selectedAssets.has(asset.assetId) ? "#111" : "rgba(255,255,255,.94)", color: selectedAssets.has(asset.assetId) ? "#fff" : "#111" }}>{selectedAssets.has(asset.assetId) ? <Check style={{ width: 13, height: 13 }} /> : null}</button>
                      {gallery.coverAssetId === asset.assetId ? <span style={{ position: "absolute", top: 8, left: 8, borderRadius: 999, background: "#111", color: "#fff", padding: "4px 8px", fontSize: 9, lineHeight: 1, letterSpacing: ".08em", textTransform: "uppercase" }}>Cover</span> : null}
                      <div style={{ position: "absolute", left: 7, bottom: 7, display: "flex", alignItems: "center", gap: 4 }}>
                        {asset.hidden ? <span title="Hidden from client gallery" style={{ width: 25, height: 25, borderRadius: 7, background: "rgba(255,255,255,.94)", display: "grid", placeItems: "center", color: "#525252", boxShadow: "0 1px 3px rgba(0,0,0,.12)" }}><EyeOff style={{ width: 13, height: 13 }} /></span> : null}
                        {canDrag ? <span title="Drag to reorder" aria-label="Drag to reorder" style={{ width: 25, height: 25, borderRadius: 7, background: "rgba(255,255,255,.94)", display: "grid", placeItems: "center", color: "#737373", cursor: "grab", boxShadow: "0 1px 3px rgba(0,0,0,.12)" }}><GripVertical style={{ width: 13, height: 13 }} /></span> : null}
                      </div>
                      <div data-photo-menu style={{ position: "absolute", right: 7, bottom: 7 }}>
                        <button type="button" aria-label={`Open options for ${asset.filename}`} title="Photo options" onClick={(event) => { event.stopPropagation(); setPhotoMenuAlbumId(""); setOpenPhotoMenuId((current) => current === asset.assetId ? "" : asset.assetId); }} style={{ width: 27, height: 27, borderRadius: 7, background: "rgba(255,255,255,.95)", display: "grid", placeItems: "center", color: "#111", boxShadow: "0 1px 4px rgba(0,0,0,.16)" }}><MoreVertical style={{ width: 14, height: 14 }} /></button>
                        {openPhotoMenuId === asset.assetId ? <div className="rounded-xl border border-black/10 bg-white p-1 shadow-xl" style={{ position: "absolute", right: 0, bottom: "calc(100% + 6px)", width: 220, zIndex: 50 }}>
                          <button type="button" onClick={() => { setPreviewAssetId(asset.assetId); setOpenPhotoMenuId(""); }} className="w-full rounded-lg px-3 py-2 text-left text-sm inline-flex items-center gap-2 hover:bg-neutral-50"><Eye className="h-4 w-4" /> View photo</button>
                          {asset.hasOriginal ? <a href={AdminApiService.clientGalleryOriginalDownloadUrl(id, asset.assetId)} className="w-full rounded-lg px-3 py-2 text-left text-sm inline-flex items-center gap-2 hover:bg-neutral-50"><Download className="h-4 w-4" /> Download original</a> : <span className="w-full rounded-lg px-3 py-2 text-left text-sm inline-flex items-center gap-2 text-neutral-400"><Download className="h-4 w-4" /> Original unavailable</span>}
                          <button type="button" disabled={gallery.coverAssetId === asset.assetId} onClick={() => runPhotoAction({ action: "setCover", assetId: asset.assetId }, "Cover updated.")} className="w-full rounded-lg px-3 py-2 text-left text-sm inline-flex items-center gap-2 hover:bg-neutral-50 disabled:text-neutral-400"><Star className="h-4 w-4" /> {gallery.coverAssetId === asset.assetId ? "Current cover" : "Set as gallery cover"}</button>
                          <button type="button" onClick={() => runPhotoAction({ action: "setHidden", assetId: asset.assetId, hidden: !asset.hidden }, asset.hidden ? "Image shown." : "Image hidden.")} className="w-full rounded-lg px-3 py-2 text-left text-sm inline-flex items-center gap-2 hover:bg-neutral-50">{asset.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} {asset.hidden ? "Show in client gallery" : "Hide from client gallery"}</button>
                          {activeAlbums.length ? <div className="mt-1 border-t border-black/5 p-2"><label className="text-[10px] uppercase tracking-[.1em] text-neutral-400">Add to album</label><div className="mt-1 flex gap-1"><select value={photoMenuAlbumId} onChange={(event) => setPhotoMenuAlbumId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs"><option value="">Choose…</option>{activeAlbums.map((album) => <option key={album.id} value={album.id}>{album.name}</option>)}</select><button type="button" disabled={!photoMenuAlbumId} onClick={() => addPhotoToAlbum(asset.assetId)} className="rounded-lg border border-black/15 p-2 disabled:opacity-30"><FolderPlus className="h-3.5 w-3.5" /></button></div></div> : null}
                          <div className="mt-1 border-t border-black/5 pt-1"><button type="button" onClick={() => { if (window.confirm(`Remove ${asset.filename} from this client gallery? The canonical Asset Library image and private original will be preserved.`)) runPhotoAction({ action: "remove", assetId: asset.assetId }, "Image removed."); }} className="w-full rounded-lg px-3 py-2 text-left text-sm inline-flex items-center gap-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Remove from gallery</button></div>
                        </div> : null}
                      </div>
                    </div>
                  </div>
                  <p
                    title={asset.filename}
                    style={{ margin: "6px 7px 0", fontSize: 9, lineHeight: "12px", fontWeight: 400, color: "#737373", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {asset.filename}
                  </p>
                </article>;
              })}
            </div>
            {!visiblePhotos.length ? <div className="mt-4 rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center text-sm text-neutral-500">{activeAlbum ? "This album is empty. Select photographs from All Photos and add them here." : "No photographs match this view."}</div> : null}
            {activeAlbum ? <div className="mt-5 text-right"><button onClick={() => mutateAlbum({ action: "archive", albumId: activeAlbum.id }, "Album archived.").then(() => setActiveAlbumId(""))} className="text-xs text-red-700 underline underline-offset-4">Archive this album</button></div> : null}
          </section> : null}

          {activeTab === "activity" ? <section className="mt-5 space-y-4">
            <div className="client-gallery-activity-stats">
              <button onClick={() => document.getElementById("favourites-panel")?.scrollIntoView({ behavior: "smooth" })} className="client-gallery-activity-stat border border-black/10 bg-white">
                <span className="client-gallery-activity-stat-icon"><Heart className="h-4 w-4" /></span>
                <span className="client-gallery-activity-stat-copy"><strong className="client-gallery-activity-stat-value">{gallery.favouriteCount}</strong><span className="client-gallery-activity-stat-label">Favourites</span></span>
              </button>
              <button onClick={() => document.getElementById("selections-panel")?.scrollIntoView({ behavior: "smooth" })} className="client-gallery-activity-stat border border-black/10 bg-white">
                <span className="client-gallery-activity-stat-icon"><ClipboardList className="h-4 w-4" /></span>
                <span className="client-gallery-activity-stat-copy"><strong className="client-gallery-activity-stat-value">{detail.selections.length}</strong><span className="client-gallery-activity-stat-label">Client selections</span></span>
              </button>
              <button onClick={() => document.getElementById("visitors-panel")?.scrollIntoView({ behavior: "smooth" })} className="client-gallery-activity-stat border border-black/10 bg-white">
                <span className="client-gallery-activity-stat-icon"><Users className="h-4 w-4" /></span>
                <span className="client-gallery-activity-stat-copy"><strong className="client-gallery-activity-stat-value">{gallery.visitorCount || detail.visitors.length}</strong><span className="client-gallery-activity-stat-label">Recent visitors</span></span>
              </button>
            </div>

            <section id="favourites-panel" className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
              <div className="client-gallery-panel-header">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><Heart className="h-4 w-4" /><h3 className="text-base font-semibold">Favourites</h3></div>
                  <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-neutral-500">Review client favourites as thumbnails or download secure full-resolution originals for album design.</p>
                </div>
                <div className="client-gallery-panel-actions">
                  <Link to={`/admin/client-galleries/${id}/review?source=favourites&group=combined`} className="rounded-lg border border-black/15 px-3 py-2 text-xs inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> View</Link>
                  {gallery.favouriteCount > 0 ? <a href={AdminApiService.clientGalleryBulkDownloadUrl(id, { source: "favourites", group: "combined" })} className="rounded-lg bg-black text-white px-3 py-2 text-xs inline-flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> Download all</a> : null}
                </div>
              </div>
            </section>

            <section id="selections-panel" className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /><h3 className="text-base font-semibold">Client selections</h3></div>
              <div className="client-gallery-activity-split mt-3">
                <div className="space-y-2.5">
                  {detail.selectionRequests.length ? detail.selectionRequests.map((request) => {
                    const responses = detail.selections.filter((selection) => selection.requestId === request.id);
                    return <div key={request.id} className="rounded-xl border border-black/10 p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <strong className="text-xs font-semibold">{request.name}</strong>
                          <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{request.instructions || "No instructions"}</p>
                          <p className="mt-1.5 text-[9px] uppercase tracking-[.08em] text-neutral-400">{responses.length} response{responses.length === 1 ? "" : "s"} · {request.status}</p>
                        </div>
                        {request.status === "active" ? <button onClick={() => mutateSelection({ action: "archiveRequest", requestId: request.id }, "Selection request archived.")} title="Archive" className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"><Trash2 className="h-3.5 w-3.5" /></button> : null}
                      </div>
                      {responses.map((selection) => <div key={selection.id} className="client-gallery-response-row mt-2.5 rounded-lg bg-neutral-50 p-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{selection.displayName || selection.email || "Anonymous visitor"}</p>
                          <p className="mt-0.5 text-[9px] uppercase tracking-[.04em] text-neutral-400">{selection.selectedCount} selected · {selection.status}</p>
                        </div>
                        <div className="client-gallery-response-actions">
                          <Link title="View thumbnails" to={`/admin/client-galleries/${id}/review?source=selection&selectionId=${encodeURIComponent(selection.id)}`} className="rounded-md border border-black/10 p-1.5"><Eye className="h-3.5 w-3.5" /></Link>
                          {selection.assets.length ? <a title="Download originals" href={AdminApiService.clientGalleryBulkDownloadUrl(id, { source: "selection", selectionId: selection.id })} className="rounded-md border border-black/10 p-1.5"><Download className="h-3.5 w-3.5" /></a> : null}
                          <button title="Copy filenames" disabled={!selection.assets.length} onClick={() => copySelectionFilenames(selection.assets.map((asset) => asset.filename))} className="rounded-md border border-black/10 p-1.5 disabled:opacity-30"><Copy className="h-3.5 w-3.5" /></button>
                          <button title="Download CSV" disabled={!selection.assets.length} onClick={() => downloadSelectionCsv(selection)} className="rounded-md border border-black/10 p-1.5 disabled:opacity-30"><Download className="h-3.5 w-3.5" /></button>
                          {selection.status === "submitted" ? <button title="Reopen" onClick={() => mutateSelection({ action: "reopenSelection", selectionId: selection.id }, "Selection reopened for editing.")} className="rounded-md border border-black/10 p-1.5"><RotateCcw className="h-3.5 w-3.5" /></button> : null}
                        </div>
                      </div>)}
                    </div>;
                  }) : <p className="text-xs text-neutral-500">No selection requests yet.</p>}
                </div>
                <aside className="rounded-xl bg-neutral-50 border border-black/10 p-3.5">
                  <div className="flex items-center gap-2"><Plus className="h-3.5 w-3.5" /><strong className="text-xs">New selection request</strong></div>
                  <input value={selectionDraft.name} onChange={(e) => setSelectionDraft({ ...selectionDraft, name: e.target.value })} className="mt-3 w-full rounded-lg border border-black/15 px-3 py-2 text-xs" placeholder="Selection name" />
                  <textarea value={selectionDraft.instructions} onChange={(e) => setSelectionDraft({ ...selectionDraft, instructions: e.target.value })} className="mt-2 w-full rounded-lg border border-black/15 px-3 py-2 text-xs" rows={3} />
                  <div className="mt-2 grid grid-cols-2 gap-2"><input type="number" min="0" value={selectionDraft.minImages} onChange={(e) => setSelectionDraft({ ...selectionDraft, minImages: Math.max(0, Number(e.target.value) || 0) })} className="min-w-0 rounded-lg border border-black/15 px-3 py-2 text-xs" placeholder="Min" /><input type="number" min="0" value={selectionDraft.maxImages} onChange={(e) => setSelectionDraft({ ...selectionDraft, maxImages: Math.max(0, Number(e.target.value) || 0) })} className="min-w-0 rounded-lg border border-black/15 px-3 py-2 text-xs" placeholder="Max" /></div>
                  <button disabled={busy || !selectionDraft.name.trim()} onClick={createSelectionRequest} className="mt-3 w-full rounded-lg bg-black text-white px-4 py-2.5 text-xs disabled:opacity-40">Create request</button>
                </aside>
              </div>
            </section>

            <section id="visitors-panel" className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2"><Users className="h-4 w-4" /><h3 className="text-base font-semibold">Recent visitors</h3></div>
              {detail.visitors.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-xs"><thead><tr className="text-left text-[9px] uppercase tracking-[.08em] text-neutral-400"><th className="py-2">Visitor</th><th>Role</th><th>Visits</th><th>Last visit</th><th>Originals</th></tr></thead><tbody>{detail.visitors.slice(0, 50).map((visitor) => <tr key={visitor.visitorKey} className="border-t border-black/5"><td className="py-2.5 pr-3">{visitor.displayName || visitor.email || "Anonymous"}<span className="block max-w-[240px] truncate text-[10px] text-neutral-400">{visitor.email}</span></td><td className="pr-3 capitalize">{visitor.role.replaceAll("_", " ")}</td><td className="pr-3">{visitor.visitCount}</td><td className="pr-3">{formatDate(visitor.lastSeenAt)}</td><td>{visitor.canDownloadOriginals ? "Allowed" : "View only"}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-xs text-neutral-500">No identified visitors yet.</p>}
            </section>
          </section> : null}

          {activeTab === "access" ? <section className="client-gallery-settings-column mt-5">
            <div className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /><h3 className="text-xl font-semibold">Gallery access</h3></div><p className="mt-2 text-sm text-neutral-600">Control email identification, PIN protection, expiry and full-resolution permissions.</p><div className="mt-5 space-y-4"><label className="flex items-start gap-3 rounded-xl border border-black/10 p-4"><input type="checkbox" checked={draft.requireEmail ?? false} onChange={(e) => setDraft({ ...draft, requireEmail: e.target.checked })} /><span><strong className="block text-sm">Require email to enter</strong><span className="block text-xs text-neutral-500 mt-1">Visitors identify themselves before viewing. Secure magic-link sign-in can then sync activity across devices.</span></span></label><label className="flex items-start gap-3 rounded-xl border border-black/10 p-4"><input type="checkbox" checked={draft.allowFavourites ?? true} onChange={(e) => setDraft({ ...draft, allowFavourites: e.target.checked })} /><span><strong className="block text-sm">Allow favourites</strong><span className="block text-xs text-neutral-500 mt-1">Clients and guests can heart photographs.</span></span></label><label className="flex items-start gap-3 rounded-xl border border-black/10 p-4"><input type="checkbox" checked={draft.allowDownloads ?? false} onChange={(e) => setDraft({ ...draft, allowDownloads: e.target.checked })} /><span><strong className="block text-sm">Enable original downloads</strong><span className="block text-xs text-neutral-500 mt-1">Master switch for secure full-resolution delivery.</span></span></label><label className="flex items-start gap-3 rounded-xl border border-black/10 p-4"><input type="checkbox" disabled={!draft.requireEmail || !draft.allowDownloads} checked={draft.allowGuestDownloads ?? false} onChange={(e) => setDraft({ ...draft, allowGuestDownloads: e.target.checked })} /><span><strong className="block text-sm">Allow guest full-resolution downloads</strong><span className="block text-xs text-neutral-500 mt-1">Leave off to reserve originals for authorised client emails.</span></span></label><details className="rounded-xl border border-black/10 p-4"><summary className="cursor-pointer text-sm font-medium">Advanced security</summary><div className="mt-4 space-y-3"><label className="block text-xs uppercase tracking-[.1em] text-neutral-500">New / replacement PIN<input value={draft.pin || ""} onChange={(e) => setDraft({ ...draft, pin: e.target.value })} placeholder={gallery.pinEnabled ? "Leave blank to keep current PIN" : "Optional"} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5 text-sm normal-case tracking-normal" /></label><label className="block text-xs uppercase tracking-[.1em] text-neutral-500">Expiry<input type="datetime-local" value={(draft.expiresAt || "").slice(0,16)} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5 text-sm normal-case tracking-normal" /></label></div></details><button onClick={save} disabled={busy} className="rounded-lg bg-black text-white px-5 py-3 inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> Save access settings</button></div></div>
            <aside className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-2"><UserPlus className="h-5 w-5" /><h3 className="text-lg font-semibold">Authorised client emails</h3></div><p className="mt-2 text-xs text-neutral-500">Contacts can receive client-level permissions and secure sign-in.</p><div className="mt-4 space-y-2">{detail.contacts.map((contact) => <div key={contact.emailNormalized} className="rounded-xl border border-black/10 bg-neutral-50 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium truncate">{contact.displayName || contact.email}</p><p className="text-xs text-neutral-500 truncate">{contact.email}</p><p className="mt-1 text-[10px] uppercase tracking-[.08em] text-neutral-400">{contact.role.replaceAll("_", " ")} · {contact.allowOriginalDownloads ? "originals allowed" : "view only"}</p></div><button title="Remove" onClick={() => mutateContact({ action: "remove", email: contact.email }, "Access contact removed.")}><X className="h-4 w-4" /></button></div></div>)}</div><div className="mt-4 rounded-xl border border-black/10 p-3 space-y-2"><input value={contactDraft.displayName} onChange={(e) => setContactDraft({ ...contactDraft, displayName: e.target.value })} placeholder="Name (optional)" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm" /><input type="email" value={contactDraft.email} onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })} placeholder="client@example.com" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm" /><div className="grid grid-cols-2 gap-2"><select value={contactDraft.role} onChange={(e) => setContactDraft({ ...contactDraft, role: e.target.value })} className="rounded-lg border border-black/15 px-3 py-2 text-sm bg-white"><option value="client">Client</option><option value="primary_client">Primary client</option><option value="family">Family</option><option value="other">Other</option></select><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={contactDraft.allowOriginalDownloads} onChange={(e) => setContactDraft({ ...contactDraft, allowOriginalDownloads: e.target.checked })} /> Full-res</label></div><button disabled={busy || !contactDraft.email.trim()} onClick={addContact} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40"><UserPlus className="h-4 w-4" /> Add contact</button></div></aside>
          </section> : null}

          {activeTab === "branding" && brandingDraft ? <section className="client-gallery-branding-grid mt-5">
            <div className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-2"><Palette className="h-5 w-5" /><h3 className="text-xl font-semibold">Client gallery branding</h3></div><p className="mt-2 text-sm text-neutral-600">Change the logo and colour scheme clients see. These choices affect only this private Client Gallery.</p><div className="mt-5"><p className="text-xs uppercase tracking-[.12em] text-neutral-500">Logo</p><div className="mt-2 grid grid-cols-3 gap-2">{([['workspace','Studio logo'],['custom','Custom logo'],['hidden','No logo']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setBrandingDraft({ ...brandingDraft, logoMode: value })} className="rounded-xl border px-3 py-3 text-sm" style={{ borderColor: brandingDraft.logoMode === value ? '#111' : 'rgba(0,0,0,.12)', background: brandingDraft.logoMode === value ? '#f5f5f5' : '#fff', fontWeight: brandingDraft.logoMode === value ? 600 : 400 }}>{label}</button>)}</div>{brandingDraft.logoMode === 'custom' ? <div className="mt-3 rounded-xl border border-black/10 bg-neutral-50 p-4"><div className="flex items-center gap-3">{brandingDraft.customLogoUrl ? <img src={brandingDraft.customLogoUrl} alt="Current custom logo" style={{ maxWidth: 180, maxHeight: 70, objectFit: 'contain' }} /> : <div className="text-sm text-neutral-500">No custom logo uploaded yet.</div>}</div><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">{brandingUploading ? 'Uploading…' : 'Upload logo'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={brandingUploading} onChange={(event) => { uploadBrandingLogo(event.target.files?.[0] || null); event.currentTarget.value = ''; }} style={{ display: 'none' }} /></label><p className="mt-2 text-xs text-neutral-400">PNG, JPEG or WebP. Maximum 2 MB. Transparent PNG is recommended.</p></div> : null}</div><div className="mt-6"><p className="text-xs uppercase tracking-[.12em] text-neutral-500">Colour presets</p><div className="mt-2 grid grid-cols-2 gap-2">{BRANDING_PRESETS.map((preset) => <button type="button" key={preset.name} onClick={() => setBrandingDraft({ ...brandingDraft, ...preset })} className="rounded-xl border border-black/10 p-3 text-left"><span className="flex items-center gap-2"><span style={{ width: 22, height: 22, borderRadius: 999, background: preset.accentColor, border: '1px solid rgba(0,0,0,.12)' }} /><strong className="text-sm">{preset.name}</strong></span><span className="mt-2 flex gap-1">{[preset.backgroundColor,preset.surfaceColor,preset.textColor].map((color) => <span key={color} style={{ width: 20, height: 12, borderRadius: 3, background: color, border: '1px solid rgba(0,0,0,.1)' }} />)}</span></button>)}</div></div><div className="mt-6 grid grid-cols-2 gap-4">{([['accentColor','Accent'],['backgroundColor','Page background'],['surfaceColor','Cards / header'],['textColor','Text']] as const).map(([key,label]) => <label key={key} className="block"><span className="text-xs uppercase tracking-[.1em] text-neutral-500">{label}</span><div className="mt-1 flex items-center gap-2 rounded-lg border border-black/15 px-2 py-2"><input type="color" value={brandingDraft[key]} onChange={(event) => setBrandingDraft({ ...brandingDraft, [key]: event.target.value })} style={{ width: 34, height: 28, border: 0, padding: 0, background: 'transparent' }} /><input value={brandingDraft[key]} onChange={(event) => setBrandingDraft({ ...brandingDraft, [key]: event.target.value })} className="min-w-0 flex-1 text-sm outline-none" /></div></label>)}</div><div className="client-gallery-form-grid mt-5"><label className="block"><span className="text-xs uppercase tracking-[.1em] text-neutral-500">Heading style</span><select value={brandingDraft.headingFont} onChange={(event) => setBrandingDraft({ ...brandingDraft, headingFont: event.target.value as any })} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2.5"><option value="editorial">Editorial serif</option><option value="modern">Modern sans serif</option><option value="classic">Classic serif</option></select></label><label className="flex items-center gap-3 rounded-xl border border-black/10 p-4 mt-5"><input type="checkbox" checked={brandingDraft.showStudioName} onChange={(event) => setBrandingDraft({ ...brandingDraft, showStudioName: event.target.checked })} /><span className="text-sm">Show studio name beside logo</span></label></div><div className="mt-6 flex items-center gap-3 flex-wrap"><button type="button" onClick={saveBranding} disabled={busy} className="rounded-lg bg-black text-white px-5 py-3 inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> Save branding</button><button type="button" onClick={resetBranding} disabled={busy} className="rounded-lg border border-black/15 px-5 py-3 inline-flex items-center gap-2 disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Reset to studio defaults</button></div></div>
            <aside className="rounded-2xl border border-black/10 overflow-hidden" style={{ background: brandingDraft.backgroundColor, color: brandingDraft.textColor, position: 'sticky', top: 20 }}><div className="px-5 py-4 flex items-center gap-3" style={{ background: brandingDraft.surfaceColor, borderBottom: `1px solid ${brandingDraft.textColor}22` }}>{brandingDraft.logoMode !== 'hidden' && (brandingDraft.logoMode === 'custom' ? brandingDraft.customLogoUrl : brandingDraft.workspaceLogoUrl) ? <img src={brandingDraft.logoMode === 'custom' ? brandingDraft.customLogoUrl : brandingDraft.workspaceLogoUrl} alt="" style={{ maxHeight: 34, maxWidth: 150, objectFit: 'contain' }} /> : null}{brandingDraft.showStudioName ? <strong className="text-sm">{brandingDraft.businessName}</strong> : null}</div><div style={{ aspectRatio: '16/9', background: '#ddd', overflow: 'hidden' }}>{gallery.coverWeb || gallery.coverThumb ? <img src={gallery.coverWeb || gallery.coverThumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}</div><div className="p-6 text-center"><p className="text-[10px] uppercase tracking-[.22em]" style={{ opacity: .62 }}>Private gallery</p><h4 className="mt-2" style={{ fontFamily: headingFontFamily(brandingDraft.headingFont), fontSize: 30, fontWeight: 500 }}>{gallery.title}</h4><p className="mt-2 text-sm" style={{ opacity: .7 }}>{gallery.intro || 'Your wedding photographs, privately delivered.'}</p><div className="mt-5 flex items-center justify-center gap-2"><span className="rounded-lg px-4 py-2 text-sm" style={{ background: brandingDraft.accentColor, color: contrastText(brandingDraft.accentColor) }}>All Photos</span><span className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: `${brandingDraft.textColor}33`, background: brandingDraft.surfaceColor }}>Ceremony</span></div></div></aside>
          </section> : null}

          {activeTab === "store" ? <section className="client-gallery-settings-column mt-5">
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" /><h3 className="text-xl font-semibold">Gallery Print Store</h3></div>
              <p className="mt-2 text-sm text-neutral-600">Enable product ordering for this gallery using a workspace price list. Client orders are captured for payment and photographer approval before lab fulfilment.</p>
              {!storeDraft || !storeData ? <p className="mt-5 text-sm text-neutral-500">Loading Print Store settings…</p> : <>
                <div className="client-gallery-store-grid mt-5">
                  <label className="col-span-2 flex items-start gap-3 rounded-xl border border-black/10 bg-neutral-50 p-4"><input type="checkbox" checked={storeDraft.enabled} onChange={(event) => setStoreDraft({ ...storeDraft, enabled: event.target.checked })} /><span><strong className="block text-sm">Enable Print Store</strong><span className="mt-1 block text-xs text-neutral-500">Shows a Shop Prints action in the private client gallery.</span></span></label>
                  <label className="block"><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Price list</span><select value={storeDraft.priceListId} onChange={(event) => setStoreDraft({ ...storeDraft, priceListId: event.target.value })} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2.5"><option value="">Choose a price list</option>{storeData.priceLists.map((priceList) => <option key={priceList.id} value={priceList.id}>{priceList.name} · {priceList.currency}</option>)}</select></label>
                  <label className="block"><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Minimum order</span><div className="mt-1 flex items-center rounded-lg border border-black/15 bg-white"><span className="px-3 text-xs font-medium text-neutral-500">{storeData.priceLists.find((priceList) => priceList.id === storeDraft.priceListId)?.currency || "GBP"}</span><input type="number" min="0" step="0.01" value={(storeDraft.minimumOrderMinor / 100).toFixed(2)} onChange={(event) => setStoreDraft({ ...storeDraft, minimumOrderMinor: Math.round(Number(event.target.value || 0) * 100) })} className="min-w-0 flex-1 border-0 px-1 py-2.5" /></div></label>
                  <label className="flex items-start gap-3 rounded-xl border border-black/10 p-4"><input type="checkbox" checked={storeDraft.allowCrop} onChange={(event) => setStoreDraft({ ...storeDraft, allowCrop: event.target.checked })} /><span><strong className="block text-sm">Allow crop choices</strong><span className="mt-1 block text-xs text-neutral-500">Stores a non-destructive crop rectangle with each order line.</span></span></label>
                  <label className="flex items-start gap-3 rounded-xl border border-black/10 p-4"><input type="checkbox" checked={storeDraft.requirePhotographerApproval} onChange={(event) => setStoreDraft({ ...storeDraft, requirePhotographerApproval: event.target.checked })} /><span><strong className="block text-sm">Photographer approval</strong><span className="mt-1 block text-xs text-neutral-500">Orders enter review before lab fulfilment.</span></span></label>
                  <label className="col-span-2 block"><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Store introduction</span><textarea rows={4} value={storeDraft.intro} onChange={(event) => setStoreDraft({ ...storeDraft, intro: event.target.value })} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5" placeholder="Order professional prints and wall art directly from your gallery." /></label>
                </div>
                <div className="mt-5 flex items-center gap-3"><button type="button" onClick={saveStoreSettings} disabled={busy || (storeDraft.enabled && !storeDraft.priceListId)} className="rounded-lg bg-black px-5 py-3 text-white inline-flex items-center gap-2 disabled:opacity-40"><Save className="h-4 w-4" /> Save Print Store</button><Link to="/admin/print-store" className="rounded-lg border border-black/15 px-5 py-3 inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Manage catalogue</Link></div>
              </>}
            </div>
            <aside className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-xs uppercase tracking-[.14em] text-neutral-400">Commerce status</p><div className="mt-4 space-y-3 text-sm"><div className="flex items-center justify-between gap-3"><span>Gallery store</span><strong>{storeDraft?.enabled ? "Enabled" : "Disabled"}</strong></div><div className="flex items-center justify-between gap-3"><span>Active price lists</span><strong>{storeData?.priceLists.length || 0}</strong></div><div className="flex items-center justify-between gap-3"><span>Payment provider</span><strong>Stripe Checkout</strong></div><div className="flex items-center justify-between gap-3"><span>Lab connector</span><strong>Prodigi</strong></div></div><p className="mt-5 rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-500">Paid orders are reviewed in Admin → Print Store before print-ready files are submitted to Prodigi.</p></aside>
          </section> : null}

          {activeTab === "settings" ? <section className="client-gallery-settings-column mt-5"><div className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-2"><Settings className="h-5 w-5" /><h3 className="text-xl font-semibold">Gallery settings</h3></div><p className="mt-2 text-sm text-neutral-600">General gallery identity and wedding linkage. Access and security now live in the Access tab.</p><div className="client-gallery-form-grid mt-5"><label className="block"><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Title</span><input value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5" /></label><label className="block"><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Status</span><select value={draft.status || "draft"} onChange={(e) => setDraft({ ...draft, status: e.target.value as any })} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5 bg-white"><option value="draft">Draft</option><option value="live">Live</option><option value="archived">Archived</option></select></label><label className="block"><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Client name</span><input value={draft.clientName || ""} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5" /></label><label className="block"><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Primary client email</span><input value={draft.clientEmail || ""} onChange={(e) => setDraft({ ...draft, clientEmail: e.target.value })} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5" /></label><label className="block" style={{ gridColumn: "1 / -1" }}><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Wedding</span><select value={draft.weddingSlug || ""} onChange={(e) => setDraft({ ...draft, weddingSlug: e.target.value })} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5 bg-white"><option value="">No linked wedding</option>{detail.weddings.map((wedding) => <option key={wedding.slug} value={wedding.slug}>{wedding.title || wedding.couple || wedding.slug}</option>)}</select></label><label className="block" style={{ gridColumn: "1 / -1" }}><span className="text-xs uppercase tracking-[.12em] text-neutral-500">Gallery introduction</span><textarea value={draft.intro || ""} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} rows={5} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5" /></label></div><div className="mt-5 flex items-center gap-3"><button onClick={save} disabled={busy} className="rounded-lg bg-black text-white px-5 py-3 inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> Save settings</button>{gallery.status === "live" ? <button onClick={() => navigator.clipboard?.writeText(shareUrl)} className="rounded-lg border border-black/15 px-5 py-3 inline-flex items-center gap-2"><Copy className="h-4 w-4" /> Copy private link</button> : null}</div></div></section> : null}
        </div>
      </div>
      {previewAsset ? <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.88)", display: "grid", placeItems: "center", padding: 24 }} onMouseDown={() => setPreviewAssetId("")}><div style={{ maxWidth: "92vw", maxHeight: "90vh", position: "relative" }} onMouseDown={(event) => event.stopPropagation()}><img src={previewAsset.webSrc || previewAsset.thumbSrc} alt={previewAsset.filename} style={{ maxWidth: "92vw", maxHeight: "84vh", objectFit: "contain", display: "block" }} /><div className="mt-3 flex items-center justify-between gap-3 text-white"><span className="text-sm">{previewAsset.filename}</span><div className="flex gap-2">{previewAsset.hasOriginal ? <a href={AdminApiService.clientGalleryOriginalDownloadUrl(id, previewAsset.assetId)} className="rounded-lg bg-white text-black px-3 py-2 text-sm inline-flex items-center gap-2"><Download className="h-4 w-4" /> Download original</a> : null}<button type="button" onClick={() => setPreviewAssetId("")} className="rounded-lg border border-white/30 px-3 py-2 text-sm">Close</button></div></div></div></div> : null}
    </div>
  );
}
