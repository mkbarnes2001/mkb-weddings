import { StudioBackLink } from "../components/ui/StudioUI";
import { AdminActionButton } from "../components/ui/AdminActionControl";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Images,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type {
  VenueGalleryMigrationPreview,
  VenueGalleryMigrationResult,
} from "../services/AdminApiService";
import { AdminPageHeader } from "../components/ui/AdminUI";

type MigrationMode = "refresh" | "merge";

export function VenueGalleryMigration() {
  const [preview, setPreview] =
    useState<VenueGalleryMigrationPreview | null>(null);
  const [mode, setMode] =
    useState<MigrationMode>("refresh");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] =
    useState<VenueGalleryMigrationResult | null>(null);

  async function loadPreview() {
    setLoading(true);
    setError("");

    try {
      setPreview(
        await AdminApiService.previewVenueGalleryMigration(),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to inspect gallery.csv.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPreview();
  }, []);

  async function runMigration() {
    setRunning(true);
    setError("");
    setResult(null);

    try {
      const migrationResult =
        await AdminApiService.runVenueGalleryMigration(
          mode,
        );

      setResult(migrationResult);
      await loadPreview();
    } catch (migrationError) {
      setError(
        migrationError instanceof Error
          ? migrationError.message
          : "Unable to import venue galleries.",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="admin-page admin-refined-page space-y-7">
      <AdminPageHeader
        backLink={<StudioBackLink to="/admin/venues" label="Back to Venues" />}
        title="Gallery migration"
        description="Adopt venue gallery images already stored in Cloudflare R2 without uploading or copying files."
        meta={
          preview ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>{preview.totalRows} CSV images</span>
              <span className="text-neutral-400">·</span>
              <span>{preview.matchedVenues} venues matched</span>
              <span className="text-neutral-400">·</span>
              <span>{preview.readyRows} ready</span>
            </div>
          ) : (
            <span>{loading ? "Reading migration source" : "Source unavailable"}</span>
          )
        }
      />

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="admin-surface-card border border-emerald-200 bg-emerald-50 text-emerald-950">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-5 w-5" />
            Gallery migration complete
          </div>
          <p className="mt-2 text-sm">
            Updated {result.updatedVenues} venues and imported {" "}
            {result.importedImages} image relationships.
            {result.skippedImages
              ? ` ${result.skippedImages} existing images were skipped.`
              : ""}
          </p>
          <p className="mt-2 text-xs text-emerald-800">
            {result.backups.length} venue backups were created.
          </p>
        </section>
      ) : null}

      {!loading && !preview ? <p role="status">The migration source could not be loaded. <AdminActionButton type="button" className="admin-button admin-button--secondary" onClick={() => void loadPreview()}>Try again</AdminActionButton></p> : loading || !preview ? (
        <section className="rounded-[28px] border border-black/10 bg-white/80 p-10 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin" />
          <p className="mt-4 text-neutral-500">
            Reading gallery.csv and matching venues…
          </p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Metric label="CSV images" value={preview.totalRows} />
            <Metric label="CSV venues" value={preview.totalSourceVenues} />
            <Metric label="Matched" value={preview.matchedVenues} />
            <Metric label="Ready" value={preview.readyRows} />
            <Metric
              label="Unmatched"
              value={preview.unmatchedVenueCount}
              warning={preview.unmatchedVenueCount > 0}
            />
          </section>

          <section className="admin-surface-card border border-black/10 bg-white/85">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <h2 className="admin-section-title ">
                  Migration method
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  Refresh is recommended. It rebuilds only records previously
                  imported from gallery.csv while preserving images uploaded or
                  curated through Photography Intelligence.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={mode}
                  onChange={(event) =>
                    setMode(event.target.value as MigrationMode)
                  }
                  className="admin-button admin-button--secondary rounded-full border border-black/10 bg-white px-5 py-3 text-sm"
                >
                  <option value="refresh">
                    Refresh imported CSV galleries
                  </option>
                  <option value="merge">
                    Add only missing CSV images
                  </option>
                </select>

                <AdminActionButton
                  type="button"
                  onClick={runMigration}
                  disabled={running || preview.matchedVenues === 0}
                  className="admin-button admin-button--primary inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-40"
                >
                  {running ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
                  {running ? "Importing…" : "Import venue galleries"}
                </AdminActionButton>

                <AdminActionButton
                  type="button"
                  onClick={loadPreview}
                  disabled={loading || running}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 px-5 py-3 text-sm disabled:opacity-40"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh preview
                </AdminActionButton>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
              <p>
                Source: <span className="font-mono">{preview.source}</span>
              </p>
              <p className="mt-1 break-all">
                Existing image origin: {preview.imageBaseUrl}
              </p>
              <p className="mt-1">
                {preview.alreadyImportedRows} image relationships are already
                present and can be refreshed safely.
              </p>
            </div>
          </section>

          <section className="admin-surface-card border border-black/10 bg-white/85">
            <div className="mb-5 flex items-center gap-3">
              <Images className="h-5 w-5" />
              <h2 className="admin-section-title ">
                Matched venue galleries
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-xs uppercase tracking-[0.14em] text-neutral-500">
                    <th className="px-3 py-3">CSV venue</th>
                    <th className="px-3 py-3">Repository venue</th>
                    <th className="px-3 py-3">Images</th>
                    <th className="px-3 py-3">Ready</th>
                    <th className="px-3 py-3">Moments</th>
                    <th className="px-3 py-3">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.venues.map((venue) => (
                    <tr
                      key={venue.venueSlug}
                      className="border-b border-black/5 align-top"
                    >
                      <td className="px-3 py-4">
                        {venue.sourceVenue}
                      </td>
                      <td className="px-3 py-4">
                        <Link
                          to={`/admin/venues/${venue.venueSlug}/gallery`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {venue.venueName}
                        </Link>
                      </td>
                      <td className="px-3 py-4">
                        {venue.imageCount}
                      </td>
                      <td className="px-3 py-4">
                        {venue.readyCount}
                      </td>
                      <td className="px-3 py-4 text-neutral-600">
                        {venue.categories.join(", ")}
                      </td>
                      <td className="px-3 py-4 text-neutral-600">
                        {venue.tags.join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {preview.unmatchedVenues.length ? (
            <section className="admin-surface-card border border-amber-200 bg-amber-50">
              <h2 className="admin-section-title text-amber-950">
                Unmatched venue names
              </h2>
              <p className="mt-2 text-sm text-amber-900">
                Create or rename these venue records, then refresh the preview.
                Their images will not be imported until a match exists.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                {preview.unmatchedVenues.map((venue) => (
                  <div
                    key={venue.sourceVenue}
                    className="rounded-2xl border border-amber-200 bg-white/60 p-4"
                  >
                    <p className="font-medium text-amber-950">
                      {venue.sourceVenue}
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      {venue.imageCount} images · {venue.categories.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border p-5 ${
        warning
          ? "border-amber-200 bg-amber-50"
          : "border-black/10 bg-white/80"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>
      <p className="admin-metric-value mt-2">{value}</p>
    </div>
  );
}
