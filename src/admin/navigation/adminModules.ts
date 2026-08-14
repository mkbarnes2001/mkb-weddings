import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
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
  Mail,
  MapPinned,
  Package,
  Palette,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";
import type { PlatformModuleConfiguration, PlatformModuleKey } from "../types/platform";

export type AdminModuleKey = PlatformModuleKey;

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
  { key: "templates", label: "Templates", to: "/admin/crm/templates", icon: FileText, match: pathPrefix("/admin/crm/templates") },
  { key: "email-settings", label: "Email settings", to: "/admin/crm/email-settings", icon: Mail, match: pathPrefix("/admin/crm/email-settings") },
  { key: "questionnaires", label: "Questionnaires", to: "/admin/crm?view=questionnaires", icon: ClipboardList, match: (pathname, params) => pathname.startsWith("/admin/crm/questionnaires/") || exactWithQuery("/admin/crm", "view", "questionnaires")(pathname, params) },
  { key: "workflows", label: "Workflows", to: "/admin/crm?view=workflows", icon: Workflow, match: (pathname, params) => pathname.startsWith("/admin/crm/workflows/") || exactWithQuery("/admin/crm", "view", "workflows")(pathname, params) },
  { key: "commercial-settings", label: "Commercial settings", to: "/admin/crm?view=commercial-settings", icon: Settings, match: (pathname, params) => pathname.startsWith("/admin/crm/contracts/templates/") || exactWithQuery("/admin/crm", "view", "commercial-settings")(pathname, params) },
  { key: "lead-form", label: "Lead form", to: "/admin/crm?view=lead-form", icon: ClipboardList, match: exactWithQuery("/admin/crm", "view", "lead-form") },
  { key: "client-portal", label: "Client portal", to: "/admin/settings/client-portal", icon: Palette, mobilePrimary: true, match: pathPrefix("/admin/settings/client-portal") },
];

const clientGalleryItems: AdminNavigationItem[] = [
  { key: "overview", label: "Overview", to: "/admin/client-galleries/overview", icon: Gauge, mobilePrimary: true, match: exactPath("/admin/client-galleries/overview") },
  { key: "galleries", label: "Client galleries", to: "/admin/client-galleries", icon: Images, mobilePrimary: true, match: (pathname) => pathname !== "/admin/client-galleries/overview" && pathPrefix("/admin/client-galleries")(pathname) },
  { key: "store", label: "Store", to: "/admin/print-store?tab=catalogue", icon: Store, mobilePrimary: true, match: (pathname, params) => pathname === "/admin/print-store" && (params.get("tab") || "catalogue") !== "orders" },
  { key: "orders", label: "Orders", to: "/admin/print-store?tab=orders", icon: ShoppingBag, mobilePrimary: true, match: exactWithQuery("/admin/print-store", "tab", "orders") },
];

const studioItems: AdminNavigationItem[] = [
  { key: "overview", label: "Overview", to: "/admin/studio", icon: Gauge, mobilePrimary: true, match: exactPath("/admin/studio") },
  { key: "website", label: "Website", to: "/admin/website", icon: Globe2, mobilePrimary: true, match: exactPath("/admin/website") },
  { key: "weddings", label: "Wedding stories", to: "/admin/weddings", icon: FileText, mobilePrimary: true, match: pathPrefix("/admin/weddings") },
  { key: "galleries", label: "Galleries", to: "/admin/gallery", icon: Images, mobilePrimary: true, match: (pathname) => pathname === "/admin/gallery" || pathname.startsWith("/admin/gallery/") || pathname === "/admin/collections" },
  { key: "venues", label: "Venues", to: "/admin/venues", icon: Globe2, mobilePrimary: true, match: pathPrefix("/admin/venues") },
  { key: "locations", label: "Locations", to: "/admin/locations", icon: MapPinned, match: pathPrefix("/admin/locations") },
  { key: "moments", label: "Moments", to: "/admin/moments", icon: Layers3, match: (pathname) => pathPrefix("/admin/moments")(pathname) || pathPrefix("/admin/creative-flash")(pathname) },
  { key: "collections", label: "Collections", to: "/admin/custom-collections", icon: LockKeyhole, match: pathPrefix("/admin/custom-collections") },
  { key: "assets", label: "Asset library", to: "/admin/assets", icon: Database, match: pathPrefix("/admin/assets") },
  { key: "ai", label: "AI content", to: "/admin/ai", icon: Bot, match: pathPrefix("/admin/ai") },
  { key: "seo", label: "SEO", to: "/admin/seo", icon: BarChart3, match: pathPrefix("/admin/seo") },
  { key: "publishing", label: "Publishing", to: "/admin/publishing", icon: Sparkles, match: pathPrefix("/admin/publishing") },
];

