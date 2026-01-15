// Gallery data storage - this file manages the wedding photo galleries

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  venue: string; // venue ID
  moments: string[]; // getting-ready, ceremony, portraits, reception, etc.
  styles: string[]; // editorial, documentary, flash-creative, fine-art, etc.
  story?: string; // optional: story ID this image belongs to
}

export interface Venue {
  id: string;
  name: string;
  location: string;
  description: string;
  keywords: string[];
  images: GalleryImage[];
}

export interface WeddingStory {
  id: string;
  coupleName: string;
  venue: string;
  venueName: string;
  date?: string;
  description: string;
  heroImage: string;
  images: string[]; // array of image IDs
}

// Moment categories
export const moments = [
  { id: 'getting-ready', name: 'Getting Ready', description: 'Preparation and anticipation' },
  { id: 'ceremony', name: 'Ceremony', description: 'The moment you say "I do"' },
  { id: 'couple-portraits', name: 'Couple Portraits', description: 'Just the two of you' },
  { id: 'family-bridal-party', name: 'Family and Bridal Party', description: 'Celebrating with loved ones' },
  { id: 'reception-party', name: 'Reception and Party', description: 'Dance, celebrate, and have fun' },
  { id: 'details-decor', name: 'Details and Decor', description: 'The little things that matter' },
];

// Photography styles
export const photographyStyles = [
  { id: 'editorial', name: 'Editorial / Portrait-Driven', description: 'Magazine-worthy portraits' },
  { id: 'documentary', name: 'Documentary / Candid', description: 'Real moments, unposed' },
  { id: 'flash-creative', name: 'Flash-Lit Creative', description: 'Dramatic lighting artistry' },
  { id: 'fine-art', name: 'Fine Art / Romantic', description: 'Timeless and elegant' },
  { id: 'light-vibrant', name: 'Light & Vibrant', description: 'Bright and colorful' },
  { id: 'moody-dramatic', name: 'Moody & Dramatic', description: 'Dark and atmospheric' },
  { id: 'fun-playful', name: 'Fun & Playful', description: 'Joyful and energetic' },
];

// Best Of categories
export const bestOfCategories = [
  { id: 'couple-portraits', name: 'Best Couple Portraits', description: 'Our favorite couple moments' },
  { id: 'dance-floor-moments', name: 'Best Dance Floor Moments', description: 'When the party gets wild' },
  { id: 'bridal-portraits', name: 'Best Bridal Portraits', description: 'Stunning bride moments' },
  { id: 'scenic-weddings', name: 'Best Scenic Weddings', description: 'Breathtaking locations' },
];

// Featured wedding stories
export const featuredStories: WeddingStory[] = [
  {
    id: 'emma-simon-lusty-beg',
    coupleName: 'Emma & Simon',
    venue: 'lusty-beg-island',
    venueName: 'Lusty Beg Island',
    description: 'A magical island wedding with stunning lake views and an intimate celebration surrounded by nature.',
    heroImage: '',
    images: [],
  },
  {
    id: 'jenny-gerard-killeavy',
    coupleName: 'Jenny & Gerard',
    venue: 'killeavy-castle',
    venueName: 'Killeavy Castle',
    description: 'Elegant castle wedding blending historic grandeur with modern romance in the heart of County Armagh.',
    heroImage: '',
    images: [],
  },
  {
    id: 'pennie-adam-orange-tree',
    coupleName: 'Pennie & Adam',
    venue: 'orange-tree-house',
    venueName: 'Orange Tree House',
    description: 'A vibrant celebration filled with personal touches, laughter, and unforgettable moments at this unique venue.',
    heroImage: '',
    images: [],
  },
];

