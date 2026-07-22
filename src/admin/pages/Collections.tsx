import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  GripVertical,
  Images,
  Layers3,
  MapPin,
  Plus,
  Save,
  Search,
  Settings2,
  Sparkles,
  Tags,
  Zap,
} from "lucide-react";
import { weddingStories } from "../../data/weddingStories";
import { CollectionService } from "../services/CollectionService";
import { AdminApiService } from "../services/AdminApiService";
import type { ImageCollection } from "../types/collection";
import type { CustomCollection } from "../types/customCollection";
import type { MomentRepositoryDocument } from "../types/moment";
import type { VenueSummary } from "../types/venue";

type PublicImage = {
  assetKey?: string;
  imageId?: string;
  thumbSrc?: string;
  fullSrc?: string;
  alt?: string;
};

type ResolvedMasterHeroes = {
  venue: PublicImage | null;
  moments: PublicImage | null;
  landing: PublicImage | null;
};

type LandingCard = {
  key: string;
  title: string;
  description: string;
  image: string;
  kind: "system" | "custom";
  custom?: CustomCollection;
};

const CORE_KEYS = ["county", "venues", "moments", "creative-flash", "stories"];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function normaliseLandingOrder(saved: string[], collections: CustomCollection[]) {
  const customKeys = [...collections]
    .filter((collection) => collection.status !== "archived")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((collection) => `custom:${collection.id}`);
  const valid = new Set([...CORE_KEYS, ...customKeys]);
  const existing = unique(saved).filter((key) => valid.has(key));

  // Existing installations historically placed custom collections before Stories.
  // Keep that behaviour when the stored order predates custom card keys.
  const hasCustomOrder = existing.some((key) => key.startsWith("custom:"));
  if (!hasCustomOrder) {
    const withoutStories = existing.filter((key) => key !== "stories");
    return unique([
      ...withoutStories,
      ...customKeys,
      "stories",
      ...CORE_KEYS,
    ]).filter((key) => valid.has(key));
  }

  const missingCustom = customKeys.filter((key) => !existing.includes(key));
  const storiesIndex = existing.indexOf("stories");
  const withMissing = [...existing];
  if (storiesIndex >= 0) withMissing.splice(storiesIndex, 0, ...missingCustom);
  else withMissing.push(...missingCustom);
  return unique([...withMissing, ...CORE_KEYS]).filter((key) => valid.has(key));
}

function statusClasses(status: ImageCollection["status"]) {
  if (status === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "planned") return "bg-neutral-100 text-neutral-600 border-neutral-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function customStatusClasses(status: CustomCollection["status"]) {
  if (status === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "archived") return "bg-neutral-100 text-neutral-500 border-neutral-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function imageSource(image: PublicImage | null | undefined) {
  return image?.thumbSrc || image?.fullSrc || "";
}