const businessItems: AdminNavigationItem[] = [
  { key: "overview", label: "Overview", to: "/admin", icon: Gauge, mobilePrimary: true, match: (pathname) => pathname === "/admin" || pathname === "/admin/business" },
  { key: "profile", label: "Business profile", to: "/admin/wedplanned?tab=business", icon: Building2, mobilePrimary: true, match: (pathname, params) => pathname === "/admin/wedplanned" && (params.get("tab") || "business") === "business" },
  { key: "services", label: "Services & areas", to: "/admin/wedplanned?tab=services", icon: MapPinned, match: exactWithQuery("/admin/wedplanned", "tab", "services") },
  { key: "suppliers", label: "Suppliers", to: "/admin/suppliers", icon: Users, mobilePrimary: true, match: pathPrefix("/admin/suppliers") },
  { key: "team", label: "Team members", to: "/admin/wedplanned?tab=team", icon: Users, mobilePrimary: true, match: exactWithQuery("/admin/wedplanned", "tab", "team") },
  { key: "workspace", label: "Domains & workspace", to: "/admin/settings", icon: Settings, match: (pathname) => pathname === "/admin/settings" },
];

export const platformAdminItems: AdminNavigationItem[] = [
  { key: "overview", label: "Platform overview", to: "/admin/platform", icon: Gauge, mobilePrimary: true, match: (pathname, params) => pathname === "/admin/platform" && !(params.get("section") || "") },
  { key: "businesses", label: "Businesses & workspaces", to: "/admin/platform?section=businesses", icon: Building2, mobilePrimary: true, match: exactWithQuery("/admin/platform", "section", "businesses") },
  { key: "taxonomy", label: "Supplier taxonomy", to: "/admin/platform?section=taxonomy", icon: Users, match: exactWithQuery("/admin/platform", "section", "taxonomy") },
  { key: "modules", label: "Module configuration", to: "/admin/platform?section=modules", icon: Palette, mobilePrimary: true, match: exactWithQuery("/admin/platform", "section", "modules") },
  { key: "public-appearance", label: "Public website", to: "/admin/platform?section=public-appearance", icon: Globe2, match: exactWithQuery("/admin/platform", "section", "public-appearance") },
  { key: "assets", label: "WedPlanned assets", to: "/admin/platform?section=assets", icon: Images, match: exactWithQuery("/admin/platform", "section", "assets") },
  { key: "operations", label: "Platform operations", to: "/admin/platform?section=operations", icon: ShieldCheck, match: exactWithQuery("/admin/platform", "section", "operations") },
  { key: "access", label: "Platform access", to: "/admin/platform?section=access", icon: ContactRound, mobilePrimary: true, match: exactWithQuery("/admin/platform", "section", "access") },
];

