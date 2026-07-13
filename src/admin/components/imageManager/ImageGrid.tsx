import type { ManagedWeddingImage } from "../../types/imageManager";
import { ImageCard } from "./ImageCard";

export function ImageGrid({
  images,
  activeId,
  selectedIds,
  draggedIds,
  onOpen,
  onToggleSelected,
  onRate,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  images: ManagedWeddingImage[];
  activeId: string | null;
  selectedIds: Set<string>;
  draggedIds: string[];
  onOpen: (
    event: React.MouseEvent,
    image: ManagedWeddingImage,
    index: number,
  ) => void;
  onToggleSelected: (
    image: ManagedWeddingImage,
    index: number,
  ) => void;
  onRate: (image: ManagedWeddingImage, rating: number) => void;
  onDragStart: (image: ManagedWeddingImage) => void;
  onDragEnd: () => void;
  onDrop: (target: ManagedWeddingImage) => void;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-4 md:grid-cols-3"
      style={{ minWidth: 0 }}
    >
      {images.map((image, index) => (
        <ImageCard
          key={image.id}
          image={image}
          active={activeId === image.id}
          selected={selectedIds.has(image.id)}
          dragging={draggedIds.includes(image.id)}
          onOpen={(event) => onOpen(event, image, index)}
          onToggleSelected={() => onToggleSelected(image, index)}
          onRate={(rating) => onRate(image, rating)}
          onDragStart={() => onDragStart(image)}
          onDragEnd={onDragEnd}
          onDrop={() => onDrop(image)}
        />
      ))}
    </div>
  );
}
