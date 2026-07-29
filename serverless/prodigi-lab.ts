import { getDefaultWorkspaceId } from "./workspace-d1";

type D1Db = any;
type R2BucketLike = any;

export type ProdigiEnv = {
  PRODIGI_API_KEY?: string;
  PRODIGI_ENVIRONMENT?: string;
  PRODIGI_API_BASE?: string;
  PRODIGI_CALLBACK_TOKEN?: string;
  PRODIGI_ENABLED?: string;
  PRODIGI_LIVE_SUBMISSION_ENABLED?: string;
  PUBLIC_SITE_ORIGIN?: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

async function resolvedWorkspaceId(db: D1Db, workspaceId?: string) {
  return text(workspaceId) || await getDefaultWorkspaceId(db);
}

function integer(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function json(value: unknown, fallback: any = {}) {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(text(value) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function safeJson(value: unknown) {
  return JSON.stringify(value && typeof value === "object" ? value : {});
}

function truthy(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === 1 || value === "1" || text(value).toLowerCase() === "true";
}

function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & { statusCode?: number; details?: string[] };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function apiBase(env: ProdigiEnv) {
  const override = text(env.PRODIGI_API_BASE).replace(/\/+$/, "");
  if (override) return override;
  return text(env.PRODIGI_ENVIRONMENT).toLowerCase() === "live"
    ? "https://api.prodigi.com"
    : "https://api.sandbox.prodigi.com";
}

export function prodigiMode(env: ProdigiEnv): "sandbox" | "live" {
  return apiBase(env).includes("sandbox") ? "sandbox" : "live";
}

export function prodigiConfigured(env: ProdigiEnv) {
  return truthy(env.PRODIGI_ENABLED, false) && text(env.PRODIGI_API_KEY).length >= 12;
}

function collectProdigiErrorDetails(value: unknown, prefix = "", depth = 0): string[] {
  if (depth > 4 || value === null || value === undefined) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const clean = text(value);
    return clean ? [`${prefix ? `${prefix}: ` : ""}${clean}`] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectProdigiErrorDetails(item, prefix || `item ${index + 1}`, depth + 1));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
      const nextPrefix = [prefix, key].filter(Boolean).join(".");
      return collectProdigiErrorDetails(item, nextPrefix, depth + 1);
    });
  }
  return [];
}

function prodigiError(payload: any, status: number, responseText = "") {
  const message = text(payload?.statusText || payload?.message || payload?.error || `Prodigi request failed (${status}).`);
  const details = [
    ...collectProdigiErrorDetails(payload?.data),
    ...(!payload?.data && responseText ? [responseText.slice(0, 500)] : []),
    ...(text(payload?.traceParent) ? [`Prodigi trace: ${text(payload.traceParent)}`] : []),
  ].filter((value, index, all) => value && all.indexOf(value) === index);
  return httpError(message, status >= 400 && status < 500 ? 400 : 502, details);
}

