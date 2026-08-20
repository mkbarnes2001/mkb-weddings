import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, GripVertical, ListPlus, Plus, Save, Trash2 } from "lucide-react";
import {
  AdminButton,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
  AdminTab,
  AdminTabs,
} from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { QuestionnaireField, QuestionnaireFieldType, QuestionnaireTemplate } from "../types/crm";

const fieldLabels: Record<QuestionnaireFieldType, string> = {
  heading: "Heading",
  description: "Description",
  short_text: "Single-line field",
  long_text: "Multi-line field",
  address: "Address",
  venue: "Venue",
  select: "Dropdown select",
  radio: "Radio button select",
  checkbox: "Checkbox select",
  file: "File upload",
  supplier: "Supplier",
};

function baseField(type: QuestionnaireFieldType): Pick<QuestionnaireField, "options" | "supplierRole" | "supplierCategory" | "allowUnlisted" | "multiple"> {
  return {
    options:
      ["select", "radio", "checkbox"].includes(type)
        ? ["Option 1", "Option 2"]
        : [],
    supplierRole:
      type === "supplier"
        ? "Supplier"
        : "",
    supplierCategory:
      "",
    allowUnlisted:
      type === "supplier",
    multiple:
      false,
  };
}

function blankField(type: QuestionnaireFieldType, index: number): QuestionnaireField {
  const content =
    type === "heading"
      ? "New section"
      : type === "description"
        ? "Add guidance for your client."
        : type === "supplier"
          ? "Supplier"
          : type === "address"
            ? "Address"
            : type === "venue"
              ? "Venue"
              : "New question";

  return {
    id:
      `field_${Date.now()}_${index}`,
    type,
    label:
      content,
    help:
      "",
    required:
      false,
    ...baseField(type),
  };
}

function normaliseField(field: QuestionnaireField): QuestionnaireField {
  return {
    ...field,
    options:
      Array.isArray(field.options)
        ? field.options
        : [],
    supplierRole:
      field.type === "supplier"
        ? field.supplierRole || "Supplier"
        : "",
    supplierCategory:
      field.type === "supplier"
        ? field.supplierCategory || ""
        : "",
    allowUnlisted:
      field.type === "supplier"
        ? true
        : false,
    multiple:
      false,
  };
}

function FieldPreview({ field }: { field: QuestionnaireField }) {
  if (field.type === "heading") {
    return (
      <h3 className="text-lg font-semibold">
        {field.label}
      </h3>
    );
  }

  if (field.type === "description") {
    return (
      <p className="text-sm leading-6 text-neutral-600">
        {field.label}
      </p>
    );
  }

  return (
    <label className="portal-question-field">
      <span>
        {field.label}
        {field.required ? (
          <b> *</b>
        ) : null}
      </span>

      {field.help ? (
        <small>
          {field.help}
        </small>
      ) : null}

      {field.type === "short_text" ? (
        <input
          disabled
          placeholder="Client answer"
        />
      ) : null}

      {field.type === "long_text" ? (
        <textarea
          disabled
          placeholder="Client answer"
        />
      ) : null}

      {field.type === "address" ? (
        <input
          disabled
          placeholder="Start typing an address…"
        />
      ) : null}

      {field.type === "venue" ? (
        <input
          disabled
          placeholder="Start typing a venue…"
        />
      ) : null}

      {field.type === "select" ? (
        <select disabled>
          <option>
            Choose an option
          </option>

          {field.options.map(
            (option) => (
              <option key={option}>
                {option}
              </option>
            ),
          )}
        </select>
      ) : null}

      {field.type === "radio" ? (
        <div className="grid gap-2">
          {field.options.map(
            (option) => (
              <span key={option}>
                <input
                  type="radio"
                  disabled
                />
                {" "}
                {option}
              </span>
            ),
          )}
        </div>
      ) : null}

      {field.type === "checkbox" ? (
        <div className="grid gap-2">
          {field.options.map(
            (option) => (
              <span key={option}>
                <input
                  type="checkbox"
                  disabled
                />
                {" "}
                {option}
              </span>
            ),
          )}
        </div>
      ) : null}

      {field.type === "file" ? (
        <input
          type="file"
          disabled
        />
      ) : null}

      {field.type === "supplier" ? (
        <div className="supplier-questionnaire-simple">
          <input
            disabled
            placeholder="Start typing supplier name…"
          />

          <small className="supplier-questionnaire-simple__state">
            Supplier Master matches automatically. Other names are sent for review.
          </small>
        </div>
      ) : null}
    </label>
  );
}

