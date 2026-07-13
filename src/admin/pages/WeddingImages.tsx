import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Save,
  X,
} from "lucide-react";
import { WeddingService } from "../services/WeddingService";
import type { WeddingRecord } from "../types/wedding";
import type { ManagedWeddingImage } from "../types/imageManager";
import { ImageManagerService } from "../services/ImageManagerService";
import { ImageInspectorPanel } from "../components/ImageInspectorPanel";
import { ImageGrid } from "../components/imageManager/ImageGrid";
import {
  ImageToolbar,
  type ImageFilterMode,
} from "../components/imageManager/ImageToolbar";
import { normaliseOrder } from "../imageWorkflow/imageWorkflowUtils";

export function WeddingImages() {
  const { slug } = useParams();

  const [weddings, setWeddings] = useState<WeddingRecord[]>([]);
  const [images, setImages] = useState<ManagedWeddingImage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ImageFilterMode>("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [draggedIds, setDraggedIds] = useState<string[]>([]);
  const selectionAnchorRef = useRef<number | null>(null);

  useEffect(() => {
    WeddingService.load().then(async (service) => {
      const loadedWeddings = service.getWeddings();
      setWeddings(loadedWeddings);

      const wedding = loadedWeddings.find(
        (item) => item.slug === slug,
      );

      if (!wedding) return;

      const managedImages = await ImageManagerService.load(
        wedding.slug,
        wedding.images,
      );

      setImages(managedImages);
      setActiveId(managedImages[0]?.id || null);
      setSelectedIds(new Set());
      setDirty(false);
    });
  }, [slug]);

  const wedding = useMemo(
    () => weddings.find((item) => item.slug === slug),
    [weddings, slug],
  );

  const activeImage = useMemo(
    () => images.find((image) => image.id === activeId) || null,
    [images, activeId],
  );

  const collectionOptions = useMemo(
    () =>
      Array.from(
        new Set(images.flatMap((image) => image.collections)),
      ).sort(),
    [images],
  );

  const filteredImages = useMemo(() => {
    const q = query.trim().toLowerCase();

    return images.filter((image) => {
      const matchesSearch =
        !q ||
        image.filename.toLowerCase().includes(q) ||
        image.aiAlt.toLowerCase().includes(q) ||
        image.aiCaption.toLowerCase().includes(q) ||
        image.aiTags.some((tag) => tag.toLowerCase().includes(q));

      const matchesFilter =
        filter === "all" ||
        (filter === "cover" && image.isCover) ||
        (filter === "hidden" && image.hidden) ||
        (filter === "rated" && image.rating > 0) ||
        (filter === "missing-alt" && !image.aiAlt.trim()) ||
        (filter === "missing-caption" &&
          !image.aiCaption.trim()) ||
        (filter === "missing-tags" &&
          image.aiTags.length === 0);

      const matchesCollection =
        collectionFilter === "all" ||
        image.collections.includes(collectionFilter);

      return (
        matchesSearch &&
        matchesFilter &&
        matchesCollection
      );
    });
  }, [images, query, filter, collectionFilter]);

  function commit(
    updater: (
      current: ManagedWeddingImage[],
    ) => ManagedWeddingImage[],
  ) {
    setImages((current) =>
      normaliseOrder(updater(current)),
    );
    setDirty(true);
    setSaveMessage("");
    setSaveError("");
  }

  function updateImage(updatedImage: ManagedWeddingImage) {
    commit((current) =>
      current.map((image) => {
        if (
          updatedImage.isCover &&
          image.id !== updatedImage.id
        ) {
          return { ...image, isCover: false };
        }

        return image.id === updatedImage.id
          ? updatedImage
          : image;
      }),
    );
  }

  function openImage(
    event: React.MouseEvent,
    image: ManagedWeddingImage,
    index: number,
  ) {
    setActiveId(image.id);

    if (event.shiftKey && selectionAnchorRef.current !== null) {
      const start = Math.min(selectionAnchorRef.current, index);
      const end = Math.max(selectionAnchorRef.current, index);

      setSelectedIds(
        new Set(
          filteredImages
            .slice(start, end + 1)
            .map((item) => item.id),
        ),
      );
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(image.id)) next.delete(image.id);
        else next.add(image.id);
        return next;
      });
      selectionAnchorRef.current = index;
      return;
    }

    selectionAnchorRef.current = index;
  }

  function toggleSelected(
    image: ManagedWeddingImage,
    index: number,
  ) {
    setActiveId(image.id);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(image.id)) next.delete(image.id);
      else next.add(image.id);
      return next;
    });
    selectionAnchorRef.current = index;
  }

  function rateImage(
    image: ManagedWeddingImage,
    rating: number,
  ) {
    setActiveId(image.id);

    commit((current) =>
      current.map((item) =>
        item.id === image.id
          ? {
              ...item,
              rating:
                item.rating === rating ? 0 : rating,
            }
          : item,
      ),
    );
  }

  function beginDrag(image: ManagedWeddingImage) {
    const ids =
      selectedIds.has(image.id) && selectedIds.size > 1
        ? images
            .filter((item) => selectedIds.has(item.id))
            .map((item) => item.id)
        : [image.id];

    if (!selectedIds.has(image.id)) {
      setSelectedIds(new Set([image.id]));
    }

    setActiveId(image.id);
    setDraggedIds(ids);
  }

  function dropOn(target: ManagedWeddingImage) {
    if (!draggedIds.length || draggedIds.includes(target.id)) {
      setDraggedIds([]);
      return;
    }

    commit((current) => {
      const movingSet = new Set(draggedIds);
      const moving = current.filter((image) =>
        movingSet.has(image.id),
      );
      const remaining = current.filter(
        (image) => !movingSet.has(image.id),
      );

      const targetIndex = remaining.findIndex(
        (image) => image.id === target.id,
      );

      if (targetIndex < 0) {
        return [...remaining, ...moving];
      }

      const next = [...remaining];
      next.splice(targetIndex, 0, ...moving);
      return next;
    });

    setDraggedIds([]);
  }

  async function saveImages() {
    if (!wedding) return;

    setSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const result = await ImageManagerService.save(
        wedding.slug,
        images,
      );
      setSaveMessage(
        `Saved ${result.savedImages} image records.`,
      );
      setDirty(false);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save images.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!weddings.length) {
    return (
      <div className="text-neutral-500">
        Loading Image Manager…
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

  return (
    <div className="space-y-7">
      <Link
        to={`/admin/weddings/${wedding.slug}`}
        className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to wedding
      </Link>

      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">
              Image Manager
            </p>
            <h1 className="mb-4 font-serif text-4xl leading-tight md:text-6xl">
              {wedding.couple}
            </h1>
            <p className="text-white/65">
              {wedding.venue} · {images.length} images ·{" "}
              {filteredImages.length} shown
            </p>
          </div>

          <button
            type="button"
            onClick={saveImages}
            disabled={saving || !dirty}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-black disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            {saving
              ? "Saving..."
              : dirty
                ? "Save all changes"
                : "Saved"}
          </button>
        </div>
      </section>

      <ImageToolbar
        query={query}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={setFilter}
        collectionFilter={collectionFilter}
        onCollectionChange={setCollectionFilter}
        collectionOptions={collectionOptions}
      />

      {selectedIds.size > 0 ? (
        <section className="flex flex-wrap items-center gap-3 rounded-[24px] border border-black/10 bg-white/90 p-4">
          <strong>{selectedIds.size} selected</strong>
          <span className="text-sm text-neutral-500">
            Drag the white grip on any selected image to move the group.
          </span>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm"
          >
            <X className="h-4 w-4" />
            Clear selection
          </button>
        </section>
      ) : null}

      {saveMessage ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {saveMessage}
          </div>
        </section>
      ) : null}

      {saveError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {saveError}
          </div>
        </section>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1fr) 420px",
          gap: "24px",
          alignItems: "start",
        }}
      >
        <ImageGrid
          images={filteredImages}
          activeId={activeId}
          selectedIds={selectedIds}
          draggedIds={draggedIds}
          onOpen={openImage}
          onToggleSelected={toggleSelected}
          onRate={rateImage}
          onDragStart={beginDrag}
          onDragEnd={() => setDraggedIds([])}
          onDrop={dropOn}
        />

        <ImageInspectorPanel
          image={activeImage}
          onChange={updateImage}
          onSave={saveImages}
          saving={saving}
          dirty={dirty}
        />
      </section>
    </div>
  );
}
