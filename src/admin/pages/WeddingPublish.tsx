import { AdminActionButton, AdminActionLabel, AdminActionLink } from "../components/ui/AdminActionControl";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import {
  AdminApiService,
  type WeddingPublishCheck,
  type WeddingPublishPreview,
  type WeddingPublishResult,
} from "../services/AdminApiService";
import { AdminPageHeader } from "../components/ui/AdminUI";

function CheckRow({
  check,
}: {
  check: WeddingPublishCheck;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-black/5 bg-white/70 p-5">
      <div
        className={`rounded-full p-1 ${
          check.passed
            ? "text-emerald-600"
            : check.severity ===
                "required"
              ? "text-red-600"
              : "text-amber-600"
        }`}
      >
        {check.passed ? (
          <CheckCircle2 className="w-6 h-6" />
        ) : (
          <XCircle className="w-6 h-6" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="admin-section-title ">
            {check.label}
          </h3>

          <span
            className={`rounded-full border px-3 py-1 text-xs ${
              check.severity === "required"
                ? "border-black/10 bg-black text-white"
                : "border-black/10 bg-neutral-50 text-neutral-600"
            }`}
          >
            {check.severity}
          </span>
        </div>

        <p className="text-sm text-neutral-600 mt-2">
          {check.detail}
        </p>
      </div>
    </div>
  );
}

export function WeddingPublish() {
  const { slug } = useParams();

  const [preview, setPreview] =
    useState<WeddingPublishPreview>();
  const [storyEnabled, setStoryEnabled] =
    useState(false);
  const [loaded, setLoaded] =
    useState(false);
  const [publishing, setPublishing] =
    useState(false);
  const [error, setError] =
    useState("");
  const [result, setResult] =
    useState<WeddingPublishResult | null>(
      null,
    );

  const loadPreview = useCallback(
    async () => {
      if (!slug) return;

      setLoaded(false);
      setError("");

      try {
        const nextPreview =
          await AdminApiService.getWeddingPublishPreview(
            slug,
          );

        setPreview(nextPreview);
        setStoryEnabled(
          nextPreview.storyEnabled,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load wedding publication checks.",
        );
      } finally {
        setLoaded(true);
      }
    },
    [slug],
  );

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const requiredFailures =
    preview?.checks.filter(
      (check) =>
        check.severity === "required" &&
        !check.passed,
    ) || [];

  const canPublish =
    !storyEnabled ||
    requiredFailures.length === 0;

  async function publishChanges() {
    if (!slug || !canPublish) return;

    setPublishing(true);
    setError("");
    setResult(null);

    try {
      const publishResult =
        await AdminApiService.publishWedding(
          slug,
          storyEnabled,
        );

      setResult(publishResult);
      await loadPreview();
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish wedding-story changes.",
      );
    } finally {
      setPublishing(false);
    }
  }

  if (!loaded) {
    return (
      <div className="text-neutral-500 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading publish checks…
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="admin-surface-card border border-black/10 bg-white">
        <h1 className="admin-section-title mb-4">
          Publish report not found
        </h1>

        <p className="text-red-700 mb-5">
          {error ||
            "The wedding publication data could not be loaded."}
        </p>

        <Link
          to="/admin/weddings"
          className="underline underline-offset-4"
        >
          Back to weddings
        </Link>
      </div>
    );
  }

  const { wedding } = preview;
  const isCurrentlyLive =
    preview.storyEnabled &&
    preview.storyStatus === "published";

  return (
    <div className="admin-page admin-refined-page space-y-7">
      <AdminPageHeader
        title="Publishing"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                isCurrentlyLive
                  ? "admin-status admin-status--success"
                  : storyEnabled
                    ? "admin-status admin-status--warning"
                    : "admin-status admin-status--neutral"
              }
            >
              {isCurrentlyLive
                ? "Story is live"
                : storyEnabled
                  ? "Story is in draft"
                  : "Private wedding"}
            </span>

            <span>{wedding.couple}</span>
            <span className="text-neutral-400">·</span>
            <span>{wedding.venue}</span>
            <span className="text-neutral-400">
              {wedding.weddingDate}
            </span>
          </div>
        }
        actions={
          isCurrentlyLive ? (
            <AdminActionLink
              href={`/blog/${wedding.slug}`}
              target="_blank"
              rel="noreferrer"
              className="admin-button admin-button--primary"
            >
              Open public story
              <ExternalLink className="admin-button__icon" />
            </AdminActionLink>
          ) : undefined
        }
      />

      <section className="admin-surface-card border border-black/10 bg-white/75">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-black text-white p-3">
              {storyEnabled ? (
                <Eye className="w-5 h-5" />
              ) : (
                <EyeOff className="w-5 h-5" />
              )}
            </div>

            <div>
              <h2 className="admin-section-title ">
                Display wedding story
              </h2>

              <p className="text-sm text-neutral-600 mt-2 max-w-2xl">
                Keep this disabled for weddings
                that should remain available only
                inside Admin. Venue-gallery and
                moment assignments are unaffected.
              </p>
            </div>
          </div>

          <AdminActionLabel className="admin-button admin-button--secondary inline-flex items-center gap-3 rounded-full border border-black/10 bg-white px-5 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={storyEnabled}
              onChange={(event) => {
                setStoryEnabled(
                  event.target.checked,
                );
                setResult(null);
                setError("");
              }}
              className="h-5 w-5"
            />

            <span className="text-sm font-medium">
              Show on Wedding Stories page
            </span>
          </AdminActionLabel>
        </div>

        {!storyEnabled ? (
          <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            Publishing with this option disabled
            removes the story from the listing and
            its public URL. The wedding, images,
            venue assignments and moments remain
            in the repository.
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="admin-surface-card border border-black/10 bg-white/75">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
            Required
          </p>

          <p className="admin-metric-value ">
            {preview.requiredPassed}/
            {preview.requiredTotal}
          </p>
        </div>

        <div className="admin-surface-card border border-black/10 bg-white/75">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
            Recommended
          </p>

          <p className="admin-metric-value ">
            {preview.recommendedPassed}/
            {preview.recommendedTotal}
          </p>
        </div>

        <div className="admin-surface-card border border-black/10 bg-white/75">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
            Blog images
          </p>

          <p className="admin-metric-value ">
            {preview.imageCount}
          </p>
        </div>
      </section>

      {storyEnabled ? (
        <section className="admin-surface-card border border-black/10 bg-white/75">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-2xl bg-black text-white p-3">
              <ClipboardCheck className="w-5 h-5" />
            </div>

            <div>
              <h2 className="admin-section-title ">
                Publish checklist
              </h2>

              <p className="text-sm text-neutral-500">
                Required checks block publication.
                Recommended checks can be completed
                later.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {preview.checks.map((check) => (
              <CheckRow
                key={check.id}
                check={check}
              />
            ))}
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="admin-surface-card border border-red-200 bg-red-50 text-red-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <p>{error}</p>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="admin-surface-card border border-emerald-200 bg-emerald-50 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 mt-0.5" />

            <div>
              <p className="font-medium">
                {result.publish.action ===
                "published"
                  ? "Wedding story published."
                  : "Wedding story removed from the live site."}
              </p>

              {result.publish.commit ? (
                <p className="text-sm mt-1">
                  Commit:{" "}
                  {result.publish.commit}
                </p>
              ) : (
                <p className="text-sm mt-1">
                  No Git changes were required.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <AdminActionButton
          type="button"
          onClick={publishChanges}
          disabled={
            publishing || !canPublish
          }
          className="admin-button admin-button--primary inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {publishing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UploadCloud className="w-4 h-4" />
          )}

          {publishing
            ? "Publishing..."
            : storyEnabled
              ? isCurrentlyLive
                ? "Publish story changes"
                : "Publish wedding story"
              : isCurrentlyLive
                ? "Remove story from live site"
                : "Save as private wedding"}
        </AdminActionButton>

        {storyEnabled &&
        !canPublish ? (
          <p className="self-center text-sm text-red-700">
            Complete the required checks before
            publishing.
          </p>
        ) : null}
      </div>
    </div>
  );
}
