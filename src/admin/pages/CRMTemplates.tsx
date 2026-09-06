import { Link, useOutletContext } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AdminPage, AdminPageHeader } from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { visibleTemplateOptions } from "../navigation/adminSettings";

export function CRMTemplates() {
  const { auth } = useProfessionalAuth();
  const { enabledEntitlementKeys = null } = useOutletContext<{ enabledEntitlementKeys?: ReadonlySet<string> | null }>();
  const options = visibleTemplateOptions(auth.permissions, enabledEntitlementKeys);
  return <AdminPage className="admin-settings-page">
    <AdminPageHeader title="Templates" description="Create and manage reusable content for every stage of your client journey." />
    {enabledEntitlementKeys === null ? <p role="status">Loading available templates…</p> : null}
    <div className="admin-settings-grid">{options.map(item => <Link key={item.to} className="admin-template-destination" aria-label={`Open ${item.label.toLowerCase()}`} to={item.to}><strong>{item.label}</strong><ArrowRight size={15} aria-hidden="true" /></Link>)}</div>
  </AdminPage>;
}
