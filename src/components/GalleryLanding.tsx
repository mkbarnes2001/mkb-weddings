import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ChevronRight } from "lucide-react";

type PublicImage = {
  assetKey?: string;
  imageId?: string;
  thumbSrc?: string;
  fullSrc?: string;
  alt?: string;
};

type GalleryMasterHeroesResponse = {
  ok: true;
  venue: PublicImage | null;
  moments: PublicImage | null;
  landing: PublicImage | null;
};

type CreativeFlashResponse = {
  ok: true;
  heroImage: PublicImage | null;
};

type PublicCustomCollection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  imageCount: number;
  heroImage: PublicImage | null;
};

type PublicCustomCollectionsResponse = {
  ok: true;
  collections: PublicCustomCollection[];
};

type GalleryLandingSettingsResponse = {
  ok: true;
  settings: {
    cardOrder: string[];
    hiddenCards: string[];
  };
};

type PublicLocationSettings = {
  enabled: boolean;
  landingTitle: string;
  cardDescription: string;
  publicBasePath: string;
  heroImageUrl: string;
};

type PublicLocationsResponse = {
  ok: true;
  settings: PublicLocationSettings;
};

const DEFAULT_LOCATION_SETTINGS: PublicLocationSettings = {
  enabled: true,
  landingTitle: "Explore by County",
  cardDescription: "Browse wedding galleries by county",
  publicBasePath: "/wedding-photographer",
  heroImageUrl: "",
};

function preferredCardSource(image: PublicImage | null | undefined, fallback: string) {
  return image?.thumbSrc || image?.fullSrc || fallback;
}

