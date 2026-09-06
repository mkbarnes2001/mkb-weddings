import { AdminActionRouterLink } from "../components/ui/AdminActionControl";
import {
  useEffect,
  useMemo,
  useState } from "react";
import { Building2, GripVertical, Images, Plus, Save, Search } from "lucide-react";
import { AdminApiService,
  type LocationArea,
  type LocationTypeDefinition } from "../services/AdminApiService";
import type { VenueSummary } from "../types/venue";
import { AdminPage, AdminPageHeader, AdminPanel, AdminButton, AdminStatus, AdminEmptyState } from "../components/ui/AdminUI";

import { StudioBackLink, StudioThumbnail, StudioToggle } from "../components/ui/StudioUI";

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

  return <AdminPage className="studio-page">
    <AdminPageHeader title="Venues" backLink={<StudioBackLink />} meta={<span>{venues.length} venues</span>} actions={<>
      <AdminActionRouterLink to="/admin/venues/new" className="admin-button admin-button--secondary" aria-label="New venue"><Plus /></AdminActionRouterLink>
      <AdminButton data-admin-action="save" icon={Save} variant="primary" onClick={saveLayout} disabled={!dirty || saving}>{saving ? "Saving…" : dirty ? "Save order" : "Saved"}</AdminButton>
    </>} />
    {message ? <div className="admin-alert admin-alert--success" role="status">{message}</div> : null}
    {error ? <div className="admin-alert admin-alert--error" role="alert">{error}</div> : null}
    <div className="studio-search"><Search aria-hidden="true" /><input className="admin-input" value={query} onChange={event => setQuery(event.target.value)} aria-label="Search venues" placeholder="Search venues" /></div>
    {!filtered.length ? <AdminEmptyState icon={Building2} title="No venues found" /> : <div className="studio-workspace">
      <div className="studio-record-list" aria-label="Venues">{filtered.map(venue => <article key={venue.id} className={`studio-record-row ${venue.slug === activeSlug ? "is-selected" : ""}`} onDragOver={event => event.preventDefault()} onDrop={() => dropOn(venue.slug)}>
        <span className="studio-drag" draggable title="Drag to reorder" onDragStart={event => {event.dataTransfer.effectAllowed = "move"; setDraggedSlug(venue.slug);}} onDragEnd={() => setDraggedSlug(null)}><GripVertical aria-hidden="true" /></span>
        <button type="button" className="studio-record-choice" aria-pressed={venue.slug === activeSlug} onClick={() => setActiveSlug(venue.slug)}>
          <StudioThumbnail src={venueHero(venue)?.thumbSrc || venueHero(venue)?.fullSrc} />
          <span><strong>{venue.name}</strong><small>{[venue.town, venue.county].filter(Boolean).join(", ") || "Location not set"}{venue.galleryVisible === false ? " · Hidden" : ""}</small></span>
        </button>
      </article>)}</div>
      <AdminPanel title={active?.name || "Venue details"} actions={active ? <>
        <AdminActionRouterLink to={`/admin/venues/${active.slug}`} className="admin-button admin-button--secondary" aria-label="Edit venue"><Building2 /></AdminActionRouterLink>
        <AdminActionRouterLink to={`/admin/venues/${active.slug}/gallery`} className="admin-button admin-button--primary" aria-label="Manage venue images"><Images /></AdminActionRouterLink>
      </> : undefined}>
        {!active ? <p className="studio-empty">Select a venue to view details.</p> : <div className="studio-venue-details">
          <p className="studio-meta">{[active.town, active.county, active.country].filter(Boolean).join(", ")}</p>
          <StudioToggle checked={active.galleryVisible !== false} onChange={event => toggleVisible(active.slug, event.target.checked)}>Show in venue gallery</StudioToggle>
          <dl className="studio-details"><div><dt>Weddings</dt><dd>{active.weddingCount}</dd></div><div><dt>Images</dt><dd>{active.imageCount}</dd></div><div><dt>Status</dt><dd><AdminStatus>{active.status}</AdminStatus></dd></div></dl>
          <h3>Assigned locations</h3>
          {activeLocations.length ? <dl className="studio-details">{activeLocations.map(location => <div key={location.id}><dt>{locationTypeLabel(location.areaType)}</dt><dd>{location.name}</dd></div>)}</dl> : <p className="studio-meta">No locations assigned.</p>}
        </div>}
      </AdminPanel>
    </div>}
  </AdminPage>;
}
