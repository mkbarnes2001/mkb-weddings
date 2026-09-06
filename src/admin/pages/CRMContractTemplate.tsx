import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  FileText,
  ListPlus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
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
import {
  useProfessionalAuth,
} from "../auth/ProfessionalAuth";
import {
  AdminApiService,
} from "../services/AdminApiService";
import type {
  CrmContractTemplate,
  CrmContractTemplateSection,
} from "../types/crm";

function blankSection(
  index: number,
): CrmContractTemplateSection {
  return {
    id:
      `section_${Date.now()}_${index}`,
    heading: "",
    body: "",
  };
}

export function CRMContractTemplate() {
  const { id = "" } =
    useParams();

  const navigate =
    useNavigate();

  const { auth } =
    useProfessionalAuth();

  const [
    template,
    setTemplate,
  ] = useState<
    CrmContractTemplate | null
  >(null);

  const [
    mode,
    setMode,
  ] = useState<
    "build" | "preview"
  >("build");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const canManage =
    auth.permissions.includes(
      "crm:manage",
    )
    && auth.accessMode
      !== "support";

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setMessage("");

    AdminApiService
      .getCrmContractTemplate(
        id,
      )
      .then((result) => {
        if (active) {
          setTemplate(
            result,
          );
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load contract template.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    id,
    auth.workspaceId,
  ]);

  function patch(
    value:
      Partial<CrmContractTemplate>,
  ) {
    setTemplate(
      (current) =>
        current
          ? {
              ...current,
              ...value,
            }
          : current,
    );

    setError("");
    setMessage("");
  }

  function patchSection(
    index: number,
    value:
      Partial<
        CrmContractTemplateSection
      >,
  ) {
    setTemplate(
      (current) =>
        current
          ? {
              ...current,
              sections:
                current.sections.map(
                  (
                    section,
                    sectionIndex,
                  ) =>
                    sectionIndex
                      === index
                      ? {
                          ...section,
                          ...value,
                        }
                      : section,
                ),
            }
          : current,
    );

    setError("");
    setMessage("");
  }

  function addSection() {
    setTemplate(
      (current) =>
        current
          ? {
              ...current,
              sections: [
                ...current.sections,
                blankSection(
                  current.sections.length
                  + 1,
                ),
              ],
            }
          : current,
    );
  }

  function moveSection(
    from: number,
    to: number,
  ) {
    setTemplate(
      (current) => {
        if (
          !current
          || from === to
          || to < 0
          || to
            >= current.sections.length
        ) {
          return current;
        }

        const sections = [
          ...current.sections,
        ];

        const [
          section,
        ] = sections.splice(
          from,
          1,
        );

        sections.splice(
          to,
          0,
          section,
        );

        return {
          ...current,
          sections,
        };
      },
    );
  }

  async function save() {
    if (
      !template
      || !canManage
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved =
        await AdminApiService
          .saveCrmContractTemplate(
            template.id,
            template,
          );

      setTemplate(
        saved,
      );

      setMessage(
        "Contract template saved.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save contract template.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (
      !template
      || !canManage
      || !window.confirm(
        "Archive this contract template? Existing generated contracts and signed versions remain unchanged.",
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await AdminApiService
        .archiveCrmContractTemplate(
          template.id,
        );

      navigate(
        "/admin/crm/templates/contracts",
      );
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to archive contract template.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminPage>
        <p className="text-sm text-neutral-500">
          Loading contract template…
        </p>
      </AdminPage>
    );
  }

  if (!template) {
    return (
      <AdminPage>
        <div className="admin-alert admin-alert--error">
          {error
            || "Contract template not found."}
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title={template.name}
        description="Build reusable contract wording for this business. Generated contracts keep their own versioned snapshot, so later template edits never rewrite contracts already created for clients."
        actions={
          canManage
            ? (
              <div className="flex gap-2">
                <AdminButton
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  disabled={
                    saving
                    || template.status
                      === "archived"
                  }
                  onClick={() =>
                    void archive()
                  }
                >
                  Archive
                </AdminButton>

                <AdminButton
                  variant="primary"
                  icon={Save}
                  disabled={saving}
                  onClick={() =>
                    void save()
                  }
                >
                  {saving
                    ? "Saving…"
                    : "Save template"}
                </AdminButton>
              </div>
            )
            : undefined
        }
        meta={
          <div className="flex flex-wrap gap-2">
            <AdminStatus
              tone={
                template.status
                  === "active"
                  ? "success"
                  : "neutral"
              }
            >
              {template.status
                === "active"
                ? "active"
                : "inactive"}
            </AdminStatus>

            <AdminStatus tone="neutral">
              One signature
            </AdminStatus>
          </div>
        }
      />

      {error ? (
        <div className="admin-alert admin-alert--error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="admin-alert admin-alert--success">
          {message}
        </div>
      ) : null}

      {!canManage ? (
        <div className="admin-alert">
          Contract templates are read-only in this session.
        </div>
      ) : null}

      <AdminTabs>
        <AdminTab
          active={
            mode === "build"
          }
          onClick={() =>
            setMode("build")
          }
        >
          Build
        </AdminTab>

        <AdminTab
          active={
            mode === "preview"
          }
          onClick={() =>
            setMode("preview")
          }
        >
          Preview
        </AdminTab>
      </AdminTabs>

      {mode === "build" ? (
        <div className="questionnaire-builder-layout">
          <AdminPanel
            title="Template"
            description="Set the template identity and whether it can be used for new booking contracts."
            icon={FileText}
            compact
          >
            <div className="grid gap-3">
              <AdminField
                label="Template name"
              >
                <input
                  className="admin-input"
                  value={
                    template.name
                  }
                  disabled={
                    !canManage
                  }
                  onChange={(
                    event,
                  ) =>
                    patch({
                      name:
                        event.target.value,
                    })
                  }
                />
              </AdminField>

              <AdminField
                label="Description"
              >
                <textarea
                  className="admin-textarea"
                  value={
                    template.description
                  }
                  disabled={
                    !canManage
                  }
                  onChange={(
                    event,
                  ) =>
                    patch({
                      description:
                        event.target.value,
                    })
                  }
                />
              </AdminField>

              <AdminField
                label="Status"
                help="Inactive templates cannot be selected by automatic booking-pack generation."
              >
                <select
                  className="admin-select"
                  value={
                    template.status
                  }
                  disabled={
                    !canManage
                  }
                  onChange={(
                    event,
                  ) =>
                    patch({
                      status:
                        event.target.value as CrmContractTemplate["status"],
                    })
                  }
                >
                  <option value="archived">
                    Inactive / archived
                  </option>

                  <option value="active">
                    Active
                  </option>
                </select>
              </AdminField>
            </div>

            <p className="mt-4 admin-field__help">Add your business's contract terms before activating this template.</p>
          </AdminPanel>

          <AdminPanel
            title="Contract sections"
            description="Add headings and wording in the order the client should read them."
            icon={ListPlus}
            actions={
              canManage
                ? (
                  <AdminButton
                    size="sm"
                    icon={Plus}
                    onClick={
                      addSection
                    }
                  >
                    Add section
                  </AdminButton>
                )
                : undefined
            }
          >
            <div className="questionnaire-builder-fields">
              {!template.sections.length ? (
                <div className="admin-empty-state">
                  <h3>
                    No contract wording yet
                  </h3>
                  <p>
                    Add the first section and enter your own contract terms before activating this template.
                  </p>
                </div>
              ) : null}

              {template.sections.map(
                (
                  section,
                  index,
                ) => (
                  <article
                    key={
                      section.id
                    }
                    className="questionnaire-builder-field questionnaire-builder-field--no-handle"
                  >
                    <div className="questionnaire-builder-field__body">
                      <div className="grid gap-3">
                        <AdminField
                          label={
                            `Section ${index + 1} heading`
                          }
                        >
                          <input
                            className="admin-input"
                            value={
                              section.heading
                            }
                            disabled={
                              !canManage
                            }
                            placeholder="Optional heading"
                            onChange={(
                              event,
                            ) =>
                              patchSection(
                                index,
                                {
                                  heading:
                                    event.target.value,
                                },
                              )
                            }
                          />
                        </AdminField>

                        <AdminField
                          label="Contract wording"
                          help="Paragraph breaks are preserved in the client contract."
                        >
                          <textarea
                            className="admin-textarea min-h-40"
                            value={
                              section.body
                            }
                            disabled={
                              !canManage
                            }
                            placeholder="Enter your contract wording…"
                            onChange={(
                              event,
                            ) =>
                              patchSection(
                                index,
                                {
                                  body:
                                    event.target.value,
                                },
                              )
                            }
                          />
                        </AdminField>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <AdminButton
                          size="sm"
                          disabled={
                            !canManage
                            || index === 0
                          }
                          onClick={() =>
                            moveSection(
                              index,
                              index - 1,
                            )
                          }
                        >
                          Move up
                        </AdminButton>

                        <AdminButton
                          size="sm"
                          disabled={
                            !canManage
                            || index
                              === template.sections.length
                                - 1
                          }
                          onClick={() =>
                            moveSection(
                              index,
                              index + 1,
                            )
                          }
                        >
                          Move down
                        </AdminButton>

                        <AdminButton
                          variant="danger"
                          size="sm"
                          icon={Trash2}
                          disabled={
                            !canManage
                          }
                          onClick={() =>
                            patch({
                              sections:
                                template.sections.filter(
                                  (
                                    _,
                                    sectionIndex,
                                  ) =>
                                    sectionIndex
                                      !== index,
                                ),
                            })
                          }
                        >
                          Remove
                        </AdminButton>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </AdminPanel>
        </div>
      ) : (
        <AdminPanel
          title="Client preview"
          description="Business, client and booking snapshots are added when the actual contract is generated."
          icon={Eye}
        >
          <div className="portal-questionnaire-card mx-auto max-w-3xl">
            <h2>
              {template.name}
            </h2>

            {template.description ? (
              <p>
                {template.description}
              </p>
            ) : null}

            <div className="grid gap-6">
              {template.sections.length ? (
                template.sections.map(
                  (section) => (
                    <section
                      key={
                        section.id
                      }
                    >
                      {section.heading ? (
                        <h3 className="text-lg font-semibold">
                          {section.heading}
                        </h3>
                      ) : null}

                      {section.body
                        .split(
                          /\n{2,}/,
                        )
                        .filter(
                          Boolean,
                        )
                        .map(
                          (
                            paragraph,
                            paragraphIndex,
                          ) => (
                            <p
                              key={
                                paragraphIndex
                              }
                              className="mt-2 text-sm leading-6 text-neutral-700"
                            >
                              {paragraph}
                            </p>
                          ),
                        )}
                    </section>
                  ),
                )
              ) : (
                <p className="text-sm text-neutral-500">
                  No contract wording has been added.
                </p>
              )}
            </div>
          </div>
        </AdminPanel>
      )}
    </AdminPage>
  );
}
