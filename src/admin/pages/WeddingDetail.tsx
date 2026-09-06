import { AdminActionButton, AdminActionLink } from "../components/ui/AdminActionControl";
import {
  useEffect,
  useMemo,
  useState } from "react";
import { Link,
  useNavigate,
  useParams } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  FilePenLine,
  FolderKanban,
  Image as ImageIcon,
  LayoutDashboard,
  SearchCheck,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
  } from "lucide-react";
import { WeddingService } from "../services/WeddingService";
import type { WeddingRecord } from "../types/wedding";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/Badge";
import { SupplierService } from "../services/SupplierService";
import { AdminApiService } from "../services/AdminApiService";
import { AdminPageHeader,
  AdminHeaderRouterLink,
} from "../components/ui/AdminUI";

export function WeddingDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [weddings, setWeddings] = useState<WeddingRecord[]>([]);
  const [supplierCount, setSupplierCount] = useState(0);
  const [recordError, setRecordError] = useState("");
  const [recordBusy, setRecordBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    setLoading(true);
    WeddingService.load().then((service) =>
      setWeddings(service.getWeddings()),
    ).catch(error => setRecordError(error instanceof Error ? error.message : "Unable to load wedding."))
      .finally(() => setLoading(false));

    SupplierService.load().then((service) =>
      setSupplierCount(
        service.getSupplierCountForWedding(slug || ""),
      ),
    ).catch(error => setRecordError(error instanceof Error ? error.message : "Unable to load suppliers."));
  }, [slug]);

  const wedding = useMemo(
    () => weddings.find((item) => item.slug === slug),
    [weddings, slug],
  );

  if (loading) {
    return (
      <div className="text-neutral-500">
        Loading wedding…
      </div>
    );
  }

  if (!wedding) {
    return (
      <div className="admin-surface-card border border-black/10 bg-white">
        <h1 className="admin-section-title mb-4">
          {recordError || "Wedding not found"}
        </h1>
        <Link
          to="/admin/weddings"
          className="underline underline-offset-4"
        >
          Back to weddings
        </Link>
      </div>
    );
  }

  const cover =
    wedding.images.find((image) => image.isCover) ||
    wedding.images[0];

  const isManagedWedding = wedding.storage === "d1";

  async function archiveWedding() {
    if (!window.confirm(`Archive ${wedding.couple}? Nothing will be deleted.`)) return;
    setRecordBusy(true); setRecordError("");
    try {
      await AdminApiService.archiveWedding(wedding.slug);
      window.location.reload();
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : "Unable to archive wedding.");
    } finally {
      setRecordBusy(false);
    }
  }

  async function permanentlyDeleteWedding() {
    if (deleteConfirm !== "DELETE") return;
    setRecordBusy(true); setRecordError("");
    try {
      await AdminApiService.deleteWeddingPermanently(wedding.slug);
      navigate("/admin/weddings", { replace: true });
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : "Unable to delete wedding.");
    } finally {
      setRecordBusy(false);
    }
  }

  return (
    <div className="admin-page admin-refined-page space-y-7">
      {recordError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{recordError}</div> : null}

      <AdminPageHeader
        title="Wedding details"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={wedding.status} />
            <span>{wedding.couple}</span>
            <span className="text-neutral-400">·</span>
            <span>{wedding.venue}</span>
            <span className="text-neutral-400">
              {wedding.weddingDate}
            </span>
            <span className="text-neutral-400">
              {wedding.publicationStatus}
            </span>
          </div>
        }
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <AdminHeaderRouterLink
              to={`/admin/weddings/${wedding.slug}/workspace`}
              className="admin-button admin-button--primary"
            >
              <LayoutDashboard className="admin-button__icon" />
              Wedding Workspace
            </AdminHeaderRouterLink>

            {isManagedWedding ? (
              <AdminHeaderRouterLink
                to={`/admin/weddings/${wedding.slug}/content`}
                className="admin-button admin-button--secondary"
              >
                Edit content
              </AdminHeaderRouterLink>
            ) : null}

            <AdminHeaderRouterLink
              to={`/admin/weddings/${wedding.slug}/images`}
              className="admin-button admin-button--secondary"
            >
              Open images
            </AdminHeaderRouterLink>

            <AdminHeaderRouterLink
              to={`/admin/weddings/${wedding.slug}/publish`}
              className="admin-button admin-button--secondary"
            >
              Publish
            </AdminHeaderRouterLink>

            <AdminActionLink
              href={`/blog/${wedding.slug}`}
              target="_blank"
              rel="noreferrer"
              className="admin-button admin-button--secondary"
            >
              Open story
            </AdminActionLink>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        <MetricCard
          label="Images"
          value={String(wedding.imageCount)}
          description={`${wedding.aiRows} AI records`}
        />
        <MetricCard
          label="Cover"
          value={wedding.coverCount > 0 ? "Yes" : "No"}
          description="Blog cover selected"
        />
        <MetricCard
          label="Suppliers"
          value={String(supplierCount)}
          description="Current supplier records"
        />
        <MetricCard
          label="Status"
          value={wedding.status === "ready" ? "Ready" : "Check"}
          description="Publishing health"
        />
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ManagementCard
          to={`/admin/weddings/${wedding.slug}/content`}
          icon={FilePenLine}
          title="Content"
          description="Edit the master wedding record, story, facts, status and SEO."
          disabled={!isManagedWedding}
        />

        <ManagementCard
          to={`/admin/weddings/${wedding.slug}/images`}
          icon={ImageIcon}
          title="Images"
          description="Rate, order, select, hide and organise wedding photographs."
        />

        <ManagementCard
          to={`/admin/weddings/${wedding.slug}/collections`}
          icon={FolderKanban}
          title="Collections"
          description="Manage blog, venue, homepage, portfolio and other image sets."
        />

        <ManagementCard
          to={`/admin/weddings/${wedding.slug}/suppliers`}
          icon={Users}
          title="Suppliers"
          description="Review and edit the suppliers connected to this wedding."
        />

        <ManagementCard
          to={`/admin/weddings/${wedding.slug}/story`}
          icon={BookOpen}
          title="Wedding story"
          description="Review and edit the wedding story stored in D1."
        />

        <ManagementCard
          to={`/admin/weddings/${wedding.slug}/publish`}
          icon={Send}
          title="Publish"
          description="Validate the wedding and run the publishing readiness checks."
        />
      </section>

      <section className="admin-surface-card border border-black/10 bg-white/75">
        <div className="mb-7 flex items-center gap-3">
          <div className="rounded-2xl bg-black p-3 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="admin-section-title ">
              Metadata completeness
            </h2>
          </div>
        </div>

        <div className="space-y-6">
          <ProgressBar
            label="Visual tags"
            done={wedding.tagsComplete}
            total={wedding.imageCount}
          />
          <ProgressBar
            label="Alt text"
            done={wedding.altComplete}
            total={wedding.imageCount}
          />
          <ProgressBar
            label="Captions"
            done={wedding.captionComplete}
            total={wedding.imageCount}
          />
        </div>
      </section>



      <section className="admin-surface-card border border-red-100 bg-white">
        <p className="text-xs uppercase tracking-[0.14em] text-red-600">Record actions</p>
        <h2 className="mt-2 text-2xl font-semibold">Archive or delete this wedding</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-600">Archive for normal removal from active work. Permanent deletion removes only the wedding record and wedding-specific relationships; canonical assets, private originals, master venues and suppliers are preserved.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <AdminActionButton type="button" disabled={recordBusy || wedding.publicationStatus === "archived"} onClick={archiveWedding} className="admin-action-secondary"><Archive className="h-4 w-4" />{wedding.publicationStatus === "archived" ? "Archived" : "Archive wedding"}</AdminActionButton>
          <AdminActionButton type="button" disabled={recordBusy} onClick={() => { setDeleteOpen(true); setDeleteConfirm(""); setRecordError(""); }} className="admin-button admin-button--danger"><Trash2 className="h-4 w-4" />Delete permanently</AdminActionButton>
        </div>
      </section>

      {deleteOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="detail-delete-title">
          <div className="w-full max-w-lg rounded-[22px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs uppercase tracking-[0.14em] text-red-600">Permanent deletion</p><h2 id="detail-delete-title" className="mt-2 text-2xl font-semibold">Delete {wedding.couple}?</h2></div>
              <AdminActionButton type="button" onClick={() => setDeleteOpen(false)} className="admin-icon-button" aria-label="Close delete dialog"><X className="h-4 w-4" /></AdminActionButton>
            </div>
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-relaxed text-red-900">A live Client Gallery blocks permanent deletion until it is archived. Non-live galleries and all image assets remain preserved.</p>
            <label className="mt-5 block text-sm font-medium">Type <strong>DELETE</strong> to confirm</label>
            <input autoFocus value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} className="mt-2 w-full rounded-xl border border-black/15 px-3 py-3" placeholder="DELETE" />
            <div className="mt-5 flex justify-end gap-2">
              <AdminActionButton type="button" onClick={() => setDeleteOpen(false)} className="admin-action-secondary">Cancel</AdminActionButton>
              <AdminActionButton type="button" disabled={recordBusy || deleteConfirm !== "DELETE"} onClick={permanentlyDeleteWedding} className="admin-button admin-button--danger"><Trash2 className="h-4 w-4" />{recordBusy ? "Deleting…" : "Permanently delete"}</AdminActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="admin-surface-card border border-black/10 bg-white/75">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <p className="admin-metric-value ">
        {value}
      </p>
      <p className="mt-3 text-sm text-neutral-500">
        {description}
      </p>
    </div>
  );
}

function ManagementCard({
  to,
  icon: Icon,
  title,
  description,
  disabled = false,
  badge,
}: {
  to: string;
  icon: typeof FilePenLine;
  title: string;
  description: string;
  disabled?: boolean;
  badge?: string;
}) {
  const content = (
    <>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-black p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>

        {badge ? (
          <span className="rounded-full border border-black/10 bg-neutral-50 px-3 py-1 text-xs text-neutral-500">
            {badge}
          </span>
        ) : null}
      </div>

      <h2 className="admin-section-title ">
        {title}
      </h2>

      <p className="mt-3 leading-relaxed text-neutral-600">
        {description}
      </p>
    </>
  );

  if (disabled) {
    return (
      <div className="admin-surface-card border border-black/10 bg-neutral-100/70 opacity-65">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="admin-surface-card border border-black/10 bg-white/75 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_22px_70px_rgba(0,0,0,0.08)]"
    >
      {content}
    </Link>
  );
}
