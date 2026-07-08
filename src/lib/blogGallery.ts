// src/lib/blogGallery.ts
import { WeddingStory } from "../data/weddingStories";
import {
  loadMkbIntelligence,
  type BlogGalleryCsvRow as GalleryCsvRow,
  type BlogImage,
} from "./intelligence";

export type { BlogImage, GalleryCsvRow };

export interface BlogCard {
  story: WeddingStory;
  coverImage?: BlogImage;
  imageCount: number;
}

export async function getBlogImages(slug: string, story?: WeddingStory): Promise<BlogImage[]> {
  const intelligence = await loadMkbIntelligence();
  return intelligence.getBlogImages(slug, story);
}

export function getCoverImage(images: BlogImage[]) {
  return images.find((image) => image.isCover) || images[0];
}

export async function buildBlogCards(stories: WeddingStory[]): Promise<BlogCard[]> {
  const intelligence = await loadMkbIntelligence();

  return stories.map((story) => {
    const images = intelligence.getBlogImages(story.slug, story);

    return {
      story,
      coverImage: intelligence.getCoverImage(images),
      imageCount: images.length,
    };
  });
}
