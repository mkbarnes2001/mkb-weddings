import {
  useEffect,
  useMemo,
  useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Copy,
  Database,
  FileText,
  Globe2,
  Images,
  Layers3,
  MapPinned,
  Save,
  Sparkles,
  } from "lucide-react";
import { loadAdminData,
  type AdminData } from "../services/DataService";
import {
  AdminApiService,
  type WorkspaceRecord,
  type WorkspaceSettings,
  } from "../services/AdminApiService";
import { ProgressBar } from "../components/ProgressBar";
import {
  AdminButton,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
  AdminHeaderRouterLink,
} from "../components/ui/AdminUI";

type WebsiteConnectionPlatform =
  WorkspaceSettings["websiteConnectionPlatform"];

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

function StudioSnapshot({
  to,
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
  status = "Open",
}: {
  to: string;
  icon: typeof Images;
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  status?: string;
}) {
  return <Link to={to} className="admin-studio-snapshot">
    <span className="admin-studio-snapshot__icon"><Icon /></span>
    <span className="admin-studio-snapshot__content">
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{detail}</em>
    </span>
    <AdminStatus tone={tone}>{status}</AdminStatus>
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

function useWorkspaceSettings(errorMessage: string) {
  const [workspace, setWorkspace] = useState<WorkspaceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    AdminApiService.getWorkspace()
      .then((next) => {
        if (active) setWorkspace(next);
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : errorMessage,
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [errorMessage]);

  return {
    workspace,
    setWorkspace,
    loading,
    error,
  };
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

function websiteConfigured(workspace: WorkspaceRecord | null) {
  if (!workspace) return false;

  const settings = workspace.settings;

  return settings.websiteConnectionStatus === "configured"
    && settings.websiteConnectionPlatform !== "none"
    && Boolean(settings.websiteConnectionDomain);
}

function normaliseOrigin(value: string) {
  const candidate = value.trim();

  if (!candidate) return "";

  try {
    const url = new URL(
      /^https?:\/\//i.test(candidate)
        ? candidate
        : `https://${candidate}`,
    );

    return url.origin;
  } catch {
    return "";
  }
}

function publicContentOrigin(workspace: WorkspaceRecord) {
  const settings = workspace.settings;

  const candidates = [
    settings.publicHostname,
    workspace.domains.find(
      (domain) => domain.purpose === "public" && domain.verified,
    )?.hostname || "",
    settings.websiteUrl,
  ];

  for (const candidate of candidates) {
    const origin = normaliseOrigin(candidate);
    if (origin) return origin;
  }

  return window.location.origin;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function websiteEmbedCode(workspace: WorkspaceRecord) {
  const settings = workspace.settings;
  const origin = publicContentOrigin(workspace);

  const links: Array<{
    href: string;
    label: string;
  }> = [];

  if (
    settings.websiteConnectionGalleries
    || settings.websiteConnectionVenues
    || settings.websiteConnectionMoments
  ) {
    links.push({
      href: `${origin}/galleries`,
      label: "View our galleries",
    });
  }

  if (settings.websiteConnectionStories) {
    links.push({
      href: `${origin}/blog`,
      label: "Read our wedding stories",
    });
  }

  if (!links.length) {
    links.push({
      href: origin,
      label: "Visit our WedPlanned website",
    });
  }

  const content = [
    settings.websiteConnectionGalleries ? "galleries" : "",
    settings.websiteConnectionStories ? "stories" : "",
    settings.websiteConnectionVenues ? "venues" : "",
    settings.websiteConnectionMoments ? "moments" : "",
  ].filter(Boolean).join(",");

  return [
    `<!-- WedPlanned content links for ${workspace.name} -->`,
    `<section class="wedplanned-content-links" data-wedplanned-workspace="${escapeHtml(workspace.slug)}" data-wedplanned-content="${content}">`,
    ...links.map(
      (link) => `  <a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`,
    ),
    "</section>",
  ].join("\n");
}

function connectionInstructions(platform: WebsiteConnectionPlatform) {
  if (platform === "wordpress") {
    return "Add a Custom HTML block in WordPress and paste the generated code into the page or template where the links should appear.";
  }

  if (platform === "squarespace") {
    return "Add a Code block in Squarespace and paste the generated code into the required page section.";
  }

  if (platform === "html") {
    return "Paste the generated block into the appropriate HTML template or provide it to the website developer.";
  }

  return "Choose the website platform to generate the appropriate installation guidance.";
}

export function Dashboard() {
  const {
    data,
    error: dataError,
  } = useStudioData("Failed to load WedStudio overview data");

  const {
    workspace,
    loading: workspaceLoading,
    error: workspaceError,
  } = useWorkspaceSettings(
    "Failed to load website connection status",
  );

  const error = dataError || workspaceError;

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  }

  if (!data || workspaceLoading) {
    return <div className="text-neutral-500">Loading WedStudio overview…</div>;
  }

  const { stats } = data;
  const connected = websiteConfigured(workspace);

  const websiteUrl = workspace
    ? workspace.settings.websiteConnectionDomain
      || workspace.settings.websiteUrl
    : "";

  return <AdminPage>
    <AdminPageHeader
      eyebrow="WedStudio · Content operations"
      title="Dashboard"
      description="Monitor website connectivity, content readiness, galleries, assets, metadata, SEO and publishing from one operational dashboard."
      actions={websiteUrl
        ? <a href={websiteUrl} target="_blank" rel="noreferrer" className="admin-button admin-button--primary admin-button--md"><Globe2 className="admin-button__icon" />Open website</a>
        : <AdminHeaderRouterLink to="/admin/website" className="admin-button admin-button--primary admin-button--md"><Globe2 className="admin-button__icon" />Configure website</AdminHeaderRouterLink>}
    />

    <OverviewMetrics data={data} />

    <section className="admin-studio-snapshot-grid">
      <StudioSnapshot
        to="/admin/website"
        icon={Globe2}
        label="Website connection"
        value={connected ? "Configured" : "Not configured"}
        detail={connected && workspace
          ? workspace.settings.websiteConnectionDomain
          : "Connect WordPress, Squarespace or custom HTML"}
        tone={connected ? "success" : "warning"}
        status={connected ? "Ready" : "Set up"}
      />

      <StudioSnapshot
        to="/admin/weddings"
        icon={FileText}
        label="Wedding stories"
        value={`${stats.weddingCount} stories`}
        detail={`${stats.readyWeddingCount} ready for publishing`}
        tone={stats.warningWeddingCount ? "warning" : "success"}
        status={stats.warningWeddingCount ? "Check" : "Ready"}
      />

      <StudioSnapshot
        to="/admin/gallery"
        icon={Images}
        label="Public galleries"
        value={`${stats.galleryImageCount} images`}
        detail="Venue, moment and collection content"
        tone="info"
      />

      <StudioSnapshot
        to="/admin/venues"
        icon={MapPinned}
        label="Venues and locations"
        value="Editorial content"
        detail="Pages, galleries and location assignments"
      />

      <StudioSnapshot
        to="/admin/moments"
        icon={Layers3}
        label="Moments and collections"
        value="Curated content"
        detail="Reusable portfolio groupings"
      />

      <StudioSnapshot
        to="/admin/assets"
        icon={Database}
        label="Asset library"
        value="Canonical assets"
        detail="Reusable photographs and content records"
      />

      <StudioSnapshot
        to="/admin/ai"
        icon={Bot}
        label="AI content"
        value={`${stats.blogAiRows + stats.galleryAiRows} AI rows`}
        detail="Captions, tags and supporting metadata"
        tone="info"
      />

      <StudioSnapshot
        to="/admin/seo"
        icon={BarChart3}
        label="SEO readiness"
        value={`${stats.warningWeddingCount} checks`}
        detail="Search metadata and public visibility"
        tone={stats.warningWeddingCount ? "warning" : "success"}
        status={stats.warningWeddingCount ? "Check" : "Ready"}
      />

      <StudioSnapshot
        to="/admin/publishing"
        icon={Sparkles}
        label="Publishing"
        value={`${stats.readyWeddingCount} ready`}
        detail="Controlled record-level publishing"
        tone={stats.readyWeddingCount ? "success" : "neutral"}
        status={stats.readyWeddingCount ? "Ready" : "Open"}
      />
    </section>

    <AdminPanel
      title="WedStudio boundary"
      description="WedStudio owns public-facing content and publishing."
    >
      <div className="admin-module-guidance">
        <div><Globe2 /><span><strong>Public website</strong><small>Website pages, stories, venues, galleries and search content are managed here.</small></span></div>
        <div><Images /><span><strong>Private client delivery</strong><small>Downloads, selections, favourites and print sales remain in WedStore and are surfaced to clients through the Client Portal.</small></span></div>
        <div><Sparkles /><span><strong>Controlled publishing</strong><small>Content can be prepared and reviewed in WedStudio before it is made public.</small></span></div>
      </div>
    </AdminPanel>
  </AdminPage>;
}

export function WebsiteOverview() {
  const {
    data,
    error: dataError,
  } = useStudioData("Failed to load Website overview data");

  const {
    workspace,
    setWorkspace,
    loading: workspaceLoading,
    error: workspaceError,
  } = useWorkspaceSettings(
    "Failed to load website configuration",
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const embedCode = useMemo(
    () => workspace ? websiteEmbedCode(workspace) : "",
    [workspace],
  );

  const error = dataError || workspaceError;

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  }

  if (!data || workspaceLoading || !workspace) {
    return <div className="text-neutral-500">Loading Website…</div>;
  }

  const { stats } = data;
  const settings = workspace.settings;
  const configured = websiteConfigured(workspace);

  const websiteUrl =
    settings.websiteConnectionDomain
    || settings.websiteUrl;

  function update<K extends keyof WorkspaceSettings>(
    key: K,
    value: WorkspaceSettings[K],
  ) {
    setWorkspace((current) => current ? {
      ...current,
      settings: {
        ...current.settings,
        [key]: value,
      },
    } : current);

    setMessage("");
    setSaveError("");
  }

  async function saveConnection() {
    const ready =
      settings.websiteConnectionPlatform !== "none"
      && Boolean(settings.websiteConnectionDomain.trim());

    const nextWorkspace: WorkspaceRecord = {
      ...workspace,
      settings: {
        ...settings,
        websiteConnectionStatus: ready
          ? "configured"
          : "not_configured",
        websiteConnectionLastCheckedAt:
          new Date().toISOString(),
      },
    };

    setSaving(true);
    setMessage("");
    setSaveError("");

    try {
      const updated =
        await AdminApiService.updateWorkspace(nextWorkspace);

      setWorkspace(updated);

      setMessage(
        ready
          ? "Website connection configuration saved."
          : "Website connection saved as not configured.",
      );
    } catch (cause) {
      setSaveError(
        cause instanceof Error
          ? cause.message
          : "Unable to save website connection.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setMessage("Website code copied.");
      setSaveError("");
    } catch {
      setSaveError(
        "Unable to copy automatically. Select the code and copy it manually.",
      );
    }
  }

  return <AdminPage>
    <AdminPageHeader
      eyebrow="WedStudio · Website"
      title="Website"
      description="Configure how WedPlanned galleries and wedding stories connect to WordPress, Squarespace or a custom HTML website."
      actions={websiteUrl
        ? <a href={websiteUrl} target="_blank" rel="noreferrer" className="admin-button admin-button--primary admin-button--md"><Globe2 className="admin-button__icon" />Open website</a>
        : null}
    />

    {message
      ? <div className="admin-alert admin-alert--success">{message}</div>
      : null}

    {saveError
      ? <div className="admin-alert admin-alert--error">{saveError}</div>
      : null}

    <section className="website-connection-grid">
      <AdminPanel
        title="Website connection"
        description="Workspace-owned configuration for an external website."
        icon={Globe2}
        actions={<AdminStatus tone={configured ? "success" : "warning"}>{configured ? "Configured" : "Not configured"}</AdminStatus>}
      >
        <div className="website-connection-form">
          <AdminField label="Website platform">
            <select
              className="admin-select"
              value={settings.websiteConnectionPlatform}
              onChange={(event) => update(
                "websiteConnectionPlatform",
                event.target.value as WebsiteConnectionPlatform,
              )}
            >
              <option value="none">Choose platform</option>
              <option value="wordpress">WordPress</option>
              <option value="squarespace">Squarespace</option>
              <option value="html">Custom HTML website</option>
            </select>
          </AdminField>

          <AdminField
            label="Connected website"
            help="Enter the external website address, including https://."
          >
            <input
              className="admin-input"
              value={settings.websiteConnectionDomain}
              onChange={(event) => update(
                "websiteConnectionDomain",
                event.target.value,
              )}
              placeholder="https://www.example.com"
            />
          </AdminField>

          <div className="website-connection-checkboxes">
            <label>
              <input
                type="checkbox"
                checked={settings.websiteConnectionGalleries}
                onChange={(event) => update(
                  "websiteConnectionGalleries",
                  event.target.checked,
                )}
              />
              <span><strong>Galleries</strong><small>Public portfolio and gallery links</small></span>
            </label>

            <label>
              <input
                type="checkbox"
                checked={settings.websiteConnectionStories}
                onChange={(event) => update(
                  "websiteConnectionStories",
                  event.target.checked,
                )}
              />
              <span><strong>Wedding stories</strong><small>Published blog and story links</small></span>
            </label>

            <label>
              <input
                type="checkbox"
                checked={settings.websiteConnectionVenues}
                onChange={(event) => update(
                  "websiteConnectionVenues",
                  event.target.checked,
                )}
              />
              <span><strong>Venues</strong><small>Venue content within public galleries</small></span>
            </label>

            <label>
              <input
                type="checkbox"
                checked={settings.websiteConnectionMoments}
                onChange={(event) => update(
                  "websiteConnectionMoments",
                  event.target.checked,
                )}
              />
              <span><strong>Moments and collections</strong><small>Curated content within public galleries</small></span>
            </label>
          </div>

          <div className="website-connection-actions">
            <AdminButton
              variant="primary"
              icon={Save}
              disabled={saving}
              onClick={() => void saveConnection()}
            >
              {saving ? "Saving…" : "Save connection"}
            </AdminButton>

            {settings.websiteConnectionLastCheckedAt
              ? <small>Last configuration check: {new Date(settings.websiteConnectionLastCheckedAt).toLocaleString("en-GB")}</small>
              : null}
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Installation code"
        description={connectionInstructions(
          settings.websiteConnectionPlatform,
        )}
        icon={Copy}
        actions={<AdminButton
          variant="secondary"
          icon={Copy}
          onClick={() => void copyCode()}
        >
          Copy code
        </AdminButton>}
      >
        <textarea
          className="admin-textarea website-embed-code"
          readOnly
          value={embedCode}
          rows={9}
        />

        <div className="website-connection-note">
          <CheckCircle2 />
          <span>
            <strong>Configuration status only</strong>
            <small>WedPlanned records that the connection has been configured. It does not currently verify installation on the external website.</small>
          </span>
        </div>
      </AdminPanel>
    </section>

    <OverviewMetrics data={data} />

    <section className="admin-module-destination-grid">
      <Destination
        to="/admin/weddings"
        icon={FileText}
        title="Wedding stories"
        description="Create and publish website stories from operational Wedding Workspaces."
        status={`${stats.weddingCount} stories`}
      />

      <Destination
        to="/admin/gallery"
        icon={Images}
        title="Galleries"
        description="Control public venue, moment, location, creative-flash and collection content."
        status={`${stats.galleryImageCount} images`}
      />

      <Destination
        to="/admin/venues"
        icon={MapPinned}
        title="Venues"
        description="Maintain venue pages, public galleries, locations and editorial content."
      />

      <Destination
        to="/admin/seo"
        icon={BarChart3}
        title="SEO"
        description="Review public search metadata and content visibility."
      />
    </section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
      <AdminPanel
        title="AI content coverage"
        description="Current wedding-story metadata completeness"
        icon={Sparkles}
      >
        <div className="space-y-5">
          <ProgressBar label="Blog visual tags" done={stats.blogTagsComplete} total={stats.blogImageCount} />
          <ProgressBar label="Blog alt text" done={stats.blogAltComplete} total={stats.blogImageCount} />
          <ProgressBar label="Blog captions" done={stats.blogCaptionComplete} total={stats.blogImageCount} />
        </div>
      </AdminPanel>

      <AdminPanel
        title="Website boundary"
        description="Public website content only"
        icon={Globe2}
      >
        <div className="admin-module-guidance">
          <div><Globe2 /><span><strong>Website content</strong><small>Public portfolio content used for marketing, venues and wedding stories.</small></span></div>
          <div><Images /><span><strong>Client Galleries</strong><small>Private delivery, favourites, selections, downloads and print sales are managed separately.</small></span></div>
        </div>
      </AdminPanel>
    </section>
  </AdminPage>;
}

export function PublishingOverview() {
  const {
    data,
    error,
  } = useStudioData("Failed to load Publishing overview data");

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  }

  if (!data) {
    return <div className="text-neutral-500">Loading Publishing…</div>;
  }

  const { stats } = data;

  return <AdminPage>
    <AdminPageHeader
      eyebrow="WedStudio · Publishing"
      title="Publishing"
      description="Review public-content readiness and move incomplete stories, galleries, metadata and search content through the appropriate WedStudio tools."
      actions={<AdminHeaderRouterLink to="/admin/weddings" className="admin-button admin-button--primary admin-button--md"><FileText className="admin-button__icon" />Review wedding stories</AdminHeaderRouterLink>}
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
            <small>Complete story, venue and gallery content in its owning WedStudio section.</small>
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
