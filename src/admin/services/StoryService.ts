import { weddingStories } from "../../data/weddingStories";

export type StoryFact = {
  label: string;
  value: string;
};

export type StoryRecord = {
  slug: string;
  title: string;
  couple: string;
  venue: string;
  weddingDate: string;
  excerpt?: string;
  intro?: string;
  paragraphs: string[];
  facts: StoryFact[];
  supplierCountFromStory: number;
  updatedAt?: string;
};

type StoryOverride = {
  slug?: string;
  title?: string;
  excerpt?: string;
  intro?: string;
  paragraphs?: string[];
  facts?: StoryFact[];
  updatedAt?: string;
};

type StoryOverrideDocument = {
  stories?: Record<string, StoryOverride>;
};

function factsToList(
  facts: Record<string, string | undefined> | undefined,
): StoryFact[] {
  if (!facts) return [];

  const labels: Record<string, string> = {
    season: "Season",
    ceremonyType: "Ceremony",
    ceremonyLocation: "Ceremony Location",
    receptionLocation: "Reception",
    celebrant: "Celebrant",
    photographer: "Photography",
  };

  return Object.entries(facts)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => ({
      label: labels[key] || key,
      value: value || "",
    }));
}

async function loadOverrides(): Promise<Record<string, StoryOverride>> {
  try {
    const response = await fetch("/wedding-stories-admin.json", {
      cache: "no-store",
    });

    if (!response.ok) return {};

    const document = (await response.json()) as StoryOverrideDocument;
    return document.stories || {};
  } catch {
    return {};
  }
}

export class StoryService {
  async getStories(): Promise<StoryRecord[]> {
    const overrides = await loadOverrides();

    return weddingStories.map((story) => {
      const override = overrides[story.slug];

      return {
        slug: story.slug,
        title: override?.title || story.title,
        couple: story.couple,
        venue: story.venue,
        weddingDate: story.weddingDate,
        excerpt: override?.excerpt ?? story.excerpt,
        intro: override?.intro ?? story.intro,
        paragraphs: override?.paragraphs ?? story.story ?? [],
        facts: override?.facts ?? factsToList(story.facts),
        supplierCountFromStory: story.suppliers?.length || 0,
        updatedAt: override?.updatedAt,
      };
    });
  }

  async getStory(slug: string): Promise<StoryRecord | undefined> {
    return (await this.getStories()).find((story) => story.slug === slug);
  }
}
