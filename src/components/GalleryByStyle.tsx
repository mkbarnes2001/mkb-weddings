import { Link } from 'react-router-dom';
import { photographyStyles } from './GalleryData';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ChevronRight } from 'lucide-react';

export function GalleryByStyle() {
  const styleImages = {
    editorial: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800&q=80',
    documentary: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
    'flash-creative': 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&q=80',
    'fine-art': 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80',
    'light-vibrant': 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80',
    'moody-dramatic': 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80',
    'fun-playful': 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl mb-4">Browse by Style</h1>
          <p className="text-xl text-neutral-600">
            Discover different photography approaches and find your perfect aesthetic
          </p>
        </div>

        {/* Styles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photographyStyles.map((style) => (
            <Link
              key={style.id}
              to={`/gallery/style/${style.id}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg"
            >
              <ImageWithFallback
                src={styleImages[style.id as keyof typeof styleImages]}
                alt={style.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h2 className="text-white text-3xl mb-2">{style.name}</h2>
                <p className="text-white/90 mb-4">{style.description}</p>
                <div className="flex items-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm uppercase tracking-wider">View Gallery</span>
                  <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-2" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-16 bg-neutral-50 rounded-lg p-8 md:p-12">
          <h2 className="text-3xl mb-4">Finding Your Style</h2>
          <p className="text-lg text-neutral-600 mb-6">
            Every wedding is unique, and my photography adapts to your vision. Browse these
            style categories to see different approaches, but remember - your wedding day
            will naturally blend multiple styles as the story unfolds.
          </p>
          <Link
            to="/contact"
            className="inline-block bg-black text-white px-8 py-4 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Let's Discuss Your Vision
          </Link>
        </div>
      </div>
    </div>
  );
}
