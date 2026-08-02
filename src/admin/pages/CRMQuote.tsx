import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, CopyPlus, ExternalLink, FileText, PackagePlus, Plus, Save, Send, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminButton, AdminEmptyState, AdminField, AdminPage, AdminPageHeader, AdminPanel, AdminStatus } from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { CrmAddon, CrmPackage, CrmQuote, CrmQuoteItem, CrmQuoteOption } from "../types/crm";

type DraftOption = Partial<CrmQuoteOption> & { tempId: string; addonIds: string[]; items: CrmQuoteItem[] };
type Draft = { clientNotes: string; internalNotes: string; expiresAt: string; discountType: "none" | "fixed" | "percentage"; discountValue: number; taxTreatment: "none" | "inclusive" | "exclusive"; taxRateBasisPoints: number; currency: string; options: DraftOption[] };

function money(value: number, currency = "GBP") { return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 2 }).format((value || 0) / 100); }
function tone(status: string) { return status === "accepted" ? "success" : status === "declined" || status === "expired" ? "danger" : status === "sent" || status === "viewed" ? "info" : status === "superseded" ? "neutral" : "warning"; }
function emptyDraft(currency = "GBP"): Draft { return { clientNotes: "", internalNotes: "", expiresAt: "", discountType: "none", discountValue: 0, taxTreatment: "none", taxRateBasisPoints: 0, currency, options: [] }; }
function emptyBespoke(currency: string): DraftOption { return { tempId: crypto.randomUUID(), packageId: "", optionType: "bespoke", name: "Bespoke package", description: "", serviceType: "wedding", internalCode: "", basePriceAmount: 0, currency, coverageMinutes: null, deliverables: [], includedItems: [], clientNotes: "", recommended: false, displayOrder: 10, addonIds: [], items: [] }; }
function lines(value: string[] | undefined) { return (value || []).join("\n"); }
function splitLines(value: string) { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }

