export type CrmStage = {
  id: string;
  key: string;
  name: string;
  type: "open" | "won" | "lost";
  sortOrder: number;
  color: string;
  default: boolean;
};

export type CrmContact = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  marketingConsent: boolean;
  privacyConsentAt?: string;
  notes: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmEnquiry = {
  id: string;
  reference: string;
  stageId: string;
  stageKey: string;
  stageName: string;
  stageType: string;
  status: "open" | "won" | "lost" | "archived";
  source: string;
  campaign: string;
  eventType: string;
  eventDate: string;
  dateFlexibility: string;
  venueText: string;
  venueId: string;
  venueSlug: string;
  serviceInterest: string;
  packageInterest: string;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  notes: string;
  assignedUserId: string;
  contactedAt?: string;
  qualifiedAt?: string;
  wonAt?: string;
  lostAt?: string;
  lostReason: string;
  acceptedJobId: string;
  convertedAt?: string;
  primaryContact: { id: string; displayName: string; email: string; phone: string } | null;
  partnerContact: { id: string; displayName: string; email: string; phone: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmJob = {
  id: string;
  reference: string;
  enquiryId: string;
  jobType: string;
  status: string;
  title: string;
  bookingDate: string;
  eventDate: string;
  serviceName: string;
  packageName: string;
  valueAmount: number | null;
  currency: string;
  venueText: string;
  venueId: string;
  venueSlug: string;
  clientPortalStatus: string;
  weddingSlug: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmLeadFormSettings = {
  enabled: boolean;
  publicPath: string;
  defaultService: string;
  title: string;
  intro: string;
  thankYouTitle: string;
  thankYouMessage: string;
  notificationEmail: string;
  privacyText: string;
  consentRequired: boolean;
};

export type CrmOverview = {
  schemaVersion: number;
  workspace: { id: string; name: string; currency: string };
  stages: CrmStage[];
  enquiries: CrmEnquiry[];
  contacts: CrmContact[];
  jobs: CrmJob[];
  leadForm: CrmLeadFormSettings;
  stats: { open: number; new: number; won: number; lost: number; jobs: number };
};

export type CrmActivity = {
  id: string;
  eventType: string;
  summary: string;
  actorEmail: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type CrmEnquiryDetail = {
  enquiry: CrmEnquiry;
  contacts: CrmContact[];
  activities: CrmActivity[];
  job: CrmJob | null;
};

export type CrmEnquiryInput = {
  stageId?: string;
  source?: string;
  campaign?: string;
  eventType?: string;
  eventDate?: string;
  dateFlexibility?: string;
  venueText?: string;
  venueId?: string;
  venueSlug?: string;
  serviceInterest?: string;
  packageInterest?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string;
  notes?: string;
  assignedUserId?: string;
  primaryContact?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    email?: string;
    phone?: string;
  };
  partnerContact?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    email?: string;
    phone?: string;
  };
};
