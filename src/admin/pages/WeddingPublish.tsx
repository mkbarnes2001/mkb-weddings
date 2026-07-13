import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ClipboardCheck, ExternalLink, Terminal, XCircle } from "lucide-react";
import { PublishService, type PublishReport } from "../services/PublishService";

function CheckRow({ label, detail, passed, severity }: { label: string; detail: string; passed: boolean; severity: "required" | "recommended" }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-black/5 bg-white/70 p-5">
      <div className={`rounded-full p-1 ${passed ? "text-emerald-600" : "text-red-600"}`}>
        {passed ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-serif text-xl">{label}</h3>
          <span className={`rounded-full border px-3 py-1 text-xs ${
            severity === "required"
              ? "border-black/10 bg-black text-white"
              : "border-black/10 bg-neutral-50 text-neutral-600"
          }`}>
            {severity}
          </span>
        </div>
        <p className="text-sm text-neutral-600 mt-2">{detail}</p>
      </div>
    </div>
  );
}

export function WeddingPublish() {
  const { slug } = useParams();
  const [report, setReport] = useState<PublishReport | undefined>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    new PublishService()
      .getPublishReport(slug || "")
      .then(setReport)
      .finally(() => setLoaded(true));
  }, [slug]);

  if (!loaded) return <div className="text-neutral-500">Loading publish checks…</div>;

  if (!report) {
    return (
      <div className="rounded-[28px] border border-black/10 bg-white p-8">
        <h1 className="text-3xl font-serif mb-4">Publish report not found</h1>
        <Link to="/admin/weddings" className="underline underline-offset-4">
          Back to weddings
        </Link>
      </div>
    );
  }

  const { wedding } = report;

  return (
    <div className="space-y-7">
      <Link
        to={`/admin/weddings/${wedding.slug}`}
        className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to wedding
      </Link>

      <section className={`rounded-[32px] p-8 md:p-10 text-white ${report.readyToPublish ? "bg-emerald-950" : "bg-black"}`}>
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div>
            <p className="uppercase tracking-[0.25em] text-xs text-white/45 mb-4">
              Publishing Intelligence
            </p>

            <h1 className="text-4xl md:text-6xl font-serif leading-tight mb-4">
              {report.readyToPublish ? "Ready to publish" : "Needs checks"}
            </h1>

            <p className="text-white/65">
              {wedding.couple} · {wedding.venue} · {wedding.weddingDate}
            </p>
          </div>

          <a
            href={`/blog/${wedding.slug}`}
            className="rounded-full bg-white text-black px-5 py-3 text-sm hover:bg-white/90 inline-flex items-center gap-2"
          >
            Open public story
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Required</p>
          <p className="text-5xl font-serif">
            {report.requiredPassed}/{report.requiredTotal}
          </p>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Recommended</p>
          <p className="text-5xl font-serif">
            {report.recommendedPassed}/{report.recommendedTotal}
          </p>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Status</p>
          <p className="text-5xl font-serif">{report.readyToPublish ? "Ready" : "Check"}</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-2xl bg-black text-white p-3">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-3xl font-serif">Publish checklist</h2>
            <p className="text-sm text-neutral-500">Required and recommended checks before publishing.</p>
          </div>
        </div>

        <div className="space-y-3">
          {report.checks.map((check) => (
            <CheckRow
              key={check.id}
              label={check.label}
              detail={check.detail}
              passed={check.passed}
              severity={check.severity}
            />
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-2xl bg-black text-white p-3">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-3xl font-serif">Publish commands</h2>
            <p className="text-sm text-neutral-500">Temporary bridge until publishing can run from the app.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-[#f5f3ef] border border-black/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">AI</p>
            <code className="block text-xs whitespace-pre-wrap text-neutral-600">
              node scripts/mkb-intelligence.mjs --action=blog --apply --blog={wedding.slug}
            </code>
          </div>

          <div className="rounded-2xl bg-[#f5f3ef] border border-black/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">Sitemap</p>
            <code className="block text-xs whitespace-pre-wrap text-neutral-600">
              node scripts/mkb-intelligence.mjs --action=sitemap
            </code>
          </div>

          <div className="rounded-2xl bg-[#f5f3ef] border border-black/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">Deploy</p>
            <code className="block text-xs whitespace-pre-wrap text-neutral-600">
              npm run build{"\n"}git add .{"\n"}git commit -m "Add wedding story"{"\n"}git push
            </code>
          </div>
        </div>
      </section>
    </div>
  );
}
