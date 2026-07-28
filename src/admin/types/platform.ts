export type WedPlannedBusiness = {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  workspaceStatus: string;
  plan: string;
  publicName: string;
  legalName: string;
  marketplaceSlug: string;
  businessType: "sole_trader" | "partnership" | "limited_company" | "charity" | "other";
  summary: string;
  yearEstablished: number | null;
  registrationCountry: string;
  companyNumber: string;
  taxNumber: string;
  onboardingStatus: string;
  marketplaceStatus: string;
  websiteUrl: string;
  contactEmail: string;
  phone: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  linkedin: string;
  logoUrl: string;
  coverUrl: string;
  defaultCountry: string;
  timezone: string;
  currency: string;
};

export type WedPlannedCategory = {
  key: string;
  name: string;
  group: string;
  description: string;
  iconKey: string;
  selected: boolean;
  primary: boolean;
};

export type WedPlannedServiceArea = {
  id: string;
  label: string;
  areaType: "local" | "city" | "county" | "region" | "country" | "destination" | "remote" | "custom";
  countryCode: string;
  regionCode: string;
  radiusMiles: number | null;
  remoteAvailable: boolean;
  sortOrder: number;
  status: string;
};

export type WedPlannedMember = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  jobTitle: string;
  role: "owner" | "admin" | "manager" | "content" | "finance" | "staff" | "viewer";
  status: "active" | "invited" | "disabled";
  permissions: Record<string, unknown>;
  invitedAt?: string;
  acceptedAt?: string;
  lastActiveAt?: string;
};

export type WedPlannedEntitlement = {
  key: string;
  name: string;
  description: string;
  unitLabel: string;
  enabled: boolean;
  source: string;
  limit: number | null;
};

export type WedPlannedScopeReadiness = {
  key: string;
  label: string;
  status: "scoped" | "migration" | "planned";
  detail: string;
};

export type WedPlannedAuditEvent = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
};

export type WedPlannedPlatformPayload = {
  schemaVersion: number;
  brand: {
    name: string;
    primaryDomain: string;
    ukDomain: string;
  };
  business: WedPlannedBusiness;
  categories: WedPlannedCategory[];
  serviceAreas: WedPlannedServiceArea[];
  members: WedPlannedMember[];
  entitlements: WedPlannedEntitlement[];
  scopeReadiness: WedPlannedScopeReadiness[];
  recentAudit: WedPlannedAuditEvent[];
};
