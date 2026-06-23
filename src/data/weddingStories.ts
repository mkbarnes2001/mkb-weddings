// src/data/weddingStories.ts
// Add the written text for each blog post here.
// The photo selection is controlled by public/gallery.csv using the same slug.

export const BLOG_IMAGE_BASE_URL = "https://images.mkbweddings.co.uk/blog";
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
    slug: "orange-tree-house-summer-wedding-ian-and-bernadette",
    title: "A stylish, relaxed wedding at Orange Tree House, Greyabbey",
    couple: "Ian & Bernadette",
    venue: "Orange Tree House",
    weddingDate: "May 2026",
    excerpt:
      "Ian and Bernadette celebrated their long-awaited wedding at Orange Tree House in Greyabbey, enjoying glorious sunshine, stunning views across Strangford Lough and a relaxed atmosphere surrounded by family and friends",
    intro:
      "Some weddings feel effortlessly special from the moment you arrive, and Ian and Bernadette's day at Orange Tree House was certainly one of them. After many years together, they finally said 'I do' in one of Northern Ireland's most sought-after wedding venues, with sunshine, laughter and incredible scenery creating the perfect setting.",
    story: [
      "The day began in a wonderfully relaxed atmosphere as preparations took place at Orange Tree House...",
      "Following an emotional ceremony, guests enjoyed drinks outdoors while making the most of the exceptional weather...",
      "For couples planning a wedding at Orange Tree House, it is easy to see why this venue is so highly regarded.",
    ],
    seoTitle:
      "Orange Tree House Wedding Photography | Greyabbey Wedding Photographer | MKB Weddings",
    seoDescription:
      "View Ian and Bernadette's beautiful Orange Tree House wedding in Greyabbey.",
  },

  {
    slug: "killeavy-castle-declan-and-charlotte",
    title: "A magical autumn wedding at Killeavy Castle, Newry",
    couple: "Declan & Charlotte",
    venue: "Killeavy Castle",
    weddingDate: "Autumn 2024",

    excerpt:
      "Declan and Charlotte celebrated their beautiful autumn wedding at Killeavy Castle surrounded by family, laughter and heartfelt moments. From Charlotte's stunning handmade gown to Declan's surprise musical performance, it was a day filled with love, personality and unforgettable memories.",

    intro:
      "There are some weddings where you instantly feel like part of the family, and Declan and Charlotte's day at Killeavy Castle was exactly that. Having previously photographed Charlotte's sister's wedding, it was a real privilege to return and spend another wonderful day with such a warm and welcoming family.",

    story: [
      "The morning preparations were filled with excitement and emotion. One of the most special details of the day was Charlotte's wedding dress, lovingly created by her mum, Shirley. An incredibly talented dressmaker, Shirley once again produced a masterpiece – a gown that was elegant, timeless and perfectly suited to Charlotte.",

      "The celebrations at Killeavy Castle continued in the same warm and relaxed spirit. Family was at the heart of everything, guests enjoying the beautiful surroundings and plenty of laughter throughout the day. One of the highlights came later in the evening when Declan surprised everyone by performing a song for his new wife.",

      "Killeavy Castle is one of Northern Ireland's most beautiful wedding venues, offering elegant interiors, stunning grounds and views across the surrounding countryside. Combined with a couple as lovely as Declan and Charlotte and a family I was delighted to photograph once again, it created a wedding day full of genuine moments and beautiful memories.",
    ],

    seoTitle:
      "Killeavy Castle Wedding Photography | Declan & Charlotte | MKB Weddings",

    seoDescription:
      "View Declan and Charlotte's magical autumn wedding at Killeavy Castle, Newry. Natural, documentary wedding photography capturing heartfelt family moments and unforgettable celebrations.",
  },
];
