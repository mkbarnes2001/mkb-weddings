import { useEffect, useMemo, useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export interface MasonryImage {
  thumbSrc: string;
  fullSrc: string;
  alt: string;
}

interface MasonryGalleryProps {
  images: MasonryImage[];
  onImageClick?: (index: number) => void;
}

export function MasonryGallery({ images, onImageClick }: MasonryGalleryProps) {
  const [columnCount, setColumnCount] = useState(2);

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth >= 1280) setColumnCount(4);
      else if (window.innerWidth >= 768) setColumnCount(3);
      else setColumnCount(2);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);

    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const columns = useMemo(() => {
    const cols: Array<Array<{ image: MasonryImage; originalIndex: number }>> = Array.from(
      { length: columnCount },
      () => [],
    );

    images.forEach((image, index) => {
      cols[index % columnCount].push({ image, originalIndex: index });
    });

    return cols;
  }, [images, columnCount]);

  return (
    <div
      className="grid gap-1"
      style={{
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
      }}
    >
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-1">
          {column.map(({ image, originalIndex }) => (
            <button
              key={`${image.thumbSrc}-${originalIndex}`}
              type="button"
              onClick={() => onImageClick?.(originalIndex)}
              className="overflow-hidden group cursor-pointer bg-neutral-100"
            >
              <ImageWithFallback
                src={image.thumbSrc}
                alt={image.alt}
                className="block w-full h-auto transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}