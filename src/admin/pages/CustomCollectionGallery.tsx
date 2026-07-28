import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
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
  CustomCollection,
  CustomCollectionAssignmentOption,
  CustomCollectionImage,
} from "../types/customCollection";

type Filter = "all" | "included" | "excluded" | "hidden";

function SafeImage({
  image,
  className,
}: {
  image: CustomCollectionImage;
  className?: string;
}) {
  const [src, setSrc] = useState(image.thumbSrc || image.fullSrc);
  useEffect(() => {
    setSrc(image.thumbSrc || image.fullSrc);
  }, [image.assetKey, image.thumbSrc, image.fullSrc]);

  if (!src) {
    return <div className={className} style={{ background: "#f5f5f5" }} />;
  }

  return (
    <img
      src={src}
      alt={image.alt || image.filename}
      draggable={false}
      className={className}
      onError={() => {
        if (src !== image.fullSrc && image.fullSrc) setSrc(image.fullSrc);
        else setSrc("");
      }}
    />
  );
}

export function CustomCollectionGallery() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [collection, setCollection] = useState<CustomCollection | null>(null);
  const [images, setImages] = useState<CustomCollectionImage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [draggedKeys, setDraggedKeys] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [customCollections, setCustomCollections] = useState<CustomCollectionAssignmentOption[]>([]);
  const [customMemberships, setCustomMemberships] = useState<Record<string, string[]>>({});
  const [customMembershipDirty, setCustomMembershipDirty] = useState<Set<string>>(new Set());
  const anchor = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      AdminApiService.getCustomCollectionGallery(slug),
      AdminApiService.getCustomCollectionMemberships(),
    ])
      .then(([payload, membershipData]) => {
        if (cancelled) return;
        setCollection(payload.collection);
        setImages(payload.images);
        setCustomCollections(membershipData.collections);
        setCustomMemberships(membershipData.memberships);
        setActiveKey(payload.images.find((image) => image.included)?.assetKey || payload.images[0]?.assetKey || null);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load collection gallery.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const imageMap = useMemo(
    () => new Map(images.map((image) => [image.assetKey, image])),
    [images],
  );

  const includedOrder = useMemo(
    () =>
      images
        .filter((image) => image.included)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((image) => image.assetKey),
    [images],
  );

  const orderedImages = useMemo(() => {
    const included = includedOrder
      .map((assetKey) => imageMap.get(assetKey))
      .filter((image): image is CustomCollectionImage => Boolean(image));
    const excluded = images
      .filter((image) => !image.included)
      .sort((a, b) => a.filename.localeCompare(b.filename));
    const query = search.trim().toLowerCase();

    return [...included, ...excluded].filter((image) => {
      if (filter === "included" && !image.included) return false;
      if (filter === "excluded" && image.included) return false;
      if (filter === "hidden" && (!image.included || !image.hidden)) return false;
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
  }, [images, includedOrder, imageMap, search, filter]);

  const activeImage = activeKey ? imageMap.get(activeKey) || null : null;
  const includedCount = images.filter((image) => image.included).length;
  const visibleCount = images.filter((image) => image.included && !image.hidden).length;
  const hiddenCount = images.filter((image) => image.included && image.hidden).length;

  function markDirty() {
    setDirty(true);
    setMessage("");
    setError("");
  }

  function patchImage(assetKey: string, patch: Partial<CustomCollectionImage>) {
    setImages((current) =>
      current.map((image) =>
        image.assetKey === assetKey ? { ...image, ...patch } : image,
      ),
    );
    markDirty();
  }

  function setCustomCollection(
    assetKey: string,
    collectionId: string,
    checked: boolean,
  ) {
    setCustomMemberships((current) => {
      const next = new Set(current[assetKey] || []);
      if (checked) next.add(collectionId);
      else next.delete(collectionId);
      return { ...current, [assetKey]: [...next] };
    });
    setCustomMembershipDirty((current) => new Set(current).add(assetKey));
    markDirty();
  }

  function syncCurrentCollectionMembership(assetKeys: string[], checked: boolean) {
    if (!collection) return;
    const keys = new Set(assetKeys);
    setCustomMemberships((current) => {
      const nextState = { ...current };
      for (const assetKey of keys) {
        const next = new Set(nextState[assetKey] || []);
        if (checked) next.add(collection.id);
        else next.delete(collection.id);
        nextState[assetKey] = [...next];
      }
      return nextState;
    });
    setCustomMembershipDirty((current) => {
      const next = new Set(current);
      for (const assetKey of keys) next.add(assetKey);
      return next;
    });
  }

  function includeKeys(assetKeys: string[]) {
    const target = new Set(assetKeys);
    const currentMax = Math.max(0, ...images.filter((image) => image.included).map((image) => image.sortOrder));
    let offset = 0;
    setImages((current) =>
      current.map((image) => {
        if (!target.has(image.assetKey) || image.included) return image;
        offset += 1;
        return { ...image, included: true, hidden: false, sortOrder: currentMax + offset };
      }),
    );
    syncCurrentCollectionMembership(assetKeys, true);
    markDirty();
  }

  function excludeKeys(assetKeys: string[]) {
    const target = new Set(assetKeys);
    setImages((current) =>
      current.map((image) =>
        target.has(image.assetKey)
          ? { ...image, included: false, hidden: false, sortOrder: Number.MAX_SAFE_INTEGER }
          : image,
      ),
    );
    if (collection?.heroAssetKey && target.has(collection.heroAssetKey)) {
      setCollection({ ...collection, heroAssetKey: "" });
    }
    syncCurrentCollectionMembership(assetKeys, false);
    markDirty();
  }

  function setHidden(assetKeys: string[], hidden: boolean) {
    const target = new Set(assetKeys);
    setImages((current) =>
      current.map((image) =>
        target.has(image.assetKey) && image.included ? { ...image, hidden } : image,
      ),
    );
    markDirty();
  }

  function toggleSelection(image: CustomCollectionImage, index: number) {
    setActiveKey(image.assetKey);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(image.assetKey)) next.delete(image.assetKey);
      else next.add(image.assetKey);
      return next;
    });
    anchor.current = index;
  }

  function openImage(
    event: MouseEvent,
    image: CustomCollectionImage,
    index: number,
  ) {
    setActiveKey(image.assetKey);
    if (event.shiftKey && anchor.current !== null) {
      const start = Math.min(anchor.current, index);
      const end = Math.max(anchor.current, index);
      setSelected(
        new Set(orderedImages.slice(start, end + 1).map((item) => item.assetKey)),
      );
      return;
    }
    if (event.metaKey || event.ctrlKey) {
      toggleSelection(image, index);
      return;
    }
    anchor.current = index;
  }

  function beginDrag(image: CustomCollectionImage) {
    if (!image.included) return;
    const moving =
      selected.has(image.assetKey) && selected.size > 1
        ? includedOrder.filter((assetKey) => selected.has(assetKey))
        : [image.assetKey];
    if (!selected.has(image.assetKey)) setSelected(new Set([image.assetKey]));
    setActiveKey(image.assetKey);
    setDraggedKeys(moving);
  }

  function dropOn(targetAssetKey: string) {
    if (!draggedKeys.length || draggedKeys.includes(targetAssetKey)) {
      setDraggedKeys([]);
      return;
    }
    const targetImage = imageMap.get(targetAssetKey);
    if (!targetImage?.included) {
      setDraggedKeys([]);
      return;
    }

    const movingSet = new Set(draggedKeys);
    const moving = includedOrder.filter((assetKey) => movingSet.has(assetKey));
    const remaining = includedOrder.filter((assetKey) => !movingSet.has(assetKey));
    const targetIndex = remaining.indexOf(targetAssetKey);
    const next = [...remaining];
    if (targetIndex < 0) next.push(...moving);
    else next.splice(targetIndex, 0, ...moving);
    const rank = new Map(next.map((assetKey, index) => [assetKey, index + 1]));

    setImages((current) =>
      current.map((image) =>
        image.included
          ? { ...image, sortOrder: rank.get(image.assetKey) || image.sortOrder }
          : image,
      ),
    );
    setDraggedKeys([]);
    markDirty();
  }

  async function save() {
    if (!collection) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const included = images
        .filter((image) => image.included)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((image, index) => ({
          assetKey: image.assetKey,
          sortOrder: index + 1,
          hidden: image.hidden,
        }));
      await AdminApiService.saveCustomCollectionGallery(collection.slug, {
        heroAssetKey: collection.heroAssetKey,
        items: included,
      });
      if (customMembershipDirty.size) {
        await AdminApiService.saveCustomCollectionMemberships(
          [...customMembershipDirty].map((assetKey) => ({
            assetKey,
            collectionIds: customMemberships[assetKey] || [],
          })),
        );
      }
      const ranks = new Map(included.map((item) => [item.assetKey, item.sortOrder]));
      setImages((current) =>
        current.map((image) =>
          image.included
            ? { ...image, sortOrder: ranks.get(image.assetKey) || image.sortOrder }
            : image,
        ),
      );
      setCustomMembershipDirty(new Set());
      setDirty(false);
      setSelected(new Set());
      setMessage("Collection gallery saved. Public gallery data is now updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save collection gallery.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!collection) {
    return (
      <div className="rounded-[28px] border border-black/10 bg-white p-8 text-neutral-600">
        {error || "Loading collection gallery…"}
      </div>
    );
  }

  const selectedKeys = [...selected];

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] bg-black p-7 text-white md:p-9">
        <Link
          to="/admin/custom-collections"
          className="mb-4 inline-flex items-center gap-2 text-sm text-white/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to custom collections
        </Link>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-white/45">
              Custom Collection Manager
            </p>
            <h1 className="font-serif text-4xl md:text-5xl">{collection.name}</h1>
            <p className="mt-3 max-w-3xl text-sm text-white/60">
              Add images, curate their exact order, hide individual photographs and choose the gallery hero.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {collection.status === "active" ? (
              <a
                href={`https://www.mkbweddings.co.uk/gallery/collection/${encodeURIComponent(collection.slug)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-5 py-3 text-sm"
              >
                View live gallery
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-black disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : dirty ? "Save gallery" : "Saved"}
            </button>
          </div>
        </div>
        <div className="mt-7 grid grid-cols-3 gap-3">
          <Stat label="Available" value={images.length} />
          <Stat label="Included" value={includedCount} />
          <Stat label="Visible" value={visibleCount} />
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
                ["included", `Included ${includedCount}`],
                ["excluded", `Not included ${images.length - includedCount}`],
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
            <strong className="text-sm">{selected.size} selected</strong>
            <BatchButton label="Add" onClick={() => includeKeys(selectedKeys)} />
            <BatchButton label="Remove" onClick={() => excludeKeys(selectedKeys)} />
            <BatchButton label="Show" onClick={() => setHidden(selectedKeys, false)} />
            <BatchButton label="Hide" onClick={() => setHidden(selectedKeys, true)} />
            <span className="text-xs text-neutral-500">
              Included selections can be dragged together using any selected grip.
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto rounded-full border border-black/10 bg-white p-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </section>

      <section className="admin-master-detail admin-master-detail--320">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: "12px",
            alignItems: "start",
          }}
        >
          {orderedImages.map((image, index) => {
            const isSelected = selected.has(image.assetKey);
            const isHero =
              collection.heroAssetKey === image.assetKey ||
              collection.heroAssetKey === image.imageId;
            const isDragging = draggedKeys.includes(image.assetKey);
            return (
              <article
                key={image.assetKey}
                onDragOver={(event) => {
                  if (image.included) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  dropOn(image.assetKey);
                }}
                style={{
                  overflow: "hidden",
                  borderRadius: 16,
                  border:
                    activeKey === image.assetKey
                      ? "2px solid #111"
                      : isSelected
                        ? "2px solid #737373"
                        : "1px solid rgba(0,0,0,.12)",
                  background: "#fff",
                  opacity: isDragging ? 0.4 : image.included ? (image.hidden ? 0.55 : 1) : 0.45,
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(event) => openImage(event, image, index)}
                  style={{
                    position: "relative",
                    aspectRatio: "4 / 5",
                    overflow: "hidden",
                    cursor: "pointer",
                    background: "#f5f5f5",
                  }}
                >
                  <SafeImage image={image} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleSelection(image, index);
                    }}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: 8,
                      zIndex: 30,
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      background: isSelected ? "#111" : "#fff",
                      color: isSelected ? "#fff" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(0,0,0,.15)",
                    }}
                  >
                    <Check size={16} />
                  </button>
                  {image.included ? (
                    <div
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", image.assetKey);
                        beginDrag(image);
                      }}
                      onDragEnd={() => setDraggedKeys([])}
                      style={{
                        position: "absolute",
                        right: 8,
                        bottom: 8,
                        zIndex: 30,
                        width: 38,
                        height: 38,
                        borderRadius: 999,
                        background: "#fff",
                        boxShadow: "0 6px 18px rgba(0,0,0,.22)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "grab",
                      }}
                    >
                      <GripVertical size={20} />
                    </div>
                  ) : null}
                  <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                    {!image.included ? <Badge>Not included</Badge> : null}
                    {image.hidden ? <Badge>Hidden</Badge> : null}
                    {isHero ? <Badge>Hero</Badge> : null}
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="truncate text-[11px] font-medium">
                    {image.venueName || "Unlinked venue"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <aside
          className="admin-summary-panel"
          style={{
            borderRadius: 24,
            border: "1px solid rgba(0,0,0,.12)",
            background: "#fff",
            padding: 16,
          }}
        >
          {!activeImage ? (
            <p className="text-sm text-neutral-500">Select an image to edit it.</p>
          ) : (
            <div className="space-y-4">
              <SafeImage
                image={activeImage}
                className="max-h-[240px] w-full rounded-2xl bg-neutral-100 object-contain"
              />
              <div>
                <p className="break-all text-xs text-neutral-500">{activeImage.filename}</p>
                <p className="mt-1 text-sm font-medium">{activeImage.venueName}</p>
              </div>

              <CheckRow
                label={`Include in ${collection.name}`}
                checked={activeImage.included}
                onChange={(checked) =>
                  checked
                    ? includeKeys([activeImage.assetKey])
                    : excludeKeys([activeImage.assetKey])
                }
              />

              <div className="border-t border-black/10 pt-4">
                <p className="mb-3 text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Other custom collections
                </p>
                {customCollections.filter((item) => item.id !== collection.id).length ? (
                  customCollections
                    .filter((item) => item.id !== collection.id)
                    .map((item) => (
                      <CheckRow
                        key={item.id}
                        label={`${item.name}${item.status === "draft" ? " (Draft)" : ""}`}
                        checked={(customMemberships[activeImage.assetKey] || []).includes(item.id)}
                        onChange={(checked) =>
                          setCustomCollection(activeImage.assetKey, item.id, checked)
                        }
                      />
                    ))
                ) : (
                  <p className="text-xs leading-5 text-neutral-500">
                    No other custom collections yet.
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={!activeImage.included}
                onClick={() => setHidden([activeImage.assetKey], !activeImage.hidden)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm disabled:opacity-40"
              >
                {activeImage.hidden ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                {activeImage.hidden ? "Show in gallery" : "Hide from gallery"}
              </button>

              <button
                type="button"
                onClick={() => {
                  includeKeys([activeImage.assetKey]);
                  setHidden([activeImage.assetKey], false);
                  setCollection({ ...collection, heroAssetKey: activeImage.assetKey });
                  markDirty();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm text-white"
              >
                <Star className="h-4 w-4" />
                {collection.heroAssetKey === activeImage.assetKey ||
                collection.heroAssetKey === activeImage.imageId
                  ? "Gallery hero set"
                  : "Set as gallery hero + card"}
              </button>

              <div className="rounded-2xl bg-neutral-100 p-3 text-xs leading-5 text-neutral-600">
                The hero is also used for this collection’s card on the main Gallery landing page.
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.05] p-3">
      <p className="text-xs uppercase tracking-[.14em] text-white/45">{label}</p>
      <p className="mt-1 text-xl">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-black px-2 py-1 text-[9px] text-white">
      {children}
    </span>
  );
}

function BatchButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm"
    >
      {label}
    </button>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 p-3">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
