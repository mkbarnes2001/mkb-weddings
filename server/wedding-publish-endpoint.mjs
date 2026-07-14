import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function text(value) {
  return String(value ?? "").trim();
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

async function readJson(filePath) {
  return JSON.parse(
    await fs.readFile(filePath, "utf8"),
  );
}

export function createWeddingPublishEndpoint({
  projectRoot,
  weddingsRoot,
  publicDataRoot,
  legacyIndexPath,
  suppliersPath,
  storiesPath,
  backupDir,
  assertSafeSlug,
  publicWeddingPublisher,
}) {
  async function runGit(
    args,
    {
      allowExitCodes = [0],
    } = {},
  ) {
    try {
      const result = await execFileAsync(
        "git",
        args,
        {
          cwd: projectRoot,
          maxBuffer:
            10 * 1024 * 1024,
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

      if (
        allowExitCodes.includes(
          exitCode,
        )
      ) {
        return {
          stdout: text(
            error?.stdout,
          ),
          stderr: text(
            error?.stderr,
          ),
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

  async function createBackup(
    sourcePath,
    prefix,
  ) {
    await fs.mkdir(backupDir, {
      recursive: true,
    });

    if (!(await pathExists(sourcePath))) {
      return null;
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

    const backupPath = path.join(
      backupDir,
      `${prefix}-${timestamp}.json`,
    );

    await fs.copyFile(
      sourcePath,
      backupPath,
    );

    return path.relative(
      projectRoot,
      backupPath,
    );
  }

  async function getPreview(slug) {
    assertSafeSlug(slug);

    const built =
      await publicWeddingPublisher.buildWedding(
        slug,
      );

    return {
      slug,
      wedding: built.wedding,
      storyEnabled:
        built.storyEnabled,
      storyStatus:
        built.storyStatus,
      action:
        built.storyEnabled
          ? "publish"
          : "unpublish",
      readyToPublish:
        !built.storyEnabled ||
        built.readyToPublish,
      checks: built.checks,
      requiredPassed:
        built.requiredPassed,
      requiredTotal:
        built.requiredTotal,
      recommendedPassed:
        built.recommendedPassed,
      recommendedTotal:
        built.recommendedTotal,
      imageCount:
        built.images.length,
      coverImage:
        built.coverImage,
    };
  }

  async function publishWedding(
    slug,
    {
      storyEnabled,
    } = {},
  ) {
    assertSafeSlug(slug);

    const weddingDir = path.join(
      weddingsRoot,
      slug,
    );

    const weddingPath = path.join(
      weddingDir,
      "wedding.json",
    );

    if (!(await pathExists(weddingPath))) {
      throw createHttpError(
        "Wedding not found.",
        404,
      );
    }

    const stagedBefore =
      await runGit(
        [
          "diff",
          "--cached",
          "--quiet",
        ],
        {
          allowExitCodes: [0, 1],
        },
      );

    if (stagedBefore.exitCode === 1) {
      throw createHttpError(
        "Git already has staged changes. Commit or unstage them before publishing the wedding story.",
        409,
      );
    }

    const existing =
      await readJson(weddingPath);

    const enabled =
      typeof storyEnabled ===
      "boolean"
        ? storyEnabled
        : existing.storyEnabled ===
          true;

    const backupPath =
      await createBackup(
        weddingPath,
        `${slug}-wedding`,
      );

    const now =
      new Date().toISOString();

    const draftUpdate = {
      ...existing,
      storyEnabled: enabled,
      storyStatus: enabled
        ? text(
            existing.storyStatus,
          ) || "draft"
        : "draft",
      updatedAt: now,
    };

    await fs.writeFile(
      weddingPath,
      `${JSON.stringify(
        draftUpdate,
        null,
        2,
      )}\n`,
      "utf8",
    );

    const preview =
      await getPreview(slug);

    if (
      enabled &&
      !preview.readyToPublish
    ) {
      throw createHttpError(
        "Wedding story publication validation failed.",
        400,
        preview.checks
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

    const publishedWedding = {
      ...draftUpdate,
      storyStatus: enabled
        ? "published"
        : "draft",
      storyPublishedAt: enabled
        ? text(
            existing.storyPublishedAt,
          ) || now
        : text(
            existing.storyPublishedAt,
          ),
      updatedAt: now,
    };

    await fs.writeFile(
      weddingPath,
      `${JSON.stringify(
        publishedWedding,
        null,
        2,
      )}\n`,
      "utf8",
    );

    const finalPreview =
      await getPreview(slug);

    const publishPath = path.join(
      weddingDir,
      "publish.json",
    );

    await fs.writeFile(
      publishPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          weddingSlug: slug,
          storyEnabled: enabled,
          status:
            publishedWedding.storyStatus,
          publishedAt: enabled
            ? publishedWedding.storyPublishedAt
            : null,
          checks:
            Object.fromEntries(
              finalPreview.checks.map(
                (check) => [
                  check.id,
                  check.passed,
                ],
              ),
            ),
          updatedAt: now,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const publicWeddingData =
      await publicWeddingPublisher.publishAll();

    const relativePaths = [
      path.relative(
        projectRoot,
        weddingPath,
      ),
      path.relative(
        projectRoot,
        path.join(
          weddingDir,
          "images.json",
        ),
      ),
      path.relative(
        projectRoot,
        path.join(
          weddingDir,
          "collections.json",
        ),
      ),
      path.relative(
        projectRoot,
        publishPath,
      ),
      path.relative(
        projectRoot,
        publicDataRoot,
      ),
      path.relative(
        projectRoot,
        legacyIndexPath,
      ),
    ];

    for (const optionalPath of [
      suppliersPath,
      storiesPath,
    ]) {
      if (
        await pathExists(optionalPath)
      ) {
        relativePaths.push(
          path.relative(
            projectRoot,
            optionalPath,
          ),
        );
      }
    }

    const uniquePaths = [
      ...new Set(relativePaths),
    ];

    await runGit([
      "add",
      "-A",
      "--",
      ...uniquePaths,
    ]);

    const stagedAfter =
      await runGit(
        [
          "diff",
          "--cached",
          "--quiet",
        ],
        {
          allowExitCodes: [0, 1],
        },
      );

    const branch = (
      await runGit([
        "rev-parse",
        "--abbrev-ref",
        "HEAD",
      ])
    ).stdout;

    if (stagedAfter.exitCode === 0) {
      return {
        weddingSlug: slug,
        weddingTitle:
          publishedWedding.title,
        storyEnabled: enabled,
        storyStatus:
          publishedWedding.storyStatus,
        action: enabled
          ? "published"
          : "unpublished",
        branch,
        noChanges: true,
        commit: "",
        pushed: false,
        publicImageCount:
          finalPreview.imageCount,
        publicWeddingData,
        stagedPaths:
          uniquePaths,
        backupPath,
      };
    }

    const commitMessage = enabled
      ? `Publish ${publishedWedding.couple} wedding story`
      : `Unpublish ${publishedWedding.couple} wedding story`;

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
        `Wedding story was committed locally as ${commit}, but the push failed.`,
        502,
        error?.details || [
          error instanceof Error
            ? error.message
            : "Unknown Git push error.",
        ],
      );
    }

    return {
      weddingSlug: slug,
      weddingTitle:
        publishedWedding.title,
      storyEnabled: enabled,
      storyStatus:
        publishedWedding.storyStatus,
      action: enabled
        ? "published"
        : "unpublished",
      branch,
      noChanges: false,
      commit,
      pushed: true,
      publicImageCount:
        finalPreview.imageCount,
      publicWeddingData,
      stagedPaths: uniquePaths,
      backupPath,
    };
  }

  return {
    getPreview,
    publishWedding,
  };
}
