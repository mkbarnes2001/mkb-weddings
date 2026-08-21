import {
  useEffect,
  useMemo,
  useState } from "react";
import { Link,
  useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Clock3,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe2,
  Images,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Pencil,
  PackageCheck,
  Phone,
  Plus,
  Send,
  ShieldX,
  Store,
  Trash2,
  UserRound,
  Users,
  Workflow,
  X,
  } from "lucide-react";
import { AdminAccordion,
  AdminButton,
  AdminIconButton,
  AdminEmptyState,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
  AdminHeaderRouterLink,
} from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type {
  CrmJobWorkspace,
  CrmSupplierSubmission,
  QuestionnaireField,
  QuestionnaireInstance,
} from "../types/crm";

function dateLabel(value?: string) {
  if (!value) return "Date TBC";
  const parsed = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-GB", value.length <= 10 ? { day: "numeric", month: "short", year: "numeric" } : { dateStyle: "medium", timeStyle: "short" });
}

function money(value: number | null, currency = "GBP") {
  if (value == null) return "Not set";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value / 100);
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (["completed", "active", "linked", "approved", "booked", "published", "live", "ready"].includes(status)) return "success";
  if (["in_progress", "opened"].includes(status)) return "info";
  if (["sent", "invited", "pending", "draft"].includes(status)) return "warning";
  if (["revoked", "rejected"].includes(status)) return "danger";
  return "neutral";
}

function answerLabel(value: unknown, field?: QuestionnaireField) {
  if (field?.type === "supplier") {
    const entries = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
    return entries.map((entry: any) => entry?.name || entry?.supplierName || entry?.supplierId || "Supplier").join(", ") || "Not answered";
  }
  if (Array.isArray(value)) return value.join(", ") || "Not answered";
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "Not answered");
}

function portalState(workspace: CrmJobWorkspace) {
  const activeAccess = workspace.portalAccess.filter((item) => item.status === "active");
  if (activeAccess.some((item) => Boolean(item.acceptedAt))) return { status: "active", label: "active" };
  if (activeAccess.length) return { status: "invited", label: "invited" };
  return { status: "not_invited", label: "not invited" };
}



type ProfessionalSupplierAnswer = {
  mode:
    | "existing"
    | "unlisted";
  supplierId: string;
  name: string;
  role: string;
  website: string;
  instagram: string;
  email: string;
  phone: string;
  location: string;
  county: string;
};

function emptyProfessionalSupplier(
  field: QuestionnaireField,
  mode:
    | "existing"
    | "unlisted" = "existing",
): ProfessionalSupplierAnswer {
  return {
    mode,
    supplierId: "",
    name: "",
    role:
      field.supplierRole
      || field.supplierCategory
      || "Supplier",
    website: "",
    instagram: "",
    email: "",
    phone: "",
    location: "",
    county: "",
  };
}

function professionalSupplierAnswers(
  value: unknown,
  field: QuestionnaireField,
): ProfessionalSupplierAnswer[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item) =>
          item
          && typeof item
            === "object",
      )
      .map(
        (item) =>
          Object.assign(
            emptyProfessionalSupplier(
              field,
            ),
            item,
          ),
      );
  }

  if (
    value
    && typeof value === "object"
  ) {
    return [
      Object.assign(
        emptyProfessionalSupplier(
          field,
        ),
        value,
      ),
    ];
  }

  return [];
}


