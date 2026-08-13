import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe2,
  Images,
  LockKeyhole,
  MapPinned,
  Settings,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminPage, AdminPageHeader, AdminPanel, AdminStatus } from "../components/ui/AdminUI";
import { AdminApiService, type WorkspaceRecord } from "../services/AdminApiService";
import type { ClientGalleryListPayload } from "../types/clientGallery";
import type { WedPlannedPlatformPayload } from "../types/platform";
import type { PrintStoreAdminPayload } from "../types/printStore";

function Metric({ value, label, detail }: { value: ReactNode; label: string; detail?: string }) {
  return <div className="admin-module-metric"><strong>{value}</strong><span>{label}</span>{detail ? <small>{detail}</small> : null}</div>;
}

function Destination({ to, icon: Icon, title, description, meta }: { to: string; icon: typeof Images; title: string; description: string; meta?: ReactNode }) {
  return <Link to={to} className="admin-module-destination"><span className="admin-module-destination__icon"><Icon /></span><div><strong>{title}</strong><p>{description}</p>{meta ? <div className="admin-module-destination__meta">{meta}</div> : null}</div><ArrowRight className="admin-module-destination__arrow" /></Link>;
}

export function ClientGalleriesOverview() {
  const { auth } = useProfessionalAuth();
  const [galleries, setGalleries] = useState<ClientGalleryListPayload | null>(null);
  const [store, setStore] = useState<PrintStoreAdminPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    Promise.all([AdminApiService.listClientGalleries(), AdminApiService.getPrintStore()])
      .then(([nextGalleries, nextStore]) => { setGalleries(nextGalleries); setStore(nextStore); })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load WedStore overview."));
  }, [auth.workspaceId]);

  const summary = useMemo(() => {
    const records = galleries?.galleries || [];
    const orders = store?.orders || [];
    return {
      total: records.length,
      live: records.filter((gallery) => gallery.status === "live").length,
      images: records.reduce((total, gallery) => total + gallery.assetCount, 0),
      selections: records.reduce((total, gallery) => total + gallery.favouriteCount, 0),
      visitors: records.reduce((total, gallery) => total + gallery.visitorCount, 0),
      orders: orders.length,
      activeOrders: orders.filter((order) => !["fulfilled", "cancelled", "refunded"].includes(order.status)).length,
    };
  }, [galleries, store]);

  return <AdminPage>
    <AdminPageHeader
      eyebrow="WedStore · Private delivery"
      title="Dashboard"
      description="Manage private image delivery, client activity, selections, store configuration and orders without mixing these assets with the public website portfolio."
      actions={<Link to="/admin/client-galleries" className="admin-button admin-button--primary admin-button--md"><Images className="admin-button__icon" />Open galleries</Link>}
    />
    {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
    <section className="admin-module-metrics">
      <Metric value={summary.total} label="Client galleries" detail={`${summary.live} live`} />
      <Metric value={summary.images} label="Delivered images" detail="Across private galleries" />
      <Metric value={summary.selections} label="Favourites" detail={`${summary.visitors} visitors`} />
      <Metric value={summary.orders} label="Store orders" detail={`${summary.activeOrders} active`} />
    </section>
    <section className="admin-module-destination-grid">
      <Destination to="/admin/client-galleries" icon={Images} title="Client galleries" description="Create galleries, upload originals, control access, manage selections and apply gallery-specific branding." meta={<AdminStatus tone="info">{summary.live} live</AdminStatus>} />
      <Destination to="/admin/print-store?tab=catalogue" icon={Store} title="Store" description="Manage products and price lists used by enabled client galleries." meta={<AdminStatus tone="neutral">{store?.products.filter((product) => product.status === "active").length || 0} active products</AdminStatus>} />
      <Destination to="/admin/print-store?tab=orders" icon={ShoppingBag} title="Orders" description="Review payment, approve fulfilment and manage Prodigi submissions." meta={<AdminStatus tone={summary.activeOrders ? "warning" : "success"}>{summary.activeOrders} active</AdminStatus>} />
    </section>
    <AdminPanel title="How this module is organised" description="Private client delivery remains separate from WedStudio.">
      <div className="admin-module-guidance"><div><LockKeyhole /><span><strong>Gallery settings and branding</strong><small>Open an individual gallery to manage privacy, downloads, selections, albums, branding and store assignment.</small></span></div><div><CheckCircle2 /><span><strong>Client selections</strong><small>Favourites and formal selection requests remain attached to the gallery and its verified client identities.</small></span></div><div><Globe2 /><span><strong>Public portfolio content</strong><small>Website galleries, venues, moments and wedding stories are managed in WedStudio.</small></span></div></div>
    </AdminPanel>
  </AdminPage>;
}

