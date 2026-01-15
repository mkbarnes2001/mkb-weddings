import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import { initialVenues } from './GalleryData';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function GalleryByVenue() {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

  // Extract unique regions from venues
  const regions = useMemo(() => {
    const regionSet = new Set(
      initialVenues.map((venue) => {
        const location = venue.location.split(',')[1]?.trim() || venue.location;
        return location;
      })
    );
    return ['all', ...Array.from(regionSet).sort()];
  }, []);

  // Filter venues
  const filteredVenues = useMemo(() => {
    return initialVenues.filter((venue) => {
      const matchesSearch =
        venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRegion =
        regionFilter === 'all' || venue.location.includes(regionFilter);

      return matchesSearch && matchesRegion;
    });
  }, [searchTerm, regionFilter]);

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
        </div>

        {/* Venue Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVenues.map((venue) => {
            const imageCount = venue.images?.length || 0;
            const thumbnailImage =
              venue.images?.[0]?.src ||
              'https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=600&q=80';

            return (
              <Link
                key={venue.id}
                to={`/gallery/venue/${venue.id}`}
                className="group"
              >
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
            <p className="text-xl text-neutral-600">
              No venues found matching your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}