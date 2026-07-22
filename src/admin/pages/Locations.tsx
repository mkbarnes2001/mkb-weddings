import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, MapPinned, Plus, Save, SlidersHorizontal } from "lucide-react";
import {
  AdminApiService,
  type LocationArea,
  type LocationTypeDefinition,
  type LocationVenueOption,
} from "../services/AdminApiService";

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
  const galleryTypes = sortedTypes.filter((type) => type.enabled && type.galleryEligible);
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

  return (
    <div className="space-y-7">
      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">Location Intelligence</p>
            <h1 className="font-serif text-5xl md:text-6xl">Locations</h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/60">
              Define the geographic structure used across venues, intelligence and dynamic galleries. Each workspace chooses the location types that fit its market.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-black disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save locations"}
          </button>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {message ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {message}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-black/10 bg-white p-8 text-neutral-500">Loading locations…</div>
      ) : (
        <>
          <section className="rounded-[28px] border border-black/10 bg-white/85 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Workspace taxonomy</p>
                <h2 className="mt-2 font-serif text-3xl">Location types</h2>
                <p className="mt-2 max-w-3xl text-sm text-neutral-600">
                  Enable the types this photography business uses. Mark any type that should be available as a source for a dynamic public Location Gallery.
                </p>
              </div>
              <button type="button" onClick={addType} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm">
                <Plus className="h-4 w-4" /> Add custom type
              </button>
            </div>

            <div className="mt-6" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "14px" }}>
              {sortedTypes.map((type) => (
                <article key={type.id} className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <input
                        value={type.label}
                        onChange={(event) => updateType(type.id, { label: event.target.value })}
                        className="w-full border-0 bg-transparent p-0 font-serif text-xl outline-none"
                      />
                      <input
                        value={type.pluralLabel}
                        onChange={(event) => updateType(type.id, { pluralLabel: event.target.value })}
                        className="mt-1 w-full border-0 bg-transparent p-0 text-xs text-neutral-500 outline-none"
                      />
                    </div>
                    {type.system ? <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] text-neutral-500">Standard</span> : null}
                  </div>
                  <p className="mt-3 text-xs text-neutral-400">Key: {type.key}</p>
                  <div className="mt-4 space-y-2">
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm">
                      <span>Available for locations</span>
                      <input type="checkbox" checked={type.enabled} onChange={(event) => updateType(type.id, { enabled: event.target.checked })} />
                    </label>
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm">
                      <span>Can power a gallery</span>
                      <input
                        type="checkbox"
                        checked={type.galleryEligible}
                        disabled={!type.enabled}
                        onChange={(event) => updateType(type.id, { galleryEligible: event.target.checked })}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-neutral-100 p-4 text-sm text-neutral-600">
              {enabledTypes.length} location types enabled · {galleryTypes.length} available to Gallery Management.
            </div>
          </section>

          <section className="rounded-[28px] border border-black/10 bg-white/85 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-serif text-3xl">Location areas</h2>
                <p className="mt-2 text-sm text-neutral-600">{publicCount} public-ready · {activeCount} active · {locations.length} total</p>
              </div>
              <button type="button" onClick={addLocation} className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white">
                <Plus className="h-4 w-4" /> Add location
              </button>
            </div>

            <div className="mt-6" style={{ display: "grid", gridTemplateColumns: "minmax(240px, 0.8fr) minmax(0, 1.7fr)", gap: "20px" }}>
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                {sortedLocations.map((location) => {
                  const type = types.find((item) => item.key === location.areaType);
                  return (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => setSelectedId(location.id)}
                      className={`block w-full border-b border-black/5 p-4 text-left last:border-b-0 ${selectedId === location.id ? "bg-neutral-100" : "bg-white"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-sm">{location.name}</strong>
                        <span className="text-xs text-neutral-500">{type?.label || titleCase(location.areaType)}</span>
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">{location.venueSlugs.length} venues · {location.status === "active" && location.showOnLanding ? "public-ready" : "hidden"}</div>
                    </button>
                  );
                })}
                {!locations.length ? <div className="p-5 text-sm text-neutral-500">No locations yet.</div> : null}
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-5">
                {selected ? (
                  <LocationEditor location={selected} locations={locations} types={types} venues={venues} onChange={updateSelected} />
                ) : (
                  <div className="flex min-h-[240px] items-center justify-center text-center text-neutral-500">
                    <div><MapPinned className="mx-auto mb-3 h-7 w-7" />Select a location or add a new one.</div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-neutral-500">{label}</span>
      {children}
    </label>
  );
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-neutral-500">Location details</p>
          <h3 className="mt-1 font-serif text-2xl">{location.name}</h3>
        </div>
        <label className="flex items-center gap-2 rounded-full border border-black/10 px-3 py-2 text-sm">
          <input type="checkbox" checked={location.showOnLanding} onChange={(event) => onChange({ showOnLanding: event.target.checked })} />
          Public-ready
        </label>
      </div>

      <div className="mt-5" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px" }}>
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

      <div className="mt-5 grid gap-4">
        <Field label="Hero image URL"><input value={location.heroImageUrl} onChange={(event) => onChange({ heroImageUrl: event.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
        <Field label="SEO title"><input value={location.seoTitle} onChange={(event) => onChange({ seoTitle: event.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
        <Field label="SEO description"><textarea rows={2} value={location.seoDescription} onChange={(event) => onChange({ seoDescription: event.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
        <Field label="Intro"><textarea rows={3} value={location.intro} onChange={(event) => onChange({ intro: event.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
        <Field label="Venues in this location">
          <select
            multiple
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

      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-neutral-100 p-4 text-sm text-neutral-600">
        <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0" />
        Public gallery titles, source type, route, hero and SEO are configured separately in Gallery Management.
      </div>
    </div>
  );
}
