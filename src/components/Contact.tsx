import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Instagram, Facebook, Send, Check } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { motion, AnimatePresence } from 'motion/react';
import heroImage1 from 'figma:asset/56c087b2e44825658578c4eebea8003fc82789e5.png';
import heroImage2 from 'figma:asset/f0c6a12bde87e175e2aadb88f75b83c7f4125e86.png';
import heroImage3 from 'figma:asset/6595a05dfe41b8f2fc54e571acf9e9a24994d353.png';
import heroImage4 from 'figma:asset/2018a530540d6cd532e764d8c4467195d61fe49a.png';

export function Contact() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    venue: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, this would send the data to a server
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        date: '',
        venue: '',
        message: '',
      });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const heroCarouselImages = [
    heroImage1,
    heroImage2,
    heroImage3,
    heroImage4,
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroCarouselImages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroCarouselImages.length]);

  return (
    <div className="-mt-20 min-h-screen">
      {/* Hero Carousel Section */}
      <section className="relative h-[70vh] overflow-hidden">
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
              alt={`Contact MKB Weddings ${currentSlide + 1}`}
              className="w-full h-full object-cover object-center"
              style={{ objectPosition: 'center 40%' }}
            />
            <div className="absolute inset-0 bg-black/45"></div>
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
              Get in Touch
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Ready to book your wedding photography? We'd love to hear about your special day and how we can help capture your memories.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          {/* Contact Form */}
          <div>
            <h2 className="mb-6">Send Us a Message</h2>
            <p className="text-foreground/60 mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
              Fill out the form below to check availability and discuss your wedding photography needs.
            </p>
            <p className="text-primary mb-10" style={{ fontSize: '1rem', lineHeight: '1.6', fontWeight: '500' }}>
              Most couples receive a reply within 24 hours.
            </p>

            {/* Studio Ninja Contact Form */}
            <div className="w-full">
              <iframe 
                height="759" 
                style={{ minWidth: '100%', maxWidth: '1260px', border: 0 }} 
                id="sn-form-wsgz3"
                src="https://app.studioninja.co/contactform/parser/0a800fc9-82a4-1a61-8182-f546140b694f/0a800fc8-82a4-122c-8183-0a866445138a"
                allowFullScreen
              />
              <script 
                type="text/javascript" 
                data-iframe-id="sn-form-wsgz3"
                src="https://app.studioninja.co/client-assets/form-render/assets/scripts/iframeResizer.js"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h2 className="mb-6">Contact Information</h2>
            <p className="text-foreground/60 mb-8" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
              Prefer to reach out directly? Here are all the ways you can get in touch with us.
            </p>

            <div className="space-y-6 mb-12">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary flex items-center justify-center flex-shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="mb-1">Email</h3>
                  <a
                    href="mailto:mark@mkbweddings.com"
                    className="text-foreground/60 hover:text-primary transition-colors"
                  >
                    mark@mkbweddings.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary flex items-center justify-center flex-shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <h3 className="mb-1">Phone</h3>
                  <a
                    href="tel:+447546456077"
                    className="text-foreground/60 hover:text-primary transition-colors"
                  >
                    +44 (0) 7546 456077
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary flex items-center justify-center flex-shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="mb-1">Service Area</h3>
                  <p className="text-foreground/60">
                    Available throughout the region
                    <br />
                    Travel available for destination weddings
                  </p>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="border-t border-primary/20 pt-8">
              <h3 className="text-2xl mb-4">Follow Our Work</h3>
              <p className="text-foreground/60 mb-6">
                See our latest weddings and behind-the-scenes content on social media.
              </p>
              <div className="flex gap-4">
                <a
                  href="https://instagram.com/mkbweddings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-primary text-white flex items-center justify-center hover:bg-primary/80 transition-colors"
                >
                  <Instagram size={20} />
                </a>
                <a
                  href="https://facebook.com/mkbweddings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-primary text-white flex items-center justify-center hover:bg-primary/80 transition-colors"
                >
                  <Facebook size={20} />
                </a>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="border-t border-primary/20 pt-8 mt-8">
              <h3 className="text-2xl mb-6">Quick Answers</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="mb-2">How far in advance should we book?</h4>
                  <p className="text-foreground/60">
                    We recommend booking 9-12 months in advance, especially for peak wedding season (May-October).
                  </p>
                </div>
                <div>
                  <h4 className="mb-2">Do you travel for weddings?</h4>
                  <p className="text-foreground/60">
                    Yes! We love destination weddings and are available to travel anywhere.
                  </p>
                </div>
                <div>
                  <h4 className="mb-2">When do we receive our photos?</h4>
                  <p className="text-foreground/60">
                    Your edited gallery will be delivered within 6-8 weeks after your wedding day.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-primary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl mb-6">Let's Create Something Beautiful</h2>
          <p className="text-xl text-white/80 mb-8">
            Your wedding day is one of the most important days of your life. Let's make sure it's captured perfectly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:mark@mkbweddings.com"
              className="bg-white text-primary px-10 py-4 hover:bg-white/90 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Mail size={20} />
              Email Us
            </a>
            <a
              href="tel:+44 (0) 7546 456077"
              className="border-2 border-white text-white px-10 py-4 hover:bg-white hover:text-primary transition-colors inline-flex items-center justify-center gap-2"
            >
              <Phone size={20} />
              Call Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
