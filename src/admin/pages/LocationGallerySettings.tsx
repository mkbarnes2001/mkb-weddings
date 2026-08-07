import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ExternalLink, MapPinned, Save } from "lucide-react";
import {
  AdminApiService,
  type LocationArea,
  type LocationGallerySettings,
  type LocationTypeDefinition,
} from "../services/AdminApiService";
import { AdminPageHeader } from "../components/ui/AdminUI";

const FALLBACK_SETTINGS: LocationGallerySettings = {
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

export function LocationGallerySettingsPage() {
  const [settings, setSettings] = useState<LocationGallerySettings>(FALLBACK_SETTINGS);
  const [types, setTypes] = useState<LocationTypeDefinition[]>([]);
  const [locations, setLocations] = useState<LocationArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    AdminApiService.getLocations()
      .then((result) => {
        setSettings(result.settings || FALLBACK_SETTINGS);
        setTypes(result.types || []);
        setLocations(result.locations || []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load Location Gallery settings."))
      .finally(() => setLoading(false));
  }, []);

  const galleryTypes = useMemo(
    () => [...types]
      .filter((type) => type.enabled && type.galleryEligible)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [types],
  );
  const activeType = types.find((type) => type.key === settings.groupingLevel) || null;
  const sourceLocations = locations.filter(
    (location) => location.areaType === settings.groupingLevel && location.status === "active",
  );
  const publicLocations = sourceLocations.filter((location) => location.showOnLanding);
  const publicHref = `${settings.publicOrigin || "https://www.mkbweddings.co.uk"}${settings.publicBasePath || "/gallery/locations"}`;

  function update<K extends keyof LocationGallerySettings>(key: K, value: LocationGallerySettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function chooseSource(typeKey: string) {
    const type = types.find((item) => item.key === typeKey);
    setSettings((current) => ({
      ...current,
      groupingLevel: typeKey,
      singularLabel: type?.label || current.singularLabel,
      pluralLabel: type?.pluralLabel || current.pluralLabel,
    }));
    setMessage("");
  }

  async function save() {
    if (!galleryTypes.some((type) => type.key === settings.groupingLevel)) {
      setError("Choose a location type that is enabled for galleries in Admin → Locations.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await AdminApiService.saveLocations({ settings });
      setSettings(result.settings);
      setTypes(result.types);
      setLocations(result.locations);
      setMessage("Location Gallery settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save Location Gallery settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-neutral-500">Loading Location Gallery settings…</div>;

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow={
          <Link
            to="/admin/gallery"
            className="admin-inline-link inline-flex items-center gap-1"
          >
            <ArrowLeft size={13} />
            Gallery Management
          </Link>
        }
        title="Location Gallery"
        description="Choose which workspace location type powers the public gallery and configure its public presentation."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span>
              {activeType?.pluralLabel
                || settings.pluralLabel
                || "Locations"}
            </span>
            <span className="text-neutral-400">·</span>
            <span>{publicLocations.length} public</span>
            <span className="text-neutral-400">·</span>
            <span>{sourceLocations.length} available</span>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href={publicHref}
              target="_blank"
              rel="noreferrer"
              className="admin-button admin-button--secondary"
            >
              <ExternalLink className="admin-button__icon" />
              View live
            </a>

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="admin-button admin-button--primary"
            >
              <Save className="admin-button__icon" />
              {saving ? "Saving…" : "Save gallery"}
            </button>
          </div>
        }
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</div> : null}

      <section className="rounded-[28px] border border-black/10 bg-white/85 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-3xl">Gallery source</h2>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              Only types marked “Can power a gallery” in Locations are available here. MKB currently uses County; another workspace could use Region, State, Destination or a custom type.
            </p>
          </div>
          <label className="flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-2 text-sm">
            <input type="checkbox" checked={settings.enabled} onChange={(event) => update("enabled", event.target.checked)} /> Location Gallery enabled
          </label>
        </div>

        {!galleryTypes.length ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No location types are currently available as gallery sources. Open <Link to="/admin/locations" className="underline">Locations</Link> and enable “Can power a gallery” on at least one type.
          </div>
        ) : null}

        <div className="mt-6" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px" }}>
          <Field label="Build gallery from">
            <select value={settings.groupingLevel} onChange={(event) => chooseSource(event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2">
              {!galleryTypes.some((type) => type.key === settings.groupingLevel) ? <option value={settings.groupingLevel}>{activeType?.label || settings.groupingLevel}</option> : null}
              {galleryTypes.map((type) => <option key={type.id} value={type.key}>{type.pluralLabel}</option>)}
            </select>
          </Field>
          <Field label="Gallery landing card title"><input value={settings.landingTitle} onChange={(event) => update("landingTitle", event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
          <Field label="Gallery page title"><input value={settings.galleryTitle} onChange={(event) => update("galleryTitle", event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
          <Field label="Singular label"><input value={settings.singularLabel} onChange={(event) => update("singularLabel", event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
          <Field label="Plural label"><input value={settings.pluralLabel} onChange={(event) => update("pluralLabel", event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
          <Field label="Public base path"><input value={settings.publicBasePath} onChange={(event) => update("publicBasePath", event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
          <Field label="Landing card description"><input value={settings.cardDescription} onChange={(event) => update("cardDescription", event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
          <Field label="Hero image URL"><input value={settings.heroImageUrl} onChange={(event) => update("heroImageUrl", event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
        </div>

        <div className="mt-5 grid gap-4">
          <Field label="Intro text"><textarea rows={3} value={settings.intro} onChange={(event) => update("intro", event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            <Field label="SEO title"><input value={settings.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
            <Field label="SEO description"><input value={settings.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2" /></Field>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/85 p-6">
        <div className="flex items-center gap-3"><MapPinned className="h-5 w-5" /><h2 className="font-serif text-2xl">Current source summary</h2></div>
        <div className="mt-5" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          <Stat label="Source type" value={activeType?.pluralLabel || settings.pluralLabel || settings.groupingLevel} />
          <Stat label="Active locations" value={String(sourceLocations.length)} />
          <Stat label="Public locations" value={String(publicLocations.length)} />
          <Stat label="Status" value={settings.enabled ? "Enabled" : "Disabled"} />
        </div>
        <p className="mt-4 text-sm text-neutral-500">
          Location records and venue assignments are managed separately in <Link to="/admin/locations" className="underline">Admin → Locations</Link>.
        </p>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm"><span className="mb-2 block text-xs uppercase tracking-[0.12em] text-neutral-500">{label}</span>{children}</label>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-neutral-100 p-4"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 font-serif text-2xl">{value}</p></div>;
}