// Initial venues with your uploaded photos
export const initialVenues: Venue[] = [
  {
    id: 'lusty-beg-island',
    name: 'Lusty Beg Island',
    location: 'Kesh, County Fermanagh',
    description: 'A magical island retreat on Lough Erne offering stunning waterfront views and intimate charm.',
    keywords: ['lusty beg island wedding', 'island wedding northern ireland', 'lough erne wedding', 'fermanagh wedding venue'],
    images: [],
  },
  {
    id: 'killeavy-castle',
    name: 'Killeavy Castle Estate',
    location: 'Newry, County Armagh',
    description: 'Historic luxury castle estate with breathtaking mountain views and timeless elegance.',
    keywords: ['killeavy castle wedding', 'castle wedding northern ireland', 'armagh wedding venue', 'luxury wedding venue'],
    images: [],
  },
  {
    id: 'orange-tree-house',
    name: 'Orange Tree House',
    location: 'Greyabbey, County Down',
    description: 'Charming historic house with beautiful gardens and a warm, welcoming atmosphere.',
    keywords: ['orange tree house wedding', 'greyabbey wedding', 'county down wedding venue', 'garden wedding'],
    images: [],
  },
  {
    id: 'galgorm-resort',
    name: 'Galgorm Resort & Spa',
    location: 'Ballymena, County Antrim',
    description: 'Award-winning luxury resort featuring riverside grounds and world-class facilities.',
    keywords: ['galgorm wedding', 'galgorm resort wedding', 'antrim wedding venue', 'luxury spa wedding'],
    images: [],
  },
  {
    id: 'culloden-estate',
    name: 'Culloden Estate & Spa',
    location: 'Holywood, County Down',
    description: 'Five-star palace hotel overlooking Belfast Lough with opulent interiors and manicured gardens.',
    keywords: ['culloden estate wedding', 'culloden hotel wedding', 'belfast wedding venue', 'luxury hotel wedding'],
    images: [],
  },
  {
    id: 'lough-erne-resort',
    name: 'Lough Erne Resort',
    location: 'Enniskillen, County Fermanagh',
    description: 'Five-star resort on a stunning peninsula with panoramic lake views and championship golf course.',
    keywords: ['lough erne resort wedding', 'enniskillen wedding', 'fermanagh wedding venue', 'lakeside wedding'],
    images: [],
  },
  {
    id: 'belle-isle-estate',
    name: 'Belle Isle Estate',
    location: 'Lisbellaw, County Fermanagh',
    description: 'Exclusive private estate on its own island with a romantic castle and parkland setting.',
    keywords: ['belle isle wedding', 'castle island wedding', 'fermanagh estate wedding', 'private island wedding'],
    images: [],
  },
  {
    id: 'cabra-castle',
    name: 'Cabra Castle',
    location: 'Kingscourt, County Cavan',
    description: 'Medieval castle with Victorian Gothic charm set in 100 acres of parkland.',
    keywords: ['cabra castle wedding', 'castle wedding ireland', 'cavan wedding venue', 'gothic castle wedding'],
    images: [],
  },
  {
    id: 'beach-coastal',
    name: 'Beach & Coastal Weddings',
    location: 'Coastal Locations',
    description: 'Stunning seaside ceremonies with ocean views and natural beauty creating unforgettable moments.',
    keywords: ['beach wedding', 'coastal wedding', 'seaside ceremony', 'ocean view', 'waterfront wedding'],
    images: [],
  },
  {
    id: 'garden-venues',
    name: 'Garden Weddings',
    location: 'Various Garden Venues',
    description: 'Romantic garden settings with natural beauty and lush greenery creating the perfect backdrop.',
    keywords: ['garden wedding', 'outdoor wedding', 'botanical garden', 'nature wedding', 'floral backdrop'],
    images: [],
  },
];

// Load venues from localStorage or use initial venues
export function loadVenues(): Venue[] {
  if (typeof window === 'undefined') return initialVenues;
  
  const saved = localStorage.getItem('mkb_gallery_venues');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved venues:', e);
      return initialVenues;
    }
  }
  return initialVenues;
}

// Save venues to localStorage
export function saveVenues(venues: Venue[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mkb_gallery_venues', JSON.stringify(venues));
}