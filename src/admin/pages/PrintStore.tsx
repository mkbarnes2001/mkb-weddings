import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Box,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Save,
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
  PrintStoreOrderStatus,
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

function cloneProduct(product: PrintStoreProduct) {
  return { ...product, variants: product.variants.map((variant) => ({ ...variant, metadata: { ...(variant.metadata || {}) } })) };
}

function clonePriceList(priceList: PrintStorePriceList) {
  return { ...priceList, items: priceList.items.map((item) => ({ ...item })) };
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

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Commerce"
        title="Print Store"
        description="Manage products, sizes, pricing, gallery ordering and photographer-approved fulfilment."
        actions={<AdminButton icon={RefreshCw} onClick={load} disabled={busy}>Refresh</AdminButton>}
        meta={<div className="flex items-center gap-2"><AdminStatus tone="info">Schema 20</AdminStatus><span>{data?.orders.length || 0} orders</span><span>{activeProducts.length} active products</span></div>}
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
              <AdminField label="Lab connector key" help="Leave blank until a lab connector is configured."><input value={productDraft.labConnectorKey} onChange={(event) => setProductDraft({ ...productDraft, labConnectorKey: event.target.value })} placeholder="loxley" /></AdminField>
              <AdminField label="Lab product code"><input value={productDraft.labProductCode} onChange={(event) => setProductDraft({ ...productDraft, labProductCode: event.target.value })} /></AdminField>
              <AdminField label="Description" className="col-span-2"><textarea rows={3} value={productDraft.description} onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })} /></AdminField>
              <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={productDraft.requiresCrop} onChange={(event) => setProductDraft({ ...productDraft, requiresCrop: event.target.checked })} /> Require a crop choice for this product</label>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Sizes / variants</h3><p className="text-xs text-neutral-500">Each option can map to a future lab SKU.</p></div><AdminButton size="sm" icon={Plus} onClick={() => setProductDraft({ ...productDraft, variants: [...productDraft.variants, blankVariant()] })}>Add option</AdminButton></div>
            <div className="mt-3 overflow-x-auto"><table className="admin-table"><thead><tr><th>Name</th><th>SKU</th><th>Width mm</th><th>Height mm</th><th>Orientation</th><th>Finish</th><th /></tr></thead><tbody>{productDraft.variants.map((variant, index) => <tr key={variant.id || `new-${index}`}><td><input value={variant.name} onChange={(event) => setProductDraft({ ...productDraft, variants: productDraft.variants.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} placeholder="10 × 8 in" /></td><td><input value={variant.sku} onChange={(event) => setProductDraft({ ...productDraft, variants: productDraft.variants.map((item, itemIndex) => itemIndex === index ? { ...item, sku: event.target.value } : item) })} /></td><td><input type="number" min="0" value={variant.widthMm || ""} onChange={(event) => setProductDraft({ ...productDraft, variants: productDraft.variants.map((item, itemIndex) => itemIndex === index ? { ...item, widthMm: Number(event.target.value) } : item) })} /></td><td><input type="number" min="0" value={variant.heightMm || ""} onChange={(event) => setProductDraft({ ...productDraft, variants: productDraft.variants.map((item, itemIndex) => itemIndex === index ? { ...item, heightMm: Number(event.target.value) } : item) })} /></td><td><select value={variant.orientation} onChange={(event) => setProductDraft({ ...productDraft, variants: productDraft.variants.map((item, itemIndex) => itemIndex === index ? { ...item, orientation: event.target.value as PrintStoreProductVariant["orientation"] } : item) })}><option value="any">Any</option><option value="landscape">Landscape</option><option value="portrait">Portrait</option><option value="square">Square</option></select></td><td><input value={variant.finish} onChange={(event) => setProductDraft({ ...productDraft, variants: productDraft.variants.map((item, itemIndex) => itemIndex === index ? { ...item, finish: event.target.value } : item) })} /></td><td><button type="button" title="Remove option" onClick={() => setProductDraft({ ...productDraft, variants: productDraft.variants.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>
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
          <AdminPanel title="Orders" description="Client submissions awaiting payment, approval or fulfilment." icon={ShoppingBag}>
            {!data?.orders.length ? <AdminEmptyState icon={ShoppingBag} title="No orders yet" description="Orders will appear after a Client Gallery store is enabled and a client submits a cart." /> : <div className="space-y-2">{data.orders.map((order) => <button key={order.id} type="button" onClick={() => { setSelectedOrderId(order.id); setOrderDraft({ ...order }); }} className="w-full rounded-lg border border-black/10 bg-white p-3 text-left hover:bg-neutral-50" style={{ outline: selectedOrderId === order.id ? "2px solid #111" : "none" }}><div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{order.orderNumber}</strong><p className="mt-1 text-xs text-neutral-500">{order.clientName || order.email} · {order.galleryTitle}</p><p className="mt-1 text-xs">{money(order.totalMinor, order.currency)} · {order.items.length} line{order.items.length === 1 ? "" : "s"}</p></div><AdminStatus tone={orderTone(order.status)}>{order.status.replaceAll("_", " ")}</AdminStatus></div></button>)}</div>}
          </AdminPanel>
          {selectedOrder ? <AdminPanel title={selectedOrder.orderNumber} description={`${selectedOrder.galleryTitle} · ${selectedOrder.email}`} icon={PackageCheck} actions={<a href={`/admin/client-galleries/${encodeURIComponent(selectedOrder.galleryId)}`} className="admin-button admin-button--secondary admin-button--sm"><ExternalLink size={14} /> Gallery</a>}>
            <div className="grid grid-cols-2 gap-4"><AdminField label="Order status"><select value={selectedOrder.status} onChange={(event) => setOrderDraft({ ...selectedOrder, status: event.target.value as PrintStoreOrderStatus })}>{["pending","awaiting_payment","paid","in_review","approved","in_fulfilment","fulfilled","cancelled","refunded"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></AdminField><AdminField label="Total"><input value={money(selectedOrder.totalMinor, selectedOrder.currency)} readOnly /></AdminField><AdminField label="Payment reference"><input value={selectedOrder.paymentReference} onChange={(event) => setOrderDraft({ ...selectedOrder, paymentReference: event.target.value })} placeholder="Provider payment ID" /></AdminField><AdminField label="Lab connector"><input value={selectedOrder.labConnectorKey} onChange={(event) => setOrderDraft({ ...selectedOrder, labConnectorKey: event.target.value })} placeholder="loxley" /></AdminField><AdminField label="Lab reference"><input value={selectedOrder.labReference} onChange={(event) => setOrderDraft({ ...selectedOrder, labReference: event.target.value })} /></AdminField><AdminField label="Client notes"><textarea rows={2} value={selectedOrder.clientNotes} readOnly /></AdminField><AdminField label="Internal notes" className="col-span-2"><textarea rows={3} value={selectedOrder.internalNotes} onChange={(event) => setOrderDraft({ ...selectedOrder, internalNotes: event.target.value })} /></AdminField></div>
            <div className="mt-5 space-y-2">{selectedOrder.items.map((item) => {
              const lineCost = item.studioCostMinor * item.quantity;
              const grossMargin = item.lineTotalMinor - lineCost;
              const labMapping = [item.labConnectorKey, item.labProductCode].filter(Boolean).join(" · ") || "Manual / unassigned";
              return <div key={item.id} className="flex items-center gap-3 rounded-xl border border-black/10 p-3">
                <div className="h-16 w-20 overflow-hidden rounded-lg bg-neutral-100">{item.thumbSrc ? <img src={item.thumbSrc} alt="" className="h-full w-full object-cover" /> : null}</div>
                <div className="min-w-0 flex-1">
                  <strong className="text-sm">{item.productName} · {item.variantName}</strong>
                  <p className="mt-1 truncate text-xs text-neutral-500">{item.filename}</p>
                  <p className="mt-1 text-xs">Qty {item.quantity} · Sell {money(item.lineTotalMinor, selectedOrder.currency)} · Cost {money(lineCost, selectedOrder.currency)} · Gross {money(grossMargin, selectedOrder.currency)}</p>
                  <p className="mt-1 text-[11px] text-neutral-500">Crop: {cropSummary(item.crop)} · Lab: {labMapping}</p>
                </div>
                <AdminStatus tone="neutral">{item.fulfilmentStatus}</AdminStatus>
              </div>;
            })}</div>
            <AdminToolbar className="mt-5"><AdminButton variant="primary" icon={Save} onClick={saveOrder} disabled={busy}>Save order</AdminButton>{selectedOrder.status === "approved" || selectedOrder.status === "fulfilled" ? <AdminStatus tone="success"><CheckCircle2 size={13} /> {selectedOrder.status}</AdminStatus> : null}</AdminToolbar>
          </AdminPanel> : <AdminPanel><AdminEmptyState icon={ShoppingBag} title="Select an order" description="Review product choices, crop data, payment references and fulfilment status." /></AdminPanel>}
        </div>
      ) : null}
    </AdminPage>
  );
}
