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
  mailStatus:
    | "none"
    | "sent"
    | "delivered"
    | "opened"
    | "clicked"
    | "failed";
  mailStatusAt: string;
  mailSubject: string;
  acceptedJobId: string;
  convertedAt?: string;
  lastCommunicationAt?: string;
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
  quoteId: string;
  quoteVersionId: string;
  quoteReference: string;
  quoteVersionNumber: number | null;
  acceptedQuoteAt?: string;
  bookingSubtotal: number | null;
  bookingDiscount: number | null;
  bookingTax: number | null;
  packageSnapshot: Record<string, unknown>;
  addonsSnapshot: Array<Record<string, unknown>>;
  quoteSnapshot: Record<string, unknown>;
  taskTotal: number;
  taskCompleted: number;
  taskPending: number;
  taskOverdue: number;
  nextTaskTitle: string;
  nextTaskDueAt: string;
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
  autoresponderEnabled: boolean;
  autoresponderSubject: string;
  autoresponderMessage: string;
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
  communications: CrmCommunication[];
  quotes?: CrmQuote[];
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

export type QuestionnaireFieldType = "heading" | "description" | "short_text" | "long_text" | "select" | "radio" | "checkbox" | "file" | "supplier";

export type QuestionnaireField = {
  id: string;
  type: QuestionnaireFieldType;
  label: string;
  help: string;
  required: boolean;
  options: string[];
  supplierRole: string;
  supplierCategory: string;
  allowUnlisted: boolean;
  multiple: boolean;
};

export type QuestionnaireTemplate = {
  id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "archived";
  version: number;
  fields: QuestionnaireField[];
  createdAt: string;
  updatedAt: string;
};

export type QuestionnaireFile = {
  id: string;
  fieldKey: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
};

export type QuestionnaireInstance = {
  id: string;
  jobId: string;
  templateId: string;
  assignedContactId: string;
  assignedContactName: string;
  title: string;
  introduction: string;
  fields: QuestionnaireField[];
  templateVersion: number;
  status: "draft" | "sent" | "opened" | "in_progress" | "completed" | "archived";
  dueAt: string;
  sentAt?: string;
  openedAt?: string;
  completedAt?: string;
  lastSavedAt?: string;
  responses: Record<string, unknown>;
  files: QuestionnaireFile[];
  jobTitle?: string;
  jobReference?: string;
  createdAt: string;
  updatedAt: string;
};

export type QuestionnaireOverview = {
  templates: QuestionnaireTemplate[];
  instances: QuestionnaireInstance[];
};


export type SupplierDirectoryOption = {
  id: string;
  name: string;
  category: string;
  website?: string;
  instagram?: string;
  email?: string;
  phone?: string;
  location: string;
  county: string;
};

export type CrmSupplierSubmission = {
  id: string;
  jobId: string;
  instanceId: string;
  fieldKey: string;
  responseIndex: number;
  role: string;
  supplierId: string;
  resolvedSupplierId: string;
  name: string;
  website: string;
  instagram: string;
  email: string;
  phone: string;
  location: string;
  county: string;
  status: "pending" | "linked" | "approved" | "rejected" | string;
  reviewNotes: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmContactDetail = {
  contact: CrmContact;
  enquiries: Array<{ id: string; reference: string; status: string; role: string; eventDate: string; venueText: string }>;
  jobs: Array<CrmJob & { role: string }>;
  activities: CrmActivity[];
  communications: CrmCommunication[];
};

export type CrmPortalAccess = {
  jobId: string;
  contactId: string;
  identityId: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
  invitedAt?: string;
  acceptedAt?: string;
  revokedAt?: string;
};


export type CrmWorkflowStep = {
  id: string;
  templateId: string;
  name: string;
  description: string;
  taskType: "task" | "email" | "call" | "meeting" | "milestone" | string;
  relativeTo: "booking_date" | "event_date";
  offsetDays: number;
  priority: "low" | "normal" | "high" | "urgent" | string;
  sortOrder: number;
  required: boolean;
};

export type CrmWorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  appliesTo: "job";
  status: "draft" | "active" | "archived";
  version: number;
  default: boolean;
  steps: CrmWorkflowStep[];
  createdAt: string;
  updatedAt: string;
};

