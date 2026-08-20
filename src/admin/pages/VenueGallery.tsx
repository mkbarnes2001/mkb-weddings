import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  } from "react";
import { Link,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CloudUpload,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Save,
  Search,
  Trash2,
  Unlink,
  X,
  } from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { CustomCollectionAssignmentOption } from "../types/customCollection";
import type { LocationArea,
  LocationTypeDefinition } from "../services/AdminApiService";
import type { MomentRecord } from "../types/moment";
import { WeddingService } from "../services/WeddingService";
import { ImageManagerService } from "../services/ImageManagerService";
import type { ManagedWeddingImage } from "../types/imageManager";
import type {
  VenueGalleryItem,
  VenueSummary,
  } from "../types/venue";
import { AdminPageHeader,
  AdminHeaderRouterLink,
} from "../components/ui/AdminUI";

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
  const [customCollections, setCustomCollections] = useState<CustomCollectionAssignmentOption[]>([]);
  const [locationTypes, setLocationTypes] = useState<LocationTypeDefinition[]>([]);
  const [locations, setLocations] = useState<LocationArea[]>([]);
  const [customMemberships, setCustomMemberships] = useState<Record<string, string[]>>({});
  const [customMembershipDirty, setCustomMembershipDirty] = useState<Set<string>>(new Set());
  const anchorRef = useRef<number | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      try {
        const [loadedVenue, momentDocument, collectionData, locationData] = await Promise.all([
          AdminApiService.getVenue(slug),
          AdminApiService.getMoments(),
          AdminApiService.getCustomCollectionMemberships(),
          AdminApiService.getLocations(),
        ]);
        setVenue(loadedVenue);
        setMoments(
          momentDocument.moments
            .filter((moment) => moment.status === "active")
            .sort((a, b) => a.sortOrder - b.sortOrder),
        );
        setCustomCollections(collectionData.collections);
        setCustomMemberships(collectionData.memberships);
        setLocationTypes(locationData.types || []);
        setLocations(locationData.locations || []);

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
              creativeFlash: asset.collections.includes("creative-flash"),
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

  const inheritedLocations = useMemo(() => {
    if (!venue) return [] as LocationArea[];
    const normalise = (value: unknown) => String(value || "").trim().toLowerCase();
    return locations
      .filter((location) => {
        if (location.status !== "active") return false;
        if (location.venueSlugs.includes(venue.slug)) return true;
        const target = normalise(location.name);
        if (!target) return false;
        if (location.areaType === "county") {
          const county = normalise(venue.county);
          return county === target || `county ${county}` === target || county === target.replace(/^county\s+/, "");
        }
        if (location.areaType === "country") return normalise(venue.country) === target;
        if (location.areaType === "city") return normalise(venue.town) === target;
        return false;
      })
      .sort((a, b) => {
        const typeOrder = new Map<string, number>(locationTypes.map((type) => [type.key, type.sortOrder] as const));
        return (typeOrder.get(a.areaType) || 999) - (typeOrder.get(b.areaType) || 999) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
      });
  }, [venue, locations, locationTypes]);

  const inheritedLocationGroups = useMemo(() => {
    const groups = new Map<string, LocationArea[]>();
    inheritedLocations.forEach((location) => {
      groups.set(location.areaType, [...(groups.get(location.areaType) || []), location]);
    });
    return Array.from(groups.entries());
  }, [inheritedLocations]);

  function locationTypeLabel(key: string) {
    return locationTypes.find((type) => type.key === key)?.label || key.replace(/(^|[-_ ])\w/g, (match) => match.toUpperCase());
  }

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
    event: MouseEvent,
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

  function applyMomentToSelection(momentSlug: string) {
    if (!selectedIds.size) return;

    commit((current) =>
      current.map((item) => {
        if (!selectedIds.has(item.assetId)) return item;
        const nextMoments = [...new Set([...(item.moments || []), momentSlug])];
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

  function clearSelectedMoments() {
    if (!selectedIds.size) return;
    commit((current) =>
      current.map((item) =>
        selectedIds.has(item.assetId)
          ? {
              ...item,
              moments: [],
              display: { ...item.display, moments: false },
            }
          : item,
      ),
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
    setDirty(true);
    setMessage("");
    setError("");
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

      if (customMembershipDirty.size) {
        await AdminApiService.saveCustomCollectionMemberships(
          [...customMembershipDirty].map((assetKey) => ({
            assetKey,
            collectionIds: customMemberships[assetKey] || [],
          })),
        );
      }

      setVenue(result.venue);
      setCustomMembershipDirty(new Set());
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
      <AdminPageHeader
        title="Venue gallery"
        description="Manage venue gallery membership, order and publishing."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span>{venue.name}</span>
            <span className="text-neutral-400">·</span>
            <span>{assets.length} available</span>
            <span className="text-neutral-400">·</span>
            <span>
              {items.filter((item) => item.included).length}
              {" "}included
            </span>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminHeaderRouterLink
              to={`/admin/venues/${venue.slug}/upload`}
              className="admin-button admin-button--secondary"
            >
              Upload images
            </AdminHeaderRouterLink>

            <AdminHeaderRouterLink
              to="/admin/moments"
              className="admin-button admin-button--secondary"
            >
              Manage moments
            </AdminHeaderRouterLink>

            <button
              type="button"
              onClick={publishVenue}
              disabled={publishing || saving}
              className="admin-button admin-button--secondary"
            >
              <CloudUpload className="admin-button__icon" />
              {publishing
                ? "Publishing…"
                : "Publish venue"}
            </button>

            <button
              type="button"
              onClick={saveGallery}
              disabled={saving || !dirty}
              className="admin-button admin-button--primary"
            >
              <Save className="admin-button__icon" />
              {saving
                ? "Saving…"
                : dirty
                  ? "Save gallery"
                  : "Saved"}
            </button>
          </div>
        }
      />

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
        <section className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 bg-white/90 p-3 shadow-sm">
          <strong className="mr-1 text-[11px]">{selectedIds.size} selected</strong>

          <button
            type="button"
            onClick={() => {
              const selectedItems = items.filter((item) => selectedIds.has(item.assetId));
              const allIncluded = selectedItems.length > 0 && selectedItems.every((item) => item.included);
              setSelectedIncluded(!allIncluded);
            }}
            className="inline-flex h-8 items-center rounded-lg bg-black px-3 text-[10px] font-semibold text-white"
          >
            {items.filter((item) => selectedIds.has(item.assetId)).every((item) => item.included)
              ? "Hide from venue gallery"
              : "Show on venue gallery"}
          </button>

          <select
            value=""
            onChange={(event) => {
              const value = event.target.value;
              if (!value) return;
              if (value === "__clear__") clearSelectedMoments();
              else applyMomentToSelection(value);
              event.currentTarget.value = "";
            }}
            className="h-8 min-w-[190px] rounded-lg border border-black/15 bg-white px-3 text-[10px]"
            aria-label="Assign selected images to a moment"
          >
            <option value="">Assign to moment…</option>
            {moments
              .filter((moment) => moment.availableForAssignment)
              .map((moment) => (
                <option key={moment.id} value={moment.slug}>{moment.name}</option>
              ))}
            <option value="__clear__">Clear moment assignments</option>
          </select>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 text-[10px] font-medium"
          >
            <X className="h-3.5 w-3.5" />
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
        <section className="admin-master-detail admin-master-detail--320">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "12px",
              alignItems: "start",
            }}
          >
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
                    borderRadius: "16px",
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
                        right: "8px",
                        bottom: "8px",
                        zIndex: 30,
                        width: "30px",
                        height: "30px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "999px",
                        background: "#fff",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
                        cursor: "grab",
                      }}
                    >
                      <GripVertical size={17} />
                    </div>

                  </div>

                  {(hero || item?.included || item?.display.moments) ? (
                    <div className="flex min-h-7 items-center gap-1 border-t border-black/5 px-2 py-1" aria-label="Image gallery assignments">
                      {hero ? (
                        <span
                          className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-black px-1 text-[8px] font-semibold leading-none text-white"
                          title="Hero image"
                          aria-label="Hero image"
                        >
                          H
                        </span>
                      ) : null}
                      {item?.included ? (
                        <span
                          className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-black/15 bg-white px-1 text-[8px] font-semibold leading-none text-black"
                          title="Shown in venue gallery"
                          aria-label="Shown in venue gallery"
                        >
                          V
                        </span>
                      ) : null}
                      {item?.display.moments ? (
                        <span
                          className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-black/15 bg-neutral-100 px-1 text-[8px] font-semibold leading-none text-black"
                          title="Assigned to Moments"
                          aria-label="Assigned to Moments"
                        >
                          M
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="min-h-7 border-t border-black/5" aria-hidden="true" />
                  )}
                </article>
              );
            })}
          </div>

          <aside
            className="admin-summary-panel venue-gallery-summary text-[9px] leading-[1.35]"
            style={{
              borderRadius: "14px",
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
              padding: "11px",
            }}
          >
            {!activeAsset || !activeItem ? (
              <p className="text-sm text-neutral-500">
                Select an image to edit its gallery settings.
              </p>
            ) : (
              <div className="space-y-2">
                <img
                  src={activeAsset.fullSrc}
                  alt={activeAsset.aiAlt || activeAsset.filename}
                  className="max-h-[185px] w-full rounded-lg object-contain"
                />

                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Image
                  </p>
                  <p className="mt-1 break-all text-[9px] leading-[1.35] text-neutral-700">
                    {activeAsset.filename}
                  </p>
                  {activeAsset.weddingCouple && activeAsset.weddingCouple !== "Imported venue gallery" ? (
                    <p className="mt-1 text-[9px] text-neutral-500">{activeAsset.weddingCouple}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5 border-t border-black/10 pt-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
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
                    className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-3 text-[10px] font-medium text-black disabled:opacity-40"
                  >
                    <Unlink className="h-4 w-4" />
                    Remove from venue gallery
                  </button>

                  {activeAsset.weddingSlug ? (
                    <button
                      type="button"
                      onClick={deleteActivePermanently}
                      disabled={deleting}
                      className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-[10px] font-medium text-red-800 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deleting ? "Deleting…" : "Delete image permanently"}
                    </button>
                  ) : null}
                </div>

                <div className="border-t border-black/10 pt-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Gallery destinations
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Venue</p>
                  <Toggle
                    label={venue.name}
                    checked={activeItem.included}
                    onChange={(checked) =>
                      patchItem(activeItem.assetId, {
                        included: checked,
                        display: { ...activeItem.display, venue: checked },
                      })
                    }
                  />
                </div>

                <div>
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Moments</p>
                  <div className="space-y-1.5">
                    {moments.filter((moment) => moment.availableForAssignment).map((moment) => {
                      const checked = activeItem.moments.includes(moment.slug);
                      return (
                        <label key={moment.id} className="flex items-center justify-between gap-2 rounded-md border border-black/10 px-2.5 py-1.5">
                          <span className="text-[9px] leading-[1.35]">{moment.name}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const nextMoments = event.target.checked
                                ? [...new Set([...activeItem.moments, moment.slug])]
                                : activeItem.moments.filter((value) => value !== moment.slug);
                              patchItem(activeItem.assetId, {
                                moments: nextMoments,
                                display: { ...activeItem.display, moments: nextMoments.length > 0 },
                              });
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Locations</p>
                  {inheritedLocationGroups.length ? (
                    <div className="space-y-4">
                      {inheritedLocationGroups.map(([type, locationItems]) => (
                        <div key={type}>
                          <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-neutral-400">{locationTypeLabel(type)}</p>
                          <div className="space-y-2">
                            {locationItems.map((location) => (
                              <div key={location.id} className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-neutral-50 px-3 py-2">
                                <span className="text-[10px]">{location.name}</span>
                                <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700"><Check className="h-3.5 w-3.5" />Inherited</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <p className="text-[10px] leading-4 text-neutral-500">
                        Location membership is inherited from {venue.name}. Change it in Admin → Venues or Admin → Locations.
                      </p>
                    </div>
                  ) : (
                    <p className="rounded-xl bg-neutral-50 p-3 text-[10px] leading-4 text-neutral-500">
                      No active Location assignments. Assign locations in Admin → Venues.
                    </p>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Custom galleries</p>
                  <div className="space-y-2">
                    <Toggle
                      label="Creative Flash"
                      checked={Boolean(activeItem.display.creativeFlash)}
                      onChange={(checked) =>
                        patchItem(activeItem.assetId, {
                          display: { ...activeItem.display, creativeFlash: checked },
                        })
                      }
                    />
                    {customCollections.map((collection) => (
                      <div key={collection.id}>
                        <Toggle
                          label={`${collection.name}${collection.status === "draft" ? " (Draft)" : ""}`}
                          checked={(customMemberships[activeItem.assetId] || []).includes(collection.id)}
                          onChange={(checked) => setCustomCollection(activeItem.assetId, collection.id, checked)}
                        />
                      </div>
                    ))}
                  </div>
                  {!customCollections.length ? (
                    <p className="mt-2 text-[10px] leading-4 text-neutral-500">Additional galleries created in Gallery Management appear here automatically.</p>
                  ) : null}
                </div>

                <details className="border-t border-black/10 pt-2.5">
                  <summary className="cursor-pointer text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Other publishing destinations</summary>
                  <div className="mt-4 space-y-2">
                    {activeAsset.weddingSlug ? (
                      <Toggle
                        label={`Wedding story — ${activeAsset.weddingCouple}`}
                        checked={activeItem.display.blog}
                        onChange={(checked) => patchItem(activeItem.assetId, { display: { ...activeItem.display, blog: checked } })}
                      />
                    ) : (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-4 text-amber-900">
                        This image is not linked to a wedding story.
                      </div>
                    )}
                    <Toggle
                      label="Homepage"
                      checked={activeItem.display.homepage}
                      onChange={(checked) => patchItem(activeItem.assetId, { display: { ...activeItem.display, homepage: checked } })}
                    />
                    <Toggle
                      label="Portfolio"
                      checked={activeItem.display.portfolio}
                      onChange={(checked) => patchItem(activeItem.assetId, { display: { ...activeItem.display, portfolio: checked } })}
                    />
                  </div>
                </details>

                <button
                  type="button"
                  onClick={() => setHero(activeItem.assetId)}
                  className="h-7 w-full rounded-md bg-black px-2.5 text-[9px] font-medium text-white"
                >
                  Set as venue hero
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await AdminApiService.setGalleryMasterHero("venue", activeItem.assetId);
                      setMessage("Gallery by Venue master hero updated.");
                    } catch (heroError) {
                      setError(heroError instanceof Error ? heroError.message : "Unable to set Gallery by Venue master hero.");
                    }
                  }}
                  className="h-7 w-full rounded-md border border-black/15 bg-white px-2.5 text-[9px] font-medium text-black"
                >
                  Set as Gallery by Venue master hero
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await AdminApiService.setGalleryMasterHero("landing", activeItem.assetId);
                      setMessage("Main Gallery landing-page hero updated.");
                    } catch (heroError) {
                      setError(heroError instanceof Error ? heroError.message : "Unable to set main Gallery landing-page hero.");
                    }
                  }}
                  className="h-7 w-full rounded-md bg-black px-2.5 text-[9px] font-medium text-white"
                >
                  Set as main Gallery landing hero
                </button>

                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    AI caption
                  </p>
                  <p className="mt-1.5 text-[10px] leading-4 text-neutral-700">
                    {activeAsset.aiCaption || "No caption yet."}
                  </p>
                </div>

                {activeItem.hidden ? (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-[10px] text-amber-900">
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
    <label className="flex items-center justify-between gap-2 rounded-md border border-black/10 px-2.5 py-1.5">
      <span className="text-[9px] leading-[1.35]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
