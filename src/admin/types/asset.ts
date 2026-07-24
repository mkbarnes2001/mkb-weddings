export type AssetRelation = {
  id?: string;
  slug: string;
  name: string;
  sortOrder?: number;
  hidden?: boolean;
  compatibility?: boolean;
};

export type AssetLocationRelation = {
  id: string;
  slug: string;
  name: string;
  type: string;
  inherited: boolean;
  primary: boolean;
};

export type AssetRecord = {
  id: string;
  workspaceId: string;
  legacyAssetKey: string;
  imageId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  sourceType: string;
  source: {
    storage: string;
    webKey: string;
    thumbKey: string;
    originalKey: string;
  };
  files: {
    original: string;
    web: string;
    thumb: string;
    originalAccess: string;
    originalStored: boolean;
  };
  weddings: AssetRelation[];
  venues: AssetRelation[];
  moments: Array<AssetRelation & { raw?: string }>;
  locations: AssetLocationRelation[];
  galleries: AssetRelation[];
  status: string;
  compatibilityBacked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AssetFacetOption = {
  id?: string;
  slug: string;
  name: string;
  compatibility?: boolean;
};

export type AssetLibraryPayload = {
  workspaceId: string;
  assets: AssetRecord[];
  facets: {
    weddings: AssetFacetOption[];
    venues: AssetFacetOption[];
    moments: AssetFacetOption[];
    galleries: AssetFacetOption[];
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats: {
    totalAssets: number;
    originalAssets: number;
    compatibilityAssets: number;
  };
};

export type AssetLibraryFilters = {
  q?: string;
  wedding?: string;
  venue?: string;
  moment?: string;
  gallery?: string;
  original?: "stored" | "preview";
  unassigned?: boolean;
  limit?: number;
  offset?: number;
};
