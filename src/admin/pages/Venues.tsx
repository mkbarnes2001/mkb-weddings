import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, GripVertical, Images, MapPin, Plus, Save, Search, X } from "lucide-react";
import { AdminApiService, type LocationArea, type LocationTypeDefinition } from "../services/AdminApiService";
import type { VenueSummary } from "../types/venue";
import { AdminPage, AdminPageHeader, AdminToolbar } from "../components/ui/AdminUI";

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
  const [locationSaving, setLocationSaving] = useState(false);

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


  const activeLocationIds = useMemo(() => {
    if (!active) return new Set<string>();
    return new Set(locations.filter((location) => location.venueSlugs.includes(active.slug)).map((location) => location.id));
  }, [active, locations]);

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

  const groupedLocations = useMemo(() => {
    const groups = new Map<string, LocationArea[]>();
    for (const location of locations.filter((item) => item.status === "active")) {
      const key = location.areaType || "custom";
      groups.set(key, [...(groups.get(key) || []), location]);
    }
    const typeOrder = new Map<string, number>(locationTypes.map((type) => [type.key, type.sortOrder] as const));
    return Array.from(groups.entries()).sort(([a], [b]) => (typeOrder.get(a) || 999) - (typeOrder.get(b) || 999) || a.localeCompare(b));
  }, [locations, locationTypes]);

  function locationTypeLabel(key: string) {
    return locationTypes.find((type) => type.key === key)?.label || key.replace(/(^|[-_ ])\w/g, (m) => m.toUpperCase());
  }

  async function toggleVenueLocation(locationId: string, checked: boolean) {
    if (!active) return;
    const nextLocations = locations.map((location) => {
      if (location.id !== locationId) return location;
      const venueSlugs = checked
        ? Array.from(new Set([...location.venueSlugs, active.slug]))
        : location.venueSlugs.filter((slug) => slug !== active.slug);
      return { ...location, venueSlugs };
    });
    setLocations(nextLocations);
    setLocationSaving(true); setError(""); setMessage("");
    try {
      const saved = await AdminApiService.saveLocations({ locations: nextLocations });
      setLocationTypes(saved.types || []);
      setLocations(saved.locations);
      setMessage(`Location assignments saved for ${active.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save venue locations.");
      const fresh = await AdminApiService.getLocations().catch(() => null);
      if (fresh) { setLocationTypes(fresh.types || []); setLocations(fresh.locations); }
    } finally { setLocationSaving(false); }
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
          <Link to="/admin/venues/new" className="admin-button admin-button--secondary"><Plus className="admin-button__icon" />New venue</Link>
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
                  <div className="p-3"><h2 className="truncate font-serif text-lg">{venue.name}</h2><p className="mt-1 truncate text-xs text-neutral-500">{[venue.town, venue.county].filter(Boolean).join(", ") || "Location not set"}</p></div>
                </article>
              );
            })}
          </div>

          <aside className="admin-summary-panel rounded-[24px] border border-black/10 bg-white p-5">
            {!active ? <p className="text-sm text-neutral-500">Select a venue to view details.</p> : <div className="space-y-5">
              {venueHero(active) ? <img src={venueHero(active)?.thumbSrc || venueHero(active)?.fullSrc} alt={active.name} className="max-h-[220px] w-full rounded-2xl object-cover" /> : null}
              <div><p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Venue</p><h2 className="mt-2 font-serif text-3xl">{active.name}</h2><p className="mt-2 text-sm text-neutral-500">{[active.town, active.county, active.country].filter(Boolean).join(", ")}</p></div>
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 p-4"><span className="text-sm">Show on Gallery by Venue</span><input type="checkbox" checked={active.galleryVisible !== false} onChange={(event) => toggleVisible(active.slug, event.target.checked)} /></label>
              <div className="rounded-2xl border border-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4" />Locations</p>
                    <p className="mt-1 text-xs text-neutral-500">Assign this venue to any county, region, destination or custom location.</p>
                  </div>
                  {locationSaving ? <span className="text-xs text-neutral-400">Saving…</span> : null}
                </div>
                <div className="mt-4 space-y-3">
                  {groupedLocations.length ? (
                    <>
                      <label className="block">
                        <span className="sr-only">Add a location</span>
                        <select
                          value=""
                          disabled={locationSaving || groupedLocations.every(([, items]) => items.every((location) => activeLocationIds.has(location.id)))}
                          onChange={(event) => {
                            const locationId = event.target.value;
                            if (locationId) void toggleVenueLocation(locationId, true);
                          }}
                          className="h-[34px] w-full rounded-md border border-black/10 bg-white px-3 text-[11px] text-neutral-700"
                        >
                          <option value="">{locationSaving ? "Saving location…" : "Select a location to add…"}</option>
                          {groupedLocations.map(([type, items]) => {
                            const available = items.filter((location) => !activeLocationIds.has(location.id));
                            if (!available.length) return null;
                            return (
                              <optgroup key={type} label={locationTypeLabel(type)}>
                                {available.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                              </optgroup>
                            );
                          })}
                        </select>
                      </label>

                      {activeLocations.length ? (
                        <div>
                          <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-neutral-400">Selected locations</p>
                          <div className="flex flex-wrap gap-1.5">
                            {activeLocations.map((location) => (
                              <span key={location.id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-black/10 bg-neutral-50 px-2 py-1 text-[10px] text-neutral-700">
                                <span className="truncate">{location.name}</span>
                                <span className="text-[9px] text-neutral-400">{locationTypeLabel(location.areaType)}</span>
                                <button
                                  type="button"
                                  disabled={locationSaving}
                                  onClick={() => void toggleVenueLocation(location.id, false)}
                                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-black hover:text-white disabled:opacity-40"
                                  aria-label={`Remove ${location.name}`}
                                  title={`Remove ${location.name}`}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : <p className="text-[11px] text-neutral-500">No locations assigned yet.</p>}
                    </>
                  ) : <p className="text-sm text-neutral-500">No location areas have been created yet. Add them in Admin → Locations.</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3"><Mini label="Weddings" value={active.weddingCount} /><Mini label="Images" value={active.imageCount} /></div>
              <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600"><p><span className="text-neutral-400">Status:</span> {active.status}</p><p className="mt-2"><span className="text-neutral-400">Public order:</span> {venues.findIndex((venue) => venue.slug === active.slug) + 1}</p></div>
              <Link to={`/admin/venues/${active.slug}`} className="block w-full rounded-full bg-black px-5 py-3 text-center text-sm text-white">Open venue</Link>
              <Link to={`/admin/venues/${active.slug}/gallery`} className="flex w-full items-center justify-center gap-2 rounded-full border border-black/10 px-5 py-3 text-sm"><Images className="h-4 w-4" />Manage gallery</Link>
            </div>}
          </aside>
        </section>
      )}
    </AdminPage>
  );
}

function Mini({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-black/10 p-3"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 font-serif text-2xl">{value}</p></div>; }
