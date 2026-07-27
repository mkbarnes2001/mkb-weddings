import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Ban,
  Box,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileCheck2,
  PackageCheck,
  PackageSearch,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Scissors,
  Send,
  ShoppingBag,
  Store,
  Trash2,
} from "lucide-react";
import {
  AdminButton,
  AdminEmptyState,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
  AdminTab,
  AdminTabs,
  AdminToolbar,
} from "../components/ui/AdminUI";
import { AdminApiService } from "../services/AdminApiService";
import type {
  PrintStoreAdminPayload,
  PrintStoreOrder,
  PrintStoreOrderItem,
  PrintStoreOrderStatus,
  PrintStorePaymentStatus,
  PrintStorePriceList,
  PrintStorePriceListItem,
  PrintStoreProduct,
  PrintStoreProductVariant,
} from "../types/printStore";

type Tab = "catalogue" | "pricing" | "orders";

const blankVariant = (): PrintStoreProductVariant => ({
  id: "",
  productId: "",
  sku: "",
  name: "",
  widthMm: 0,
  heightMm: 0,
  orientation: "any",
  finish: "",
  status: "active",
  sortOrder: 0,
  metadata: {},
  labSku: "",
  labAttributes: {},
  labPrintArea: "default",
  labSizing: "fillPrintArea",
  recommendedWidthPx: 0,
  recommendedHeightPx: 0,
  labMappingStatus: "unverified",
  labMappingCheckedAt: "",
});

const blankProduct = (): PrintStoreProduct => ({
  id: "",
  workspaceId: "",
  name: "",
  description: "",
  category: "Prints",
  fulfilmentType: "print",
  status: "draft",
  labConnectorKey: "",
  labProductCode: "",
  requiresCrop: true,
  sortOrder: 0,
  variants: [blankVariant()],
});

const blankPriceList = (currency = "GBP"): PrintStorePriceList => ({
  id: "",
  workspaceId: "",
  name: "",
  currency,
  status: "draft",
  isDefault: false,
  taxInclusive: true,
  items: [],
});

function money(minor: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format((Number(minor) || 0) / 100);
}

function cropSummary(crop: Record<string, number>) {
  const x = Number(crop?.x);
  const y = Number(crop?.y);
  const width = Number(crop?.width);
  const height = Number(crop?.height);
  if (![x, y, width, height].every(Number.isFinite)) return "Full image";
  return `x ${Math.round(x * 100)}% · y ${Math.round(y * 100)}% · ${Math.round(width * 100)}% × ${Math.round(height * 100)}%`;
}

function orderTone(status: PrintStoreOrderStatus): "neutral" | "success" | "warning" | "danger" | "info" {
  if (["fulfilled", "paid", "approved"].includes(status)) return "success";
  if (["cancelled", "refunded"].includes(status)) return "danger";
  if (["in_review", "awaiting_payment", "in_fulfilment"].includes(status)) return "warning";
  return "neutral";
}

function paymentTone(status: PrintStorePaymentStatus): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "paid") return "success";
  if (status === "refunded") return "info";
  if (["failed", "expired"].includes(status)) return "danger";
  if (status === "processing") return "warning";
  return "neutral";
}

function labTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (["complete", "fulfilled", "shipped"].includes(status.toLowerCase())) return "success";
  if (["error", "invalid"].includes(status.toLowerCase())) return "danger";
  if (["submitted", "in_progress", "inprogress", "processing"].includes(status.toLowerCase())) return "warning";
  if (status.toLowerCase() === "cancelled") return "info";
  return "neutral";
}

