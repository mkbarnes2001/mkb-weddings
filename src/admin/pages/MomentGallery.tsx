import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  GripVertical,
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

  function patchImage(
    assetKey: string,
    patch: Partial<MomentGalleryImage>,
  ) {
    setImages((current) =>
      current.map((image) =>
        image.assetKey === assetKey
          ? {
              ...image,
              ...patch,
              display: patch.display
                ? { ...image.display, ...patch.display }
                : image.display,
            }
          : image,
      ),
    );
    setDirty(true);
    setMessage("");
    setError("");
  }

  function setImageMoment(
    image: MomentGalleryImage,
    momentSlug: string,
    checked: boolean,
  ) {
    const nextMoments = checked
      ? unique([...(image.moments || []), momentSlug])
      : (image.moments || []).filter((value) => value !== momentSlug);

    patchImage(image.assetKey, {
      moments: nextMoments,
      display: {
        ...image.display,
        moments: nextMoments.length > 0,
      },
    });
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

      await AdminApiService.enableMomentGalleryImages(
        slug,
        visibleAssetKeys,
        images.map((image) => ({
          assetKey: image.assetKey,
          included: image.included,
          moments: image.moments || [],
          display: {
            ...image.display,
            venue: image.included,
            moments: (image.moments || []).length > 0,
          },
        })),
      );
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
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "10px",
              alignItems: "start",
            }}
          >
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
                  className="bg-white"
                  style={{
                    overflow: "hidden",
                    borderRadius: "14px",
                    background: "#ffffff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
                    border:
                      activeAssetKey === image.assetKey
                        ? "2px solid #111111"
                        : isSelected
                          ? "2px solid #737373"
                          : "1px solid rgba(0,0,0,0.12)",
                    opacity: dragging ? 0.4 : isHidden ? 0.6 : 1,
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(event) => openImage(event, image, index)}
                    style={{
                      position: "relative",
                      aspectRatio: "4 / 5",
                      cursor: "pointer",
                      overflow: "hidden",
                      background: "#f5f5f5",
                    }}
                  >
                    <img
                      src={image.thumbSrc || image.fullSrc}
                      alt={image.alt || image.filename}
                      draggable={false}
                      loading="lazy"
                      onError={(event) => {
                        const element = event.currentTarget;
                        if (
                          !element.dataset.fullFallbackTried &&
                          image.fullSrc &&
                          image.fullSrc !== image.thumbSrc
                        ) {
                          element.dataset.fullFallbackTried = "true";
                          element.src = image.fullSrc;
                          return;
                        }

                        element.style.display = "none";
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        pointerEvents: "none",
                      }}
                    />

                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleSelection(image, index);
                      }}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "8px",
                        zIndex: 30,
                        width: "30px",
                        height: "30px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "999px",
                        border: "1px solid rgba(0,0,0,0.15)",
                        background: isSelected ? "#111111" : "#ffffff",
                        color: isSelected ? "#ffffff" : "transparent",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
                        cursor: "pointer",
                      }}
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
                      style={{
                        position: "absolute",
                        right: "8px",
                        bottom: "8px",
                        zIndex: 30,
                        width: "38px",
                        height: "38px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "999px",
                        background: "#ffffff",
                        color: "#111111",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
                        cursor: "grab",
                        userSelect: "none",
                      }}
                      title={
                        selected.size > 1 && isSelected
                          ? `Drag ${selected.size} selected images`
                          : "Drag to reorder"
                      }
                    >
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        left: "8px",
                        top: "8px",
                        zIndex: 20,
                        display: "flex",
                        maxWidth: "68%",
                        flexWrap: "wrap",
                        gap: "5px",
                      }}
                    >
                      {isHidden ? <Badge>Hidden</Badge> : null}
                      {isHero ? <Badge>Hero</Badge> : null}
                      {isCard ? <Badge>Card</Badge> : null}
                    </div>
                  </div>

                  <div style={{ padding: "7px 8px" }}>
                    <p className="truncate text-[11px] font-medium text-neutral-800">
                      {image.venueName || "Unlinked venue"}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <aside
            style={{
              position: "sticky",
              top: "112px",
              borderRadius: "22px",
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#ffffff",
              padding: "16px",
              maxHeight: "calc(100vh - 128px)",
              overflowY: "auto",
            }}
          >
            {!activeImage ? (
              <p className="text-sm text-neutral-500">
                Select an image to edit its gallery settings.
              </p>
            ) : (
              <div className="space-y-4">
                <img
                  src={activeImage.thumbSrc || activeImage.fullSrc}
                  alt={activeImage.alt || activeImage.filename}
                  onError={(event) => {
                    const element = event.currentTarget;
                    if (
                      !element.dataset.fullFallbackTried &&
                      activeImage.fullSrc &&
                      activeImage.fullSrc !== activeImage.thumbSrc
                    ) {
                      element.dataset.fullFallbackTried = "true";
                      element.src = activeImage.fullSrc;
                      return;
                    }

                    element.style.display = "none";
                  }}
                  style={{
                    width: "100%",
                    maxHeight: "240px",
                    objectFit: "contain",
                    borderRadius: "16px",
                    background: "#f5f5f5",
                  }}
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

                <div className="border-t border-black/10 pt-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Gallery destinations
                  </p>
                  <div className="space-y-2">
                    <DetailToggle
                      label="Venue gallery"
                      checked={activeImage.included}
                      onChange={(checked) =>
                        patchImage(activeImage.assetKey, {
                          included: checked,
                          display: { ...activeImage.display, venue: checked },
                        })
                      }
                    />
                    <DetailToggle
                      label="Creative Flash"
                      checked={activeImage.display.creativeFlash}
                      onChange={(checked) =>
                        patchImage(activeImage.assetKey, {
                          display: { ...activeImage.display, creativeFlash: checked },
                        })
                      }
                    />
                    {activeImage.weddingSlug ? (
                      <DetailToggle
                        label="Wedding story"
                        checked={activeImage.display.blog}
                        onChange={(checked) =>
                          patchImage(activeImage.assetKey, {
                            display: { ...activeImage.display, blog: checked },
                          })
                        }
                      />
                    ) : null}
                    <DetailToggle
                      label="Homepage"
                      checked={activeImage.display.homepage}
                      onChange={(checked) =>
                        patchImage(activeImage.assetKey, {
                          display: { ...activeImage.display, homepage: checked },
                        })
                      }
                    />
                    <DetailToggle
                      label="Portfolio"
                      checked={activeImage.display.portfolio}
                      onChange={(checked) =>
                        patchImage(activeImage.assetKey, {
                          display: { ...activeImage.display, portfolio: checked },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="border-t border-black/10 pt-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Moments
                  </p>
                  <div className="space-y-2">
                    {document.moments
                      .filter((item) => item.status === "active" && item.availableForAssignment)
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item) => (
                        <DetailToggle
                          key={item.id}
                          label={item.name}
                          checked={(activeImage.moments || []).includes(item.slug)}
                          onChange={(checked) =>
                            setImageMoment(activeImage, item.slug, checked)
                          }
                        />
                      ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    showImages([activeImage.assetKey]);
                    patchMoment({
                      heroImageId: activeImage.assetKey,
                      cardImageId: activeImage.assetKey,
                    });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm"
                >
                  <Star className="h-4 w-4" />
                  {moment.heroImageId === activeImage.assetKey ||
                  moment.heroImageId === activeImage.imageId
                    ? "Hero + moment card image set"
                    : "Set as hero + moment card"}
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

function DetailToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 p-3">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
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
