import { weddingStories } from "../../data/weddingStories";
import { parseCsv } from "../utils/csv";

type GalleryRow = {
  venue?: string;
};

export type VenueDirectoryEntry = {
  name: string;
  usageCount: number;
};

async function fetchText(path: string) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) return "";
  return response.text();
}

export class VenueDirectoryService {
  static async load(): Promise<VenueDirectoryEntry[]> {
    const galleryText = await fetchText("/gallery.csv");
    const galleryRows = parseCsv<GalleryRow>(galleryText);
    const counts = new Map<string, number>();

    for (const row of galleryRows) {
      const venue = (row.venue || "").trim();
      if (!venue) continue;
      counts.set(venue, (counts.get(venue) || 0) + 1);
    }

    for (const story of weddingStories) {
      const venue = story.venue.trim();
      if (!venue) continue;
      counts.set(venue, (counts.get(venue) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([name, usageCount]) => ({ name, usageCount }))
      .sort((a, b) => {
        if (b.usageCount !== a.usageCount) {
          return b.usageCount - a.usageCount;
        }
        return a.name.localeCompare(b.name);
      });
  }
}
