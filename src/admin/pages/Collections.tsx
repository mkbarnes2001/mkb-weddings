import { StudioAddGalleryLink, StudioBackLink, StudioThumbnail, StudioToggle } from "../components/ui/StudioUI";
import { AdminActionLink, AdminActionRouterLink } from "../components/ui/AdminActionControl";
import { useEffect, useMemo, useState } from "react";

import { ExternalLink, GripVertical, Images, Save, Search } from "lucide-react";
import { weddingStories } from "../../data/weddingStories";
import { CollectionService } from "../services/CollectionService";
import { AdminApiService, type LocationGallerySettings } from "../services/AdminApiService";
import type { ImageCollection } from "../types/collection";
import type { CustomCollection } from "../types/customCollection";


import { AdminPage, AdminPageHeader, AdminPanel, AdminStatus, AdminButton } from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";

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
const MKB_LOCATION_FALLBACK_HERO =
  "https://images.mkbweddings.co.uk/thumb/Slieve%20donard%20hotel/couple%20portraits/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_500.webp";

const DEFAULT_LOCATION_SETTINGS: LocationGallerySettings = {
  enabled: true,
  landingTitle: "Explore by County",
  galleryTitle: "Northern Ireland & Ireland Wedding Photography",
  cardDescription: "Browse wedding galleries by county",
  singularLabel: "County",
  pluralLabel: "Counties",
  groupingLevel: "county",
  publicBasePath: "/wedding-photographer",
  intro: "",
  seoTitle: "",
  seoDescription: "",
  heroImageUrl: "",
  publicOrigin: "",
};


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

function imageSource(image: PublicImage | null | undefined) {
  return image?.thumbSrc || image?.fullSrc || "";
}

