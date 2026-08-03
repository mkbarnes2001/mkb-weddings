import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, FileText, Globe2, Images, MapPinned, Sparkles } from "lucide-react";
import { loadAdminData, type AdminData } from "../services/DataService";
import { ProgressBar } from "../components/ProgressBar";
import { AdminPage, AdminPageHeader, AdminPanel, AdminStatus } from "../components/ui/AdminUI";

function Destination({ to, icon: Icon, title, description, status }: { to: string; icon: typeof Images; title: string; description: string; status?: string }) {
  return <Link to={to} className="admin-module-destination"><span className="admin-module-destination__icon"><Icon /></span><div><strong>{title}</strong><p>{description}</p>{status ? <div className="admin-module-destination__meta"><AdminStatus tone="info">{status}</AdminStatus></div> : null}</div><ArrowRight className="admin-module-destination__arrow" /></Link>;
}

export function Dashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAdminData()
      .then(setData)
      .catch((err) => setError(err?.message || "Failed to load website overview data"));
  }, []);

  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="text-neutral-500">Loading Website overview…</div>;

  const { stats } = data;

  return <AdminPage>
    <AdminPageHeader
      eyebrow="Website · Public content"
      title="Website overview"
      description="Manage public wedding stories, venues, portfolio galleries, supporting assets and search visibility. Private client delivery remains in Client Galleries."
      actions={<a href="https://www.mkbweddings.co.uk/" target="_blank" rel="noreferrer" className="admin-button admin-button--primary admin-button--md"><Globe2 className="admin-button__icon" />Open website</a>}
    />
    <section className="admin-module-metrics">
      <div className="admin-module-metric"><strong>{stats.weddingCount}</strong><span>Wedding stories</span><small>{stats.readyWeddingCount} ready</small></div>
      <div className="admin-module-metric"><strong>{stats.blogImageCount}</strong><span>Story images</span><small>{stats.blogAiRows} AI rows</small></div>
      <div className="admin-module-metric"><strong>{stats.galleryImageCount}</strong><span>Portfolio images</span><small>{stats.galleryAiRows} AI rows</small></div>
      <div className="admin-module-metric"><strong>{stats.warningWeddingCount}</strong><span>Stories needing checks</span><small>Content or image readiness</small></div>
    </section>
    <section className="admin-module-destination-grid">
      <Destination to="/admin/weddings" icon={FileText} title="Weddings & stories" description="Manage wedding records, content, suppliers, images and publishing readiness." status={`${stats.weddingCount} stories`} />
      <Destination to="/admin/gallery" icon={Images} title="Website galleries" description="Control public venue, moment, location, creative-flash and collection landing content." status={`${stats.galleryImageCount} images`} />
      <Destination to="/admin/venues" icon={MapPinned} title="Venues" description="Maintain venue pages, public galleries, locations and editorial content." />
      <Destination to="/admin/seo" icon={BarChart3} title="SEO" description="Review public search metadata and content visibility." />
    </section>
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
      <AdminPanel title="AI content coverage" description="Current wedding-story metadata completeness" icon={Sparkles}>
        <div className="space-y-5">
          <ProgressBar label="Blog visual tags" done={stats.blogTagsComplete} total={stats.blogImageCount} />
          <ProgressBar label="Blog alt text" done={stats.blogAltComplete} total={stats.blogImageCount} />
          <ProgressBar label="Blog captions" done={stats.blogCaptionComplete} total={stats.blogImageCount} />
        </div>
      </AdminPanel>
      <AdminPanel title="Module boundary" description="Public content only" icon={Globe2}>
        <div className="admin-module-guidance"><div><Globe2 /><span><strong>Website galleries</strong><small>Public portfolio content used for marketing, venues and wedding stories.</small></span></div><div><Images /><span><strong>Client Galleries</strong><small>Private delivery, favourites, selections, downloads and print sales are managed separately.</small></span></div></div>
      </AdminPanel>
    </section>
  </AdminPage>;
}
