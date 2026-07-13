import { useEffect, useState } from "react";
import { Activity, Camera, FileText, Image as ImageIcon, Sparkles } from "lucide-react";
import { loadAdminData, type AdminData } from "../services/DataService";
import { StatCard } from "../components/StatCard";
import { ProgressBar } from "../components/ProgressBar";

export function Dashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAdminData()
      .then(setData)
      .catch((err) => setError(err?.message || "Failed to load dashboard data"));
  }, []);

  if (error) {
    return <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>;
  }

  if (!data) {
    return <div className="text-neutral-500">Loading Photography Intelligence…</div>;
  }

  const { stats } = data;

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] bg-black text-white p-8 md:p-10 overflow-hidden relative">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-white/10 to-transparent" />
        <div className="relative max-w-4xl">
          <p className="uppercase tracking-[0.28em] text-xs text-white/50 mb-4">
            Photography Intelligence
          </p>
          <h1 className="text-4xl md:text-6xl font-serif leading-tight">
            Your wedding content operating system.
          </h1>
          <p className="text-white/65 mt-5 max-w-2xl text-lg">
            Track weddings, image coverage, AI metadata and publishing readiness from one place.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Weddings"
          value={stats.weddingCount}
          detail={`${stats.readyWeddingCount} ready · ${stats.warningWeddingCount} need checks`}
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          title="Blog images"
          value={stats.blogImageCount}
          detail={`${stats.blogAiRows} AI rows`}
          icon={<ImageIcon className="w-5 h-5" />}
        />
        <StatCard
          title="Gallery images"
          value={stats.galleryImageCount}
          detail={`${stats.galleryAiRows} AI rows`}
          icon={<Camera className="w-5 h-5" />}
        />
        <StatCard
          title="AI coverage"
          value="100%"
          detail="Blog alt text and captions"
          icon={<Sparkles className="w-5 h-5" />}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-7">
            <div className="rounded-2xl bg-black text-white p-3">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-serif">AI health</h2>
              <p className="text-sm text-neutral-500">Blog image intelligence coverage</p>
            </div>
          </div>

          <div className="space-y-6">
            <ProgressBar label="Blog visual tags" done={stats.blogTagsComplete} total={stats.blogImageCount} />
            <ProgressBar label="Blog alt text" done={stats.blogAltComplete} total={stats.blogImageCount} />
            <ProgressBar label="Blog captions" done={stats.blogCaptionComplete} total={stats.blogImageCount} />
          </div>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <h2 className="text-2xl font-serif mb-3">Core commands</h2>
          <p className="text-sm text-neutral-500 mb-5">
            Temporary bridge until these actions run from the UI.
          </p>
          <div className="rounded-2xl bg-[#f5f3ef] border border-black/5 p-4">
            <code className="block text-xs whitespace-pre-wrap text-neutral-600">
              node scripts/mkb-intelligence.mjs --action=blog-status{"\n"}
              node scripts/mkb-intelligence.mjs --action=blog --apply{"\n"}
              node scripts/mkb-intelligence.mjs --action=sitemap
            </code>
          </div>
        </div>
      </section>
    </div>
  );
}
