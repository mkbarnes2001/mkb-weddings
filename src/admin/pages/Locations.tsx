import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, MapPinned, Plus, Save } from "lucide-react";
import {
  AdminApiService,
  type LocationArea,
  type LocationGallerySettings,
  type LocationVenueOption,
} from "../services/AdminApiService";

const DEFAULT_SETTINGS: LocationGallerySettings = {
  enabled: true,
  landingTitle: "Explore by Location",
  galleryTitle: "Wedding Photography by Location",
  cardDescription: "Browse wedding galleries by location",
  singularLabel: "Location",
  pluralLabel: "Locations",
  groupingLevel: "custom",
  publicBasePath: "/gallery/locations",
  intro: "",
  seoTitle: "",
  seoDescription: "",
  heroImageUrl: "",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function Locations() {
  const [settings, setSettings] = useState<LocationGallerySettings>(DEFAULT_SETTINGS);
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
      setSettings(result.settings || DEFAULT_SETTINGS);
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

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [locations],
  );
  const selected = locations.find((location) => location.id === selectedId) || null;
  const activeCount = locations.filter((location) => location.status === "active").length;
  const publicCount = locations.filter(
    (location) => location.status === "active" && location.showOnLanding,
  ).length;

  function updateSettings<K extends keyof LocationGallerySettings>(
    key: K,
    value: LocationGallerySettings[K],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
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
    const location: LocationArea = {
      id,
      slug: `new-location-${nextOrder}`,
      name: "New location",
      areaType: settings.groupingLevel || "custom",
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
      const result = await AdminApiService.saveLocations({ settings, locations });
      setSettings(result.settings);
      setLocations(result.locations);
      setVenues(result.venues);
      if (!result.locations.some((location) => location.id === selectedId)) {
        setSelectedId(result.locations[0]?.id || "");
      }
      setMessage("Location gallery settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save locations.");
    } finally {
      setSaving(false);
    }
  }

  const publicHref = `${settings.publicOrigin || "https://www.mkbweddings.co.uk"}${settings.publicBasePath || "/gallery/locations"}`;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link
            to="/admin/gallery"
            className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Gallery Management
          </Link>
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Dynamic gallery</p>
          <h1 className="mt-2 font-serif text-4xl">Locations</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-600">
            Configure the geographic gallery for this workspace. It can represent counties, regions,
            states, cities, destinations or any custom marketing areas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={publicHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm"
          >
            View live
          </a>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save locations"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}
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
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="font-serif text-3xl">Gallery settings</h2>
                <p className="mt-2 text-sm text-neutral-600">
                  MKB remains “Explore by County”, while another workspace can use Regions, States or Destinations.
                </p>
              </div>
              <label className="flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) => updateSettings("enabled", event.target.checked)}
                />
                Location gallery enabled
              </label>
            </div>

            <div
              className="mt-6"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px" }}
            >
              <Field label="Gallery landing card title">
                <input value={settings.landingTitle} onChange={(e) => updateSettings("landingTitle", e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" />
              </Field>
              <Field label="Gallery page title">
                <input value={settings.galleryTitle} onChange={(e) => updateSettings("galleryTitle", e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" />
              </Field>
              <Field label="Singular label">
                <input value={settings.singularLabel} onChange={(e) => updateSettings("singularLabel", e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" />
              </Field>
              <Field label="Plural label">
                <input value={settings.pluralLabel} onChange={(e) => updateSettings("pluralLabel", e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" />
              </Field>
              <Field label="Default grouping type">
                <select value={settings.groupingLevel} onChange={(e) => updateSettings("groupingLevel", e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2">
                  <option value="county">County</option>
                  <option value="region">Region</option>
                  <option value="state">State / Province</option>
                  <option value="country">Country</option>
                  <option value="city">City / Town</option>
                  <option value="destination">Destination</option>
                  <option value="custom">Custom area</option>
                </select>
              </Field>
              <Field label="Public base path">
                <input value={settings.publicBasePath} onChange={(e) => updateSettings("publicBasePath", e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" />
              </Field>
              <Field label="Landing card description">
                <input value={settings.cardDescription} onChange={(e) => updateSettings("cardDescription", e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" />
              </Field>
              <Field label="Hero image URL">
                <input value={settings.heroImageUrl} onChange={(e) => updateSettings("heroImageUrl", e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" />
              </Field>
            </div>

            <div className="mt-5 grid gap-4">
              <Field label="Intro text">
                <textarea rows={3} value={settings.intro} onChange={(e) => updateSettings("intro", e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                <Field label="SEO title">
                  <input value={settings.seoTitle} onChange={(e) => updateSettings("seoTitle", e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" />
                </Field>
                <Field label="SEO description">
                  <input value={settings.seoDescription} onChange={(e) => updateSettings("seoDescription", e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-black/10 bg-white/85 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-serif text-3xl">Location areas</h2>
                <p className="mt-2 text-sm text-neutral-600">
                  {publicCount} public · {activeCount} active · {locations.length} total
                </p>
              </div>
              <button type="button" onClick={addLocation} className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white">
                <Plus className="h-4 w-4" /> Add location
              </button>
            </div>

            <div className="mt-6" style={{ display: "grid", gridTemplateColumns: "minmax(240px, 0.8fr) minmax(0, 1.7fr)", gap: "20px" }}>
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                {sortedLocations.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => setSelectedId(location.id)}
                    className={`block w-full border-b border-black/5 p-4 text-left last:border-b-0 ${selectedId === location.id ? "bg-neutral-100" : "bg-white"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm">{location.name}</strong>
                      <span className="text-xs text-neutral-500">{location.areaType}</span>
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {location.venueSlugs.length} venues · {location.status === "active" && location.showOnLanding ? "public" : "hidden"}
                    </div>
                  </button>
                ))}
                {!locations.length ? <div className="p-5 text-sm text-neutral-500">No locations yet.</div> : null}
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-5">
                {selected ? (
                  <LocationEditor location={selected} locations={locations} venues={venues} onChange={updateSelected} />
                ) : (
                  <div className="flex min-h-[240px] items-center justify-center text-center text-neutral-500">
                    <div>
                      <MapPinned className="mx-auto mb-3 h-7 w-7" />
                      Select a location or add a new one.
                    </div>
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
  venues,
  onChange,
}: {
  location: LocationArea;
  locations: LocationArea[];
  venues: LocationVenueOption[];
  onChange: (patch: Partial<LocationArea>) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-neutral-500">Location details</p>
          <h3 className="mt-1 font-serif text-2xl">{location.name}</h3>
        </div>
        <label className="flex items-center gap-2 rounded-full border border-black/10 px-3 py-2 text-sm">
          <input type="checkbox" checked={location.showOnLanding} onChange={(e) => onChange({ showOnLanding: e.target.checked })} />
          Public
        </label>
      </div>

      <div className="mt-5" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px" }}>
        <Field label="Name">
          <input
            value={location.name}
            onChange={(e) => {
              const nextName = e.target.value;
              onChange({ name: nextName, ...(location.slug.startsWith("new-location-") ? { slug: slugify(nextName) } : {}) });
            }}
            className="w-full rounded-xl border border-black/10 px-3 py-2"
          />
        </Field>
        <Field label="Slug">
          <input value={location.slug} onChange={(e) => onChange({ slug: slugify(e.target.value) })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
        <Field label="Type">
          <select value={location.areaType} onChange={(e) => onChange({ areaType: e.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2">
            <option value="county">County</option>
            <option value="region">Region</option>
            <option value="state">State / Province</option>
            <option value="country">Country</option>
            <option value="city">City / Town</option>
            <option value="destination">Destination</option>
            <option value="custom">Custom area</option>
          </select>
        </Field>
        <Field label="Status">
          <select value={location.status} onChange={(e) => onChange({ status: e.target.value === "archived" ? "archived" : "active" })} className="w-full rounded-xl border border-black/10 px-3 py-2">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Country">
          <input value={location.country} onChange={(e) => onChange({ country: e.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
        <Field label="Country code">
          <input value={location.countryCode} onChange={(e) => onChange({ countryCode: e.target.value.toUpperCase() })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
        <Field label="Region label">
          <input value={location.region} onChange={(e) => onChange({ region: e.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
        <Field label="Parent location">
          <select value={location.parentId || ""} onChange={(e) => onChange({ parentId: e.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2">
            <option value="">No parent</option>
            {locations.filter((item) => item.id !== location.id && item.status === "active").map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Sort order">
          <input type="number" value={location.sortOrder} onChange={(e) => onChange({ sortOrder: Number(e.target.value || 0) })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
      </div>

      <div className="mt-5 grid gap-4">
        <Field label="Hero image URL">
          <input value={location.heroImageUrl} onChange={(e) => onChange({ heroImageUrl: e.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
        <Field label="SEO title">
          <input value={location.seoTitle} onChange={(e) => onChange({ seoTitle: e.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
        <Field label="SEO description">
          <textarea rows={2} value={location.seoDescription} onChange={(e) => onChange({ seoDescription: e.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
        <Field label="Intro">
          <textarea rows={3} value={location.intro} onChange={(e) => onChange({ intro: e.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2" />
        </Field>
        <Field label="Venues in this location">
          <select
            multiple
            value={location.venueSlugs}
            onChange={(event) =>
              onChange({ venueSlugs: Array.from(event.currentTarget.selectedOptions, (option: HTMLOptionElement) => option.value) })
            }
            className="w-full rounded-xl border border-black/10 px-3 py-2"
            style={{ minHeight: "180px" }}
          >
            {venues.map((venue) => (
              <option key={venue.slug} value={venue.slug}>
                {venue.name}{venue.town ? ` — ${venue.town}` : ""}{venue.county ? `, ${venue.county}` : ""}
              </option>
            ))}
          </select>
          <span className="mt-2 block text-xs text-neutral-500">
            Hold Cmd on Mac or Ctrl on Windows to select multiple venues. County/country/city types also auto-match future venues with the same location value.
          </span>
        </Field>
      </div>
    </div>
  );
}
