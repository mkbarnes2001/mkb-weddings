import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ChevronRight } from "lucide-react";

export function GalleryLanding() {
  const canonical = "https://www.mkbweddings.co.uk/gallery";
  const title = "Wedding Photography Gallery | Northern Ireland & Ireland | MKB Weddings";
  const description =
    "Browse real wedding photography from venues across Northern Ireland and Ireland. Explore galleries by county, venue, moments, creative flash and real wedding stories.";

  // Match the hero pattern used on GalleryByMoments (full-width hero + gradient overlay)
  const HERO_IMAGE =
    "https://images.mkbweddings.co.uk/full/Orange%20tree%20house/couple%20portraits/MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_2000.webp";

  // Tile images (your image library)
  const countiesThumb =
    "https://images.mkbweddings.co.uk/thumb/Slieve%20donard%20hotel/couple%20portraits/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_500.webp";

  const venueImage =
    "https://images.mkbweddings.co.uk/thumb/Killeavy%20castle/couple%20portraits/mkb-weddings-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-113_500.webp";

  const creativeFlashImage =
    "https://images.mkbweddings.co.uk/thumb/Darver%20castle/couple%20portraits/MKB-photography-Northern-Ireland-wedding-photographer-Irish-Wedding-photography-Darver-castle-wedding-photography-Full%20res-586_500.webp";

  const momentsImage =
    "https://images.mkbweddings.co.uk/thumb/Darver%20castle/reception%20and%20party/mkb-weddings-northern-ireland-wedding-photographer-ni-wedding-photography-darver-castle-wedding-photography-189_500.webp";

  const storiesImage =
    "https://images.mkbweddings.co.uk/thumb/Orange%20tree%20house/getting%20ready/mkb-weddings-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-39_500.webp";

  const mainTiles = [
    {
      title: "Explore by County",
      link: "/wedding-photographer",
      image: countiesThumb,
      description: "Browse wedding galleries by county",
    },
    {
      title: "Venues",
      link: "/gallery/venues",
      image: venueImage,
      description: "Browse weddings by location",
    },
    {
      title: "Wedding Moments",
      link: "/gallery/moments",
      image: momentsImage,
      description: "Explore wedding day highlights",
    },
    {
      title: "Creative Flash",
      link: "/gallery/creative-flash",
      image: creativeFlashImage,
      description: "Bold, dramatic flash photography",
    },
    {
      title: "Stories & Reviews",
      link: "/blog",
      image: storiesImage,
      description: "Real wedding love stories",
    },
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />

        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={HERO_IMAGE} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* HERO (match GalleryByMoments style) */}
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback
          src={HERO_IMAGE}
          alt="Wedding photography gallery across Northern Ireland and Ireland"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center text-center px-6">
        <h1 className="text-white text-4xl md:text-5xl font-serif">
          Wedding Photography Galleries
          </h1>
        </div>
        </div>

      {/* BREADCRUMBS: Home > Gallery */}
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

      {/* INTRO (match GalleryByMoments spacing/feel) */}
      <section className="max-w-5xl mx-auto px-6 pt-4 pb-10 text-center">
        <p className="text-neutral-700 leading-relaxed text-lg">
          Browse real wedding photography captured across Northern Ireland and Ireland — explore
          galleries by county, venues, wedding moments, creative flash, and real wedding stories.
        </p>
      </section>

      {/* TILES */}
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
                alt={tile.title}
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