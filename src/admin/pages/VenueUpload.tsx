import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { StoredWeddingDocument } from "../services/AdminApiService";
import type { VenueSummary } from "../types/venue";
import { AdminPageHeader } from "../components/ui/AdminUI";

type UploadFile = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  error: string;
};

export function VenueUpload() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedWeddingSlug = searchParams.get("weddingSlug") || "";

  const [venue, setVenue] = useState<VenueSummary | null>(null);
  const [weddings, setWeddings] = useState<StoredWeddingDocument[]>([]);
  const [weddingSlug, setWeddingSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    Promise.all([
      AdminApiService.getVenue(slug),
      AdminApiService.listJsonWeddings(),
    ])
      .then(([loadedVenue, loadedWeddings]) => {
        setVenue(loadedVenue);

        const linked = loadedWeddings
          .filter((wedding) => {
            const extended = wedding as StoredWeddingDocument & {
              venueSlug?: string;
              venueId?: string;
            };

            const linkedSlug = String(
              extended.venueSlug || extended.venueId || "",
            ).trim();

            const linkedName = String(wedding.venue || "")
              .trim()
              .toLowerCase();

            return (
              linkedSlug === loadedVenue.slug ||
              linkedName === loadedVenue.name.toLowerCase()
            );
          })
          .sort((a, b) =>
            String(b.weddingDate || "").localeCompare(
              String(a.weddingDate || ""),
            ),
          );

        setWeddings(linked);

        if (
          requestedWeddingSlug &&
          linked.some(
            (wedding) => wedding.slug === requestedWeddingSlug,
          )
        ) {
          setWeddingSlug(requestedWeddingSlug);
        } else if (linked.length === 1) {
          setWeddingSlug(linked[0].slug);
        }
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load venue weddings.",
        ),
      )
      .finally(() => setLoading(false));
  }, [slug, requestedWeddingSlug]);

  const selectedWedding = useMemo(
    () => weddings.find((wedding) => wedding.slug === weddingSlug) || null,
    [weddings, weddingSlug],
  );

  const queuedCount = useMemo(
    () => files.filter((item) => item.status === "queued").length,
    [files],
  );

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;

    const next = Array.from(fileList)
      .filter((file) =>
        ["image/jpeg", "image/png", "image/webp"].includes(
          file.type,
        ),
      )
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "queued" as const,
        progress: 0,
        error: "",
      }));

    setFiles((current) => [...current, ...next]);
    setMessage("");
    setError("");
  }

  function removeFile(id: string) {
    setFiles((current) =>
      current.filter((item) => item.id !== id),
    );
  }

  async function uploadAll() {
    if (!slug) return;

    if (!weddingSlug.trim()) {
      setError("Select a wedding before uploading images.");
      return;
    }

    const pending = files.filter(
      (item) => item.status === "queued",
    );

    if (!pending.length) return;

    setUploading(true);
    setError("");
    setMessage("");

    let successCount = 0;
    let failureCount = 0;

    for (const item of pending) {
      setFiles((current) =>
        current.map((file) =>
          file.id === item.id
            ? {
                ...file,
                status: "uploading",
                progress: 10,
                error: "",
              }
            : file,
        ),
      );

      try {
        await AdminApiService.uploadVenueImage({
          venueSlug: slug,
          weddingSlug: weddingSlug.trim(),
          file: item.file,
          onProgress: (progress) => {
            setFiles((current) =>
              current.map((file) =>
                file.id === item.id
                  ? { ...file, progress }
                  : file,
              ),
            );
          },
        });

        successCount += 1;

        setFiles((current) =>
          current.map((file) =>
            file.id === item.id
              ? {
                  ...file,
                  status: "done",
                  progress: 100,
                  error: "",
                }
              : file,
          ),
        );
      } catch (uploadError) {
        failureCount += 1;

        setFiles((current) =>
          current.map((file) =>
            file.id === item.id
              ? {
                  ...file,
                  status: "error",
                  progress: 0,
                  error:
                    uploadError instanceof Error
                      ? uploadError.message
                      : "Upload failed.",
                }
              : file,
          ),
        );
      }
    }

    setUploading(false);

    if (failureCount) {
      setError(
        `${successCount} uploaded; ${failureCount} failed.`,
      );
    } else {
      setMessage(
        `${successCount} images uploaded to ${selectedWedding?.couple || weddingSlug} and linked to ${venue?.name || "this venue"}.`,
      );
    }
  }

  if (loading) {
    return <div className="text-neutral-500">Loading venue weddings…</div>;
  }

  return (
    <div className="space-y-7">
      <AdminPageHeader
        title="Image upload"
        description="Upload finished JPEG, PNG or WebP images to the selected venue wedding."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span>{venue?.name || "Venue"}</span>

            {selectedWedding ? (
              <>
                <span className="text-neutral-400">·</span>
                <span>{selectedWedding.couple}</span>
              </>
            ) : null}

            {files.length ? (
              <>
                <span className="text-neutral-400">·</span>
                <span>{queuedCount} queued</span>
              </>
            ) : null}
          </div>
        }
      />

      {requestedWeddingSlug && selectedWedding ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            New wedding selected: {selectedWedding.couple}
          </div>
        </section>
      ) : null}

      {message ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-black/10 bg-white/85 p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <label className="block flex-1">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
              Wedding
            </span>

            {weddings.length ? (
              <select
                value={weddingSlug}
                onChange={(event) => setWeddingSlug(event.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
              >
                <option value="">Select a wedding…</option>
                {weddings.map((wedding) => (
                  <option key={wedding.slug} value={wedding.slug}>
                    {wedding.couple} — {wedding.weddingDate || "No date"}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                No weddings are linked to this venue yet.
              </div>
            )}

            <p className="mt-2 text-xs text-neutral-500">
              Images are stored against the selected wedding and automatically linked to {venue?.name || "this venue"}.
            </p>
          </label>

          <Link
            to={`/admin/weddings/new?venueSlug=${encodeURIComponent(
              slug || "",
            )}&returnTo=${encodeURIComponent(
              `/admin/venues/${slug}/upload`,
            )}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm"
          >
            <Plus className="h-4 w-4" />
            Create wedding
          </Link>
        </div>

        {selectedWedding ? (
          <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
            <p className="font-medium">{selectedWedding.couple}</p>
            <p className="mt-1 text-sm text-neutral-500">{selectedWedding.title}</p>
            <p className="mt-1 font-mono text-xs text-neutral-400">{selectedWedding.slug}</p>
          </div>
        ) : null}
      </section>

      <label className={`flex min-h-[240px] flex-col items-center justify-center rounded-[28px] border-2 border-dashed p-8 text-center ${weddingSlug ? "cursor-pointer border-black/15 bg-white/70" : "cursor-not-allowed border-black/10 bg-neutral-100 opacity-60"}`}>
        <ImagePlus className="h-10 w-10 text-neutral-400" />
        <h2 className="mt-4 font-serif text-3xl">
          Choose finished images
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          {weddingSlug ? "Select multiple JPEG, PNG or WebP files." : "Select a wedding first."}
        </p>
        <input
          type="file"
          multiple
          disabled={!weddingSlug}
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => addFiles(event.target.files)}
          className="hidden"
        />
      </label>

      {files.length ? (
        <section className="rounded-[28px] border border-black/10 bg-white/85 p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl">
                Upload queue
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {files.length} files · {queuedCount} ready
              </p>
            </div>

            <button
              type="button"
              onClick={uploadAll}
              disabled={uploading || queuedCount === 0 || !weddingSlug}
              className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-40"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading
                ? "Uploading…"
                : `Upload ${queuedCount} images`}
            </button>
          </div>

          <div className="space-y-3">
            {files.map((item) => (
              <article
                key={item.id}
                className="flex items-center gap-4 rounded-2xl border border-black/10 p-4"
              >
                <img
                  src={URL.createObjectURL(item.file)}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.file.name}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {(item.file.size / 1024 / 1024).toFixed(1)} MB ·{" "}
                    {item.status}
                    {item.status === "uploading"
                      ? ` · ${item.progress}%`
                      : ""}
                  </p>
                  {item.status === "uploading" ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-black transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  ) : null}
                  {item.error ? (
                    <p className="mt-1 text-xs text-red-700">
                      {item.error}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(item.id)}
                  disabled={item.status === "uploading"}
                  className="rounded-full border border-black/10 p-2 disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>

          {files.every((item) => item.status === "done") ? (
            <button
              type="button"
              onClick={() =>
                navigate(`/admin/venues/${slug}/gallery`)
              }
              className="mt-6 rounded-full border border-black/10 px-5 py-3 text-sm"
            >
              Return to venue gallery
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
