import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardList,
  ContactRound,
  Database,
  FileQuestion,
  FileText,
  Gauge,
  Globe2,
  Images,
  Layers3,
  LockKeyhole,
  MapPinned,
  Package,
  Palette,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Target,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";

export type AdminModuleKey = "crm" | "client-galleries" | "website" | "business";

export type AdminNavigationItem = {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  mobilePrimary?: boolean;
  requiredPermission?: string;
  match: (pathname: string, params: URLSearchParams) => boolean;
};

export type AdminModuleDefinition = {
  key: AdminModuleKey;
  label: string;
  shortLabel: string;
  description: string;
  to: string;
  icon: LucideIcon;
  entitlementKey: string;
  match: (pathname: string) => boolean;
  items: AdminNavigationItem[];
};

export const isWeddingWorkspacePath = (pathname: string) => /^\/admin\/weddings\/[^/]+\/workspace$/.test(pathname);
const exactPath = (path: string) => (pathname: string) => pathname === path;
const pathPrefix = (path: string) => (pathname: string) => pathname === path || pathname.startsWith(`${path}/`);
const exactWithQuery = (path: string, key: string, value: string) => (pathname: string, params: URLSearchParams) => pathname === path && params.get(key) === value;
const exactWithoutQuery = (path: string, key: string, fallbackValues: string[] = []) => (pathname: string, params: URLSearchParams) => {
  if (pathname !== path) return false;
  const value = params.get(key) || "";
  return value === "" || fallbackValues.includes(value);
};

const crmItems: AdminNavigationItem[] = [
  { key: "overview", label: "Overview", to: "/admin/crm?view=overview", icon: Gauge, mobilePrimary: true, match: exactWithQuery("/admin/crm", "view", "overview") },
  { key: "leads", label: "Leads", to: "/admin/crm", icon: Target, mobilePrimary: true, match: (pathname, params) => pathname.startsWith("/admin/crm/enquiries/") || exactWithoutQuery("/admin/crm", "view", ["pipeline"])(pathname, params) },
  { key: "clients", label: "Clients", to: "/admin/crm?view=contacts", icon: UserRound, mobilePrimary: true, match: (pathname, params) => pathname.startsWith("/admin/crm/contacts/") || exactWithQuery("/admin/crm", "view", "contacts")(pathname, params) },
  { key: "jobs", label: "Jobs", to: "/admin/crm?view=jobs", icon: BriefcaseBusiness, mobilePrimary: true, match: (pathname, params) => pathname.startsWith("/admin/crm/jobs/") || isWeddingWorkspacePath(pathname) || exactWithQuery("/admin/crm", "view", "jobs")(pathname, params) },
  { key: "schedule", label: "Schedule", to: "/admin/crm?view=schedule", icon: CalendarDays, match: exactWithQuery("/admin/crm", "view", "schedule") },
  { key: "packages", label: "Packages", to: "/admin/crm/catalogue", icon: Package, match: pathPrefix("/admin/crm/catalogue") },
  { key: "quotes", label: "Quotes", to: "/admin/crm/quotes", icon: FileQuestion, match: pathPrefix("/admin/crm/quotes") },
  { key: "questionnaires", label: "Questionnaires", to: "/admin/crm?view=questionnaires", icon: ClipboardList, match: (pathname, params) => pathname.startsWith("/admin/crm/questionnaires/") || exactWithQuery("/admin/crm", "view", "questionnaires")(pathname, params) },
  { key: "workflows", label: "Workflows", to: "/admin/crm?view=workflows", icon: Workflow, match: (pathname, params) => pathname.startsWith("/admin/crm/workflows/") || exactWithQuery("/admin/crm", "view", "workflows")(pathname, params) },
  { key: "lead-form", label: "Lead form", to: "/admin/crm?view=lead-form", icon: ClipboardList, match: exactWithQuery("/admin/crm", "view", "lead-form") },
];

const clientGalleryItems: AdminNavigationItem[] = [
  { key: "overview", label: "Overview", to: "/admin/client-galleries/overview", icon: Gauge, mobilePrimary: true, match: exactPath("/admin/client-galleries/overview") },
  { key: "galleries", label: "Client galleries", to: "/admin/client-galleries", icon: Images, mobilePrimary: true, match: (pathname) => pathname !== "/admin/client-galleries/overview" && pathPrefix("/admin/client-galleries")(pathname) },
  { key: "store", label: "Store", to: "/admin/print-store?tab=catalogue", icon: Store, mobilePrimary: true, match: (pathname, params) => pathname === "/admin/print-store" && (params.get("tab") || "catalogue") !== "orders" },
  { key: "orders", label: "Orders", to: "/admin/print-store?tab=orders", icon: ShoppingBag, mobilePrimary: true, match: exactWithQuery("/admin/print-store", "tab", "orders") },
];

