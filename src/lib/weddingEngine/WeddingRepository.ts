import { weddingStories } from "../../data/weddingStories";
import type { WeddingDocument } from "./WeddingTypes";
import { assertWeddingDocument } from "./WeddingValidator";

function fromLegacyStory(
  slug: string,
): WeddingDocument | undefined {
  const legacy = weddingStories.find((story) => story.slug === slug);

  if (!legacy) return undefined;

  return {
    schemaVersion: 1,
    slug: legacy.slug,
    title: legacy.title,
    couple: legacy.couple,
    venue: legacy.venue,
    weddingDate: legacy.weddingDate,
    excerpt: legacy.excerpt,
    intro: legacy.intro,
    story: legacy.story,
    facts: legacy.facts,
    suppliers: legacy.suppliers,
    seo: {
      title: legacy.seoTitle,
      description: legacy.seoDescription,
    },
    status: "published",
  };
}

async function fetchJsonWedding(
  slug: string,
): Promise<WeddingDocument | undefined> {
  const response = await fetch(
    `/weddings/${encodeURIComponent(slug)}/wedding.json`,
    { cache: "no-store" },
  );

  if (response.status === 404) return undefined;

  if (!response.ok) {
    throw new Error(
      `Unable to load wedding JSON (${response.status}).`,
    );
  }

  const value: unknown = await response.json();
  assertWeddingDocument(value);

  const wedding = value as WeddingDocument;

  if (wedding.slug !== slug) {
    throw new Error(
      `Wedding JSON slug "${wedding.slug}" does not match route "${slug}".`,
    );
  }

  return wedding;
}

export class WeddingRepository {
  async getBySlug(
    slug: string,
  ): Promise<WeddingDocument | undefined> {
    try {
      const jsonWedding = await fetchJsonWedding(slug);

      if (jsonWedding) {
        return jsonWedding;
      }
    } catch (error) {
      console.error(
        `Wedding JSON failed for ${slug}; using legacy fallback.`,
        error,
      );
    }

    return fromLegacyStory(slug);
  }

  getLegacyBySlug(
    slug: string,
  ): WeddingDocument | undefined {
    return fromLegacyStory(slug);
  }
}
