import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  FilePenLine,
  Image as ImageIcon,
  Images,
  Instagram,
  MapPin,
  SearchCheck,
} from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { VenueSummary } from "../types/venue";

export function VenueDetail() {
  const { slug } = useParams();

  const [venue, setVenue] = useState<VenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
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

  const location = useMemo(
    () =>
      [venue?.town, venue?.county]
        .filter(Boolean)
        .join(", "),
    [venue],
  );

  if (loading) {
    return <div className="text-neutral-500">Loading venue…</div>;
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
        to="/admin/venues"
        className="inline-flex items-center gap-2 text-sm text-neutral-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to venues
      </Link>

      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">
              Venue Control Centre
            </p>
            <h1 className="font-serif text-5xl md:text-6xl">
              {venue.name}
            </h1>
            <p className="mt-4 text-white/60">
              {location || "Location not set"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {venue.links.website ? (
              <a
                href={venue.links.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/80"
              >
                <ExternalLink className="h-4 w-4" />
                Website
              </a>
            ) : null}

            {venue.links.instagram ? (
              <a
                href={normaliseInstagramUrl(venue.links.instagram)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/80"
              >
                <Instagram className="h-4 w-4" />
                Instagram
              </a>
            ) : null}

            {venue.links.googleMaps ? (
              <a
                href={venue.links.googleMaps}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/80"
              >
                <MapPin className="h-4 w-4" />
                Map
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Weddings"
          value={String(venue.weddingCount)}
          detail={`${venue.publishedWeddingCount} published`}
        />
        <Metric
          label="Images"
          value={String(venue.imageCount)}
          detail="Across linked JSON weddings"
        />
        <Metric
          label="Last photographed"
          value={venue.lastWeddingDate || "—"}
          detail="Latest linked wedding"
        />
        <Metric
          label="Status"
          value={venue.status}
          detail="Venue repository record"
          capitalize
        />
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <ControlCard
          to={`/admin/venues/${venue.slug}/content`}
          icon={FilePenLine}
          title="Content"
          description="Edit venue details, private notes, website links and SEO."
        />
        <ControlCard
          to={`/admin/venues/${venue.slug}/gallery`}
          icon={Images}
          title="Gallery"
          description="Curate images from weddings linked to this venue."
        />
        <ControlCard
          to="#"
          icon={SearchCheck}
          title="Publishing"
          description="Public venue page integration arrives later in v0.3."
          disabled
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-black/10 bg-white/80 p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-black p-3 text-white">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-3xl">Recent weddings</h2>
              <p className="text-sm text-neutral-500">
                JSON weddings linked to this venue.
              </p>
            </div>
          </div>

          {venue.recentWeddings.length ? (
            <div className="divide-y divide-black/10">
              {venue.recentWeddings.map((wedding) => (
                <Link
                  key={wedding.slug}
                  to={`/admin/weddings/${wedding.slug}`}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{wedding.couple}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {wedding.title}
                    </p>
                  </div>
                  <span className="text-sm text-neutral-500">
                    {wedding.weddingDate}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500">
              No JSON weddings currently link to this venue.
            </p>
          )}
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/80 p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-black p-3 text-white">
              <ImageIcon className="h-5 w-5" />
            </div>
            <h2 className="font-serif text-3xl">Venue notes</h2>
          </div>

          <Note label="Portrait locations" value={venue.notes.portraitLocations} />
          <Note label="Rain backup" value={venue.notes.rainBackup} />
          <Note label="Sunset" value={venue.notes.sunsetNotes} />
          <Note label="Restrictions" value={venue.notes.restrictions} />

          {!venue.notes.portraitLocations &&
          !venue.notes.rainBackup &&
          !venue.notes.sunsetNotes &&
          !venue.notes.restrictions ? (
            <p className="text-neutral-500">
              Add private working notes in the Content editor.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function normaliseInstagramUrl(value: string) {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return `https://www.instagram.com/${trimmed.replace(/^@/, "")}`;
}

function Metric({
  label,
  value,
  detail,
  capitalize = false,
}: {
  label: string;
  value: string;
  detail: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-black/10 bg-white/80 p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <p
        className={`mt-3 font-serif text-4xl ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-3 text-sm text-neutral-500">{detail}</p>
    </div>
  );
}

function Note({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  if (!value) return null;

  return (
    <div className="mb-5 last:mb-0">
      <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
        {value}
      </p>
    </div>
  );
}

function ControlCard({
  to,
  icon: Icon,
  title,
  description,
  disabled = false,
}: {
  to: string;
  icon: typeof FilePenLine;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  const content = (
    <>
      <div className="rounded-2xl bg-black p-3 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-5 font-serif text-3xl">{title}</h2>
      <p className="mt-3 leading-relaxed text-neutral-600">
        {description}
      </p>
    </>
  );

  if (disabled) {
    return (
      <div className="rounded-[28px] border border-black/10 bg-neutral-100/70 p-7 opacity-65">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="rounded-[28px] border border-black/10 bg-white/80 p-7 transition hover:-translate-y-0.5 hover:bg-white"
    >
      {content}
    </Link>
  );
}
