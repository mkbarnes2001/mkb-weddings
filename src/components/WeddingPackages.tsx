import React from "react";
import { Link } from "react-router-dom";
import { Check, Video } from "lucide-react";

const VIDEOS = [
  { title: "Wedding Film – Example 1", youtubeId: "GzZbcfdpIX4" },
  { title: "Wedding Film – Example 2", youtubeId: "d_yrNr8bTgE" },
  { title: "Wedding Film – Example 3", youtubeId: "e6iZjDdmRWc" },
  { title: "Wedding Film – Example 4", youtubeId: "Y0_IAaY7X8LA" },
] as const;

function YouTubeEmbed({
  youtubeId,
  title,
}: {
  youtubeId: string;
  title: string;
}) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-black/5">
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

function PackageCard({
  title,
  priceNote,
  bullets,
  highlight = false,
}: {
  title: string;
  priceNote?: string;
  bullets: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-7 md:p-8",
        highlight
          ? "border-foreground/20 bg-foreground/[0.03]"
          : "border-foreground/10",
      ].join(" ")}
    >
      <h3 className="text-xl md:text-2xl font-serif">{title}</h3>
      {priceNote ? (
        <p className="mt-2 text-sm text-foreground/70">{priceNote}</p>
      ) : null}

      <ul className="mt-6 space-y-3 text-sm text-foreground/80">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeddingPackages() {
  return (
    <main className="px-6 md:px-12 lg:px-20">
      {/* HERO */}
      <section className="mx-auto max-w-6xl pt-20 md:pt-28 pb-16 md:pb-20">
        <h1 className="text-4xl md:text-6xl font-serif tracking-tight">
          Wedding Photography & Videography
        </h1>
        <p className="mt-5 max-w-2xl text-base md:text-lg text-foreground/80">
          Natural, story-led coverage with a calm approach — documenting the day
          as it unfolds, with timeless photography and cinematic film.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-xl border border-foreground px-6 py-3 text-sm hover:bg-foreground hover:text-background transition"
          >
            Enquire Now
          </Link>

          <Link
            to="/gallery"
            className="inline-flex items-center justify-center rounded-xl border border-foreground/15 px-6 py-3 text-sm text-foreground/80 hover:border-foreground/30 hover:text-foreground transition"
          >
            View Photography Gallery
          </Link>
        </div>
      </section>

      {/* PACKAGES */}
      <section className="mx-auto max-w-6xl pb-16 md:pb-20">
        <h2 className="text-3xl md:text-4xl font-serif">Wedding Packages</h2>
        <p className="mt-4 max-w-2xl text-foreground/80">
          Choose a simple photography option, or add videography for a complete
          story of your day.
        </p>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PackageCard
            title="Half Day Photography"
            priceNote="Ideal for smaller weddings or shorter coverage."
            bullets={[
              "Up to 5 hours coverage",
              "Carefully edited full gallery",
              "Private online gallery",
              "High-resolution downloads",
            ]}
          />

          <PackageCard
            title="Full Day Photography"
            highlight
            priceNote="From prep to party — the complete story."
            bullets={[
              "Full day coverage",
              "Carefully edited full gallery",
              "Private online gallery",
              "High-resolution downloads",
            ]}
          />

          <PackageCard
            title="Photography + Videography"
            priceNote="Photo + film working together (same style, same calm approach)."
            bullets={[
              "Full day photography coverage",
              "Cinematic highlight film",
              "Audio moments & natural storytelling",
              "Online delivery of gallery + film",
            ]}
          />
        </div>
      </section>

      {/* VIDEO EXAMPLES */}
      <section className="mx-auto max-w-6xl pb-16 md:pb-20">
        <div className="flex items-center gap-3">
          <Video className="h-5 w-5" />
          <h2 className="text-3xl md:text-4xl font-serif">
            Wedding Videography Examples
          </h2>
        </div>

        <p className="mt-4 max-w-2xl text-foreground/80">
          Four examples of recent films — atmosphere, emotion, and storytelling.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          {VIDEOS.map((v) => (
            <div key={v.youtubeId}>
              <YouTubeEmbed youtubeId={v.youtubeId} title={v.title} />
              <p className="mt-3 text-sm text-foreground/70">{v.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl pb-24 md:pb-28">
        <div className="rounded-2xl border border-foreground/10 p-8 md:p-10 text-center">
          <h3 className="text-2xl md:text-3xl font-serif">
            Want to check availability?
          </h3>
          <p className="mt-4 text-foreground/80 max-w-2xl mx-auto">
            Send over your date and venue and I’ll come back with availability
            and the best package fit.
          </p>

          <div className="mt-7">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-xl border border-foreground px-7 py-3 text-sm hover:bg-foreground hover:text-background transition"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
export default WeddingPackages;
