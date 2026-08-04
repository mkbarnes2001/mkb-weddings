import { weddingStories } from "../data/weddingStories";
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
  source: "legacy" | "json" | "d1";
  storyEnabled: true;
  storyStatus: "published";
  storyPublishedAt?: string;
  imageCount: number;
  coverImage?: PublicWeddingImage;
};

export type PublicWeddingDetail = PublicWeddingDocument & {
  source: "legacy" | "json" | "d1";
};

type PublicWeddingIndex = {
  schemaVersion: 1;
  generatedAt: string | null;
  count: number;
  managedSlugs?: string[];
  weddings: Array<
    Omit<PublicWeddingSummary, "source"> & {
      source?: "json" | "d1";
    }
  >;
};

export type PublicWeddingState = {
  generatedAt: string | null;
  managedSlugs: string[];
  weddings: PublicWeddingSummary[];
};

function emptyState(): PublicWeddingState {
  return { generatedAt: null, managedSlugs: [], weddings: [] };
}

function weddingDateHasArrived(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw <= today;
  const season = raw.match(/^(spring|summer|autumn|fall|winter)\s+(\d{4})$/i);
  if (season) {
    const month = { spring: "03", summer: "06", autumn: "09", fall: "09", winter: "12" }[season[1].toLowerCase() as "spring" | "summer" | "autumn" | "fall" | "winter"];
    return `${season[2]}-${month}-01` <= today;
  }
  const parsed = Date.parse(`1 ${raw}`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) <= today;
}
function legacySummary(
  story: (typeof weddingStories)[number],
): PublicWeddingSummary {
  return {
    source: "legacy",
    slug: story.slug,
    title: story.title,
    couple: story.couple,
    venue: story.venue,
    venueSlug: (story as { venueSlug?: string }).venueSlug,
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
    venueSlug: (story as { venueSlug?: string }).venueSlug,
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

function normaliseIndex(
  document: PublicWeddingIndex,
  source: "json" | "d1",
): PublicWeddingState {
  if (document.schemaVersion !== 1 || !Array.isArray(document.weddings)) {
    return emptyState();
  }

  return {
    generatedAt: document.generatedAt || null,
    managedSlugs: Array.isArray(document.managedSlugs)
      ? document.managedSlugs
      : [],
    weddings: document.weddings
      .filter(
        (wedding) =>
          wedding.storyEnabled === true
          && wedding.storyStatus === "published"
          && weddingDateHasArrived(wedding.weddingDate),
      )
      .map((wedding) => ({ ...wedding, source })),
  };
}

async function loadD1Index(): Promise<PublicWeddingState | null> {
  try {
    const response = await fetch("/api/public/weddings", { cache: "no-store" });
    if (!response.ok) return null;
    return normaliseIndex((await response.json()) as PublicWeddingIndex, "d1");
  } catch {
    return null;
  }
}

async function loadJsonIndex(): Promise<PublicWeddingState> {
  try {
    const response = await fetch("/wedding-data/index.json", { cache: "no-store" });
    if (!response.ok) return emptyState();
    return normaliseIndex((await response.json()) as PublicWeddingIndex, "json");
  } catch {
    return emptyState();
  }
}

async function loadD1Detail(
  slug: string,
): Promise<{ status: "ok" | "notfound" | "failed"; detail?: PublicWeddingDetail }> {
  try {
    const response = await fetch(
      `/api/public/weddings/${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );

    if (response.status === 404) return { status: "notfound" };
    if (!response.ok) return { status: "failed" };

    const document = (await response.json()) as PublicWeddingDocument & {
      source?: "d1";
    };

    if (
      document.schemaVersion !== 1 ||
      document.slug !== slug ||
      document.storyEnabled !== true ||
      document.storyStatus !== "published" ||
      !weddingDateHasArrived(document.weddingDate) ||
      !Array.isArray(document.images)
    ) {
      return { status: "failed" };
    }

    return { status: "ok", detail: { ...document, source: "d1" } };
  } catch {
    return { status: "failed" };
  }
}

async function loadJsonDetail(
  slug: string,
): Promise<PublicWeddingDetail | undefined> {
  try {
    const response = await fetch(
      `/wedding-data/${encodeURIComponent(slug)}.json`,
      { cache: "no-store" },
    );
    if (!response.ok) return undefined;

    const document = (await response.json()) as PublicWeddingDocument;
    if (
      document.schemaVersion !== 1 ||
      document.slug !== slug ||
      document.storyEnabled !== true ||
      document.storyStatus !== "published" ||
      !weddingDateHasArrived(document.weddingDate) ||
      !Array.isArray(document.images)
    ) {
      return undefined;
    }

    return { ...document, source: "json" };
  } catch {
    return undefined;
  }
}

function mergePublished(state: PublicWeddingState): PublicWeddingSummary[] {
  const managed = new Set(state.managedSlugs);
  const map = new Map<string, PublicWeddingSummary>();

  weddingStories
    .filter((story) => !managed.has(story.slug) && weddingDateHasArrived(story.weddingDate))
    .forEach((story) => map.set(story.slug, legacySummary(story)));

  state.weddings.forEach((wedding) => map.set(wedding.slug, wedding));
  return Array.from(map.values());
}

export class PublicWeddingRepository {
  async getPublishedState(): Promise<PublicWeddingState> {
    const d1State = await loadD1Index();
    if (d1State) {
      return { ...d1State, weddings: mergePublished(d1State) };
    }

    const jsonState = await loadJsonIndex();
    return { ...jsonState, weddings: mergePublished(jsonState) };
  }

  async getAllPublished(): Promise<PublicWeddingSummary[]> {
    return (await this.getPublishedState()).weddings;
  }

  async getPublishedBySlug(slug: string): Promise<PublicWeddingDetail | undefined> {
    const d1Detail = await loadD1Detail(slug);
    if (d1Detail.status === "ok") return d1Detail.detail;

    if (d1Detail.status === "notfound") {
      const d1State = await loadD1Index();
      if (d1State?.managedSlugs.includes(slug)) return undefined;
    }

    const jsonDetail = await loadJsonDetail(slug);
    if (jsonDetail) return jsonDetail;

    const jsonState = await loadJsonIndex();
    if (jsonState.managedSlugs.includes(slug)) return undefined;

    const legacy = weddingStories.find((story) => story.slug === slug && weddingDateHasArrived(story.weddingDate));
    return legacy ? legacyDetail(legacy) : undefined;
  }
}
