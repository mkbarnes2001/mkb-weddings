import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Mail, Phone, MapPin, Instagram, Facebook } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

import heroImage1 from "figma:asset/56c087b2e44825658578c4eebea8003fc82789e5.png";
import heroImage2 from "figma:asset/f0c6a12bde87e175e2aadb88f75b83c7f4125e86.png";
import heroImage3 from "figma:asset/6595a05dfe41b8f2fc54e571acf9e9a24994d353.png";
import heroImage4 from "figma:asset/2018a530540d6cd532e764d8c4467195d61fe49a.png";

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

export function Contact() {
  const heroCarouselImages = useMemo(
    () => [heroImage1, heroImage2, heroImage3, heroImage4],
    []
  );

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroCarouselImages.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [heroCarouselImages.length]);

  const canonical = `${SITE_ORIGIN}/contact`;

  const metaTitle = "Contact MKB Weddings | Wedding Photographer Northern Ireland & Ireland";
  const metaDescription =
    "Contact MKB Weddings to check availability, pricing and wedding photography packages across Northern Ireland and Ireland (Donegal, Monaghan & Cavan).";

  // Lightweight JSON-LD (LocalBusiness)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "MKB Weddings",
    url: SITE_ORIGIN,
    telephone: "+447546456077",
    email: "mark@mkbweddings.com",
    areaServed: ["Northern Ireland", "Ireland"],
    sameAs: ["https://instagram.com/mkbweddings", "https://facebook.com/mkbweddings"],
  };

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonical} />

        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="-mt-20 min-h-screen">
        {/* ---------- Hero Carousel ---------- */}
        <section className="relative h-[70vh] overflow-hidden">
          {/* Slides */}
          <div className="absolute inset-0">
            {heroCarouselImages.map((src, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  idx === currentSlide ? "opacity-100" : "opacity-0"
                }`}
              >
                <ImageWithFallback
                  src={src}
                  alt={`Contact MKB Weddings – slide ${idx + 1}`}
                  className="w-full h-full object-cover object-center"
                  style={{ objectPosition: "center 40%" }}
                />
                <div className="absolute inset-0 bg-black/45" />
              </div>
            ))}
          </div>

          {/* Carousel Dots */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-3">
            {heroCarouselImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentSlide ? "bg-accent scale-125" : "bg-white/50 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${index + 1}`}
                type="button"
              />
            ))}
          </div>

          {/* Hero Text */}
          <div className="absolute inset-0 flex items-end justify-center pb-32">
            <div className="text-center text-white px-6 max-w-5xl mx-auto w-full">
              <h1 className="tagline text-white mb-4">Get in Touch</h1>
              <p className="text-xl text-white/90 max-w-3xl mx-auto">
                Ready to book your wedding photography? Share a few details and we’ll confirm
                availability and next steps.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Main Content ---------- */}
        <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Contact Form */}
            <div>
              <h2 className="mb-6">Send a Message</h2>
              <p className="text-foreground/60 mb-4">
                Use the form to check availability and discuss your wedding photography.
              </p>
              <p className="text-primary mb-10 font-medium">Most couples receive a reply within 24 hours.</p>

              <iframe
                title="MKB Weddings contact form"
                height="759"
                style={{ minWidth: "100%", maxWidth: "1260px", border: 0 }}
                src="https://app.studioninja.co/contactform/parser/0a800fc9-82a4-1a61-8182-f546140b694f/0a800fc8-82a4-122c-8183-0a866445138a"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="mb-6">Contact Information</h2>
              <p className="text-foreground/60 mb-8">
                Prefer to reach out directly? Here are the quickest options.
              </p>

              <div className="space-y-6 mb-12">
                <ContactItem
                  icon={<Mail size={20} />}
                  title="Email"
                  value="mark@mkbweddings.com"
                  link="mailto:mark@mkbweddings.com"
                />
                <ContactItem
                  icon={<Phone size={20} />}
                  title="Phone"
                  value="+44 (0) 7546 456077"
                  link="tel:+447546456077"
                />
                <ContactItem
                  icon={<MapPin size={20} />}
                  title="Service Area"
                  value="Northern Ireland & Ireland (Donegal, Monaghan, Cavan)"
                />
              </div>

              <div className="border-t border-primary/20 pt-8">
                <h3 className="text-2xl mb-4">Follow our work</h3>
                <div className="flex gap-4">
                  <SocialLink href="https://instagram.com/mkbweddings" icon={<Instagram size={20} />} />
                  <SocialLink href="https://facebook.com/mkbweddings" icon={<Facebook size={20} />} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function ContactItem({
  icon,
  title,
  value,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 bg-secondary flex items-center justify-center">{icon}</div>
      <div>
        <h3 className="mb-1">{title}</h3>
        {link ? (
          <a href={link} className="text-foreground/60 hover:text-primary">
            {value}
          </a>
        ) : (
          <p className="text-foreground/60">{value}</p>
        )}
      </div>
    </div>
  );
}

function SocialLink({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-12 h-12 bg-primary text-white flex items-center justify-center hover:bg-primary/80 transition-colors"
      aria-label={href.includes("instagram") ? "Instagram" : "Facebook"}
    >
      {icon}
    </a>
  );
}