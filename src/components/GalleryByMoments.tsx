import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Helmet } from "react-helmet-async";

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";
const HERO_IMAGE =
  "https://images.mkbweddings.co.uk/full/Greenvale%20Hotel/family%20and%20bridal%20party/MKB-weddings-mkb-photography-NI-wedding-photographer-greenvale-cookstown-wedding-photography-434_2000.webp";

const LEGACY_CARD_IMAGES: Record<string, string> = {
  "getting-ready": "https://images.mkbweddings.co.uk/thumb/Galgorm/getting%20ready/MKB-photography-Northern-Ireland-wedding-photographer-Galgorm-resort-Wedding-photography-Glagorm-resort-wedding-photography-full%20res-67_500.webp",
  ceremony: "https://images.mkbweddings.co.uk/thumb/Killeavy%20castle/ceremony/mkb-weddings-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-135_500.webp",
  "couple-portraits": "https://images.mkbweddings.co.uk/thumb/Slieve%20donard%20hotel/couple%20portraits/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-4_500.webp",
  "family-and-bridal-party": "https://images.mkbweddings.co.uk/thumb/Orange%20tree%20house/family%20and%20bridal%20party/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-orange-tree-house-greyabbey-wedding-photography-415_500.webp",
  "reception-and-party": "https://images.mkbweddings.co.uk/thumb/Belmont/reception%20and%20party/mkb-weddings-mkb-photography-norther-ireland-wedding-photographer-belmont-house-hotel-banbridge-wedding-photography-300_500.webp",
  "details-and-decor": "https://images.mkbweddings.co.uk/thumb/Leighinmohr%20house%20hotel/details%20and%20decor/mkb-weddings-northern-ireland-wedding-photographer-creative-wedding-photography-10_500.webp",
};

const LEGACY_DESCRIPTIONS: Record<string, string> = {
  "getting-ready": "Preparation, anticipation, and quiet moments before the ceremony",
  ceremony: 'The vows, the emotion, and the moment you say “I do”',
  "couple-portraits": "Just the two of you — captured naturally and beautifully",
  "family-and-bridal-party": "Celebrating with the people who matter most",
  "reception-and-party": "Speeches, laughter, dancing — the celebration in full swing",
  "details-and-decor": "The thoughtful styling, florals, and finishing touches",
};

type PublicMoment = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  count: number;
  image: null | { thumbSrc: string; fullSrc: string; alt: string };
};

export function GalleryByMoments() {
  const [moments, setMoments] = useState<PublicMoment[]>([]);
  const [masterHero, setMasterHero] = useState<{ fullSrc: string; thumbSrc: string; alt: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [response, heroResponse] = await Promise.all([
          fetch("/api/public/moments?refresh=1", { cache: "no-store" }),
          fetch("/api/public/gallery-master-heroes?refresh=1", { cache: "no-store" }),
        ]);
        if (!response.ok) throw new Error(`Failed to load moments (${response.status})`);
        const data = await response.json();
        const heroData = heroResponse.ok ? await heroResponse.json() : null;
        if (!cancelled) {
          setMoments(Array.isArray(data?.moments) ? data.moments : []);
          setMasterHero(heroData?.moments || null);
        }
      } catch (error: any) {
        if (!cancelled) setLoadError(error?.message || "Failed to load moments");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const canonical = `${SITE_ORIGIN}/gallery/moments`;
  const metaTitle = "Wedding Moments Gallery | Northern Ireland & Ireland | MKB Weddings";
  const metaDescription = "Browse real wedding photography by moment — getting ready, ceremony, couple portraits, bridal party, reception and details — across Northern Ireland and Ireland.";

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={masterHero?.fullSrc || masterHero?.thumbSrc || HERO_IMAGE} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback src={masterHero?.fullSrc || masterHero?.thumbSrc || HERO_IMAGE} alt={masterHero?.alt || "Wedding moments gallery across Northern Ireland and Ireland"} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="w-full max-w-7xl mx-auto px-6 pb-20 text-center">
            <Link to="/gallery" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center">
              <ArrowLeft className="w-5 h-5" /> Back to Gallery
            </Link>
            <h1 className="text-white text-4xl md:text-5xl mb-4 font-serif">Wedding Moments</h1>
            <div className="text-white/85 text-sm">{moments.length} {moments.length === 1 ? "gallery" : "galleries"}</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 pb-10">
        <nav aria-label="Breadcrumb" className="flex justify-center">
          <ol className="flex flex-wrap items-center justify-center gap-2 text-neutral-600 text-sm">
            <li><Link to="/" className="hover:text-neutral-900 underline underline-offset-4">Home</Link></li>
            <li className="opacity-60"><ChevronRight className="w-4 h-4" /></li>
            <li><Link to="/gallery" className="hover:text-neutral-900 underline underline-offset-4">Gallery</Link></li>
            <li className="opacity-60"><ChevronRight className="w-4 h-4" /></li>
            <li className="text-neutral-900">Moments</li>
          </ol>
        </nav>
      </div>

      <section className="max-w-5xl mx-auto px-6 pt-12 pb-10 text-center">
        <p className="text-neutral-700 leading-relaxed text-lg">Browse real wedding photography by moment — from getting ready to the dancefloor — across Northern Ireland and Ireland.</p>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-32 pt-6">
        {loadError ? <div className="mb-8 text-center text-sm text-amber-700">{loadError}</div> : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {moments.map((moment) => {
            const image = moment.image?.thumbSrc || LEGACY_CARD_IMAGES[moment.slug] || HERO_IMAGE;
            const description = moment.description || LEGACY_DESCRIPTIONS[moment.slug] || "Explore this collection of real wedding moments.";
            return (
              <Link key={moment.id || moment.slug} to={`/gallery/moment/${encodeURIComponent(moment.slug)}`} className="group relative aspect-[4/3] overflow-hidden rounded-lg">
                <ImageWithFallback src={image} alt={moment.image?.alt || moment.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <h2 className="text-white text-2xl md:text-3xl mb-2 font-serif leading-tight">{moment.name}</h2>
                  <p className="text-white/90 text-sm mb-4">{description}</p>
                  <div className="flex items-center text-white">
                    <span className="text-sm uppercase tracking-wider">View Gallery{moment.count ? ` (${moment.count})` : ""}</span>
                    <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {!loadError && moments.length === 0 ? <div className="text-center py-20 text-neutral-600">No moments are currently published on this page.</div> : null}
      </div>
    </div>
  );
}
