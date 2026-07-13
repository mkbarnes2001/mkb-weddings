// src/components/admin/MkbAdmin.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, Camera, CheckCircle2, FileText, Image as ImageIcon, Search, Sparkles } from "lucide-react";
import { weddingStories } from "../../data/weddingStories";

type BlogGalleryRow = { blogSlug?: string; filename?: string; blogOrder?: string; blogCover?: string };
type AiRow = { source?: string; blogSlug?: string; filename?: string; aiTags?: string; aiAlt?: string; aiCaption?: string; aiUpdatedAt?: string };
type GalleryRow = { venue?: string; category?: string; filename?: string };

type BlogStatus = {
  slug: string;
  title: string;
  venue: string;
  couple: string;
  imageCount: number;
  coverCount: number;
  aiRows: number;
  tagsComplete: number;
  altComplete: number;
  captionComplete: number;
  missingTags: number;
  missingAlt: number;
  missingCaption: number;
  status: "ready" | "warning" | "missing";
  latestAiUpdate?: string;
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCsv<T extends Record<string, string | undefined>>(csvText: string): T[] {
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    return row as T;
  });
}

async function fetchText(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return "";
  return res.text();
}

function normalise(value?: string) {
  return (value || "").trim().toLowerCase();
}

function normaliseFilename(value?: string) {
  return (value || "").trim().replace(/_2000(\.[a-z0-9]+)$/i, "_500$1").replace(/%20/g, " ");
}

function statusClass(status: BlogStatus["status"]) {
  if (status === "ready") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "warning") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function statusLabel(status: BlogStatus["status"]) {
  if (status === "ready") return "Ready";
  if (status === "warning") return "Needs check";
  return "Missing data";
}

function percentage(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function latestDate(rows: AiRow[]) {
  const dates = rows
    .map((row) => row.aiUpdatedAt)
    .filter(Boolean)
    .map((date) => new Date(date || ""))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  return dates[0]?.toISOString() || "";
}

function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string | number;
  detail?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">{title}</p>
          <p className="text-3xl font-serif text-neutral-900">{value}</p>
          {detail ? <p className="text-sm text-neutral-500 mt-2">{detail}</p> : null}
        </div>
        <div className="rounded-full bg-neutral-100 p-3 text-neutral-700">{icon}</div>
      </div>
    </div>
  );
}

