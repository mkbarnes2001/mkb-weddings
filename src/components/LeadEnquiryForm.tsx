import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Loader2, Send } from "lucide-react";

type LeadFormConfig = {
  businessName: string;
  defaultService: string;
  title: string;
  intro: string;
  thankYouTitle: string;
  thankYouMessage: string;
  privacyText: string;
  consentRequired: boolean;
  currency: string;
};

type FormState = {
  firstName: string;
  lastName: string;
  partnerFirstName: string;
  partnerLastName: string;
  email: string;
  phone: string;
  eventDate: string;
  dateFlexibility: string;
  venueText: string;
  packageInterest: string;
  budgetMax: string;
  message: string;
  privacyConsent: boolean;
  marketingConsent: boolean;
  website: string;
};

function currencySymbol(currency: string) {
  try {
    const part = new Intl.NumberFormat("en-GB", { style: "currency", currency }).formatToParts(0).find((item) => item.type === "currency");
    return part?.value || currency;
  } catch {
    return currency || "GBP";
  }
}

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  partnerFirstName: "",
  partnerLastName: "",
  email: "",
  phone: "",
  eventDate: "",
  dateFlexibility: "",
  venueText: "",
  packageInterest: "",
  budgetMax: "",
  message: "",
  privacyConsent: false,
  marketingConsent: false,
  website: "",
};

export function LeadEnquiryForm({ embedded = false }: { embedded?: boolean }) {
  const [config, setConfig] = useState<LeadFormConfig | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<{ reference: string; title: string; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/public/crm/enquiries", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Enquiry form is not currently available.");
        setConfig(payload.form);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Enquiry form is not currently available."))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/public/crm/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...form,
          serviceInterest: config?.defaultService || "",
          budgetMax: form.budgetMax ? Math.round(Number(form.budgetMax) * 100) : null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to submit your enquiry.");
      setSubmitted({
        reference: payload.enquiry?.reference || "",
        title: payload.enquiry?.thankYouTitle || config?.thankYouTitle || "Thank you",
        message: payload.enquiry?.thankYouMessage || config?.thankYouMessage || "Your enquiry has been received.",
      });
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your enquiry.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex min-h-48 items-center justify-center text-foreground/60"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading enquiry form…</div>;
  if (!config) return <div className="border border-primary/10 bg-secondary/30 p-6 text-foreground/70">{error || "Enquiry form is not currently available."}</div>;
  if (submitted) return <div className="border border-primary/15 bg-secondary/35 p-8 text-center"><CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-primary" /><h2 className="mb-3">{submitted.title}</h2><p className="mx-auto max-w-2xl text-foreground/65">{submitted.message}</p>{submitted.reference ? <p className="mt-4 text-sm font-medium">Reference: {submitted.reference}</p> : null}</div>;

  const body = (
    <>
      {!embedded ? <Helmet><title>{config.title} | {config.businessName}</title><meta name="description" content={config.intro || `Send an enquiry to ${config.businessName}.`} /></Helmet> : null}
      <form onSubmit={submit} className="space-y-6">
      <div><h2 className={embedded ? "mb-3" : "mb-4 text-center"}>{config.title}</h2><p className={`text-foreground/60 ${embedded ? "" : "mx-auto max-w-2xl text-center"}`}>{config.intro}</p></div>
      {error ? <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <LeadField label="Your first name" required><input required value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /></LeadField>
        <LeadField label="Your last name"><input value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></LeadField>
        <LeadField label="Partner first name"><input value={form.partnerFirstName} onChange={(event) => update("partnerFirstName", event.target.value)} /></LeadField>
        <LeadField label="Partner last name"><input value={form.partnerLastName} onChange={(event) => update("partnerLastName", event.target.value)} /></LeadField>
        <LeadField label="Email address" required><input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></LeadField>
        <LeadField label="Phone"><input type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></LeadField>
        <LeadField label="Wedding date"><input type="date" value={form.eventDate} onChange={(event) => update("eventDate", event.target.value)} /></LeadField>
        <LeadField label="Date flexibility"><input value={form.dateFlexibility} onChange={(event) => update("dateFlexibility", event.target.value)} placeholder="Fixed date, flexible month, not chosen yet…" /></LeadField>
        <LeadField label="Venue"><input value={form.venueText} onChange={(event) => update("venueText", event.target.value)} placeholder="Venue name or TBC" /></LeadField>
        <LeadField label="Package interest"><input value={form.packageInterest} onChange={(event) => update("packageInterest", event.target.value)} placeholder="8 hours, full day, not sure…" /></LeadField>
        <LeadField label={`Approximate budget (${currencySymbol(config.currency)})`}><input type="number" min="0" step="50" value={form.budgetMax} onChange={(event) => update("budgetMax", event.target.value)} /></LeadField>
      </div>
      <LeadField label="Tell us about your plans"><textarea rows={6} value={form.message} onChange={(event) => update("message", event.target.value)} placeholder="What matters most to you, ceremony/reception details, questions or anything else we should know…" /></LeadField>
      <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} /></label></div>
      <label className="flex items-start gap-3 text-sm text-foreground/70"><input className="mt-1" type="checkbox" required={config.consentRequired} checked={form.privacyConsent} onChange={(event) => update("privacyConsent", event.target.checked)} /><span>{config.privacyText}</span></label>
      <label className="flex items-start gap-3 text-sm text-foreground/60"><input className="mt-1" type="checkbox" checked={form.marketingConsent} onChange={(event) => update("marketingConsent", event.target.checked)} /><span>I am happy to receive occasional wedding photography news and offers. Optional.</span></label>
      <button type="submit" disabled={submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-6 py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-50">{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}{submitting ? "Sending…" : "Send enquiry"}</button>
      </form>
    </>
  );

  return body;
}

export function Enquire() {
  return <section className="mx-auto max-w-4xl px-6 py-20 md:px-10"><LeadEnquiryForm /></section>;
}

function LeadField({ label, required, children }: { label: string; required?: boolean; children: ReactElement }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium">{label}{required ? " *" : ""}</span>{children && <div className="lead-form-control">{children}</div>}</label>;
}
