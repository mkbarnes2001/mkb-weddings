import fs from "node:fs/promises";
import path from "node:path";
import { createR2StorageFromEnvironment } from "./r2-storage.mjs";

function text(value) {
  return String(value || "").trim();
}

function assertSafeImageId(imageId) {
  if (
    !imageId ||
    imageId.length > 200 ||
    !/^[A-Za-z0-9._:-]+$/.test(imageId)
  ) {
    const error = new Error("Invalid image ID.");
    error.statusCode = 400;
    throw error;
  }
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(filePath, document) {
  await fs.mkdir(path.dirname(filePath), {
    recursive: true,
  });

  await fs.writeFile(
    filePath,
    `${JSON.stringify(document, null, 2)}\n`,
    "utf8",
  );
}

function normaliseOrder(images) {
  return images.map((image, index) => ({
    ...image,
    order: index + 1,
  }));
}

export function createImageLifecycleEndpoint({
  projectRoot,
  weddingsRoot,
  venuesRoot,
  backupDir,
  assertSafeSlug,
  publicVenuePublisher,
}) {
  const r2Storage =
    createR2StorageFromEnvironment();

  async function createBackup(sourcePath, prefix) {
    await fs.mkdir(backupDir, {
      recursive: true,
    });

    try {
      const existing = await fs.readFile(
        sourcePath,
        "utf8",
      );

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

      const extension =
        path.extname(sourcePath) || ".json";

      const backupPath = path.join(
        backupDir,
        `${prefix}-${timestamp}${extension}`,
      );

      await fs.writeFile(
        backupPath,
        existing,
        "utf8",
      );

      return path.relative(
        projectRoot,
        backupPath,
      );
    } catch {
      return null;
    }
  }

  async function listVenueDocuments() {
    await fs.mkdir(venuesRoot, {
      recursive: true,
    });

    const entries = await fs.readdir(
      venuesRoot,
      {
        withFileTypes: true,
      },
    );

    const documents = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const venuePath = path.join(
        venuesRoot,
        entry.name,
        "venue.json",
      );

      const venue = await readJson(
        venuePath,
        null,
      );

      if (venue) {
        documents.push({
          venuePath,
          venue,
        });
      }
    }

    return documents;
  }

  async function deleteLocalFile(relativeKey) {
    const key = text(relativeKey);
    if (!key) return;

    const absolutePath = path.resolve(
      projectRoot,
      key,
    );

    const rootPrefix =
      `${path.resolve(projectRoot)}${path.sep}`;

    if (
      absolutePath !== path.resolve(projectRoot) &&
      !absolutePath.startsWith(rootPrefix)
    ) {
      const error = new Error(
        "Refusing to delete a file outside the project.",
      );
      error.statusCode = 400;
      throw error;
    }

    await fs.rm(absolutePath, {
      force: true,
    });
  }

  async function deleteStoredFiles(image) {
    const storage = text(
      image?.source?.storage,
    );

    const fullKey = text(
      image?.source?.fullKey,
    );

    const thumbKey = text(
      image?.source?.thumbKey,
    );

    const warnings = [];

    if (storage === "r2") {
      if (!r2Storage.enabled) {
        const error = new Error(
          "R2 is not enabled. Restart the API with the .env file before permanently deleting this image.",
        );
        error.statusCode = 409;
        throw error;
      }

      for (const key of [fullKey, thumbKey]) {
        if (!key) continue;

        try {
          await r2Storage.deleteImage(key);
        } catch (error) {
          warnings.push(
            `Unable to delete R2 object ${key}: ${
              error instanceof Error
                ? error.message
                : "unknown error"
            }`,
          );
        }
      }
    } else if (storage === "local") {
      for (const key of [fullKey, thumbKey]) {
        if (!key) continue;

        try {
          await deleteLocalFile(key);
        } catch (error) {
          warnings.push(
            `Unable to delete local file ${key}: ${
              error instanceof Error
                ? error.message
                : "unknown error"
            }`,
          );
        }
      }
    } else {
      const error = new Error(
        "Only images uploaded through Photography Intelligence can be permanently deleted. Remove this imported image from the venue gallery instead.",
      );
      error.statusCode = 400;
      throw error;
    }

    return warnings;
  }

  async function deleteImage({
    weddingSlug,
    imageId,
    venueSlug,
  }) {
    assertSafeSlug(weddingSlug);
    assertSafeImageId(imageId);

    if (venueSlug) {
      assertSafeSlug(venueSlug);
    }

    const weddingDir = path.join(
      weddingsRoot,
      weddingSlug,
    );

    const imagesPath = path.join(
      weddingDir,
      "images.json",
    );

    const imageDocument = await readJson(
      imagesPath,
      null,
    );

    if (
      !imageDocument ||
      !Array.isArray(imageDocument.images)
    ) {
      const error = new Error(
        "Wedding image record not found.",
      );
      error.statusCode = 404;
      throw error;
    }

    const image = imageDocument.images.find(
      (item) => text(item.id) === imageId,
    );

    if (!image) {
      const error = new Error(
        "Image not found in the wedding record.",
      );
      error.statusCode = 404;
      throw error;
    }

    if (image.isCover) {
      const error = new Error(
        "This image is the wedding cover. Select another wedding cover before deleting it.",
      );
      error.statusCode = 409;
      throw error;
    }

    const venueDocuments =
      await listVenueDocuments();

    const affectedVenues = [];

    for (const record of venueDocuments) {
      const galleryImages = Array.isArray(
        record.venue?.gallery?.images,
      )
        ? record.venue.gallery.images
        : [];

      const matching = galleryImages.filter(
        (item) =>
          text(item.imageId) === imageId &&
          text(item.weddingSlug) ===
            weddingSlug,
      );

      if (!matching.length) continue;

      const matchingAssetIds = new Set(
        matching.map((item) =>
          text(item.assetId),
        ),
      );

      const heroAssetId = text(
        record.venue?.gallery?.heroAssetId ||
          record.venue?.heroImageId,
      );

      if (
        heroAssetId &&
        matchingAssetIds.has(heroAssetId)
      ) {
        const error = new Error(
          `This image is the venue hero for ${record.venue.name}. Select another hero before deleting it.`,
        );
        error.statusCode = 409;
        throw error;
      }

      affectedVenues.push({
        ...record,
        matchingAssetIds,
      });
    }

    // Confirm the storage deletion can be attempted before changing JSON.
    const storage = text(
      image?.source?.storage,
    );

    if (
      storage === "r2" &&
      !r2Storage.enabled
    ) {
      const error = new Error(
        "R2 is not enabled. Restart the API using node --env-file=.env server/admin-api.mjs.",
      );
      error.statusCode = 409;
      throw error;
    }

    if (
      storage !== "r2" &&
      storage !== "local"
    ) {
      const error = new Error(
        "Only images uploaded through Photography Intelligence can be permanently deleted. Remove this imported image from the venue gallery instead.",
      );
      error.statusCode = 400;
      throw error;
    }

    const backups = [];

    const imageBackup =
      await createBackup(
        imagesPath,
        `${weddingSlug}-images-delete`,
      );

    if (imageBackup) {
      backups.push(imageBackup);
    }

    const collectionsPath = path.join(
      weddingDir,
      "collections.json",
    );

    const collectionsDocument =
      await readJson(
        collectionsPath,
        null,
      );

    if (collectionsDocument) {
      const collectionsBackup =
        await createBackup(
          collectionsPath,
          `${weddingSlug}-collections-delete`,
        );

      if (collectionsBackup) {
        backups.push(collectionsBackup);
      }
    }

    for (const record of affectedVenues) {
      const venueBackup =
        await createBackup(
          record.venuePath,
          `${record.venue.slug}-image-delete`,
        );

      if (venueBackup) {
        backups.push(venueBackup);
      }
    }

    imageDocument.updatedAt =
      new Date().toISOString();

    imageDocument.images =
      normaliseOrder(
        imageDocument.images.filter(
          (item) => text(item.id) !== imageId,
        ),
      );

    await writeJson(
      imagesPath,
      imageDocument,
    );

    if (
      collectionsDocument &&
      Array.isArray(
        collectionsDocument.collections,
      )
    ) {
      collectionsDocument.updatedAt =
        new Date().toISOString();

      collectionsDocument.collections =
        collectionsDocument.collections.map(
          (collection) => ({
            ...collection,
            imageIds: Array.isArray(
              collection.imageIds,
            )
              ? collection.imageIds.filter(
                  (id) => text(id) !== imageId,
                )
              : [],
          }),
        );

      await writeJson(
        collectionsPath,
        collectionsDocument,
      );
    }

    for (const record of affectedVenues) {
      const galleryImages =
        record.venue.gallery.images.filter(
          (item) =>
            !(
              text(item.imageId) === imageId &&
              text(item.weddingSlug) ===
                weddingSlug
            ),
        );

      record.venue.gallery.images =
        normaliseOrder(galleryImages);

      record.venue.gallery.updatedAt =
        new Date().toISOString();

      record.venue.updatedAt =
        new Date().toISOString();

      await writeJson(
        record.venuePath,
        record.venue,
      );
    }

    const publicVenueData =
      await publicVenuePublisher.publishAll();

    const storageWarnings =
      await deleteStoredFiles(image);

    return {
      imageId,
      weddingSlug,
      venueSlug:
        venueSlug ||
        text(image?.source?.venueSlug),
      filename: text(image.filename),
      storage,
      removedFromVenues:
        affectedVenues.length,
      backups,
      storageWarnings,
      publicVenueData,
    };
  }

  return {
    deleteImage,
  };
}
