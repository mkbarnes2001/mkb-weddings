import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Layers3 } from "lucide-react";
import { weddingStories } from "../../data/weddingStories";
import { CollectionService } from "../services/CollectionService";
import type { ImageCollection } from "../types/collection";

function statusClasses(status: ImageCollection["status"]) {
  if (status === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "planned") return "bg-neutral-100 text-neutral-600 border-neutral-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export function Collections() {
  const [collections, setCollections] = useState<ImageCollection[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    CollectionService.load().then((service) => setCollections(service.getAllCollections()));
  }, []);

  const storyBySlug = useMemo(() => new Map(weddingStories.map((story) => [story.slug, story])), []);

  const filteredCollections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return collections;

    return collections.filter((collection) => {
      const story = storyBySlug.get(collection.weddingSlug);

      return [
        collection.name,
        collection.description,
        collection.type,
        collection.source,
        story?.title,
        story?.venue,
        story?.couple,
      ].some((value) => (value || "").toLowerCase().includes(q));
    });
  }, [collections, query, storyBySlug]);

  const activeCount = collections.filter((collection) => collection.status === "active").length;
  const totalImages = collections.reduce((sum, collection) => sum + collection.imageCount, 0);

  return (
    <div className="space-y-7">
      <section className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
        <div>
          <p className="uppercase tracking-[0.25em] text-xs text-neutral-500 mb-3">Collections</p>
          <h1 className="text-4xl md:text-6xl font-serif text-neutral-950 leading-tight">
            Image Collections
          </h1>
          <p className="text-neutral-500 mt-3 max-w-2xl">
            One wedding can have separate sets for blog stories, venue pages, portfolio, homepage and social media.
          </p>
        </div>

        <div className="relative w-full xl:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search collections..."
            className="w-full rounded-2xl border border-black/10 bg-white/70 py-3 pl-11 pr-4 text-sm outline-none focus:border-black/30"
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/85 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Managed gallery</p>
            <h2 className="mt-2 font-serif text-3xl">Creative Flash</h2>
            <p className="mt-2 text-sm text-neutral-600">Curate order, visibility, hero image, gallery destinations and moment assignments.</p>
          </div>
          <Link to="/admin/creative-flash" className="rounded-full bg-black px-5 py-3 text-center text-sm text-white">Manage Creative Flash</Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Collections</p>
          <p className="text-5xl font-serif">{collections.length}</p>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Active</p>
          <p className="text-5xl font-serif">{activeCount}</p>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Images referenced</p>
          <p className="text-5xl font-serif">{totalImages}</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 shadow-[0_18px_60px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="divide-y divide-black/5">
          {filteredCollections.map((collection) => {
            const story = storyBySlug.get(collection.weddingSlug);

            return (
              <div key={collection.id} className="p-6 grid grid-cols-1 xl:grid-cols-[1fr_1fr_180px_auto] gap-5 items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusClasses(collection.status)}`}>
                      {collection.status}
                    </span>
                    <span className="text-xs text-neutral-500">{collection.type}</span>
                  </div>

                  <h2 className="text-2xl font-serif">{collection.name}</h2>
                  <p className="text-sm text-neutral-600 mt-2">{collection.description}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">Wedding</p>
                  <p className="text-sm text-neutral-800">{story?.title || collection.weddingSlug}</p>
                  <p className="text-sm text-neutral-500 mt-1">{story?.venue}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">Images</p>
                  <p className="text-4xl font-serif">{collection.imageCount}</p>
                </div>

                <div className="flex xl:justify-end">
                  <Link
                    to={`/admin/weddings/${collection.weddingSlug}/collections`}
                    className="rounded-full bg-black text-white px-5 py-3 text-sm hover:bg-black/90"
                  >
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
