import { AdminActionRouterLink } from "../components/ui/AdminActionControl";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Plus, Save, SlidersHorizontal } from "lucide-react";
import {
  AdminApiService,
  type LocationArea,
  type LocationTypeDefinition,
  type LocationVenueOption,
} from "../services/AdminApiService";
import { AdminPage, AdminPageHeader, AdminPanel, AdminField, AdminTabs, AdminTab, AdminButton } from "../components/ui/AdminUI";

import { StudioBackLink, StudioToggle } from "../components/ui/StudioUI";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function titleCase(value: string) {
  return value.replace(/(^|[-_ ])\w/g, (match) => match.toUpperCase());
}

export function Locations() {
  const [tab, setTab] = useState("areas");
  const [types, setTypes] = useState<LocationTypeDefinition[]>([]);
  const [locations, setLocations] = useState<LocationArea[]>([]);
  const [venues, setVenues] = useState<LocationVenueOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await AdminApiService.getLocations();
      setTypes(result.types || []);
      setLocations(result.locations || []);
      setVenues(result.venues || []);
      setSelectedId((current) => current || result.locations?.[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load locations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sortedTypes = useMemo(
    () => [...types].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [types],
  );
  const enabledTypes = sortedTypes.filter((type) => type.enabled);
  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [locations],
  );
  const selected = locations.find((location) => location.id === selectedId) || null;
  const activeCount = locations.filter((location) => location.status === "active").length;
  const publicCount = locations.filter(
    (location) => location.status === "active" && location.showOnLanding,
  ).length;

  function updateType(typeId: string, patch: Partial<LocationTypeDefinition>) {
    setTypes((current) =>
      current.map((type) => {
        if (type.id !== typeId) return type;
        const next = { ...type, ...patch };
        if (patch.enabled === false) next.galleryEligible = false;
        return next;
      }),
    );
    setMessage("");
  }

  function addType() {
    const order = types.reduce((max, item) => Math.max(max, item.sortOrder || 0), 0) + 10;
    const id = `location_type_${crypto.randomUUID()}`;
    const key = `custom-${types.length + 1}`;
    setTypes((current) => [
      ...current,
      {
        id,
        key,
        label: "New location type",
        pluralLabel: "New location types",
        enabled: true,
        galleryEligible: false,
        sortOrder: order,
        system: false,
      },
    ]);
    setMessage("");
  }

  function updateSelected(patch: Partial<LocationArea>) {
    if (!selectedId) return;
    setLocations((current) =>
      current.map((location) =>
        location.id === selectedId ? { ...location, ...patch } : location,
      ),
    );
    setMessage("");
  }

  function addLocation() {
    const id = `location_${crypto.randomUUID()}`;
    const nextOrder = locations.reduce((max, item) => Math.max(max, item.sortOrder || 0), 0) + 1;
    const defaultType = enabledTypes[0]?.key || "custom";
    const location: LocationArea = {
      id,
      slug: `new-location-${nextOrder}`,
      name: "New location",
      areaType: defaultType,
      country: "",
      countryCode: "",
      region: "",
      status: "active",
      showOnLanding: true,
      sortOrder: nextOrder,
      heroImageUrl: "",
      seoTitle: "",
      seoDescription: "",
      intro: "",
      venueSlugs: [],
    };
    setLocations((current) => [...current, location]);
    setSelectedId(id);
    setMessage("");
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await AdminApiService.saveLocations({ types, locations });
      setTypes(result.types);
      setLocations(result.locations);
      setVenues(result.venues);
      if (!result.locations.some((location) => location.id === selectedId)) {
        setSelectedId(result.locations[0]?.id || "");
      }
      setMessage("Location intelligence saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save locations.");
    } finally {
      setSaving(false);
    }
  }

  return <AdminPage className="studio-page">
    <AdminPageHeader title="Locations" backLink={<StudioBackLink />} meta={<span>{activeCount} active · {publicCount} visible</span>}
      actions={<><AdminActionRouterLink to="/admin/gallery/locations" aria-label="Location gallery settings" className="admin-button admin-button--secondary"><SlidersHorizontal /></AdminActionRouterLink><AdminButton data-admin-action="save" icon={Save} variant="primary" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save locations"}</AdminButton></>} />
    {error ? <div className="admin-alert admin-alert--error" role="alert">{error}</div> : null}
    {message ? <div className="admin-alert admin-alert--success" role="status">{message}</div> : null}
    <AdminTabs><AdminTab active={tab === "areas"} onClick={() => setTab("areas")}>Locations</AdminTab><AdminTab active={tab === "types"} onClick={() => setTab("types")}>Location types</AdminTab></AdminTabs>
    {loading ? <p role="status">Loading locations…</p> : tab === "types" ? <AdminPanel title="Location types" actions={<AdminButton icon={Plus} onClick={addType}>Add location type</AdminButton>}>
      <div className="studio-type-list">{sortedTypes.map(type => <article key={type.id} className="studio-type-row">
        <AdminField label="Name"><input className="admin-input" value={type.label} onChange={event => updateType(type.id, {label: event.target.value})} /></AdminField>
        <AdminField label="Plural name"><input className="admin-input" value={type.pluralLabel} onChange={event => updateType(type.id, {pluralLabel: event.target.value})} /></AdminField>
        <div className="studio-options"><StudioToggle checked={type.enabled} onChange={event => updateType(type.id, {enabled: event.target.checked})}>Available</StudioToggle><StudioToggle checked={type.galleryEligible} disabled={!type.enabled} onChange={event => updateType(type.id, {galleryEligible: event.target.checked})}>Use for galleries</StudioToggle></div>
      </article>)}</div>
    </AdminPanel> : <>
      <div className="studio-section-bar"><h2>Location areas</h2><AdminButton icon={Plus} onClick={addLocation}>Add location</AdminButton></div>
      <div className="studio-workspace">
        <div className="studio-record-list" aria-label="Locations">{sortedLocations.map(location => <button key={location.id} type="button" className={`studio-record-choice studio-record-row ${selectedId === location.id ? "is-selected" : ""}`} aria-pressed={selectedId === location.id} onClick={() => setSelectedId(location.id)}>
          <span><strong>{location.name}</strong><small>{types.find(type => type.key === location.areaType)?.label || titleCase(location.areaType)} · {location.venueSlugs.length} venues</small></span>
        </button>)}{!locations.length ? <p className="studio-empty">No locations yet.</p> : null}</div>
        <AdminPanel title={selected?.name || "Location details"}>{selected ? <LocationEditor location={selected} locations={locations} types={types} venues={venues} onChange={updateSelected} /> : <p className="studio-empty">Select a location or add a new one.</p>}</AdminPanel>
      </div>
    </>}
  </AdminPage>;
}

function Field({label, children}: {label: string; children: ReactNode}) {
  return <AdminField label={label}>{children}</AdminField>;
}

function LocationEditor({
  location,
  locations,
  types,
  venues,
  onChange,
}: {
  location: LocationArea;
  locations: LocationArea[];
  types: LocationTypeDefinition[];
  venues: LocationVenueOption[];
  onChange: (patch: Partial<LocationArea>) => void;
}) {
  const availableTypes = types.filter((type) => type.enabled || type.key === location.areaType);

  return (
    <div>
      <div className="studio-options studio-options--first"><StudioToggle checked={location.showOnLanding} onChange={event => onChange({showOnLanding: event.target.checked})}>Show in gallery</StudioToggle></div>
      <div className="studio-form-grid">
        <Field label="Name">
          <input
            value={location.name}
            onChange={(event) => {
              const nextName = event.target.value;
              onChange({ name: nextName, ...(location.slug.startsWith("new-location-") ? { slug: slugify(nextName) } : {}) });
            }}
            className="w-full rounded-xl border border-black/10 px-3 py-2"
          />
        </Field>
        <Field label="Slug">
          <input value={location.slug} onChange={(event) => onChange({ slug: slugify(event.target.value) })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
        <Field label="Type">
          <select value={location.areaType} onChange={(event) => onChange({ areaType: event.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2">
            {availableTypes.map((type) => <option key={type.id} value={type.key}>{type.label}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={location.status} onChange={(event) => onChange({ status: event.target.value === "archived" ? "archived" : "active" })} className="w-full rounded-xl border border-black/10 px-3 py-2">
            <option value="active">Active</option><option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Country">
          <input value={location.country} onChange={(event) => onChange({ country: event.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
        <Field label="Country code">
          <input value={location.countryCode} onChange={(event) => onChange({ countryCode: event.target.value.toUpperCase() })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
        <Field label="Region label">
          <input value={location.region} onChange={(event) => onChange({ region: event.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
        <Field label="Parent location">
          <select value={location.parentId || ""} onChange={(event) => onChange({ parentId: event.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2">
            <option value="">No parent</option>
            {locations.filter((item) => item.id !== location.id && item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Sort order">
          <input type="number" value={location.sortOrder} onChange={(event) => onChange({ sortOrder: Number(event.target.value || 0) })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
      </div>

      <details className="studio-disclosure"><summary>Gallery appearance</summary><div className="studio-form-grid studio-form-grid--single">
        <Field label="Hero image URL"><input value={location.heroImageUrl} onChange={(event) => onChange({ heroImageUrl: event.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
        <Field label="SEO title"><input value={location.seoTitle} onChange={(event) => onChange({ seoTitle: event.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
        <Field label="SEO description"><textarea rows={2} value={location.seoDescription} onChange={(event) => onChange({ seoDescription: event.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
        <Field label="Intro"><textarea rows={3} value={location.intro} onChange={(event) => onChange({ intro: event.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
      </div></details>
      <div className="studio-form-grid studio-form-grid--single">
        <Field label="Venues in this location">
          <select
            multiple
            aria-label="Venues in this location"
            value={location.venueSlugs}
            onChange={(event) => onChange({ venueSlugs: Array.from(event.currentTarget.selectedOptions, (option: HTMLOptionElement) => option.value) })}
            className="w-full rounded-xl border border-black/10 px-3 py-2"
            style={{ minHeight: "180px" }}
          >
            {venues.map((venue) => <option key={venue.slug} value={venue.slug}>{venue.name}{venue.town ? ` — ${venue.town}` : ""}{venue.county ? `, ${venue.county}` : ""}</option>)}
          </select>
          <span className="mt-2 block text-xs text-neutral-500">Hold Cmd on Mac or Ctrl on Windows to select multiple venues. Venue Management edits the same relationships.</span>
        </Field>
      </div>


    </div>
  );
}
