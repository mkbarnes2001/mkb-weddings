import { useMemo, useState } from "react";
import type { SupplierDirectoryEntry } from "../services/SupplierEditorService";

export function SupplierAutocomplete({ value, directory, onChange, onSelect }: {
  value: string;
  directory: SupplierDirectoryEntry[];
  onChange: (value: string) => void;
  onSelect: (supplier: SupplierDirectoryEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return directory.slice(0, 8);
    return directory.filter((supplier) =>
      [supplier.name, supplier.role, supplier.website, supplier.instagram].some((field) => field.toLowerCase().includes(query)),
    ).slice(0, 8);
  }, [directory, value]);

  return (
    <div className="relative">
      <input
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => { onChange(event.target.value); setOpen(true); }}
        placeholder="Start typing supplier name..."
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30"
      />
      {open && matches.length > 0 ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl">
          {matches.map((supplier) => (
            <button
              key={`${supplier.name}-${supplier.role}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { onSelect(supplier); setOpen(false); }}
              className="block w-full border-b border-black/5 px-4 py-3 text-left last:border-b-0 hover:bg-neutral-50"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{supplier.name}</p>
                  <p className="text-xs text-neutral-500 mt-1">{supplier.role || "Uncategorised"}{supplier.instagram ? ` · @${supplier.instagram}` : ""}</p>
                </div>
                <span className="text-xs text-neutral-400">used {supplier.usageCount}×</span>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
