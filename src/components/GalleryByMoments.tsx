import { Link } from 'react-router-dom';
import { moments } from './GalleryData';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ChevronRight } from 'lucide-react';
import gettingReadyImage from 'figma:asset/fb84c4cbee696343b417ad4224fe2d9c9960ad49.png';
import ceremonyImage from 'figma:asset/824b08dfe2d92a128003e19c7f69fd10d28b2015.png';
import couplePortraitImage from 'figma:asset/9caf1b2bbff1bbb43c7fe20f8da33be74aa354be.png';
import bridalPartyImage from 'figma:asset/7bd3106c0b8c5268adbbc2617f84fb2440375cf1.png';
import receptionImage from 'figma:asset/e2462e6839aea3c2d398e8bf894093d9d55e2977.png';
import detailsDecorImage from 'figma:asset/7ec5ca5baceba029305e6928146e8f7050cf2009.png';

export function GalleryByMoments() {
  const momentImages = {
    'getting-ready': gettingReadyImage,
    ceremony: ceremonyImage,
    'couple-portraits': couplePortraitImage,
    'family-bridal-party': bridalPartyImage,
    'reception-party': receptionImage,
    'details-decor': detailsDecorImage,
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        {/* Moments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moments.map((moment) => (
            <Link
              key={moment.id}
              to={`/gallery/moment/${moment.id}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg"
            >
              <ImageWithFallback
                src={momentImages[moment.id as keyof typeof momentImages]}
                alt={moment.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h2 className="text-white text-2xl mb-2">{moment.name}</h2>
                <p className="text-white/90 text-sm mb-3">{moment.description}</p>
                <div className="flex items-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm uppercase tracking-wider">View Gallery</span>
                  <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-2" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}