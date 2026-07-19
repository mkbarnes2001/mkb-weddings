import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Save,
} from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { VenueDocument } from "../types/venue";

export function VenueContentEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [venue, setVenue] = useState<VenueDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;

    AdminApiService.getVenue(slug)
      .then(setVenue)
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load venue.",
        ),
      )
      .finally(() => setLoading(false));
  }, [slug]);

  const validationErrors = useMemo(() => {
    if (!venue) return [];

    const errors: string[] = [];

    if (!venue.name.trim()) errors.push("Venue name is required.");
    if (!venue.slug.trim()) errors.push("Slug is required.");

    if (
      venue.slug &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(venue.slug)
    ) {
      errors.push(
        "Slug can contain lowercase letters, numbers and hyphens only.",
      );
    }

    return errors;
  }, [venue]);

  function update(patch: Partial<VenueDocument>) {
    setVenue((current) =>
      current ? { ...current, ...patch } : current,
    );
    setDirty(true);
    setMessage("");
    setError("");
  }

  async function save() {
    if (!venue || !slug || validationErrors.length) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const result = await AdminApiService.updateVenue(
        slug,
        venue,
      );

      setVenue(result.venue);
      setDirty(false);
      setMessage(
        result.backupPath
          ? `Saved. Backup created at ${result.backupPath}.`
          : "Saved.",
      );

      if (slug !== result.venue.slug) {
        navigate(
          `/admin/venues/${result.venue.slug}/content`,
          { replace: true },
        );
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save venue.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-neutral-500">Loading venue content…</div>;
  }

  if (!venue) {
    return (
      <section className="rounded-[28px] border border-black/10 bg-white p-8">
        <h1 className="font-serif text-3xl">Venue not found</h1>
        <p className="mt-3 text-neutral-600">{error}</p>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <Link
        to={`/admin/venues/${venue.slug}`}
        className="inline-flex items-center gap-2 text-sm text-neutral-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to venue
      </Link>

      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">
              Venue Content
            </p>
            <h1 className="font-serif text-5xl md:text-6xl">
              {venue.name}
            </h1>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={
              saving ||
              !dirty ||
              validationErrors.length > 0
            }
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-black disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : dirty ? "Save venue" : "Saved"}
          </button>
        </div>
      </section>

      {message ? (
        <Message tone="success" text={message} />
      ) : null}

      {error ? (
        <Message tone="error" text={error} />
      ) : null}

      {validationErrors.length ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {validationErrors.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </section>
      ) : null}

      <Section title="Basic information">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Field
            label="Venue name"
            value={venue.name}
            onChange={(value) => update({ name: value })}
          />
          <Field
            label="Slug"
            value={venue.slug}
            onChange={(value) =>
              update({
                slug: value
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, ""),
              })
            }
            mono
          />
          <Field
            label="Town"
            value={venue.town}
            onChange={(value) => update({ town: value })}
          />
          <Field
            label="County"
            value={venue.county}
            onChange={(value) => update({ county: value })}
          />
          <Field
            label="Country"
            value={venue.country || ""}
            onChange={(value) => update({ country: value })}
          />

          <label>
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
              Status
            </span>
            <select
              value={venue.status}
              onChange={(event) =>
                update({
                  status:
                    event.target.value as VenueDocument["status"],
                })
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
      </Section>

      <Section title="Website and social links">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Field
            label="Website"
            value={venue.links.website}
            onChange={(value) =>
              update({
                links: {
                  ...venue.links,
                  website: value,
                },
              })
            }
          />
          <Field
            label="Instagram"
            value={venue.links.instagram}
            onChange={(value) =>
              update({
                links: {
                  ...venue.links,
                  instagram: value,
                },
              })
            }
          />
          <Field
            label="Facebook"
            value={venue.links.facebook}
            onChange={(value) =>
              update({
                links: {
                  ...venue.links,
                  facebook: value,
                },
              })
            }
          />
          <Field
            label="Google Maps link"
            value={venue.links.googleMaps}
            onChange={(value) =>
              update({
                links: {
                  ...venue.links,
                  googleMaps: value,
                },
              })
            }
          />
        </div>
      </Section>

      <Section title="Venue contact">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Field
            label="Email"
            value={venue.contact.email}
            onChange={(value) =>
              update({
                contact: {
                  ...venue.contact,
                  email: value,
                },
              })
            }
          />
          <Field
            label="Phone"
            value={venue.contact.phone}
            onChange={(value) =>
              update({
                contact: {
                  ...venue.contact,
                  phone: value,
                },
              })
            }
          />
          <Field
            label="Coordinator name"
            value={venue.contact.coordinatorName}
            onChange={(value) =>
              update({
                contact: {
                  ...venue.contact,
                  coordinatorName: value,
                },
              })
            }
          />
          <Field
            label="Coordinator email"
            value={venue.contact.coordinatorEmail}
            onChange={(value) =>
              update({
                contact: {
                  ...venue.contact,
                  coordinatorEmail: value,
                },
              })
            }
          />
        </div>
      </Section>

      <Section title="Practical information">
        <div className="space-y-5">
          <TextArea
            label="Address"
            value={venue.practical.address}
            onChange={(value) =>
              update({
                practical: {
                  ...venue.practical,
                  address: value,
                },
              })
            }
            rows={3}
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Field
              label="Capacity"
              value={venue.practical.capacity}
              onChange={(value) =>
                update({
                  practical: {
                    ...venue.practical,
                    capacity: value,
                  },
                })
              }
            />
            <Field
              label="Ceremony types"
              value={venue.practical.ceremonyTypes}
              onChange={(value) =>
                update({
                  practical: {
                    ...venue.practical,
                    ceremonyTypes: value,
                  },
                })
              }
            />
          </div>

          <TextArea
            label="Parking"
            value={venue.practical.parking}
            onChange={(value) =>
              update({
                practical: {
                  ...venue.practical,
                  parking: value,
                },
              })
            }
            rows={3}
          />
          <TextArea
            label="Accommodation"
            value={venue.practical.accommodation}
            onChange={(value) =>
              update({
                practical: {
                  ...venue.practical,
                  accommodation: value,
                },
              })
            }
            rows={3}
          />

          <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50 p-4">
            <input
              type="checkbox"
              checked={venue.practical.outdoorCeremony}
              onChange={(event) =>
                update({
                  practical: {
                    ...venue.practical,
                    outdoorCeremony: event.target.checked,
                  },
                })
              }
            />
            <span>Outdoor ceremony available</span>
          </label>
        </div>
      </Section>

      <Section title="Public content">
        <div className="space-y-5">
          <TextArea
            label="Introduction"
            value={venue.intro}
            onChange={(value) => update({ intro: value })}
            rows={4}
          />
          <TextArea
            label="Description"
            value={venue.description}
            onChange={(value) => update({ description: value })}
            rows={9}
          />
        </div>
      </Section>

      <Section title="Private venue notes">
        <div className="space-y-5">
          <TextArea
            label="General notes"
            value={venue.notes.general}
            onChange={(value) =>
              update({
                notes: {
                  ...venue.notes,
                  general: value,
                },
              })
            }
            rows={5}
          />
          <TextArea
            label="Best portrait locations"
            value={venue.notes.portraitLocations}
            onChange={(value) =>
              update({
                notes: {
                  ...venue.notes,
                  portraitLocations: value,
                },
              })
            }
            rows={4}
          />
          <TextArea
            label="Rain backup"
            value={venue.notes.rainBackup}
            onChange={(value) =>
              update({
                notes: {
                  ...venue.notes,
                  rainBackup: value,
                },
              })
            }
            rows={4}
          />
          <TextArea
            label="Sunset notes"
            value={venue.notes.sunsetNotes}
            onChange={(value) =>
              update({
                notes: {
                  ...venue.notes,
                  sunsetNotes: value,
                },
              })
            }
            rows={4}
          />
          <TextArea
            label="Restrictions and reminders"
            value={venue.notes.restrictions}
            onChange={(value) =>
              update({
                notes: {
                  ...venue.notes,
                  restrictions: value,
                },
              })
            }
            rows={4}
          />
        </div>
      </Section>

      <Section title="SEO">
        <div className="space-y-5">
          <Field
            label="SEO title"
            value={venue.seo.title}
            onChange={(value) =>
              update({
                seo: {
                  ...venue.seo,
                  title: value,
                },
              })
            }
          />
          <TextArea
            label="SEO description"
            value={venue.seo.description}
            onChange={(value) =>
              update({
                seo: {
                  ...venue.seo,
                  description: value,
                },
              })
            }
            rows={4}
          />
        </div>
      </Section>
    </div>
  );
}

function Message({
  tone,
  text,
}: {
  tone: "success" | "error";
  text: string;
}) {
  const success = tone === "success";

  return (
    <section
      className={`rounded-2xl border p-4 text-sm ${
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900"
      }`}
    >
      <div className="flex items-center gap-2">
        {success ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
        {text}
      </div>
    </section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white/80 p-7">
      <h2 className="mb-6 font-serif text-3xl">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30 ${
          mono ? "font-mono" : ""
        }`}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-black/30"
      />
    </label>
  );
}
