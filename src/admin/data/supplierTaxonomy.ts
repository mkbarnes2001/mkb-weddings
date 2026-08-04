export type SupplierCategoryDefinition = {
  category: string;
  roles: readonly string[];
};

export const SUPPLIER_TAXONOMY: readonly SupplierCategoryDefinition[] = [
  { category: "Photography", roles: ["Photographer", "Second Photographer", "Photo Booth"] },
  { category: "Videography & Content", roles: ["Videographer", "Content Creator"] },
  { category: "Planning & Coordination", roles: ["Wedding Planner", "Wedding Coordinator"] },
  { category: "Venue & Catering", roles: ["Venue", "Caterer", "Bar Service"] },
  { category: "Floristry", roles: ["Florist"] },
  { category: "Hair & Beauty", roles: ["Hair Stylist", "Makeup Artist", "Barber"] },
  { category: "Attire", roles: ["Bridal Boutique", "Dress Designer", "Seamstress", "Menswear"] },
  { category: "Jewellery & Accessories", roles: ["Jeweller", "Accessories"] },
  { category: "Cake & Confectionery", roles: ["Wedding Cake", "Dessert Supplier"] },
  { category: "Music & Entertainment", roles: ["Band", "DJ", "Ceremony Musician", "Solo Musician", "Entertainment"] },
  { category: "Ceremony", roles: ["Celebrant", "Officiant"] },
  { category: "Styling & Décor", roles: ["Venue Stylist", "Décor Hire", "Lighting"] },
  { category: "Stationery & Signage", roles: ["Stationer", "Signage"] },
  { category: "Transport", roles: ["Wedding Transport"] },
  { category: "Hire & Production", roles: ["Equipment Hire", "Production"] },
  { category: "Favours & Gifts", roles: ["Favours", "Wedding Gifts"] },
  { category: "Other", roles: ["Other Supplier"] },
] as const;

export const SUPPLIER_CATEGORY_OPTIONS = SUPPLIER_TAXONOMY.map((item) => item.category);
export const WEDDING_ROLE_OPTIONS = Array.from(new Set(SUPPLIER_TAXONOMY.flatMap((item) => item.roles)));

const CATEGORY_ALIASES: Record<string, string> = {
  photographer: "Photography",
  photography: "Photography",
  venue: "Venue & Catering",
  catering: "Venue & Catering",
  caterer: "Venue & Catering",
  videographer: "Videography & Content",
  videography: "Videography & Content",
  "content creator": "Videography & Content",
  florist: "Floristry",
  flowers: "Floristry",
  floristry: "Floristry",
  hair: "Hair & Beauty",
  hairdresser: "Hair & Beauty",
  hairstylist: "Hair & Beauty",
  "hair stylist": "Hair & Beauty",
  makeup: "Hair & Beauty",
  "make up": "Hair & Beauty",
  "make-up": "Hair & Beauty",
  "makeup artist": "Hair & Beauty",
  "wedding dress": "Attire",
  dress: "Attire",
  seamstress: "Attire",
  suits: "Attire",
  menswear: "Attire",
  cake: "Cake & Confectionery",
  "wedding cake": "Cake & Confectionery",
  band: "Music & Entertainment",
  dj: "Music & Entertainment",
  "ceremony music": "Music & Entertainment",
  entertainment: "Music & Entertainment",
  celebrant: "Ceremony",
  "celebrant officiant": "Ceremony",
  officiant: "Ceremony",
  decor: "Styling & Décor",
  "décor": "Styling & Décor",
  styling: "Styling & Décor",
  stationery: "Stationery & Signage",
  signage: "Stationery & Signage",
  transport: "Transport",
  "ice cream": "Cake & Confectionery",
  other: "Other",
};

const ROLE_ALIASES: Record<string, string> = {
  photography: "Photographer",
  photographer: "Photographer",
  "second photographer": "Second Photographer",
  videography: "Videographer",
  videographer: "Videographer",
  "content creator": "Content Creator",
  venue: "Venue",
  florist: "Florist",
  flowers: "Florist",
  hair: "Hair Stylist",
  hairdresser: "Hair Stylist",
  hairstylist: "Hair Stylist",
  "hair stylist": "Hair Stylist",
  makeup: "Makeup Artist",
  "make up": "Makeup Artist",
  "make-up": "Makeup Artist",
  "makeup artist": "Makeup Artist",
  band: "Band",
  dj: "DJ",
  "ceremony music": "Ceremony Musician",
  celebrant: "Celebrant",
  "celebrant officiant": "Celebrant",
  officiant: "Officiant",
  decor: "Venue Stylist",
  "décor": "Venue Stylist",
  stationery: "Stationer",
  transport: "Wedding Transport",
  cake: "Wedding Cake",
  "wedding cake": "Wedding Cake",
  other: "Other Supplier",
  supplier: "Other Supplier",
};

function key(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function exactOption(value: string, options: readonly string[]) {
  const target = key(value);
  return options.find((option) => key(option) === target) || "";
}

export function canonicalSupplierCategory(value: string) {
  return exactOption(value, SUPPLIER_CATEGORY_OPTIONS) || CATEGORY_ALIASES[key(value)] || "";
}

export function canonicalWeddingRole(value: string) {
  return exactOption(value, WEDDING_ROLE_OPTIONS) || ROLE_ALIASES[key(value)] || "";
}

export function defaultWeddingRoleForCategory(value: string) {
  const category = canonicalSupplierCategory(value);
  return SUPPLIER_TAXONOMY.find((item) => item.category === category)?.roles[0] || "Other Supplier";
}

export function weddingRoleOptionsForCategory(value: string) {
  const category = canonicalSupplierCategory(value);
  const preferred: readonly string[] = SUPPLIER_TAXONOMY.find((item) => item.category === category)?.roles || [];
  return [...preferred, ...WEDDING_ROLE_OPTIONS.filter((role) => !preferred.includes(role))];
}
