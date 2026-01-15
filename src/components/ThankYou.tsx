import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home, Mail } from 'lucide-react';

export function ThankYou() {
  return (
    <div className="-mt-20">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center bg-gradient-to-br from-accent to-secondary px-6">
        <div className="max-w-3xl mx-auto text-center py-32">
          <CheckCircle className="w-20 h-20 text-primary mx-auto mb-8" />
          <h1 className="mb-6">Thanks For Enquiring</h1>
          <p className="text-foreground/70 mb-12" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            We will get back to you within 24 hours. If you don't receive a reply, please check your junk folder.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/"
              className="bg-primary text-white px-8 h-12 hover:bg-primary/90 transition-colors inline-flex items-center gap-2 rounded-sm min-w-[200px] justify-center"
            >
              <Home size={20} />
              Back to Home
            </Link>
            <Link
              to="/gallery"
              className="border-2 border-primary text-primary px-8 h-12 hover:bg-primary/5 transition-colors inline-flex items-center gap-2 rounded-sm min-w-[200px] justify-center"
            >
              View Gallery
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* What Happens Next */}
      <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center mb-12">What Happens Next?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="mb-3">I Review Your Message</h3>
              <p className="text-foreground/70" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                I'll carefully read through your wedding details and requirements to understand your needs
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="mb-3">I'll Get Back to You</h3>
              <p className="text-foreground/70" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Expect a personalized response within 24-48 hours with availability and next steps
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="mb-3">Let's Chat</h3>
              <p className="text-foreground/70" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                We can arrange a call or meeting to discuss your wedding photography in detail
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="py-20 px-6 md:px-20 bg-accent">
        <div className="max-w-4xl mx-auto text-center">
          <Mail className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="mb-6">Haven't Heard Back?</h2>
          <p className="text-foreground/70 mb-8" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            If you haven't received a response within 48 hours, please check your spam folder. 
            Alternatively, you can reach out directly via phone or social media.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="tel:+447123456789"
              className="border-2 border-primary text-primary px-8 h-12 hover:bg-primary/5 transition-colors inline-flex items-center gap-2 rounded-sm min-w-[200px] justify-center"
            >
              Call: 07123 456789
            </a>
            <a
              href="mailto:hello@mkbweddings.com"
              className="border-2 border-primary text-primary px-8 h-12 hover:bg-primary/5 transition-colors inline-flex items-center gap-2 rounded-sm min-w-[200px] justify-center"
            >
              Email Direct
            </a>
          </div>
        </div>
      </section>

      {/* Explore More */}
      <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center mb-12">While You Wait, Explore More</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link
              to="/gallery"
              className="group bg-white border-2 border-border hover:border-primary rounded-lg p-8 transition-all"
            >
              <h3 className="mb-3 group-hover:text-primary transition-colors">Browse the Gallery</h3>
              <p className="text-foreground/70 mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Explore real weddings across Northern Ireland's most beautiful venues
              </p>
              <div className="flex items-center text-primary">
                View Gallery <ArrowRight size={18} className="ml-2" />
              </div>
            </Link>

            <Link
              to="/packages"
              className="group bg-white border-2 border-border hover:border-primary rounded-lg p-8 transition-all"
            >
              <h3 className="mb-3 group-hover:text-primary transition-colors">View Packages</h3>
              <p className="text-foreground/70 mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Learn more about our wedding photography packages and what's included
              </p>
              <div className="flex items-center text-primary">
                See Packages <ArrowRight size={18} className="ml-2" />
              </div>
            </Link>

            <Link
              to="/blog"
              className="group bg-white border-2 border-border hover:border-primary rounded-lg p-8 transition-all"
            >
              <h3 className="mb-3 group-hover:text-primary transition-colors">Read Stories & Reviews</h3>
              <p className="text-foreground/70 mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Real stories and testimonials from couples I've had the pleasure of working with
              </p>
              <div className="flex items-center text-primary">
                Read Stories <ArrowRight size={18} className="ml-2" />
              </div>
            </Link>

            <Link
              to="/categories"
              className="group bg-white border-2 border-border hover:border-primary rounded-lg p-8 transition-all"
            >
              <h3 className="mb-3 group-hover:text-primary transition-colors">Browse by Style</h3>
              <p className="text-foreground/70 mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Find inspiration from castles, beaches, hotels, and intimate elopements
              </p>
              <div className="flex items-center text-primary">
                Explore Styles <ArrowRight size={18} className="ml-2" />
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}