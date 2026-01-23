import { ArrowRight, Camera, Heart, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Helmet } from "react-helmet-async";

import heroImage1 from "figma:asset/56c087b2e44825658578c4eebea8003fc82789e5.png";
import heroImage2 from "figma:asset/f0c6a12bde87e175e2aadb88f75b83c7f4125e86.png";
import heroImage3 from "figma:asset/6595a05dfe41b8f2fc54e571acf9e9a24994d353.png";
import heroImage4 from "figma:asset/2018a530540d6cd532e764d8c4467195d61fe49a.png";
import heroImage5 from "figma:asset/e950f257bc4bd40951c0693e9b3f467dba9dfa80.png";

export function Home() {
  const heroSlides = [
    {
      image: heroImage1,
      alt: "Dramatic flash wedding photography – couple under umbrella at night",
    },
    {
      image: heroImage3,
      alt: "Wedding couple on beach – romantic portrait",
    },
    {
      image: heroImage4,
      alt: "Dramatic outdoor wedding portrait with flash photography",
    },
    {
      image: heroImage5,
      alt: "Elegant bride and groom portrait with bouquet",
    },
    {
      image: heroImage2,
      alt: "Bride and groom with rainbow on beach – Northern Ireland wedding photography",
    },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <>
      {/* ---------- SEO ---------- */}
      <Helmet>
        <title>Northern Ireland Wedding Photographer | MKB Weddings</title>
        <meta
          name="description"
          content="Relaxed, natural wedding photography across Northern Ireland, Donegal, Monaghan & Cavan. Candid moments, bold flash, and colourful images you’ll relive."
        />
      </Helmet>

      <div className="-mt-20">
        {/* ---------- Hero Carousel ---------- */}
        <section className="relative h-screen overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
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
                    ? "bg-accent scale-125"
                    : "bg-white/50 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Hero Content */}
          <div className="absolute inset-0 flex items-end pb-20 pointer-events-none">
            <div className="text-center text-white px-6 max-w-5xl mx-auto w-full pointer-events-auto">
              <h1
                className="tagline text-white mb-6"
                style={{ fontSize: "clamp(1.25rem, 3vw, 1.75rem)" }}
              >
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

        {/* ---------- Gallery / Stories ---------- */}
        <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link to="/gallery" className="group relative overflow-hidden aspect-[4/5] rounded-sm">
              <ImageWithFallback
                src={heroImage4}
                alt="Browse wedding photography gallery"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-10">
                <Camera size={40} className="text-white mb-4" />
                <h2 className="text-white mb-4">Gallery</h2>
                <p className="text-white/90 mb-6">
                  Browse our portfolio by venue, style and moments from real weddings.
                </p>
                <span className="inline-flex items-center gap-2 text-accent">
                  Explore Galleries <ArrowRight size={20} />
                </span>
              </div>
            </Link>

            <Link to="/blog" className="group relative overflow-hidden aspect-[4/5] rounded-sm">
              <ImageWithFallback
                src={heroImage3}
                alt="Wedding stories and reviews"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-10">
                <Heart size={40} className="text-white mb-4" />
                <h2 className="text-white mb-4">Stories & Reviews</h2>
                <p className="text-white/90 mb-6">
                  Real weddings, client reviews, venue guides and photography tips.
                </p>
                <span className="inline-flex items-center gap-2 text-accent">
                  Read More <ArrowRight size={20} />
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="py-32 px-6 md:px-20 relative overflow-hidden">
          <div className="absolute inset-0">
            <ImageWithFallback
              src={heroImage5}
              alt="Check availability for your wedding date"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-accent/80"></div>
          </div>

          <div className="relative max-w-5xl mx-auto text-center">
            <Award size={40} className="text-accent mx-auto mb-8" />
            <h2 className="mb-6 text-white">Let's Capture Your Special Day</h2>
            <p className="text-white/90 mb-12 max-w-2xl mx-auto">
              Limited dates available for 2026 & 2027. Get in touch to check availability.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-accent text-primary px-10 h-14 hover:bg-accent/90 transition-all inline-flex items-center gap-3 rounded-sm shadow-xl text-lg font-medium"
              >
                Check Availability <ArrowRight size={24} />
              </Link>
              <Link
                to="/packages"
                className="border-2 border-white/90 text-white px-10 h-14 hover:bg-white/10 transition-all inline-flex items-center gap-3 rounded-sm text-lg"
              >
                View Packages
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
