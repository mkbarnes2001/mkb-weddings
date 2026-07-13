import {
  Eye,
  EyeOff,
  Layers3,
  X,
} from "lucide-react";

const COLLECTIONS = [
  "blog",
  "venue",
  "homepage",
  "portfolio",
  "instagram",
];

export function ImageBatchBar({
  selectedCount,
  onRate,
  onHide,
  onShow,
  onToggleCollection,
  onClear,
}: {
  selectedCount: number;
  onRate: (rating: number) => void;
  onHide: () => void;
  onShow: () => void;
  onToggleCollection: (collection: string) => void;
  onClear: () => void;
}) {
  if (!selectedCount) return null;

  return (
    <section className="rounded-[24px] border border-black/10 bg-white/90 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">{selectedCount} selected</span>

        <div className="flex flex-wrap items-center gap-1">
          {[0, 1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onRate(rating)}
              className="rounded-full border border-black/10 px-3 py-2 text-sm hover:bg-neutral-50"
            >
              {rating === 0 ? "Clear stars" : `${rating}★`}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onHide}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm"
        >
          <EyeOff className="h-4 w-4" />
          Hide
        </button>

        <button
          type="button"
          onClick={onShow}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm"
        >
          <Eye className="h-4 w-4" />
          Show
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Layers3 className="h-4 w-4 text-neutral-500" />
          {COLLECTIONS.map((collection) => (
            <button
              key={collection}
              type="button"
              onClick={() => onToggleCollection(collection)}
              className="rounded-full border border-black/10 px-3 py-2 text-sm"
            >
              {collection}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClear}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm"
        >
          <X className="h-4 w-4" />
          Clear
        </button>
      </div>
    </section>
  );
}
