import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, Camera, Users, PartyPopper, Sparkles, Palette } from 'lucide-react';
import { initialVenues, moments } from './GalleryData';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ImageLightbox } from './ImageLightbox';

// Icon mapping for each moment
const momentIcons = {
  'getting-ready': Sparkles,
  'ceremony': Heart,
  'couple-portraits': Camera,
  'family-bridal-party': Users,
  'reception-party': PartyPopper,
  'details-decor': Palette,
};

// Detailed descriptions for each moment
const momentDetails = {
  'getting-ready': {
    title: 'Getting Ready',
    tagline: 'The anticipation and excitement before you say "I do"',
    about: [
      'The getting ready moments are some of the most intimate and emotional parts of your wedding day. From the nervous excitement to the laughter with your closest friends and family, these are the moments that set the tone for everything to come.',
      'We capture the details, the emotions, and the quiet moments of reflection as you prepare to become husband and wife. These images tell the story of your morning and all the love and support surrounding you.',
    ],
    whyItMatters: [
      {
        title: 'Emotional Storytelling',
        description: 'Capture the raw emotions and excitement as your day begins',
      },
      {
        title: 'Important Details',
        description: 'Your dress, shoes, rings, and all those beautiful details you\'ve chosen',
      },
      {
        title: 'Special Moments',
        description: 'Time with your parents, bridesmaids, and loved ones before the ceremony',
      },
    ],
  },
  'ceremony': {
    title: 'Ceremony',
    tagline: 'The moment you promise forever to each other',
    about: [
      'Your wedding ceremony is the heart of your day—the moment you\'ve been planning for and dreaming about. From the first look as you walk down the aisle to the tears, laughter, and joy of saying "I do", we capture every precious second.',
      'These are the images you\'ll treasure forever: the look on your partner\'s face, the happy tears, the first kiss, and the celebration as you walk back down the aisle as newlyweds.',
    ],
    whyItMatters: [
      {
        title: 'The First Look',
        description: 'Capture the emotion when you see each other for the first time',
      },
      {
        title: 'The Vows',
        description: 'Document the promises you make to each other',
      },
      {
        title: 'The Celebration',
        description: 'Pure joy as you\'re announced as married',
      },
    ],
  },
  'couple-portraits': {
    title: 'Couple Portraits',
    tagline: 'Just the two of you, finally alone together',
    about: [
      'After the ceremony, we steal you away for some time together—just the two of you as newlyweds. This is your chance to breathe, to take it all in, and to celebrate together before the party begins.',
      'Whether in dramatic landscapes, charming streets, or intimate garden settings, we create stunning portraits that showcase your love and the beauty of your wedding day.',
    ],
    whyItMatters: [
      {
        title: 'Magazine-Worthy Images',
        description: 'Editorial-style portraits that are truly frameable art',
      },
      {
        title: 'Natural Connection',
        description: 'Authentic moments between the two of you',
      },
      {
        title: 'Beautiful Locations',
        description: 'Making the most of your venue\'s stunning scenery',
      },
    ],
  },
  'family-bridal-party': {
    title: 'Family and Bridal Party',
    tagline: 'Celebrating with the people who matter most',
    about: [
      'Your family and friends have supported you throughout your journey, and your wedding day is a chance to celebrate with them. These group photos are treasured memories that you\'ll look back on for years to come.',
      'From formal family portraits to fun bridal party shots, we make sure everyone is included and that the experience is relaxed and enjoyable for all.',
    ],
    whyItMatters: [
      {
        title: 'Family Traditions',
        description: 'Multi-generational photos that become family heirlooms',
      },
      {
        title: 'Friendship Celebrations',
        description: 'Fun, natural moments with your bridesmaids and groomsmen',
      },
      {
        title: 'Everyone Included',
        description: 'Making sure no important relationship is forgotten',
      },
    ],
  },
  'reception-party': {
    title: 'Reception and Party',
    tagline: 'Dance, celebrate, and make unforgettable memories',
    about: [
      'The reception is where your wedding day truly comes alive. From emotional speeches to the first dance, cake cutting, and wild dancing, this is where the magic happens and your celebration reaches its peak.',
      'We capture every laugh, every tear, every embrace, and every moment of pure joy as you party with everyone you love. These are the images that will make you smile for years to come.',
    ],
    whyItMatters: [
      {
        title: 'High Energy Moments',
        description: 'Vibrant dance floor photography that captures the party spirit',
      },
      {
        title: 'Emotional Speeches',
        description: 'The tears, laughter, and love shared by family and friends',
      },
      {
        title: 'Candid Joy',
        description: 'Real moments of happiness and celebration',
      },
    ],
  },
  'details-decor': {
    title: 'Details and Decor',
    tagline: 'The little things that make your day uniquely yours',
    about: [
      'You\'ve spent months planning every detail of your wedding—from the flowers to the stationery, the table settings to the unique touches that reflect your personality. We make sure all these beautiful details are documented.',
      'These detail shots are more than just pretty pictures; they tell the story of your style, your taste, and all the thought you put into creating your perfect day.',
    ],
    whyItMatters: [
      {
        title: 'Your Personal Style',
        description: 'Document the aesthetic choices that reflect who you are',
      },
      {
        title: 'Designer Collaborations',
        description: 'Showcase the work of your talented vendors',
      },
      {
        title: 'Memory Triggers',
        description: 'Little details that bring back big memories',
      },
    ],
  },
};

