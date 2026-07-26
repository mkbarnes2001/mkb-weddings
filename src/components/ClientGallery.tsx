import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardList, Crop, Download, Heart, LockKeyhole, LogIn, LogOut, Mail, Minus, Plus, Send, ShieldCheck, ShoppingBag, Trash2, X } from "lucide-react";
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
  albumIds?: string[];
  albumSortOrders?: Record<string, number>;
};

type ClientGalleryAlbum = {
  id: string;
  name: string;
  slug: string;
  assetCount: number;
  assetIds: string[];
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
  branding?: {
    logoMode: "workspace" | "custom" | "hidden";
    logoUrl: string;
    accentColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    headingFont: "editorial" | "modern" | "classic";
    showStudioName: boolean;
  };
  allowFavourites: boolean;
  allowDownloads: boolean;
  galleryDownloadsEnabled?: boolean;
  sortMode?: "custom" | "capture_time" | "filename";
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
  albums?: ClientGalleryAlbum[];
};

type PrintStoreVariant = {
  id: string;
  sku: string;
  name: string;
  widthMm: number;
  heightMm: number;
  orientation: string;
  finish: string;
  priceMinor: number;
  currency: string;
};

type PrintStoreProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  fulfilmentType: string;
  requiresCrop: boolean;
  variants: PrintStoreVariant[];
};

type PrintStoreCartItem = {
  id: string;
  assetId: string;
  filename: string;
  thumbSrc: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  crop: { x?: number; y?: number; width?: number; height?: number; rotation?: number };
  notes: string;
};

type PrintStoreOrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentProvider: string;
  currency: string;
  totalMinor: number;
  requiresPhotographerApproval: boolean;
  checkoutSessionId?: string;
  paymentIntentId?: string;
  paidAt?: string;
};

type PrintStorePayload = {
  enabled: boolean;
  checkoutEnabled: boolean;
  paymentProvider: string;
  galleryId: string;
  intro: string;
  currency: string;
  allowCrop: boolean;
  requirePhotographerApproval: boolean;
  minimumOrderMinor: number;
  products: PrintStoreProduct[];
  cart: { id: string; status: string; currency: string; subtotalMinor: number; itemCount: number; items: PrintStoreCartItem[] };
};

function formatStoreMoney(minor: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format((Number(minor) || 0) / 100);
}

function headingFontFamily(value: string) {
  if (value === "modern") return '"Montserrat", "Avenir Next", Avenir, Arial, sans-serif';
  if (value === "classic") return 'Georgia, "Times New Roman", serif';
  return '"Canela", "Playfair Display", Georgia, serif';
}

