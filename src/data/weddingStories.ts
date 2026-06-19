// src/data/weddingStories.ts
// Add the written text for each blog post here.
// The photo selection is controlled by public/gallery.csv using the same slug.

export const BLOG_IMAGE_BASE_URL = "https://images.mkbweddings.co.uk";
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
    title: "A stylish, relaxed wedding at Orange Tree House, Greyabbey",
    couple: "Ian & Bernadette",
    venue: "Orange Tree House",
    weddingDate: "May 2026",
    excerpt:
      "Ian and Bernadette celebrated their long-awaited wedding at Orange Tree House in Greyabbey, enjoying glorious sunshine, stunning views across Strangford Lough and a relaxed atmosphere surrounded by family and friends",
    intro:
      "Some weddings feel effortlessly special from the moment you arrive, and Ian and Bernadette's day at Orange Tree House was certainly one of them. After many years together, they finally said 'I do' in one of Northern Ireland's most sought-after wedding venues, with sunshine, laughter and incredible scenery creating the perfect setting.",
    story: [
      "The day began in a wonderfully relaxed atmosphere as preparations took place at Orange Tree House. With panoramic views across Strangford Lough and beautiful gardens bathed in sunshine, there was an excitement in the air as friends and family gathered to celebrate Ian and Bernadette's long-awaited wedding day. Every detail reflected their personalities – elegant, understated and centred on spending meaningful time with the people they love most.",
      "Following an emotional ceremony, guests enjoyed drinks outdoors while making the most of the exceptional weather. Orange Tree House offers countless opportunities for natural wedding photography, and we took advantage of the golden evening light to create relaxed portraits around the grounds and beside the lough. The speeches brought plenty of laughter and emotion before the celebrations continued late into the evening with dancing and unforgettable moments on the dance floor",
      "For couples planning a wedding at Orange Tree House, it is easy to see why this venue is so highly regarded. Nestled in Greyabbey on the shores of Strangford Lough, it combines breathtaking scenery with a warm and intimate atmosphere. It is a venue that works beautifully for natural, documentary wedding photography and provides the perfect backdrop for a day filled with genuine moments and lasting memories",
    ],
    seoTitle: "Orange Tree House Wedding Photography | Greyabbey Wedding Photographer | MKB Weddings",
    seoDescription:
      "View Ian and Bernadette's beautiful Orange Tree House wedding in Greyabbey. Natural, documentary wedding photography capturing genuine moments at one of Northern Ireland's most stunning venues.",
  },
];
