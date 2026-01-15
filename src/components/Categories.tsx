import { ArrowRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CategoriesProps {
  onNavigate: (page: string, categorySlug?: string) => void;
  selectedCategory?: string;
}

const categories = [
  {
    name: "Castle Weddings",
    slug: "castles",
    description: "Majestic castle weddings across Northern Ireland, from historic estates to luxury castle hotels. Dramatic architecture and timeless elegance.",
    image: "https://images.unsplash.com/photo-1519167758-8e71c87a3d44?w=800",
    venues: ["Ballyscullion Park", "Castle Leslie Estate", "Cabra Castle", "Dunluce Castle"],
    keywords: "castle wedding photographer northern ireland, castle wedding photography NI, irish castle weddings"
  },
  {
    name: "Beach Weddings",
    slug: "beaches",
    description: "Stunning coastal weddings along Northern Ireland's beautiful beaches. Natural light, ocean views, and windswept romance.",
    image: "https://images.unsplash.com/photo-1522673607211-8c29668e9a93?w=800",
    venues: ["Slieve Donard Resort & Spa", "Dunluce Castle", "Murlough House"],
    keywords: "beach wedding photographer northern ireland, coastal wedding photography NI, seaside wedding photographer"
  },
  {
    name: "Luxury Hotel Weddings",
    slug: "hotels",
    description: "Elegant hotel weddings featuring exceptional service, beautiful interiors, and professional lighting. Perfect for classic, sophisticated celebrations.",
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800",
    venues: ["The Merchant Hotel", "Galgorm Resort & Spa", "Lough Erne Resort", "Slieve Donard Resort & Spa", "Clandeboye Lodge Hotel"],
    keywords: "luxury hotel wedding photographer northern ireland, hotel wedding photography belfast, 5 star wedding photographer NI"
  },
  {
    name: "Outdoor Weddings",
    slug: "outdoor-weddings",
    description: "Garden parties, barn weddings, and outdoor celebrations in Northern Ireland's stunning countryside. Natural settings and creative lighting.",
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
    venues: ["Orange Tree House", "Rocky Mountain Cottage", "Hillmount House", "Drenagh Estate", "Larchfield Estate", "Murlough House"],
    keywords: "outdoor wedding photographer northern ireland, garden wedding photography NI, barn wedding photographer"
  },
  {
    name: "Intimate Elopements",
    slug: "intimate-elopements",
    description: "Small, intimate weddings and elopements. Focused storytelling for couples who want a personal, relaxed celebration with close family.",
    image: "https://images.unsplash.com/photo-1591604129853-b8d6d4e665cf?w=800",
    venues: ["Orange Tree House", "Rocky Mountain Cottage", "Hillmount House"],
    keywords: "elopement photographer northern ireland, intimate wedding photographer NI, small wedding photography"
  }
];

export function Categories({ onNavigate, selectedCategory }: CategoriesProps) {
  const activeCategory = selectedCategory 
    ? categories.find(cat => cat.slug === selectedCategory)
    : null;

  // If a specific category is selected, show that category page
  if (activeCategory) {
    return (
      <div className="pt-20">
        {/* Category Header */}
        <section className="relative h-[60vh] min-h-[400px]">
          <div className="absolute inset-0">
            <ImageWithFallback
              src={activeCategory.image}
              alt={activeCategory.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50"></div>
          </div>
          <div className="relative h-full flex items-center justify-center px-6">
            <div className="text-center text-white max-w-4xl">
              <button
                onClick={() => onNavigate('categories')}
                className="text-white/80 hover:text-white mb-4 inline-flex items-center gap-2 text-sm"
              >
                ← Back to All Categories
              </button>
              <h1 className="text-white mb-6">{activeCategory.name}</h1>
              <p className="text-white/90 text-xl">{activeCategory.description}</p>
            </div>
          </div>
        </section>

        {/* Venues in this Category */}
        <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
          <div className="mb-12">
            <h2 className="mb-6">Featured Venues for {activeCategory.name}</h2>
            <p className="text-foreground/60 max-w-3xl" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
              Click any venue below to see real weddings we've photographed in this style.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {activeCategory.venues.map((venueName) => (
              <button
                key={venueName}
                onClick={() => onNavigate('venues')}
                className="group text-left p-6 border border-border hover:border-primary hover:shadow-lg transition-all rounded-sm bg-white"
              >
                <h3 className="mb-2 group-hover:text-primary transition-colors">{venueName}</h3>
                <div className="flex items-center gap-2 text-primary text-sm group-hover:gap-3 transition-all">
                  View Venue Gallery <ArrowRight size={16} />
                </div>
              </button>
            ))}
          </div>

          {/* Link to Venues Page */}
          <div className="text-center">
            <button
              onClick={() => onNavigate('venues')}
              className="border border-primary px-8 h-12 hover:bg-primary hover:text-white transition-colors inline-flex items-center gap-2 rounded-sm"
            >
              Browse All Venues
              <ArrowRight size={20} />
            </button>
          </div>

          {/* SEO Content */}
          <div className="mt-20 max-w-4xl mx-auto">
            <div className="bg-accent p-8 rounded-sm">
              <h3 className="mb-4">Expert {activeCategory.name} Photography in Northern Ireland</h3>
              <p className="text-foreground/70 mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                As a specialist Northern Ireland wedding photographer with extensive experience in {activeCategory.name.toLowerCase()}, 
                I understand the unique challenges and opportunities that come with photographing weddings in this style. 
                My approach combines creative flash photography, documentary storytelling, and expert use of natural light 
                to create vibrant, dramatic images that capture the essence of your celebration.
              </p>
              <p className="text-foreground/70" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                Whether you're planning your dream {activeCategory.name.toLowerCase().replace(' weddings', ' wedding')} 
                at one of the venues listed above or exploring other options across Northern Ireland, I bring complete 
                reliability, creative expertise, and a fun, relaxed approach to your wedding day.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 md:px-20 bg-gradient-to-br from-secondary to-accent">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="mb-6">Planning Your {activeCategory.name.replace(' Weddings', ' Wedding')}?</h2>
            <p className="text-foreground/60 mb-8 max-w-2xl mx-auto" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
              Let's discuss your wedding photography needs and how we can capture your special day beautifully.
            </p>
            <button
              onClick={() => onNavigate('contact')}
              className="bg-primary text-white px-10 h-12 hover:bg-primary/90 transition-colors inline-flex items-center gap-2 rounded-sm"
            >
              Get in Touch
              <ArrowRight size={20} />
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Default: Show all categories
  return (
    <div className="pt-20">
      {/* Header */}
      <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="text-center mb-16">
          <h1 className="mb-6">Wedding Photography by Style</h1>
          <p className="text-foreground/60 max-w-3xl mx-auto" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            Every wedding style has its own character and charm. Browse our portfolio by wedding type to see how we capture 
            the unique atmosphere of castles, beaches, hotels, outdoor celebrations, and intimate elopements across Northern Ireland.
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {categories.map((category) => (
            <button
              key={category.slug}
              onClick={() => onNavigate('categories', category.slug)}
              className="group text-left overflow-hidden rounded-sm border border-border hover:border-primary hover:shadow-xl transition-all"
            >
              <div className="relative h-64 overflow-hidden">
                <ImageWithFallback
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h2 className="text-white mb-2">{category.name}</h2>
                </div>
              </div>
              <div className="p-6 bg-white">
                <p className="text-foreground/70 mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                  {category.description}
                </p>
                <div className="flex items-center gap-2 text-primary group-hover:gap-3 transition-all">
                  View {category.name} <ArrowRight size={16} />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Link to Venues */}
        <div className="text-center p-12 bg-accent rounded-sm">
          <h2 className="mb-6">Looking for a Specific Venue?</h2>
          <p className="text-foreground/60 mb-8 max-w-2xl mx-auto" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            Browse our full list of Northern Ireland wedding venues organized by region.
          </p>
          <button
            onClick={() => onNavigate('venues')}
            className="bg-primary text-white px-10 h-12 hover:bg-primary/90 transition-colors inline-flex items-center gap-2 rounded-sm"
          >
            View All Venues
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
}

export { categories };
