import { weddingStories } from "../../data/weddingStories";
import type { WeddingDocument } from "./WeddingTypes";

export type PublicWeddingSummary = Pick<
  WeddingDocument,
  | "slug"
  | "title"
  | "couple"
  | "venue"
  | "weddingDate"
  | "excerpt"
  | "intro"
  | "seo"
  | "status"
  | "updatedAt"
>;

type PublicWeddingIndex = {
  schemaVersion: 1;
  generatedAt: string | null;
  count: number;
  weddings: PublicWeddingSummary[];
};

function legacyPublishedSummaries(): PublicWeddingSummary[] {
  return weddingStories.map((story) => ({
    slug: story.slug,
    title: story.title,
    couple: story.couple,
    venue: story.venue,
    weddingDate: story.weddingDate,
    excerpt: story.excerpt,
    intro: story.intro,
    seo: {
      title: story.seoTitle,
      description: story.seoDescription,
    },
    status: "published",
  }));
}

async function loadPublishedJsonIndex(): Promise<
  PublicWeddingSummary[]
> {
  try {
    const response = await fetch("/weddings-index.json", {
      cache: "no-store",
    });

    if (!response.ok) return [];

    const document = (await response.json()) as PublicWeddingIndex;

    if (
      document.schemaVersion !== 1 ||
      !Array.isArray(document.weddings)
    ) {
      return [];
    }

    return document.weddings.filter(
      (wedding) => wedding.status === "published",
    );
  } catch {
    return [];
  }
}

function mergePublishedWeddings(
  legacy: PublicWeddingSummary[],
  json: PublicWeddingSummary[],
) {
  const map = new Map<string, PublicWeddingSummary>();

  legacy.forEach((wedding) => map.set(wedding.slug, wedding));
  json.forEach((wedding) => map.set(wedding.slug, wedding));

  return Array.from(map.values()).filter(
    (wedding) => wedding.status === "published",
  );
}

export class PublicWeddingRepository {
  async getAllPublished(): Promise<PublicWeddingSummary[]> {
    const jsonWeddings = await loadPublishedJsonIndex();

    return mergePublishedWeddings(
      legacyPublishedSummaries(),
      jsonWeddings,
    );
  }

  async getPublishedBySlug(
    slug: string,
  ): Promise<PublicWeddingSummary | undefined> {
    return (await this.getAllPublished()).find(
      (wedding) => wedding.slug === slug,
    );
  }
}
