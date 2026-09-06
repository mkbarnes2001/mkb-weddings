import { AdminActionButton } from "../components/ui/AdminActionControl";
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
import { AdminPageHeader } from "../components/ui/AdminUI";

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
  const [existingSlugs, setExistingSlugs] = useState<string[]>([]);

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

    Promise.all([
      AdminApiService.health(),
      AdminApiService.listJsonWeddings(),
    ])
      .then(([, weddings]) => {
        setApiOnline(true);
        setExistingSlugs(weddings.map((wedding) => wedding.slug));
      })
      .catch(() => setApiOnline(false));
  }, [originVenueSlug]);

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

      navigate(`/admin/weddings/${result.slug}/workspace`, { replace: true });
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
      <div className="admin-page admin-refined-page space-y-7">
        <AdminPageHeader
          title="Wedding created"
          meta={
            <div className="flex flex-wrap items-center gap-2">
              <span className="admin-status admin-status--success">
                Created
              </span>
              <code className="text-[10px]">
                d1://weddings/{createdSlug}
              </code>
            </div>
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <AdminActionButton
                type="button"
                onClick={() =>
                  navigate(
                    `/admin/weddings/${createdSlug}/workspace`,
                  )
                }
                className="admin-button admin-button--primary"
              >
                Open Wedding Workspace
              </AdminActionButton>

              <AdminActionButton
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
                className="admin-button admin-button--secondary"
              >
                Create another
              </AdminActionButton>
            </div>
          }
        />

        <section className="admin-surface-card border border-black/10 bg-white/75">
          <p className="text-sm text-neutral-600">
            The wedding record has been created directly in D1
            and is ready in the Wedding Workspace.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-page admin-refined-page space-y-7">
      <AdminPageHeader
        title="New wedding"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="admin-status admin-status--info">
              Step {step + 1} of {steps.length}
            </span>

            <span
              className={
                apiOnline
                  ? "admin-status admin-status--success"
                  : "admin-status admin-status--warning"
              }
            >
              {apiOnline
                ? "Admin API connected"
                : "Admin API unavailable"}
            </span>

            {originVenue ? (
              <span className="text-neutral-500">
                {originVenue.name}
              </span>
            ) : null}
          </div>
        }
      />

      {originVenue ? (
        <section className="admin-surface-card border border-emerald-200 bg-emerald-50">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">
            Venue preselected
          </p>
          <p className="admin-metric-value mt-2 text-emerald-950">
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
            <p className="admin-metric-value mt-2">{label}</p>
          </div>
        ))}
      </section>

      <section className="admin-surface-card border border-black/10 bg-white/75">
        {step === 0 ? (
          <div className="space-y-5">
            <div>
              <h2 className="admin-section-title ">Who is getting married?</h2>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                Couple
              </span>
              <input
                value={draft.couple}
                onChange={(event) => updateCouple(event.target.value)}
                placeholder="Dave & Siobhan"
                className="admin-input"
              />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <h2 className="admin-section-title ">Choose the venue</h2>
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
              <h2 className="admin-section-title ">Wedding details</h2>
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
              <h2 className="admin-section-title ">Review and create</h2>
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
        <section className="admin-surface-card border border-red-200 bg-red-50 text-red-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <p>{saveError}</p>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3">
        <AdminActionButton
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0}
          className="admin-button admin-button--secondary inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </AdminActionButton>

        {step < steps.length - 1 ? (
          <AdminActionButton
            type="button"
            onClick={() =>
              setStep((current) => Math.min(steps.length - 1, current + 1))
            }
            className="admin-button admin-button--primary inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </AdminActionButton>
        ) : (
          <AdminActionButton
            type="button"
            onClick={createWedding}
            disabled={
              saving ||
              !apiOnline ||
              validationErrors.length > 0
            }
            className="admin-button admin-button--primary inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <Save className="h-4 w-4" />
            ) : (
              <FilePlus2 className="h-4 w-4" />
            )}
            {saving ? "Creating..." : "Create wedding"}
          </AdminActionButton>
        )}
      </div>
    </div>
  );
}
