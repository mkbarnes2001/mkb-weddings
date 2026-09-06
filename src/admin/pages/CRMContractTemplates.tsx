import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { AdminButton, AdminEmptyState, AdminField, AdminPage, AdminPageHeader, AdminPanel, AdminStatus } from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { CrmContractTemplate } from "../types/crm";

export function CRMContractTemplates() {
  const { auth } = useProfessionalAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<CrmContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const canManage = auth.permissions.includes("crm:manage") && auth.accessMode !== "support";
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setTemplates([]);
    setShowCreate(false);
    setName("");
    AdminApiService.listCrmContractTemplates()
      .then(result => { if (active) setTemplates(result); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load contract templates."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth.workspaceId]);
  async function createTemplate() {
    if (!canManage || creating || !name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const template = await AdminApiService.createCrmContractTemplate({ name: name.trim(), description: "", status: "archived", sections: [] });
      navigate(`/admin/crm/contracts/templates/${template.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create contract template.");
    } finally { setCreating(false); }
  }
  return <AdminPage>
    <AdminPageHeader title="Contract templates" description="Manage reusable terms and contract sections. Choose automatic booking defaults in Booking settings." />
    {error ? <div role="alert" className="admin-alert admin-alert--error">{error}</div> : null}
    <AdminPanel title="Contract templates" icon={FileText} actions={canManage ? <AdminButton variant="primary" size="sm" icon={Plus} disabled={creating || loading} onClick={() => { setShowCreate(true); setName(""); setError(""); }}>New template</AdminButton> : undefined}>
      {showCreate && canManage ? <form className="admin-template-create" onSubmit={event => { event.preventDefault(); void createTemplate(); }}>
        <AdminField label="Template name"><input className="admin-input" autoFocus value={name} required maxLength={180} disabled={creating} onChange={event => setName(event.target.value)} /></AdminField>
        <div className="flex flex-wrap gap-2"><AdminButton type="submit" variant="primary" size="sm" disabled={creating || !name.trim()}>{creating ? "Creating…" : "Create template"}</AdminButton><AdminButton type="button" size="sm" disabled={creating} onClick={() => setShowCreate(false)}>Cancel</AdminButton></div>
      </form> : null}
      {loading ? <p role="status">Loading contract templates…</p> : !templates.length ? <AdminEmptyState icon={FileText} title="No contract templates" description="Create a reusable contract for your client bookings." /> : <div className="questionnaire-template-grid">{templates.map(template => <Link className="questionnaire-template-card" key={template.id} to={`/admin/crm/contracts/templates/${template.id}`}>
        <div><strong>{template.name}</strong><p>{template.description || "No description"}</p></div>
        <div className="flex flex-wrap gap-2"><AdminStatus tone={template.status === "active" ? "success" : "neutral"}>{template.status === "active" ? "active" : "inactive"}</AdminStatus><AdminStatus tone="info">{template.sections.length} sections</AdminStatus></div>
      </Link>)}</div>}
    </AdminPanel>
  </AdminPage>;
}
