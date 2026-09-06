export type AdminSetting = {
  label: string;
  description: string;
  to: string;
  permission?: string;
  entitlements?: string[];
};
export const adminSettingsGroups: Array<{ title: string; module: "business" | "crm"; items: AdminSetting[] }> = [
  { title: "Business", module: "business", items: [
    { label: "Business profile", description: "Your business name and contact details", to: "/admin/wedplanned?tab=business" },
    { label: "Team", description: "Members and access", to: "/admin/wedplanned?tab=team", permission: "members:read" },
    { label: "Services & areas", description: "What you offer and where you work", to: "/admin/wedplanned?tab=services" },
    { label: "Domains & workspace", description: "Domains, timezone and currency", to: "/admin/settings/workspace" },
  ] },
  { title: "Client experience", module: "crm", items: [
    { label: "Online booking", description: "Sessions, team availability and booking payments", to: "/admin/crm/online-booking", permission: "crm:read", entitlements: ["crm", "bookings"] },
    { label: "Lead form", description: "Enquiry fields and publishing", to: "/admin/crm?view=lead-form", permission: "crm:read", entitlements: ["crm"] },
    { label: "Client portal", description: "Logo, colours and client experience", to: "/admin/settings/client-portal", entitlements: ["crm", "client-portal"] },
    { label: "Email", description: "Sender, signature and connections", to: "/admin/crm/email-settings", permission: "crm:read", entitlements: ["crm"] },
    { label: "Payment setup", description: "Connected client payments", to: "/admin/crm/payment-setup", permission: "crm:read", entitlements: ["crm", "connected-payments"] },
    { label: "Booking settings", description: "Contracts, invoices and booking defaults", to: "/admin/crm?view=commercial-settings", permission: "crm:read", entitlements: ["crm", "bookings"] },
  ] },
  { title: "Templates", module: "crm", items: [
    { label: "Templates", description: "Quotes, email, contracts, questionnaires and workflows", to: "/admin/crm/templates", permission: "crm:read", entitlements: ["crm"] },
  ] },
  { title: "Brand & delivery", module: "business", items: [
    { label: "Website", description: "Website connection and publishing", to: "/admin/website", entitlements: ["content-tools"] },
    { label: "Store", description: "Products, prices and fulfilment", to: "/admin/print-store?tab=catalogue", entitlements: ["client-galleries", "print-store"] },
  ] },
  { title: "Plan & billing", module: "business", items: [
    { label: "Plan & billing", description: "Subscription and business access", to: "/admin/wedplanned?tab=billing", permission: "billing:read" },
  ] },
];

export function visibleSettingsGroups(permissions: readonly string[], entitlements: ReadonlySet<string> | null, module?: "business" | "crm") {
  return adminSettingsGroups.filter(group => !module || group.module === module).map(group => ({ ...group, items: group.items.filter(item =>
    (!item.permission || permissions.includes(item.permission))
    && (!item.entitlements?.length || (entitlements !== null && item.entitlements.every(key => entitlements.has(key))))
  ) })).filter(group => group.items.length);
}

export const adminTemplateOptions: AdminSetting[] = [
  { label: "Quote templates", description: "Packages, extras and quote defaults", to: "/admin/crm/templates/quotes", permission: "crm:read", entitlements: ["crm", "bookings"] },
  { label: "Email templates", description: "Reusable messages for your clients", to: "/admin/crm/templates/emails", permission: "crm:read", entitlements: ["crm"] },
  { label: "Contract templates", description: "Reusable terms and contract sections", to: "/admin/crm/templates/contracts", permission: "crm:read", entitlements: ["crm", "bookings", "contracts"] },
  { label: "Questionnaire templates", description: "Client questions and supplier details", to: "/admin/crm/templates/questionnaires", permission: "crm:read", entitlements: ["crm", "client-portal"] },
  { label: "Workflow templates", description: "Tasks and booking milestones", to: "/admin/crm/templates/workflows", permission: "crm:read", entitlements: ["crm"] },
  { label: "Packages & add-ons", description: "Services and prices used in your quotes", to: "/admin/crm/catalogue", permission: "crm:read", entitlements: ["crm", "bookings"] },
];

export function visibleTemplateOptions(permissions: readonly string[], entitlements: ReadonlySet<string> | null) {
  return adminTemplateOptions.filter(item => (!item.permission || permissions.includes(item.permission))
    && entitlements !== null && item.entitlements?.every(key => entitlements.has(key)));
}

export function settingsReturnLink(pathname: string, search: string): { to: string; label: string } | null {
  const params = new URLSearchParams(search);
  const view = params.get("view");
  if (pathname === "/admin/settings" || pathname === "/admin/crm/settings") return null;
  if (pathname.startsWith("/admin/crm/catalogue/packages/")) return { to: "/admin/crm/catalogue", label: "Back to Packages" };
  if (pathname.startsWith("/admin/crm/catalogue/addons/")) return { to: "/admin/crm/catalogue/addons", label: "Back to Add-ons" };
  if (/^\/admin\/crm\/templates\/quotes\/.+/.test(pathname)) return { to: "/admin/crm/templates/quotes", label: "Back to Quote templates" };
  if (/^\/admin\/crm\/contracts\/templates\/.+/.test(pathname)) return { to: "/admin/crm/templates/contracts", label: "Back to Contract templates" };
  if (/^\/admin\/crm\/questionnaires\/.+/.test(pathname)) return { to: "/admin/crm/templates/questionnaires", label: "Back to Questionnaire templates" };
  if (/^\/admin\/crm\/workflows\/.+/.test(pathname)) return { to: "/admin/crm/templates/workflows", label: "Back to Workflow templates" };
  if (pathname.startsWith("/admin/crm/templates/") || pathname.startsWith("/admin/crm/catalogue")
    || (pathname === "/admin/crm" && (view === "questionnaires" || view === "workflows"))) {
    return { to: "/admin/crm/templates", label: "Back to Templates" };
  }
  const group = adminSettingsGroups.find(group => group.items.some(item => {
    const [path, query] = item.to.split("?");
    return path === pathname && [...new URLSearchParams(query)].every(([key, value]) => params.get(key) === value);
  }));
  return group ? { to: group.module === "crm" ? "/admin/crm/settings" : "/admin/settings", label: group.module === "crm" ? "Back to CRM settings" : "Back to Settings" } : null;
}

export function isSettingsEditor(pathname: string, search: string) {
  return settingsReturnLink(pathname, search) !== null;
}
