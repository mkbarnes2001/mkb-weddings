import React from "react";

const VIDEOS = [
  {
    title: "Wedding Film – Example 1",
    youtubeId: "GzZbcfdpIX4",
  },
  {
    title: "Wedding Film – Example 2",
    youtubeId: "d_yrNr8bTgE",
  },
  {
    title: "Wedding Film – Example 3",
    youtubeId: "e6iZjDdmRWc",
  },
  {
    title: "Wedding Film – Example 4",
    youtubeId: "Y0_IAaY7X8LA",
  },
];

function YouTubeEmbed({
  youtubeId,
  title,
}: {
  youtubeId: string;
  title: string;
}) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-sm bg-black/5">
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

export default function WeddingPackages() {
  return (
    <main className="pb-32">
      {/* Hero */}
      <section className="pt-32 pb-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-serif mb-6">
            Wedding Photography & Videography
          </h1>

          <p className="text-lg text-foreground/80 max-w-3xl mx-auto">
            Relaxed, story-driven coverage that captures your wedding day
            naturally — with photography and cinematic film working together.
          </p>
        </div>
      </section>

      {/* Photography Packages */}
      <section className="mb-28">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-serif mb-10">
            Wedding Photography Packages
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Package 1 */}
            <div className="border border-foreground/10 p-8">
              <h3 className="text-xl font-serif mb-4">Half Day Coverage</h3>
              <ul className="space-y-2 text-foreground/80 text-sm">
                <li>• Up to 5 hours coverage</li>
                <li>• Full gallery of edited images</li>
                <li>• Online private gallery</li>
                <li>• High-resolution downloads</li>
              </ul>
            </div>

            {/* Package 2 */}
            <div className="border border-foreground/10 p-8">
              <h3 className="text-xl font-serif mb-4">Full Day Coverage</h3>
              <ul className="space-y-2 text-foreground/80 text-sm">
                <li>• Morning preparations to evening party</li>
                <li>• Full gallery of edited images</li>
                <li>• Online private gallery</li>
                <li>• High-resolution downloads</li>
              </ul>
            </div>

            {/* Package 3 */}
            <div className="border border-foreground/10 p-8">
              <h3 className="text-xl font-serif mb-4">
                Photography + Videography
              </h3>
              <ul className="space-y-2 text-foreground/80 text-sm">
                <li>• Full day photography</li>
                <li>• Cinematic highlight wedding film</li>
                <li>• Carefully synced photo + video coverage</li>
                <li>• Online gallery & film delivery</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Videography Examples */}
      <section className="mb-28">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-serif mb-4">
            Wedding Videography Examples
          </h2>

          <p className="text-foreground/80 max-w-2xl mb-12">
            A small selection of recent wedding films, focusing on atmosphere,
            emotion, and natural storytelling.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {VIDEOS.map((video) => (
              <div key={video.youtubeId}>
                <YouTubeEmbed
                  youtubeId={video.youtubeId}
                  title={video.title}
                />
                <p className="mt-3 text-sm text-foreground/70">
                  {video.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-serif mb-6">
            Let’s Tell Your Wedding Story
          </h2>

          <p className="text-foreground/80 max-w-2xl mx-auto mb-8">
            If you’re planning your wedding and would like relaxed,
            unobtrusive coverage, I’d love to hear more about your day.
          </p>

          <a
            href="/contact"
            className="inline-block border border-foreground px-8 py-3 text-sm tracking-wide hover:bg-foreground hover:text-background transition"
          >
            Get in Touch
          </a>
        </div>
      </section>
    </main>
  );
}
