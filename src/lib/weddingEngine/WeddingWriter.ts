import type { WeddingDocument } from "./WeddingTypes";
import { assertWeddingDocument } from "./WeddingValidator";

export function prepareWeddingForSave(
  wedding: WeddingDocument,
): WeddingDocument {
  const prepared: WeddingDocument = {
    ...wedding,
    schemaVersion: 1,
    slug: wedding.slug.trim(),
    title: wedding.title.trim(),
    couple: wedding.couple.trim(),
    venue: wedding.venue.trim(),
    weddingDate: wedding.weddingDate.trim(),
    excerpt: wedding.excerpt.trim(),
    intro: wedding.intro.trim(),
    story: wedding.story
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    suppliers: wedding.suppliers
      ?.map((supplier) => ({
        role: supplier.role.trim(),
        name: supplier.name.trim(),
        instagram: supplier.instagram?.trim().replace(/^@/, ""),
        website: supplier.website?.trim(),
      }))
      .filter((supplier) => supplier.role && supplier.name),
    updatedAt: new Date().toISOString(),
  };

  assertWeddingDocument(prepared);
  return prepared;
}

export function weddingToJson(
  wedding: WeddingDocument,
): string {
  return JSON.stringify(
    prepareWeddingForSave(wedding),
    null,
    2,
  ) + "\n";
}
