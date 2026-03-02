import { ArrowRight, Camera, Heart, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Helmet } from "react-helmet-async";

/**
 * NOTE:
 * - All figma PNG imports removed ✅
 * - Hero uses <picture> with mobile/desktop sources ✅
 * - Preload first hero image (mobile + desktop) ✅
 * - Keeps all schema + page sections exactly as before ✅
 */

type HeroSlide = {
  desktop: string;
  mobile: string;
  alt: string;
};

function HeroPicture({
  desktopSrc,
  mobileSrc,
  alt,
  fetchPriority,
  loading,
}: {
  desktopSrc: string;
  mobileSrc: string;
  alt: string;
  fetchPriority?: "high" | "low" | "auto";
  loading?: "eager" | "lazy";
}) {
  return (
    <picture>
      {/* Mobile first */}
      <source media="(max-width: 768px)" srcSet={mobileSrc} />
      <source media="(min-width: 769px)" srcSet={desktopSrc} />
      <img
        src={desktopSrc}
        alt={alt}
        className="w-full h-full object-cover object-center"
        loading={loading}
        decoding="async"
        // @ts-expect-error - fetchPriority is supported in modern browsers but not always in TS DOM typings
        fetchPriority={fetchPriority}
      />
    </picture>
  );
}

export function Home() {
  // ------------------------------------------------------------
  // HERO SLIDES (R2 WebP) — mobile + desktop variants
  // ------------------------------------------------------------
  const heroSlides: HeroSlide[] = useMemo(
    () => [
      {
        desktop:
          "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Desktop/MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100_2000.webp",
        mobile:
          "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100_2000_1200.webp",
        alt: "Northern Ireland wedding photography – couple portrait at Killeavy Castle",
      },
      {
        desktop:
          "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Desktop/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_2000.webp",
        mobile:
          "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_2000_1200.webp",
        alt: "Wedding couple portrait – Orange Tree House Greyabbey",
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
        alt: "Wedding photography – Slieve Donard Hotel Newcastle",
      },
      {
        desktop:
          "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Desktop/mkb-weddings-rossharbour-resort-wedding-photography-363_2000.webp",
        mobile:
          "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/mkb-weddings-rossharbour-resort-wedding-photography-363_2000_1200.webp",
        alt: "Ross Harbour Resort wedding photography – couple portrait",
      },
    ],
    []
  );

  // ------------------------------------------------------------
  // Replace remaining figma PNGs (Hero 3/4/5 on cards + CTA)
  // as per your exact URLs
  // ------------------------------------------------------------
  const galleryCardImage =
    "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/mkb-weddings-irish-wedding-photographer-ballyscullion-park-bellaghy-photography-447_2000_1200.webp";

  const storiesCardImage =
    "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_2000_1200.webp";

  const ctaBgImage =
    "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/Hero/Mobile/MKB-weddings-mkb-photography_Northern_Ireland_Wedding_Photography_Galgorm_Manor_wedding_photography_Galgorm_resort_wedding_photographer-Full-res-256_2000_1200.webp";

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Preload the *rest* of the hero slides after first paint (helps subsequent slides without hurting LCP)
  useEffect(() => {
    const run = () => {
      for (let i = 1; i < heroSlides.length; i++) {
        const img = new Image();
        img.decoding = "async";
        img.src = heroSlides[i].mobile; // mobile is the bottleneck most times
        const img2 = new Image();
        img2.decoding = "async";
        img2.src = heroSlides[i].desktop;
      }
    };

    // idle preload
    const w = window as any;
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    } else {
      const t = window.setTimeout(run, 1200);
      return () => window.clearTimeout(t);
    }
  }, [heroSlides]);

  // SEO / Schema (kept)
  const canonical = "https://www.mkbweddings.co.uk/";
  const metaTitle = "Northern Ireland Wedding Photographer | Belfast & Ireland | MKB Weddings";
  const metaDescription =
    "Cinematic Northern Ireland wedding photographer based in Belfast, covering weddings across Northern Ireland and Ireland. Natural, timeless photography capturing real moments and stunning venues.";

  const ogImage =
    "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full/Killeavy%20castle/couple%20portraits/MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100_2000.webp";

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://www.mkbweddings.co.uk/#website",
        url: canonical,
        name: "MKB Weddings",
        inLanguage: "en-GB",
      },
      {
        "@type": "WebPage",
        "@id": "https://www.mkbweddings.co.uk/#webpage",
        url: canonical,
        name: metaTitle,
        description: metaDescription,
        isPartOf: { "@id": "https://www.mkbweddings.co.uk/#website" },
        about: { "@id": "https://www.mkbweddings.co.uk/#business" },
        inLanguage: "en-GB",
      },
      {
        "@type": ["LocalBusiness", "PhotographyBusiness"],
        "@id": "https://www.mkbweddings.co.uk/#business",
        name: "MKB Weddings",
        url: canonical,
        image: ogImage,
        logo: "https://www.mkbweddings.co.uk/android-chrome-512x512.png",
        telephone: "+447546456077",
        priceRange: "£££",
        description:
          "Wedding photographer based in Northern Ireland, covering Ireland and destinations. Relaxed documentary coverage, candid moments, and bold creative flash for the dancefloor.",
        knowsAbout: [
          "Northern Ireland wedding photography",
          "Ireland wedding photography",
          "Documentary wedding photography",
          "Candid wedding photography",
          "Creative flash wedding photography",
          "Wedding venue photography",
        ],
        areaServed: [
          { "@type": "AdministrativeArea", name: "Northern Ireland" },
          { "@type": "AdministrativeArea", name: "County Donegal" },
          { "@type": "AdministrativeArea", name: "County Monaghan" },
          { "@type": "AdministrativeArea", name: "County Cavan" },
          { "@type": "Country", name: "Ireland" },
          { "@type": "Country", name: "United Kingdom" },
        ],
        address: {
          "@type": "PostalAddress",
          addressCountry: "GB",
          addressRegion: "Northern Ireland",
        },
        sameAs: ["https://www.instagram.com/mkbweddings", "https://www.facebook.com/mkbweddings"],
        makesOffer: [
          {
            "@type": "Offer",
            name: "Wedding Photography Packages",
            url: "https://www.mkbweddings.co.uk/packages",
            priceCurrency: "GBP",
            availability: "https://schema.org/InStock",
          },
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Wedding Photography Services",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Wedding Photography (Full Day)",
                serviceType: "Wedding Photography",
                areaServed: ["Northern Ireland", "Ireland"],
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Elopement & Intimate Wedding Photography",
                serviceType: "Elopement Photography",
                areaServed: ["Northern Ireland", "Ireland"],
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Creative Flash Dancefloor Photography",
                serviceType: "Wedding Reception Photography",
                areaServed: ["Northern Ireland", "Ireland"],
              },
            },
          ],
        },
      },
      {
        "@type": "Person",
        "@id": "https://www.mkbweddings.co.uk/#photographer",
        name: "MKB Weddings",
        jobTitle: "Wedding Photographer",
        url: canonical,
        worksFor: { "@id": "https://www.mkbweddings.co.uk/#business" },
        sameAs: ["https://www.instagram.com/mkbweddings", "https://www.facebook.com/mkbweddings"],
        knowsAbout: [
          "Northern Ireland wedding photography",
          "Ireland wedding photography",
          "Documentary wedding photography",
          "Cinematic, Creative flash wedding photography",
        ],
      },
    ],
  };

  const firstHero = heroSlides[0];

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

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />

        {/* Preload the LCP image (mobile + desktop variants) */}
        <link rel="preload" as="image" href={firstHero.mobile} media="(max-width: 768px)" />
        <link rel="preload" as="image" href={firstHero.desktop} media="(min-width: 769px)" />

        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
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
              <HeroPicture
                desktopSrc={heroSlides[currentSlide].desktop}
                mobileSrc={heroSlides[currentSlide].mobile}
                alt={heroSlides[currentSlide].alt}
                // LCP: first slide should be eager/high priority
                fetchPriority={currentSlide === 0 ? "high" : "low"}
                loading={currentSlide === 0 ? "eager" : "lazy"}
              />
              <div className="absolute inset-0 bg-black/45" />
            </motion.div>
          </AnimatePresence>

          {/* Carousel Dots */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-3">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentSlide ? "bg-accent scale-125" : "bg-white/50 hover:bg-white/70"
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
              <img
                src={galleryCardImage}
                alt="Browse wedding photography gallery"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-10">
                <Camera size={40} className="text-white mb-4" />
                <h2 className="text-white text-2xl md:text-2xl font-serif mb-4">Gallery</h2>
                <p className="text-white/90 mb-6">
                  Browse our portfolio by venue, style and moments from real weddings.
                </p>
                <span className="inline-flex items-center gap-2 text-accent">
                  Explore Galleries <ArrowRight size={20} />
                </span>
              </div>
            </Link>

            <Link to="/blog" className="group relative overflow-hidden aspect-[4/5] rounded-sm">
              <img
                src={storiesCardImage}
                alt="Wedding stories and reviews"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-10">
                <Heart size={40} className="text-white mb-4" />
                <h2 className="text-white text-2xl md:text-2xl font-serif mb-4">
                  Stories & Reviews
                </h2>
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

        {/* ---------- Intro Text Block ---------- */}
        <section className="pt-8 pb-28 px-6 md:px-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-serif mb-6">
              Natural wedding photography, with a bold edge
            </h2>

            <p className="text-primary/80 max-w-3xl mx-auto leading-relaxed text-lg md:text-xl mb-14">
              I’m a{" "}
              <strong>documentary wedding photographer covering Northern Ireland and Ireland</strong>{" "}
              — from Belfast and the North Coast, to Donegal, Cavan, Monaghan and Louth. If you’re
              planning locally, the fastest way to see weddings near you is to{" "}
              <Link
                to="/wedding-photographer"
                className="font-semibold text-primary underline underline-offset-4 hover:text-primary/90 transition-colors"
              >
                explore real wedding galleries by county
              </Link>{" "}
              (venues, celebrations and full stories).
              <br />
              <br />
              Expect relaxed guidance, real emotion, and none of that stiff awkward posing.
            </p>

            {/* Cards */}
            <div className="grid gap-8 max-w-4xl mx-auto text-center mt-6">
              <div className="rounded-sm border border-primary/10 p-8 pb-12">
                <h3 className="text-xl md:text-2xl font-serif mb-3 text-center">Candid, not staged</h3>
                <p className="text-primary/75 text-base md:text-lg text-center leading-relaxed">
                  A documentary approach that lets you enjoy the day, I’ll guide when needed, never
                  take over.
                </p>
              </div>

              <div className="rounded-sm border border-primary/10 p-8 pb-12">
                <h3 className="text-xl md:text-2xl font-serif mb-3 text-center">Colour + contrast</h3>
                <p className="text-primary/75 text-base md:text-lg text-center leading-relaxed">
                  Clean edits with depth and punch, true-to-life skin tones and vibrant atmosphere.
                </p>
              </div>

              <div className="rounded-sm border borderprimary/10 p-8 pb-12 border border-primary/10">
                <h3 className="text-xl md:text-2xl font-serif mb-3 text-center">Built for real life</h3>
                <p className="text-primary/75 text-base md:text-lg text-center leading-relaxed mb-6">
                  From prep to dancefloor, your gallery tells the full story, not just the “posed”
                  bits.
                </p>
              </div>
            </div>

            <Link
              to="/wedding-photographer"
              className="inline-block mt-8 text-sm uppercase tracking-wider underline underline-offset-4 hover:text-primary transition-colors"
            >
              Browse Wedding Photography by County
            </Link>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="py-32 px-6 md:px-20 relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={ctaBgImage}
              alt="Check availability for your wedding date"
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-accent/80" />
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