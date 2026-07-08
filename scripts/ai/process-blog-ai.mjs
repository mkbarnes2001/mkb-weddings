import "dotenv/config";
import { spawn } from "node:child_process";

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const SKIP_TAGS = process.argv.includes("--skip-tags");
const SKIP_TEXT = process.argv.includes("--skip-text");

const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? LIMIT_ARG.split("=")[1] : "5000";

const BLOG_ARG = process.argv.find((arg) => arg.startsWith("--blog="));
const BLOG = BLOG_ARG ? BLOG_ARG.split("=")[1] : "";

function run(command, args) {
  return new Promise((resolve, reject) => {
    console.log("");
    console.log(`▶ ${command} ${args.join(" ")}`);
    console.log("");

    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(" ")}`));
      }
    });
  });
}

function withBlog(args) {
  if (BLOG) return [...args, `--blog=${BLOG}`];
  return args;
}

async function main() {
  console.log("MKB Blog AI Pipeline");
  console.log("--------------------");
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}`);
  console.log(`Blog filter: ${BLOG || "all"}`);
  console.log(`Limit: ${LIMIT}`);
  console.log(`Force text regeneration: ${FORCE ? "yes" : "no"}`);

  if (!APPLY) {
    console.log("");
    console.log("Dry run mode. This will show migration/tag/text status only.");
    console.log("To make changes, run:");
    console.log("node scripts/ai/process-blog-ai.mjs --apply --limit=5000");
  }

  // 1. Always update/migrate blog AI rows first.
  await run("node", [
    "scripts/ai/migrate-blog-ai.mjs",
    ...(APPLY ? ["--apply"] : []),
  ]);

  // 2. Check current visual tag status.
  await run("node", withBlog([
    "scripts/ai/tag-blog-images.mjs",
    "--status",
  ]));

  // 3. Visual tag missing blog images.
  if (!SKIP_TAGS) {
    await run("node", withBlog([
      "scripts/ai/tag-blog-images.mjs",
      ...(APPLY ? ["--apply"] : []),
      `--limit=${LIMIT}`,
    ]));
  }

  // 4. Check visual tag status again.
  await run("node", withBlog([
    "scripts/ai/tag-blog-images.mjs",
    "--status",
  ]));

  // 5. Generate text only after the tag step.
  if (!SKIP_TEXT) {
    await run("node", withBlog([
      "scripts/ai/generate-ai-text.mjs",
      ...(APPLY ? ["--apply"] : []),
      "--source=blog",
      ...(FORCE ? ["--force"] : []),
      `--limit=${LIMIT}`,
    ]));
  }

  // 6. Final text status.
  await run("node", withBlog([
    "scripts/ai/generate-ai-text.mjs",
    "--status",
    "--source=blog",
  ]));

  console.log("");
  console.log("✅ Blog AI pipeline complete.");
}

main().catch((err) => {
  console.error("");
  console.error("❌ Blog AI pipeline failed");
  console.error(err.message);
  process.exit(1);
});
