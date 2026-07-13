import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, FileUp, Images, Plus, RefreshCw, Search } from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { VenueSummary } from "../types/venue";

export function Venues() {
  const [venues, setVenues] = useState<VenueSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    AdminApiService.listVenues()
      .then(setVenues)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load venues."))
      .finally(() => setLoading(false));
  }, []);

  async function syncPublicPages() {
    setSyncing(true);
    setError("");
    setSyncMessage("");

    try {
      const result =
        await AdminApiService.syncPublicVenueData();

      setSyncMessage(
        `${result.publicVenueData.venueCount} venue pages synced with ${result.publicVenueData.imageCount} images.`,
      );
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Unable to sync public venue pages.",
      );
    } finally {
      setSyncing(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter((venue) =>
      [venue.name, venue.county, venue.town, venue.slug]
        .some((value) => String(value || "").toLowerCase().includes(q)),
    );
  }, [venues, query]);

  if (loading) return <div className="text-neutral-500">Loading venues…</div>;

  return (
    <div className="space-y-7">
      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">Venue Repository</p>
            <h1 className="font-serif text-5xl md:text-6xl">Venues</h1>
            <p className="mt-4 max-w-2xl text-white/60">
              Manage venue content, location, status and SEO without editing CSV files.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={syncPublicPages}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm text-white disabled:opacity-40"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  syncing ? "animate-spin" : ""
                }`}
              />
              {syncing
                ? "Syncing…"
                : "Sync public pages"}
            </button>
            <Link
              to="/admin/venues/migrate"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm text-white"
            >
              <FileUp className="h-4 w-4" />
              Import CSV
            </Link>
            <Link
              to="/admin/venues/migrate-gallery"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm text-white"
            >
              <Images className="h-4 w-4" />
              Import galleries
            </Link>
            <Link
              to="/admin/venues/new"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-black"
            >
              <Plus className="h-4 w-4" />
              New venue
            </Link>
          </div>
        </div>
      </section>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search venues, towns or counties..."
          className="w-full rounded-2xl border border-black/10 bg-white/80 py-3 pl-11 pr-4 text-sm outline-none focus:border-black/30"
        />
      </div>

      {syncMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {syncMessage}
        </div>
      ) : null}

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      {!filtered.length ? (
        <section className="rounded-[28px] border border-black/10 bg-white/75 p-10 text-center">
          <Building2 className="mx-auto h-9 w-9 text-neutral-400" />
          <h2 className="mt-4 font-serif text-3xl">No venues found</h2>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((venue) => (
            <Link key={venue.id} to={`/admin/venues/${venue.slug}`} className="rounded-[28px] border border-black/10 bg-white/80 p-7 transition hover:-translate-y-0.5 hover:bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-black p-3 text-white"><Building2 className="h-5 w-5" /></div>
                <span className="rounded-full border border-black/10 bg-neutral-50 px-3 py-1 text-xs capitalize text-neutral-600">{venue.status}</span>
              </div>
              <h2 className="mt-6 font-serif text-3xl">{venue.name}</h2>
              <p className="mt-2 text-sm text-neutral-500">{[venue.town, venue.county].filter(Boolean).join(", ") || "Location not set"}</p>
              <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-4 text-sm">
                <span className="text-neutral-500">Weddings</span>
                <strong>{venue.weddingCount}</strong>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
