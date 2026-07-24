import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

export function WeddingDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [weddings, setWeddings] = useState<WeddingRecord[]>([]);
  const [supplierCount, setSupplierCount] = useState(0);
  const [recordError, setRecordError] = useState("");
  const [recordBusy, setRecordBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    WeddingService.load().then((service) =>
      setWeddings(service.getWeddings()),
    );

    SupplierService.load().then((service) =>
      setSupplierCount(
        service.getSupplierCountForWedding(slug || ""),
      ),
    );
  }, [slug]);

  const wedding = useMemo(
    () => weddings.find((item) => item.slug === slug),
    [weddings, slug],
  );

  if (!weddings.length) {
    return (
      <div className="text-neutral-500">
        Loading wedding…
      </div>
    );
  }

  if (!wedding) {
    return (
      <div className="rounded-[28px] border border-black/10 bg-white p-8">
        <h1 className="mb-4 font-serif text-3xl">
          Wedding not found
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
    <div className="space-y-7">
      <Link
        to="/admin/weddings"
        className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to weddings
      </Link>

      {recordError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{recordError}</div> : null}

      <section className="overflow-hidden rounded-[32px] bg-black text-white">
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="p-8 md:p-10">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <StatusBadge status={wedding.status} />

              <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60">
                {wedding.storage}
              </span>

              <span className="rounded-full border border-white/15 px-3 py-1 text-xs capitalize text-white/60">
                {wedding.publicationStatus}
              </span>
            </div>

            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">
              Wedding control centre
            </p>

            <h1 className="mb-4 font-serif text-4xl leading-tight md:text-6xl">
              {wedding.title}
            </h1>

            <p className="text-white/65">
              {wedding.couple} · {wedding.venue} ·{" "}
              {wedding.weddingDate}
            </p>

            {wedding.intro ? (
              <p className="mt-6 max-w-2xl leading-relaxed text-white/60">
                {wedding.intro}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={`/admin/weddings/${wedding.slug}/workspace`}
                className="rounded-full bg-white px-5 py-3 text-sm text-black hover:bg-white/90 inline-flex items-center gap-2"
              >
                <LayoutDashboard className="h-4 w-4" /> Wedding Workspace
              </Link>

              {isManagedWedding ? (
                <Link
                  to={`/admin/weddings/${wedding.slug}/content`}
                  className="rounded-full border border-white/20 px-5 py-3 text-sm text-white/80 hover:bg-white/10"
                >
                  Edit master content
                </Link>
              ) : null}

              <Link
                to={`/admin/weddings/${wedding.slug}/images`}
                className={`rounded-full px-5 py-3 text-sm ${
                  isManagedWedding
                    ? "border border-white/20 text-white/80 hover:bg-white/10"
                    : "bg-white text-black hover:bg-white/90"
                }`}
              >
                Open image manager
              </Link>

              <Link
                to={`/admin/weddings/${wedding.slug}/publish`}
                className="rounded-full border border-white/20 px-5 py-3 text-sm text-white/80 hover:bg-white/10"
              >
                Publish
              </Link>

              <a
                href={`/blog/${wedding.slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-5 py-3 text-sm text-white/80 hover:bg-white/10"
              >
                Open public story
              </a>
            </div>

            {!isManagedWedding ? (
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-amber-200/80">
                This wedding is managed directly in D1.
              </p>
            ) : null}
          </div>

          {cover ? (
            <div className="min-h-[340px] bg-white/10">
              <img
                src={cover.fullSrc}
                alt={cover.aiAlt || wedding.title}
                className="h-full w-full object-cover opacity-90"
              />
            </div>
          ) : (
            <div className="flex min-h-[340px] items-center justify-center bg-white/5 text-sm text-white/35">
              No cover image selected
            </div>
          )}
        </div>
      </section>

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
          badge="D1 master"
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
          badge="D1"
        />

        <ManagementCard
          to={`/admin/weddings/${wedding.slug}/publish`}
          icon={Send}
          title="Publish"
          description="Validate the wedding and run the publishing readiness checks."
        />
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        <div className="mb-7 flex items-center gap-3">
          <div className="rounded-2xl bg-black p-3 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-3xl">
              Metadata completeness
            </h2>
            <p className="text-sm text-neutral-500">
              Tags, alt text and captions currently available for
              this wedding.
            </p>
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

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-black p-3 text-white">
            <SearchCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-3xl">
              Migration status
            </h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-neutral-600">
              {isManagedWedding
                ? "This wedding is stored in D1 and managed through the production Intelligence admin."
                : "This wedding is stored in D1."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-red-100 bg-white p-7">
        <p className="text-xs uppercase tracking-[0.14em] text-red-600">Record actions</p>
        <h2 className="mt-2 text-2xl font-semibold">Archive or delete this wedding</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-600">Archive for normal removal from active work. Permanent deletion removes only the wedding record and wedding-specific relationships; canonical assets, private originals, master venues and suppliers are preserved.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" disabled={recordBusy || wedding.publicationStatus === "archived"} onClick={archiveWedding} className="admin-action-secondary"><Archive className="h-4 w-4" />{wedding.publicationStatus === "archived" ? "Archived" : "Archive wedding"}</button>
          <button type="button" disabled={recordBusy} onClick={() => { setDeleteOpen(true); setDeleteConfirm(""); setRecordError(""); }} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[10px] border border-red-700 bg-red-700 px-4 font-semibold text-white"><Trash2 className="h-4 w-4" />Delete permanently</button>
        </div>
      </section>

      {deleteOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="detail-delete-title">
          <div className="w-full max-w-lg rounded-[22px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs uppercase tracking-[0.14em] text-red-600">Permanent deletion</p><h2 id="detail-delete-title" className="mt-2 text-2xl font-semibold">Delete {wedding.couple}?</h2></div>
              <button type="button" onClick={() => setDeleteOpen(false)} className="admin-icon-button" aria-label="Close delete dialog"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-relaxed text-red-900">A live Client Gallery blocks permanent deletion until it is archived. Non-live galleries and all image assets remain preserved.</p>
            <label className="mt-5 block text-sm font-medium">Type <strong>DELETE</strong> to confirm</label>
            <input autoFocus value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} className="mt-2 w-full rounded-xl border border-black/15 px-3 py-3" placeholder="DELETE" />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteOpen(false)} className="admin-action-secondary">Cancel</button>
              <button type="button" disabled={recordBusy || deleteConfirm !== "DELETE"} onClick={permanentlyDeleteWedding} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[10px] border border-red-700 bg-red-700 px-4 font-semibold text-white disabled:opacity-40"><Trash2 className="h-4 w-4" />{recordBusy ? "Deleting…" : "Permanently delete"}</button>
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
    <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <p className="font-serif text-5xl">
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

      <h2 className="font-serif text-3xl">
        {title}
      </h2>

      <p className="mt-3 leading-relaxed text-neutral-600">
        {description}
      </p>
    </>
  );

  if (disabled) {
    return (
      <div className="rounded-[28px] border border-black/10 bg-neutral-100/70 p-7 opacity-65">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_22px_70px_rgba(0,0,0,0.08)]"
    >
      {content}
    </Link>
  );
}
