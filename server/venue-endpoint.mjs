import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export function createVenueEndpoint({
  projectRoot,
  venuesRoot,
  weddingsRoot,
  backupDir,
  assertSafeSlug,
}) {
  async function createBackup(sourcePath, prefix) {
    await fs.mkdir(backupDir, { recursive: true });

    try {
      const existing = await fs.readFile(sourcePath, "utf8");
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

      const backupPath = path.join(
        backupDir,
        `${prefix}-${timestamp}.json`,
      );

      await fs.writeFile(backupPath, existing, "utf8");

      return path.relative(projectRoot, backupPath);
    } catch {
      return null;
    }
  }

  function validateVenue(venue) {
    const errors = [];

    if (!venue || typeof venue !== "object") {
      return ["Venue document must be an object."];
    }

    if (venue.schemaVersion !== 1) {
      errors.push("schemaVersion must be 1.");
    }

    if (!String(venue.name || "").trim()) {
      errors.push("name is required.");
    }

    if (!String(venue.slug || "").trim()) {
      errors.push("slug is required.");
    }

    return errors;
  }

  function cleanVenue(incoming, existing = {}) {
    const now = new Date().toISOString();

    return {
      schemaVersion: 1,
      id:
        existing.id ||
        incoming?.id ||
        `venue_${crypto.randomUUID()}`,
      slug: String(incoming?.slug || "").trim(),
      name: String(incoming?.name || "").trim(),
      county: String(incoming?.county || "").trim(),
      town: String(incoming?.town || "").trim(),
      intro: String(incoming?.intro || "").trim(),
      description: String(
        incoming?.description || "",
      ).trim(),
      heroImageId: String(
        incoming?.heroImageId || "",
      ).trim(),
      status:
        incoming?.status === "published" ||
        incoming?.status === "archived"
          ? incoming.status
          : "draft",
      links: {
        website: String(
          incoming?.links?.website ??
            incoming?.website ??
            "",
        ).trim(),
        instagram: String(
          incoming?.links?.instagram ??
            incoming?.instagram ??
            "",
        ).trim(),
        facebook: String(
          incoming?.links?.facebook || "",
        ).trim(),
        googleMaps: String(
          incoming?.links?.googleMaps || "",
        ).trim(),
      },
      contact: {
        email: String(
          incoming?.contact?.email || "",
        ).trim(),
        phone: String(
          incoming?.contact?.phone || "",
        ).trim(),
        coordinatorName: String(
          incoming?.contact?.coordinatorName || "",
        ).trim(),
        coordinatorEmail: String(
          incoming?.contact?.coordinatorEmail || "",
        ).trim(),
      },
      practical: {
        address: String(
          incoming?.practical?.address || "",
        ).trim(),
        parking: String(
          incoming?.practical?.parking || "",
        ).trim(),
        accommodation: String(
          incoming?.practical?.accommodation || "",
        ).trim(),
        ceremonyTypes: String(
          incoming?.practical?.ceremonyTypes || "",
        ).trim(),
        capacity: String(
          incoming?.practical?.capacity || "",
        ).trim(),
        outdoorCeremony: Boolean(
          incoming?.practical?.outdoorCeremony,
        ),
      },
      notes: {
        general: String(
          incoming?.notes?.general || "",
        ).trim(),
        portraitLocations: String(
          incoming?.notes?.portraitLocations || "",
        ).trim(),
        rainBackup: String(
          incoming?.notes?.rainBackup || "",
        ).trim(),
        sunsetNotes: String(
          incoming?.notes?.sunsetNotes || "",
        ).trim(),
        restrictions: String(
          incoming?.notes?.restrictions || "",
        ).trim(),
      },
      seo: {
        title: String(
          incoming?.seo?.title || "",
        ).trim(),
        description: String(
          incoming?.seo?.description || "",
        ).trim(),
      },
      gallery: {
        schemaVersion: 1,
        updatedAt: String(
          incoming?.gallery?.updatedAt || "",
        ).trim(),
        heroAssetId: String(
          incoming?.gallery?.heroAssetId ||
            incoming?.heroImageId ||
            "",
        ).trim(),
        images: Array.isArray(incoming?.gallery?.images)
          ? incoming.gallery.images.map((item, index) => ({
              assetId: String(item?.assetId || "").trim(),
              imageId: String(item?.imageId || "").trim(),
              weddingSlug: String(
                item?.weddingSlug || "",
              ).trim(),
              filename: String(item?.filename || "").trim(),
              order: Number(item?.order || index + 1),
              included: Boolean(item?.included),
              hidden: Boolean(item?.hidden),
              rating: Math.max(
                0,
                Math.min(5, Number(item?.rating || 0)),
              ),
              moments: Array.isArray(item?.moments)
                ? item.moments
                    .map((value) =>
                      String(value || "").trim(),
                    )
                    .filter(Boolean)
                : [],
              tags: Array.isArray(item?.tags)
                ? item.tags
                    .map((value) =>
                      String(value || "").trim(),
                    )
                    .filter(Boolean)
                : [],
              aiTags: Array.isArray(item?.aiTags)
                ? item.aiTags
                    .map((value) =>
                      String(value || "").trim(),
                    )
                    .filter(Boolean)
                : [],
              aiAlt: String(
                item?.aiAlt || "",
              ).trim(),
              aiCaption: String(
                item?.aiCaption || "",
              ).trim(),
              display: {
                venue: Boolean(item?.display?.venue),
                moments: Boolean(item?.display?.moments),
                blog: Boolean(item?.display?.blog),
                homepage: Boolean(item?.display?.homepage),
                portfolio: Boolean(item?.display?.portfolio),
              },
              thumbSrc: String(
                item?.thumbSrc || "",
              ).trim(),
              fullSrc: String(
                item?.fullSrc || "",
              ).trim(),
              source:
                item?.source &&
                typeof item.source === "object"
                  ? {
                      type: String(
                        item.source.type || "",
                      ).trim(),
                      csvRow: Number(
                        item.source.csvRow || 0,
                      ),
                      venue: String(
                        item.source.venue || "",
                      ).trim(),
                      category: String(
                        item.source.category || "",
                      ).trim(),
                    }
                  : undefined,
            }))
          : [],
      },
      createdAt: existing.createdAt || now,
      updatedAt: now,
    };
  }

  function matchesVenue(wedding, venue) {
    const linkedSlug = String(
      wedding.venueSlug || wedding.venueId || "",
    ).trim();

    const linkedName = String(
      wedding.venue || "",
    )
      .trim()
      .toLowerCase();

    return (
      linkedSlug === venue.slug ||
      linkedName === venue.name.toLowerCase()
    );
  }

  async function readVenueWeddings(venue) {
    await fs.mkdir(weddingsRoot, { recursive: true });

    const entries = await fs.readdir(weddingsRoot, {
      withFileTypes: true,
    });

    const weddings = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      try {
        const weddingPath = path.join(
          weddingsRoot,
          entry.name,
          "wedding.json",
        );

        const wedding = JSON.parse(
          await fs.readFile(weddingPath, "utf8"),
        );

        if (!matchesVenue(wedding, venue)) continue;

        let imageCount = 0;

        try {
          const imageDocument = JSON.parse(
            await fs.readFile(
              path.join(
                weddingsRoot,
                entry.name,
                "images.json",
              ),
              "utf8",
            ),
          );

          imageCount = Array.isArray(imageDocument.images)
            ? imageDocument.images.length
            : 0;
        } catch {
          imageCount = 0;
        }

        weddings.push({
          slug: wedding.slug || entry.name,
          title: wedding.title || "",
          couple: wedding.couple || "",
          weddingDate: wedding.weddingDate || "",
          status: wedding.status || "draft",
          imageCount,
        });
      } catch {
        // Ignore incomplete wedding folders.
      }
    }

    return weddings.sort((a, b) =>
      String(b.weddingDate).localeCompare(
        String(a.weddingDate),
      ),
    );
  }

  async function enrich(venue) {
    const weddings = await readVenueWeddings(venue);

    return {
      ...venue,
      weddingCount: weddings.length,
      publishedWeddingCount: weddings.filter(
        (wedding) =>
          wedding.status === "published",
      ).length,
      imageCount: weddings.reduce(
        (sum, wedding) =>
          sum + Number(wedding.imageCount || 0),
        0,
      ),
      lastWeddingDate:
        weddings.find((wedding) => wedding.weddingDate)
          ?.weddingDate || "",
      recentWeddings: weddings
        .slice(0, 6)
        .map(({ imageCount, ...wedding }) => wedding),
    };
  }

  async function listVenues() {
    await fs.mkdir(venuesRoot, { recursive: true });

    const entries = await fs.readdir(venuesRoot, {
      withFileTypes: true,
    });

    const venues = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      try {
        const rawVenue = JSON.parse(
          await fs.readFile(
            path.join(
              venuesRoot,
              entry.name,
              "venue.json",
            ),
            "utf8",
          ),
        );

        const venue = cleanVenue(rawVenue, rawVenue);
        venues.push(await enrich(venue));
      } catch (error) {
        console.error(
          `Unable to read venue ${entry.name}`,
          error,
        );
      }
    }

    return venues.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  async function readVenue(slug) {
    assertSafeSlug(slug);

    try {
      const rawVenue = JSON.parse(
        await fs.readFile(
          path.join(
            venuesRoot,
            slug,
            "venue.json",
          ),
          "utf8",
        ),
      );

      return enrich(cleanVenue(rawVenue, rawVenue));
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
  }

  async function createVenue(incoming) {
    const venue = cleanVenue(incoming);

    assertSafeSlug(venue.slug);

    const errors = validateVenue(venue);

    if (errors.length) {
      const error = new Error(
        "Venue validation failed.",
      );
      error.statusCode = 400;
      error.details = errors;
      throw error;
    }

    const venueDir = path.join(
      venuesRoot,
      venue.slug,
    );

    try {
      await fs.access(venueDir);

      const error = new Error(
        "A venue with this slug already exists.",
      );
      error.statusCode = 409;
      throw error;
    } catch (error) {
      if (error?.statusCode === 409) throw error;
    }

    await fs.mkdir(venueDir, { recursive: true });

    await fs.writeFile(
      path.join(venueDir, "venue.json"),
      `${JSON.stringify(venue, null, 2)}\n`,
      "utf8",
    );

    return enrich(venue);
  }

  async function updateVenue(routeSlug, incoming) {
    assertSafeSlug(routeSlug);

    const currentDir = path.join(
      venuesRoot,
      routeSlug,
    );

    const currentPath = path.join(
      currentDir,
      "venue.json",
    );

    let rawExisting;

    try {
      rawExisting = JSON.parse(
        await fs.readFile(currentPath, "utf8"),
      );
    } catch (error) {
      if (error?.code === "ENOENT") {
        const notFound = new Error(
          "Venue not found.",
        );
        notFound.statusCode = 404;
        throw notFound;
      }

      throw error;
    }

    const existing = cleanVenue(
      rawExisting,
      rawExisting,
    );

    const venue = cleanVenue(
      incoming,
      existing,
    );

    assertSafeSlug(venue.slug);

    const errors = validateVenue(venue);

    if (errors.length) {
      const error = new Error(
        "Venue validation failed.",
      );
      error.statusCode = 400;
      error.details = errors;
      throw error;
    }

    const backupPath = await createBackup(
      currentPath,
      `${routeSlug}-venue`,
    );

    const nextDir = path.join(
      venuesRoot,
      venue.slug,
    );

    if (routeSlug !== venue.slug) {
      try {
        await fs.access(nextDir);

        const error = new Error(
          "A venue with the new slug already exists.",
        );
        error.statusCode = 409;
        throw error;
      } catch (error) {
        if (error?.statusCode === 409) {
          throw error;
        }
      }

      await fs.rename(currentDir, nextDir);
    }

    await fs.writeFile(
      path.join(nextDir, "venue.json"),
      `${JSON.stringify(venue, null, 2)}\n`,
      "utf8",
    );

    return {
      venue: await enrich(venue),
      backupPath,
    };
  }

  async function archiveVenue(slug) {
    const existing = await readVenue(slug);

    if (!existing) {
      const error = new Error(
        "Venue not found.",
      );
      error.statusCode = 404;
      throw error;
    }

    return updateVenue(slug, {
      ...existing,
      status: "archived",
    });
  }

  return {
    listVenues,
    readVenue,
    createVenue,
    updateVenue,
    archiveVenue,
  };
}
