import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { AdminPage, AdminPageHeader, AdminPanel, AdminToolbar } from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { visibleSettingsGroups } from "../navigation/adminSettings";

export function Settings({ module = "business" }: { module?: "business" | "crm" }) {
  const { auth } = useProfessionalAuth();
  const { enabledEntitlementKeys = null } = useOutletContext<{ enabledEntitlementKeys?: ReadonlySet<string> | null }>();
  const [query, setQuery] = useState("");
  const groups = visibleSettingsGroups(auth.permissions, enabledEntitlementKeys, module)
    .map(group => ({ ...group, items: group.items.filter(item => `${group.title} ${item.label} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase())) }))
    .filter(group => group.items.length);
  return <AdminPage className="admin-settings-page">
    <AdminPageHeader title={module === "crm" ? "CRM settings" : "Settings"} description={module === "crm" ? "Manage your client experience, booking defaults and reusable templates." : "Manage your business, team and workspace."} />
    <AdminToolbar><label className="admin-settings-search"><Search size={15} aria-hidden="true" /><input className="admin-input" aria-label="Search settings" placeholder="Find a setting…" value={query} onChange={event => setQuery(event.target.value)} /></label></AdminToolbar>
    {enabledEntitlementKeys === null ? <p role="status">Loading available settings…</p> : null}
    <div className="admin-settings-grid">{groups.map(group => <AdminPanel key={group.title} title={group.title} compact>
      <div className="admin-settings-list">{group.items.map(item => <Link className="admin-settings-link" key={item.label} to={item.to}><span><strong>{item.label}</strong><small>{item.description}</small></span><ArrowRight size={15} aria-hidden="true" /></Link>)}</div>
    </AdminPanel>)}</div>
    {!groups.length ? <p role="status">No settings match your search.</p> : null}
  </AdminPage>;
}
