import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Check, GripVertical, Images, MapPin, Plus, Save, Search } from "lucide-react";
import { AdminApiService, type LocationArea, type LocationGallerySettings } from "../services/AdminApiService";
import type { VenueSummary } from "../types/venue";

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
  const [locationSettings, setLocationSettings] = useState<LocationGallerySettings | null>(null);
  const [locations, setLocations] = useState<LocationArea[]>([]);
  const [locationSaving, setLocationSaving] = useState(false);

  useEffect(() => {
    Promise.all([AdminApiService.listVenues(), AdminApiService.getLocations()])
      .then(([rows, locationConfig]) => {
        setVenues(rows);
        setActiveSlug(rows[0]?.slug || null);
        setLocationSettings(locationConfig.settings);
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

  const groupedLocations = useMemo(() => {
    const groups = new Map<string, LocationArea[]>();
    for (const location of locations.filter((item) => item.status === "active")) {
      const key = location.areaType || "custom";
      groups.set(key, [...(groups.get(key) || []), location]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [locations]);

  async function toggleVenueLocation(locationId: string, checked: boolean) {
    if (!active || !locationSettings) return;
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
      const saved = await AdminApiService.saveLocations({ settings: locationSettings, locations: nextLocations });
      setLocationSettings(saved.settings);
      setLocations(saved.locations);
      setMessage(`Location assignments saved for ${active.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save venue locations.");
      const fresh = await AdminApiService.getLocations().catch(() => null);
      if (fresh) { setLocationSettings(fresh.settings); setLocations(fresh.locations); }
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
    <div className="space-y-7">
      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">Venue Repository</p>
            <h1 className="font-serif text-5xl md:text-6xl">Venues</h1>
            <p className="mt-4 max-w-2xl text-white/60">Drag venues into the public Gallery by Venue order. Hide a venue without deleting its weddings, images or content.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/venues/new" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm text-white"><Plus className="h-4 w-4" />New venue</Link>
            <button type="button" onClick={saveLayout} disabled={!dirty || saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-black disabled:opacity-40"><Save className="h-4 w-4" />{saving ? "Saving…" : dirty ? "Save order" : "Saved"}</button>
          </div>
        </div>
      </section>

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search venues, towns or counties..." className="w-full rounded-2xl border border-black/10 bg-white/80 py-3 pl-11 pr-4 text-sm" /></div>

      {!filtered.length ? (
        <section className="rounded-[28px] border border-black/10 bg-white/75 p-10 text-center"><Building2 className="mx-auto h-9 w-9 text-neutral-400" /><h2 className="mt-4 font-serif text-3xl">No venues found</h2></section>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: "24px", alignItems: "start" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "14px" }}>
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

          <aside style={{ position: "sticky", top: "112px" }} className="rounded-[24px] border border-black/10 bg-white p-5">
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
                <div className="mt-4 space-y-4">
                  {groupedLocations.length ? groupedLocations.map(([type, items]) => (
                    <div key={type}>
                      <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-neutral-400">{type.replace(/(^|[-_ ])\w/g, (m) => m.toUpperCase())}</p>
                      <div className="space-y-2">
                        {items.map((location) => {
                          const checked = activeLocationIds.has(location.id);
                          return (
                            <label key={location.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm">
                              <span>{location.name}</span>
                              <span className="flex items-center gap-2">
                                {checked ? <Check className="h-4 w-4" /> : null}
                                <input type="checkbox" checked={checked} disabled={locationSaving} onChange={(event) => void toggleVenueLocation(location.id, event.target.checked)} />
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )) : <p className="text-sm text-neutral-500">No location areas have been created yet. Add them in Gallery Management → Locations.</p>}
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
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-black/10 p-3"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 font-serif text-2xl">{value}</p></div>; }
