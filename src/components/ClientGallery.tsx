import { useEffect, useMemo, useState } from "react";
import { Download, Heart, LockKeyhole, X } from "lucide-react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { resolveAssetUrl } from "../lib/assetUrl";

type ClientGalleryImage = {
  assetId: string;
  filename: string;
  thumbSrc: string;
  webSrc: string;
  width: number;
  height: number;
  hasOriginal: boolean;
};

type ClientGalleryPayload = {
  ok?: boolean;
  locked: boolean;
  error?: string;
  id: string;
  title: string;
  clientName: string;
  intro: string;
  couple: string;
  venue: string;
  weddingDate: string;
  businessName: string;
  logoUrl: string;
  websiteUrl: string;
  allowFavourites: boolean;
  allowDownloads: boolean;
  requiresPin: boolean;
  expiresAt: string;
  cover?: ClientGalleryImage | null;
  assets?: ClientGalleryImage[];
  favouriteAssetIds?: string[];
};

function visitorKey() {
  const storageKey = "mkb-client-gallery-visitor";
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(storageKey, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

function GalleryImage({
  image,
  baseOrigin,
  mode = "tile",
}: {
  image: ClientGalleryImage;
  baseOrigin?: string;
  mode?: "tile" | "hero" | "lightbox";
}) {
  const candidates = useMemo(
    () => Array.from(new Set([
      resolveAssetUrl(mode === "tile" ? image.thumbSrc : image.webSrc, baseOrigin),
      resolveAssetUrl(mode === "tile" ? image.webSrc : image.thumbSrc, baseOrigin),
    ].filter(Boolean))),
    [image.assetId, image.thumbSrc, image.webSrc, baseOrigin, mode],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => setCandidateIndex(0), [image.assetId, image.thumbSrc, image.webSrc, baseOrigin, mode]);

  const src = candidates[candidateIndex];
  if (!src) return <div aria-hidden="true" style={{ width: "100%", height: "100%", background: "#e8e6e1" }} />;

  return (
    <img
      src={src}
      alt=""
      loading={mode === "hero" ? "eager" : "lazy"}
      decoding="async"
      onError={() => setCandidateIndex((current) => current + 1)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: mode === "lightbox" ? "contain" : "cover",
        display: candidateIndex >= candidates.length ? "none" : "block",
      }}
    />
  );
}

function DownloadControl({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-label="Full-resolution download not yet available"
      title="Full-resolution download will be enabled with secure original delivery"
      style={{
        width: compact ? 32 : 38,
        height: compact ? 32 : 38,
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,.92)",
        color: "#111",
        boxShadow: "0 3px 16px rgba(0,0,0,.14)",
        opacity: .68,
        cursor: "not-allowed",
      }}
    >
      <Download size={compact ? 15 : 17} strokeWidth={1.7} />
    </span>
  );
}

