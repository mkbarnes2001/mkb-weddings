import type { WeddingDocument } from "../../lib/weddingEngine";
import type { VenueDirectoryEntry } from "./VenueDirectoryService";

export type NewWeddingDraft = {
  couple: string;
  venue: string;
  venueSlug?: string;
  venueId?: string;
  weddingDate: string;
  title: string;
  slug: string;
  photographer: string;
  status: "draft" | "published";
};

export function slugifyWedding(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function suggestWeddingSlug(couple: string, venue: string) {
  return slugifyWedding(`${venue} ${couple}`);
}

export function suggestWeddingTitle(couple: string, venue: string) {
  const names = couple.trim();
  const place = venue.trim();

  if (!names && !place) return "";
  if (!place) return `${names}'s wedding`;
  if (!names) return `A wedding at ${place}`;

  return `${names}'s wedding at ${place}`;
}

export function createWeddingDocument(
  draft: NewWeddingDraft,
): WeddingDocument {
  return {
    schemaVersion: 1,
    slug: draft.slug.trim(),
    title: draft.title.trim(),
    couple: draft.couple.trim(),
    venue: draft.venue.trim(),
    venueSlug: draft.venueSlug?.trim() || undefined,
    venueId: draft.venueId?.trim() || undefined,
    weddingDate: draft.weddingDate.trim(),
    excerpt: "",
    intro: "",
    story: [],
    facts: {
      photographer: draft.photographer.trim() || "MKB Weddings",
    },
    suppliers: [
      {
        role: "Photography",
        name: draft.photographer.trim() || "MKB Weddings",
        instagram: "mkbweddings",
        website: "https://www.mkbweddings.co.uk",
      },
      {
        role: "Venue",
        name: draft.venue.trim(),
      },
    ],
    seo: {
      title: "",
      description: "",
    },
    status: draft.status,
  };
}

export function validateNewWeddingDraft(
  draft: NewWeddingDraft,
  existingSlugs: string[],
) {
  const errors: string[] = [];

  if (!draft.couple.trim()) errors.push("Couple names are required.");
  if (!draft.venue.trim()) errors.push("Venue is required.");
  if (!draft.weddingDate.trim()) errors.push("Wedding date is required.");
  if (!draft.title.trim()) errors.push("Title is required.");

  if (!draft.slug.trim()) {
    errors.push("Slug is required.");
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug.trim())) {
    errors.push("Slug can only contain lowercase letters, numbers and hyphens.");
  }

  if (existingSlugs.includes(draft.slug.trim())) {
    errors.push("A wedding with this slug already exists.");
  }

  return errors;
}

export function filterVenueSuggestions(
  venues: VenueDirectoryEntry[],
  value: string,
) {
  const query = value.trim().toLowerCase();
  if (!query) return venues.slice(0, 10);

  return venues
    .filter((venue) => venue.name.toLowerCase().includes(query))
    .slice(0, 10);
}