async function prodigiRequest(env: ProdigiEnv, path: string, options: RequestInit = {}) {
  if (!prodigiConfigured(env)) throw httpError("Prodigi is not configured or is currently disabled.", 503);
  const response = await fetch(`${apiBase(env)}${path}`, {
    ...options,
    headers: {
      "X-API-Key": text(env.PRODIGI_API_KEY),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const responseText = await response.text();
  let payload: any = {};
  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch {
    payload = {};
  }
  if (!response.ok) throw prodigiError(payload, response.status, responseText);
  return payload;
}

function cleanSku(value: unknown) {
  const sku = text(value).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{2,100}$/.test(sku)) throw httpError("Enter a valid Prodigi SKU.");
  return sku;
}

function cleanSizing(value: unknown) {
  const sizing = text(value);
  return ["fitPrintArea", "stretchToPrintArea"].includes(sizing) ? sizing : "fillPrintArea";
}

function cleanShippingMethod(value: unknown) {
  const input = text(value).toLowerCase().replace(/\s+/g, "");
  const methods: Record<string, string> = {
    budget: "Budget",
    standard: "Standard",
    standardplus: "StandardPlus",
    express: "Express",
    overnight: "Overnight",
  };
  return methods[input] || "Budget";
}

function normaliseAttributes(value: unknown) {
  const source = json(value, {});
  const attributes: Record<string, string> = {};
  for (const [key, raw] of Object.entries(source || {})) {
    const cleanKey = text(key).slice(0, 80);
    const cleanValue = text(raw).slice(0, 120);
    if (cleanKey && cleanValue) attributes[cleanKey] = cleanValue;
  }
  return attributes;
}

function attributeMatch(candidate: Record<string, unknown>, requested: Record<string, string>) {
  return Object.entries(requested).every(([key, value]) => text(candidate?.[key]).toLowerCase() === value.toLowerCase());
}

export async function getProdigiProduct(env: ProdigiEnv, skuInput: string) {
  const sku = cleanSku(skuInput);
  const payload = await prodigiRequest(env, `/v4.0/products/${encodeURIComponent(sku)}`);
  if (!payload?.product) throw httpError("Prodigi did not return product details.", 502);
  return payload.product;
}

export async function verifyProdigiVariantMapping(
  db: D1Db,
  env: ProdigiEnv,
  input: { variantId: string; sku: string; attributes?: Record<string, string>; printArea?: string; sizing?: string },
  workspaceIdInput?: string,
) {
  const workspaceId = await resolvedWorkspaceId(db, workspaceIdInput);
  const variantId = text(input.variantId);
  if (!variantId) throw httpError("Product option is required.");
  const variant = await db.prepare(`
    SELECT cpv.id, cpv.product_id, cp.workspace_id
    FROM commerce_product_variants cpv
    JOIN commerce_products cp ON cp.id = cpv.product_id
    WHERE cpv.id = ? LIMIT 1
  `).bind(variantId).first();
  if (!variant || text(variant.workspace_id) !== workspaceId) throw httpError("Product option not found.", 404);

  const product = await getProdigiProduct(env, input.sku);
  const attributes = normaliseAttributes(input.attributes);
  const printArea = text(input.printArea || "default") || "default";
  if (!product?.printAreas?.[printArea]) throw httpError(`Prodigi product ${product.sku} does not support print area '${printArea}'.`, 409);
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const matched = variants.find((candidate: any) => attributeMatch(candidate?.attributes || {}, attributes))
    || (Object.keys(attributes).length ? null : variants[0]);
  if (!matched) throw httpError("The selected Prodigi attributes do not match an available product variant.", 409);
  const dimensions = matched?.printAreaSizes?.[printArea] || {};
  const width = integer(dimensions.horizontalResolution);
  const height = integer(dimensions.verticalResolution);
  if (!width || !height) throw httpError("Prodigi did not provide recommended print dimensions for this mapping.", 409);

  await db.prepare(`UPDATE commerce_products SET lab_connector_key = 'prodigi', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(text(variant.product_id), workspaceId).run();
  await db.prepare(`
    UPDATE commerce_product_variants SET
      lab_sku = ?, lab_attributes_json = ?, lab_print_area = ?, lab_sizing = ?,
      recommended_width_px = ?, recommended_height_px = ?, lab_mapping_status = 'verified',
      lab_mapping_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    text(product.sku),
    safeJson(attributes),
    printArea,
    cleanSizing(input.sizing),
    width,
    height,
    variantId,
  ).run();

  return {
    sku: text(product.sku),
    description: text(product.description),
    productDimensions: product.productDimensions || {},
    attributes,
    availableAttributes: product.attributes || {},
    printArea,
    sizing: cleanSizing(input.sizing),
    recommendedWidthPx: width,
    recommendedHeightPx: height,
    shipsTo: Array.isArray(matched.shipsTo) ? matched.shipsTo : [],
    mode: prodigiMode(env),
  };
}

function jpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw httpError("Prepared print file must be a valid JPEG.");
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) break;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) break;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return { width, height };
    }
    offset += length;
  }
  throw httpError("Unable to read JPEG dimensions.");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function savePreparedPrintAsset(
  db: D1Db,
  bucket: R2BucketLike,
  orderIdInput: string,
  itemIdInput: string,
  body: ArrayBuffer,
  input: { sourceWidthPx?: unknown; sourceHeightPx?: unknown },
  workspaceIdInput?: string,
) {
  if (!bucket) throw httpError("Private print storage is not configured.", 503);
  const workspaceId = await resolvedWorkspaceId(db, workspaceIdInput);
  const orderId = text(orderIdInput);
  const itemId = text(itemIdInput);
  const row = await db.prepare(`
    SELECT co.id AS order_id, co.workspace_id, co.status AS order_status, co.payment_status,
      coi.id AS item_id, coi.asset_id, coi.crop_json, coi.recommended_width_px, coi.recommended_height_px,
      coi.fulfilment_status
    FROM commerce_orders co
    JOIN commerce_order_items coi ON coi.order_id = co.id
    WHERE co.id = ? AND coi.id = ? LIMIT 1
  `).bind(orderId, itemId).first();
  if (!row || text(row.workspace_id) !== workspaceId) throw httpError("Order item not found.", 404);
  if (text(row.payment_status) !== "paid") throw httpError("The order must have a verified payment before preparing print files.", 409);
  if (!["in_review", "approved", "in_fulfilment"].includes(text(row.order_status))) {
    throw httpError("Move the paid order to review before preparing print files.", 409);
  }
  if (["submitted", "fulfilled"].includes(text(row.fulfilment_status))) throw httpError("This line has already been submitted to a lab.", 409);
  const expectedWidth = integer(row.recommended_width_px);
  const expectedHeight = integer(row.recommended_height_px);
  if (!expectedWidth || !expectedHeight) throw httpError("Verify the Prodigi product mapping before preparing this line.", 409);
  if (!body.byteLength || body.byteLength > 40 * 1024 * 1024) throw httpError("Prepared JPEG must be between 1 byte and 40 MB.");
  const dimensions = jpegDimensions(new Uint8Array(body));
  if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
    throw httpError(`Prepared JPEG must be exactly ${expectedWidth} × ${expectedHeight}px.`, 409);
  }

  const existing = await db.prepare(`SELECT id, storage_key FROM commerce_print_assets WHERE order_item_id = ? LIMIT 1`).bind(itemId).first();
  const id = text(existing?.id) || `print_asset_${crypto.randomUUID()}`;
  const storageKey = `print-store/prepared/${workspaceId}/${orderId}/${itemId}/${crypto.randomUUID()}.jpg`;
  const accessToken = randomToken();
  await bucket.put(storageKey, body, {
    httpMetadata: { contentType: "image/jpeg", cacheControl: "private, no-store" },
    customMetadata: { workspaceId, orderId, orderItemId: itemId, sourceAssetId: text(row.asset_id) },
  });
  await db.prepare(`
    INSERT INTO commerce_print_assets (
      id, workspace_id, order_item_id, asset_id, storage_key, access_token, token_expires_at,
      mime_type, width_px, height_px, source_width_px, source_height_px, file_size,
      crop_json, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+30 days'), 'image/jpeg', ?, ?, ?, ?, ?, ?, 'prepared', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(order_item_id) DO UPDATE SET
      storage_key = excluded.storage_key,
      access_token = excluded.access_token,
      token_expires_at = excluded.token_expires_at,
      mime_type = excluded.mime_type,
      width_px = excluded.width_px,
      height_px = excluded.height_px,
      source_width_px = excluded.source_width_px,
      source_height_px = excluded.source_height_px,
      file_size = excluded.file_size,
      crop_json = excluded.crop_json,
      status = 'prepared',
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    id,
    workspaceId,
    itemId,
    text(row.asset_id),
    storageKey,
    accessToken,
    dimensions.width,
    dimensions.height,
    integer(input.sourceWidthPx),
    integer(input.sourceHeightPx),
    body.byteLength,
    safeJson(json(row.crop_json, {})),
  ).run();
  if (existing?.storage_key && text(existing.storage_key) !== storageKey) {
    await bucket.delete(text(existing.storage_key)).catch(() => {});
  }
  return { id, orderItemId: itemId, widthPx: dimensions.width, heightPx: dimensions.height, fileSize: body.byteLength, status: "prepared" };
}

export async function resolvePreparedPrintAsset(db: D1Db, tokenInput: string) {
  const token = text(tokenInput);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return db.prepare(`
    SELECT * FROM commerce_print_assets
    WHERE access_token = ? AND status IN ('prepared', 'submitted')
      AND datetime(token_expires_at) > CURRENT_TIMESTAMP
    LIMIT 1
  `).bind(token).first();
}

async function orderForLab(db: D1Db, orderIdInput: string, selectedItemIds: string[] = [], workspaceIdInput?: string) {
  const workspaceId = await resolvedWorkspaceId(db, workspaceIdInput);
  const orderId = text(orderIdInput);
  const order = await db.prepare(`SELECT * FROM commerce_orders WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(orderId, workspaceId).first();
  if (!order) throw httpError("Order not found.", 404);
  const rows = await db.prepare(`
    SELECT coi.*, cpa.access_token, cpa.token_expires_at, cpa.status AS print_asset_status,
      cpa.width_px AS prepared_width_px, cpa.height_px AS prepared_height_px
    FROM commerce_order_items coi
    LEFT JOIN commerce_print_assets cpa ON cpa.order_item_id = coi.id
    WHERE coi.order_id = ?
    ORDER BY coi.created_at ASC, coi.id ASC
  `).bind(orderId).all();
  const selected = new Set((selectedItemIds || []).map(text).filter(Boolean));
  const items = (rows.results || []).filter((row: any) => !selected.size || selected.has(text(row.id)));
  if (!items.length) throw httpError("Select at least one order line.");
  return { workspaceId, order, items };
}

