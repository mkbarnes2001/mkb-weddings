export type PreparedImageUpload = {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
};

function targetSize(width: number, height: number, maxDimension: number) {
  const longest = Math.max(width, height);
  const scale = longest > maxDimension ? maxDimension / longest : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function canvasBlob(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number,
  quality: number,
) {
  const size = targetSize(sourceWidth, sourceHeight, maxDimension);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare images for upload.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, size.width, size.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });

  if (!blob || blob.type !== "image/webp") {
    throw new Error(
      "This browser could not create the WebP upload variants. Please use the current version of Chrome or Safari.",
    );
  }

  return blob;
}

async function loadHtmlImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return {
      source: image as CanvasImageSource,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => {},
    };
  } finally {
    // Revocation is safe after decode; the decoded image remains available.
    URL.revokeObjectURL(url);
  }
}

async function loadImage(file: File) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap as CanvasImageSource,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Older Safari versions can reject imageOrientation even when
      // createImageBitmap itself is available. Fall through to <img>.
    }
  }

  return loadHtmlImage(file);
}

export async function prepareImageUpload(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<PreparedImageUpload> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Only JPEG, PNG and WebP files are supported.");
  }

  if (file.size > 40 * 1024 * 1024) {
    throw new Error("Image exceeds the 40 MB import limit.");
  }

  onProgress?.(15);
  const loaded = await loadImage(file);

  try {
    if (!loaded.width || !loaded.height) {
      throw new Error("Unable to read the image dimensions.");
    }

    onProgress?.(30);
    const full = await canvasBlob(
      loaded.source,
      loaded.width,
      loaded.height,
      2000,
      0.86,
    );

    onProgress?.(50);
    const thumb = await canvasBlob(
      loaded.source,
      loaded.width,
      loaded.height,
      500,
      0.8,
    );

    onProgress?.(60);
    return {
      full,
      thumb,
      width: loaded.width,
      height: loaded.height,
    };
  } finally {
    loaded.close();
  }
}
