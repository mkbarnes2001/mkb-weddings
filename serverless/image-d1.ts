type D1Db = any;
type R2BucketLike = any;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function json<T = any>(value: unknown, fallback: T): T {
  try {
    if (typeof value === "string") return JSON.parse(value) as T;
    return (value ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function httpError(
  message: string,
  statusCode = 400,
  details: string[] = [],
) {
  const error = new Error(message) as Error & {
    statusCode?: number;
    details?: string[];
  };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function assertSlug(value: string, label: string) {
  if (!value || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw httpError(`Invalid ${label}.`, 400);
  }
}

function safeBaseName(value: string) {
  const withoutExtension = text(value).replace(/\.[^.]+$/, "");
  return (
    withoutExtension
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 120) || "image"
  );
}

function orientation(width: number, height: number) {
  if (!width || !height) return "unknown";
  if (width > height) return "landscape";
  if (height > width) return "portrait";
  return "square";
}

function normalisePublicBaseUrl(value: unknown) {
  return (text(value) || "https://images.mkbweddings.co.uk").replace(/\/+$/, "");
}

function galleryImages(document: any) {
  return Array.isArray(document?.gallery?.images)
    ? document.gallery.images
    : [];
}

function imageMatches(item: any, assetKey: string, weddingSlug: string, imageId: string) {
  return (
    text(item?.assetId) === assetKey ||
    (text(item?.weddingSlug) === weddingSlug && text(item?.imageId) === imageId)
  );
}

function isPublishedVenueImageVisible(item: any) {
  const display =
    item?.display && typeof item.display === "object"
      ? item.display
      : null;

  const hasDraftVisibilityMetadata =
    Object.prototype.hasOwnProperty.call(item || {}, "included") ||
    Object.prototype.hasOwnProperty.call(item || {}, "hidden") ||
    Boolean(
      display &&
      Object.prototype.hasOwnProperty.call(display, "venue"),
    );

  // Current published venue snapshots retain the full draft gallery and rely
  // on these visibility flags when they are rendered publicly. Older snapshots
  // were already filtered before being stored and intentionally omit them.
  if (!hasDraftVisibilityMetadata) {
    return true;
  }

  return Boolean(
    item?.included &&
    !item?.hidden &&
    display?.venue,
  );
}

export async function registerUploadedImage(
  db: D1Db,
  input: {
    venueSlug: string;
    weddingSlug: string;
    imageId: string;
    filename: string;
    originalFilename: string;
    originalMimeType: string;
    fullKey: string;
    thumbKey: string;
    fullSrc: string;
    thumbSrc: string;
    width: number;
    height: number;
  },
  workspaceId = "workspace_mkb_weddings",
) {
  const venueSlug = text(input.venueSlug);
  const weddingSlug = text(input.weddingSlug);
  const imageId = text(input.imageId);

  assertSlug(venueSlug, "venue slug");
  assertSlug(weddingSlug, "wedding slug");
  if (!imageId) throw httpError("Image ID is required.", 400);

  const [venueRow, weddingRow] = await Promise.all([
    db.prepare(`SELECT * FROM venues WHERE slug = ? AND workspace_id = ?`).bind(venueSlug, workspaceId).first(),
    db.prepare(`SELECT * FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(weddingSlug, workspaceId).first(),
  ]);

  if (!venueRow) throw httpError("Venue not found.", 404);
  if (!weddingRow) {
    throw httpError(
      "Wedding not found. Create the wedding before uploading images.",
      404,
    );
  }

  const venueName = text(venueRow.name).toLowerCase();
  const linkedVenueSlug = text(weddingRow.venue_slug);
  const linkedVenueName = text(weddingRow.venue).toLowerCase();

  if (
    linkedVenueSlug &&
    linkedVenueSlug !== venueSlug &&
    linkedVenueName !== venueName
  ) {
    throw httpError(
      "The selected wedding is linked to a different venue.",
      409,
    );
  }

  const assetKey = `${weddingSlug}:${imageId}`;
  const assetId = `asset:${assetKey}`;
  const source = {
    type: "r2-browser-upload",
    originalFilename: text(input.originalFilename),
    originalMimeType: text(input.originalMimeType),
    venueSlug,
    storage: "r2",
    fullKey: text(input.fullKey),
    thumbKey: text(input.thumbKey),
    fullPath: text(input.fullSrc),
    thumbPath: text(input.thumbSrc),
    width: Number(input.width || 0),
    height: Number(input.height || 0),
    orientation: orientation(Number(input.width || 0), Number(input.height || 0)),
  };

  const [weddingOrderRow, venueOrderRow] = await Promise.all([
    db.prepare(`
      SELECT COALESCE(MAX(sort_order), 0) AS max_order
      FROM wedding_images
      WHERE wedding_slug = ? AND workspace_id = ?
    `).bind(weddingSlug, workspaceId).first(),
    db.prepare(`
      SELECT COALESCE(MAX(sort_order), 0) AS max_order
      FROM venue_images
      WHERE venue_slug = ? AND workspace_id = ?
    `).bind(venueSlug, workspaceId).first(),
  ]);

  const weddingOrder = Number(weddingOrderRow?.max_order || 0) + 1;
  const venueOrder = Number(venueOrderRow?.max_order || 0) + 1;
  const now = new Date().toISOString();

  const venueDocument = json(venueRow.document_json, {} as any);
  const currentGallery =
    venueDocument.gallery && typeof venueDocument.gallery === "object"
      ? venueDocument.gallery
      : {};
  const currentImages = galleryImages(venueDocument).filter(
    (item: any) => !imageMatches(item, assetKey, weddingSlug, imageId),
  );

  const venueImage = {
    assetId: assetKey,
    imageId,
    weddingSlug,
    filename: text(input.filename),
    order: venueOrder,
    included: false,
    hidden: false,
    rating: 0,
    moments: [],
    tags: [],
    aiTags: [],
    aiAlt: "",
    aiCaption: "",
    thumbSrc: text(input.thumbSrc),
    fullSrc: text(input.fullSrc),
    source,
    display: {
      venue: false,
      moments: false,
      blog: false,
      homepage: false,
      portfolio: false,
      creativeFlash: false,
    },
  };

  const nextVenueDocument = {
    ...venueDocument,
    gallery: {
      ...currentGallery,
      schemaVersion: 1,
      updatedAt: now,
      heroAssetId: text(currentGallery.heroAssetId || venueDocument.heroImageId || venueRow.hero_asset_id),
      images: [...currentImages, venueImage],
    },
    updatedAt: now,
  };

  await db.batch([
    db.prepare(`
      INSERT INTO images (
        asset_key, image_id, wedding_slug, filename, full_src, thumb_src,
        alt, caption, tags_json, ai_tags_json, source_type, source_json,
        width, height, orientation, updated_at, workspace_id
      ) VALUES (?, ?, ?, ?, ?, ?, '', '', '[]', '[]', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `).bind(
      assetKey,
      imageId,
      weddingSlug,
      text(input.filename),
      text(input.fullSrc),
      text(input.thumbSrc),
      source.type,
      JSON.stringify(source),
      Number(input.width || 0) || null,
      Number(input.height || 0) || null,
      source.orientation,
      workspaceId,
    ),
    db.prepare(`
      INSERT OR IGNORE INTO assets (
        id, workspace_id, legacy_asset_key, image_id, original_filename, filename,
        mime_type, width, height, checksum, source_type, source_json, status,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `).bind(
      assetId,
      workspaceId,
      assetKey,
      imageId,
      text(input.originalFilename),
      text(input.filename),
      text(input.originalMimeType),
      Number(input.width || 0) || null,
      Number(input.height || 0) || null,
      source.type,
      JSON.stringify(source),
    ),
    db.prepare(`
      INSERT OR REPLACE INTO asset_files (
        asset_id, variant, storage_key, url, mime_type, width, height,
        access_level, status, created_at, updated_at
      ) VALUES (?, 'web', ?, ?, ?, ?, ?, 'public', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      assetId,
      text(input.fullKey),
      text(input.fullSrc),
      '',
      Number(input.width || 0) || null,
      Number(input.height || 0) || null,
    ),
    db.prepare(`
      INSERT OR REPLACE INTO asset_files (
        asset_id, variant, storage_key, url, mime_type, width, height,
        access_level, status, created_at, updated_at
      ) VALUES (?, 'thumb', ?, ?, ?, NULL, NULL, 'public', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      assetId,
      text(input.thumbKey),
      text(input.thumbSrc),
      '',
    ),
    db.prepare(`
      INSERT INTO wedding_images (
        wedding_slug, asset_key, sort_order, is_cover, hidden, rating, collections_json, workspace_id
      ) VALUES (?, ?, ?, 0, 0, 0, '[]', ?)
    `).bind(weddingSlug, assetKey, weddingOrder, workspaceId),
    db.prepare(`
      INSERT OR IGNORE INTO asset_wedding_links (
        asset_id, wedding_slug, sort_order, is_primary, workspace_id
      ) VALUES (?, ?, ?, 1, ?)
    `).bind(assetId, weddingSlug, weddingOrder, workspaceId),
    db.prepare(`
      INSERT INTO venue_images (
        venue_slug, asset_key, sort_order, included, hidden, rating, is_hero,
        moments_json, display_json, workspace_id
      ) VALUES (?, ?, ?, 0, 0, 0, 0, '[]', ?, ?)
    `).bind(
      venueSlug,
      assetKey,
      venueOrder,
      JSON.stringify(venueImage.display),
      workspaceId,
    ),
    db.prepare(`
      INSERT OR IGNORE INTO asset_venue_links (
        asset_id, venue_slug, sort_order, is_primary, workspace_id
      ) VALUES (?, ?, ?, 1, ?)
    `).bind(assetId, venueSlug, venueOrder, workspaceId),
    db.prepare(`
      UPDATE venues
      SET document_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE slug = ? AND workspace_id = ?
    `).bind(JSON.stringify(nextVenueDocument), venueSlug, workspaceId),
  ]);

  return {
    assetKey,
    imageId,
    filename: text(input.filename),
    weddingSlug,
    venueSlug,
    storage: "r2" as const,
    fullSrc: text(input.fullSrc),
    thumbSrc: text(input.thumbSrc),
    fullKey: text(input.fullKey),
    thumbKey: text(input.thumbKey),
    width: Number(input.width || 0),
    height: Number(input.height || 0),
    orientation: source.orientation,
  };
}

export async function createR2Upload(
  bucket: R2BucketLike,
  env: { IMAGE_PUBLIC_BASE_URL?: string },
  input: {
    venueSlug: string;
    weddingSlug: string;
    originalFilename: string;
    originalMimeType: string;
    fullFile: File;
    thumbFile: File;
    width: number;
    height: number;
  },
  workspaceId = "workspace_mkb_weddings",
) {
  if (!bucket) throw httpError("R2 image binding is not configured.", 500);

  const venueSlug = text(input.venueSlug);
  const weddingSlug = text(input.weddingSlug);
  assertSlug(venueSlug, "venue slug");
  assertSlug(weddingSlug, "wedding slug");

  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(input.fullFile.type) || !allowedTypes.has(input.thumbFile.type)) {
    throw httpError("Only JPEG, PNG and WebP files are supported.", 415);
  }

  // Browser processing normally produces files well below these limits. These
  // caps protect the Function from unexpectedly large multipart payloads.
  if (input.fullFile.size > 15 * 1024 * 1024) {
    throw httpError("Processed full image exceeds the 15 MB upload limit.", 413);
  }
  if (input.thumbFile.size > 5 * 1024 * 1024) {
    throw httpError("Processed thumbnail exceeds the 5 MB upload limit.", 413);
  }

  const imageId = `image_${crypto.randomUUID()}`;
  const suffix = imageId.slice(-8);
  const baseName = safeBaseName(input.originalFilename);
  const extension = input.fullFile.type === "image/webp"
    ? "webp"
    : input.fullFile.type === "image/png"
      ? "png"
      : "jpg";
  const filename = `${weddingSlug}-${baseName}-${suffix}.${extension}`;
  const fullKey = `workspaces/${workspaceId}/full/${weddingSlug}/${filename}`;
  const thumbKey = `workspaces/${workspaceId}/thumb/${weddingSlug}/${filename}`;
  const publicBaseUrl = normalisePublicBaseUrl(env.IMAGE_PUBLIC_BASE_URL);

  await bucket.put(fullKey, input.fullFile, {
    httpMetadata: {
      contentType: input.fullFile.type,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      workspaceId,
      weddingSlug,
      venueSlug,
      imageId,
      variant: "full",
    },
  });

  try {
    await bucket.put(thumbKey, input.thumbFile, {
      httpMetadata: {
        contentType: input.thumbFile.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        workspaceId,
        weddingSlug,
        venueSlug,
        imageId,
        variant: "thumb",
      },
    });
  } catch (error) {
    await bucket.delete(fullKey).catch(() => {});
    throw error;
  }

  return {
    imageId,
    filename,
    fullKey,
    thumbKey,
    fullSrc: `${publicBaseUrl}/${fullKey}`,
    thumbSrc: `${publicBaseUrl}/${thumbKey}`,
    width: Number(input.width || 0),
    height: Number(input.height || 0),
    originalFilename: text(input.originalFilename),
    originalMimeType: text(input.originalMimeType),
    venueSlug,
    weddingSlug,
  };
}

export async function deleteManagedImage(
  db: D1Db,
  bucket: R2BucketLike,
  input: {
    weddingSlug: string;
    imageId: string;
    venueSlug?: string;
  },
  workspaceId = "workspace_mkb_weddings",
) {
  const weddingSlug = text(input.weddingSlug);
  const imageId = text(input.imageId);
  assertSlug(weddingSlug, "wedding slug");
  if (!imageId || imageId.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(imageId)) {
    throw httpError("Invalid image ID.", 400);
  }

  const row = await db.prepare(`
    SELECT *
    FROM images
    WHERE wedding_slug = ? AND image_id = ? AND workspace_id = ?
    LIMIT 1
  `).bind(weddingSlug, imageId, workspaceId).first();

  if (!row) throw httpError("Image not found in the wedding record.", 404);

  const assetKey = text(row.asset_key);
  const source = json(row.source_json, {} as any);
  const storage = text(source.storage);
  const fullKey = text(source.fullKey);
  const thumbKey = text(source.thumbKey);

  if (storage !== "r2" || (!fullKey && !thumbKey)) {
    throw httpError(
      "Only images uploaded through Photography Intelligence with managed R2 storage can be permanently deleted. Remove this imported image from the gallery instead.",
      400,
    );
  }

  if (!bucket) throw httpError("R2 image binding is not configured.", 500);

  const cover = await db.prepare(`
    SELECT 1 AS found
    FROM wedding_images
    WHERE wedding_slug = ? AND asset_key = ? AND workspace_id = ? AND is_cover = 1
    LIMIT 1
  `).bind(weddingSlug, assetKey, workspaceId).first();
  if (cover) {
    throw httpError(
      "This image is the wedding cover. Select another wedding cover before deleting it.",
      409,
    );
  }

  const hero = await db.prepare(`
    SELECT v.name AS venue_name
    FROM venue_images vi
    JOIN venues v ON v.slug = vi.venue_slug AND v.workspace_id = vi.workspace_id
    WHERE vi.asset_key = ? AND vi.workspace_id = ? AND vi.is_hero = 1
    LIMIT 1
  `).bind(assetKey, workspaceId).first();
  if (hero) {
    throw httpError(
      `This image is the venue hero for ${text(hero.venue_name) || "a venue"}. Select another hero before deleting it.`,
      409,
    );
  }

  const publishedStory = await db.prepare(`
    SELECT w.title
    FROM published_story_images psi
    JOIN weddings w ON w.slug = psi.wedding_slug AND w.workspace_id = psi.workspace_id
    WHERE psi.asset_key = ?
      AND psi.workspace_id = ?
      AND w.story_enabled = 1
      AND w.story_status = 'published'
    LIMIT 1
  `).bind(assetKey, workspaceId).first();
  if (publishedStory) {
    throw httpError(
      "This image is currently used by a published wedding story. Remove it from the Blog collection and publish the story again before permanently deleting it.",
      409,
    );
  }

  const venueRows = await db.prepare(`
    SELECT slug, name, document_json, published_json
    FROM venues
    WHERE workspace_id = ?
    ORDER BY slug ASC
  `).bind(workspaceId).all();

  const draftVenueUpdates: Array<{ slug: string; document: any }> = [];
  const publishedVenueNames: string[] = [];

  for (const venue of venueRows.results || []) {
    const published = json(venue.published_json, {} as any);
    const publishedMatch = galleryImages(published).some((item: any) =>
      isPublishedVenueImageVisible(item) &&
      imageMatches(item, assetKey, weddingSlug, imageId),
    );
    if (publishedMatch) {
      publishedVenueNames.push(text(venue.name) || text(venue.slug));
    }

    const draft = json(venue.document_json, {} as any);
    const images = galleryImages(draft);
    if (!images.some((item: any) => imageMatches(item, assetKey, weddingSlug, imageId))) {
      continue;
    }

    const now = new Date().toISOString();
    draftVenueUpdates.push({
      slug: text(venue.slug),
      document: {
        ...draft,
        gallery: {
          ...(draft.gallery || {}),
          updatedAt: now,
          images: images
            .filter((item: any) => !imageMatches(item, assetKey, weddingSlug, imageId))
            .map((item: any, index: number) => ({ ...item, order: index + 1 })),
        },
        updatedAt: now,
      },
    });
  }

  if (publishedVenueNames.length) {
    throw httpError(
      "This image is currently visible on a published venue page. Remove it from the venue gallery and publish the venue before permanently deleting it.",
      409,
      publishedVenueNames.map((name) => `Published venue: ${name}`),
    );
  }

  const statements: any[] = [];
  for (const update of draftVenueUpdates) {
    statements.push(
      db.prepare(`
        UPDATE venues
        SET document_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE slug = ? AND workspace_id = ?
      `).bind(JSON.stringify(update.document), update.slug, workspaceId),
    );
  }

  const assetId = `asset:${assetKey}`;

  statements.push(
    db.prepare(`DELETE FROM asset_gallery_links WHERE asset_id = ? AND workspace_id = ?`).bind(assetId, workspaceId),
    db.prepare(`DELETE FROM asset_moment_links WHERE asset_id = ? AND workspace_id = ?`).bind(assetId, workspaceId),
    db.prepare(`DELETE FROM asset_venue_links WHERE asset_id = ? AND workspace_id = ?`).bind(assetId, workspaceId),
    db.prepare(`DELETE FROM asset_wedding_links WHERE asset_id = ? AND workspace_id = ?`).bind(assetId, workspaceId),
    db.prepare(`DELETE FROM asset_files WHERE asset_id = ?`).bind(assetId),
    db.prepare(`DELETE FROM collection_images WHERE asset_key = ? AND workspace_id = ?`).bind(assetKey, workspaceId),
    db.prepare(`DELETE FROM venue_images WHERE asset_key = ? AND workspace_id = ?`).bind(assetKey, workspaceId),
    db.prepare(`DELETE FROM story_images WHERE asset_key = ? AND workspace_id = ?`).bind(assetKey, workspaceId),
    db.prepare(`DELETE FROM published_story_images WHERE asset_key = ? AND workspace_id = ?`).bind(assetKey, workspaceId),
    db.prepare(`DELETE FROM wedding_images WHERE asset_key = ? AND workspace_id = ?`).bind(assetKey, workspaceId),
    db.prepare(`DELETE FROM assets WHERE id = ? AND workspace_id = ?`).bind(assetId, workspaceId),
    db.prepare(`DELETE FROM images WHERE asset_key = ? AND workspace_id = ?`).bind(assetKey, workspaceId),
  );

  await db.batch(statements);

  const storageWarnings: string[] = [];
  for (const key of [fullKey, thumbKey]) {
    if (!key) continue;
    try {
      await bucket.delete(key);
    } catch (error) {
      storageWarnings.push(
        `Unable to delete R2 object ${key}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  return {
    imageId,
    weddingSlug,
    venueSlug: text(input.venueSlug || source.venueSlug),
    filename: text(row.filename),
    storage: "r2" as const,
    removedFromVenues: draftVenueUpdates.length,
    backups: [] as string[],
    storageWarnings,
  };
}
