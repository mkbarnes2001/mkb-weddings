import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createVenueEndpoint } from "./venue-endpoint.mjs";
import { createMomentEndpoint } from "./moment-endpoint.mjs";
import { createUploadEndpoint } from "./upload-endpoint.mjs";
import { createGalleryMigrationEndpoint } from "./gallery-migration-endpoint.mjs";
import { createPublicVenuePublisher } from "./public-venue-publisher.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const PORT = Number(process.env.MKB_ADMIN_API_PORT || 8787);
const PUBLIC_ROOT = path.join(PROJECT_ROOT, "public");
const WEDDINGS_ROOT = path.join(PUBLIC_ROOT, "weddings");
const VENUES_ROOT = path.join(PROJECT_ROOT, "content", "venues");
const MOMENTS_PATH = path.join(PROJECT_ROOT, "content", "moments", "moments.json");
const GALLERY_CSV_PATH = path.join(PUBLIC_ROOT, "gallery.csv");
const GALLERY_AI_CSV_PATH = path.join(PUBLIC_ROOT, "gallery-ai.csv");
const PUBLIC_VENUE_DATA_ROOT = path.join(PUBLIC_ROOT, "venue-data");
const SUPPLIERS_PATH = path.join(PUBLIC_ROOT, "blog-suppliers.csv");
const STORIES_PATH = path.join(PUBLIC_ROOT, "wedding-stories-admin.json");
const PUBLISHED_INDEX_PATH = path.join(PUBLIC_ROOT, "weddings-index.json");
const BACKUP_DIR = path.join(PROJECT_ROOT, "backups", "admin-api");
const SUPPLIER_HEADER = ["blogSlug", "role", "name", "website", "instagram", "sortOrder"];

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function normalise(value) {
  return String(value || "").trim().toLowerCase();
}

function assertSafeSlug(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    const error = new Error("Slug can only contain lowercase letters, numbers and hyphens.");
    error.statusCode = 400;
    throw error;
  }
}

const venueEndpoint = createVenueEndpoint({
  projectRoot: PROJECT_ROOT,
  venuesRoot: VENUES_ROOT,
  weddingsRoot: WEDDINGS_ROOT,
  backupDir: BACKUP_DIR,
  assertSafeSlug,
});

const momentEndpoint = createMomentEndpoint({
  projectRoot: PROJECT_ROOT,
  momentsPath: MOMENTS_PATH,
  backupDir: BACKUP_DIR,
});

const uploadEndpoint = createUploadEndpoint({
  projectRoot: PROJECT_ROOT,
  publicRoot: PUBLIC_ROOT,
  weddingsRoot: WEDDINGS_ROOT,
  venuesRoot: VENUES_ROOT,
  assertSafeSlug,
});

const galleryMigrationEndpoint = createGalleryMigrationEndpoint({
  projectRoot: PROJECT_ROOT,
  galleryCsvPath: GALLERY_CSV_PATH,
  galleryAiCsvPath: GALLERY_AI_CSV_PATH,
  venuesRoot: VENUES_ROOT,
  backupDir: BACKUP_DIR,
  publicImageBaseUrl:
    process.env.R2_PUBLIC_BASE_URL ||
    "https://images.mkbweddings.co.uk",
});

const publicVenuePublisher =
  createPublicVenuePublisher({
    projectRoot: PROJECT_ROOT,
    venuesRoot: VENUES_ROOT,
    publicDataRoot:
      PUBLIC_VENUE_DATA_ROOT,
  });

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

async function createBackup(sourcePath, prefix) {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  try {
    const existing = await fs.readFile(sourcePath, "utf8");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const extension = path.extname(sourcePath) || ".txt";
    const backupPath = path.join(BACKUP_DIR, `${prefix}-${timestamp}${extension}`);
    await fs.writeFile(backupPath, existing, "utf8");
    return path.relative(PROJECT_ROOT, backupPath);
  } catch {
    return null;
  }
}

