// src/components/Blog.tsx
import { useEffect, useState } from "react";
import { Quote } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion, AnimatePresence } from "motion/react";

// Reuse the SAME hero images you already use in WeddingPackages.tsx
import heroImage1 from "figma:asset/03addbb5f7743f01a58fb3d5a7dc0a04d8a597ea.png";
import heroImage2 from "figma:asset/4e80a09ae14c9e2aaefa75a7ed64281f0bbc855b.png";
import heroImage3 from "figma:asset/bd5d99d7e1f595c1b6ea3f81cca8271b8b5af07b.png";
import heroImage4 from "figma:asset/0ba91b91cae5c758237fda465ce29e30c29636e7.png";

interface Testimonial {
  id: string;
  name: string;
  review: string;
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Eamie & Ben",
    review:
      "We can not thank Mark enough for our beautiful photos. From the very start he has been so kind and nothing was a bother to him. He made us both feel so relaxed and captured some amazing photos that we didn't even realise he was taken. A complete Gentleman and a pleasure to work with.",
  },
  {
    id: "2",
    name: "Coleen & Blake",
    review:
      "I can't praise Mark highly enough for the work he does! Mark photographed our Wedding only last week, and we have already received a bunch of beautiful photographs. Myself & my Husband would be camera shy, but Mark has a way of making you feel comfortable, have a laugh and capture beautiful memories without even realizing!",
  },
  {
    id: "3",
    name: "Ciara & Conor",
    review:
      "Where do I start.. right from the get go Mark was absolutely brilliant, he made us all feel so relaxed and made getting photos taken so easy! My husband is camera shy at best and Mark just made everything so easy, I am so glad we got him!",
  },
  {
    id: "4",
    name: "Aoife & Andrea",
    review:
      "We cannot recommend Mark highly enough. From the moment we met Mark, he made us feel completely at ease, something that meant the world to us as two brides who aren't the most comfortable in front of the camera. What we appreciated most were the candid photos, so many beautiful, genuine moments of us laughing and being ourselves.",
  },
  {
    id: "5",
    name: "Gemma & Craig",
    review:
      "Thanks Mark for the amazing photos from our wedding day. We now have the hard task of selecting for our album from such a multitude of beautiful photos. We would highly recommend Mark as a photographer. Mark was very professional and friendly and made us feel relaxed throughout our special day from start to finish.",
  },
  {
    id: "6",
    name: "Shauna & Andrew",
    review:
      "Mark photographed our wedding on 12th April 2025 at the Belmont House Hotel, Banbridge. We had a fairly big wedding with 160 guests, and it was a fantastic day. Mark didn't stop all day – he was literally running around capturing brilliant candid shots, as well as all the family photos we had requested.",
  },
  {
    id: "7",
    name: "Charlotte & Declan",
    review:
      "Myself and Dec were absolutely blown away by the initial sneak peak photos sent in from Mark on the evening of the wedding and couldn't wait to see the final images. Mark was absolutely amazing from start to finish! His use of lighting made for some really dramatic shots which we both loved.",
  },
  {
    id: "8",
    name: "Hannah Wilson",
    review:
      "We can't recommend Mark enough, he captured our wedding day at Lusty Beg perfectly! He knew where to take the best shots and even brought the sunshine with him! He made everyone feel comfortable and could have a laugh too. 10/10",
  },
  {
    id: "9",
    name: "Robyn & Stuart",
    review:
      "Breathtaking photos we will cherish forever. Mark was brilliant at both our engagement shoot and on our wedding day. He made us feel relaxed and at ease throughout. He was punctual, professional and kind. He brought a great energy to our wedding day and our guests were really impressed as well.",
  },
  {
    id: "10",
    name: "Jen & Andy",
    review:
      "Thank you so much Mark for our amazing photos. You made us feel so calm and relaxed on the day. You knew the exact photos to take to make the most of our venue despite the rain and nothing was too much trouble for you. You went above and beyond.",
  },
  {
    id: "11",
    name: "Emma & Simon",
    review:
      "What can I say about our incredible photos?! Thank you so much Mark for your support on the day and also your great work on our amazing photos. They are beyond what we expected and capture the day so perfectly for us in a candid fun way.",
  },
  {
    id: "12",
    name: "Chloe & David",
    review:
      "We have just received our photos from our wedding day at Killeavy Castle from Mark and we are amazed by them! Mark was a delight to work with and helped make our day as relaxing and enjoyable as he could. His work speaks for itself!",
  },
];

export function Blog() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);

  const heroCarouselImages = [heroImage1, heroImage2, heroImage3, heroImage4];

  // Hero carousel auto-rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroCarouselImages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroCarouselImages.length]);

  // Scrolling testimonials animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScrollPosition((prev) => prev - 1);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Create duplicated array for infinite scroll
  const scrollingTestimonials = [...testimonials, ...testimonials, ...testimonials];

  return (
    <div className="min-h-screen bg-white">
      {/* HERO (same feel as Packages) */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden pt-20">
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
              src={heroCarouselImages[currentSlide]}
              alt={`Stories and Reviews hero ${currentSlide + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
          </motion.div>
        </AnimatePresence>

        {/* Carousel Dots */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {heroCarouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide ? "bg-white scale-125" : "bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Hero text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-white px-6 max-w-5xl mx-auto w-full">
            <h1
              className="tagline text-white mb-6"
              style={{ fontSize: "clamp(1.25rem, 3vw, 1.75rem)" }}
            >
              Stories and Reviews <span className="text-white/80">(Coming Soon)</span>
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Real weddings, client reviews, tips, and inspiration from Northern Ireland and beyond
            </p>
          </div>
        </div>
      </section>

      {/* Scrolling Testimonials Banner */}
      <section className="py-12 bg-primary text-white overflow-hidden">
        <div className="flex" style={{ transform: `translateX(${scrollPosition}px)` }}>
          {scrollingTestimonials.map((testimonial, index) => (
            <div
              key={`${testimonial.id}-${index}`}
              className="flex-shrink-0 px-8 flex items-start gap-4"
              style={{ minWidth: "600px", maxWidth: "600px" }}
            >
              <Quote size={28} className="flex-shrink-0 text-white/30 mt-1" />
              <div>
                <p
                  className="text-white/90 mb-2 italic leading-relaxed"
                  style={{ fontSize: "0.95rem", lineHeight: "1.6" }}
                >
                  "{testimonial.review}"
                </p>
                <p className="text-white/70 text-sm">— {testimonial.name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Coming soon content */}
      <section className="py-16 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl mb-6">Wedding Stories are Coming Soon</h2>
        <p className="text-lg text-neutral-700 max-w-2xl mx-auto leading-relaxed">
          I’m currently moving my full wedding blog over to the new website. In the meantime, you can
          explore the galleries by venue, wedding moments, and creative flash.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/gallery/moments"
            className="px-7 py-3 rounded-lg bg-black text-white hover:bg-black/90 transition-colors"
          >
            Browse Wedding Moments
          </a>
          <a
            href="/gallery/venues"
            className="px-7 py-3 rounded-lg border border-neutral-300 text-neutral-900 hover:bg-neutral-50 transition-colors"
          >
            Browse By Venue
          </a>
        </div>
      </section>
    </div>
  );
}

