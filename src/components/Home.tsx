import { ArrowRight, Camera, Heart, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Helmet } from "react-helmet-async";

export function Home() {
  const heroSlides = [
    {
      desktop:
        "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Desktop/MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100_2000.webp",
      mobile:
        "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100_2000_1200.webp",
      alt: "Northern Ireland wedding photography – Killeavy Castle couple portraits",
    },
    {
      desktop:
        "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Desktop/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_2000.webp",
      mobile:
        "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_2000_1200.webp",
      alt: "Orange Tree House wedding photography – couple portraits",
    },
    {
      desktop:
        "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Desktop/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-4_2000.webp",
      mobile:
        "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-4_2000_1200.webp",
      alt: "Slieve Donard Hotel wedding photography – couple portrait",
    },
    {
      desktop:
        "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Desktop/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_2000.webp",
      mobile:
        "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_2000_1200.webp",
      alt: "Slieve Donard Hotel wedding photography – bridal portrait",
    },
    {
      desktop:
        "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Desktop/mkb-weddings-rossharbour-resort-wedding-photography-363_2000.webp",
      mobile:
        "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/mkb-weddings-rossharbour-resort-wedding-photography-363_2000_1200.webp",
      alt: "Ross Harbour Resort wedding photography – couple portrait",
    },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const canonical = "https://www.mkbweddings.co.uk/";
  const metaTitle =
    "Northern Ireland Wedding Photographer | Belfast & Ireland | MKB Weddings";
  const metaDescription =
    "Cinematic Northern Ireland wedding photographer based in Belfast, covering weddings across Northern Ireland and Ireland. Natural, timeless photography capturing real moments and stunning venues.";

  const ogImage =
    heroSlides[0].desktop;

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />

        <link rel="canonical" href={canonical} />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={ogImage} />

        {/* 🔥 Preload first hero for LCP boost */}
        <link rel="preload" as="image" href={heroSlides[0].desktop} />
        <link
          rel="preload"
          as="image"
          href={heroSlides[0].mobile}
          media="(max-width: 768px)"
        />
      </Helmet>

      <div className="-mt-20">
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
              <picture>
                <source
                  media="(max-width: 768px)"
                  srcSet={heroSlides[currentSlide].mobile}
                />
                <img
                  src={heroSlides[currentSlide].desktop}
                  alt={heroSlides[currentSlide].alt}
                  className="w-full h-full object-cover object-center"
                  loading={currentSlide === 0 ? "eager" : "lazy"}
                  fetchPriority={currentSlide === 0 ? "high" : "auto"}
                  decoding="async"
                />
              </picture>

              <div className="absolute inset-0 bg-black/45" />
            </motion.div>
          </AnimatePresence>

          {/* Carousel Dots */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-4">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? "bg-accent scale-110"
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
      </div>
    </>
  );
}