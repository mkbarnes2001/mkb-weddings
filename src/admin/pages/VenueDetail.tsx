import { StudioBackLink } from "../components/ui/StudioUI";
import { AdminActionLink } from "../components/ui/AdminActionControl";
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
import { AdminPageHeader } from "../components/ui/AdminUI";

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
      <section className="admin-surface-card border border-black/10 bg-white">
        <h1 className="admin-section-title ">Venue not found</h1>
        <p className="mt-3 text-neutral-600">{error}</p>
      </section>
    );
  }

  return (
    <div className="admin-page admin-refined-page space-y-7">
      <AdminPageHeader
        backLink={<StudioBackLink to="/admin/venues" label="Back to Venues" />}
        title="Venue details"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span>{venue.name}</span>
            <span className="text-neutral-400">·</span>
            <span>
              {location || "Location not set"}
            </span>
            <span className="text-neutral-400">·</span>
            <span
              className={
                venue.status === "published"
                  ? "admin-status admin-status--success"
                  : "admin-status admin-status--neutral"
              }
            >
              {venue.status}
            </span>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {venue.links.website ? (
              <AdminActionLink
                href={venue.links.website}
                target="_blank"
                rel="noreferrer"
                className="admin-button admin-button--secondary"
              >
                <ExternalLink className="admin-button__icon" />
                Website
              </AdminActionLink>
            ) : null}

            {venue.links.instagram ? (
              <AdminActionLink
                href={normaliseInstagramUrl(
                  venue.links.instagram,
                )}
                target="_blank"
                rel="noreferrer"
                className="admin-button admin-button--secondary"
              >
                <Instagram className="admin-button__icon" />
                Instagram
              </AdminActionLink>
            ) : null}

            {venue.links.googleMaps ? (
              <AdminActionLink
                href={venue.links.googleMaps}
                target="_blank"
                rel="noreferrer"
                className="admin-button admin-button--secondary"
              >
                <MapPin className="admin-button__icon" />
                Map
              </AdminActionLink>
            ) : null}
          </div>
        }
      />

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
        <div className="admin-surface-card border border-black/10 bg-white/80">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-black p-3 text-white">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="admin-section-title ">Recent weddings</h2>
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

        <div className="admin-surface-card border border-black/10 bg-white/80">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-black p-3 text-white">
              <ImageIcon className="h-5 w-5" />
            </div>
            <h2 className="admin-section-title ">Venue notes</h2>
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
    <div className="admin-surface-card border border-black/10 bg-white/80">
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
      <h2 className="admin-section-title mt-5">{title}</h2>
      <p className="mt-3 leading-relaxed text-neutral-600">
        {description}
      </p>
    </>
  );

  if (disabled) {
    return (
      <div className="admin-surface-card border border-black/10 bg-neutral-100/70 opacity-65">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="admin-surface-card border border-black/10 bg-white/80 transition hover:-translate-y-0.5 hover:bg-white"
    >
      {content}
    </Link>
  );
}