export type CrmJobWorkflow = {
  id: string;
  templateId: string;
  templateName: string;
  templateVersion: number;
  status: "active" | "completed" | "cancelled" | string;
  appliedAt: string;
  completedAt?: string;
  snapshot: CrmWorkflowStep[];
};

export type CrmTask = {
  id: string;
  jobId: string;
  enquiryId: string;
  workflowId: string;
  templateStepId: string;
  title: string;
  description: string;
  taskType: "task" | "email" | "call" | "meeting" | "milestone" | string;
  status: "pending" | "completed" | "cancelled" | string;
  priority: "low" | "normal" | "high" | "urgent" | string;
  dueAt: string;
  assignedUserId: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmCommunication = {
  id: string;
  contactId: string;
  enquiryId: string;
  jobId: string;
  contactName?: string;
  contactEmail?: string;
  channel: "email" | "phone" | "sms" | "meeting" | "note" | string;
  direction: "inbound" | "outbound" | "internal" | string;
  subject: string;
  body: string;
  status: "draft" | "logged" | "sent" | "failed" | string;
  provider?: string;
  providerMessageId?: string;
  failureReason?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  occurredAt: string;
  actorEmail: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type CrmWorkflowOverview = {
  templates: CrmWorkflowTemplate[];
  tasks: CrmTask[];
  jobs: Array<{ id: string; reference: string; title: string; eventDate: string }>;
};

export type CrmWeddingLifecycleGallery = {
  id: string;
  slug: string;
  title: string;
  clientName: string;
  clientEmail: string;
  status: string;
  updatedAt: string;
};

export type CrmWeddingLifecycle = {
  wedding: {
    exists: boolean;
    slug: string;
    title: string;
    couple: string;
    venue: string;
    weddingDate: string;
    status: string;
    assetCount: number;
    previewCount: number;
  };
  clientGalleries: CrmWeddingLifecycleGallery[];
  primaryClientGallery: CrmWeddingLifecycleGallery | null;
  story: {
    state: "not_started" | "draft" | "published" | "archived";
    enabled: boolean;
    status: string;
    listVisible: boolean;
    draftImageCount: number;
    publishedImageCount: number;
    publishedAt: string;
  };
  publicAssignments: { venue: number; moments: number; galleries: number; total: number };
};

export type CrmJobCommercialScheduleItem = {
  id: string;
  label: string;
  scheduleType: string;
  amount: number;
  dueDate: string;
  status: "pending" | "part_paid" | "paid" | "overdue";
  paidAmount: number;
  balanceAmount: number;
};

export type CrmJobCommercialInvoice = {
  id: string;
  reference: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  nextPayment: CrmJobCommercialScheduleItem | null;
  schedule: CrmJobCommercialScheduleItem[];
};

export type CrmJobCommercialContract = {
  id: string;
  reference: string;
  title: string;
  status: string;
  currentVersionId: string;
  versionNumber: number;
  versionStatus: string;
  sentAt: string;
  requiredSignatures: number;
  signatureCount: number;
  signedAt: string;
};

export type CrmJobCommercialQuote = {
  id: string;
  reference: string;
  acceptedAt: string;
  totalAmount: number;
  currency: string;
  packageName: string;
};

export type CrmJobCommercialWorkspace = {
  quote: CrmJobCommercialQuote | null;
  invoice: CrmJobCommercialInvoice | null;
  contract: CrmJobCommercialContract | null;
};

export type CrmJobFile = {
  id: string;
  jobId: string;
  identityId: string;
  actorUserId: string;
  source: "client" | "workspace";
  filename: string;
  mimeType: string;
  fileSize: number;
  status: "active" | "deleted";
  uploadedAt: string;
  deletedAt?: string;
};

export type CrmJobWorkspace = {
  job: CrmJob;
  contacts: Array<{ id: string; displayName: string; email: string; phone: string; role: string }>;
  portalAccess: CrmPortalAccess[];
  questionnaires: QuestionnaireInstance[];
  files: CrmJobFile[];
  templates: QuestionnaireTemplate[];
  enquiry: { reference: string; source: string; campaign: string; notes: string; createdAt: string } | null;
  linkedSuppliers: Array<SupplierDirectoryOption & { role: string; sortOrder: number }>;
  supplierSubmissions: CrmSupplierSubmission[];
  supplierDirectory: SupplierDirectoryOption[];
  activities: CrmActivity[];
  lifecycle: CrmWeddingLifecycle;
  commercial: CrmJobCommercialWorkspace;
  workflow: CrmJobWorkflow | null;
  tasks: CrmTask[];
  taskStats: { total: number; pending: number; completed: number; overdue: number };
  communications: CrmCommunication[];
  workflowTemplates: CrmWorkflowTemplate[];
};

export type CrmQuoteType =
  | "pick_and_choose"
  | "fixed";

export type CrmPackage = {
  id: string;
  name: string;
  serviceType: string;
  internalCode: string;
  description: string;
  priceAmount: number;
  currency: string;
  coverageMinutes: number | null;
  deliverables: string[];
  includedItems: string[];
  clientNotes: string;
  displayOrder: number;
  recommended: boolean;
  status: "active" | "hidden" | "archived";
  imageUrl: string;
  addonIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CrmAddon = {
  id: string;
  name: string;
  description: string;
  priceAmount: number;
  currency: string;
  serviceType: string;
  status: "active" | "hidden" | "archived";
  displayOrder: number;
  availabilityScope: "all" | "selected";
  minimumQuantity: number;
  maximumQuantity: number;
  requirement: "optional" | "recommended" | "mandatory";
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmQuoteItem = {
  id?: string;
  itemType?: "included" | "custom";
  name: string;
  description: string;
  quantity: number;
  unitPriceAmount: number;
  displayOrder: number;
};

export type CrmQuoteAddonOption = {
  id: string;
  addonId: string;
  name: string;
  description: string;
  unitPriceAmount: number;
  currency: string;
  minimumQuantity: number;
  maximumQuantity: number;
  defaultQuantity: number;
  requirement: "optional" | "recommended" | "mandatory";
  displayOrder: number;
  imageUrl: string;
};

export type CrmQuoteOption = {
  id: string;
  packageId: string;
  optionType: "catalogue" | "bespoke";
  name: string;
  description: string;
  serviceType: string;
  internalCode: string;
  basePriceAmount: number;
  currency: string;
  coverageMinutes: number | null;
  deliverables: string[];
  includedItems: string[];
  clientNotes: string;
  imageUrl: string;
  recommended: boolean;
  displayOrder: number;
  items: CrmQuoteItem[];
  addons: CrmQuoteAddonOption[];
};

export type CrmQuoteVersion = {
  id: string;
  quoteId: string;
  versionNumber: number;
  previousVersionId: string;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired" | "superseded";
  clientNotes: string;
  internalNotes: string;
  expiresAt: string;
  discountType: "none" | "fixed" | "percentage";
  discountValue: number;
  taxTreatment: "none" | "inclusive" | "exclusive";
  taxRateBasisPoints: number;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  provider: string;
  providerMessageId: string;
  failureReason: string;
  options: CrmQuoteOption[];
  createdAt: string;
  updatedAt: string;
};

export type CrmQuote = {
  id: string;
  enquiryId: string;
  primaryContactId: string;
  reference: string;
  status: CrmQuoteVersion["status"];
  quoteType: CrmQuoteType;
  currentVersionId: string;
  acceptedVersionId: string;
  acceptedJobId: string;
  currency: string;
  clientName: string;
  partnerName: string;
  clientEmail: string;
  eventDate: string;
  venueText: string;
  enquiryReference: string;
  serviceInterest: string;
  currentVersion: CrmQuoteVersion | null;
  versions: CrmQuoteVersion[];
  createdAt: string;
  updatedAt: string;
};

export type CrmQuoteOverview = {
  quotes: CrmQuote[];
  packages: CrmPackage[];
  addons: CrmAddon[];
};

// v1.10.9a — reusable commercial templates

export type CrmQuoteTemplatePackageOverride = {
  name?: string;
  description?: string;
  basePriceAmount?: number;
  coverageMinutes?: number | null;
  deliverables?: string[];
  includedItems?: string[];
  clientNotes?: string;
};

export type CrmQuoteTemplatePackage = {
  id: string;
  packageId: string;
  displayOrder: number;
  recommended: boolean;
  override: CrmQuoteTemplatePackageOverride;
  package: CrmPackage;
};

export type CrmQuoteTemplateAddon = {
  id: string;
  addonId: string;
  displayOrder: number;
  defaultSelected: boolean;
  override: Record<string, unknown>;
  addon: CrmAddon;
};

export type CrmQuoteTemplate = {
  id: string;
  name: string;
  quoteType: CrmQuoteType;
  description: string;
  clientIntroduction: string;
  clientNotes: string;
  status: "draft" | "active" | "archived";
  version: number;
  default: boolean;
  expiryDays: number;
  discountType: "none" | "fixed" | "percentage";
  discountValue: number;
  taxTreatment: "none" | "inclusive" | "exclusive";
  taxRateBasisPoints: number;
  contractTemplateId: string;
  questionnaireTemplateId: string;
  paymentSchedule: Record<string, unknown>;
  autoCreateInvoice: boolean;
  packages: CrmQuoteTemplatePackage[];
  addons: CrmQuoteTemplateAddon[];
  createdAt: string;
  updatedAt: string;
};

export type CrmQuoteTemplateInput = {
  name?: string;
  quoteType?: CrmQuoteType;
  description?: string;
  clientIntroduction?: string;
  clientNotes?: string;
  status?: "draft" | "active" | "archived";
  default?: boolean;
  expiryDays?: number;
  discountType?: "none" | "fixed" | "percentage";
  discountValue?: number;
  taxTreatment?: "none" | "inclusive" | "exclusive";
  taxRateBasisPoints?: number;
  contractTemplateId?: string;
  questionnaireTemplateId?: string;
  paymentSchedule?: Record<string, unknown>;
  autoCreateInvoice?: boolean;
  packages?: Array<{
    id?: string;
    packageId: string;
    displayOrder?: number;
    recommended?: boolean;
    override?: CrmQuoteTemplatePackageOverride;
  }>;
  addons?: Array<{
    id?: string;
    addonId: string;
    displayOrder?: number;
    defaultSelected?: boolean;
    override?: Record<string, unknown>;
  }>;
};

export type CrmEmailTemplatePurpose =
  | "general"
  | "quote"
  | "booking"
  | "questionnaire"
  | "invoice"
  | "autoresponder";

export type CrmEmailTemplateAttachment = {
  [key: string]: unknown;
};

export type CrmEmailTemplate = {
  id: string;
  name: string;
  description: string;
  purpose: CrmEmailTemplatePurpose;
  subjectTemplate: string;
  bodyHtml: string;
  bodyText: string;
  attachments: CrmEmailTemplateAttachment[];
  appendSignature: boolean;
  status: "draft" | "active" | "archived";
  version: number;
  default: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CrmEmailTemplateInput = {
  name?: string;
  description?: string;
  purpose?: CrmEmailTemplatePurpose;
  subjectTemplate?: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments?: CrmEmailTemplateAttachment[];
  appendSignature?: boolean;
  status?: "draft" | "active" | "archived";
  default?: boolean;
};


// v1.10.6a — commercial workflow settings

export type CrmCommercialTemplateOption = {
  id: string;
  name: string;
  status: string;
};

export type CrmCommercialBookingSettings = {
  autoCreateContract: boolean;
  autoCreateInvoice: boolean;
  autoAssignQuestionnaire: boolean;
  defaultContractTemplateId: string;
  defaultQuestionnaireTemplateId: string;
  depositType:
    | "none"
    | "fixed"
    | "percentage";
  depositValue: number;
  depositDueDaysAfterAcceptance: number;
  finalBalanceDueDaysBeforeEvent: number;
  questionnaireDueDaysBeforeEvent: number;
  invoiceNotes: string;
  invoiceTerms: string;
  updatedAt: string;
};

export type CrmInvoiceSequenceSettings = {
  prefix: string;
  nextNumber: number;
  padding: number;
  updatedAt: string;
};

export type CrmCommercialSettingsPayload = {
  settings: CrmCommercialBookingSettings;
  invoiceSequence:
    CrmInvoiceSequenceSettings;
  contractTemplates:
    CrmCommercialTemplateOption[];
  questionnaireTemplates:
    CrmCommercialTemplateOption[];
};

export type CrmCommercialSettingsInput = {
  autoCreateContract?: boolean;
  autoCreateInvoice?: boolean;
  autoAssignQuestionnaire?: boolean;
  defaultContractTemplateId?:
    string;
  defaultQuestionnaireTemplateId?:
    string;
  depositType?:
    | "none"
    | "fixed"
    | "percentage";
  depositValue?: number;
  depositDueDaysAfterAcceptance?:
    number;
  finalBalanceDueDaysBeforeEvent?:
    number;
  questionnaireDueDaysBeforeEvent?:
    number;
  invoiceNotes?: string;
  invoiceTerms?: string;
  invoicePrefix?: string;
  invoicePadding?: number;
};

// v1.10.6a — contract-template management

export type CrmContractTemplateSection = {
  id: string;
  heading: string;
  body: string;
};

export type CrmContractTemplate = {
  id: string;
  name: string;
  description: string;
  status: "active" | "archived";
  sections:
    CrmContractTemplateSection[];
  createdAt: string;
  updatedAt: string;
};

export type CrmEmailDeliveryMode =
  | "managed"
  | "google"
  | "smtp";

export type CrmEmailSmtpSecurity =
  | "tls"
  | "starttls";

export type CrmEmailSignature = {
  name?: string;
  jobTitle?: string;
  businessName?: string;
  phone?: string;
  website?: string;
  text?: string;
};

export type CrmEmailSettings = {
  deliveryMode: CrmEmailDeliveryMode;
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  signatureEnabled: boolean;
  signature: CrmEmailSignature;
  googleEmail: string;
  googleConnected: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: CrmEmailSmtpSecurity;
  smtpUsername: string;
  smtpCredentialConfigured: boolean;
  lastTestedAt?: string;
  lastTestStatus: "" | "passed" | "failed";
  createdAt?: string;
  updatedAt?: string;
};

export type CrmEmailSettingsInput = {
  deliveryMode?: CrmEmailDeliveryMode;
  senderName?: string;
  senderEmail?: string;
  replyToEmail?: string;
  signatureEnabled?: boolean;
  signature?: CrmEmailSignature;
  googleEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecurity?: CrmEmailSmtpSecurity;
  smtpUsername?: string;
  smtpPassword?: string;
};

export type CrmQuoteEmailTemplateChoice = {
  id: string;
  name: string;
  default: boolean;
};

export type CrmQuoteSendPreview = {
  quoteId: string;
  reference: string;
  to: string;
  clientName: string;
  businessName: string;
  templateId: string;
  templateName: string;
  templates:
    CrmQuoteEmailTemplateChoice[];
  subject: string;
  body: string;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  deliveryMode:
    CrmEmailDeliveryMode;
  providerLabel: string;
  deliveryReady: boolean;
  deliveryIssue: string;
  secureLinkMergeField: string;
  attachments:
    Array<Record<string, unknown>>;
  attachmentDeliveryReady: boolean;
};

export type CrmQuoteSendInput = {
  templateId?: string;
  subject: string;
  body: string;
};
