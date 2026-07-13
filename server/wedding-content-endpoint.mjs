import fs from "node:fs/promises";
import path from "node:path";

export function createWeddingContentEndpoint({
  projectRoot,
  weddingsRoot,
  backupDir,
  assertSafeSlug,
  validateWeddingDocument,
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

  async function updateCompanionDocument(
    filePath,
    nextSlug,
  ) {
    try {
      const text = await fs.readFile(filePath, "utf8");
      const document = JSON.parse(text);

      if (
        document &&
        typeof document === "object" &&
        "weddingSlug" in document
      ) {
        document.weddingSlug = nextSlug;

        await fs.writeFile(
          filePath,
          `${JSON.stringify(document, null, 2)}\n`,
          "utf8",
        );
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        console.error(
          `Unable to update companion document ${filePath}`,
          error,
        );
      }
    }
  }

  async function updateWedding(
    routeSlug,
    incomingWedding,
  ) {
    assertSafeSlug(routeSlug);

    const wedding = {
      ...incomingWedding,
      schemaVersion: 1,
      slug: String(incomingWedding?.slug || "").trim(),
      title: String(incomingWedding?.title || "").trim(),
      couple: String(incomingWedding?.couple || "").trim(),
      venue: String(incomingWedding?.venue || "").trim(),
      weddingDate: String(
        incomingWedding?.weddingDate || "",
      ).trim(),
      excerpt: String(
        incomingWedding?.excerpt || "",
      ).trim(),
      intro: String(
        incomingWedding?.intro || "",
      ).trim(),
      story: Array.isArray(incomingWedding?.story)
        ? incomingWedding.story.map((value) =>
            String(value || "").trim(),
          )
        : [],
      facts:
        incomingWedding?.facts &&
        typeof incomingWedding.facts === "object"
          ? incomingWedding.facts
          : {},
      suppliers: Array.isArray(
        incomingWedding?.suppliers,
      )
        ? incomingWedding.suppliers
        : [],
      seo:
        incomingWedding?.seo &&
        typeof incomingWedding.seo === "object"
          ? incomingWedding.seo
          : {},
      status:
        incomingWedding?.status === "published" ||
        incomingWedding?.status === "archived"
          ? incomingWedding.status
          : "draft",
      updatedAt: new Date().toISOString(),
    };

    assertSafeSlug(wedding.slug);

    const errors = validateWeddingDocument(wedding);

    if (errors.length > 0) {
      const error = new Error(
        "Wedding validation failed.",
      );
      error.statusCode = 400;
      error.details = errors;
      throw error;
    }

    const currentDir = path.join(
      weddingsRoot,
      routeSlug,
    );
    const currentPath = path.join(
      currentDir,
      "wedding.json",
    );

    const nextDir = path.join(
      weddingsRoot,
      wedding.slug,
    );
    const nextPath = path.join(
      nextDir,
      "wedding.json",
    );

    try {
      await fs.access(currentPath);
    } catch {
      const error = new Error(
        "Wedding JSON not found.",
      );
      error.statusCode = 404;
      throw error;
    }

    const backupPath = await createBackup(
      currentPath,
      `${routeSlug}-wedding`,
    );

    if (routeSlug !== wedding.slug) {
      try {
        await fs.access(nextDir);

        const error = new Error(
          "A wedding with the new slug already exists.",
        );
        error.statusCode = 409;
        throw error;
      } catch (error) {
        if (error?.statusCode === 409) {
          throw error;
        }
      }

      await fs.rename(currentDir, nextDir);

      for (const filename of [
        "images.json",
        "collections.json",
        "publish.json",
      ]) {
        await updateCompanionDocument(
          path.join(nextDir, filename),
          wedding.slug,
        );
      }
    }

    await fs.mkdir(nextDir, { recursive: true });

    await fs.writeFile(
      nextPath,
      `${JSON.stringify(wedding, null, 2)}\n`,
      "utf8",
    );

    return {
      wedding: {
        ...wedding,
        storage: "json",
        weddingPath: path.relative(
          projectRoot,
          nextPath,
        ),
      },
      backupPath,
    };
  }

  return {
    updateWedding,
  };
}
