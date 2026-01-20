import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import { initialVenues } from './GalleryData';
import { ImageWithFallback } from './figma/ImageWithFallback';

type CsvRow = {
  venue: string;
  category: string;
  filename: string; // your CSV currently has _500.webp thumbnails
};

type CsvVenueIndex = Record<
  string,
  {
    count: number;
    // pick a representative thumbnail to show on the venue card
    cover: { category: string; filename: string } | null;
    // categories present (useful later)
    categories: Set<string>;
  }
>;

/**
 * 1) Set this to your PUBLIC R2 dev URL base (the one you tested in the browser)
 *    Example might look like:
 *    https://<something>.r2.dev
 *
 * 2) Keep NO trailing slash.
 */
const R2_PUBLIC_BASE = 'https://YOUR_PUBLIC_R2_DEV_URL_HERE';

function enc(segment: string) {
  // Important because your venue/category names have spaces
  return encodeURIComponent(segment.trim());
}

// Robust enough for: venue,category,filename with quotes
function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // Expect header: venue,category,filename
  const header = lines[0].toLowerCase();
  const hasHeader =
    header.includes('venue') && header.includes('category') && header.includes('filename');

  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows: CsvRow[] = [];

  for (const line of dataLines) {
    // Split CSV with quotes support
    const parts: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        parts.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    parts.push(cur);

    const [venueRaw, categoryRaw, filenameRaw] = parts.map((p) => (p ?? '').trim());

    // Ignore bad / empty lines
    if (!venueRaw || !categoryRaw || !filenameRaw) continue;

    rows.push({
      venue: venueRaw,
      category: categoryRaw,
      filename: filenameRaw,
    });
  }

  return rows;
}

function buildThumbUrl(venue: string, category: string, filename500: string) {
  // Your R2 structure: thumb/<venue>/<category>/<filename_500.webp>
  return `${R2_PUBLIC_BASE}/thumb/${enc(venue)}/${enc(category)}/${encodeURIComponent(
    filename500.trim()
  )}`;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function GalleryByVenue() {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

  const [csvIndex, setCsvIndex] = useState<CsvVenueIndex>({});
  const [csvLoaded, setCsvLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/gallery.csv', { cache: 'no-store' });
        const text = await res.text();
        const rows = parseCsv(text);

        const index: CsvVenueIndex = {};

        for (const r of rows) {
          if (!index[r.venue]) {
            index[r.venue] = { count: 0, cover: null, categories: new Set<string>() };
          }
          index[r.venue].count += 1;
          index[r.venue].categories.add(r.category);

          // Set first seen image as cover (simple + fast)
          if (!index[r.venue].cover) {
            index[r.venue].cover = { category: r.category, filename: r.filename };
          }
        }

        if (!cancelled) {
          setCsvIndex(index);
          setCsvLoaded(true);
        }
      } catch (e) {
        console.error('Failed to load /gallery.csv', e);
        if (!cancelled) setCsvLoaded(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build a merged list:
  // - Start with initialVenues (to keep location/region)
  // - Add counts + cover thumbnails from CSV when available
  // - Add any "extra" venues that exist in CSV but not in initialVenues
  const mergedVenues = useMemo(() => {
    const initialByName = new Map(
      initialVenues.map((v: any) => [String(v.name).trim(), v])
    );

    const merged: any[] = [];

    // 1) existing venues
    for (const v of initialVenues as any[]) {
      const idx = csvIndex[String(v.name).trim()];
      const cover =
        idx?.cover
          ? buildThumbUrl(v.name, idx.cover.category, idx.cover.filename)
          : v.images?.[0]?.src ||
            'https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=600&q=80';

      merged.push({
        ...v,
        _csvCount: idx?.count ?? (v.images?.length || 0),
        _csvCover: cover,
        _csvCategories: idx?.categories ? Array.from(idx.categories) : [],
      });
    }

    // 2) venues found in CSV but missing from initialVenues
    for (const venueName of Object.keys(csvIndex)) {
      if (initialByName.has(venueName)) continue;

      const idx = csvIndex[venueName];
      const cover =
        idx.cover
          ? buildThumbUrl(venueName, idx.cover.category, idx.cover.filename)
          : 'https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=600&q=80';

      merged.push({
        id: slugify(venueName),
        name: venueName,
        location: 'Northern Ireland',
        images: [],
        _csvCount: idx.count,
        _csvCover: cover,
        _csvCategories: Array.from(idx.categories),
      });
    }

    // Sort alphabetically
    merged.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return merged;
  }, [csvIndex]);

  // Extract unique regions from venues
  const regions = useMemo(() => {
    const regionSet = new Set(
      mergedVenues.map((venue: any) => {
        const location = String(venue.location || '').split(',')[1]?.trim() || venue.location;
        return location || 'Unknown';
      })
    );
    return ['all', ...Array.from(regionSet).sort()];
  }, [mergedVenues]);

  // Filter venues
  const filteredVenues = useMemo(() => {
    return mergedVenues.filter((venue: any) => {
      const matchesSearch =
        String(venue.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(venue.location).toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRegion =
        regionFilter === 'all' || String(venue.location).includes(regionFilter);

      return matchesSearch && matchesRegion;
    });
  }, [mergedVenues, searchTerm, regionFilter]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
            />
          </div>

          {/* Region Filter */}
          <div className="relative">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="appearance-none px-6 py-3 pr-12 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white cursor-pointer"
            >
              <option value="all">All Regions</option>
              {regions.slice(1).map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-8 text-neutral-600">
          Showing {filteredVenues.length} venue{filteredVenues.length !== 1 ? 's' : ''}
          {!csvLoaded && <span className="ml-2">(loading gallery…)</span>}
        </div>

        {/* Venue Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVenues.map((venue: any) => {
            const imageCount = venue._csvCount ?? 0;
            const thumbnailImage = venue._csvCover;

            return (
              <Link key={venue.id} to={`/gallery/venue/${venue.id}`} className="group">
                <div className="aspect-[4/3] overflow-hidden rounded-lg mb-4">
                  <ImageWithFallback
                    src={thumbnailImage}
                    alt={venue.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <h3 className="text-2xl mb-2 group-hover:text-neutral-600 transition-colors">
                  {venue.name}
                </h3>
                <p className="text-neutral-600 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {venue.location}
                </p>
                <p className="text-sm text-neutral-500">
                  {imageCount} {imageCount === 1 ? 'image' : 'images'}
                </p>
              </Link>
            );
          })}
        </div>

        {/* No Results */}
        {filteredVenues.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-neutral-600">No venues found matching your search.</p>
          </div>
        )}

        {/* Helpful warning if you forgot to set the R2 base */}
        {R2_PUBLIC_BASE.includes('YOUR_PUBLIC_R2_DEV_URL_HERE') && (
          <div className="mt-10 p-4 border border-amber-200 bg-amber-50 text-amber-900 rounded-lg">
            <strong>Action needed:</strong> Set <code>R2_PUBLIC_BASE</code> at the top of{' '}
            <code>GalleryByVenue.tsx</code> to your R2 public dev URL (the one you tested).
          </div>
        )}
      </div>
    </div>
  );
}
