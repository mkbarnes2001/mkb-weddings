import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_MOMENTS = [
  "Getting ready",
  "Ceremony",
  "Details and decor",
  "Family and bridal party",
  "Couple portraits",
  "Reception and party",
];

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function createMomentEndpoint({
  projectRoot,
  momentsPath,
  backupDir,
}) {
  async function createBackup() {
    await fs.mkdir(backupDir, { recursive: true });

    try {
      const existing = await fs.readFile(momentsPath, "utf8");
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

      const backupPath = path.join(
        backupDir,
        `moments-${timestamp}.json`,
      );

      await fs.writeFile(backupPath, existing, "utf8");
      return path.relative(projectRoot, backupPath);
    } catch {
      return null;
    }
  }

  function defaultDocument() {
    return {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      moments: DEFAULT_MOMENTS.map((name, index) => ({
        id: `moment_${crypto.randomUUID()}`,
        name,
        slug: slugify(name),
        description: "",
        availableForAssignment: true,
        showOnMomentsLanding: true,
        cardImageId: "",
        sortOrder: index + 1,
        status: "active",
      })),
    };
  }

  function cleanDocument(incoming) {
    return {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      moments: Array.isArray(incoming?.moments)
        ? incoming.moments.map((moment, index) => ({
            id:
              String(moment?.id || "").trim() ||
              `moment_${crypto.randomUUID()}`,
            name: String(moment?.name || "").trim(),
            slug:
              slugify(moment?.slug || moment?.name) ||
              `moment-${index + 1}`,
            description: String(
              moment?.description || "",
            ).trim(),
            availableForAssignment: Boolean(
              moment?.availableForAssignment,
            ),
            showOnMomentsLanding: Boolean(
              moment?.showOnMomentsLanding,
            ),
            cardImageId: String(
              moment?.cardImageId || "",
            ).trim(),
            sortOrder: index + 1,
            status:
              moment?.status === "archived"
                ? "archived"
                : "active",
          }))
        : [],
    };
  }

  async function readMoments() {
    await fs.mkdir(path.dirname(momentsPath), {
      recursive: true,
    });

    try {
      const raw = JSON.parse(
        await fs.readFile(momentsPath, "utf8"),
      );
      return cleanDocument(raw);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;

      const document = defaultDocument();

      await fs.writeFile(
        momentsPath,
        `${JSON.stringify(document, null, 2)}\n`,
        "utf8",
      );

      return document;
    }
  }

  async function saveMoments(incoming) {
    const document = cleanDocument(incoming);

    const names = new Set();
    const slugs = new Set();
    const errors = [];

    document.moments.forEach((moment, index) => {
      if (!moment.name) {
        errors.push(`Moment ${index + 1}: name is required.`);
      }

      if (names.has(moment.name.toLowerCase())) {
        errors.push(`Duplicate moment name: ${moment.name}.`);
      }

      if (slugs.has(moment.slug)) {
        errors.push(`Duplicate moment slug: ${moment.slug}.`);
      }

      names.add(moment.name.toLowerCase());
      slugs.add(moment.slug);
    });

    if (errors.length) {
      const error = new Error(
        "Moment validation failed.",
      );
      error.statusCode = 400;
      error.details = errors;
      throw error;
    }

    const backupPath = await createBackup();

    await fs.writeFile(
      momentsPath,
      `${JSON.stringify(document, null, 2)}\n`,
      "utf8",
    );

    return {
      document,
      backupPath,
    };
  }

  return {
    readMoments,
    saveMoments,
  };
}
