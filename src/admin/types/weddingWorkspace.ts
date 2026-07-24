export type WeddingWorkspaceAsset = {
  id: string;
  legacyAssetKey: string;
  filename: string;
  originalFilename: string;
  width: number;
  height: number;
  webSrc: string;
  thumbSrc: string;
  hasOriginal: boolean;
  sortOrder: number;
  isPreview: boolean;
  previewSortOrder: number;
  sourceType: string;
};

export type WeddingWorkspaceMoment = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
};

export type WeddingWorkspaceGallery = {
  id: string;
  slug: string;
  name: string;
  status?: string;
  compatibility: boolean;
};

export type WeddingWorkspaceClientGallery = {
  id: string;
  slug: string;
  title: string;
  clientName: string;
  clientEmail: string;
  status: string;
  accessToken: string;
  allowDownloads: boolean;
};

export type WeddingWorkspacePayload = {
  workspaceId: string;
  wedding: {
    slug: string;
    title: string;
    couple: string;
    venue: string;
    venueSlug: string;
    weddingDate: string;
    status: string;
  };
  venue: {
    slug: string;
    name: string;
    instagram: string;
  } | null;
  workspace: {
    businessName: string;
    instagram: string;
    websiteUrl: string;
  };
  previewSet: {
    id: string;
    name: string;
    assetIds: string[];
  };
  assets: WeddingWorkspaceAsset[];
  moments: WeddingWorkspaceMoment[];
  galleries: WeddingWorkspaceGallery[];
  clientGalleries: WeddingWorkspaceClientGallery[];
};

export type WeddingPreviewAssignmentInput = {
  assetIds: string[];
  addToVenue: boolean;
  venueSlug?: string;
  momentIds: string[];
  galleryIds: string[];
};
