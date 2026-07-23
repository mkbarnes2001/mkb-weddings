export type ClientGalleryStatus = "draft" | "live" | "archived";

export type ClientGalleryWeddingOption = {
  slug: string;
  title: string;
  couple: string;
  venue: string;
  weddingDate: string;
  status: string;
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
  coverAssetId: string;
  coverThumb: string;
  coverWeb: string;
  assetCount: number;
  visibleAssetCount: number;
  favouriteCount: number;
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
};