function validateWeddingDocument(wedding) {
  const errors = [];
  if (!wedding || typeof wedding !== "object") return ["Wedding document must be an object."];
  if (wedding.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (!String(wedding.slug || "").trim()) errors.push("slug is required.");
  if (!String(wedding.title || "").trim()) errors.push("title is required.");
  if (!String(wedding.couple || "").trim()) errors.push("couple is required.");
  if (!String(wedding.venue || "").trim()) errors.push("venue is required.");
  if (!String(wedding.weddingDate || "").trim()) errors.push("weddingDate is required.");
  return errors;
}

async function readWeddingJson(filePath) {
  const wedding = JSON.parse(await fs.readFile(filePath, "utf8"));
  const errors = validateWeddingDocument(wedding);
  if (errors.length) throw new Error(`Invalid wedding JSON: ${errors.join(" ")}`);
  return wedding;
}

async function listJsonWeddings() {
  await fs.mkdir(WEDDINGS_ROOT, { recursive: true });
  const entries = await fs.readdir(WEDDINGS_ROOT, { withFileTypes: true });
  const weddings = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const weddingPath = path.join(WEDDINGS_ROOT, entry.name, "wedding.json");
    try {
      const wedding = await readWeddingJson(weddingPath);
      weddings.push({ ...wedding, storage: "json", weddingPath: path.relative(PROJECT_ROOT, weddingPath) });
    } catch (error) {
      if (error?.code !== "ENOENT") console.error(`Unable to read ${weddingPath}`, error);
    }
  }
  return weddings.sort((a, b) => String(a.couple || "").localeCompare(String(b.couple || "")));
}

