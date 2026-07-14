import { weddingStories } from "../../data/weddingStories";
import type {
  PublicWeddingDocument,
  PublicWeddingImage,
  WeddingDocument,
} from "./WeddingTypes";

export type PublicWeddingSummary = Pick<
  WeddingDocument,
  | "slug"
  | "title"
  | "couple"
  | "venue"
  | "venueSlug"
  | "weddingDate"
  | "excerpt"
  | "intro"
  | "seo"
  | "updatedAt"
> & {
  source: "legacy" | "json";
  storyEnabled: true;
  storyStatus: "published";
  storyPublishedAt?: string;
  imageCount: number;
  coverImage?: PublicWeddingImage;
};

export type PublicWeddingDetail =
  PublicWeddingDocument & {
    source: "legacy" | "json";
  };

type PublicWeddingIndex = {
  schemaVersion: 1;
  generatedAt: string | null;
  count: number;
  managedSlugs?: string[];
  weddings: Array<
    Omit<PublicWeddingSummary, "source"> & {
      source?: "json";
    }
  >;
};

export type PublicWeddingState = {
  generatedAt: string | null;
  managedSlugs: string[];
  weddings: PublicWeddingSummary[];
};

function legacySummary(
  story: (typeof weddingStories)[number],
): PublicWeddingSummary {
  return {
    source: "legacy",
    slug: story.slug,
    title: story.title,
    couple: story.couple,
    venue: story.venue,
    venueSlug:
      (story as { venueSlug?: string })
        .venueSlug,
    weddingDate: story.weddingDate,
    excerpt: story.excerpt,
    intro: story.intro,
    seo: {
      title: story.seoTitle,
      description: story.seoDescription,
    },
    storyEnabled: true,
    storyStatus: "published",
    imageCount: 0,
  };
}

function legacyDetail(
  story: (typeof weddingStories)[number],
): PublicWeddingDetail {
  return {
    source: "legacy",
    schemaVersion: 1,
    slug: story.slug,
    title: story.title,
    couple: story.couple,
    venue: story.venue,
    venueSlug:
      (story as { venueSlug?: string })
        .venueSlug,
    weddingDate: story.weddingDate,
    excerpt: story.excerpt,
    intro: story.intro,
    story: story.story,
    facts: story.facts,
    suppliers: story.suppliers,
    seo: {
      title: story.seoTitle,
      description: story.seoDescription,
    },
    status: "published",
    storyEnabled: true,
    storyStatus: "published",
    images: [],
  };
}

async function loadJsonIndex(): Promise<PublicWeddingState> {
  try {
    const response = await fetch(
      "/wedding-data/index.json",
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        generatedAt: null,
        managedSlugs: [],
        weddings: [],
      };
    }

    const document =
      (await response.json()) as PublicWeddingIndex;

    if (
      document.schemaVersion !== 1 ||
      !Array.isArray(document.weddings)
    ) {
      return {
        generatedAt: null,
        managedSlugs: [],
        weddings: [],
      };
    }

    return {
      generatedAt: document.generatedAt || null,
      managedSlugs: Array.isArray(
        document.managedSlugs,
      )
        ? document.managedSlugs
        : [],
      weddings: document.weddings
        .filter(
          (wedding) =>
            wedding.storyEnabled === true &&
            wedding.storyStatus === "published",
        )
        .map((wedding) => ({
          ...wedding,
          source: "json" as const,
        })),
    };
  } catch {
    return {
      generatedAt: null,
      managedSlugs: [],
      weddings: [],
    };
  }
}

async function loadJsonDetail(
  slug: string,
): Promise<PublicWeddingDetail | undefined> {
  try {
    const response = await fetch(
      `/wedding-data/${encodeURIComponent(
        slug,
      )}.json`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) return undefined;

    const document =
      (await response.json()) as PublicWeddingDocument;

    if (
      document.schemaVersion !== 1 ||
      document.slug !== slug ||
      document.storyEnabled !== true ||
      document.storyStatus !== "published" ||
      !Array.isArray(document.images)
    ) {
      return undefined;
    }

    return {
      ...document,
      source: "json",
    };
  } catch {
    return undefined;
  }
}

function mergePublished(
  jsonState: PublicWeddingState,
): PublicWeddingSummary[] {
  const managed = new Set(
    jsonState.managedSlugs,
  );

  const map = new Map<
    string,
    PublicWeddingSummary
  >();

  weddingStories
    .filter((story) => !managed.has(story.slug))
    .forEach((story) => {
      map.set(story.slug, legacySummary(story));
    });

  jsonState.weddings.forEach((wedding) => {
    map.set(wedding.slug, wedding);
  });

  /*
   * Map replacement preserves the established weddingStories.ts order for
   * legacy stories. Newly published JSON-only stories are appended.
   */
  return Array.from(map.values());
}

export class PublicWeddingRepository {
  async getPublishedState(): Promise<
    PublicWeddingState
  > {
    const jsonState = await loadJsonIndex();

    return {
      ...jsonState,
      weddings: mergePublished(jsonState),
    };
  }

  async getAllPublished(): Promise<
    PublicWeddingSummary[]
  > {
    return (await this.getPublishedState())
      .weddings;
  }

  async getPublishedBySlug(
    slug: string,
  ): Promise<PublicWeddingDetail | undefined> {
    const jsonDetail = await loadJsonDetail(slug);

    if (jsonDetail) return jsonDetail;

    const jsonState = await loadJsonIndex();

    if (jsonState.managedSlugs.includes(slug)) {
      return undefined;
    }

    const legacy = weddingStories.find(
      (story) => story.slug === slug,
    );

    return legacy
      ? legacyDetail(legacy)
      : undefined;
  }
}
