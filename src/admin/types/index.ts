export type AiStatus = "ready" | "warning" | "missing";

export type WeddingRecord = {
  slug: string;
  title: string;
  couple: string;
  venue: string;
  weddingDate: string;
  imageCount: number;
  aiRows: number;
  tagsComplete: number;
  altComplete: number;
  captionComplete: number;
  coverCount: number;
  status: AiStatus;
  latestAiUpdate?: string;
};

export type DashboardStats = {
  weddingCount: number;
  readyWeddingCount: number;
  warningWeddingCount: number;
  blogImageCount: number;
  galleryImageCount: number;
  blogAiRows: number;
  galleryAiRows: number;
  blogTagsComplete: number;
  blogAltComplete: number;
  blogCaptionComplete: number;
};
