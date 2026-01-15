import { MapPin, ArrowRight } from 'lucide-react';

interface VenuesProps {
  onNavigate: (page: string, venueSlug?: string) => void;
}

// Northern Ireland wedding venues organized by region
const venues = [
  {
    name: "Orange Tree House",
    location: "Greyabbey, Co. Down",
    region: "County Down",
    slug: "orange-tree-house",
    categories: ["Outdoor weddings", "Intimate elopements"],
    featured: true
  },
  {
    name: "Ballyscullion Park",
    location: "Bellaghy, Co. Derry",
    region: "County Derry",
    slug: "ballyscullion-park",
    categories: ["Hotels", "Castles"],
    featured: true
  },
  {
    name: "The Merchant Hotel",
    location: "Belfast",
    region: "Belfast",
    slug: "the-merchant-hotel",
    categories: ["Hotels"],
    featured: true
  },
  {
    name: "Rocky Mountain Cottage",
    location: "Newry, Co. Down",
    region: "County Down",
    slug: "rocky-mountain-cottage",
    categories: ["Outdoor weddings", "Intimate elopements"],
    featured: true
  },
  {
    name: "Galgorm Resort & Spa",
    location: "Ballymena, Co. Antrim",
    region: "County Antrim",
    slug: "galgorm-resort",
    categories: ["Hotels"]
  },
  {
    name: "Lough Erne Resort",
    location: "Enniskillen, Co. Fermanagh",
    region: "County Fermanagh",
    slug: "lough-erne-resort",
    categories: ["Hotels", "Outdoor weddings"]
  },
  {
    name: "Hillmount House",
    location: "Cullybackey, Co. Antrim",
    region: "County Antrim",
    slug: "hillmount-house",
    categories: ["Outdoor weddings", "Intimate elopements"]
  },
  {
    name: "Slieve Donard Resort & Spa",
    location: "Newcastle, Co. Down",
    region: "County Down",
    slug: "slieve-donard-resort",
    categories: ["Hotels", "Beaches"]
  },
  {
    name: "Castle Leslie Estate",
    location: "Glaslough, Co. Monaghan",
    region: "Irish Border Counties",
    slug: "castle-leslie-estate",
    categories: ["Castles", "Hotels"]
  },
  {
    name: "Cabra Castle",
    location: "Kingscourt, Co. Cavan",
    region: "Irish Border Counties",
    slug: "cabra-castle",
    categories: ["Castles"]
  },
  {
    name: "Drenagh Estate",
    location: "Limavady, Co. Derry",
    region: "County Derry",
    slug: "drenagh-estate",
    categories: ["Outdoor weddings"]
  },
  {
    name: "Clandeboye Lodge Hotel",
    location: "Bangor, Co. Down",
    region: "County Down",
    slug: "clandeboye-lodge",
    categories: ["Hotels"]
  },
  {
    name: "Larchfield Estate",
    location: "Lisburn, Co. Antrim",
    region: "County Antrim",
    slug: "larchfield-estate",
    categories: ["Outdoor weddings"]
  },
  {
    name: "Dunluce Castle",
    location: "Bushmills, Co. Antrim",
    region: "County Antrim",
    slug: "dunluce-castle",
    categories: ["Castles", "Beaches"]
  },
  {
    name: "Murlough House",
    location: "Dundrum, Co. Down",
    region: "County Down",
    slug: "murlough-house",
    categories: ["Beaches", "Outdoor weddings"]
  }
];

// Group venues by region
const venuesByRegion = venues.reduce((acc, venue) => {
  if (!acc[venue.region]) {
    acc[venue.region] = [];
  }
  acc[venue.region].push(venue);
  return acc;
}, {} as Record<string, typeof venues>);

// Sort regions alphabetically
const sortedRegions = Object.keys(venuesByRegion).sort();

export function Venues({ onNavigate }: VenuesProps) {
  return (
    <div className="pt-20">
      {/* Header */}
      <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="text-center mb-16">
          <h1 className="mb-6">Northern Ireland Wedding Venues</h1>
          <p className="text-foreground/60 max-w-3xl mx-auto" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            We've photographed weddings at stunning venues across Northern Ireland, from intimate country estates to luxurious castle hotels. Browse our venue portfolio to see real weddings and get inspired for your special day.
          </p>
        </div>

        {/* Quick Links to Categories */}
        <div className="mb-20 bg-accent p-8 rounded-sm">
          <h3 className="mb-6 text-center">Browse by Wedding Style</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {['Castles', 'Beaches', 'Hotels', 'Outdoor weddings', 'Intimate elopements'].map((category) => (
              <button
                key={category}
                onClick={() => onNavigate('categories', category.toLowerCase().replace(/\s+/g, '-'))}
                className="px-6 py-2 bg-white border border-primary text-primary hover:bg-primary hover:text-white transition-colors rounded-sm text-sm"
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Venues by Region */}
        <div className="space-y-16">
          {sortedRegions.map((region) => (
            <div key={region}>
              <h2 className="mb-8 pb-4 border-b border-border">{region}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {venuesByRegion[region]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((venue) => (
                    <button
                      key={venue.slug}
                      onClick={() => onNavigate('venue', venue.slug)}
                      className="group text-left p-6 border border-border hover:border-primary hover:shadow-lg transition-all rounded-sm bg-white"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <MapPin size={20} className="text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="mb-1 group-hover:text-primary transition-colors">
                            {venue.name}
                          </h3>
                          <p className="text-sm text-foreground/60">{venue.location}</p>
                        </div>
                        {venue.featured && (
                          <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {venue.categories.map((cat) => (
                          <span
                            key={cat}
                            className="text-xs bg-accent text-foreground/70 px-2 py-1 rounded"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-primary text-sm group-hover:gap-3 transition-all">
                        View Gallery <ArrowRight size={16} />
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 text-center p-12 bg-gradient-to-br from-secondary to-accent rounded-sm">
          <h2 className="mb-6">Don't See Your Venue?</h2>
          <p className="text-foreground/60 mb-8 max-w-2xl mx-auto" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
            We're experienced photographing weddings at venues across Northern Ireland and the border counties. Get in touch to discuss your specific venue.
          </p>
          <button
            onClick={() => onNavigate('contact')}
            className="bg-primary text-white px-10 h-12 hover:bg-primary/90 transition-colors inline-flex items-center gap-2 rounded-sm"
          >
            Contact Us
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
}

// Export venue data for use in other components
export { venues };
