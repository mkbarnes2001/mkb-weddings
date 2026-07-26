type StripeEnv = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_SHIPPING_COUNTRIES?: string;
  STRIPE_CHECKOUT_ENABLED?: string;
  STRIPE_API_BASE?: string;
  STRIPE_WEBHOOK_TOLERANCE_SECONDS?: string;
};

type CheckoutOrderItem = {
  productName: string;
  variantName: string;
  quantity: number;
  unitPriceMinor: number;
};

export type CheckoutOrder = {
  id: string;
  orderNumber: string;
  galleryId: string;
  email: string;
  clientName: string;
  currency: string;
  totalMinor: number;
  checkoutAttempt: number;
  checkoutSessionId?: string;
  paymentStatus?: string;
  items: CheckoutOrderItem[];
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function integer(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function truthy(value: unknown, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}

function apiBase(env: StripeEnv) {
  return text(env.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/+$/, "");
}

export function stripeCheckoutConfigured(env: StripeEnv) {
  return truthy(env.STRIPE_CHECKOUT_ENABLED, true) && text(env.STRIPE_SECRET_KEY).startsWith("sk_");
}

export function stripeWebhookConfigured(env: StripeEnv) {
  return text(env.STRIPE_WEBHOOK_SECRET).startsWith("whsec_");
}

export function stripeKeyMode(env: StripeEnv): "test" | "live" | "unknown" {
  const key = text(env.STRIPE_SECRET_KEY);
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  return "unknown";
}

function shippingCountries(env: StripeEnv) {
  const values = text(env.STRIPE_SHIPPING_COUNTRIES || "GB,IE")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^[A-Z]{2}$/.test(value));
  const countries = Array.from(new Set(values)).slice(0, 50);
  return countries.length ? countries : ["GB", "IE"];
}

function stripeError(payload: any, status: number) {
  const message = text(payload?.error?.message || payload?.message || `Stripe request failed (${status}).`);
  const error = new Error(message) as Error & { statusCode?: number; stripeCode?: string; stripeType?: string };
  error.statusCode = status >= 400 && status < 500 ? 400 : 502;
  error.stripeCode = text(payload?.error?.code);
  error.stripeType = text(payload?.error?.type);
  return error;
}

async function stripeRequest(env: StripeEnv, path: string, options: RequestInit = {}) {
  const secretKey = text(env.STRIPE_SECRET_KEY);
  if (!stripeCheckoutConfigured(env)) {
    const error = new Error("Stripe Checkout is not configured.") as Error & { statusCode?: number };
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch(`${apiBase(env)}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw stripeError(payload, response.status);
  return payload;
}

function aggregateCheckoutItems(items: CheckoutOrderItem[]) {
  const grouped = new Map<string, CheckoutOrderItem>();
  for (const source of items || []) {
    const quantity = Math.min(99, Math.max(1, integer(source.quantity, 1)));
    const unitPriceMinor = integer(source.unitPriceMinor);
    const productName = text(source.productName || "Print product").slice(0, 120);
    const variantName = text(source.variantName).slice(0, 120);
    const key = [productName, variantName, unitPriceMinor].join("|");
    const existing = grouped.get(key);
    if (existing) existing.quantity += quantity;
    else grouped.set(key, { productName, variantName, unitPriceMinor, quantity });
  }
  return Array.from(grouped.values());
}

export async function createStripeCheckoutSession(
  env: StripeEnv,
  order: CheckoutOrder,
  urls: { successUrl: string; cancelUrl: string },
) {
  const currency = text(order.currency || "GBP").toLowerCase();
  if (!/^[a-z]{3}$/.test(currency)) throw new Error("The order currency is invalid.");
  if (!integer(order.totalMinor)) throw new Error("The order total must be greater than zero.");

  const lineItems = aggregateCheckoutItems(order.items);
  if (!lineItems.length) throw new Error("The order has no payable items.");
  const computedTotal = lineItems.reduce((total, item) => total + item.unitPriceMinor * item.quantity, 0);
  if (computedTotal !== integer(order.totalMinor)) throw new Error("The checkout total does not match the order total.");

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", urls.successUrl);
  params.set("cancel_url", urls.cancelUrl);
  params.set("client_reference_id", text(order.id).slice(0, 200));
  params.set("locale", "auto");
  params.set("submit_type", "pay");
  params.set("billing_address_collection", "auto");
  params.set("phone_number_collection[enabled]", "true");
  if (text(order.email)) params.set("customer_email", text(order.email));
  params.set("metadata[order_id]", text(order.id));
  params.set("metadata[order_number]", text(order.orderNumber));
  params.set("metadata[gallery_id]", text(order.galleryId));
  params.set("payment_intent_data[metadata][order_id]", text(order.id));
  params.set("payment_intent_data[metadata][order_number]", text(order.orderNumber));
  params.set("payment_intent_data[metadata][gallery_id]", text(order.galleryId));
  for (const country of shippingCountries(env)) params.append("shipping_address_collection[allowed_countries][]", country);

  lineItems.forEach((item, index) => {
    const prefix = `line_items[${index}]`;
    params.set(`${prefix}[price_data][currency]`, currency);
    params.set(`${prefix}[price_data][unit_amount]`, String(item.unitPriceMinor));
    params.set(`${prefix}[price_data][product_data][name]`, [item.productName, item.variantName].filter(Boolean).join(" · ").slice(0, 120));
    params.set(`${prefix}[quantity]`, String(item.quantity));
  });

  const attempt = integer(order.checkoutAttempt) + 1;
  const session = await stripeRequest(env, "/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `mkb-checkout-${text(order.id)}-${attempt}`.slice(0, 255),
    },
    body: params.toString(),
  });
  return { session, attempt };
}

export async function retrieveStripeCheckoutSession(env: StripeEnv, sessionId: string) {
  const id = text(sessionId);
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) throw new Error("Invalid Stripe Checkout Session ID.");
  return stripeRequest(env, `/v1/checkout/sessions/${encodeURIComponent(id)}?expand[]=payment_intent`);
}

function parseStripeSignature(header: string) {
  const values = String(header || "").split(",").map((part) => part.trim()).filter(Boolean);
  const timestamp = values.find((part) => part.startsWith("t="))?.slice(2) || "";
  const signatures = values.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  return { timestamp, signatures };
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function secureHexEqual(left: string, right: string) {
  if (left.length !== right.length || left.length === 0) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function verifyStripeWebhook(
  env: StripeEnv,
  rawBody: string,
  signatureHeader: string,
) {
  const endpointSecret = text(env.STRIPE_WEBHOOK_SECRET);
  if (!stripeWebhookConfigured(env)) {
    const error = new Error("Stripe webhook verification is not configured.") as Error & { statusCode?: number };
    error.statusCode = 503;
    throw error;
  }
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || !signatures.length) {
    const error = new Error("Invalid Stripe-Signature header.") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  const tolerance = Math.max(30, integer(env.STRIPE_WEBHOOK_TOLERANCE_SECONDS, 300));
  const age = Math.abs(Math.floor(Date.now() / 1000) - timestampNumber);
  if (age > tolerance) {
    const error = new Error("Stripe webhook timestamp is outside the accepted tolerance.") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(endpointSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`)));
  if (!signatures.some((signature) => secureHexEqual(expected, signature))) {
    const error = new Error("Stripe webhook signature verification failed.") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  const event = JSON.parse(rawBody || "{}");
  if (!text(event?.id) || !text(event?.type) || !event?.data?.object) {
    const error = new Error("Stripe webhook payload is invalid.") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  return event;
}

export function sanitizedStripeEventPayload(event: any) {
  const object = event?.data?.object || {};
  const paymentIntent = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id;
  const shipping = object.collected_information?.shipping_details || object.shipping_details || null;
  return {
    id: text(event?.id),
    type: text(event?.type),
    created: integer(event?.created),
    livemode: Boolean(event?.livemode),
    object: {
      id: text(object?.id),
      object: text(object?.object),
      status: text(object?.status),
      paymentStatus: text(object?.payment_status),
      amountTotal: integer(object?.amount_total || object?.amount_received || object?.amount),
      amountRefunded: integer(object?.amount_refunded),
      currency: text(object?.currency).toUpperCase(),
      paymentIntentId: text(paymentIntent),
      orderId: text(object?.metadata?.order_id || object?.client_reference_id),
      customerEmail: text(object?.customer_details?.email || object?.receipt_email),
      customerName: text(object?.customer_details?.name || shipping?.name),
      customerPhone: text(object?.customer_details?.phone),
      shipping: shipping ? {
        name: text(shipping?.name),
        address: shipping?.address || {},
      } : null,
    },
  };
}
