import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryImage, moments, photographyStyles } from './GalleryData';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ImageLightboxProps {
  images: GalleryImage[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const currentImage = images[currentIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      }
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        onNavigate(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, onClose, onNavigate]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Get moment names
  const momentNames =
    currentImage.moments
      ?.map((m) => moments.find((moment) => moment.id === m)?.name)
      .filter(Boolean) || [];

  // Get style names
  const styleNames =
    currentImage.styles
      ?.map((s) => photographyStyles.find((style) => style.id === s)?.name)
      .filter(Boolean) || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
        aria-label="Close lightbox"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Previous Button */}
      {currentIndex > 0 && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* Next Button */}
      {currentIndex < images.length - 1 && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          aria-label="Next image"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Main Image Container */}
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-16">
        {/* Image */}
        <div className="relative max-w-7xl max-h-[calc(100vh-200px)] w-full flex items-center justify-center">
          <ImageWithFallback
            src={currentImage.src}
            alt={currentImage.alt}
            className="max-w-full max-h-full w-auto h-auto object-contain"
          />
        </div>

        {/* Image Info */}
        <div className="mt-8 max-w-4xl w-full text-white">
          <div className="flex flex-wrap gap-2 mb-2">
            {/* Venue Tag */}
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              Venue
            </span>

            {/* Moment Tags */}
            {momentNames.map((name) => (
              <span
                key={name}
                className="px-3 py-1 bg-white/20 rounded-full text-sm"
              >
                {name}
              </span>
            ))}

            {/* Style Tags */}
            {styleNames.map((name) => (
              <span
                key={name}
                className="px-3 py-1 bg-white/20 rounded-full text-sm"
              >
                {name}
              </span>
            ))}

            {/* Story Tag */}
            {currentImage.story && (
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                Story
              </span>
            )}
          </div>

          {/* Navigation Info */}
          <p className="text-white/60 text-sm">
            {currentIndex + 1} / {images.length}
          </p>
        </div>
      </div>
    </div>
  );
}
