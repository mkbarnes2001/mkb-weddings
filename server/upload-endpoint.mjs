import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { createR2StorageFromEnvironment } from "./r2-storage.mjs";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function safeBaseName(value) {
  return (
    path
      .basename(String(value || "image"), path.extname(String(value || "")))
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 120) || "image"
  );
}

export function createUploadEndpoint({
  projectRoot,
  publicRoot,
  weddingsRoot,
  venuesRoot,
  assertSafeSlug,
}) {
  const r2Storage = createR2StorageFromEnvironment();

  async function readBody(req, maxBytes = 40 * 1024 * 1024) {
    const chunks = [];
    let size = 0;

    for await (const chunk of req) {
      size += chunk.length;

      if (size > maxBytes) {
        const error = new Error(
          "Image exceeds the 40 MB upload limit.",
        );
        error.statusCode = 413;
        throw error;
      }

      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async function readJson(filePath, fallback) {
    try {
      return JSON.parse(await fs.readFile(filePath, "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT") return fallback;
      throw error;
    }
  }

  async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(
      filePath,
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8",
    );
  }

  async function createProcessedImages({
    buffer,
    weddingSlug,
    originalFilename,
    imageId,
  }) {
    const baseName = safeBaseName(originalFilename);
    const suffix = imageId.slice(-8);
    const filename =
      `${weddingSlug}-${baseName}-${suffix}.webp`;

    const source = sharp(buffer, {
      failOn: "error",
    }).rotate();

    const metadata = await source.metadata();

    const [fullBuffer, thumbBuffer] =
      await Promise.all([
        source
          .clone()
          .resize({
            width: 2000,
            height: 2000,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({
            quality: 86,
            effort: 5,
          })
          .toBuffer(),

        source
          .clone()
          .resize({
            width: 500,
            height: 500,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({
            quality: 80,
            effort: 4,
          })
          .toBuffer(),
      ]);

    const fullKey =
      `full/${weddingSlug}/${filename}`;
    const thumbKey =
      `thumb/${weddingSlug}/${filename}`;

    if (r2Storage.enabled) {
      let fullUpload;

      try {
        fullUpload = await r2Storage.putImage({
          key: fullKey,
          body: fullBuffer,
        });

        const thumbUpload =
          await r2Storage.putImage({
            key: thumbKey,
            body: thumbBuffer,
          });

        return {
          filename,
          fullSrc: fullUpload.url,
          thumbSrc: thumbUpload.url,
          fullKey,
          thumbKey,
          storage: "r2",
          width: metadata.width || 0,
          height: metadata.height || 0,
          orientation:
            metadata.width && metadata.height
              ? metadata.width > metadata.height
                ? "landscape"
                : metadata.width < metadata.height
                  ? "portrait"
                  : "square"
              : "unknown",
        };
      } catch (error) {
        if (fullUpload?.key) {
          await r2Storage
            .deleteImage(fullUpload.key)
            .catch(() => {});
        }

        throw error;
      }
    }

    const uploadRoot = path.join(
      publicRoot,
      "uploads",
      weddingSlug,
    );

    const fullDir = path.join(uploadRoot, "full");
    const thumbDir = path.join(uploadRoot, "thumb");

    await Promise.all([
      fs.mkdir(fullDir, { recursive: true }),
      fs.mkdir(thumbDir, { recursive: true }),
    ]);

    const fullPath = path.join(fullDir, filename);
    const thumbPath = path.join(thumbDir, filename);

    await Promise.all([
      fs.writeFile(fullPath, fullBuffer),
      fs.writeFile(thumbPath, thumbBuffer),
    ]);

    return {
      filename,
      fullSrc:
        `/uploads/${weddingSlug}/full/${filename}`,
      thumbSrc:
        `/uploads/${weddingSlug}/thumb/${filename}`,
      fullKey: path.relative(projectRoot, fullPath),
      thumbKey: path.relative(projectRoot, thumbPath),
      storage: "local",
      width: metadata.width || 0,
      height: metadata.height || 0,
      orientation:
        metadata.width && metadata.height
          ? metadata.width > metadata.height
            ? "landscape"
            : metadata.width < metadata.height
              ? "portrait"
              : "square"
          : "unknown",
    };
  }

  async function uploadImage({
    req,
    venueSlug,
    weddingSlug,
    originalFilename,
    mimeType,
  }) {
    assertSafeSlug(venueSlug);
    assertSafeSlug(weddingSlug);

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      const error = new Error(
        "Only JPEG, PNG and WebP files are supported.",
      );
      error.statusCode = 415;
      throw error;
    }

    const venuePath = path.join(
      venuesRoot,
      venueSlug,
      "venue.json",
    );

    try {
      await fs.access(venuePath);
    } catch {
      const error = new Error("Venue not found.");
      error.statusCode = 404;
      throw error;
    }

    const weddingDir = path.join(
      weddingsRoot,
      weddingSlug,
    );
    const weddingPath = path.join(
      weddingDir,
      "wedding.json",
    );

    try {
      await fs.access(weddingPath);
    } catch {
      const error = new Error(
        "Wedding not found. Create the wedding before uploading images.",
      );
      error.statusCode = 404;
      throw error;
    }

    const buffer = await readBody(req);
    const imageId = `image_${crypto.randomUUID()}`;

    let processed;

    try {
      processed = await createProcessedImages({
        buffer,
        weddingSlug,
        originalFilename,
        imageId,
      });
    } catch (error) {
      const imageError = new Error(
        `Unable to process ${originalFilename}: ${
          error instanceof Error
            ? error.message
            : "invalid image"
        }`,
      );
      imageError.statusCode = 422;
      throw imageError;
    }

    const imagesPath = path.join(
      weddingDir,
      "images.json",
    );

    const imageDocument = await readJson(imagesPath, {
      schemaVersion: 1,
      weddingSlug,
      updatedAt: "",
      images: [],
    });

    const existingImages = Array.isArray(
      imageDocument.images,
    )
      ? imageDocument.images
      : [];

    const nextImage = {
      id: imageId,
      filename: processed.filename,
      order: existingImages.length + 1,
      isCover: false,
      hidden: false,
      rating: 0,
      collections: [],
      source: {
        type:
          processed.storage === "r2"
            ? "r2-processed-upload"
            : "local-processed-upload",
        originalFilename,
        originalMimeType: mimeType,
        venueSlug,
        storage: processed.storage,
        fullKey: processed.fullKey,
        thumbKey: processed.thumbKey,
        fullPath: processed.fullSrc,
        thumbPath: processed.thumbSrc,
        width: processed.width,
        height: processed.height,
        orientation: processed.orientation,
      },
      fullSrc: processed.fullSrc,
      thumbSrc: processed.thumbSrc,
      aiAlt: "",
      aiCaption: "",
      aiTags: [],
    };

    imageDocument.schemaVersion = 1;
    imageDocument.weddingSlug = weddingSlug;
    imageDocument.updatedAt = new Date().toISOString();
    imageDocument.images = [
      ...existingImages,
      nextImage,
    ];

    await writeJson(imagesPath, imageDocument);

    const rawVenue = await readJson(venuePath, null);

    if (!rawVenue) {
      const error = new Error("Venue not found.");
      error.statusCode = 404;
      throw error;
    }

    rawVenue.gallery = rawVenue.gallery || {
      schemaVersion: 1,
      updatedAt: "",
      heroAssetId: "",
      images: [],
    };

    const existingVenueImages = Array.isArray(
      rawVenue.gallery.images,
    )
      ? rawVenue.gallery.images
      : [];

    const assetId = `${weddingSlug}:${imageId}`;

    rawVenue.gallery.updatedAt =
      new Date().toISOString();

    rawVenue.gallery.images = [
      ...existingVenueImages,
      {
        assetId,
        imageId,
        weddingSlug,
        filename: processed.filename,
        order: existingVenueImages.length + 1,
        included: false,
        hidden: false,
        rating: 0,
        moments: [],
        tags: [],
        display: {
          venue: false,
          moments: false,
          blog: false,
          homepage: false,
          portfolio: false,
        },
      },
    ];

    rawVenue.updatedAt = new Date().toISOString();

    await writeJson(venuePath, rawVenue);

    return {
      imageId,
      filename: processed.filename,
      weddingSlug,
      venueSlug,
      fullSrc: processed.fullSrc,
      thumbSrc: processed.thumbSrc,
      width: processed.width,
      height: processed.height,
      orientation: processed.orientation,
      localFullPath: path.relative(
        projectRoot,
        processed.fullPath,
      ),
      localThumbPath: path.relative(
        projectRoot,
        processed.thumbPath,
      ),
    };
  }

  return {
    uploadImage,
  };
}
