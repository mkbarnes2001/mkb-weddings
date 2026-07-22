import type { MasterSupplier, SupplierRecord } from "./SupplierService";
import type { StoryFact } from "./StoryService";
import type { WeddingDocument } from "../../lib/weddingEngine";
import type { ImageManagerDocument } from "../types/imageManager";
import type { MomentGalleryPayload, MomentRepositoryDocument } from "../types/moment";
import type { CustomCollection, CustomCollectionGalleryPayload, CustomCollectionMembershipPayload } from "../types/customCollection";
import type { VenueDocument, VenueSummary } from "../types/venue";
import type { AssetLibraryFilters, AssetLibraryPayload } from "../types/asset";
import { prepareImageUpload } from "./ImageUploadService";

const API_BASE =
  import.meta.env.VITE_ADMIN_API_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:8787" : "");

type ApiErrorPayload = { error?: string; details?: string[] };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
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
