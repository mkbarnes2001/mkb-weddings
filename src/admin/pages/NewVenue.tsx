import { StudioBackLink } from "../components/ui/StudioUI";
import { AdminActionButton } from "../components/ui/AdminActionControl";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Save } from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { VenueDocument } from "../types/venue";
import { AdminPageHeader } from "../components/ui/AdminUI";

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function NewVenue() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [county, setCounty] = useState("");
  const [town, setTown] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createVenue() {
    const finalSlug = slugify(slug || name);
    if (!name.trim() || !finalSlug) {
      setError("Venue name and slug are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const venue: Partial<VenueDocument> = {
        schemaVersion: 1,
        name: name.trim(),
        slug: finalSlug,
        county: county.trim(),
        town: town.trim(),
        intro: "",
        description: "",
        website: "",
        instagram: "",
        heroImageId: "",
        status: "draft",
        seo: { title: "", description: "" },
      };
      const result = await AdminApiService.createVenue(venue);
      navigate(`/admin/venues/${result.venue.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create venue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page admin-refined-page space-y-7">
      <AdminPageHeader
        backLink={<StudioBackLink to="/admin/venues" label="Back to Venues" />}
        title="New venue"
        description="Create a new venue repository record."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="admin-status admin-status--neutral">
              Draft
            </span>
            <span>
              {name.trim() || "New venue record"}
            </span>
          </div>
        }
        actions={
          <AdminActionButton
            type="button"
            onClick={createVenue}
            disabled={saving}
            className="admin-button admin-button--primary"
          >
            <Save className="admin-button__icon" />
            {saving ? "Creating…" : "Create venue"}
          </AdminActionButton>
        }
      />

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>
        </section>
      ) : null}

      <section className="admin-surface-card border border-black/10 bg-white/80">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Field label="Venue name" value={name} onChange={(value) => { setName(value); if (!slug) setSlug(slugify(value)); }} />
          <Field label="Slug" value={slug} onChange={(value) => setSlug(slugify(value))} mono />
          <Field label="Town" value={town} onChange={setTown} />
          <Field label="County" value={county} onChange={setCounty} />
        </div>

      </section>
    </div>
  );
}

function Field({ label, value, onChange, mono = false }: { label: string; value: string; onChange: (value: string) => void; mono?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30 ${mono ? "font-mono" : ""}`} />
    </label>
  );
}