function ProgressLine({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = percentage(done, total);

  return (
    <div>
      <div className="flex justify-between text-xs text-neutral-600 mb-1">
        <span>{label}</span>
        <span>{done}/{total} · {pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MkbAdmin() {
  const [blogGalleryRows, setBlogGalleryRows] = useState<BlogGalleryRow[]>([]);
  const [aiRows, setAiRows] = useState<AiRow[]>([]);
  const [galleryRows, setGalleryRows] = useState<GalleryRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchText("/blog-gallery.csv"), fetchText("/gallery-ai.csv"), fetchText("/gallery.csv")])
      .then(([blogGalleryText, aiText, galleryText]) => {
        if (cancelled) return;
        setBlogGalleryRows(parseCsv<BlogGalleryRow>(blogGalleryText));
        setAiRows(parseCsv<AiRow>(aiText));
        setGalleryRows(parseCsv<GalleryRow>(galleryText));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Failed to load admin data");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const blogStatuses = useMemo<BlogStatus[]>(() => {
    const blogAiByKey = new Map<string, AiRow>();

    aiRows
      .filter((row) => normalise(row.source || "gallery") === "blog")
      .forEach((row) => {
        const blogSlug = normalise(row.blogSlug);
        const filename = normaliseFilename(row.filename);
        if (blogSlug && filename) blogAiByKey.set(`${blogSlug}::${filename}`, row);
      });

    return weddingStories.map((story) => {
      const rows = blogGalleryRows
        .filter((row) => (row.blogSlug || "").trim() === story.slug)
        .sort((a, b) => Number(a.blogOrder || 0) - Number(b.blogOrder || 0));

      const aiForImages = rows.map((row) => blogAiByKey.get(`${normalise(story.slug)}::${normaliseFilename(row.filename)}`));
      const existingAiRows = aiForImages.filter(Boolean) as AiRow[];

      const imageCount = rows.length;
      const coverRows = rows.filter((row) => ["true", "yes", "1", "cover"].includes(normalise(row.blogCover)));
      const tagsComplete = existingAiRows.filter((row) => (row.aiTags || "").trim()).length;
      const altComplete = existingAiRows.filter((row) => (row.aiAlt || "").trim()).length;
      const captionComplete = existingAiRows.filter((row) => (row.aiCaption || "").trim()).length;

      const missingTags = Math.max(0, imageCount - tagsComplete);
      const missingAlt = Math.max(0, imageCount - altComplete);
      const missingCaption = Math.max(0, imageCount - captionComplete);

      const status: BlogStatus["status"] =
        imageCount === 0 || missingAlt > 0 || missingCaption > 0
          ? "missing"
          : missingTags > 0 || coverRows.length === 0
            ? "warning"
            : "ready";

      return {
        slug: story.slug,
        title: story.title,
        venue: story.venue,
        couple: story.couple,
        imageCount,
        coverCount: coverRows.length,
        aiRows: existingAiRows.length,
        tagsComplete,
        altComplete,
        captionComplete,
        missingTags,
        missingAlt,
        missingCaption,
        status,
        latestAiUpdate: latestDate(existingAiRows),
      };
    });
  }, [blogGalleryRows, aiRows]);

  const filteredBlogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return blogStatuses;

    return blogStatuses.filter((blog) =>
      [blog.title, blog.venue, blog.couple, blog.slug].some((value) => value.toLowerCase().includes(q)),
    );
  }, [blogStatuses, query]);

  const blogImageCount = blogGalleryRows.length;
  const blogAiRows = aiRows.filter((row) => normalise(row.source || "gallery") === "blog");
  const blogTagsComplete = blogAiRows.filter((row) => (row.aiTags || "").trim()).length;
  const blogAltComplete = blogAiRows.filter((row) => (row.aiAlt || "").trim()).length;
  const blogCaptionComplete = blogAiRows.filter((row) => (row.aiCaption || "").trim()).length;
  const galleryAiRows = aiRows.filter((row) => normalise(row.source || "gallery") !== "blog");

  const readyBlogs = blogStatuses.filter((blog) => blog.status === "ready").length;
  const warningBlogs = blogStatuses.filter((blog) => blog.status !== "ready").length;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="uppercase tracking-[0.25em] text-xs text-neutral-500 mb-2">MKB Admin</p>
            <h1 className="text-3xl md:text-4xl font-serif">Dashboard</h1>
          </div>

          <div className="flex gap-3">
            <Link to="/" className="rounded-full border border-neutral-200 px-5 py-2 text-sm hover:bg-neutral-50">View site</Link>
            <Link to="/blog" className="rounded-full bg-black text-white px-5 py-2 text-sm hover:bg-black/90">View blog</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 mb-8">{loadError}</div>
        ) : null}

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          <StatCard title="Wedding stories" value={weddingStories.length} detail={`${readyBlogs} ready · ${warningBlogs} need checks`} icon={<FileText className="w-5 h-5" />} />
          <StatCard title="Blog images" value={blogImageCount} detail={`${blogAiRows.length} AI rows`} icon={<ImageIcon className="w-5 h-5" />} />
          <StatCard title="Main gallery" value={galleryRows.length} detail={`${galleryAiRows.length} AI rows`} icon={<Camera className="w-5 h-5" />} />
          <StatCard title="Blog AI coverage" value={`${percentage(blogAltComplete, blogImageCount)}%`} detail={`${blogAltComplete}/${blogImageCount} alt text`} icon={<Sparkles className="w-5 h-5" />} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          <div className="lg:col-span-2 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-5 h-5" />
              <h2 className="text-xl font-serif">AI Status</h2>
            </div>

            <div className="space-y-5">
              <ProgressLine label="Blog visual tags" done={blogTagsComplete} total={blogImageCount} />
              <ProgressLine label="Blog alt text" done={blogAltComplete} total={blogImageCount} />
              <ProgressLine label="Blog captions" done={blogCaptionComplete} total={blogImageCount} />
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              {warningBlogs === 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
              <h2 className="text-xl font-serif">Next checks</h2>
            </div>

            <div className="space-y-3 text-sm text-neutral-700">
              {warningBlogs === 0 ? <p>All blog stories currently look ready.</p> : <p>{warningBlogs} blog stories need attention.</p>}

              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="font-medium mb-2">Terminal commands</p>
                <code className="block text-xs whitespace-pre-wrap text-neutral-600">
                  node scripts/mkb-intelligence.mjs --action=blog-status{"\n"}
                  node scripts/mkb-intelligence.mjs --action=blog --apply
                </code>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-neutral-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-serif">Blogs</h2>
              <p className="text-neutral-500 text-sm mt-1">Read-only health check for wedding stories, images and AI metadata.</p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search blogs..."
                className="w-full rounded-full border border-neutral-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-neutral-400"
              />
            </div>
          </div>

          <div className="divide-y divide-neutral-100">
            {filteredBlogs.map((blog) => (
              <div key={blog.slug} className="p-6 hover:bg-neutral-50 transition-colors">
                <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr_1fr_auto] gap-6 items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${statusClass(blog.status)}`}>{statusLabel(blog.status)}</span>
                      <span className="text-xs text-neutral-500">{blog.slug}</span>
                    </div>

                    <h3 className="text-xl font-serif mb-1">{blog.title}</h3>
                    <p className="text-sm text-neutral-600">{blog.couple} · {blog.venue}</p>
                    {blog.latestAiUpdate ? <p className="text-xs text-neutral-400 mt-2">Last AI update: {new Date(blog.latestAiUpdate).toLocaleString()}</p> : null}
                  </div>

                  <div className="text-sm text-neutral-700 space-y-1">
                    <p><span className="text-neutral-500">Images:</span> {blog.imageCount}</p>
                    <p><span className="text-neutral-500">AI rows:</span> {blog.aiRows}</p>
                    <p><span className="text-neutral-500">Cover:</span> {blog.coverCount > 0 ? "yes" : "missing"}</p>
                  </div>

                  <div className="space-y-2">
                    <ProgressLine label="Tags" done={blog.tagsComplete} total={blog.imageCount} />
                    <ProgressLine label="Alt" done={blog.altComplete} total={blog.imageCount} />
                    <ProgressLine label="Captions" done={blog.captionComplete} total={blog.imageCount} />
                  </div>

                  <div className="flex xl:justify-end">
                    <Link to={`/blog/${blog.slug}`} className="rounded-full border border-neutral-200 px-4 py-2 text-sm hover:bg-white">Open</Link>
                  </div>
                </div>

                {blog.status !== "ready" ? (
                  <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
                    <p className="font-medium mb-1">Needs attention</p>
                    <ul className="list-disc list-inside space-y-1">
                      {blog.imageCount === 0 ? <li>No blog images found.</li> : null}
                      {blog.coverCount === 0 ? <li>No cover image selected.</li> : null}
                      {blog.missingTags > 0 ? <li>{blog.missingTags} images missing AI tags.</li> : null}
                      {blog.missingAlt > 0 ? <li>{blog.missingAlt} images missing alt text.</li> : null}
                      {blog.missingCaption > 0 ? <li>{blog.missingCaption} images missing captions.</li> : null}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
