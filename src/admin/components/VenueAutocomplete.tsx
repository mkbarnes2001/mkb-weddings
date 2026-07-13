import { useMemo, useState } from "react";
import type { VenueDirectoryEntry } from "../services/VenueDirectoryService";

export function VenueAutocomplete({
  value,
  venues,
  onChange,
}: {
  value: string;
  venues: VenueDirectoryEntry[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();

    if (!query) return venues.slice(0, 10);

    return venues
      .filter((venue) => venue.name.toLowerCase().includes(query))
      .slice(0, 10);
  }, [value, venues]);

  return (
    <div className="relative">
      <input
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        placeholder="Start typing a venue..."
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30"
      />

      {open && matches.length > 0 ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl">
          {matches.map((venue) => (
            <button
              key={venue.name}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(venue.name);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-4 border-b border-black/5 px-4 py-3 text-left last:border-b-0 hover:bg-neutral-50"
            >
              <span className="font-medium">{venue.name}</span>
              <span className="text-xs text-neutral-400">
                used {venue.usageCount}×
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
