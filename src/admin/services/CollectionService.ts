import { weddingStories } from "../../data/weddingStories";
import { parseCsv } from "../utils/csv";
import { normalise } from "../utils/format";
import type { ImageCollection } from "../types/collection";

type BlogGalleryRow = {
  blogSlug?: string;
  filename?: string;
};

type GalleryRow = {
  venue?: string;
  category?: string;
  filename?: string;
};

async function fetchText(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return "";
  return res.text();
}

function collectionStatus(count: number): "active" | "empty" {
  return count > 0 ? "active" : "empty";
}

export class CollectionService {
  private blogRows: BlogGalleryRow[];
  private galleryRows: GalleryRow[];

  constructor({
    blogRows,
    galleryRows,
  }: {
    blogRows: BlogGalleryRow[];
    galleryRows: GalleryRow[];
  }) {
    this.blogRows = blogRows;
    this.galleryRows = galleryRows;
  }

  static async load() {
    const [blogGalleryText, galleryText] = await Promise.all([
      fetchText("/blog-gallery.csv"),
      fetchText("/gallery.csv"),
    ]);

    return new CollectionService({
      blogRows: parseCsv<BlogGalleryRow>(blogGalleryText),
      galleryRows: parseCsv<GalleryRow>(galleryText),
    });
  }

  getCollectionsForWedding(weddingSlug: string): ImageCollection[] {
    const story = weddingStories.find((item) => item.slug === weddingSlug);

    const blogImageCount = this.blogRows.filter(
      (row) => normalise(row.blogSlug) === normalise(weddingSlug),
    ).length;

    const venueImageCount = story
      ? this.galleryRows.filter((row) => normalise(row.venue) === normalise(story.venue)).length
      : 0;

    return [
      {
        id: `${weddingSlug}-blog`,
        weddingSlug,
        type: "blog",
        name: "Blog Gallery",
        description: "Large chronological storytelling set used on the wedding story page.",
        imageCount: blogImageCount,
        source: "public/blog-gallery.csv",
        status: collectionStatus(blogImageCount),
      },
      {
        id: `${weddingSlug}-venue`,
        weddingSlug,
        type: "venue",
        name: "Venue Gallery",
        description: "Curated venue page images from the main website gallery.",
        imageCount: venueImageCount,
        source: "public/gallery.csv",
        status: collectionStatus(venueImageCount),
      },
      {
        id: `${weddingSlug}-portfolio`,
        weddingSlug,
        type: "portfolio",
        name: "Portfolio Picks",
        description: "Future curated collection for homepage, portfolio and advertising use.",
        imageCount: 0,
        source: "planned",
        status: "planned",
      },
      {
        id: `${weddingSlug}-instagram`,
        weddingSlug,
        type: "instagram",
        name: "Instagram Selection",
        description: "Future social-first selection for carousels, reels and posts.",
        imageCount: 0,
        source: "planned",
        status: "planned",
      },
    ];
  }

  getAllCollections(): ImageCollection[] {
    return weddingStories.flatMap((story) => this.getCollectionsForWedding(story.slug));
  }
}
