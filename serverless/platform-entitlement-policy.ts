export type ProfessionalFeatureKey =
  | "crm"
  | "bookings"
  | "contracts"
  | "invoices"
  | "connected-payments"
  | "content-tools"
  | "client-portal"
  | "client-galleries"
  | "print-store";


function normalizedPath(pathnameInput: string) {
  const value = String(pathnameInput || "").trim();
  if (!value) return "/";

  const path = value.split("?", 1)[0].replace(/\/+/g, "/");

  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
}


function pathPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}


function crmParts(path: string) {
  if (!pathPrefix(path, "/api/crm")) return [];

  return path
    .slice("/api/crm".length)
    .split("/")
    .filter(Boolean);
}


function crmEntitlement(path: string): ProfessionalFeatureKey {
  const parts = crmParts(path);

  if (parts[0] === "calendar" || parts[0] === "online-booking") return "bookings";

  if (parts[0] === "payments") {
    return "connected-payments";
  }

  if (
    parts[0] === "job-files"
    || parts[0] === "questionnaire-files"
  ) {
    return "client-portal";
  }

  if (parts[0] === "jobs" && parts[1]) {
    const operation = parts[2] || "";

    if (operation === "client-gallery") {
      return "client-galleries";
    }

    if (
      operation === "questionnaires"
      || operation === "invite"
      || operation === "revoke"
      || operation === "files"
      || operation === "supplier-submissions"
    ) {
      return "client-portal";
    }

    if (operation === "contracts") {
      return "contracts";
    }

    if (operation === "invoices") {
      return "invoices";
    }

    return "bookings";
  }

  if (parts[0] === "contracts") {
    return "contracts";
  }

  if (
    parts[0] === "commercial"
    && parts[1] === "payment-schedules"
  ) {
    return "invoices";
  }

  if (
    parts[0] === "catalogue"
    || parts[0] === "quotes"
    || (
      parts[0] === "templates"
      && parts[1] === "quotes"
    )
    || (
      parts[0] === "commercial"
      && parts[1] === "settings"
    )
  ) {
    return "bookings";
  }

  if (parts[0] === "questionnaires") {
    return "client-portal";
  }

  return "crm";
}


const CONTENT_TOOL_PREFIXES = [
  "/api/assets",
  "/api/creative-flash",
  "/api/custom-collections",
  "/api/gallery-landing-settings",
  "/api/gallery-master-heroes",
  "/api/locations",
  "/api/moments",
  "/api/uploads/image",
  "/api/venue-discovery",
  "/api/venue-list-settings",
  "/api/venues",
  "/api/wedding-list-settings",
  "/api/weddings",
];


export function professionalApiEntitlementForPath(
  pathnameInput: string,
): ProfessionalFeatureKey | null {
  const path = normalizedPath(pathnameInput);

  if (
    pathPrefix(path, "/api/public")
    || pathPrefix(path, "/api/webhooks")
    || pathPrefix(path, "/api/print-assets")
  ) {
    return null;
  }

  if (
    pathPrefix(path, "/api/platform-auth")
    || pathPrefix(path, "/api/platform-billing")
    || pathPrefix(path, "/api/platform-admin")
    || pathPrefix(path, "/api/platform-operations")
    || pathPrefix(path, "/api/platform-public-appearance")
    || pathPrefix(path, "/api/platform-assets")
    || path === "/api/platform"
    || path === "/api/workspace"
    || pathPrefix(path, "/api/suppliers")
    || path === "/api/health"
    || path === "/api/db-health"
  ) {
    return null;
  }

  if (pathPrefix(path, "/api/crm")) {
    return crmEntitlement(path);
  }

  if (pathPrefix(path, "/api/wedding-workspace")) {
    return "bookings";
  }

  if (pathPrefix(path, "/api/workspace/portal-assets")) {
    return "client-portal";
  }

  if (pathPrefix(path, "/api/client-galleries")) {
    if (/\/store(?:\/|$)/.test(path)) {
      return "print-store";
    }

    return "client-galleries";
  }

  if (pathPrefix(path, "/api/print-store")) {
    return "print-store";
  }

  if (
    CONTENT_TOOL_PREFIXES.some(
      (prefix) => pathPrefix(path, prefix),
    )
  ) {
    return "content-tools";
  }

  return null;
}
