import { useEffect, useMemo, useState } from "react";
import { Heart, LockKeyhole, X } from "lucide-react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef] text-neutral-600">Loading private gallery…</div>;
  }

  if (error && !payload) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef] px-6"><div className="max-w-lg text-center"><h1 className="font-serif text-4xl">Gallery unavailable</h1><p className="mt-4 text-neutral-600">{error}</p></div></div>;
  }

  if (payload?.locked) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center px-6">
        <Helmet>
          <title>{payload.title || "Private Gallery"}</title>
          <meta name="robots" content="noindex,nofollow,noarchive" />
          <meta name="referrer" content="no-referrer" />
        </Helmet>
        <div className="w-full max-w-md rounded-3xl border border-black/15 bg-white p-8 text-center">
          <LockKeyhole className="h-8 w-8 mx-auto" />
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 mt-5">Private gallery</p>
          <h1 className="font-serif text-4xl mt-2">{payload.title || "Client Gallery"}</h1>
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
    <div className="min-h-screen bg-[#f5f3ef] text-neutral-950">
      <Helmet>
        <title>{payload.title} | Private Gallery</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <header className="px-6 py-5 border-b border-black/10 bg-white/90 backdrop-blur" style={{ position: "sticky", top: 0, zIndex: 20 }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {payload.logoUrl ? <img src={payload.logoUrl} alt="" style={{ height: 34, maxWidth: 160, objectFit: "contain" }} /> : null}
            <div><p className="font-serif text-xl">{payload.businessName}</p><p className="text-xs text-neutral-500">Private client gallery</p></div>
          </div>
          {payload.allowFavourites ? <div className="text-sm inline-flex items-center gap-2"><Heart className="h-4 w-4" /> {favourites.size} favourites</div> : null}
        </div>
      </header>

      {cover ? (
        <section style={{ height: "62vh", minHeight: 420, position: "relative", overflow: "hidden" }}>
          <img src={cover.webSrc || cover.thumbSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.72), rgba(0,0,0,.05))" }} />
          <div className="max-w-7xl mx-auto px-6" style={{ position: "absolute", left: 0, right: 0, bottom: 50, color: "white" }}>
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Private gallery</p>
            <h1 className="font-serif text-5xl md:text-7xl mt-2">{payload.title}</h1>
            <p className="mt-3 text-white/85">{payload.clientName || payload.couple}{payload.venue ? ` · ${payload.venue}` : ""}</p>
          </div>
        </section>
      ) : (
        <section className="max-w-7xl mx-auto px-6 py-20"><h1 className="font-serif text-6xl">{payload.title}</h1></section>
      )}

      <main className="max-w-7xl mx-auto px-6 py-14">
        {payload.intro ? <p className="font-serif text-2xl leading-relaxed max-w-3xl mx-auto text-center mb-14">{payload.intro}</p> : null}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <p className="text-sm text-neutral-500">{images.length} images</p>
          {payload.allowFavourites && favouriteImages.length ? <p className="text-sm text-neutral-600">Your favourites are saved on this device.</p> : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
          {images.map((image, index) => (
            <div key={image.assetId} style={{ position: "relative", aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : "4/3", minHeight: 180, overflow: "hidden", background: "#e8e5de" }}>
              <button onClick={() => setLightboxIndex(index)} style={{ width: "100%", height: "100%", display: "block" }}>
                <img src={image.thumbSrc || image.webSrc} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
              {payload.allowFavourites ? (
                <button onClick={() => toggleFavourite(image.assetId)} aria-label={favourites.has(image.assetId) ? "Remove favourite" : "Add favourite"} className="rounded-full bg-white/90 p-2 shadow" style={{ position: "absolute", top: 10, right: 10 }}>
                  <Heart className="h-5 w-5" fill={favourites.has(image.assetId) ? "currentColor" : "none"} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {!images.length ? <div className="text-center py-20 text-neutral-500">This gallery does not contain any visible images yet.</div> : null}
      </main>

      <footer className="border-t border-black/10 py-10 px-6 text-center text-sm text-neutral-500">
        Private gallery delivered by {payload.businessName}.
      </footer>

      {lightboxIndex !== null && images[lightboxIndex] ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.94)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <button onClick={() => setLightboxIndex(null)} className="rounded-full bg-white p-2" style={{ position: "absolute", top: 20, right: 20 }}><X className="h-5 w-5" /></button>
          <img src={images[lightboxIndex].webSrc || images[lightboxIndex].thumbSrc} alt="" style={{ maxWidth: "96vw", maxHeight: "92vh", objectFit: "contain" }} />
          {payload.allowFavourites ? <button onClick={() => toggleFavourite(images[lightboxIndex].assetId)} className="rounded-full bg-white px-4 py-2 inline-flex items-center gap-2" style={{ position: "absolute", bottom: 24 }}><Heart className="h-4 w-4" fill={favourites.has(images[lightboxIndex].assetId) ? "currentColor" : "none"} /> Favourite</button> : null}
        </div>
      ) : null}
    </div>
  );
}
