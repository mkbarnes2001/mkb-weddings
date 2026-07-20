import type { SupplierRecord } from "./SupplierService";
import type { StoryFact } from "./StoryService";
import type { WeddingDocument } from "../../lib/weddingEngine";
import type { ImageManagerDocument } from "../types/imageManager";
import type { MomentRepositoryDocument } from "../types/moment";
import type { VenueDocument, VenueSummary } from "../types/venue";
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

  static async listVenues() {
    const result = await request<{ ok: true; venues: VenueSummary[] }>("/api/venues");
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


  static async health() {
    return request<{ ok: boolean; service: string }>("/api/health");
  }

  static async listJsonWeddings() {
    const result = await request<{ ok: true; weddings: StoredWeddingDocument[] }>("/api/weddings");
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