export function GalleryLanding() {
  const canonical = "https://www.mkbweddings.co.uk/gallery";
  const title = "Wedding Photography Gallery | Northern Ireland & Ireland | MKB Weddings";
  const description =
    "Browse real wedding photography from venues across Northern Ireland and Ireland. Explore galleries by location, venue, moments and real wedding stories.";

  const [masterHeroes, setMasterHeroes] = useState<GalleryMasterHeroesResponse | null>(null);
  const [creativeFlashHero, setCreativeFlashHero] = useState<PublicImage | null>(null);
  const [customCollections, setCustomCollections] = useState<PublicCustomCollection[]>([]);
  const [locationSettings, setLocationSettings] = useState<PublicLocationSettings>(DEFAULT_LOCATION_SETTINGS);
  const [landingSettings, setLandingSettings] = useState<{ cardOrder: string[]; hiddenCards: string[] }>({
    cardOrder: ["county", "venues", "moments", "creative-flash", "stories"],
    hiddenCards: [],
  });

  const HERO_FALLBACK =
    "https://images.mkbweddings.co.uk/full/Orange%20tree%20house/couple%20portraits/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_2000.webp";

  const heroImage = masterHeroes?.landing?.fullSrc || masterHeroes?.landing?.thumbSrc || HERO_FALLBACK;

  const countiesThumb =
    "https://images.mkbweddings.co.uk/thumb/Slieve%20donard%20hotel/couple%20portraits/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_500.webp";

  const venueFallback =
    "https://images.mkbweddings.co.uk/thumb/Killeavy%20castle/couple%20portraits/mkb-weddings-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-113_500.webp";

  const creativeFlashFallback =
    "https://images.mkbweddings.co.uk/thumb/Darver%20castle/couple%20portraits/MKB-photography-Northern-Ireland-wedding-photographer-Irish-Wedding-photography-Darver-castle-wedding-photography-Full%20res-586_500.webp";

  const momentsFallback =
    "https://images.mkbweddings.co.uk/thumb/Darver%20castle/reception%20and%20party/mkb-weddings-northern-ireland-wedding-photographer-ni-wedding-photography-darver-castle-wedding-photography-189_500.webp";

  const storiesImage =
    "https://images.mkbweddings.co.uk/thumb/Orange%20tree%20house/getting%20ready/mkb-weddings-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-39_500.webp";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      fetch("/api/public/gallery-master-heroes", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("Unable to load gallery master heroes.");
        return response.json() as Promise<GalleryMasterHeroesResponse>;
      }),
      fetch("/api/public/creative-flash", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("Unable to load Creative Flash hero.");
        return response.json() as Promise<CreativeFlashResponse>;
      }),
      fetch("/api/public/custom-collections", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("Unable to load custom collections.");
        return response.json() as Promise<PublicCustomCollectionsResponse>;
      }),
      fetch("/api/public/gallery-landing-settings", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("Unable to load Gallery landing settings.");
        return response.json() as Promise<GalleryLandingSettingsResponse>;
      }),
      fetch("/api/public/locations", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("Unable to load location gallery settings.");
        return response.json() as Promise<PublicLocationsResponse>;
      }),
    ]).then(([galleryHeroesResult, creativeFlashResult, customCollectionsResult, landingSettingsResult, locationsResult]) => {
      if (cancelled) return;

      if (galleryHeroesResult.status === "fulfilled") {
        setMasterHeroes(galleryHeroesResult.value);
      }

      if (creativeFlashResult.status === "fulfilled") {
        setCreativeFlashHero(creativeFlashResult.value.heroImage || null);
      }

      if (customCollectionsResult.status === "fulfilled") {
        setCustomCollections(customCollectionsResult.value.collections || []);
      }

      if (landingSettingsResult.status === "fulfilled") {
        setLandingSettings(landingSettingsResult.value.settings);
      }

      if (locationsResult.status === "fulfilled") {
        setLocationSettings({ ...DEFAULT_LOCATION_SETTINGS, ...locationsResult.value.settings });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const mainTiles = useMemo(() => {
    const customTiles = customCollections.map((collection) => ({
      key: `custom:${collection.id}`,
      title: collection.name,
      link: `/gallery/collection/${collection.slug}`,
      image: preferredCardSource(
        collection.heroImage,
        masterHeroes?.landing?.thumbSrc || masterHeroes?.landing?.fullSrc || HERO_FALLBACK,
      ),
      description:
        collection.description ||
        `Explore ${collection.name.toLowerCase()} wedding photography`,
    }));

    const tiles = [
      {
        key: "county",
        title: locationSettings.landingTitle || "Explore by Location",
        link: locationSettings.publicBasePath || "/gallery/locations",
        image: locationSettings.heroImageUrl || countiesThumb,
        description: locationSettings.cardDescription || "Browse wedding galleries by location",
        disabled: !locationSettings.enabled,
      },
      {
        key: "venues",
        title: "Venues",
        link: "/gallery/venues",
        image: preferredCardSource(masterHeroes?.venue, venueFallback),
        description: "Browse weddings by location",
      },
      {
        key: "moments",
        title: "Wedding Moments",
        link: "/gallery/moments",
        image: preferredCardSource(masterHeroes?.moments, momentsFallback),
        description: "Explore wedding day highlights",
      },
      {
        key: "creative-flash",
        title: "Creative Flash",
        link: "/gallery/creative-flash",
        image: preferredCardSource(creativeFlashHero, creativeFlashFallback),
        description: "Bold, dramatic flash photography",
      },
      ...customTiles,
      {
        key: "stories",
        title: "Stories & Reviews",
        link: "/blog",
        image: storiesImage,
        description: "Real wedding love stories",
      },
    ];

    const hidden = new Set(landingSettings.hiddenCards || []);
    const customKeys = customTiles.map((tile) => tile.key);
    const savedOrder = [...new Set<string>(landingSettings.cardOrder || [])];
    const hasCustomOrder = savedOrder.some((key) => key.startsWith("custom:"));
    let effectiveOrder = savedOrder;

    if (!hasCustomOrder) {
      effectiveOrder = [
        ...savedOrder.filter((key) => key !== "stories"),
        ...customKeys,
        "stories",
      ];
    } else {
      const missingCustom = customKeys.filter((key) => !savedOrder.includes(key));
      const next = [...savedOrder];
      const storiesIndex = next.indexOf("stories");
      if (storiesIndex >= 0) next.splice(storiesIndex, 0, ...missingCustom);
      else next.push(...missingCustom);
      effectiveOrder = next;
    }

    const enabledTiles = tiles.filter((tile) => tile.key !== "county" || locationSettings.enabled);
    const allKeys = enabledTiles.map((tile) => tile.key);
    effectiveOrder = [...new Set([...effectiveOrder, ...allKeys])].filter((key) =>
      allKeys.includes(key),
    );
    const rank = new Map(effectiveOrder.map((key, index) => [key, index]));

    return enabledTiles
      .filter((tile) => !hidden.has(tile.key))
      .sort((a, b) => (rank.get(a.key) ?? 9999) - (rank.get(b.key) ?? 9999));
  }, [masterHeroes, creativeFlashHero, customCollections, landingSettings, locationSettings]);

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />

        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback
          src={heroImage}
          alt="Wedding photography gallery showcasing weddings across Northern Ireland and Ireland"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-end justify-center text-center px-6 pb-16 md:pb-20">
          <h1 className="text-white text-4xl md:text-5xl font-serif">
            Wedding Photography Galleries
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 pb-10">
        <nav aria-label="Breadcrumb" className="flex justify-center">
          <ol className="flex flex-wrap items-center justify-center gap-2 text-neutral-600 text-sm">
            <li>
              <Link to="/" className="hover:text-neutral-900 underline underline-offset-4">
                Home
              </Link>
            </li>
            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li className="text-neutral-900">Gallery</li>
          </ol>
        </nav>
      </div>

      <section className="max-w-5xl mx-auto px-6 pt-4 pb-10 text-center">
        <p className="text-neutral-700 leading-relaxed text-lg">
          Browse real wedding photography captured across Northern Ireland and Ireland — explore
          galleries by location, venues, wedding moments, photographer galleries, and real wedding stories.
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-32 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mainTiles.map((tile) => (
            <Link
              key={tile.title}
              to={tile.link}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg"
            >
              <ImageWithFallback
                src={tile.image}
                alt={`${tile.title} wedding photography gallery`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <h2 className="text-white text-2xl md:text-3xl mb-2 font-serif leading-tight">
                  {tile.title}
                </h2>

                <p className="text-white/90 text-sm mb-4">{tile.description}</p>

                <div className="flex items-center text-white">
                  <span className="text-sm uppercase tracking-wider">Explore</span>
                  <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
