import type { ClientAuthIdentity } from "./client-auth-d1";
import { getDefaultWorkspaceId } from "./workspace-d1";

type D1Db = any;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integer(value: unknown, fallback = 0) {
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round(number(value, fallback))));
}

function quantity(value: unknown, fallback = 1) {
  return Math.min(99, Math.max(1, integer(value, fallback)));
}

function bool(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === 1 || value === "1" || value === "true";
}

function normalizeEmail(value: unknown) {
  return text(value).toLowerCase();
}

function validEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & { statusCode?: number; details?: string[] };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function cleanProductStatus(value: unknown) {
  const status = text(value);
  return status === "active" || status === "archived" ? status : "draft";
}

function cleanPriceListStatus(value: unknown) {
  const status = text(value);
  return status === "active" || status === "archived" ? status : "draft";
}

function cleanFulfilmentType(value: unknown) {
  const type = text(value);
  return ["print", "wall_art", "album", "digital", "other"].includes(type) ? type : "print";
}

function cleanOrientation(value: unknown) {
  const orientation = text(value);
  return ["any", "landscape", "portrait", "square"].includes(orientation) ? orientation : "any";
}

function cleanOrderStatus(value: unknown) {
  const status = text(value);
  return [
    "pending",
    "awaiting_payment",
    "paid",
    "in_review",
    "approved",
    "in_fulfilment",
    "fulfilled",
    "cancelled",
    "refunded",
  ].includes(status) ? status : "pending";
}

function cleanPaymentStatus(value: unknown) {
  const status = text(value);
  return ["unpaid", "processing", "paid", "failed", "expired", "refunded"].includes(status) ? status : "unpaid";
}

