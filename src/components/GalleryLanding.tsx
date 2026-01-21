import { Link } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ChevronRight } from 'lucide-react';
import venueImage from 'figma:asset/4b4f26e7cf88fc98e5d685335cd0e537ad22acf3.png';
import creativeFlashImage from 'figma:asset/4e80a09ae14c9e2aaefa75a7ed64281f0bbc855b.png';
import momentsImage from 'figma:asset/f2c5f140202f18a23299f273bccbba6885f5bb2a.png';
import storiesImage from 'figma:asset/a4d9c41d478a42542f5eae424fde67c33f39b713.png';

export function GalleryLanding() {
  const mainTiles = [
    
    {
      title: 'Wedding Moments',
      link: '/gallery/moments',
      image: momentsImage,
      description: 'Explore wedding day highlights',
    },
    {
      title: 'Creative Flash',
      link: '/gallery/creative-flash',
      image: creativeFlashImage,
      description: 'Bold, dramatic flash photography',
    },
    {
      title: 'Stories & Reviews',
      link: '/blog',
      image: storiesImage,
      description: 'Real wedding love stories',
    },
    {
      title: 'Venues',
      link: '/gallery/venues',
      image: venueImage,
      description: 'Browse weddings by location',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* Main Navigation Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mainTiles.map((tile) => (
            <Link
              key={tile.title}
              to={tile.link}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg"
            >
              <ImageWithFallback
                src={tile.image}
                alt={tile.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <h2 className="text-white text-2xl md:text-3xl mb-2">{tile.title}</h2>
                <p className="text-white/90 text-lg mb-4">{tile.description}</p>
                <div className="flex items-center text-white">
                  <span className="text-sm uppercase tracking-wider">Explore</span>
                  <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
