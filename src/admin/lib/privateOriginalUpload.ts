import { AdminApiService } from "../services/AdminApiService";
import type { PrivateOriginalUploadedPart } from "../types/clientGallery";

export type PreparedPrivateOriginal = {
  width: number;
  height: number;
  web: Blob;
  thumb: Blob;
};

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to generate WebP derivative.")), "image/webp", quality);
  });
}

async function decodeImage(file: File) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    } catch {
      return await createImageBitmap(file);
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to decode JPEG."));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderDerivative(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  longestEdge: number,
  quality: number,
) {
  const scale = Math.min(1, longestEdge / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas processing is unavailable in this browser.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source as CanvasImageSource, 0, 0, targetWidth, targetHeight);
  return canvasBlob(canvas, quality);
}

export async function preparePrivateOriginal(file: File): Promise<PreparedPrivateOriginal> {
  if (file.type !== "image/jpeg") throw new Error("Only full-resolution JPEG files are supported in this release.");
  const source = await decodeImage(file);
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!width || !height) throw new Error("Unable to read JPEG dimensions.");
  try {
    const [web, thumb] = await Promise.all([
      renderDerivative(source, width, height, 2400, 0.88),
      renderDerivative(source, width, height, 640, 0.82),
    ]);
    return { width, height, web, thumb };
  } finally {
    if ("close" in source && typeof source.close === "function") source.close();
  }
}

async function withRetry<T>(operation: () => Promise<T>, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 650));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Upload failed after retrying.");
}

export async function uploadPrivateOriginal(input: {
  galleryId: string;
  file: File;
  onProgress?: (progress: number, stage: string) => void;
}) {
  const { galleryId, file, onProgress = () => {} } = input;
  onProgress(2, "Preparing previews");
  const prepared = await preparePrivateOriginal(file);
  const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
  const created = await AdminApiService.createPrivateOriginalUpload(galleryId, {
    filename: file.name,
    mimeType: file.type,
    fileSize: file.size,
    width: prepared.width,
    height: prepared.height,
    fingerprint,
  });
  const session = created.session;
  const partSize = session.partSize;
  const partCount = Math.ceil(file.size / partSize);
  const known = new Map(session.uploadedParts.map((part) => [part.partNumber, part]));
  const completedParts: PrivateOriginalUploadedPart[] = [...session.uploadedParts];

  for (let index = 0; index < partCount; index += 1) {
    const partNumber = index + 1;
    if (!known.has(partNumber)) {
      const start = index * partSize;
      const end = Math.min(file.size, start + partSize);
      const chunk = file.slice(start, end, "application/octet-stream");
      const uploaded = await withRetry(() => AdminApiService.uploadPrivateOriginalPart(galleryId, session.id, partNumber, chunk));
      completedParts.push({ partNumber: uploaded.partNumber, etag: uploaded.etag });
      known.set(partNumber, { partNumber: uploaded.partNumber, etag: uploaded.etag });
    }
    onProgress(8 + Math.round(((index + 1) / partCount) * 74), `Uploading original ${index + 1}/${partCount}`);
  }

  const parts = Array.from(known.values()).sort((a, b) => a.partNumber - b.partNumber);
  onProgress(85, "Finalising private original");
  await withRetry(() => AdminApiService.completePrivateOriginalUpload(galleryId, session.id, parts), 2);
  onProgress(90, "Storing web previews");
  const completed = await withRetry(() => AdminApiService.uploadPrivateOriginalDerivatives(galleryId, session.id, {
    web: prepared.web,
    thumb: prepared.thumb,
    width: prepared.width,
    height: prepared.height,
  }), 2);
  onProgress(100, "Complete");
  return completed.session;
}
