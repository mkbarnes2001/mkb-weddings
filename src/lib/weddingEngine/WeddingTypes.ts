export interface WeddingSupplier {
  role: string;
  name: string;
  instagram?: string;
  website?: string;
}

export interface WeddingFacts {
  season?: string;
  ceremonyType?: string;
  ceremonyLocation?: string;
  receptionLocation?: string;
  celebrant?: string;
  photographer?: string;
}

export interface WeddingSeo {
  title?: string;
  description?: string;
}

export interface WeddingDocument {
  schemaVersion: 1;
  slug: string;
  title: string;
  couple: string;
  venue: string;
  venueSlug?: string;
  venueId?: string;
  weddingDate: string;
  excerpt: string;
  intro: string;
  story: string[];
  facts?: WeddingFacts;
  suppliers?: WeddingSupplier[];
  seo?: WeddingSeo;
  status?: "draft" | "published" | "archived";
  updatedAt?: string;
}
