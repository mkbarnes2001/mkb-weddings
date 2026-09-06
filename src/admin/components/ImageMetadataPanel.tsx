import { AdminActionButton } from "./ui/AdminActionControl";
import { X } from "lucide-react";
import type { WeddingImage } from "../types/wedding";

export function ImageMetadataPanel({
  image,
  onClose,
}: {
  image: WeddingImage | null;
  onClose: () => void;
}) {
  if (!image) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-xl bg-white shadow-2xl border-l border-black/10 overflow-y-auto">
      <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-black/10 p-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Image Intelligence</p>
          <h2 className="font-serif text-2xl mt-1">Metadata</h2>
        </div>

        <AdminActionButton
          type="button"
          onClick={onClose}
          className="rounded-full border border-black/10 p-2 hover:bg-neutral-50"
          aria-label="Close image panel"
        >
          <X className="w-5 h-5" />
        </AdminActionButton>
      </div>

      <div className="p-5 space-y-6">
        <div className="rounded-3xl overflow-hidden bg-neutral-100 border border-black/10">
          <img src={image.fullSrc} alt={image.aiAlt || image.filename} className="w-full h-auto" />
        </div>

        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">Filename</p>
          <p className="text-sm break-all">{image.filename}</p>
        </section>

        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">Alt text</p>
          <p className="text-sm leading-relaxed text-neutral-700">
            {image.aiAlt || "No alt text found."}
          </p>
        </section>

        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">Caption</p>
          <p className="text-sm leading-relaxed text-neutral-700">
            {image.aiCaption || "No caption found."}
          </p>
        </section>

        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Visual tags</p>
          {image.aiTags.length > 0 ? (
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
            <p className="text-sm text-neutral-500">No tags found.</p>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-neutral-50 border border-black/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">Order</p>
            <p className="text-2xl font-serif">{image.order}</p>
          </div>

          <div className="rounded-2xl bg-neutral-50 border border-black/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">Cover</p>
            <p className="text-2xl font-serif">{image.isCover ? "Yes" : "No"}</p>
          </div>
        </section>
      </div>
    </aside>
  );
}
