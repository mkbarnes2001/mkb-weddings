import { useState } from 'react';
import { ImageLightbox } from './ImageLightbox';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Zap } from 'lucide-react';

export function GalleryCreativeFlash() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Placeholder images for creative flash photography
  const flashImages = Array.from({ length: 12 }, (_, i) => ({
    id: `flash-${i + 1}`,
    src: '',
    alt: `Creative flash photography example ${i + 1}`,
  }));

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="pt-20 min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-20 px-6 md:px-20 bg-gradient-to-br from-primary to-primary/80 text-white">
        <div className="max-w-[1440px] mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent mb-6">
            <Zap size={32} className="text-primary" />
          </div>
          <h1 className="mb-6 text-white">Creative Flash Photography</h1>
          <p className="tagline text-white/90 max-w-3xl mx-auto" style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
            Bold, dramatic, and unforgettable moments illuminated with expert flash lighting
          </p>
        </div>
      </section>

      {/* About Flash Photography */}
      <section className="py-16 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="mb-6">Master of Flash Wedding Photography</h2>
          <div className="space-y-4 text-foreground/80" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            <p>
              Known as a master of flash wedding photography, MKB Weddings creates bold, vibrant, and dramatic 
              images that stand out. Our flash photography expertise is perfect for evening portraits, dark venues, 
              Irish weather conditions, and high-energy dance-floor shots.
            </p>
            <p>
              Using advanced off-camera flash techniques, we create striking editorial-style images with perfect 
              lighting regardless of the conditions. From moody atmospheric shots to bright vibrant portraits, 
              our flash work adds a unique artistic dimension to your wedding story.
            </p>
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-16 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {flashImages.map((image, index) => (
            <div
              key={image.id}
              onClick={() => openLightbox(index)}
              className="group relative aspect-[3/4] overflow-hidden rounded-sm cursor-pointer bg-primary/5"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
                <Zap size={48} className="text-primary/40 mb-4" />
                <p className="text-primary/60">Flash Example {index + 1}</p>
                <p className="text-xs text-primary/40 mt-2 px-4 text-center">Upload creative flash photos here</p>
              </div>
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
            </div>
          ))}
        </div>
      </section>

      {/* Why Flash Photography Section */}
      <section className="py-20 px-6 md:px-20 bg-accent">
        <div className="max-w-[1440px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-6">Why Choose Flash Photography?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Zap size={32} className="text-primary" />
              </div>
              <h3 className="mb-3">Perfect for Irish Weather</h3>
              <p className="text-foreground/80" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Don't let clouds or rain ruin your photos. Flash photography creates stunning images in any conditions.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Zap size={32} className="text-primary" />
              </div>
              <h3 className="mb-3">Dramatic Evening Portraits</h3>
              <p className="text-foreground/80" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Create magazine-worthy portraits after sunset with expertly crafted lighting that makes you shine.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Zap size={32} className="text-primary" />
              </div>
              <h3 className="mb-3">Dance Floor Energy</h3>
              <p className="text-foreground/80" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Capture the wild energy and joy of your reception with vibrant, colorful flash photography.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxOpen && (
        <ImageLightbox
          images={flashImages}
          currentIndex={currentImageIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setCurrentImageIndex}
        />
      )}
    </div>
  );
}