async function getJsonWedding(slug) {
  assertSafeSlug(slug);
  const weddingPath = path.join(WEDDINGS_ROOT, slug, "wedding.json");
  try {
    const wedding = await readWeddingJson(weddingPath);
    return { ...wedding, storage: "json", weddingPath: path.relative(PROJECT_ROOT, weddingPath) };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function ensureWeddingFolder(slug) {
  assertSafeSlug(slug);
  const weddingDir = path.join(WEDDINGS_ROOT, slug);
  await fs.mkdir(weddingDir, { recursive: true });
  return weddingDir;
}

async function readWeddingImagesDocument(slug) {
  const imagesPath = path.join(await ensureWeddingFolder(slug), "images.json");
  try {
    const document = JSON.parse(await fs.readFile(imagesPath, "utf8"));
    if (document.schemaVersion !== 1 || document.weddingSlug !== slug || !Array.isArray(document.images)) {
      throw new Error("images.json has an invalid structure.");
    }
    return document;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function validateImageDocument(slug, document) {
  const errors = [];
  if (!document || typeof document !== "object") return ["Image manager document must be an object."];
  if (document.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (document.weddingSlug !== slug) errors.push("weddingSlug does not match route slug.");
  if (!Array.isArray(document.images)) return [...errors, "images must be an array."];
  const ids = new Set();
  document.images.forEach((image, index) => {
    if (!String(image.id || "").trim()) errors.push(`Image ${index + 1}: id is required.`);
    if (!String(image.filename || "").trim()) errors.push(`Image ${index + 1}: filename is required.`);
    if (ids.has(image.id)) errors.push(`Image ${index + 1}: duplicate id "${image.id}".`);
    ids.add(image.id);
    const rating = Number(image.rating || 0);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) errors.push(`Image ${index + 1}: rating must be between 0 and 5.`);
    if (image.collections !== undefined && !Array.isArray(image.collections)) errors.push(`Image ${index + 1}: collections must be an array.`);
  });
  return errors;
}

async function saveWeddingImagesDocument(slug, incomingDocument) {
  const document = {
    schemaVersion: 1,
    weddingSlug: slug,
    updatedAt: new Date().toISOString(),
    images: Array.isArray(incomingDocument?.images)
      ? incomingDocument.images.map((image, index) => ({
          id: String(image.id || "").trim(),
          filename: String(image.filename || "").trim(),
          order: Number(image.order || index + 1),
          isCover: Boolean(image.isCover),
          hidden: Boolean(image.hidden),
          rating: Math.max(0, Math.min(5, Number(image.rating || 0))),
          collections: Array.isArray(image.collections)
            ? [...new Set(image.collections.map((value) => String(value || "").trim()).filter(Boolean))]
            : [],
        }))
      : [],
  };
  const errors = validateImageDocument(slug, document);
  if (errors.length) {
    const error = new Error("Image document validation failed.");
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }
  const covers = document.images.filter((image) => image.isCover);
  if (covers.length > 1) {
    const keepId = covers[0].id;
    document.images = document.images.map((image) => ({ ...image, isCover: image.id === keepId }));
  }
  const imagesPath = path.join(await ensureWeddingFolder(slug), "images.json");
  const backupPath = await createBackup(imagesPath, `${slug}-images`);
  await fs.writeFile(imagesPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  return { savedImages: document.images.length, backupPath };
}

async function createWeddingFiles(incomingWedding) {
  const wedding = {
    ...incomingWedding,
    schemaVersion: 1,
    slug: String(incomingWedding?.slug || "").trim(),
    title: String(incomingWedding?.title || "").trim(),
    couple: String(incomingWedding?.couple || "").trim(),
    venue: String(incomingWedding?.venue || "").trim(),
    weddingDate: String(incomingWedding?.weddingDate || "").trim(),
    excerpt: String(incomingWedding?.excerpt || ""),
    intro: String(incomingWedding?.intro || ""),
    story: Array.isArray(incomingWedding?.story) ? incomingWedding.story : [],
    suppliers: Array.isArray(incomingWedding?.suppliers) ? incomingWedding.suppliers : [],
    facts: incomingWedding?.facts && typeof incomingWedding.facts === "object" ? incomingWedding.facts : {},
    seo: incomingWedding?.seo && typeof incomingWedding.seo === "object" ? incomingWedding.seo : {},
    status: incomingWedding?.status || "draft",
    updatedAt: new Date().toISOString(),
  };
  assertSafeSlug(wedding.slug);
  const errors = validateWeddingDocument(wedding);
  if (errors.length) {
    const error = new Error("Wedding validation failed.");
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }
  const weddingDir = path.join(WEDDINGS_ROOT, wedding.slug);
  const weddingPath = path.join(weddingDir, "wedding.json");
  try {
    await fs.access(weddingPath);
    const error = new Error("A wedding with this slug already exists.");
    error.statusCode = 409;
    throw error;
  } catch (error) {
    if (error?.statusCode === 409) throw error;
  }
  await fs.mkdir(weddingDir, { recursive: true });
  const starterDocuments = {
    "wedding.json": wedding,
    "collections.json": { schemaVersion: 1, weddingSlug: wedding.slug, collections: [
      { id: `${wedding.slug}-blog`, type: "blog", name: "Blog Gallery", imageIds: [] },
      { id: `${wedding.slug}-venue`, type: "venue", name: "Venue Gallery", imageIds: [] },
    ] },
    "images.json": { schemaVersion: 1, weddingSlug: wedding.slug, images: [] },
    "publish.json": { schemaVersion: 1, weddingSlug: wedding.slug, status: "draft", checks: {} },
  };
  const createdFiles = [];
  for (const [filename, document] of Object.entries(starterDocuments)) {
    const filePath = path.join(weddingDir, filename);
    await fs.writeFile(filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    createdFiles.push(path.relative(PROJECT_ROOT, filePath));
  }
  return { slug: wedding.slug, weddingPath: path.relative(PROJECT_ROOT, weddingPath), createdFiles };
}

async function generatePublishedWeddingIndex() {
  const weddings = await listJsonWeddings();
  const published = weddings
    .filter((wedding) => wedding.status === "published")
    .map((wedding) => ({
      schemaVersion: 1,
      slug: wedding.slug,
      title: wedding.title,
      couple: wedding.couple,
      venue: wedding.venue,
      weddingDate: wedding.weddingDate,
      excerpt: wedding.excerpt || "",
      intro: wedding.intro || "",
      seo: wedding.seo || {},
      status: wedding.status,
      updatedAt: wedding.updatedAt || null,
    }));
  const document = { schemaVersion: 1, generatedAt: new Date().toISOString(), count: published.length, weddings: published };
  await fs.writeFile(PUBLISHED_INDEX_PATH, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  return document;
}

function csvEscape(value = "") {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function suppliersToCsv(rows) {
  const body = rows.map((row, index) => [row.blogSlug, row.role, row.name, row.website, String(row.instagram || "").replace(/^@/, ""), row.sortOrder || String(index + 1)].map(csvEscape).join(","));
  return [SUPPLIER_HEADER.join(","), ...body].join("\n") + "\n";
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];
    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

async function ensureSupplierFile() {
  await fs.mkdir(path.dirname(SUPPLIERS_PATH), { recursive: true });
  try { await fs.access(SUPPLIERS_PATH); } catch { await fs.writeFile(SUPPLIERS_PATH, `${SUPPLIER_HEADER.join(",")}\n`, "utf8"); }
}

async function ensureStoriesFile() {
  await fs.mkdir(path.dirname(STORIES_PATH), { recursive: true });
  try { await fs.access(STORIES_PATH); } catch { await fs.writeFile(STORIES_PATH, `${JSON.stringify({ stories: {} }, null, 2)}\n`, "utf8"); }
}

async function readSuppliers() {
  await ensureSupplierFile();
  return parseCsv(await fs.readFile(SUPPLIERS_PATH, "utf8"));
}

async function readStoriesDocument() {
  await ensureStoriesFile();
  const parsed = JSON.parse(await fs.readFile(STORIES_PATH, "utf8"));
  return { stories: parsed && typeof parsed.stories === "object" && parsed.stories ? parsed.stories : {} };
}

async function saveWeddingSuppliers(blogSlug, incomingRows) {
  const rows = Array.isArray(incomingRows) ? incomingRows : [];
  const cleanedRows = rows.map((row, index) => ({
    blogSlug,
    role: String(row.role || "").trim(),
    name: String(row.name || "").trim(),
    website: String(row.website || "").trim(),
    instagram: String(row.instagram || "").trim().replace(/^@/, ""),
    sortOrder: String(row.sortOrder || index + 1),
  }));
  const allRows = await readSuppliers();
  const retainedRows = allRows.filter((row) => normalise(row.blogSlug) !== normalise(blogSlug));
  const backupPath = await createBackup(SUPPLIERS_PATH, "blog-suppliers");
  const combinedRows = [...retainedRows, ...cleanedRows];
  await fs.writeFile(SUPPLIERS_PATH, suppliersToCsv(combinedRows), "utf8");
  return { savedRows: cleanedRows.length, totalRows: combinedRows.length, backupPath };
}

function cleanStory(slug, incoming) {
  return {
    slug,
    title: String(incoming?.title || "").trim(),
    excerpt: String(incoming?.excerpt || "").trim(),
    intro: String(incoming?.intro || "").trim(),
    paragraphs: Array.isArray(incoming?.paragraphs) ? incoming.paragraphs.map((paragraph) => String(paragraph || "").trim()).filter(Boolean) : [],
    facts: Array.isArray(incoming?.facts) ? incoming.facts.map((fact) => ({ label: String(fact.label || "").trim(), value: String(fact.value || "").trim() })).filter((fact) => fact.label || fact.value) : [],
    updatedAt: new Date().toISOString(),
  };
}

async function saveWeddingStory(slug, incomingStory) {
  const story = cleanStory(slug, incomingStory || {});
  const document = await readStoriesDocument();
  const backupPath = await createBackup(STORIES_PATH, "wedding-stories-admin");
  document.stories[slug] = story;
  await fs.writeFile(STORIES_PATH, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  return { story, backupPath };
}

async function handleRequest(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const pathname = url.pathname;



  if (
    req.method === "GET" &&
    pathname === "/api/migrations/venue-gallery/preview"
  ) {
    return sendJson(res, 200, {
      ok: true,
      preview: await galleryMigrationEndpoint.preview(),
    });
  }

  if (
    req.method === "POST" &&
    pathname === "/api/migrations/venue-gallery"
  ) {
    const body = await readJsonBody(req);

    const migration =
      await galleryMigrationEndpoint.migrate({
        mode: body.mode || "refresh",
      });

    const publicVenueData =
      await publicVenuePublisher.publishAll();

    return sendJson(res, 200, {
      ok: true,
      ...migration,
      publicVenueData,
    });
  }

  if (req.method === "POST" && pathname === "/api/uploads/image") {
    const venueSlug = url.searchParams.get("venueSlug") || "";
    const weddingSlug = url.searchParams.get("weddingSlug") || "";
    const filename = url.searchParams.get("filename") || "image";
    const mimeType =
      url.searchParams.get("mimeType") ||
      req.headers["content-type"] ||
      "application/octet-stream";

    const upload =
      await uploadEndpoint.uploadImage({
        req,
        venueSlug,
        weddingSlug,
        originalFilename: filename,
        mimeType,
      });

    const publicVenueData =
      await publicVenuePublisher.publishAll();

    return sendJson(res, 201, {
      ok: true,
      ...upload,
      publicVenueData,
    });
  }

  if (req.method === "GET" && pathname === "/api/moments") {
    return sendJson(res, 200, {
      ok: true,
      document: await momentEndpoint.readMoments(),
    });
  }

  if (req.method === "PUT" && pathname === "/api/moments") {
    const body = await readJsonBody(req);

    return sendJson(res, 200, {
      ok: true,
      ...(await momentEndpoint.saveMoments(
        body.document,
      )),
    });
  }

  if (req.method === "GET" && pathname === "/api/venues") {
    return sendJson(res, 200, { ok: true, venues: await venueEndpoint.listVenues() });
  }

  if (
    req.method === "POST" &&
    pathname === "/api/venues/public-sync"
  ) {
    return sendJson(res, 200, {
      ok: true,
      publicVenueData:
        await publicVenuePublisher.publishAll(),
    });
  }

  if (req.method === "POST" && pathname === "/api/venues") {
    const body = await readJsonBody(req);
    const venue =
      await venueEndpoint.createVenue(body.venue);
    const publicVenueData =
      await publicVenuePublisher.publishAll();

    return sendJson(res, 201, {
      ok: true,
      venue,
      publicVenueData,
    });
  }

  const venueMatch = pathname.match(/^\/api\/venues\/([^/]+)$/);

  if (venueMatch && req.method === "GET") {
    const venueSlug = decodeURIComponent(venueMatch[1]);
    const venue = await venueEndpoint.readVenue(venueSlug);
    return venue
      ? sendJson(res, 200, { ok: true, venue })
      : sendJson(res, 404, { ok: false, error: "Venue not found." });
  }

  if (venueMatch && req.method === "PUT") {
    const venueSlug =
      decodeURIComponent(venueMatch[1]);
    const body = await readJsonBody(req);
    const result =
      await venueEndpoint.updateVenue(
        venueSlug,
        body.venue,
      );
    const publicVenueData =
      await publicVenuePublisher.publishAll();

    return sendJson(res, 200, {
      ok: true,
      ...result,
      publicVenueData,
    });
  }

  if (venueMatch && req.method === "DELETE") {
    const venueSlug =
      decodeURIComponent(venueMatch[1]);
    const result =
      await venueEndpoint.archiveVenue(venueSlug);
    const publicVenueData =
      await publicVenuePublisher.publishAll();

    return sendJson(res, 200, {
      ok: true,
      ...result,
      publicVenueData,
    });
  }

  if (req.method === "GET" && pathname === "/api/health") return sendJson(res, 200, { ok: true, service: "Photography Intelligence Local Admin API", projectRoot: PROJECT_ROOT });
  if (req.method === "GET" && pathname === "/api/weddings") return sendJson(res, 200, { ok: true, weddings: await listJsonWeddings() });
  if (req.method === "POST" && pathname === "/api/weddings") {
    const body = await readJsonBody(req);
    return sendJson(res, 201, { ok: true, ...(await createWeddingFiles(body.wedding)) });
  }
  if (req.method === "POST" && pathname === "/api/weddings/published-index") return sendJson(res, 200, { ok: true, index: await generatePublishedWeddingIndex() });

  const imagesMatch = pathname.match(/^\/api\/weddings\/([^/]+)\/images$/);
  if (imagesMatch && req.method === "GET") {
    const slug = decodeURIComponent(imagesMatch[1]);
    return sendJson(res, 200, { ok: true, slug, document: await readWeddingImagesDocument(slug) });
  }
  if (imagesMatch && req.method === "POST") {
    const slug = decodeURIComponent(imagesMatch[1]);
    const body = await readJsonBody(req);
    return sendJson(res, 200, { ok: true, slug, ...(await saveWeddingImagesDocument(slug, body.document)) });
  }

  const weddingMatch = pathname.match(/^\/api\/weddings\/([^/]+)$/);
  if (weddingMatch && req.method === "GET") {
    const slug = decodeURIComponent(weddingMatch[1]);
    const wedding = await getJsonWedding(slug);
    return wedding ? sendJson(res, 200, { ok: true, wedding }) : sendJson(res, 404, { ok: false, error: "Wedding JSON not found." });
  }

  if (req.method === "GET" && pathname === "/api/suppliers") return sendJson(res, 200, { ok: true, rows: await readSuppliers() });

  const suppliersMatch = pathname.match(/^\/api\/weddings\/([^/]+)\/suppliers$/);
  if (suppliersMatch && req.method === "GET") {
    const blogSlug = decodeURIComponent(suppliersMatch[1]);
    const rows = (await readSuppliers()).filter((row) => normalise(row.blogSlug) === normalise(blogSlug));
    return sendJson(res, 200, { ok: true, blogSlug, rows });
  }
  if (suppliersMatch && req.method === "POST") {
    const blogSlug = decodeURIComponent(suppliersMatch[1]);
    const body = await readJsonBody(req);
    return sendJson(res, 200, { ok: true, blogSlug, ...(await saveWeddingSuppliers(blogSlug, body.rows)) });
  }

  const storyMatch = pathname.match(/^\/api\/weddings\/([^/]+)\/story$/);
  if (storyMatch && req.method === "GET") {
    const slug = decodeURIComponent(storyMatch[1]);
    const document = await readStoriesDocument();
    return sendJson(res, 200, { ok: true, slug, story: document.stories[slug] || null });
  }
  if (storyMatch && req.method === "POST") {
    const slug = decodeURIComponent(storyMatch[1]);
    const body = await readJsonBody(req);
    return sendJson(res, 200, { ok: true, slug, ...(await saveWeddingStory(slug, body.story)) });
  }

  return sendJson(res, 404, { ok: false, error: "Route not found." });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error);
    sendJson(res, error?.statusCode || 500, { ok: false, error: error?.message || "Internal server error.", details: error?.details || [] });
  });
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Check http://${HOST}:${PORT}/api/health`);
    process.exitCode = 1;
    return;
  }
  console.error(error);
  process.exitCode = 1;
});

try {
  const publicVenueData =
    await publicVenuePublisher.publishAll();

  console.log(
    `Published ${publicVenueData.venueCount} venue pages ` +
      `with ${publicVenueData.imageCount} images.`,
  );
} catch (error) {
  console.error(
    "Unable to generate public venue data.",
    error,
  );
}

server.listen(PORT, HOST, () => {
  console.log("\nPhotography Intelligence Local Admin API");
  console.log("----------------------------------------");
  console.log(`Running: http://${HOST}:${PORT}`);
  console.log(`Project: ${PROJECT_ROOT}\n`);
});
