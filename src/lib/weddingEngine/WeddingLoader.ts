import { WeddingRepository } from "./WeddingRepository";
import type { WeddingDocument } from "./WeddingTypes";

const repository = new WeddingRepository();

export async function loadWedding(
  slug: string,
): Promise<WeddingDocument | undefined> {
  return repository.getBySlug(slug);
}
