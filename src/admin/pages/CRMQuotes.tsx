import { useEffect, useState } from "react";
import { FileText, PackageCheck, Plus } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AdminButton, AdminEmptyState, AdminField, AdminPage, AdminPageHeader, AdminPanel, AdminStatus } from "../components/ui/AdminUI";
import { CRMRecordBackLink } from "../components/crm/CRMRecordBackLink";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { CrmEnquiryDetail, CrmQuoteTemplate, CrmQuoteType } from "../types/crm";

// Quote creation belongs to the Lead that opened it. Old register bookmarks return to Leads.
export function CRMQuotes() {
  const [params] = useSearchParams();
  const enquiryId = params.get("enquiryId") || "";
  return enquiryId ? <LeadQuoteCreator key={enquiryId} enquiryId={enquiryId} /> : <Navigate to="/admin/crm" replace />;
}

function LeadQuoteCreator({ enquiryId }: { enquiryId: string }) {
  const { auth } = useProfessionalAuth();
  const navigate = useNavigate();
  const canManage = auth.permissions.includes("crm:manage") && auth.accessMode !== "support";
  const [detail, setDetail] = useState<CrmEnquiryDetail | null>(null);
  const [templates, setTemplates] = useState<CrmQuoteTemplate[]>([]);
  const [quoteType, setQuoteType] = useState<CrmQuoteType>("pick_and_choose");
  const [templateId, setTemplateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    setError("");
    Promise.all([AdminApiService.getCrmEnquiry(enquiryId), AdminApiService.getCrmQuoteTemplates()])
      .then(([lead, options]) => {
        if (cancelled) return;
        setDetail(lead);
        setTemplates(options);
      })
      .catch(loadError => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load lead."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [auth.workspaceId, enquiryId]);

  useEffect(() => {
    const matching = templates.filter(template => template.status === "active" && template.quoteType === quoteType);
    setTemplateId(current => matching.some(template => template.id === current) ? current : matching.find(template => template.default)?.id || "");
  }, [quoteType, templates]);

  const available = detail?.enquiry.status === "open" && !detail.job
    && !detail.quotes?.some(quote => quote.status === "accepted");
  const matchingTemplates = templates.filter(template => template.status === "active" && template.quoteType === quoteType);

  async function create() {
    if (!canManage || !available || loading || saving) return;
    setSaving(true);
    setError("");
    try {
      const quote = await AdminApiService.createCrmQuote(enquiryId, templateId, quoteType);
      navigate(`/admin/crm/quotes/${quote.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create quote.");
    } finally { setSaving(false); }
  }

  return <AdminPage>
    <AdminPageHeader title="New quote" backLink={<CRMRecordBackLink fallbackTo={`/admin/crm/enquiries/${encodeURIComponent(enquiryId)}`} fallbackLabel="Back to Lead" />} />
    {error ? <div role="alert" className="admin-alert admin-alert--error">{error}</div> : null}
    {loading ? <AdminPanel><p>Loading lead…</p></AdminPanel> : !detail ? <AdminPanel><AdminEmptyState icon={FileText} title="Lead unavailable" description="Return to Leads and open the client record again." /></AdminPanel> : !available ? <AdminPanel><AdminEmptyState icon={FileText} title="This lead cannot receive a new quote" description="Open the Lead or Job to review its existing quotes." /></AdminPanel> : <AdminPanel title={detail.enquiry.primaryContact?.displayName || detail.enquiry.reference} icon={FileText}>
      <div className="crm-quote-type-chooser">
        {([
          { value: "pick_and_choose", label: "Pick & Choose", description: "Let the client choose packages and extras.", icon: PackageCheck },
          { value: "fixed", label: "Fixed", description: "Offer one package with an agreed total.", icon: FileText },
        ] as const).map(({ value, label, description, icon: Icon }) => <button key={value} type="button" className={quoteType === value ? "active" : ""} aria-pressed={quoteType === value} disabled={!canManage || saving} onClick={() => setQuoteType(value)}>
          <span className="crm-quote-type-chooser__icon"><Icon /></span>
          <span><strong>{label}</strong><small>{description}</small></span>
          <AdminStatus tone={quoteType === value ? "success" : "neutral"}>{quoteType === value ? "Selected" : "Choose"}</AdminStatus>
        </button>)}
      </div>
      <div className="crm-lead-quote-create">
        <AdminField label="Quote template"><select className="admin-select" disabled={!canManage || saving} value={templateId} onChange={event => setTemplateId(event.target.value)}>
          <option value="">Start with a blank quote</option>
          {matchingTemplates.map(template => <option key={template.id} value={template.id}>{template.name}{template.default ? " · default" : ""}</option>)}
        </select></AdminField>
        <AdminButton variant="primary" icon={Plus} disabled={!canManage || saving} onClick={() => void create()}>{saving ? "Creating…" : "Create quote"}</AdminButton>
      </div>
    </AdminPanel>}
  </AdminPage>;
}
