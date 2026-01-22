import { Check, X, Camera, Clock, Image as ImageIcon, Video, BookOpen, ArrowRight, Film, Play, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import heroImage1 from 'figma:asset/03addbb5f7743f01a58fb3d5a7dc0a04d8a597ea.png';
import heroImage2 from 'figma:asset/4e80a09ae14c9e2aaefa75a7ed64281f0bbc855b.png';
import heroImage3 from 'figma:asset/bd5d99d7e1f595c1b6ea3f81cca8271b8b5af07b.png';
import heroImage4 from 'figma:asset/0ba91b91cae5c758237fda465ce29e30c29636e7.png';
import logo from 'figma:asset/59cfbace7d9f63a450210fde4f6bf784db9c67f5.png';

export function WeddingPackages() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroCarouselImages = [
    heroImage1,
    heroImage2,
    heroImage3,
    heroImage4,
  ];

  // Hero carousel auto-rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroCarouselImages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroCarouselImages.length]);

  const packages = [
    {
      name: 'Elope',
      price: '£795',
      hours: '4',
      images: '100-200',
      color: 'from-teal-600 to-teal-700',
      features: {
        travelIncluded: true,
        preWeddingConsultation: true,
        preWeddingShoot: 'Option',
        morningPrep: false,
        ceremony: true,
        portraits: true,
        reception: false,
        dances: false,
        album: 'Option',
        videography: false,
        contentCreation: 'Option',
        photobook: 'Option'
      }
    },
    {
      name: 'Key',
      price: '£995',
      hours: '6',
      images: '300',
      color: 'from-gray-500 to-gray-600',
      features: {
        travelIncluded: true,
        preWeddingConsultation: true,
        preWeddingShoot: 'Option',
        morningPrep: false,
        ceremony: true,
        portraits: true,
        reception: false,
        dances: false,
        album: 'Option',
        videography: false,
        contentCreation: 'Option',
        photobook: 'Option'
      }
    },
    {
      name: 'Lite',
      price: '£1,195',
      hours: '8',
      images: '400',
      color: 'from-purple-600 to-purple-700',
      popular: true,
      features: {
        travelIncluded: true,
        preWeddingConsultation: true,
        preWeddingShoot: 'Option',
        morningPrep: true,
        ceremony: true,
        portraits: true,
        reception: true,
        dances: false,
        album: 'Option',
        videography: 'Option',
        contentCreation: 'Option',
        photobook: 'Option'
      }
    },
    {
      name: 'Pro',
      price: '£1,450',
      hours: '10',
      images: '500-700',
      color: 'from-blue-700 to-blue-800',
      popular: true,
      features: {
        travelIncluded: true,
        preWeddingConsultation: true,
        preWeddingShoot: 'Option',
        morningPrep: true,
        ceremony: true,
        portraits: true,
        reception: true,
        dances: true,
        album: 'Option',
        videography: 'Option',
        contentCreation: 'Option',
        photobook: 'Option'
      }
    },
    {
      name: 'Elite',
      price: '£1,750',
      hours: '12',
      images: '500-700',
      color: 'from-blue-900 to-blue-950',
      features: {
        travelIncluded: true,
        preWeddingConsultation: true,
        preWeddingShoot: true,
        morningPrep: true,
        ceremony: true,
        portraits: true,
        reception: true,
        dances: true,
        album: true,
        videography: 'Option',
        contentCreation: 'Option',
        photobook: 'Option'
      }
    }
  ];

  const renderFeature = (value: boolean | string) => {
    if (value === true) {
      return <Check className="w-5 h-5 text-green-600" />;
    } else if (value === false) {
      return <X className="w-5 h-5 text-red-500" />;
    } else {
      return <span className="text-sm text-muted-foreground">{value}</span>;
    }
  };

  return (
    <div className="-mt-20">
      {/* Hero Carousel Section */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
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
              src={heroCarouselImages[currentSlide]}
              alt={`Wedding package ${currentSlide + 1}`}
              className="w-full h-full object-cover object-center"
              style={{ objectPosition: 'center 40%' }}
            />
            <div className="absolute inset-0 bg-black/40"></div>
          </motion.div>
        </AnimatePresence>
        
        {/* Carousel Dots */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {heroCarouselImages.map((_, index) => (
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
        <div className="absolute inset-0 flex items-end justify-center pb-32 pointer-events-none">
          <div className="text-center text-white px-6 max-w-5xl mx-auto w-full">
            <h1 className="tagline text-white mb-4" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
              Wedding Photography Packages
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              From intimate elopements to full-day celebrations, choose the perfect package for your special day
            </p>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <p className="text-foreground/70" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            MKB Weddings offers five wedding photography packages designed to suit different wedding styles, timelines, and budgets. Whether you're planning an intimate elopement or a grand celebration, we provide the same creative, fun, and professional service with every booking.
          </p>
        </div>

        {/* What's Included in All Packages */}
        <div className="bg-accent rounded-lg p-10 mb-16">
          <h3 className="mb-8 text-center">Included in Every Package</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="flex items-start gap-3">
              <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium mb-1">Professional Editing</p>
                <p className="text-sm text-foreground/60">Full color correction and artistic enhancement</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium mb-1">Online Gallery</p>
                <p className="text-sm text-foreground/60">Private online gallery for viewing, downloading and ordering prints directly</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium mb-1">Travel Included</p>
                <p className="text-sm text-foreground/60">Coverage across Northern Ireland</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium mb-1">High-Resolution Images</p>
                <p className="text-sm text-foreground/60">Full-resolution digital files</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium mb-1">Personal Print Rights</p>
                <p className="text-sm text-foreground/60">Print your images for personal use</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium mb-1">Fast Turnaround</p>
                <p className="text-sm text-foreground/60">Receive your gallery within 6-8 weeks</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Package Cards */}
      <section className="py-20 px-6 md:px-20 bg-secondary">
        <div className="max-w-[1440px] mx-auto">
          {/* Urgency Message */}
          <div className="text-center mb-10">
            <p className="text-primary text-lg" style={{ fontWeight: '500' }}>
              Limited 2026 & 2027 dates available — enquire early to avoid disappointment.
            </p>
          </div>
          
          <h2 className="text-center mb-12">Package Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className={`bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow ${
                  pkg.popular ? 'ring-2 ring-primary' : ''
                }`}
              >
                {pkg.popular && (
                  <div className="bg-primary text-white text-center py-2 text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <div className={`bg-gradient-to-r ${pkg.color} text-white p-8 text-center`}>
                  <img src={logo} alt="MKB Weddings" className="h-12 w-auto mx-auto mb-4 brightness-0 invert" />
                  <h3 className="text-white mb-4">{pkg.name}</h3>
                  <div className="text-white/90">{pkg.hours} hours coverage</div>
                  <div className="text-white/90 mt-2">{pkg.images} images</div>
                </div>
                <div className="p-8">
                  <ul className="space-y-4">
                    <li className="flex items-center justify-between">
                      <span className="text-sm">Travel included</span>
                      {renderFeature(pkg.features.travelIncluded)}
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm">Pre-wedding consultation</span>
                      {renderFeature(pkg.features.preWeddingConsultation)}
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm">Pre-wedding shoot</span>
                      {renderFeature(pkg.features.preWeddingShoot)}
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm">Morning prep</span>
                      {renderFeature(pkg.features.morningPrep)}
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm">Ceremony</span>
                      {renderFeature(pkg.features.ceremony)}
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm">Portraits (Group/Couple)</span>
                      {renderFeature(pkg.features.portraits)}
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm">Reception (speeches)</span>
                      {renderFeature(pkg.features.reception)}
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm">Dances</span>
                      {renderFeature(pkg.features.dances)}
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm">Album</span>
                      {renderFeature(pkg.features.album)}
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm">Videography</span>
                      {renderFeature(pkg.features.videography)}
                    </li>
                  </ul>
                  <Link
                    to="/contact"
                    className="mt-8 w-full bg-primary text-white px-6 h-12 hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2 rounded-sm"
                  >
                    Book {pkg.name}
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-Ons Section */}
      <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center mb-12">Optional Add-Ons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-border rounded-lg p-8">
              <Video className="w-12 h-12 text-primary mb-4" />
              <h3 className="mb-3">Videography</h3>
              <p className="text-foreground/70 mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Add professional wedding videography to capture your day in motion, no hassle booking different vendors, we handle it all!
              </p>
              <p className="font-medium text-primary"></p>
            </div>
            <div className="bg-white border border-border rounded-lg p-8">
              <BookOpen className="w-12 h-12 text-primary mb-4" />
              <h3 className="mb-3">Wedding Album</h3>
              <p className="text-foreground/70 mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Premium quality albums with professional design. Available in various sizes with luxury binding options.
              </p>
              <p className="font-medium text-primary"></p>
            </div>
            <div className="bg-white border border-border rounded-lg p-8">
              <Camera className="w-12 h-12 text-primary mb-4" />
              <h3 className="mb-3">Pre-Wedding Shoot</h3>
              <p className="text-foreground/70 mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Get comfortable in front of the camera with an engagement or pre-wedding photoshoot at a location of your choice.
              </p>
              <p className="font-medium text-primary"></p>
            </div>
            <div className="bg-white border border-border rounded-lg p-8">
              <Clock className="w-12 h-12 text-primary mb-4" />
              <h3 className="mb-3">Additional Hours</h3>
              <p className="text-foreground/70 mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Extend your coverage to capture more of your special day, from extended preparations to late-night celebrations.
              </p>
              <p className="font-medium text-primary"></p>
            </div>
          </div>
        </div>
      </section>

      {/* Videography Section */}
      <section className="py-20 px-6 md:px-20 bg-gradient-to-br from-secondary to-accent">
        <div className="max-w-[1440px] mx-auto text-center">
          <h1 className="mb-6">Wedding Videography</h1>
          <p className="tagline max-w-3xl mx-auto" style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
            Cinematic wedding films that bring your story to life
          </p>
        </div>
      </section>

      {/* Video Showcase Grid */}
      <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="mb-16 text-center">
          <h2 className="mb-4">Our Videography Work</h2>
          <p className="text-foreground/80 max-w-3xl mx-auto" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            Experience the emotion, energy, and magic of real weddings through our cinematic films
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Video Placeholder 1 */}
          <div className="group relative overflow-hidden aspect-video rounded-sm bg-primary/5">
            <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
              <Video size={48} className="text-primary/40 mb-4" />
              <p className="text-primary/60">Video Example 1</p>
              <p className="text-xs text-primary/40 mt-2 px-4 text-center">Upload your videography work here</p>
            </div>
          </div>

          {/* Video Placeholder 2 */}
          <div className="group relative overflow-hidden aspect-video rounded-sm bg-primary/5">
            <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
              <Video size={48} className="text-primary/40 mb-4" />
              <p className="text-primary/60">Video Example 2</p>
              <p className="text-xs text-primary/40 mt-2 px-4 text-center">Upload your videography work here</p>
            </div>
          </div>

          {/* Video Placeholder 3 */}
          <div className="group relative overflow-hidden aspect-video rounded-sm bg-primary/5">
            <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
              <Video size={48} className="text-primary/40 mb-4" />
              <p className="text-primary/60">Video Example 3</p>
              <p className="text-xs text-primary/40 mt-2 px-4 text-center">Upload your videography work here</p>
            </div>
          </div>

          {/* Video Placeholder 4 */}
          <div className="group relative overflow-hidden aspect-video rounded-sm bg-primary/5">
            <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
              <Video size={48} className="text-primary/40 mb-4" />
              <p className="text-primary/60">Video Example 4</p>
              <p className="text-xs text-primary/40 mt-2 px-4 text-center">Upload your videography work here</p>
            </div>
          </div>

          {/* Video Placeholder 5 */}
          <div className="group relative overflow-hidden aspect-video rounded-sm bg-primary/5">
            <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
              <Video size={48} className="text-primary/40 mb-4" />
              <p className="text-primary/60">Video Example 5</p>
              <p className="text-xs text-primary/40 mt-2 px-4 text-center">Upload your videography work here</p>
            </div>
          </div>

          {/* Video Placeholder 6 */}
          <div className="group relative overflow-hidden aspect-video rounded-sm bg-primary/5">
            <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
              <Video size={48} className="text-primary/40 mb-4" />
              <p className="text-primary/60">Video Example 6</p>
              <p className="text-xs text-primary/40 mt-2 px-4 text-center">Upload your videography work here</p>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included in Videography */}
      <section className="py-20 px-6 md:px-20 bg-accent">
        <div className="max-w-[1440px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-6">What's Included</h2>
            <p className="text-foreground/80 max-w-3xl mx-auto" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
              Our videography packages are designed to capture every meaningful moment of your wedding day
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Film size={32} className="text-primary" />
              </div>
              <h3 className="mb-3">Full Day Coverage</h3>
              <p className="text-foreground/80" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                From bridal preparations to the dances, filmed in full, we capture every precious moment of your celebration
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Play size={32} className="text-primary" />
              </div>
              <h3 className="mb-3">Highlight Film</h3>
              <p className="text-foreground/80" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                A beautifully edited 3 minute cinematic film showcasing the best moments of your day
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Heart size={32} className="text-primary" />
              </div>
              <h3 className="mb-3">Full Ceremony</h3>
              <p className="text-foreground/80" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Complete coverage of your ceremony to dances, capturing every vow and emotion
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Videography Approach */}
      <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center mb-12">Our Videography Approach</h2>
          
          <div className="space-y-6 text-foreground/80" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            <p>
              Complement your wedding photography with professionally crafted wedding films that tell 
              your unique love story. Our videography style combines documentary storytelling with 
              cinematic artistry to create films you'll treasure forever.
            </p>
            <p>
              From emotional ceremony moments to energetic reception highlights, we capture every detail 
              in stunning quality. Our unobtrusive approach allows you to enjoy your day naturally while 
              we document the genuine emotions, heartfelt speeches, and joyful celebrations.
            </p>
            <p>
              Working seamlessly with our partners, we ensure complete coverage without disruption. 
              The result is a beautifully crafted film that captures not just what your wedding looked like, 
              but what it felt like.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 md:px-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="mb-8">Ready to Book Your Wedding Photography?</h2>
          <p className="text-foreground/60 mb-12 max-w-2xl mx-auto" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            Get in touch to check availability for your wedding date and discuss which package is right for you. Limited dates available for 2025-2026.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/contact"
              className="bg-primary text-white px-10 h-12 hover:bg-primary/90 transition-colors inline-flex items-center gap-2 rounded-sm min-w-[220px] justify-center"
            >
              Check Availability
              <ArrowRight size={20} />
            </Link>
            <Link
              to="/gallery"
              className="border-2 border-primary text-primary px-10 h-12 hover:bg-primary/5 transition-colors inline-flex items-center gap-2 rounded-sm min-w-[220px] justify-center"
            >
              View Portfolio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
