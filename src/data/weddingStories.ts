// src/data/weddingStories.ts
// Add the written text for each blog post here.
// The photo selection is controlled by public/gallery.csv using the same slug.

export const BLOG_IMAGE_BASE_URL = "https://YOUR-R2-PUBLIC-DOMAIN";
// Replace the line above with the same public R2 domain your gallery pages use.
// Example: "https://pub-xxxxxxxx.r2.dev"
// Do not include a trailing slash.

export interface WeddingStory {
  slug: string;
  title: string;
  couple: string;
  venue: string;
  weddingDate: string;
  excerpt: string;
  intro: string;
  story: string[];
  seoTitle?: string;
  seoDescription?: string;
}

export const weddingStories: WeddingStory[] = [
  {
    slug: "orange-tree-house",
    title: "A relaxed wedding at Orange Tree House",
    couple: "Example Couple",
    venue: "Orange Tree House",
    weddingDate: "Wedding date",
    excerpt:
      "A short preview of this wedding story. Replace this with a couple of lines about the venue, the atmosphere, and the photographs.",
    intro:
      "Use this opening paragraph to introduce the couple, the venue, and the feel of the day.",
    story: [
      "Write the first part of the wedding story here. This could cover preparations, the ceremony, the weather, the venue, or the atmosphere of the morning.",
      "Write the second part here. This could cover portraits, family photographs, candid moments, speeches, or evening images.",
      "Write the final part here. Mention anything useful for future couples planning a wedding at this venue.",
    ],
    seoTitle: "Orange Tree House Wedding Photography | MKB Weddings",
    seoDescription:
      "A real wedding story from Orange Tree House, photographed by MKB Weddings with natural, candid and documentary wedding photography.",
  },
];
