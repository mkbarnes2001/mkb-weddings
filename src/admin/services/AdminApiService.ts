import type {
  MasterSupplier,
  SupplierRecord } from "./SupplierService";
import type { StoryFact } from "./StoryService";
import type { WeddingDocument } from "../../lib/weddingEngine";
import type { ImageManagerDocument } from "../types/imageManager";
import type { MomentGalleryPayload,
  MomentRepositoryDocument } from "../types/moment";
import type { CustomCollection,
  CustomCollectionGalleryPayload,
  CustomCollectionMembershipPayload } from "../types/customCollection";
import type { VenueDocument,
  VenueSummary } from "../types/venue";
import type { AssetLibraryFilters,
  AssetLibraryPayload } from "../types/asset";
import type { ClientGalleryDetailPayload,
  ClientGalleryFavouritesPayload,
  ClientGalleryListPayload,
  ClientGalleryRecord,
  PrivateOriginalUploadSession,
  PrivateOriginalUploadedPart } from "../types/clientGallery";
import type { WeddingPreviewAssignmentInput,
  WeddingWorkspacePayload } from "../types/weddingWorkspace";
import type { ClientGalleryStoreAdminPayload,
  ClientGalleryStoreSettings,
  PrintStoreAdminPayload,
  PrintStoreOrderStatus,
  PrintStorePriceList,
  PrintStoreProduct } from "../types/printStore";
import type { PlatformAdministrationPayload,
  PlatformBrandAsset,
  PlatformBrandingIdentity,
  PlatformModuleConfiguration,
  PlatformSupplierTaxonomy,
  ProfessionalAuthState,
  ProfessionalInvitationResult,
  WedPlannedPlatformPayload,
  WedPlannedBusiness,
  WedPlannedMember,
  WedPlannedOperationsPayload,
  WedPlannedServiceArea } from "../types/platform";
import type { CrmAddon,
  CrmContactDetail,
  CrmEnquiryDetail,
  CrmEnquiryInput,
  CrmJobWorkspace,
  CrmLeadFormSettings,
  CrmOverview,
  CrmPackage,
  CrmQuote,
  CrmQuoteOverview,
  CrmWorkflowOverview,
  CrmWorkflowTemplate,
  QuestionnaireInstance,
  QuestionnaireOverview,
  QuestionnaireTemplate,
  CrmCommercialSettingsInput,
  CrmCommercialSettingsPayload,
  CrmPaymentSchedulePreset,
  CrmPaymentSchedulePresetInput,
  CrmContractTemplate,
  CrmQuoteTemplate,
  CrmQuoteTemplateInput,
  CrmEmailTemplate,
  CrmEmailTemplateInput,
  CrmEmailSettings,
  CrmEmailSettingsInput,
  CrmQuoteSendPreview,
  CrmQuoteSendInput,
  CrmDeletePreflight,
  CrmLeadDeleteReceipt,
} from "../types/crm";
import type {
  WedPlannedPublicAppearanceAdministration,
  WedPlannedPublicTheme,
} from "../types/publicAppearance";
import { prepareImageUpload } from "./ImageUploadService";

const API_BASE =
  import.meta.env.VITE_ADMIN_API_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:8787" : "");

type ApiErrorPayload = { error?: string; details?: string[] };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload;
    const detailText = errorPayload.details?.length ? ` ${errorPayload.details.join(" ")}` : "";
    throw new Error(`${errorPayload.error || `Request failed (${response.status}).`}${detailText}`);
  }
  return payload as T;
}

export type SupplierSaveResult = { ok: true; blogSlug: string; savedRows: number; totalRows: number; backupPath: string | null };
export type EditableStory = { slug: string; title: string; excerpt: string; intro: string; paragraphs: string[]; facts: StoryFact[]; updatedAt?: string };
export type StorySaveResult = {
  ok: true;
  slug: string;
  story: EditableStory;
  backupPath: string | null;
  weddingBackupPath?: string | null;
};
export type WeddingCreateResult = { ok: true; slug: string; weddingPath: string; createdFiles: string[] };
export type StoredWeddingDocument = WeddingDocument & { storage: "d1"; weddingPath: string };
export type WeddingImagesSaveResult = { ok: true; slug: string; savedImages: number; backupPath: string | null };
export type MomentSaveResult = { ok: true; document: MomentRepositoryDocument; backupPath: string | null };
export type WeddingUpdateResult = { ok: true; wedding: StoredWeddingDocument; backupPath: string | null };
export type VenueUpdateResult = { ok: true; venue: VenueSummary; backupPath: string | null };
export type VenueCreateResult = { ok: true; venue: VenueSummary };

export type VenueDiscoveryResult = {
  provider: "google" | "none";
  configured: boolean;
  id: string;
  name: string;
  formattedAddress: string;
  town: string;
  county: string;
  country: string;
  countryCode: string;
  googleMapsUrl: string;
};
export type GalleryLandingSettings = { cardOrder: string[]; hiddenCards: string[] };
export type VenueListSetting = { slug: string; sortOrder: number; galleryVisible: boolean };
export type WeddingListSetting = { slug: string; sortOrder: number; storyVisible: boolean };

export type LocationGallerySettings = {
  enabled: boolean;
  landingTitle: string;
  galleryTitle: string;
  cardDescription: string;
  singularLabel: string;
  pluralLabel: string;
  groupingLevel: string;
  publicBasePath: string;
  intro: string;
  seoTitle: string;
  seoDescription: string;
  heroImageUrl: string;
  publicOrigin?: string;
};

export type LocationTypeDefinition = {
  id: string;
  workspaceId?: string;
  key: string;
  label: string;
  pluralLabel: string;
  enabled: boolean;
  galleryEligible: boolean;
  sortOrder: number;
  system: boolean;
};

export type LocationArea = {
  id: string;
  workspaceId?: string;
  slug: string;
  name: string;
  areaType: string;
  parentId?: string;
  country: string;
  countryCode: string;
  region: string;
  status: "active" | "archived";
  showOnLanding: boolean;
  sortOrder: number;
  heroImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  venueSlugs: string[];
};

export type LocationVenueOption = {
  slug: string;
  name: string;
  town: string;
  county: string;
  country: string;
  status: string;
};

export type LocationConfiguration = {
  settings: LocationGallerySettings;
  types: LocationTypeDefinition[];
  locations: LocationArea[];
  venues: LocationVenueOption[];
};

export type WorkspaceSettings = {
  businessName: string;
  websiteUrl: string;
  adminHostname: string;
  publicHostname: string;
  contactEmail: string;
  phone: string;
  instagram: string;
  logoUrl: string;
  accentColor: string;
  portalBannerUrl: string;
  portalSecondaryColor: string;
  portalBackgroundColor: string;
  portalWelcomeHeading: string;
  portalWelcomeMessage: string;
  portalFooterText: string;
  websiteConnectionPlatform: "none" | "wordpress" | "squarespace" | "html";
  websiteConnectionDomain: string;
  websiteConnectionStatus: "not_configured" | "configured";
  websiteConnectionLastCheckedAt: string;
  websiteConnectionGalleries: boolean;
  websiteConnectionStories: boolean;
  websiteConnectionVenues: boolean;
  websiteConnectionMoments: boolean;
  defaultCountry: string;
  timezone: string;
  currency: string;
};

export type WorkspaceRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
  settings: WorkspaceSettings;
  domains: Array<{ id: string; hostname: string; purpose: string; verified: boolean }>;
};

export type ImageDeleteResult = {
  ok: true;
  deletion: {
    imageId: string;
    weddingSlug: string;
    venueSlug: string;
    filename: string;
    storage: "r2" | "local";
    removedFromVenues: number;
    backups: string[];
    storageWarnings: string[];
    publicVenueData?: {
      generatedAt: string;
      venueCount: number;
      imageCount: number;
      outputPath: string;
      indexPath: string;
    };
  };
};

export type VenuePublishResult = {
  ok: true;
  publish: {
    venueSlug: string;
    venueName: string;
    noChanges: boolean;
    publicImageCount: number;
    publishedAt: string;
  };
};

export type WeddingPublishCheck = {
  id: string;
  label: string;
  detail: string;
  passed: boolean;
  severity: "required" | "recommended";
};

export type WeddingPublishPreview = {
  slug: string;
  wedding: WeddingDocument;
  storyEnabled: boolean;
  storyStatus: "draft" | "published" | "archived";
  action: "publish" | "unpublish";
  readyToPublish: boolean;
  checks: WeddingPublishCheck[];
  requiredPassed: number;
  requiredTotal: number;
  recommendedPassed: number;
  recommendedTotal: number;
  imageCount: number;
  coverImage: {
    id: string;
    filename: string;
    thumbSrc: string;
    fullSrc: string;
    alt: string;
  } | null;
};

