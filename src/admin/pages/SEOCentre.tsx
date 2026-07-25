import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Copy,
  FileSearch,
  Globe2,
  Image as ImageIcon,
  ListChecks,
  Map,
  SearchCheck,
  XCircle,
} from "lucide-react";
import { SEOService, type SeoReport, type WeddingSeoStatus } from "../services/SEOService";
import { ProgressBar } from "../components/ProgressBar";
import { AdminPage, AdminPageHeader, AdminStatus } from "../components/ui/AdminUI";

function StatBox({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white/75 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.035)]">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">{label}</p>
      <p className="text-4xl font-serif">{value}</p>
      {detail ? <p className="text-sm text-neutral-500 mt-2">{detail}</p> : null}
    </div>
  );
}

function CommandCard({
  title,
  description,
  command,
}: {
  title: string;
  description: string;
  command: string;
}) {
  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // Clipboard can be unavailable.
    }
  }

  return (
    <div className="rounded-[24px] border border-black/10 bg-white/75 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.035)]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-serif">{title}</h3>
          <p className="text-sm text-neutral-500 mt-1">{description}</p>
        </div>

        <button
          type="button"
          onClick={copyCommand}
          className="rounded-full border border-black/10 p-2 hover:bg-white"
          aria-label={`Copy ${title} command`}
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>

      <div className="rounded-2xl bg-[#f5f3ef] border border-black/5 p-4">
        <code className="block text-xs whitespace-pre-wrap text-neutral-700">{command}</code>
      </div>
    </div>
  );
}

function SeoStatusRow({ wedding }: { wedding: WeddingSeoStatus }) {
  const icon = wedding.ready ? (
    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
  ) : (
    <XCircle className="w-6 h-6 text-amber-600" />
  );

  return (
    <div className="py-5 grid grid-cols-1 xl:grid-cols-[1.2fr_0.9fr_1fr_auto] gap-5 items-center">
      <div>
        <div className="flex items-center gap-3 mb-2">
          {icon}
          <h3 className="text-xl font-serif">{wedding.title}</h3>
        </div>
        <p className="text-sm text-neutral-500">{wedding.venue}</p>
        <p className="text-xs text-neutral-400 mt-1">{wedding.route}</p>
      </div>

      <div className="text-sm text-neutral-700 space-y-1">
        <p>
          <span className="text-neutral-500">Images:</span> {wedding.imageCount}
        </p>
        <p>
          <span className="text-neutral-500">Cover:</span> {wedding.hasCover ? "yes" : "missing"}
        </p>
        <p>
          <span className="text-neutral-500">Alt:</span> {wedding.altComplete ? "complete" : "missing"}
        </p>
      </div>

      <div>
        <ProgressBar
          label="Publish required"
          done={wedding.publishRequiredPassed}
          total={wedding.publishRequiredTotal}
        />
      </div>

      <div className="flex xl:justify-end">
        <Link
          to={`/admin/weddings/${wedding.slug}/publish`}
          className="rounded-full bg-black text-white px-5 py-2.5 text-sm hover:bg-black/90"
        >
          Open
        </Link>
      </div>
    </div>
  );
}

export function SEOCentre() {
  const [report, setReport] = useState<SeoReport | null>(null);

  useEffect(() => {
    new SEOService().getReport().then(setReport);
  }, []);

  if (!report) return <div className="text-neutral-500">Loading SEO Centre…</div>;

  const blogAltReady = report.blogImageCount > 0 && report.blogAltComplete === report.blogImageCount;
  const galleryAltReady =
    report.galleryImageCount > 0 && report.galleryAltComplete === report.galleryImageCount;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="SEO Centre"
        title="Search visibility"
        description="Check blog routes, image metadata, collections, publish readiness and sitemap commands."
        meta={<><AdminStatus tone={blogAltReady ? "success" : "warning"}>{blogAltReady ? "Blog SEO ready" : "Needs checks"}</AdminStatus><span className="text-[10px] text-neutral-500">{report.storyRouteCount} story routes</span></>}
      />

      <section className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5">
        <StatBox label="Story routes" value={report.storyRouteCount} detail="/blog/:slug" />
        <StatBox label="Blog images" value={report.blogImageCount} detail={`${report.blogAltComplete} with alt`} />
        <StatBox label="Blog captions" value={report.blogCaptionComplete} detail="Visible/structured future use" />
        <StatBox label="Gallery images" value={report.galleryImageCount} detail={`${report.galleryAltComplete} with alt`} />
        <StatBox label="Collections" value={report.collectionCount} detail={`${report.activeCollectionCount} active`} />
        <StatBox label="SEO state" value={blogAltReady && galleryAltReady ? "Ready" : "Check"} detail="Metadata coverage" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-7">
            <div className="rounded-2xl bg-black text-white p-3">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-3xl font-serif">Blog image SEO</h2>
              <p className="text-sm text-neutral-500">Alt text and caption coverage for blog images.</p>
            </div>
          </div>

          <div className="space-y-6">
            <ProgressBar label="Blog alt text" done={report.blogAltComplete} total={report.blogImageCount} />
            <ProgressBar label="Blog captions" done={report.blogCaptionComplete} total={report.blogImageCount} />
          </div>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-7">
            <div className="rounded-2xl bg-black text-white p-3">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-3xl font-serif">Main gallery SEO</h2>
              <p className="text-sm text-neutral-500">AI metadata coverage for website gallery images.</p>
            </div>
          </div>

          <div className="space-y-6">
            <ProgressBar label="Gallery alt text" done={report.galleryAltComplete} total={report.galleryImageCount} />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-2xl bg-black text-white p-3">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-3xl font-serif">SEO checklist by wedding</h2>
            <p className="text-sm text-neutral-500">Blog route, image metadata and publishing readiness.</p>
          </div>
        </div>

        <div className="divide-y divide-black/5">
          {report.weddingStatuses.map((wedding) => (
            <SeoStatusRow key={wedding.slug} wedding={wedding} />
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-2xl bg-black text-white p-3">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-3xl font-serif">SEO commands</h2>
            <p className="text-sm text-neutral-500">Temporary bridge until SEO actions run directly from the UI.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <CommandCard
            title="Generate sitemap"
            description="Regenerates page and image sitemaps."
            command="node scripts/mkb-intelligence.mjs --action=sitemap"
          />
          <CommandCard
            title="Production build"
            description="Builds the site and checks for compile errors."
            command="npm run build"
          />
          <CommandCard
            title="Deploy"
            description="Commit and push to trigger Cloudflare Pages."
            command={`git add .\ngit commit -m "Update SEO and wedding intelligence"\ngit push`}
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-2xl bg-black text-white p-3">
            <FileSearch className="w-5 h-5" />
          </div>
          <h2 className="text-3xl font-serif">Next SEO upgrade</h2>
        </div>
        <p className="text-neutral-600 max-w-3xl leading-relaxed">
          The next version should inspect generated sitemap files, structured data, duplicate titles,
          missing meta descriptions and Google Search Console indexing status.
        </p>
      </section>
    </AdminPage>
  );
}
