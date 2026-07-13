import { useMemo, useRef, useState } from "react";
import type { ManagedWeddingImage } from "../types/imageManager";

export function useImageSelection(images: ManagedWeddingImage[]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const anchorIndexRef = useRef<number | null>(null);

  const activeImage = useMemo(
    () => images.find((image) => image.id === activeId) || null,
    [images, activeId],
  );

  function selectSingle(imageId: string, index?: number) {
    setActiveId(imageId);
    setSelectedIds(new Set([imageId]));
    if (typeof index === "number") anchorIndexRef.current = index;
  }

  function toggle(imageId: string, index?: number) {
    setActiveId(imageId);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
    if (typeof index === "number") anchorIndexRef.current = index;
  }

  function selectRange(
    orderedImages: ManagedWeddingImage[],
    targetIndex: number,
  ) {
    const anchor = anchorIndexRef.current ?? targetIndex;
    const start = Math.min(anchor, targetIndex);
    const end = Math.max(anchor, targetIndex);

    const ids = orderedImages
      .slice(start, end + 1)
      .map((image) => image.id);

    setSelectedIds(new Set(ids));
    setActiveId(orderedImages[targetIndex]?.id || null);
  }

  function handleSelection(
    event: React.MouseEvent,
    image: ManagedWeddingImage,
    orderedImages: ManagedWeddingImage[],
    index: number,
  ) {
    if (event.shiftKey) {
      selectRange(orderedImages, index);
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      toggle(image.id, index);
      return;
    }

    selectSingle(image.id, index);
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function ensureInitialSelection(imageId?: string) {
    if (!activeId && imageId) {
      setActiveId(imageId);
      setSelectedIds(new Set([imageId]));
      anchorIndexRef.current = 0;
    }
  }

  return {
    activeId,
    activeImage,
    selectedIds,
    selectedCount: selectedIds.size,
    setActiveId,
    selectSingle,
    toggle,
    handleSelection,
    clearSelection,
    ensureInitialSelection,
  };
}
