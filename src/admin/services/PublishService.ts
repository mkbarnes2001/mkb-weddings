import { SupplierService } from "./SupplierService";
import { StoryService } from "./StoryService";
import { WeddingService } from "./WeddingService";
import type { WeddingRecord } from "../types/wedding";

export type PublishCheck = {
  id: string;
  label: string;
  detail: string;
  passed: boolean;
  severity: "required" | "recommended";
};

export type PublishReport = {
  wedding: WeddingRecord;
  checks: PublishCheck[];
  requiredPassed: number;
  requiredTotal: number;
  recommendedPassed: number;
  recommendedTotal: number;
  readyToPublish: boolean;
};

export class PublishService {
  async getPublishReport(slug: string): Promise<PublishReport | undefined> {
    const weddingService = await WeddingService.load();
    const supplierService = await SupplierService.load();
    const storyService = new StoryService();

    const wedding = weddingService.getWedding(slug);
    const story = storyService.getStory(slug);
    const suppliers = supplierService.getSuppliersForWedding(slug);

    if (!wedding) return undefined;

    const checks: PublishCheck[] = [
      {
        id: "images",
        label: "Images selected",
        detail: `${wedding.imageCount} images in this wedding record`,
        passed: wedding.imageCount > 0,
        severity: "required",
      },
      {
        id: "cover",
        label: "Cover image selected",
        detail: wedding.coverCount > 0 ? "Cover image found" : "No cover image selected",
        passed: wedding.coverCount > 0,
        severity: "required",
      },
      {
        id: "ai-tags",
        label: "AI visual tags complete",
        detail: `${wedding.tagsComplete}/${wedding.imageCount} images tagged`,
        passed: wedding.imageCount > 0 && wedding.tagsComplete === wedding.imageCount,
        severity: "required",
      },
      {
        id: "ai-alt",
        label: "AI alt text complete",
        detail: `${wedding.altComplete}/${wedding.imageCount} images have alt text`,
        passed: wedding.imageCount > 0 && wedding.altComplete === wedding.imageCount,
        severity: "required",
      },
      {
        id: "ai-captions",
        label: "AI captions complete",
        detail: `${wedding.captionComplete}/${wedding.imageCount} images have captions`,
        passed: wedding.imageCount > 0 && wedding.captionComplete === wedding.imageCount,
        severity: "recommended",
      },
      {
        id: "story-title",
        label: "Story title exists",
        detail: story?.title ? story.title : "Missing story title",
        passed: Boolean(story?.title),
        severity: "required",
      },
      {
        id: "story-intro",
        label: "Story intro exists",
        detail: story?.intro ? "Intro found" : "Missing intro",
        passed: Boolean(story?.intro),
        severity: "required",
      },
      {
        id: "story-body",
        label: "Story paragraphs exist",
        detail: `${story?.paragraphs.length || 0} story paragraphs`,
        passed: Boolean(story && story.paragraphs.length > 0),
        severity: "required",
      },
      {
        id: "facts",
        label: "Wedding facts added",
        detail: `${story?.facts.length || 0} fact rows`,
        passed: Boolean(story && story.facts.length > 0),
        severity: "recommended",
      },
      {
        id: "suppliers",
        label: "Supplier rows added",
        detail: `${suppliers.length} supplier rows in blog-suppliers.csv`,
        passed: suppliers.length > 0,
        severity: "recommended",
      },
      {
        id: "public-route",
        label: "Public blog route",
        detail: `/blog/${wedding.slug}`,
        passed: true,
        severity: "required",
      },
    ];

    const required = checks.filter((check) => check.severity === "required");
    const recommended = checks.filter((check) => check.severity === "recommended");

    const requiredPassed = required.filter((check) => check.passed).length;
    const recommendedPassed = recommended.filter((check) => check.passed).length;

    return {
      wedding,
      checks,
      requiredPassed,
      requiredTotal: required.length,
      recommendedPassed,
      recommendedTotal: recommended.length,
      readyToPublish: requiredPassed === required.length,
    };
  }
}
