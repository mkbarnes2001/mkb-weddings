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

export type CrmJobWorkspace = {
  job: CrmJob;
  contacts: Array<{ id: string; displayName: string; email: string; phone: string; role: string }>;
  portalAccess: CrmPortalAccess[];
  questionnaires: QuestionnaireInstance[];
  templates: QuestionnaireTemplate[];
  enquiry: { reference: string; source: string; campaign: string; notes: string; createdAt: string } | null;
  linkedSuppliers: Array<SupplierDirectoryOption & { role: string; sortOrder: number }>;
  supplierSubmissions: CrmSupplierSubmission[];
  supplierDirectory: SupplierDirectoryOption[];
  activities: CrmActivity[];
  workflow: CrmJobWorkflow | null;
  tasks: CrmTask[];
  taskStats: { total: number; pending: number; completed: number; overdue: number };
  communications: CrmCommunication[];
  workflowTemplates: CrmWorkflowTemplate[];
};
