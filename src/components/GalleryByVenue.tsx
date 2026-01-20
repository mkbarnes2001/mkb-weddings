import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { loadGallery, GalleryItem } from "./galleryLoader";

export function GalleryByVenue() {
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGallery()
      .then(setItems)
      .catch((e) => setError(e?.message ?? "Failed to load gallery"));
  }, []);

  const venues = useMemo(() => {
    // group items by venue
    const map = new Map<string, { venue: string; venueId: string; thumbUrl: string; count: number }>();
    for (const it of items) {
      if (!map.has(it.venueId)) {
        map.set(it.venueId, { venue: it.venue, venueId: it.venueId, thumbUrl: it.thumbUrl, count: 1 });
      } else {
        map.get(it.venueId)!.count++;
      }
    }
    return Array.from(map.values()).sort((a, b) => a.venue.localeCompare(b.venue));
  }, [items]);

  // (Optional) regions not available from CSV — keep simple for now:
  const regions = ["all"];

  const filteredVenues = useMemo(() => {
    return venues.filter((v) => v.venue.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [venues, searchTerm]);

  if (error) return <div className="p-8">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-lg"
            />
          </div>

          <div className="relative">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="appearance-none px-6 py-3 pr-12 border border-neutral-300 rounded-lg bg-white"
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r === "all" ? "All Regions" : r}
                </option>
              ))}
            </select>
            <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        <div className="mb-8 text-neutral-600">
          Showing {filteredVenues.length} venue{filteredVenues.length !== 1 ? "s" : ""}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVenues.map((v) => (
            <Link key={v.venueId} to={`/gallery/venue/${v.venueId}`} className="group">
              <div className="aspect-[4/3] overflow-hidden rounded-lg mb-4">
                <ImageWithFallback
                  src={v.thumbUrl}
                  alt={v.venue}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <h3 className="text-2xl mb-2 group-hover:text-neutral-600 transition-colors">{v.venue}</h3>
              <p className="text-sm text-neutral-500">{v.count} images</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
