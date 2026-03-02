import { ArrowRight, Camera, Heart, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Helmet } from "react-helmet-async";

/* ---------------- HERO CAROUSEL IMAGES (R2 Optimised) ---------------- */

type HeroSlide = {
  desktop: string;
  mobile: string;
  alt: string;
};

const HERO_SLIDES: HeroSlide[] = [
  {
    desktop:
      "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Desktop/MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100_2000.webp",
    mobile:
      "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100_2000_1200.webp",
    alt: "Northern Ireland wedding photography – Killeavy Castle",
  },
  {
    desktop:
      "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Desktop/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_2000.webp",
    mobile:
      "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_2000_1200.webp",
    alt: "Wedding photography – Orange Tree House",
  },
  {
    desktop:
      "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Desktop/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-4_2000.webp",
    mobile:
      "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-4_2000_1200.webp",
    alt: "Wedding photography – Slieve Donard Hotel",
  },
  {
    desktop:
      "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Desktop/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_2000.webp",
    mobile:
      "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_2000_1200.webp",
    alt: "Wedding photography – Slieve Donard portrait",
  },
  {
    desktop:
      "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Desktop/mkb-weddings-rossharbour-resort-wedding-photography-363_2000.webp",
    mobile:
      "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/mkb-weddings-rossharbour-resort-wedding-photography-363_2000_1200.webp",
    alt: "Wedding photography – Ross Harbour Resort",
  },
];

/* ---------------- REPLACED STATIC IMAGES ---------------- */

// Replaced heroImage4 (Gallery tile)
const GALLERY_IMAGE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/mkb-weddings-irish-wedding-photographer-ballyscullion-park-bellaghy-photography-447_2000_1200.webp";

// Replaced heroImage3 (Blog tile)
const BLOG_IMAGE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_2000_1200.webp";

// Replaced heroImage5 (CTA background)
const CTA_IMAGE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/MKB-weddings-mkb-photography_Northern_Ireland_Wedding_Photography_Galgorm_Manor_wedding_photography_Galgorm_resort_wedding_photographer-Full-res-256_2000_1200.webp";

/* ---------------- COMPONENT ---------------- */

export function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const canonical = "https://www.mkbweddings.co.uk/";
  const metaTitle =
    "Northern Ireland Wedding Photographer | Belfast & Ireland | MKB Weddings";
  const metaDescription =
    "Cinematic Northern Ireland wedding photographer based in Belfast, covering weddings across Northern Ireland and Ireland. Natural, timeless photography capturing real moments and stunning venues.";

  const ogImage = HERO_SLIDES[0].desktop;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "MKB Weddings",
    url: canonical,
    image: ogImage,
    telephone: "+447546456077",
    address: {
      "@type": "PostalAddress",
      addressCountry: "GB",
      addressRegion: "Northern Ireland",
    },
  };

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonical} />
        <link rel="preload" as="image" href={HERO_SLIDES[0].desktop} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="-mt-20">
        {/* ---------------- HERO ---------------- */}
        <section className="relative h-screen overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSlide}
              src={HERO_SLIDES[currentSlide].desktop}
              alt={HERO_SLIDES[currentSlide].alt}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              loading={currentSlide === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </AnimatePresence>

          <div className="absolute inset-0 bg-black/45" />

          <div className="absolute inset-0 flex items-end pb-20">
            <div className="text-center text-white px-6 max-w-5xl mx-auto w-full">
              <h1 className="tagline mb-6">
                Laugh Loud. Love Hard. Stories You'll Relive.
              </h1>

              <div className="flex flex-col sm:flex-row gap-6 justify-center mt-8">
                <Link
                  to="/contact"
                  className="bg-accent text-primary px-10 h-16 sm:h-14 inline-flex items-center justify-center rounded-sm shadow-xl text-lg font-medium"
                >
                  Contact / Check Availability
                </Link>

                <Link
                  to="/gallery"
                  className="border-2 border-white text-white px-10 h-16 sm:h-14 inline-flex items-center justify-center rounded-sm text-lg"
                >
                  View Portfolio
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- GALLERY TILE ---------------- */}
        <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link to="/gallery" className="group relative overflow-hidden aspect-[4/5]">
              <img
                src={GALLERY_IMAGE}
                alt="Browse wedding photography gallery"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-10 text-white">
                <Camera size={40} className="mb-4" />
                <h2 className="text-2xl font-serif mb-4">Gallery</h2>
                <p>Browse our portfolio by venue, style and real weddings.</p>
              </div>
            </Link>

            <Link to="/blog" className="group relative overflow-hidden aspect-[4/5]">
              <img
                src={BLOG_IMAGE}
                alt="Wedding stories and reviews"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-10 text-white">
                <Heart size={40} className="mb-4" />
                <h2 className="text-2xl font-serif mb-4">Stories & Reviews</h2>
                <p>Real weddings, venue guides and client reviews.</p>
              </div>
            </Link>
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="py-32 px-6 md:px-20 relative overflow-hidden">
          <img
            src={CTA_IMAGE}
            alt="Check availability for your wedding date"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-accent/80" />

          <div className="relative max-w-5xl mx-auto text-center text-white">
            <Award size={40} className="mx-auto mb-8 text-accent" />
            <h2 className="mb-6">Let's Capture Your Special Day</h2>
            <p className="mb-12">
              Limited dates available for 2026 & 2027. Get in touch to check availability.
            </p>

            <Link
              to="/contact"
              className="bg-accent text-primary px-10 h-14 inline-flex items-center justify-center rounded-sm shadow-xl text-lg font-medium"
            >
              Check Availability <ArrowRight size={24} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}