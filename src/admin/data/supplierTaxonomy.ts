export type SupplierCategoryDefinition = {
  category: string;
  roles: readonly string[];
};

export type SupplierRoleDefinition = {
  name: string;
  category: string;
};

export type SupplierTaxonomySettings = {
  categories: string[];
  roles: SupplierRoleDefinition[];
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
export const DEFAULT_SUPPLIER_ROLE_DEFINITIONS: SupplierRoleDefinition[] = SUPPLIER_TAXONOMY.flatMap((item) =>
  item.roles.map((name) => ({ name, category: item.category })),
);

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

export function supplierTaxonomyKey(value: string) {
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
  const target = supplierTaxonomyKey(value);
  return options.find((option) => supplierTaxonomyKey(option) === target) || "";
}

function uniqueNames(values: readonly string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const name = String(value || "").trim();
    const key = supplierTaxonomyKey(name);
    if (!name || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

export function normaliseSupplierTaxonomy(
  categories: readonly string[] | undefined,
  roles: readonly SupplierRoleDefinition[] | undefined,
): SupplierTaxonomySettings {
  const nextCategories = uniqueNames(categories?.length ? categories : SUPPLIER_CATEGORY_OPTIONS);
  const fallbackCategory = nextCategories[0] || "Other";
  const categoryByKey = new Map(nextCategories.map((category) => [supplierTaxonomyKey(category), category]));
  const roleSource = roles?.length ? roles : DEFAULT_SUPPLIER_ROLE_DEFINITIONS;
  const seenRoles = new Set<string>();
  const nextRoles: SupplierRoleDefinition[] = [];

  for (const item of roleSource) {
    const name = String(item?.name || "").trim();
    const roleKey = supplierTaxonomyKey(name);
    if (!name || !roleKey || seenRoles.has(roleKey)) continue;
    const exactCategory = categoryByKey.get(supplierTaxonomyKey(item?.category || ""));
    nextRoles.push({ name, category: exactCategory || fallbackCategory });
    seenRoles.add(roleKey);
  }

  if (!nextRoles.length) nextRoles.push({ name: "Other Supplier", category: fallbackCategory });
  return { categories: nextCategories, roles: nextRoles };
}

export function configuredSupplierCategory(value: string, categories: readonly string[] = SUPPLIER_CATEGORY_OPTIONS) {
  const exact = exactOption(value, categories);
  if (exact) return exact;
  const alias = CATEGORY_ALIASES[supplierTaxonomyKey(value)] || "";
  return alias ? exactOption(alias, categories) : "";
}

export function configuredWeddingRole(value: string, roles: readonly SupplierRoleDefinition[] = DEFAULT_SUPPLIER_ROLE_DEFINITIONS) {
  const roleNames = roles.map((item) => item.name);
  const exact = exactOption(value, roleNames);
  if (exact) return exact;
  const alias = ROLE_ALIASES[supplierTaxonomyKey(value)] || "";
  return alias ? exactOption(alias, roleNames) : "";
}

export function canonicalSupplierCategory(value: string) {
  return configuredSupplierCategory(value, SUPPLIER_CATEGORY_OPTIONS);
}

export function canonicalWeddingRole(value: string) {
  return configuredWeddingRole(value, DEFAULT_SUPPLIER_ROLE_DEFINITIONS);
}

export function defaultWeddingRoleForCategory(
  value: string,
  categories: readonly string[] = SUPPLIER_CATEGORY_OPTIONS,
  roles: readonly SupplierRoleDefinition[] = DEFAULT_SUPPLIER_ROLE_DEFINITIONS,
) {
  const category = configuredSupplierCategory(value, categories);
  return roles.find((item) => configuredSupplierCategory(item.category, categories) === category)?.name
    || roles[0]?.name
    || "Other Supplier";
}

export function weddingRoleOptionsForCategory(
  value: string,
  categories: readonly string[] = SUPPLIER_CATEGORY_OPTIONS,
  roles: readonly SupplierRoleDefinition[] = DEFAULT_SUPPLIER_ROLE_DEFINITIONS,
) {
  const category = configuredSupplierCategory(value, categories);
  const preferred = roles.filter((item) => configuredSupplierCategory(item.category, categories) === category).map((item) => item.name);
  return [...preferred, ...roles.map((item) => item.name).filter((role) => !preferred.includes(role))];
}
