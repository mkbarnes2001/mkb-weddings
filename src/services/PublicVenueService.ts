export type PublicVenueImage = {
  assetId: string;
  imageId: string;
  weddingSlug: string;
  filename: string;
  order: number;
  rating: number;
  moments: string[];
  tags: string[];
  aiTags: string[];
  thumbSrc: string;
  fullSrc: string;
  alt: string;
  caption: string;
};

export type PublicVenueDocument = {
  schemaVersion: 1;
  id: string;
  slug: string;
  name: string;
  town: string;
  county: string;
  country: string;
  intro: string;
  description: string;
  status: string;
  updatedAt: string;
  links: {
    website: string;
    instagram: string;
    facebook: string;
    googleMaps: string;
  };
  practical: {
    address: string;
    parking: string;
    accommodation: string;
    ceremonyTypes: string;
    capacity: string;
    outdoorCeremony: boolean;
  };
  seo: {
    title: string;
    description: string;
  };
  gallery: {
    schemaVersion: 1;
    updatedAt: string;
    heroAssetId: string;
    images: PublicVenueImage[];
  };
};

export type PublicVenueIndexItem = {
  id: string;
  slug: string;
  name: string;
  town: string;
  county: string;
  country: string;
  status: string;
  updatedAt: string;
  imageCount: number;
  heroAssetId: string;
  coverThumb: string;
  coverFull: string;
  coverAlt: string;
  coverCaption: string;
};

export type PublicVenueIndex = {
  schemaVersion: 1;
  generatedAt: string;
  count: number;
  imageCount: number;
  venues: PublicVenueIndexItem[];
};

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "Published venue data was not found."
        : `Unable to load venue data (${response.status}).`,
    );
  }

  return response.json() as Promise<T>;
}

async function loadWithFallback<T>(
  primary: string,
  fallback: string,
  isUsable?: (value: T) => boolean,
): Promise<T> {
  try {
    const value = await loadJson<T>(primary);
    if (!isUsable || isUsable(value)) return value;
  } catch {
    // Fall through to the static rollback source while D1 is being migrated.
  }
  return loadJson<T>(fallback);
}

export class PublicVenueService {
  static loadIndex() {
    return loadWithFallback<PublicVenueIndex>(
      "/api/public/venues",
      "/venue-data/index.json",
      (index) => Array.isArray(index?.venues) && index.venues.length > 0 && index.imageCount > 0,
    );
  }

  static loadVenue(slug: string) {
    const encoded = encodeURIComponent(slug);
    return loadWithFallback<PublicVenueDocument>(
      `/api/public/venues/${encoded}`,
      `/venue-data/${encoded}.json`,
      (venue) => Array.isArray(venue?.gallery?.images) && venue.gallery.images.length > 0,
    );
  }
}
