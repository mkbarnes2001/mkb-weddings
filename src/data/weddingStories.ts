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


{
  slug: "ulster-museum-glenn-and-rachel",

  title: "A winter wedding at the iconic Ulster Museum, Belfast",

  couple: "Glenn & Rachel",

  venue: "Ulster Museum",

  weddingDate: "December 2025",

  excerpt:
    "Glenn and Rachel celebrated a truly memorable winter wedding at Belfast's iconic Ulster Museum. From bridal preparations at the AC Hotel Belfast to portraits around Queen's University and an unforgettable evening reception beneath the museum's spectacular architecture, their day was filled with warmth, laughter and festive atmosphere.",

  intro:
    "Winter weddings have a unique kind of magic, and Glenn and Rachel's celebration at the Ulster Museum captured it perfectly. Surrounded by family and friends who had travelled from across Ireland and beyond, they created a relaxed, joyful day that reflected both their personalities and the city where their story began.",

  story: [
    "The day began at the AC Hotel Belfast, where Rachel and her bridal party enjoyed a relaxed morning getting ready before making the short journey across the city to the Ulster Museum. Their heartfelt ceremony, led by humanist celebrant Stuart Holden, was full of laughter, emotion and personal touches, with loved ones gathering from near and far to witness the start of their next chapter together.",

    "After the ceremony we walked to the beautiful grounds of Queen's University Belfast, the place where Glenn and Rachel first met. It provided the perfect setting for relaxed portraits, with the impressive architecture adding a timeless backdrop to their photographs. Along the way we were even greeted by a friendly West Highland Terrier — a lovely unexpected moment for two devoted Westie lovers that quickly became one of the day's favourite memories.",

    "The celebrations continued at Molly's Yard, where guests enjoyed fantastic food, heartfelt speeches and a wonderfully relaxed atmosphere. Before returning to the Ulster Museum we slipped away for a few dramatic evening portraits around Belfast, making the most of the festive city lights. The day finished in unforgettable style as the museum's magnificent entrance hall became the dance floor, creating an incredible setting for an evening of celebration that perfectly rounded off a magical winter wedding."
  ],

  seoTitle:
    "Ulster Museum Wedding Photography | Belfast Wedding Photographer | Glenn & Rachel | MKB Weddings",

  seoDescription:
    "Explore Glenn and Rachel's beautiful winter wedding at the Ulster Museum in Belfast. Natural documentary wedding photography featuring Queen's University, Molly's Yard and a stunning evening celebration in one of Belfast's most unique wedding venues.",
},


{
  slug: "slieve-donard-hotel-patrick-and-sarah",

  title: "From torrential rain to sunshine at the Slieve Donard Hotel, Newcastle",

  couple: "Patrick & Sarah",

  venue: "Slieve Donard Hotel",

  weddingDate: "Summer 2025",

  excerpt:
    "Patrick and Sarah brought together family and friends from Northern Ireland and the United States for a beautiful wedding at the iconic Slieve Donard Hotel. Despite relentless rain for much of the day, the weather delivered an unforgettable finale with sunshine, a spectacular rainbow and an incredible evening celebration.",

  intro:
    "Set beneath the breathtaking Mourne Mountains, the Slieve Donard Hotel provided the perfect setting for Patrick and Sarah's wedding day. Sarah, originally from Northern Ireland, now lives in the United States with Patrick, who is from Boston, making this wedding a wonderful celebration that reunited loved ones from both sides of the Atlantic. It was a day full of emotion, laughter, unexpected moments and a reminder that even the wettest wedding day can produce the most memorable photographs.",

  story: [
    "The day began with both bridal preparations and the groom's preparations taking place at the beautiful Slieve Donard Hotel. There was a brilliant atmosphere throughout the morning as excitement built ahead of the ceremony. Guests were also treated to a surprise celebrity sighting when Hollywood legend Bill Murray was spotted enjoying breakfast in the hotel, creating plenty of conversation before the celebrations had even begun. Outside, however, the weather was less cooperative, with heavy rain falling relentlessly across Newcastle.",

    "Fortunately, the church was only a couple of minutes from the hotel, but the rain continued throughout the ceremony, leaving no opportunity for photographs outside afterwards. Everyone made a quick dash back to the warmth and comfort of the Slieve Donard Hotel, accepting that the day might remain a wet one. Then, almost as if on cue, the clouds began to clear. The rain stopped completely, sunshine broke through and we were able to head outside to capture beautiful portraits around the hotel and its stunning grounds with the Mourne Mountains providing a spectacular backdrop.",

    "As the celebrations continued into the evening, nature delivered one final gift. During dinner, a vibrant rainbow appeared across the coastline, creating one of those unforgettable moments that simply can't be planned. We quickly slipped outside to capture some truly unique photographs before returning to an incredible evening reception packed with energy, laughter and dancing. Patrick and Sarah's wedding was proof that unpredictable weather can often create the most memorable stories, and the Slieve Donard Hotel once again demonstrated why it remains one of Northern Ireland's most iconic wedding venues."
  ],

  seoTitle:
    "Slieve Donard Hotel Wedding Photography | Newcastle Wedding Photographer | Patrick & Sarah | MKB Weddings",

  seoDescription:
    "Explore Patrick and Sarah's beautiful wedding at the Slieve Donard Hotel in Newcastle, County Down. Natural documentary wedding photography featuring the Mourne Mountains, dramatic weather, a stunning rainbow and an unforgettable celebration with family from Northern Ireland and the USA.",
},


];