export function CRMQuestionnaireTemplate() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { auth } = useProfessionalAuth();
  const [template, setTemplate] = useState<QuestionnaireTemplate | null>(null);
  const [mode, setMode] = useState<"build" | "preview">("build");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const canManage = auth.permissions.includes("crm:manage");

  useEffect(() => {
    let active = true;
    setLoading(true);
    AdminApiService.getQuestionnaireTemplate(id)
      .then((result) => { if (active) setTemplate({ ...result, fields: result.fields.map(normaliseField) }); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load questionnaire template."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, auth.workspaceId]);

  const fieldCount = template?.fields.length || 0;
  const requiredCount = useMemo(() => template?.fields.filter((field) => field.required).length || 0, [template?.fields]);

  function updateField(index: number, patch: Partial<QuestionnaireField>) {
    setTemplate((current) => current ? { ...current, fields: current.fields.map((field, fieldIndex) => fieldIndex === index ? normaliseField({ ...field, ...patch }) : field) } : current);
  }

  function changeFieldType(
    index: number,
    type: QuestionnaireFieldType,
  ) {
    setError("");

    setTemplate((current) => current ? {
      ...current,
      fields: current.fields.map(
        (field, fieldIndex) =>
          fieldIndex === index
            ? normaliseField({
                ...field,
                type,
                ...baseField(type),
                required:
                  ["heading", "description"].includes(type)
                    ? false
                    : field.required,
              })
            : field,
      ),
    } : current);
  }

  function addField(
    type: QuestionnaireFieldType,
  ) {
    setError("");

    setTemplate(
      (current) =>
        current
          ? {
              ...current,
              fields: [
                ...current.fields,
                blankField(
                  type,
                  current.fields.length + 1,
                ),
              ],
            }
          : current,
    );
  }

  function moveField(from: number, to: number) {
    setTemplate((current) => {
      if (!current || from === to || to < 0 || to >= current.fields.length) return current;
      const fields = [...current.fields];
      const [field] = fields.splice(from, 1);
      fields.splice(to, 0, field);
      return { ...current, fields };
    });
  }

  async function save() {
    if (!template) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await AdminApiService.saveQuestionnaireTemplate(template.id, template);
      setTemplate({ ...saved, fields: saved.fields.map(normaliseField) });
      setMessage("Questionnaire template saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save questionnaire template.");
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!template || !window.confirm("Archive this questionnaire template? Existing assigned questionnaires will remain unchanged.")) return;
    setSaving(true);
    try {
      await AdminApiService.archiveQuestionnaireTemplate(template.id);
      navigate("/admin/crm?view=questionnaires");
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Unable to archive questionnaire template.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AdminPage><p className="text-sm text-neutral-500">Loading questionnaire template…</p></AdminPage>;
  if (!template) return <AdminPage><div className="admin-alert admin-alert--error">{error || "Questionnaire template not found."}</div></AdminPage>;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow={<Link to="/admin/crm?view=questionnaires" className="admin-inline-link inline-flex items-center gap-1"><ArrowLeft size={13} />CRM questionnaires</Link>}
        title={template.name}
        description="Build a reusable questionnaire. Assigned questionnaires keep a versioned snapshot, so later template changes do not alter what a client received."
        actions={canManage ? <div className="flex gap-2"><AdminButton variant="danger" size="sm" icon={Trash2} onClick={() => void archive()} disabled={saving}>Archive</AdminButton><AdminButton variant="primary" icon={Save} onClick={() => void save()} disabled={saving}>Save template</AdminButton></div> : undefined}
        meta={<div className="flex gap-2"><AdminStatus tone={template.status === "active" ? "success" : "neutral"}>{template.status}</AdminStatus><AdminStatus tone="info">{fieldCount} fields</AdminStatus><AdminStatus tone="warning">{requiredCount} required</AdminStatus><AdminStatus tone="neutral">version {template.version}</AdminStatus></div>}
      />
      {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
      {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}

      <AdminTabs>
        <AdminTab active={mode === "build"} onClick={() => setMode("build")}>Build</AdminTab>
        <AdminTab active={mode === "preview"} onClick={() => setMode("preview")}>Preview</AdminTab>
      </AdminTabs>

      {mode === "build" ? (
        <div className="questionnaire-builder-layout">
          <AdminPanel title="Template" description="Add fields from the palette, then drag the handle to reorder." icon={ListPlus} compact>
            <div className="grid gap-3">
              <AdminField label="Template name"><input className="admin-input" value={template.name} disabled={!canManage} onChange={(event) => setTemplate((current) => current ? { ...current, name: event.target.value } : current)} /></AdminField>
              <AdminField label="Description"><textarea className="admin-textarea" value={template.description} disabled={!canManage} onChange={(event) => setTemplate((current) => current ? { ...current, description: event.target.value } : current)} /></AdminField>
              <AdminField label="Status"><select className="admin-select" value={template.status} disabled={!canManage} onChange={(event) => setTemplate((current) => current ? { ...current, status: event.target.value as QuestionnaireTemplate["status"] } : current)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></AdminField>
            </div>
            <div className="questionnaire-field-palette">
              {(Object.keys(fieldLabels) as QuestionnaireFieldType[]).map(
                (type) => (
                  <AdminButton
                    key={type}
                    size="sm"
                    icon={Plus}
                    disabled={!canManage}
                    onClick={() =>
                      addField(type)
                    }
                  >
                    {fieldLabels[type]}
                  </AdminButton>
                ),
              )}
            </div>
          </AdminPanel>

          <AdminPanel title="Questionnaire fields" description="Use a separate Supplier field for each supplier role. Clients type one supplier name; Supplier Master matches link automatically and other names go to review." icon={GripVertical}>
            <div className="questionnaire-builder-fields">
              {!template.fields.length ? <div className="admin-empty-state"><h3>No fields yet</h3><p>Add a heading or question from the field palette.</p></div> : null}
              {template.fields.map((field, index) => (
                <article
                  key={field.id}
                  className="questionnaire-builder-field"
                  draggable={canManage}
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => { if (dragIndex != null) moveField(dragIndex, index); setDragIndex(null); }}
                >
                  <div className="questionnaire-builder-field__handle" title="Drag to reorder"><GripVertical /></div>
                  <div className="questionnaire-builder-field__body">
                    <div className="grid gap-3 md:grid-cols-[170px_minmax(0,1fr)]">
                      <AdminField label="Field type"><select className="admin-select" value={field.type} disabled={!canManage} onChange={(event) => changeFieldType(index, event.target.value as QuestionnaireFieldType)}>{(Object.keys(fieldLabels) as QuestionnaireFieldType[]).map((type) => <option key={type} value={type}>{fieldLabels[type]}</option>)}</select></AdminField>
                      <AdminField label={field.type === "description" ? "Text" : field.type === "heading" ? "Heading" : "Question label"}><input className="admin-input" value={field.label} disabled={!canManage} onChange={(event) => updateField(index, { label: event.target.value })} /></AdminField>
                    </div>
                    {!['heading','description'].includes(field.type) ? <AdminField label="Help text"><input className="admin-input" value={field.help} disabled={!canManage} onChange={(event) => updateField(index, { help: event.target.value })} /></AdminField> : null}
                    {["select", "radio", "checkbox"].includes(field.type) ? <AdminField label="Options" help="One option per line."><textarea className="admin-textarea min-h-24" value={field.options.join("\n")} disabled={!canManage} onChange={(event) => updateField(index, { options: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></AdminField> : null}
                    {field.type === "supplier" ? (
                      <div className="rounded-xl border border-black/[0.07] bg-neutral-50 px-3 py-3">
                        <strong className="block text-[10px] font-semibold text-neutral-800">
                          One supplier per question
                        </strong>

                        <p className="mt-1 text-[9px] leading-5 text-neutral-500">
                          Set the question label to the role, for example Videographer, Florist or Cake. The client only types the supplier name. Supplier Master matches link automatically; names not found are sent for review.
                        </p>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {!['heading','description'].includes(field.type) ? <label className="inline-flex items-center gap-2 text-[10px]"><input type="checkbox" checked={field.required} disabled={!canManage} onChange={(event) => updateField(index, { required: event.target.checked })} />Required</label> : <span />}
                      <div className="flex gap-2"><AdminButton size="sm" disabled={!canManage || index === 0} onClick={() => moveField(index, index - 1)}>Move up</AdminButton><AdminButton size="sm" disabled={!canManage || index === template.fields.length - 1} onClick={() => moveField(index, index + 1)}>Move down</AdminButton><AdminButton variant="danger" size="sm" icon={Trash2} disabled={!canManage} onClick={() => setTemplate((current) => current ? { ...current, fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index) } : current)}>Remove</AdminButton></div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </AdminPanel>
        </div>
      ) : (
        <AdminPanel title="Client preview" description="This is the questionnaire layout clients will complete inside their secure portal." icon={Eye}>
          <div className="portal-questionnaire-card mx-auto max-w-3xl">
            <h2>{template.name}</h2>
            {template.description ? <p>{template.description}</p> : null}
            <div className="portal-questionnaire-fields">{template.fields.map((field) => <FieldPreview key={field.id} field={field} />)}</div>
          </div>
        </AdminPanel>
      )}
    </AdminPage>
  );
}
