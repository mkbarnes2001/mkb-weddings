import { useEffect, useState } from "react";
import { Activity, Camera, FileText, Image as ImageIcon, Sparkles } from "lucide-react";
import { loadAdminData, type AdminData } from "../services/DataService";
import { StatCard } from "../components/StatCard";
import { ProgressBar } from "../components/ProgressBar";
import { AdminPage, AdminPageHeader, AdminPanel } from "../components/ui/AdminUI";

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
    <AdminPage>
      <AdminPageHeader
        eyebrow="Photography Intelligence"
        title="Dashboard"
        description="Track weddings, image coverage, AI metadata and publishing readiness from one place."
      />

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

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AdminPanel className="lg:col-span-2" title="AI health" description="Blog image intelligence coverage" icon={Activity}>
          <div className="space-y-5">
            <ProgressBar label="Blog visual tags" done={stats.blogTagsComplete} total={stats.blogImageCount} />
            <ProgressBar label="Blog alt text" done={stats.blogAltComplete} total={stats.blogImageCount} />
            <ProgressBar label="Blog captions" done={stats.blogCaptionComplete} total={stats.blogImageCount} />
          </div>
        </AdminPanel>

        <AdminPanel title="Core commands" description="Temporary bridge until these actions run from the UI.">
          <div className="rounded-lg border border-black/5 bg-[#f5f3ef] p-4">
            <code className="block whitespace-pre-wrap text-[10px] leading-5 text-neutral-600">
              node scripts/mkb-intelligence.mjs --action=blog-status{"\n"}
              node scripts/mkb-intelligence.mjs --action=blog --apply{"\n"}
              node scripts/mkb-intelligence.mjs --action=sitemap
            </code>
          </div>
        </AdminPanel>
      </section>
    </AdminPage>
  );
}
