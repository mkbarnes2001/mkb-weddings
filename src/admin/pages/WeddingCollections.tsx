import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Layers3 } from "lucide-react";
import { CollectionService } from "../services/CollectionService";
import type { ImageCollection } from "../types/collection";
import { WeddingService } from "../services/WeddingService";
import type { WeddingRecord } from "../types/wedding";

function statusClasses(status: ImageCollection["status"]) {
  if (status === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "planned") return "bg-neutral-100 text-neutral-600 border-neutral-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export function WeddingCollections() {
  const { slug } = useParams();
  const [collections, setCollections] = useState<ImageCollection[]>([]);
  const [weddings, setWeddings] = useState<WeddingRecord[]>([]);

  useEffect(() => {
    CollectionService.load().then((service) => setCollections(service.getCollectionsForWedding(slug || "")));
    WeddingService.load().then((service) => setWeddings(service.getWeddings()));
  }, [slug]);

  const wedding = useMemo(() => weddings.find((item) => item.slug === slug), [weddings, slug]);

  if (!weddings.length) return <div className="text-neutral-500">Loading collections…</div>;

  if (!wedding) {
    return (
      <div className="rounded-[28px] border border-black/10 bg-white p-8">
        <h1 className="text-3xl font-serif mb-4">Wedding not found</h1>
        <Link to="/admin/weddings" className="underline underline-offset-4">Back to weddings</Link>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Link to={`/admin/weddings/${wedding.slug}`} className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black">
        <ArrowLeft className="w-4 h-4" />
        Back to wedding
      </Link>

      <section className="rounded-[32px] bg-black text-white p-8 md:p-10">
        <p className="uppercase tracking-[0.25em] text-xs text-white/45 mb-4">Wedding Collections</p>
        <h1 className="text-4xl md:text-6xl font-serif leading-tight mb-4">{wedding.couple}</h1>
        <p className="text-white/65">
          {wedding.venue} · blog, venue, portfolio and social image sets
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {collections.map((collection) => (
          <article
            key={collection.id}
            className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="rounded-2xl bg-black text-white p-3">
                <Layers3 className="w-5 h-5" />
              </div>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusClasses(collection.status)}`}>
                {collection.status}
              </span>
            </div>

            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">{collection.type}</p>
            <h2 className="text-3xl font-serif mb-3">{collection.name}</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">{collection.description}</p>

            <div className="mt-6 pt-6 border-t border-black/5">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">Images</p>
              <p className="text-5xl font-serif">{collection.imageCount}</p>
              <p className="text-xs text-neutral-400 mt-3">{collection.source}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        <h2 className="text-3xl font-serif mb-4">Collection model</h2>
        <p className="text-neutral-600 max-w-3xl leading-relaxed">
          This is the first version of the wedding asset model. The same wedding can have different
          image sets for the blog, venue pages, portfolio, homepage and social media. Later, images
          will be assignable to multiple collections without duplicating AI metadata.
        </p>
      </section>
    </div>
  );
}
