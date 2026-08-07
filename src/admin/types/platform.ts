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
  invitationLastSentAt?: string;
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

export type PlatformSupplierTaxonomy = {
  categories: string[];
  roles: Array<{ key?: string; name: string; category: string; sortOrder?: number }>;
};

export type PlatformModuleKey = "crm" | "client-galleries" | "website" | "business";

export type PlatformModuleConfiguration = {
  moduleKey: PlatformModuleKey;
  accentColor: string;
  pageBackgroundColor: string;
  sectionBackgroundColor: string;
  recordBackgroundColor: string;
  iconKey: string;
  markUrl: string;
  wordmarkUrl: string;
  darkWordmarkUrl: string;
  compactWordmarkUrl: string;
  activeButtonStyle: "solid" | "soft" | "outline";
  panelAccentStyle: "edge" | "wash" | "header";
  status: "active" | "archived";
  sortOrder: number;
  updatedAt?: string;
};

export type PlatformBrandAsset = {
  id: string;
  name: string;
  assetType: "logo" | "icon";
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  status: "active" | "archived";
  uploadedByEmail: string;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAdministrationWorkspace = {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
  marketplaceSlug: string;
  memberCount: number;
  activeMemberCount: number;
  domainCount: number;
  verifiedDomainCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAdministrationUser = {
  id: string;
  email: string;
  displayName: string;
  platformRole: string;
  status: string;
  membershipCount: number;
  lastSignedInAt?: string;
  createdAt: string;
};


export type PlatformBrandingIdentity = {
  platformName: string;
  wordmarkUrl: string;
  darkWordmarkUrl: string;
  compactWordmarkUrl: string;
  iconUrl: string;
  updatedAt?: string;
};

export type PlatformAdministrationPayload = {
  schemaVersion: number;
  brand: { name: string; primaryDomain: string; ukDomain: string };
  platformIdentity: PlatformBrandingIdentity;
  summary: { workspaces: number; activeWorkspaces: number; users: number; platformAdmins: number; brandAssets: number };
  workspaces: PlatformAdministrationWorkspace[];
  users: PlatformAdministrationUser[];
  modules: PlatformModuleConfiguration[];
  brandAssets: PlatformBrandAsset[];
  supplierTaxonomy: PlatformSupplierTaxonomy;
  recentAudit: Array<WedPlannedAuditEvent & { actorEmail: string }>;
};

export type WedPlannedPlatformPayload = {
  schemaVersion: number;
  brand: {
    name: string;
    primaryDomain: string;
    ukDomain: string;
  };
  platformIdentity: PlatformBrandingIdentity;
  business: WedPlannedBusiness;
  categories: WedPlannedCategory[];
  serviceAreas: WedPlannedServiceArea[];
  members: WedPlannedMember[];
  entitlements: WedPlannedEntitlement[];
  supplierTaxonomy: PlatformSupplierTaxonomy;
  moduleConfigurations: PlatformModuleConfiguration[];
  scopeReadiness: WedPlannedScopeReadiness[];
  recentAudit: WedPlannedAuditEvent[];
};


export type ProfessionalMembershipSummary = {
  id: string;
  workspaceId: string;
  workspaceSlug: string;
  businessName: string;
  marketplaceSlug: string;
  role: string;
  status: string;
  accessMode: "membership" | "support";
  supportGrantId: string;
  supportScope: "" | "read" | "manage";
};

export type ProfessionalAuthState = {
  accessGranted: boolean;
  authenticated: boolean;
  enforced: boolean;
  mode: "session" | "bootstrap" | "none";
  userId: string;
  email: string;
  displayName: string;
  platformRole: string;
  membershipId: string;
  workspaceId: string;
  workspaceSlug: string;
  businessName: string;
  marketplaceSlug: string;
  role: string;
  permissions: string[];
  memberships: ProfessionalMembershipSummary[];
  accessMode: "membership" | "support" | "bootstrap" | "none";
  supportGrantId: string;
  supportScope: "" | "read" | "manage";
};

export type ProfessionalInvitationResult = {
  membershipId: string;
  delivery: "sent" | "manual";
  invitationUrl?: string;
  expiresAt: string;
};


export type WedPlannedSupportGrant = {
  id: string;
  workspaceId: string;
  scope: "read" | "manage";
  status: "active" | "expired" | "revoked";
  reason: string;
  grantedByEmail: string;
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedByEmail: string;
};

export type WedPlannedSupportEvent = {
  id: string;
  grantId: string;
  supportEmail: string;
  eventType: string;
  method: string;
  path: string;
  statusCode: number | null;
  createdAt: string;
};

export type WedPlannedExportEvent = {
  id: string;
  status: "processing" | "completed" | "failed";
  format: "json";
  fileName: string;
  tableCount: number;
  recordCount: number;
  requestedByEmail: string;
  completedAt?: string;
  createdAt: string;
};

export type WedPlannedDeletionRequest = {
  id: string;
  status: "requested" | "approved" | "executing" | "completed" | "cancelled" | "rejected";
  reason: string;
  confirmationName: string;
  requestedByEmail: string;
  scheduledFor: string;
  retention: Record<string, unknown>;
  cancelledAt?: string;
  cancelledByEmail: string;
  createdAt: string;
  updatedAt: string;
};

export type WedPlannedOperationsPayload = {
  schemaVersion: number;
  workspace: {
    id: string;
    slug: string;
    name: string;
    status: string;
    plan: string;
  };
  support: {
    activeGrant: WedPlannedSupportGrant | null;
    grants: WedPlannedSupportGrant[];
    recentEvents: WedPlannedSupportEvent[];
  };
  exports: WedPlannedExportEvent[];
  deletion: {
    activeRequest: WedPlannedDeletionRequest | null;
    requests: WedPlannedDeletionRequest[];
    coolingOffDays: number;
    protectedRecords: string[];
  };
};
