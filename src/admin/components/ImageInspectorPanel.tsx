import { AdminActionButton } from "./ui/AdminActionControl";
import {
  EyeOff,
  Image as ImageIcon,
  Save,
  Star,
} from "lucide-react";
import type { ManagedWeddingImage } from "../types/imageManager";

const COLLECTION_OPTIONS = [
  { id: "blog", label: "Blog" },
  { id: "venue", label: "Venue" },
  { id: "homepage", label: "Homepage" },
  { id: "portfolio", label: "Portfolio" },
  { id: "instagram", label: "Instagram" },
];

export function ImageInspectorPanel({
  image,
  onChange,
  onSave,
  saving,
  dirty,
}: {
  image: ManagedWeddingImage | null;
  onChange: (image: ManagedWeddingImage) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
}) {
  if (!image) {
    return (
      <aside className="admin-image-inspector"
        style={{
          position: "sticky",
          top: "112px",
          width: "100%",
          minHeight: "260px",
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: "12px",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          Image inspector
        </p>
        <h2 className="admin-section-title">Select an image</h2>
        <p className="mt-3 text-sm text-neutral-500">
          Click an image in the grid to view and edit it.
        </p>
      </aside>
    );
  }

  function toggleCollection(collectionId: string) {
    const exists = image.collections.includes(collectionId);

    onChange({
      ...image,
      collections: exists
        ? image.collections.filter((item) => item !== collectionId)
        : [...image.collections, collectionId],
    });
  }

  return (
    <aside className="admin-image-inspector"
      style={{
        position: "sticky",
        top: "112px",
        width: "100%",
        maxHeight: "calc(100vh - 128px)",
        overflowY: "auto",
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: "12px",
        boxShadow: "none",
        boxSizing: "border-box",
      }}
    >
      <div className="sticky top-0 z-10 border-b border-black/10 bg-white/95 p-5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Image Manager
            </p>
            <h2 className="admin-section-title">Image inspector</h2>
          </div>

          {dirty ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">
              Unsaved
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-7 p-5">
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-neutral-100">
          <img
            src={image.fullSrc}
            alt={image.aiAlt || image.filename}
            className="h-auto max-h-[420px] w-full object-contain"
          />
        </div>

        <section>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
            Filename
          </p>
          <p className="break-all text-sm">{image.filename}</p>
        </section>

        <section>
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">
            Rating
          </p>

          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <AdminActionButton
                key={rating}
                type="button"
                onClick={() =>
                  onChange({
                    ...image,
                    rating: image.rating === rating ? 0 : rating,
                  })
                }
                className="rounded-full border border-black/10 p-2 hover:bg-neutral-50"
                aria-label={`Set rating to ${rating}`}
              >
                <Star
                  className={`h-5 w-5 ${
                    rating <= image.rating
                      ? "fill-current text-black"
                      : "text-neutral-300"
                  }`}
                />
              </AdminActionButton>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AdminActionButton
            type="button"
            onClick={() =>
              onChange({
                ...image,
                isCover: !image.isCover,
              })
            }
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${
              image.isCover
                ? "border-black bg-black text-white"
                : "border-black/10 bg-neutral-50"
            }`}
          >
            <ImageIcon className="h-5 w-5" />
            <div>
              <p className="font-medium">Blog cover</p>
              <p
                className={`mt-1 text-xs ${
                  image.isCover ? "text-white/60" : "text-neutral-500"
                }`}
              >
                Use this image as the wedding cover.
              </p>
            </div>
          </AdminActionButton>

          <AdminActionButton
            type="button"
            onClick={() =>
              onChange({
                ...image,
                hidden: !image.hidden,
              })
            }
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${
              image.hidden
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-black/10 bg-neutral-50"
            }`}
          >
            <EyeOff className="h-5 w-5" />
            <div>
              <p className="font-medium">Hidden</p>
              <p className="mt-1 text-xs opacity-65">
                Hide this image from published collections.
              </p>
            </div>
          </AdminActionButton>
        </section>

        <section>
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">
            Collections
          </p>

          <div className="grid grid-cols-2 gap-3">
            {COLLECTION_OPTIONS.map((collection) => {
              const active = image.collections.includes(collection.id);

              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => toggleCollection(collection.id)}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    active
                      ? "border-black bg-black text-white"
                      : "border-black/10 bg-white"
                  }`}
                >
                  {collection.label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
            AI alt text
          </p>
          <p className="text-sm leading-relaxed text-neutral-700">
            {image.aiAlt || "No AI alt text found."}
          </p>
        </section>

        <section>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
            AI caption
          </p>
          <p className="text-sm leading-relaxed text-neutral-700">
            {image.aiCaption || "No AI caption found."}
          </p>
        </section>

        <section>
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">
            AI tags
          </p>

          {image.aiTags.length ? (
            <div className="flex flex-wrap gap-2">
              {image.aiTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-black/10 bg-neutral-50 px-3 py-1 text-xs text-neutral-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No AI tags found.</p>
          )}
        </section>

        <AdminActionButton
          type="button"
          onClick={onSave}
          disabled={saving || !dirty}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : dirty ? "Save all changes" : "Saved"}
        </AdminActionButton>
      </div>
    </aside>
  );
}
