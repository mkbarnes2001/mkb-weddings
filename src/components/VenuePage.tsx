import { ArrowRight, MapPin } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { venues } from './Venues';

interface VenuePageProps {
  venueSlug: string;
  onNavigate: (page: string, param?: string) => void;
}

export function VenuePage({ venueSlug, onNavigate }: VenuePageProps) {
  const venue = venues.find(v => v.slug === venueSlug);

  if (!venue) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center px-6">
          <h2 className="mb-4">Venue Not Found</h2>
          <button
            onClick={() => onNavigate('venues')}
            className="text-primary hover:underline"
          >
            ← Back to All Venues
          </button>
        </div>
      </div>
    );
  }

  // Placeholder images for the venue gallery
  const galleryImages = [
    "https://images.unsplash.com/photo-1519167758-8e71c87a3d44?w=800",
    "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800",
    "https://images.unsplash.com/photo-1522673607211-8c29668e9a93?w=800",
    "https://images.unsplash.com/photo-1591604129853-b8d6d4e665cf?w=800",
    "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800"
  ];

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px]">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={galleryImages[0]}
            alt={`Wedding at ${venue.name}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <div className="relative h-full flex items-center justify-center px-6">
          <div className="text-center text-white max-w-4xl">
            <button
              onClick={() => onNavigate('venues')}
              className="text-white/80 hover:text-white mb-4 inline-flex items-center gap-2 text-sm"
            >
              ← Back to All Venues
            </button>
            <h1 className="text-white mb-4">{venue.name}</h1>
            <div className="flex items-center justify-center gap-2 text-white/90 mb-6">
              <MapPin size={20} />
              <span className="text-lg">{venue.location}</span>
            </div>
            {venue.featured && (
              <span className="inline-block bg-primary text-white px-4 py-2 rounded-sm text-sm">
                Recommended Supplier
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="mb-12">
          <h2 className="mb-6">Real Weddings at {venue.name}</h2>
          <p className="text-foreground/60 max-w-3xl" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            Browse our portfolio of weddings photographed at this stunning venue. Each wedding showcases our 
            signature flash photography style and creative approach to capturing your special day.
          </p>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {galleryImages.map((image, index) => (
            <div key={index} className="group relative overflow-hidden aspect-[3/4] rounded-sm">
              <ImageWithFallback
                src={image}
                alt={`Wedding photo ${index + 1} at ${venue.name}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          ))}
        </div>

        {/* Wedding Styles at this Venue */}
        <div className="mb-16">
          <h3 className="mb-6">Wedding Styles at {venue.name}</h3>
          <div className="flex flex-wrap gap-3">
            {venue.categories.map((category) => (
              <button
                key={category}
                onClick={() => onNavigate('categories', category.toLowerCase().replace(/\s+/g, '-'))}
                className="px-6 py-3 bg-accent border border-border hover:border-primary hover:shadow-md transition-all rounded-sm"
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Venue Description */}
        <div className="max-w-4xl mx-auto bg-accent p-8 rounded-sm mb-16">
          <h3 className="mb-4">About Photographing Weddings at {venue.name}</h3>
          <p className="text-foreground/70 mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
            {venue.name} in {venue.location} is one of Northern Ireland's premier wedding venues, 
            and we're {venue.featured ? 'proud to be a recommended supplier for this exceptional location' : 'experienced in photographing weddings at this beautiful venue'}. 
            The venue offers stunning opportunities for both indoor and outdoor photography, and our flash photography expertise 
            ensures beautiful, vibrant images regardless of weather conditions.
          </p>
          <p className="text-foreground/70" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
            As an experienced {venue.name} wedding photographer, I know all the best spots for couple portraits, 
            group photos, and creative shots that showcase the unique character of this venue. From the ceremony 
            to the dance floor, I capture every moment with a blend of documentary storytelling and artistic vision.
          </p>
        </div>

        {/* Related Venues */}
        <div>
          <h3 className="mb-6">Other Venues You Might Like</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {venues
              .filter(v => v.slug !== venueSlug && v.region === venue.region)
              .slice(0, 3)
              .map((relatedVenue) => (
                <button
                  key={relatedVenue.slug}
                  onClick={() => onNavigate('venue', relatedVenue.slug)}
                  className="group text-left p-6 border border-border hover:border-primary hover:shadow-lg transition-all rounded-sm bg-white"
                >
                  <h4 className="mb-2 group-hover:text-primary transition-colors">{relatedVenue.name}</h4>
                  <p className="text-sm text-foreground/60 mb-4">{relatedVenue.location}</p>
                  <div className="flex items-center gap-2 text-primary text-sm group-hover:gap-3 transition-all">
                    View Gallery <ArrowRight size={16} />
                  </div>
                </button>
              ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-20 bg-gradient-to-br from-secondary to-accent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="mb-6">Getting Married at {venue.name}?</h2>
          <p className="text-foreground/60 mb-8 max-w-2xl mx-auto" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            Let's chat about your wedding day. As {venue.featured ? 'a recommended supplier' : 'an experienced photographer'} for {venue.name}, 
            I'd love to help you capture your celebration beautifully.
          </p>
          <button
            onClick={() => onNavigate('contact')}
            className="bg-primary text-white px-10 h-12 hover:bg-primary/90 transition-colors inline-flex items-center gap-2 rounded-sm"
          >
            Check Availability
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
}
