import { Link } from 'react-router-dom';
import { featuredStories } from './GalleryData';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapPin, ChevronRight } from 'lucide-react';

export function GalleryFeaturedStories() {
  const storyImages = {
    'emma-simon-lusty-beg': 'https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1200&q=80',
    'jenny-gerard-killeavy': 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80',
    'pennie-adam-orange-tree': 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=80',
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl mb-4">Featured Wedding Stories</h1>
          <p className="text-xl text-neutral-600">
            Real couples, real love, unforgettable moments
          </p>
        </div>

        {/* Stories Grid */}
        <div className="space-y-12">
          {featuredStories.map((story, index) => {
            const isEven = index % 2 === 0;
            const storyImage =
              story.heroImage ||
              storyImages[story.id as keyof typeof storyImages];

            return (
              <Link
                key={story.id}
                to={`/gallery/story/${story.id}`}
                className={`group grid grid-cols-1 ${
                  isEven ? 'lg:grid-cols-2' : 'lg:grid-cols-2'
                } gap-8 items-center`}
              >
                {/* Image */}
                <div
                  className={`aspect-[4/3] overflow-hidden rounded-lg ${
                    isEven ? 'lg:order-1' : 'lg:order-2'
                  }`}
                >
                  <ImageWithFallback
                    src={storyImage}
                    alt={`${story.coupleName} wedding`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>

                {/* Content */}
                <div className={isEven ? 'lg:order-2' : 'lg:order-1'}>
                  <h2 className="text-4xl md:text-5xl mb-4 group-hover:text-neutral-600 transition-colors">
                    {story.coupleName}
                  </h2>
                  <p className="text-xl text-neutral-600 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {story.venueName}
                  </p>
                  <p className="text-lg text-neutral-700 mb-6 leading-relaxed">
                    {story.description}
                  </p>
                  <div className="inline-flex items-center text-neutral-900 group-hover:gap-4 transition-all">
                    <span className="uppercase tracking-wider text-sm">Read Their Story</span>
                    <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-neutral-50 rounded-lg p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl mb-4">Want to Be Featured?</h2>
          <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
            Every wedding tells a unique story. Let's create something beautiful together
            and share your love story with the world.
          </p>
          <Link
            to="/contact"
            className="inline-block bg-black text-white px-8 py-4 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Get in Touch
          </Link>
        </div>
      </div>
    </div>
  );
}
