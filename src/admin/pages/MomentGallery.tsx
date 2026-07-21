import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
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

type GalleryFilter = "all" | "shown" | "hidden";

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function MomentGallery() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [document, setDocument] = useState<MomentRepositoryDocument | null>(null);
  const [images, setImages] = useState<MomentGalleryImage[]>([]);
  const [moment, setMoment] = useState<MomentRecord | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeAssetKey, setActiveAssetKey] = useState<string | null>(null);
  const [draggedIds, setDraggedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const anchorRef = useRef<number | null>(null);

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
        const nextMoment = repositoryMoment || gallery.moment;
        setDocument(momentDocument);
        setMoment(nextMoment);
        setImages(gallery.images);
        setActiveAssetKey(gallery.images[0]?.assetKey || null);
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

  const imageMap = useMemo(
    () => new Map(images.map((image) => [image.assetKey, image])),
    [images],
  );

  const exactOrder = useMemo(() => {
    const saved = moment?.imageOrderIds || [];
    const legacyFeatured = moment?.pinnedImageIds || [];
    const all = images.map((image) => image.assetKey);
    const available = new Set(all);
    return unique([...saved, ...legacyFeatured, ...all]).filter((id) =>
      available.has(id),
    );
  }, [moment?.imageOrderIds, moment?.pinnedImageIds, images]);

  const orderedImages = useMemo(() => {
    const query = search.trim().toLowerCase();
    return exactOrder
      .map((assetKey) => imageMap.get(assetKey))
      .filter((image): image is MomentGalleryImage => Boolean(image))
      .filter((image) => {
        const isHidden = hiddenIds.has(image.assetKey);
        if (filter === "shown" && isHidden) return false;
        if (filter === "hidden" && !isHidden) return false;
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
      });
  }, [exactOrder, imageMap, hiddenIds, search, filter]);

  const shownCount = images.filter((image) => !hiddenIds.has(image.assetKey)).length;
  const hiddenCount = images.length - shownCount;
  const activeImage = activeAssetKey ? imageMap.get(activeAssetKey) || null : null;

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

  function toggleSelection(image: MomentGalleryImage, index: number) {
    setActiveAssetKey(image.assetKey);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(image.assetKey)) next.delete(image.assetKey);
      else next.add(image.assetKey);
      return next;
    });
    anchorRef.current = index;
  }

  function openImage(
    event: React.MouseEvent,
    image: MomentGalleryImage,
    index: number,
  ) {
    setActiveAssetKey(image.assetKey);

    if (event.shiftKey && anchorRef.current !== null) {
      const start = Math.min(anchorRef.current, index);
      const end = Math.max(anchorRef.current, index);
      setSelected(
        new Set(orderedImages.slice(start, end + 1).map((item) => item.assetKey)),
      );
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      toggleSelection(image, index);
      return;
    }

    anchorRef.current = index;
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function beginDrag(image: MomentGalleryImage) {
    const moving =
      selected.has(image.assetKey) && selected.size > 1
        ? exactOrder.filter((assetKey) => selected.has(assetKey))
        : [image.assetKey];

    if (!selected.has(image.assetKey)) {
      setSelected(new Set([image.assetKey]));
    }

    setActiveAssetKey(image.assetKey);
    setDraggedIds(moving);
  }

  function dropOn(targetAssetKey: string) {
    if (!draggedIds.length || draggedIds.includes(targetAssetKey)) {
      setDraggedIds([]);
      return;
    }

    const movingSet = new Set(draggedIds);
    const moving = exactOrder.filter((assetKey) => movingSet.has(assetKey));
    const remaining = exactOrder.filter((assetKey) => !movingSet.has(assetKey));
    const targetIndex = remaining.indexOf(targetAssetKey);
    const next = [...remaining];

    if (targetIndex < 0) next.push(...moving);
    else next.splice(targetIndex, 0, ...moving);

    patchMoment({ imageOrderIds: next });
    setDraggedIds([]);
  }

  async function save() {
    if (!document || !moment) return;
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const cleanHidden = unique(moment.hiddenImageIds || []);
      const hiddenSet = new Set(cleanHidden);
      const validKeys = new Set(images.map((image) => image.assetKey));
      const cleanOrder = unique([
        ...(moment.imageOrderIds || []),
        ...exactOrder,
      ]).filter((assetKey) => validKeys.has(assetKey));
      const cleanPinned = unique(moment.pinnedImageIds || []).filter(
        (assetKey) => validKeys.has(assetKey) && !hiddenSet.has(assetKey),
      );

      const nextMoment: MomentRecord = {
        ...moment,
        hiddenImageIds: cleanHidden,
        pinnedImageIds: cleanPinned,
        imageOrderIds: cleanOrder,
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
    <div className="space-y-6">
      <section className="rounded-[30px] bg-black p-7 text-white md:p-9">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Link
              to="/admin/moments"
              className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to moments
            </Link>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-white/45">
              Moment Gallery Manager
            </p>
            <h1 className="font-serif text-4xl md:text-5xl">{moment.name}</h1>
            <p className="mt-3 max-w-3xl text-sm text-white/60">
              Drag any photograph using its white grip handle to set the exact gallery order.
              Select several photographs first to move them together as one group.
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

        <div className="mt-7 grid grid-cols-3 gap-3">
          <Stat label="Assigned" value={images.length} />
          <Stat label="Shown" value={shownCount} />
          <Stat label="Hidden" value={hiddenCount} />
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

      <section className="rounded-[24px] border border-black/10 bg-white/85 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1 xl:max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search filename, venue or wedding…"
              className="w-full rounded-full border border-black/10 bg-white py-2.5 pl-11 pr-4 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", `All ${images.length}`],
                ["shown", `Shown ${shownCount}`],
                ["hidden", `Hidden ${hiddenCount}`],
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
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-neutral-100 p-3">
            <span className="mr-2 text-sm font-medium">{selected.size} selected</span>
            <BatchButton onClick={() => showImages(selectedKeys)} icon={Eye} label="Show" />
            <BatchButton onClick={() => hideImages(selectedKeys)} icon={EyeOff} label="Hide" />
            <span className="text-xs text-neutral-500">
              Drag the grip on any selected image to move the whole selection.
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>
        ) : null}
      </section>

      {orderedImages.length ? (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {orderedImages.map((image, index) => {
              const isSelected = selected.has(image.assetKey);
              const isHidden = hiddenIds.has(image.assetKey);
              const isHero =
                moment.heroImageId === image.assetKey ||
                moment.heroImageId === image.imageId;
              const isCard =
                moment.cardImageId === image.assetKey ||
                moment.cardImageId === image.imageId;
              const dragging = draggedIds.includes(image.assetKey);

              return (
                <article
                  key={image.assetKey}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    dropOn(image.assetKey);
                  }}
                  className={`overflow-hidden rounded-[18px] bg-white shadow-sm transition ${
                    activeAssetKey === image.assetKey
                      ? "border-2 border-black"
                      : isSelected
                        ? "border-2 border-neutral-500"
                        : "border border-black/10"
                  } ${isHidden ? "opacity-60" : ""}`}
                  style={{ opacity: dragging ? 0.4 : isHidden ? 0.6 : 1 }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(event) => openImage(event, image, index)}
                    className="relative aspect-[4/5] cursor-pointer overflow-hidden bg-neutral-100"
                  >
                    <img
                      src={image.thumbSrc || image.fullSrc}
                      alt={image.alt || image.filename}
                      draggable={false}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      style={{ pointerEvents: "none" }}
                    />

                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleSelection(image, index);
                      }}
                      className={`absolute right-2.5 top-2.5 z-30 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm ${
                        isSelected
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white text-transparent"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </button>

                    <div
                      draggable
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", image.assetKey);
                        beginDrag(image);
                      }}
                      onDragEnd={() => setDraggedIds([])}
                      className="absolute bottom-2.5 right-2.5 z-30 flex h-10 w-10 cursor-grab items-center justify-center rounded-full bg-white shadow-[0_6px_18px_rgba(0,0,0,0.24)] active:cursor-grabbing"
                      title={
                        selected.size > 1 && isSelected
                          ? `Drag ${selected.size} selected images`
                          : "Drag to reorder"
                      }
                    >
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <div className="absolute left-2.5 top-2.5 flex max-w-[70%] flex-wrap gap-1.5">
                      {isHidden ? <Badge>Hidden</Badge> : null}
                      {isHero ? <Badge>Hero</Badge> : null}
                      {isCard ? <Badge>Card</Badge> : null}
                    </div>
                  </div>

                  <div className="p-2.5">
                    <p className="truncate text-[11px] text-neutral-600" title={image.filename}>
                      {image.filename}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-medium text-neutral-800">
                      {image.venueName || "Unlinked venue"}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="sticky top-28 rounded-[24px] border border-black/10 bg-white p-4">
            {!activeImage ? (
              <p className="text-sm text-neutral-500">
                Select an image to edit its gallery settings.
              </p>
            ) : (
              <div className="space-y-4">
                <img
                  src={activeImage.thumbSrc || activeImage.fullSrc}
                  alt={activeImage.alt || activeImage.filename}
                  className="max-h-[260px] w-full rounded-2xl object-contain bg-neutral-100"
                />

                <div>
                  <p className="truncate text-sm font-medium">{activeImage.filename}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {activeImage.venueName || "Unlinked venue"}
                    {activeImage.weddingSlug ? ` · ${activeImage.weddingSlug}` : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    hiddenIds.has(activeImage.assetKey)
                      ? showImages([activeImage.assetKey])
                      : hideImages([activeImage.assetKey])
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm"
                >
                  {hiddenIds.has(activeImage.assetKey) ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  {hiddenIds.has(activeImage.assetKey) ? "Show in gallery" : "Hide from gallery"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    showImages([activeImage.assetKey]);
                    patchMoment({ heroImageId: activeImage.assetKey });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm"
                >
                  <Star className="h-4 w-4" />
                  {moment.heroImageId === activeImage.assetKey ||
                  moment.heroImageId === activeImage.imageId
                    ? "Hero image set"
                    : "Set as gallery hero"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    showImages([activeImage.assetKey]);
                    patchMoment({ cardImageId: activeImage.assetKey });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm"
                >
                  <ImageIcon className="h-4 w-4" />
                  {moment.cardImageId === activeImage.assetKey ||
                  moment.cardImageId === activeImage.imageId
                    ? "Landing card image set"
                    : "Set as landing card"}
                </button>

                <div className="rounded-2xl bg-neutral-100 p-3 text-xs leading-5 text-neutral-600">
                  Tip: use the checkbox on several thumbnails, then drag the white grip on any selected image. The selected group keeps its internal order and moves together.
                </div>
              </div>
            )}
          </aside>
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-1 text-xl">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-black/75 px-2 py-1 text-[9px] font-medium text-white backdrop-blur">
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
