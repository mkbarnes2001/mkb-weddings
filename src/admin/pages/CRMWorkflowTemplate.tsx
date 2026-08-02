import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Archive, ArrowDown, ArrowUp, Plus, Save, Trash2, Workflow } from "lucide-react";
import { AdminButton, AdminField, AdminPage, AdminPageHeader, AdminPanel, AdminStatus } from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { CrmWorkflowStep, CrmWorkflowTemplate } from "../types/crm";

function blankStep(index: number): CrmWorkflowStep {
  return {
    id: `workflow_step_${crypto.randomUUID()}`,
    templateId: "",
    name: `Task ${index + 1}`,
    description: "",
    taskType: "task",
    relativeTo: "event_date",
    offsetDays: 0,
    priority: "normal",
    sortOrder: (index + 1) * 10,
    required: true,
  };
}

function timingLabel(step: CrmWorkflowStep) {
  const date = step.relativeTo === "booking_date" ? "booking" : "event";
  if (step.offsetDays === 0) return `On ${date} date`;
  return `${Math.abs(step.offsetDays)} day${Math.abs(step.offsetDays) === 1 ? "" : "s"} ${step.offsetDays < 0 ? "before" : "after"} ${date}`;
}

export function CRMWorkflowTemplate() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { auth } = useProfessionalAuth();
  const [template, setTemplate] = useState<CrmWorkflowTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canManage = auth.permissions.includes("crm:manage");

  async function load() {
    setLoading(true);
    setError("");
    try { setTemplate(await AdminApiService.getCrmWorkflowTemplate(id)); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load workflow template."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [id, auth.workspaceId]);

  function updateStep(index: number, patch: Partial<CrmWorkflowStep>) {
    setTemplate((current) => current ? { ...current, steps: current.steps.map((step, itemIndex) => itemIndex === index ? { ...step, ...patch } : step) } : current);
  }

  function moveStep(index: number, direction: -1 | 1) {
    setTemplate((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.steps.length) return current;
      const steps = [...current.steps];
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...current, steps: steps.map((step, itemIndex) => ({ ...step, sortOrder: (itemIndex + 1) * 10 })) };
    });
  }

  async function save() {
    if (!template) return;
    setSaving(true); setError(""); setMessage("");
    try {
      setTemplate(await AdminApiService.saveCrmWorkflowTemplate(template.id, template));
      setMessage("Workflow template saved. Existing Jobs keep their current task snapshot.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save workflow template."); }
    finally { setSaving(false); }
  }

  async function archive() {
    if (!template || !window.confirm("Archive this workflow template? Existing Job tasks will remain.")) return;
    setSaving(true); setError("");
    try {
      await AdminApiService.archiveCrmWorkflowTemplate(template.id);
      navigate("/admin/crm?view=workflows");
    } catch (archiveError) { setError(archiveError instanceof Error ? archiveError.message : "Unable to archive workflow template."); }
    finally { setSaving(false); }
  }

  if (loading && !template) return <AdminPage><p className="text-sm text-neutral-500">Loading workflow…</p></AdminPage>;
  if (!template) return <AdminPage><div className="admin-alert admin-alert--error">{error || "Workflow template not found."}</div></AdminPage>;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow={<Link to="/admin/crm?view=workflows" className="admin-inline-link inline-flex items-center gap-1"><ArrowLeft size={13} />CRM workflows</Link>}
        title={template.name}
        description="Build a reusable sequence of dated tasks. Applied Jobs receive an independent task snapshot."
        meta={<div className="flex flex-wrap gap-2"><AdminStatus tone={template.status === "active" ? "success" : "neutral"}>{template.status}</AdminStatus><AdminStatus tone="info">{template.steps.length} steps</AdminStatus><AdminStatus tone={template.default ? "success" : "neutral"}>{template.default ? "default" : `version ${template.version}`}</AdminStatus></div>}
        actions={canManage ? <div className="flex gap-2"><AdminButton variant="danger" icon={Archive} disabled={saving} onClick={() => void archive()}>Archive</AdminButton><AdminButton variant="primary" icon={Save} disabled={saving} onClick={() => void save()}>Save workflow</AdminButton></div> : undefined}
      />

      {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
      {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}

      <div className="crm-workflow-builder">
        <AdminPanel title="Template" description="Settings used when this workflow is offered on a Job." icon={Workflow} compact>
          <div className="grid gap-3">
            <AdminField label="Workflow name"><input className="admin-input" value={template.name} disabled={!canManage} onChange={(event) => setTemplate({ ...template, name: event.target.value })} /></AdminField>
            <AdminField label="Description"><textarea className="admin-textarea min-h-24" value={template.description} disabled={!canManage} onChange={(event) => setTemplate({ ...template, description: event.target.value })} /></AdminField>
            <AdminField label="Status"><select className="admin-select" value={template.status} disabled={!canManage} onChange={(event) => setTemplate({ ...template, status: event.target.value as CrmWorkflowTemplate["status"] })}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></AdminField>
            <label className="admin-choice-row"><div><strong>Default workflow</strong><p>Automatically applied when a new enquiry is accepted.</p></div><input type="checkbox" checked={template.default} disabled={!canManage || template.status !== "active"} onChange={(event) => setTemplate({ ...template, default: event.target.checked })} /></label>
            {canManage ? <AdminButton icon={Plus} onClick={() => setTemplate({ ...template, steps: [...template.steps, blankStep(template.steps.length)] })}>Add workflow step</AdminButton> : null}
          </div>
        </AdminPanel>

        <AdminPanel title="Workflow steps" description="Dates are calculated from the Job booking date or event date when the workflow is applied." icon={Workflow}>
          {!template.steps.length ? <div className="admin-empty-state"><strong>No steps yet</strong><p>Add the first task to this workflow.</p></div> : <div className="crm-workflow-step-list">
            {template.steps.map((step, index) => (
              <article key={step.id}>
                <div className="crm-workflow-step-list__number">{index + 1}</div>
                <div className="grid min-w-0 gap-3">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <AdminField label="Task name"><input className="admin-input" value={step.name} disabled={!canManage} onChange={(event) => updateStep(index, { name: event.target.value })} /></AdminField>
                    <AdminField label="Task type"><select className="admin-select" value={step.taskType} disabled={!canManage} onChange={(event) => updateStep(index, { taskType: event.target.value })}><option value="task">Task</option><option value="email">Email</option><option value="call">Call</option><option value="meeting">Meeting</option><option value="milestone">Milestone</option></select></AdminField>
                  </div>
                  <AdminField label="Description"><textarea className="admin-textarea" value={step.description} disabled={!canManage} onChange={(event) => updateStep(index, { description: event.target.value })} /></AdminField>
                  <div className="grid gap-3 md:grid-cols-3">
                    <AdminField label="Relative to"><select className="admin-select" value={step.relativeTo} disabled={!canManage} onChange={(event) => updateStep(index, { relativeTo: event.target.value as CrmWorkflowStep["relativeTo"] })}><option value="booking_date">Booking date</option><option value="event_date">Event date</option></select></AdminField>
                    <AdminField label="Day offset" help="Negative is before; positive is after."><input className="admin-input" type="number" value={step.offsetDays} disabled={!canManage} onChange={(event) => updateStep(index, { offsetDays: Number(event.target.value || 0) })} /></AdminField>
                    <AdminField label="Priority"><select className="admin-select" value={step.priority} disabled={!canManage} onChange={(event) => updateStep(index, { priority: event.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></AdminField>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3"><AdminStatus tone="info">{timingLabel(step)}</AdminStatus>{canManage ? <div className="flex gap-2"><AdminButton size="sm" icon={ArrowUp} disabled={index === 0} onClick={() => moveStep(index, -1)}>Up</AdminButton><AdminButton size="sm" icon={ArrowDown} disabled={index === template.steps.length - 1} onClick={() => moveStep(index, 1)}>Down</AdminButton><AdminButton size="sm" variant="danger" icon={Trash2} onClick={() => setTemplate({ ...template, steps: template.steps.filter((_, itemIndex) => itemIndex !== index) })}>Remove</AdminButton></div> : null}</div>
                </div>
              </article>
            ))}
          </div>}
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