function json(value: unknown, fallback: any = {}) {
  try {
    if (typeof value === "string") return JSON.parse(value || "{}");
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

function safeJson(value: unknown) {
  return JSON.stringify(value && typeof value === "object" ? value : {});
}

function cropPayload(value: unknown) {
  const raw = json(value, {});
  const clamp = (input: unknown, fallback: number, min = 0, max = 1) => Math.min(max, Math.max(min, number(input, fallback)));
  const width = clamp(raw?.width, 1, 0.01, 1);
  const height = clamp(raw?.height, 1, 0.01, 1);
  return {
    x: clamp(raw?.x, 0, 0, 1 - width),
    y: clamp(raw?.y, 0, 0, 1 - height),
    width,
    height,
    rotation: Math.min(360, Math.max(-360, number(raw?.rotation, 0))),
  };
}

async function workspaceCurrency(db: D1Db, workspaceId: string) {
  const row = await db.prepare(`SELECT currency FROM workspace_settings WHERE workspace_id = ? LIMIT 1`).bind(workspaceId).first();
  return text(row?.currency || "GBP").toUpperCase().slice(0, 3) || "GBP";
}

function mapVariant(row: any) {
  return {
    id: text(row?.id),
    productId: text(row?.product_id),
    sku: text(row?.sku),
    name: text(row?.name),
    widthMm: integer(row?.width_mm),
    heightMm: integer(row?.height_mm),
    orientation: cleanOrientation(row?.orientation),
    finish: text(row?.finish),
    status: text(row?.status) === "archived" ? "archived" : "active",
    sortOrder: number(row?.sort_order),
    metadata: json(row?.metadata_json, {}),
    createdAt: text(row?.created_at),
    updatedAt: text(row?.updated_at),
  };
}

function mapProduct(row: any, variants: any[] = []) {
  return {
    id: text(row?.id),
    workspaceId: text(row?.workspace_id),
    name: text(row?.name),
    description: text(row?.description),
    category: text(row?.category || "prints"),
    fulfilmentType: cleanFulfilmentType(row?.fulfilment_type),
    status: cleanProductStatus(row?.status),
    labConnectorKey: text(row?.lab_connector_key),
    labProductCode: text(row?.lab_product_code),
    requiresCrop: Number(row?.requires_crop ?? 1) === 1,
    sortOrder: number(row?.sort_order),
    variants,
    createdAt: text(row?.created_at),
    updatedAt: text(row?.updated_at),
  };
}

function mapPriceList(row: any, items: any[] = []) {
  return {
    id: text(row?.id),
    workspaceId: text(row?.workspace_id),
    name: text(row?.name),
    currency: text(row?.currency || "GBP"),
    status: cleanPriceListStatus(row?.status),
    isDefault: Number(row?.is_default || 0) === 1,
    taxInclusive: Number(row?.tax_inclusive ?? 1) === 1,
    items,
    createdAt: text(row?.created_at),
    updatedAt: text(row?.updated_at),
  };
}

async function listProducts(db: D1Db, workspaceId: string, includeArchived = true) {
  const [productResult, variantResult] = await Promise.all([
    db.prepare(`
      SELECT * FROM commerce_products
      WHERE workspace_id = ? ${includeArchived ? "" : "AND status = 'active'"}
      ORDER BY status = 'archived' ASC, sort_order ASC, name COLLATE NOCASE ASC
    `).bind(workspaceId).all(),
    db.prepare(`
      SELECT cpv.*
      FROM commerce_product_variants cpv
      JOIN commerce_products cp ON cp.id = cpv.product_id
      WHERE cp.workspace_id = ? ${includeArchived ? "" : "AND cpv.status = 'active' AND cp.status = 'active'"}
      ORDER BY cpv.product_id, cpv.sort_order ASC, cpv.name COLLATE NOCASE ASC
    `).bind(workspaceId).all(),
  ]);
  const variantsByProduct = new Map<string, any[]>();
  for (const row of variantResult.results || []) {
    const productId = text((row as any).product_id);
    const items = variantsByProduct.get(productId) || [];
    items.push(mapVariant(row));
    variantsByProduct.set(productId, items);
  }
  return (productResult.results || []).map((row: any) => mapProduct(row, variantsByProduct.get(text(row.id)) || []));
}

async function listPriceLists(db: D1Db, workspaceId: string, includeArchived = true) {
  const [listResult, itemResult] = await Promise.all([
    db.prepare(`
      SELECT * FROM commerce_price_lists
      WHERE workspace_id = ? ${includeArchived ? "" : "AND status = 'active'"}
      ORDER BY is_default DESC, status = 'archived' ASC, name COLLATE NOCASE ASC
    `).bind(workspaceId).all(),
    db.prepare(`
      SELECT cpli.*, cpv.product_id
      FROM commerce_price_list_items cpli
      JOIN commerce_price_lists cpl ON cpl.id = cpli.price_list_id
      JOIN commerce_product_variants cpv ON cpv.id = cpli.variant_id
      WHERE cpl.workspace_id = ?
      ORDER BY cpli.price_list_id, cpv.product_id, cpv.sort_order ASC
    `).bind(workspaceId).all(),
  ]);
  const itemsByList = new Map<string, any[]>();
  for (const row of itemResult.results || []) {
    const listId = text((row as any).price_list_id);
    const items = itemsByList.get(listId) || [];
    items.push({
      priceListId: listId,
      productId: text((row as any).product_id),
      variantId: text((row as any).variant_id),
      retailPriceMinor: integer((row as any).retail_price_minor),
      studioCostMinor: integer((row as any).studio_cost_minor),
      active: Number((row as any).active ?? 1) === 1,
      updatedAt: text((row as any).updated_at),
    });
    itemsByList.set(listId, items);
  }
  return (listResult.results || []).map((row: any) => mapPriceList(row, itemsByList.get(text(row.id)) || []));
}

async function listOrders(db: D1Db, workspaceId: string) {
  const [orderResult, itemResult, eventResult] = await Promise.all([
    db.prepare(`
      SELECT co.*, cg.title AS gallery_title, cg.client_name AS gallery_client_name
      FROM commerce_orders co
      JOIN client_galleries cg ON cg.id = co.gallery_id
      WHERE co.workspace_id = ?
      ORDER BY co.created_at DESC
      LIMIT 250
    `).bind(workspaceId).all(),
    db.prepare(`
      SELECT coi.*, COALESCE(thumb.url, web.url, '') AS thumb_src, a.filename
      FROM commerce_order_items coi
      JOIN commerce_orders co ON co.id = coi.order_id
      JOIN assets a ON a.id = coi.asset_id
      LEFT JOIN asset_files thumb ON thumb.asset_id = coi.asset_id AND thumb.variant = 'thumb' AND thumb.status = 'active'
      LEFT JOIN asset_files web ON web.asset_id = coi.asset_id AND web.variant = 'web' AND web.status = 'active'
      WHERE co.workspace_id = ?
      ORDER BY coi.order_id, coi.created_at ASC
    `).bind(workspaceId).all(),
    db.prepare(`
      SELECT cpe.*
      FROM commerce_payment_events cpe
      JOIN commerce_orders co ON co.id = cpe.order_id
      WHERE co.workspace_id = ?
      ORDER BY cpe.created_at DESC
    `).bind(workspaceId).all(),
  ]);
  const itemsByOrder = new Map<string, any[]>();
  for (const row of itemResult.results || []) {
    const orderId = text((row as any).order_id);
    const items = itemsByOrder.get(orderId) || [];
    items.push({
      id: text((row as any).id),
      assetId: text((row as any).asset_id),
      filename: text((row as any).filename),
      thumbSrc: text((row as any).thumb_src),
      productId: text((row as any).product_id),
      variantId: text((row as any).variant_id),
      productName: text((row as any).product_name),
      variantName: text((row as any).variant_name),
      sku: text((row as any).sku),
      quantity: integer((row as any).quantity, 1),
      unitPriceMinor: integer((row as any).unit_price_minor),
      studioCostMinor: integer((row as any).studio_cost_minor),
      lineTotalMinor: integer((row as any).line_total_minor),
      labConnectorKey: text((row as any).lab_connector_key),
      labProductCode: text((row as any).lab_product_code),
      crop: json((row as any).crop_json, {}),
      fulfilmentStatus: text((row as any).fulfilment_status || "pending"),
    });
    itemsByOrder.set(orderId, items);
  }
  const eventsByOrder = new Map<string, any[]>();
  for (const row of eventResult.results || []) {
    const orderId = text((row as any).order_id);
    const events = eventsByOrder.get(orderId) || [];
    events.push({
      id: text((row as any).id),
      provider: text((row as any).provider),
      providerEventId: text((row as any).provider_event_id),
      eventType: text((row as any).event_type),
      status: text((row as any).status),
      amountMinor: integer((row as any).amount_minor),
      currency: text((row as any).currency || "GBP"),
      payload: json((row as any).payload_json, {}),
      createdAt: text((row as any).created_at),
    });
    eventsByOrder.set(orderId, events);
  }
  return (orderResult.results || []).map((row: any) => ({
    id: text(row.id),
    workspaceId: text(row.workspace_id),
    galleryId: text(row.gallery_id),
    galleryTitle: text(row.gallery_title),
    galleryClientName: text(row.gallery_client_name),
    cartId: text(row.cart_id),
    orderNumber: text(row.order_number),
    email: text(row.email),
    clientName: text(row.client_name),
    status: cleanOrderStatus(row.status),
    currency: text(row.currency || "GBP"),
    subtotalMinor: integer(row.subtotal_minor),
    shippingMinor: integer(row.shipping_minor),
    taxMinor: integer(row.tax_minor),
    totalMinor: integer(row.total_minor),
    paymentProvider: text(row.payment_provider || "manual"),
    paymentReference: text(row.payment_reference),
    requiresPhotographerApproval: Number(row.requires_photographer_approval ?? 1) === 1,
    paymentStatus: cleanPaymentStatus(row.payment_status),
    checkoutSessionId: text(row.checkout_session_id),
    checkoutAttempt: integer(row.checkout_attempt),
    paymentIntentId: text(row.payment_intent_id),
    paidAt: text(row.paid_at),
    paymentFailedAt: text(row.payment_failed_at),
    refundedAt: text(row.refunded_at),
    shippingName: text(row.shipping_name),
    shippingPhone: text(row.shipping_phone),
    shippingAddress: json(row.shipping_address_json, {}),
    labConnectorKey: text(row.lab_connector_key),
    labReference: text(row.lab_reference),
    clientNotes: text(row.client_notes),
    internalNotes: text(row.internal_notes),
    submittedAt: text(row.submitted_at),
    approvedAt: text(row.approved_at),
    fulfilledAt: text(row.fulfilled_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    items: itemsByOrder.get(text(row.id)) || [],
    paymentEvents: eventsByOrder.get(text(row.id)) || [],
  }));
}

export async function getPrintStoreAdmin(db: D1Db) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const [currency, products, priceLists, orders] = await Promise.all([
    workspaceCurrency(db, workspaceId),
    listProducts(db, workspaceId, true),
    listPriceLists(db, workspaceId, true),
    listOrders(db, workspaceId),
  ]);
  return { workspaceId, currency, products, priceLists, orders };
}

async function saveProduct(db: D1Db, workspaceId: string, incoming: any) {
  const id = text(incoming?.id) || `product_${crypto.randomUUID()}`;
  const name = text(incoming?.name);
  if (!name) throw httpError("Product name is required.");
  const existing = await db.prepare(`SELECT id, workspace_id FROM commerce_products WHERE id = ? LIMIT 1`).bind(id).first();
  if (existing && text(existing.workspace_id) !== workspaceId) {
    throw httpError("Product ID belongs to another workspace.", 409);
  }
  if (existing) {
    await db.prepare(`
      UPDATE commerce_products SET
        name = ?, description = ?, category = ?, fulfilment_type = ?, status = ?,
        lab_connector_key = ?, lab_product_code = ?, requires_crop = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workspace_id = ?
    `).bind(
      name,
      text(incoming?.description),
      text(incoming?.category || "prints"),
      cleanFulfilmentType(incoming?.fulfilmentType),
      cleanProductStatus(incoming?.status),
      text(incoming?.labConnectorKey),
      text(incoming?.labProductCode),
      bool(incoming?.requiresCrop, true) ? 1 : 0,
      number(incoming?.sortOrder),
      id,
      workspaceId,
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO commerce_products (
        id, workspace_id, name, description, category, fulfilment_type, status,
        lab_connector_key, lab_product_code, requires_crop, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      id,
      workspaceId,
      name,
      text(incoming?.description),
      text(incoming?.category || "prints"),
      cleanFulfilmentType(incoming?.fulfilmentType),
      cleanProductStatus(incoming?.status),
      text(incoming?.labConnectorKey),
      text(incoming?.labProductCode),
      bool(incoming?.requiresCrop, true) ? 1 : 0,
      number(incoming?.sortOrder),
    ).run();
  }

  const variants = Array.isArray(incoming?.variants) ? incoming.variants : [];
  const retainedIds: string[] = [];
  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index] || {};
    const variantName = text(variant.name);
    if (!variantName) continue;
    const variantId = text(variant.id) || `variant_${crypto.randomUUID()}`;
    const existingVariant = await db.prepare(`SELECT product_id FROM commerce_product_variants WHERE id = ? LIMIT 1`).bind(variantId).first();
    if (existingVariant && text(existingVariant.product_id) !== id) {
      throw httpError("Product option ID belongs to another product.", 409);
    }
    retainedIds.push(variantId);
    await db.prepare(`
      INSERT INTO commerce_product_variants (
        id, product_id, sku, name, width_mm, height_mm, orientation, finish,
        status, sort_order, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        sku = excluded.sku,
        name = excluded.name,
        width_mm = excluded.width_mm,
        height_mm = excluded.height_mm,
        orientation = excluded.orientation,
        finish = excluded.finish,
        status = excluded.status,
        sort_order = excluded.sort_order,
        metadata_json = excluded.metadata_json,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      variantId,
      id,
      text(variant.sku),
      variantName,
      integer(variant.widthMm),
      integer(variant.heightMm),
      cleanOrientation(variant.orientation),
      text(variant.finish),
      text(variant.status) === "archived" ? "archived" : "active",
      number(variant.sortOrder, index),
      safeJson(variant.metadata),
    ).run();
  }
  if (retainedIds.length) {
    const placeholders = retainedIds.map(() => "?").join(",");
    await db.prepare(`
      UPDATE commerce_product_variants
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ? AND id NOT IN (${placeholders})
    `).bind(id, ...retainedIds).run();
  } else {
    await db.prepare(`
      UPDATE commerce_product_variants
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ?
    `).bind(id).run();
  }
  return id;
}

async function savePriceList(db: D1Db, workspaceId: string, incoming: any, fallbackCurrency: string) {
  const id = text(incoming?.id) || `price_list_${crypto.randomUUID()}`;
  const name = text(incoming?.name);
  if (!name) throw httpError("Price-list name is required.");
  const existing = await db.prepare(`SELECT workspace_id FROM commerce_price_lists WHERE id = ? LIMIT 1`).bind(id).first();
  if (existing && text(existing.workspace_id) !== workspaceId) {
    throw httpError("Price-list ID belongs to another workspace.", 409);
  }
  const isDefault = bool(incoming?.isDefault, false) && cleanPriceListStatus(incoming?.status) !== "archived";
  if (isDefault) {
    await db.prepare(`UPDATE commerce_price_lists SET is_default = 0, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ?`).bind(workspaceId).run();
  }
  await db.prepare(`
    INSERT INTO commerce_price_lists (
      id, workspace_id, name, currency, status, is_default, tax_inclusive, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      currency = excluded.currency,
      status = excluded.status,
      is_default = excluded.is_default,
      tax_inclusive = excluded.tax_inclusive,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    id,
    workspaceId,
    name,
    text(incoming?.currency || fallbackCurrency).toUpperCase().slice(0, 3) || fallbackCurrency,
    cleanPriceListStatus(incoming?.status),
    isDefault ? 1 : 0,
    bool(incoming?.taxInclusive, true) ? 1 : 0,
  ).run();

  const items = Array.isArray(incoming?.items) ? incoming.items : [];
  await db.prepare(`DELETE FROM commerce_price_list_items WHERE price_list_id = ?`).bind(id).run();
  for (const item of items) {
    const variantId = text(item?.variantId);
    if (!variantId) continue;
    const variant = await db.prepare(`
      SELECT cpv.id FROM commerce_product_variants cpv
      JOIN commerce_products cp ON cp.id = cpv.product_id
      WHERE cpv.id = ? AND cp.workspace_id = ? LIMIT 1
    `).bind(variantId, workspaceId).first();
    if (!variant) continue;
    await db.prepare(`
      INSERT INTO commerce_price_list_items (
        price_list_id, variant_id, retail_price_minor, studio_cost_minor, active, updated_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      id,
      variantId,
      integer(item?.retailPriceMinor),
      integer(item?.studioCostMinor),
      bool(item?.active, true) ? 1 : 0,
    ).run();
  }
  return id;
}

async function seedStarterCatalogue(db: D1Db, workspaceId: string, currency: string) {
  const existing = await db.prepare(`SELECT COUNT(*) AS total FROM commerce_products WHERE workspace_id = ? AND status <> 'archived'`).bind(workspaceId).first();
  if (number(existing?.total) > 0) throw httpError("The catalogue already contains products.", 409);

  const starter = [
    {
      id: `product_${crypto.randomUUID()}`,
      name: "Professional Photographic Prints",
      description: "Classic photographic prints supplied from the selected gallery image.",
      category: "Prints",
      fulfilmentType: "print",
      status: "active",
      requiresCrop: true,
      sortOrder: 0,
      variants: [
        { id: `variant_${crypto.randomUUID()}`, name: "6 × 4 in", sku: "PRINT-6X4", widthMm: 152, heightMm: 102, retailPriceMinor: 800, studioCostMinor: 200 },
        { id: `variant_${crypto.randomUUID()}`, name: "7 × 5 in", sku: "PRINT-7X5", widthMm: 178, heightMm: 127, retailPriceMinor: 1200, studioCostMinor: 300 },
        { id: `variant_${crypto.randomUUID()}`, name: "10 × 8 in", sku: "PRINT-10X8", widthMm: 254, heightMm: 203, retailPriceMinor: 2500, studioCostMinor: 650 },
      ],
    },
    {
      id: `product_${crypto.randomUUID()}`,
      name: "Fine Art Prints",
      description: "Archival fine-art paper with a soft, gallery-quality finish.",
      category: "Fine Art",
      fulfilmentType: "print",
      status: "active",
      requiresCrop: true,
      sortOrder: 10,
      variants: [
        { id: `variant_${crypto.randomUUID()}`, name: "A4", sku: "FINE-A4", widthMm: 297, heightMm: 210, retailPriceMinor: 4500, studioCostMinor: 1200 },
        { id: `variant_${crypto.randomUUID()}`, name: "A3", sku: "FINE-A3", widthMm: 420, heightMm: 297, retailPriceMinor: 7500, studioCostMinor: 2200 },
      ],
    },
    {
      id: `product_${crypto.randomUUID()}`,
      name: "Framed Wall Art",
      description: "A finished wall piece ready for photographer approval and lab fulfilment.",
      category: "Wall Art",
      fulfilmentType: "wall_art",
      status: "active",
      requiresCrop: true,
      sortOrder: 20,
      variants: [
        { id: `variant_${crypto.randomUUID()}`, name: "16 × 12 in", sku: "FRAME-16X12", widthMm: 406, heightMm: 305, retailPriceMinor: 14500, studioCostMinor: 6500 },
        { id: `variant_${crypto.randomUUID()}`, name: "20 × 16 in", sku: "FRAME-20X16", widthMm: 508, heightMm: 406, retailPriceMinor: 19500, studioCostMinor: 9000 },
      ],
    },
  ];

  for (const product of starter) await saveProduct(db, workspaceId, product);
  const priceListId = `price_list_${crypto.randomUUID()}`;
  const items = starter.flatMap((product) => product.variants.map((variant) => ({
    variantId: variant.id,
    retailPriceMinor: variant.retailPriceMinor,
    studioCostMinor: variant.studioCostMinor,
    active: true,
  })));
  await savePriceList(db, workspaceId, {
    id: priceListId,
    name: "Standard Client Gallery",
    currency,
    status: "active",
    isDefault: true,
    taxInclusive: true,
    items,
  }, currency);
  return { priceListId };
}

export async function mutatePrintStoreAdmin(db: D1Db, input: any) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const currency = await workspaceCurrency(db, workspaceId);
  const action = text(input?.action);
  if (action === "saveProduct") {
    await saveProduct(db, workspaceId, input?.product || input);
  } else if (action === "archiveProduct") {
    const productId = text(input?.productId);
    if (!productId) throw httpError("Product is required.");
    await db.prepare(`UPDATE commerce_products SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(productId, workspaceId).run();
  } else if (action === "savePriceList") {
    await savePriceList(db, workspaceId, input?.priceList || input, currency);
  } else if (action === "archivePriceList") {
    const priceListId = text(input?.priceListId);
    if (!priceListId) throw httpError("Price list is required.");
    await db.prepare(`UPDATE commerce_price_lists SET status = 'archived', is_default = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(priceListId, workspaceId).run();
    await db.prepare(`UPDATE client_gallery_store_settings SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE price_list_id = ?`).bind(priceListId).run();
  } else if (action === "seedStarterCatalogue") {
    await seedStarterCatalogue(db, workspaceId, currency);
  } else if (action === "updateOrder") {
    const orderId = text(input?.orderId);
    if (!orderId) throw httpError("Order is required.");
    const status = cleanOrderStatus(input?.status);
    const existing = await db.prepare(`
      SELECT status, payment_status, payment_provider, payment_reference
      FROM commerce_orders WHERE id = ? AND workspace_id = ? LIMIT 1
    `).bind(orderId, workspaceId).first();
    if (!existing) throw httpError("Order not found.", 404);
    const paymentStatus = cleanPaymentStatus(existing.payment_status);
    const paymentProvider = text(existing.payment_provider || "manual");
    if (["approved", "in_fulfilment", "fulfilled"].includes(status) && paymentStatus !== "paid") {
      throw httpError("A verified payment is required before this order can be approved or fulfilled.", 409);
    }
    if (paymentProvider === "stripe" && status === "paid" && paymentStatus !== "paid") {
      throw httpError("Stripe orders are marked paid only by a verified Stripe event.", 409);
    }
    if (paymentProvider === "stripe" && status === "refunded" && paymentStatus !== "refunded") {
      throw httpError("Refund the payment in Stripe first; the verified webhook will update this order.", 409);
    }
    const paymentReference = paymentProvider === "stripe" ? text(existing.payment_reference) : text(input?.paymentReference);
    await db.prepare(`
      UPDATE commerce_orders SET
        status = ?, internal_notes = ?, payment_reference = ?, lab_connector_key = ?, lab_reference = ?,
        approved_at = CASE WHEN ? = 'approved' AND approved_at IS NULL THEN CURRENT_TIMESTAMP ELSE approved_at END,
        fulfilled_at = CASE WHEN ? = 'fulfilled' AND fulfilled_at IS NULL THEN CURRENT_TIMESTAMP ELSE fulfilled_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workspace_id = ?
    `).bind(
      status,
      text(input?.internalNotes),
      paymentReference,
      text(input?.labConnectorKey),
      text(input?.labReference),
      status,
      status,
      orderId,
      workspaceId,
    ).run();
  } else if (action === "recordPaymentEvent") {
    const orderId = text(input?.orderId);
    const provider = text(input?.provider || "manual");
    if (!orderId) throw httpError("Order is required.");
    const order = await db.prepare(`SELECT id, currency FROM commerce_orders WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(orderId, workspaceId).first();
    if (!order) throw httpError("Order not found.", 404);
    await db.prepare(`
      INSERT INTO commerce_payment_events (
        id, order_id, provider, provider_event_id, event_type, status,
        amount_minor, currency, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      `payment_event_${crypto.randomUUID()}`,
      orderId,
      provider,
      text(input?.providerEventId),
      text(input?.eventType || "manual_update"),
      text(input?.eventStatus || "received"),
      integer(input?.amountMinor),
      text(input?.currency || order.currency || currency),
      safeJson(input?.payload),
    ).run();
  } else {
    throw httpError("Unsupported Print Store action.");
  }
  return getPrintStoreAdmin(db);
}

export async function getClientGalleryStoreAdmin(db: D1Db, galleryId: string) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const gallery = await db.prepare(`SELECT id, title FROM client_galleries WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(galleryId, workspaceId).first();
  if (!gallery) throw httpError("Client gallery not found.", 404);
  const [settings, priceLists] = await Promise.all([
    db.prepare(`SELECT * FROM client_gallery_store_settings WHERE gallery_id = ? LIMIT 1`).bind(galleryId).first(),
    listPriceLists(db, workspaceId, false),
  ]);
  const defaultPriceList = priceLists.find((priceList: any) => priceList.isDefault) || priceLists[0] || null;
  return {
    workspaceId,
    gallery: { id: text(gallery.id), title: text(gallery.title) },
    settings: {
      galleryId,
      enabled: Number(settings?.enabled || 0) === 1,
      priceListId: text(settings?.price_list_id || defaultPriceList?.id),
      allowCrop: Number(settings?.allow_crop ?? 1) === 1,
      requirePhotographerApproval: Number(settings?.require_photographer_approval ?? 1) === 1,
      minimumOrderMinor: integer(settings?.minimum_order_minor),
      intro: text(settings?.intro),
      updatedAt: text(settings?.updated_at),
    },
    priceLists,
  };
}

export async function updateClientGalleryStoreAdmin(db: D1Db, galleryId: string, input: any) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const gallery = await db.prepare(`SELECT id FROM client_galleries WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(galleryId, workspaceId).first();
  if (!gallery) throw httpError("Client gallery not found.", 404);
  const priceListId = text(input?.priceListId);
  if (bool(input?.enabled, false) && !priceListId) throw httpError("Choose an active price list before enabling the store.");
  if (priceListId) {
    const priceList = await db.prepare(`SELECT id FROM commerce_price_lists WHERE id = ? AND workspace_id = ? AND status = 'active' LIMIT 1`).bind(priceListId, workspaceId).first();
    if (!priceList) throw httpError("The selected price list is not active.");
  }
  await db.prepare(`
    INSERT INTO client_gallery_store_settings (
      gallery_id, enabled, price_list_id, allow_crop, require_photographer_approval,
      minimum_order_minor, intro, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(gallery_id) DO UPDATE SET
      enabled = excluded.enabled,
      price_list_id = excluded.price_list_id,
      allow_crop = excluded.allow_crop,
      require_photographer_approval = excluded.require_photographer_approval,
      minimum_order_minor = excluded.minimum_order_minor,
      intro = excluded.intro,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    galleryId,
    bool(input?.enabled, false) ? 1 : 0,
    priceListId || null,
    bool(input?.allowCrop, true) ? 1 : 0,
    bool(input?.requirePhotographerApproval, true) ? 1 : 0,
    integer(input?.minimumOrderMinor),
    text(input?.intro),
  ).run();
  return getClientGalleryStoreAdmin(db, galleryId);
}

async function publicStoreConfiguration(db: D1Db, galleryId: string) {
  const row = await db.prepare(`
    SELECT
      cg.id AS gallery_id,
      cg.workspace_id,
      cgss.enabled,
      cgss.price_list_id,
      cgss.allow_crop,
      cgss.require_photographer_approval,
      cgss.minimum_order_minor,
      cgss.intro,
      cpl.currency,
      cpl.name AS price_list_name
    FROM client_galleries cg
    LEFT JOIN client_gallery_store_settings cgss ON cgss.gallery_id = cg.id
    LEFT JOIN commerce_price_lists cpl ON cpl.id = cgss.price_list_id
    WHERE cg.id = ?
    LIMIT 1
  `).bind(galleryId).first();
  if (!row) throw httpError("Client gallery not found.", 404);
  return row;
}

async function publicCatalogue(db: D1Db, galleryId: string, priceListId: string) {
  if (!priceListId) return [];
  const result = await db.prepare(`
    SELECT
      cp.id AS product_id,
      cp.name AS product_name,
      cp.description,
      cp.category,
      cp.fulfilment_type,
      cp.requires_crop,
      cp.sort_order AS product_sort_order,
      cpv.id AS variant_id,
      cpv.sku,
      cpv.name AS variant_name,
      cpv.width_mm,
      cpv.height_mm,
      cpv.orientation,
      cpv.finish,
      cpv.sort_order AS variant_sort_order,
      cpli.retail_price_minor,
      cpl.currency
    FROM commerce_price_list_items cpli
    JOIN commerce_price_lists cpl ON cpl.id = cpli.price_list_id
    JOIN commerce_product_variants cpv ON cpv.id = cpli.variant_id
    JOIN commerce_products cp ON cp.id = cpv.product_id
    JOIN client_galleries cg ON cg.workspace_id = cp.workspace_id
    WHERE cg.id = ?
      AND cpl.id = ?
      AND cpl.workspace_id = cg.workspace_id
      AND cpl.status = 'active'
      AND cpli.active = 1
      AND cp.status = 'active'
      AND cpv.status = 'active'
    ORDER BY cp.sort_order ASC, cp.name COLLATE NOCASE ASC, cpv.sort_order ASC, cpv.name COLLATE NOCASE ASC
  `).bind(galleryId, priceListId).all();
  const products = new Map<string, any>();
  for (const row of result.results || []) {
    const productId = text((row as any).product_id);
    const product = products.get(productId) || {
      id: productId,
      name: text((row as any).product_name),
      description: text((row as any).description),
      category: text((row as any).category),
      fulfilmentType: cleanFulfilmentType((row as any).fulfilment_type),
      requiresCrop: Number((row as any).requires_crop ?? 1) === 1,
      variants: [],
    };
    product.variants.push({
      id: text((row as any).variant_id),
      sku: text((row as any).sku),
      name: text((row as any).variant_name),
      widthMm: integer((row as any).width_mm),
      heightMm: integer((row as any).height_mm),
      orientation: cleanOrientation((row as any).orientation),
      finish: text((row as any).finish),
      priceMinor: integer((row as any).retail_price_minor),
      currency: text((row as any).currency || "GBP"),
    });
    products.set(productId, product);
  }
  return Array.from(products.values());
}

async function resolveCart(db: D1Db, config: any, visitorKey: string, identity: ClientAuthIdentity | null, create = false) {
  const cleanVisitor = text(visitorKey).slice(0, 160);
  let cart: any = null;
  if (identity?.id) {
    cart = await db.prepare(`
      SELECT * FROM commerce_carts
      WHERE gallery_id = ? AND identity_id = ? AND status = 'active'
      ORDER BY updated_at DESC LIMIT 1
    `).bind(text(config.gallery_id), identity.id).first();
  }
  if (!cart && cleanVisitor) {
    cart = await db.prepare(`
      SELECT * FROM commerce_carts
      WHERE gallery_id = ? AND visitor_key = ? AND status = 'active'
      ORDER BY updated_at DESC LIMIT 1
    `).bind(text(config.gallery_id), cleanVisitor).first();
  }
  if (!cart && create) {
    if (!cleanVisitor && !identity?.id) throw httpError("A visitor identity is required to create a cart.", 400);
    const id = `cart_${crypto.randomUUID()}`;
    await db.prepare(`
      INSERT INTO commerce_carts (
        id, workspace_id, gallery_id, visitor_key, identity_id, email, email_normalized,
        currency, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      id,
      text(config.workspace_id),
      text(config.gallery_id),
      cleanVisitor,
      identity?.id || null,
      identity?.email || "",
      identity?.emailNormalized || "",
      text(config.currency || "GBP"),
    ).run();
    cart = await db.prepare(`SELECT * FROM commerce_carts WHERE id = ? LIMIT 1`).bind(id).first();
  } else if (cart && identity?.id && text(cart.identity_id) !== identity.id) {
    await db.prepare(`
      UPDATE commerce_carts SET identity_id = ?, email = ?, email_normalized = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(identity.id, identity.email, identity.emailNormalized, text(cart.id)).run();
    cart = { ...cart, identity_id: identity.id, email: identity.email, email_normalized: identity.emailNormalized };
  }
  return cart;
}

async function hydrateCart(db: D1Db, cart: any) {
  if (!cart) return { id: "", status: "active", currency: "GBP", subtotalMinor: 0, itemCount: 0, items: [] };
  const result = await db.prepare(`
    SELECT
      cci.*,
      a.filename,
      COALESCE(thumb.url, web.url, '') AS thumb_src,
      cp.id AS product_id,
      cp.name AS product_name,
      cp.requires_crop,
      cp.lab_connector_key,
      cpv.name AS variant_name,
      cpv.sku,
      cpv.width_mm,
      cpv.height_mm
    FROM commerce_cart_items cci
    JOIN assets a ON a.id = cci.asset_id
    JOIN commerce_product_variants cpv ON cpv.id = cci.variant_id
    JOIN commerce_products cp ON cp.id = cpv.product_id
    LEFT JOIN asset_files thumb ON thumb.asset_id = cci.asset_id AND thumb.variant = 'thumb' AND thumb.status = 'active'
    LEFT JOIN asset_files web ON web.asset_id = cci.asset_id AND web.variant = 'web' AND web.status = 'active'
    WHERE cci.cart_id = ?
    ORDER BY cci.created_at ASC
  `).bind(text(cart.id)).all();
  const items = (result.results || []).map((row: any) => ({
    id: text(row.id),
    assetId: text(row.asset_id),
    filename: text(row.filename),
    thumbSrc: text(row.thumb_src),
    productId: text(row.product_id),
    productName: text(row.product_name),
    variantId: text(row.variant_id),
    variantName: text(row.variant_name),
    sku: text(row.sku),
    widthMm: integer(row.width_mm),
    heightMm: integer(row.height_mm),
    requiresCrop: Number(row.requires_crop ?? 1) === 1,
    labConnectorKey: text(row.lab_connector_key),
    quantity: quantity(row.quantity, 1),
    unitPriceMinor: integer(row.unit_price_minor),
    lineTotalMinor: integer(row.unit_price_minor) * quantity(row.quantity, 1),
    crop: json(row.crop_json, {}),
    notes: text(row.notes),
  }));
  return {
    id: text(cart.id),
    status: text(cart.status || "active"),
    currency: text(cart.currency || "GBP"),
    subtotalMinor: items.reduce((total: number, item: any) => total + item.lineTotalMinor, 0),
    itemCount: items.reduce((total: number, item: any) => total + item.quantity, 0),
    items,
  };
}

export async function getPublicPrintStore(
  db: D1Db,
  galleryId: string,
  visitorKey: string,
  identity: ClientAuthIdentity | null = null,
) {
  const config = await publicStoreConfiguration(db, galleryId);
  const enabled = Number(config.enabled || 0) === 1 && Boolean(text(config.price_list_id));
  const [products, cart] = await Promise.all([
    enabled ? publicCatalogue(db, galleryId, text(config.price_list_id)) : Promise.resolve([]),
    resolveCart(db, config, visitorKey, identity, false).then((row) => hydrateCart(db, row)),
  ]);
  return {
    enabled,
    galleryId,
    intro: text(config.intro),
    currency: text(config.currency || cart.currency || "GBP"),
    allowCrop: Number(config.allow_crop ?? 1) === 1,
    requirePhotographerApproval: Number(config.require_photographer_approval ?? 1) === 1,
    minimumOrderMinor: integer(config.minimum_order_minor),
    products,
    cart,
  };
}

async function pricedVariant(db: D1Db, galleryId: string, variantId: string) {
  return db.prepare(`
    SELECT
      cp.id AS product_id,
      cp.name AS product_name,
      cp.requires_crop,
      cp.lab_connector_key,
      cp.lab_product_code,
      cpv.id AS variant_id,
      cpv.name AS variant_name,
      cpv.sku,
      cpli.retail_price_minor,
      cpli.studio_cost_minor,
      cpl.currency
    FROM client_gallery_store_settings cgss
    JOIN commerce_price_lists cpl ON cpl.id = cgss.price_list_id
    JOIN commerce_price_list_items cpli ON cpli.price_list_id = cpl.id
    JOIN commerce_product_variants cpv ON cpv.id = cpli.variant_id
    JOIN commerce_products cp ON cp.id = cpv.product_id
    JOIN client_galleries cg ON cg.id = cgss.gallery_id AND cg.workspace_id = cp.workspace_id
    WHERE cgss.gallery_id = ?
      AND cgss.enabled = 1
      AND cpl.status = 'active'
      AND cpli.active = 1
      AND cp.status = 'active'
      AND cpv.status = 'active'
      AND cpv.id = ?
    LIMIT 1
  `).bind(galleryId, variantId).first();
}

function orderNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(100000 + Math.random() * 900000);
  return `MKB-${stamp}-${random}`;
}

export async function mutatePublicPrintStore(
  db: D1Db,
  galleryId: string,
  visitorKey: string,
  identity: ClientAuthIdentity | null,
  input: any,
) {
  const config = await publicStoreConfiguration(db, galleryId);
  if (Number(config.enabled || 0) !== 1 || !text(config.price_list_id)) {
    throw httpError("Print ordering is not enabled for this gallery.", 404);
  }
  const action = text(input?.action || "load");
  if (action === "load") return getPublicPrintStore(db, galleryId, visitorKey, identity);

  const cart = await resolveCart(db, config, visitorKey, identity, action === "addItem");
  if (!cart) throw httpError("Your cart could not be found.", 404);

  if (action === "addItem") {
    const assetId = text(input?.assetId);
    const variantId = text(input?.variantId);
    if (!assetId || !variantId) throw httpError("Choose a photograph and product option.");
    const [membership, variant] = await Promise.all([
      db.prepare(`SELECT asset_id FROM client_gallery_assets WHERE gallery_id = ? AND asset_id = ? AND hidden = 0 LIMIT 1`).bind(galleryId, assetId).first(),
      pricedVariant(db, galleryId, variantId),
    ]);
    if (!membership) throw httpError("The selected photograph is not available in this gallery.", 404);
    if (!variant) throw httpError("The selected product option is not available.", 404);
    const variantCurrency = text(variant.currency || "GBP").toUpperCase();
    if (text(cart.currency || "GBP").toUpperCase() !== variantCurrency) {
      const existingItems = await db.prepare(`SELECT COUNT(*) AS total FROM commerce_cart_items WHERE cart_id = ?`).bind(text(cart.id)).first();
      if (integer(existingItems?.total) > 0) {
        throw httpError("The gallery price-list currency has changed. Remove the existing cart items and try again.", 409);
      }
      await db.prepare(`UPDATE commerce_carts SET currency = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(variantCurrency, text(cart.id)).run();
      cart.currency = variantCurrency;
    }
    await db.prepare(`
      INSERT INTO commerce_cart_items (
        id, cart_id, asset_id, variant_id, quantity, unit_price_minor, crop_json, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      `cart_item_${crypto.randomUUID()}`,
      text(cart.id),
      assetId,
      variantId,
      quantity(input?.quantity, 1),
      integer(variant.retail_price_minor),
      safeJson(cropPayload(input?.crop)),
      text(input?.notes),
    ).run();
  } else if (action === "updateItem") {
    const itemId = text(input?.itemId);
    const item = await db.prepare(`SELECT id FROM commerce_cart_items WHERE id = ? AND cart_id = ? LIMIT 1`).bind(itemId, text(cart.id)).first();
    if (!item) throw httpError("Cart item not found.", 404);
    const nextQuantity = quantity(input?.quantity, 1);
    await db.prepare(`
      UPDATE commerce_cart_items SET quantity = ?, crop_json = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND cart_id = ?
    `).bind(nextQuantity, safeJson(cropPayload(input?.crop)), text(input?.notes), itemId, text(cart.id)).run();
  } else if (action === "removeItem") {
    const itemId = text(input?.itemId);
    await db.prepare(`DELETE FROM commerce_cart_items WHERE id = ? AND cart_id = ?`).bind(itemId, text(cart.id)).run();
  } else if (action === "submitOrder") {
    throw httpError("Use the secure hosted checkout to submit this order.", 409);
  } else {
    throw httpError("Unsupported store action.");
  }

  await db.prepare(`UPDATE commerce_carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(text(cart.id)).run();
  return getPublicPrintStore(db, galleryId, visitorKey, identity);
}

async function checkoutOrderForClient(
  db: D1Db,
  galleryId: string,
  orderId: string,
  visitorKey: string,
  identity: ClientAuthIdentity | null,
) {
  const cleanVisitor = text(visitorKey).slice(0, 160);
  const row = await db.prepare(`
    SELECT co.*, cc.visitor_key
    FROM commerce_orders co
    LEFT JOIN commerce_carts cc ON cc.id = co.cart_id
    WHERE co.id = ? AND co.gallery_id = ?
    LIMIT 1
  `).bind(orderId, galleryId).first();
  if (!row) throw httpError("Order not found.", 404);
  const identityMatches = Boolean(identity?.id && text(row.identity_id) === identity.id)
    || Boolean(identity?.emailNormalized && text(row.email_normalized) === identity.emailNormalized);
  const visitorMatches = Boolean(cleanVisitor && text(row.visitor_key) === cleanVisitor);
  if (!identityMatches && !visitorMatches) throw httpError("This order is not available to the current gallery visitor.", 403);

  const itemResult = await db.prepare(`
    SELECT coi.*, a.filename
    FROM commerce_order_items coi
    JOIN assets a ON a.id = coi.asset_id
    WHERE coi.order_id = ?
    ORDER BY coi.created_at ASC, coi.id ASC
  `).bind(orderId).all();
  const items = (itemResult.results || []).map((item: any) => ({
    id: text(item.id),
    assetId: text(item.asset_id),
    filename: text(item.filename),
    productName: text(item.product_name),
    variantName: text(item.variant_name),
    quantity: quantity(item.quantity, 1),
    unitPriceMinor: integer(item.unit_price_minor),
    lineTotalMinor: integer(item.line_total_minor),
  }));
  return {
    id: text(row.id),
    orderNumber: text(row.order_number),
    galleryId: text(row.gallery_id),
    email: text(row.email),
    clientName: text(row.client_name),
    status: cleanOrderStatus(row.status),
    paymentStatus: cleanPaymentStatus(row.payment_status),
    paymentProvider: text(row.payment_provider || "stripe"),
    paymentReference: text(row.payment_reference),
    currency: text(row.currency || "GBP"),
    subtotalMinor: integer(row.subtotal_minor),
    shippingMinor: integer(row.shipping_minor),
    taxMinor: integer(row.tax_minor),
    totalMinor: integer(row.total_minor),
    requiresPhotographerApproval: Number(row.requires_photographer_approval ?? 1) === 1,
    checkoutSessionId: text(row.checkout_session_id),
    checkoutAttempt: integer(row.checkout_attempt),
    paymentIntentId: text(row.payment_intent_id),
    paidAt: text(row.paid_at),
    submittedAt: text(row.submitted_at),
    items,
  };
}

export async function preparePublicCheckoutOrder(
  db: D1Db,
  galleryId: string,
  visitorKey: string,
  identity: ClientAuthIdentity | null,
  input: any,
) {
  const existingOrderId = text(input?.orderId);
  if (existingOrderId) return checkoutOrderForClient(db, galleryId, existingOrderId, visitorKey, identity);

  const config = await publicStoreConfiguration(db, galleryId);
  if (Number(config.enabled || 0) !== 1 || !text(config.price_list_id)) {
    throw httpError("Print ordering is not enabled for this gallery.", 404);
  }
  const cart = await resolveCart(db, config, visitorKey, identity, false);
  if (!cart) throw httpError("Your cart could not be found.", 404);

  const prior = await db.prepare(`
    SELECT id FROM commerce_orders
    WHERE cart_id = ? AND gallery_id = ?
    ORDER BY created_at DESC LIMIT 1
  `).bind(text(cart.id), galleryId).first();
  if (prior?.id) return checkoutOrderForClient(db, galleryId, text(prior.id), visitorKey, identity);

  const hydrated = await hydrateCart(db, cart);
  if (!hydrated.items.length) throw httpError("Your cart is empty.");
  if (hydrated.subtotalMinor < integer(config.minimum_order_minor)) {
    throw httpError("The cart has not reached this gallery's minimum order value.");
  }
  const email = text(identity?.email || input?.email || cart.email);
  const emailNormalized = normalizeEmail(email);
  if (!validEmail(email)) throw httpError("Enter a valid email address before continuing to payment.");
  const clientName = text(identity?.displayName || input?.clientName);
  const pricedItems: Array<{ item: any; variant: any }> = [];
  for (const item of hydrated.items) {
    const variant = await pricedVariant(db, galleryId, item.variantId);
    if (!variant) throw httpError("One of the product options is no longer available. Reload the store and try again.", 409);
    if (integer(variant.retail_price_minor) !== item.unitPriceMinor || text(variant.currency).toUpperCase() !== text(hydrated.currency).toUpperCase()) {
      throw httpError("A product price or currency has changed. Reload the store and review your cart before ordering.", 409);
    }
    pricedItems.push({ item, variant });
  }

  const orderId = `order_${crypto.randomUUID()}`;
  const requiresApproval = Number(config.require_photographer_approval ?? 1) === 1;
  const labConnectors = Array.from(new Set(pricedItems.map(({ variant }) => text(variant.lab_connector_key)).filter(Boolean)));
  const labConnector = labConnectors.length === 1 ? labConnectors[0] : "";
  let generatedNumber = orderNumber();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const duplicate = await db.prepare(`SELECT id FROM commerce_orders WHERE order_number = ? LIMIT 1`).bind(generatedNumber).first();
    if (!duplicate) break;
    generatedNumber = orderNumber();
  }

  const statements = [db.prepare(`
    INSERT INTO commerce_orders (
      id, workspace_id, gallery_id, cart_id, identity_id, order_number,
      email, email_normalized, client_name, status, currency,
      subtotal_minor, shipping_minor, tax_minor, total_minor,
      payment_provider, requires_photographer_approval, payment_status,
      lab_connector_key, client_notes,
      submitted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_payment', ?, ?, 0, 0, ?, 'stripe', ?, 'unpaid', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    orderId,
    text(config.workspace_id),
    galleryId,
    text(cart.id),
    identity?.id || null,
    generatedNumber,
    email,
    emailNormalized,
    clientName,
    hydrated.currency,
    hydrated.subtotalMinor,
    hydrated.subtotalMinor,
    requiresApproval ? 1 : 0,
    labConnector,
    text(input?.clientNotes),
  )];

  for (const { item, variant } of pricedItems) {
    statements.push(db.prepare(`
      INSERT INTO commerce_order_items (
        id, order_id, asset_id, product_id, variant_id, product_name, variant_name, sku,
        quantity, unit_price_minor, studio_cost_minor, line_total_minor,
        lab_connector_key, lab_product_code, crop_json, fulfilment_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `).bind(
      `order_item_${crypto.randomUUID()}`,
      orderId,
      item.assetId,
      text(variant.product_id),
      item.variantId,
      text(variant.product_name),
      text(variant.variant_name),
      text(variant.sku),
      item.quantity,
      item.unitPriceMinor,
      integer(variant.studio_cost_minor),
      item.lineTotalMinor,
      text(variant.lab_connector_key),
      text(variant.lab_product_code),
      safeJson(item.crop),
    ));
  }
  statements.push(db.prepare(`
    UPDATE commerce_carts
    SET status = 'converted', email = ?, email_normalized = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(email, emailNormalized, text(cart.id)));
  await db.batch(statements);
  return checkoutOrderForClient(db, galleryId, orderId, visitorKey, identity);
}

export async function attachStripeCheckoutSession(
  db: D1Db,
  orderId: string,
  session: any,
  attempt: number,
) {
  const sessionId = text(session?.id);
  const paymentIntentId = text(typeof session?.payment_intent === "string" ? session.payment_intent : session?.payment_intent?.id);
  if (!sessionId) throw httpError("Stripe did not return a Checkout Session ID.", 502);
  const result = await db.prepare(`
    UPDATE commerce_orders SET
      status = CASE WHEN status IN ('pending', 'awaiting_payment') THEN 'awaiting_payment' ELSE status END,
      payment_provider = 'stripe',
      payment_status = 'unpaid',
      payment_reference = CASE WHEN ? <> '' THEN ? ELSE ? END,
      checkout_session_id = ?,
      checkout_attempt = ?,
      payment_intent_id = CASE WHEN ? <> '' THEN ? ELSE '' END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND payment_status NOT IN ('paid', 'refunded')
  `).bind(
    paymentIntentId,
    paymentIntentId,
    sessionId,
    sessionId,
    integer(attempt),
    paymentIntentId,
    paymentIntentId,
    orderId,
  ).run();
  if (!Number(result?.meta?.changes || 0)) {
    const order = await db.prepare(`SELECT id FROM commerce_orders WHERE id = ? LIMIT 1`).bind(orderId).first();
    if (!order) throw httpError("Order not found.", 404);
  }
}

export async function getPublicCheckoutOrder(
  db: D1Db,
  galleryId: string,
  orderId: string,
  visitorKey: string,
  identity: ClientAuthIdentity | null,
) {
  return checkoutOrderForClient(db, galleryId, orderId, visitorKey, identity);
}

function stripeObjectPaymentIntentId(object: any) {
  if (typeof object?.payment_intent === "string") return text(object.payment_intent);
  if (object?.payment_intent?.id) return text(object.payment_intent.id);
  if (object?.object === "payment_intent") return text(object.id);
  return text(object?.payment_intent_id);
}

function stripeObjectOrderId(object: any) {
  return text(object?.metadata?.order_id || object?.client_reference_id);
}

function stripeObjectAmount(object: any) {
  return integer(object?.amount_total ?? object?.amount_received ?? object?.amount);
}

function stripeObjectCurrency(object: any) {
  return text(object?.currency).toUpperCase();
}

function stripeShipping(object: any) {
  const shipping = object?.collected_information?.shipping_details || object?.shipping_details || object?.shipping || null;
  return {
    name: text(shipping?.name || object?.customer_details?.name),
    phone: text(object?.customer_details?.phone || shipping?.phone),
    address: shipping?.address && typeof shipping.address === "object" ? shipping.address : {},
  };
}

export async function processStripePaymentEvent(db: D1Db, event: any, payload: any) {
  const eventId = text(event?.id);
  const eventType = text(event?.type);
  const object = event?.data?.object || {};
  if (!eventId || !eventType) throw httpError("Stripe event is invalid.", 400);

  const duplicate = await db.prepare(`
    SELECT id FROM commerce_payment_events
    WHERE provider = 'stripe' AND provider_event_id = ? LIMIT 1
  `).bind(eventId).first();
  if (duplicate) return { duplicate: true, processed: false, orderId: "" };

  const orderIdFromMetadata = stripeObjectOrderId(object);
  const sessionId = object?.object === "checkout.session" ? text(object.id) : "";
  const paymentIntentId = stripeObjectPaymentIntentId(object);
  let order: any = null;
  if (orderIdFromMetadata) {
    order = await db.prepare(`SELECT * FROM commerce_orders WHERE id = ? LIMIT 1`).bind(orderIdFromMetadata).first();
  }
  if (!order && sessionId) {
    order = await db.prepare(`SELECT * FROM commerce_orders WHERE checkout_session_id = ? LIMIT 1`).bind(sessionId).first();
  }
  if (!order && paymentIntentId) {
    order = await db.prepare(`SELECT * FROM commerce_orders WHERE payment_intent_id = ? LIMIT 1`).bind(paymentIntentId).first();
  }
  if (!order) return { duplicate: false, processed: false, ignored: true, orderId: "" };

  const orderId = text(order.id);
  const amount = stripeObjectAmount(object);
  const currency = stripeObjectCurrency(object) || text(order.currency).toUpperCase();
  const orderAmount = integer(order.total_minor);
  const orderCurrency = text(order.currency).toUpperCase();
  const paidEvent = eventType === "checkout.session.async_payment_succeeded"
    || eventType === "payment_intent.succeeded"
    || ((eventType === "checkout.session.completed" || eventType === "checkout.session.reconciled") && text(object?.payment_status) === "paid");
  const processingEvent = (eventType === "checkout.session.completed" || eventType === "checkout.session.reconciled")
    && text(object?.payment_status) !== "paid";
  const failedEvent = eventType === "checkout.session.async_payment_failed" || eventType === "payment_intent.payment_failed";
  const expiredEvent = eventType === "checkout.session.expired";
  const refundedEvent = eventType === "charge.refunded" && Boolean(object?.refunded);
  const currentPaymentStatus = cleanPaymentStatus(order.payment_status);
  const staleSessionState = Boolean(
    sessionId
      && text(order.checkout_session_id)
      && sessionId !== text(order.checkout_session_id)
      && (processingEvent || failedEvent || expiredEvent),
  );
  const staleIntentState = Boolean(
    paymentIntentId
      && text(order.payment_intent_id)
      && paymentIntentId !== text(order.payment_intent_id)
      && failedEvent,
  );
  const terminalStateRegression = (currentPaymentStatus === "paid" || currentPaymentStatus === "refunded")
    && (processingEvent || failedEvent || expiredEvent || (currentPaymentStatus === "refunded" && paidEvent));
  const ignoredStateEvent = staleSessionState || staleIntentState || terminalStateRegression;
  const amountRequired = paidEvent || refundedEvent;
  const amountMatches = !amountRequired || (amount === orderAmount && currency === orderCurrency);
  const recognisedStateEvent = paidEvent || processingEvent || failedEvent || expiredEvent || refundedEvent;
  const eventStatus = !amountMatches
    ? "rejected"
    : ignoredStateEvent
      ? "ignored"
      : recognisedStateEvent ? "processed" : "received";
  const shipping = stripeShipping(object);
  const resolvedPaymentIntentId = paymentIntentId || text(order.payment_intent_id);
  const resolvedSessionId = sessionId || text(order.checkout_session_id);
  const eventStatement = db.prepare(`
    INSERT INTO commerce_payment_events (
      id, order_id, provider, provider_event_id, event_type, status,
      amount_minor, currency, payload_json, created_at
    ) VALUES (?, ?, 'stripe', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    `payment_event_${crypto.randomUUID()}`,
    orderId,
    eventId,
    eventType,
    eventStatus,
    amount,
    currency || orderCurrency,
    safeJson(payload),
  );

  const statements: any[] = [eventStatement];
  if (amountMatches && !ignoredStateEvent && recognisedStateEvent) {
    let paymentStatus = cleanPaymentStatus(order.payment_status);
    if (paidEvent) paymentStatus = "paid";
    else if (processingEvent) paymentStatus = "processing";
    else if (failedEvent) paymentStatus = "failed";
    else if (expiredEvent) paymentStatus = "expired";
    else if (refundedEvent) paymentStatus = "refunded";
    const targetStatus = paidEvent
      ? (Number(order.requires_photographer_approval ?? 1) === 1 ? "in_review" : "paid")
      : refundedEvent ? "refunded" : "awaiting_payment";
    statements.push(db.prepare(`
      UPDATE commerce_orders SET
        status = CASE
          WHEN ? = 'paid' AND status IN ('approved', 'in_fulfilment', 'fulfilled') THEN status
          WHEN ? = 'paid' AND status = 'refunded' THEN status
          WHEN ? = 'processing' AND status NOT IN ('pending', 'awaiting_payment') THEN status
          ELSE ?
        END,
        payment_status = CASE
          WHEN payment_status = 'refunded' AND ? <> 'refunded' THEN payment_status
          WHEN payment_status = 'paid' AND ? NOT IN ('paid', 'refunded') THEN payment_status
          ELSE ?
        END,
        payment_provider = 'stripe',
        payment_reference = CASE WHEN ? <> '' THEN ? WHEN ? <> '' THEN ? ELSE payment_reference END,
        checkout_session_id = CASE WHEN ? <> '' THEN ? ELSE checkout_session_id END,
        payment_intent_id = CASE WHEN ? <> '' THEN ? ELSE payment_intent_id END,
        paid_at = CASE WHEN ? = 'paid' AND paid_at IS NULL THEN CURRENT_TIMESTAMP ELSE paid_at END,
        payment_failed_at = CASE WHEN ? = 'failed' AND payment_status NOT IN ('paid', 'refunded') THEN CURRENT_TIMESTAMP ELSE payment_failed_at END,
        refunded_at = CASE WHEN ? = 'refunded' THEN CURRENT_TIMESTAMP ELSE refunded_at END,
        shipping_name = CASE WHEN ? <> '' THEN ? ELSE shipping_name END,
        shipping_phone = CASE WHEN ? <> '' THEN ? ELSE shipping_phone END,
        shipping_address_json = CASE WHEN ? <> '{}' THEN ? ELSE shipping_address_json END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      paymentStatus,
      paymentStatus,
      paymentStatus,
      targetStatus,
      paymentStatus,
      paymentStatus,
      paymentStatus,
      resolvedPaymentIntentId,
      resolvedPaymentIntentId,
      resolvedSessionId,
      resolvedSessionId,
      resolvedSessionId,
      resolvedSessionId,
      resolvedPaymentIntentId,
      resolvedPaymentIntentId,
      paymentStatus,
      paymentStatus,
      paymentStatus,
      shipping.name,
      shipping.name,
      shipping.phone,
      shipping.phone,
      safeJson(shipping.address),
      safeJson(shipping.address),
      orderId,
    ));
  }

  try {
    await db.batch(statements);
  } catch (error: any) {
    if (/unique|constraint/i.test(text(error?.message))) {
      const repeated = await db.prepare(`
        SELECT id FROM commerce_payment_events
        WHERE provider = 'stripe' AND provider_event_id = ? LIMIT 1
      `).bind(eventId).first();
      if (repeated) return { duplicate: true, processed: false, orderId };
    }
    throw error;
  }
  return { duplicate: false, processed: eventStatus === "processed", rejected: eventStatus === "rejected", orderId };
}
