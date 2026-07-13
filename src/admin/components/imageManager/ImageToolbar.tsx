import { Filter, Search } from "lucide-react";

export type ImageFilterMode =
  | "all"
  | "cover"
  | "hidden"
  | "rated"
  | "missing-alt"
  | "missing-caption"
  | "missing-tags";

const FILTERS: Array<{
  id: ImageFilterMode;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "cover", label: "Cover" },
  { id: "hidden", label: "Hidden" },
  { id: "rated", label: "Rated" },
  { id: "missing-alt", label: "Missing alt" },
  { id: "missing-caption", label: "Missing caption" },
  { id: "missing-tags", label: "Missing tags" },
];

export function ImageToolbar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  collectionFilter,
  onCollectionChange,
  collectionOptions,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  filter: ImageFilterMode;
  onFilterChange: (value: ImageFilterMode) => void;
  collectionFilter: string;
  onCollectionChange: (value: string) => void;
  collectionOptions: string[];
}) {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search filename, caption, alt text or AI tags..."
            className="w-full rounded-2xl border border-black/10 bg-white/75 py-3 pl-11 pr-4 text-sm outline-none focus:border-black/30"
          />
        </div>

        <select
          value={collectionFilter}
          onChange={(event) =>
            onCollectionChange(event.target.value)
          }
          className="rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-sm outline-none"
        >
          <option value="all">All collections</option>
          {collectionOptions.map((collection) => (
            <option key={collection} value={collection}>
              {collection}
            </option>
          ))}
        </select>
      </section>

      <section className="flex flex-wrap gap-2">
        <div className="mr-2 inline-flex items-center gap-2 text-sm text-neutral-500">
          <Filter className="h-4 w-4" />
          Filter
        </div>

        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilterChange(item.id)}
            className={`rounded-full border px-4 py-2 text-sm ${
              filter === item.id
                ? "border-black bg-black text-white"
                : "border-black/10 bg-white/70 text-neutral-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </section>
    </div>
  );
}
