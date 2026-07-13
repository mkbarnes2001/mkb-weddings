import { weddingStories } from "../../data/weddingStories";
import { AIStatusService } from "./AIStatusService";
import { CollectionService } from "./CollectionService";
import { PublishService } from "./PublishService";

export type WeddingSeoStatus = {
  slug: string;
  title: string;
  venue: string;
  route: string;
  imageCount: number;
  hasCover: boolean;
  altComplete: boolean;
  captionsComplete: boolean;
  publishRequiredPassed: number;
  publishRequiredTotal: number;
  ready: boolean;
};

export type SeoReport = {
  storyRouteCount: number;
  blogImageCount: number;
  blogAltComplete: number;
  blogCaptionComplete: number;
  galleryImageCount: number;
  galleryAltComplete: number;
  collectionCount: number;
  activeCollectionCount: number;
  weddingStatuses: WeddingSeoStatus[];
};

export class SEOService {
  async getReport(): Promise<SeoReport> {
    const [aiReport, collectionService] = await Promise.all([
      new AIStatusService().getReport(),
      CollectionService.load(),
    ]);

    const collections = collectionService.getAllCollections();

    const weddingStatuses = await Promise.all(
      weddingStories.map(async (story) => {
        const publishReport = await new PublishService().getPublishReport(story.slug);

        return {
          slug: story.slug,
          title: story.title,
          venue: story.venue,
          route: `/blog/${story.slug}`,
          imageCount: publishReport?.wedding.imageCount || 0,
          hasCover: Boolean((publishReport?.wedding.coverCount || 0) > 0),
          altComplete: Boolean(
            publishReport &&
              publishReport.wedding.imageCount > 0 &&
              publishReport.wedding.altComplete === publishReport.wedding.imageCount,
          ),
          captionsComplete: Boolean(
            publishReport &&
              publishReport.wedding.imageCount > 0 &&
              publishReport.wedding.captionComplete === publishReport.wedding.imageCount,
          ),
          publishRequiredPassed: publishReport?.requiredPassed || 0,
          publishRequiredTotal: publishReport?.requiredTotal || 0,
          ready: Boolean(publishReport?.readyToPublish),
        };
      }),
    );

    return {
      storyRouteCount: weddingStories.length,
      blogImageCount: aiReport.blog.total,
      blogAltComplete: aiReport.blog.alt,
      blogCaptionComplete: aiReport.blog.captions,
      galleryImageCount: aiReport.gallery.total,
      galleryAltComplete: aiReport.gallery.alt,
      collectionCount: collections.length,
      activeCollectionCount: collections.filter((collection) => collection.status === "active").length,
      weddingStatuses,
    };
  }
}
