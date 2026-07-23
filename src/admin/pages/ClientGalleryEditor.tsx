import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Copy, ExternalLink, Eye, EyeOff, ImagePlus, Save, Star, Trash2 } from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { AssetRecord } from "../types/asset";
import type { ClientGalleryDetailPayload, ClientGalleryRecord } from "../types/clientGallery";

function publicUrl(token: string) {
  return `${window.location.protocol}//${window.location.host.replace(/^admin\./, "www.")}/client-gallery/${token}`;
}

export function ClientGalleryEditor() {
  const { id = "" } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ClientGalleryDetailPayload | null>(null);
  const [draft, setDraft] = useState<Partial<ClientGalleryRecord> & { pin?: string }>({});
  const [assetSearch, setAssetSearch] = useState("");
  const [assetResults, setAssetResults] = useState<AssetRecord[]>([]);
  const [busy, setBusy] = useState(false);
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
      const result = await AdminApiService.getAssetLibrary({ q: assetSearch.trim(), wedding: draft.weddingSlug || undefined, limit: 60 });
      const existing = new Set((detail?.assets || []).map((asset) => asset.assetId));
      setAssetResults(result.assets.filter((asset) => !existing.has(asset.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search Asset Library.");
    } finally {
      setBusy(false);
    }
  };

  if (!detail) {
    return <div className="p-8">{error || "Loading client gallery…"}</div>;
  }

  const gallery = detail.gallery;
  const shareUrl = publicUrl(gallery.accessToken);

  return (
    <div className="p-8" style={{ maxWidth: 1600 }}>
      <Link to="/admin/client-galleries" className="inline-flex items-center gap-2 text-sm text-neutral-600"><ArrowLeft className="h-4 w-4" /> Client Galleries</Link>

      <div className="mt-5" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 390px", gap: 24, alignItems: "start" }}>
        <main>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Private delivery</p>
          <h1 className="font-serif text-5xl mt-2">{gallery.title}</h1>
          <p className="mt-3 text-neutral-600">{gallery.assetCount} images · {gallery.favouriteCount} favourites · {gallery.status}</p>

          <div className="mt-7 rounded-3xl border border-black/15 bg-white p-5 flex gap-3 flex-wrap">
            <button disabled={busy || !draft.weddingSlug} onClick={() => mutateAssets({ action: "importWedding" }, "Wedding assets imported.")} className="rounded-full bg-black text-white px-5 py-3 inline-flex items-center gap-2 disabled:opacity-40">
              <ImagePlus className="h-4 w-4" /> Import wedding assets
            </button>
            <button onClick={() => navigator.clipboard?.writeText(shareUrl)} className="rounded-full border border-black/20 px-5 py-3 inline-flex items-center gap-2"><Copy className="h-4 w-4" /> Copy private link</button>
            {gallery.status === "live" ? <a href={shareUrl} target="_blank" rel="noreferrer" className="rounded-full border border-black/20 px-5 py-3 inline-flex items-center gap-2"><ExternalLink className="h-4 w-4" /> Open gallery</a> : null}
          </div>

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
              <h2 className="font-serif text-3xl">Gallery images</h2>
              <span className="text-sm text-neutral-500">{detail.assets.length} total</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
              {detail.assets.map((asset) => (
                <article key={asset.assetId} className="rounded-2xl border border-black/15 overflow-hidden bg-white">
                  <div style={{ height: 150, position: "relative", background: "#eee" }}>
                    <img src={asset.thumbSrc || asset.webSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: asset.hidden ? 0.45 : 1 }} />
                    {gallery.coverAssetId === asset.assetId ? <span className="absolute top-2 left-2 rounded-full bg-black text-white px-2 py-1 text-[10px] uppercase">Cover</span> : null}
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
          <h2 className="font-serif text-2xl">Gallery settings</h2>
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
            <div className="rounded-xl bg-neutral-100 p-3 text-xs text-neutral-600">Full-resolution downloads remain disabled until the private-original upload pipeline is added. Existing website derivatives are used only as previews.</div>
            <button onClick={save} disabled={busy} className="w-full rounded-xl bg-black text-white px-5 py-3 inline-flex items-center justify-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> Save settings</button>
            {message ? <p className="text-sm text-green-700">{message}</p> : null}
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
