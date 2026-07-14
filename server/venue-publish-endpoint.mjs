import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function text(value) {
  return String(value || "").trim();
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

async function readJson(filePath) {
  return JSON.parse(
    await fs.readFile(filePath, "utf8"),
  );
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function createVenuePublishEndpoint({
  projectRoot,
  venuesRoot,
  weddingsRoot,
  publicDataRoot,
  assertSafeSlug,
  publicVenuePublisher,
  publicImageBaseUrl,
}) {
  const publicBase =
    text(publicImageBaseUrl)
      .replace(/\/+$/, "");

  async function runGit(args, {
    allowExitCodes = [0],
  } = {}) {
    try {
      const result = await execFileAsync(
        "git",
        args,
        {
          cwd: projectRoot,
          maxBuffer: 10 * 1024 * 1024,
        },
      );

      return {
        stdout: text(result.stdout),
        stderr: text(result.stderr),
        exitCode: 0,
      };
    } catch (error) {
      const exitCode =
        Number(error?.code) || 1;

      if (allowExitCodes.includes(exitCode)) {
        return {
          stdout: text(error?.stdout),
          stderr: text(error?.stderr),
          exitCode,
        };
      }

      throw createHttpError(
        `Git command failed: git ${args.join(" ")}`,
        500,
        [
          text(error?.stderr) ||
            text(error?.stdout) ||
            text(error?.message),
        ].filter(Boolean),
      );
    }
  }

  function validateVenueForPublish(venue) {
    const galleryImages = Array.isArray(
      venue?.gallery?.images,
    )
      ? venue.gallery.images
      : [];

    const publicImages =
      galleryImages.filter(
        (image) =>
          Boolean(image.included) &&
          !Boolean(image.hidden) &&
          Boolean(image?.display?.venue),
      );

    const errors = [];

    if (!publicImages.length) {
      errors.push(
        "The venue has no images enabled for its public gallery.",
      );
    }

    const heroAssetId = text(
      venue?.gallery?.heroAssetId ||
        venue?.heroImageId,
    );

    const hero = publicImages.find(
      (image) =>
        text(image.assetId) === heroAssetId,
    );

    if (!heroAssetId) {
      errors.push(
        "Select a venue hero image before publishing.",
      );
    } else if (!hero) {
      errors.push(
        "The selected venue hero is hidden, excluded, or not enabled for the venue page.",
      );
    }

    for (const image of publicImages) {
      const fullSrc = text(image.fullSrc);
      const thumbSrc = text(image.thumbSrc);

      if (!fullSrc || !thumbSrc) {
        errors.push(
          `${image.filename}: missing full or thumbnail URL.`,
        );
        continue;
      }

      if (
        fullSrc.startsWith("/uploads/") ||
        thumbSrc.startsWith("/uploads/")
      ) {
        errors.push(
          `${image.filename}: stored locally. Upload it to R2 before publishing.`,
        );
        continue;
      }

      if (
        publicBase &&
        (
          !fullSrc.startsWith(
            `${publicBase}/`,
          ) ||
          !thumbSrc.startsWith(
            `${publicBase}/`,
          )
        )
      ) {
        errors.push(
          `${image.filename}: public URLs are not using ${publicBase}.`,
        );
      }
    }

    if (errors.length) {
      throw createHttpError(
        "Venue publication validation failed.",
        400,
        errors,
      );
    }

    return {
      publicImages,
      heroAssetId,
    };
  }

  function normalise(value) {
    return text(value).toLowerCase();
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

  async function relatedWeddingFiles(venue) {
    await fs.mkdir(weddingsRoot, {
      recursive: true,
    });

    const galleryWeddingSlugs = new Set(
      (
        Array.isArray(venue?.gallery?.images)
          ? venue.gallery.images
          : []
      )
        .map((image) =>
          text(image?.weddingSlug),
        )
        .filter(Boolean),
    );

    const entries = await fs.readdir(
      weddingsRoot,
      {
        withFileTypes: true,
      },
    );

    const relatedSlugs = new Set(
      galleryWeddingSlugs,
    );

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const weddingSlug = entry.name;
      const weddingPath = path.join(
        weddingsRoot,
        weddingSlug,
        "wedding.json",
      );

      const wedding =
        await readJsonIfPresent(
          weddingPath,
        );

      if (!wedding) continue;

      const sameVenueId =
        text(wedding.venueId) &&
        text(venue.id) &&
        text(wedding.venueId) ===
          text(venue.id);

      const sameVenueSlug =
        text(wedding.venueSlug) ===
        text(venue.slug);

      const sameVenueName =
        normalise(wedding.venue) ===
        normalise(venue.name);

      if (
        sameVenueId ||
        sameVenueSlug ||
        sameVenueName
      ) {
        relatedSlugs.add(weddingSlug);
      }
    }

    const filenames = [
      "wedding.json",
      "images.json",
      "collections.json",
      "publish.json",
    ];

    const paths = [];

    for (const weddingSlug of relatedSlugs) {
      for (const filename of filenames) {
        const filePath = path.join(
          weddingsRoot,
          weddingSlug,
          filename,
        );

        /*
         * Include existing files. These cover new uploads, wedding metadata,
         * image deletions, collection membership and publication state.
         */
        if (await pathExists(filePath)) {
          paths.push(filePath);
        }
      }
    }

    return {
      relatedSlugs: Array.from(
        relatedSlugs,
      ).sort(),
      paths,
    };
  }

  async function publishVenue(slug) {
    assertSafeSlug(slug);

    const venuePath = path.join(
      venuesRoot,
      slug,
      "venue.json",
    );

    if (!(await pathExists(venuePath))) {
      throw createHttpError(
        "Venue not found.",
        404,
      );
    }

    const venue = await readJson(venuePath);
    const validation =
      validateVenueForPublish(venue);

    const stagedBefore =
      await runGit(
        ["diff", "--cached", "--quiet"],
        {
          allowExitCodes: [0, 1],
        },
      );

    if (stagedBefore.exitCode === 1) {
      throw createHttpError(
        "Git already has staged changes. Commit or unstage them before using Publish venue.",
        409,
      );
    }

    const publicVenueData =
      await publicVenuePublisher.publishAll();

    const publicVenuePath = path.join(
      publicDataRoot,
      `${slug}.json`,
    );

    const publicIndexPath = path.join(
      publicDataRoot,
      "index.json",
    );

    const weddingFiles =
      await relatedWeddingFiles(venue);

    const requiredPaths = [
      venuePath,
      publicVenuePath,
      publicIndexPath,
      ...weddingFiles.paths,
    ];

    for (const requiredPath of [
      venuePath,
      publicVenuePath,
      publicIndexPath,
    ]) {
      if (!(await pathExists(requiredPath))) {
        throw createHttpError(
          `Required publish file was not generated: ${path.relative(projectRoot, requiredPath)}`,
          500,
        );
      }
    }

    const relativePaths = [
      ...new Set(
        requiredPaths.map((filePath) =>
          path.relative(
            projectRoot,
            filePath,
          ),
        ),
      ),
    ];

    /*
     * -A records modified, new and deleted files. This is important after a
     * permanent image deletion.
     */
    await runGit([
      "add",
      "-A",
      "--",
      ...relativePaths,
    ]);

    const stagedAfter =
      await runGit(
        ["diff", "--cached", "--quiet"],
        {
          allowExitCodes: [0, 1],
        },
      );

    if (stagedAfter.exitCode === 0) {
      return {
        venueSlug: slug,
        venueName: venue.name,
        branch:
          (
            await runGit([
              "rev-parse",
              "--abbrev-ref",
              "HEAD",
            ])
          ).stdout,
        noChanges: true,
        commit: "",
        pushed: false,
        publicImageCount:
          validation.publicImages.length,
        publicVenueData,
        stagedPaths: relativePaths,
        relatedWeddingSlugs:
          weddingFiles.relatedSlugs,
      };
    }

    const branch = (
      await runGit([
        "rev-parse",
        "--abbrev-ref",
        "HEAD",
      ])
    ).stdout;

    const commitMessage =
      `Publish ${venue.name} venue gallery`;

    await runGit([
      "commit",
      "-m",
      commitMessage,
    ]);

    const commit = (
      await runGit([
        "rev-parse",
        "--short",
        "HEAD",
      ])
    ).stdout;

    try {
      await runGit([
        "push",
        "origin",
        branch,
      ]);
    } catch (error) {
      throw createHttpError(
        `Venue was committed locally as ${commit}, but the push failed.`,
        502,
        error?.details || [
          error instanceof Error
            ? error.message
            : "Unknown Git push error.",
        ],
      );
    }

    return {
      venueSlug: slug,
      venueName: venue.name,
      branch,
      noChanges: false,
      commit,
      pushed: true,
      publicImageCount:
        validation.publicImages.length,
      publicVenueData,
      stagedPaths: relativePaths,
      relatedWeddingSlugs:
        weddingFiles.relatedSlugs,
    };
  }

  return {
    publishVenue,
  };
}
