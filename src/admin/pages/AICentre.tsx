import { useEffect, useState } from "react";
import { Bot, CheckCircle2, Copy, Sparkles, Terminal, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AIStatusService, type AiStatusReport } from "../services/AIStatusService";
import { ProgressBar } from "../components/ProgressBar";
import { AdminPage, AdminPageHeader, AdminStatus } from "../components/ui/AdminUI";
import { StatusBadge } from "../components/Badge";

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
      // Clipboard may be unavailable in some browsers.
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

export function AICentre() {
  const [report, setReport] = useState<AiStatusReport | null>(null);

  useEffect(() => {
    new AIStatusService().getReport().then(setReport);
  }, []);

  if (!report) return <div className="text-neutral-500">Loading AI Centre…</div>;

  const blogComplete =
    report.blog.missingTags === 0 &&
    report.blog.missingAlt === 0 &&
    report.blog.missingCaptions === 0;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="AI Centre"
        title="Image intelligence"
        description="Monitor visual tags, alt text, captions and operational commands from one place."
        meta={<><AdminStatus tone={blogComplete ? "success" : "warning"}>{blogComplete ? "Blog AI complete" : "Needs checks"}</AdminStatus><span className="text-[10px] text-neutral-500">{report.blog.total} blog AI rows</span></>}
      />

      <section className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5">
        <StatBox label="Blog rows" value={report.blog.total} detail={`${report.blog.missingAlt} missing alt`} />
        <StatBox label="Blog tags" value={report.blog.tags} detail={`${report.blog.missingTags} missing`} />
        <StatBox label="Blog captions" value={report.blog.captions} detail={`${report.blog.missingCaptions} missing`} />
        <StatBox label="Gallery rows" value={report.gallery.total} detail={`${report.gallery.missingAlt} missing alt`} />
        <StatBox label="Gallery tags" value={report.gallery.tags} detail={`${report.gallery.missingTags} missing`} />
        <StatBox label="Gallery captions" value={report.gallery.captions} detail={`${report.gallery.missingCaptions} missing`} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-7">
            <div className="rounded-2xl bg-black text-white p-3">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-3xl font-serif">Blog AI health</h2>
              <p className="text-sm text-neutral-500">Blog image metadata coverage.</p>
            </div>
          </div>

          <div className="space-y-6">
            <ProgressBar label="Visual tags" done={report.blog.tags} total={report.blog.total} />
            <ProgressBar label="Alt text" done={report.blog.alt} total={report.blog.total} />
            <ProgressBar label="Captions" done={report.blog.captions} total={report.blog.total} />
          </div>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-7">
            <div className="rounded-2xl bg-black text-white p-3">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-3xl font-serif">Gallery AI health</h2>
              <p className="text-sm text-neutral-500">Main gallery metadata coverage.</p>
            </div>
          </div>

          <div className="space-y-6">
            <ProgressBar label="Visual tags" done={report.gallery.tags} total={report.gallery.total} />
            <ProgressBar label="Alt text" done={report.gallery.alt} total={report.gallery.total} />
            <ProgressBar label="Captions" done={report.gallery.captions} total={report.gallery.total} />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-2xl bg-black text-white p-3">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-3xl font-serif">AI commands</h2>
            <p className="text-sm text-neutral-500">Temporary bridge until these actions run directly from the UI.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <CommandCard
            title="Check blog AI status"
            description="Shows visual tag, alt text and caption completion."
            command="node scripts/mkb-intelligence.mjs --action=blog-status"
          />
          <CommandCard
            title="Process missing blog AI"
            description="Runs migration, missing visual tags and missing text."
            command="node scripts/mkb-intelligence.mjs --action=blog --apply"
          />
          <CommandCard
            title="Regenerate blog captions"
            description="Force rewrite blog alt text and captions after improving tags."
            command="node scripts/mkb-intelligence.mjs --action=blog-text --apply --force"
          />
          <CommandCard
            title="Generate sitemap"
            description="Regenerates page and image sitemaps."
            command="node scripts/mkb-intelligence.mjs --action=sitemap"
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        <h2 className="text-3xl font-serif mb-6">Wedding AI status</h2>

        <div className="divide-y divide-black/5">
          {report.weddings.map((wedding) => (
            <div key={wedding.slug} className="py-5 grid grid-cols-1 xl:grid-cols-[1fr_120px_1fr_auto] gap-5 items-center">
              <div>
                <div className="mb-2">
                  <StatusBadge status={wedding.status} />
                </div>
                <h3 className="text-xl font-serif">{wedding.title}</h3>
                <p className="text-sm text-neutral-500">{wedding.imageCount} images</p>
              </div>

              <div className="text-sm text-neutral-500">
                {wedding.status === "ready" ? "Ready" : "Needs check"}
              </div>

              <div className="space-y-2">
                <ProgressBar label="Tags" done={wedding.tagsComplete} total={wedding.imageCount} />
                <ProgressBar label="Alt" done={wedding.altComplete} total={wedding.imageCount} />
              </div>

              <Link
                to={`/admin/weddings/${wedding.slug}`}
                className="rounded-full bg-black text-white px-5 py-2.5 text-sm hover:bg-black/90"
              >
                Open
              </Link>
            </div>
          ))}
        </div>
      </section>
    </AdminPage>
  );
}
