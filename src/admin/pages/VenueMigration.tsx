import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Loader2,
} from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { VenueDocument, VenueSummary } from "../types/venue";

type CsvRow = Record<string, string>;

type MigrationVenue = Partial<VenueDocument> & {
  sourceRow: number;
  sourceName: string;
  valid: boolean;
  issue: string;
  duplicate: boolean;
};

const CSV_PATH = "/galleryvenuedesc.csv";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) =>
    normaliseHeader(header),
  );

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return Object.fromEntries(
      headers.map((header, index) => [
        header,
        values[index] || "",
      ]),
    );
  });
}

function normaliseHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function pick(row: CsvRow, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[normaliseHeader(alias)];
    if (value?.trim()) return value.trim();
  }

  return "";
}

function rowToVenue(
  row: CsvRow,
  index: number,
  existing: VenueSummary[],
): MigrationVenue {
  const name = pick(row, [
    "venue",
    "venue name",
    "name",
    "title",
  ]);

  const slug =
    pick(row, ["slug", "venue slug", "venueslug"]) ||
    slugify(name);

  const existingSlugs = new Set(existing.map((venue) => venue.slug));
  const duplicate = Boolean(slug && existingSlugs.has(slug));

  const description = pick(row, [
    "description",
    "venue description",
    "long description",
    "content",
    "body",
  ]);

  const intro = pick(row, [
    "intro",
    "introduction",
    "excerpt",
    "summary",
    "short description",
  ]);

  const county = pick(row, [
    "county",
    "region",
    "area",
  ]);

  const town = pick(row, [
    "town",
    "city",
    "location",
  ]);

  const website = pick(row, [
    "website",
    "url",
    "venue website",
  ]);

  const instagram = pick(row, [
    "instagram",
    "instagram url",
    "instagram handle",
  ]);

  const seoTitle = pick(row, [
    "seo title",
    "seotitle",
    "meta title",
  ]);

  const seoDescription = pick(row, [
    "seo description",
    "seodescription",
    "meta description",
  ]);

  const issue = !name
    ? "No venue name found"
    : !slug
      ? "No valid slug could be generated"
      : "";

  return {
    sourceRow: index + 2,
    sourceName: name || `Row ${index + 2}`,
    valid: !issue,
    issue,
    duplicate,
    schemaVersion: 1,
    name,
    slug,
    county,
    town,
    intro,
    description,
    heroImageId: "",
    status: "published",
    links: {
      website,
      instagram,
      facebook: "",
      googleMaps: "",
    },
    contact: {
      email: "",
      phone: "",
      coordinatorName: "",
      coordinatorEmail: "",
    },
    practical: {
      address: "",
      parking: "",
      accommodation: "",
      ceremonyTypes: "",
      capacity: "",
      outdoorCeremony: false,
    },
    notes: {
      general: "",
      portraitLocations: "",
      rainBackup: "",
      sunsetNotes: "",
      restrictions: "",
    },
    seo: {
      title: seoTitle,
      description: seoDescription,
    },
  };
}

export function VenueMigration() {
  const [existing, setExisting] = useState<VenueSummary[]>([]);
  const [rows, setRows] = useState<MigrationVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<{
    created: number;
    skipped: number;
    failed: string[];
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(CSV_PATH).then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Could not load ${CSV_PATH}. Confirm the file exists in public/.`,
          );
        }

        return response.text();
      }),
      AdminApiService.listVenues(),
    ])
      .then(([csvText, venues]) => {
        const parsedRows = parseCsv(csvText);
        setExisting(venues);
        setRows(
          parsedRows.map((row, index) =>
            rowToVenue(row, index, venues),
          ),
        );
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to prepare venue migration.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const valid = rows.filter((row) => row.valid);
    const duplicates = valid.filter((row) => row.duplicate);
    const ready = valid.filter((row) => !row.duplicate);
    const invalid = rows.filter((row) => !row.valid);

    return {
      total: rows.length,
      ready: ready.length,
      duplicates: duplicates.length,
      invalid: invalid.length,
    };
  }, [rows]);

  async function runMigration() {
    const ready = rows.filter(
      (row) => row.valid && !row.duplicate,
    );

    if (!ready.length) return;

    setRunning(true);
    setError("");
    setResults(null);

    let created = 0;
    let skipped = rows.length - ready.length;
    const failed: string[] = [];

    for (const row of ready) {
      try {
        const {
          sourceRow,
          sourceName,
          valid,
          issue,
          duplicate,
          ...venue
        } = row;

        await AdminApiService.createVenue(
          venue as Partial<VenueDocument>,
        );

        created += 1;
      } catch (migrationError) {
        failed.push(
          `${row.sourceName}: ${
            migrationError instanceof Error
              ? migrationError.message
              : "Unknown error"
          }`,
        );
      }
    }

    setResults({
      created,
      skipped,
      failed,
    });
    setRunning(false);
  }

  if (loading) {
    return (
      <div className="text-neutral-500">
        Reading venue CSV…
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Link
        to="/admin/venues"
        className="inline-flex items-center gap-2 text-sm text-neutral-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to venues
      </Link>

      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">
          Venue Migration
        </p>
        <h1 className="font-serif text-5xl md:text-6xl">
          Import venue CSV
        </h1>
        <p className="mt-4 max-w-2xl text-white/60">
          Preview and import records from public/galleryvenuedesc.csv.
          Existing venue slugs are skipped.
        </p>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </section>
      ) : null}

      {results ? (
        <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-5 w-5" />
            Migration complete
          </div>
          <p className="mt-2 text-sm">
            Created {results.created}; skipped {results.skipped};
            failed {results.failed.length}.
          </p>
          {results.failed.length ? (
            <div className="mt-4 space-y-1 text-sm">
              {results.failed.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : null}
          <Link
            to="/admin/venues"
            className="mt-5 inline-flex rounded-full bg-black px-5 py-3 text-sm text-white"
          >
            View venues
          </Link>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="CSV rows" value={summary.total} />
        <Metric label="Ready" value={summary.ready} />
        <Metric label="Existing" value={summary.duplicates} />
        <Metric label="Invalid" value={summary.invalid} />
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/80 p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-3xl">
              Migration preview
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              Review the detected name, location and status before importing.
            </p>
          </div>

          <button
            type="button"
            onClick={runMigration}
            disabled={running || summary.ready === 0}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-40"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            {running
              ? "Importing…"
              : `Import ${summary.ready} venues`}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-[0.14em] text-neutral-500">
                <th className="px-3 py-3">Row</th>
                <th className="px-3 py-3">Venue</th>
                <th className="px-3 py-3">Slug</th>
                <th className="px-3 py-3">Location</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.sourceRow}-${row.slug}`}
                  className="border-b border-black/5 align-top"
                >
                  <td className="px-3 py-4 text-neutral-500">
                    {row.sourceRow}
                  </td>
                  <td className="px-3 py-4 font-medium">
                    {row.name || row.sourceName}
                  </td>
                  <td className="px-3 py-4 font-mono text-xs">
                    {row.slug || "—"}
                  </td>
                  <td className="px-3 py-4 text-neutral-600">
                    {[row.town, row.county]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="px-3 py-4 text-neutral-600">
                    {row.description
                      ? `${row.description.slice(0, 80)}${
                          row.description.length > 80 ? "…" : ""
                        }`
                      : "—"}
                  </td>
                  <td className="px-3 py-4">
                    {!row.valid ? (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-800">
                        {row.issue}
                      </span>
                    ) : row.duplicate ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">
                        Existing venue
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800">
                        Ready
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white/80 p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 font-serif text-4xl">{value}</p>
    </div>
  );
}
