import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Pin,
  Save,
  Search,
  Star,
  X,
} from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type {
  MomentGalleryImage,
  MomentRecord,
  MomentRepositoryDocument,
} from "../types/moment";

type GalleryFilter = "all" | "shown" | "hidden" | "pinned";

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function MomentGallery() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [document, setDocument] = useState<MomentRepositoryDocument | null>(null);
  const [images, setImages] = useState<MomentGalleryImage[]>([]);
  const [moment, setMoment] = useState<MomentRecord | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [draggedAssetKey, setDraggedAssetKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      AdminApiService.getMoments(),
      AdminApiService.getMomentGallery(slug),
    ])
      .then(([momentDocument, gallery]) => {
        if (cancelled) return;
        const repositoryMoment = momentDocument.moments.find(
          (item) => item.slug === slug,
        );
        setDocument(momentDocument);
        setMoment(repositoryMoment || gallery.moment);
        setImages(gallery.images);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load moment gallery.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const hiddenIds = useMemo(
    () => new Set(moment?.hiddenImageIds || []),
    [moment?.hiddenImageIds],
  );

  const pinnedIds = useMemo(
    () => moment?.pinnedImageIds || [],
    [moment?.pinnedImageIds],
  );

  const pinnedRank = useMemo(() => {
    const map = new Map<string, number>();
    pinnedIds.forEach((assetKey, index) => map.set(assetKey, index));
    return map;
  }, [pinnedIds]);

  const orderedImages = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...images]
      .filter((image) => {
        const isHidden = hiddenIds.has(image.assetKey);
        const isPinned = pinnedRank.has(image.assetKey);
        if (filter === "shown" && isHidden) return false;
        if (filter === "hidden" && !isHidden) return false;
        if (filter === "pinned" && !isPinned) return false;
        if (!query) return true;
        return [
          image.filename,
          image.venueName,
          image.venueSlug,
          image.weddingSlug,
          image.alt,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const aRank = pinnedRank.get(a.assetKey);
        const bRank = pinnedRank.get(b.assetKey);
        if (aRank !== undefined || bRank !== undefined) {
          if (aRank === undefined) return 1;
          if (bRank === undefined) return -1;
          return aRank - bRank;
        }
        const venueDiff = a.venueName.localeCompare(b.venueName);
        if (venueDiff !== 0) return venueDiff;
        return a.filename.localeCompare(b.filename);
      });
  }, [images, hiddenIds, pinnedRank, search, filter]);

  const shownCount = images.filter((image) => !hiddenIds.has(image.assetKey)).length;
  const hiddenCount = images.length - shownCount;

  function patchMoment(patch: Partial<MomentRecord>) {
    setMoment((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
    setMessage("");
    setError("");
  }

  function showImages(assetKeys: string[]) {
    const remove = new Set(assetKeys);
    patchMoment({
      hiddenImageIds: (moment?.hiddenImageIds || []).filter(
        (assetKey) => !remove.has(assetKey),
      ),
    });
  }

  function hideImages(assetKeys: string[]) {
    const hidden = unique([...(moment?.hiddenImageIds || []), ...assetKeys]);
    const hiddenSet = new Set(hidden);
    patchMoment({
      hiddenImageIds: hidden,
      pinnedImageIds: (moment?.pinnedImageIds || []).filter(
        (assetKey) => !hiddenSet.has(assetKey),
      ),
      heroImageId:
        moment?.heroImageId && hiddenSet.has(moment.heroImageId)
          ? ""
          : moment?.heroImageId,
      cardImageId:
        moment?.cardImageId && hiddenSet.has(moment.cardImageId)
          ? ""
          : moment?.cardImageId,
    });
  }

  function pinImages(assetKeys: string[]) {
    showImages(assetKeys);
    patchMoment({
      pinnedImageIds: unique([...(moment?.pinnedImageIds || []), ...assetKeys]),
    });
  }

  function unpinImages(assetKeys: string[]) {
    const remove = new Set(assetKeys);
    patchMoment({
      pinnedImageIds: (moment?.pinnedImageIds || []).filter(
        (assetKey) => !remove.has(assetKey),
      ),
    });
  }

  function toggleSelected(assetKey: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(assetKey)) next.delete(assetKey);
      else next.add(assetKey);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function handlePinnedDrop(targetAssetKey: string) {
    if (!draggedAssetKey || draggedAssetKey === targetAssetKey) {
      setDraggedAssetKey(null);
      return;
    }

    const current = [...(moment?.pinnedImageIds || [])];
    const fromIndex = current.indexOf(draggedAssetKey);
    const targetIndex = current.indexOf(targetAssetKey);
    if (fromIndex < 0 || targetIndex < 0) {
      setDraggedAssetKey(null);
      return;
    }

    const [moved] = current.splice(fromIndex, 1);
    current.splice(targetIndex, 0, moved);
    patchMoment({ pinnedImageIds: current });
    setDraggedAssetKey(null);
  }

  async function save() {
    if (!document || !moment) return;
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const cleanHidden = unique(moment.hiddenImageIds || []);
      const hiddenSet = new Set(cleanHidden);
      const cleanPinned = unique(moment.pinnedImageIds || []).filter(
        (assetKey) => !hiddenSet.has(assetKey),
      );
      const nextMoment: MomentRecord = {
        ...moment,
        hiddenImageIds: cleanHidden,
        pinnedImageIds: cleanPinned,
      };
      const nextDocument: MomentRepositoryDocument = {
        ...document,
        updatedAt: new Date().toISOString(),
        moments: document.moments.map((item) =>
          item.id === nextMoment.id ? nextMoment : item,
        ),
      };

      const visibleAssetKeys = images
        .filter((image) => !hiddenSet.has(image.assetKey))
        .map((image) => image.assetKey);

      await AdminApiService.enableMomentGalleryImages(slug, visibleAssetKeys);
      const result = await AdminApiService.saveMoments(nextDocument);

      const savedMoment = result.document.moments.find(
        (item) => item.id === nextMoment.id,
      );
      setDocument(result.document);
      setMoment(savedMoment || nextMoment);
      setImages((current) =>
        current.map((image) =>
          hiddenSet.has(image.assetKey)
            ? image
            : { ...image, globallyEnabled: true },
        ),
      );
      setDirty(false);
      clearSelection();
      setMessage("Moment gallery saved. Public gallery data is now updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save moment gallery.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!moment || !document) {
    return (
      <div className="rounded-[28px] border border-black/10 bg-white p-8 text-neutral-600">
        {error || "Loading moment gallery…"}
      </div>
    );
  }

  const selectedKeys = [...selected];

  return (
    <div className="space-y-7">
      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Link
              to="/admin/moments"
              className="mb-5 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to moments
            </Link>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-white/45">
              Moment Gallery Manager
            </p>
            <h1 className="font-serif text-5xl md:text-6xl">{moment.name}</h1>
            <p className="mt-4 max-w-3xl text-white/60">
              Curate photographs already assigned to this moment. Hide individual
              images without removing their moment tag, pin favourites to the top,
              and choose the landing-card and gallery hero photographs visually.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={`https://www.mkbweddings.co.uk/gallery/moment/${encodeURIComponent(moment.slug)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-5 py-3 text-sm"
            >
              View live gallery
            </a>
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-black disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : dirty ? "Save gallery" : "Saved"}
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Assigned" value={images.length} />
          <Stat label="Shown" value={shownCount} />
          <Stat label="Hidden" value={hiddenCount} />
          <Stat label="Pinned" value={pinnedIds.length} />
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-black/10 bg-white/85 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1 xl:max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search filename, venue or wedding…"
              className="w-full rounded-full border border-black/10 bg-white py-3 pl-11 pr-4 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", `All ${images.length}`],
                ["shown", `Shown ${shownCount}`],
                ["hidden", `Hidden ${hiddenCount}`],
                ["pinned", `Pinned ${pinnedIds.length}`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-4 py-2 text-sm ${
                  filter === value
                    ? "bg-black text-white"
                    : "border border-black/10 bg-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {selected.size ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-neutral-100 p-3">
            <span className="mr-2 text-sm font-medium">{selected.size} selected</span>
            <BatchButton onClick={() => showImages(selectedKeys)} icon={Eye} label="Show" />
            <BatchButton onClick={() => hideImages(selectedKeys)} icon={EyeOff} label="Hide" />
            <BatchButton onClick={() => pinImages(selectedKeys)} icon={Pin} label="Pin" />
            <BatchButton onClick={() => unpinImages(selectedKeys)} icon={X} label="Unpin" />
            <button
              type="button"
              onClick={clearSelection}
              className="ml-auto rounded-full border border-black/10 px-4 py-2 text-sm"
            >
              Clear selection
            </button>
          </div>
        ) : null}
      </section>

      {pinnedIds.length ? (
        <section className="rounded-[28px] border border-black/10 bg-white/75 p-5">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              Featured order
            </p>
            <h2 className="mt-1 font-serif text-2xl">Pinned photographs</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Drag pinned photographs to change the order shown at the start of the live gallery.
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {pinnedIds.map((assetKey, index) => {
              const image = images.find((item) => item.assetKey === assetKey);
              if (!image || hiddenIds.has(assetKey)) return null;
              return (
                <div
                  key={assetKey}
                  draggable
                  onDragStart={() => setDraggedAssetKey(assetKey)}
                  onDragEnd={() => setDraggedAssetKey(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handlePinnedDrop(assetKey)}
                  className="relative w-36 shrink-0 cursor-grab overflow-hidden rounded-2xl border border-black/10 bg-white"
                >
                  <img
                    src={image.thumbSrc || image.fullSrc}
                    alt={image.alt || image.filename}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="flex items-center gap-2 p-2 text-xs">
                    <GripVertical className="h-4 w-4" />
                    #{index + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {orderedImages.length ? (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {orderedImages.map((image) => {
            const isSelected = selected.has(image.assetKey);
            const isHidden = hiddenIds.has(image.assetKey);
            const pinIndex = pinnedRank.get(image.assetKey);
            const isHero = moment.heroImageId === image.assetKey || moment.heroImageId === image.imageId;
            const isCard = moment.cardImageId === image.assetKey || moment.cardImageId === image.imageId;

            return (
              <article
                key={image.assetKey}
                className={`overflow-hidden rounded-[24px] border bg-white shadow-sm transition ${
                  isSelected ? "border-black ring-2 ring-black/10" : "border-black/10"
                } ${isHidden ? "opacity-60" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggleSelected(image.assetKey)}
                  className="relative block w-full text-left"
                >
                  <img
                    src={image.thumbSrc || image.fullSrc}
                    alt={image.alt || image.filename}
                    className="aspect-[4/3] w-full bg-neutral-100 object-cover"
                    loading="lazy"
                  />
                  <span
                    className={`absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-black bg-black text-white"
                        : "border-white/70 bg-white/90 text-black"
                    }`}
                  >
                    {isSelected ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
                    {isHidden ? <Badge>Hidden</Badge> : <Badge>Shown</Badge>}
                    {pinIndex !== undefined ? <Badge>Pin #{pinIndex + 1}</Badge> : null}
                    {isHero ? <Badge>Hero</Badge> : null}
                    {isCard ? <Badge>Card</Badge> : null}
                    {!image.globallyEnabled && !isHidden ? <Badge>Will enable on save</Badge> : null}
                  </div>
                </button>

                <div className="space-y-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={image.filename}>
                      {image.filename}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {image.venueName || "Unlinked venue"}
                      {image.weddingSlug ? ` · ${image.weddingSlug}` : ""}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        isHidden ? showImages([image.assetKey]) : hideImages([image.assetKey])
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 px-3 py-2 text-xs"
                    >
                      {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {isHidden ? "Show" : "Hide"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        pinIndex === undefined
                          ? pinImages([image.assetKey])
                          : unpinImages([image.assetKey])
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 px-3 py-2 text-xs"
                    >
                      <Pin className="h-3.5 w-3.5" />
                      {pinIndex === undefined ? "Pin" : "Unpin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        showImages([image.assetKey]);
                        patchMoment({ heroImageId: image.assetKey });
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 px-3 py-2 text-xs"
                    >
                      <Star className="h-3.5 w-3.5" />
                      {isHero ? "Hero set" : "Set hero"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        showImages([image.assetKey]);
                        patchMoment({ cardImageId: image.assetKey });
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 px-3 py-2 text-xs"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {isCard ? "Card set" : "Set card"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[28px] border border-dashed border-black/15 bg-white/60 p-12 text-center text-neutral-500">
          No photographs match this filter. Images appear here after they are assigned to
          <strong> {moment.name}</strong> from a wedding or venue gallery.
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
      {children}
    </span>
  );
}

function BatchButton({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: typeof Eye;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