function SimpleProfessionalSupplierQuestion({
  field,
  value,
  suppliers,
  categories: _categories,
  disabled,
  onChange,
}: {
  field: QuestionnaireField;
  value: unknown;
  suppliers:
    CrmJobWorkspace["supplierDirectory"];
  categories:
    CrmJobWorkspace["supplierCategories"];
  disabled: boolean;
  onChange:
    (value: unknown) => void;
}) {
  const answers =
    professionalSupplierAnswers(
      value,
      field,
    );

  const answer =
    answers[0]
    || emptyProfessionalSupplier(
      field,
      "unlisted",
    );

  const targetCategory =
    String(
      field.supplierCategory
      || field.label
      || field.supplierRole
      || "Supplier",
    ).trim();

  const categoryMatches =
    suppliers.filter(
      (supplier) =>
        supplier.category
          .trim()
          .toLowerCase()
        === targetCategory
          .toLowerCase(),
    );

  const directory =
    categoryMatches.length
      ? categoryMatches
      : suppliers;

  const masterSupplier =
    answer.supplierId
      ? suppliers.find(
          (supplier) =>
            supplier.id
            === answer.supplierId,
        )
      : undefined;

  const datalistId =
    `professional_supplier_simple_${field.id}`;

  function chooseSupplier(
    supplier:
      CrmJobWorkspace[
        "supplierDirectory"
      ][number],
  ) {
    onChange([
      {
        mode:
          "existing",
        supplierId:
          supplier.id,
        name:
          supplier.name,
        role:
          targetCategory,
        website:
          supplier.website || "",
        instagram:
          supplier.instagram || "",
        email:
          supplier.email || "",
        phone:
          supplier.phone || "",
        location:
          supplier.location || "",
        county:
          supplier.county || "",
      },
    ]);
  }

  function changeSupplierText(
    input: string,
  ) {
    const clean =
      input.trim();

    if (!clean) {
      onChange([]);
      return;
    }

    const match =
      directory.find(
        (supplier) =>
          supplier.name
            .trim()
            .toLowerCase()
          === clean
            .toLowerCase(),
      );

    if (match) {
      chooseSupplier(
        match,
      );
      return;
    }

    onChange([
      {
        ...emptyProfessionalSupplier(
          field,
          "unlisted",
        ),
        mode:
          "unlisted",
        name:
          input,
        role:
          targetCategory,
      },
    ]);
  }

  return (
    <div className="crm-questionnaire-editor__field">
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

      <div className="supplier-questionnaire-simple supplier-questionnaire-simple--admin">
        <input
          className="admin-input"
          list={datalistId}
          value={answer.name || ""}
          disabled={disabled}
          placeholder="Start typing supplier name…"
          autoComplete="off"
          onChange={(event) =>
            changeSupplierText(
              event.target.value,
            )
          }
        />

        <datalist id={datalistId}>
          {directory.map(
            (supplier) => (
              <option
                key={supplier.id}
                value={supplier.name}
                label={
                  supplier.location
                  || supplier.county
                  || supplier.category
                }
              />
            ),
          )}
        </datalist>

        {answer.name ? (
          <small className="supplier-questionnaire-simple__state">
            {masterSupplier
              ? [
                  "Supplier Master",
                  masterSupplier.location
                  || masterSupplier.county,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Needs review"}
          </small>
        ) : null}
      </div>
    </div>
  );
}

function ProfessionalSupplierRows({
  field,
  value,
  suppliers,
  categories,
  disabled,
  onChange,
}: {
  field: QuestionnaireField;
  value: unknown;
  suppliers:
    CrmJobWorkspace["supplierDirectory"];
  categories: string[];
  disabled: boolean;
  onChange:
    (value: unknown) => void;
}) {
  const [queries, setQueries] =
    useState<Record<number, string>>({});

  const answers =
    professionalSupplierAnswers(
      value,
      field,
    );

  const categoryOptions =
    Array.from(
      new Set(
        [
          ...categories,
          ...suppliers.map(
            (supplier) =>
              supplier.category,
          ),
          "Other",
        ]
          .map(
            (item) =>
              String(item || "").trim(),
          )
          .filter(Boolean),
      ),
    );

  const defaultCategory =
    categoryOptions.find(
      (item) =>
        item.toLowerCase()
        === "other",
    )
    || categoryOptions[0]
    || "Other";

  function masterForAnswer(
    answer:
      ProfessionalSupplierAnswer,
  ) {
    return suppliers.find(
      (supplier) =>
        supplier.id
        === answer.supplierId,
    );
  }

  function categoryForAnswer(
    answer:
      ProfessionalSupplierAnswer,
  ) {
    const selected =
      masterForAnswer(
        answer,
      );

    if (selected?.category) {
      return selected.category;
    }

    if (
      categoryOptions.includes(
        answer.role,
      )
    ) {
      return answer.role;
    }

    if (
      field.supplierCategory
      && categoryOptions.includes(
        field.supplierCategory,
      )
    ) {
      return field.supplierCategory;
    }

    return defaultCategory;
  }

  function directoryForCategory(
    category: string,
  ) {
    return suppliers.filter(
      (supplier) =>
        !category
        || supplier.category
          .toLowerCase()
          === category
            .toLowerCase(),
    );
  }

  function replaceAnswer(
    index: number,
    next:
      ProfessionalSupplierAnswer,
  ) {
    onChange(
      answers.map(
        (answer, itemIndex) =>
          itemIndex === index
            ? next
            : answer,
      ),
    );
  }

  function chooseSupplier(
    index: number,
    supplier:
      CrmJobWorkspace[
        "supplierDirectory"
      ][number],
  ) {
    setQueries(
      (current) => ({
        ...current,
        [index]:
          supplier.name,
      }),
    );

    replaceAnswer(
      index,
      {
        mode:
          "existing",
        supplierId:
          supplier.id,
        name:
          supplier.name,
        role:
          supplier.category
          || categoryForAnswer(
            answers[index],
          ),
        website:
          supplier.website
          || "",
        instagram:
          supplier.instagram
          || "",
        email:
          supplier.email
          || "",
        phone:
          supplier.phone
          || "",
        location:
          supplier.location
          || "",
        county:
          supplier.county
          || "",
      },
    );
  }

  function changeCategory(
    index: number,
    category: string,
  ) {
    const current =
      answers[index];

    if (
      category
      === categoryForAnswer(
        current,
      )
    ) {
      return;
    }

    setQueries(
      (queries) => ({
        ...queries,
        [index]:
          "",
      }),
    );

    replaceAnswer(
      index,
      {
        ...emptyProfessionalSupplier(
          field,
          field.allowUnlisted
            ? "unlisted"
            : "existing",
        ),
        role:
          category
          || defaultCategory,
      },
    );
  }

  function changeSupplierText(
    index: number,
    input: string,
  ) {
    const current =
      answers[index];

    const category =
      categoryForAnswer(
        current,
      );

    setQueries(
      (queries) => ({
        ...queries,
        [index]:
          input,
      }),
    );

    const match =
      directoryForCategory(
        category,
      ).find(
        (supplier) =>
          supplier.name
            .trim()
            .toLowerCase()
          === input
            .trim()
            .toLowerCase(),
      );

    if (match) {
      chooseSupplier(
        index,
        match,
      );

      return;
    }

    const empty = {
      ...emptyProfessionalSupplier(
        field,
        field.allowUnlisted
          ? "unlisted"
          : "existing",
      ),
      role:
        category
        || defaultCategory,
    };

    replaceAnswer(
      index,
      field.allowUnlisted
        ? {
            ...empty,
            mode:
              "unlisted",
            name:
              input,
          }
        : {
            ...empty,
            mode:
              "existing",
          },
    );
  }

  function addSupplier() {
    if (
      !field.multiple
      && answers.length
    ) {
      return;
    }

    onChange([
      ...answers,
      {
        ...emptyProfessionalSupplier(
          field,
          field.allowUnlisted
            ? "unlisted"
            : "existing",
        ),
        role:
          defaultCategory,
      },
    ]);
  }

  function removeSupplier(
    index: number,
  ) {
    onChange(
      answers.filter(
        (_, itemIndex) =>
          itemIndex !== index,
      ),
    );

    setQueries(
      (current) => {
        const next = {
          ...current,
        };

        delete next[index];

        return next;
      },
    );
  }

  return (
    <div className="crm-questionnaire-editor__field">
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

      <div className="supplier-questionnaire-table supplier-questionnaire-table--admin">
        {answers.length ? (
          <div
            className="supplier-questionnaire-header"
            aria-hidden="true"
          >
            <span>
              Category
            </span>
            <span>
              Supplier
            </span>
            <span />
          </div>
        ) : null}

        {answers.map(
          (answer, index) => {
            const category =
              categoryForAnswer(
                answer,
              );

            const directory =
              directoryForCategory(
                category,
              );

            const query =
              queries[index]
              ?? answer.name
              ?? "";

            const masterSupplier =
              masterForAnswer(
                answer,
              );

            const datalistId =
              `professional_supplier_${field.id}_${index}`;

            return (
              <div
                key={`${field.id}_${index}`}
                className="supplier-questionnaire-row"
              >
                <label className="supplier-questionnaire-category">
                  <span>
                    Category
                  </span>

                  <select
                    className="admin-select"
                    value={
                      category
                    }
                    disabled={
                      disabled
                    }
                    onChange={(
                      event,
                    ) =>
                      changeCategory(
                        index,
                        event.target
                          .value,
                      )
                    }
                  >
                    {categoryOptions.map(
                      (option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="supplier-questionnaire-supplier">
                  <span>
                    Supplier
                  </span>

                  <input
                    className="admin-input"
                    list={
                      datalistId
                    }
                    value={query}
                    disabled={
                      disabled
                    }
                    placeholder="Start typing a supplier name"
                    autoComplete="off"
                    onChange={(
                      event,
                    ) =>
                      changeSupplierText(
                        index,
                        event.target
                          .value,
                      )
                    }
                  />

                  <datalist
                    id={
                      datalistId
                    }
                  >
                    {directory.map(
                      (supplier) => (
                        <option
                          key={
                            supplier.id
                          }
                          value={
                            supplier.name
                          }
                          label={
                            supplier.location
                            || supplier.county
                            || supplier.category
                          }
                        />
                      ),
                    )}
                  </datalist>

                  <small className="supplier-questionnaire-state">
                    {masterSupplier
                      ? [
                          "Supplier Master",
                          masterSupplier
                            .location
                            || masterSupplier
                              .county,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : answer.name
                        ? "Not in Supplier Master — will enter the review queue."
                        : "Search Supplier Master, or type a name if it is not listed."}
                  </small>
                </label>

                <button
                  type="button"
                  className="supplier-questionnaire-remove"
                  disabled={
                    disabled
                  }
                  aria-label={`Remove supplier row ${index + 1}`}
                  title="Remove supplier"
                  onClick={() =>
                    removeSupplier(
                      index,
                    )
                  }
                >
                  <X />
                </button>
              </div>
            );
          },
        )}

        {!disabled
        && (
          field.multiple
          || !answers.length
        ) ? (
          <div className="supplier-questionnaire-add">
            <AdminButton
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={
                addSupplier
              }
            >
              Add supplier
            </AdminButton>

            <small>
              {field.allowUnlisted
                ? "If there is no Supplier Master match, type the business name and review it after saving."
                : "Choose an existing Supplier Master record."}
            </small>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProfessionalQuestionnaireField({
  field,
  value,
  suppliers,
  supplierCategories,
  fileCount,
  disabled,
  onChange,
}: {
  field: QuestionnaireField;
  value: unknown;
  suppliers:
    CrmJobWorkspace["supplierDirectory"];
  supplierCategories:
    CrmJobWorkspace["supplierCategories"];
  fileCount: number;
  disabled: boolean;
  onChange:
    (value: unknown) => void;
}) {
  if (field.type === "heading") {
    return (
      <div className="crm-questionnaire-editor__heading">
        {field.label}
      </div>
    );
  }

  if (field.type === "description") {
    return (
      <p className="crm-questionnaire-editor__description">
        {field.label}
      </p>
    );
  }

  if (field.type === "file") {
    return (
      <div className="crm-questionnaire-editor__field">
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

        <div className="crm-questionnaire-editor__file-note">
          {fileCount
            ? `${fileCount} file${
                fileCount === 1
                  ? ""
                  : "s"
              } currently attached.`
            : "No file currently attached."}
          {" "}
          Questionnaire attachments remain managed through the shared Files area and Client Portal.
        </div>
      </div>
    );
  }

  if (field.type === "supplier") {
    return field.multiple ? (
      <ProfessionalSupplierRows
        field={field}
        value={value}
        suppliers={suppliers}
        categories={
          supplierCategories
        }
        disabled={disabled}
        onChange={onChange}
      />
    ) : (
      <SimpleProfessionalSupplierQuestion
        field={field}
        value={value}
        suppliers={suppliers}
        categories={
          supplierCategories
        }
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  const selected =
    Array.isArray(value)
      ? value as string[]
      : [];

  return (
    <div className="crm-questionnaire-editor__field">
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

      {field.type === "short_text"
      || field.type === "address"
      || field.type === "venue" ? (
        <input
          className="admin-input"
          placeholder={
            field.type === "address"
              ? "Client address"
              : field.type === "venue"
                ? "Venue"
                : undefined
          }
          value={String(
            value ?? "",
          )}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
        />
      ) : null}

      {field.type === "long_text" ? (
        <textarea
          className="admin-textarea"
          value={String(
            value ?? "",
          )}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
        />
      ) : null}

      {field.type === "select" ? (
        <select
          className="admin-select"
          value={String(
            value ?? "",
          )}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
        >
          <option value="">
            Choose an option
          </option>

          {field.options.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ),
          )}
        </select>
      ) : null}

      {field.type === "radio" ? (
        <div className="crm-questionnaire-editor__choices">
          {field.options.map(
            (option) => (
              <label key={option}>
                <input
                  type="radio"
                  name={`professional_${field.id}`}
                  checked={
                    value === option
                  }
                  disabled={disabled}
                  onChange={() =>
                    onChange(option)
                  }
                />
                <span>
                  {option}
                </span>
              </label>
            ),
          )}
        </div>
      ) : null}

      {field.type === "checkbox" ? (
        <div className="crm-questionnaire-editor__choices">
          {field.options.map(
            (option) => (
              <label key={option}>
                <input
                  type="checkbox"
                  checked={
                    selected.includes(
                      option,
                    )
                  }
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [
                            ...selected,
                            option,
                          ]
                        : selected
                            .filter(
                              (item) =>
                                item
                                !== option,
                            ),
                    )
                  }
                />
                <span>
                  {option}
                </span>
              </label>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}


export function CRMJob() {
  const { id = "" } = useParams();
  const { auth } = useProfessionalAuth();
  const [workspace, setWorkspace] = useState<CrmJobWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [contactId, setContactId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [supplierReview, setSupplierReview] = useState<
    Record<
      string,
      {
        action: "create" | "merge";
        supplierId: string;
        category: string;
        notes: string;
      }
    >
  >({});
  const [workflowTemplateId, setWorkflowTemplateId] = useState("");
  const [taskDraft, setTaskDraft] = useState({ title: "", description: "", taskType: "task", priority: "normal", dueAt: "" });
  const [communicationDraft, setCommunicationDraft] = useState({ channel: "note", direction: "internal", contactId: "", subject: "", body: "" });

  const [
    questionnaireEditorId,
    setQuestionnaireEditorId,
  ] = useState("");

  const [
    questionnaireDraft,
    setQuestionnaireDraft,
  ] = useState<
    Record<string, unknown>
  >({});

  const canManage = auth.permissions.includes("crm:manage");
  const canManageCommercial = canManage && auth.accessMode !== "support";
  const canEditQuestionnaires =
    canManage
    && auth.accessMode !== "support";

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await AdminApiService.getCrmJobWorkspace(id);
      setWorkspace(result);
      setTemplateId((current) => current || result.templates.find((item) => item.status === "active")?.id || result.templates[0]?.id || "");
      setContactId((current) => current || result.contacts.find((item) => item.role === "primary")?.id || result.contacts[0]?.id || "");
      setWorkflowTemplateId((current) => current || result.workflowTemplates.find((item) => item.default)?.id || result.workflowTemplates[0]?.id || "");
      setCommunicationDraft((current) => ({ ...current, contactId: current.contactId || result.contacts.find((item) => item.role === "primary")?.id || result.contacts[0]?.id || "" }));
      setSupplierReview(
        (current) => {
          const next = {
            ...current,
          };

          for (
            const submission
            of result.supplierSubmissions
          ) {
            if (next[submission.id]) {
              continue;
            }

            const supplierId =
              submission.resolvedSupplierId
              || submission.supplierId
              || "";

            next[submission.id] = {
              action:
                supplierId
                  ? "merge"
                  : "create",
              supplierId,
              category:
                submission.role
                || "Other",
              notes:
                submission.reviewNotes
                || "",
            };
          }

          return next;
        },
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Job.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id, auth.workspaceId]);

  const activeAccessByContact = useMemo(() => new Map((workspace?.portalAccess || []).filter((item) => item.status === "active").map((item) => [item.contactId, item])), [workspace?.portalAccess]);
  const questionnaireFiles = useMemo(
    () =>
      (workspace?.questionnaires || [])
        .flatMap((item) =>
          item.files.map((file) => ({
            ...file,
            questionnaireId: item.id,
            questionnaireTitle: item.title,
          })),
        ),
    [workspace?.questionnaires],
  );

  const jobFiles =
    workspace?.files || [];

  const allFileCount =
    questionnaireFiles.length
    + jobFiles.length;
  const pendingSubmissions = useMemo(() => (workspace?.supplierSubmissions || []).filter((item) => item.status === "pending"), [workspace?.supplierSubmissions]);

  async function repairBookingPack() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      setWorkspace(
        await AdminApiService
          .repairCrmBookingPack(id),
      );

      setMessage(
        "Booking pack checked and repaired from "
        + "the accepted quote.",
      );
    } catch (repairError) {
      setError(
        repairError instanceof Error
          ? repairError.message
          : "Unable to repair the booking pack.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function sendContractToPortal(
    contractId: string,
  ) {
    if (
      !window.confirm(
        "Send this draft contract to the Client Portal? "
        + "The current contract version will become "
        + "client-visible and cannot be edited in place.",
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      setWorkspace(
        await AdminApiService
          .sendCrmContractToPortal(
            id,
            contractId,
          ),
      );

      setMessage(
        "Contract is now visible in the Client Portal. "
        + "No email was sent.",
      );
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Unable to send the contract "
            + "to the Client Portal.",
      );
    } finally {
      setSaving(false);
    }
  }

  function beginQuestionnaireEdit(
    questionnaire:
      QuestionnaireInstance,
  ) {
    if (!canEditQuestionnaires) {
      return;
    }

    setQuestionnaireEditorId(
      questionnaire.id,
    );

    setQuestionnaireDraft(
      JSON.parse(
        JSON.stringify(
          questionnaire.responses
          || {},
        ),
      ),
    );

    setError("");
    setMessage("");
  }

  function cancelQuestionnaireEdit() {
    setQuestionnaireEditorId("");
    setQuestionnaireDraft({});
  }

  function updateQuestionnaireAnswer(
    fieldId: string,
    value: unknown,
  ) {
    setQuestionnaireDraft(
      (current) => ({
        ...current,
        [fieldId]:
          value,
      }),
    );
  }

  async function saveQuestionnaireAnswers(
    questionnaire:
      QuestionnaireInstance,
    complete = false,
  ) {
    if (!canEditQuestionnaires) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved =
        await AdminApiService
          .saveQuestionnaireInstance(
            questionnaire.id,
            {
              responses:
                questionnaireDraft,
              complete,
            },
          );

      setWorkspace(
        (current) =>
          current
            ? {
                ...current,
                questionnaires:
                  current.questionnaires
                    .map(
                      (item) =>
                        item.id
                        === saved.id
                          ? saved
                          : item,
                    ),
              }
            : current,
      );

      setQuestionnaireDraft(
        JSON.parse(
          JSON.stringify(
            saved.responses
            || {},
          ),
        ),
      );

      setMessage(
        complete
          && questionnaire.status
            !== "completed"
          ? "Questionnaire marked complete. It remains editable by the client and WedCRM."
          : saved.status
            === "completed"
            ? "Questionnaire changes saved. It remains marked complete."
            : "Questionnaire changes saved.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save questionnaire answers.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function assign() {
    if (!templateId || !contactId) { setError("Choose the client who should complete this questionnaire."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      await AdminApiService.assignQuestionnaire(id, { templateId, contactId, dueAt: dueAt || undefined });
      setMessage("Questionnaire assigned. Send a portal invitation when ready.");
      await load();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Unable to assign questionnaire.");
    } finally { setSaving(false); }
  }

  async function invite(clientId: string) {
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await AdminApiService.inviteCrmClient(id, clientId);
      setMessage(result.message);
      await load();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to invite client.");
    } finally { setSaving(false); }
  }

  async function revoke(identityId: string) {
    if (!window.confirm("Revoke this client's portal access?")) return;
    setSaving(true); setError(""); setMessage("");
    try {
      setWorkspace(await AdminApiService.revokeCrmClientAccess(id, identityId));
      setMessage("Client portal access revoked.");
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke access.");
    } finally { setSaving(false); }
  }

  async function approveSupplier(
    submission: CrmSupplierSubmission,
  ) {
    const review =
      supplierReview[
        submission.id
      ] || {
        action:
          "create" as const,
        supplierId: "",
        category:
          submission.role
          || "Other",
        notes: "",
      };

    const merging =
      review.action
      === "merge";

    if (
      merging
      && !review.supplierId
    ) {
      setError(
        "Choose the Supplier Master record to merge this suggestion into.",
      );
      return;
    }

    const actionDescription =
      merging
        ? "merge this suggestion into the selected Supplier Master record"
        : "create a new Supplier Master record";

    if (
      !window.confirm(
        `Approve ${
          submission.name
          || "this supplier"
        } and ${actionDescription}?`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result =
        await AdminApiService
          .approveCrmSupplierSubmission(
            id,
            submission.id,
            {
              supplierId:
                merging
                  ? review.supplierId
                  : undefined,
              category:
                review.category,
              role:
                review.category,
              reviewNotes:
                review.notes,
            },
          );

      setWorkspace(
        result,
      );

      setMessage(
        merging
          ? "Supplier suggestion merged and linked to the Wedding."
          : "Supplier approved, added to Supplier Master and linked to the Wedding.",
      );
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Unable to approve supplier.",
      );
    } finally {
      setSaving(false);
    }
  }


  async function rejectSupplier(submission: CrmSupplierSubmission) {
    if (!window.confirm(`Reject ${submission.name || "this supplier suggestion"}?`)) return;
    setSaving(true); setError(""); setMessage("");
    try {
      setWorkspace(await AdminApiService.rejectCrmSupplierSubmission(id, submission.id, supplierReview[submission.id]?.notes || ""));
      setMessage("Supplier suggestion rejected.");
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "Unable to reject supplier.");
    } finally { setSaving(false); }
  }

  async function togglePhotographyMilestone(
    title: "Previews sent" | "Client photos delivered",
  ) {
    if (!id || !workspace) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const matchesMilestone = (
        task: CrmJobWorkspace["tasks"][number],
      ) =>
        task.status !== "cancelled"
        && task.taskType === "milestone"
        && task.title.trim().toLowerCase()
          === title.toLowerCase();

      let nextWorkspace = workspace;
      let task =
        nextWorkspace.tasks.find(
          matchesMilestone,
        );

      if (!task) {
        nextWorkspace =
          await AdminApiService.createCrmJobTask(
            id,
            {
              title,
              description:
                "Wedding Photography workflow milestone.",
              taskType: "milestone",
              priority: "normal",
              dueAt: "",
            },
          );

        task =
          nextWorkspace.tasks.find(
            matchesMilestone,
          );

        if (!task) {
          throw new Error(
            `Unable to create the ${title} milestone.`,
          );
        }
      }

      const nextStatus =
        task.status === "completed"
          ? "pending"
          : "completed";

      nextWorkspace =
        await AdminApiService.updateCrmJobTask(
          id,
          task.id,
          {
            status: nextStatus,
          },
        );

      setWorkspace(
        nextWorkspace,
      );

      setMessage(
        nextStatus === "completed"
          ? `${title} completed.`
          : `${title} reopened.`,
      );
    } catch (workflowError) {
      setError(
        workflowError instanceof Error
          ? workflowError.message
          : "Unable to update the Wedding workflow.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function applyWorkflow() {
    if (!workflowTemplateId) { setError("Choose a workflow template."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      setWorkspace(await AdminApiService.applyCrmWorkflow(id, workflowTemplateId));
      setMessage("Workflow applied and Job tasks created.");
    } catch (workflowError) { setError(workflowError instanceof Error ? workflowError.message : "Unable to apply workflow."); }
    finally { setSaving(false); }
  }

  async function createTask() {
    if (!taskDraft.title.trim()) { setError("Enter a task title."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      setWorkspace(await AdminApiService.createCrmJobTask(id, taskDraft));
      setTaskDraft({ title: "", description: "", taskType: "task", priority: "normal", dueAt: "" });
      setMessage("Task added.");
    } catch (taskError) { setError(taskError instanceof Error ? taskError.message : "Unable to add task."); }
    finally { setSaving(false); }
  }

  async function setTaskStatus(taskId: string, status: "pending" | "completed" | "cancelled") {
    setSaving(true); setError(""); setMessage("");
    try {
      setWorkspace(await AdminApiService.updateCrmJobTask(id, taskId, { status }));
      setMessage(status === "completed" ? "Task completed." : status === "cancelled" ? "Task cancelled." : "Task reopened.");
    } catch (taskError) { setError(taskError instanceof Error ? taskError.message : "Unable to update task."); }
    finally { setSaving(false); }
  }

  async function saveCommunication(sendEmail = false) {
    if (!communicationDraft.body.trim() && !communicationDraft.subject.trim()) { setError("Enter communication details."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const next = sendEmail
        ? await AdminApiService.sendCrmJobEmail(id, { ...communicationDraft, channel: "email", direction: "outbound" })
        : await AdminApiService.logCrmJobCommunication(id, communicationDraft);
      setWorkspace(next);
      setCommunicationDraft((current) => ({ ...current, subject: "", body: "" }));
      setMessage(sendEmail ? "Email sent and recorded." : "Communication logged.");
    } catch (communicationError) { setError(communicationError instanceof Error ? communicationError.message : "Unable to save communication."); }
    finally { setSaving(false); }
  }

  async function createClientGalleryFromJob() {
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await AdminApiService.createCrmJobClientGallery(id);
      setWorkspace(result.workspace);
      setMessage(result.idempotent ? "The existing linked client gallery is ready to open." : "Client gallery created from this Job and linked Wedding Workspace.");
    } catch (galleryError) {
      setError(galleryError instanceof Error ? galleryError.message : "Unable to create the client gallery.");
    } finally { setSaving(false); }
  }

  async function uploadPlanningFile(
    file: File | undefined,
  ) {
    if (!file || !canManage) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result =
        await AdminApiService.uploadCrmJobFile(
            id,
            file,
          );

      setWorkspace(
        result.workspace,
      );

      setMessage(
        `${file.name} uploaded to Files.`,
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload the planning file.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removePlanningFile(
    fileId: string,
    filename: string,
  ) {
    if (
      !canManage
      || !window.confirm(
        `Remove ${filename}?`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result =
        await AdminApiService.deleteCrmJobFile(
            id,
            fileId,
          );

      setWorkspace(
        result.workspace,
      );

      setMessage(
        `${filename} removed.`,
      );
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove the planning file.",
      );
    } finally {
      setSaving(false);
    }
  }


  if (loading && !workspace) return <AdminPage><p className="text-sm text-neutral-500">Loading Job workspace…</p></AdminPage>;
  if (!workspace) return <AdminPage><div className="admin-alert admin-alert--error">{error || "Job not found."}</div></AdminPage>;
  const { job } = workspace;
  const previewsTask =
    workspace.tasks.find(
      (task) =>
        task.status !== "cancelled"
        && task.taskType === "milestone"
        && task.title.trim().toLowerCase()
          === "previews sent",
    );

  const deliveryTask =
    workspace.tasks.find(
      (task) =>
        task.status !== "cancelled"
        && task.taskType === "milestone"
        && task.title.trim().toLowerCase()
          === "client photos delivered",
    );

  const previewsComplete =
    previewsTask?.status === "completed";

  const deliveryComplete =
    deliveryTask?.status === "completed";
  const packageSnapshot = (job.packageSnapshot || {}) as any;
  const selectedAddons = Array.isArray(job.addonsSnapshot) ? job.addonsSnapshot as any[] : [];
  const portal = portalState(workspace);
  const lifecycle = workspace.lifecycle;
  const commercial = workspace.commercial;
  const commercialInvoice = commercial.invoice;
  const commercialContract = commercial.contract;
  const commercialQuote = commercial.quote;
  const bookingQuestionnaire = workspace.questionnaires.find((item) => item.status !== "completed")
    || workspace.questionnaires[0]
    || null;
  const primaryGallery = lifecycle.primaryClientGallery;
  const storyLabel = lifecycle.story.state === "not_started" ? "not started" : lifecycle.story.state;

  return (
    <AdminPage className="crm-job-operations-page">
      <AdminPageHeader
        className="crm-job-page-header"
        title={job.title}
        description={[
          job.reference,
          job.serviceName
            || job.jobType
            || "Wedding service",
          dateLabel(job.eventDate),
          job.venueText
            || "Venue TBC",
        ].join(" · ")}
        actions={
          <div className="crm-job-header-actions">
            {job.quoteId ? (
              <AdminHeaderRouterLink
                className="admin-icon-control"
                to={`/admin/crm/quotes/${job.quoteId}`}
                aria-label="Open quote"
                title="Open quote"
              >
                <PackageCheck aria-hidden="true" />
              </AdminHeaderRouterLink>
            ) : null}

            {job.weddingSlug ? (
              <AdminHeaderRouterLink
                className="admin-icon-control crm-job-header-action--primary"
                to={`/admin/weddings/${job.weddingSlug}/workspace`}
                aria-label="Open Wedding Workspace"
                title="Open Wedding Workspace"
              >
                <LayoutDashboard aria-hidden="true" />
              </AdminHeaderRouterLink>
            ) : null}
          </div>
        }
      />
      {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
      {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}

            <div className="crm-job-primary-grid">
        <div className="crm-job-primary-grid__workflow">
<AdminPanel
        title="Wedding workflow"
        description="Wedding Photography · key booking and delivery milestones."
        icon={Workflow}
        className="crm-wedding-workflow-panel"
      >
        <ol className="crm-wedding-workflow">
          <li className="crm-wedding-workflow__item is-complete">
            <span
              className="crm-wedding-workflow__marker"
              aria-hidden="true"
            >
              <Check />
            </span>

            <div className="crm-wedding-workflow__content">
              <div className="crm-wedding-workflow__heading">
                <strong>Lead created</strong>
              </div>

              <p>
                {workspace.enquiry?.createdAt
                  ? dateLabel(
                      workspace.enquiry.createdAt,
                    )
                  : "Lead creation date unavailable"}
              </p>
            </div>
          </li>

          <li className="crm-wedding-workflow__item is-complete">
            <span
              className="crm-wedding-workflow__marker"
              aria-hidden="true"
            >
              <Check />
            </span>

            <div className="crm-wedding-workflow__content">
              <div className="crm-wedding-workflow__heading">
                <strong>Job accepted</strong>
              </div>

              <p>
                {job.bookingDate || job.createdAt
                  ? dateLabel(
                      job.bookingDate
                        || job.createdAt,
                    )
                  : "Acceptance date unavailable"}
              </p>
            </div>
          </li>

          <li className="crm-wedding-workflow__item is-scheduled">
            <span
              className="crm-wedding-workflow__marker crm-wedding-workflow__marker--scheduled"
              aria-hidden="true"
            />

            <div className="crm-wedding-workflow__content">
              <div className="crm-wedding-workflow__heading">
                <strong>Wedding day</strong>
              </div>

              <p>
                {job.eventDate
                  ? dateLabel(
                      job.eventDate,
                    )
                  : "Wedding date not set"}
                {" · "}
                {job.venueText
                  || lifecycle.wedding.venue
                  || "Venue TBC"}
              </p>
            </div>
          </li>

          <li
            className={
              `crm-wedding-workflow__item ${
                previewsComplete
                  ? "is-complete"
                  : ""
              }`
            }
          >
            <button
              type="button"
              className={
                `crm-wedding-workflow__toggle ${
                  previewsComplete
                    ? "is-complete"
                    : ""
                }`
              }
              aria-label={
                previewsComplete
                  ? "Reopen Previews sent milestone"
                  : "Complete Previews sent milestone"
              }
              aria-pressed={
                previewsComplete
              }
              title={
                previewsComplete
                  ? "Mark previews as not sent"
                  : "Mark previews as sent"
              }
              disabled={
                saving || !canManage
              }
              onClick={() =>
                void togglePhotographyMilestone(
                  "Previews sent",
                )
              }
            >
              {previewsComplete
                ? <Check />
                : null}
            </button>

            <div className="crm-wedding-workflow__content">
              <div className="crm-wedding-workflow__heading">
                <strong>Previews sent</strong>
              </div>

              <p>
                {previewsComplete
                  && previewsTask?.completedAt
                  ? `Completed ${dateLabel(
                      previewsTask.completedAt,
                    )}`
                  : "Mark complete when the Wedding previews have been sent."}
              </p>
            </div>
          </li>

          <li
            className={
              `crm-wedding-workflow__item ${
                deliveryComplete
                  ? "is-complete"
                  : ""
              }`
            }
          >
            <button
              type="button"
              className={
                `crm-wedding-workflow__toggle ${
                  deliveryComplete
                    ? "is-complete"
                    : ""
                }`
              }
              aria-label={
                deliveryComplete
                  ? "Reopen Client photos delivered milestone"
                  : "Complete Client photos delivered milestone"
              }
              aria-pressed={
                deliveryComplete
              }
              title={
                deliveryComplete
                  ? "Reopen final delivery"
                  : "Mark client photos as delivered"
              }
              disabled={
                saving || !canManage
              }
              onClick={() =>
                void togglePhotographyMilestone(
                  "Client photos delivered",
                )
              }
            >
              {deliveryComplete
                ? <Check />
                : null}
            </button>

            <div className="crm-wedding-workflow__content">
              <div className="crm-wedding-workflow__heading">
                <strong>Client photos delivered</strong>
              </div>

              <p>
                {deliveryComplete
                  && deliveryTask?.completedAt
                  ? `Completed ${dateLabel(
                      deliveryTask.completedAt,
                    )}`
                  : "Final gallery delivery completes this Job."}
              </p>
            </div>
          </li>
        </ol>
      </AdminPanel>
        </div>
        <div className="crm-job-primary-grid__clients">
<div id="job-clients" className="scroll-mt-5 crm-job-top-clients"><AdminPanel
            title="Clients"
            description="Contact details and client portal access."
            icon={Users}
            className="crm-job-clients-panel"
            actions={
              <span className="crm-job-panel-count">
                {workspace.contacts.length}
              </span>
            }
          >
            <div className="crm-job-clients">
              {workspace.contacts.map((contact) => {
                const access =
                  activeAccessByContact.get(
                    contact.id,
                  );

                const portalStatus =
                  !contact.email
                    ? "email-required"
                    : access?.acceptedAt
                      ? "active"
                      : access
                        ? "invited"
                        : "not-invited";

                const portalLabel =
                  portalStatus === "active"
                    ? "Active"
                    : portalStatus === "invited"
                      ? "Invited"
                      : portalStatus === "email-required"
                        ? "Email required"
                        : "Not invited";

                return (
                  <article key={contact.id}>
                    <div className="crm-job-client-copy">
                      <strong>
                        {contact.displayName}
                      </strong>

                      <p>
                        {contact.role}
                      </p>

                      <a
                        href={
                          contact.email
                            ? `mailto:${contact.email}`
                            : undefined
                        }
                      >
                        {contact.email || "Email required"}
                      </a>

                      {contact.phone ? (
                        <span>
                          {contact.phone}
                        </span>
                      ) : null}

                      <div
                        className={
                          `crm-job-client-portal-state is-${portalStatus}`
                        }
                      >
                        <span aria-hidden="true"></span>

                        <small>
                          Client portal · {portalLabel}
                        </small>
                      </div>
                    </div>

                    <div className="crm-job-client-actions">
                      <Link
                        className="admin-icon-control crm-job-client-icon-action"
                        to={`/admin/crm/contacts/${contact.id}`}
                        aria-label={`Edit ${contact.displayName}`}
                        title="Edit client"
                      >
                        <Pencil
                          strokeWidth={2.25}
                          aria-hidden="true"
                        />
                      </Link>

                      <AdminIconButton
                        icon={Mail}
                        label={
                          access
                            ? "Send new link"
                            : "Invite client"
                        }
                        title={
                          access
                            ? "Send new link"
                            : "Invite client"
                        }
                        variant="secondary"
                        disabled={
                          saving
                          || !canManage
                          || !contact.email
                        }
                        onClick={() =>
                          void invite(
                            contact.id,
                          )
                        }
                      />

                      {access ? (
                        <AdminIconButton
                          icon={ShieldX}
                          label="Revoke client portal access"
                          title="Revoke client portal access"
                          variant="danger"
                          disabled={
                            saving
                            || !canManage
                          }
                          onClick={() =>
                            void revoke(
                              access.identityId,
                            )
                          }
                        />
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </AdminPanel></div>
        </div>
      </div>

            <div className="crm-job-summary-grid">
        <div className="crm-job-summary-grid__column crm-job-summary-grid__column--commercial">
<AdminPanel
        title="Booking and payments"
        description="Invoice, contract, questionnaire and accepted quote."
        icon={BriefcaseBusiness}
        className="crm-commercial-panel"
        actions={
          commercialQuote && canManageCommercial ? (
            <AdminIconButton
              icon={PackageCheck}
              label="Generate / repair booking pack"
              title="Generate / repair booking pack"
              variant="secondary"
              disabled={saving}
              onClick={() =>
                void repairBookingPack()
              }
            />
          ) : null
        }
      >
        <div className="crm-commercial-grid crm-job-commercial-summary-list">
          {commercialInvoice ? (
            <article className="crm-commercial-card crm-commercial-card--link crm-commercial-summary-row">
              <span className="crm-commercial-card__icon">
                <FileText />
              </span>

              <div className="crm-commercial-summary-row__copy">
                <div className="crm-commercial-summary-row__identity">
                  <span>
                    Invoice
                  </span>

                  <strong>
                    {commercialInvoice.reference}
                  </strong>
                </div>

                <p className="crm-commercial-summary-line">
                  Total{" "}
                  {money(
                    commercialInvoice.totalAmount,
                    commercialInvoice.currency,
                  )}
                  {" · "}
                  Paid{" "}
                  {money(
                    commercialInvoice.paidAmount,
                    commercialInvoice.currency,
                  )}
                  {" · "}
                  Balance{" "}
                  {money(
                    commercialInvoice.balanceAmount,
                    commercialInvoice.currency,
                  )}
                </p>

                {commercialInvoice.nextPayment ? (
                  <small className="crm-commercial-summary-line crm-commercial-card__next">
                    Next payment ·{" "}
                    {commercialInvoice.nextPayment.label}
                    {" · "}
                    {money(
                      commercialInvoice.nextPayment.balanceAmount,
                      commercialInvoice.currency,
                    )}
                    {commercialInvoice.nextPayment.dueDate
                      ? ` · Due ${dateLabel(
                          commercialInvoice.nextPayment.dueDate,
                        )}`
                      : ""}
                  </small>
                ) : (
                  <small className="crm-commercial-summary-line">
                    {commercialInvoice.balanceAmount > 0
                      ? "No payment schedule item currently due"
                      : "Invoice balance settled"}
                  </small>
                )}
              </div>

              <span
                className={
                  `crm-commercial-summary-state is-${commercialInvoice.status}`
                }
              >
                {commercialInvoice.status.replace(
                  /_/g,
                  " ",
                )}
              </span>

              <Link
                className="admin-icon-control crm-commercial-card__open"
                to={`/admin/crm/jobs/${job.id}/invoices/${commercialInvoice.id}`}
                aria-label={`Open invoice ${commercialInvoice.reference}`}
                title="Open invoice"
              >
                <ExternalLink aria-hidden="true" />
              </Link>
            </article>
          ) : (
            <article className="crm-commercial-card crm-commercial-summary-row">
              <span className="crm-commercial-card__icon">
                <FileText />
              </span>

              <div className="crm-commercial-summary-row__copy">
                <div className="crm-commercial-summary-row__identity">
                  <span>
                    Invoice
                  </span>

                  <strong>
                    No invoice yet
                  </strong>
                </div>

                <small className="crm-commercial-summary-line">
                  Booking invoice has not been generated
                </small>
              </div>

              <span className="crm-commercial-summary-state">
                Not generated
              </span>

              <span className="crm-commercial-summary-action-spacer" />
            </article>
          )}

          <article className="crm-commercial-card crm-commercial-summary-row">
            <span className="crm-commercial-card__icon">
              <BookOpen />
            </span>

            <div className="crm-commercial-summary-row__copy">
              <div className="crm-commercial-summary-row__identity">
                <span>
                  Contract
                </span>

                <strong>
                  {commercialContract?.reference
                    || "No contract yet"}
                </strong>
              </div>

              {commercialContract ? (
                <p className="crm-commercial-summary-line">
                  {commercialContract.title}
                  {" · "}
                  Signatures{" "}
                  {commercialContract.signatureCount}
                  /{commercialContract.requiredSignatures}
                  {" · "}
                  Version{" "}
                  {commercialContract.versionNumber || "—"}
                </p>
              ) : (
                <small className="crm-commercial-summary-line">
                  Booking contract has not been generated
                </small>
              )}
            </div>

            <span
              className={
                `crm-commercial-summary-state ${
                  commercialContract
                    ? `is-${commercialContract.status}`
                    : ""
                }`
              }
            >
              {commercialContract
                ? commercialContract.status.replace(
                    /_/g,
                    " ",
                  )
                : "Not generated"}
            </span>

            {commercialContract?.status === "draft" ? (
              portal.status === "not_invited" ? (
                <span
                  className="crm-commercial-summary-action-spacer crm-commercial-summary-action-spacer--disabled"
                  aria-label="Invite client first"
                  title="Invite client first"
                />
              ) : canManageCommercial ? (
                <AdminIconButton
                  icon={Mail}
                  label="Send to Client Portal"
                  title="Send to Client Portal"
                  variant="secondary"
                  disabled={saving}
                  onClick={() =>
                    void sendContractToPortal(
                      commercialContract.id,
                    )
                  }
                />
              ) : (
                <span className="crm-commercial-summary-action-spacer" />
              )
            ) : (
              <span className="crm-commercial-summary-action-spacer" />
            )}
          </article>

          <article className="crm-commercial-card crm-commercial-card--link crm-commercial-summary-row">
            <span className="crm-commercial-card__icon">
              <ClipboardList />
            </span>

            <div className="crm-commercial-summary-row__copy">
              <div className="crm-commercial-summary-row__identity">
                <span>
                  Questionnaire
                </span>

                <strong>
                  {bookingQuestionnaire?.title
                    || "No booking questionnaire"}
                </strong>
              </div>

              <small className="crm-commercial-summary-line">
                {bookingQuestionnaire
                  ? bookingQuestionnaire.dueAt
                    ? `Planning target ${dateLabel(
                        bookingQuestionnaire.dueAt,
                      )}`
                    : "Assigned with no due date"
                  : "No questionnaire currently assigned"}
              </small>
            </div>

            <span
              className={
                `crm-commercial-summary-state ${
                  bookingQuestionnaire
                    ? `is-${bookingQuestionnaire.status}`
                    : ""
                }`
              }
            >
              {bookingQuestionnaire
                ? bookingQuestionnaire.status.replace(
                    /_/g,
                    " ",
                  )
                : "Not assigned"}
            </span>

            <a
              className="admin-icon-control crm-commercial-card__open"
              href="#job-questionnaires"
              aria-label="Open Questionnaire management"
              title="Open questionnaire"
            >
              <ExternalLink aria-hidden="true" />
            </a>
          </article>

          {commercialQuote ? (
            <article className="crm-commercial-card crm-commercial-card--link crm-commercial-summary-row">
              <span className="crm-commercial-card__icon">
                <PackageCheck />
              </span>

              <div className="crm-commercial-summary-row__copy">
                <div className="crm-commercial-summary-row__identity">
                  <span>
                    Accepted quote
                  </span>

                  <strong>
                    {commercialQuote.reference}
                  </strong>
                </div>

                <p className="crm-commercial-summary-line">
                  {commercialQuote.packageName
                    || job.packageName
                    || "Booked package"}
                  {" · "}
                  Total{" "}
                  {money(
                    commercialQuote.totalAmount,
                    commercialQuote.currency,
                  )}
                  {commercialQuote.acceptedAt
                    ? ` · Accepted ${dateLabel(
                        commercialQuote.acceptedAt,
                      )}`
                    : ""}
                </p>
              </div>

              <span className="crm-commercial-summary-state is-accepted">
                Accepted
              </span>

              <Link
                className="admin-icon-control crm-commercial-card__open"
                to={`/admin/crm/quotes/${commercialQuote.id}`}
                aria-label={`Open accepted quote ${commercialQuote.reference}`}
                title="Open accepted quote"
              >
                <ExternalLink aria-hidden="true" />
              </Link>
            </article>
          ) : (
            <article className="crm-commercial-card crm-commercial-summary-row">
              <span className="crm-commercial-card__icon">
                <PackageCheck />
              </span>

              <div className="crm-commercial-summary-row__copy">
                <div className="crm-commercial-summary-row__identity">
                  <span>
                    Accepted quote
                  </span>

                  <strong>
                    {job.quoteReference
                      || "No accepted quote"}
                  </strong>
                </div>

                <small className="crm-commercial-summary-line">
                  No accepted quote snapshot is linked
                </small>
              </div>

              <span className="crm-commercial-summary-state">
                Not linked
              </span>

              <span className="crm-commercial-summary-action-spacer" />
            </article>
          )}
        </div>
      </AdminPanel>
        </div>
        <div className="crm-job-summary-grid__column crm-job-summary-grid__column--delivery">
<AdminPanel
        title="Wedding delivery and content"
        icon={LayoutDashboard}
        className="crm-wedding-lifecycle-panel"
      >
        <div className="crm-wedding-lifecycle-grid">
          <article className="crm-wedding-lifecycle-card">
            <span className="crm-wedding-lifecycle-card__icon">
              <LayoutDashboard />
            </span>

            <div>
              <p>
                Wedding Workspace
              </p>

              <strong>
                {lifecycle.wedding.exists
                  ? "Ready"
                  : "Not linked"}
              </strong>
            </div>

            {lifecycle.wedding.exists ? (
              <Link
                className="admin-icon-control crm-wedding-lifecycle-action"
                to={`/admin/weddings/${lifecycle.wedding.slug}/workspace`}
                aria-label="Open Wedding Workspace"
                title="Open Wedding Workspace"
              >
                <ExternalLink aria-hidden="true" />
              </Link>
            ) : (
              <span className="crm-wedding-lifecycle-action-spacer" />
            )}
          </article>

          <article className="crm-wedding-lifecycle-card">
            <span className="crm-wedding-lifecycle-card__icon">
              <Images />
            </span>

            <div>
              <p>
                Wedding assets
              </p>

              <strong>
                {lifecycle.wedding.assetCount}
                {" "}
                photographs
              </strong>
            </div>

            {lifecycle.wedding.exists ? (
              <Link
                className="admin-icon-control crm-wedding-lifecycle-action"
                to={`/admin/weddings/${lifecycle.wedding.slug}/workspace#preview-upload`}
                aria-label="Manage Wedding assets"
                title="Manage Wedding assets"
              >
                <ExternalLink aria-hidden="true" />
              </Link>
            ) : (
              <span className="crm-wedding-lifecycle-action-spacer" />
            )}
          </article>

          <article className="crm-wedding-lifecycle-card">
            <span className="crm-wedding-lifecycle-card__icon">
              <Images />
            </span>

            <div>
              <p>
                Client Gallery
              </p>

              <strong>
                {primaryGallery
                  ? primaryGallery.title
                  : "Not created"}
              </strong>
            </div>

            {primaryGallery ? (
              <Link
                className="admin-icon-control crm-wedding-lifecycle-action"
                to={`/admin/client-galleries/${primaryGallery.id}`}
                aria-label="Open Client Gallery"
                title="Open Client Gallery"
              >
                <ExternalLink aria-hidden="true" />
              </Link>
            ) : (
              <AdminIconButton
                icon={Plus}
                label="Create Client Gallery"
                title="Create Client Gallery"
                className="crm-wedding-lifecycle-action"
                variant="secondary"
                disabled={
                  saving
                  || !canManage
                  || !lifecycle.wedding.exists
                }
                onClick={() =>
                  void createClientGalleryFromJob()
                }
              />
            )}
          </article>

          <article className="crm-wedding-lifecycle-card">
            <span className="crm-wedding-lifecycle-card__icon">
              <BookOpen />
            </span>

            <div>
              <p>
                Wedding Story
              </p>

              <strong>
                {storyLabel}
              </strong>
            </div>

            {lifecycle.wedding.exists ? (
              <Link
                className="admin-icon-control crm-wedding-lifecycle-action"
                to={`/admin/weddings/${lifecycle.wedding.slug}/content`}
                aria-label={
                  lifecycle.story.state === "not_started"
                    ? "Start Wedding Story"
                    : "Edit Wedding Story"
                }
                title={
                  lifecycle.story.state === "not_started"
                    ? "Start Wedding Story"
                    : "Edit Wedding Story"
                }
              >
                {lifecycle.story.state === "not_started" ? (
                  <Plus aria-hidden="true" />
                ) : (
                  <ExternalLink aria-hidden="true" />
                )}
              </Link>
            ) : (
              <span className="crm-wedding-lifecycle-action-spacer" />
            )}
          </article>

          <article className="crm-wedding-lifecycle-card">
            <span className="crm-wedding-lifecycle-card__icon">
              <Globe2 />
            </span>

            <div>
              <p>
                Website galleries
              </p>

              <strong>
                {lifecycle.publicAssignments.total}
                {" "}
                assignments
              </strong>
            </div>

            {lifecycle.wedding.exists ? (
              <Link
                className="admin-icon-control crm-wedding-lifecycle-action"
                to={`/admin/weddings/${lifecycle.wedding.slug}/workspace#publishing-destinations`}
                aria-label="Manage Website galleries"
                title="Manage Website galleries"
              >
                <ExternalLink aria-hidden="true" />
              </Link>
            ) : (
              <span className="crm-wedding-lifecycle-action-spacer" />
            )}
          </article>
        </div>
      </AdminPanel>
        </div>
      </div>

      <div className="crm-job-operations-grid">
        <div className="crm-job-operations-column">
          {job.quoteId ? <AdminAccordion title="Quote and package" description="Accepted commercial details are locked to this booking." icon={PackageCheck} defaultOpen summary={<AdminStatus tone="success">{money(job.valueAmount, job.currency)}</AdminStatus>}>
            <div className="crm-quote-job-summary"><dl className="admin-compact-details"><div><dt>Quote</dt><dd>{job.quoteReference || "—"} · v{job.quoteVersionNumber || 1}</dd></div><div><dt>Accepted</dt><dd>{dateLabel(job.acceptedQuoteAt || job.bookingDate)}</dd></div><div><dt>Package</dt><dd>{packageSnapshot.name || job.packageName || "—"}</dd></div><div><dt>Coverage</dt><dd>{packageSnapshot.coverageMinutes ? `${Math.round(packageSnapshot.coverageMinutes / 60)} hours` : "—"}</dd></div><div><dt>Subtotal</dt><dd>{money(job.bookingSubtotal, job.currency)}</dd></div><div><dt>Discount</dt><dd>{money(job.bookingDiscount, job.currency)}</dd></div><div><dt>Tax</dt><dd>{money(job.bookingTax, job.currency)}</dd></div><div><dt>Total booking value</dt><dd><strong>{money(job.valueAmount, job.currency)}</strong></dd></div></dl><div className="crm-quote-job-details"><section><h4>Included</h4>{Array.isArray(packageSnapshot.includedItems) && packageSnapshot.includedItems.length ? <ul>{packageSnapshot.includedItems.map((item: string) => <li key={item}>{item}</li>)}</ul> : <p>No included-item list stored.</p>}</section><section><h4>Selected add-ons</h4>{selectedAddons.length ? <ul>{selectedAddons.map((addon: any) => <li key={addon.id || addon.addonId || addon.name}><span>{addon.name}</span><strong>{addon.quantity || 1} × {money(addon.unitPriceAmount || 0, addon.currency || job.currency)}</strong></li>)}</ul> : <p>No optional add-ons selected.</p>}</section></div><Link className="admin-button admin-button--secondary admin-button--sm crm-inline-action" to={`/admin/crm/quotes/${job.quoteId}`}><ExternalLink className="admin-button__icon" />Open accepted quote</Link></div>
          </AdminAccordion> : null}


          <AdminAccordion title="Communication" description="Send email or record calls, meetings, messages and internal notes." icon={MessageCircle} summary={<AdminStatus tone="neutral">{workspace.communications.length} records</AdminStatus>}>
            {canManage ? <div className="crm-communication-compose"><div className="grid gap-3 md:grid-cols-3"><AdminField label="Channel"><select className="admin-select" value={communicationDraft.channel} onChange={(event) => setCommunicationDraft((current) => ({ ...current, channel: event.target.value, direction: event.target.value === "note" ? "internal" : current.direction }))}><option value="note">Internal note</option><option value="email">Email</option><option value="phone">Phone call</option><option value="sms">Message / SMS</option><option value="meeting">Meeting</option></select></AdminField><AdminField label="Direction"><select className="admin-select" value={communicationDraft.direction} onChange={(event) => setCommunicationDraft((current) => ({ ...current, direction: event.target.value }))}><option value="internal">Internal</option><option value="outbound">Outbound</option><option value="inbound">Inbound</option></select></AdminField><AdminField label="Client"><select className="admin-select" value={communicationDraft.contactId} onChange={(event) => setCommunicationDraft((current) => ({ ...current, contactId: event.target.value }))}><option value="">No specific contact</option>{workspace.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.displayName}</option>)}</select></AdminField></div><AdminField label="Subject"><input className="admin-input" value={communicationDraft.subject} onChange={(event) => setCommunicationDraft((current) => ({ ...current, subject: event.target.value }))} placeholder="Optional for calls and notes" /></AdminField><AdminField label="Message / notes"><textarea className="admin-textarea min-h-28" value={communicationDraft.body} onChange={(event) => setCommunicationDraft((current) => ({ ...current, body: event.target.value }))} /></AdminField><div className="flex flex-wrap gap-2"><AdminButton icon={MessageSquareText} disabled={saving || (!communicationDraft.body.trim() && !communicationDraft.subject.trim())} onClick={() => void saveCommunication(false)}>Log communication</AdminButton><AdminButton variant="primary" icon={Mail} disabled={saving || !communicationDraft.contactId || !communicationDraft.subject.trim() || !communicationDraft.body.trim()} onClick={() => void saveCommunication(true)}>Send email</AdminButton></div></div> : null}
            {!workspace.communications.length ? <AdminEmptyState icon={MessageCircle} title="No communication recorded" description="Emails and logged contact history will appear here." /> : <div className="crm-communication-list">{workspace.communications.map((item) => <article key={item.id}><div className="crm-communication-list__icon">{item.channel === "email" ? <Mail /> : item.channel === "phone" ? <Phone /> : item.channel === "meeting" ? <Users /> : <MessageSquareText />}</div><div><div className="flex flex-wrap items-center gap-2"><strong>{item.subject || item.channel.replace(/_/g, " ")}</strong><AdminStatus tone={item.status === "failed" ? "danger" : item.status === "sent" ? "success" : "neutral"}>{item.status}</AdminStatus><AdminStatus tone="info">{item.direction}</AdminStatus></div><p>{item.body}</p><small>{item.contactName || item.contactEmail || "Internal"} · {dateLabel(item.occurredAt)}{item.actorEmail ? ` · ${item.actorEmail}` : ""}</small></div></article>)}</div>}
          </AdminAccordion>
        </div>

        <div className="crm-job-operations-column">


          <div
            id="job-questionnaires"
            className="scroll-mt-5"
          >
            <AdminAccordion
              title="Questionnaires"
              description="Assign, review and update the same living planning forms your clients use."
              icon={ClipboardList}
              summary={
                <AdminStatus tone="neutral">
                  {workspace.questionnaires.length}
                </AdminStatus>
              }
            >
              {canManage ? (
                <div className="crm-questionnaire-assign">
                  <AdminField label="Template">
                    <select
                      className="admin-select"
                      value={templateId}
                      disabled={!canManage}
                      onChange={(event) =>
                        setTemplateId(
                          event.target.value,
                        )
                      }
                    >
                      {workspace.templates.map(
                        (template) => (
                          <option
                            key={template.id}
                            value={template.id}
                          >
                            {template.name}
                          </option>
                        ),
                      )}
                    </select>
                  </AdminField>

                  <AdminField label="Client">
                    <select
                      className="admin-select"
                      value={contactId}
                      disabled={!canManage}
                      onChange={(event) =>
                        setContactId(
                          event.target.value,
                        )
                      }
                    >
                      {workspace.contacts.map(
                        (contact) => (
                          <option
                            key={contact.id}
                            value={contact.id}
                          >
                            {contact.displayName}
                            {" "}
                            ({contact.role})
                          </option>
                        ),
                      )}
                    </select>
                  </AdminField>

                  <AdminField
                    label="Planning target"
                    help="Advisory only. The questionnaire remains editable after this date."
                  >
                    <input
                      className="admin-input"
                      type="date"
                      value={dueAt}
                      disabled={!canManage}
                      onChange={(event) =>
                        setDueAt(
                          event.target.value,
                        )
                      }
                    />
                  </AdminField>

                  <AdminButton
                    variant="primary"
                    icon={Plus}
                    disabled={
                      saving
                      || !canManage
                      || !templateId
                      || !contactId
                    }
                    onClick={() =>
                      void assign()
                    }
                  >
                    Assign questionnaire
                  </AdminButton>
                </div>
              ) : null}

              {!workspace.questionnaires.length ? (
                <AdminEmptyState
                  icon={FileText}
                  title="No questionnaires assigned"
                  description="Assign a template above when client information is needed."
                />
              ) : (
                <div className="crm-questionnaire-instance-list">
                  {workspace.questionnaires.map(
                    (item) => {
                      const editing =
                        questionnaireEditorId
                        === item.id;

                      const lastEditor =
                        item.lastSavedByLabel
                        || (
                          item.lastSavedByType
                          === "client"
                            ? item.assignedContactName
                              || "Client"
                            : item.lastSavedByType
                              === "professional"
                              ? "WedCRM user"
                              : ""
                        );

                      return (
                        <article
                          key={item.id}
                          className={`questionnaire-instance-card${
                            editing
                              ? " is-editing"
                              : ""
                          }`}
                        >
                          <header className="crm-questionnaire-instance__header">
                            <div>
                              <h3>
                                {item.title}
                              </h3>

                              <p>
                                {item.assignedContactName
                                  || "Client not assigned"}

                                {item.dueAt
                                  ? ` · planning target ${dateLabel(item.dueAt)}`
                                  : ""}
                              </p>

                              {item.lastSavedAt ? (
                                <small>
                                  Last updated{" "}
                                  {new Date(
                                    item.lastSavedAt,
                                  ).toLocaleString(
                                    "en-GB",
                                  )}
                                  {lastEditor
                                    ? ` by ${lastEditor}`
                                    : ""}
                                  {item.lastSavedByType
                                    ? ` · ${item.lastSavedByType === "professional" ? "WedCRM" : "client"}`
                                    : ""}
                                </small>
                              ) : (
                                <small>
                                  No answers saved yet.
                                </small>
                              )}
                            </div>

                            <div className="crm-questionnaire-instance__actions">
                              <AdminStatus
                                tone={
                                  statusTone(
                                    item.status,
                                  )
                                }
                              >
                                {item.status.replace(
                                  /_/g,
                                  " ",
                                )}
                              </AdminStatus>

                              {canEditQuestionnaires ? (
                                editing ? (
                                  <AdminButton
                                    variant="ghost"
                                    size="sm"
                                    disabled={saving}
                                    onClick={() =>
                                      cancelQuestionnaireEdit()
                                    }
                                  >
                                    Close editor
                                  </AdminButton>
                                ) : (
                                  <AdminButton
                                    variant="secondary"
                                    size="sm"
                                    disabled={saving}
                                    onClick={() =>
                                      beginQuestionnaireEdit(
                                        item,
                                      )
                                    }
                                  >
                                    Edit answers
                                  </AdminButton>
                                )
                              ) : null}
                            </div>
                          </header>

                          {item.introduction ? (
                            <p className="crm-questionnaire-instance__intro">
                              {item.introduction}
                            </p>
                          ) : null}

                          {editing ? (
                            <div className="crm-questionnaire-editor">
                              <div className="crm-questionnaire-editor__notice">
                                You are editing the same questionnaire answers visible to the client. Saving here updates their Client Portal; it does not create a separate professional copy.
                              </div>

                              <div className="crm-questionnaire-editor__fields">
                                {item.fields.map(
                                  (field) => (
                                    <ProfessionalQuestionnaireField
                                      key={
                                        field.id
                                      }
                                      field={
                                        field
                                      }
                                      value={
                                        questionnaireDraft[
                                          field.id
                                        ]
                                      }
                                      suppliers={
                                        workspace.supplierDirectory
                                      }
                                      supplierCategories={
                                        workspace.supplierCategories
                                      }
                                      fileCount={
                                        item.files.filter(
                                          (file) =>
                                            file.fieldKey
                                            === field.id,
                                        ).length
                                      }
                                      disabled={
                                        saving
                                        || !canEditQuestionnaires
                                      }
                                      onChange={(
                                        value,
                                      ) =>
                                        updateQuestionnaireAnswer(
                                          field.id,
                                          value,
                                        )
                                      }
                                    />
                                  ),
                                )}
                              </div>

                              <footer className="crm-questionnaire-editor__footer">
                                <div>
                                  {item.status === "completed" ? (
                                    <>
                                      <AdminStatus tone="success">
                                        Complete
                                      </AdminStatus>
                                      <span>
                                        This milestone stays complete when later details are updated.
                                      </span>
                                    </>
                                  ) : (
                                    <span>
                                      Save work at any time, or mark the planning questionnaire complete when the required details are ready.
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <AdminButton
                                    variant="secondary"
                                    disabled={
                                      saving
                                      || !canEditQuestionnaires
                                    }
                                    onClick={() =>
                                      void saveQuestionnaireAnswers(
                                        item,
                                        false,
                                      )
                                    }
                                  >
                                    {saving
                                      ? "Saving…"
                                      : "Save changes"}
                                  </AdminButton>

                                  {item.status !== "completed" ? (
                                    <AdminButton
                                      variant="primary"
                                      icon={CheckCircle2}
                                      disabled={
                                        saving
                                        || !canEditQuestionnaires
                                      }
                                      onClick={() =>
                                        void saveQuestionnaireAnswers(
                                          item,
                                          true,
                                        )
                                      }
                                    >
                                      Mark as complete
                                    </AdminButton>
                                  ) : null}
                                </div>
                              </footer>
                            </div>
                          ) : (
                            <div className="crm-questionnaire-instance__responses">
                              {item.fields
                                .filter(
                                  (field) =>
                                    ![
                                      "heading",
                                      "description",
                                      "file",
                                    ].includes(
                                      field.type,
                                    ),
                                )
                                .map(
                                  (field) => (
                                    <div
                                      key={
                                        field.id
                                      }
                                      className="questionnaire-response-row"
                                    >
                                      <span>
                                        {field.label}
                                      </span>

                                      <strong>
                                        {answerLabel(
                                          item.responses[
                                            field.id
                                          ],
                                          field,
                                        )}
                                      </strong>
                                    </div>
                                  ),
                                )}
                            </div>
                          )}
                        </article>
                      );
                    },
                  )}
                </div>
              )}
            </AdminAccordion>
          </div>

          <AdminAccordion
            title="Supplier team"
            description="Approved Wedding suppliers and client suggestions."
            icon={Store}
            summary={
              pendingSubmissions.length ? (
                <AdminStatus tone="warning">
                  {pendingSubmissions.length}
                  {" "}
                  review
                </AdminStatus>
              ) : (
                <AdminStatus tone="neutral">
                  {workspace.linkedSuppliers.length}
                  {" "}
                  linked
                </AdminStatus>
              )
            }
          >
            {pendingSubmissions.length ? (
              <div className="crm-supplier-review">
                <div className="crm-supplier-review__heading">
                  <div>
                    <strong>
                      Needs review
                    </strong>
                    <span>
                      Approve each client-supplied business into Supplier Master or merge it with an existing record.
                    </span>
                  </div>

                  <AdminStatus tone="warning">
                    {pendingSubmissions.length}
                    {" "}
                    pending
                  </AdminStatus>
                </div>

                {pendingSubmissions.map(
                  (submission) => {
                    const review =
                      supplierReview[
                        submission.id
                      ] || {
                        action:
                          "create" as const,
                        supplierId:
                          "",
                        category:
                          submission.role
                          || "Other",
                        notes:
                          "",
                      };

                    const categoryOptions =
                      Array.from(
                        new Set(
                          [
                            ...workspace
                              .supplierCategories,
                            submission.role,
                            "Other",
                          ]
                            .map(
                              (item) =>
                                String(
                                  item
                                  || "",
                                ).trim(),
                            )
                            .filter(
                              Boolean,
                            ),
                        ),
                      );

                    const contactDetails =
                      [
                        submission.website,
                        submission.instagram
                          ? `@${submission.instagram.replace(/^@/, "")}`
                          : "",
                        submission.email,
                        submission.phone,
                        submission.location,
                        submission.county,
                      ]
                        .filter(Boolean)
                        .join(" · ");

                    const merging =
                      review.action
                      === "merge";

                    const mergeDirectory =
                      [
                        ...workspace
                          .supplierDirectory,
                      ].sort(
                        (left, right) => {
                          const leftMatch =
                            left.category
                            === review.category
                              ? 0
                              : 1;

                          const rightMatch =
                            right.category
                            === review.category
                              ? 0
                              : 1;

                          return (
                            leftMatch
                            - rightMatch
                            || left.name
                              .localeCompare(
                                right.name,
                              )
                          );
                        },
                      );

                    return (
                      <article
                        key={submission.id}
                        className="crm-supplier-review__item"
                      >
                        <header className="crm-supplier-review__summary">
                          <div>
                            <strong>
                              {submission.name
                                || "Unnamed supplier"}
                            </strong>

                            <div className="crm-supplier-review__meta">
                              <AdminStatus tone="warning">
                                pending
                              </AdminStatus>

                              <AdminStatus tone="neutral">
                                {review.category
                                  || "Other"}
                              </AdminStatus>
                            </div>

                            <p>
                              {contactDetails
                                || "No contact details supplied"}
                            </p>
                          </div>
                        </header>

                        <div className="crm-supplier-review__fields">
                          <AdminField label="Category">
                            <select
                              className="admin-select"
                              value={
                                review.category
                              }
                              disabled={
                                !canManage
                              }
                              onChange={(
                                event,
                              ) =>
                                setSupplierReview(
                                  (current) => ({
                                    ...current,
                                    [submission.id]:
                                      {
                                        ...review,
                                        category:
                                          event
                                            .target
                                            .value,
                                      },
                                  }),
                                )
                              }
                            >
                              {categoryOptions.map(
                                (category) => (
                                  <option
                                    key={
                                      category
                                    }
                                    value={
                                      category
                                    }
                                  >
                                    {category}
                                  </option>
                                ),
                              )}
                            </select>
                          </AdminField>

                          <AdminField label="Action">
                            <select
                              className="admin-select"
                              value={
                                review.action
                              }
                              disabled={
                                !canManage
                              }
                              onChange={(
                                event,
                              ) => {
                                const action =
                                  event.target
                                    .value
                                  === "merge"
                                    ? "merge"
                                    : "create";

                                setSupplierReview(
                                  (current) => ({
                                    ...current,
                                    [submission.id]:
                                      {
                                        ...review,
                                        action,
                                        supplierId:
                                          action
                                          === "merge"
                                            ? review
                                                .supplierId
                                            : "",
                                      },
                                  }),
                                );
                              }}
                            >
                              <option value="create">
                                Create Supplier Master record
                              </option>

                              <option value="merge">
                                Merge with existing Supplier Master
                              </option>
                            </select>
                          </AdminField>

                          {merging ? (
                            <AdminField label="Existing supplier">
                              <select
                                className="admin-select"
                                value={
                                  review.supplierId
                                }
                                disabled={
                                  !canManage
                                }
                                onChange={(
                                  event,
                                ) => {
                                  const supplierId =
                                    event.target
                                      .value;

                                  const supplier =
                                    workspace
                                      .supplierDirectory
                                      .find(
                                        (item) =>
                                          item.id
                                          === supplierId,
                                      );

                                  setSupplierReview(
                                    (current) => ({
                                      ...current,
                                      [submission.id]:
                                        {
                                          ...review,
                                          action:
                                            "merge",
                                          supplierId,
                                          category:
                                            supplier
                                              ?.category
                                            || review
                                              .category,
                                        },
                                    }),
                                  );
                                }}
                              >
                                <option value="">
                                  Choose Supplier Master record…
                                </option>

                                {mergeDirectory.map(
                                  (supplier) => (
                                    <option
                                      key={
                                        supplier.id
                                      }
                                      value={
                                        supplier.id
                                      }
                                    >
                                      {supplier.name}
                                      {supplier.category
                                        ? ` · ${supplier.category}`
                                        : ""}
                                    </option>
                                  ),
                                )}
                              </select>
                            </AdminField>
                          ) : (
                            <div className="crm-supplier-review__create-note">
                              <strong>
                                New Supplier Master record
                              </strong>
                              <span>
                                The submitted business details will be copied into Supplier Master under the selected category.
                              </span>
                            </div>
                          )}

                          <AdminField label="Review note">
                            <input
                              className="admin-input"
                              value={
                                review.notes
                              }
                              disabled={
                                !canManage
                              }
                              placeholder="Optional internal note"
                              onChange={(
                                event,
                              ) =>
                                setSupplierReview(
                                  (current) => ({
                                    ...current,
                                    [submission.id]:
                                      {
                                        ...review,
                                        notes:
                                          event
                                            .target
                                            .value,
                                      },
                                  }),
                                )
                              }
                            />
                          </AdminField>
                        </div>

                        <div className="crm-supplier-review__actions">
                          <AdminButton
                            variant="primary"
                            size="sm"
                            icon={CheckCircle2}
                            disabled={
                              saving
                              || !canManage
                              || (
                                merging
                                && !review.supplierId
                              )
                            }
                            onClick={() =>
                              void approveSupplier(
                                submission,
                              )
                            }
                          >
                            {merging
                              ? "Merge & approve"
                              : "Create & approve"}
                          </AdminButton>

                          <AdminButton
                            variant="danger"
                            size="sm"
                            icon={X}
                            disabled={
                              saving
                              || !canManage
                            }
                            onClick={() =>
                              void rejectSupplier(
                                submission,
                              )
                            }
                          >
                            Reject
                          </AdminButton>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            ) : null}

            {!workspace.linkedSuppliers.length ? (
              <AdminEmptyState
                icon={Store}
                title="No suppliers linked"
                description="Approved supplier selections will appear here."
              />
            ) : (
              <div className="crm-linked-suppliers">
                {workspace.linkedSuppliers.map(
                  (supplier) => (
                    <article
                      key={`${supplier.id}_${supplier.role}`}
                    >
                      <div>
                        <strong>
                          {supplier.name}
                        </strong>
                        <p>
                          {supplier.role}
                          {supplier.location
                            ? ` · ${supplier.location}`
                            : ""}
                        </p>
                      </div>

                      <AdminStatus tone="success">
                        linked
                      </AdminStatus>
                    </article>
                  ),
                )}
              </div>
            )}
          </AdminAccordion>

          <AdminAccordion
            title="Files"
            description="Private planning files shared between this business and the client, plus questionnaire attachments."
            icon={FolderOpen}
            summary={
              <AdminStatus tone="neutral">
                {allFileCount}
              </AdminStatus>
            }
          >
            {canManage ? (
              <div className="crm-job-files-upload">
                <div>
                  <strong>Add planning file</strong>
                  <p>
                    Inspiration images, schedules, venue documents,
                    planning PDFs and other client references.
                    Maximum 10 MB.
                  </p>
                </div>

                <label className="admin-button admin-button--primary admin-button--sm">
                  <Plus className="admin-button__icon" />
                  {saving ? "Working…" : "Upload file"}
                  <input
                    type="file"
                    disabled={saving}
                    onChange={(event) => {
                      const file =
                        event.target.files?.[0];

                      void uploadPlanningFile(
                        file,
                      );

                      event.currentTarget.value =
                        "";
                    }}
                  />
                </label>
              </div>
            ) : null}

            {jobFiles.length ? (
              <section className="crm-job-files-section">
                <header>
                  <div>
                    <strong>Planning files</strong>
                    <span>
                      Shared through the secure Client Portal
                    </span>
                  </div>

                  <AdminStatus tone="info">
                    {jobFiles.length}
                  </AdminStatus>
                </header>

                <div className="crm-job-files">
                  {jobFiles.map((file) => (
                    <article
                      key={file.id}
                      className="crm-job-file-record"
                    >
                      <a
                        href={
                          AdminApiService.jobFileUrl(
                              job.id,
                              file.id,
                            )
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText />

                        <span>
                          <strong>
                            {file.filename}
                          </strong>

                          <small>
                            {file.source === "client"
                              ? "Client upload"
                              : "Business upload"}
                            {" · "}
                            {Math.max(
                              1,
                              Math.round(
                                file.fileSize / 1024,
                              ),
                            )}
                            {" KB"}
                          </small>
                        </span>

                        <ExternalLink />
                      </a>

                      {canManage ? (
                        <button
                          type="button"
                          className="crm-job-file-record__remove"
                          aria-label={`Remove ${file.filename}`}
                          title={`Remove ${file.filename}`}
                          disabled={saving}
                          onClick={() =>
                            void removePlanningFile(
                              file.id,
                              file.filename,
                            )
                          }
                        >
                          <Trash2 />
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {questionnaireFiles.length ? (
              <section className="crm-job-files-section">
                <header>
                  <div>
                    <strong>Questionnaire attachments</strong>
                    <span>
                      Files submitted through questionnaire fields
                    </span>
                  </div>

                  <AdminStatus tone="neutral">
                    {questionnaireFiles.length}
                  </AdminStatus>
                </header>

                <div className="crm-job-files">
                  {questionnaireFiles.map((file) => (
                    <a
                      key={file.id}
                      href={
                        AdminApiService
                          .questionnaireFileUrl(
                            file.questionnaireId,
                            file.id,
                          )
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText />

                      <span>
                        <strong>
                          {file.filename}
                        </strong>

                        <small>
                          {file.questionnaireTitle}
                          {" · "}
                          {Math.max(
                            1,
                            Math.round(
                              file.fileSize / 1024,
                            ),
                          )}
                          {" KB"}
                        </small>
                      </span>

                      <ExternalLink />
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            {!jobFiles.length
            && !questionnaireFiles.length ? (
              <AdminEmptyState
                icon={FolderOpen}
                title="No files uploaded"
                description="Planning files and questionnaire attachments will appear here."
              />
            ) : null}
          </AdminAccordion>

          <AdminAccordion title="Notes and activity" description="Original enquiry notes and the latest operational changes." icon={MessageSquareText} summary={<AdminStatus tone="neutral">{workspace.activities.length} events</AdminStatus>}>
            {workspace.enquiry?.notes ? <div className="crm-job-note"><strong>{workspace.enquiry.reference}</strong><p>{workspace.enquiry.notes}</p><small>{workspace.enquiry.source}{workspace.enquiry.campaign ? ` · ${workspace.enquiry.campaign}` : ""} · {dateLabel(workspace.enquiry.createdAt)}</small></div> : <p className="text-[10px] text-neutral-500">No enquiry notes recorded.</p>}
            <div className="crm-activity-list crm-activity-list--spaced">{workspace.activities.map((item) => <div key={item.id}><span></span><section><strong>{item.summary}</strong><p>{dateLabel(item.createdAt)}{item.actorEmail ? ` · ${item.actorEmail}` : ""}</p></section></div>)}</div>
          </AdminAccordion>
        </div>
      </div>
    </AdminPage>
  );
}