export type WeddingPublishResult = {
  ok: true;
  publish: {
    weddingSlug: string;
    weddingTitle: string;
    storyEnabled: boolean;
    storyStatus: "draft" | "published";
    action: "published" | "unpublished";
    branch: string;
    noChanges: boolean;
    commit: string;
    pushed: boolean;
    publicImageCount: number;
    stagedPaths: string[];
    backupPath: string | null;
    publicWeddingData: {
      generatedAt: string;
      weddingCount: number;
      imageCount: number;
      outputPath: string;
      indexPath: string;
      legacyIndexPath: string;
      managedSlugs: string[];
    };
  };
};

export type VenueGalleryMigrationVenuePreview = {
  sourceVenue: string;
  venueSlug: string;
  venueName: string;
  imageCount: number;
  existingImportedCount: number;
  readyCount: number;
  categories: string[];
  tags: string[];
};

export type VenueGalleryMigrationPreview = {
  source: string;
  imageBaseUrl: string;
  totalRows: number;
  aiSource: string;
  aiMatchedRows: number;
  aiAltRows: number;
  aiCaptionRows: number;
  totalSourceVenues: number;
  matchedVenues: number;
  unmatchedVenueCount: number;
  readyRows: number;
  alreadyImportedRows: number;
  categories: Array<{
    name: string;
    slug: string;
    count: number;
  }>;
  tags: Array<{ name: string; count: number }>;
  venues: VenueGalleryMigrationVenuePreview[];
  unmatchedVenues: Array<{
    sourceVenue: string;
    imageCount: number;
    categories: string[];
  }>;
};

export type PublicVenueSyncResult = {
  ok: true;
  publicVenueData: {
    generatedAt: string;
    venueCount: number;
    imageCount: number;
    outputPath: string;
    indexPath: string;
  };
};

export type VenueGalleryMigrationResult = {
  ok: true;
  mode: "refresh" | "merge";
  updatedVenues: number;
  importedImages: number;
  skippedImages: number;
  unmatchedVenues: Array<{
    sourceVenue: string;
    imageCount: number;
    categories: string[];
  }>;
  backups: string[];
};


export class AdminApiService {


  static async getWeddingPublishPreview(
    slug: string,
  ) {
    const result = await request<{
      ok: true;
      preview: WeddingPublishPreview;
    }>(
      `/api/weddings/${encodeURIComponent(
        slug,
      )}/publish`,
    );

    return result.preview;
  }

  static async publishWedding(
    slug: string,
    storyEnabled: boolean,
  ) {
    return request<WeddingPublishResult>(
      `/api/weddings/${encodeURIComponent(
        slug,
      )}/publish`,
      {
        method: "POST",
        body: JSON.stringify({
          storyEnabled,
        }),
      },
    );
  }


  static async publishVenue(slug: string) {
    return request<VenuePublishResult>(
      `/api/venues/${encodeURIComponent(
        slug,
      )}/publish`,
      {
        method: "POST",
      },
    );
  }

  static async deleteWeddingImage({
    weddingSlug,
    imageId,
    venueSlug,
  }: {
    weddingSlug: string;
    imageId: string;
    venueSlug: string;
  }) {
    const query = new URLSearchParams({
      venueSlug,
    });

    return request<ImageDeleteResult>(
      `/api/weddings/${encodeURIComponent(
        weddingSlug,
      )}/images/${encodeURIComponent(
        imageId,
      )}?${query.toString()}`,
      {
        method: "DELETE",
      },
    );
  }


  static async syncPublicVenueData() {
    return request<PublicVenueSyncResult>(
      "/api/venues/public-sync",
      {
        method: "POST",
      },
    );
  }



  static async previewVenueGalleryMigration() {
    const result = await request<{
      ok: true;
      preview: VenueGalleryMigrationPreview;
    }>("/api/migrations/venue-gallery/preview");

    return result.preview;
  }

  static async runVenueGalleryMigration(
    mode: "refresh" | "merge" = "refresh",
  ) {
    return request<VenueGalleryMigrationResult>(
      "/api/migrations/venue-gallery",
      {
        method: "POST",
        body: JSON.stringify({ mode }),
      },
    );
  }


