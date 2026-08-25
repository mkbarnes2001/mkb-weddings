import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Eye, GripVertical, ListPlus, Save, Trash2 } from "lucide-react";
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
import {
  DEFAULT_SUPPLIER_ROLE_DEFINITIONS,
  SUPPLIER_CATEGORY_OPTIONS,
  normaliseSupplierTaxonomy,
} from "../data/supplierTaxonomy";

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

  const [
    expandedQuestionnaireFieldId,
    setExpandedQuestionnaireFieldId,
  ] = useState("");

  const [
    supplierTaxonomy,
    setSupplierTaxonomy,
  ] = useState(() =>
    normaliseSupplierTaxonomy(
      SUPPLIER_CATEGORY_OPTIONS,
      DEFAULT_SUPPLIER_ROLE_DEFINITIONS,
    ),
  );
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

  /*
   * Supplier taxonomy is platform-owned but business-readable through
   * /api/platform, the same path already used by Wedding Workspace.
   */
  useEffect(() => {
    let active = true;

    AdminApiService
      .getWedPlannedPlatform()
      .then((platform) => {
        if (!active) return;

        setSupplierTaxonomy(
          normaliseSupplierTaxonomy(
            platform.supplierTaxonomy?.categories,
            platform.supplierTaxonomy?.roles,
          ),
        );
      })
      .catch(() => {
        /*
         * Keep the source-owned taxonomy fallback if the platform
         * foundation read is temporarily unavailable.
         */
      });

    return () => {
      active = false;
    };
  }, [auth.workspaceId]);

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
          <AdminPanel title="Template" description="Edit the template details. Add and reorder questions from the compact field list." icon={ListPlus} compact>
            <div className="grid gap-3">
              <AdminField label="Template name"><input className="admin-input" value={template.name} disabled={!canManage} onChange={(event) => setTemplate((current) => current ? { ...current, name: event.target.value } : current)} /></AdminField>
              <AdminField label="Description"><textarea className="admin-textarea" value={template.description} disabled={!canManage} onChange={(event) => setTemplate((current) => current ? { ...current, description: event.target.value } : current)} /></AdminField>
              <AdminField label="Status"><select className="admin-select" value={template.status} disabled={!canManage} onChange={(event) => setTemplate((current) => current ? { ...current, status: event.target.value as QuestionnaireTemplate["status"] } : current)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></AdminField>
            </div>
          </AdminPanel>

            <AdminPanel
              title="Questionnaire fields"
              description="Build the questionnaire from compact fields. Supplier questions use the platform-owned supplier taxonomy."
              icon={GripVertical}
              actions={
                canManage ? (
                  <select
                    className="admin-select questionnaire-builder-add-field"
                    aria-label="Add questionnaire field"
                    value=""
                    disabled={saving}
                    onChange={(event) => {
                      const type =
                        event.target.value as QuestionnaireFieldType;

                      if (type) {
                        addField(type);
                      }
                    }}
                  >
                    <option value="">
                      Add field…
                    </option>

                    {(
                      Object.keys(fieldLabels) as QuestionnaireFieldType[]
                    ).map((type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {fieldLabels[type]}
                      </option>
                    ))}
                  </select>
                ) : undefined
              }
            >
              <div className="questionnaire-builder-fields">
                {!template.fields.length ? (
                  <div className="admin-empty-state">
                    <h3>No fields yet</h3>
                    <p>
                      Choose a field type from Add field… to begin.
                    </p>
                  </div>
                ) : null}

                {template.fields.map(
                  (field, index) => {
                    const expanded =
                      expandedQuestionnaireFieldId
                      === field.id;

                    const categoryKnown =
                      supplierTaxonomy.categories
                        .includes(
                          field.supplierCategory,
                        );

                    const supplierRolesForCategory =
                      field.type === "supplier"
                      && field.supplierCategory
                        ? supplierTaxonomy.roles
                            .filter(
                              (role) =>
                                role.category
                                === field.supplierCategory,
                            )
                        : [];

                    const roleInSelectedCategory =
                      supplierRolesForCategory.some(
                        (role) =>
                          role.name
                          === field.supplierRole,
                      );

                    return (
                      <article
                        key={field.id}
                        className={
                          `questionnaire-builder-field${
                            expanded
                              ? " is-expanded"
                              : ""
                          }`
                        }
                        draggable={
                          canManage
                          && !saving
                        }
                        onDragStart={() =>
                          setDragIndex(index)
                        }
                        onDragOver={(event) =>
                          event.preventDefault()
                        }
                        onDrop={() => {
                          if (
                            dragIndex != null
                          ) {
                            moveField(
                              dragIndex,
                              index,
                            );
                          }

                          setDragIndex(null);
                        }}
                        onDragEnd={() =>
                          setDragIndex(null)
                        }
                      >
                        <div
                          className="questionnaire-builder-field__handle"
                          title="Drag to reorder"
                          aria-hidden="true"
                        >
                          <GripVertical />
                        </div>

                        <div className="questionnaire-builder-field__content">
                          <div className="questionnaire-builder-field__summary">
                            <button
                              type="button"
                              className="questionnaire-builder-field__toggle"
                              aria-expanded={
                                expanded
                              }
                              onClick={() =>
                                setExpandedQuestionnaireFieldId(
                                  expanded
                                    ? ""
                                    : field.id,
                                )
                              }
                            >
                              <span className="questionnaire-builder-field__identity">
                                <strong>
                                  {field.label
                                    || "Untitled field"}
                                </strong>

                                <span className="questionnaire-builder-field__meta">
                                  <span>
                                    {
                                      fieldLabels[
                                        field.type
                                      ]
                                    }
                                  </span>

                                  {![
                                    "heading",
                                    "description",
                                  ].includes(
                                    field.type,
                                  ) ? (
                                    <span
                                      className={
                                        field.required
                                          ? "is-required"
                                          : ""
                                      }
                                    >
                                      {field.required
                                        ? "Required"
                                        : "Optional"}
                                    </span>
                                  ) : null}

                                  {field.type
                                    === "supplier"
                                    && field
                                      .supplierCategory ? (
                                      <span>
                                        {
                                          field
                                            .supplierCategory
                                        }
                                      </span>
                                    ) : null}

                                  {field.type
                                    === "supplier"
                                    && field
                                      .supplierRole ? (
                                      <span>
                                        {
                                          field
                                            .supplierRole
                                        }
                                      </span>
                                    ) : null}
                                </span>
                              </span>

                              <span
                                className="questionnaire-builder-field__chevron"
                                aria-hidden="true"
                              >
                                <ChevronDown />
                              </span>
                            </button>

                            <div className="questionnaire-builder-field__actions">
                              <button
                                type="button"
                                className="admin-icon-control"
                                disabled={
                                  !canManage
                                  || saving
                                  || index === 0
                                }
                                onClick={() =>
                                  moveField(
                                    index,
                                    index - 1,
                                  )
                                }
                                aria-label={`Move ${field.label} up`}
                                title="Move up"
                              >
                                <ChevronUp
                                  aria-hidden="true"
                                />
                              </button>

                              <button
                                type="button"
                                className="admin-icon-control"
                                disabled={
                                  !canManage
                                  || saving
                                  || index
                                    === template
                                      .fields
                                      .length
                                      - 1
                                }
                                onClick={() =>
                                  moveField(
                                    index,
                                    index + 1,
                                  )
                                }
                                aria-label={`Move ${field.label} down`}
                                title="Move down"
                              >
                                <ChevronDown
                                  aria-hidden="true"
                                />
                              </button>

                              <button
                                type="button"
                                className="admin-icon-control questionnaire-builder-field__remove"
                                disabled={
                                  !canManage
                                  || saving
                                }
                                onClick={() => {
                                  setTemplate(
                                    (current) =>
                                      current
                                        ? {
                                            ...current,
                                            fields:
                                              current
                                                .fields
                                                .filter(
                                                  (
                                                    _,
                                                    fieldIndex,
                                                  ) =>
                                                    fieldIndex
                                                    !== index,
                                                ),
                                          }
                                        : current,
                                  );

                                  if (
                                    expandedQuestionnaireFieldId
                                    === field.id
                                  ) {
                                    setExpandedQuestionnaireFieldId(
                                      "",
                                    );
                                  }
                                }}
                                aria-label={`Remove ${field.label}`}
                                title="Remove field"
                              >
                                <Trash2
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                          </div>

                          {expanded ? (
                            <div className="questionnaire-builder-field__editor">
                              <div className="questionnaire-builder-field__grid">
                                <AdminField label="Field type">
                                  <select
                                    className="admin-select"
                                    value={
                                      field.type
                                    }
                                    disabled={
                                      !canManage
                                      || saving
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      changeFieldType(
                                        index,
                                        event.target.value as QuestionnaireFieldType,
                                      )
                                    }
                                  >
                                    {(
                                      Object.keys(fieldLabels) as QuestionnaireFieldType[]
                                    ).map(
                                      (type) => (
                                        <option
                                          key={type}
                                          value={type}
                                        >
                                          {
                                            fieldLabels[
                                              type
                                            ]
                                          }
                                        </option>
                                      ),
                                    )}
                                  </select>
                                </AdminField>

                                <AdminField
                                  label={
                                    field.type
                                    === "description"
                                      ? "Text"
                                      : field.type
                                          === "heading"
                                        ? "Heading"
                                        : "Question label"
                                  }
                                >
                                  <input
                                    className="admin-input"
                                    value={
                                      field.label
                                    }
                                    disabled={
                                      !canManage
                                      || saving
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      updateField(
                                        index,
                                        {
                                          label:
                                            event
                                              .target
                                              .value,
                                        },
                                      )
                                    }
                                  />
                                </AdminField>
                              </div>

                              {![
                                "heading",
                                "description",
                              ].includes(
                                field.type,
                              ) ? (
                                <AdminField label="Help text">
                                  <input
                                    className="admin-input"
                                    value={
                                      field.help
                                    }
                                    disabled={
                                      !canManage
                                      || saving
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      updateField(
                                        index,
                                        {
                                          help:
                                            event
                                              .target
                                              .value,
                                        },
                                      )
                                    }
                                  />
                                </AdminField>
                              ) : null}

                              {[
                                "select",
                                "radio",
                                "checkbox",
                              ].includes(
                                field.type,
                              ) ? (
                                <AdminField
                                  label="Options"
                                  help="One option per line."
                                >
                                  <textarea
                                    className="admin-textarea"
                                    value={
                                      field.options
                                        .join("\n")
                                    }
                                    disabled={
                                      !canManage
                                      || saving
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      updateField(
                                        index,
                                        {
                                          options:
                                            event
                                              .target
                                              .value
                                              .split(
                                                "\n",
                                              )
                                              .map(
                                                (
                                                  item,
                                                ) =>
                                                  item
                                                    .trim(),
                                              )
                                              .filter(
                                                Boolean,
                                              ),
                                        },
                                      )
                                    }
                                  />
                                </AdminField>
                              ) : null}

                              {field.type
                                === "supplier" ? (
                                <div className="questionnaire-builder-supplier-config">
                                  <div className="questionnaire-builder-supplier-config__grid">
                                    <AdminField
                                      label="Supplier category"
                                      help="Controlled centrally in Platform Administration."
                                    >
                                      <select
                                        className="admin-select"
                                        value={
                                          field
                                            .supplierCategory
                                        }
                                        disabled={
                                          !canManage
                                          || saving
                                        }
                                        onChange={(
                                          event,
                                        ) => {
                                          const supplierCategory =
                                            event
                                              .target
                                              .value;

                                          const currentRole =
                                            supplierTaxonomy
                                              .roles
                                              .find(
                                                (
                                                  role,
                                                ) =>
                                                  role
                                                    .name
                                                  === field
                                                    .supplierRole,
                                              );

                                          const roleStillValid =
                                            currentRole
                                            && currentRole
                                              .category
                                              === supplierCategory;

                                          updateField(
                                            index,
                                            {
                                              supplierCategory,
                                              supplierRole:
                                                roleStillValid
                                                  ? field
                                                      .supplierRole
                                                  : "",
                                            },
                                          );
                                        }}
                                      >
                                        <option value="">
                                          Choose category…
                                        </option>

                                        {field
                                          .supplierCategory
                                          && !categoryKnown ? (
                                          <option
                                            value={
                                              field
                                                .supplierCategory
                                            }
                                          >
                                            {
                                              field
                                                .supplierCategory
                                            }
                                            {" · existing"}
                                          </option>
                                        ) : null}

                                        {supplierTaxonomy
                                          .categories
                                          .map(
                                            (
                                              category,
                                            ) => (
                                              <option
                                                key={
                                                  category
                                                }
                                                value={
                                                  category
                                                }
                                              >
                                                {
                                                  category
                                                }
                                              </option>
                                            ),
                                          )}
                                      </select>
                                    </AdminField>

                                    <AdminField
                                      label="Wedding role"
                                      help={
                                        field
                                          .supplierCategory
                                          ? "Filtered to the selected supplier category."
                                          : "Choose a supplier category first."
                                      }
                                    >
                                      <select
                                        className="admin-select"
                                        value={
                                          field
                                            .supplierRole
                                        }
                                        disabled={
                                          !canManage
                                          || saving
                                          || !field
                                            .supplierCategory
                                        }
                                        onChange={(
                                          event,
                                        ) => {
                                          const supplierRole =
                                            event
                                              .target
                                              .value;

                                          const currentLabel =
                                            field.label
                                              .trim()
                                              .toLowerCase();

                                          const genericLabel =
                                            [
                                              "",
                                              "supplier",
                                              "supplier team",
                                              "new question",
                                            ].includes(
                                              currentLabel,
                                            );

                                          updateField(
                                            index,
                                            {
                                              supplierRole,
                                              ...(
                                                genericLabel
                                                && supplierRole
                                                  ? {
                                                      label:
                                                        supplierRole,
                                                    }
                                                  : {}
                                              ),
                                            },
                                          );
                                        }}
                                      >
                                        <option value="">
                                          Choose Wedding role…
                                        </option>

                                        {field
                                          .supplierRole
                                          && !roleInSelectedCategory ? (
                                          <option
                                            value={
                                              field
                                                .supplierRole
                                            }
                                          >
                                            {
                                              field
                                                .supplierRole
                                            }
                                            {" · existing"}
                                          </option>
                                        ) : null}

                                        {supplierRolesForCategory
                                          .map(
                                            (
                                              role,
                                            ) => (
                                              <option
                                                key={
                                                  role.name
                                                }
                                                value={
                                                  role.name
                                                }
                                              >
                                                {
                                                  role.name
                                                }
                                              </option>
                                            ),
                                          )}
                                      </select>
                                    </AdminField>
                                  </div>

                                  <small className="questionnaire-builder-supplier-config__help">
                                    Supplier categories and Wedding roles come from the platform supplier taxonomy. Supplier Master matching and review behaviour are unchanged.
                                  </small>
                                </div>
                              ) : null}

                              {![
                                "heading",
                                "description",
                              ].includes(
                                field.type,
                              ) ? (
                                <div className="questionnaire-builder-field__flags">
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={
                                        field
                                          .required
                                      }
                                      disabled={
                                        !canManage
                                        || saving
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        updateField(
                                          index,
                                          {
                                            required:
                                              event
                                                .target
                                                .checked,
                                          },
                                        )
                                      }
                                    />

                                    <span>
                                      <strong>
                                        Required
                                      </strong>
                                      <small>
                                        The client must complete this field before submitting the questionnaire.
                                      </small>
                                    </span>
                                  </label>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  },
                )}
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
