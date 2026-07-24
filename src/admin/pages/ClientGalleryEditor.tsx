import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  RefreshCw,
  Save,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import { uploadPrivateOriginal } from "../lib/privateOriginalUpload";
import type { AssetRecord } from "../types/asset";
import type { ClientGalleryDetailPayload, ClientGalleryRecord } from "../types/clientGallery";

function publicUrl(token: string) {
  return `${window.location.protocol}//${window.location.host.replace(/^admin\./, "www.")}/client-gallery/${token}`;
}

type UploadItem = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  stage: string;
  error: string;
};

export function ClientGalleryEditor() {
  const { id = "" } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ClientGalleryDetailPayload | null>(null);
  const [draft, setDraft] = useState<Partial<ClientGalleryRecord> & { pin?: string }>({});
  const [assetSearch, setAssetSearch] = useState("");
  const [assetResults, setAssetResults] = useState<AssetRecord[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  useEffect(() => {
    load();
  }, [id]);

  const selectedWedding = useMemo(
    () => detail?.weddings.find((wedding) => wedding.slug === draft.weddingSlug),
    [detail?.weddings, draft.weddingSlug],
  );

  const originalCount = useMemo(
    () => (detail?.assets || []).filter((asset) => asset.hasOriginal).length,
    [detail?.assets],
  );

  const mutateAssets = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await AdminApiService.mutateClientGalleryAssets(id, payload);
      setDetail(next);
      setDraft((current) => ({ ...current, ...next.gallery, pin: undefined }));
      setMessage(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update gallery images.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!detail) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload: any = { ...draft };
      if (payload.pin === undefined) delete payload.pin;
      const gallery = await AdminApiService.updateClientGallery(id, payload);
      setDetail({ ...detail, gallery });
      setDraft({ ...gallery, pin: undefined });
      setMessage("Gallery settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save client gallery.");
    } finally {
      setBusy(false);
    }
  };

  const searchAssets = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await AdminApiService.getAssetLibrary({
        q: assetSearch.trim(),
        wedding: draft.weddingSlug || undefined,
        limit: 60,
      });
      const existing = new Set((detail?.assets || []).map((asset) => asset.assetId));
      setAssetResults(result.assets.filter((asset) => !existing.has(asset.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search Asset Library.");
    } finally {
      setBusy(false);
    }
  };

  const addOriginalFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: file.type === "image/jpeg" ? "queued" as const : "error" as const,
      progress: 0,
      stage: file.type === "image/jpeg" ? "Ready" : "Unsupported file",
      error: file.type === "image/jpeg" ? "" : "Only full-resolution JPEG files are supported.",
    }));
    setUploads((current) => [...current, ...next]);
    setMessage("");
    setError("");
  };

  const updateUpload = (uploadId: string, patch: Partial<UploadItem>) => {
    setUploads((current) => current.map((item) => item.id === uploadId ? { ...item, ...patch } : item));
  };

  const uploadQueuedOriginals = async () => {
    const pending = uploads.filter((item) => item.status === "queued");
    if (!pending.length) return;
    setUploading(true);
    setError("");
    setMessage("");
    let completed = 0;
    let failed = 0;

    for (const item of pending) {
      updateUpload(item.id, { status: "uploading", progress: 1, stage: "Starting", error: "" });
      try {
        await uploadPrivateOriginal({
          galleryId: id,
          file: item.file,
          onProgress: (progress, stage) => updateUpload(item.id, { progress, stage }),
        });
        completed += 1;
        updateUpload(item.id, { status: "done", progress: 100, stage: "Complete", error: "" });
      } catch (err) {
        failed += 1;
        updateUpload(item.id, {
          status: "error",
          progress: 0,
          stage: "Upload failed",
          error: err instanceof Error ? err.message : "Upload failed.",
        });
      }
    }

    setUploading(false);
    await load();
    if (failed) setError(`${completed} originals uploaded; ${failed} failed. Failed files can be retried.`);
    else setMessage(`${completed} full-resolution original${completed === 1 ? "" : "s"} uploaded securely.`);
  };

  if (!detail) {
    return <div className="p-8">{error || "Loading client gallery…"}</div>;
  }

  const gallery = detail.gallery;
  const shareUrl = publicUrl(gallery.accessToken);
  const queuedCount = uploads.filter((item) => item.status === "queued").length;

  return (
    <div className="p-8" style={{ maxWidth: 1600 }}>
      <Link to="/admin/client-galleries" className="inline-flex items-center gap-2 text-sm text-neutral-600">
        <ArrowLeft className="h-4 w-4" /> Client Galleries
      </Link>

      <div className="mt-5" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 390px", gap: 24, alignItems: "start" }}>
        <main>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Private delivery</p>
          <h1 className="text-4xl mt-2" style={{ fontWeight: 600, letterSpacing: "-.025em" }}>{gallery.title}</h1>
          <p className="mt-3 text-neutral-600">
            {gallery.assetCount} images · {originalCount} private originals · {gallery.favouriteCount} favourites · {gallery.downloadCount || 0} downloads · {gallery.status}
          </p>

          <div className="mt-7 rounded-3xl border border-black/15 bg-white p-5 flex gap-3 flex-wrap">
            <button disabled={busy || !draft.weddingSlug} onClick={() => mutateAssets({ action: "importWedding" }, "Wedding assets imported.")} className="rounded-full bg-black text-white px-5 py-3 inline-flex items-center gap-2 disabled:opacity-40">
              <ImagePlus className="h-4 w-4" /> Import wedding assets
            </button>
            <button
              disabled={gallery.status !== "live"}
              onClick={() => navigator.clipboard?.writeText(shareUrl)}
              title={gallery.status === "live" ? "Copy private link" : "Save the gallery as Live before sharing"}
              className="rounded-full border border-black/20 px-5 py-3 inline-flex items-center gap-2 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" /> Copy private link
            </button>
            {gallery.status === "live" ? (
              <a href={shareUrl} target="_blank" rel="noreferrer" className="rounded-full border border-black/20 px-5 py-3 inline-flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> Open gallery
              </a>
            ) : null}
          </div>

          <section className="mt-7 rounded-3xl border border-black/15 bg-white p-5">
            <div className="flex items-start justify-between gap-5 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Private originals</p>
                <h2 className="text-2xl mt-2" style={{ fontWeight: 600 }}>Upload full-resolution JPEGs</h2>
                <p className="mt-2 text-sm text-neutral-600" style={{ maxWidth: 700 }}>
                  Originals upload in resumable 8 MB parts to private R2 storage. Web and thumbnail previews are generated in this browser and stored separately.
                </p>
              </div>
              <label className="rounded-full bg-black text-white px-5 py-3 inline-flex items-center gap-2 cursor-pointer">
                <UploadCloud className="h-4 w-4" /> Choose JPEGs
                <input type="file" multiple accept="image/jpeg,.jpg,.jpeg" onChange={(event) => { addOriginalFiles(event.target.files); event.currentTarget.value = ""; }} style={{ display: "none" }} />
              </label>
            </div>

            {uploads.length ? (
              <div className="mt-5" style={{ display: "grid", gap: 10 }}>
                {uploads.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-black/10 bg-neutral-50 p-4" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 110px 42px", gap: 14, alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="flex items-center gap-2">
                        {item.status === "done" ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : item.status === "error" ? <AlertCircle className="h-4 w-4 text-red-700" /> : <UploadCloud className="h-4 w-4 text-neutral-500" />}
                        <p className="text-sm truncate" title={item.file.name}>{item.file.name}</p>
                      </div>
                      <div className="mt-2" style={{ height: 5, borderRadius: 999, background: "#ddd", overflow: "hidden" }}>
                        <div style={{ width: `${item.progress}%`, height: "100%", background: item.status === "error" ? "#b91c1c" : "#111", transition: "width .2s ease" }} />
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">{item.error || item.stage} · {(item.file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <div className="text-xs text-neutral-600" style={{ textAlign: "right" }}>{item.progress}%</div>
                    {item.status === "error" ? (
                      <button title="Retry" onClick={() => updateUpload(item.id, { status: "queued", progress: 0, stage: "Ready", error: "" })} className="rounded-full border border-black/15 p-2"><RefreshCw className="h-4 w-4" /></button>
                    ) : item.status === "uploading" ? (
                      <span className="rounded-full border border-black/10 p-2" aria-label="Uploading"><RefreshCw className="h-4 w-4 animate-spin" /></span>
                    ) : (
                      <button title="Remove from queue" disabled={uploading} onClick={() => setUploads((current) => current.filter((upload) => upload.id !== item.id))} className="rounded-full border border-black/15 p-2 disabled:opacity-30"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 flex-wrap mt-2">
                  <p className="text-xs text-neutral-500">Re-selecting the same file after an interrupted attempt resumes uploaded parts.</p>
                  <button disabled={uploading || queuedCount === 0} onClick={uploadQueuedOriginals} className="rounded-full bg-black text-white px-6 py-3 inline-flex items-center gap-2 disabled:opacity-40">
                    <UploadCloud className="h-4 w-4" /> {uploading ? "Uploading…" : `Upload ${queuedCount || ""} original${queuedCount === 1 ? "" : "s"}`}
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="mt-7 rounded-3xl border border-black/15 bg-white p-5">
            <div className="flex items-end gap-3 flex-wrap">
              <div style={{ flex: 1, minWidth: 260 }}>
                <label className="text-xs uppercase tracking-[0.18em] text-neutral-500">Add from Asset Library</label>
                <input value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} placeholder="Search filename, caption or alt…" className="mt-2 w-full rounded-xl border border-black/20 px-4 py-3" />
              </div>
              <button onClick={searchAssets} disabled={busy} className="rounded-xl border border-black px-5 py-3">Search</button>
            </div>
            {assetResults.length ? (
              <div className="mt-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                {assetResults.map((asset) => (
                  <button key={asset.id} onClick={() => mutateAssets({ action: "add", assetIds: [asset.id] }, "Image added.")} className="text-left rounded-xl border border-black/15 overflow-hidden bg-white">
                    <img src={asset.files.thumb || asset.files.web} alt="" style={{ width: "100%", height: 100, objectFit: "cover" }} />
                    <span className="block p-2 text-xs truncate">+ {asset.filename}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="mt-7">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl" style={{ fontWeight: 600 }}>Gallery images</h2>
              <span className="text-sm text-neutral-500">{detail.assets.length} total</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
              {detail.assets.map((asset) => (
                <article key={asset.assetId} className="rounded-2xl border border-black/15 overflow-hidden bg-white">
                  <div style={{ height: 150, position: "relative", background: "#eee" }}>
                    <img src={asset.thumbSrc || asset.webSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: asset.hidden ? 0.45 : 1 }} />
                    {gallery.coverAssetId === asset.assetId ? <span className="absolute top-2 left-2 rounded-full bg-black text-white px-2 py-1 text-[10px] uppercase">Cover</span> : null}
                    {asset.hasOriginal ? <span className="absolute top-2 right-2 rounded-full bg-white text-black px-2 py-1 text-[10px] uppercase inline-flex items-center gap-1"><Download className="h-3 w-3" /> Original</span> : null}
                  </div>
                  <div className="p-3">
                    <p className="text-xs truncate" title={asset.filename}>{asset.filename}</p>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button title="Set cover" onClick={() => mutateAssets({ action: "setCover", assetId: asset.assetId }, "Cover updated.")} className="rounded-full border border-black/15 p-2"><Star className="h-3.5 w-3.5" /></button>
                      <button title={asset.hidden ? "Show" : "Hide"} onClick={() => mutateAssets({ action: "setHidden", assetId: asset.assetId, hidden: !asset.hidden }, asset.hidden ? "Image shown." : "Image hidden.")} className="rounded-full border border-black/15 p-2">{asset.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                      <button title="Remove" onClick={() => mutateAssets({ action: "remove", assetId: asset.assetId }, "Image removed.")} className="rounded-full border border-black/15 p-2"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="rounded-3xl border border-black/15 bg-white p-6" style={{ position: "sticky", top: 24 }}>
          <h2 className="text-xl" style={{ fontWeight: 600 }}>Gallery settings</h2>
          <div className="mt-5 space-y-4">
            <label className="block"><span className="text-xs uppercase tracking-[0.16em] text-neutral-500">Title</span><input value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1 w-full rounded-xl border border-black/20 px-3 py-2.5" /></label>
            <label className="block"><span className="text-xs uppercase tracking-[0.16em] text-neutral-500">Client name</span><input value={draft.clientName || ""} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} className="mt-1 w-full rounded-xl border border-black/20 px-3 py-2.5" /></label>
            <label className="block"><span className="text-xs uppercase tracking-[0.16em] text-neutral-500">Client email</span><input value={draft.clientEmail || ""} onChange={(e) => setDraft({ ...draft, clientEmail: e.target.value })} className="mt-1 w-full rounded-xl border border-black/20 px-3 py-2.5" /></label>
            <label className="block"><span className="text-xs uppercase tracking-[0.16em] text-neutral-500">Wedding</span><select value={draft.weddingSlug || ""} onChange={(e) => setDraft({ ...draft, weddingSlug: e.target.value })} className="mt-1 w-full rounded-xl border border-black/20 px-3 py-2.5 bg-white"><option value="">No linked wedding</option>{detail.weddings.map((wedding) => <option key={wedding.slug} value={wedding.slug}>{wedding.title || wedding.couple || wedding.slug}</option>)}</select></label>
            {selectedWedding ? <p className="text-xs text-neutral-500">{selectedWedding.venue} {selectedWedding.weddingDate ? `· ${selectedWedding.weddingDate}` : ""}</p> : null}
            <label className="block"><span className="text-xs uppercase tracking-[0.16em] text-neutral-500">Intro</span><textarea value={draft.intro || ""} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-black/20 px-3 py-2.5" /></label>
            <label className="block"><span className="text-xs uppercase tracking-[0.16em] text-neutral-500">Status</span><select value={draft.status || "draft"} onChange={(e) => setDraft({ ...draft, status: e.target.value as any })} className="mt-1 w-full rounded-xl border border-black/20 px-3 py-2.5 bg-white"><option value="draft">Draft</option><option value="live">Live</option><option value="archived">Archived</option></select></label>
            <label className="block"><span className="text-xs uppercase tracking-[0.16em] text-neutral-500">New / replacement PIN</span><input value={draft.pin || ""} onChange={(e) => setDraft({ ...draft, pin: e.target.value })} placeholder={gallery.pinEnabled ? "Leave blank to keep current PIN" : "Optional"} className="mt-1 w-full rounded-xl border border-black/20 px-3 py-2.5" /></label>
            {gallery.pinEnabled ? <button onClick={() => setDraft({ ...draft, pin: "" })} className="text-xs underline underline-offset-4">Clear PIN on save</button> : null}
            <label className="block"><span className="text-xs uppercase tracking-[0.16em] text-neutral-500">Expiry</span><input type="datetime-local" value={(draft.expiresAt || "").slice(0,16)} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} className="mt-1 w-full rounded-xl border border-black/20 px-3 py-2.5" /></label>
            <label className="flex items-center gap-3"><input type="checkbox" checked={draft.allowFavourites ?? true} onChange={(e) => setDraft({ ...draft, allowFavourites: e.target.checked })} /> <span>Allow favourites</span></label>
            <label className="flex items-center gap-3"><input type="checkbox" checked={draft.allowDownloads ?? false} onChange={(e) => setDraft({ ...draft, allowDownloads: e.target.checked })} /> <span>Allow original downloads</span></label>
            <div className="rounded-xl bg-neutral-100 p-3 text-xs text-neutral-600">
              Downloads are available only for images with a private original. Existing website-only assets remain view-only.
            </div>
            <button onClick={save} disabled={busy} className="w-full rounded-xl bg-black text-white px-5 py-3 inline-flex items-center justify-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> Save settings</button>
            {message ? <p className="text-sm text-green-700">{message}</p> : null}
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
