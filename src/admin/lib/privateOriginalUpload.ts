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


function normaliseExifDate(value: string) {
  const match = value.trim().match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}` : "";
}

async function readCaptureMetadata(file: File) {
  const fallback = file.lastModified > 0 ? new Date(file.lastModified).toISOString() : "";
  try {
    const buffer = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer();
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) {
      return { capturedAt: fallback, captureSource: fallback ? "file_modified" : "" };
    }

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      if (view.getUint8(offset) !== 0xff) { offset += 1; continue; }
      const marker = view.getUint8(offset + 1);
      if (marker === 0xd9 || marker === 0xda) break;
      const length = view.getUint16(offset + 2, false);
      if (length < 2 || offset + 2 + length > view.byteLength) break;
      if (marker === 0xe1) {
        const payload = offset + 4;
        if (payload + 6 <= view.byteLength &&
          view.getUint8(payload) === 0x45 && view.getUint8(payload + 1) === 0x78 &&
          view.getUint8(payload + 2) === 0x69 && view.getUint8(payload + 3) === 0x66 &&
          view.getUint8(payload + 4) === 0 && view.getUint8(payload + 5) === 0) {
          const tiff = payload + 6;
          if (tiff + 8 > view.byteLength) break;
          const byteOrder = String.fromCharCode(view.getUint8(tiff), view.getUint8(tiff + 1));
          const little = byteOrder === "II";
          if (!little && byteOrder !== "MM") break;
          const u16 = (at: number) => view.getUint16(at, little);
          const u32 = (at: number) => view.getUint32(at, little);
          if (u16(tiff + 2) !== 42) break;

          const readAscii = (entry: number, count: number) => {
            const dataOffset = count <= 4 ? entry + 8 : tiff + u32(entry + 8);
            if (dataOffset < 0 || dataOffset + count > view.byteLength) return "";
            let value = "";
            for (let i = 0; i < count; i += 1) {
              const code = view.getUint8(dataOffset + i);
              if (!code) break;
              value += String.fromCharCode(code);
            }
            return value;
          };

          const readIfd = (relativeOffset: number) => {
            const found: Record<number, string | number> = {};
            const ifd = tiff + relativeOffset;
            if (ifd < 0 || ifd + 2 > view.byteLength) return found;
            const count = u16(ifd);
            for (let i = 0; i < count; i += 1) {
              const entry = ifd + 2 + i * 12;
              if (entry + 12 > view.byteLength) break;
              const tag = u16(entry);
              const type = u16(entry + 2);
              const valueCount = u32(entry + 4);
              if (type === 2 && valueCount > 0 && valueCount < 256) found[tag] = readAscii(entry, valueCount);
              else if (type === 4 && valueCount === 1) found[tag] = u32(entry + 8);
            }
            return found;
          };

          const ifd0 = readIfd(u32(tiff + 4));
          const exifOffset = typeof ifd0[0x8769] === "number" ? ifd0[0x8769] as number : 0;
          const exifIfd = exifOffset ? readIfd(exifOffset) : {};
          const raw = String(exifIfd[0x9003] || exifIfd[0x9004] || ifd0[0x0132] || "");
          const capturedAt = normaliseExifDate(raw);
          if (capturedAt) return { capturedAt, captureSource: "exif" };
        }
      }
      offset += 2 + length;
    }
  } catch {
    // Fall back to the file modification timestamp when EXIF is unavailable.
  }
  return { capturedAt: fallback, captureSource: fallback ? "file_modified" : "" };
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
  const [prepared, capture] = await Promise.all([preparePrivateOriginal(file), readCaptureMetadata(file)]);
  const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
  const created = await AdminApiService.createPrivateOriginalUpload(galleryId, {
    filename: file.name,
    mimeType: file.type,
    fileSize: file.size,
    width: prepared.width,
    height: prepared.height,
    fingerprint,
    capturedAt: capture.capturedAt,
    captureSource: capture.captureSource,
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