export function Collections() {
  const [legacyCollections, setLegacyCollections] = useState<ImageCollection[]>([]);
  const [customCollections, setCustomCollections] = useState<CustomCollection[]>([]);
  const [moments, setMoments] = useState<MomentRepositoryDocument | null>(null);
  const [venues, setVenues] = useState<VenueSummary[]>([]);
  const [creativeImages, setCreativeImages] = useState<any[]>([]);
  const [creativeSettings, setCreativeSettings] = useState({
    heroImageId: "",
    imageOrderIds: [] as string[],
    hiddenImageIds: [] as string[],
  });
  const [masterHeroes, setMasterHeroes] = useState<ResolvedMasterHeroes>({
    venue: null,
    moments: null,
    landing: null,
  });
  const [landingOrder, setLandingOrder] = useState<string[]>(CORE_KEYS);
  const [hiddenCoreCards, setHiddenCoreCards] = useState<string[]>([]);
  const [landingDirty, setLandingDirty] = useState(false);
  const [draggedLandingKey, setDraggedLandingKey] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingLanding, setSavingLanding] = useState(false);
  const [savingCollectionId, setSavingCollectionId] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");

    const [customResult, momentsResult, venuesResult, creativeResult, landingResult, heroResult] =
      await Promise.allSettled([
        AdminApiService.listCustomCollections(),
        AdminApiService.getMoments(),
        AdminApiService.listVenues(),
        AdminApiService.getCreativeFlashGallery(),
        AdminApiService.getGalleryLandingSettings(),
        fetch("/api/public/gallery-master-heroes?refresh=1", { cache: "no-store" }).then(
          async (response) => {
            if (!response.ok) throw new Error("Unable to load gallery hero previews.");
            return response.json();
          },
        ),
      ]);

    const loadedCustom = customResult.status === "fulfilled" ? customResult.value : [];
    setCustomCollections(loadedCustom);
    if (momentsResult.status === "fulfilled") setMoments(momentsResult.value);
    if (venuesResult.status === "fulfilled") setVenues(venuesResult.value);
    if (creativeResult.status === "fulfilled") {
      setCreativeImages(creativeResult.value.images || []);
      setCreativeSettings(creativeResult.value.settings);
    }
    if (heroResult.status === "fulfilled") {
      setMasterHeroes({
        venue: heroResult.value?.venue || null,
        moments: heroResult.value?.moments || null,
        landing: heroResult.value?.landing || null,
      });
    }

    const landingSettings =
      landingResult.status === "fulfilled"
        ? landingResult.value
        : { cardOrder: CORE_KEYS, hiddenCards: [] };
    setLandingOrder(normaliseLandingOrder(landingSettings.cardOrder, loadedCustom));
    setHiddenCoreCards(landingSettings.hiddenCards.filter((key) => CORE_KEYS.includes(key)));
    setLandingDirty(false);

    const failed = [customResult, momentsResult, venuesResult, creativeResult, landingResult].filter(
      (result) => result.status === "rejected",
    );
    if (failed.length) {
      setError("Some gallery management data could not be loaded. Refresh the page before making changes.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    CollectionService.load()
      .then((service) => setLegacyCollections(service.getAllCollections()))
      .catch(() => {});
  }, []);

  const creativeHero = useMemo(() => {
    const heroId = creativeSettings.heroImageId;
    const hidden = new Set(creativeSettings.hiddenImageIds || []);
    return (
      creativeImages.find(
        (image) => image.assetKey === heroId || image.imageId === heroId,
      ) || creativeImages.find((image) => !hidden.has(image.assetKey)) || null
    );
  }, [creativeImages, creativeSettings]);

  const visibleCreativeCount = useMemo(() => {
    const hidden = new Set(creativeSettings.hiddenImageIds || []);
    return creativeImages.filter((image) => !hidden.has(image.assetKey)).length;
  }, [creativeImages, creativeSettings.hiddenImageIds]);

  const activeMoments = useMemo(
    () => (moments?.moments || []).filter((moment) => moment.status === "active"),
    [moments],
  );
  const publicMoments = activeMoments.filter((moment) => moment.showOnMomentsLanding);
  const activeVenues = venues.filter((venue) => venue.status !== "archived");
  const publishedVenues = venues.filter((venue) => venue.status === "published");

  const landingCards = useMemo<LandingCard[]>(() => {
    const customCards = customCollections
      .filter((collection) => collection.status !== "archived")
      .map((collection) => ({
        key: `custom:${collection.id}`,
        title: collection.name,
        description: collection.description || "Curated gallery",
        image:
          collection.heroImage?.thumbSrc || collection.heroImage?.fullSrc || "",
        kind: "custom" as const,
        custom: collection,
      }));

    const cards: LandingCard[] = [
      {
        key: "county",
        title: "Explore by County",
        description: "Browse wedding galleries by county",
        image:
          "https://images.mkbweddings.co.uk/thumb/Slieve%20donard%20hotel/couple%20portraits/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_500.webp",
        kind: "system",
      },
      {
        key: "venues",
        title: "Venues",
        description: "Browse weddings by location",
        image: imageSource(masterHeroes.venue),
        kind: "system",
      },
      {
        key: "moments",
        title: "Wedding Moments",
        description: "Explore wedding day highlights",
        image: imageSource(masterHeroes.moments),
        kind: "system",
      },
      {
        key: "creative-flash",
        title: "Creative Flash",
        description: "Bold, dramatic flash photography",
        image: creativeHero?.thumbSrc || creativeHero?.fullSrc || "",
        kind: "system",
      },
      ...customCards,
      {
        key: "stories",
        title: "Stories & Reviews",
        description: "Real wedding love stories",
        image:
          "https://images.mkbweddings.co.uk/thumb/Orange%20tree%20house/getting%20ready/mkb-weddings-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-39_500.webp",
        kind: "system",
      },
    ];

    const map = new Map(cards.map((card) => [card.key, card]));
    const order = normaliseLandingOrder(landingOrder, customCollections);
    return order.map((key) => map.get(key)).filter((card): card is LandingCard => Boolean(card));
  }, [customCollections, landingOrder, masterHeroes, creativeHero]);

  function isLandingCardVisible(card: LandingCard) {
    if (card.kind === "custom") {
      return Boolean(card.custom?.showOnLanding && card.custom.status === "active");
    }
    return !hiddenCoreCards.includes(card.key);
  }

  function dropLandingCard(targetKey: string) {
    if (!draggedLandingKey || draggedLandingKey === targetKey) {
      setDraggedLandingKey(null);
      return;
    }
    setLandingOrder((current) => {
      const next = normaliseLandingOrder(current, customCollections);
      const from = next.indexOf(draggedLandingKey);
      const to = next.indexOf(targetKey);
      if (from < 0 || to < 0) return current;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setLandingDirty(true);
    setMessage("");
    setDraggedLandingKey(null);
  }

  function toggleCoreLandingCard(key: string, visible: boolean) {
    setHiddenCoreCards((current) =>
      visible ? current.filter((item) => item !== key) : unique([...current, key]),
    );
    setLandingDirty(true);
    setMessage("");
  }

  async function toggleCustomLanding(collection: CustomCollection, checked: boolean) {
    setSavingCollectionId(collection.id);
    setMessage("");
    setError("");
    try {
      const saved = await AdminApiService.updateCustomCollection(collection.slug, {
        ...collection,
        showOnLanding: checked,
      });
      setCustomCollections((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setMessage(
        checked && saved.status !== "active"
          ? `${saved.name} is marked for the Gallery landing and will appear when its status is Active.`
          : `${saved.name} landing-card setting saved.`,
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update gallery.");
    } finally {
      setSavingCollectionId("");
    }
  }

  async function saveLandingLayout() {
    setSavingLanding(true);
    setMessage("");
    setError("");
    try {
      const saved = await AdminApiService.saveGalleryLandingSettings({
        cardOrder: normaliseLandingOrder(landingOrder, customCollections),
        hiddenCards: hiddenCoreCards,
      });
      setLandingOrder(normaliseLandingOrder(saved.cardOrder, customCollections));
      setHiddenCoreCards(saved.hiddenCards);
      setLandingDirty(false);
      setMessage("Gallery landing layout saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save Gallery landing layout.",
      );
    } finally {
      setSavingLanding(false);
    }
  }

  async function createCollection() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setMessage("");
    setError("");
    try {
      const collection = await AdminApiService.createCustomCollection({
        name,
        slug: slugify(name),
        description: "",
        status: "draft",
        showOnLanding: false,
      });
      setCustomCollections((current) => [...current, collection]);
      setLandingOrder((current) => {
        const withoutStories = current.filter((key) => key !== "stories");
        return unique([...withoutStories, `custom:${collection.id}`, "stories"]);
      });
      setLandingDirty(true);
      setNewName("");
      setMessage(`${collection.name} created as a draft gallery.`);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Unable to create gallery.",
      );
    } finally {
      setCreating(false);
    }
  }

  const storyBySlug = useMemo(
    () => new Map(weddingStories.map((story) => [story.slug, story])),
    [],
  );

  const filteredLegacyCollections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return legacyCollections;
    return legacyCollections.filter((collection) => {
      const story = storyBySlug.get(collection.weddingSlug);
      return [
        collection.name,
        collection.description,
        collection.type,
        collection.source,
        story?.title,
        story?.venue,
        story?.couple,
      ].some((value) => (value || "").toLowerCase().includes(q));
    });
  }, [legacyCollections, query, storyBySlug]);

  return (
    <div className="space-y-7">
      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">
              Gallery Management
            </p>
            <h1 className="font-serif text-5xl md:text-6xl">Galleries</h1>
            <p className="mt-4 max-w-3xl text-white/60">
              Manage default dynamic galleries and photographer-created galleries from one place.
            </p>
          </div>
          <a
            href="https://www.mkbweddings.co.uk/gallery"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm"
          >
            <ExternalLink className="h-4 w-4" />
            View live Gallery
          </a>
        </div>
      </section>

      {message ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </section>
      ) : null}

      {loading ? (
        <section className="rounded-[28px] border border-black/10 bg-white/80 p-8 text-neutral-500">
          Loading gallery management…
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white/85">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.3fr) minmax(320px, 0.7fr)",
                gap: "0",
              }}
            >
              <div
                style={{
                  minHeight: "320px",
                  position: "relative",
                  background: "#eeeeeb",
                  overflow: "hidden",
                }}
              >
                {imageSource(masterHeroes.landing) ? (
                  <img
                    src={imageSource(masterHeroes.landing)}
                    alt={masterHeroes.landing?.alt || "Main Gallery landing hero"}
                    style={{ width: "100%", height: "100%", minHeight: "320px", objectFit: "cover" }}
                  />
                ) : (
                  <div className="flex h-full min-h-[320px] items-center justify-center text-neutral-400">
                    No master Gallery landing hero selected
                  </div>
                )}
              </div>
              <div className="p-7">
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Gallery landing</p>
                <h2 className="mt-2 font-serif text-3xl">Master landing page</h2>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  Reorder and hide the cards shown on the public Gallery landing below.
                </p>
                <div className="mt-5 rounded-2xl bg-neutral-100 p-4 text-sm text-neutral-600">
                  {landingCards.filter(isLandingCardVisible).length} cards currently visible on the Gallery landing.
                </div>
                <a
                  href="https://www.mkbweddings.co.uk/gallery"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Gallery landing
                </a>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Default galleries</p>
                <h2 className="mt-2 font-serif text-4xl">Built-in gallery types</h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Every workspace starts with Venues and Moments. Both use structured assignments and remain fully manageable.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
              <CoreGalleryCard
                title="Venues"
                description="A dynamic gallery generated from venue records and venue image assignments."
                image={imageSource(masterHeroes.venue)}
                icon={MapPin}
                stats={`${publishedVenues.length} published · ${activeVenues.length} managed`}
                manageTo="/admin/venues"
                liveHref="https://www.mkbweddings.co.uk/gallery/venues"
                badge="Default gallery"
              />
              <CoreGalleryCard
                title="Moments"
                description="A dynamic gallery whose moment categories can be created, renamed, reordered and archived."
                image={imageSource(masterHeroes.moments)}
                icon={Tags}
                stats={`${publicMoments.length} public cards · ${activeMoments.length} active moments`}
                manageTo="/admin/moments"
                liveHref="https://www.mkbweddings.co.uk/gallery/moments"
                badge="Default gallery"
              />
            </div>
          </section>

          <section className="rounded-[28px] border border-black/10 bg-white/85 p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Gallery landing cards</p>
                <h2 className="mt-2 font-serif text-3xl">Order & visibility</h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Drag cards into the order you want on /gallery. Any card can be hidden without deleting its underlying content.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void saveLandingLayout()}
                disabled={savingLanding || !landingDirty}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                {savingLanding ? "Saving…" : landingDirty ? "Save landing layout" : "Layout saved"}
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {landingCards.map((card, index) => {
                const visible = isLandingCardVisible(card);
                const collection = card.custom;
                return (
                  <article
                    key={card.key}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => dropLandingCard(card.key)}
                    className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-3 md:flex-row md:items-center"
                  >
                    <div
                      draggable
                      onDragStart={() => setDraggedLandingKey(card.key)}
                      onDragEnd={() => setDraggedLandingKey(null)}
                      className="cursor-grab rounded-full border border-black/10 bg-white p-3"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div
                      className="overflow-hidden rounded-xl bg-neutral-100"
                      style={{ width: "110px", height: "78px", flex: "0 0 auto" }}
                    >
                      {card.image ? (
                        <img src={card.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="font-medium">{index + 1}. {card.title}</strong>
                        {collection ? (
                          <>
                            <span className="rounded-full border border-black/10 bg-neutral-50 px-2 py-1 text-xs text-neutral-500">
                              gallery
                            </span>
                            <span className={`rounded-full border px-2 py-1 text-xs ${customStatusClasses(collection.status)}`}>
                              {collection.status}
                            </span>
                          </>
                        ) : (
                          <span className="rounded-full border border-black/10 bg-neutral-50 px-2 py-1 text-xs text-neutral-500">
                            {card.key === "venues" || card.key === "moments"
                              ? "default"
                              : card.key === "creative-flash"
                                ? "gallery"
                                : "site"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-neutral-500">{card.description}</p>
                    </div>
                    <label className="flex items-center justify-between gap-4 rounded-full border border-black/10 px-4 py-2 text-sm">
                      <span>{visible ? "Visible" : collection?.showOnLanding && collection.status !== "active" ? "Waiting for Active" : "Hidden"}</span>
                      <input
                        type="checkbox"
                        checked={collection ? collection.showOnLanding : visible}
                        disabled={savingCollectionId === collection?.id || collection?.status === "archived"}
                        onChange={(event) => {
                          if (collection) void toggleCustomLanding(collection, event.target.checked);
                          else toggleCoreLandingCard(card.key, event.target.checked);
                        }}
                      />
                    </label>
                  </article>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Photographer galleries</p>
                <h2 className="mt-2 font-serif text-4xl">Your galleries</h2>
                <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                  Creative Flash and any galleries you create here are photographer-defined rather than built into the platform.
                </p>
              </div>
              <Link
                to="/admin/custom-collections"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm"
              >
                <Settings2 className="h-4 w-4" />
                Gallery settings
              </Link>
            </div>

            <div className="mb-5 rounded-[24px] border border-black/10 bg-white/85 p-5">
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void createCollection();
                  }}
                  placeholder="New gallery name, e.g. Beach Weddings"
                  className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void createCollection()}
                  disabled={creating || !newName.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  {creating ? "Creating…" : "Add gallery"}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
              <CoreGalleryCard
                title="Creative Flash"
                description="A photographer-defined gallery with exact order, visibility and hero control."
                image={creativeHero?.thumbSrc || creativeHero?.fullSrc || ""}
                icon={Zap}
                stats={`${visibleCreativeCount} visible · ${creativeImages.length} assigned`}
                manageTo="/admin/creative-flash"
                liveHref="https://www.mkbweddings.co.uk/gallery/creative-flash"
                badge="Gallery"
              />
              {[...customCollections]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((collection) => (
                  <article
                    key={collection.id}
                    className={`overflow-hidden rounded-[24px] border border-black/10 bg-white/85 ${
                      collection.status === "archived" ? "opacity-55" : ""
                    }`}
                  >
                    <div style={{ aspectRatio: "16 / 9", background: "#f3f3f1", overflow: "hidden" }}>
                      {collection.heroImage ? (
                        <img
                          src={collection.heroImage.thumbSrc || collection.heroImage.fullSrc}
                          alt={collection.heroImage.alt || `${collection.name} hero`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                          Set a hero in Manage gallery
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-serif text-2xl">{collection.name}</h3>
                            <span className="rounded-full border border-black/10 bg-neutral-50 px-2 py-1 text-xs text-neutral-500">
                              Gallery
                            </span>
                            <span className={`rounded-full border px-2 py-1 text-xs ${customStatusClasses(collection.status)}`}>
                              {collection.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-neutral-600">
                            {collection.description || "No description yet."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-neutral-100 p-3 text-center">
                        <div>
                          <p className="text-xs text-neutral-500">Selected</p>
                          <p className="mt-1 text-xl">{collection.imageCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">Visible</p>
                          <p className="mt-1 text-xl">{collection.visibleImageCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">Landing</p>
                          <p className="mt-1 text-sm font-medium">
                            {collection.status === "active" && collection.showOnLanding ? "Shown" : "Hidden"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {collection.status !== "archived" ? (
                          <Link
                            to={`/admin/custom-collections/${encodeURIComponent(collection.slug)}/gallery`}
                            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm text-white"
                          >
                            <Images className="h-4 w-4" />
                            Manage gallery
                          </Link>
                        ) : null}
                        <Link
                          to="/admin/custom-collections"
                          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm"
                        >
                          <Settings2 className="h-4 w-4" />
                          Edit settings
                        </Link>
                        {collection.status === "active" ? (
                          <a
                            href={`https://www.mkbweddings.co.uk/gallery/collection/${encodeURIComponent(collection.slug)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View live
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </section>

          <details className="rounded-[28px] border border-black/10 bg-white/75 p-6">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <Layers3 className="h-5 w-5" />
                  <div>
                    <h2 className="font-serif text-2xl">Wedding publishing collections</h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      Existing wedding-specific sets used by the publishing workflow. These remain separate from public galleries.
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm">
                  {legacyCollections.length} collections
                </span>
              </div>
            </summary>

            <div className="mt-6">
              <div className="relative mb-5 w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search wedding collections..."
                  className="w-full rounded-2xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm"
                />
              </div>

              <div className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/10 bg-white">
                {filteredLegacyCollections.map((collection) => {
                  const story = storyBySlug.get(collection.weddingSlug);
                  return (
                    <div
                      key={collection.id}
                      className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-[1fr_1fr_120px_auto] xl:items-center"
                    >
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusClasses(collection.status)}`}>
                            {collection.status}
                          </span>
                          <span className="text-xs text-neutral-500">{collection.type}</span>
                        </div>
                        <h3 className="font-serif text-xl">{collection.name}</h3>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-800">{story?.title || collection.weddingSlug}</p>
                        <p className="mt-1 text-sm text-neutral-500">{story?.venue}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Images</p>
                        <p className="mt-1 text-2xl font-serif">{collection.imageCount}</p>
                      </div>
                      <Link
                        to={`/admin/weddings/${collection.weddingSlug}/collections`}
                        className="rounded-full bg-black px-4 py-2 text-center text-sm text-white"
                      >
                        Open
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function CoreGalleryCard({
  title,
  description,
  image,
  icon: Icon,
  stats,
  manageTo,
  liveHref,
  badge,
}: {
  title: string;
  description: string;
  image: string;
  icon: typeof Images;
  stats: string;
  manageTo: string;
  liveHref: string;
  badge?: string;
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-black/10 bg-white/85">
      <div style={{ aspectRatio: "16 / 9", background: "#f3f3f1", overflow: "hidden" }}>
        {image ? (
          <img src={image} alt={`${title} hero`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-400">
            <Sparkles className="h-7 w-7" />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Icon className="h-5 w-5" />
          <h3 className="font-serif text-2xl">{title}</h3>
          {badge ? (
            <span className="rounded-full border border-black/10 bg-neutral-50 px-2 py-1 text-xs text-neutral-500">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">{description}</p>
        <p className="mt-3 text-xs text-neutral-500">{stats}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to={manageTo}
            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm text-white"
          >
            <Settings2 className="h-4 w-4" />
            Manage
          </Link>
          <a
            href={liveHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm"
          >
            <ExternalLink className="h-4 w-4" />
            View live
          </a>
        </div>
      </div>
    </article>
  );
}