export function ClientGallery() {
  const { token = "" } = useParams<{ token: string }>();
  const [visitor] = useState(() => visitorKey());
  const [payload, setPayload] = useState<ClientGalleryPayload | null>(null);
  const [pin, setPin] = useState(() => {
    try { return sessionStorage.getItem(`client-gallery-pin:${token}`) || ""; } catch { return ""; }
  });
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const load = async (attemptPin = "") => {
    setError("");
    const endpoint = `/api/public/client-galleries/${encodeURIComponent(token)}`;
    const response = attemptPin
      ? await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: attemptPin, visitorKey: visitor }),
          cache: "no-store",
        })
      : await fetch(`${endpoint}?visitor=${encodeURIComponent(visitor)}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok && response.status !== 401) {
      throw new Error(body?.error || "Unable to load gallery.");
    }
    setPayload(body as ClientGalleryPayload);
    setFavourites(new Set((body?.favouriteAssetIds || []) as string[]));
    if (response.ok && attemptPin) {
      try { sessionStorage.setItem(`client-gallery-pin:${token}`, attemptPin); } catch {}
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const remembered = pin;
    load(remembered)
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load gallery."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const unlock = async () => {
    setUnlocking(true);
    try {
      await load(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unlock gallery.");
    } finally {
      setUnlocking(false);
    }
  };

  const toggleFavourite = async (assetId: string) => {
    if (!payload?.allowFavourites) return;
    const nextValue = !favourites.has(assetId);
    const optimistic = new Set(favourites);
    if (nextValue) optimistic.add(assetId); else optimistic.delete(assetId);
    setFavourites(optimistic);
    try {
      const response = await fetch(`/api/public/client-galleries/${encodeURIComponent(token)}/favourites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, visitorKey: visitor, assetId, favourite: nextValue }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Unable to save favourite.");
      setFavourites(new Set(body.favouriteAssetIds || []));
    } catch (err) {
      setFavourites(favourites);
      setError(err instanceof Error ? err.message : "Unable to save favourite.");
    }
  };

  const images = payload?.assets || [];
  const cover = payload?.cover || images[0] || null;
  const favouriteImages = useMemo(() => images.filter((image) => favourites.has(image.assetId)), [images, favourites]);
  const publicAssetOrigin = payload?.websiteUrl || "https://www.mkbweddings.co.uk";

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] text-neutral-600">Loading private gallery…</div>;
  }

  if (error && !payload) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] px-6"><div className="max-w-lg text-center"><h1 style={{ fontFamily: '"Canela", "Playfair Display", Georgia, serif', fontSize: 42, fontWeight: 400 }}>Gallery unavailable</h1><p className="mt-4 text-neutral-600">{error}</p></div></div>;
  }

  if (payload?.locked) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center px-6">
        <Helmet>
          <title>{payload.title || "Private Gallery"}</title>
          <meta name="robots" content="noindex,nofollow,noarchive" />
          <meta name="referrer" content="no-referrer" />
        </Helmet>
        <div className="w-full max-w-md rounded-3xl border border-black/15 bg-white p-8 text-center">
          <LockKeyhole className="h-8 w-8 mx-auto" />
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 mt-5">Private gallery</p>
          <h1 style={{ fontFamily: '"Canela", "Playfair Display", Georgia, serif', fontSize: 42, fontWeight: 400, marginTop: 8 }}>{payload.title || "Client Gallery"}</h1>
          <p className="mt-3 text-neutral-600">Enter the PIN supplied by your photographer.</p>
          <input value={pin} onChange={(event) => setPin(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") unlock(); }} placeholder="Gallery PIN" className="mt-6 w-full rounded-xl border border-black/20 px-4 py-3 text-center" autoFocus />
          <button onClick={unlock} disabled={unlocking || !pin.trim()} className="mt-3 w-full rounded-xl bg-black text-white px-5 py-3 disabled:opacity-40">{unlocking ? "Checking…" : "Open gallery"}</button>
          {payload.error ? <p className="mt-3 text-sm text-red-700">{payload.error}</p> : null}
        </div>
      </div>
    );
  }

  if (!payload) return null;

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-neutral-950">
      <Helmet>
        <title>{payload.title} | Private Gallery</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>

      <header className="px-5 md:px-8 py-4 border-b border-black/10 bg-white/95 backdrop-blur" style={{ position: "sticky", top: 0, zIndex: 20 }}>
        <div className="max-w-[1500px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {payload.logoUrl ? <img src={resolveAssetUrl(payload.logoUrl, publicAssetOrigin)} alt="" style={{ height: 30, maxWidth: 150, objectFit: "contain" }} /> : null}
            <div className="min-w-0"><p style={{ fontFamily: '"Canela", "Playfair Display", Georgia, serif', fontSize: 18, lineHeight: 1.05 }}>{payload.businessName}</p><p className="text-[11px] text-neutral-500 mt-1">Private client gallery</p></div>
          </div>
          {payload.allowFavourites ? <div className="text-xs md:text-sm inline-flex items-center gap-2 whitespace-nowrap"><Heart className="h-4 w-4" /> {favourites.size} favourites</div> : null}
        </div>
      </header>

      {cover ? (
        <section style={{ height: "58vh", minHeight: 390, maxHeight: 720, position: "relative", overflow: "hidden", background: "#ddd" }}>
          <GalleryImage image={cover} baseOrigin={publicAssetOrigin} mode="hero" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.64), rgba(0,0,0,.02) 65%)" }} />
          <div
            className="max-w-[1500px] mx-auto px-6 md:px-10"
            style={{
              position: "absolute",
              inset: 0,
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              paddingTop: 24,
            }}
          >
            <h1
              style={{
                fontFamily: '"Montserrat", "Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif',
                fontSize: "clamp(1.35rem, 2.35vw, 2.15rem)",
                lineHeight: 1.18,
                fontWeight: 600,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                margin: 0,
                maxWidth: 1040,
                textShadow: "0 2px 18px rgba(0,0,0,.42)",
              }}
            >
              {payload.title}
            </h1>
            <div
              aria-hidden="true"
              style={{
                width: 56,
                height: 1,
                background: "rgba(255,255,255,.78)",
                marginTop: 20,
                marginBottom: 14,
              }}
            />
            <p
              style={{
                fontFamily: '"Montserrat", "Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif',
                fontSize: 11,
                lineHeight: 1.2,
                fontWeight: 500,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                margin: 0,
                color: "rgba(255,255,255,.9)",
                textShadow: "0 2px 12px rgba(0,0,0,.36)",
              }}
            >
              {images.length} {images.length === 1 ? "photo" : "photos"}
            </p>
          </div>
        </section>
      ) : (
        <section className="max-w-[1500px] mx-auto px-6 md:px-10 py-16 text-center"><p className="text-[10px] uppercase tracking-[0.28em] text-neutral-500">Private gallery</p><h1 style={{ fontFamily: '"Montserrat", "Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif', fontSize: "clamp(1.35rem, 2.35vw, 2.15rem)", lineHeight: 1.18, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", marginTop: 12 }}>{payload.title}</h1></section>
      )}

      <main className="max-w-[1500px] mx-auto px-4 md:px-8 py-10 md:py-12">
        {payload.intro ? <p style={{ fontFamily: '"Canela", "Playfair Display", Georgia, serif', fontSize: "clamp(1.15rem,2vw,1.55rem)", lineHeight: 1.55, maxWidth: 760, margin: "0 auto 42px", textAlign: "center", color: "#3d3d3d" }}>{payload.intro}</p> : null}

        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap border-b border-black/10 pb-4">
          <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">{images.length} photographs</p>
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            {payload.allowFavourites && favouriteImages.length ? <span>Your favourites are saved on this device.</span> : null}
            <span className="inline-flex items-center gap-1.5"><Download size={14} /> Full-resolution downloads follow in the next delivery phase.</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(205px, 1fr))", gap: 8 }}>
          {images.map((image, index) => (
            <div key={image.assetId} style={{ position: "relative", aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : "4/3", minHeight: 170, overflow: "hidden", background: "#e8e6e1" }}>
              <button onClick={() => setLightboxIndex(index)} aria-label={`Open image ${index + 1}`} style={{ width: "100%", height: "100%", display: "block", border: 0, padding: 0, cursor: "zoom-in", background: "transparent" }}>
                <GalleryImage image={image} baseOrigin={publicAssetOrigin} mode="tile" />
              </button>
              <div style={{ position: "absolute", top: 9, right: 9, display: "flex", alignItems: "center", gap: 7 }}>
                <DownloadControl compact />
                {payload.allowFavourites ? (
                  <button onClick={() => toggleFavourite(image.assetId)} aria-label={favourites.has(image.assetId) ? "Remove favourite" : "Add favourite"} title={favourites.has(image.assetId) ? "Remove favourite" : "Add favourite"} style={{ width: 32, height: 32, borderRadius: 999, border: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.92)", color: "#111", boxShadow: "0 3px 16px rgba(0,0,0,.14)", cursor: "pointer" }}>
                    <Heart size={15} strokeWidth={1.7} fill={favourites.has(image.assetId) ? "currentColor" : "none"} />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        {!images.length ? <div className="text-center py-20 text-neutral-500">This gallery does not contain any visible images yet.</div> : null}
      </main>

      <footer className="border-t border-black/10 py-9 px-6 text-center text-xs tracking-wide text-neutral-500 bg-white/55">
        Private gallery delivered by {payload.businessName}.
      </footer>

      {lightboxIndex !== null && images[lightboxIndex] ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.95)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <button onClick={() => setLightboxIndex(null)} aria-label="Close image" className="rounded-full bg-white p-2" style={{ position: "absolute", top: 18, right: 18, zIndex: 2 }}><X className="h-5 w-5" /></button>
          <div style={{ width: "96vw", height: "91vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GalleryImage image={images[lightboxIndex]} baseOrigin={publicAssetOrigin} mode="lightbox" />
          </div>
          <div style={{ position: "absolute", bottom: 22, display: "flex", alignItems: "center", gap: 9 }}>
            <DownloadControl />
            {payload.allowFavourites ? <button onClick={() => toggleFavourite(images[lightboxIndex].assetId)} className="rounded-full bg-white px-4 py-2 inline-flex items-center gap-2 text-sm"><Heart className="h-4 w-4" fill={favourites.has(images[lightboxIndex].assetId) ? "currentColor" : "none"} /> Favourite</button> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