const websiteItems: AdminNavigationItem[] = [
  { key: "overview", label: "Overview", to: "/admin", icon: Gauge, mobilePrimary: true, match: exactPath("/admin") },
  { key: "weddings", label: "Wedding stories", to: "/admin/weddings", icon: FileText, mobilePrimary: true, match: pathPrefix("/admin/weddings") },
  { key: "galleries", label: "Website galleries", to: "/admin/gallery", icon: Images, mobilePrimary: true, match: (pathname) => pathname === "/admin/gallery" || pathname.startsWith("/admin/gallery/") || pathname === "/admin/collections" },
  { key: "venues", label: "Venues", to: "/admin/venues", icon: Globe2, mobilePrimary: true, match: pathPrefix("/admin/venues") },
  { key: "locations", label: "Locations", to: "/admin/locations", icon: MapPinned, match: pathPrefix("/admin/locations") },
  { key: "moments", label: "Moments", to: "/admin/moments", icon: Layers3, match: (pathname) => pathPrefix("/admin/moments")(pathname) || pathPrefix("/admin/creative-flash")(pathname) },
  { key: "collections", label: "Collections", to: "/admin/custom-collections", icon: LockKeyhole, match: pathPrefix("/admin/custom-collections") },
  { key: "suppliers", label: "Suppliers", to: "/admin/suppliers", icon: Users, match: pathPrefix("/admin/suppliers") },
  { key: "assets", label: "Asset library", to: "/admin/assets", icon: Database, match: pathPrefix("/admin/assets") },
  { key: "ai", label: "AI centre", to: "/admin/ai", icon: Bot, match: pathPrefix("/admin/ai") },
  { key: "seo", label: "SEO", to: "/admin/seo", icon: BarChart3, match: pathPrefix("/admin/seo") },
];

const businessItems: AdminNavigationItem[] = [
  { key: "overview", label: "Overview", to: "/admin/business", icon: Gauge, mobilePrimary: true, match: exactPath("/admin/business") },
  { key: "profile", label: "Business profile", to: "/admin/wedplanned?tab=business", icon: Building2, mobilePrimary: true, match: (pathname, params) => pathname === "/admin/wedplanned" && (params.get("tab") || "business") === "business" },
  { key: "services", label: "Services & areas", to: "/admin/wedplanned?tab=services", icon: MapPinned, match: exactWithQuery("/admin/wedplanned", "tab", "services") },
  { key: "team", label: "Team members", to: "/admin/wedplanned?tab=team", icon: Users, mobilePrimary: true, match: exactWithQuery("/admin/wedplanned", "tab", "team") },
  { key: "client-portal", label: "Client portal", to: "/admin/settings/client-portal", icon: Palette, mobilePrimary: true, match: pathPrefix("/admin/settings/client-portal") },
  { key: "workspace", label: "Domains & workspace", to: "/admin/settings", icon: Settings, match: (pathname) => pathname === "/admin/settings" },
  { key: "operations", label: "Operations", to: "/admin/wedplanned?tab=operations", icon: ShieldCheck, requiredPermission: "operations:read", match: exactWithQuery("/admin/wedplanned", "tab", "operations") },
  { key: "access", label: "Platform access", to: "/admin/wedplanned?tab=access", icon: ContactRound, match: exactWithQuery("/admin/wedplanned", "tab", "access") },
];

export const adminModules: AdminModuleDefinition[] = [
  {
    key: "crm",
    label: "CRM",
    shortLabel: "CRM",
    description: "Leads, clients, jobs and communications",
    to: "/admin/crm?view=overview",
    icon: ContactRound,
    entitlementKey: "crm",
    match: (pathname) => pathname.startsWith("/admin/crm") || isWeddingWorkspacePath(pathname),
    items: crmItems,
  },
  {
    key: "client-galleries",
    label: "Client Galleries",
    shortLabel: "Galleries",
    description: "Private delivery, selections and sales",
    to: "/admin/client-galleries/overview",
    icon: Images,
    entitlementKey: "client_galleries",
    match: (pathname) => pathname.startsWith("/admin/client-galleries") || pathname.startsWith("/admin/print-store"),
    items: clientGalleryItems,
  },
  {
    key: "website",
    label: "Website",
    shortLabel: "Website",
    description: "Public galleries, stories and content",
    to: "/admin",
    icon: Globe2,
    entitlementKey: "website_content",
    match: (pathname) => pathname === "/admin" || ["/admin/website", "/admin/weddings", "/admin/gallery", "/admin/collections", "/admin/locations", "/admin/moments", "/admin/creative-flash", "/admin/custom-collections", "/admin/venues", "/admin/suppliers", "/admin/assets", "/admin/ai", "/admin/seo", "/admin/publishing"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)),
    items: websiteItems,
  },
  {
    key: "business",
    label: "Business",
    shortLabel: "Business",
    description: "Workspace, team, portal and access",
    to: "/admin/business",
    icon: BriefcaseBusiness,
    entitlementKey: "business_settings",
    match: (pathname) => pathname.startsWith("/admin/business") || pathname.startsWith("/admin/wedplanned") || pathname.startsWith("/admin/settings"),
    items: businessItems,
  },
];

export function resolveAdminModule(pathname: string) {
  return adminModules.find((module) => module.match(pathname)) || adminModules.find((module) => module.key === "website")!;
}

export function visibleModuleItems(module: AdminModuleDefinition, permissions: string[]) {
  return module.items.filter((item) => !item.requiredPermission || permissions.includes(item.requiredPermission));
}

export function resolveAdminNavigationItem(module: AdminModuleDefinition, pathname: string, search: string, permissions: string[]) {
  const params = new URLSearchParams(search);
  return visibleModuleItems(module, permissions).find((item) => item.match(pathname, params));
}

export function isAdminNavigationItemActive(item: AdminNavigationItem, pathname: string, search: string) {
  return item.match(pathname, new URLSearchParams(search));
}