export function Collections() {
  const { auth } = useProfessionalAuth();
  const isMkbWorkspace = auth.workspaceId === "workspace_mkb_weddings";
  const [legacyCollections, setLegacyCollections] = useState<ImageCollection[]>([]);
  const [customCollections, setCustomCollections] = useState<CustomCollection[]>([]);
  const [locationSettings, setLocationSettings] = useState<LocationGallerySettings>(DEFAULT_LOCATION_SETTINGS);
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
  const [savingLanding, setSavingLanding] = useState(false);
  const [savingCollectionId, setSavingCollectionId] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [publicOrigin, setPublicOrigin] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const [customResult, locationResult, creativeResult, landingResult, heroResult, workspaceResult] =
      await Promise.allSettled([
        AdminApiService.listCustomCollections(),
        AdminApiService.getLocations(),
        AdminApiService.getCreativeFlashGallery(),
        AdminApiService.getGalleryLandingSettings(),
        fetch("/api/gallery-master-heroes?refresh=1", { cache: "no-store" }).then(
          async (response) => {
            if (!response.ok) throw new Error("Unable to load gallery hero previews.");
            return response.json();
          },
        ),
        AdminApiService.getWorkspace(),
      ]);

    const loadedCustom = customResult.status === "fulfilled" ? customResult.value : [];
    setCustomCollections(loadedCustom);
    if (locationResult.status === "fulfilled") {
      setLocationSettings(locationResult.value.settings || DEFAULT_LOCATION_SETTINGS);
    }
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
    if (workspaceResult.status === "fulfilled") {
      const websiteUrl = String(workspaceResult.value?.settings?.websiteUrl || "").trim().replace(/\/+$/, "");
      const publicHostname = String(workspaceResult.value?.settings?.publicHostname || "").trim();
      setPublicOrigin(
        /^https?:\/\//i.test(websiteUrl)
          ? websiteUrl
          : publicHostname
            ? `https://${publicHostname}`
            : "",
      );
    } else {
      setPublicOrigin("");
    }

    const landingSettings =
      landingResult.status === "fulfilled"
        ? landingResult.value
        : { cardOrder: CORE_KEYS, hiddenCards: [] };
    setLandingOrder(normaliseLandingOrder(landingSettings.cardOrder, loadedCustom));
    setHiddenCoreCards(landingSettings.hiddenCards.filter((key) => CORE_KEYS.includes(key)));
    setLandingDirty(false);

    const failed = [customResult, locationResult, creativeResult, landingResult, workspaceResult].filter(
      (result) => result.status === "rejected",
    );
    if (failed.length) {
      setError("Some gallery management data could not be loaded. Refresh the page before making changes.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    if (isMkbWorkspace) {
      CollectionService.load()
        .then((service) => setLegacyCollections(service.getAllCollections()))
        .catch(() => {});
    } else {
      setLegacyCollections([]);
    }
  }, [isMkbWorkspace]);

  const creativeHero = useMemo(() => {
    const heroId = creativeSettings.heroImageId;
    const hidden = new Set(creativeSettings.hiddenImageIds || []);
    return (
      creativeImages.find(
        (image) => image.assetKey === heroId || image.imageId === heroId,
      ) || creativeImages.find((image) => !hidden.has(image.assetKey)) || null
    );
  }, [creativeImages, creativeSettings]);

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
        title: locationSettings.landingTitle || "Explore by Location",
        description: locationSettings.cardDescription || "Browse wedding galleries by location",
        image: locationSettings.heroImageUrl || (isMkbWorkspace ? MKB_LOCATION_FALLBACK_HERO : ""),
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
        image: isMkbWorkspace
          ? "https://images.mkbweddings.co.uk/thumb/Orange%20tree%20house/getting%20ready/mkb-weddings-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-39_500.webp"
          : "",
        kind: "system",
      },
    ];

    const map = new Map(cards.map((card) => [card.key, card]));
    const order = normaliseLandingOrder(landingOrder, customCollections);
    return order.map((key) => map.get(key)).filter((card): card is LandingCard => Boolean(card));
  }, [customCollections, landingOrder, masterHeroes, creativeHero, locationSettings, isMkbWorkspace]);

  function isLandingCardVisible(card: LandingCard) {
    if (card.kind === "custom") {
      return Boolean(card.custom?.showOnLanding && card.custom.status === "active");
    }
    if (card.key === "county" && !locationSettings.enabled) return false;
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

  const galleryOrigin = publicOrigin ? `${publicOrigin}/gallery` : "";

  return <AdminPage className="studio-page">
    <AdminPageHeader title="Gallery organiser" backLink={<StudioBackLink />} meta={<span>{landingCards.filter(isLandingCardVisible).length} visible cards</span>}
      actions={<><StudioAddGalleryLink />{galleryOrigin ? <AdminActionLink href={galleryOrigin} target="_blank" rel="noreferrer" className="admin-button admin-button--secondary" aria-label="View live gallery"><ExternalLink /></AdminActionLink> : null}</>} />
    {message ? <div className="admin-alert admin-alert--success" role="status">{message}</div> : null}
    {error ? <div className="admin-alert admin-alert--error" role="alert">{error}</div> : null}
    {loading ? <p role="status">Loading gallery settings…</p> : <>
      <AdminPanel title="Order & visibility" actions={<AdminButton data-admin-action="save" icon={Save} variant="primary" onClick={() => void saveLandingLayout()} disabled={savingLanding || !landingDirty}>{savingLanding ? "Saving…" : landingDirty ? "Save layout" : "Layout saved"}</AdminButton>}>
        <div className="studio-landing-list">{landingCards.map(card => {
          const visible = isLandingCardVisible(card), collection = card.custom;
          return <article key={card.key} className="studio-landing-row" onDragOver={event => event.preventDefault()} onDrop={() => dropLandingCard(card.key)}>
            <span className="studio-drag" draggable title="Drag to reorder" onDragStart={() => setDraggedLandingKey(card.key)} onDragEnd={() => setDraggedLandingKey(null)}><GripVertical aria-hidden="true" /></span>
            <StudioThumbnail src={card.image} />
            <div className="studio-landing-name"><strong>{card.title}</strong>{collection && collection.status !== "active" ? <AdminStatus>{collection.status}</AdminStatus> : null}</div>
            <StudioToggle aria-label={`Show ${card.title}`} checked={collection ? collection.showOnLanding : visible} disabled={savingCollectionId === collection?.id || collection?.status === "archived" || (card.key === "county" && !locationSettings.enabled)} onChange={event => {if (collection) void toggleCustomLanding(collection, event.target.checked); else toggleCoreLandingCard(card.key, event.target.checked);}}>{visible ? "Visible" : collection?.showOnLanding && collection.status !== "active" ? "Pending activation" : "Hidden"}</StudioToggle>
          </article>;
        })}</div>
      </AdminPanel>
      {imageSource(masterHeroes.landing) ? <AdminPanel title="Landing image"><img className="studio-landing-preview" src={imageSource(masterHeroes.landing)} alt={masterHeroes.landing?.alt || "Gallery landing image"} /></AdminPanel> : null}
      {legacyCollections.length ? <details className="studio-disclosure studio-disclosure--panel"><summary>Wedding publishing collections <span className="studio-meta">{legacyCollections.length}</span></summary>
        <div className="studio-search"><Search aria-hidden="true" /><input className="admin-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search wedding collections" aria-label="Search wedding collections" /></div>
        <div className="studio-legacy-list">{filteredLegacyCollections.map(collection => <div key={collection.id} className="studio-legacy-row">
          <div><strong>{collection.name}</strong><small>{storyBySlug.get(collection.weddingSlug)?.title || collection.weddingSlug}</small></div>
          <span className="studio-meta">{collection.imageCount} images</span><AdminStatus>{collection.status}</AdminStatus>
          <AdminActionRouterLink to={`/admin/weddings/${collection.weddingSlug}/collections`} className="admin-button admin-button--secondary" aria-label={`Open ${collection.name}`}><Images /></AdminActionRouterLink>
        </div>)}</div>
      </details> : null}
    </>}
  </AdminPage>;
}