export function BusinessOverview() {
  const { auth } = useProfessionalAuth();
  const [workspace, setWorkspace] = useState<WorkspaceRecord | null>(null);
  const [platform, setPlatform] = useState<WedPlannedPlatformPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    Promise.all([AdminApiService.getWorkspace(), AdminApiService.getWedPlannedPlatform()])
      .then(([nextWorkspace, nextPlatform]) => { setWorkspace(nextWorkspace); setPlatform(nextPlatform); })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load WedNav overview."));
  }, [auth.workspaceId]);

  const selectedCategories = platform?.categories.filter((category) => category.selected) || [];
  const activeMembers = platform?.members.filter((member) => member.status === "active") || [];
  const verifiedDomains = workspace?.domains.filter((domain) => domain.verified) || [];
  const onboarding = platform?.onboarding;
  const onboardingProgress = onboarding?.totalCount
    ? Math.round((onboarding.completedCount / onboarding.totalCount) * 100)
    : 0;

  return <AdminPage>
    <AdminPageHeader
      eyebrow="WedNav · Business home"
      title="Dashboard"
      description="Your central WedPlanned business home for workspace identity, services, suppliers, team and access to the specialist products."
      actions={<Link to="/admin/wedplanned?tab=business" className="admin-button admin-button--primary admin-button--md"><Building2 className="admin-button__icon" />Edit business profile</Link>}
      meta={<div className="flex flex-wrap gap-2"><AdminStatus tone={workspace?.status === "active" ? "success" : "warning"}>{workspace?.status || "loading"}</AdminStatus><AdminStatus tone="info">{workspace?.plan || "workspace"}</AdminStatus></div>}
    />
    {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}

    {onboarding?.applicable && onboarding.state !== "complete" ? (
      <AdminPanel
        title="Set up your business"
        description={
          onboarding.state === "deferred"
            ? "Your first-run setup is paused. Resume when you are ready; your progress has been saved."
            : "Complete the essential business details so WedPlanned can tailor this workspace to how you operate."
        }
        actions={
          <Link
            to="/admin/onboarding"
            className="admin-button admin-button--primary admin-button--md"
          >
            <CheckCircle2 className="admin-button__icon" />
            {onboarding.state === "deferred" ? "Resume setup" : "Continue setup"}
          </Link>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong className="text-sm">
              {onboarding.completedCount} of {onboarding.totalCount} setup steps resolved
            </strong>
            <p className="mt-1 text-xs text-neutral-500">
              Required: business identity, services and service area. Contact and brand details can be deferred.
            </p>
          </div>

          <AdminStatus
            tone={onboarding.state === "deferred" ? "warning" : "info"}
          >
            {onboardingProgress}% complete
          </AdminStatus>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-black transition-all"
            style={{ width: `${onboardingProgress}%` }}
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {onboarding.steps.map((step) => (
            <div
              key={step.key}
              className="rounded-xl bg-[#f7f5f1] p-3"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={14}
                  className={
                    step.complete || step.deferred
                      ? "text-emerald-600"
                      : "text-neutral-300"
                  }
                />

                <span className="text-xs font-semibold">
                  {step.label}
                </span>
              </div>

              <small className="mt-1 block text-[10px] text-neutral-500">
                {step.complete
                  ? "Complete"
                  : step.deferred
                    ? "Do later"
                    : step.required
                      ? "Required"
                      : "Optional"}
              </small>
            </div>
          ))}
        </div>
      </AdminPanel>
    ) : null}

    <section className="admin-module-metrics">
      <Metric value={activeMembers.length} label="Active team members" detail={`${platform?.members.length || 0} total memberships`} />
      <Metric value={selectedCategories.length} label="Business services" detail={`${platform?.serviceAreas.length || 0} service areas`} />
      <Metric value={verifiedDomains.length} label="Verified domains" detail={`${workspace?.domains.length || 0} registered`} />
      <Metric value={workspace?.plan || "Workspace"} label="Workspace plan" detail={workspace?.status || "Loading"} />
    </section>
    <section className="admin-module-destination-grid">
      <Destination to="/admin/wedplanned?tab=business" icon={Building2} title="Business profile" description="Public identity, legal details, contact information and business status." meta={<AdminStatus tone="info">{platform?.business.publicName || auth.businessName}</AdminStatus>} />
      <Destination to="/admin/wedplanned?tab=services" icon={MapPinned} title="Services & areas" description="Choose business categories and define the regions this workspace covers." meta={<AdminStatus tone="neutral">{selectedCategories.length} services</AdminStatus>} />
      <Destination to="/admin/suppliers" icon={Users} title="Suppliers" description="Maintain the workspace supplier master database for reuse across weddings, jobs and content." />
      <Destination to="/admin/wedplanned?tab=team" icon={Users} title="Team members" description="Invite people and manage workspace-scoped roles and access." meta={<AdminStatus tone="success">{activeMembers.length} active</AdminStatus>} />
      <Destination to="/admin/settings" icon={Settings} title="Domains & workspace" description="Workspace name, website details, currency, timezone and verified domains." meta={<AdminStatus tone="info">{verifiedDomains.length} verified</AdminStatus>} />
    </section>
    <AdminPanel title="Your WedPlanned products" description="WedNav is the business home. Open the specialist product when you need to manage clients, content or commerce.">
      <div className="admin-module-destination-grid">
        <Destination to="/admin/crm?view=overview" icon={Users} title="WedCRM" description="Manage enquiries, clients, Jobs, workflows, quotes, questionnaires and Client Portal activity." />
        <Destination to="/admin/studio" icon={Globe2} title="WedStudio" description="Manage the website, public galleries, wedding stories, locations, content, SEO and publishing." />
        <Destination to="/admin/client-galleries/overview" icon={Store} title="WedStore" description="Manage private client delivery, gallery commerce, orders and fulfilment." />
      </div>
    </AdminPanel>
    <AdminPanel title="Isolation boundary" description="Business configuration is workspace-owned and does not grant cross-workspace access.">
      <div className="admin-module-guidance"><div><LockKeyhole /><span><strong>Tenant scoped</strong><small>Members, domains and business data remain attached to the active workspace.</small></span></div><div><Users /><span><strong>Explicit access</strong><small>Team membership and support access are role-scoped, auditable and revocable.</small></span></div><div><Globe2 /><span><strong>Future network links</strong><small>Venue and supplier collaboration must use explicit workspace-to-workspace permissions rather than shared unrestricted access.</small></span></div></div>
    </AdminPanel>
  </AdminPage>;
}
