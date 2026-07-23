import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, ExternalLink, Images, LockKeyhole, Plus, RefreshCcw } from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { ClientGalleryListPayload } from "../types/clientGallery";

function publicUrl(token: string) {
  return `${window.location.protocol}//${window.location.host.replace(/^admin\./, "www.")}/client-gallery/${token}`;
}

export function ClientGalleries() {
  const navigate = useNavigate();
  const [payload, setPayload] = useState<ClientGalleryListPayload | null>(null);
  const [title, setTitle] = useState("");
  const [weddingSlug, setWeddingSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setPayload(await AdminApiService.listClientGalleries());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load client galleries.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedWedding = useMemo(
    () => payload?.weddings.find((wedding) => wedding.slug === weddingSlug),
    [payload?.weddings, weddingSlug],
  );

  const create = async () => {
    const resolvedTitle = title.trim() || selectedWedding?.title || selectedWedding?.couple || "Client Gallery";
    if (!resolvedTitle) return;
    setBusy(true);
    setError("");
    try {
      const gallery = await AdminApiService.createClientGallery({
        title: resolvedTitle,
        weddingSlug,
        clientName: selectedWedding?.couple || "",
      });
      navigate(`/admin/client-galleries/${gallery.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create client gallery.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8" style={{ maxWidth: 1500 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Private delivery</p>
          <h1 className="font-serif text-5xl mt-2">Client Galleries</h1>
          <p className="mt-4 text-neutral-600" style={{ maxWidth: 760 }}>
            Create secure client-facing galleries from the canonical Asset Library. Existing public website images are reused as previews; private full-resolution originals will plug into the same asset identities in the next upload phase.
          </p>
        </div>
        <button onClick={load} className="rounded-full border border-black px-5 py-3 inline-flex items-center gap-2">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="mt-8 rounded-3xl border border-black/15 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5" />
          <h2 className="font-serif text-2xl">New client gallery</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) minmax(260px,1fr) auto", gap: 12 }}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Gallery title (optional if wedding selected)"
            className="rounded-xl border border-black/20 px-4 py-3"
          />
          <select
            value={weddingSlug}
            onChange={(event) => setWeddingSlug(event.target.value)}
            className="rounded-xl border border-black/20 px-4 py-3 bg-white"
          >
            <option value="">No linked wedding yet</option>
            {(payload?.weddings || []).map((wedding) => (
              <option key={wedding.slug} value={wedding.slug}>{wedding.title || wedding.couple || wedding.slug}</option>
            ))}
          </select>
          <button disabled={busy} onClick={create} className="rounded-xl bg-black text-white px-6 py-3 disabled:opacity-50">
            {busy ? "Creating…" : "Create gallery"}
          </button>
        </div>
        {weddingSlug ? (
          <p className="mt-3 text-sm text-neutral-500">Wedding assets will be imported automatically into the new gallery.</p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="mt-8" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
        {(payload?.galleries || []).map((gallery) => {
          const shareUrl = publicUrl(gallery.accessToken);
          return (
            <article key={gallery.id} className="rounded-3xl overflow-hidden border border-black/15 bg-white">
              <div style={{ height: 180, background: "#e9e6df" }}>
                {gallery.coverThumb || gallery.coverWeb ? (
                  <img src={gallery.coverThumb || gallery.coverWeb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-400"><Images className="h-10 w-10" /></div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">{gallery.status}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-500"><LockKeyhole className="h-3.5 w-3.5" /> {gallery.pinEnabled ? "PIN" : "Private link"}</span>
                </div>
                <h2 className="font-serif text-2xl mt-2">{gallery.title}</h2>
                <p className="text-sm text-neutral-600 mt-1">{gallery.clientName || gallery.weddingTitle || "No client assigned"}</p>
                <div className="mt-4 text-sm text-neutral-600 flex gap-4 flex-wrap">
                  <span>{gallery.assetCount} images</span>
                  <span>{gallery.favouriteCount} favourites</span>
                </div>
                <div className="mt-5 flex gap-2 flex-wrap">
                  <Link to={`/admin/client-galleries/${gallery.id}`} className="rounded-full bg-black text-white px-4 py-2 text-sm">Manage</Link>
                  <button
                    onClick={() => navigator.clipboard?.writeText(shareUrl)}
                    className="rounded-full border border-black/20 px-4 py-2 text-sm inline-flex items-center gap-2"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy link
                  </button>
                  {gallery.status === "live" ? (
                    <a href={shareUrl} target="_blank" rel="noreferrer" className="rounded-full border border-black/20 px-4 py-2 text-sm inline-flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5" /> Open
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {payload && payload.galleries.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-black/20 p-12 text-center text-neutral-500">
          No client galleries yet. Create one above and link it to a wedding to import its assets automatically.
        </div>
      ) : null}
    </div>
  );
}
