import fs from "node:fs/promises";
import path from "node:path";

function text(value) {
  return String(value || "").trim();
}

function titleFromSlug(value) {
  return text(value)
    .split("-")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(" ");
}

function stringList(value) {
  return Array.isArray(value)
    ? [
        ...new Set(
          value
            .map(text)
            .filter(Boolean),
        ),
      ]
    : [];
}

function inferCountry(county) {
  const value = text(county).toLowerCase();

  const irelandCounties = new Set([
    "cavan",
    "county cavan",
    "donegal",
    "county donegal",
    "leitrim",
    "county leitrim",
    "louth",
    "county louth",
    "meath",
    "county meath",
    "monaghan",
    "county monaghan",
  ]);

  return irelandCounties.has(value)
    ? "Ireland"
    : "Northern Ireland";
}

function publicImage(item, venue) {
  const moments = stringList(item?.moments);
  const tags = stringList(item?.tags);
  const aiTags = stringList(item?.aiTags);

  const momentLabel =
    text(item?.source?.category) ||
    titleFromSlug(moments[0]);

  const fallbackAlt =
    `${text(venue?.name)} wedding photography${
      momentLabel ? ` – ${momentLabel}` : ""
    }`;

  return {
    assetId: text(item?.assetId),
    imageId: text(item?.imageId),
    weddingSlug: text(item?.weddingSlug),
    filename: text(item?.filename),
    order: Number(item?.order || 0),
    rating: Number(item?.rating || 0),
    moments,
    tags,
    aiTags,
    thumbSrc: text(item?.thumbSrc),
    fullSrc: text(item?.fullSrc),
    alt: text(item?.aiAlt) || fallbackAlt,
    caption: text(item?.aiCaption),
  };
}

function createPublicVenue(rawVenue) {
  const sourceImages = Array.isArray(
    rawVenue?.gallery?.images,
  )
    ? rawVenue.gallery.images
    : [];

  const images = sourceImages
    .filter(
      (item) =>
        Boolean(item?.included) &&
        !Boolean(item?.hidden) &&
        Boolean(item?.display?.venue) &&
        Boolean(text(item?.thumbSrc)) &&
        Boolean(text(item?.fullSrc)),
    )
    .map((item) => publicImage(item, rawVenue))
    .sort((a, b) => a.order - b.order);

  const requestedHeroId =
    text(rawVenue?.gallery?.heroAssetId) ||
    text(rawVenue?.heroImageId);

  const hero =
    images.find(
      (image) => image.assetId === requestedHeroId,
    ) || images[0] || null;

  const county = text(rawVenue?.county);

  return {
    schemaVersion: 1,
    id: text(rawVenue?.id),
    slug: text(rawVenue?.slug),
    name: text(rawVenue?.name),
    town: text(rawVenue?.town),
    county,
    country:
      text(rawVenue?.country) ||
      inferCountry(county),
    intro: text(rawVenue?.intro),
    description: text(rawVenue?.description),
    status: text(rawVenue?.status) || "draft",
    updatedAt: text(rawVenue?.updatedAt),
    links: {
      website: text(rawVenue?.links?.website),
      instagram: text(rawVenue?.links?.instagram),
      facebook: text(rawVenue?.links?.facebook),
      googleMaps: text(rawVenue?.links?.googleMaps),
    },
    practical: {
      address: text(rawVenue?.practical?.address),
      parking: text(rawVenue?.practical?.parking),
      accommodation: text(
        rawVenue?.practical?.accommodation,
      ),
      ceremonyTypes: text(
        rawVenue?.practical?.ceremonyTypes,
      ),
      capacity: text(rawVenue?.practical?.capacity),
      outdoorCeremony: Boolean(
        rawVenue?.practical?.outdoorCeremony,
      ),
    },
    seo: {
      title: text(rawVenue?.seo?.title),
      description: text(
        rawVenue?.seo?.description,
      ),
    },
    gallery: {
      schemaVersion: 1,
      updatedAt: text(
        rawVenue?.gallery?.updatedAt,
      ),
      heroAssetId: hero?.assetId || "",
      images,
    },
  };
}

export function createPublicVenuePublisher({
  projectRoot,
  venuesRoot,
  publicDataRoot,
}) {
  async function readVenueDocuments() {
    await fs.mkdir(venuesRoot, { recursive: true });

    const entries = await fs.readdir(venuesRoot, {
      withFileTypes: true,
    });

    const venues = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      try {
        const venue = JSON.parse(
          await fs.readFile(
            path.join(
              venuesRoot,
              entry.name,
              "venue.json",
            ),
            "utf8",
          ),
        );

        venues.push(createPublicVenue(venue));
      } catch (error) {
        console.error(
          `Unable to publish venue ${entry.name}`,
          error,
        );
      }
    }

    return venues;
  }

  async function publishAll() {
    const documents = await readVenueDocuments();

    const publicVenues = documents
      .filter(
        (venue) =>
          venue.status !== "archived" &&
          venue.slug &&
          venue.name &&
          venue.gallery.images.length > 0,
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    await fs.rm(publicDataRoot, {
      recursive: true,
      force: true,
    });
    await fs.mkdir(publicDataRoot, {
      recursive: true,
    });

    for (const venue of publicVenues) {
      await fs.writeFile(
        path.join(
          publicDataRoot,
          `${venue.slug}.json`,
        ),
        `${JSON.stringify(venue, null, 2)}\n`,
        "utf8",
      );
    }

    const index = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      count: publicVenues.length,
      imageCount: publicVenues.reduce(
        (sum, venue) =>
          sum + venue.gallery.images.length,
        0,
      ),
      venues: publicVenues.map((venue) => {
        const hero =
          venue.gallery.images.find(
            (image) =>
              image.assetId ===
              venue.gallery.heroAssetId,
          ) || venue.gallery.images[0];

        return {
          id: venue.id,
          slug: venue.slug,
          name: venue.name,
          town: venue.town,
          county: venue.county,
          country: venue.country,
          status: venue.status,
          updatedAt: venue.updatedAt,
          imageCount: venue.gallery.images.length,
          heroAssetId:
            venue.gallery.heroAssetId,
          coverThumb: hero?.thumbSrc || "",
          coverFull: hero?.fullSrc || "",
          coverAlt:
            hero?.alt ||
            `${venue.name} wedding photography`,
          coverCaption: hero?.caption || "",
        };
      }),
    };

    const indexPath = path.join(
      publicDataRoot,
      "index.json",
    );

    await fs.writeFile(
      indexPath,
      `${JSON.stringify(index, null, 2)}\n`,
      "utf8",
    );

    return {
      generatedAt: index.generatedAt,
      venueCount: index.count,
      imageCount: index.imageCount,
      outputPath: path.relative(
        projectRoot,
        publicDataRoot,
      ),
      indexPath: path.relative(
        projectRoot,
        indexPath,
      ),
    };
  }

  return {
    publishAll,
  };
}
