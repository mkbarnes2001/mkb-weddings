import { ArrowRight, Camera, Heart, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import heroImage1 from 'figma:asset/56c087b2e44825658578c4eebea8003fc82789e5.png';
import heroImage2 from 'figma:asset/f0c6a12bde87e175e2aadb88f75b83c7f4125e86.png';
import heroImage3 from 'figma:asset/6595a05dfe41b8f2fc54e571acf9e9a24994d353.png';
import heroImage4 from 'figma:asset/2018a530540d6cd532e764d8c4467195d61fe49a.png';
import heroImage5 from 'figma:asset/e950f257bc4bd40951c0693e9b3f467dba9dfa80.png';

export function Home() {
  const heroSlides = [
    {
      image: heroImage1,
      alt: 'Dramatic flash wedding photography - couple under umbrella at night'
    },
    {
      image: heroImage3,
      alt: 'Wedding couple on beach - romantic portrait'
    },
    {
      image: heroImage4,
      alt: 'Dramatic outdoor wedding portrait with flash photography'
    },
    {
      image: heroImage5,
      alt: 'Elegant bride and groom portrait with bouquet'
    },
    {
      image: heroImage2,
      alt: 'Bride and groom with rainbow on beach - Northern Ireland wedding photography'
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <div className="-mt-20">
      {/* Hero Carousel Section */}
      <section className="relative h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <ImageWithFallback
              src={heroSlides[currentSlide].image}
              alt={heroSlides[currentSlide].alt}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/45"></div>
          </motion.div>
        </AnimatePresence>
        
        {/* Carousel Dots */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-accent scale-125'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        
        {/* Content Overlay */}
        <div className="absolute inset-0 flex items-end pb-20 pointer-events-none">
          <div className="text-center text-white px-6 max-w-5xl mx-auto w-full pointer-events-auto">
            <h1 className="tagline text-white mb-6" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
              Laugh Loud. Love Hard. Stories You'll Relive.
            </h1>
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-4 justify-center items-center mt-8">
              <Link
                to="/contact"
                className="bg-accent text-primary px-10 h-16 sm:h-14 hover:bg-accent/90 transition-all hover:scale-105 inline-flex items-center gap-3 rounded-sm shadow-xl text-lg font-medium min-w-[200px] justify-center"
              >
                Contact / Check Availability
              </Link>
              <Link
                to="/gallery"
                className="border-2 border-white/90 text-white px-10 h-16 sm:h-14 hover:bg-white/10 transition-all inline-flex items-center gap-3 rounded-sm text-lg min-w-[200px] justify-center"
              >
                View Portfolio
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery & Stories Blocks */}
      <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Gallery Block */}
          <Link to="/gallery" className="group relative overflow-hidden aspect-[4/5] rounded-sm">
            <ImageWithFallback
              src={heroImage4}
              alt="View our wedding photography gallery"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-10">
              <div className="transform transition-transform duration-500 group-hover:translate-y-[-8px]">
                <Camera size={40} className="text-white mb-4" />
                <h2 className="text-white mb-4">Gallery</h2>
                <p className="text-white/90 mb-6" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
                  Browse our portfolio by venue, style, and moments. Discover hundreds of real weddings across Northern Ireland.
                </p>
                <span className="inline-flex items-center gap-2 text-accent group-hover:gap-3 transition-all">
                  Explore Galleries
                  <ArrowRight size={20} />
                </span>
              </div>
            </div>
          </Link>

          {/* Stories & Reviews Block */}
          <Link to="/blog" className="group relative overflow-hidden aspect-[4/5] rounded-sm">
            <ImageWithFallback
              src={heroImage3}
              alt="Read our wedding stories and reviews"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-10">
              <div className="transform transition-transform duration-500 group-hover:translate-y-[-8px]">
                <Heart size={40} className="text-white mb-4" />
                <h2 className="text-white mb-4">Stories & Reviews</h2>
                <p className="text-white/90 mb-6" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
                  Dive into real wedding stories, client reviews, photography tips, venue guides, and behind-the-scenes insights.
                </p>
                <span className="inline-flex items-center gap-2 text-accent group-hover:gap-3 transition-all">
                  Read More
                  <ArrowRight size={20} />
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Why Choose MKB */}
      <section className="py-20 bg-accent">
        <div className="px-6 md:px-20 max-w-[1440px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-6" style={{ fontFamily: 'Inter, sans-serif', fontWeight: '400' }}></h2>
            <p className="text-foreground/80 max-w-4xl mx-auto" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
              Capturing real, natural moments with energy, emotion and none of that stiff, awkward posing.
            </p>
          </div>

         <div className="max-w-4xl mx-auto space-y-6 text-center text-foreground/80 leading-relaxed">
            <p>
              My approach is all about real moments over awkward poses, capturing natural emotion, big energy, and the story of your day as it actually unfolds.
            </p>
            <p>
              I combine candid documentary coverage with bold flash photography to create vibrant, striking images that stand out, especially in dark venues, wild Irish weather, and packed dance floors.
            </p>
            <p>
              With hundreds of weddings photographed across Northern Ireland and Ireland, couples choose MKB Weddings for colourful imagery, relaxed direction, and a professional, reliable experience from enquiry to delivery.
            </p>
            <p>
              Looking for a fun, creative Northern Ireland wedding photographer who delivers natural, unforgettable wedding photos? Let’s do this.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 md:px-20 relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <ImageWithFallback
            src={heroImage5}
            alt="Check availability for your wedding date"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-accent/80"></div>
        </div>
        
        {/* Content */}
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/20 backdrop-blur-sm mb-8">
            <Award size={40} className="text-accent" />
          </div>
          <h2 className="mb-6 text-white">Let's Capture Your Special Day</h2>
          <p className="text-white/90 mb-12 max-w-2xl mx-auto" style={{ fontSize: '1.25rem', lineHeight: '1.6' }}>
            Limited dates available for 2026 & 2027. Get in touch to check availability and discuss your wedding photography needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/contact"
              className="bg-accent text-primary px-10 h-14 hover:bg-accent/90 transition-all hover:scale-105 inline-flex items-center gap-3 rounded-sm shadow-xl text-lg font-medium"
            >
              Check Availability
              <ArrowRight size={24} />
            </Link>
            <Link
              to="/packages"
              className="border-2 border-white/90 text-white px-10 h-14 hover:bg-white/10 transition-all inline-flex items-center gap-3 rounded-sm text-lg"
            >
              View Packages
            </Link>
          </div>
          
          {/* Trust Indicators */}
          <div className="mt-16 pt-12 border-t border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-accent mb-2" style={{ fontSize: '2rem', fontWeight: '600' }}>200+</div>
                <p className="text-white/80">Weddings Captured</p>
              </div>
              <div className="text-center">
                <div className="text-accent mb-2" style={{ fontSize: '2rem', fontWeight: '600' }}>50+</div>
                <p className="text-white/80">Venues Covered</p>
              </div>
              <div className="text-center">
                <div className="text-accent mb-2" style={{ fontSize: '2rem', fontWeight: '600' }}>100%</div>
                <p className="text-white/80">Client Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