  static async getAssetLibrary(filters: AssetLibraryFilters = {}) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.wedding) params.set("wedding", filters.wedding);
    if (filters.venue) params.set("venue", filters.venue);
    if (filters.moment) params.set("moment", filters.moment);
    if (filters.gallery) params.set("gallery", filters.gallery);
    if (filters.original) params.set("original", filters.original);
    if (filters.unassigned) params.set("unassigned", "1");
    if (typeof filters.limit === "number") params.set("limit", String(filters.limit));
    if (typeof filters.offset === "number") params.set("offset", String(filters.offset));
    const query = params.toString();
    const result = await request<{ ok: true } & AssetLibraryPayload>(
      `/api/assets${query ? `?${query}` : ""}`,
    );
    const { ok: _ok, ...payload } = result;
    return payload;
  }

  static async syncAssetLibrary() {
    return request<{ ok: true; workspaceId: string; totalAssets: number }>(
      "/api/assets/sync",
      { method: "POST" },
    );
  }


  static async getPrintStore() {
    const result = await request<{ ok: true } & PrintStoreAdminPayload>("/api/print-store");
    const { ok: _ok, ...payload } = result;
    return payload;
  }

  static async mutatePrintStore(payload: Record<string, unknown>) {
    const result = await request<{ ok: true } & PrintStoreAdminPayload>("/api/print-store", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const { ok: _ok, ...store } = result;
    return store;
  }

  static async savePrintStoreProduct(product: Partial<PrintStoreProduct>) {
    return this.mutatePrintStore({ action: "saveProduct", product });
  }

  static async savePrintStorePriceList(priceList: Partial<PrintStorePriceList>) {
    return this.mutatePrintStore({ action: "savePriceList", priceList });
  }

  static async updatePrintStoreOrder(orderId: string, input: {
    status: PrintStoreOrderStatus;
    internalNotes?: string;
    paymentReference?: string;
    labConnectorKey?: string;
    labReference?: string;
  }) {
    return this.mutatePrintStore({ action: "updateOrder", orderId, ...input });
  }

  static async verifyProdigiVariantMapping(input: {
    variantId: string;
    sku: string;
    attributes?: Record<string, string>;
    printArea?: string;
    sizing?: string;
  }) {
    return request<{ ok: true; mapping: Record<string, unknown> }>("/api/print-store/prodigi/product", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  static async uploadPreparedPrintAsset(input: {
    orderId: string;
    itemId: string;
    blob: Blob;
    sourceWidthPx: number;
    sourceHeightPx: number;
  }) {
    return request<{ ok: true; printAsset: Record<string, unknown> }>(
      `/api/print-store/orders/${encodeURIComponent(input.orderId)}/items/${encodeURIComponent(input.itemId)}/print-asset`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "image/jpeg",
          "X-Source-Width-Px": String(input.sourceWidthPx || 0),
          "X-Source-Height-Px": String(input.sourceHeightPx || 0),
        },
        body: input.blob,
      },
    );
  }

  static async prodigiLabAction(orderId: string, input: {
    action: "quote" | "submit" | "refresh" | "cancel";
    itemIds?: string[];
    shippingMethod?: string;
  }) {
    return request<Record<string, unknown> & { ok: true }>(
      `/api/print-store/orders/${encodeURIComponent(orderId)}/lab`,
      { method: "POST", body: JSON.stringify(input) },
    );
  }

  static async getClientGalleryStore(id: string) {
    const result = await request<{ ok: true } & ClientGalleryStoreAdminPayload>(
      `/api/client-galleries/${encodeURIComponent(id)}/store`,
    );
    const { ok: _ok, ...payload } = result;
    return payload;
  }

  static async updateClientGalleryStore(id: string, settings: Partial<ClientGalleryStoreSettings>) {
    const result = await request<{ ok: true } & ClientGalleryStoreAdminPayload>(
      `/api/client-galleries/${encodeURIComponent(id)}/store`,
      { method: "POST", body: JSON.stringify(settings) },
    );
    const { ok: _ok, ...payload } = result;
    return payload;
  }


  static async listClientGalleries() {
    const result = await request<{ ok: true } & ClientGalleryListPayload>("/api/client-galleries");
    const { ok: _ok, ...payload } = result;
    return payload;
  }

  static async createClientGallery(gallery: Partial<ClientGalleryRecord> & { title: string; weddingSlug?: string; importWeddingAssets?: boolean }) {
    const result = await request<{ ok: true; gallery: ClientGalleryRecord }>("/api/client-galleries", {
      method: "POST",
      body: JSON.stringify({ gallery }),
    });
    return result.gallery;
  }

  static async getClientGallery(id: string) {
    const result = await request<{ ok: true } & ClientGalleryDetailPayload>(
      `/api/client-galleries/${encodeURIComponent(id)}`,
    );
    const { ok: _ok, ...payload } = result;
    return payload;
  }

  static async updateClientGallery(id: string, gallery: Partial<ClientGalleryRecord> & { pin?: string }) {
    const result = await request<{ ok: true; gallery: ClientGalleryRecord }>(
      `/api/client-galleries/${encodeURIComponent(id)}`,
      { method: "PUT", body: JSON.stringify({ gallery }) },
    );
    return result.gallery;
  }

  static async archiveClientGallery(id: string) {
    const result = await request<{ ok: true; gallery: ClientGalleryRecord }>(
      `/api/client-galleries/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return result.gallery;
  }

  static async mutateClientGalleryAssets(id: string, payload: Record<string, unknown>) {
    const result = await request<{ ok: true; total: number } & ClientGalleryDetailPayload>(
      `/api/client-galleries/${encodeURIComponent(id)}/assets`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    const { ok: _ok, total: _total, ...detail } = result;
    return detail;
  }

  static async mutateClientGalleryContact(id: string, payload: Record<string, unknown>) {
    const result = await request<{ ok: true } & ClientGalleryDetailPayload>(
      `/api/client-galleries/${encodeURIComponent(id)}/contacts`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    const { ok: _ok, ...detail } = result;
    return detail;
  }

  static async mutateClientGalleryAlbums(id: string, payload: Record<string, unknown>) {
    const result = await request<{ ok: true } & ClientGalleryDetailPayload>(
      `/api/client-galleries/${encodeURIComponent(id)}/albums`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    const { ok: _ok, ...detail } = result;
    return detail;
  }

  static async updateClientGalleryBranding(id: string, payload: Record<string, unknown>) {
    const result = await request<{ ok: true; branding: ClientGalleryDetailPayload["branding"] }>(
      `/api/client-galleries/${encodeURIComponent(id)}/branding`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    return result.branding;
  }

  static async uploadClientGalleryBrandingLogo(id: string, file: File) {
    const form = new FormData();
    form.append("logo", file);
    const response = await fetch(`${API_BASE}/api/client-galleries/${encodeURIComponent(id)}/branding-logo`, {
      method: "POST",
      body: form,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((result as ApiErrorPayload).error || `Logo upload failed (${response.status}).`);
    return (result as { branding: ClientGalleryDetailPayload["branding"] }).branding;
  }

  static async mutateClientGallerySelection(id: string, payload: Record<string, unknown>) {
    const result = await request<{ ok: true } & ClientGalleryDetailPayload>(
      `/api/client-galleries/${encodeURIComponent(id)}/selections`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    const { ok: _ok, ...detail } = result;
    return detail;
  }

  static async getClientGalleryFavourites(id: string) {
    const result = await request<{ ok: true } & ClientGalleryFavouritesPayload>(
      `/api/client-galleries/${encodeURIComponent(id)}/favourites`,
    );
    const { ok: _ok, ...payload } = result;
    return payload;
  }

  static clientGalleryOriginalDownloadUrl(id: string, assetId: string) {
    return `${API_BASE}/api/client-galleries/${encodeURIComponent(id)}/assets/${encodeURIComponent(assetId)}/download`;
  }

  static clientGalleryBulkDownloadUrl(
    id: string,
    input: { source?: "favourites" | "selection"; group?: string; selectionId?: string } = {},
  ) {
    const params = new URLSearchParams();
    params.set("source", input.source || "favourites");
    if (input.group) params.set("group", input.group);
    if (input.selectionId) params.set("selectionId", input.selectionId);
    return `${API_BASE}/api/client-galleries/${encodeURIComponent(id)}/downloads?${params.toString()}`;
  }


  static async createPrivateOriginalUpload(
    galleryId: string,
    input: { filename: string; mimeType: string; fileSize: number; width: number; height: number; fingerprint: string; capturedAt?: string; captureSource?: string },
  ) {
    return request<{ ok: true; resumed: boolean; session: PrivateOriginalUploadSession }>(
      `/api/client-galleries/${encodeURIComponent(galleryId)}/uploads`,
      { method: "POST", body: JSON.stringify(input) },
    );
  }

  static async uploadPrivateOriginalPart(
    galleryId: string,
    sessionId: string,
    partNumber: number,
    body: Blob,
  ) {
    const response = await fetch(
      `${API_BASE}/api/client-galleries/${encodeURIComponent(galleryId)}/uploads/${encodeURIComponent(sessionId)}/parts/${partNumber}`,
      { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((payload as ApiErrorPayload).error || `Part ${partNumber} failed (${response.status}).`);
    return payload as { ok: true; partNumber: number; etag: string; uploadedParts: PrivateOriginalUploadedPart[] };
  }

  static async completePrivateOriginalUpload(
    galleryId: string,
    sessionId: string,
    parts: PrivateOriginalUploadedPart[],
  ) {
    return request<{ ok: true; session: PrivateOriginalUploadSession }>(
      `/api/client-galleries/${encodeURIComponent(galleryId)}/uploads/${encodeURIComponent(sessionId)}/complete`,
      { method: "POST", body: JSON.stringify({ parts }) },
    );
  }

  static async uploadPrivateOriginalDerivatives(
    galleryId: string,
    sessionId: string,
    input: { web: Blob; thumb: Blob; width: number; height: number },
  ) {
    const form = new FormData();
    form.set("web", new File([input.web], "display.webp", { type: "image/webp" }));
    form.set("thumb", new File([input.thumb], "thumb.webp", { type: "image/webp" }));
    form.set("width", String(input.width));
    form.set("height", String(input.height));
    const response = await fetch(
      `${API_BASE}/api/client-galleries/${encodeURIComponent(galleryId)}/uploads/${encodeURIComponent(sessionId)}/derivatives`,
      { method: "POST", body: form },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((payload as ApiErrorPayload).error || `Derivative upload failed (${response.status}).`);
    return payload as { ok: true; session: PrivateOriginalUploadSession };
  }

  static async getWeddingWorkspace(slug: string) {
    const result = await request<{ ok: true } & WeddingWorkspacePayload>(
      `/api/wedding-workspace/${encodeURIComponent(slug)}`,
    );
    const { ok: _ok, ...payload } = result;
    return payload;
  }

  static async saveWeddingPreviewSet(slug: string, assetIds: string[]) {
    const result = await request<{ ok: true } & WeddingWorkspacePayload>(
      `/api/wedding-workspace/${encodeURIComponent(slug)}`,
      { method: "POST", body: JSON.stringify({ action: "savePreviewSet", assetIds }) },
    );
    const { ok: _ok, ...payload } = result;
    return payload;
  }

  static async publishWeddingPreviewAssignments(slug: string, input: WeddingPreviewAssignmentInput) {
    return request<{
      ok: true;
      published: number;
      venue: { slug: string; name: string } | null;
      moments: Array<{ id: string; slug: string; name: string }>;
      galleries: Array<{ id: string; slug: string; name: string }>;
    }>(
      `/api/wedding-workspace/${encodeURIComponent(slug)}`,
      { method: "POST", body: JSON.stringify({ action: "publishAssignments", ...input }) },
    );
  }


  static async listVenues() {
    const result = await request<{ ok: true; venues: VenueSummary[] }>("/api/venues");
    return result.venues;
  }

  static async saveVenueListSettings(items: VenueListSetting[]) {
    const result = await request<{ ok: true; venues: VenueSummary[] }>("/api/venue-list-settings", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
    return result.venues;
  }

  static async getVenue(slug: string) {
    const result = await request<{ ok: true; venue: VenueSummary }>(`/api/venues/${encodeURIComponent(slug)}`);
    return result.venue;
  }

  static async createVenue(venue: Partial<VenueDocument>) {
    return request<VenueCreateResult>("/api/venues", {
      method: "POST",
      body: JSON.stringify({ venue }),
    });
  }


  static async discoverVenues(query: string) {
    const result = await request<{ ok: true; provider: "google" | "none"; configured: boolean; results: VenueDiscoveryResult[] }>(
      `/api/venue-discovery?q=${encodeURIComponent(query)}`,
    );
    return result;
  }

  static async updateVenue(routeSlug: string, venue: VenueDocument) {
    return request<VenueUpdateResult>(`/api/venues/${encodeURIComponent(routeSlug)}`, {
      method: "PUT",
      body: JSON.stringify({ venue }),
    });
  }

  static async archiveVenue(slug: string) {
    return request<VenueUpdateResult>(`/api/venues/${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
  }


  static async getMoments() {
    const result = await request<{
      ok: true;
      document: MomentRepositoryDocument;
    }>("/api/moments");

    return result.document;
  }

  static async saveMoments(
    document: MomentRepositoryDocument,
  ) {
    return request<MomentSaveResult>("/api/moments", {
      method: "PUT",
      body: JSON.stringify({ document }),
    });
  }



  static async getMomentGallery(slug: string) {
    const result = await request<{ ok: true } & MomentGalleryPayload>(
      `/api/moments/${encodeURIComponent(slug)}/gallery`,
    );
    return { moment: result.moment, images: result.images };
  }

  static async enableMomentGalleryImages(
    slug: string,
    enabledAssetKeys: string[],
    updates: Array<{
      assetKey: string;
      included: boolean;
      moments: string[];
      display: {
        venue: boolean;
        moments: boolean;
        blog: boolean;
        homepage: boolean;
        portfolio: boolean;
        creativeFlash: boolean;
      };
    }> = [],
  ) {
    return request<{ ok: true; updated: number }>(
      `/api/moments/${encodeURIComponent(slug)}/gallery`,
      {
        method: "PUT",
        body: JSON.stringify({ enabledAssetKeys, updates }),
      },
    );
  }


  static async getLocations() {
    const result = await request<{ ok: true } & LocationConfiguration>("/api/locations");
    return { settings: result.settings, types: result.types, locations: result.locations, venues: result.venues };
  }

  static async saveLocations(configuration: {
    settings?: LocationGallerySettings;
    types?: LocationTypeDefinition[];
    locations?: LocationArea[];
  }) {
    const result = await request<{ ok: true } & LocationConfiguration>("/api/locations", {
      method: "PUT",
      body: JSON.stringify(configuration),
    });
    return { settings: result.settings, types: result.types, locations: result.locations, venues: result.venues };
  }

  static async getGalleryMasterHeroes() {
    return request<{ ok: true; settings: { venueHeroImageId: string; momentsHeroImageId: string; landingHeroImageId: string } }>("/api/gallery-master-heroes");
  }

  static async getGalleryLandingSettings() {
    const result = await request<{ ok: true; settings: GalleryLandingSettings }>(
      "/api/gallery-landing-settings",
    );
    return result.settings;
  }

  static async saveGalleryLandingSettings(settings: GalleryLandingSettings) {
    const result = await request<{ ok: true; settings: GalleryLandingSettings }>(
      "/api/gallery-landing-settings",
      { method: "PUT", body: JSON.stringify(settings) },
    );
    return result.settings;
  }

  static async setGalleryMasterHero(kind: "venue" | "moments" | "landing", assetKey: string) {
    const body = kind === "venue"
      ? { venueHeroImageId: assetKey }
      : kind === "moments"
        ? { momentsHeroImageId: assetKey }
        : { landingHeroImageId: assetKey };
    return request<{ ok: true; settings: { venueHeroImageId: string; momentsHeroImageId: string; landingHeroImageId: string } }>("/api/gallery-master-heroes", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }


  static async listCustomCollections() {
    const result = await request<{ ok: true; collections: CustomCollection[] }>(
      "/api/custom-collections",
    );
    return result.collections;
  }

  static async createCustomCollection(
    collection: Partial<CustomCollection> & { name: string },
  ) {
    const result = await request<{ ok: true; collection: CustomCollection }>(
      "/api/custom-collections/create",
      { method: "POST", body: JSON.stringify({ collection }) },
    );
    return result.collection;
  }

  static async updateCustomCollection(
    routeSlug: string,
    collection: Partial<CustomCollection>,
  ) {
    const result = await request<{ ok: true; collection: CustomCollection }>(
      `/api/custom-collections/${encodeURIComponent(routeSlug)}`,
      { method: "PUT", body: JSON.stringify({ collection }) },
    );
    return result.collection;
  }

  static async archiveCustomCollection(slug: string) {
    return request<{ ok: true; slug: string; status: "archived" }>(
      `/api/custom-collections/${encodeURIComponent(slug)}`,
      { method: "DELETE" },
    );
  }

  static async getCustomCollectionGallery(slug: string) {
    return request<{ ok: true } & CustomCollectionGalleryPayload>(
      `/api/custom-collections/${encodeURIComponent(slug)}/gallery`,
    );
  }

  static async getCustomCollectionMemberships() {
    const result = await request<{ ok: true } & CustomCollectionMembershipPayload>(
      "/api/custom-collections/memberships",
    );
    return { collections: result.collections, memberships: result.memberships };
  }

  static async saveCustomCollectionMemberships(
    updates: Array<{ assetKey: string; collectionIds: string[] }>,
  ) {
    return request<{ ok: true; updated: number }>(
      "/api/custom-collections/memberships",
      { method: "PUT", body: JSON.stringify({ updates }) },
    );
  }

  static async saveCustomCollectionGallery(
    slug: string,
    payload: {
      heroAssetKey: string;
      items: Array<{ assetKey: string; sortOrder: number; hidden: boolean }>;
    },
  ) {
    return request<{ ok: true; savedImages: number; heroAssetKey: string }>(
      `/api/custom-collections/${encodeURIComponent(slug)}/gallery`,
      { method: "PUT", body: JSON.stringify(payload) },
    );
  }

  static async getCreativeFlashGallery() {
    return request<{ ok: true } & import("../types/moment").CreativeFlashGalleryPayload>(
      "/api/creative-flash/gallery",
    );
  }

  static async saveCreativeFlashGallery(payload: {
    settings: import("../types/moment").CreativeFlashGallerySettings;
    updates: Array<{
      assetKey: string;
      included: boolean;
      moments: string[];
      display: import("../types/moment").MomentGalleryDisplay;
    }>;
  }) {
    return request<{ ok: true; updated: number; settings: import("../types/moment").CreativeFlashGallerySettings }>(
      "/api/creative-flash/gallery",
      { method: "PUT", body: JSON.stringify(payload) },
    );
  }

  static async uploadVenueImage({
    venueSlug,
    weddingSlug,
    file,
    onProgress,
  }: {
    venueSlug: string;
    weddingSlug: string;
    file: File;
    onProgress?: (progress: number) => void;
  }) {
    const params = new URLSearchParams({
      venueSlug,
      weddingSlug,
    });

    // Preserve the existing local development pipeline. Production admin uses
    // the protected same-origin Pages Function and direct R2 binding below.
    if (import.meta.env.DEV) {
      const legacyParams = new URLSearchParams({
        venueSlug,
        weddingSlug,
        filename: file.name,
        mimeType: file.type,
      });

      onProgress?.(20);
      const response = await fetch(
        `${API_BASE}/api/uploads/image?${legacyParams.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorPayload = payload as ApiErrorPayload;
        throw new Error(
          errorPayload.error || `Upload failed (${response.status}).`,
        );
      }
      onProgress?.(100);
      return payload as {
        ok: true;
        imageId: string;
        filename: string;
        weddingSlug: string;
        venueSlug: string;
      };
    }

    const prepared = await prepareImageUpload(file, onProgress);
    const form = new FormData();
    form.append(
      "full",
      prepared.full,
      `${file.name.replace(/\.[^.]+$/, "") || "image"}-full.webp`,
    );
    form.append(
      "thumb",
      prepared.thumb,
      `${file.name.replace(/\.[^.]+$/, "") || "image"}-thumb.webp`,
    );
    form.append("originalFilename", file.name);
    form.append("originalMimeType", file.type || "application/octet-stream");
    form.append("width", String(prepared.width));
    form.append("height", String(prepared.height));

    onProgress?.(70);
    const response = await fetch(
      `${API_BASE}/api/uploads/image?${params.toString()}`,
      {
        method: "POST",
        body: form,
      },
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorPayload = payload as ApiErrorPayload;
      const detailText = errorPayload.details?.length
        ? ` ${errorPayload.details.join(" ")}`
        : "";
      throw new Error(
        `${errorPayload.error || `Upload failed (${response.status}).`}${detailText}`,
      );
    }

    onProgress?.(100);
    return payload as {
      ok: true;
      imageId: string;
      filename: string;
      weddingSlug: string;
      venueSlug: string;
      storage: "r2";
      fullSrc: string;
      thumbSrc: string;
    };
  }



  static async getProfessionalSession() {
    const result = await request<{ ok: true; auth: ProfessionalAuthState }>("/api/platform-auth/session");
    return result.auth;
  }

  static async requestProfessionalSignIn(email: string, returnPath = "/admin") {
    return request<{ ok: true; message: string; debugUrl?: string }>("/api/platform-auth/request-link", {
      method: "POST",
      body: JSON.stringify({ email, returnPath }),
    });
  }

  static async signOutProfessional() {
    return request<{ ok: true }>("/api/platform-auth/sign-out", { method: "POST", body: "{}" });
  }

  static async switchProfessionalWorkspace(workspaceId: string) {
    const result = await request<{ ok: true; auth: ProfessionalAuthState }>("/api/platform-auth/switch-workspace", {
      method: "POST",
      body: JSON.stringify({ workspaceId }),
    });
    return result.auth;
  }

  static async getWedPlannedPlatform() {
    const result = await request<{ ok: true; platform: WedPlannedPlatformPayload; auth: ProfessionalAuthState }>("/api/platform");
    return result.platform;
  }

  static async mutateWedPlannedPlatform(payload: Record<string, unknown>) {
    const result = await request<{ ok: true; platform: WedPlannedPlatformPayload; auth: ProfessionalAuthState; invitation?: ProfessionalInvitationResult }>("/api/platform", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return result;
  }

  static async saveWedPlannedBusiness(business: WedPlannedBusiness) {
    return (await this.mutateWedPlannedPlatform({ action: "saveBusiness", business })).platform;
  }

  static async saveWedPlannedOnboarding(
    operation: "confirm" | "defer-step" | "pause" | "resume" | "complete",
    step = "",
  ) {
    return (
      await this.mutateWedPlannedPlatform({
        action: "saveOnboarding",
        operation,
        step,
      })
    ).platform;
  }

  static async saveWedPlannedCategories(categoryKeys: string[], primaryCategoryKey: string) {
    return (await this.mutateWedPlannedPlatform({ action: "saveCategories", categoryKeys, primaryCategoryKey })).platform;
  }

  static async getWedPlannedPublicAppearance() {
    const result = await request<{
      ok: true;
      appearance: WedPlannedPublicAppearanceAdministration;
    }>("/api/platform-public-appearance");

    return result.appearance;
  }

  static async mutateWedPlannedPublicAppearance(
    payload: Record<string, unknown>,
  ) {
    const result = await request<{
      ok: true;
      appearance: WedPlannedPublicAppearanceAdministration;
    }>("/api/platform-public-appearance", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return result.appearance;
  }

  static async saveWedPlannedPublicAppearanceDraft(
    theme: WedPlannedPublicTheme,
  ) {
    return this.mutateWedPlannedPublicAppearance({
      action: "saveDraft",
      theme,
    });
  }

  static async publishWedPlannedPublicAppearance() {
    return this.mutateWedPlannedPublicAppearance({
      action: "publish",
    });
  }

  static async restoreWedPlannedPublicAppearanceVersionToDraft(
    version: number,
  ) {
    return this.mutateWedPlannedPublicAppearance({
      action: "restoreVersionToDraft",
      version,
    });
  }

  static async getPlatformAdministration() {
    const result = await request<{ ok: true; platformAdmin: PlatformAdministrationPayload }>("/api/platform-admin");
    return result.platformAdmin;
  }

  static async mutatePlatformAdministration(payload: Record<string, unknown>) {
    const result = await request<{ ok: true; platformAdmin: PlatformAdministrationPayload }>("/api/platform-admin", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return result.platformAdmin;
  }

  static async provisionBusinessWorkspace(input: {
    businessName: string;
    slug: string;
    ownerEmail: string;
    ownerDisplayName: string;
    defaultCountry: string;
    timezone: string;
    currency: string;
  }) {
    return this.mutatePlatformAdministration({
      action: "provisionBusinessWorkspace",
      ...input,
    });
  }

  static async savePlatformSupplierTaxonomy(taxonomy: PlatformSupplierTaxonomy) {
    return this.mutatePlatformAdministration({ action: "saveSupplierTaxonomy", ...taxonomy });
  }

  static async savePlatformModuleConfiguration(module: PlatformModuleConfiguration) {
    return this.mutatePlatformAdministration({
      action: "saveModuleConfiguration",
      module,
    });
  }

  static async savePlatformBrandingAndModules(
    modules: PlatformModuleConfiguration[],
    platformIdentity: PlatformBrandingIdentity,
  ) {
    return this.mutatePlatformAdministration({
      action: "saveBrandingAndModules",
      modules,
      platformIdentity,
    });
  }

  static async uploadPlatformBrandAsset(name: string, assetType: PlatformBrandAsset["assetType"], file: File) {
    const form = new FormData();
    form.set("name", name);
    form.set("assetType", assetType);
    form.set("file", file);
    const response = await fetch(`${API_BASE}/api/platform-assets`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((result as ApiErrorPayload).error || `Platform asset upload failed (${response.status}).`);
    return (result as { ok: true; platformAdmin: PlatformAdministrationPayload }).platformAdmin;
  }

  static async deletePlatformBrandAsset(assetId: string) {
    const result = await request<{ ok: true; platformAdmin: PlatformAdministrationPayload }>(
      `/api/platform-assets?id=${encodeURIComponent(assetId)}`,
      { method: "DELETE" },
    );
    return result.platformAdmin;
  }

  static async saveWedPlannedServiceArea(serviceArea: Partial<WedPlannedServiceArea>) {
    return (await this.mutateWedPlannedPlatform({ action: "saveServiceArea", serviceArea })).platform;
  }

  static async archiveWedPlannedServiceArea(id: string) {
    return (await this.mutateWedPlannedPlatform({ action: "archiveServiceArea", id })).platform;
  }

  static async inviteWedPlannedMember(member: Partial<WedPlannedMember> & { email: string }) {
    return this.mutateWedPlannedPlatform({ action: "inviteMember", member });
  }

  static async updateWedPlannedMember(member: Partial<WedPlannedMember> & { id: string }) {
    return (await this.mutateWedPlannedPlatform({ action: "updateMember", member })).platform;
  }

  static async getWedPlannedOperations(workspaceId = "") {
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
    return request<WedPlannedOperationsPayload>(`/api/platform-operations${query}`);
  }

  static async mutateWedPlannedOperations(payload: Record<string, unknown>, workspaceId = "") {
    const result = await request<{ ok: true; operations: WedPlannedOperationsPayload }>("/api/platform-operations", {
      method: "POST",
      body: JSON.stringify({ ...payload, ...(workspaceId ? { workspaceId } : {}) }),
    });
    return result.operations;
  }

  static async grantWedPlannedSupport(scope: "read" | "manage", hours: number, reason: string, workspaceId = "") {
    return this.mutateWedPlannedOperations({ action: "grant-support", scope, hours, reason }, workspaceId);
  }

  static async revokeWedPlannedSupport(grantId: string, workspaceId = "") {
    return this.mutateWedPlannedOperations({ action: "revoke-support", grantId }, workspaceId);
  }

  static async requestWedPlannedDeletion(confirmationName: string, reason: string, workspaceId = "") {
    return this.mutateWedPlannedOperations({ action: "request-deletion", confirmationName, reason }, workspaceId);
  }

  static async cancelWedPlannedDeletion(requestId: string, workspaceId = "") {
    return this.mutateWedPlannedOperations({ action: "cancel-deletion", requestId }, workspaceId);
  }

  static wedPlannedExportUrl(workspaceId = "") {
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
    return `${API_BASE}/api/platform-operations/export${query}`;
  }

  static async getCrmOverview() {
    const result = await request<{ ok: true; crm: CrmOverview }>("/api/crm");
    return result.crm;
  }

  static async getCrmEnquiry(id: string) {
    const result = await request<{ ok: true; detail: CrmEnquiryDetail }>(`/api/crm/enquiries/${encodeURIComponent(id)}`);
    return result.detail;
  }

  static async getCrmEnquiryDeletePreflight(
    id: string,
  ) {
    const result = await request<{
      ok: true;
      preflight:
        CrmDeletePreflight;
    }>(
      `/api/crm/enquiries/${
        encodeURIComponent(id)
      }/delete-preflight`,
    );

    return result.preflight;
  }


  static async deleteCrmEnquiryPermanently(
    id: string,
    confirmation: string,
  ) {
    const result = await request<{
      ok: true;
      receipt:
        CrmLeadDeleteReceipt;
    }>(
      `/api/crm/enquiries/${
        encodeURIComponent(id)
      }`,
      {
        method: "DELETE",
        body: JSON.stringify({
          confirmation,
        }),
      },
    );

    return result.receipt;
  }


  static async getCrmContact(id: string) {
    const result = await request<{ ok: true; detail: CrmContactDetail }>(`/api/crm/contacts/${encodeURIComponent(id)}`);
    return result.detail;
  }

  static async updateCrmContact(id: string, input: Record<string, unknown>) {
    const result = await request<{ ok: true; detail: CrmContactDetail }>(`/api/crm/contacts/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return result.detail;
  }

  static async createCrmEnquiry(input: CrmEnquiryInput) {
    const result = await request<{ ok: true; detail: CrmEnquiryDetail }>("/api/crm/enquiries", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return result.detail;
  }

  static async updateCrmEnquiry(id: string, input: CrmEnquiryInput) {
    const result = await request<{ ok: true; detail: CrmEnquiryDetail }>(`/api/crm/enquiries/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return result.detail;
  }

  static async moveCrmEnquiry(id: string, stageId: string) {
    const result = await request<{ ok: true; detail: CrmEnquiryDetail }>(`/api/crm/enquiries/${encodeURIComponent(id)}/stage`, {
      method: "POST",
      body: JSON.stringify({ stageId }),
    });
    return result.detail;
  }

  static async markCrmEnquiryLost(id: string, reason: string) {
    const result = await request<{ ok: true; detail: CrmEnquiryDetail }>(`/api/crm/enquiries/${encodeURIComponent(id)}/lost`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    return result.detail;
  }

  static async acceptCrmEnquiry(id: string, input: { valueAmount?: number | null; weddingSlug?: string } = {}) {
    const result = await request<{ ok: true; conversion: { enquiry: unknown; job: unknown; idempotent: boolean } }>(`/api/crm/enquiries/${encodeURIComponent(id)}/accept`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return result.conversion;
  }

  static async saveCrmLeadForm(settings: CrmLeadFormSettings) {
    const result = await request<{ ok: true; crm: CrmOverview }>("/api/crm/lead-form", {
      method: "POST",
      body: JSON.stringify(settings),
    });
    return result.crm;
  }

  static async recordCrmInvoicePayment(
    jobId: string,
    invoiceId: string,
    input: {
      paymentType:
        | "payment"
        | "refund";
      amount: number;
      method:
        | "manual"
        | "bank_transfer"
        | "cash"
        | "card"
        | "other";
      reference?: string;
      notes?: string;
      paidAt?: string;
    },
  ) {
    return request<{
      ok: true;
      payment: {
        id: string;
        invoiceId: string;
        scheduleItemId: string;
        paymentType:
          | "payment"
          | "refund";
        amount: number;
        currency: string;
        method: string;
        reference: string;
        notes: string;
        paidAt: string;
        netPaidBefore: number;
        netPaidAfter: number;
        balanceAfter: number;
        invoiceStatusAfter: string;
      };
      workspace: CrmJobWorkspace;
    }>(
      `/api/crm/jobs/${encodeURIComponent(
        jobId,
      )}/invoices/${encodeURIComponent(
        invoiceId,
      )}/payments`,
      {
        method: "POST",
        body: JSON.stringify(
          input,
        ),
      },
    );
  }

  static async repairCrmBookingPack(
    jobId: string,
  ) {
    const result = await request<{
      ok: true;
      workspace: CrmJobWorkspace;
    }>(
      `/api/crm/jobs/${
        encodeURIComponent(jobId)
      }/booking-pack`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    return result.workspace;
  }

  static async sendCrmContractToPortal(
    jobId: string,
    contractId: string,
  ) {
    const result = await request<{
      ok: true;
      workspace: CrmJobWorkspace;
    }>(
      `/api/crm/jobs/${
        encodeURIComponent(jobId)
      }/contracts/${
        encodeURIComponent(contractId)
      }/send`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    return result.workspace;
  }


  static async updateCrmJobWeddingDetails(
    id: string,
    input: {
      title?: string;
      eventDate?: string;
      venueText?: string;
      leadSource?: string;
    },
  ) {
    const result = await request<{
      ok: true;
      workspace: CrmJobWorkspace;
    }>(
      `/api/crm/jobs/${
        encodeURIComponent(id)
      }`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );

    return result.workspace;
  }


  static async getCrmJobWorkspace(id: string) {
    const result = await request<{ ok: true; workspace: CrmJobWorkspace }>(`/api/crm/jobs/${encodeURIComponent(id)}`);
    return result.workspace;
  }

  static jobFileUrl(
    jobId: string,
    fileId: string,
  ) {
    return `${API_BASE}/api/crm/job-files/${encodeURIComponent(fileId)}?jobId=${encodeURIComponent(jobId)}`;
  }

  static async uploadCrmJobFile(
    jobId: string,
    file: File,
  ) {
    const form =
      new FormData();

    form.set(
      "file",
      file,
    );

    return request<{
      ok: true;
      file:
        CrmJobWorkspace["files"][number];
      workspace:
        CrmJobWorkspace;
    }>(
      `/api/crm/jobs/${encodeURIComponent(jobId)}/files`,
      {
        method: "POST",
        body: form,
      },
    );
  }

  static async deleteCrmJobFile(
    jobId: string,
    fileId: string,
  ) {
    return request<{
      ok: true;
      workspace:
        CrmJobWorkspace;
    }>(
      `/api/crm/job-files/${encodeURIComponent(fileId)}?jobId=${encodeURIComponent(jobId)}`,
      {
        method: "DELETE",
      },
    );
  }

  static async createCrmJobClientGallery(id: string) {
    return request<{ ok: true; gallery: ClientGalleryRecord; idempotent: boolean; workspace: CrmJobWorkspace }>(
      `/api/crm/jobs/${encodeURIComponent(id)}/client-gallery`,
      { method: "POST", body: JSON.stringify({}) },
    );
  }

  static async getCrmQuoteOverview() {
    const result = await request<{ ok: true; quotes: CrmQuoteOverview }>("/api/crm/quotes");
    return result.quotes;
  }

  static async getCrmQuoteCatalogue() {
    const result = await request<{ ok: true; catalogue: { packages: CrmPackage[]; addons: CrmAddon[] } }>("/api/crm/catalogue");
    return result.catalogue;
  }

  static async saveCrmPackage(id: string | undefined, input: Partial<CrmPackage>) {
    const path = id ? `/api/crm/catalogue/packages/${encodeURIComponent(id)}` : "/api/crm/catalogue/packages";
    const result = await request<{ ok: true; package: CrmPackage }>(path, { method: id ? "PUT" : "POST", body: JSON.stringify(input) });
    return result.package;
  }

  static async saveCrmAddon(id: string | undefined, input: Partial<CrmAddon>) {
    const path = id ? `/api/crm/catalogue/addons/${encodeURIComponent(id)}` : "/api/crm/catalogue/addons";
    const result = await request<{ ok: true; addon: CrmAddon }>(path, { method: id ? "PUT" : "POST", body: JSON.stringify(input) });
    return result.addon;
  }

  static async getCrmQuoteTemplates() {
    const result = await request<{
      ok: true;
      templates: CrmQuoteTemplate[];
    }>("/api/crm/templates/quotes");

    return result.templates;
  }

  static async getCrmQuoteTemplate(id: string) {
    const result = await request<{
      ok: true;
      template: CrmQuoteTemplate;
    }>(
      `/api/crm/templates/quotes/${encodeURIComponent(id)}`,
    );

    return result.template;
  }

  static async createCrmQuoteTemplate(
    input: CrmQuoteTemplateInput,
  ) {
    const result = await request<{
      ok: true;
      template: CrmQuoteTemplate;
    }>("/api/crm/templates/quotes", {
      method: "POST",
      body: JSON.stringify(input),
    });

    return result.template;
  }

  static async saveCrmQuoteTemplate(
    id: string,
    input: CrmQuoteTemplateInput,
  ) {
    const result = await request<{
      ok: true;
      template: CrmQuoteTemplate;
    }>(
      `/api/crm/templates/quotes/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );

    return result.template;
  }

  static async archiveCrmQuoteTemplate(
    id: string,
  ) {
    const result = await request<{
      ok: true;
      template: CrmQuoteTemplate;
    }>(
      `/api/crm/templates/quotes/${encodeURIComponent(id)}/archive`,
      {
        method: "POST",
        body: "{}",
      },
    );

    return result.template;
  }

  static async getCrmEmailSettings() {
    const result = await request<{
      ok: true;
      email: CrmEmailSettings;
    }>("/api/crm/email/settings");

    return result.email;
  }

  static async saveCrmEmailSettings(
    input: CrmEmailSettingsInput,
  ) {
    const result = await request<{
      ok: true;
      email: CrmEmailSettings;
    }>("/api/crm/email/settings", {
      method: "POST",
      body: JSON.stringify(input),
    });

    return result.email;
  }

  static async startCrmGoogleEmailConnection() {
    const result =
      await request<{
        ok: true;
        connection: {
          authorizationUrl: string;
          redirectUri: string;
        };
      }>(
        "/api/crm/email/providers/google/connect",
        {
          method: "POST",
          body: "{}",
        },
      );

    return result.connection;
  }

  static async disconnectCrmEmailProvider(
    provider: "google" | "smtp",
  ) {
    const result = await request<{
      ok: true;
      email: CrmEmailSettings;
    }>(
      `/api/crm/email/providers/${encodeURIComponent(provider)}/disconnect`,
      {
        method: "POST",
        body: "{}",
      },
    );

    return result.email;
  }

  static async getCrmEmailTemplates() {
    const result = await request<{
      ok: true;
      templates: CrmEmailTemplate[];
    }>("/api/crm/templates/emails");

    return result.templates;
  }

  static async getCrmEmailTemplate(id: string) {
    const result = await request<{
      ok: true;
      template: CrmEmailTemplate;
    }>(
      `/api/crm/templates/emails/${encodeURIComponent(id)}`,
    );

    return result.template;
  }

  static async createCrmEmailTemplate(
    input: CrmEmailTemplateInput,
  ) {
    const result = await request<{
      ok: true;
      template: CrmEmailTemplate;
    }>("/api/crm/templates/emails", {
      method: "POST",
      body: JSON.stringify(input),
    });

    return result.template;
  }

  static async saveCrmEmailTemplate(
    id: string,
    input: CrmEmailTemplateInput,
  ) {
    const result = await request<{
      ok: true;
      template: CrmEmailTemplate;
    }>(
      `/api/crm/templates/emails/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );

    return result.template;
  }

  static async archiveCrmEmailTemplate(
    id: string,
  ) {
    const result = await request<{
      ok: true;
      template: CrmEmailTemplate;
    }>(
      `/api/crm/templates/emails/${encodeURIComponent(id)}/archive`,
      {
        method: "POST",
        body: "{}",
      },
    );

    return result.template;
  }

  static async createCrmQuote(
    enquiryId: string,
    templateId = "",
    quoteType:
      CrmQuote["quoteType"] =
      "pick_and_choose",
  ) {
    const result =
      await request<{
        ok: true;
        quote: CrmQuote;
      }>(
        "/api/crm/quotes",
        {
          method: "POST",
          body: JSON.stringify({
            enquiryId,
            quoteType,
            ...(templateId ? { templateId } : {}),
          }),
        },
      );

    return result.quote;
  }

  static async getCrmQuote(id: string) {
    const result = await request<{ ok: true; quote: CrmQuote }>(`/api/crm/quotes/${encodeURIComponent(id)}`);
    return result.quote;
  }

  static async saveCrmQuote(id: string, input: Record<string, unknown>) {
    const result = await request<{ ok: true; quote: CrmQuote }>(`/api/crm/quotes/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
    return result.quote;
  }

  static async reviseCrmQuote(id: string) {
    const result = await request<{ ok: true; quote: CrmQuote }>(`/api/crm/quotes/${encodeURIComponent(id)}/revise`, { method: "POST", body: "{}" });
    return result.quote;
  }

  static async getCrmQuoteSendPreview(
    id: string,
    templateId = "",
  ) {
    const query =
      templateId
        ? `?templateId=${encodeURIComponent(templateId)}`
        : "";

    const result =
      await request<{
        ok: true;
        preview:
          CrmQuoteSendPreview;
      }>(
        `/api/crm/quotes/${encodeURIComponent(id)}/send-preview${query}`,
      );

    return result.preview;
  }

  static async sendCrmQuote(
    id: string,
    input?: CrmQuoteSendInput,
  ) {
    const result =
      await request<{
        ok: true;
        quote: CrmQuote;
      }>(
        `/api/crm/quotes/${encodeURIComponent(id)}/send`,
        {
          method: "POST",
          body: JSON.stringify(
            input || {},
          ),
        },
      );

    return result.quote;
  }

  static async acceptCrmQuote(id: string, input: { optionId: string; addons?: Array<{ id: string; quantity: number }>; confirmed: true }) {
    const result = await request<{ ok: true; conversion: { jobId: string; jobReference: string; idempotent: boolean } }>(`/api/crm/quotes/${encodeURIComponent(id)}/accept`, { method: "POST", body: JSON.stringify(input) });
    return result.conversion;
  }

  static async getQuestionnaireOverview() {
    const result = await request<{ ok: true; questionnaires: QuestionnaireOverview }>("/api/crm/questionnaires");
    return result.questionnaires;
  }

  static async getCrmCommercialSettings() {
    const result = await request<{
      ok: true;
      commercial:
        CrmCommercialSettingsPayload;
    }>(
      "/api/crm/commercial/settings",
    );

    return result.commercial;
  }

  static async saveCrmCommercialSettings(
    input: CrmCommercialSettingsInput,
  ) {
    const result = await request<{
      ok: true;
      commercial:
        CrmCommercialSettingsPayload;
    }>(
      "/api/crm/commercial/settings",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );

    return result.commercial;
  }

  static async listCrmContractTemplates() {
    const result = await request<{
      ok: true;
      templates:
        CrmContractTemplate[];
    }>(
      "/api/crm/contracts/templates",
    );

    return result.templates;
  }

  static async getCrmContractTemplate(
    id: string,
  ) {
    const result = await request<{
      ok: true;
      template:
        CrmContractTemplate;
    }>(
      `/api/crm/contracts/templates/${encodeURIComponent(id)}`,
    );

    return result.template;
  }

  static async createCrmContractTemplate(
    input:
      Partial<CrmContractTemplate>,
  ) {
    const result = await request<{
      ok: true;
      template:
        CrmContractTemplate;
    }>(
      "/api/crm/contracts/templates",
      {
        method: "POST",
        body:
          JSON.stringify(input),
      },
    );

    return result.template;
  }

  static async saveCrmContractTemplate(
    id: string,
    input:
      Partial<CrmContractTemplate>,
  ) {
    const result = await request<{
      ok: true;
      template:
        CrmContractTemplate;
    }>(
      `/api/crm/contracts/templates/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body:
          JSON.stringify(input),
      },
    );

    return result.template;
  }

  static async archiveCrmContractTemplate(
    id: string,
  ) {
    const result = await request<{
      ok: true;
      template:
        CrmContractTemplate;
    }>(
      `/api/crm/contracts/templates/${encodeURIComponent(id)}/archive`,
      {
        method: "POST",
        body:
          JSON.stringify({}),
      },
    );

    return result.template;
  }

  static async getCrmPaymentSchedulePresets(
    includeArchived = false,
  ) {
    const query =
      includeArchived
        ? "?includeArchived=1"
        : "";

    const result =
      await request<{
        ok: true;
        paymentSchedules:
          CrmPaymentSchedulePreset[];
      }>(
        `/api/crm/commercial/payment-schedules${query}`,
      );

    return result.paymentSchedules;
  }

  static async createCrmPaymentSchedulePreset(
    input: CrmPaymentSchedulePresetInput,
  ) {
    const result =
      await request<{
        ok: true;
        paymentSchedule:
          CrmPaymentSchedulePreset;
      }>(
        "/api/crm/commercial/payment-schedules",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );

    return result.paymentSchedule;
  }

  static async saveCrmPaymentSchedulePreset(
    id: string,
    input: CrmPaymentSchedulePresetInput,
  ) {
    const result =
      await request<{
        ok: true;
        paymentSchedule:
          CrmPaymentSchedulePreset;
      }>(
        `/api/crm/commercial/payment-schedules/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: JSON.stringify(input),
        },
      );

    return result.paymentSchedule;
  }

  static async archiveCrmPaymentSchedulePreset(
    id: string,
  ) {
    const result =
      await request<{
        ok: true;
        paymentSchedule:
          CrmPaymentSchedulePreset;
      }>(
        `/api/crm/commercial/payment-schedules/${encodeURIComponent(id)}/archive`,
        {
          method: "POST",
          body: "{}",
        },
      );

    return result.paymentSchedule;
  }

  static async getQuestionnaireTemplate(id: string) {
    const result = await request<{ ok: true; template: QuestionnaireTemplate }>(`/api/crm/questionnaires/templates/${encodeURIComponent(id)}`);
    return result.template;
  }

  static async createQuestionnaireTemplate(input: Partial<QuestionnaireTemplate>) {
    const result = await request<{ ok: true; template: QuestionnaireTemplate }>("/api/crm/questionnaires/templates", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return result.template;
  }

  static async saveQuestionnaireTemplate(id: string, input: Partial<QuestionnaireTemplate>) {
    const result = await request<{ ok: true; template: QuestionnaireTemplate }>(`/api/crm/questionnaires/templates/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return result.template;
  }

  static async archiveQuestionnaireTemplate(id: string) {
    const result = await request<{ ok: true; template: QuestionnaireTemplate }>(`/api/crm/questionnaires/templates/${encodeURIComponent(id)}/archive`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    return result.template;
  }

  static async assignQuestionnaire(jobId: string, input: { templateId: string; contactId?: string; title?: string; introduction?: string; dueAt?: string }) {
    const result = await request<{ ok: true; questionnaire: QuestionnaireInstance }>(`/api/crm/jobs/${encodeURIComponent(jobId)}/questionnaires`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return result.questionnaire;
  }

  static async saveQuestionnaireInstance(
    instanceId: string,
    input: {
      responses:
        Record<string, unknown>;
      complete?: boolean;
    },
  ) {
    const result =
      await request<{
        ok: true;
        questionnaire:
          QuestionnaireInstance;
      }>(
        `/api/crm/questionnaires/instances/${encodeURIComponent(instanceId)}`,
        {
          method: "PUT",
          body:
            JSON.stringify(input),
        },
      );

    return result.questionnaire;
  }

  static async inviteCrmClient(jobId: string, contactId: string) {
    const result = await request<{ ok: true; invitation: { ok: true; message: string; expiresAt: string } }>(`/api/crm/jobs/${encodeURIComponent(jobId)}/invite`, {
      method: "POST",
      body: JSON.stringify({ contactId }),
    });
    return result.invitation;
  }

  static async revokeCrmClientAccess(jobId: string, identityId: string) {
    const result = await request<{ ok: true; workspace: CrmJobWorkspace }>(`/api/crm/jobs/${encodeURIComponent(jobId)}/revoke`, {
      method: "POST",
      body: JSON.stringify({ identityId }),
    });
    return result.workspace;
  }

  static async approveCrmSupplierSubmission(jobId: string, submissionId: string, input: Record<string, unknown>) {
    const result = await request<{ ok: true; workspace: CrmJobWorkspace }>(`/api/crm/jobs/${encodeURIComponent(jobId)}/supplier-submissions/${encodeURIComponent(submissionId)}/approve`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return result.workspace;
  }

  static async rejectCrmSupplierSubmission(jobId: string, submissionId: string, reviewNotes = "") {
    const result = await request<{ ok: true; workspace: CrmJobWorkspace }>(`/api/crm/jobs/${encodeURIComponent(jobId)}/supplier-submissions/${encodeURIComponent(submissionId)}/reject`, {
      method: "POST",
      body: JSON.stringify({ reviewNotes }),
    });
    return result.workspace;
  }

  static async getCrmWorkflowOverview() {
    const result = await request<{ ok: true; workflows: CrmWorkflowOverview }>("/api/crm/workflows");
    return result.workflows;
  }

  static async getCrmWorkflowTemplate(id: string) {
    const result = await request<{ ok: true; template: CrmWorkflowTemplate }>(`/api/crm/workflows/templates/${encodeURIComponent(id)}`);
    return result.template;
  }

  static async createCrmWorkflowTemplate(input: Partial<CrmWorkflowTemplate>) {
    const result = await request<{ ok: true; template: CrmWorkflowTemplate }>("/api/crm/workflows/templates", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return result.template;
  }

  static async saveCrmWorkflowTemplate(id: string, input: Partial<CrmWorkflowTemplate>) {
    const result = await request<{ ok: true; template: CrmWorkflowTemplate }>(`/api/crm/workflows/templates/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return result.template;
  }

  static async archiveCrmWorkflowTemplate(id: string) {
    const result = await request<{ ok: true; template: CrmWorkflowTemplate }>(`/api/crm/workflows/templates/${encodeURIComponent(id)}/archive`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    return result.template;
  }

  static async applyCrmWorkflow(jobId: string, templateId: string) {
    const result = await request<{ ok: true; workspace: CrmJobWorkspace }>(`/api/crm/jobs/${encodeURIComponent(jobId)}/workflow`, {
      method: "POST",
      body: JSON.stringify({ templateId }),
    });
    return result.workspace;
  }

  static async createCrmJobTask(jobId: string, input: Record<string, unknown>) {
    const result = await request<{ ok: true; workspace: CrmJobWorkspace }>(`/api/crm/jobs/${encodeURIComponent(jobId)}/tasks`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return result.workspace;
  }

  static async updateCrmJobTask(jobId: string, taskId: string, input: Record<string, unknown>) {
    const result = await request<{ ok: true; workspace: CrmJobWorkspace }>(`/api/crm/jobs/${encodeURIComponent(jobId)}/tasks/${encodeURIComponent(taskId)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return result.workspace;
  }

  static async logCrmJobCommunication(jobId: string, input: Record<string, unknown>) {
    const result = await request<{ ok: true; workspace: CrmJobWorkspace }>(`/api/crm/jobs/${encodeURIComponent(jobId)}/communications`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return result.workspace;
  }

  static async sendCrmJobEmail(jobId: string, input: Record<string, unknown>) {
    const result = await request<{ ok: true; workspace: CrmJobWorkspace }>(`/api/crm/jobs/${encodeURIComponent(jobId)}/communications/send`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return result.workspace;
  }

  static questionnaireFileUrl(instanceId: string, fileId: string) {
    return `${API_BASE}/api/crm/questionnaire-files/${encodeURIComponent(fileId)}?instanceId=${encodeURIComponent(instanceId)}`;
  }

  static async getWorkspace() {
    const result = await request<{ ok: true; workspace: WorkspaceRecord }>("/api/workspace");
    return result.workspace;
  }

  static async updateWorkspace(workspace: Partial<WorkspaceRecord> & { id: string }) {
    const result = await request<{ ok: true; workspace: WorkspaceRecord }>("/api/workspace", {
      method: "PUT",
      body: JSON.stringify({ workspace }),
    });
    return result.workspace;
  }

  static async uploadPortalAsset(kind: "logo" | "banner", file: File) {
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    const response = await fetch(`${API_BASE}/api/workspace/portal-assets`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || `Upload failed (${response.status}).`);
    return result.asset as { kind: "logo" | "banner"; storageKey: string; url: string; filename: string };
  }

  static async health() {
    return request<{ ok: boolean; service: string }>("/api/health");
  }

  static async listJsonWeddings() {
    const result = await request<{ ok: true; weddings: StoredWeddingDocument[] }>("/api/weddings");
    return result.weddings;
  }

  static async saveWeddingListSettings(items: WeddingListSetting[]) {
    const result = await request<{ ok: true; weddings: StoredWeddingDocument[] }>("/api/wedding-list-settings", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
    return result.weddings;
  }

  static async getJsonWedding(slug: string) {
    const result = await request<{ ok: true; wedding: StoredWeddingDocument }>(`/api/weddings/${encodeURIComponent(slug)}`);
    return result.wedding;
  }

  static async updateJsonWedding(
    routeSlug: string,
    wedding: WeddingDocument,
  ) {
    return request<WeddingUpdateResult>(
      `/api/weddings/${encodeURIComponent(routeSlug)}`,
      {
        method: "PUT",
        body: JSON.stringify({ wedding }),
      },
    );
  }

  static async archiveWedding(slug: string) {
    return request<{ ok: true; wedding: StoredWeddingDocument; backupPath: null }>(
      `/api/weddings/${encodeURIComponent(slug)}`,
      { method: "DELETE" },
    );
  }

  static async deleteWeddingPermanently(slug: string) {
    return request<{
      ok: true;
      deletion: { slug: string; title: string; couple: string; deleted: true; assetsPreserved: true };
    }>(`/api/weddings/${encodeURIComponent(slug)}?mode=permanent`, {
      method: "DELETE",
    });
  }

  static async getWeddingImages(slug: string) {
    const result = await request<{ ok: true; slug: string; document: ImageManagerDocument | null }>(`/api/weddings/${encodeURIComponent(slug)}/images`);
    return result.document;
  }

  static async saveWeddingImages(slug: string, document: ImageManagerDocument) {
    return request<WeddingImagesSaveResult>(`/api/weddings/${encodeURIComponent(slug)}/images`, {
      method: "POST",
      body: JSON.stringify({ document }),
    });
  }


  static async listSuppliers() {
    const result = await request<{ ok: true; rows: SupplierRecord[] }>("/api/suppliers");
    return result.rows;
  }

  static async listMasterSuppliers() {
    const result = await request<{ ok: true; suppliers: MasterSupplier[] }>("/api/suppliers?view=master");
    return result.suppliers;
  }

  static async createMasterSupplier(supplier: Partial<MasterSupplier>) {
    const result = await request<{ ok: true; supplier: MasterSupplier }>("/api/suppliers", {
      method: "POST",
      body: JSON.stringify({ supplier }),
    });
    return result.supplier;
  }

  static async updateMasterSupplier(supplier: Partial<MasterSupplier> & { id: string }) {
    const result = await request<{ ok: true; supplier: MasterSupplier }>("/api/suppliers", {
      method: "PUT",
      body: JSON.stringify({ supplier }),
    });
    return result.supplier;
  }

  static async archiveMasterSupplier(id: string) {
    const result = await request<{ ok: true; supplier: MasterSupplier }>(`/api/suppliers?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return result.supplier;
  }

  static async getWeddingSuppliers(blogSlug: string) {
    const result = await request<{ ok: true; rows: SupplierRecord[] }>(`/api/weddings/${encodeURIComponent(blogSlug)}/suppliers`);
    return result.rows;
  }

  static async saveWeddingSuppliers(blogSlug: string, rows: SupplierRecord[]) {
    return request<SupplierSaveResult>(`/api/weddings/${encodeURIComponent(blogSlug)}/suppliers`, {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
  }

  static async getWeddingStory(slug: string) {
    const result = await request<{ ok: true; slug: string; story: EditableStory | null }>(`/api/weddings/${encodeURIComponent(slug)}/story`);
    return result.story;
  }

  static async saveWeddingStory(slug: string, story: EditableStory) {
    return request<StorySaveResult>(`/api/weddings/${encodeURIComponent(slug)}/story`, {
      method: "POST",
      body: JSON.stringify({ story }),
    });
  }

  static async createWedding(wedding: WeddingDocument) {
    return request<WeddingCreateResult>("/api/weddings", {
      method: "POST",
      body: JSON.stringify({ wedding }),
    });
  }

  static async generatePublishedWeddingIndex() {
    return request<{ ok: true; index: { schemaVersion: 1; generatedAt: string; count: number } }>("/api/weddings/published-index", {
      method: "POST",
    });
  }
}