export function CRMQuote() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { auth } = useProfessionalAuth();
  const canManage = auth.permissions.includes("crm:manage");
  const [quote, setQuote] = useState<CrmQuote | null>(null);
  const [packages, setPackages] = useState<CrmPackage[]>([]);
  const [addons, setAddons] = useState<CrmAddon[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [offlineOptionId, setOfflineOptionId] = useState("");
  const [offlineAddonQuantities, setOfflineAddonQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function hydrateDraft(current: CrmQuote) {
    const version = current.currentVersion;
    if (!version) { setDraft(emptyDraft(current.currency)); return; }
    setDraft({ clientNotes: version.clientNotes, internalNotes: version.internalNotes, expiresAt: version.expiresAt ? String(version.expiresAt).slice(0, 10) : "", discountType: version.discountType, discountValue: version.discountValue, taxTreatment: version.taxTreatment, taxRateBasisPoints: version.taxRateBasisPoints, currency: version.currency, options: version.options.map((option) => ({ ...option, tempId: option.id || crypto.randomUUID(), addonIds: option.addons.map((addon) => addon.addonId), items: option.items || [] })) });
    const firstOption = version.options[0];
    setOfflineOptionId(firstOption?.id || "");
    setOfflineAddonQuantities(Object.fromEntries((firstOption?.addons || []).map((addon) => [addon.id, addon.requirement === "mandatory" ? Math.max(1, addon.minimumQuantity, addon.defaultQuantity) : addon.defaultQuantity])));
  }
  async function load() {
    setLoading(true); setError("");
    try { const [current, catalogue] = await Promise.all([AdminApiService.getCrmQuote(id), AdminApiService.getCrmQuoteCatalogue()]); setQuote(current); setPackages(catalogue.packages); setAddons(catalogue.addons); hydrateDraft(current); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load quote."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [id, auth.workspaceId]);
  const editable = quote?.currentVersion?.status === "draft";

  function addPackage(packageId: string) {
    const item = packages.find((pkg) => pkg.id === packageId);
    if (!item) return;
    setDraft((current) => ({ ...current, options: [...current.options, { tempId: crypto.randomUUID(), packageId: item.id, optionType: "catalogue", name: item.name, description: item.description, serviceType: item.serviceType, internalCode: item.internalCode, basePriceAmount: item.priceAmount, currency: item.currency, coverageMinutes: item.coverageMinutes, deliverables: item.deliverables, includedItems: item.includedItems, clientNotes: item.clientNotes, recommended: item.recommended, displayOrder: (current.options.length + 1) * 10, addonIds: addons.filter((addon) => addon.status === "active" && (addon.availabilityScope === "all" || item.addonIds.includes(addon.id))).filter((addon) => addon.requirement === "mandatory").map((addon) => addon.id), items: [] }] }));
  }
  function updateOption(tempId: string, patch: Partial<DraftOption>) { setDraft((current) => ({ ...current, options: current.options.map((option) => option.tempId === tempId ? { ...option, ...patch } : option) })); }
  function addItem(tempId: string) { setDraft((current) => ({ ...current, options: current.options.map((option) => option.tempId === tempId ? { ...option, items: [...option.items, { name: "Custom item", description: "", quantity: 1, unitPriceAmount: 0, displayOrder: (option.items.length + 1) * 10 }] } : option) })); }
  function updateItem(tempId: string, index: number, patch: Partial<CrmQuoteItem>) { setDraft((current) => ({ ...current, options: current.options.map((option) => option.tempId === tempId ? { ...option, items: option.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) } : option) })); }
  function removeItem(tempId: string, index: number) { setDraft((current) => ({ ...current, options: current.options.map((option) => option.tempId === tempId ? { ...option, items: option.items.filter((_, itemIndex) => itemIndex !== index) } : option) })); }
  function chooseOfflineOption(optionId: string) {
    setOfflineOptionId(optionId);
    const option = quote?.currentVersion?.options.find((item) => item.id === optionId);
    setOfflineAddonQuantities(Object.fromEntries((option?.addons || []).map((addon) => [addon.id, addon.requirement === "mandatory" ? Math.max(1, addon.minimumQuantity, addon.defaultQuantity) : addon.defaultQuantity])));
  }

  const representative = useMemo(() => {
    const optionTotals = draft.options.map((option) => (option.basePriceAmount || 0) + option.items.reduce((sum, item) => sum + item.quantity * item.unitPriceAmount, 0));
    const subtotal = optionTotals.length ? Math.min(...optionTotals) : 0;
    const discount = draft.discountType === "fixed" ? Math.min(subtotal, draft.discountValue) : draft.discountType === "percentage" ? Math.round(subtotal * Math.min(10000, draft.discountValue) / 10000) : 0;
    const discounted = subtotal - discount;
    const rate = draft.taxRateBasisPoints / 10000;
    const tax = draft.taxTreatment === "exclusive" ? Math.round(discounted * rate) : draft.taxTreatment === "inclusive" && rate ? Math.round(discounted - discounted / (1 + rate)) : 0;
    return { subtotal, discount, tax, total: draft.taxTreatment === "exclusive" ? discounted + tax : discounted };
  }, [draft]);

  async function save() {
    setSaving(true); setError(""); setMessage("");
    try { const saved = await AdminApiService.saveCrmQuote(id, draft as unknown as Record<string, unknown>); setQuote(saved); hydrateDraft(saved); setMessage("Quote draft saved."); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save quote."); }
    finally { setSaving(false); }
  }
  async function sendQuote() {
    setSaving(true); setError(""); setMessage("");
    try { if (editable) await AdminApiService.saveCrmQuote(id, draft as unknown as Record<string, unknown>); const sent = await AdminApiService.sendCrmQuote(id); setQuote(sent); hydrateDraft(sent); setMessage(`Quote sent to ${sent.clientEmail}.`); }
    catch (sendError) { setError(sendError instanceof Error ? sendError.message : "Unable to send quote."); }
    finally { setSaving(false); }
  }
  async function revise() {
    setSaving(true); setError("");
    try { const revised = await AdminApiService.reviseCrmQuote(id); setQuote(revised); hydrateDraft(revised); setMessage(`Version ${revised.currentVersion?.versionNumber} created.`); }
    catch (reviseError) { setError(reviseError instanceof Error ? reviseError.message : "Unable to revise quote."); }
    finally { setSaving(false); }
  }
  async function acceptOffline() {
    if (!offlineOptionId || !window.confirm("Confirm the client accepted this quote offline. This creates the booked Job and locks the accepted version.")) return;
    setSaving(true); setError("");
    try { const conversion = await AdminApiService.acceptCrmQuote(id, { optionId: offlineOptionId, addons: Object.entries(offlineAddonQuantities).map(([id, quantity]) => ({ id, quantity })), confirmed: true }); setMessage(`Quote accepted. ${conversion.jobReference} created.`); navigate(`/admin/crm/jobs/${conversion.jobId}`); }
    catch (acceptError) { setError(acceptError instanceof Error ? acceptError.message : "Unable to accept quote."); }
    finally { setSaving(false); }
  }

  if (loading && !quote) return <AdminPage><p className="text-sm text-neutral-500">Loading quote…</p></AdminPage>;
  if (!quote) return <AdminPage><div className="admin-alert admin-alert--error">{error || "Quote not found."}</div></AdminPage>;
  const version = quote.currentVersion;

  return <AdminPage>
    <AdminPageHeader eyebrow={<Link to="/admin/crm/quotes" className="admin-inline-link inline-flex items-center gap-1"><ArrowLeft size={13} />Quotes</Link>} title={quote.reference} description={`${quote.clientName} · ${quote.enquiryReference} · version ${version?.versionNumber || 1}`} actions={<div className="flex flex-wrap gap-2">{editable ? <AdminButton variant="primary" icon={Save} disabled={saving || !canManage} onClick={() => void save()}>Save draft</AdminButton> : <AdminButton icon={CopyPlus} disabled={saving || !canManage || quote.status === "accepted"} onClick={() => void revise()}>Create revision</AdminButton>}<AdminButton variant="primary" icon={Send} disabled={saving || !canManage || !draft.options.length || quote.status === "accepted"} onClick={() => void sendQuote()}>{version?.sentAt ? "Resend link" : "Send quote"}</AdminButton></div>} meta={<div className="flex flex-wrap gap-2"><AdminStatus tone={tone(quote.status) as any}>{quote.status}</AdminStatus><AdminStatus tone="neutral">v{version?.versionNumber || 1}</AdminStatus>{version?.expiresAt ? <AdminStatus tone="warning">expires {String(version.expiresAt).slice(0, 10)}</AdminStatus> : null}</div>} />
    {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}{message ? <div className="admin-alert admin-alert--success">{message}</div> : null}
    <div className="crm-quote-editor-layout">
      <div className="space-y-5">
        <AdminPanel title="Quote details" description="Sent versions are immutable. Create a revision before changing client-facing content." icon={FileText}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><AdminField label="Expiry date"><input className="admin-input" type="date" disabled={!editable || !canManage} value={draft.expiresAt} onChange={(event) => setDraft((current) => ({ ...current, expiresAt: event.target.value }))} /></AdminField><AdminField label="Discount"><select className="admin-select" disabled={!editable || !canManage} value={draft.discountType} onChange={(event) => setDraft((current) => ({ ...current, discountType: event.target.value as Draft["discountType"] }))}><option value="none">No discount</option><option value="fixed">Fixed amount</option><option value="percentage">Percentage</option></select></AdminField><AdminField label={draft.discountType === "percentage" ? "Discount (%)" : "Discount (£)"}><input className="admin-input" type="number" min="0" disabled={!editable || !canManage || draft.discountType === "none"} value={draft.discountType === "percentage" ? draft.discountValue / 100 : draft.discountValue / 100} onChange={(event) => setDraft((current) => ({ ...current, discountValue: Math.round(Number(event.target.value || 0) * 100) }))} /></AdminField><AdminField label="Tax treatment"><select className="admin-select" disabled={!editable || !canManage} value={draft.taxTreatment} onChange={(event) => setDraft((current) => ({ ...current, taxTreatment: event.target.value as Draft["taxTreatment"] }))}><option value="none">No tax</option><option value="inclusive">Tax included</option><option value="exclusive">Tax added</option></select></AdminField><AdminField label="Tax rate (%)"><input className="admin-input" type="number" min="0" disabled={!editable || !canManage || draft.taxTreatment === "none"} value={draft.taxRateBasisPoints / 100} onChange={(event) => setDraft((current) => ({ ...current, taxRateBasisPoints: Math.round(Number(event.target.value || 0) * 100) }))} /></AdminField></div>
          <div className="mt-3 grid gap-3 md:grid-cols-2"><AdminField label="Client-facing notes"><textarea className="admin-textarea min-h-28" disabled={!editable || !canManage} value={draft.clientNotes} onChange={(event) => setDraft((current) => ({ ...current, clientNotes: event.target.value }))} /></AdminField><AdminField label="Internal notes"><textarea className="admin-textarea min-h-28" disabled={!editable || !canManage} value={draft.internalNotes} onChange={(event) => setDraft((current) => ({ ...current, internalNotes: event.target.value }))} /></AdminField></div>
        </AdminPanel>

        <AdminPanel title="Package choices" description="Clients choose one package. Add-ons are selected independently within that package." icon={PackagePlus} actions={editable ? <div className="flex flex-wrap gap-2"><select className="admin-select min-w-[220px]" id="add-package-select" defaultValue=""><option value="">Choose catalogue package</option>{packages.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name} · {money(item.priceAmount, item.currency)}</option>)}</select><AdminButton size="sm" icon={Plus} disabled={!canManage} onClick={() => { const select = document.getElementById("add-package-select") as HTMLSelectElement | null; addPackage(select?.value || ""); if (select) select.value = ""; }}>Add package</AdminButton><AdminButton size="sm" icon={Plus} disabled={!canManage} onClick={() => setDraft((current) => ({ ...current, options: [...current.options, { ...emptyBespoke(current.currency), displayOrder: (current.options.length + 1) * 10 }] }))}>Bespoke</AdminButton></div> : undefined}>
          {!draft.options.length ? <AdminEmptyState icon={PackagePlus} title="No package choices" description="Add catalogue packages or a bespoke option." /> : <div className="crm-quote-option-list">{draft.options.map((option, optionIndex) => { const packageRecord = packages.find((item) => item.id === option.packageId); const availableAddons = addons.filter((addon) => (addon.status === "active" || (option.addonIds || []).includes(addon.id)) && (addon.availabilityScope === "all" || Boolean(packageRecord?.addonIds.includes(addon.id)))); return <article key={option.tempId}><header><div><span>Option {optionIndex + 1}</span><strong>{option.name || "Unnamed package"}</strong></div>{editable ? <AdminButton variant="ghost" size="sm" icon={Trash2} onClick={() => setDraft((current) => ({ ...current, options: current.options.filter((item) => item.tempId !== option.tempId) }))}>Remove</AdminButton> : null}</header><div className="grid gap-3 md:grid-cols-2"><AdminField label="Name"><input className="admin-input" disabled={!editable || !canManage} value={option.name || ""} onChange={(event) => updateOption(option.tempId, { name: event.target.value })} /></AdminField><AdminField label="Base price (£)"><input className="admin-input" type="number" min="0" disabled={!editable || !canManage} value={(option.basePriceAmount || 0) / 100} onChange={(event) => updateOption(option.tempId, { basePriceAmount: Math.round(Number(event.target.value || 0) * 100) })} /></AdminField><AdminField label="Description"><textarea className="admin-textarea" disabled={!editable || !canManage} value={option.description || ""} onChange={(event) => updateOption(option.tempId, { description: event.target.value })} /></AdminField><AdminField label="Client notes"><textarea className="admin-textarea" disabled={!editable || !canManage} value={option.clientNotes || ""} onChange={(event) => updateOption(option.tempId, { clientNotes: event.target.value })} /></AdminField><AdminField label="Included items" help="One per line"><textarea className="admin-textarea min-h-24" disabled={!editable || !canManage} value={lines(option.includedItems)} onChange={(event) => updateOption(option.tempId, { includedItems: splitLines(event.target.value) })} /></AdminField><AdminField label="Deliverables" help="One per line"><textarea className="admin-textarea min-h-24" disabled={!editable || !canManage} value={lines(option.deliverables)} onChange={(event) => updateOption(option.tempId, { deliverables: splitLines(event.target.value) })} /></AdminField></div><label className="admin-check-row mt-3"><input type="checkbox" disabled={!editable || !canManage} checked={Boolean(option.recommended)} onChange={(event) => updateOption(option.tempId, { recommended: event.target.checked })} /><span>Recommended package</span></label><div className="crm-quote-subsection"><div className="flex items-center justify-between"><strong>Custom line items</strong>{editable ? <AdminButton size="sm" icon={Plus} onClick={() => addItem(option.tempId)}>Add line</AdminButton> : null}</div>{!option.items.length ? <p>No custom line items.</p> : option.items.map((item, itemIndex) => <div className="crm-quote-line-item" key={`${option.tempId}_${itemIndex}`}><input className="admin-input" disabled={!editable || !canManage} value={item.name} onChange={(event) => updateItem(option.tempId, itemIndex, { name: event.target.value })} /><input className="admin-input" type="number" min="1" disabled={!editable || !canManage} value={item.quantity} onChange={(event) => updateItem(option.tempId, itemIndex, { quantity: Number(event.target.value || 1) })} /><input className="admin-input" type="number" min="0" disabled={!editable || !canManage} value={item.unitPriceAmount / 100} onChange={(event) => updateItem(option.tempId, itemIndex, { unitPriceAmount: Math.round(Number(event.target.value || 0) * 100) })} />{editable ? <button type="button" onClick={() => removeItem(option.tempId, itemIndex)}><Trash2 /></button> : null}</div>)}</div><div className="crm-quote-subsection"><strong>Available add-ons</strong>{!availableAddons.length ? <p>No add-ons available for this package.</p> : <div className="crm-checkbox-grid">{availableAddons.map((addon) => <label key={addon.id}><input type="checkbox" disabled={!editable || !canManage || addon.requirement === "mandatory"} checked={(option.addonIds || []).includes(addon.id) || addon.requirement === "mandatory"} onChange={(event) => updateOption(option.tempId, { addonIds: event.target.checked ? [...(option.addonIds || []), addon.id] : (option.addonIds || []).filter((item) => item !== addon.id) })} /><span>{addon.name}<small>{money(addon.priceAmount, addon.currency)} · {addon.requirement}</small></span></label>)}</div>}</div></article>; })}</div>}
        </AdminPanel>
      </div>

      <aside className="space-y-5">
        <AdminPanel title="Summary" icon={FileText} compact><dl className="admin-compact-details"><div><dt>Client</dt><dd>{quote.clientName}</dd></div><div><dt>Email</dt><dd>{quote.clientEmail}</dd></div><div><dt>Event date</dt><dd>{quote.eventDate || "TBC"}</dd></div><div><dt>Venue</dt><dd>{quote.venueText || "TBC"}</dd></div><div><dt>Options</dt><dd>{draft.options.length}</dd></div><div><dt>From</dt><dd>{money(representative.total, draft.currency)}</dd></div></dl>{version?.providerMessageId ? <div className="mt-3 text-[9px] text-neutral-500">Resend ID: {version.providerMessageId}</div> : null}</AdminPanel>
        {version && ["sent", "viewed"].includes(version.status) && canManage ? <AdminPanel title="Offline acceptance" description="Use only when the client accepted outside the portal. This uses the same package, add-on and conversion validation." icon={CheckCircle2} compact><AdminField label="Accepted package"><select className="admin-select" value={offlineOptionId} onChange={(event) => chooseOfflineOption(event.target.value)}>{version.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></AdminField>{version.options.find((option) => option.id === offlineOptionId)?.addons.length ? <div className="crm-offline-addon-list"><strong>Accepted add-ons</strong>{version.options.find((option) => option.id === offlineOptionId)?.addons.map((addon) => { const mandatory = addon.requirement === "mandatory"; const quantity = offlineAddonQuantities[addon.id] ?? addon.defaultQuantity; return <label key={addon.id}><span>{addon.name}<small>{money(addon.unitPriceAmount, addon.currency)} · {mandatory ? "required" : addon.requirement}</small></span><input className="admin-input" type="number" min={mandatory ? Math.max(1, addon.minimumQuantity) : 0} max={addon.maximumQuantity} value={quantity} onChange={(event) => { const raw = Math.max(0, Math.min(addon.maximumQuantity, Number(event.target.value) || 0)); const next = mandatory ? Math.max(1, addon.minimumQuantity, raw) : raw > 0 ? Math.max(addon.minimumQuantity, raw) : 0; setOfflineAddonQuantities((current) => ({ ...current, [addon.id]: next })); }} /></label>; })}</div> : null}<div className="mt-3"><AdminButton variant="primary" icon={CheckCircle2} disabled={saving || !offlineOptionId} onClick={() => void acceptOffline()}>Accept quote and create Job</AdminButton></div></AdminPanel> : null}
        <AdminPanel title="Version history" icon={CopyPlus} compact><div className="crm-version-list">{quote.versions.map((item) => <div key={item.id}><span>v{item.versionNumber}</span><AdminStatus tone={tone(item.status) as any}>{item.status}</AdminStatus><small>{item.sentAt ? `Sent ${String(item.sentAt).slice(0, 10)}` : `Created ${String(item.createdAt).slice(0, 10)}`}</small></div>)}</div></AdminPanel>
        {quote.acceptedJobId ? <AdminPanel title="Booked Job" icon={ExternalLink} compact><Link className="admin-button admin-button--primary" to={`/admin/crm/jobs/${quote.acceptedJobId}`}><ExternalLink className="admin-button__icon" />Open Job</Link></AdminPanel> : null}
      </aside>
    </div>
  </AdminPage>;
}
