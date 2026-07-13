import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FilePlus2,
  Save,
} from "lucide-react";
import { weddingStories } from "../../data/weddingStories";
import { AdminApiService } from "../services/AdminApiService";
import type { VenueSummary } from "../types/venue";
import {
  createWeddingDocument,
  suggestWeddingSlug,
  suggestWeddingTitle,
  validateNewWeddingDraft,
  type NewWeddingDraft,
} from "../services/NewWeddingService";
import {
  VenueDirectoryService,
  type VenueDirectoryEntry,
} from "../services/VenueDirectoryService";
import { VenueAutocomplete } from "../components/VenueAutocomplete";

const steps = [
  "Wedding",
  "Venue",
  "Details",
  "Review",
] as const;

export function NewWeddingWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const originVenueSlug = searchParams.get("venueSlug") || "";
  const returnTo = searchParams.get("returnTo") || "";
  const [step, setStep] = useState(0);
  const [venues, setVenues] = useState<VenueDirectoryEntry[]>([]);
  const [originVenue, setOriginVenue] = useState<VenueSummary | null>(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");

  const [draft, setDraft] = useState<NewWeddingDraft>({
    couple: "",
    venue: "",
    weddingDate: "",
    title: "",
    slug: "",
    photographer: "MKB Weddings",
    status: "draft",
  });

  useEffect(() => {
    VenueDirectoryService.load().then(setVenues);

    if (originVenueSlug) {
      AdminApiService.getVenue(originVenueSlug)
        .then((venue) => {
          setOriginVenue(venue);
          setDraft((current) => ({
            ...current,
            venue: venue.name,
            venueSlug: venue.slug,
            venueId: venue.id,
            title:
              current.title ||
              suggestWeddingTitle(current.couple, venue.name),
            slug:
              current.slug ||
              suggestWeddingSlug(current.couple, venue.name),
          }));
        })
        .catch(() => setOriginVenue(null));
    }

    AdminApiService.health()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, [originVenueSlug]);

  const existingSlugs = useMemo(
    () => weddingStories.map((story) => story.slug),
    [],
  );

  const validationErrors = useMemo(
    () => validateNewWeddingDraft(draft, existingSlugs),
    [draft, existingSlugs],
  );

  function updateDraft(patch: Partial<NewWeddingDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setSaveError("");
  }

  function updateCouple(couple: string) {
    setDraft((current) => {
      const autoTitle =
        !current.title ||
        current.title === suggestWeddingTitle(current.couple, current.venue);

      const autoSlug =
        !current.slug ||
        current.slug === suggestWeddingSlug(current.couple, current.venue);

      return {
        ...current,
        couple,
        title: autoTitle
          ? suggestWeddingTitle(couple, current.venue)
          : current.title,
        slug: autoSlug
          ? suggestWeddingSlug(couple, current.venue)
          : current.slug,
      };
    });
  }

  function updateVenue(venue: string) {
    setDraft((current) => {
      const autoTitle =
        !current.title ||
        current.title === suggestWeddingTitle(current.couple, current.venue);

      const autoSlug =
        !current.slug ||
        current.slug === suggestWeddingSlug(current.couple, current.venue);

      return {
        ...current,
        venue,
        title: autoTitle
          ? suggestWeddingTitle(current.couple, venue)
          : current.title,
        slug: autoSlug
          ? suggestWeddingSlug(current.couple, venue)
          : current.slug,
      };
    });
  }

  async function createWedding() {
    if (!apiOnline || validationErrors.length > 0) return;

    setSaving(true);
    setSaveError("");

    try {
      const document = createWeddingDocument(draft);
      const result = await AdminApiService.createWedding(document);

      if (returnTo) {
        const separator = returnTo.includes("?") ? "&" : "?";
        navigate(
          `${returnTo}${separator}weddingSlug=${encodeURIComponent(
            result.slug,
          )}`,
          { replace: true },
        );
        return;
      }

      setCreatedSlug(result.slug);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to create wedding.",
      );
      setApiOnline(false);
    } finally {
      setSaving(false);
    }
  }

  if (createdSlug) {
    return (
      <div className="space-y-7">
        <section className="rounded-[32px] bg-emerald-950 p-8 text-white md:p-10">
          <CheckCircle2 className="mb-6 h-10 w-10 text-emerald-300" />
          <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">
            Wedding created
          </p>
          <h1 className="mb-4 font-serif text-4xl leading-tight md:text-6xl">
            The wedding record is ready.
          </h1>
          <p className="max-w-2xl text-white/65">
            A new JSON wedding document and starter folders have been created.
          </p>
        </section>

        <section className="rounded-[28px] border border-black/10 bg-white/75 p-7">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
            Created
          </p>
          <code className="text-sm">
            public/weddings/{createdSlug}/wedding.json
          </code>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(`/admin/weddings/${createdSlug}`)}
              className="rounded-full bg-black px-5 py-3 text-sm text-white"
            >
              Open wedding
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedSlug("");
                setStep(0);
                setDraft({
                  couple: "",
                  venue: originVenue?.name || "",
                  venueSlug: originVenue?.slug,
                  venueId: originVenue?.id,
                  weddingDate: "",
                  title: "",
                  slug: "",
                  photographer: "MKB Weddings",
                  status: "draft",
                });
              }}
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm"
            >
              Create another
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Link
        to={
          returnTo ||
          (originVenueSlug
            ? `/admin/venues/${originVenueSlug}`
            : "/admin/weddings")
        }
        className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to weddings
      </Link>

      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">
              New Wedding Wizard
            </p>
            <h1 className="mb-4 font-serif text-4xl leading-tight md:text-6xl">
              Create a wedding record.
            </h1>
            <p className="max-w-2xl text-white/65">
              The wizard creates the core JSON record and starter asset files.
              Image imports and AI processing will plug into this workflow next.
            </p>
          </div>

          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              apiOnline
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                : "border-amber-300/30 bg-amber-300/10 text-amber-100"
            }`}
          >
            {apiOnline ? "Local API connected" : "Local API offline"}
          </div>
        </div>
      </section>

      {originVenue ? (
        <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">
            Venue preselected
          </p>
          <p className="mt-2 font-serif text-3xl text-emerald-950">
            {originVenue.name}
          </p>
          <p className="mt-2 text-sm text-emerald-800">
            The new wedding will be linked using the venue ID and slug. After
            creation, you will return directly to image upload.
          </p>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {steps.map((label, index) => (
          <div
            key={label}
            className={`rounded-2xl border p-4 ${
              index === step
                ? "border-black bg-black text-white"
                : index < step
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-black/10 bg-white/70 text-neutral-500"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.18em]">
              Step {index + 1}
            </p>
            <p className="mt-2 font-serif text-xl">{label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        {step === 0 ? (
          <div className="space-y-5">
            <div>
              <h2 className="font-serif text-3xl">Who is getting married?</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Use the names exactly as they should appear on the site.
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                Couple
              </span>
              <input
                value={draft.couple}
                onChange={(event) => updateCouple(event.target.value)}
                placeholder="Dave & Siobhan"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30"
              />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <h2 className="font-serif text-3xl">Choose the venue</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Existing venues are suggested from your website data.
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                Venue
              </span>
              <VenueAutocomplete
                value={draft.venue}
                venues={venues}
                onChange={updateVenue}
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div>
              <h2 className="font-serif text-3xl">Wedding details</h2>
              <p className="mt-1 text-sm text-neutral-500">
                These values can be edited later.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                  Wedding date
                </span>
                <input
                  value={draft.weddingDate}
                  onChange={(event) =>
                    updateDraft({ weddingDate: event.target.value })
                  }
                  placeholder="April 2027"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                  Photographer
                </span>
                <input
                  value={draft.photographer}
                  onChange={(event) =>
                    updateDraft({ photographer: event.target.value })
                  }
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                />
              </label>

              <label className="block xl:col-span-2">
                <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                  Story title
                </span>
                <input
                  value={draft.title}
                  onChange={(event) =>
                    updateDraft({ title: event.target.value })
                  }
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                />
              </label>

              <label className="block xl:col-span-2">
                <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                  Slug
                </span>
                <input
                  value={draft.slug}
                  onChange={(event) =>
                    updateDraft({ slug: event.target.value.toLowerCase() })
                  }
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 font-mono text-sm"
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-3xl">Review and create</h2>
              <p className="mt-1 text-sm text-neutral-500">
                The initial record is deliberately created as a draft.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                ["Couple", draft.couple],
                ["Venue", draft.venue],
                ["Wedding date", draft.weddingDate],
                ["Photographer", draft.photographer],
                ["Title", draft.title],
                ["Slug", draft.slug],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-black/5 bg-[#f5f3ef] p-4"
                >
                  <p className="mb-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
                    {label}
                  </p>
                  <p className="break-words text-sm text-neutral-800">{value}</p>
                </div>
              ))}
            </div>

            {validationErrors.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {validationErrors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                The record is ready to create.
              </div>
            )}
          </div>
        ) : null}
      </section>

      {saveError ? (
        <section className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-red-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <p>{saveError}</p>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={() =>
              setStep((current) => Math.min(steps.length - 1, current + 1))
            }
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={createWedding}
            disabled={
              saving ||
              !apiOnline ||
              validationErrors.length > 0
            }
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <Save className="h-4 w-4" />
            ) : (
              <FilePlus2 className="h-4 w-4" />
            )}
            {saving ? "Creating..." : "Create wedding"}
          </button>
        )}
      </div>
    </div>
  );
}
