import { AdminApiService } from "./AdminApiService";

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

function factsToList(
  facts:
    | {
        season?: string;
        ceremonyType?: string;
        ceremonyLocation?: string;
        receptionLocation?: string;
        celebrant?: string;
        photographer?: string;
      }
    | undefined,
): StoryFact[] {
  const rows: StoryFact[] = [
    { label: "Season", value: facts?.season || "" },
    { label: "Ceremony", value: facts?.ceremonyType || "" },
    { label: "Ceremony Location", value: facts?.ceremonyLocation || "" },
    { label: "Reception Location", value: facts?.receptionLocation || "" },
    { label: "Celebrant", value: facts?.celebrant || "" },
    { label: "Photography", value: facts?.photographer || "" },
  ];
  return rows.filter((row) => row.value.trim());
}

export class StoryService {
  async getStories(): Promise<StoryRecord[]> {
    const weddings = await AdminApiService.listJsonWeddings();
    return weddings.map((wedding) => ({
      slug: wedding.slug,
      title: wedding.title,
      couple: wedding.couple,
      venue: wedding.venue,
      weddingDate: wedding.weddingDate,
      excerpt: wedding.excerpt,
      intro: wedding.intro,
      paragraphs: Array.isArray(wedding.story) ? wedding.story : [],
      facts: factsToList(wedding.facts),
      supplierCountFromStory: Array.isArray(wedding.suppliers)
        ? wedding.suppliers.length
        : 0,
      updatedAt: wedding.updatedAt,
    }));
  }

  async getStory(slug: string): Promise<StoryRecord | undefined> {
    const wedding = await AdminApiService.getJsonWedding(slug).catch(() => null);
    if (!wedding) return undefined;
    return {
      slug: wedding.slug,
      title: wedding.title,
      couple: wedding.couple,
      venue: wedding.venue,
      weddingDate: wedding.weddingDate,
      excerpt: wedding.excerpt,
      intro: wedding.intro,
      paragraphs: Array.isArray(wedding.story) ? wedding.story : [],
      facts: factsToList(wedding.facts),
      supplierCountFromStory: Array.isArray(wedding.suppliers)
        ? wedding.suppliers.length
        : 0,
      updatedAt: wedding.updatedAt,
    };
  }
}