export const adminModules: AdminModuleDefinition[] = [
  // The persisted key remains "business" for entitlement and production configuration compatibility.
  { key: "business", label: "WedNav", shortLabel: "W.NAV", description: "Business home, profile, team and suppliers", to: "/admin", icon: BriefcaseBusiness, entitlementKey: "business_settings", match: (pathname) => pathname === "/admin" || pathname.startsWith("/admin/business") || pathname.startsWith("/admin/wedplanned") || pathname === "/admin/settings" || pathname.startsWith("/admin/suppliers"), items: businessItems },
  { key: "crm", label: "WedCRM", shortLabel: "W.CRM", description: "Client journey, bookings and communications", to: "/admin/crm?view=overview", icon: ContactRound, entitlementKey: "crm", match: (pathname) => pathname.startsWith("/admin/crm") || pathname === "/admin/settings/client-portal" || isWeddingWorkspacePath(pathname), items: crmItems },
  // The persisted key remains "website" for entitlement and production configuration compatibility.
  { key: "website", label: "WedStudio", shortLabel: "W.STU", description: "Website, stories, galleries and publishing", to: "/admin/studio", icon: Globe2, entitlementKey: "website_content", match: (pathname) => ["/admin/studio", "/admin/website", "/admin/weddings", "/admin/gallery", "/admin/collections", "/admin/locations", "/admin/moments", "/admin/creative-flash", "/admin/custom-collections", "/admin/venues", "/admin/assets", "/admin/ai", "/admin/seo", "/admin/publishing"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)), items: studioItems },
  { key: "client-galleries", label: "WedStore", shortLabel: "W.STO", description: "Client galleries, delivery and commerce", to: "/admin/client-galleries/overview", icon: Images, entitlementKey: "client_galleries", match: (pathname) => pathname.startsWith("/admin/client-galleries") || pathname.startsWith("/admin/print-store"), items: clientGalleryItems },
];

export const adminModuleIconOptions = [
  { key: "contact-round", label: "Contact", icon: ContactRound },
  { key: "images", label: "Images", icon: Images },
  { key: "globe-2", label: "Globe", icon: Globe2 },
  { key: "briefcase-business", label: "Briefcase", icon: BriefcaseBusiness },
  { key: "calendar-days", label: "Calendar", icon: CalendarDays },
  { key: "camera", label: "Camera", icon: Camera },
  { key: "layers-3", label: "Layers", icon: Layers3 },
  { key: "palette", label: "Palette", icon: Palette },
  { key: "sparkles", label: "Sparkles", icon: Sparkles },
] as const;

const iconByKey = new Map<string, LucideIcon>(adminModuleIconOptions.map((option) => [option.key, option.icon]));

