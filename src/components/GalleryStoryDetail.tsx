import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar } from 'lucide-react';
import { featuredStories, initialVenues } from './GalleryData';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';
import { ImageLightbox } from './ImageLightbox';

export function GalleryStoryDetail() {
  const { storyId } = useParams();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const story = featuredStories.find((s) => s.id === storyId);
  const venue = story ? initialVenues.find((v) => v.id === story.venue) : null;

  if (!story) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-4">Story Not Found</h1>
          <Link to="/gallery/stories" className="text-neutral-600 hover:text-neutral-900">
            Back to Stories
          </Link>
        </div>
      </div>
    );
  }

  // Get images for this story
  const storyImages =
    venue?.images.filter((img) => img.story === story.id) || [];

  // Fallback images if no story images exist yet
  const displayImages =
    storyImages.length > 0
      ? storyImages
      : [
          {
            id: '1',
            src: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&q=80',
            alt: `${story.coupleName} ceremony`,
            venue: story.venue,
            moments: ['ceremony'],
            styles: ['fine-art'],
          },
          {
            id: '2',
            src: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80',
            alt: `${story.coupleName} couple portrait`,
            venue: story.venue,
            moments: ['couple-portraits'],
            styles: ['editorial'],
          },
          {
            id: '3',
            src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80',
            alt: `${story.coupleName} reception`,
            venue: story.venue,
            moments: ['reception'],
            styles: ['documentary'],
          },
        ];

  const heroImage =
    story.heroImage ||
    displayImages[0]?.src ||
    'https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80';

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[70vh] min-h-[500px]">
        <ImageWithFallback
          src={heroImage}
          alt={`${story.coupleName} wedding`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-16 w-full">
            <Link
              to="/gallery/stories"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Stories
            </Link>
            <h1 className="text-5xl md:text-7xl text-white mb-4">
              {story.coupleName}
            </h1>
            <div className="flex flex-wrap gap-6 text-white/90 text-lg mb-6">
              <span className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {story.venueName}
              </span>
              {story.date && (
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {story.date}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Story Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="prose prose-lg max-w-none mb-16">
          <p className="text-xl leading-relaxed">{story.description}</p>
        </div>

        {/* Photo Timeline Grid */}
        <div className="space-y-8 mb-16">
          {displayImages.map((image, index) => {
            // Vary the layout for visual interest
            const isWide = index % 3 === 0;

            return (
              <button
                key={image.id}
                onClick={() => setLightboxIndex(index)}
                className={`w-full overflow-hidden rounded-lg group cursor-pointer ${
                  isWide ? 'aspect-[16/9]' : 'aspect-[4/3]'
                }`}
              >
                <ImageWithFallback
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </button>
            );
          })}
        </div>

        {/* CTA Block */}
        <div className="bg-neutral-50 rounded-lg p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl mb-4">
            Getting married at {story.venueName}?
          </h2>
          <p className="text-lg text-neutral-600 mb-8">
            I'd love to hear about your plans and show you how I can capture your unique
            story at this beautiful venue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="inline-block bg-black text-white px-8 py-4 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Get in Touch
            </Link>
            <Link
              to={`/gallery/venue/${story.venue}`}
              className="inline-block bg-white text-black border-2 border-black px-8 py-4 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              View More from {story.venueName}
            </Link>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={displayImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