export function GalleryMomentDetail() {
  const { momentId } = useParams();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const moment = moments.find((m) => m.id === momentId);
  const details = momentDetails[momentId as keyof typeof momentDetails];
  const IconComponent = momentIcons[momentId as keyof typeof momentIcons] || Camera;

  // Get all images that are tagged with this moment
  const momentImages = useMemo(() => {
    if (!moment) return [];

    const images: Array<{ id: string; src: string; alt: string; venueName: string; venueId: string }> = [];
    
    initialVenues.forEach((venue) => {
      venue.images.forEach((image) => {
        if (image.moments?.includes(momentId || '')) {
          images.push({
            id: image.id,
            src: image.src,
            alt: image.alt,
            venueName: venue.name,
            venueId: venue.id,
          });
        }
      });
    });

    return images;
  }, [moment, momentId]);

  if (!moment || !details) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-4">Moment Not Found</h1>
        </div>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="pt-20 min-h-screen bg-white">
      {/* Hero Section with Image Background */}
      <section className="relative py-32 px-6 md:px-20 overflow-hidden">
        {/* Hero Images Grid */}
        {momentImages.length > 0 ? (
          <div className="absolute inset-0 grid grid-cols-3 gap-1">
            {momentImages.slice(0, 6).map((image, index) => (
              <div key={image.id} className="relative h-full">
                <ImageWithFallback
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {/* Fill remaining slots if less than 6 images */}
            {momentImages.length < 6 && Array.from({ length: 6 - momentImages.length }).map((_, index) => (
              <div key={`placeholder-${index}`} className="relative h-full bg-primary/10" />
            ))}
          </div>
        ) : (
          // Gradient fallback if no images
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        )}
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Content */}
        <div className="relative max-w-[1440px] mx-auto text-center text-white z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent mb-6">
            <IconComponent size={32} className="text-primary" />
          </div>
          <h1 className="mb-6 text-white">{details.title}</h1>
          <p className="tagline text-white/90 max-w-3xl mx-auto" style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
            {details.tagline}
          </p>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="space-y-4 text-foreground/80" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            {details.about.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="pb-16 px-6 md:px-20 max-w-[1440px] mx-auto">
        {momentImages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {momentImages.map((image, index) => (
              <div
                key={image.id}
                onClick={() => openLightbox(index)}
                className="group relative aspect-[3/4] overflow-hidden rounded-sm cursor-pointer"
              >
                <ImageWithFallback
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Venue Name Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm">{image.venueName}</p>
                </div>
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="relative aspect-[3/4] overflow-hidden rounded-sm bg-primary/5"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-primary/20">
                  <IconComponent size={48} className="text-primary/40 mb-4" />
                  <p className="text-primary/60">Coming Soon</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Why This Moment Matters Section */}
      <section className="py-20 px-6 md:px-20 bg-accent">
        <div className="max-w-[1440px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-6">Why {details.title} Matter</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {details.whyItMatters.map((item, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <IconComponent size={32} className="text-primary" />
                </div>
                <h3 className="mb-3">{item.title}</h3>
                <p className="text-foreground/80" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxOpen && momentImages.length > 0 && (
        <ImageLightbox
          images={momentImages}
          currentIndex={currentImageIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setCurrentImageIndex}
        />
      )}
    </div>
  );
}