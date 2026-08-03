import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, CalendarDays, CheckCircle2, Download, FileText, Home, LogOut, Mail, PackageCheck, Paperclip, Plus, Save, Search, Send, Trash2, XCircle } from "lucide-react";

type SupplierDirectoryOption = {
  id: string;
  name: string;
  category: string;
  location: string;
  county: string;
};

type SupplierAnswer = {
  mode: "existing" | "unlisted";
  supplierId: string;
  name: string;
  role: string;
  website: string;
  instagram: string;
  email: string;
  phone: string;
  location: string;
  county: string;
};

type PortalQuestionField = {
  id: string;
  type: string;
  label: string;
  help: string;
  required: boolean;
  options: string[];
  supplierRole?: string;
  supplierCategory?: string;
  allowUnlisted?: boolean;
  multiple?: boolean;
};

type PortalQuestionnaire = {
  id: string;
  jobId: string;
  title: string;
  introduction: string;
  status: string;
  dueAt: string;
  fields: PortalQuestionField[];
  responses: Record<string, unknown>;
  files: Array<{ id: string; fieldKey: string; filename: string; fileSize: number; uploadedAt: string }>;
  lastSavedAt?: string;
  completedAt?: string;
};

type PortalJob = {
  id: string;
  reference: string;
  title: string;
  status: string;
  eventDate: string;
  serviceName: string;
  venueText: string;
  weddingSlug: string;
  contactName: string;
  questionnaires: PortalQuestionnaire[];
};


type PortalQuoteAddon = { id: string; addonId: string; name: string; description: string; unitPriceAmount: number; currency: string; minimumQuantity: number; maximumQuantity: number; defaultQuantity: number; requirement: "optional" | "recommended" | "mandatory"; displayOrder: number };
type PortalQuoteOption = { id: string; name: string; description: string; serviceType: string; basePriceAmount: number; currency: string; coverageMinutes: number | null; deliverables: string[]; includedItems: string[]; clientNotes: string; recommended: boolean; items: Array<{ id: string; name: string; quantity: number; unitPriceAmount: number }>; addons: PortalQuoteAddon[] };
type PortalQuoteAcceptance = { optionId: string; acceptedAt: string; subtotalAmount: number; discountAmount: number; taxAmount: number; totalAmount: number; currency: string; selectedPackage: Record<string, unknown>; selectedAddons: Array<PortalQuoteAddon & { quantity: number; lineTotalAmount: number }> };
type PortalQuote = { id: string; reference: string; status: string; clientName: string; partnerName: string; eventDate: string; venueText: string; acceptedJobId: string; acceptance?: PortalQuoteAcceptance | null; currentVersion: { id: string; versionNumber: number; status: string; expiresAt: string; clientNotes: string; discountType: "none" | "fixed" | "percentage"; discountValue: number; taxTreatment: "none" | "inclusive" | "exclusive"; taxRateBasisPoints: number; currency: string; options: PortalQuoteOption[] } };
type PortalQuoteSummary = { id: string; reference: string; status: string; eventDate: string; venueText: string; acceptedJobId: string; updatedAt: string };

type PortalPayload = {
  authenticated: boolean;
  identity: { id: string; email: string; displayName: string } | null;
  business?: {
    name: string;
    logoUrl: string;
    accentColor: string;
    secondaryColor: string;
    backgroundColor: string;
    bannerUrl: string;
    welcomeHeading: string;
    welcomeMessage: string;
    footerText: string;
    contactEmail: string;
  };
  jobs: PortalJob[];
  quotes: PortalQuoteSummary[];
};

