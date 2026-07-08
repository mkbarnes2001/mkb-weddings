import "dotenv/config";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const HELP = args.includes("--help") || args.includes("-h") || args.length === 0;
const APPLY = args.includes("--apply");
const FORCE = args.includes("--force");

const ACTION_ARG = args.find((arg) => arg.startsWith("--action="));
const ACTION = ACTION_ARG ? ACTION_ARG.split("=")[1].trim().toLowerCase() : "";

const BLOG_ARG = args.find((arg) => arg.startsWith("--blog="));
const BLOG = BLOG_ARG ? BLOG_ARG.split("=")[1].trim() : "";

const LIMIT_ARG = args.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? LIMIT_ARG.split("=")[1].trim() : "5000";

function showHelp() {
  console.log(`
MKB Intelligence v1.0

Usage:
  node scripts/mkb-intelligence.mjs --action=<action> [options]

Actions:
  blog             Process blog images: migrate, visual tags, alt text and captions
  blog-status      Show blog AI tag/text status only
  blog-tags        Generate missing visual tags for blog images
  blog-text        Generate blog alt text/captions
  gallery-status   Show main/gallery AI text status
  sitemap          Generate page + image sitemaps
  build            Generate sitemaps and run production build

Options:
  --apply          Make changes. Without this, actions run in dry/status mode where possible.
  --force          Regenerate existing alt/captions.
  --blog=<slug>    Limit to one blog.
  --limit=5000     Max rows/images to process.

Common workflows:

  New blog:
    node scripts/mkb-intelligence.mjs --action=blog --apply

  One blog:
    node scripts/mkb-intelligence.mjs --action=blog --apply --blog=millbrook-lodge-ballynahinch-dave-and-siobhan

  Regenerate blog captions:
    node scripts/mkb-intelligence.mjs --action=blog-text --apply --force

  Check blog status:
    node scripts/mkb-intelligence.mjs --action=blog-status

  Rebuild sitemaps:
    node scripts/mkb-intelligence.mjs --action=sitemap

  Production build:
    node scripts/mkb-intelligence.mjs --action=build
`);
}

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    console.log("");
    console.log(`▶ ${command} ${commandArgs.join(" ")}`);
    console.log("");

    const child = spawn(command, commandArgs, {
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}: ${command} ${commandArgs.join(" ")}`));
    });
  });
}

function withBlog(commandArgs) {
  if (!BLOG) return commandArgs;
  return [...commandArgs, `--blog=${BLOG}`];
}

const applyArg = () => (APPLY ? ["--apply"] : []);
const forceArg = () => (FORCE ? ["--force"] : []);

async function blogPipeline() {
  console.log("MKB Intelligence: Blog Pipeline");
  console.log("--------------------------------");
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY / STATUS"}`);
  console.log(`Blog: ${BLOG || "all"}`);
  console.log(`Limit: ${LIMIT}`);
  console.log(`Force text regeneration: ${FORCE ? "yes" : "no"}`);

  await run("node", ["scripts/ai/migrate-blog-ai.mjs", ...applyArg()]);
  await run("node", withBlog(["scripts/ai/tag-blog-images.mjs", "--status"]));
  await run("node", withBlog(["scripts/ai/tag-blog-images.mjs", ...applyArg(), `--limit=${LIMIT}`]));
  await run("node", withBlog(["scripts/ai/tag-blog-images.mjs", "--status"]));
  await run("node", withBlog(["scripts/ai/generate-ai-text.mjs", ...applyArg(), "--source=blog", ...forceArg(), `--limit=${LIMIT}`]));
  await run("node", withBlog(["scripts/ai/generate-ai-text.mjs", "--status", "--source=blog"]));
}

async function blogStatus() {
  await run("node", withBlog(["scripts/ai/tag-blog-images.mjs", "--status"]));
  await run("node", withBlog(["scripts/ai/generate-ai-text.mjs", "--status", "--source=blog"]));
}

async function blogTags() {
  await run("node", withBlog(["scripts/ai/tag-blog-images.mjs", ...applyArg(), ...forceArg(), `--limit=${LIMIT}`]));
}

async function blogText() {
  await run("node", withBlog(["scripts/ai/generate-ai-text.mjs", ...applyArg(), "--source=blog", ...forceArg(), `--limit=${LIMIT}`]));
}

async function galleryStatus() {
  await run("node", ["scripts/ai/generate-ai-text.mjs", "--status"]);
}

async function sitemap() {
  await run("node", ["scripts/generate-sitemap.mjs"]);
}

async function build() {
  await run("node", ["scripts/generate-sitemap.mjs"]);
  await run("npm", ["run", "build"]);
}

async function main() {
  if (HELP) {
    showHelp();
    return;
  }

  switch (ACTION) {
    case "blog":
      await blogPipeline();
      break;
    case "blog-status":
      await blogStatus();
      break;
    case "blog-tags":
      await blogTags();
      break;
    case "blog-text":
      await blogText();
      break;
    case "gallery-status":
      await galleryStatus();
      break;
    case "sitemap":
      await sitemap();
      break;
    case "build":
      await build();
      break;
    default:
      console.error(`Unknown or missing action: ${ACTION || "(none)"}`);
      showHelp();
      process.exit(1);
  }

  console.log("");
  console.log("✅ MKB Intelligence complete.");
}

main().catch((err) => {
  console.error("");
  console.error("❌ MKB Intelligence failed");
  console.error(err.message);
  process.exit(1);
});
