export type CollectionType = "blog" | "venue" | "portfolio" | "instagram" | "homepage" | "custom";

export type ImageCollection = {
  id: string;
  weddingSlug: string;
  type: CollectionType;
  name: string;
  description: string;
  imageCount: number;
  source: string;
  status: "active" | "empty" | "planned";
};
