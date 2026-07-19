export type PublicVenueImage = {
  assetId: string;
  imageId: string;
  weddingSlug: string;
  filename: string;
  order: number;
  rating: number;
  moments: string[];
  tags: string[];
  thumbSrc: string;
  fullSrc: string;
  alt: string;
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

async function loadWithFallback<T>(primary: string, fallback: string): Promise<T> {
  try {
    return await loadJson<T>(primary);
  } catch {
    return loadJson<T>(fallback);
  }
}

export class PublicVenueService {
  static loadIndex() {
    return loadWithFallback<PublicVenueIndex>(
      "/api/public/venues",
      "/venue-data/index.json",
    );
  }

  static loadVenue(slug: string) {
    const encoded = encodeURIComponent(slug);
    return loadWithFallback<PublicVenueDocument>(
      `/api/public/venues/${encoded}`,
      `/venue-data/${encoded}.json`,
    );
  }
}
