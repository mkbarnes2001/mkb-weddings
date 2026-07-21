import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  CloudUpload,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Save,
  Search,
  Star,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { MomentRecord } from "../types/moment";
import { WeddingService } from "../services/WeddingService";
import { ImageManagerService } from "../services/ImageManagerService";
import type { ManagedWeddingImage } from "../types/imageManager";
import type {
  VenueGalleryItem,
  VenueSummary,
} from "../types/venue";

type AggregatedAsset = ManagedWeddingImage & {
  assetId: string;
  weddingSlug: string;
  weddingCouple: string;
};

type FilterMode = "all" | "included" | "excluded" | "hero";

export function VenueGallery() {
  const { slug } = useParams();

  const [venue, setVenue] = useState<VenueSummary | null>(null);
  const [moments, setMoments] = useState<MomentRecord[]>([]);
  const [batchMomentMode, setBatchMomentMode] = useState<"add" | "remove" | "replace">("add");
  const [batchGalleryMode, setBatchGalleryMode] = useState<"add" | "remove" | "replace">("add");
  const [assets, setAssets] = useState<AggregatedAsset[]>([]);
  const [items, setItems] = useState<VenueGalleryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedIds, setDraggedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const anchorRef = useRef<number | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      try {
        const [loadedVenue, momentDocument] = await Promise.all([
          AdminApiService.getVenue(slug),
          AdminApiService.getMoments(),
        ]);
        setVenue(loadedVenue);
        setMoments(
          momentDocument.moments
            .filter((moment) => moment.status === "active")
            .sort((a, b) => a.sortOrder - b.sortOrder),
        );

        const weddingService = await WeddingService.load();
        const linkedWeddings = weddingService
          .getWeddings()
          .filter((wedding) => {
            const venueName = String(wedding.venue || "")
              .trim()
              .toLowerCase();

            return (
              wedding.venueSlug === loadedVenue.slug ||
              venueName === loadedVenue.name.toLowerCase()
            );
          });

        const imageGroups = await Promise.all(
          linkedWeddings.map(async (wedding) => {
            const managed = await ImageManagerService.load(
              wedding.slug,
              wedding.images,
            );

            return managed.map((image) => ({
              ...image,
              assetId: `${wedding.slug}:${image.id}`,
              weddingSlug: wedding.slug,
              weddingCouple: wedding.couple,
            }));
          }),
        );

        const weddingAssets = imageGroups.flat();
        const weddingAssetIds = new Set(
          weddingAssets.map((asset) => asset.assetId),
        );

        const importedAssets: AggregatedAsset[] =
          (loadedVenue.gallery?.images || [])
            .filter(
              (item) =>
                !weddingAssetIds.has(item.assetId) &&
                item.thumbSrc &&
                item.fullSrc,
            )
            .map((item) => ({
              id: item.imageId,
              filename: item.filename,
              slug: item.assetId,
              order: item.order,
              isCover:
                loadedVenue.gallery?.heroAssetId ===
                item.assetId,
              hidden: item.hidden,
              rating: item.rating,
              thumbSrc: item.thumbSrc || "",
              fullSrc: item.fullSrc || "",
              aiTags:
                item.aiTags?.length
                  ? item.aiTags
                  : item.tags || [],
              aiAlt:
                item.aiAlt ||
                `${loadedVenue.name} wedding photography`,
              aiCaption:
                item.aiCaption ||
                item.source?.category ||
                "Imported venue gallery image",
              collections: [
                ...(item.display.blog ? ["blog"] : []),
                ...(item.display.venue ? ["venue"] : []),
                ...(item.display.moments ? ["moments"] : []),
                ...(item.display.homepage ? ["homepage"] : []),
                ...(item.display.portfolio ? ["portfolio"] : []),
              ],
              assetId: item.assetId,
              weddingSlug: item.weddingSlug || "",
              weddingCouple:
                item.source?.type === "legacy-gallery-csv"
                  ? "Imported venue gallery"
                  : "Unlinked venue image",
            }));

        const aggregated = [
          ...weddingAssets,
          ...importedAssets,
        ];
        setAssets(aggregated);

        const existing = new Map(
          (loadedVenue.gallery?.images || []).map((item) => [
            item.assetId,
            item,
          ]),
        );

        const merged = aggregated.map((asset, index) => {
          const current = existing.get(asset.assetId);

          if (current) {
            return {
              ...current,
              aiTags:
                asset.aiTags?.length
                  ? asset.aiTags
                  : current.aiTags || [],
              aiAlt:
                asset.aiAlt ||
                current.aiAlt ||
                "",
              aiCaption:
                asset.aiCaption ||
                current.aiCaption ||
                "",
            };
          }

          return {
            assetId: asset.assetId,
            imageId: asset.id,
            weddingSlug: asset.weddingSlug,
            filename: asset.filename,
            order: index + 1,
            included: false,
            hidden: asset.hidden,
            rating: asset.rating,
            moments: [],
            tags: asset.aiTags || [],
            aiTags: asset.aiTags || [],
            aiAlt: asset.aiAlt || "",
            aiCaption: asset.aiCaption || "",
            thumbSrc: asset.thumbSrc,
            fullSrc: asset.fullSrc,
            source: {
              type: "wedding-json",
            },
            display: {
              venue: false,
              moments: false,
              blog: asset.collections.includes("blog"),
              homepage: asset.collections.includes("homepage"),
              portfolio: asset.collections.includes("portfolio"),
            },
          };
        });

        setItems(normaliseOrder(merged));
        setActiveId(aggregated[0]?.assetId || null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load venue gallery.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.assetId, item])),
    [items],
  );

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const heroId = venue?.gallery?.heroAssetId || "";

    return assets
      .filter((asset) => {
        const item = itemMap.get(asset.assetId);
        const matchesQuery =
          !q ||
          asset.filename.toLowerCase().includes(q) ||
          asset.weddingCouple.toLowerCase().includes(q) ||
          asset.aiCaption.toLowerCase().includes(q) ||
          asset.aiTags.some((tag) =>
            tag.toLowerCase().includes(q),
          );

        const matchesFilter =
          filter === "all" ||
          (filter === "included" && item?.included) ||
          (filter === "excluded" && !item?.included) ||
          (filter === "hero" && asset.assetId === heroId);

        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => {
        const aItem = itemMap.get(a.assetId);
        const bItem = itemMap.get(b.assetId);

        if (aItem?.included && bItem?.included) {
          return aItem.order - bItem.order;
        }

        if (aItem?.included) return -1;
        if (bItem?.included) return 1;

        return a.filename.localeCompare(b.filename);
      });
  }, [assets, itemMap, query, filter, venue]);

  const activeAsset = useMemo(
    () => assets.find((asset) => asset.assetId === activeId) || null,
    [assets, activeId],
  );

  const activeItem = activeId ? itemMap.get(activeId) || null : null;

  function commit(
    updater: (current: VenueGalleryItem[]) => VenueGalleryItem[],
  ) {
    setItems((current) => normaliseOrder(updater(current)));
    setDirty(true);
    setMessage("");
    setError("");
  }

  function patchItem(
    assetId: string,
    patch: Partial<VenueGalleryItem>,
  ) {
    commit((current) =>
      current.map((item) =>
        item.assetId === assetId
          ? {
              ...item,
              ...patch,
              display: patch.display
                ? {
                    ...item.display,
                    ...patch.display,
                  }
                : item.display,
            }
          : item,
      ),
    );
  }

  function toggleSelection(
    asset: AggregatedAsset,
    index: number,
  ) {
    setActiveId(asset.assetId);

    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(asset.assetId)) {
        next.delete(asset.assetId);
      } else {
        next.add(asset.assetId);
      }

      return next;
    });

    anchorRef.current = index;
  }

  function openAsset(
    event: React.MouseEvent,
    asset: AggregatedAsset,
    index: number,
  ) {
    setActiveId(asset.assetId);

    if (event.shiftKey && anchorRef.current !== null) {
      const start = Math.min(anchorRef.current, index);
      const end = Math.max(anchorRef.current, index);

      setSelectedIds(
        new Set(
          filteredAssets
            .slice(start, end + 1)
            .map((item) => item.assetId),
        ),
      );
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      toggleSelection(asset, index);
      return;
    }

    anchorRef.current = index;
  }

  function setSelectedIncluded(included: boolean) {
    if (!selectedIds.size) return;

    commit((current) =>
      current.map((item) =>
        selectedIds.has(item.assetId)
          ? {
              ...item,
              included,
              display: {
                ...item.display,
                venue: included,
              },
            }
          : item,
      ),
    );
  }

  function setSelectedMomentDisplay(enabled: boolean) {
    if (!selectedIds.size) return;

    commit((current) =>
      current.map((item) =>
        selectedIds.has(item.assetId)
          ? {
              ...item,
              display: {
                ...item.display,
                moments: enabled,
              },
            }
          : item,
      ),
    );
  }

  function applyGalleryToSelection(
    gallery:
      | "blog"
      | "venue"
      | "moments"
      | "homepage"
      | "portfolio"
      | "creativeFlash",
  ) {
    if (!selectedIds.size) return;

    commit((current) =>
      current.map((item) => {
        if (!selectedIds.has(item.assetId)) return item;

        const nextDisplay =
          batchGalleryMode === "replace"
            ? {
                venue: false,
                moments: false,
                blog: false,
                homepage: false,
                portfolio: false,
                creativeFlash: false,
                [gallery]: true,
              }
            : {
                ...item.display,
                [gallery]: batchGalleryMode === "add",
              };

        return {
          ...item,
          included:
            gallery === "venue"
              ? batchGalleryMode === "remove"
                ? false
                : true
              : item.included,
          display: nextDisplay,
        };
      }),
    );
  }

  function applyMomentToSelection(
    momentSlug: string,
  ) {
    if (!selectedIds.size) return;

    commit((current) =>
      current.map((item) => {
        if (!selectedIds.has(item.assetId)) return item;

        const currentMoments = item.moments || [];

        let nextMoments = currentMoments;

        if (batchMomentMode === "add") {
          nextMoments = [
            ...new Set([...currentMoments, momentSlug]),
          ];
        } else if (batchMomentMode === "remove") {
          nextMoments = currentMoments.filter(
            (value) => value !== momentSlug,
          );
        } else {
          nextMoments = [momentSlug];
        }

        return {
          ...item,
          moments: nextMoments,
          display: {
            ...item.display,
            moments: nextMoments.length > 0,
          },
        };
      }),
    );
  }

  function beginDrag(asset: AggregatedAsset) {
    const moving =
      selectedIds.has(asset.assetId) && selectedIds.size > 1
        ? items
            .filter((item) => selectedIds.has(item.assetId))
            .map((item) => item.assetId)
        : [asset.assetId];

    if (!selectedIds.has(asset.assetId)) {
      setSelectedIds(new Set([asset.assetId]));
    }

    setActiveId(asset.assetId);
    setDraggedIds(moving);
  }

  function dropOn(targetAssetId: string) {
    if (!draggedIds.length || draggedIds.includes(targetAssetId)) {
      setDraggedIds([]);
      return;
    }

    commit((current) => {
      const movingSet = new Set(draggedIds);
      const moving = current.filter((item) =>
        movingSet.has(item.assetId),
      );
      const remaining = current.filter(
        (item) => !movingSet.has(item.assetId),
      );

      const targetIndex = remaining.findIndex(
        (item) => item.assetId === targetAssetId,
      );

      if (targetIndex < 0) return [...remaining, ...moving];

      const next = [...remaining];
      next.splice(targetIndex, 0, ...moving);
      return next;
    });

    setDraggedIds([]);
  }

  function setHero(assetId: string) {
    if (!venue) return;

    setVenue({
      ...venue,
      heroImageId: assetId,
      gallery: {
        ...venue.gallery,
        heroAssetId: assetId,
      },
    });

    patchItem(assetId, {
      included: true,
      display: {
        ...itemMap.get(assetId)?.display,
        venue: true,
      } as VenueGalleryItem["display"],
    });
  }

  async function synchroniseWeddingImageMetadata() {
    const byWedding = new Map<string, VenueGalleryItem[]>();

    items.forEach((item) => {
      const weddingSlug = String(
        item.weddingSlug || "",
      ).trim();

      // Images imported from the legacy gallery CSV are not yet
      // attached to a wedding record. They belong to the venue
      // gallery only and must not call /api/weddings//images.
      if (!weddingSlug) return;

      const current = byWedding.get(weddingSlug) || [];
      current.push(item);
      byWedding.set(weddingSlug, current);
    });

    for (const [weddingSlug, galleryItems] of byWedding) {
      const matchingAssets = assets.filter(
        (asset) => asset.weddingSlug === weddingSlug,
      );

      if (!matchingAssets.length) continue;

      const galleryItemMap = new Map(
        galleryItems.map((item) => [item.imageId, item]),
      );

      const updatedImages = matchingAssets.map((asset) => {
        const galleryItem = galleryItemMap.get(asset.id);

        if (!galleryItem) return asset;

        const controlledCollections = new Set([
          "blog",
          "venue",
          "moments",
          "homepage",
          "portfolio",
          "creative-flash",
        ]);

        const retainedCollections = asset.collections.filter(
          (collection) => !controlledCollections.has(collection),
        );

        const nextCollections = [
          ...retainedCollections,
          ...(galleryItem.display.blog ? ["blog"] : []),
          ...(galleryItem.display.venue ? ["venue"] : []),
          ...(galleryItem.display.moments ? ["moments"] : []),
          ...(galleryItem.display.homepage ? ["homepage"] : []),
          ...(galleryItem.display.portfolio ? ["portfolio"] : []),
          ...(galleryItem.display.creativeFlash ? ["creative-flash"] : []),
        ];

        return {
          ...asset,
          rating: galleryItem.rating,
          hidden: galleryItem.hidden,
          collections: [...new Set(nextCollections)],
        };
      });

      await ImageManagerService.save(
        weddingSlug,
        updatedImages,
      );
    }
  }

  async function saveGallery(): Promise<boolean> {
    if (!venue || !slug) return false;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await synchroniseWeddingImageMetadata();

      const result = await AdminApiService.updateVenue(slug, {
        ...venue,
        gallery: {
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
          heroAssetId:
            venue.gallery?.heroAssetId || venue.heroImageId || "",
          images: normaliseOrder(items),
        },
      });

      setVenue(result.venue);
      setDirty(false);
      setMessage(
        `Saved ${items.filter((item) => item.included).length} venue gallery images and synchronised wedding gallery membership.`,
      );

      return true;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save venue gallery.",
      );

      return false;
    } finally {
      setSaving(false);
    }
  }


  function removeActiveFromVenueGallery() {
    if (!activeAsset || !activeItem || !venue) {
      return;
    }

    const heroAssetId =
      venue.gallery?.heroAssetId ||
      venue.heroImageId ||
      "";

    if (
      activeItem.assetId === heroAssetId
    ) {
      setError(
        "Select another venue hero before removing this image from the venue gallery.",
      );
      return;
    }

    patchItem(activeItem.assetId, {
      included: false,
      display: {
        ...activeItem.display,
        venue: false,
      },
    });

    setMessage(
      "Removed from the venue gallery draft. Select Save gallery to apply the change.",
    );
  }

  async function deleteActivePermanently() {
    if (
      !activeAsset ||
      !activeItem ||
      !venue ||
      !slug
    ) {
      return;
    }

    if (dirty) {
      setError(
        "Save or discard the current gallery changes before permanently deleting an image.",
      );
      return;
    }

    if (!activeAsset.weddingSlug) {
      setError(
        "Imported CSV images cannot be permanently deleted here. Remove the image from the venue gallery instead.",
      );
      return;
    }

    const heroAssetId =
      venue.gallery?.heroAssetId ||
      venue.heroImageId ||
      "";

    if (
      activeItem.assetId === heroAssetId
    ) {
      setError(
        "Select another venue hero before permanently deleting this image.",
      );
      return;
    }

    if (activeAsset.isCover) {
      setError(
        "This image is the wedding cover. Select another wedding cover before deleting it.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete "${activeAsset.filename}"?\n\n` +
        "This removes it from the wedding, venue, collections, moments and its R2/local full and thumbnail files. This cannot be undone.",
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setMessage("");

    try {
      const result =
        await AdminApiService.deleteWeddingImage({
          weddingSlug:
            activeAsset.weddingSlug,
          imageId: activeAsset.id,
          venueSlug: slug,
        });

      const deletedAssetId =
        activeItem.assetId;

      const nextAssets = assets.filter(
        (asset) =>
          asset.assetId !== deletedAssetId,
      );

      setAssets(nextAssets);

      setItems((current) =>
        normaliseOrder(
          current.filter(
            (item) =>
              item.assetId !== deletedAssetId,
          ),
        ),
      );

      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(deletedAssetId);
        return next;
      });

      setActiveId(
        nextAssets[0]?.assetId || null,
      );

      const warningText =
        result.deletion.storageWarnings.length
          ? ` Storage warning: ${result.deletion.storageWarnings.join(
              " ",
            )}`
          : "";

      setMessage(
        `Permanently deleted ${result.deletion.filename}.${warningText}`,
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete image.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function publishVenue() {
    if (!venue || !slug) return;

    setPublishing(true);
    setError("");
    setMessage("");

    try {
      if (dirty) {
        const saved = await saveGallery();

        if (!saved) return;
      }

      const result =
        await AdminApiService.publishVenue(
          slug,
        );

      setMessage(
        `${venue.name} published from D1 with ${result.publish.publicImageCount} images. The public venue page now reads this published version directly; no Git content commit or Cloudflare rebuild is required.`,
      );
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish venue.",
      );
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return <div className="text-neutral-500">Loading venue gallery…</div>;
  }

  if (!venue) {
    return (
      <section className="rounded-[28px] border border-black/10 bg-white p-8">
        <h1 className="font-serif text-3xl">Venue not found</h1>
        <p className="mt-3 text-neutral-600">{error}</p>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <Link
        to={`/admin/venues/${venue.slug}`}
        className="inline-flex items-center gap-2 text-sm text-neutral-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to venue
      </Link>

      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">
              Venue Gallery Manager
            </p>
            <h1 className="font-serif text-5xl md:text-6xl">
              {venue.name}
            </h1>
            <p className="mt-4 text-white/60">
              {assets.length} available ·{" "}
              {items.filter((item) => item.included).length} included
            </p>
            <p className="mt-2 max-w-2xl text-sm text-white/45">
              Gallery membership is synchronised back to each wedding image
              record when you save.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to={`/admin/venues/${venue.slug}/upload`}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm text-white"
            >
              Upload images
            </Link>
            <Link
              to="/admin/moments"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm text-white"
            >
              Manage moments
            </Link>
          <button
            type="button"
            onClick={publishVenue}
            disabled={publishing || saving}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black ring-2 ring-white/30 disabled:opacity-40"
          >
            <CloudUpload className="h-4 w-4" />
            {publishing
              ? "Publishing…"
              : "Publish venue"}
          </button>

          <button
            type="button"
            onClick={saveGallery}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-black disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : dirty ? "Save gallery" : "Saved"}
          </button>
          </div>
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

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search filename, couple, caption or tags..."
            className="w-full rounded-2xl border border-black/10 bg-white/80 py-3 pl-11 pr-4 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["included", "In gallery"],
              ["excluded", "Not included"],
              ["hero", "Hero"],
            ] as Array<[FilterMode, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full border px-4 py-2 text-sm ${
                filter === value
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {selectedIds.size ? (
        <section className="flex flex-wrap items-center gap-3 rounded-[24px] border border-black/10 bg-white/90 p-4">
          <strong>{selectedIds.size} selected</strong>

          <button
            type="button"
            onClick={() => setSelectedIncluded(true)}
            className="rounded-full border border-black/10 px-4 py-2 text-sm"
          >
            Add to venue gallery
          </button>

          <button
            type="button"
            onClick={() => setSelectedIncluded(false)}
            className="rounded-full border border-black/10 px-4 py-2 text-sm"
          >
            Remove from venue gallery
          </button>

          <select
            value={batchGalleryMode}
            onChange={(event) =>
              setBatchGalleryMode(
                event.target.value as "add" | "remove" | "replace",
              )
            }
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm"
          >
            <option value="add">Add to gallery</option>
            <option value="remove">Remove from gallery</option>
            <option value="replace">Replace gallery visibility</option>
          </select>

          {(
            [
              ["blog", "Wedding story"],
              ["venue", "Venue"],
              ["homepage", "Homepage"],
              ["portfolio", "Portfolio"],
              ["creativeFlash", "Creative Flash"],
            ] as const
          ).map(([gallery, label]) => (
            <button
              key={gallery}
              type="button"
              onClick={() =>
                applyGalleryToSelection(gallery)
              }
              className="rounded-full border border-black/10 px-4 py-2 text-sm"
            >
              {label}
            </button>
          ))}

          <select
            value={batchMomentMode}
            onChange={(event) =>
              setBatchMomentMode(
                event.target.value as "add" | "remove" | "replace",
              )
            }
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm"
          >
            <option value="add">Add moment</option>
            <option value="remove">Remove moment</option>
            <option value="replace">Replace moments</option>
          </select>

          {moments
            .filter((moment) => moment.availableForAssignment)
            .map((moment) => (
              <button
                key={moment.id}
                type="button"
                onClick={() =>
                  applyMomentToSelection(moment.slug)
                }
                className="rounded-full border border-black/10 px-4 py-2 text-sm"
              >
                {moment.name}
              </button>
            ))}

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </section>
      ) : null}

      {!assets.length ? (
        <section className="rounded-[28px] border border-black/10 bg-white/80 p-10 text-center">
          <ImageIcon className="mx-auto h-10 w-10 text-neutral-400" />
          <h2 className="mt-4 font-serif text-3xl">
            No linked wedding images
          </h2>
          <p className="mt-3 text-neutral-500">
            Link a JSON wedding to this venue and add images to that wedding.
          </p>
        </section>
      ) : (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 390px",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {filteredAssets.map((asset, index) => {
              const item = itemMap.get(asset.assetId);
              const selected = selectedIds.has(asset.assetId);
              const hero =
                venue.gallery?.heroAssetId === asset.assetId;
              const dragging = draggedIds.includes(asset.assetId);

              return (
                <article
                  key={asset.assetId}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    dropOn(asset.assetId);
                  }}
                  style={{
                    overflow: "hidden",
                    borderRadius: "22px",
                    border:
                      activeId === asset.assetId
                        ? "2px solid #111"
                        : selected
                          ? "2px solid #737373"
                          : "1px solid rgba(0,0,0,0.12)",
                    background: "#fff",
                    opacity: dragging ? 0.4 : 1,
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(event) =>
                      openAsset(event, asset, index)
                    }
                    style={{
                      position: "relative",
                      aspectRatio: "4 / 5",
                      overflow: "hidden",
                      cursor: "pointer",
                      background: "#f5f5f5",
                    }}
                  >
                    <img
                      src={asset.thumbSrc}
                      alt={asset.aiAlt || asset.filename}
                      draggable={false}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        opacity: item?.included ? 1 : 0.55,
                        filter: item?.hidden
                          ? "grayscale(1)"
                          : "none",
                        pointerEvents: "none",
                      }}
                    />

                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleSelection(asset, index);
                      }}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "12px",
                        zIndex: 30,
                        width: "34px",
                        height: "34px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "999px",
                        border: "1px solid rgba(0,0,0,0.15)",
                        background: selected ? "#111" : "#fff",
                        color: selected ? "#fff" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <Check size={18} />
                    </button>

                    <div
                      draggable
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData(
                          "text/plain",
                          asset.assetId,
                        );
                        beginDrag(asset);
                      }}
                      onDragEnd={() => setDraggedIds([])}
                      style={{
                        position: "absolute",
                        right: "12px",
                        bottom: "12px",
                        zIndex: 30,
                        width: "42px",
                        height: "42px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "999px",
                        background: "#fff",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
                        cursor: "grab",
                      }}
                    >
                      <GripVertical size={22} />
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "12px",
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      {hero ? (
                        <span className="rounded-full bg-black px-3 py-1 text-xs text-white">
                          Hero
                        </span>
                      ) : null}
                      {item?.included ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-900">
                          Venue
                        </span>
                      ) : null}
                      {item?.display.moments ? (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-900">
                          Moments
                        </span>
                      ) : null}
                      {item?.display.creativeFlash ? (
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs text-violet-900">
                          Creative Flash
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="truncate text-xs text-neutral-500">
                      {asset.filename}
                    </p>
                    <p className="mt-2 truncate text-sm font-medium">
                      {asset.weddingCouple}
                    </p>
                    <div className="mt-3 flex gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Star
                          key={rating}
                          className={`h-4 w-4 ${
                            rating <= (item?.rating || 0)
                              ? "fill-current text-black"
                              : "text-neutral-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside
            style={{
              position: "sticky",
              top: "112px",
              borderRadius: "28px",
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
              padding: "20px",
              maxHeight: "calc(100vh - 128px)",
              overflowY: "auto",
            }}
          >
            {!activeAsset || !activeItem ? (
              <p className="text-sm text-neutral-500">
                Select an image to edit its gallery settings.
              </p>
            ) : (
              <div className="space-y-6">
                <img
                  src={activeAsset.fullSrc}
                  alt={activeAsset.aiAlt || activeAsset.filename}
                  className="max-h-[360px] w-full rounded-2xl object-contain"
                />

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Image
                  </p>
                  <p className="mt-2 break-all text-sm">
                    {activeAsset.filename}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {activeAsset.weddingCouple}
                  </p>
                  {activeItem.source?.type === "legacy-gallery-csv" ? (
                    <p className="mt-2 text-xs text-neutral-400">
                      Imported from gallery.csv · {activeItem.source.category}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3 border-t border-black/10 pt-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Image actions
                  </p>

                  <button
                    type="button"
                    onClick={
                      removeActiveFromVenueGallery
                    }
                    disabled={
                      !activeItem.included ||
                      deleting
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-5 py-3 text-sm text-black disabled:opacity-40"
                  >
                    <Unlink className="h-4 w-4" />
                    Remove from venue gallery
                  </button>

                  {activeAsset.weddingSlug ? (
                    <button
                      type="button"
                      onClick={
                        deleteActivePermanently
                      }
                      disabled={deleting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-300 bg-red-50 px-5 py-3 text-sm text-red-800 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleting
                        ? "Deleting…"
                        : "Delete image permanently"}
                    </button>
                  ) : (
                    <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      Imported CSV images can be removed from this venue gallery, but permanent storage deletion is disabled.
                    </div>
                  )}

                  <p className="text-xs leading-relaxed text-neutral-500">
                    Permanent deletion removes the wedding record, venue references, collections, moments and both stored image files.
                  </p>
                </div>

                <div className="border-t border-black/10 pt-5">
                  <p className="mb-3 text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Gallery destinations
                  </p>
                </div>

                <Toggle
                  label="Venue gallery"
                  checked={activeItem.included}
                  onChange={(checked) =>
                    patchItem(activeItem.assetId, {
                      included: checked,
                      display: {
                        ...activeItem.display,
                        venue: checked,
                      },
                    })
                  }
                />

                <Toggle
                  label="Creative Flash gallery"
                  checked={activeItem.display.creativeFlash}
                  onChange={(checked) =>
                    patchItem(activeItem.assetId, {
                      display: {
                        ...activeItem.display,
                        creativeFlash: checked,
                      },
                    })
                  }
                />

                {activeAsset.weddingSlug ? (
                  <>
                    <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                        Wedding blog destination
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {activeAsset.weddingCouple}
                      </p>
                      <p className="mt-1 break-all text-xs text-neutral-500">
                        /blog/{activeAsset.weddingSlug}
                      </p>
                    </div>

                    <Toggle
                      label="Wedding story"
                      checked={activeItem.display.blog}
                      onChange={(checked) =>
                        patchItem(activeItem.assetId, {
                          display: {
                            ...activeItem.display,
                            blog: checked,
                          },
                        })
                      }
                    />
                  </>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    This image was imported from the existing venue CSV and is
                    not linked to a wedding blog. Venue and moment gallery
                    controls work normally.
                  </div>
                )}

                <Toggle
                  label="Homepage"
                  checked={activeItem.display.homepage}
                  onChange={(checked) =>
                    patchItem(activeItem.assetId, {
                      display: {
                        ...activeItem.display,
                        homepage: checked,
                      },
                    })
                  }
                />

                <Toggle
                  label="Portfolio"
                  checked={activeItem.display.portfolio}
                  onChange={(checked) =>
                    patchItem(activeItem.assetId, {
                      display: {
                        ...activeItem.display,
                        portfolio: checked,
                      },
                    })
                  }
                />

                <div>
                  <p className="mb-3 text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Moments
                  </p>

                  <div className="space-y-2">
                    {moments
                      .filter(
                        (moment) =>
                          moment.availableForAssignment,
                      )
                      .map((moment) => {
                        const checked =
                          activeItem.moments.includes(
                            moment.slug,
                          );

                        return (
                          <label
                            key={moment.id}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 p-3"
                          >
                            <span className="text-sm">
                              {moment.name}
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const nextMoments =
                                  event.target.checked
                                    ? [
                                        ...new Set([
                                          ...activeItem.moments,
                                          moment.slug,
                                        ]),
                                      ]
                                    : activeItem.moments.filter(
                                        (value) =>
                                          value !== moment.slug,
                                      );

                                patchItem(
                                  activeItem.assetId,
                                  {
                                    moments: nextMoments,
                                    display: {
                                      ...activeItem.display,
                                      moments: nextMoments.length > 0,
                                    },
                                  },
                                );
                              }}
                            />
                          </label>
                        );
                      })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHero(activeItem.assetId)}
                  className="w-full rounded-full bg-black px-5 py-3 text-sm text-white"
                >
                  Set as venue hero
                </button>

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                    AI caption
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                    {activeAsset.aiCaption || "No caption yet."}
                  </p>
                </div>

                {activeItem.hidden ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                    <EyeOff className="h-4 w-4" />
                    Hidden in the wedding image record
                  </div>
                ) : null}
              </div>
            )}
          </aside>
        </section>
      )}
    </div>
  );
}

function normaliseOrder(items: VenueGalleryItem[]) {
  return items.map((item, index) => ({
    ...item,
    order: index + 1,
  }));
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 p-4">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
