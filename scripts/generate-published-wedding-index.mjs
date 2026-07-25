import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const WEDDINGS_ROOT = path.join(PROJECT_ROOT, "public", "weddings");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "public", "weddings-index.json");

function validateWedding(wedding, folderName) {
  const errors = [];

  if (!wedding || typeof wedding !== "object") {
    errors.push("Document is not an object.");
    return errors;
  }

  if (wedding.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1.");
  }

  if (!String(wedding.slug || "").trim()) {
    errors.push("slug is required.");
  }

  if (String(wedding.slug || "").trim() !== folderName) {
    errors.push(
      `slug "${wedding.slug}" does not match folder "${folderName}".`,
    );
  }

  if (!String(wedding.title || "").trim()) {
    errors.push("title is required.");
  }

  if (!String(wedding.couple || "").trim()) {
    errors.push("couple is required.");
  }

  if (!String(wedding.venue || "").trim()) {
    errors.push("venue is required.");
  }

  return errors;
}

function toIndexRecord(wedding) {
  return {
    schemaVersion: 1,
    slug: wedding.slug,
    title: wedding.title,
    couple: wedding.couple,
    venue: wedding.venue,
    weddingDate: wedding.weddingDate,
    excerpt: wedding.excerpt || "",
    intro: wedding.intro || "",
    seo: wedding.seo || {},
    status: wedding.status || "draft",
    updatedAt: wedding.updatedAt || null,
  };
}

async function main() {
  await fs.mkdir(WEDDINGS_ROOT, { recursive: true });

  const entries = await fs.readdir(WEDDINGS_ROOT, {
    withFileTypes: true,
  });

  const published = [];
  const skipped = [];
  const invalid = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const weddingPath = path.join(
      WEDDINGS_ROOT,
      entry.name,
      "wedding.json",
    );

    try {
      const text = await fs.readFile(weddingPath, "utf8");
      const wedding = JSON.parse(text);
      const errors = validateWedding(wedding, entry.name);

      if (errors.length > 0) {
        invalid.push({
          slug: entry.name,
          errors,
        });
        continue;
      }

      if (wedding.status !== "published") {
        skipped.push({
          slug: wedding.slug,
          status: wedding.status || "draft",
        });
        continue;
      }

      published.push(toIndexRecord(wedding));
    } catch (error) {
      if (error?.code === "ENOENT") continue;

      invalid.push({
        slug: entry.name,
        errors: [error?.message || "Unable to read wedding JSON."],
      });
    }
  }

  published.sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;

    if (aTime !== bTime) return bTime - aTime;
    return a.couple.localeCompare(b.couple);
  });

  const document = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    count: published.length,
    weddings: published,
  };

  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(document, null, 2) + "\n",
    "utf8",
  );

  console.log("");
  console.log("Published Wedding Index");
  console.log("-----------------------");
  console.log(`Published: ${published.length}`);
  console.log(`Skipped drafts/archived: ${skipped.length}`);
  console.log(`Invalid: ${invalid.length}`);
  console.log(`Output: ${path.relative(PROJECT_ROOT, OUTPUT_PATH)}`);

  if (invalid.length > 0) {
    console.log("");
    console.log("Invalid wedding documents:");
    for (const item of invalid) {
      console.log(`- ${item.slug}: ${item.errors.join(" ")}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
