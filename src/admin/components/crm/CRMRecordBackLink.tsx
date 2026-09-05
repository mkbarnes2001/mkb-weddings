import { ArrowLeft } from "lucide-react";
import { AdminHeaderRouterLink } from "../ui/AdminUI";

export function CRMRecordBackLink({
  jobId = "",
  fallbackTo,
  fallbackLabel,
}: {
  jobId?: string | null;
  fallbackTo: string;
  fallbackLabel: string;
}) {
  const contextualJobId =
    String(jobId || "").trim();

  const to = contextualJobId
    ? `/admin/crm/jobs/${encodeURIComponent(contextualJobId)}`
    : fallbackTo;

  const label = contextualJobId
    ? "Back to Job"
    : fallbackLabel;

  return (
    <AdminHeaderRouterLink
      className="admin-icon-control"
      to={to}
      aria-label={label}
      title={label}
    >
      <ArrowLeft aria-hidden="true" />
    </AdminHeaderRouterLink>
  );
}
