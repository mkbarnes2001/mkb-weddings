import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { WeddingService } from "../services/WeddingService";
import type {
  WeddingPublicationStatus,
  WeddingRecord,
} from "../types/wedding";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/Badge";
import { formatDateTime } from "../utils/format";

type StatusFilter = "all" | WeddingPublicationStatus;

function publicationClasses(status: WeddingPublicationStatus) {
  if (status === "published") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "archived") {
    return "border-neutral-200 bg-neutral-100 text-neutral-600";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function Weddings() {
  const [weddings, setWeddings] = useState<WeddingRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  useEffect(() => {
    WeddingService.load().then((service) =>
      setWeddings(service.getWeddings()),
    );
  }, []);

  const filteredWeddings = useMemo(() => {
    const q = query.trim().toLowerCase();

    return weddings.filter((wedding) => {
      const matchesQuery =
        !q ||
        [
          wedding.title,
          wedding.venue,
          wedding.couple,
          wedding.slug,
          wedding.publicationStatus,
        ].some((value) =>
          value.toLowerCase().includes(q),
        );

      const matchesStatus =
        statusFilter === "all" ||
        wedding.publicationStatus === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [weddings, query, statusFilter]);

  if (!weddings.length) {
    return <div className="text-neutral-500">Loading weddings…</div>;
  }

  const draftCount = weddings.filter(
    (wedding) => wedding.publicationStatus === "draft",
  ).length;

  const publishedCount = weddings.filter(
    (wedding) => wedding.publicationStatus === "published",
  ).length;

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Weddings
          </p>
          <h1 className="font-serif text-4xl leading-tight text-neutral-950 md:text-6xl">
            Wedding Repository
          </h1>
          <p className="mt-3 max-w-2xl text-neutral-500">
            Weddings, stories and publication state are managed directly in the D1 repository.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 md:flex-row xl:w-auto">
          <div className="relative w-full xl:w-96">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search weddings..."
              className="w-full rounded-2xl border border-black/10 bg-white/70 py-3 pl-11 pr-4 text-sm outline-none focus:border-black/30"
            />
          </div>

          <Link
            to="/admin/weddings/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white hover:bg-black/90"
          >
            <Plus className="h-4 w-4" />
            New wedding
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-[24px] border border-black/10 bg-white/75 p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
            Total
          </p>
          <p className="font-serif text-4xl">{weddings.length}</p>
        </div>
        <div className="rounded-[24px] border border-black/10 bg-white/75 p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
            Draft
          </p>
          <p className="font-serif text-4xl">{draftCount}</p>
        </div>
        <div className="rounded-[24px] border border-black/10 bg-white/75 p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
            Published
          </p>
          <p className="font-serif text-4xl">{publishedCount}</p>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {(["all", "draft", "published", "archived"] as StatusFilter[]).map(
          (status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full border px-4 py-2 text-sm ${
                statusFilter === status
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-white/70 text-neutral-700"
              }`}
            >
              {status}
            </button>
          ),
        )}
      </section>

      <section className="grid grid-cols-1 gap-5">
        {filteredWeddings.map((wedding) => {
          const cover =
            wedding.images.find((image) => image.isCover) ||
            wedding.images[0];

          return (
            <article
              key={wedding.slug}
              className="overflow-hidden rounded-[28px] border border-black/10 bg-white/75 shadow-[0_18px_60px_rgba(0,0,0,0.04)] transition-colors hover:bg-white"
            >
              <div className="grid grid-cols-1 gap-0 xl:grid-cols-[220px_1.2fr_0.8fr_1fr_auto]">
                <div className="h-56 bg-neutral-100 xl:h-full">
                  {cover ? (
                    <img
                      src={cover.thumbSrc}
                      alt={cover.aiAlt || wedding.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                      No images
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${publicationClasses(
                        wedding.publicationStatus,
                      )}`}
                    >
                      {wedding.publicationStatus}
                    </span>

                    <StatusBadge status={wedding.status} />

                    <span className="rounded-full border border-black/10 bg-neutral-50 px-3 py-1 text-xs text-neutral-500">
                      {wedding.storage}
                    </span>
                  </div>

                  <h3 className="mb-2 font-serif text-2xl">
                    {wedding.title}
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {wedding.couple} · {wedding.venue} ·{" "}
                    {wedding.weddingDate}
                  </p>
                  <p className="mt-2 text-xs text-neutral-400">
                    {wedding.slug}
                  </p>

                  {wedding.latestAiUpdate ? (
                    <p className="mt-3 text-xs text-neutral-400">
                      Last AI update:{" "}
                      {formatDateTime(wedding.latestAiUpdate)}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 p-6 text-sm text-neutral-700">
                  <p>
                    <span className="text-neutral-500">Images:</span>{" "}
                    {wedding.imageCount}
                  </p>
                  <p>
                    <span className="text-neutral-500">AI rows:</span>{" "}
                    {wedding.aiRows}
                  </p>
                  <p>
                    <span className="text-neutral-500">Cover:</span>{" "}
                    {wedding.coverCount > 0 ? "yes" : "missing"}
                  </p>
                </div>

                <div className="space-y-3 p-6">
                  <ProgressBar
                    label="Tags"
                    done={wedding.tagsComplete}
                    total={wedding.imageCount}
                  />
                  <ProgressBar
                    label="Alt"
                    done={wedding.altComplete}
                    total={wedding.imageCount}
                  />
                  <ProgressBar
                    label="Captions"
                    done={wedding.captionComplete}
                    total={wedding.imageCount}
                  />
                </div>

                <div className="flex p-6 xl:justify-end">
                  <Link
                    to={`/admin/weddings/${wedding.slug}`}
                    className="h-fit rounded-full bg-black px-5 py-3 text-sm text-white hover:bg-black/90"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
