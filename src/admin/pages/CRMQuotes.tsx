import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, FileText, PackageCheck, Plus, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AdminButton, AdminEmptyState, AdminPage, AdminPageHeader, AdminPanel, AdminStatus } from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { CrmOverview, CrmQuoteOverview } from "../types/crm";

function dateLabel(value: string) {
  if (!value) return "Date TBC";
  const parsed = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function money(value: number, currency = "GBP") { return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format((value || 0) / 100); }
function tone(status: string) { return status === "accepted" ? "success" : status === "declined" || status === "expired" ? "danger" : status === "sent" || status === "viewed" ? "info" : status === "superseded" ? "neutral" : "warning"; }

export function CRMQuotes() {
  const { auth } = useProfessionalAuth();
  const navigate = useNavigate();
  const canManage = auth.permissions.includes("crm:manage");
  const [overview, setOverview] = useState<CrmQuoteOverview | null>(null);
  const [crm, setCrm] = useState<CrmOverview | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { const [quotes, crmOverview] = await Promise.all([AdminApiService.getCrmQuoteOverview(), AdminApiService.getCrmOverview()]); setOverview(quotes); setCrm(crmOverview); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load quotes."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [auth.workspaceId]);
  const filtered = useMemo(() => (overview?.quotes || []).filter((quote) => [quote.reference, quote.clientName, quote.enquiryReference, quote.venueText, quote.status].some((value) => value.toLowerCase().includes(search.toLowerCase()))), [overview, search]);
  const availableEnquiries = (crm?.enquiries || []).filter((enquiry) => enquiry.status === "open" && !overview?.quotes.some((quote) => quote.enquiryId === enquiry.id && quote.status === "accepted"));

  async function create(enquiryId: string) {
    if (!enquiryId) return;
    setSaving(true); setError("");
    try { const quote = await AdminApiService.createCrmQuote(enquiryId); navigate(`/admin/crm/quotes/${quote.id}`); }
    catch (createError) { setError(createError instanceof Error ? createError.message : "Unable to create quote."); }
    finally { setSaving(false); }
  }

  return <AdminPage>
    <AdminPageHeader eyebrow={<Link to="/admin/crm" className="admin-inline-link inline-flex items-center gap-1"><ArrowLeft size={13} />CRM</Link>} title="Quotes" description="Create versioned package comparisons, send secure portal links and convert accepted quotes into Jobs." actions={<Link className="admin-button admin-button--secondary" to="/admin/crm/catalogue"><PackageCheck className="admin-button__icon" />Package catalogue</Link>} />
    {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
    <AdminPanel title="Create quote" description="Choose an open enquiry. The primary client and enquiry details are linked automatically." icon={Plus}>
      <div className="flex flex-wrap items-end gap-3"><label className="admin-field min-w-[280px] flex-1"><span className="admin-field__label">Enquiry</span><select className="admin-select" id="quote-enquiry-select" disabled={!canManage || saving} defaultValue=""><option value="">Choose enquiry</option>{availableEnquiries.map((enquiry) => <option key={enquiry.id} value={enquiry.id}>{enquiry.reference} · {enquiry.primaryContact?.displayName || "Client"} · {dateLabel(enquiry.eventDate)}</option>)}</select></label><AdminButton variant="primary" icon={Plus} disabled={!canManage || saving || !availableEnquiries.length} onClick={() => { const select = document.getElementById("quote-enquiry-select") as HTMLSelectElement | null; void create(select?.value || ""); }}>Create quote</AdminButton></div>
    </AdminPanel>
    <AdminPanel title="Quote register" description={`${overview?.quotes.length || 0} quotes across this workspace`} icon={FileText} actions={<div className="relative min-w-[240px]"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" /><input className="admin-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search quotes" /></div>}>
      {loading ? <p className="text-[10px] text-neutral-500">Loading quotes…</p> : !filtered.length ? <AdminEmptyState icon={FileText} title="No quotes found" description="Create a quote from an open enquiry." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Quote</th><th>Client</th><th>Event</th><th>Version</th><th>Status</th><th>Representative total</th></tr></thead><tbody>{filtered.map((quote) => <tr key={quote.id}><td><Link className="admin-inline-link" to={`/admin/crm/quotes/${quote.id}`}>{quote.reference}</Link><div className="text-[9px] text-neutral-500">{quote.enquiryReference}</div></td><td>{quote.clientName}<div className="text-[9px] text-neutral-500">{quote.clientEmail}</div></td><td><span className="inline-flex items-center gap-1"><CalendarDays size={11} />{dateLabel(quote.eventDate)}</span><div className="text-[9px] text-neutral-500">{quote.venueText || "Venue TBC"}</div></td><td>v{quote.currentVersion?.versionNumber || 1}</td><td><AdminStatus tone={tone(quote.status) as any}>{quote.status}</AdminStatus></td><td>{money(quote.currentVersion?.totalAmount || 0, quote.currency)}</td></tr>)}</tbody></table></div>}
    </AdminPanel>
  </AdminPage>;
}
