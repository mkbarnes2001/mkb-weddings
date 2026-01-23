// src/components/Blog.tsx
import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, ArrowRight, Tag, Quote } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type Testimonial = {
  id: string;
  name: string;
  review: string;
};

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
      "I can't praise Mark highly enough for the work he does! Mark photographed our Wedding only last week, and we have already received a bunch of beautiful photographs. Mark has a way of making you feel comfortable, have a laugh and capture beautiful memories without even realizing!",
  },
  {
    id: "3",
    name: "Ciara & Conor",
    review:
      "Where do I start.. right from the get go Mark was absolutely brilliant, he made us all feel so relaxed and made getting photos taken so easy! My husband is camera shy at best and Mark just made everything so easy.",
  },
  {
    id: "4",
    name: "Aoife & Andrea",
    review:
      "We cannot recommend Mark highly enough. From the moment we met Mark, he made us feel completely at ease. What we appreciated most were the candid photos, so many beautiful, genuine moments of us laughing and being ourselves.",
  },
  {
    id: "5",
    name: "Gemma & Craig",
    review:
      "Thanks Mark for the amazing photos from our wedding day. We now have the hard task of selecting for our album from such a multitude of beautiful photos. We would highly recommend Mark as a photographer.",
  },
];

type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  galleryImages?: string[];
};

const hardcodedBlogPosts: BlogPost[] = [
  {
    id: "12",
    title: "Killeavy Castle wedding photography, Declan & Charlotte",
    excerpt:
      "Natural and relaxed wedding photography at Killeavy Castle — highlights, moments and inspiration.",
    content:
      "Declan & Charlotte’s day at Killeavy Castle was packed with energy, laughs and stunning light.\n\nFrom bridal prep through to the party, we captured a mix of candid storytelling and bold portraits.",
    image:
      "https://mkbweddings.com/wp-content/uploads/MKB-weddings-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-107.jpg",
    date: "January 04, 2025",
    readTime: "31 min read",
    category: "Real Weddings",
    tags: ["killeavycastle", "NIweddingphotographer", "realwedding"],
  },
  {
    id: "11",
    title: "Killeavy Castle wedding photography, Jenny & Gerard",
    excerpt:
      "Ibiza-inspired energy, big laughs and beautiful moments at one of NI’s most popular venues.",
    content:
      "Killeavy Castle is always a favourite — and Jenny & Gerard brought unreal energy from start to finish.\n\nThis was a full-on fun day with entertainment, storytelling moments, and bold creative lighting.",
    image:
      "https://mkbweddings.com/wp-content/uploads/MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100-3.jpg",
    date: "May 28, 2024",
    readTime: "14 min read",
    category: "Real Weddings",
    tags: ["killeavycastle", "weddingphotography", "story"],
  },
  {
    id: "2",
    title: "Clandeboye Lodge wedding photography, Stephanie & Callum",
    excerpt:
      "Sunshine, laughter and a gorgeous venue — a fun-filled summer wedding at Clandeboye Lodge.",
    content:
      "Stephanie & Callum had the kind of day every couple hopes for: sunshine, relaxed vibes and great craic.\n\nWe used the grounds for portraits and captured lots of candid story moments throughout the day.",
    image:
      "https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-45-1024x682.jpg",
    date: "May 9, 2024",
    readTime: "13 min read",
    category: "Real Weddings",
    tags: ["clandeboye", "NIweddings", "realwedding"],
  },
];

const heroCarouselImages: string[] = [
  "https://mkbweddings.com/wp-content/uploads/MKB-weddings-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-107.jpg",
  "https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-65-1-1024x682.jpg",
  "https://mkbweddings.com/wp-content/uploads/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-ballyscullion-park-bellaghy-wedding-photography-42-1024x682.jpg",
  "https://mkbweddings.com/wp-content/uploads/MKB-photography-Northern-Ireland-wedding-photographer-Galgorm-resort-Wedding-photography-Glagorm-resort-wedding-photography-66-1024x682.jpg",
  "https://mkbweddings.com/wp-content/uploads/MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-45-1024x682.jpg",
];