export const defaultAdminModuleConfigurations: PlatformModuleConfiguration[] = [
  { moduleKey: "crm", accentColor: "#2563EB", pageBackgroundColor: "#F5F3EF", sectionBackgroundColor: "#FFFFFF", recordBackgroundColor: "#FFFFFF", desktopNavBackgroundColor: "", desktopNavTextColor: "", desktopNavButtonColor: "", desktopNavActiveColor: "", desktopNavActiveTextColor: "", mobileNavBackgroundColor: "", mobileNavTextColor: "", mobileNavButtonColor: "", mobileNavActiveColor: "", mobileNavActiveTextColor: "", moduleFontScale: 100, headingFontScale: 100, buttonFontScale: 100, navigationFontScale: 100, pageHeaderLogoScale: 100, sidebarLogoScale: 100, mobileLogoScale: 100, iconKey: "contact-round", markUrl: "", wordmarkUrl: "", darkWordmarkUrl: "", compactWordmarkUrl: "", activeButtonStyle: "solid", panelAccentStyle: "edge", status: "active", sortOrder: 10 },
  { moduleKey: "client-galleries", accentColor: "#7C3AED", pageBackgroundColor: "#F5F3EF", sectionBackgroundColor: "#FFFFFF", recordBackgroundColor: "#FFFFFF", desktopNavBackgroundColor: "", desktopNavTextColor: "", desktopNavButtonColor: "", desktopNavActiveColor: "", desktopNavActiveTextColor: "", mobileNavBackgroundColor: "", mobileNavTextColor: "", mobileNavButtonColor: "", mobileNavActiveColor: "", mobileNavActiveTextColor: "", moduleFontScale: 100, headingFontScale: 100, buttonFontScale: 100, navigationFontScale: 100, pageHeaderLogoScale: 100, sidebarLogoScale: 100, mobileLogoScale: 100, iconKey: "images", markUrl: "", wordmarkUrl: "", darkWordmarkUrl: "", compactWordmarkUrl: "", activeButtonStyle: "soft", panelAccentStyle: "wash", status: "active", sortOrder: 20 },
  { moduleKey: "website", accentColor: "#0F766E", pageBackgroundColor: "#F5F3EF", sectionBackgroundColor: "#FFFFFF", recordBackgroundColor: "#FFFFFF", desktopNavBackgroundColor: "", desktopNavTextColor: "", desktopNavButtonColor: "", desktopNavActiveColor: "", desktopNavActiveTextColor: "", mobileNavBackgroundColor: "", mobileNavTextColor: "", mobileNavButtonColor: "", mobileNavActiveColor: "", mobileNavActiveTextColor: "", moduleFontScale: 100, headingFontScale: 100, buttonFontScale: 100, navigationFontScale: 100, pageHeaderLogoScale: 100, sidebarLogoScale: 100, mobileLogoScale: 100, iconKey: "globe-2", markUrl: "", wordmarkUrl: "", darkWordmarkUrl: "", compactWordmarkUrl: "", activeButtonStyle: "solid", panelAccentStyle: "edge", status: "active", sortOrder: 30 },
  { moduleKey: "business", accentColor: "#B45309", pageBackgroundColor: "#F5F3EF", sectionBackgroundColor: "#FFFFFF", recordBackgroundColor: "#FFFFFF", desktopNavBackgroundColor: "", desktopNavTextColor: "", desktopNavButtonColor: "", desktopNavActiveColor: "", desktopNavActiveTextColor: "", mobileNavBackgroundColor: "", mobileNavTextColor: "", mobileNavButtonColor: "", mobileNavActiveColor: "", mobileNavActiveTextColor: "", moduleFontScale: 100, headingFontScale: 100, buttonFontScale: 100, navigationFontScale: 100, pageHeaderLogoScale: 100, sidebarLogoScale: 100, mobileLogoScale: 100, iconKey: "briefcase-business", markUrl: "", wordmarkUrl: "", darkWordmarkUrl: "", compactWordmarkUrl: "", activeButtonStyle: "outline", panelAccentStyle: "header", status: "active", sortOrder: 40 },
];

export function resolveAdminModule(pathname: string) {
  return adminModules.find((module) => module.match(pathname)) || adminModules.find((module) => module.key === "business")!;
}

export function resolveAdminModuleAppearance(moduleKey: AdminModuleKey, configurations: PlatformModuleConfiguration[] = []) {
  const fallback = defaultAdminModuleConfigurations.find((item) => item.moduleKey === moduleKey)!;
  const configured = configurations.find((item) => item.moduleKey === moduleKey && item.status === "active");
  return { ...fallback, ...(configured || {}), moduleKey };
}

export function resolveAdminModuleIcon(module: AdminModuleDefinition, configuration?: PlatformModuleConfiguration) {
  return iconByKey.get(configuration?.iconKey || "") || module.icon;
}

export function visibleModuleItems(module: AdminModuleDefinition, permissions: string[]) {
  return module.items.filter((item) => !item.requiredPermission || permissions.includes(item.requiredPermission));
}

export function resolveAdminNavigationItem(module: AdminModuleDefinition, pathname: string, search: string, permissions: string[]) {
  const params = new URLSearchParams(search);
  return visibleModuleItems(module, permissions).find((item) => item.match(pathname, params));
}

export function resolvePlatformAdminNavigationItem(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  return platformAdminItems.find((item) => item.match(pathname, params)) || platformAdminItems[0];
}

export function isAdminNavigationItemActive(item: AdminNavigationItem, pathname: string, search: string) {
  return item.match(pathname, new URLSearchParams(search));
}
