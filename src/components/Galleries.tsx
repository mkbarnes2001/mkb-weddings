import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapPin, Camera } from 'lucide-react';
import { loadVenues, type Venue } from './GalleryData';

export function Galleries() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const loadedVenues = loadVenues();
    setVenues(loadedVenues);
  }, []);

  const filteredVenues = selectedVenue
    ? venues.filter((v) => v.id === selectedVenue)
    : venues;

  // Only show venues that have images
  const venuesWithImages = venues.filter(v => v.images.length > 0);

  return (
    <div className="pt-20 min-h-screen">
      {/* Header */}
      <section className="py-20 px-6 md:px-20 bg-secondary">
        <div className="max-w-[1440px] mx-auto text-center">
          <h1 className="mb-8">Wedding Galleries</h1>
          <p className="text-foreground/60 max-w-3xl mx-auto" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            Explore our portfolio organized by venue type. Each location offers unique beauty and character for your special day.
          </p>
        </div>
      </section>

      {/* Filter */}
      {venuesWithImages.length > 0 && (
        <section className="py-6 px-6 md:px-20 border-b border-border bg-white sticky top-20 z-40">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setSelectedVenue(null)}
                className={`px-6 h-10 border text-sm uppercase tracking-wide transition-colors rounded-sm ${
                  selectedVenue === null
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-foreground border-border hover:border-primary'
                }`}
              >
                All Venues
              </button>
              {venuesWithImages.map((venue) => (
                <button
                  key={venue.id}
                  onClick={() => setSelectedVenue(venue.id)}
                  className={`px-6 h-10 border text-sm uppercase tracking-wide transition-colors rounded-sm ${
                    selectedVenue === venue.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-foreground border-border hover:border-primary'
                  }`}
                >
                  {venue.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Galleries */}
      <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
        {venuesWithImages.length === 0 ? (
          <div className="text-center py-20">
            <Camera size={64} className="mx-auto mb-6 text-primary/20" />
            <h2 className="mb-4">Gallery Coming Soon</h2>
            <p className="text-foreground/60" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
              We're currently uploading our beautiful wedding photography. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-32">
            {filteredVenues.filter(v => v.images.length > 0).map((venue) => (
              <div key={venue.id} id={venue.id} className="scroll-mt-32">
                {/* Venue Header */}
                <div className="mb-12">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="mb-4">{venue.name}</h2>
                      <div className="flex items-center gap-2 text-foreground/60 mb-4 text-sm">
                        <MapPin size={16} />
                        <span>{venue.location}</span>
                      </div>
                      <p className="text-foreground/70 max-w-3xl" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                        {venue.description}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-foreground/40 text-sm">
                      <Camera size={18} />
                      <span>{venue.images.length} Photos</span>
                    </div>
                  </div>
                  
                  {/* SEO Keywords */}
                  <div className="flex flex-wrap gap-2 mt-6">
                    {venue.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="px-3 py-1 bg-accent text-foreground/60 text-sm rounded-sm"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Image Grid - 3 columns with 3:4 aspect ratio */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {venue.images.map((image) => (
                    <div
                      key={image.id}
                      className="group relative aspect-[3/4] overflow-hidden cursor-pointer bg-secondary"
                      onClick={() => setSelectedImage(image.src)}
                    >
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 text-white text-4xl hover:text-white/70 transition-colors"
          >
            ×
          </button>
          <img
            src={selectedImage}
            alt="Gallery image"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}