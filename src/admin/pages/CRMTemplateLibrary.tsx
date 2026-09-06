import { AdminPage, AdminPageHeader } from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { QuestionnaireLibrary, WorkflowLibrary } from "./CRM";
export function CRMTemplateLibrary({ type }: { type: "questionnaires" | "workflows" }) {
  const { auth } = useProfessionalAuth();
  const canManage = auth.permissions.includes("crm:manage") && auth.accessMode !== "support";
  return <AdminPage><AdminPageHeader title={type === "questionnaires" ? "Questionnaire templates" : "Workflow templates"} />{type === "questionnaires" ? <QuestionnaireLibrary workspaceId={auth.workspaceId} canManage={canManage} /> : <WorkflowLibrary workspaceId={auth.workspaceId} canManage={canManage} templatesOnly />}</AdminPage>;
}