function contrastText(value: string) {
  const hex = value.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111111" : "#ffffff";
}

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
  const [activeAlbumId, setActiveAlbumId] = useState("");
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [showSecureSignIn, setShowSecureSignIn] = useState(false);
  const [secureSignInBusy, setSecureSignInBusy] = useState(false);
  const [secureSignInMessage, setSecureSignInMessage] = useState("");
  const [store, setStore] = useState<PrintStorePayload | null>(null);
  const [showStore, setShowStore] = useState(false);
  const [storeBusy, setStoreBusy] = useState(false);
  const [storeMessage, setStoreMessage] = useState("");
  const [storeAssetId, setStoreAssetId] = useState("");
  const [storeVariantId, setStoreVariantId] = useState("");
  const [storeQuantity, setStoreQuantity] = useState(1);
  const [storeCrop, setStoreCrop] = useState({ x: 0, y: 0, width: 1, height: 1, rotation: 0 });
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [checkoutOrder, setCheckoutOrder] = useState<PrintStoreOrderSummary | null>(null);
  const [pendingCheckoutOrderId, setPendingCheckoutOrderId] = useState("");

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

  const storeRequest = async (action: string, extra: Record<string, unknown> = {}) => {
    const response = await fetch(`/api/public/client-galleries/${encodeURIComponent(token)}/store`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, email, visitorKey: visitor, displayName: checkoutName, action, ...extra }),
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || "Unable to update the Print Store.");
    setStore(body as PrintStorePayload);
    return body as PrintStorePayload;
  };

  const loadStore = async () => {
    try {
      const next = await storeRequest("load");
      if (next.enabled && !storeVariantId) setStoreVariantId(next.products[0]?.variants[0]?.id || "");
      return next;
    } catch {
      setStore({ enabled: false, checkoutEnabled: false, paymentProvider: "stripe", galleryId: payload?.id || "", intro: "", currency: "GBP", allowCrop: true, requirePhotographerApproval: true, minimumOrderMinor: 0, products: [], cart: { id: "", status: "active", currency: "GBP", subtotalMinor: 0, itemCount: 0, items: [] } });
      return null;
    }
  };

  const openStoreForAsset = async (assetId = "") => {
    setStoreMessage("");
    if (assetId) setStoreAssetId(assetId);
    setShowStore(true);
    setStoreBusy(true);
    try {
      const next = store || await loadStore();
      if (next?.enabled && !storeVariantId) setStoreVariantId(next.products[0]?.variants[0]?.id || "");
    } finally { setStoreBusy(false); }
  };

  const addStoreItem = async () => {
    if (!storeAssetId || !storeVariantId) { setStoreMessage("Choose a photograph and product option."); return; }
    setStoreBusy(true); setStoreMessage("");
    try {
      await storeRequest("addItem", { assetId: storeAssetId, variantId: storeVariantId, quantity: storeQuantity, crop: storeCrop });
      setStoreMessage("Added to cart.");
    } catch (err) { setStoreMessage(err instanceof Error ? err.message : "Unable to add item."); }
    finally { setStoreBusy(false); }
  };

  const updateStoreItem = async (item: PrintStoreCartItem, quantity: number) => {
    setStoreBusy(true); setStoreMessage("");
    try {
      await storeRequest("updateItem", { itemId: item.id, quantity, crop: item.crop, notes: item.notes });
    } catch (err) { setStoreMessage(err instanceof Error ? err.message : "Unable to update cart."); }
    finally { setStoreBusy(false); }
  };

  const removeStoreItem = async (itemId: string) => {
    setStoreBusy(true); setStoreMessage("");
    try { await storeRequest("removeItem", { itemId }); }
    catch (err) { setStoreMessage(err instanceof Error ? err.message : "Unable to remove item."); }
    finally { setStoreBusy(false); }
  };

  const checkoutRequest = async (orderId = "") => {
    const targetEmail = String(email || payload?.visitorEmail || payload?.authenticatedEmail || "").trim();
    if (!targetEmail) throw new Error("Enter your email address before continuing to payment.");
    const response = await fetch(`/api/public/client-galleries/${encodeURIComponent(token)}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin,
        email: targetEmail,
        visitorKey: visitor,
        displayName: checkoutName,
        orderId,
        clientName: checkoutName || payload?.clientName || "",
        clientNotes: checkoutNotes,
      }),
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || "Unable to open secure payment.");
    if (body?.order) {
      setCheckoutOrder(body.order as PrintStoreOrderSummary);
      setPendingCheckoutOrderId(String(body.order.id || ""));
    }
    if (body?.checkoutUrl) {
      window.location.assign(String(body.checkoutUrl));
      return;
    }
    const paymentStatus = String(body?.order?.paymentStatus || "");
    setStoreMessage(paymentStatus === "paid"
      ? "Payment confirmed. Your order is now with the photographer for review."
      : "Your order is already recorded.");
  };

  const submitStoreOrder = async () => {
    setStoreBusy(true); setStoreMessage("");
    try { await checkoutRequest(); }
    catch (err) { setStoreMessage(err instanceof Error ? err.message : "Unable to open secure payment."); }
    finally { setStoreBusy(false); }
  };

  const resumeStorePayment = async () => {
    if (!pendingCheckoutOrderId) return;
    setStoreBusy(true); setStoreMessage("");
    try { await checkoutRequest(pendingCheckoutOrderId); }
    catch (err) { setStoreMessage(err instanceof Error ? err.message : "Unable to resume secure payment."); }
    finally { setStoreBusy(false); }
  };

  const loadCheckoutStatus = async (orderId: string, sessionId = "") => {
    const params = new URLSearchParams({
      pin,
      email: String(email || payload?.visitorEmail || payload?.authenticatedEmail || ""),
      visitor,
      order: orderId,
    });
    if (sessionId) params.set("session_id", sessionId);
    const response = await fetch(`/api/public/client-galleries/${encodeURIComponent(token)}/checkout?${params.toString()}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || "Unable to confirm payment status.");
    if (body?.order) {
      const order = body.order as PrintStoreOrderSummary;
      setCheckoutOrder(order);
      setPendingCheckoutOrderId(order.id);
      if (order.paymentStatus === "paid") {
        setStoreMessage(order.requiresPhotographerApproval
          ? "Payment confirmed. Your order is now awaiting photographer approval."
          : "Payment confirmed. Your order has been received.");
      } else if (order.paymentStatus === "processing") {
        setStoreMessage("Stripe is still processing the payment. The order will update automatically when payment completes.");
      } else {
        setStoreMessage("Payment was not completed. Your order is saved and payment can be resumed.");
      }
    }
  };

  useEffect(() => {
    if (payload && !payload.locked && !store) loadStore();
  }, [payload?.id, payload?.locked]);

  useEffect(() => {
    if (!payload || payload.locked) return;
    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get("checkout") || "";
    const orderId = params.get("order") || "";
    const sessionId = params.get("session_id") || "";
    if (!checkoutState || !orderId) return;
    setShowStore(true);
    setPendingCheckoutOrderId(orderId);
    if (checkoutState === "cancelled" || checkoutState === "success") {
      setStoreBusy(true);
      loadCheckoutStatus(orderId, checkoutState === "success" ? sessionId : "")
        .then(() => {
          if (checkoutState === "cancelled") setStoreMessage("Payment was cancelled. Your order is saved and payment can be resumed.");
        })
        .catch((err) => setStoreMessage(err instanceof Error ? err.message : "Unable to confirm payment status."))
        .finally(() => setStoreBusy(false));
    }
    params.delete("checkout");
    params.delete("order");
    params.delete("session_id");
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, [payload?.id, payload?.locked]);

  const images = payload?.assets || [];
  const albums = payload?.albums || [];
  const displayImages = activeAlbumId
    ? images.filter((image) => (image.albumIds || []).includes(activeAlbumId)).slice().sort((left, right) => {
        if (payload?.sortMode !== "custom") return 0;
        const leftOrder = left.albumSortOrders?.[activeAlbumId] ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.albumSortOrders?.[activeAlbumId] ?? Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder;
      })
    : images;
  const cover = payload?.cover || images[0] || null;
  const favouriteImages = useMemo(() => images.filter((image) => favourites.has(image.assetId)), [images, favourites]);
  const selectionRequests = payload?.selectionRequests || [];
  const activeSelectionRequest = selectionRequests.find((request) => request.id === activeSelectionRequestId) || selectionRequests[0] || null;
  const activeSelection = activeSelectionRequest?.selection || null;
  const selectedAssetIds = new Set(activeSelection?.assetIds || []);
  const selectedStoreProduct = store?.products.find((product) => product.variants.some((variant) => variant.id === storeVariantId)) || null;
  const selectedStoreVariant = selectedStoreProduct?.variants.find((variant) => variant.id === storeVariantId) || null;
  const showStoreCrop = Boolean(store?.allowCrop && selectedStoreProduct?.requiresCrop);
  const publicAssetOrigin = payload?.websiteUrl || "https://www.mkbweddings.co.uk";
  const branding = payload?.branding || {
    logoMode: "workspace" as const,
    logoUrl: payload?.logoUrl || "",
    accentColor: "#111111",
    backgroundColor: "#f7f6f3",
    surfaceColor: "#ffffff",
    textColor: "#111111",
    headingFont: "editorial" as const,
    showStudioName: true,
  };
  const accentTextColor = contrastText(branding.accentColor);

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
      <div className="client-gallery-theme min-h-screen flex items-center justify-center px-6" style={{ background: branding.backgroundColor, color: branding.textColor, "--gallery-surface": branding.surfaceColor, "--gallery-muted": `${branding.textColor}99`, "--gallery-border": `${branding.textColor}22` } as any}>
        <Helmet>
          <title>{payload.title || "Private Gallery"}</title>
          <meta name="robots" content="noindex,nofollow,noarchive" />
          <meta name="referrer" content="no-referrer" />
        </Helmet>
        <div className="w-full max-w-md rounded-3xl border border-black/15 p-8 text-center" style={{ background: branding.surfaceColor }}>
          {needsEmail ? <Mail className="h-8 w-8 mx-auto" /> : <LockKeyhole className="h-8 w-8 mx-auto" />}
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 mt-5">Private gallery</p>
          {branding.logoUrl ? <img src={resolveAssetUrl(branding.logoUrl, publicAssetOrigin)} alt="" style={{ maxHeight: 42, maxWidth: 180, objectFit: "contain", margin: "18px auto 0" }} /> : null}
          <h1 style={{ fontFamily: headingFontFamily(branding.headingFont), fontSize: 30, lineHeight: 1.25, fontWeight: 500, marginTop: 14 }}>{payload.title || "Client Gallery"}</h1>
          <p className="mt-4 text-sm text-neutral-600">{needsEmail ? "Enter your email address to view this private gallery." : "Enter the PIN supplied by your photographer."}</p>
          {needsEmail ? <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="mt-6 w-full rounded-xl border border-black/20 px-4 py-3 text-center" autoFocus /> : null}
          {needsPin ? <input value={pin} onChange={(event) => setPin(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") unlock(); }} placeholder="Gallery PIN" className={`${needsEmail ? "mt-3" : "mt-6"} w-full rounded-xl border border-black/20 px-4 py-3 text-center`} autoFocus={!needsEmail} /> : null}
          <button onClick={unlock} disabled={unlocking || (needsEmail && !email.trim()) || (needsPin && !pin.trim())} className="mt-3 w-full rounded-xl px-5 py-3 disabled:opacity-40" style={{ background: branding.accentColor, color: accentTextColor }}>{unlocking ? "Checking…" : "View gallery"}</button>
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
    <div className="client-gallery-theme min-h-screen" style={{ background: branding.backgroundColor, color: branding.textColor, "--gallery-surface": branding.surfaceColor, "--gallery-muted": `${branding.textColor}99`, "--gallery-border": `${branding.textColor}22` } as any}>
      <Helmet>
        <title>{payload.title} | Private Gallery</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <style>{`
        .client-gallery-theme .text-neutral-400,
        .client-gallery-theme .text-neutral-500,
        .client-gallery-theme .text-neutral-600,
        .client-gallery-theme .text-neutral-700 { color: var(--gallery-muted) !important; }
        .client-gallery-theme .bg-white { background-color: var(--gallery-surface) !important; }
        .client-gallery-theme [class*="border-black/"] { border-color: var(--gallery-border) !important; }
      `}</style>

      <header className="px-5 md:px-8 py-4 border-b border-black/10 backdrop-blur" style={{ position: "sticky", top: 0, zIndex: 20, background: `${branding.surfaceColor}f2` }}>
        <div className="max-w-[1500px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {branding.logoUrl ? <img src={resolveAssetUrl(branding.logoUrl, publicAssetOrigin)} alt="" style={{ height: 30, maxWidth: 150, objectFit: "contain" }} /> : null}
            {branding.showStudioName ? <div className="min-w-0"><p style={{ fontFamily: headingFontFamily(branding.headingFont), fontSize: 18, lineHeight: 1.05 }}>{payload.businessName}</p><p className="text-[11px] mt-1" style={{ opacity: .58 }}>Private client gallery</p></div> : null}
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
            {store?.enabled ? <button type="button" onClick={() => openStoreForAsset()} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs inline-flex items-center gap-1.5"><ShoppingBag size={14} /> Shop prints{store.cart.itemCount ? ` (${store.cart.itemCount})` : ""}</button> : null}
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
                fontFamily: headingFontFamily(branding.headingFont),
                fontSize: "clamp(1.35rem, 2.35vw, 2.15rem)",
                lineHeight: 1.18,
                fontWeight: 600,
                letterSpacing: branding.headingFont === "modern" ? ".08em" : ".02em",
                textTransform: branding.headingFont === "modern" ? "uppercase" : "none",
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
        <section className="max-w-[1500px] mx-auto px-6 md:px-10 py-16 text-center"><p className="text-[10px] uppercase tracking-[0.28em]" style={{ opacity: .58 }}>Private gallery</p><h1 style={{ fontFamily: headingFontFamily(branding.headingFont), fontSize: "clamp(1.7rem, 3vw, 2.8rem)", lineHeight: 1.18, fontWeight: 500, marginTop: 12 }}>{payload.title}</h1></section>
      )}

      <main className="max-w-[1500px] mx-auto px-4 md:px-8 py-10 md:py-12">
        {error ? <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
        {payload.intro ? <p style={{ fontFamily: headingFontFamily(branding.headingFont), fontSize: "clamp(1.15rem,2vw,1.55rem)", lineHeight: 1.55, maxWidth: 760, margin: "0 auto 42px", textAlign: "center", color: branding.textColor, opacity: .78 }}>{payload.intro}</p> : null}

        {activeSelectionRequest ? (
          <section className="mb-8 rounded-2xl border border-black/10 px-5 py-4" style={{ background: branding.surfaceColor }}>
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
                    className="rounded-lg px-4 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-40"
                    style={{ background: branding.accentColor, color: accentTextColor }}
                  >
                    <Send size={15} /> {selectionBusy ? "Saving…" : "Submit selection"}
                  </button>
                )}
              </div>
            </div>
            {activeSelection?.status === "submitted" ? <p className="mt-3 text-xs text-neutral-500">Your selection is locked after submission. Your photographer can reopen it if changes are needed.</p> : <p className="mt-3 text-xs text-neutral-500">Use the check icon on each photograph. Changes save automatically until you submit.</p>}
          </section>
        ) : null}

        {albums.length ? (
          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
            <button type="button" onClick={() => setActiveAlbumId("")} className="shrink-0 rounded-lg px-4 py-2 text-sm border" style={{ background: !activeAlbumId ? branding.accentColor : branding.surfaceColor, color: !activeAlbumId ? accentTextColor : branding.textColor, borderColor: !activeAlbumId ? branding.accentColor : `${branding.textColor}25` }}>All Photos <span className="ml-1 opacity-60">{images.length}</span></button>
            {albums.map((album) => <button key={album.id} type="button" onClick={() => setActiveAlbumId(album.id)} className="shrink-0 rounded-lg px-4 py-2 text-sm border" style={{ background: activeAlbumId === album.id ? branding.accentColor : branding.surfaceColor, color: activeAlbumId === album.id ? accentTextColor : branding.textColor, borderColor: activeAlbumId === album.id ? branding.accentColor : `${branding.textColor}25` }}>{album.name} <span className="ml-1 opacity-60">{album.assetCount}</span></button>)}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap border-b border-black/10 pb-4">
          <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">{displayImages.length} photograph{displayImages.length === 1 ? "" : "s"}{activeAlbumId ? " in this album" : ""}</p>
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            {payload.allowFavourites && favouriteImages.length ? <span>{payload.authenticated ? "Your favourites are synced to your secure account." : payload.secureSignInAvailable ? "Your favourites are saved on this device. Sign in to sync across devices." : "Your favourites are saved on this device."}</span> : null}
            <span className="inline-flex items-center gap-1.5"><Download size={14} /> {payload.allowDownloads ? `${images.filter((image) => image.hasOriginal).length} originals available` : payload.galleryDownloadsEnabled ? "Originals reserved for authorised clients" : "Downloads disabled"}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(205px, 1fr))", gap: 8 }}>
          {displayImages.map((image, index) => (
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
                {store?.enabled ? <button type="button" onClick={(event) => { event.stopPropagation(); openStoreForAsset(image.assetId); }} aria-label="Order a print" title="Order a print" style={{ width: 32, height: 32, borderRadius: 999, border: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.92)", color: "#111", boxShadow: "0 3px 16px rgba(0,0,0,.14)" }}><ShoppingBag size={15} /></button> : null}
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
        {!displayImages.length ? <div className="text-center py-20 text-neutral-500">{activeAlbumId ? "This album does not contain any visible images yet." : "This gallery does not contain any visible images yet."}</div> : null}
      </main>

      {showStore && store?.enabled ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 1250, background: "rgba(0,0,0,.5)", display: "flex", justifyContent: "flex-end" }} onMouseDown={() => setShowStore(false)}>
          <aside className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl" style={{ color: "#111" }} onMouseDown={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-black/10 bg-white px-5 py-4"><div><div className="flex items-center gap-2"><ShoppingBag size={18} /><h2 className="text-lg font-semibold">Shop prints</h2></div><p className="mt-1 text-xs text-neutral-500">{store.intro || "Order professional prints from your private gallery."}</p></div><button type="button" onClick={() => setShowStore(false)} aria-label="Close Print Store"><X size={19} /></button></div>
            <div className="p-5">
              {checkoutOrder ? <div className={`mb-5 rounded-2xl border p-5 ${checkoutOrder.paymentStatus === "paid" ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}><strong className="text-sm">Order {checkoutOrder.orderNumber}</strong><p className="mt-2 text-sm">{checkoutOrder.paymentStatus === "paid" ? (checkoutOrder.requiresPhotographerApproval ? "Payment confirmed. Awaiting photographer approval." : "Payment confirmed. Order received.") : checkoutOrder.paymentStatus === "processing" ? "Payment is being processed by Stripe." : "Payment has not been completed."}</p><p className="mt-2 text-xs text-neutral-500">Total {formatStoreMoney(checkoutOrder.totalMinor, checkoutOrder.currency)} · {checkoutOrder.status.replaceAll("_", " ")} · {checkoutOrder.paymentStatus.replaceAll("_", " ")}</p>{["unpaid", "failed", "expired"].includes(checkoutOrder.paymentStatus) ? <button type="button" onClick={resumeStorePayment} disabled={storeBusy || !store.checkoutEnabled} className="mt-3 rounded-xl bg-black px-4 py-2 text-xs text-white disabled:opacity-40">{storeBusy ? "Opening…" : "Resume secure payment"}</button> : null}</div> : null}
              <section>
                <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">1. Choose a photograph</h3><p className="mt-1 text-xs text-neutral-500">The photograph remains linked to its canonical gallery asset.</p></div>{storeAssetId ? <button type="button" onClick={() => setStoreAssetId("")} className="text-xs underline">Change</button> : null}</div>
                {storeAssetId ? (() => { const image = images.find((candidate) => candidate.assetId === storeAssetId); return image ? <div className="mt-3 flex items-center gap-3 rounded-xl border border-black/10 p-3"><div className="h-24 w-32 overflow-hidden rounded-lg bg-neutral-100"><GalleryImage image={image} baseOrigin={publicAssetOrigin} mode="tile" /></div><div className="min-w-0"><strong className="text-sm">Selected photograph</strong><p className="mt-1 truncate text-xs text-neutral-500">{image.filename}</p></div></div> : null; })() : <div className="mt-3 grid grid-cols-4 gap-2">{images.slice(0, 80).map((image) => <button key={image.assetId} type="button" onClick={() => setStoreAssetId(image.assetId)} className="overflow-hidden rounded-lg border border-black/10" style={{ aspectRatio: "1/1" }}><GalleryImage image={image} baseOrigin={publicAssetOrigin} mode="tile" /></button>)}</div>}
              </section>
              <section className="mt-6 border-t border-black/10 pt-5"><h3 className="text-sm font-semibold">2. Choose a product</h3><select value={storeVariantId} onChange={(event) => { setStoreVariantId(event.target.value); setStoreCrop({ x: 0, y: 0, width: 1, height: 1, rotation: 0 }); }} className="mt-3 w-full rounded-xl border border-black/15 bg-white px-4 py-3">{store.products.map((product) => <optgroup key={product.id} label={product.name}>{product.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name} · {formatStoreMoney(variant.priceMinor, variant.currency)}</option>)}</optgroup>)}</select>
                {selectedStoreVariant ? <p className="mt-2 text-xs text-neutral-500">{selectedStoreVariant.widthMm && selectedStoreVariant.heightMm ? `${selectedStoreVariant.widthMm} × ${selectedStoreVariant.heightMm} mm` : selectedStoreVariant.finish || "Product option"}</p> : null}
                {showStoreCrop ? <div className="mt-4 rounded-xl border border-black/10 bg-neutral-50 p-4"><div className="flex items-center gap-2"><Crop size={15} /><strong className="text-sm">Crop choice</strong></div><p className="mt-1 text-xs text-neutral-500">Non-destructive crop coordinates are stored with the order for approval.</p><div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <label><span>Horizontal start</span><input type="range" min="0" max={Math.max(0, 1 - storeCrop.width)} step="0.01" value={storeCrop.x} onChange={(event) => setStoreCrop((current) => ({ ...current, x: Math.min(Number(event.target.value), Math.max(0, 1 - current.width)) }))} className="mt-1 w-full" /></label>
                  <label><span>Vertical start</span><input type="range" min="0" max={Math.max(0, 1 - storeCrop.height)} step="0.01" value={storeCrop.y} onChange={(event) => setStoreCrop((current) => ({ ...current, y: Math.min(Number(event.target.value), Math.max(0, 1 - current.height)) }))} className="mt-1 w-full" /></label>
                  <label><span>Width</span><input type="range" min="0.01" max={Math.max(0.01, 1 - storeCrop.x)} step="0.01" value={storeCrop.width} onChange={(event) => setStoreCrop((current) => ({ ...current, width: Math.min(Math.max(0.01, Number(event.target.value)), Math.max(0.01, 1 - current.x)) }))} className="mt-1 w-full" /></label>
                  <label><span>Height</span><input type="range" min="0.01" max={Math.max(0.01, 1 - storeCrop.y)} step="0.01" value={storeCrop.height} onChange={(event) => setStoreCrop((current) => ({ ...current, height: Math.min(Math.max(0.01, Number(event.target.value)), Math.max(0.01, 1 - current.y)) }))} className="mt-1 w-full" /></label>
                </div></div> : null}
                <div className="mt-4 flex items-center gap-3"><div className="inline-flex items-center rounded-lg border border-black/15"><button type="button" onClick={() => setStoreQuantity((value) => Math.max(1, value - 1))} className="p-2"><Minus size={14} /></button><span className="min-w-9 text-center text-sm">{storeQuantity}</span><button type="button" onClick={() => setStoreQuantity((value) => Math.min(99, value + 1))} className="p-2"><Plus size={14} /></button></div><button type="button" onClick={addStoreItem} disabled={storeBusy || !storeAssetId || !storeVariantId} className="flex-1 rounded-xl bg-black px-5 py-3 text-sm text-white disabled:opacity-40">{storeBusy ? "Saving…" : "Add to cart"}</button></div>
              </section>
              <section className="mt-6 border-t border-black/10 pt-5"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Cart</h3><strong>{formatStoreMoney(store.cart.subtotalMinor, store.currency)}</strong></div>{store.minimumOrderMinor > 0 ? <p className="mt-1 text-xs text-neutral-500">Minimum order {formatStoreMoney(store.minimumOrderMinor, store.currency)}</p> : null}<div className="mt-3 space-y-2">{store.cart.items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-black/10 p-3"><div className="h-14 w-16 overflow-hidden rounded-lg bg-neutral-100">{item.thumbSrc ? <img src={resolveAssetUrl(item.thumbSrc, publicAssetOrigin)} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0 flex-1"><strong className="text-sm">{item.productName} · {item.variantName}</strong><p className="mt-1 truncate text-xs text-neutral-500">{item.filename}</p><p className="mt-1 text-xs">{formatStoreMoney(item.lineTotalMinor, store.currency)}</p></div><div className="flex items-center gap-1"><button type="button" onClick={() => updateStoreItem(item, Math.max(1, item.quantity - 1))} className="rounded p-1"><Minus size={13} /></button><span className="w-5 text-center text-xs">{item.quantity}</span><button type="button" onClick={() => updateStoreItem(item, Math.min(99, item.quantity + 1))} className="rounded p-1"><Plus size={13} /></button><button type="button" onClick={() => removeStoreItem(item.id)} className="ml-1 rounded p-1 text-red-700"><Trash2 size={14} /></button></div></div>)}{!store.cart.items.length ? <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">Your cart is empty.</p> : null}</div>
              </section>
              {store.cart.items.length ? <section className="mt-6 border-t border-black/10 pt-5"><h3 className="text-sm font-semibold">3. Secure checkout</h3><div className="mt-3 grid grid-cols-2 gap-3"><input value={checkoutName} onChange={(event) => setCheckoutName(event.target.value)} placeholder="Your name" className="rounded-xl border border-black/15 px-4 py-3" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="rounded-xl border border-black/15 px-4 py-3" /><textarea value={checkoutNotes} onChange={(event) => setCheckoutNotes(event.target.value)} placeholder="Order notes (optional)" rows={3} className="col-span-2 rounded-xl border border-black/15 px-4 py-3" /></div><button type="button" onClick={submitStoreOrder} disabled={storeBusy || !store.checkoutEnabled || store.cart.subtotalMinor < store.minimumOrderMinor} className="mt-3 w-full rounded-xl px-5 py-3 text-sm text-white disabled:opacity-40" style={{ background: branding.accentColor, color: accentTextColor }}>{storeBusy ? "Opening secure payment…" : "Pay securely with Stripe"}</button><p className="mt-3 text-[11px] leading-relaxed text-neutral-500">Stripe securely collects payment and delivery details. MKB validates the order total on the server, and only a verified Stripe payment updates the order. {store.requirePhotographerApproval ? "Your crop and product choices then move to photographer review." : "The order is recorded as paid after confirmation."}</p>{!store.checkoutEnabled ? <p className="mt-2 text-xs text-amber-700">Secure payment is not configured yet. Please contact the photographer.</p> : null}</section> : null}
              {storeMessage ? <p className="mt-4 rounded-xl bg-neutral-100 p-3 text-sm">{storeMessage}</p> : null}
            </div>
          </aside>
        </div>
      ) : null}

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

      <footer className="border-t border-black/10 py-9 px-6 text-center text-xs tracking-wide" style={{ background: `${branding.surfaceColor}99`, opacity: .72 }}>
        Private gallery delivered by {payload.businessName}.
      </footer>

      {lightboxIndex !== null && displayImages[lightboxIndex] ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.95)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <button onClick={() => setLightboxIndex(null)} aria-label="Close image" className="rounded-full bg-white p-2" style={{ position: "absolute", top: 18, right: 18, zIndex: 2 }}><X className="h-5 w-5" /></button>
          <div style={{ width: "96vw", height: "91vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GalleryImage image={displayImages[lightboxIndex]} baseOrigin={publicAssetOrigin} mode="lightbox" />
          </div>
          <div style={{ position: "absolute", bottom: 22, display: "flex", alignItems: "center", gap: 9 }}>
            {activeSelectionRequest ? <button type="button" disabled={selectionBusy || activeSelection?.status === "submitted"} onClick={() => updateSelection(displayImages[lightboxIndex].assetId, !selectedAssetIds.has(displayImages[lightboxIndex].assetId))} className="rounded-full bg-white px-4 py-2 inline-flex items-center gap-2 text-sm disabled:opacity-50"><Check className="h-4 w-4" /> {selectedAssetIds.has(displayImages[lightboxIndex].assetId) ? "Selected" : "Select"}</button> : null}
            {store?.enabled ? <button type="button" onClick={() => { setLightboxIndex(null); openStoreForAsset(displayImages[lightboxIndex].assetId); }} className="rounded-full bg-white px-4 py-2 inline-flex items-center gap-2 text-sm"><ShoppingBag className="h-4 w-4" /> Order print</button> : null}
            <DownloadControl enabled={payload.allowDownloads && displayImages[lightboxIndex].hasOriginal} busy={downloading.has(displayImages[lightboxIndex].assetId)} onClick={() => downloadOriginal(displayImages[lightboxIndex])} />
            {payload.allowFavourites ? <button onClick={() => toggleFavourite(displayImages[lightboxIndex].assetId)} className="rounded-full bg-white px-4 py-2 inline-flex items-center gap-2 text-sm"><Heart className="h-4 w-4" fill={favourites.has(displayImages[lightboxIndex].assetId) ? "currentColor" : "none"} /> Favourite</button> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
