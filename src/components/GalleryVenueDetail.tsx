import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, ArrowLeft } from 'lucide-react';
import { initialVenues, moments, photographyStyles } from './GalleryData';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ImageLightbox } from './ImageLightbox';

export function GalleryVenueDetail() {
  const { venueId } = useParams();
  const [momentFilter, setMomentFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const venue = initialVenues.find((v) => v.id === venueId);

  const filteredImages = useMemo(() => {
    if (!venue) return [];

    let images = [...venue.images];

    // Filter by moment
    if (momentFilter !== 'all') {
      images = images.filter((img) => img.moments?.includes(momentFilter));
    }

    // Filter by style
    if (styleFilter !== 'all') {
      images = images.filter((img) => img.styles?.includes(styleFilter));
    }

    // Sort
    if (sortBy === 'oldest') {
      images.reverse();
    }

    return images;
  }, [venue, momentFilter, styleFilter, sortBy]);

  if (!venue) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-4">Venue Not Found</h1>
          <Link to="/gallery/venues" className="text-neutral-600 hover:text-neutral-900">
            Back to Venues
          </Link>
        </div>
      </div>
    );
  }

  const heroImage =
    venue.images?.[0]?.src ||
    'https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80';

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[400px]">
        <ImageWithFallback
          src={heroImage}
          alt={venue.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-16 w-full">
            <Link
              to="/gallery/venues"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Venues
            </Link>
            <h1 className="text-5xl md:text-6xl text-white mb-4">{venue.name}</h1>
            <p className="text-white/90 text-xl flex items-center gap-2 mb-6">
              <MapPin className="w-5 h-5" />
              {venue.location}
            </p>
            <p className="text-white/90 text-lg max-w-3xl mb-8">
              {venue.description}
            </p>
            <Link
              to="/contact"
              className="inline-block bg-white text-black px-8 py-4 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              Planning your wedding here? Let's chat.
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-0 bg-white border-b border-neutral-200 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap gap-4">
            {/* Moment Filter */}
            <select
              value={momentFilter}
              onChange={(e) => setMomentFilter(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
            >
              <option value="all">All Moments</option>
              {moments.map((moment) => (
                <option key={moment.id} value={moment.id}>
                  {moment.name}
                </option>
              ))}
            </select>

            {/* Style Filter */}
            <select
              value={styleFilter}
              onChange={(e) => setStyleFilter(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
            >
              <option value="all">All Styles</option>
              {photographyStyles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
            </select>

            {/* Results Count */}
            <div className="ml-auto flex items-center text-neutral-600">
              {filteredImages.length} {filteredImages.length === 1 ? 'image' : 'images'}
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {filteredImages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredImages.map((image, index) => (
              <button
                key={image.id}
                onClick={() => {
                  setLightboxImage(image.src);
                  setLightboxIndex(index);
                }}
                className="aspect-[4/3] overflow-hidden rounded-lg group cursor-pointer"
              >
                <ImageWithFallback
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-neutral-600">
              No images match your selected filters.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          images={filteredImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxImage(null)}
          onNavigate={(newIndex) => {
            setLightboxIndex(newIndex);
            setLightboxImage(filteredImages[newIndex].src);
          }}
        />
      )}
    </div>
  );
}