function shippingAddress(order: any) {
  const source = json(order.shipping_address_json, {});
  const name = text(order.shipping_name || order.client_name);
  const email = text(order.email);
  const phoneNumber = text(order.shipping_phone);
  const line1 = text(source.line1);
  const line2 = text(source.line2);
  const postalOrZipCode = text(source.postal_code || source.postalCode);
  const countryCode = text(source.country).toUpperCase();
  const townOrCity = text(source.city);
  const stateOrCounty = text(source.state);
  const missing = [name, line1, postalOrZipCode, countryCode, townOrCity]
    .map((value, index) => value ? "" : ["recipient name", "address line 1", "postcode", "country", "town/city"][index])
    .filter(Boolean);
  if (missing.length) throw httpError("The delivery address is incomplete.", 409, missing);
  if (!/^[A-Z]{2}$/.test(countryCode)) throw httpError("The delivery country must use a two-letter country code.", 409);

  const recipient: Record<string, any> = {
    name,
    address: {
      line1,
      postalOrZipCode,
      countryCode,
      townOrCity,
      ...(line2 ? { line2 } : {}),
      ...(stateOrCounty ? { stateOrCounty } : {}),
    },
    ...(email ? { email } : {}),
    ...(phoneNumber ? { phoneNumber } : {}),
  };
  return recipient;
}

