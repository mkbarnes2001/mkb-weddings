import {
  useEffect,
  useMemo,
  useState } from "react";
import { Link } from "react-router-dom";
import { Building2,
  GripVertical,
  Images,
  MapPin,
  Plus,
  Save,
  Search } from "lucide-react";
import { AdminApiService,
  type LocationArea,
  type LocationTypeDefinition } from "../services/AdminApiService";
import type { VenueSummary } from "../types/venue";
import { AdminPage,
  AdminPageHeader,
  AdminToolbar,
  AdminHeaderRouterLink,
} from "../components/ui/AdminUI";

function venueHero(venue: VenueSummary) {
  const images = venue.gallery?.images || [];
  const heroId = venue.gallery?.heroAssetId || venue.heroImageId;
  return images.find((image) => image.assetId === heroId || image.imageId === heroId) || images.find((image) => image.included) || images[0] || null;
}

export function Venues() {
  const [venues, setVenues] = useState<VenueSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [draggedSlug, setDraggedSlug] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationTypes, setLocationTypes] = useState<LocationTypeDefinition[]>([]);
  const [locations, setLocations] = useState<LocationArea[]>([]);

  useEffect(() => {
    Promise.all([AdminApiService.listVenues(), AdminApiService.getLocations()])
      .then(([rows, locationConfig]) => {
        setVenues(rows);
        setActiveSlug(rows[0]?.slug || null);
        setLocationTypes(locationConfig.types || []);
        setLocations(locationConfig.locations || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load venues."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter((venue) => [venue.name, venue.county, venue.town, venue.slug].some((value) => String(value || "").toLowerCase().includes(q)));
  }, [venues, query]);

  const active = venues.find((venue) => venue.slug === activeSlug) || null;


  const activeLocations = useMemo(() => {
    if (!active) return [];
    return locations
      .filter((location) => location.status === "active" && location.venueSlugs.includes(active.slug))
      .sort((a, b) => {
        const typeA = locationTypes.find((type) => type.key === a.areaType)?.sortOrder || 999;
        const typeB = locationTypes.find((type) => type.key === b.areaType)?.sortOrder || 999;
        return typeA - typeB || a.name.localeCompare(b.name);
      });
  }, [active, locations, locationTypes]);

  function locationTypeLabel(key: string) {
    return locationTypes.find((type) => type.key === key)?.label || key.replace(/(^|[-_ ])\w/g, (m) => m.toUpperCase());
  }

  function dropOn(targetSlug: string) {
    if (!draggedSlug || draggedSlug === targetSlug) { setDraggedSlug(null); return; }
    setVenues((current) => {
      const moving = current.find((venue) => venue.slug === draggedSlug);
      if (!moving) return current;
      const remaining = current.filter((venue) => venue.slug !== draggedSlug);
      const index = remaining.findIndex((venue) => venue.slug === targetSlug);
      const next = [...remaining];
      next.splice(index < 0 ? next.length : index, 0, moving);
      return next.map((venue, order) => ({ ...venue, gallerySortOrder: order + 1 }));
    });
    setDirty(true); setMessage(""); setDraggedSlug(null);
  }

  function toggleVisible(slug: string, visible: boolean) {
    setVenues((current) => current.map((venue) => venue.slug === slug ? { ...venue, galleryVisible: visible } : venue));
    setDirty(true); setMessage(""); setError("");
  }

  async function saveLayout() {
    setSaving(true); setError(""); setMessage("");
    try {
      const saved = await AdminApiService.saveVenueListSettings(venues.map((venue, index) => ({
        slug: venue.slug,
        sortOrder: index + 1,
        galleryVisible: venue.galleryVisible !== false,
      })));
      setVenues(saved);
      setDirty(false);
      setMessage("Venue gallery order and visibility saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save venue order.");
    } finally { setSaving(false); }
  }

  if (loading) return <div className="text-neutral-500">Loading venues…</div>;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Venue repository"
        title="Venues"
        description="Manage venue records, public visibility and Gallery by Venue order without affecting linked weddings or assets."
        actions={<>
          <AdminHeaderRouterLink to="/admin/venues/new" className="admin-button admin-button--secondary"><Plus className="admin-button__icon" />New venue</AdminHeaderRouterLink>
          <button type="button" onClick={saveLayout} disabled={!dirty || saving} className="admin-button admin-button--primary"><Save className="admin-button__icon" />{saving ? "Saving…" : dirty ? "Save order" : "Saved"}</button>
        </>}
      />

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      <AdminToolbar>
        <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search venues, towns or counties..." className="h-[34px] w-full border border-black/10 bg-white pl-9 pr-3 text-[11px]" /></div>
      </AdminToolbar>

      {!filtered.length ? (
        <section className="rounded-[28px] border border-black/10 bg-white/75 p-10 text-center"><Building2 className="mx-auto h-9 w-9 text-neutral-400" /><h2 className="mt-4 font-serif text-3xl">No venues found</h2></section>
      ) : (
        <section className="admin-master-detail admin-master-detail--340">
          <div className="admin-master-detail__main admin-card-grid admin-card-grid--landscape">
            {filtered.map((venue) => {
              const hero = venueHero(venue);
              const selected = venue.slug === activeSlug;
              return (
                <article key={venue.id} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn(venue.slug)} onClick={() => setActiveSlug(venue.slug)} style={{ overflow: "hidden", borderRadius: "18px", border: selected ? "2px solid #111" : "1px solid rgba(0,0,0,0.12)", background: "#fff", opacity: venue.galleryVisible === false ? 0.55 : 1, cursor: "pointer" }}>
                  <div style={{ position: "relative", aspectRatio: "4 / 3", background: "#f5f5f5", overflow: "hidden" }}>
                    {hero ? <img src={hero.thumbSrc || hero.fullSrc} alt={hero.aiAlt || venue.name} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Building2 className="h-7 w-7 text-neutral-300" /></div>}
                    <div draggable onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = "move"; setDraggedSlug(venue.slug); }} onDragEnd={() => setDraggedSlug(null)} style={{ position: "absolute", right: "10px", bottom: "10px", width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", background: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.22)", cursor: "grab" }} title="Drag to reorder"><GripVertical className="h-5 w-5" /></div>
                    {venue.galleryVisible === false ? <span className="absolute left-2.5 top-2.5 rounded-full bg-black/80 px-2.5 py-1 text-[10px] text-white">Hidden</span> : null}
                  </div>
                  <div className="admin-venue-card__body"><h2 className="admin-venue-card__title line-clamp-2">{venue.name}</h2><p className="admin-venue-card__location line-clamp-2">{[venue.town, venue.county].filter(Boolean).join(", ") || "Location not set"}</p></div>
                </article>
              );
            })}
          </div>

          <aside className="admin-summary-panel admin-record-summary rounded-[18px] border border-black/10 bg-white p-4">
            {!active ? <p className="text-[11px] text-neutral-500">Select a venue to view details.</p> : <div className="space-y-3.5">
              {venueHero(active) ? <img src={venueHero(active)?.thumbSrc || venueHero(active)?.fullSrc} alt={active.name} className="max-h-[210px] w-full rounded-xl object-cover" /> : null}
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Venue</p>
                <h2 className="mt-1.5 break-words text-[19px] font-semibold leading-[1.15] tracking-[-0.025em]">{active.name}</h2>
                <p className="mt-1.5 text-[10px] leading-4 text-neutral-500">{[active.town, active.county, active.country].filter(Boolean).join(", ")}</p>
              </div>

              <label className="admin-summary-toggle admin-venue-visibility-toggle">
                <span>Show on Gallery by Venue</span>
                <input type="checkbox" checked={active.galleryVisible !== false} onChange={(event) => toggleVisible(active.slug, event.target.checked)} />
              </label>

              <div className="rounded-xl bg-neutral-50 p-3">
                <div className="admin-venue-location-heading"><MapPin className="h-3 w-3 text-neutral-400" strokeWidth={1.6} />Assigned location</div>
                {activeLocations.length ? (
                  <div className="admin-venue-location-list mt-2 space-y-1.5">
                    {activeLocations.map((location) => (
                      <div key={location.id} className="flex min-w-0 items-center justify-between gap-3 text-[10px]">
                        <span className="truncate font-medium text-neutral-700">{location.name}</span>
                        <span className="shrink-0 text-[8px] uppercase tracking-[0.08em] text-neutral-400">{locationTypeLabel(location.areaType)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="mt-2 text-[10px] text-neutral-500">No location assigned.</p>}
              </div>

              <div className="admin-summary-metrics">
                <div className="admin-summary-metric"><span>Weddings</span><strong>{active.weddingCount}</strong></div>
                <div className="admin-summary-metric"><span>Images</span><strong>{active.imageCount}</strong></div>
              </div>

              <dl className="admin-compact-details admin-venue-status"><div><dt>Status</dt><dd>{active.status}</dd></div></dl>

              <Link to={`/admin/venues/${active.slug}`} className="admin-button admin-button--primary w-full"><Building2 className="admin-button__icon" strokeWidth={1.6} />Open venue</Link>
              <Link to={`/admin/venues/${active.slug}/gallery`} className="admin-button admin-button--secondary w-full"><Images className="admin-button__icon" strokeWidth={1.6} />Manage gallery</Link>
            </div>}
          </aside>
        </section>
      )}
    </AdminPage>
  );
}