function formatDate(value: string) {
  if (!value) return "Date TBC";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function money(value: number, currency = "GBP") { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format((value || 0) / 100); }

function quoteTotals(option: PortalQuoteOption | undefined, quote: PortalQuote | null, quantities: Record<string, number>) {
  if (!option || !quote) return { subtotal: 0, discount: 0, tax: 0, total: 0 };
  const items = option.items.reduce((sum, item) => sum + item.quantity * item.unitPriceAmount, 0);
  const addons = option.addons.reduce((sum, addon) => { let quantity = quantities[addon.id] ?? addon.defaultQuantity; if (addon.requirement === "mandatory") quantity = Math.max(quantity, 1, addon.minimumQuantity); else if (quantity > 0) quantity = Math.max(quantity, addon.minimumQuantity); quantity = Math.min(addon.maximumQuantity, Math.max(0, quantity)); return sum + quantity * addon.unitPriceAmount; }, 0);
  const subtotal = option.basePriceAmount + items + addons;
  const version = quote.currentVersion;
  const discount = version.discountType === "fixed" ? Math.min(subtotal, version.discountValue) : version.discountType === "percentage" ? Math.round(subtotal * version.discountValue / 10000) : 0;
  const discounted = Math.max(0, subtotal - discount);
  const tax = version.taxTreatment === "exclusive" ? Math.round(discounted * version.taxRateBasisPoints / 10000) : version.taxTreatment === "inclusive" && version.taxRateBasisPoints ? Math.round(discounted - discounted / (1 + version.taxRateBasisPoints / 10000)) : 0;
  return { subtotal, discount, tax, total: version.taxTreatment === "exclusive" ? discounted + tax : discounted };
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function portalApiPath(path: string) {
  const url = new URL(path, window.location.origin);
  const workspace = new URLSearchParams(window.location.search).get("workspace");
  if (workspace) url.searchParams.set("workspace", workspace);
  return `${url.pathname}${url.search}`;
}

async function jsonRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
  return body as T;
}

function emptySupplier(field: PortalQuestionField): SupplierAnswer {
  return {
    mode: "existing",
    supplierId: "",
    name: "",
    role: field.supplierRole || field.supplierCategory || "Supplier",
    website: "",
    instagram: "",
    email: "",
    phone: "",
    location: "",
    county: "",
  };
}

function supplierAnswers(value: unknown, field: PortalQuestionField) {
  if (Array.isArray(value)) return value.map((item) => ({ ...emptySupplier(field), ...(item as Partial<SupplierAnswer>) }));
  if (value && typeof value === "object") return [{ ...emptySupplier(field), ...(value as Partial<SupplierAnswer>) }];
  return [];
}

function SupplierQuestion({
  field,
  value,
  suppliers,
  disabled,
  onChange,
}: {
  field: PortalQuestionField;
  value: unknown;
  suppliers: SupplierDirectoryOption[];
  disabled: boolean;
  onChange: (value: SupplierAnswer[]) => void;
}) {
  const [search, setSearch] = useState("");
  const values = supplierAnswers(value, field);
  const filtered = suppliers.filter((supplier) => {
    const categoryMatches = !field.supplierCategory || supplier.category.toLowerCase().includes(field.supplierCategory.toLowerCase());
    const query = search.trim().toLowerCase();
    return categoryMatches && (!query || [supplier.name, supplier.category, supplier.location, supplier.county].join(" ").toLowerCase().includes(query));
  });

  function update(index: number, patch: Partial<SupplierAnswer>) {
    onChange(values.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function add(mode: SupplierAnswer["mode"] = "existing") {
    if (!field.multiple && values.length) return;
    onChange([...values, { ...emptySupplier(field), mode }]);
  }

  function remove(index: number) {
    onChange(values.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="portal-supplier-field">
      {!values.length && !disabled ? <div className="portal-supplier-empty"><p>No supplier added yet.</p><div><button type="button" onClick={() => add("existing")}><Search />Choose Supplier Master</button>{field.allowUnlisted !== false ? <button type="button" className="secondary" onClick={() => add("unlisted")}><Plus />Supplier not listed</button> : null}</div></div> : null}
      {values.map((answer, index) => (
        <article key={`${field.id}_${index}`} className="portal-supplier-entry">
          <div className="portal-supplier-entry__header"><strong>{answer.mode === "existing" ? "Supplier Master" : "Supplier not listed"}</strong>{!disabled ? <button type="button" aria-label="Remove supplier" onClick={() => remove(index)}><Trash2 /></button> : null}</div>
          <div className="portal-supplier-mode">
            <label><input type="radio" checked={answer.mode === "existing"} disabled={disabled} onChange={() => update(index, { mode: "existing", name: "", website: "", instagram: "", email: "", phone: "", location: "", county: "" })} />Choose existing</label>
            {field.allowUnlisted !== false ? <label><input type="radio" checked={answer.mode === "unlisted"} disabled={disabled} onChange={() => update(index, { mode: "unlisted", supplierId: "" })} />Add unlisted</label> : null}
          </div>
          <label><span>Role</span><input value={answer.role} disabled={disabled} onChange={(event) => update(index, { role: event.target.value })} placeholder={field.supplierRole || "Supplier"} /></label>
          {answer.mode === "existing" ? <><label><span>Search suppliers</span><input value={search} disabled={disabled} onChange={(event) => setSearch(event.target.value)} placeholder="Name, category or location" /></label><label><span>Supplier</span><select value={answer.supplierId} disabled={disabled} onChange={(event) => { const selected = suppliers.find((supplier) => supplier.id === event.target.value); update(index, { supplierId: event.target.value, name: selected?.name || "" }); }}><option value="">Choose a supplier</option>{filtered.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}{supplier.category ? ` · ${supplier.category}` : ""}{supplier.location ? ` · ${supplier.location}` : ""}</option>)}</select></label></> : <div className="portal-supplier-details"><label><span>Supplier name</span><input value={answer.name} disabled={disabled} onChange={(event) => update(index, { name: event.target.value })} /></label><label><span>Website</span><input value={answer.website} disabled={disabled} onChange={(event) => update(index, { website: event.target.value })} /></label><label><span>Instagram</span><input value={answer.instagram} disabled={disabled} onChange={(event) => update(index, { instagram: event.target.value })} placeholder="@username" /></label><label><span>Email</span><input type="email" value={answer.email} disabled={disabled} onChange={(event) => update(index, { email: event.target.value })} /></label><label><span>Phone</span><input value={answer.phone} disabled={disabled} onChange={(event) => update(index, { phone: event.target.value })} /></label><label><span>Location</span><input value={answer.location} disabled={disabled} onChange={(event) => update(index, { location: event.target.value })} /></label><label><span>County</span><input value={answer.county} disabled={disabled} onChange={(event) => update(index, { county: event.target.value })} /></label></div>}
        </article>
      ))}
      {field.multiple && values.length && !disabled ? <div className="portal-supplier-add"><button type="button" onClick={() => add("existing")}><Plus />Add another supplier</button>{field.allowUnlisted !== false ? <button type="button" className="secondary" onClick={() => add("unlisted")}><Plus />Add unlisted supplier</button> : null}</div> : null}
      {disabled && values.some((item) => item.mode === "unlisted") ? <p className="portal-supplier-review-note">Unlisted suppliers are sent to the business for review before they are added to Supplier Master.</p> : null}
    </div>
  );
}

type PortalView = "home" | "quotes" | "questionnaires";

function contrastColour(hex: string) {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "111111";
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#171717" : "#ffffff";
}

export function ClientPortal() {
  const initialQuestionnaire = new URLSearchParams(window.location.search).get("questionnaire") || "";
  const initialQuote = new URLSearchParams(window.location.search).get("quote") || "";
  const [portal, setPortal] = useState<PortalPayload | null>(null);
  const [view, setView] = useState<PortalView>(initialQuote ? "quotes" : initialQuestionnaire ? "questionnaires" : "home");
  const [selectedId, setSelectedId] = useState(initialQuestionnaire);
  const [selectedQuoteId, setSelectedQuoteId] = useState(initialQuote);
  const [quote, setQuote] = useState<PortalQuote | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [questionnaire, setQuestionnaire] = useState<PortalQuestionnaire | null>(null);
  const [supplierDirectory, setSupplierDirectory] = useState<SupplierDirectoryOption[]>([]);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadPortal() {
    setLoading(true);
    setError("");
    try {
      const result = await jsonRequest<{ ok: true; portal: PortalPayload }>(portalApiPath("/api/public/client-portal"));
      setPortal(result.portal);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load client portal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPortal(); }, []);

  useEffect(() => {
    if (!selectedId || !portal?.authenticated) { setQuestionnaire(null); setSupplierDirectory([]); return; }
    setSaving(true);
    setError("");
    jsonRequest<{ ok: true; questionnaire: PortalQuestionnaire; suppliers?: SupplierDirectoryOption[] }>(portalApiPath(`/api/public/client-portal/questionnaires/${encodeURIComponent(selectedId)}`))
      .then((result) => { setQuestionnaire(result.questionnaire); setResponses(result.questionnaire.responses || {}); setSupplierDirectory(result.suppliers || []); })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load questionnaire."))
      .finally(() => setSaving(false));
  }, [selectedId, portal?.authenticated]);

  useEffect(() => {
    if (!selectedQuoteId || !portal?.authenticated) { setQuote(null); return; }
    setSaving(true); setError("");
    jsonRequest<{ ok: true; quote: PortalQuote }>(portalApiPath(`/api/public/client-portal/quotes/${encodeURIComponent(selectedQuoteId)}`))
      .then((result) => {
        setQuote(result.quote);
        const accepted = result.quote.acceptance;
        const option = (accepted ? result.quote.currentVersion.options.find((item) => item.id === accepted.optionId) : null)
          || result.quote.currentVersion.options.find((item) => item.recommended)
          || result.quote.currentVersion.options[0];
        setSelectedOptionId(option?.id || "");
        const quantities: Record<string, number> = {};
        for (const addon of option?.addons || []) {
          const acceptedAddon = accepted?.selectedAddons.find((item) => item.id === addon.id || (item.addonId && item.addonId === addon.addonId));
          quantities[addon.id] = acceptedAddon?.quantity ?? (addon.requirement === "mandatory" ? Math.max(1, addon.minimumQuantity, addon.defaultQuantity) : addon.defaultQuantity);
        }
        setAddonQuantities(quantities);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load quote."))
      .finally(() => setSaving(false));
  }, [selectedQuoteId, portal?.authenticated]);

  const selectedJob = useMemo(() => portal?.jobs.find((job) => job.questionnaires.some((item) => item.id === selectedId)) || null, [portal?.jobs, selectedId]);

  async function refreshQuestionnaire() {
    if (!questionnaire) return;
    const refreshed = await jsonRequest<{ ok: true; questionnaire: PortalQuestionnaire; suppliers?: SupplierDirectoryOption[] }>(portalApiPath(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}`));
    setQuestionnaire(refreshed.questionnaire);
    setResponses(refreshed.questionnaire.responses || {});
    setSupplierDirectory(refreshed.suppliers || supplierDirectory);
  }

  async function requestLink() {
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await jsonRequest<{ ok: true; message: string }>(portalApiPath("/api/public/client-portal/request-link"), { method: "POST", body: JSON.stringify({ email }) });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send sign-in link.");
    } finally { setSaving(false); }
  }

  async function save(submit = false) {
    if (!questionnaire) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await jsonRequest<{ ok: true; questionnaire: PortalQuestionnaire }>(portalApiPath(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}`), { method: "PUT", body: JSON.stringify({ responses, submit }) });
      setQuestionnaire(result.questionnaire);
      setResponses(result.questionnaire.responses || {});
      setMessage(submit ? "Questionnaire submitted. Thank you." : "Progress saved. You can safely return later.");
      await loadPortal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save questionnaire.");
    } finally { setSaving(false); }
  }

  async function upload(fieldKey: string, file: File | undefined) {
    if (!questionnaire || !file) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const form = new FormData();
      form.set("fieldKey", fieldKey);
      form.set("file", file);
      const response = await fetch(portalApiPath(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}/files`), { method: "POST", credentials: "include", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Unable to upload file.");
      await refreshQuestionnaire();
      setMessage(`${file.name} uploaded.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload file.");
    } finally { setSaving(false); }
  }

  async function removeFile(fileId: string) {
    if (!questionnaire || !window.confirm("Remove this file?")) return;
    setSaving(true); setError("");
    try {
      await jsonRequest(portalApiPath(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}/files/${encodeURIComponent(fileId)}`), { method: "DELETE" });
      await refreshQuestionnaire();
      setMessage("File removed.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove file.");
    } finally { setSaving(false); }
  }

  function chooseQuoteOption(option: PortalQuoteOption) {
    setSelectedOptionId(option.id);
    const quantities: Record<string, number> = {};
    for (const addon of option.addons) quantities[addon.id] = addon.requirement === "mandatory" ? Math.max(1, addon.minimumQuantity, addon.defaultQuantity) : addon.defaultQuantity;
    setAddonQuantities(quantities);
  }

  async function acceptQuote() {
    if (!quote || !selectedOptionId || !window.confirm("Accept this quote and confirm your selected package and extras?")) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const addons = Object.entries(addonQuantities).map(([id, quantity]) => ({ id, quantity }));
      const result = await jsonRequest<{ ok: true; conversion: { jobReference: string } }>(portalApiPath(`/api/public/client-portal/quotes/${encodeURIComponent(quote.id)}/accept`), { method: "POST", body: JSON.stringify({ optionId: selectedOptionId, addons, confirmed: true }) });
      setMessage(`Quote accepted. Your booking ${result.conversion.jobReference} is now active.`);
      setSelectedQuoteId(quote.id);
      await loadPortal();
      const refreshed = await jsonRequest<{ ok: true; quote: PortalQuote }>(portalApiPath(`/api/public/client-portal/quotes/${encodeURIComponent(quote.id)}`));
      setQuote(refreshed.quote);
    } catch (acceptError) { setError(acceptError instanceof Error ? acceptError.message : "Unable to accept quote."); }
    finally { setSaving(false); }
  }

  async function declineQuote() {
    if (!quote || !window.confirm("Decline this quote? The business will be notified.")) return;
    const reason = window.prompt("Optional reason for declining:", "") || "";
    setSaving(true); setError(""); setMessage("");
    try { await jsonRequest(portalApiPath(`/api/public/client-portal/quotes/${encodeURIComponent(quote.id)}/decline`), { method: "POST", body: JSON.stringify({ reason }) }); setMessage("Quote declined. The business has been notified."); await loadPortal(); setQuote({ ...quote, status: "declined", currentVersion: { ...quote.currentVersion, status: "declined" } }); }
    catch (declineError) { setError(declineError instanceof Error ? declineError.message : "Unable to decline quote."); }
    finally { setSaving(false); }
  }

  async function signOut() {
    await fetch("/api/public/client-auth/sign-out", { method: "POST", credentials: "include" }).catch(() => {});
    setPortal({ authenticated: false, identity: null, jobs: [], quotes: [] });
    setView("home"); setSelectedId(""); setSelectedQuoteId("");
    setQuestionnaire(null); setQuote(null);
  }

  const accent = portal?.business?.accentColor || "#111111";
  const secondary = portal?.business?.secondaryColor || "#f1efe9";
  const background = portal?.business?.backgroundColor || "#f7f6f3";
  const portalStyle = {
    "--portal-accent": accent,
    "--portal-secondary": secondary,
    "--portal-background": background,
    "--portal-on-accent": contrastColour(accent),
  } as CSSProperties;
  const allQuestionnaires = portal?.jobs.flatMap((job) => job.questionnaires.map((item) => ({ ...item, job }))) || [];
  const completedQuestionnaires = allQuestionnaires.filter((item) => item.status === "completed").length;
  const pendingQuestionnaires = allQuestionnaires.length - completedQuestionnaires;
  const primaryJob = portal?.jobs[0] || null;
  const acceptedQuotes = portal?.quotes.filter((item) => item.status === "accepted").length || 0;
  const clientFirstName = (portal?.identity?.displayName || portal?.identity?.email || "there").split(/[ @]/)[0];
  const selectedQuoteOption = quote?.currentVersion.options.find((option) => option.id === selectedOptionId);
  const selectedQuoteTotals = quoteTotals(selectedQuoteOption, quote, addonQuantities);
  const acceptedQuote = quote?.currentVersion.status === "accepted" ? quote.acceptance : null;
  const displayedQuoteTotals = acceptedQuote ? {
    subtotal: acceptedQuote.subtotalAmount,
    discount: acceptedQuote.discountAmount,
    tax: acceptedQuote.taxAmount,
    total: acceptedQuote.totalAmount,
  } : selectedQuoteTotals;
  const displayedQuoteAddons = selectedQuoteOption?.addons.filter((addon) => !acceptedQuote || (addonQuantities[addon.id] ?? 0) > 0) || [];

  if (loading && !portal) return <div className="client-portal-shell"><div className="client-portal-loading">Loading client portal…</div></div>;

  if (!portal?.authenticated) {
    return (
      <div className="client-portal-shell" style={portalStyle}>
        <Helmet><title>Client portal</title><meta name="robots" content="noindex,nofollow" /></Helmet>
        <main className="client-portal-signin">
          <div className="client-portal-brand">{portal?.business?.logoUrl ? <img src={portal.business.logoUrl} alt="" /> : <span>WP</span>}</div>
          <p className="client-portal-eyebrow">Secure client portal</p>
          <h1>Open your wedding workspace</h1>
          <p>Enter the email address linked to your quote or booking. We will send a one-time sign-in link.</p>
          {error ? <div className="client-portal-alert client-portal-alert--error">{error}</div> : null}
          {message ? <div className="client-portal-alert client-portal-alert--success">{message}</div> : null}
          <label><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <button onClick={() => void requestLink()} disabled={saving || !email.trim()}><Mail />Send secure sign-in link</button>
        </main>
      </div>
    );
  }

  return (
    <div className="client-portal-shell" style={portalStyle}>
      <Helmet><title>{portal.business?.name || "WedPlanned"} client portal</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <header
        className="client-portal-hero"
        style={portal.business?.bannerUrl ? { backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.36), rgba(0,0,0,.08)), url(${portal.business.bannerUrl})` } : undefined}
      >
        <div className="client-portal-hero__identity">
          <div className="client-portal-hero__logo">{portal.business?.logoUrl ? <img src={portal.business.logoUrl} alt={`${portal.business?.name || "Business"} logo`} /> : <span>{(portal.business?.name || "WP").slice(0, 2).toUpperCase()}</span>}</div>
          <div><strong>{portal.business?.name || "WedPlanned"}</strong><small>Client portal</small></div>
        </div>
        <div className="client-portal-user"><span>{portal.identity?.displayName || portal.identity?.email}</span><button onClick={() => void signOut()}><LogOut />Sign out</button></div>
      </header>
      <nav className="client-portal-nav" aria-label="Client portal sections">
        <button className={view === "home" ? "active" : ""} onClick={() => { setView("home"); setSelectedId(""); setSelectedQuoteId(""); setQuestionnaire(null); setQuote(null); }}><Home />Home</button>
        {portal.quotes.length ? <button className={view === "quotes" ? "active" : ""} onClick={() => { setView("quotes"); setSelectedId(""); setQuestionnaire(null); }}><PackageCheck />Quotes</button> : null}
        {allQuestionnaires.length ? <button className={view === "questionnaires" ? "active" : ""} onClick={() => { setView("questionnaires"); setSelectedQuoteId(""); setQuote(null); }}><FileText />Questionnaires</button> : null}
      </nav>
      {view === "home" ? <main className="client-portal-home">
        {error ? <div className="client-portal-alert client-portal-alert--error">{error}</div> : null}
        {message ? <div className="client-portal-alert client-portal-alert--success">{message}</div> : null}
        <section className="client-portal-welcome">
          <p className="client-portal-eyebrow">Welcome, {clientFirstName}</p>
          <h1>{portal.business?.welcomeHeading || "Welcome to your client portal"}</h1>
          <p>{portal.business?.welcomeMessage || "Everything for your booking is organised here in one secure place."}</p>
        </section>
        {primaryJob ? <section className="client-portal-event-card">
          <div><small>Your booking</small><h2>{primaryJob.title}</h2><p><CalendarDays />{formatDate(primaryJob.eventDate)}{primaryJob.venueText ? ` · ${primaryJob.venueText}` : ""}</p></div>
          <span>{primaryJob.status.replace(/_/g, " ")}</span>
        </section> : null}
        <section className="client-portal-home-grid">
          {portal.quotes.length ? <button onClick={() => setView("quotes")}><PackageCheck /><span><small>Quotes</small><strong>{acceptedQuotes ? `${acceptedQuotes} accepted` : `${portal.quotes.length} available`}</strong><em>Review package options and booking details</em></span></button> : null}
          {allQuestionnaires.length ? <button onClick={() => setView("questionnaires")}><FileText /><span><small>Questionnaires</small><strong>{pendingQuestionnaires ? `${pendingQuestionnaires} to complete` : "Complete"}</strong><em>{completedQuestionnaires} of {allQuestionnaires.length} completed</em></span></button> : null}
        </section>
        {!portal.jobs.length && !portal.quotes.length ? <div className="client-portal-empty"><FileText /><h2>Nothing is waiting for you</h2><p>No active quotes or bookings are linked to this email.</p></div> : null}
      </main> : <div className="client-portal-layout">
        <aside className="client-portal-sidebar">
          {view === "quotes" ? <><p className="client-portal-eyebrow">Your quotes</p><div className="client-portal-quote-links">{portal.quotes.map((item) => <button key={item.id} className={selectedQuoteId === item.id ? "active" : ""} onClick={() => { setSelectedQuoteId(item.id); setSelectedId(""); setQuestionnaire(null); }}><PackageCheck /><span><strong>{item.reference}</strong><small>{item.status.replace(/_/g, " ")} · {formatDate(item.eventDate)}</small></span>{item.status === "accepted" ? <CheckCircle2 /> : null}</button>)}</div></> : null}
          {view === "questionnaires" ? <><p className="client-portal-eyebrow">Your questionnaires</p>{portal.jobs.map((job) => <section key={job.id} className="client-portal-job"><h2>{job.title}</h2><p><CalendarDays />{formatDate(job.eventDate)}</p><p>{job.venueText || "Venue TBC"}</p><div>{job.questionnaires.map((item) => <button key={item.id} className={selectedId === item.id ? "active" : ""} onClick={() => { setSelectedId(item.id); setSelectedQuoteId(""); setQuote(null); }}><FileText /><span>{item.title}<small>{item.status.replace(/_/g, " ")}</small></span>{item.status === "completed" ? <CheckCircle2 /> : null}</button>)}</div></section>)}</> : null}
        </aside>
        <main className="client-portal-main">
          {error ? <div className="client-portal-alert client-portal-alert--error">{error}</div> : null}
          {message ? <div className="client-portal-alert client-portal-alert--success">{message}</div> : null}
          {quote ? <article className="portal-quote-card">
            <div className="portal-quote-heading"><button className="client-portal-back" onClick={() => setSelectedQuoteId("")}><ArrowLeft />Back</button><span>{portal.business?.name || "WedPlanned"}</span><h1>Your quote</h1><p className="portal-quote-client">Prepared for {quote.clientName}{quote.partnerName ? ` and ${quote.partnerName}` : ""}</p><div className="portal-quote-meta"><strong>{quote.reference}</strong><span>Version {quote.currentVersion.versionNumber}</span><span>{formatDate(quote.eventDate)}</span><span>{quote.venueText || "Venue TBC"}</span>{quote.currentVersion.expiresAt ? <span>Expires {formatDate(quote.currentVersion.expiresAt)}</span> : null}</div>{quote.currentVersion.clientNotes ? <p>{quote.currentVersion.clientNotes}</p> : null}</div>
            <div className="portal-package-grid">{quote.currentVersion.options.map((option) => <button type="button" key={option.id} className={`portal-package-card ${selectedOptionId === option.id ? "selected" : ""}`} disabled={["accepted", "declined", "expired"].includes(quote.currentVersion.status)} onClick={() => chooseQuoteOption(option)}>{option.recommended ? <em>Recommended</em> : null}<span className="portal-package-check">{selectedOptionId === option.id ? <CheckCircle2 /> : null}</span><h2>{option.name}</h2>{option.description ? <p>{option.description}</p> : null}<strong>{money(option.basePriceAmount, option.currency)}</strong>{option.coverageMinutes ? <small>{Math.round(option.coverageMinutes / 60)} hours coverage</small> : null}<ul>{option.includedItems.map((item) => <li key={item}>{item}</li>)}</ul>{option.deliverables.length ? <div className="portal-package-deliverables"><b>Deliverables</b>{option.deliverables.map((item) => <span key={item}>{item}</span>)}</div> : null}</button>)}</div>
            {displayedQuoteAddons.length ? <section className="portal-quote-addons"><h2>{acceptedQuote ? "Selected extras" : "Optional extras"}</h2><p>{acceptedQuote ? "Extras included in your accepted booking." : "Select permitted extras for your chosen package."}</p>{displayedQuoteAddons.map((addon) => { const quantity = addonQuantities[addon.id] ?? addon.defaultQuantity; const mandatory = addon.requirement === "mandatory"; return <div key={addon.id} className="portal-quote-addon"><div><strong>{addon.name}{mandatory ? <small>Required</small> : addon.requirement === "recommended" ? <small>Recommended</small> : null}</strong><p>{addon.description}</p></div><span>{money(addon.unitPriceAmount, addon.currency)}</span>{acceptedQuote ? <strong className="portal-quote-addon-accepted">× {quantity}</strong> : <label><span>Quantity</span><input type="number" min={mandatory ? Math.max(1, addon.minimumQuantity) : 0} max={addon.maximumQuantity} value={quantity} onChange={(event) => { const raw = Math.max(0, Math.min(addon.maximumQuantity, Number(event.target.value) || 0)); const next = mandatory ? Math.max(1, addon.minimumQuantity, raw) : raw > 0 ? Math.max(addon.minimumQuantity, raw) : 0; setAddonQuantities((current) => ({ ...current, [addon.id]: next })); }} /></label>}</div>; })}</section> : null}
            <section className="portal-quote-summary"><h2>Price summary</h2><dl><div><dt>Subtotal</dt><dd>{money(displayedQuoteTotals.subtotal, acceptedQuote?.currency || quote.currentVersion.currency)}</dd></div>{displayedQuoteTotals.discount ? <div><dt>Discount</dt><dd>−{money(displayedQuoteTotals.discount, acceptedQuote?.currency || quote.currentVersion.currency)}</dd></div> : null}{quote.currentVersion.taxTreatment !== "none" ? <div><dt>Tax {quote.currentVersion.taxTreatment === "inclusive" ? "included" : ""}</dt><dd>{money(displayedQuoteTotals.tax, acceptedQuote?.currency || quote.currentVersion.currency)}</dd></div> : null}<div className="total"><dt>Total</dt><dd>{money(displayedQuoteTotals.total, acceptedQuote?.currency || quote.currentVersion.currency)}</dd></div></dl></section>
            <footer className="portal-quote-actions">{quote.currentVersion.status === "accepted" ? <div className="client-portal-complete"><CheckCircle2 /><span>Quote accepted. Your booking is active.</span></div> : quote.currentVersion.status === "declined" ? <div className="client-portal-complete muted"><XCircle /><span>This quote was declined.</span></div> : quote.currentVersion.status === "expired" ? <div className="client-portal-complete muted"><XCircle /><span>This quote has expired.</span></div> : <><button className="secondary" disabled={saving} onClick={() => void declineQuote()}><XCircle />Decline quote</button><button disabled={saving || !selectedOptionId} onClick={() => void acceptQuote()}><CheckCircle2 />Accept quote</button></>}</footer>
          </article> : !questionnaire ? <div className="client-portal-empty"><FileText /><h2>Select a quote or questionnaire</h2><p>Choose an item from the sidebar to continue.</p></div> : (
            <article className="portal-questionnaire-card">
              <div className="portal-questionnaire-heading"><button className="client-portal-back" onClick={() => setSelectedId("")}><ArrowLeft />Back</button><span>{selectedJob?.title}</span><h1>{questionnaire.title}</h1>{questionnaire.introduction ? <p>{questionnaire.introduction}</p> : null}<div className="portal-questionnaire-meta"><span>{questionnaire.status.replace(/_/g, " ")}</span>{questionnaire.dueAt ? <span>Due {formatDate(questionnaire.dueAt)}</span> : null}{questionnaire.lastSavedAt ? <span>Saved {new Date(questionnaire.lastSavedAt).toLocaleString("en-GB")}</span> : null}</div></div>
              <div className="portal-questionnaire-fields">
                {questionnaire.fields.map((field) => {
                  if (field.type === "heading") return <h2 key={field.id}>{field.label}</h2>;
                  if (field.type === "description") return <p key={field.id} className="portal-question-description">{field.label}</p>;
                  const value = responses[field.id];
                  const files = questionnaire.files.filter((file) => file.fieldKey === field.id);
                  if (field.type === "supplier") return <div key={field.id} className="portal-question-field"><span>{field.label}{field.required ? <b> *</b> : null}</span>{field.help ? <small>{field.help}</small> : null}<SupplierQuestion field={field} value={value} suppliers={supplierDirectory} disabled={questionnaire.status === "completed"} onChange={(next) => setResponses((current) => ({ ...current, [field.id]: next }))} /></div>;
                  return <label key={field.id} className="portal-question-field"><span>{field.label}{field.required ? <b> *</b> : null}</span>{field.help ? <small>{field.help}</small> : null}{field.type === "short_text" ? <input value={String(value ?? "")} disabled={questionnaire.status === "completed"} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.value }))} /> : null}{field.type === "long_text" ? <textarea value={String(value ?? "")} disabled={questionnaire.status === "completed"} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.value }))} /> : null}{field.type === "select" ? <select value={String(value ?? "")} disabled={questionnaire.status === "completed"} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.value }))}><option value="">Choose an option</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : null}{field.type === "radio" ? <div className="portal-choice-list">{field.options.map((option) => <label key={option}><input type="radio" name={field.id} checked={value === option} disabled={questionnaire.status === "completed"} onChange={() => setResponses((current) => ({ ...current, [field.id]: option }))} />{option}</label>)}</div> : null}{field.type === "checkbox" ? <div className="portal-choice-list">{field.options.map((option) => { const selected = Array.isArray(value) ? value as string[] : []; return <label key={option}><input type="checkbox" checked={selected.includes(option)} disabled={questionnaire.status === "completed"} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.checked ? [...selected, option] : selected.filter((item) => item !== option) }))} />{option}</label>; })}</div> : null}{field.type === "file" ? <div className="portal-file-field"><input type="file" disabled={saving || questionnaire.status === "completed"} onChange={(event) => { const file = event.target.files?.[0]; void upload(field.id, file); event.currentTarget.value = ""; }} /><div className="portal-file-list">{files.map((file) => <div key={file.id}><Paperclip /><a href={portalApiPath(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}/files/${encodeURIComponent(file.id)}`)} target="_blank" rel="noreferrer"><span>{file.filename}</span><small>{formatBytes(file.fileSize)}</small></a>{questionnaire.status !== "completed" ? <button type="button" onClick={() => void removeFile(file.id)}><Trash2 /></button> : <Download />}</div>)}</div></div> : null}</label>;
                })}
              </div>
              <footer className="portal-questionnaire-actions">{questionnaire.status === "completed" ? <div className="client-portal-complete"><CheckCircle2 /><span>Submitted {questionnaire.completedAt ? new Date(questionnaire.completedAt).toLocaleString("en-GB") : ""}</span></div> : <><button className="secondary" disabled={saving} onClick={() => void save(false)}><Save />Save progress</button><button disabled={saving} onClick={() => void save(true)}><Send />Submit questionnaire</button></>}</footer>
            </article>
          )}
        </main>
      </div>}
      {portal.business?.footerText || portal.business?.contactEmail ? <footer className="client-portal-footer"><span>{portal.business?.footerText || `Need help? Contact ${portal.business?.name || "the business"}.`}</span>{portal.business?.contactEmail ? <a href={`mailto:${portal.business.contactEmail}`}>{portal.business.contactEmail}</a> : null}</footer> : null}
    </div>
  );
}
