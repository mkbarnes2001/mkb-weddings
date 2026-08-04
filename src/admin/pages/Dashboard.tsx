import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Database,
  FileText,
  Globe2,
  Images,
  Layers3,
  MapPinned,
  Sparkles,
} from "lucide-react";
import { loadAdminData, type AdminData } from "../services/DataService";
import { ProgressBar } from "../components/ProgressBar";
import { AdminPage, AdminPageHeader, AdminPanel, AdminStatus } from "../components/ui/AdminUI";

function Destination({
  to,
  icon: Icon,
  title,
  description,
  status,
}: {
  to: string;
  icon: typeof Images;
  title: string;
  description: string;
  status?: string;
}) {
  return <Link to={to} className="admin-module-destination">
    <span className="admin-module-destination__icon"><Icon /></span>
    <div>
      <strong>{title}</strong>
      <p>{description}</p>
      {status ? <div className="admin-module-destination__meta"><AdminStatus tone="info">{status}</AdminStatus></div> : null}
    </div>
    <ArrowRight className="admin-module-destination__arrow" />
  </Link>;
}

function useStudioData(errorMessage: string) {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setError("");

    loadAdminData()
      .then((next) => {
        if (active) setData(next);
      })
      .catch((loadError) => {
        if (active) setError(loadError?.message || errorMessage);
      });

    return () => {
      active = false;
    };
  }, [errorMessage]);

  return { data, error };
}

function OverviewMetrics({ data }: { data: AdminData }) {
  const { stats } = data;

  return <section className="admin-module-metrics">
    <div className="admin-module-metric"><strong>{stats.weddingCount}</strong><span>Wedding stories</span><small>{stats.readyWeddingCount} ready</small></div>
    <div className="admin-module-metric"><strong>{stats.blogImageCount}</strong><span>Story images</span><small>{stats.blogAiRows} AI rows</small></div>
    <div className="admin-module-metric"><strong>{stats.galleryImageCount}</strong><span>Portfolio images</span><small>{stats.galleryAiRows} AI rows</small></div>
    <div className="admin-module-metric"><strong>{stats.warningWeddingCount}</strong><span>Items needing checks</span><small>Content or image readiness</small></div>
  </section>;
}

export function Dashboard() {
  const { data, error } = useStudioData("Failed to load Studio overview data");

  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="text-neutral-500">Loading Studio overview…</div>;

  const { stats } = data;

  return <AdminPage>
    <AdminPageHeader
      eyebrow="Studio · Content operations"
      title="Studio overview"
      description="Manage the public website, wedding stories, galleries, locations, reusable assets, AI content, SEO and publishing from one workspace."
      actions={<a href="https://www.mkbweddings.co.uk/" target="_blank" rel="noreferrer" className="admin-button admin-button--primary admin-button--md"><Globe2 className="admin-button__icon" />Open website</a>}
    />

    <OverviewMetrics data={data} />

    <section className="admin-module-destination-grid">
      <Destination to="/admin/website" icon={Globe2} title="Website" description="Review the public website content structure and move into the relevant editing tools." />
      <Destination to="/admin/weddings" icon={FileText} title="Wedding stories" description="Create and publish stories from operational Wedding Workspaces." status={`${stats.weddingCount} stories`} />
      <Destination to="/admin/gallery" icon={Images} title="Galleries" description="Manage venue, moment, location, creative-flash and collection galleries." status={`${stats.galleryImageCount} images`} />
      <Destination to="/admin/venues" icon={MapPinned} title="Venues & locations" description="Maintain venue pages, location assignments, editorial content and public galleries." />
      <Destination to="/admin/moments" icon={Layers3} title="Moments & collections" description="Organise reusable portfolio groupings and curated public content." />
      <Destination to="/admin/assets" icon={Database} title="Asset library" description="Review reusable images and content assets used across Studio." />
      <Destination to="/admin/ai" icon={Bot} title="AI content" description="Generate and review supporting metadata, descriptions and editorial content." />
      <Destination to="/admin/seo" icon={BarChart3} title="SEO" description="Review search metadata, content completeness and public visibility." />
      <Destination to="/admin/publishing" icon={Sparkles} title="Publishing" description="Validate and deploy completed public content from a controlled checklist." />
    </section>

    <AdminPanel title="Studio boundary" description="Studio owns public-facing content and publishing.">
      <div className="admin-module-guidance">
        <div><Globe2 /><span><strong>Public website</strong><small>Website pages, stories, venues, galleries and search content are managed here.</small></span></div>
        <div><Images /><span><strong>Private client delivery</strong><small>Downloads, selections, favourites and print sales remain in Client Galleries.</small></span></div>
        <div><Sparkles /><span><strong>Controlled publishing</strong><small>Content can be prepared and reviewed in Studio before it is made public.</small></span></div>
      </div>
    </AdminPanel>
  </AdminPage>;
}

