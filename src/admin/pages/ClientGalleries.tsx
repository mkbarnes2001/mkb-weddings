import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, ExternalLink, Images, LockKeyhole, Mail, Plus, RefreshCcw } from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { ClientGalleryListPayload } from "../types/clientGallery";
import { AdminPage, AdminPageHeader, AdminPanel } from "../components/ui/AdminUI";

function publicUrl(slug: string, token: string) {
  const segment = slug ? encodeURIComponent(slug) : encodeURIComponent(token);
  return `${window.location.protocol}//${window.location.host.replace(/^admin\./, "www.")}/client-gallery/${segment}`;
}

export function ClientGalleries() {
  const navigate = useNavigate();
  const [payload, setPayload] = useState<ClientGalleryListPayload | null>(null);
  const [title, setTitle] = useState("");
  const [weddingSlug, setWeddingSlug] = useState("");
  const [gallerySlug, setGallerySlug] = useState("");
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

  useEffect(() => { load(); }, []);

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
        slug: gallerySlug,
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
    <AdminPage>
      <AdminPageHeader
        eyebrow="Private delivery"
        title="Client Galleries"
        description="Create secure client-facing galleries from canonical assets, private originals and persistent client identities."
        actions={<button onClick={load} className="admin-button admin-button--secondary"><RefreshCcw className="admin-button__icon" />Refresh</button>}
      />

      <AdminPanel title="New client gallery" description="Link a wedding to import its existing assets automatically." icon={Plus} compact>
        <div className="admin-client-gallery-create">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Gallery title (optional if wedding selected)"
          />
          <select value={weddingSlug} onChange={(event) => setWeddingSlug(event.target.value)}>
            <option value="">No linked wedding yet</option>
            {(payload?.weddings || []).map((wedding) => (
              <option key={wedding.slug} value={wedding.slug}>{wedding.title || wedding.couple || wedding.slug}</option>
            ))}
          </select>
          <input
            value={gallerySlug}
            onChange={(event) => setGallerySlug(event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""))}
            placeholder="Custom slug (optional)"
          />
          <button disabled={busy} onClick={create} className="admin-button admin-button--primary">
            {busy ? "Creating…" : "Create gallery"}
          </button>
        </div>
        {weddingSlug ? <p className="mt-2 text-[10px] text-neutral-500">Wedding assets will be imported automatically into the new gallery.</p> : null}
        {error ? <p className="mt-3 text-[11px] text-red-700">{error}</p> : null}
      </AdminPanel>

      <div className="admin-client-gallery-grid">
        {(payload?.galleries || []).map((gallery) => {
          const shareUrl = publicUrl(gallery.slug, gallery.accessToken);
          const accessLabel = gallery.requireEmail ? "Email required" : gallery.pinEnabled ? "PIN" : "Private link";
          const AccessIcon = gallery.requireEmail ? Mail : LockKeyhole;

          return (
            <article key={gallery.id} className="admin-client-gallery-card">
              <div className="admin-client-gallery-card__media">
                {gallery.coverThumb || gallery.coverWeb ? (
                  <img src={gallery.coverThumb || gallery.coverWeb} alt="" />
                ) : (
                  <div className="admin-client-gallery-card__placeholder"><Images /></div>
                )}
                <span className={`admin-client-gallery-card__status ${gallery.status === "live" ? "is-live" : ""}`}>{gallery.status}</span>
              </div>

              <div className="admin-client-gallery-card__body">
                <div className="admin-client-gallery-card__access"><AccessIcon strokeWidth={1.6} />{accessLabel}</div>
                <h2>{gallery.title}</h2>
                <p className="admin-client-gallery-card__client">{gallery.clientName || gallery.weddingTitle || "No client assigned"}</p>
                <div className="admin-client-gallery-card__metrics">
                  <span>{gallery.assetCount}<small>Images</small></span>
                  <span>{gallery.favouriteCount}<small>Favourites</small></span>
                  <span>{gallery.visitorCount || 0}<small>Visitors</small></span>
                </div>
                <div className="admin-client-gallery-card__actions">
                  <Link to={`/admin/client-galleries/${gallery.id}`} className="admin-button admin-button--primary admin-button--sm">Manage</Link>
                  <button onClick={() => navigator.clipboard?.writeText(shareUrl)} className="admin-button admin-button--secondary admin-button--sm"><Copy className="admin-button__icon" />Copy link</button>
                  {gallery.status === "live" ? <a href={shareUrl} target="_blank" rel="noreferrer" className="admin-button admin-button--secondary admin-button--sm"><ExternalLink className="admin-button__icon" />Open</a> : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {payload && payload.galleries.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-black/15 p-10 text-center text-[11px] text-neutral-500">
          No client galleries yet. Create one above and link it to a wedding to import its assets automatically.
        </div>
      ) : null}
    </AdminPage>
  );
}
