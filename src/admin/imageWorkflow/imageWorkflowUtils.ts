import type { ManagedWeddingImage } from "../types/imageManager";

export function normaliseOrder(images: ManagedWeddingImage[]) {
  return images.map((image, index) => ({
    ...image,
    order: index + 1,
  }));
}

export function moveImageGroup(
  images: ManagedWeddingImage[],
  movingIds: string[],
  targetId: string,
) {
  if (!movingIds.length || movingIds.includes(targetId)) {
    return images;
  }

  const movingSet = new Set(movingIds);
  const moving = images.filter((image) => movingSet.has(image.id));
  const remaining = images.filter((image) => !movingSet.has(image.id));

  const targetIndex = remaining.findIndex(
    (image) => image.id === targetId,
  );

  if (targetIndex < 0) {
    return normaliseOrder([...remaining, ...moving]);
  }

  const next = [...remaining];
  next.splice(targetIndex, 0, ...moving);
  return normaliseOrder(next);
}