export function WebsiteOverview() {
  const { data, error } = useStudioData("Failed to load Website overview data");

  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="text-neutral-500">Loading Website…</div>;

  const { stats } = data;

  return <AdminPage>
    <AdminPageHeader
      eyebrow="Studio · Website"
      title="Website"
      description="Manage the public wedding stories, venues, galleries and search content that form the workspace website."
      actions={<a href="https://www.mkbweddings.co.uk/" target="_blank" rel="noreferrer" className="admin-button admin-button--primary admin-button--md"><Globe2 className="admin-button__icon" />Open website</a>}
    />

    <OverviewMetrics data={data} />

    <section className="admin-module-destination-grid">
      <Destination to="/admin/weddings" icon={FileText} title="Wedding stories" description="Create and publish website stories from operational Wedding Workspaces." status={`${stats.weddingCount} stories`} />
      <Destination to="/admin/gallery" icon={Images} title="Galleries" description="Control public venue, moment, location, creative-flash and collection content." status={`${stats.galleryImageCount} images`} />
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

      <AdminPanel title="Website boundary" description="Public website content only" icon={Globe2}>
        <div className="admin-module-guidance">
          <div><Globe2 /><span><strong>Website content</strong><small>Public portfolio content used for marketing, venues and wedding stories.</small></span></div>
          <div><Images /><span><strong>Client Galleries</strong><small>Private delivery, favourites, selections, downloads and print sales are managed separately.</small></span></div>
        </div>
      </AdminPanel>
    </section>
  </AdminPage>;
}

export function PublishingOverview() {
  const { data, error } = useStudioData("Failed to load Publishing overview data");

  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="text-neutral-500">Loading Publishing…</div>;

  const { stats } = data;

  return <AdminPage>
    <AdminPageHeader
      eyebrow="Studio · Publishing"
      title="Publishing"
      description="Review public-content readiness and move incomplete stories, galleries, metadata and search content through the appropriate Studio tools."
      actions={<Link to="/admin/weddings" className="admin-button admin-button--primary admin-button--md"><FileText className="admin-button__icon" />Review wedding stories</Link>}
    />

    <OverviewMetrics data={data} />

    <section className="admin-module-destination-grid">
      <Destination
        to="/admin/weddings"
        icon={FileText}
        title="Wedding stories"
        description="Review story content, images and publication status."
        status={`${stats.readyWeddingCount} ready`}
      />
      <Destination
        to="/admin/gallery"
        icon={Images}
        title="Galleries"
        description="Review the public image collections supporting venues, moments and stories."
        status={`${stats.galleryImageCount} images`}
      />
      <Destination
        to="/admin/ai"
        icon={Bot}
        title="AI content"
        description="Complete supporting captions, tags, descriptions and image metadata."
      />
      <Destination
        to="/admin/seo"
        icon={BarChart3}
        title="SEO"
        description="Review titles, descriptions and public search visibility before release."
      />
    </section>

    <AdminPanel
      title="Publishing workflow"
      description="Publishing remains controlled by the existing content-specific tools."
      icon={Sparkles}
    >
      <div className="admin-module-guidance">
        <div>
          <FileText />
          <span>
            <strong>Prepare</strong>
            <small>Complete story, venue and gallery content in its owning Studio section.</small>
          </span>
        </div>
        <div>
          <BarChart3 />
          <span>
            <strong>Validate</strong>
            <small>Review image readiness, AI metadata, SEO fields and outstanding warnings.</small>
          </span>
        </div>
        <div>
          <Globe2 />
          <span>
            <strong>Publish</strong>
            <small>Use the existing record-level publishing controls once the content is ready.</small>
          </span>
        </div>
      </div>
    </AdminPanel>
  </AdminPage>;
}
