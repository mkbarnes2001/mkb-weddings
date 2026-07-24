import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardList, Download, Heart, LockKeyhole, LogIn, LogOut, Mail, Send, ShieldCheck, X } from "lucide-react";
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

type ClientGallerySelection = {
  id: string;
  status: "draft" | "submitted";
  submittedAt: string;
  selectedCount: number;
  assetIds: string[];
};

type ClientGallerySelectionRequest = {
  id: string;
  galleryId: string;
  name: string;
  instructions: string;
  minImages: number;
  maxImages: number;
  status: "active" | "archived";
  sortOrder: number;
  selection: ClientGallerySelection | null;
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
  galleryDownloadsEnabled?: boolean;
  requireEmail?: boolean;
  requiresEmail?: boolean;
  emailRequired?: boolean;
  requiresPin: boolean;
  visitorEmail?: string;
  visitorRole?: string;
  visitorCanDownloadOriginals?: boolean;
  authenticated?: boolean;
  authenticatedEmail?: string;
  secureSignInAvailable?: boolean;
  expiresAt: string;
  cover?: ClientGalleryImage | null;
  assets?: ClientGalleryImage[];
  favouriteAssetIds?: string[];
  selectionRequests?: ClientGallerySelectionRequest[];
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

function DownloadControl({
  compact = false,
  enabled,
  busy,
  onClick,
}: {
  compact?: boolean;
  enabled: boolean;
  busy?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!enabled || busy}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      aria-label={enabled ? "Download full-resolution original" : "Full-resolution original unavailable"}
      title={enabled ? "Download full-resolution original" : "Full-resolution original unavailable"}
      style={{
        width: compact ? 32 : 38,
        height: compact ? 32 : 38,
        borderRadius: 999,
        border: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,.92)",
        color: "#111",
        boxShadow: "0 3px 16px rgba(0,0,0,.14)",
        opacity: enabled ? 1 : .58,
        cursor: enabled && !busy ? "pointer" : "not-allowed",
      }}
    >
      <Download size={compact ? 15 : 17} strokeWidth={1.7} />
    </button>
  );
}