function fileSize(value: number) {
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function addressSummary(address: Record<string, string>) {
  return [address?.line1, address?.line2, address?.city, address?.state, address?.postal_code || address?.postalCode, address?.country]
    .filter(Boolean)
    .join(", ") || "Not collected yet";
}

function displayDate(value: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-GB");
}

function cloneProduct(product: PrintStoreProduct) {
  return {
    ...product,
    variants: product.variants.map((variant) => ({
      ...variant,
      metadata: { ...(variant.metadata || {}) },
      labAttributes: { ...(variant.labAttributes || {}) },
    })),
  };
}

function clonePriceList(priceList: PrintStorePriceList) {
  return { ...priceList, items: priceList.items.map((item) => ({ ...item })) };
}

function parseAttributePairs(value: string) {
  const entries = value.split(",").map((item) => item.trim()).filter(Boolean).map((item) => {
    const separator = item.indexOf("=");
    return separator > 0 ? [item.slice(0, separator).trim(), item.slice(separator + 1).trim()] : ["", ""];
  }).filter(([key, item]) => key && item);
  return Object.fromEntries(entries);
}

function fitCropToAspect(crop: Record<string, number>, targetAspect: number) {
  let x = Math.min(1, Math.max(0, Number(crop?.x) || 0));
  let y = Math.min(1, Math.max(0, Number(crop?.y) || 0));
  let width = Math.min(1 - x, Math.max(0.01, Number(crop?.width) || 1));
  let height = Math.min(1 - y, Math.max(0.01, Number(crop?.height) || 1));
  const aspect = width / height;
  if (aspect > targetAspect) {
    const nextWidth = height * targetAspect;
    x += (width - nextWidth) / 2;
    width = nextWidth;
  } else if (aspect < targetAspect) {
    const nextHeight = width / targetAspect;
    y += (height - nextHeight) / 2;
    height = nextHeight;
  }
  return { x, y, width, height };
}

async function renderPreparedJpeg(source: Blob, item: PrintStoreOrderItem) {
  if (!item.recommendedWidthPx || !item.recommendedHeightPx) throw new Error("Verify the Prodigi mapping before preparing this line.");
  const bitmap = await createImageBitmap(source);
  try {
    const targetWidth = item.recommendedWidthPx;
    const targetHeight = item.recommendedHeightPx;
    if (targetWidth * targetHeight > 40_000_000) throw new Error("This product exceeds the browser preparation limit. Use manual fulfilment or prepare the file externally.");
    const crop = fitCropToAspect(item.crop || {}, targetWidth / targetHeight);
    const sx = Math.round(crop.x * bitmap.width);
    const sy = Math.round(crop.y * bitmap.height);
    const sw = Math.max(1, Math.round(crop.width * bitmap.width));
    const sh = Math.max(1, Math.round(crop.height * bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Your browser could not prepare this print file.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const rotation = Number(item.crop?.rotation || 0);
    if (Math.abs(rotation) < 0.01) {
      const scale = Math.max(targetWidth / sw, targetHeight / sh);
      if (scale > 1.001) throw new Error(`The selected crop contains about ${sw} × ${sh}px, below Prodigi's ${targetWidth} × ${targetHeight}px recommendation. Choose a smaller product or use a wider crop.`);
      context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
    } else {
      const intermediate = document.createElement("canvas");
      intermediate.width = sw;
      intermediate.height = sh;
      const intermediateContext = intermediate.getContext("2d", { alpha: false });
      if (!intermediateContext) throw new Error("Your browser could not prepare the rotated print file.");
      intermediateContext.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
      const radians = rotation * Math.PI / 180;
      const absCos = Math.abs(Math.cos(radians));
      const absSin = Math.abs(Math.sin(radians));
      const rotatedWidth = Math.max(1, Math.ceil(sw * absCos + sh * absSin));
      const rotatedHeight = Math.max(1, Math.ceil(sw * absSin + sh * absCos));
      const rotated = document.createElement("canvas");
      rotated.width = rotatedWidth;
      rotated.height = rotatedHeight;
      const rotatedContext = rotated.getContext("2d", { alpha: false });
      if (!rotatedContext) throw new Error("Your browser could not rotate the print file.");
      rotatedContext.translate(rotatedWidth / 2, rotatedHeight / 2);
      rotatedContext.rotate(radians);
      rotatedContext.drawImage(intermediate, -sw / 2, -sh / 2);
      const scale = Math.max(targetWidth / rotatedWidth, targetHeight / rotatedHeight);
      if (scale > 1.001) throw new Error(`The rotated crop contains about ${rotatedWidth} × ${rotatedHeight}px, below Prodigi's ${targetWidth} × ${targetHeight}px recommendation. Choose a smaller product or use a wider crop.`);
      const drawWidth = rotatedWidth * scale;
      const drawHeight = rotatedHeight * scale;
      context.drawImage(rotated, (targetWidth - drawWidth) / 2, (targetHeight - drawHeight) / 2, drawWidth, drawHeight);
    }
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Unable to encode prepared JPEG.")), "image/jpeg", 0.95));
    return { blob, sourceWidthPx: bitmap.width, sourceHeightPx: bitmap.height };
  } finally {
    bitmap.close();
  }
}

export function PrintStore() {
  const [tab, setTab] = useState<Tab>("catalogue");
  const [data, setData] = useState<PrintStoreAdminPayload | null>(null);
  const [productDraft, setProductDraft] = useState<PrintStoreProduct>(blankProduct());
  const [priceListDraft, setPriceListDraft] = useState<PrintStorePriceList>(blankPriceList());
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [orderDraft, setOrderDraft] = useState<PrintStoreOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lineBusy, setLineBusy] = useState("");
  const [shippingMethod, setShippingMethod] = useState("Budget");
  const [labQuote, setLabQuote] = useState<{ amountMinor: number; currency: string; shippingMethod: string } | null>(null);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const next = await AdminApiService.getPrintStore();
      setData(next);
      setPriceListDraft((current) => current.id ? current : blankPriceList(next.currency));
      if (selectedOrderId) {
        const order = next.orders.find((candidate) => candidate.id === selectedOrderId) || null;
        setOrderDraft(order ? { ...order } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Print Store.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeProducts = useMemo(() => (data?.products || []).filter((product) => product.status !== "archived"), [data]);
  const allVariants = useMemo(() => activeProducts.flatMap((product) => product.variants.filter((variant) => variant.status !== "archived").map((variant) => ({ product, variant }))), [activeProducts]);
  const selectedOrder = orderDraft || data?.orders.find((order) => order.id === selectedOrderId) || null;
  const latestLabSubmission = selectedOrder?.labSubmissions?.[0] || null;
  const labReadyOrder = Boolean(selectedOrder && ["approved", "in_fulfilment"].includes(selectedOrder.status));
  const mappedOrderItems = selectedOrder?.items.filter((item) => item.labConnectorKey.toLowerCase() === "prodigi" && item.labSku && item.recommendedWidthPx && item.recommendedHeightPx && !["submitted", "fulfilled"].includes(item.fulfilmentStatus)) || [];
  const preparedOrderItems = mappedOrderItems.filter((item) => item.printAsset?.status === "prepared" && !["submitted", "fulfilled"].includes(item.fulfilmentStatus));

  const saveProduct = async () => {
    if (!productDraft.name.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await AdminApiService.savePrintStoreProduct({
        ...productDraft,
        variants: productDraft.variants.filter((variant) => variant.name.trim()).map((variant, index) => ({ ...variant, sortOrder: index })),
      });
      setData(next);
      const saved = next.products.find((product) => product.id === productDraft.id) || next.products.find((product) => product.name === productDraft.name);
      setProductDraft(saved ? cloneProduct(saved) : blankProduct());
      setMessage("Product saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save product."); }
    finally { setBusy(false); }
  };

  const archiveProduct = async () => {
    if (!productDraft.id || !window.confirm("Archive this product? Existing order snapshots remain intact.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await AdminApiService.mutatePrintStore({ action: "archiveProduct", productId: productDraft.id });
      setData(next); setProductDraft(blankProduct()); setMessage("Product archived.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to archive product."); }
    finally { setBusy(false); }
  };

  const seedStarterCatalogue = async () => {
    if (!window.confirm("Create a starter catalogue and editable GBP price list?")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await AdminApiService.mutatePrintStore({ action: "seedStarterCatalogue" });
      setData(next); setMessage("Starter catalogue created.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create starter catalogue."); }
    finally { setBusy(false); }
  };

  const priceItem = (variantId: string): PrintStorePriceListItem => priceListDraft.items.find((item) => item.variantId === variantId) || {
    variantId,
    retailPriceMinor: 0,
    studioCostMinor: 0,
    active: false,
  };

  const patchPriceItem = (variantId: string, patch: Partial<PrintStorePriceListItem>) => {
    setPriceListDraft((current) => {
      const exists = current.items.some((item) => item.variantId === variantId);
      const items = exists
        ? current.items.map((item) => item.variantId === variantId ? { ...item, ...patch } : item)
        : [...current.items, { ...priceItem(variantId), ...patch, variantId }];
      return { ...current, items };
    });
  };

  const savePriceList = async () => {
    if (!priceListDraft.name.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await AdminApiService.savePrintStorePriceList(priceListDraft);
      setData(next);
      const saved = next.priceLists.find((list) => list.id === priceListDraft.id) || next.priceLists.find((list) => list.name === priceListDraft.name);
      setPriceListDraft(saved ? clonePriceList(saved) : blankPriceList(next.currency));
      setMessage("Price list saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save price list."); }
    finally { setBusy(false); }
  };

  const archivePriceList = async () => {
    if (!priceListDraft.id || !window.confirm("Archive this price list? Galleries using it will have store ordering disabled.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await AdminApiService.mutatePrintStore({ action: "archivePriceList", priceListId: priceListDraft.id });
      setData(next); setPriceListDraft(blankPriceList(next.currency)); setMessage("Price list archived.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to archive price list."); }
    finally { setBusy(false); }
  };

  const saveOrder = async () => {
    if (!selectedOrder) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await AdminApiService.updatePrintStoreOrder(selectedOrder.id, {
        status: selectedOrder.status,
        internalNotes: selectedOrder.internalNotes,
        paymentReference: selectedOrder.paymentReference,
        labConnectorKey: selectedOrder.labConnectorKey,
        labReference: selectedOrder.labReference,
      });
      setData(next);
      const updated = next.orders.find((order) => order.id === selectedOrder.id) || null;
      setOrderDraft(updated ? { ...updated } : null);
      setMessage("Order updated.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update order."); }
    finally { setBusy(false); }
  };

  const patchVariant = (index: number, patch: Partial<PrintStoreProductVariant>) => {
    setProductDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, itemIndex) => itemIndex === index ? { ...variant, ...patch } : variant),
    }));
  };

  const verifyVariant = async (index: number) => {
    const variant = productDraft.variants[index];
    if (!variant?.id) { setError("Save the product before verifying its Prodigi mapping."); return; }
    setLineBusy(`mapping-${variant.id}`); setError(""); setMessage("");
    try {
      const result = await AdminApiService.verifyProdigiVariantMapping({
        variantId: variant.id,
        sku: variant.labSku,
        attributes: variant.labAttributes,
        printArea: variant.labPrintArea,
        sizing: variant.labSizing,
      });
      const mapping: any = result.mapping || {};
      patchVariant(index, {
        labSku: String(mapping.sku || variant.labSku),
        labAttributes: (mapping.attributes || variant.labAttributes) as Record<string, string>,
        labPrintArea: String(mapping.printArea || "default"),
        labSizing: (mapping.sizing || "fillPrintArea") as PrintStoreProductVariant["labSizing"],
        recommendedWidthPx: Number(mapping.recommendedWidthPx || 0),
        recommendedHeightPx: Number(mapping.recommendedHeightPx || 0),
        labMappingStatus: "verified",
        labMappingCheckedAt: new Date().toISOString(),
      });
      setProductDraft((current) => ({ ...current, labConnectorKey: "prodigi" }));
      setMessage(`Prodigi mapping verified at ${mapping.recommendedWidthPx} × ${mapping.recommendedHeightPx}px.`);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to verify Prodigi mapping."); }
    finally { setLineBusy(""); }
  };

  const refreshOrderMappings = async () => {
    if (!selectedOrder) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await AdminApiService.mutatePrintStore({ action: "refreshOrderMappings", orderId: selectedOrder.id });
      setData(next);
      const updated = next.orders.find((order) => order.id === selectedOrder.id) || null;
      setOrderDraft(updated ? { ...updated } : null);
      setMessage("Current verified product mappings copied to unsubmitted order lines.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to refresh order mappings."); }
    finally { setBusy(false); }
  };

  const preparePrintItem = async (item: PrintStoreOrderItem) => {
    if (!selectedOrder) return;
    setLineBusy(`prepare-${item.id}`); setError(""); setMessage("");
    try {
      const response = await fetch(AdminApiService.clientGalleryOriginalDownloadUrl(selectedOrder.galleryId, item.assetId), { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Unable to load the private original.");
      }
      const prepared = await renderPreparedJpeg(await response.blob(), item);
      await AdminApiService.uploadPreparedPrintAsset({
        orderId: selectedOrder.id,
        itemId: item.id,
        blob: prepared.blob,
        sourceWidthPx: prepared.sourceWidthPx,
        sourceHeightPx: prepared.sourceHeightPx,
      });
      await load();
      setMessage(`${item.variantName} prepared as a print-ready JPEG.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to prepare print file."); }
    finally { setLineBusy(""); }
  };

  const labAction = async (action: "quote" | "submit" | "refresh" | "cancel", itemIds?: string[]) => {
    if (!selectedOrder) return;
    const confirmation = action === "submit"
      ? "Submit the prepared line(s) to the configured Prodigi environment? This remains photographer-controlled and cannot always be cancelled once production starts."
      : action === "cancel"
        ? "Attempt to cancel the latest Prodigi lab order?"
        : "";
    if (confirmation && !window.confirm(confirmation)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result: any = await AdminApiService.prodigiLabAction(selectedOrder.id, { action, itemIds, shippingMethod });
      if (action === "quote") {
        const quote = Array.isArray(result.quotes) ? result.quotes.find((candidate: any) => String(candidate.shippingMethod).toLowerCase() === shippingMethod.toLowerCase()) || result.quotes[0] : null;
        setLabQuote(quote ? { amountMinor: Number(quote.amountMinor || 0), currency: String(quote.currency || selectedOrder.currency), shippingMethod: String(quote.shippingMethod || shippingMethod) } : null);
        setMessage(quote ? `${result.mode === "sandbox" ? "Prodigi sandbox" : "Prodigi"} quote received.` : "Prodigi returned no quote for this selection.");
      } else {
        await load();
        setMessage(action === "submit" ? `Submitted to Prodigi (${result.providerOrderId || "order created"}).` : action === "cancel" ? "Prodigi cancellation request processed." : "Prodigi status refreshed.");
      }
    } catch (err) { setError(err instanceof Error ? err.message : `Unable to ${action} Prodigi order.`); }
    finally { setBusy(false); }
  };

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Commerce"
        title="Print Store"
        description="Manage products, pricing, Stripe payments, gallery ordering and photographer-approved fulfilment."
        actions={<AdminButton icon={RefreshCw} onClick={load} disabled={busy}>Refresh</AdminButton>}
        meta={<div className="flex items-center gap-2"><AdminStatus tone="info">Schema 22</AdminStatus><span>{data?.orders.length || 0} orders</span><span>{activeProducts.length} active products</span></div>}
      />

      {error ? <div className="admin-alert admin-alert--danger">{error}</div> : null}
      {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}

      <AdminTabs>
        <AdminTab active={tab === "catalogue"} onClick={() => setTab("catalogue")}><Printer size={14} /> Catalogue</AdminTab>
        <AdminTab active={tab === "pricing"} onClick={() => setTab("pricing")}><CreditCard size={14} /> Price lists</AdminTab>
        <AdminTab active={tab === "orders"} onClick={() => setTab("orders")}><ShoppingBag size={14} /> Orders</AdminTab>
      </AdminTabs>

      {tab === "catalogue" ? (
        <div className="mt-4" style={{ display: "grid", gridTemplateColumns: "minmax(270px,.72fr) minmax(0,1.35fr)", gap: 16, alignItems: "start" }}>
          <AdminPanel
            title="Products"
            description="Workspace catalogue shared by Client Galleries."
            icon={Box}
            actions={<AdminButton size="sm" icon={Plus} onClick={() => setProductDraft(blankProduct())}>New</AdminButton>}
          >
            {!activeProducts.length ? <AdminEmptyState icon={Store} title="No products yet" description="Create products manually or load an editable starter catalogue." action={<AdminButton icon={PackageCheck} onClick={seedStarterCatalogue} disabled={busy}>Create starter catalogue</AdminButton>} /> : (
              <div className="space-y-2">
                {activeProducts.map((product) => (
                  <button key={product.id} type="button" onClick={() => setProductDraft(cloneProduct(product))} className="w-full rounded-lg border border-black/10 bg-white p-3 text-left hover:bg-neutral-50" style={{ outline: productDraft.id === product.id ? "2px solid #111" : "none" }}>
                    <div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{product.name}</strong><p className="mt-1 text-xs text-neutral-500">{product.category} · {product.variants.filter((variant) => variant.status !== "archived").length} options</p></div><AdminStatus tone={product.status === "active" ? "success" : "neutral"}>{product.status}</AdminStatus></div>
                  </button>
                ))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel title={productDraft.id ? "Edit product" : "New product"} description="Products are reusable; prices belong to price lists." icon={Printer}>
            <div className="grid grid-cols-2 gap-4">
              <AdminField label="Product name"><input value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} /></AdminField>
              <AdminField label="Category"><input value={productDraft.category} onChange={(event) => setProductDraft({ ...productDraft, category: event.target.value })} /></AdminField>
              <AdminField label="Fulfilment type"><select value={productDraft.fulfilmentType} onChange={(event) => setProductDraft({ ...productDraft, fulfilmentType: event.target.value as PrintStoreProduct["fulfilmentType"] })}><option value="print">Print</option><option value="wall_art">Wall art</option><option value="album">Album</option><option value="digital">Digital</option><option value="other">Other</option></select></AdminField>
              <AdminField label="Status"><select value={productDraft.status} onChange={(event) => setProductDraft({ ...productDraft, status: event.target.value as PrintStoreProduct["status"] })}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></AdminField>
              <AdminField label="Lab connector key" help="Use prodigi after at least one option has been verified."><input value={productDraft.labConnectorKey} onChange={(event) => setProductDraft({ ...productDraft, labConnectorKey: event.target.value })} placeholder="prodigi" /></AdminField>
              <AdminField label="Lab product code"><input value={productDraft.labProductCode} onChange={(event) => setProductDraft({ ...productDraft, labProductCode: event.target.value })} /></AdminField>
              <AdminField label="Description" className="col-span-2"><textarea rows={3} value={productDraft.description} onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })} /></AdminField>
              <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={productDraft.requiresCrop} onChange={(event) => setProductDraft({ ...productDraft, requiresCrop: event.target.checked })} /> Require a crop choice for this product</label>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Sizes / variants</h3><p className="text-xs text-neutral-500">Each option can map to a future lab SKU.</p></div><AdminButton size="sm" icon={Plus} onClick={() => setProductDraft({ ...productDraft, variants: [...productDraft.variants, blankVariant()] })}>Add option</AdminButton></div>
            <div className="mt-3 space-y-3">
              {productDraft.variants.map((variant, index) => (
                <div key={variant.id || `new-${index}`} className="rounded-xl border border-black/10 bg-neutral-50 p-4">
                  <div className="grid gap-3 md:grid-cols-6">
                    <AdminField label="Option name" className="md:col-span-2"><input value={variant.name} onChange={(event) => patchVariant(index, { name: event.target.value })} placeholder="10 × 8 in" /></AdminField>
                    <AdminField label="Internal SKU"><input value={variant.sku} onChange={(event) => patchVariant(index, { sku: event.target.value })} /></AdminField>
                    <AdminField label="Width mm"><input type="number" min="0" value={variant.widthMm || ""} onChange={(event) => patchVariant(index, { widthMm: Number(event.target.value) })} /></AdminField>
                    <AdminField label="Height mm"><input type="number" min="0" value={variant.heightMm || ""} onChange={(event) => patchVariant(index, { heightMm: Number(event.target.value) })} /></AdminField>
                    <div className="flex items-end justify-end"><button type="button" className="admin-icon-button" title="Remove option" onClick={() => setProductDraft({ ...productDraft, variants: productDraft.variants.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={15} /></button></div>
                    <AdminField label="Orientation"><select value={variant.orientation} onChange={(event) => patchVariant(index, { orientation: event.target.value as PrintStoreProductVariant["orientation"] })}><option value="any">Any</option><option value="landscape">Landscape</option><option value="portrait">Portrait</option><option value="square">Square</option></select></AdminField>
                    <AdminField label="Finish"><input value={variant.finish} onChange={(event) => patchVariant(index, { finish: event.target.value })} /></AdminField>
                  </div>
                  <div className="mt-4 rounded-lg border border-black/10 bg-white p-3">
                    <div className="mb-3 flex items-center justify-between gap-3"><div><strong className="text-xs">Prodigi mapping</strong><p className="mt-1 text-[11px] text-neutral-500">Use the exact Prodigi SKU and optional attributes, then verify against the sandbox catalogue.</p></div><AdminStatus tone={variant.labMappingStatus === "verified" ? "success" : variant.labMappingStatus === "invalid" ? "danger" : "neutral"}>{variant.labMappingStatus}</AdminStatus></div>
                    <div className="grid gap-3 md:grid-cols-5">
                      <AdminField label="Prodigi SKU" className="md:col-span-2"><input value={variant.labSku} onChange={(event) => patchVariant(index, { labSku: event.target.value.toUpperCase(), labMappingStatus: "unverified" })} placeholder="GLOBAL-..." /></AdminField>
                      <AdminField label="Attributes" help="Comma-separated key=value pairs, e.g. wrap=Black"><input value={Object.entries(variant.labAttributes || {}).map(([key, value]) => `${key}=${value}`).join(", ")} onChange={(event) => patchVariant(index, { labAttributes: parseAttributePairs(event.target.value), labMappingStatus: "unverified" })} /></AdminField>
                      <AdminField label="Print area"><input value={variant.labPrintArea} onChange={(event) => patchVariant(index, { labPrintArea: event.target.value || "default", labMappingStatus: "unverified" })} /></AdminField>
                      <AdminField label="Sizing"><select value={variant.labSizing} onChange={(event) => patchVariant(index, { labSizing: event.target.value as PrintStoreProductVariant["labSizing"], labMappingStatus: "unverified" })}><option value="fillPrintArea">Fill print area</option><option value="fitPrintArea">Fit with borders</option><option value="stretchToPrintArea">Stretch</option></select></AdminField>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-neutral-500">Recommended file: {variant.recommendedWidthPx && variant.recommendedHeightPx ? `${variant.recommendedWidthPx} × ${variant.recommendedHeightPx}px` : "not verified"}</span><AdminButton size="sm" icon={PackageSearch} onClick={() => verifyVariant(index)} disabled={!variant.id || !variant.labSku || lineBusy === `mapping-${variant.id}`}>{lineBusy === `mapping-${variant.id}` ? "Checking…" : "Verify with Prodigi"}</AdminButton></div>
                  </div>
                </div>
              ))}
            </div>
            <AdminToolbar className="mt-5"><AdminButton variant="primary" icon={Save} onClick={saveProduct} disabled={busy || !productDraft.name.trim()}>Save product</AdminButton>{productDraft.id ? <AdminButton variant="danger" icon={Archive} onClick={archiveProduct} disabled={busy}>Archive</AdminButton> : null}</AdminToolbar>
          </AdminPanel>
        </div>
      ) : null}

      {tab === "pricing" ? (
        <div className="mt-4" style={{ display: "grid", gridTemplateColumns: "minmax(270px,.72fr) minmax(0,1.4fr)", gap: 16, alignItems: "start" }}>
          <AdminPanel title="Price lists" description="Assign one active list to each Client Gallery." icon={CreditCard} actions={<AdminButton size="sm" icon={Plus} onClick={() => setPriceListDraft(blankPriceList(data?.currency || "GBP"))}>New</AdminButton>}>
            {!data?.priceLists.filter((list) => list.status !== "archived").length ? <AdminEmptyState icon={CreditCard} title="No price lists" description="Create a price list after adding catalogue products." /> : <div className="space-y-2">{data.priceLists.filter((list) => list.status !== "archived").map((list) => <button key={list.id} type="button" onClick={() => setPriceListDraft(clonePriceList(list))} className="w-full rounded-lg border border-black/10 bg-white p-3 text-left hover:bg-neutral-50" style={{ outline: priceListDraft.id === list.id ? "2px solid #111" : "none" }}><div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{list.name}</strong><p className="mt-1 text-xs text-neutral-500">{list.currency} · {list.items.filter((item) => item.active).length} priced options</p></div><div className="flex gap-1">{list.isDefault ? <AdminStatus tone="info">default</AdminStatus> : null}<AdminStatus tone={list.status === "active" ? "success" : "neutral"}>{list.status}</AdminStatus></div></div></button>)}</div>}
          </AdminPanel>
          <AdminPanel title={priceListDraft.id ? "Edit price list" : "New price list"} description="Retail and studio cost are stored in minor currency units; markup is calculated automatically." icon={CreditCard}>
            <div className="grid grid-cols-2 gap-4"><AdminField label="Name"><input value={priceListDraft.name} onChange={(event) => setPriceListDraft({ ...priceListDraft, name: event.target.value })} /></AdminField><AdminField label="Currency"><input value={priceListDraft.currency} maxLength={3} onChange={(event) => setPriceListDraft({ ...priceListDraft, currency: event.target.value.toUpperCase() })} /></AdminField><AdminField label="Status"><select value={priceListDraft.status} onChange={(event) => setPriceListDraft({ ...priceListDraft, status: event.target.value as PrintStorePriceList["status"] })}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></AdminField><div className="flex flex-col gap-2 pt-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={priceListDraft.isDefault} onChange={(event) => setPriceListDraft({ ...priceListDraft, isDefault: event.target.checked })} /> Default workspace list</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={priceListDraft.taxInclusive} onChange={(event) => setPriceListDraft({ ...priceListDraft, taxInclusive: event.target.checked })} /> Prices include tax</label></div></div>
            <div className="mt-5 overflow-x-auto"><table className="admin-table"><thead><tr><th>Product</th><th>Option</th><th>Sell</th><th>Studio cost</th><th>Gross markup</th><th>Available</th></tr></thead><tbody>{allVariants.map(({ product, variant }) => { const item = priceItem(variant.id); return <tr key={variant.id}><td>{product.name}</td><td><strong>{variant.name}</strong><div className="text-[10px] text-neutral-400">{variant.sku}</div></td><td><input type="number" min="0" step="0.01" value={(item.retailPriceMinor / 100).toFixed(2)} onChange={(event) => patchPriceItem(variant.id, { retailPriceMinor: Math.round(Number(event.target.value || 0) * 100), active: true })} /></td><td><input type="number" min="0" step="0.01" value={(item.studioCostMinor / 100).toFixed(2)} onChange={(event) => patchPriceItem(variant.id, { studioCostMinor: Math.round(Number(event.target.value || 0) * 100) })} /></td><td>{money(Math.max(0, item.retailPriceMinor - item.studioCostMinor), priceListDraft.currency || data?.currency)}</td><td><input type="checkbox" checked={item.active} onChange={(event) => patchPriceItem(variant.id, { active: event.target.checked })} /></td></tr>; })}</tbody></table>{!allVariants.length ? <AdminEmptyState icon={Printer} title="No active product options" description="Add catalogue products before creating a price list." /> : null}</div>
            <AdminToolbar className="mt-5"><AdminButton variant="primary" icon={Save} onClick={savePriceList} disabled={busy || !priceListDraft.name.trim()}>Save price list</AdminButton>{priceListDraft.id ? <AdminButton variant="danger" icon={Archive} onClick={archivePriceList} disabled={busy}>Archive</AdminButton> : null}</AdminToolbar>
          </AdminPanel>
        </div>
      ) : null}

      {tab === "orders" ? (
        <div className="mt-4" style={{ display: "grid", gridTemplateColumns: "minmax(300px,.85fr) minmax(0,1.35fr)", gap: 16, alignItems: "start" }}>
          <AdminPanel title="Orders" description="Stripe payment, photographer approval and fulfilment status." icon={ShoppingBag}>
            {!data?.orders.length ? <AdminEmptyState icon={ShoppingBag} title="No orders yet" description="Orders will appear after a client starts secure checkout from an enabled Client Gallery." /> : (
              <div className="space-y-2">
                {data.orders.map((order) => (
                  <button key={order.id} type="button" onClick={() => { setSelectedOrderId(order.id); setOrderDraft({ ...order }); }} className="w-full rounded-lg border border-black/10 bg-white p-3 text-left hover:bg-neutral-50" style={{ outline: selectedOrderId === order.id ? "2px solid #111" : "none" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div><strong className="text-sm">{order.orderNumber}</strong><p className="mt-1 text-xs text-neutral-500">{order.clientName || order.email} · {order.galleryTitle}</p><p className="mt-1 text-xs">{money(order.totalMinor, order.currency)} · {order.items.length} line{order.items.length === 1 ? "" : "s"}</p></div>
                      <div className="flex flex-col items-end gap-1"><AdminStatus tone={paymentTone(order.paymentStatus)}>{order.paymentStatus.replaceAll("_", " ")}</AdminStatus><AdminStatus tone={orderTone(order.status)}>{order.status.replaceAll("_", " ")}</AdminStatus></div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </AdminPanel>
          {selectedOrder ? <AdminPanel title={selectedOrder.orderNumber} description={`${selectedOrder.galleryTitle} · ${selectedOrder.email}`} icon={PackageCheck} actions={<a href={`/admin/client-galleries/${encodeURIComponent(selectedOrder.galleryId)}`} className="admin-button admin-button--secondary admin-button--sm"><ExternalLink size={14} /> Gallery</a>}>
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-black/10 bg-neutral-50 p-4"><CreditCard size={16} /><strong className="text-sm">Stripe payment</strong><AdminStatus tone={paymentTone(selectedOrder.paymentStatus)}>{selectedOrder.paymentStatus.replaceAll("_", " ")}</AdminStatus><span className="text-xs text-neutral-500">{selectedOrder.paidAt ? `Paid ${displayDate(selectedOrder.paidAt)}` : "Awaiting verified payment"}</span></div>
            <div className="grid grid-cols-2 gap-4">
              <AdminField label="Order status"><select value={selectedOrder.status} onChange={(event) => setOrderDraft({ ...selectedOrder, status: event.target.value as PrintStoreOrderStatus })}>{["pending","awaiting_payment","paid","in_review","approved","in_fulfilment","fulfilled","cancelled","refunded"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></AdminField>
              <AdminField label="Total"><input value={money(selectedOrder.totalMinor, selectedOrder.currency)} readOnly /></AdminField>
              <AdminField label="Payment provider"><input value={selectedOrder.paymentProvider || "stripe"} readOnly /></AdminField>
              <AdminField label="Payment status"><input value={selectedOrder.paymentStatus.replaceAll("_", " ")} readOnly /></AdminField>
              <AdminField label="Payment Intent"><input value={selectedOrder.paymentIntentId || "Not assigned yet"} readOnly /></AdminField>
              <AdminField label="Checkout Session"><input value={selectedOrder.checkoutSessionId || "Not assigned yet"} readOnly /></AdminField>
              <AdminField label="Payment reference"><input value={selectedOrder.paymentReference} readOnly={selectedOrder.paymentProvider === "stripe"} onChange={(event) => setOrderDraft({ ...selectedOrder, paymentReference: event.target.value })} placeholder="Provider payment ID" /></AdminField>
              <AdminField label="Photographer approval"><input value={selectedOrder.requiresPhotographerApproval ? "Required" : "Not required"} readOnly /></AdminField>
              <AdminField label="Delivery name"><input value={selectedOrder.shippingName || "Not collected yet"} readOnly /></AdminField>
              <AdminField label="Delivery phone"><input value={selectedOrder.shippingPhone || "Not collected yet"} readOnly /></AdminField>
              <AdminField label="Delivery address" className="col-span-2"><textarea rows={2} value={addressSummary(selectedOrder.shippingAddress)} readOnly /></AdminField>
              <AdminField label="Lab connector"><input value={selectedOrder.labConnectorKey} onChange={(event) => setOrderDraft({ ...selectedOrder, labConnectorKey: event.target.value })} placeholder="prodigi" /></AdminField>
              <AdminField label="Lab reference"><input value={selectedOrder.labReference} onChange={(event) => setOrderDraft({ ...selectedOrder, labReference: event.target.value })} /></AdminField>
              <AdminField label="Client notes" className="col-span-2"><textarea rows={2} value={selectedOrder.clientNotes} readOnly /></AdminField>
              <AdminField label="Internal notes" className="col-span-2"><textarea rows={3} value={selectedOrder.internalNotes} onChange={(event) => setOrderDraft({ ...selectedOrder, internalNotes: event.target.value })} /></AdminField>
            </div>
            <div className="mt-5 rounded-xl border border-black/10 bg-neutral-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="text-sm font-semibold">Prodigi fulfilment</h3><p className="mt-1 text-xs text-neutral-500">Verify mappings, approve the paid order, prepare exact-size JPEGs, then submit manually.</p></div>
                <AdminButton size="sm" icon={RefreshCw} onClick={refreshOrderMappings} disabled={busy || Boolean(latestLabSubmission?.providerOrderId)}>Refresh mappings</AdminButton>
              </div>
              {!labReadyOrder && selectedOrder.status !== "fulfilled" ? <div className="admin-alert admin-alert--warning mt-3">Set the order status to approved and save it before requesting a quote or submitting to Prodigi.</div> : null}
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <AdminField label="Shipping method" className="min-w-[180px]"><select value={shippingMethod} onChange={(event) => { setShippingMethod(event.target.value); setLabQuote(null); }}><option value="Budget">Budget</option><option value="Standard">Standard</option><option value="StandardPlus">Standard Plus</option><option value="Express">Express</option><option value="Overnight">Overnight</option></select></AdminField>
                <AdminButton size="sm" icon={PackageSearch} onClick={() => labAction("quote", mappedOrderItems.map((item) => item.id))} disabled={busy || !labReadyOrder || !mappedOrderItems.length}>Quote mapped lines</AdminButton>
                <AdminButton size="sm" variant="primary" icon={Send} onClick={() => labAction("submit", preparedOrderItems.map((item) => item.id))} disabled={busy || !labReadyOrder || !preparedOrderItems.length}>Submit prepared lines</AdminButton>
                {latestLabSubmission?.providerOrderId ? <AdminButton size="sm" icon={RefreshCw} onClick={() => labAction("refresh")} disabled={busy}>Refresh lab status</AdminButton> : null}
                {latestLabSubmission?.providerOrderId && !["complete", "cancelled"].includes(latestLabSubmission.status) ? <AdminButton size="sm" variant="danger" icon={Ban} onClick={() => labAction("cancel")} disabled={busy}>Attempt cancellation</AdminButton> : null}
              </div>
              {labQuote ? <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-black/10 bg-white p-3 text-sm"><PackageSearch size={15} /><strong>{labQuote.shippingMethod} estimate</strong><span>{money(labQuote.amountMinor, labQuote.currency)}</span><span className="text-xs text-neutral-500">Prodigi production and delivery cost; your client price is unchanged.</span></div> : null}
              {latestLabSubmission ? <div className="mt-3 rounded-lg border border-black/10 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-sm">{latestLabSubmission.providerOrderId || "Submission attempt"}</strong><p className="mt-1 text-xs text-neutral-500">{latestLabSubmission.shippingMethod} · submitted {displayDate(latestLabSubmission.submittedAt || latestLabSubmission.createdAt)}</p></div><AdminStatus tone={labTone(latestLabSubmission.status)}>{latestLabSubmission.providerStage || latestLabSubmission.status.replaceAll("_", " ")}</AdminStatus></div>{latestLabSubmission.lastError ? <p className="mt-2 text-xs text-red-700">{latestLabSubmission.lastError}</p> : null}{latestLabSubmission.shipments?.length ? <div className="mt-3 space-y-2">{latestLabSubmission.shipments.map((shipment) => <div key={shipment.id || `${shipment.carrierName}-${shipment.trackingNumber}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-2"><div><strong className="text-xs">{[shipment.carrierName, shipment.carrierService].filter(Boolean).join(" · ") || "Shipment"}</strong><p className="mt-1 text-[11px] text-neutral-500">{shipment.dispatchDate ? `Dispatched ${displayDate(shipment.dispatchDate)}` : shipment.status || "Processing"}{shipment.trackingNumber ? ` · ${shipment.trackingNumber}` : ""}</p></div>{shipment.trackingUrl ? <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="admin-button admin-button--secondary admin-button--sm"><ExternalLink size={13} /> Track</a> : <AdminStatus tone={labTone(shipment.status)}>{shipment.status || "processing"}</AdminStatus>}</div>)}</div> : null}</div> : null}
            </div>
            <div className="mt-5 space-y-3">{selectedOrder.items.map((item) => {
              const lineCost = item.studioCostMinor * item.quantity;
              const grossMargin = item.lineTotalMinor - lineCost;
              const mapped = item.labConnectorKey.toLowerCase() === "prodigi" && Boolean(item.labSku && item.recommendedWidthPx && item.recommendedHeightPx);
              const prepared = item.printAsset?.status === "prepared";
              const canPrepare = selectedOrder.paymentStatus === "paid" && ["in_review", "approved", "in_fulfilment"].includes(selectedOrder.status) && mapped && !["submitted", "fulfilled"].includes(item.fulfilmentStatus);
              const canSubmitLine = labReadyOrder && prepared && !["submitted", "fulfilled"].includes(item.fulfilmentStatus);
              return <div key={item.id} className="rounded-xl border border-black/10 p-3">
                <div className="flex items-start gap-3">
                  <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100">{item.thumbSrc ? <img src={item.thumbSrc} alt="" className="h-full w-full object-cover" /> : null}</div>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{item.productName} · {item.variantName}</strong><AdminStatus tone={labTone(item.fulfilmentStatus)}>{item.fulfilmentStatus}</AdminStatus></div><p className="mt-1 truncate text-xs text-neutral-500">{item.filename}</p><p className="mt-1 text-xs">Qty {item.quantity} · Sell {money(item.lineTotalMinor, selectedOrder.currency)} · Cost {money(lineCost, selectedOrder.currency)} · Gross {money(grossMargin, selectedOrder.currency)}</p><p className="mt-1 text-[11px] text-neutral-500">Crop: {cropSummary(item.crop)}</p><p className="mt-1 text-[11px] text-neutral-500">Prodigi: {mapped ? `${item.labSku} · ${item.recommendedWidthPx} × ${item.recommendedHeightPx}px · ${item.labSizing}` : "mapping not verified"}</p>{item.printAsset ? <p className="mt-1 text-[11px] text-neutral-500">Prepared file: {item.printAsset.widthPx} × {item.printAsset.heightPx}px · {fileSize(item.printAsset.fileSize)} · {item.printAsset.status}</p> : null}</div>
                </div>
                <AdminToolbar className="mt-3"><AdminButton size="sm" icon={Scissors} onClick={() => preparePrintItem(item)} disabled={!canPrepare || lineBusy === `prepare-${item.id}`}>{lineBusy === `prepare-${item.id}` ? "Preparing…" : item.printAsset ? "Rebuild JPEG" : "Prepare JPEG"}</AdminButton><AdminButton size="sm" icon={PackageSearch} onClick={() => labAction("quote", [item.id])} disabled={busy || !labReadyOrder || !mapped}>Quote line</AdminButton><AdminButton size="sm" variant="primary" icon={FileCheck2} onClick={() => labAction("submit", [item.id])} disabled={busy || !canSubmitLine}>Submit line</AdminButton>{prepared ? <AdminStatus tone="success"><CheckCircle2 size={13} /> Print-ready</AdminStatus> : mapped ? <AdminStatus tone="warning">JPEG required</AdminStatus> : <AdminStatus tone="danger">Mapping required</AdminStatus>}</AdminToolbar>
              </div>;
            })}</div>
            <div className="mt-5 rounded-xl border border-black/10 p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Payment history</h3><span className="text-xs text-neutral-500">{selectedOrder.paymentEvents.length} event{selectedOrder.paymentEvents.length === 1 ? "" : "s"}</span></div>{selectedOrder.paymentEvents.length ? <div className="mt-3 space-y-2">{selectedOrder.paymentEvents.slice(0, 12).map((event) => <div key={event.id} className="flex items-start justify-between gap-3 border-t border-black/5 pt-2 first:border-0 first:pt-0"><div><strong className="text-xs">{event.eventType}</strong><p className="mt-1 text-[11px] text-neutral-500">{event.providerEventId || "Manual event"} · {displayDate(event.createdAt)}</p></div><AdminStatus tone={event.status === "processed" ? "success" : event.status === "rejected" ? "danger" : "neutral"}>{event.status}</AdminStatus></div>)}</div> : <p className="mt-2 text-xs text-neutral-500">No payment events recorded yet.</p>}</div>
            <AdminToolbar className="mt-5"><AdminButton variant="primary" icon={Save} onClick={saveOrder} disabled={busy}>Save order</AdminButton>{selectedOrder.status === "approved" || selectedOrder.status === "fulfilled" ? <AdminStatus tone="success"><CheckCircle2 size={13} /> {selectedOrder.status}</AdminStatus> : null}</AdminToolbar>
          </AdminPanel> : <AdminPanel><AdminEmptyState icon={ShoppingBag} title="Select an order" description="Review verified Stripe payment, delivery details, crop data and fulfilment status." /></AdminPanel>}
        </div>
      ) : null}
    </AdminPage>
  );
}