function callbackUrl(env: ProdigiEnv) {
  const origin = text(env.PUBLIC_SITE_ORIGIN).replace(/\/+$/, "");
  const token = text(env.PRODIGI_CALLBACK_TOKEN);
  if (!/^https:\/\//i.test(origin)) throw httpError("PUBLIC_SITE_ORIGIN must be a secure HTTPS URL.", 503);
  if (token.length < 24) throw httpError("PRODIGI_CALLBACK_TOKEN is not configured.", 503);
  return `${origin}/api/webhooks/prodigi?token=${encodeURIComponent(token)}`;
}

function preparedAssetUrl(env: ProdigiEnv, token: string) {
  const origin = text(env.PUBLIC_SITE_ORIGIN).replace(/\/+$/, "");
  if (!/^https:\/\//i.test(origin)) throw httpError("PUBLIC_SITE_ORIGIN must be a secure HTTPS URL.", 503);
  return `${origin}/api/print-assets/${encodeURIComponent(token)}`;
}

function validateLabItems(env: ProdigiEnv, order: any, items: any[], requirePrepared: boolean) {
  if (text(order.payment_status) !== "paid") throw httpError("A verified payment is required before lab submission.", 409);
  if (!["approved", "in_fulfilment"].includes(text(order.status))) throw httpError("Approve the order before submitting it to Prodigi.", 409);
  return items.map((item: any) => {
    if (text(item.lab_connector_key).toLowerCase() !== "prodigi") throw httpError(`${text(item.variant_name)} is not mapped to Prodigi.`, 409);
    if (!text(item.lab_sku)) throw httpError(`${text(item.variant_name)} does not have a verified Prodigi SKU.`, 409);
    if (!integer(item.recommended_width_px) || !integer(item.recommended_height_px)) throw httpError(`${text(item.variant_name)} is missing Prodigi print dimensions.`, 409);
    if (["submitted", "fulfilled"].includes(text(item.fulfilment_status))) throw httpError(`${text(item.variant_name)} has already been submitted.`, 409);
    if (requirePrepared && (!text(item.access_token) || !["prepared", "submitted"].includes(text(item.print_asset_status)))) {
      throw httpError(`Prepare the print-ready JPEG for ${text(item.variant_name)} before submission.`, 409);
    }
    return {
      merchantReference: text(item.id),
      sku: text(item.lab_sku),
      copies: Math.max(1, integer(item.quantity, 1)),
      sizing: cleanSizing(item.lab_sizing),
      attributes: normaliseAttributes(item.lab_attributes_json),
      assets: [{ printArea: text(item.lab_print_area || "default") || "default", ...(requirePrepared ? { url: preparedAssetUrl(env, text(item.access_token)) } : {}) }],
      recipientCost: {
        amount: (integer(item.line_total_minor) / 100).toFixed(2),
        currency: text(order.currency || "GBP").toUpperCase(),
      },
    };
  });
}

function quoteMinor(quote: any) {
  const items = Number(quote?.costSummary?.items?.amount ?? 0);
  const shipping = Number(quote?.costSummary?.shipping?.amount ?? 0);
  const amount = items + shipping;
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

export async function quoteProdigiOrder(db: D1Db, env: ProdigiEnv, input: any, workspaceIdInput?: string) {
  const { order, items } = await orderForLab(db, input?.orderId, input?.itemIds, workspaceIdInput);
  const recipient = shippingAddress(order);
  const shippingMethod = cleanShippingMethod(input?.shippingMethod);
  const quoteItems = validateLabItems(env, order, items, false).map((item) => ({
    sku: item.sku,
    copies: item.copies,
    attributes: item.attributes,
    assets: item.assets.map((asset) => ({ printArea: asset.printArea })),
  }));
  const payload = await prodigiRequest(env, "/v4.0/quotes", {
    method: "POST",
    body: JSON.stringify({
      shippingMethod,
      destinationCountryCode: recipient.address.countryCode,
      currencyCode: text(order.currency || "GBP").toUpperCase(),
      items: quoteItems,
    }),
  });
  const quotes = Array.isArray(payload?.quotes) ? payload.quotes : [];
  return {
    mode: prodigiMode(env),
    shippingMethod,
    quotes: quotes.map((quote: any) => ({
      shippingMethod: text(quote.shipmentMethod || quote.shippingMethod),
      amountMinor: quoteMinor(quote),
      currency: text(quote?.costSummary?.items?.currency || quote?.costSummary?.shipping?.currency || order.currency || "GBP").toUpperCase(),
      raw: quote,
    })),
  };
}

function submissionIdempotency(_orderId: string, _itemIds: string[]) {
  return crypto.randomUUID();
}

export async function submitProdigiOrder(db: D1Db, env: ProdigiEnv, input: any, workspaceIdInput?: string) {
  if (prodigiMode(env) === "live" && !truthy(env.PRODIGI_LIVE_SUBMISSION_ENABLED, false)) {
    throw httpError("Live Prodigi submission is locked. Enable PRODIGI_LIVE_SUBMISSION_ENABLED only after sandbox validation and a physical sample order.", 503);
  }
  const { workspaceId, order, items } = await orderForLab(db, input?.orderId, input?.itemIds, workspaceIdInput);
  const recipient = shippingAddress(order);
  const shippingMethod = cleanShippingMethod(input?.shippingMethod);
  const providerItems = validateLabItems(env, order, items, true);
  const itemIds = items.map((item: any) => text(item.id));
  const retryCandidate = await db.prepare(`
    SELECT id, request_json
    FROM commerce_lab_submissions
    WHERE workspace_id = ? AND order_id = ? AND provider = 'prodigi'
      AND status = 'error' AND trim(provider_order_id) = ''
    ORDER BY created_at DESC LIMIT 1
  `).bind(workspaceId, text(order.id)).first();
  const candidatePayload = json(retryCandidate?.request_json, null);
  const candidateRefs = Array.isArray(candidatePayload?.items)
    ? candidatePayload.items.map((item: any) => text(item?.merchantReference)).sort()
    : [];
  const requestedRefs = [...itemIds].sort();
  const canRetry = Boolean(
    retryCandidate?.id
    && candidatePayload?.idempotencyKey
    && text(candidatePayload?.shippingMethod) === shippingMethod
    && candidateRefs.length === requestedRefs.length
    && candidateRefs.every((value: string, index: number) => value === requestedRefs[index])
  );
  const submissionId = canRetry ? text(retryCandidate.id) : `lab_submission_${crypto.randomUUID()}`;
  const candidateIdempotencyKey = text(candidatePayload?.idempotencyKey);
  const retryIdempotencyKey = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidateIdempotencyKey)
    ? candidateIdempotencyKey
    : submissionIdempotency(text(order.id), [...itemIds, submissionId]);
  const requestPayload = {
    merchantReference: text(order.order_number),
    shippingMethod,
    idempotencyKey: retryIdempotencyKey,
    callbackUrl: callbackUrl(env),
    recipient,
    items: providerItems,
    metadata: {
      platform: "MKB Intelligence",
      workspaceId,
      orderId: text(order.id),
      orderNumber: text(order.order_number),
    },
  };

  if (canRetry) {
    await db.prepare(`
      UPDATE commerce_lab_submissions SET
        status = 'draft', shipping_method = ?, request_json = ?, last_error = '', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(shippingMethod, safeJson(requestPayload), submissionId).run();
  } else {
    await db.prepare(`
      INSERT INTO commerce_lab_submissions (
        id, workspace_id, order_id, provider, status, shipping_method, request_json, created_at, updated_at
      ) VALUES (?, ?, ?, 'prodigi', 'draft', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(submissionId, workspaceId, text(order.id), shippingMethod, safeJson(requestPayload)).run();
  }

  try {
    const response = await prodigiRequest(env, "/v4.0/orders", { method: "POST", body: JSON.stringify(requestPayload) });
    const providerOrder = response?.order || response;
    const providerOrderId = text(providerOrder?.id || response?.id);
    if (!providerOrderId) throw httpError("Prodigi created the order but did not return an order ID.", 502);
    const outcome = text(response?.outcome || "created");
    const status = outcome === "createdWithIssues" ? "error" : (text(providerOrder?.status?.stage) === "Complete" ? "complete" : "submitted");
    const statements = [db.prepare(`
      UPDATE commerce_lab_submissions SET
        provider_order_id = ?, provider_outcome = ?, status = ?, response_json = ?,
        last_error = ?, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(providerOrderId, outcome, status, safeJson(response), status === "error" ? "Prodigi created the order with issues." : "", submissionId)];
    const returnedItems = Array.isArray(providerOrder?.items) ? providerOrder.items : [];
    for (const item of items) {
      const returned = returnedItems.find((candidate: any) => text(candidate?.merchantReference) === text(item.id));
      statements.push(db.prepare(`
        INSERT INTO commerce_lab_submission_items (submission_id, order_item_id, provider_item_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(submission_id, order_item_id) DO UPDATE SET
          provider_item_id = excluded.provider_item_id,
          status = excluded.status,
          updated_at = CURRENT_TIMESTAMP
      `).bind(submissionId, text(item.id), text(returned?.id), text(returned?.status || 'submitted')));
      statements.push(db.prepare(`UPDATE commerce_order_items SET fulfilment_status = 'submitted' WHERE id = ?`).bind(text(item.id)));
      statements.push(db.prepare(`UPDATE commerce_print_assets SET status = 'submitted', token_expires_at = datetime('now', '+30 days'), updated_at = CURRENT_TIMESTAMP WHERE order_item_id = ?`).bind(text(item.id)));
    }
    statements.push(db.prepare(`
      UPDATE commerce_orders SET status = 'in_fulfilment', lab_connector_key = 'prodigi', lab_reference = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(providerOrderId, text(order.id)));
    await db.batch(statements);
    return { submissionId, providerOrderId, outcome, status, mode: prodigiMode(env), response };
  } catch (error) {
    const typed = error as Error & { details?: string[] };
    const storedError = [typed?.message || "Prodigi submission failed.", ...(typed?.details || [])].filter(Boolean).join(" ").slice(0, 2000);
    await db.prepare(`
      UPDATE commerce_lab_submissions SET status = 'error', last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(storedError, submissionId).run();
    throw error;
  }
}

function providerStage(order: any) {
  return text(order?.status?.stage);
}

function providerHasErrors(order: any) {
  if (Array.isArray(order?.status?.issues) && order.status.issues.length) return true;
  return Object.values(order?.status?.details || {}).some((value) => text(value) === "Error");
}

export async function reconcileProdigiOrder(db: D1Db, env: ProdigiEnv, providerOrderIdInput: string, event?: any) {
  const providerOrderId = text(providerOrderIdInput);
  if (!/^ord_[A-Za-z0-9_-]+$/.test(providerOrderId)) throw httpError("Invalid Prodigi order ID.");
  const submission = await db.prepare(`
    SELECT * FROM commerce_lab_submissions WHERE provider = 'prodigi' AND provider_order_id = ? LIMIT 1
  `).bind(providerOrderId).first();
  if (!submission) throw httpError("Prodigi submission not found.", 404);
  const payload = await prodigiRequest(env, `/v4.0/orders/${encodeURIComponent(providerOrderId)}`);
  const providerOrder = payload?.order || payload;
  const stage = providerStage(providerOrder);
  const hasErrors = providerHasErrors(providerOrder);
  const submissionStatus = hasErrors ? "error" : stage === "Complete" ? "complete" : stage === "Cancelled" ? "cancelled" : "in_progress";
  const itemStatus = stage === "Cancelled" ? "cancelled" : stage === "Complete" && !hasErrors ? "fulfilled" : "submitted";
  const eventId = text(event?.id);
  const eventType = text(event?.type || `prodigi.reconcile.${stage || "unknown"}`);
  const statements = [
    db.prepare(`
      UPDATE commerce_lab_submissions SET
        status = ?, response_json = ?, last_error = ?,
        completed_at = CASE WHEN ? = 'complete' THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(submissionStatus, safeJson(payload), hasErrors ? safeJson(providerOrder?.status?.issues || []) : "", submissionStatus, text(submission.id)),
    db.prepare(`
      UPDATE commerce_order_items SET fulfilment_status = ?
      WHERE id IN (SELECT order_item_id FROM commerce_lab_submission_items WHERE submission_id = ?)
    `).bind(itemStatus, text(submission.id)),
    db.prepare(`
      UPDATE commerce_lab_submission_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE submission_id = ?
    `).bind(itemStatus, text(submission.id)),
  ];
  for (const providerItem of Array.isArray(providerOrder?.items) ? providerOrder.items : []) {
    const merchantReference = text(providerItem?.merchantReference);
    if (!merchantReference) continue;
    statements.push(db.prepare(`
      UPDATE commerce_lab_submission_items SET provider_item_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE submission_id = ? AND order_item_id = ?
    `).bind(text(providerItem?.id), text(providerItem?.status || itemStatus), text(submission.id), merchantReference));
  }
  if (eventId) {
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO commerce_lab_events (
        id, submission_id, provider, provider_event_id, event_type, status, payload_json, created_at
      ) VALUES (?, ?, 'prodigi', ?, ?, 'processed', ?, CURRENT_TIMESTAMP)
    `).bind(`lab_event_${crypto.randomUUID()}`, text(submission.id), eventId, eventType, safeJson(event)));
  }
  statements.push(db.prepare(`
    UPDATE commerce_orders SET
      status = CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM commerce_order_items coi
          WHERE coi.order_id = commerce_orders.id AND coi.fulfilment_status <> 'fulfilled'
        ) THEN 'fulfilled'
        WHEN EXISTS (
          SELECT 1 FROM commerce_order_items coi
          WHERE coi.order_id = commerce_orders.id AND coi.fulfilment_status IN ('submitted', 'fulfilled')
        ) THEN 'in_fulfilment'
        ELSE 'approved'
      END,
      lab_reference = ?,
      fulfilled_at = CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM commerce_order_items coi
          WHERE coi.order_id = commerce_orders.id AND coi.fulfilment_status <> 'fulfilled'
        ) THEN COALESCE(fulfilled_at, CURRENT_TIMESTAMP)
        ELSE NULL
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(providerOrderId, text(submission.order_id)));
  await db.batch(statements);
  const reconciledOrder = await db.prepare(`SELECT status FROM commerce_orders WHERE id = ? LIMIT 1`).bind(text(submission.order_id)).first();
  return { providerOrderId, stage, status: submissionStatus, orderStatus: text(reconciledOrder?.status), response: payload };
}

export async function refreshProdigiSubmission(db: D1Db, env: ProdigiEnv, orderIdInput: string, workspaceIdInput?: string) {
  const workspaceId = await resolvedWorkspaceId(db, workspaceIdInput);
  const submission = await db.prepare(`
    SELECT cls.provider_order_id
    FROM commerce_lab_submissions cls
    JOIN commerce_orders co ON co.id = cls.order_id
    WHERE cls.order_id = ? AND co.workspace_id = ? AND cls.provider = 'prodigi' AND trim(cls.provider_order_id) <> ''
    ORDER BY cls.created_at DESC LIMIT 1
  `).bind(text(orderIdInput), workspaceId).first();
  if (!submission) throw httpError("No Prodigi submission exists for this order.", 404);
  return reconcileProdigiOrder(db, env, text(submission.provider_order_id));
}

export async function cancelProdigiSubmission(db: D1Db, env: ProdigiEnv, orderIdInput: string, workspaceIdInput?: string) {
  const workspaceId = await resolvedWorkspaceId(db, workspaceIdInput);
  const submission = await db.prepare(`
    SELECT cls.*
    FROM commerce_lab_submissions cls
    JOIN commerce_orders co ON co.id = cls.order_id
    WHERE cls.order_id = ? AND co.workspace_id = ? AND cls.provider = 'prodigi' AND trim(cls.provider_order_id) <> ''
    ORDER BY cls.created_at DESC LIMIT 1
  `).bind(text(orderIdInput), workspaceId).first();
  if (!submission) throw httpError("No Prodigi submission exists for this order.", 404);
  const providerOrderId = text(submission.provider_order_id);
  const response = await prodigiRequest(env, `/v4.0/orders/${encodeURIComponent(providerOrderId)}/actions/cancel`, { method: "POST" });
  await reconcileProdigiOrder(db, env, providerOrderId);
  return { providerOrderId, outcome: text(response?.outcome), response };
}

export async function processProdigiCallback(db: D1Db, env: ProdigiEnv, tokenInput: string, event: any) {
  const expected = text(env.PRODIGI_CALLBACK_TOKEN);
  const token = text(tokenInput);
  if (expected.length < 24 || token !== expected) throw httpError("Prodigi callback token is invalid.", 401);
  const eventId = text(event?.id);
  const eventType = text(event?.type);
  const providerOrderId = text(event?.subject || event?.data?.order?.id || event?.data?.id);
  if (!eventId || !eventType || !providerOrderId) throw httpError("Prodigi callback payload is invalid.");
  const duplicate = await db.prepare(`SELECT id FROM commerce_lab_events WHERE provider = 'prodigi' AND provider_event_id = ? LIMIT 1`).bind(eventId).first();
  if (duplicate) return { duplicate: true, providerOrderId };
  const expectedSource = prodigiMode(env) === "sandbox" ? "api.sandbox.prodigi.com" : "api.prodigi.com";
  if (text(event?.source) && !text(event.source).includes(expectedSource)) throw httpError("Prodigi callback source does not match the configured environment.", 400);
  const result = await reconcileProdigiOrder(db, env, providerOrderId, event);
  return { duplicate: false, ...result };
}
