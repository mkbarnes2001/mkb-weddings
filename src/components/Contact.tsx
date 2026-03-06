import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { AnimatePresence, motion } from "motion/react";

type HeroSlide = {
  desktop: string;
  mobile: string;
  alt: string;
};

export function Contact() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides: HeroSlide[] = [
    {
      desktop:
        "https://images.mkbweddings.co.uk/Hero/Desktop/MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100_2000.webp",
      mobile:
        "https://images.mkbweddings.co.uk/Hero/Mobile/MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100_2000_1200.webp",
      alt: "Northern Ireland wedding photography – couple portrait at Killeavy Castle",
    },
    {
      desktop:
        "https://images.mkbweddings.co.uk/Hero/Desktop/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_2000.webp",
      mobile:
        "https://images.mkbweddings.co.uk/Hero/Mobile/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_2000_1200.webp",
      alt: "Wedding couple portrait – Orange Tree House Greyabbey",
    },
    {
      desktop:
        "https://images.mkbweddings.co.uk/Hero/Desktop/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-4_2000.webp",
      mobile:
        "https://images.mkbweddings.co.uk/Hero/Mobile/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-4_2000_1200.webp",
      alt: "Slieve Donard Hotel wedding photography – couple portrait",
    },
    {
      desktop:
        "https://images.mkbweddings.co.uk/Hero/Desktop/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_2000.webp",
      mobile:
        "https://images.mkbweddings.co.uk/Hero/Mobile/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_2000_1200.webp",
      alt: "Wedding photography – Slieve Donard Hotel Newcastle",
    },
    {
      desktop:
        "https://images.mkbweddings.co.uk/Hero/Desktop/mkb-weddings-rossharbour-resort-wedding-photography-363_2000.webp",
      mobile:
        "https://images.mkbweddings.co.uk/Hero/Mobile/mkb-weddings-rossharbour-resort-wedding-photography-363_2000_1200.webp",
      alt: "Ross Harbour Resort wedding photography – couple portrait",
    },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <>
      <Helmet>
        <title>Contact | MKB Weddings</title>
        <meta
          name="description"
          content="Get in touch with MKB Weddings to check availability, pricing and wedding photography packages across Northern Ireland, Ireland, including Donegal, Monaghan & Cavan and other bordering counties."
        />
      </Helmet>

      <div className="-mt-20 min-h-screen">
        {/* Hero Carousel */}
        <section className="relative h-[70vh] overflow-hidden">
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
                <source media="(max-width: 768px)" srcSet={heroSlides[currentSlide].mobile} />
                <ImageWithFallback
                  src={heroSlides[currentSlide].desktop}
                  alt={heroSlides[currentSlide].alt}
                  width={2000}
                  height={1200}
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-cover object-center"
                  style={{ objectPosition: "center 40%" }}
                />
              </picture>
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
                type="button"
              />
            ))}
          </div>

          {/* Hero Text */}
          <div className="absolute inset-0 flex items-end justify-center pb-32 pointer-events-none">
            <div className="text-center text-white px-6 max-w-5xl mx-auto w-full">
              <h1 className="tagline text-white mb-4 text-3xl sm:text-4xl md:text-5xl">
                Get in Touch
              </h1>
              <p className="text-xl text-white/90 max-w-3xl mx-auto">
                Ready to book your wedding photography? We'd love to hear about your day and how we
                can capture it naturally, without all of that stiff posing!
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Contact Form */}
            <div>
              <h2 className="mb-6">Send Us a Message</h2>
              <p className="text-foreground/60 mb-4">
                Fill out the form below to check availability and discuss your wedding photography
                needs.
              </p>
              <p className="text-primary mb-10 font-medium">
                Most couples receive a reply within 24 hours.
              </p>

              <iframe
                height={759}
                style={{ minWidth: "100%", maxWidth: "1260px", border: 0 }}
                id="sn-form-wsgz3"
                src="https://app.studioninja.co/contactform/parser/0a800fc9-82a4-1a61-8182-f546140b694f/0a800fc8-82a4-122c-8183-0a866445138a"
                allowFullScreen
                loading="lazy"
                title="MKB Weddings contact form"
              />
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="mb-6">Contact Information</h2>
              <p className="text-foreground/60 mb-8">
                Prefer to reach out directly? Here are all the ways you can get in touch.
              </p>

              <div className="space-y-6 mb-12">
                <ContactItem
                  icon={<Mail size={20} />}
                  title="Email"
                  value="mark@mkbweddings.co.uk"
                  link="mailto:mark@mkbweddings.co.uk"
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
                  value="Northern Ireland, Ireland & destination weddings"
                />
              </div>

              {/* Social */}
              <div className="border-t border-primary/20 pt-8">
                <h3 className="text-2xl mb-4">Follow Our Work</h3>
                <div className="flex gap-4">
                  <SocialLink
                    href="https://instagram.com/mkbweddings"
                    icon={<Instagram size={20} />}
                  />
                  <SocialLink
                    href="https://facebook.com/mkbweddings"
                    icon={<Facebook size={20} />}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/* Small Helpers */

function ContactItem({
  icon,
  title,
  value,
  link,
}: {
  icon: ReactNode;
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

function SocialLink({ href, icon }: { href: string; icon: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-12 h-12 bg-primary text-white flex items-center justify-center hover:bg-primary/80 transition-colors"
      aria-label="Social link"
    >
      {icon}
    </a>
  );
}