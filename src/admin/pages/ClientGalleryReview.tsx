import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Copy, Download, ExternalLink, Heart, ImageOff, Loader2 } from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type {
  ClientGalleryDetailPayload,
  ClientGalleryFavouriteAsset,
  ClientGalleryFavouritesPayload,
} from "../types/clientGallery";
import { AdminPageHeader } from "../components/ui/AdminUI";

type ReviewAsset = ClientGalleryFavouriteAsset & { sourceLabel?: string };

function formatBytes(bytes: number) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function csvDownload(filename: string, rows: string[][]) {
  const escape = (value: string) => `"${String(value || "").replaceAll('"', '""')}"`;
  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function safeFileBase(value: string) {
  return String(value || "client-gallery")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "client-gallery";
}

export function ClientGalleryReview() {
  const { id = "" } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const source = params.get("source") === "selection" ? "selection" : "favourites";
  const groupKey = params.get("group") || "combined";
  const selectionId = params.get("selectionId") || "";
  const [detail, setDetail] = useState<ClientGalleryDetailPayload | null>(null);
  const [favourites, setFavourites] = useState<ClientGalleryFavouritesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      AdminApiService.getClientGallery(id),
      source === "favourites" ? AdminApiService.getClientGalleryFavourites(id) : Promise.resolve(null),
    ]).then(([galleryDetail, favouriteData]) => {
      if (cancelled) return;
      setDetail(galleryDetail);
      setFavourites(favouriteData);
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load gallery review.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, source]);

  const selection = useMemo(
    () => detail?.selections.find((item) => item.id === selectionId) || null,
    [detail?.selections, selectionId],
  );

  const review = useMemo(() => {
    if (source === "selection") {
      if (!selection || !detail) return { title: "Client selection", subtitle: "", assets: [] as ReviewAsset[] };
      const originals = new Map<string, ClientGalleryDetailPayload["assets"][number]>(detail.assets.map((asset) => [asset.assetId, asset]));
      return {
        title: selection.requestName || "Client selection",
        subtitle: selection.displayName || selection.email || "Client selection",
        assets: selection.assets.map((asset) => ({
          ...asset,
          hasOriginal: Boolean(originals.get(asset.assetId)?.hasOriginal),
          fileSize: 0,
          firstFavouritedAt: "",
        })),
      };
    }
    if (!favourites) return { title: "Favourites", subtitle: "", assets: [] as ReviewAsset[] };
    if (groupKey === "combined") {
      return {
        title: "All favourites",
        subtitle: "Combined and deduplicated across all clients and visitors",
        assets: favourites.combinedAssets,
      };
    }
    const group = favourites.groups.find((item) => item.key === groupKey);
    return {
      title: group ? `${group.label} favourites` : "Favourites",
      subtitle: group?.email || "",
      assets: group?.assets || [],
    };
  }, [source, selection, detail, favourites, groupKey]);

  const originalCount = review.assets.filter((asset) => asset.hasOriginal).length;
  const bulkUrl = source === "selection"
    ? AdminApiService.clientGalleryBulkDownloadUrl(id, { source: "selection", selectionId })
    : AdminApiService.clientGalleryBulkDownloadUrl(id, { source: "favourites", group: groupKey });

  const copyFilenames = async () => {
    const names = review.assets.map((asset) => asset.filename).filter(Boolean);
    if (!names.length) return;
    try {
      await navigator.clipboard.writeText(names.join("\n"));
      setMessage(`${names.length} filename${names.length === 1 ? "" : "s"} copied.`);
      window.setTimeout(() => setMessage(""), 2500);
    } catch {
      setError("Unable to copy filenames. Your browser may block clipboard access.");
    }
  };

  const downloadCsv = () => {
    const galleryName = detail?.gallery.title || favourites?.gallery.title || "client-gallery";
    csvDownload(`${safeFileBase(galleryName)}-${source}.csv`, [
      ["filename", "asset_id", "full_resolution_original"],
      ...review.assets.map((asset) => [asset.filename, asset.assetId, asset.hasOriginal ? "yes" : "no"]),
    ]);
  };

  if (loading) {
    return <div className="p-6 text-sm text-neutral-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading gallery review…</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <AdminPageHeader
        title="Gallery review"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            {source === "favourites" ? (
              <Heart className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}

            <span>{review.title}</span>

            {review.subtitle ? (
              <span className="text-neutral-500">
                {review.subtitle}
              </span>
            ) : null}

            <span className="text-neutral-400">
              {review.assets.length} images
            </span>

            <span className="text-neutral-400">
              {originalCount} full-resolution originals
            </span>
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copyFilenames}
              disabled={!review.assets.length}
              className="admin-button admin-button--secondary"
            >
              <Copy className="admin-button__icon" />
              Copy filenames
            </button>

            <button
              onClick={downloadCsv}
              disabled={!review.assets.length}
              className="admin-button admin-button--secondary"
            >
              <Download className="admin-button__icon" />
              CSV
            </button>

            {originalCount ? (
              <a
                href={bulkUrl}
                className="admin-button admin-button--primary"
              >
                <Download className="admin-button__icon" />
                Download all originals
              </a>
            ) : null}
          </div>
        }
      />

      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div> : null}

      {source === "favourites" && favourites?.groups.length ? (
        <div className="mb-5 rounded-xl border border-black/10 bg-white p-4">
          <label className="block text-[10px] uppercase tracking-[0.08em] text-neutral-500 mb-2">Show favourites from</label>
          <select
            value={groupKey}
            onChange={(event) => {
              const next = new URLSearchParams(params);
              next.set("source", "favourites");
              next.set("group", event.target.value);
              next.delete("selectionId");
              setParams(next);
            }}
            className="w-full md:max-w-md rounded-lg border border-black/15 px-3 py-2 text-sm bg-white"
          >
            <option value="combined">All favourites — {favourites.combinedAssets.length} unique images</option>
            {favourites.groups.map((group) => (
              <option key={group.key} value={group.key}>{group.label} — {group.assetCount}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-neutral-500">The combined view removes duplicate photographs favourited by more than one person.</p>
        </div>
      ) : null}

      {!review.assets.length ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-white p-10 text-center text-sm text-neutral-500">
          <ImageOff className="h-6 w-6 mx-auto mb-2 text-neutral-400" />
          No images are available in this review yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
          {review.assets.map((asset) => (
            <article key={asset.assetId} className="rounded-xl border border-black/10 bg-white overflow-hidden">
              <div style={{ position: "relative", aspectRatio: "4 / 3", background: "#f5f5f5", overflow: "hidden" }}>
                {asset.thumbSrc || asset.webSrc ? (
                  <img src={asset.thumbSrc || asset.webSrc} alt={asset.filename} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : <ImageOff className="h-6 w-6 text-neutral-300" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }} />}
                <div style={{ position: "absolute", right: 8, top: 8, display: "flex", gap: 6 }}>
                  {asset.webSrc ? (
                    <a href={asset.webSrc} target="_blank" rel="noreferrer" title="View larger preview" className="rounded-lg bg-white/95 border border-black/10 p-2 shadow-sm">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                  {asset.hasOriginal ? (
                    <a href={AdminApiService.clientGalleryOriginalDownloadUrl(id, asset.assetId)} title="Download full-resolution original" className="rounded-lg bg-black text-white p-2 shadow-sm">
                      <Download className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium truncate" title={asset.filename}>{asset.filename}</p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-neutral-400">
                  <span>{asset.hasOriginal ? "Full-res stored" : "Preview only"}</span>
                  {asset.fileSize ? <span>{formatBytes(asset.fileSize)}</span> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
