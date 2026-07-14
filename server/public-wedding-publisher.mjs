import fs from "node:fs/promises";
import path from "node:path";

function text(value) {
  return String(value ?? "").trim();
}

function normalise(value) {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return text(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createHttpError(
  message,
  statusCode = 400,
  details = [],
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(
      await fs.readFile(filePath, "utf8"),
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (
    let index = 0;
    index < line.length;
    index += 1
  ) {
    const character = line[index];
    const next = line[index + 1];

    if (
      character === '"' &&
      inQuotes &&
      next === '"'
    ) {
      current += '"';
      index += 1;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (
      character === "," &&
      !inQuotes
    ) {
      result.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCsv(csvText) {
  const rows = text(csvText)
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseCsvLine);

  if (rows.length < 2) return [];

  const headers = rows[0];

  return rows.slice(1).map((columns) =>
    Object.fromEntries(
      headers.map((header, index) => [
        header,
        text(columns[index]),
      ]),
    ),
  );
}

function factRowsToObject(rows, existing = {}) {
  const facts = {
    ...(existing &&
    typeof existing === "object"
      ? existing
      : {}),
  };

  const keyByLabel = new Map([
    ["season", "season"],
    ["ceremony", "ceremonyType"],
    ["ceremony type", "ceremonyType"],
    [
      "ceremony location",
      "ceremonyLocation",
    ],
    ["reception", "receptionLocation"],
    [
      "reception location",
      "receptionLocation",
    ],
    ["celebrant", "celebrant"],
    ["photography", "photographer"],
    ["photographer", "photographer"],
  ]);

  for (const row of Array.isArray(rows)
    ? rows
    : []) {
    const key = keyByLabel.get(
      normalise(row?.label),
    );

    if (key && text(row?.value)) {
      facts[key] = text(row.value);
    }
  }

  return facts;
}

function publicUrl(image, key, sourceKey) {
  return (
    text(image?.[key]) ||
    text(image?.source?.[sourceKey])
  );
}

export function createPublicWeddingPublisher({
  projectRoot,
  weddingsRoot,
  venuesRoot,
  publicDataRoot,
  legacyIndexPath,
  suppliersPath,
  storiesPath,
  publicImageBaseUrl,
}) {
  const publicBase = text(
    publicImageBaseUrl,
  ).replace(/\/+$/, "");

  async function readStoryOverrides() {
    const document =
      await readJsonIfPresent(storiesPath);

    return document &&
      typeof document.stories === "object"
      ? document.stories
      : {};
  }

  async function readSupplierRows() {
    if (!(await pathExists(suppliersPath))) {
      return [];
    }

    return parseCsv(
      await fs.readFile(
        suppliersPath,
        "utf8",
      ),
    );
  }

  async function resolveVenueLink(wedding) {
    if (text(wedding.venueSlug)) {
      return {
        venueSlug: text(wedding.venueSlug),
        venueId: text(wedding.venueId),
      };
    }

    const entries = await fs.readdir(
      venuesRoot,
      {
        withFileTypes: true,
      },
    );

    const weddingVenueName = normalise(
      wedding.venue,
    );

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const venue =
        await readJsonIfPresent(
          path.join(
            venuesRoot,
            entry.name,
            "venue.json",
          ),
        );

      if (!venue) continue;

      const sameId =
        text(wedding.venueId) &&
        text(venue.id) ===
          text(wedding.venueId);

      const sameName =
        weddingVenueName &&
        normalise(venue.name) ===
          weddingVenueName;

      if (sameId || sameName) {
        return {
          venueSlug:
            text(venue.slug) ||
            entry.name,
          venueId: text(venue.id),
        };
      }
    }

    return {
      venueSlug: "",
      venueId: text(wedding.venueId),
    };
  }

  async function buildWedding(slug) {
    const weddingDir = path.join(
      weddingsRoot,
      slug,
    );

    const weddingPath = path.join(
      weddingDir,
      "wedding.json",
    );

    const wedding =
      await readJsonIfPresent(weddingPath);

    if (!wedding) {
      throw createHttpError(
        "Wedding not found.",
        404,
      );
    }

    const [
      imagesDocument,
      collectionsDocument,
      storyOverrides,
      supplierRows,
      venueLink,
    ] = await Promise.all([
      readJsonIfPresent(
        path.join(
          weddingDir,
          "images.json",
        ),
      ),
      readJsonIfPresent(
        path.join(
          weddingDir,
          "collections.json",
        ),
      ),
      readStoryOverrides(),
      readSupplierRows(),
      resolveVenueLink(wedding),
    ]);

    const override =
      storyOverrides[slug] || {};

    const story = {
      ...wedding,
      title:
        text(override.title) ||
        text(wedding.title),
      excerpt:
        text(override.excerpt) ||
        text(wedding.excerpt),
      intro:
        text(override.intro) ||
        text(wedding.intro),
      story:
        Array.isArray(
          override.paragraphs,
        ) &&
        override.paragraphs.length
          ? override.paragraphs
              .map(text)
              .filter(Boolean)
          : Array.isArray(wedding.story)
            ? wedding.story
                .map(text)
                .filter(Boolean)
            : [],
      facts: factRowsToObject(
        override.facts,
        wedding.facts,
      ),
      venueSlug:
        text(wedding.venueSlug) ||
        venueLink.venueSlug,
      venueId:
        text(wedding.venueId) ||
        venueLink.venueId,
    };

    const csvSuppliers = supplierRows
      .filter(
        (row) =>
          normalise(row.blogSlug) ===
          normalise(slug),
      )
      .sort(
        (a, b) =>
          Number(a.sortOrder || 0) -
          Number(b.sortOrder || 0),
      )
      .map((row) => ({
        role: text(row.role),
        name: text(row.name),
        website: text(row.website),
        instagram: text(
          row.instagram,
        ).replace(/^@/, ""),
      }))
      .filter(
        (supplier) =>
          supplier.role ||
          supplier.name,
      );

    story.suppliers =
      csvSuppliers.length
        ? csvSuppliers
        : Array.isArray(wedding.suppliers)
          ? wedding.suppliers
          : [];

    const collections = Array.isArray(
      collectionsDocument?.collections,
    )
      ? collectionsDocument.collections
      : [];

    const blogCollections =
      collections.filter(
        (collection) =>
          normalise(collection.type) ===
            "blog" ||
          text(collection.id) ===
            `${slug}-blog`,
      );

    const blogCollectionIds =
      new Set([
        `${slug}-blog`,
        "blog",
        "blog-gallery",
        ...blogCollections
          .map((collection) =>
            text(collection.id),
          )
          .filter(Boolean),
      ]);

    const collectionImageIds =
      new Set(
        blogCollections.flatMap(
          (collection) =>
            Array.isArray(
              collection.imageIds,
            )
              ? collection.imageIds
                  .map(text)
                  .filter(Boolean)
              : [],
        ),
      );

    const selectedSourceImages = (
      Array.isArray(
        imagesDocument?.images,
      )
        ? imagesDocument.images
        : []
    )
      .filter((image) => {
        if (Boolean(image.hidden)) {
          return false;
        }

        const memberships =
          Array.isArray(
            image.collections,
          )
            ? image.collections
                .map(text)
                .filter(Boolean)
            : [];

        return (
          Boolean(
            image?.display?.blog,
          ) ||
          Boolean(
            image.blogIncluded,
          ) ||
          collectionImageIds.has(
            text(image.id),
          ) ||
          memberships.some(
            (membership) =>
              blogCollectionIds.has(
                membership,
              ),
          )
        );
      });

    const images =
      selectedSourceImages
      .map((image, index) => {
        const thumbSrc = publicUrl(
          image,
          "thumbSrc",
          "thumbPath",
        );

        const fullSrc = publicUrl(
          image,
          "fullSrc",
          "fullPath",
        );

        return {
          id:
            text(image.id) ||
            `${slug}-${index + 1}`,
          filename: text(
            image.filename,
          ),
          order: Number(
            image.blogOrder ??
              image.order ??
              index + 1,
          ),
          thumbSrc:
            thumbSrc || fullSrc,
          fullSrc:
            fullSrc || thumbSrc,
          alt:
            text(image.aiAlt) ||
            `${story.couple} wedding at ${story.venue}`,
          caption: text(
            image.aiCaption,
          ),
          tags: Array.isArray(
            image.aiTags,
          )
            ? image.aiTags
                .map(text)
                .filter(Boolean)
            : [],
          isCover: Boolean(
            image.isBlogCover ??
              image.isCover,
          ),
        };
      })
      .filter(
        (image) =>
          image.filename &&
          image.thumbSrc &&
          image.fullSrc,
      )
      .sort(
        (a, b) =>
          a.order - b.order,
      );

    const coverImages = images.filter(
      (image) => image.isCover,
    );

    const requiredChecks = [
      {
        id: "venue-link",
        label: "Linked venue",
        detail: story.venueSlug
          ? `Linked to ${story.venueSlug}.`
          : "Select a venue for this wedding.",
        passed: Boolean(story.venueSlug),
        severity: "required",
      },
      {
        id: "title",
        label: "Story title",
        detail:
          "Add a public wedding-story title.",
        passed: Boolean(
          text(story.title),
        ),
        severity: "required",
      },
      {
        id: "excerpt",
        label: "Story excerpt",
        detail:
          "Add the summary used on the Wedding Stories page.",
        passed: Boolean(
          text(story.excerpt),
        ),
        severity: "required",
      },
      {
        id: "intro",
        label: "Story introduction",
        detail:
          "Add the introductory paragraph.",
        passed: Boolean(
          text(story.intro),
        ),
        severity: "required",
      },
      {
        id: "paragraphs",
        label: "Story body",
        detail:
          "Add at least one story paragraph.",
        passed:
          story.story.length > 0,
        severity: "required",
      },
      {
        id: "blog-images",
        label: "Blog gallery",
        detail:
          images.length > 0
            ? `${images.length} images are assigned to the Blog Gallery collection.`
            : "Assign at least one image to the Blog Gallery collection.",
        passed: images.length > 0,
        severity: "required",
      },
      {
        id: "cover",
        label: "Blog cover",
        detail:
          coverImages.length === 1
            ? "One blog cover is selected."
            : coverImages.length === 0
              ? "Select one blog cover image."
              : "Select only one blog cover image.",
        passed:
          coverImages.length === 1,
        severity: "required",
      },
      {
        id: "public-images",
        label: "Public R2 images",
        detail:
          "Every blog image needs public full-size and thumbnail URLs.",
        passed:
          images.length ===
            selectedSourceImages.length &&
          images.every(
            (image) =>
              image.fullSrc &&
              image.thumbSrc &&
              !image.fullSrc.startsWith(
                "/uploads/",
              ) &&
              !image.thumbSrc.startsWith(
                "/uploads/",
              ) &&
              (
                !publicBase ||
                (
                  image.fullSrc.startsWith(
                    `${publicBase}/`,
                  ) &&
                  image.thumbSrc.startsWith(
                    `${publicBase}/`,
                  )
                )
              ),
          ),
        severity: "required",
      },
    ];

    const recommendedChecks = [
      {
        id: "alt-text",
        label: "Image alt text",
        detail:
          "AI alt text is recommended for every story image.",
        passed:
          images.length > 0 &&
          images.every((image) =>
            Boolean(text(image.alt)),
          ),
        severity: "recommended",
      },
      {
        id: "captions",
        label: "Image captions",
        detail:
          "AI captions are recommended for every story image.",
        passed:
          images.length > 0 &&
          images.every((image) =>
            Boolean(
              text(image.caption),
            ),
          ),
        severity: "recommended",
      },
      {
        id: "seo",
        label: "SEO overrides",
        detail:
          "Custom SEO fields are optional because the public page has standard fallbacks.",
        passed: Boolean(
          text(story.seo?.title) &&
          text(
            story.seo?.description,
          ),
        ),
        severity: "recommended",
      },
      {
        id: "suppliers",
        label: "Wedding suppliers",
        detail:
          "Supplier links are optional but useful for the story page.",
        passed:
          story.suppliers.length > 0,
        severity: "recommended",
      },
    ];

    const checks = [
      ...requiredChecks,
      ...recommendedChecks,
    ];

    const requiredPassed =
      requiredChecks.filter(
        (check) => check.passed,
      ).length;

    const recommendedPassed =
      recommendedChecks.filter(
        (check) => check.passed,
      ).length;

    const storyEnabled =
      wedding.storyEnabled === true;

    const storyStatus =
      text(wedding.storyStatus) ||
      "draft";

    const publicDocument = {
      schemaVersion: 1,
      slug,
      title: story.title,
      couple: text(story.couple),
      venue: text(story.venue),
      venueSlug: story.venueSlug,
      venueId: story.venueId,
      weddingDate: text(
        story.weddingDate,
      ),
      excerpt: story.excerpt,
      intro: story.intro,
      story: story.story,
      facts: story.facts,
      suppliers: story.suppliers,
      seo:
        story.seo &&
        typeof story.seo ===
          "object"
          ? story.seo
          : {},
      status: text(story.status) ||
        "draft",
      storyEnabled: true,
      storyStatus: "published",
      storyPublishedAt:
        text(
          wedding.storyPublishedAt,
        ),
      updatedAt:
        text(wedding.updatedAt),
      images,
    };

    return {
      slug,
      weddingPath,
      wedding,
      story,
      storyEnabled,
      storyStatus,
      images,
      coverImage:
        coverImages[0] || null,
      checks,
      requiredPassed,
      requiredTotal:
        requiredChecks.length,
      recommendedPassed,
      recommendedTotal:
        recommendedChecks.length,
      readyToPublish:
        requiredPassed ===
        requiredChecks.length,
      publicDocument,
    };
  }

  function summaryFromDocument(
    document,
  ) {
    const coverImage =
      document.images.find(
        (image) => image.isCover,
      ) || document.images[0];

    return {
      slug: document.slug,
      title: document.title,
      couple: document.couple,
      venue: document.venue,
      venueSlug:
        document.venueSlug,
      weddingDate:
        document.weddingDate,
      excerpt: document.excerpt,
      intro: document.intro,
      seo: document.seo || {},
      updatedAt:
        document.updatedAt || null,
      storyEnabled: true,
      storyStatus: "published",
      storyPublishedAt:
        document.storyPublishedAt ||
        null,
      imageCount:
        document.images.length,
      coverImage:
        coverImage || null,
    };
  }

  async function publishAll() {
    await fs.mkdir(publicDataRoot, {
      recursive: true,
    });

    await fs.mkdir(weddingsRoot, {
      recursive: true,
    });

    const entries = await fs.readdir(
      weddingsRoot,
      {
        withFileTypes: true,
      },
    );

    const generatedAt =
      new Date().toISOString();

    const managedSlugs = [];
    const publishedDocuments = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const wedding =
        await readJsonIfPresent(
          path.join(
            weddingsRoot,
            entry.name,
            "wedding.json",
          ),
        );

      if (!wedding) continue;

      /*
       * Only explicit storyEnabled values take ownership from the legacy
       * weddingStories.ts/blog-gallery.csv pipeline. This keeps old stories
       * live until they are deliberately migrated.
       */
      if (
        typeof wedding.storyEnabled ===
        "boolean"
      ) {
        managedSlugs.push(entry.name);
      }

      if (
        wedding.storyEnabled !== true ||
        wedding.storyStatus !==
          "published"
      ) {
        continue;
      }

      const built =
        await buildWedding(entry.name);

      if (!built.readyToPublish) {
        throw createHttpError(
          `${built.story.title || entry.name} is marked published but is not ready.`,
          400,
          built.checks
            .filter(
              (check) =>
                check.severity ===
                  "required" &&
                !check.passed,
            )
            .map(
              (check) =>
                `${check.label}: ${check.detail}`,
            ),
        );
      }

      publishedDocuments.push(
        built.publicDocument,
      );
    }

    const publishedSlugs = new Set(
      publishedDocuments.map(
        (document) => document.slug,
      ),
    );

    for (const document of publishedDocuments) {
      await fs.writeFile(
        path.join(
          publicDataRoot,
          `${document.slug}.json`,
        ),
        `${JSON.stringify(
          document,
          null,
          2,
        )}\n`,
        "utf8",
      );
    }

    const existingPublicFiles =
      await fs.readdir(
        publicDataRoot,
        {
          withFileTypes: true,
        },
      );

    for (const entry of existingPublicFiles) {
      if (
        !entry.isFile() ||
        entry.name === "index.json" ||
        !entry.name.endsWith(".json")
      ) {
        continue;
      }

      const slug = entry.name.replace(
        /\.json$/i,
        "",
      );

      if (!publishedSlugs.has(slug)) {
        await fs.rm(
          path.join(
            publicDataRoot,
            entry.name,
          ),
          {
            force: true,
          },
        );
      }
    }

    const summaries =
      publishedDocuments
        .map(summaryFromDocument)
        .sort(
          (a, b) =>
            String(
              b.storyPublishedAt ||
                b.updatedAt ||
                "",
            ).localeCompare(
              String(
                a.storyPublishedAt ||
                  a.updatedAt ||
                  "",
              ),
            ) ||
            b.weddingDate.localeCompare(
              a.weddingDate,
            ),
        );

    const index = {
      schemaVersion: 1,
      generatedAt,
      count: summaries.length,
      managedSlugs:
        managedSlugs.sort(),
      weddings: summaries,
    };

    const indexPath = path.join(
      publicDataRoot,
      "index.json",
    );

    await fs.writeFile(
      indexPath,
      `${JSON.stringify(
        index,
        null,
        2,
      )}\n`,
      "utf8",
    );

    /*
     * Compatibility index for older admin/public code while the new
     * wedding-data repository is adopted.
     */
    const legacyIndex = {
      schemaVersion: 1,
      generatedAt,
      count: summaries.length,
      weddings: summaries.map(
        (wedding) => ({
          ...wedding,
          status: "published",
        }),
      ),
    };

    await fs.writeFile(
      legacyIndexPath,
      `${JSON.stringify(
        legacyIndex,
        null,
        2,
      )}\n`,
      "utf8",
    );

    return {
      generatedAt,
      venueCount: 0,
      weddingCount:
        summaries.length,
      imageCount:
        publishedDocuments.reduce(
          (total, document) =>
            total +
            document.images.length,
          0,
        ),
      outputPath: path.relative(
        projectRoot,
        publicDataRoot,
      ),
      indexPath: path.relative(
        projectRoot,
        indexPath,
      ),
      legacyIndexPath: path.relative(
        projectRoot,
        legacyIndexPath,
      ),
      managedSlugs:
        managedSlugs.sort(),
    };
  }

  return {
    buildWedding,
    publishAll,
  };
}
