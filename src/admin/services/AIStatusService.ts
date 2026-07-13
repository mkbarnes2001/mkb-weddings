import { AIService } from "./AIService";
import { WeddingService } from "./WeddingService";

export type AiStatusReport = {
  blog: {
    total: number;
    tags: number;
    alt: number;
    captions: number;
    missingTags: number;
    missingAlt: number;
    missingCaptions: number;
  };
  gallery: {
    total: number;
    tags: number;
    alt: number;
    captions: number;
    missingTags: number;
    missingAlt: number;
    missingCaptions: number;
  };
  weddings: {
    slug: string;
    title: string;
    imageCount: number;
    tagsComplete: number;
    altComplete: number;
    captionComplete: number;
    status: "ready" | "warning" | "missing";
  }[];
};

export class AIStatusService {
  async getReport(): Promise<AiStatusReport> {
    const [aiService, weddingService] = await Promise.all([
      AIService.load(),
      WeddingService.load(),
    ]);

    const blogRows = aiService.getBlogRows();
    const galleryRows = aiService.getGalleryRows();

    const blog = aiService.getCoverage(blogRows);
    const gallery = aiService.getCoverage(galleryRows);

    const weddings = weddingService.getWeddings().map((wedding) => ({
      slug: wedding.slug,
      title: wedding.title,
      imageCount: wedding.imageCount,
      tagsComplete: wedding.tagsComplete,
      altComplete: wedding.altComplete,
      captionComplete: wedding.captionComplete,
      status: wedding.status,
    }));

    return {
      blog: {
        total: blog.total,
        tags: blog.tags,
        alt: blog.alt,
        captions: blog.captions,
        missingTags: Math.max(0, blog.total - blog.tags),
        missingAlt: Math.max(0, blog.total - blog.alt),
        missingCaptions: Math.max(0, blog.total - blog.captions),
      },
      gallery: {
        total: gallery.total,
        tags: gallery.tags,
        alt: gallery.alt,
        captions: gallery.captions,
        missingTags: Math.max(0, gallery.total - gallery.tags),
        missingAlt: Math.max(0, gallery.total - gallery.alt),
        missingCaptions: Math.max(0, gallery.total - gallery.captions),
      },
      weddings,
    };
  }
}