function splitParagraphs(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function Blog() {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Reviews banner scroll position (infinite)
  const [scrollPosition, setScrollPosition] = useState(0);

  // Auto rotate hero slides
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroCarouselImages.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  // Scrolling testimonials animation
  useEffect(() => {
    const interval = window.setInterval(() => {
      setScrollPosition((prev) => prev - 1);
    }, 30);
    return () => window.clearInterval(interval);
  }, []);

  // duplicate for infinite scroll
  const scrollingTestimonials = useMemo(
    () => [...testimonials, ...testimonials, ...testimonials],
    []
  );

  const posts = useMemo(() => hardcodedBlogPosts, []);

  // ---------------------------
  // Single post view
  // ---------------------------
  if (selectedPost) {
    return (
      <div className="min-h-screen bg-white">
        <div className="relative h-[60vh] min-h-[400px]">
          <ImageWithFallback
            src={selectedPost.image}
            alt={selectedPost.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          <div className="absolute inset-0 flex items-end">
            <div className="max-w-4xl mx-auto px-6 pb-14 w-full text-center">
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="inline-flex items-center justify-center text-white/80 hover:text-white mb-6 transition-colors"
              >
                ← Back to Stories & Reviews
              </button>

              <h1 className="text-white text-4xl md:text-5xl leading-tight">
                {selectedPost.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-white/80">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>{selectedPost.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>{selectedPost.readTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="brand-prose">
            <p className="text-lg md:text-xl text-neutral-700 leading-relaxed">
              {selectedPost.excerpt}
            </p>

            <div className="mt-8 space-y-6 text-neutral-700 leading-relaxed">
              {splitParagraphs(selectedPost.content).map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </div>

          {selectedPost.tags?.length > 0 && (
            <div className="mt-10 pt-8 border-t border-neutral-200">
              <div className="flex items-center gap-2 mb-4 text-neutral-600">
                <Tag size={16} />
                <span>Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedPost.tags.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-sm"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------
  // Index view
  // ---------------------------
  return (
    <div className="min-h-screen bg-white">
      {/* HERO CAROUSEL */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <ImageWithFallback
              src={heroCarouselImages[currentSlide]}
              alt={`Wedding story ${currentSlide + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/45" />
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {heroCarouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-white scale-125"
                  : "bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${index + 1}`}
              type="button"
            />
          ))}
        </div>

        {/* Overlay Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-white px-6 max-w-5xl mx-auto w-full">
            <h1
              className="text-white mb-6"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 1.05 }}
            >
              Stories & Reviews
            </h1>
            <p className="text-white/90 text-lg md:text-xl max-w-3xl mx-auto">
              Real weddings, venue guides, tips, and inspiration across Northern
              Ireland and beyond.
            </p>
          </div>
        </div>
      </section>

      {/* REVIEWS CAROUSEL (scrolling banner) */}
      <section className="py-12 bg-black text-white overflow-hidden">
        <div
          className="flex"
          style={{ transform: `translateX(${scrollPosition}px)` }}
        >
          {scrollingTestimonials.map((t, idx) => (
            <div
              key={`${t.id}-${idx}`}
              className="flex-shrink-0 px-8 flex items-start gap-4"
              style={{ minWidth: "600px", maxWidth: "600px" }}
            >
              <Quote size={28} className="flex-shrink-0 text-white/30 mt-1" />
              <div>
                <p
                  className="text-white/90 mb-2 italic leading-relaxed"
                  style={{ fontSize: "0.95rem", lineHeight: "1.6" }}
                >
                  “{t.review}”
                </p>
                <p className="text-white/70 text-sm">— {t.name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* POSTS GRID */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group cursor-pointer"
              onClick={() => setSelectedPost(post)}
            >
              <div className="aspect-[4/3] mb-4 overflow-hidden rounded-lg bg-neutral-100">
                <ImageWithFallback
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>

              <h2 className="text-2xl mb-3 group-hover:underline">
                {post.title}
              </h2>

              <p className="text-neutral-700 mb-4 line-clamp-2">{post.excerpt}</p>

              <div className="flex items-center justify-between text-sm text-neutral-600">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{post.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{post.readTime}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read More <ArrowRight size={16} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

