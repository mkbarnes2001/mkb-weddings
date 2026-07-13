import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { weddingStories } from "../../data/weddingStories";
import { SupplierService, type SupplierRecord } from "../services/SupplierService";

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    SupplierService.load().then((service) => setSuppliers(service.getAllSuppliers()));
  }, []);

  const filteredSuppliers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;

    return suppliers.filter((supplier) =>
      [supplier.blogSlug, supplier.role, supplier.name, supplier.website, supplier.instagram].some(
        (value) => (value || "").toLowerCase().includes(q),
      ),
    );
  }, [suppliers, query]);

  const weddingTitleBySlug = useMemo(() => new Map(weddingStories.map((story) => [story.slug, story.title])), []);

  return (
    <div className="space-y-7">
      <section className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
        <div>
          <p className="uppercase tracking-[0.25em] text-xs text-neutral-500 mb-3">Suppliers</p>
          <h1 className="text-4xl md:text-6xl font-serif text-neutral-950 leading-tight">
            Supplier Intelligence
          </h1>
          <p className="text-neutral-500 mt-3 max-w-2xl">
            Central supplier data for wedding stories, structured data and future marketing.
          </p>
        </div>

        <div className="relative w-full xl:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search suppliers..."
            className="w-full rounded-2xl border border-black/10 bg-white/70 py-3 pl-11 pr-4 text-sm outline-none focus:border-black/30"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Supplier rows</p>
          <p className="text-5xl font-serif">{suppliers.length}</p>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Weddings covered</p>
          <p className="text-5xl font-serif">
            {new Set(suppliers.map((supplier) => supplier.blogSlug).filter(Boolean)).size}
          </p>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Source</p>
          <p className="text-lg font-serif">blog-suppliers.csv</p>
        </div>
      </section>

      {suppliers.length === 0 ? (
        <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-7 text-amber-900">
          <div className="flex items-start gap-4">
            <Users className="w-6 h-6 mt-1" />
            <div>
              <h2 className="text-2xl font-serif mb-2">No supplier rows found yet</h2>
              <p className="text-sm leading-relaxed">
                Add supplier rows to <span className="font-mono">public/blog-suppliers.csv</span>.
              </p>
              <pre className="mt-4 rounded-2xl bg-white/70 p-4 text-xs overflow-auto">
blogSlug,role,name,website,instagram,sortOrder
              </pre>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[28px] border border-black/10 bg-white/75 shadow-[0_18px_60px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="divide-y divide-black/5">
            {filteredSuppliers.map((supplier, index) => (
              <div key={`${supplier.blogSlug}-${supplier.role}-${supplier.name}-${index}`} className="p-6 grid grid-cols-1 xl:grid-cols-[1fr_1fr_1fr_auto] gap-5 items-start">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">
                    {supplier.role || "Supplier"}
                  </p>
                  <h3 className="text-2xl font-serif">{supplier.name || "Unnamed supplier"}</h3>
                  <p className="text-sm text-neutral-500 mt-2">{supplier.blogSlug}</p>
                </div>

                <div className="text-sm text-neutral-700">
                  <p className="text-neutral-500 mb-1">Wedding</p>
                  <p>{weddingTitleBySlug.get(supplier.blogSlug || "") || supplier.blogSlug || "Unknown"}</p>
                </div>

                <div className="text-sm text-neutral-700 space-y-2">
                  {supplier.website ? <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="block underline underline-offset-4">Website</a> : <p className="text-neutral-400">No website</p>}
                  {supplier.instagram ? <a href={`https://instagram.com/${supplier.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="block underline underline-offset-4">@{supplier.instagram.replace(/^@/, "")}</a> : <p className="text-neutral-400">No Instagram</p>}
                </div>

                <div className="text-sm text-neutral-500 xl:text-right">Order {supplier.sortOrder || "-"}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
