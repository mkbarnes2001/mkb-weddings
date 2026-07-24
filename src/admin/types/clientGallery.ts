export type ClientGalleryStatus = "draft" | "live" | "archived";

export type ClientGalleryWeddingOption = {
  slug: string;
  title: string;
  couple: string;
  venue: string;
  weddingDate: string;
  status: string;
};

export type ClientGalleryContact = {
  email: string;
  emailNormalized: string;
  displayName: string;
  role: string;
  allowOriginalDownloads: boolean;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type ClientGalleryVisitor = {
  visitorKey: string;
  email: string;
  emailNormalized: string;
  displayName: string;
  role: string;
  canDownloadOriginals: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  visitCount: number;
};

export type ClientGalleryRecord = {
  id: string;
  workspaceId: string;
  weddingSlug: string;
  weddingTitle: string;
  slug: string;
  title: string;
  clientName: string;
  clientEmail: string;
  intro: string;
  status: ClientGalleryStatus;
  accessToken: string;
  pinEnabled: boolean;
  expiresAt: string;
  allowFavourites: boolean;
  allowDownloads: boolean;
  requireEmail: boolean;
  allowGuestDownloads: boolean;
  coverAssetId: string;
  coverThumb: string;
  coverWeb: string;
  assetCount: number;
  visibleAssetCount: number;
  favouriteCount: number;
  downloadCount: number;
  visitorCount: number;
  authorisedContactCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ClientGalleryAsset = {
  assetId: string;
  filename: string;
  thumbSrc: string;
  webSrc: string;
  width: number;
  height: number;
  sortOrder: number;
  hidden: boolean;
  hasOriginal: boolean;
};

export type ClientGalleryListPayload = {
  workspaceId: string;
  galleries: ClientGalleryRecord[];
  weddings: ClientGalleryWeddingOption[];
};

export type ClientGalleryDetailPayload = {
  workspaceId: string;
  gallery: ClientGalleryRecord;
  assets: ClientGalleryAsset[];
  weddings: ClientGalleryWeddingOption[];
  contacts: ClientGalleryContact[];
  visitors: ClientGalleryVisitor[];
};

export type PrivateOriginalUploadedPart = {
  partNumber: number;
  etag: string;
};

export type PrivateOriginalUploadSession = {
  id: string;
  galleryId: string;
  assetId: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  partSize: number;
  status: "created" | "uploading" | "processing" | "complete" | "failed" | "aborted";
  uploadedParts: PrivateOriginalUploadedPart[];
  error: string;
  createdAt: string;
  updatedAt: string;
};