export function ClientGallery() {
  const { token = "" } = useParams<{ token: string }>();
  const [visitor] = useState(() => visitorKey());
  const [payload, setPayload] = useState<ClientGalleryPayload | null>(null);
  const [pin, setPin] = useState(() => {
    try { return sessionStorage.getItem(`client-gallery-pin:${token}`) || ""; } catch { return ""; }
  });
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(`client-gallery-email:${token}`) || ""; } catch { return ""; }
  });
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [activeSelectionRequestId, setActiveSelectionRequestId] = useState("");
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [showSecureSignIn, setShowSecureSignIn] = useState(false);
  const [secureSignInBusy, setSecureSignInBusy] = useState(false);
  const [secureSignInMessage, setSecureSignInMessage] = useState("");

  const load = async (attemptPin = "", attemptEmail = "") => {
    setError("");
    const endpoint = `/api/public/client-galleries/${encodeURIComponent(token)}`;
    const shouldPost = Boolean(attemptPin || attemptEmail);
    const response = shouldPost
      ? await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: attemptPin, email: attemptEmail, visitorKey: visitor }),
          cache: "no-store",
        })
      : await fetch(`${endpoint}?visitor=${encodeURIComponent(visitor)}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok && response.status !== 401) {
      throw new Error(body?.error || "Unable to load gallery.");
    }
    setPayload(body as ClientGalleryPayload);
    setFavourites(new Set((body?.favouriteAssetIds || []) as string[]));
    const requests = (body?.selectionRequests || []) as ClientGallerySelectionRequest[];
    if (requests.length) {
      setActiveSelectionRequestId((current) => current && requests.some((request) => request.id === current) ? current : requests[0].id);
    }
    if (response.ok && attemptPin) {
      try { sessionStorage.setItem(`client-gallery-pin:${token}`, attemptPin); } catch {}
    }
    if (response.ok && (attemptEmail || body?.visitorEmail || body?.authenticatedEmail)) {
      const rememberedEmail = String(body?.authenticatedEmail || attemptEmail || body?.visitorEmail || "");
      setEmail(rememberedEmail);
      try { localStorage.setItem(`client-gallery-email:${token}`, rememberedEmail); } catch {}
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const remembered = pin;
    load(remembered, "")
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load gallery."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const unlock = async () => {
    setUnlocking(true);
    try {
      await load(pin, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unlock gallery.");
    } finally {
      setUnlocking(false);
    }
  };

  const requestSecureSignIn = async () => {
    const targetEmail = String(email || payload?.visitorEmail || "").trim();
    if (!targetEmail) {
      setSecureSignInMessage("Enter your email address first.");
      return;
    }
    setSecureSignInBusy(true);
    setSecureSignInMessage("");
    try {
      const response = await fetch("/api/public/client-auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ galleryToken: token, email: targetEmail, visitorKey: visitor }),
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Unable to send secure sign-in link.");
      setSecureSignInMessage(body?.message || "Secure sign-in link sent. Check your email.");
    } catch (err) {
      setSecureSignInMessage(err instanceof Error ? err.message : "Unable to send secure sign-in link.");
    } finally {
      setSecureSignInBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await fetch("/api/public/client-auth/sign-out", { method: "POST", cache: "no-store" });
    } finally {
      setSecureSignInMessage("");
      setShowSecureSignIn(false);
      await load(pin, email);
    }
  };

  const downloadOriginal = async (image: ClientGalleryImage) => {
    if (!payload?.allowDownloads || !image.hasOriginal || downloading.has(image.assetId)) return;
    setError("");
    setDownloading((current) => new Set(current).add(image.assetId));
    try {
      const response = await fetch(
        `/api/public/client-galleries/${encodeURIComponent(token)}/assets/${encodeURIComponent(image.assetId)}/download`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, email, visitorKey: visitor }),
          cache: "no-store",
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Unable to download original.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = image.filename || "photograph.jpg";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download original.");
    } finally {
      setDownloading((current) => {
        const next = new Set(current);
        next.delete(image.assetId);
        return next;
      });
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
        body: JSON.stringify({ pin, email, visitorKey: visitor, assetId, favourite: nextValue }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Unable to save favourite.");
      setFavourites(new Set(body.favouriteAssetIds || []));
    } catch (err) {
      setFavourites(favourites);
      setError(err instanceof Error ? err.message : "Unable to save favourite.");
    }
  };


  const updateSelection = async (assetId: string, selected: boolean) => {
    if (!activeSelectionRequestId || selectionBusy) return;
    setSelectionBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/public/client-galleries/${encodeURIComponent(token)}/selections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          email,
          visitorKey: visitor,
          requestId: activeSelectionRequestId,
          action: "toggle",
          assetId,
          selected,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Unable to update selection.");
      setPayload((current) => current ? { ...current, selectionRequests: body.selectionRequests || [] } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update selection.");
    } finally {
      setSelectionBusy(false);
    }
  };

  const submitSelection = async () => {
    if (!activeSelectionRequestId || selectionBusy) return;
    setSelectionBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/public/client-galleries/${encodeURIComponent(token)}/selections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          email,
          visitorKey: visitor,
          requestId: activeSelectionRequestId,
          action: "submit",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Unable to submit selection.");
      setPayload((current) => current ? { ...current, selectionRequests: body.selectionRequests || [] } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit selection.");
    } finally {
      setSelectionBusy(false);
    }
  };

  const images = payload?.assets || [];
  const cover = payload?.cover || images[0] || null;
  const favouriteImages = useMemo(() => images.filter((image) => favourites.has(image.assetId)), [images, favourites]);
  const selectionRequests = payload?.selectionRequests || [];
  const activeSelectionRequest = selectionRequests.find((request) => request.id === activeSelectionRequestId) || selectionRequests[0] || null;
  const activeSelection = activeSelectionRequest?.selection || null;
  const selectedAssetIds = new Set(activeSelection?.assetIds || []);
  const publicAssetOrigin = payload?.websiteUrl || "https://www.mkbweddings.co.uk";

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] text-neutral-600">Loading private gallery…</div>;
  }

  if (error && !payload) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] px-6"><div className="max-w-lg text-center"><h1 style={{ fontFamily: '"Canela", "Playfair Display", Georgia, serif', fontSize: 42, fontWeight: 400 }}>Gallery unavailable</h1><p className="mt-4 text-neutral-600">{error}</p></div></div>;
  }

  if (payload?.locked) {
    const needsEmail = Boolean(payload.emailRequired);
    const needsPin = Boolean(payload.requiresPin);
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center px-6">
        <Helmet>
          <title>{payload.title || "Private Gallery"}</title>
          <meta name="robots" content="noindex,nofollow,noarchive" />
          <meta name="referrer" content="no-referrer" />
        </Helmet>
        <div className="w-full max-w-md rounded-3xl border border-black/15 bg-white p-8 text-center">
          {needsEmail ? <Mail className="h-8 w-8 mx-auto" /> : <LockKeyhole className="h-8 w-8 mx-auto" />}
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 mt-5">Private gallery</p>
          <h1 style={{ fontFamily: '"Montserrat", "Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif', fontSize: 28, lineHeight: 1.25, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 10 }}>{payload.title || "Client Gallery"}</h1>
          <p className="mt-4 text-sm text-neutral-600">{needsEmail ? "Enter your email address to view this private gallery." : "Enter the PIN supplied by your photographer."}</p>
          {needsEmail ? <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="mt-6 w-full rounded-xl border border-black/20 px-4 py-3 text-center" autoFocus /> : null}
          {needsPin ? <input value={pin} onChange={(event) => setPin(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") unlock(); }} placeholder="Gallery PIN" className={`${needsEmail ? "mt-3" : "mt-6"} w-full rounded-xl border border-black/20 px-4 py-3 text-center`} autoFocus={!needsEmail} /> : null}
          <button onClick={unlock} disabled={unlocking || (needsEmail && !email.trim()) || (needsPin && !pin.trim())} className="mt-3 w-full rounded-xl bg-black text-white px-5 py-3 disabled:opacity-40">{unlocking ? "Checking…" : "View gallery"}</button>
          {needsEmail && payload.secureSignInAvailable ? <button type="button" onClick={requestSecureSignIn} disabled={secureSignInBusy || !email.trim()} className="mt-3 w-full rounded-xl border border-black/20 bg-white px-5 py-3 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40"><LogIn size={16} /> {secureSignInBusy ? "Sending…" : "Email secure sign-in link"}</button> : null}
          {secureSignInMessage ? <p className="mt-3 text-sm text-neutral-700">{secureSignInMessage}</p> : null}
          {(error || (payload.error && payload.error !== "Email required." && payload.error !== "PIN required.")) ? <p className="mt-3 text-sm text-red-700">{error || payload.error}</p> : null}
          <p className="mt-4 text-[11px] leading-relaxed text-neutral-400">{payload.secureSignInAvailable ? "You can view with your email as before. Secure sign-in verifies that email and syncs favourites and selections across your devices." : "Your email identifies your favourites and gallery permissions. It is not shown publicly."}</p>
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
          <div className="flex items-center gap-3 md:gap-4">
            {payload.visitorEmail ? <div className="hidden md:block text-right"><p className="text-xs text-neutral-700">{payload.visitorEmail}</p><p className="text-[10px] uppercase tracking-[0.1em] text-neutral-400">{payload.authenticated ? "securely signed in" : (payload.visitorRole || "guest").replaceAll("_", " ")}</p></div> : null}
            {payload.authenticated ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-600"><ShieldCheck size={15} /> Signed in</span>
                <button type="button" onClick={signOut} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs inline-flex items-center gap-1.5"><LogOut size={14} /> <span className="hidden sm:inline">Sign out</span></button>
              </div>
            ) : payload.secureSignInAvailable ? (
              <button type="button" onClick={() => { setShowSecureSignIn(true); setSecureSignInMessage(""); }} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs inline-flex items-center gap-1.5"><LogIn size={14} /> Sign in</button>
            ) : null}
            {payload.allowFavourites ? <div className="text-xs md:text-sm inline-flex items-center gap-2 whitespace-nowrap"><Heart className="h-4 w-4" /> {favourites.size} favourites</div> : null}
          </div>
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
        {error ? <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
        {payload.intro ? <p style={{ fontFamily: '"Canela", "Playfair Display", Georgia, serif', fontSize: "clamp(1.15rem,2vw,1.55rem)", lineHeight: 1.55, maxWidth: 760, margin: "0 auto 42px", textAlign: "center", color: "#3d3d3d" }}>{payload.intro}</p> : null}

        {activeSelectionRequest ? (
          <section className="mb-8 rounded-2xl border border-black/10 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-5 flex-wrap">
              <div className="min-w-0" style={{ flex: 1 }}>
                <div className="flex items-center gap-2"><ClipboardList size={16} /><p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Client selection</p></div>
                {selectionRequests.length > 1 ? (
                  <select value={activeSelectionRequest.id} onChange={(event) => setActiveSelectionRequestId(event.target.value)} className="mt-2 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">
                    {selectionRequests.map((request) => <option key={request.id} value={request.id}>{request.name}</option>)}
                  </select>
                ) : <h2 className="mt-2 text-lg font-semibold">{activeSelectionRequest.name}</h2>}
                {activeSelectionRequest.instructions ? <p className="mt-2 text-sm text-neutral-600">{activeSelectionRequest.instructions}</p> : null}
                <p className="mt-2 text-xs text-neutral-500">
                  {activeSelection?.selectedCount || 0} selected
                  {activeSelectionRequest.minImages ? ` · minimum ${activeSelectionRequest.minImages}` : ""}
                  {activeSelectionRequest.maxImages ? ` · maximum ${activeSelectionRequest.maxImages}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {activeSelection?.status === "submitted" ? (
                  <span className="rounded-full bg-green-50 border border-green-200 px-4 py-2 text-xs text-green-800">Submitted</span>
                ) : (
                  <button
                    type="button"
                    disabled={selectionBusy || !(activeSelection?.selectedCount || 0)}
                    onClick={submitSelection}
                    className="rounded-lg bg-black text-white px-4 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-40"
                  >
                    <Send size={15} /> {selectionBusy ? "Saving…" : "Submit selection"}
                  </button>
                )}
              </div>
            </div>
            {activeSelection?.status === "submitted" ? <p className="mt-3 text-xs text-neutral-500">Your selection is locked after submission. Your photographer can reopen it if changes are needed.</p> : <p className="mt-3 text-xs text-neutral-500">Use the check icon on each photograph. Changes save automatically until you submit.</p>}
          </section>
        ) : null}

        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap border-b border-black/10 pb-4">
          <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">{images.length} photographs</p>
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            {payload.allowFavourites && favouriteImages.length ? <span>{payload.authenticated ? "Your favourites are synced to your secure account." : payload.secureSignInAvailable ? "Your favourites are saved on this device. Sign in to sync across devices." : "Your favourites are saved on this device."}</span> : null}
            <span className="inline-flex items-center gap-1.5"><Download size={14} /> {payload.allowDownloads ? `${images.filter((image) => image.hasOriginal).length} originals available` : payload.galleryDownloadsEnabled ? "Originals reserved for authorised clients" : "Downloads disabled"}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(205px, 1fr))", gap: 8 }}>
          {images.map((image, index) => (
            <div key={image.assetId} style={{ position: "relative", aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : "4/3", minHeight: 170, overflow: "hidden", background: "#e8e6e1" }}>
              <button onClick={() => setLightboxIndex(index)} aria-label={`Open image ${index + 1}`} style={{ width: "100%", height: "100%", display: "block", border: 0, padding: 0, cursor: "zoom-in", background: "transparent" }}>
                <GalleryImage image={image} baseOrigin={publicAssetOrigin} mode="tile" />
              </button>
              <div style={{ position: "absolute", top: 9, right: 9, display: "flex", alignItems: "center", gap: 7 }}>
                {activeSelectionRequest ? (
                  <button
                    type="button"
                    disabled={selectionBusy || activeSelection?.status === "submitted"}
                    onClick={(event) => { event.stopPropagation(); updateSelection(image.assetId, !selectedAssetIds.has(image.assetId)); }}
                    aria-label={selectedAssetIds.has(image.assetId) ? "Remove from selection" : "Add to selection"}
                    title={activeSelection?.status === "submitted" ? "Selection submitted" : selectedAssetIds.has(image.assetId) ? "Remove from selection" : "Add to selection"}
                    style={{ width: 32, height: 32, borderRadius: 999, border: selectedAssetIds.has(image.assetId) ? "1px solid #111" : 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: selectedAssetIds.has(image.assetId) ? "#111" : "rgba(255,255,255,.92)", color: selectedAssetIds.has(image.assetId) ? "white" : "#111", boxShadow: "0 3px 16px rgba(0,0,0,.14)", cursor: activeSelection?.status === "submitted" ? "not-allowed" : "pointer", opacity: activeSelection?.status === "submitted" ? .72 : 1 }}
                  >
                    <Check size={15} strokeWidth={2} />
                  </button>
                ) : null}
                <DownloadControl compact enabled={payload.allowDownloads && image.hasOriginal} busy={downloading.has(image.assetId)} onClick={() => downloadOriginal(image)} />
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

      {showSecureSignIn && !payload.authenticated && payload.secureSignInAvailable ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,.42)", display: "grid", placeItems: "center", padding: 20 }} onMouseDown={() => setShowSecureSignIn(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white border border-black/10 p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><ShieldCheck size={18} /><h2 className="text-lg font-semibold">Secure client sign-in</h2></div><p className="mt-2 text-sm text-neutral-600">We will email a one-time link. After signing in, favourites and selections follow you across phones, tablets and computers.</p></div><button type="button" onClick={() => setShowSecureSignIn(false)} aria-label="Close"><X size={18} /></button></div>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="mt-5 w-full rounded-xl border border-black/20 px-4 py-3" autoFocus />
            <button type="button" onClick={requestSecureSignIn} disabled={secureSignInBusy || !email.trim()} className="mt-3 w-full rounded-xl bg-black text-white px-5 py-3 inline-flex items-center justify-center gap-2 disabled:opacity-40"><Mail size={16} /> {secureSignInBusy ? "Sending…" : "Send secure sign-in link"}</button>
            {secureSignInMessage ? <p className="mt-3 text-sm text-neutral-700">{secureSignInMessage}</p> : null}
            <p className="mt-4 text-[11px] leading-relaxed text-neutral-400">The link expires after 15 minutes and can only be used once. Your existing gallery PIN, where enabled, remains separate.</p>
          </div>
        </div>
      ) : null}

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
            {activeSelectionRequest ? <button type="button" disabled={selectionBusy || activeSelection?.status === "submitted"} onClick={() => updateSelection(images[lightboxIndex].assetId, !selectedAssetIds.has(images[lightboxIndex].assetId))} className="rounded-full bg-white px-4 py-2 inline-flex items-center gap-2 text-sm disabled:opacity-50"><Check className="h-4 w-4" /> {selectedAssetIds.has(images[lightboxIndex].assetId) ? "Selected" : "Select"}</button> : null}
            <DownloadControl enabled={payload.allowDownloads && images[lightboxIndex].hasOriginal} busy={downloading.has(images[lightboxIndex].assetId)} onClick={() => downloadOriginal(images[lightboxIndex])} />
            {payload.allowFavourites ? <button onClick={() => toggleFavourite(images[lightboxIndex].assetId)} className="rounded-full bg-white px-4 py-2 inline-flex items-center gap-2 text-sm"><Heart className="h-4 w-4" fill={favourites.has(images[lightboxIndex].assetId) ? "currentColor" : "none"} /> Favourite</button> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
