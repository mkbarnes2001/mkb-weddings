export type WedPlannedProductSlug =
  | "wednav"
  | "wedcrm"
  | "wedstudio"
  | "wedstore";

export type WedPlannedProduct = {
  slug: WedPlannedProductSlug;
  name: string;
  compactName: string;
  purpose: string;
  summary: string;
  detail: string;
  capabilities: string[];
};

export const WEDPLANNED_PRODUCTS: WedPlannedProduct[] = [
  {
    slug: "wednav",
    name: "WedNav",
    compactName: "W.NAV",
    purpose: "Run the business",
    summary:
      "Your business command centre and the natural starting point for WedPlanned.",
    detail:
      "Manage the business behind the work: profile, services, suppliers, team, workspace settings and the routes into every other WedPlanned product.",
    capabilities: [
      "Business profile and workspace",
      "Services and service areas",
      "Supplier master database",
      "Team and access",
      "Business status and product navigation",
    ],
  },
  {
    slug: "wedcrm",
    name: "WedCRM",
    compactName: "W.CRM",
    purpose: "Manage the client journey",
    summary:
      "Keep enquiries, clients, Jobs and communication in one connected workflow.",
    detail:
      "WedCRM follows the commercial client journey from first enquiry through booking, planning and delivery without disconnecting customer information from the rest of the business.",
    capabilities: [
      "Enquiries and leads",
      "Clients and Jobs",
      "Schedules and workflows",
      "Packages and quotes",
      "Questionnaires and Client Portal",
    ],
  },
  {
    slug: "wedstudio",
    name: "WedStudio",
    compactName: "W.STU",
    purpose: "Create and publish",
    summary:
      "Turn real business activity into organised website content and stories.",
    detail:
      "WedStudio brings website content, wedding stories, public galleries, venues, locations, collections, SEO and publishing into one content workspace.",
    capabilities: [
      "Website connection",
      "Wedding stories and blog content",
      "Public galleries",
      "Venues, locations and collections",
      "SEO, AI content and publishing",
    ],
  },
  {
    slug: "wedstore",
    name: "WedStore",
    compactName: "W.STO",
    purpose: "Deliver and sell",
    summary:
      "Private client delivery and commerce without mixing it with public portfolio content.",
    detail:
      "WedStore combines professional gallery delivery with product sales, orders and fulfilment while keeping private client assets separate from WedStudio.",
    capabilities: [
      "Private client galleries",
      "Gallery access and downloads",
      "Selections and favourites",
      "Product sales and print store",
      "Orders and fulfilment",
    ],
  },
];

export function getWedPlannedProduct(slug: string) {
  return WEDPLANNED_PRODUCTS.find((product) => product.slug === slug);
}
