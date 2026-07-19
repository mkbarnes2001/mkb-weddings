import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const VENUES_DIR = path.join(ROOT, 'content', 'venues');
const PUBLIC_DIR = path.join(ROOT, 'public', 'venue-data');
const OUT_DIR = path.join(ROOT, 'd1', 'generated');
const OUT_FILE = path.join(OUT_DIR, '003_venue_documents_backfill.sql');

// Keep every generated SQL statement comfortably below D1's 100 KB statement limit.
// 8,000 Unicode code points is <= ~32 KB before SQL quote escaping in the worst UTF-8 case.
const CHUNK_CODEPOINTS = 8000;

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function chunksByCodePoint(text, size = CHUNK_CODEPOINTS) {
  const chars = Array.from(text);
  const chunks = [];
  for (let i = 0; i < chars.length; i += size) {
    chunks.push(chars.slice(i, i + size).join(''));
  }
  return chunks.length ? chunks : [''];
}

async function readJsonText(file) {
  const text = await fs.readFile(file, 'utf8');
  JSON.parse(text); // Validate before producing SQL.
  return text;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const entries = await fs.readdir(VENUES_DIR, { withFileTypes: true });
  const venueDirs = entries.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));

  const statements = [
    '-- Generated D1 venue document repair.',
    '-- Uses small append statements to stay below Cloudflare D1 SQL statement-size limits.',
    ''
  ];

  let venuesRepaired = 0;
  let missingPublicSnapshots = 0;
  let publishedImageCount = 0;

  for (const dir of venueDirs) {
    const draftPath = path.join(VENUES_DIR, dir.name, 'venue.json');
    let draftText;
    try {
      draftText = await readJsonText(draftPath);
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw new Error(`Could not read ${draftPath}: ${error.message}`);
    }

    const draft = JSON.parse(draftText);
    const slug = String(draft.slug || dir.name).trim();
    if (!slug) throw new Error(`Venue in ${draftPath} has no slug.`);

    const publicPath = path.join(PUBLIC_DIR, `${slug}.json`);
    let publishedText;
    try {
      publishedText = await readJsonText(publicPath);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      missingPublicSnapshots += 1;
      publishedText = draftText;
      console.warn(`Warning: missing ${publicPath}; using venue.json as published snapshot.`);
    }

    const published = JSON.parse(publishedText);
    if (Array.isArray(published.gallery)) {
      publishedImageCount += published.gallery.length;
    } else if (Array.isArray(published.images)) {
      publishedImageCount += published.images.length;
    }

    const slugSql = sqlString(slug);
    statements.push(`-- ${slug}`);
    statements.push(`UPDATE venues SET document_json = '', published_json = '' WHERE slug = ${slugSql};`);

    for (const chunk of chunksByCodePoint(draftText)) {
      statements.push(`UPDATE venues SET document_json = document_json || ${sqlString(chunk)} WHERE slug = ${slugSql};`);
    }
    for (const chunk of chunksByCodePoint(publishedText)) {
      statements.push(`UPDATE venues SET published_json = published_json || ${sqlString(chunk)} WHERE slug = ${slugSql};`);
    }

    // Keep status aligned with the fact that these snapshots are already public.
    statements.push(`UPDATE venues SET status = 'published' WHERE slug = ${slugSql};`);
    statements.push('');
    venuesRepaired += 1;
  }

  await fs.writeFile(OUT_FILE, `${statements.join('\n')}\n`, 'utf8');

  // Verify the largest statement before the user sends it to D1.
  const maxBytes = Math.max(...statements.map((statement) => Buffer.byteLength(statement, 'utf8')));

  console.log(`Venues repaired: ${venuesRepaired}`);
  console.log(`Published venue images in snapshots: ${publishedImageCount}`);
  console.log(`Missing public venue snapshots: ${missingPublicSnapshots}`);
  console.log(`Largest generated SQL statement: ${maxBytes} bytes`);
  console.log(`Generated: ${path.relative(ROOT, OUT_FILE)}`);

  if (maxBytes >= 100_000) {
    throw new Error(`Generated SQL still contains a statement >= 100 KB (${maxBytes} bytes). Reduce CHUNK_CODEPOINTS and rerun.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
