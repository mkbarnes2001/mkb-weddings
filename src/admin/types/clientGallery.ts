export type ClientGalleryStatus = "draft" | "live" | "archived";
export type ClientGallerySortMode = "custom" | "capture_time" | "filename";

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


export type ClientGallerySelectionRequest = {
  id: string;
  galleryId: string;
  name: string;
  instructions: string;
  minImages: number;
  maxImages: number;
  status: "active" | "archived";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ClientGallerySelectionAsset = {
  assetId: string;
  filename: string;
  thumbSrc: string;
  webSrc: string;
  sortOrder: number;
};

export type ClientGallerySelection = {
  id: string;
  requestId: string;
  requestName: string;
  visitorKey: string;
  email: string;
  displayName: string;
  status: "draft" | "submitted";
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  selectedCount: number;
  assets: ClientGallerySelectionAsset[];
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
  sortMode: ClientGallerySortMode;
  createdAt: string;
  updatedAt: string;
};



export type ClientGalleryBranding = {
  businessName: string;
  logoMode: "workspace" | "custom" | "hidden";
  customLogoUrl: string;
  customLogoStored: boolean;
  effectiveLogoUrl: string;
  workspaceLogoUrl: string;
  workspaceAccentColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  headingFont: "editorial" | "modern" | "classic";
  showStudioName: boolean;
  updatedAt: string;
};

export type ClientGalleryAlbum = {
  id: string;
  galleryId: string;
  name: string;
  slug: string;
  status: "active" | "archived";
  sortOrder: number;
  assetCount: number;
  assetIds: string[];
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
  capturedAt: string;
  captureSource: string;
  albumIds: string[];
  albumSortOrders: Record<string, number>;
};


export type ClientGalleryFavouriteAsset = {
  assetId: string;
  filename: string;
  thumbSrc: string;
  webSrc: string;
  hasOriginal: boolean;
  fileSize: number;
  firstFavouritedAt: string;
};

export type ClientGalleryFavouriteGroup = {
  key: string;
  label: string;
  email: string;
  displayName: string;
  verified: boolean;
  assetCount: number;
  assets: ClientGalleryFavouriteAsset[];
};

export type ClientGalleryFavouritesPayload = {
  workspaceId: string;
  gallery: {
    id: string;
    title: string;
    clientName: string;
    weddingSlug: string;
  };
  combinedAssets: ClientGalleryFavouriteAsset[];
  groups: ClientGalleryFavouriteGroup[];
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
  selectionRequests: ClientGallerySelectionRequest[];
  selections: ClientGallerySelection[];
  albums: ClientGalleryAlbum[];
  branding: ClientGalleryBranding;
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
