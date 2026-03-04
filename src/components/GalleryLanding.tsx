import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ChevronRight } from "lucide-react";


export function GalleryLanding() {
  const canonical = "https://www.mkbweddings.co.uk/gallery";
  const title = "Wedding Photography Gallery | Northern Ireland & Ireland | MKB Weddings";
  const description =
    "Browse real wedding photography from venues across Northern Ireland and Ireland. View ceremony, reception, getting ready and couple portraits captured by MKB Weddings.";

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

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />

        <link rel="canonical" href={canonical} />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-16 md:pt-36 md:pb-24">

        {/* Intro Section */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-3xl md:text-4xl font-serif mb-6">
            Wedding Photography Galleries
          </h1>

          <p className="text-primary/75 text-base md:text-lg leading-loose">
            Browse real wedding photography captured across Northern Ireland and
            Ireland, from ceremony moments and candid portraits to dramatic
            creative flash dancefloor images. Explore galleries by county, venue,
            or wedding moments.
          </p>
        </div>

        {/* Tiles */}
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
                <h2 className="text-white text-2xl md:text-3xl mb-2">
                  {tile.title}
                </h2>

                <p className="text-white/90 text-lg mb-4">
                  {tile.description}
                </p>

                <div className="flex items-center text-white">
                  <span className="text-sm uppercase tracking-wider">
                    Explore
                  </span>

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