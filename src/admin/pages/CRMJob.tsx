import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useOutletContext } from "react-router-dom";
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
  Eye,
  FileText,
  FolderOpen,
  Globe2,
  Images,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquareText,
  PackageCheck,
  Phone,
  Plus,
  Send,
  ShieldX,
  Store,
  Trash2,
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
import type { CrmDeletePreflight } from "../types/crm";
import {
  CRMClientsPanel,
  CRMWeddingWorkflowPanel,
  CRMWeddingDetailsPanel,
} from "../components/crm/CRMWeddingWorkspaceShared";


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


type ContractPreviewBlock = {
  heading: string;
  body: string;
};

function contractPreviewBlocks(
  value: unknown,
): ContractPreviewBlock[] {
  if (typeof value === "string") {
    return value.trim()
      ? [{
          heading: "",
          body: value,
        }]
      : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(
      (item) => {
        if (typeof item === "string") {
          return item.trim()
            ? [{
                heading: "",
                body: item,
              }]
            : [];
        }

        if (
          !item
          || typeof item !== "object"
        ) {
          return [];
        }

        const record =
          item as Record<
            string,
            unknown
          >;

        const heading = String(
          record.heading
          || record.title
          || record.name
          || "",
        ).trim();

        const rawBody =
          record.body
          ?? record.text
          ?? record.content
          ?? record.description
          ?? "";

        const body =
          Array.isArray(rawBody)
            ? rawBody
                .map(String)
                .join("\n")
            : (
                rawBody
                && typeof rawBody
                  === "object"
              )
              ? JSON.stringify(
                  rawBody,
                  null,
                  2,
                )
              : String(
                  rawBody || "",
                );

        return (
          heading
          || body.trim()
        )
          ? [{
              heading,
              body,
            }]
          : [];
      },
    );
  }

  if (
    value
    && typeof value === "object"
  ) {
    return Object.entries(
      value as Record<
        string,
        unknown
      >,
    ).flatMap(
      ([key, item]) => {
        if (
          item === null
          || item === undefined
          || item === ""
        ) {
          return [];
        }

        const body =
          Array.isArray(item)
            ? item
                .map(String)
                .join("\n")
            : typeof item === "object"
              ? JSON.stringify(
                  item,
                  null,
                  2,
                )
              : String(item);

        const heading =
          key
            .replace(
              /([a-z])([A-Z])/g,
              "$1 $2",
            )
            .replace(
              /[_-]+/g,
              " ",
            )
            .replace(
              /^./,
              (character) =>
                character
                  .toUpperCase(),
            );

        return [{
          heading,
          body,
        }];
      },
    );
  }

  return [];
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
  const navigate = useNavigate();
  const { auth } = useProfessionalAuth();
  const { enabledEntitlementKeys = null } =
    useOutletContext<{
      enabledEntitlementKeys?: ReadonlySet<string> | null;
    }>();

  const clientPortalEnabled =
    enabledEntitlementKeys?.has("client-portal") === true;
  const clientGalleriesEnabled =
    enabledEntitlementKeys?.has("client-galleries") === true;
  const contentToolsEnabled =
    enabledEntitlementKeys?.has("content-tools") === true;
  const contractsEnabled =
    enabledEntitlementKeys?.has("contracts") === true;
  const invoicesEnabled =
    enabledEntitlementKeys?.has("invoices") === true;
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
    contractPreviewOpen,
    setContractPreviewOpen,
  ] = useState(false);

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


  const [
    jobDeleteOpen,
    setJobDeleteOpen,
  ] = useState(false);

  const [
    jobDeleteBusy,
    setJobDeleteBusy,
  ] = useState(false);

  const [
    jobDeletePreflight,
    setJobDeletePreflight,
  ] = useState<
    CrmDeletePreflight | null
  >(null);

  const [
    jobDeleteConfirmation,
    setJobDeleteConfirmation,
  ] = useState("");

  const canManage = auth.permissions.includes("crm:manage");
  const canManageCommercial = canManage && auth.accessMode !== "support";
  const canEditQuestionnaires =
    clientPortalEnabled
    && canManage
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

  const activeAccessByContact = useMemo(
    () =>
      new Map(
        (
          clientPortalEnabled
            ? (workspace?.portalAccess || [])
            : []
        )
          .filter((item) => item.status === "active")
          .map((item) => [item.contactId, item]),
      ),
    [clientPortalEnabled, workspace?.portalAccess],
  );

  const questionnaireFiles = useMemo(
    () =>
      clientPortalEnabled
        ? (workspace?.questionnaires || [])
            .flatMap((item) =>
              item.files.map((file) => ({
                ...file,
                questionnaireId: item.id,
                questionnaireTitle: item.title,
              })),
            )
        : [],
    [clientPortalEnabled, workspace?.questionnaires],
  );

  const jobFiles =
    clientPortalEnabled
      ? (workspace?.files || [])
      : [];

  const allFileCount =
    questionnaireFiles.length
    + jobFiles.length;

  const pendingSubmissions = useMemo(
    () =>
      clientPortalEnabled
        ? (workspace?.supplierSubmissions || [])
            .filter((item) => item.status === "pending")
        : [],
    [clientPortalEnabled, workspace?.supplierSubmissions],
  );

  async function saveWeddingDetails(
    input: {
      jobName: string;
      eventDate: string;
      venue: string;
      leadSource: string;
    },
  ) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      setWorkspace(
        await AdminApiService
          .updateCrmJobWeddingDetails(
            id,
            {
              title: input.jobName,
              eventDate: input.eventDate,
              venueText: input.venue,
              leadSource: input.leadSource,
            },
          ),
      );

      setMessage(
        "Wedding details saved.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save Wedding details.",
      );

      throw saveError;
    } finally {
      setSaving(false);
    }
  }


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

  async function resolveReceipt(communicationId: string, form: FormData) {
    setSaving(true); setError(""); setMessage("");
    try {
      setWorkspace(await AdminApiService.resolveCrmReceiptReview(id, communicationId, {
        outcome: String(form.get("outcome") || ""), reason: String(form.get("reason") || ""),
      }));
      setMessage("Receipt review resolved and recorded. No email was sent.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to resolve receipt review.");
    } finally { setSaving(false); }
  }

  async function changeSupplierLink(supplierId: string, role: string, action: string, form: FormData) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      setWorkspace(await AdminApiService.changeCrmJobSupplierLink(id, {
        supplierId, role, action, reason: String(form.get("reason") || ""),
        replacementSupplierId: String(form.get("replacementSupplierId") || ""),
        replacementRole: String(form.get("replacementRole") || ""),
      }));
      setMessage(action === "unlink" ? "Supplier unlinked. Review history has been preserved." : "Supplier reassigned. Review history has been preserved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to change supplier link.");
    } finally {
      setSaving(false);
    }
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


  async function reapproveSupplier(submission: CrmSupplierSubmission, reason: string) {
    setSaving(true); setError(""); setMessage("");
    try {
      setWorkspace(await AdminApiService.reapproveCrmSupplierSubmission(id, submission.id, reason));
      setMessage("Supplier reapproved and linked to the Wedding. The withdrawn review has been kept.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to reapprove supplier.");
    } finally { setSaving(false); }
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



  async function openJobDeleteDialog() {
    if (!canManageCommercial) {
      return;
    }

    setJobDeleteBusy(true);
    setError("");
    setMessage("");
    setJobDeleteConfirmation("");
    setJobDeletePreflight(null);

    try {
      const preflight =
        await AdminApiService
          .getCrmJobDeletePreflight(
            id,
          );

      setJobDeletePreflight(
        preflight,
      );

      setJobDeleteOpen(
        true,
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to check Job deletion dependencies.",
      );
    } finally {
      setJobDeleteBusy(
        false,
      );
    }
  }


  function closeJobDeleteDialog() {
    if (jobDeleteBusy) {
      return;
    }

    setJobDeleteOpen(
      false,
    );

    setJobDeleteConfirmation(
      "",
    );
  }


  async function permanentlyDeleteJob() {
    if (
      !canManageCommercial
      || !jobDeletePreflight?.canDelete
      || jobDeleteConfirmation !== "DELETE"
    ) {
      return;
    }

    setJobDeleteBusy(true);
    setError("");
    setMessage("");

    try {
      await AdminApiService
        .deleteCrmJobPermanently(
          id,
          jobDeleteConfirmation,
        );

      navigate(
        "/admin/crm?view=jobs",
        {
          replace: true,
        },
      );
    } catch (deleteError) {
      /*
       * Dependencies can change after the dialog
       * opens. Re-fetch the server-authoritative
       * preflight if the destructive request fails.
       */
      try {
        const nextPreflight =
          await AdminApiService
            .getCrmJobDeletePreflight(
              id,
            );

        setJobDeletePreflight(
          nextPreflight,
        );
      } catch {
        /*
         * Keep the last known preflight visible if
         * the refresh itself cannot be loaded.
         */
      }

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to permanently delete this Job.",
      );
    } finally {
      setJobDeleteBusy(
        false,
      );
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
  const selectedBookingAddons = (
    Array.isArray(job.addonsSnapshot)
      ? job.addonsSnapshot
      : []
  ) as Array<Record<string, any>>;
  const portal = portalState(workspace);
  const lifecycle = workspace.lifecycle;
  const commercial = workspace.commercial;

  const commercialInvoice =
    invoicesEnabled
      ? commercial.invoice
      : null;

  const commercialContract =
    contractsEnabled
      ? commercial.contract
      : null;

  const contractPreview =
    commercialContract
      ? contractPreviewBlocks(
          commercialContract.content,
        )
      : [];

  const commercialQuote = commercial.quote;

  const bookingQuestionnaire =
    clientPortalEnabled
      ? (
          workspace.questionnaires.find(
            (item) => item.status !== "completed",
          )
          || workspace.questionnaires[0]
          || null
        )
      : null;

  const primaryGallery =
    clientGalleriesEnabled
      ? lifecycle.primaryClientGallery
      : null;

  const storyLabel =
    lifecycle.story.state === "not_started"
      ? "not started"
      : lifecycle.story.state;

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
                to={`/admin/crm/quotes/${job.quoteId}?jobId=${encodeURIComponent(job.id)}`}
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
<CRMWeddingWorkflowPanel
        leadCreatedAt={
          workspace.enquiry?.createdAt
          || ""
        }
        jobAccepted
        jobAcceptedAt={
          job.bookingDate
          || job.createdAt
          || ""
        }
        eventDate={
          job.eventDate
          || ""
        }
        venue={
          job.venueText
          || lifecycle.wedding.venue
          || ""
        }
        previewsComplete={
          previewsComplete
        }
        previewsCompletedAt={
          previewsTask?.completedAt
          || ""
        }
        deliveryComplete={
          deliveryComplete
        }
        deliveryCompletedAt={
          deliveryTask?.completedAt
          || ""
        }
        canToggle={
          canManage
        }
        busy={
          saving
        }
        onTogglePreviews={() =>
          void togglePhotographyMilestone(
            "Previews sent",
          )
        }
        onToggleDelivery={() =>
          void togglePhotographyMilestone(
            "Client photos delivered",
          )
        }
        formatDate={
          dateLabel
        }
      />
        </div>

        <div className="crm-job-primary-grid__wedding">
          <CRMWeddingDetailsPanel
            jobName={
              job.title
              || ""
            }
            eventDate={
              job.eventDate
              || ""
            }
            venue={
              job.venueText
              || lifecycle.wedding.venue
              || ""
            }
            leadSource={
              job.leadSource
              || ""
            }
            formatDate={dateLabel}
            canEdit={canManage}
            busy={saving}
            onSave={
              saveWeddingDetails
            }
          />
        </div>

        <div className="crm-job-primary-grid__clients">
<div id="job-clients" className="scroll-mt-5 crm-job-top-clients"><CRMClientsPanel
            showPortalControls={clientPortalEnabled}
            contacts={
              workspace.contacts
            }
            getPortalState={(
              contact,
            ) => {
              const access =
                activeAccessByContact.get(
                  contact.id,
                );

              if (!contact.email) {
                return {
                  status:
                    "email-required",
                  label:
                    "Email required",
                };
              }

              if (access?.acceptedAt) {
                return {
                  status:
                    "active",
                  label:
                    "Active",
                };
              }

              if (access) {
                return {
                  status:
                    "invited",
                  label:
                    "Invited",
                };
              }

              return {
                status:
                  "not-invited",
                label:
                  "Not invited",
              };
            }}
            renderActions={(
              contact,
            ) => {
              const access =
                activeAccessByContact.get(
                  contact.id,
                );

              return (
                <>
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
                </>
              );
            }}
          /></div>
        </div>
      </div>

            <div className="crm-job-summary-grid">
        <div className="crm-job-summary-grid__column crm-job-summary-grid__column--commercial">
<AdminPanel
        title="Booking and payments"
        icon={BriefcaseBusiness}
        className="crm-commercial-panel crm-booking-summary-panel"
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
        <div className="crm-commercial-grid crm-job-commercial-summary-list crm-booking-summary-list">
          {invoicesEnabled ? (
commercialInvoice ? (
            <div className="crm-commercial-summary-row crm-commercial-card--link crm-booking-summary-row">
              <div className="crm-commercial-summary-row__copy crm-booking-summary-row__copy">
                <div className="crm-booking-summary-row__heading">
                  <strong>
                    Invoice
                  </strong>

                  <span>
                    {commercialInvoice.reference}
                  </span>
                </div>

                <p className="crm-commercial-summary-line crm-booking-summary-row__detail">
                  {money(
                    commercialInvoice.totalAmount,
                    commercialInvoice.currency,
                  )}
                  {" total · "}
                  {money(
                    commercialInvoice.paidAmount,
                    commercialInvoice.currency,
                  )}
                  {" paid · "}
                  {money(
                    commercialInvoice.balanceAmount,
                    commercialInvoice.currency,
                  )}
                  {" balance"}
                  {commercialInvoice.nextPayment
                    ? commercialInvoice.nextPayment.dueDate
                      ? ` · Next ${money(
                          commercialInvoice.nextPayment.balanceAmount,
                          commercialInvoice.currency,
                        )} due ${dateLabel(
                          commercialInvoice.nextPayment.dueDate,
                        )}`
                      : ` · Next ${money(
                          commercialInvoice.nextPayment.balanceAmount,
                          commercialInvoice.currency,
                        )}`
                    : ""}
                </p>
              </div>

              <span
                className={
                  `crm-commercial-summary-state crm-booking-summary-row__state is-${commercialInvoice.status}`
                }
              >
                {commercialInvoice.status.replace(
                  /_/g,
                  " ",
                )}
              </span>

              <Link
                className="admin-icon-control crm-commercial-card__open crm-booking-summary-row__action"
                to={`/admin/crm/jobs/${job.id}/invoices/${commercialInvoice.id}`}
                aria-label={`Open invoice ${commercialInvoice.reference}`}
                title="Open invoice"
              >
                <ExternalLink aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="crm-commercial-summary-row crm-booking-summary-row">
              <div className="crm-commercial-summary-row__copy crm-booking-summary-row__copy">
                <div className="crm-booking-summary-row__heading">
                  <strong>
                    Invoice
                  </strong>

                  <span>
                    Not generated
                  </span>
                </div>

                <p className="crm-commercial-summary-line crm-booking-summary-row__detail">
                  No booking invoice currently exists
                </p>
              </div>

              <span className="crm-commercial-summary-state crm-booking-summary-row__state">
                Not generated
              </span>

              <span className="crm-booking-summary-row__action-spacer" />
            </div>
          )
          ) : null}

          {contractsEnabled ? (
          <div className="crm-commercial-summary-row crm-booking-summary-row">
            <div className="crm-commercial-summary-row__copy crm-booking-summary-row__copy">
              <div className="crm-booking-summary-row__heading">
                <strong>
                  Contract
                </strong>

                <span>
                  {commercialContract?.reference
                    || "Not generated"}
                </span>
              </div>

              <p className="crm-commercial-summary-line crm-booking-summary-row__detail">
                {commercialContract
                  ? `${commercialContract.title} · ${
                      commercialContract.signatureCount
                    }/${
                      commercialContract.requiredSignatures
                    } signatures · Version ${
                      commercialContract.versionNumber || "—"
                    }`
                  : "No booking contract currently exists"}
              </p>
            </div>

            <span
              className={
                `crm-commercial-summary-state crm-booking-summary-row__state ${
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

            <div className="crm-booking-summary-row__actions">
              {commercialContract ? (
                <AdminIconButton
                  icon={Eye}
                  label="View contract"
                  title="View contract"
                  variant="secondary"
                  onClick={() =>
                    setContractPreviewOpen(
                      true,
                    )
                  }
                />
              ) : (
                <span className="crm-booking-summary-row__action-spacer" />
              )}

              {commercialContract?.status === "draft"
              && clientPortalEnabled ? (
                portal.status === "not_invited" ? (
                  <span
                    className="crm-booking-summary-row__action-spacer is-disabled"
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
                  <span className="crm-booking-summary-row__action-spacer" />
                )
              ) : null}
            </div>
          </div>
          ) : null}

          {clientPortalEnabled ? (
          <div className="crm-commercial-summary-row crm-commercial-card--link crm-booking-summary-row">
            <div className="crm-commercial-summary-row__copy crm-booking-summary-row__copy">
              <div className="crm-booking-summary-row__heading">
                <strong>
                  Questionnaire
                </strong>

                <span>
                  {bookingQuestionnaire?.title
                    || "Not assigned"}
                </span>
              </div>

              <p className="crm-commercial-summary-line crm-booking-summary-row__detail">
                {bookingQuestionnaire
                  ? bookingQuestionnaire.dueAt
                    ? `Planning target ${dateLabel(
                        bookingQuestionnaire.dueAt,
                      )}`
                    : "Assigned with no planning target"
                  : "No booking questionnaire currently assigned"}
              </p>
            </div>

            <span
              className={
                `crm-commercial-summary-state crm-booking-summary-row__state ${
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
              className="admin-icon-control crm-commercial-card__open crm-booking-summary-row__action"
              href="#job-questionnaires"
              aria-label="Open Questionnaire management"
              title="Open questionnaire"
            >
              <ExternalLink aria-hidden="true" />
            </a>
          </div>
          ) : null}

          {commercialQuote ? (
            <div className="crm-commercial-summary-row crm-commercial-card--link crm-booking-summary-row">
              <div className="crm-commercial-summary-row__copy crm-booking-summary-row__copy">
                <div className="crm-booking-summary-row__heading">
                  <strong>
                    Accepted quote
                  </strong>

                  <span>
                    {commercialQuote.reference}
                  </span>
                </div>

                <p className="crm-commercial-summary-line crm-booking-summary-row__detail">
                  {commercialQuote.packageName
                    || job.packageName
                    || "Booked package"}
                  {" · "}
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

              <span className="crm-commercial-summary-state crm-booking-summary-row__state is-accepted">
                Accepted
              </span>

              <Link
                className="admin-icon-control crm-commercial-card__open crm-booking-summary-row__action"
                to={`/admin/crm/quotes/${commercialQuote.id}?jobId=${encodeURIComponent(job.id)}`}
                aria-label={`Open accepted quote ${commercialQuote.reference}`}
                title="Open accepted quote"
              >
                <ExternalLink aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="crm-commercial-summary-row crm-booking-summary-row">
              <div className="crm-commercial-summary-row__copy crm-booking-summary-row__copy">
                <div className="crm-booking-summary-row__heading">
                  <strong>
                    Accepted quote
                  </strong>

                  <span>
                    {job.quoteReference
                      || "Not linked"}
                  </span>
                </div>

                <p className="crm-commercial-summary-line crm-booking-summary-row__detail">
                  No accepted quote snapshot is linked
                </p>
              </div>

              <span className="crm-commercial-summary-state crm-booking-summary-row__state">
                Not linked
              </span>

              <span className="crm-booking-summary-row__action-spacer" />
            </div>
          )}
        </div>
      </AdminPanel>
        </div>
        <div className="crm-job-summary-grid__column crm-job-summary-grid__column--delivery">
<AdminPanel
        title="Wedding delivery and content"
        icon={LayoutDashboard}
        className="crm-wedding-lifecycle-panel crm-delivery-summary-panel"
        actions={contentToolsEnabled ? (
          lifecycle.wedding.exists ? (
            <AdminHeaderRouterLink
              className="admin-button admin-button--secondary admin-button--sm"
              to={`/admin/weddings/${lifecycle.wedding.slug}/content`}
              aria-label="Open in WedStudio"
              title="Open in WedStudio"
            >
              <Globe2 className="admin-button__icon" aria-hidden="true" />
              Open in WedStudio
            </AdminHeaderRouterLink>
          ) : undefined
        ) : undefined}
      >
        <div className="crm-delivery-summary-list">
          <div className="crm-delivery-summary-row">
            <strong>
              Wedding Workspace
            </strong>

            <span
              className={
                `crm-delivery-summary-state ${
                  lifecycle.wedding.exists
                    ? "is-ready"
                    : ""
                }`
              }
            >
              {lifecycle.wedding.exists
                ? "Ready"
                : "Not linked"}
            </span>

            {lifecycle.wedding.exists ? (
              <Link
                className="admin-icon-control crm-wedding-lifecycle-action crm-delivery-summary-action"
                to={`/admin/weddings/${lifecycle.wedding.slug}/workspace`}
                aria-label="Open Wedding Workspace"
                title="Open Wedding Workspace"
              >
                <ExternalLink aria-hidden="true" />
              </Link>
            ) : (
              <span className="crm-delivery-summary-action-spacer" />
            )}
          </div>

          <div className="crm-delivery-summary-row">
            <strong>
              Wedding assets
            </strong>

            <span className="crm-delivery-summary-state">
              {lifecycle.wedding.assetCount}
              {" "}
              {lifecycle.wedding.assetCount === 1
                ? "photograph"
                : "photographs"}
            </span>

            {lifecycle.wedding.exists ? (
              <Link
                className="admin-icon-control crm-wedding-lifecycle-action crm-delivery-summary-action"
                to={`/admin/weddings/${lifecycle.wedding.slug}/workspace#preview-upload`}
                aria-label="Manage Wedding assets"
                title="Manage Wedding assets"
              >
                <ExternalLink aria-hidden="true" />
              </Link>
            ) : (
              <span className="crm-delivery-summary-action-spacer" />
            )}
          </div>

          {clientGalleriesEnabled ? (
          <div className="crm-delivery-summary-row">
            <strong>
              Client Gallery
            </strong>

            <span
              className={
                `crm-delivery-summary-state ${
                  primaryGallery
                    ? "is-ready"
                    : ""
                }`
              }
            >
              {primaryGallery
                ? primaryGallery.title
                : "Not created"}
            </span>

            {primaryGallery ? (
              <Link
                className="admin-icon-control crm-wedding-lifecycle-action crm-delivery-summary-action"
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
                className="crm-wedding-lifecycle-action crm-delivery-summary-action"
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
          </div>
          ) : null}

          {contentToolsEnabled ? (
          <div className="crm-delivery-summary-row">
            <strong>
              Wedding Story
            </strong>

            <span
              className={
                `crm-delivery-summary-state ${
                  lifecycle.story.state !== "not_started"
                    ? "is-ready"
                    : ""
                }`
              }
            >
              {storyLabel}
            </span>

            {lifecycle.wedding.exists ? (
              <Link
                className="admin-icon-control crm-wedding-lifecycle-action crm-delivery-summary-action"
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
              <span className="crm-delivery-summary-action-spacer" />
            )}
          </div>
          ) : null}

          {contentToolsEnabled ? (
          <div className="crm-delivery-summary-row">
            <strong>
              Website galleries
            </strong>

            <span className="crm-delivery-summary-state">
              {lifecycle.publicAssignments.total}
              {" "}
              {lifecycle.publicAssignments.total === 1
                ? "assignment"
                : "assignments"}
            </span>

            {lifecycle.wedding.exists ? (
              <Link
                className="admin-icon-control crm-wedding-lifecycle-action crm-delivery-summary-action"
                to={`/admin/weddings/${lifecycle.wedding.slug}/workspace#publishing-destinations`}
                aria-label="Manage Website galleries"
                title="Manage Website galleries"
              >
                <ExternalLink aria-hidden="true" />
              </Link>
            ) : (
              <span className="crm-delivery-summary-action-spacer" />
            )}
          </div>
          ) : null}
        </div>
      </AdminPanel>
        </div>
      </div>

      <div className="crm-job-operations-grid">
        <div className="crm-job-operations-column">
          {job.quoteId ? (
            <AdminAccordion
              title="Quote and package"
              icon={PackageCheck}
              defaultOpen
              summary={
                <AdminStatus tone="success">
                  {money(
                    commercialQuote?.totalAmount
                      ?? job.valueAmount,
                    commercialQuote?.currency
                      || job.currency,
                  )}
                </AdminStatus>
              }
            >
              <article className="crm-job-quote-compact">
                <div className="crm-job-quote-compact__copy">
                  <strong>
                    {commercialQuote?.packageName
                      || packageSnapshot.name
                      || job.packageName
                      || "Booked package"}
                  </strong>

                  <p>
                    {commercialQuote?.reference
                      || job.quoteReference
                      || "Accepted quote"}
                  </p>

                  <small>
                    Accepted{" "}
                    {dateLabel(
                      commercialQuote?.acceptedAt
                      || job.acceptedQuoteAt
                      || job.bookingDate,
                    )}
                  </small>
                </div>

                <strong className="crm-job-quote-compact__value">
                  {money(
                    commercialQuote?.totalAmount
                      ?? job.valueAmount,
                    commercialQuote?.currency
                      || job.currency,
                  )}
                </strong>

                <Link
                  className="admin-icon-control crm-job-quote-compact__action"
                  to={`/admin/crm/quotes/${job.quoteId}?jobId=${encodeURIComponent(job.id)}`}
                  aria-label="Open accepted quote"
                  title="Open accepted quote"
                >
                  <Eye aria-hidden="true" />
                </Link>
              </article>

              {selectedBookingAddons.length ? (
                <div className="crm-job-selected-addons">
                  <span className="crm-job-selected-addons__label">
                    Selected add-ons
                  </span>

                  {selectedBookingAddons.map(
                    (addon, index) => (
                      <article
                        key={
                          String(
                            addon.id
                            || addon.addonId
                            || addon.name
                            || index
                          )
                        }
                        className="crm-job-selected-addon"
                      >
                        <div>
                          <strong>
                            {String(
                              addon.name
                              || "Booked add-on"
                            )}
                          </strong>

                          <small>
                            {Number(
                              addon.quantity
                              || 1
                            ) > 1
                              ? `Quantity ${Number(
                                  addon.quantity
                                  || 1
                                )}`
                              : "Included in accepted booking"}
                          </small>
                        </div>

                        <AdminStatus tone="success">
                          Selected
                        </AdminStatus>
                      </article>
                    ),
                  )}
                </div>
              ) : null}
            </AdminAccordion>
          ) : null}


          <AdminAccordion title="Communication" icon={MessageCircle} summary={<AdminStatus tone="neutral">{workspace.communications.length} records</AdminStatus>}>
            {canManage ? <div className="crm-communication-compose"><div className="grid gap-3 md:grid-cols-3"><AdminField label="Channel"><select className="admin-select" value={communicationDraft.channel} onChange={(event) => setCommunicationDraft((current) => ({ ...current, channel: event.target.value, direction: event.target.value === "note" ? "internal" : current.direction }))}><option value="note">Internal note</option><option value="email">Email</option><option value="phone">Phone call</option><option value="sms">Message / SMS</option><option value="meeting">Meeting</option></select></AdminField><AdminField label="Direction"><select className="admin-select" value={communicationDraft.direction} onChange={(event) => setCommunicationDraft((current) => ({ ...current, direction: event.target.value }))}><option value="internal">Internal</option><option value="outbound">Outbound</option><option value="inbound">Inbound</option></select></AdminField><AdminField label="Client"><select className="admin-select" value={communicationDraft.contactId} onChange={(event) => setCommunicationDraft((current) => ({ ...current, contactId: event.target.value }))}><option value="">No specific contact</option>{workspace.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.displayName}</option>)}</select></AdminField></div><AdminField label="Subject"><input className="admin-input" value={communicationDraft.subject} onChange={(event) => setCommunicationDraft((current) => ({ ...current, subject: event.target.value }))} placeholder="Optional for calls and notes" /></AdminField><AdminField label="Message / notes"><textarea className="admin-textarea min-h-28" value={communicationDraft.body} onChange={(event) => setCommunicationDraft((current) => ({ ...current, body: event.target.value }))} /></AdminField><div className="flex flex-wrap gap-2"><AdminButton icon={MessageSquareText} disabled={saving || (!communicationDraft.body.trim() && !communicationDraft.subject.trim())} onClick={() => void saveCommunication(false)}>Log communication</AdminButton><AdminButton variant="primary" icon={Mail} disabled={saving || !communicationDraft.contactId || !communicationDraft.subject.trim() || !communicationDraft.body.trim()} onClick={() => void saveCommunication(true)}>Send email</AdminButton></div></div> : null}
            {!workspace.communications.length ? <AdminEmptyState icon={MessageCircle} title="No communication recorded" description="Emails and logged contact history will appear here." /> : <div className="crm-communication-list">{workspace.communications.map((item) => <article key={item.id}><div className="crm-communication-list__icon">{item.channel === "email" ? <Mail /> : item.channel === "phone" ? <Phone /> : item.channel === "meeting" ? <Users /> : <MessageSquareText />}</div><div><div className="flex flex-wrap items-center gap-2"><strong>{item.subject || item.channel.replace(/_/g, " ")}</strong><AdminStatus tone={item.status === "failed" ? "danger" : item.status === "sent" ? "success" : "neutral"}>{item.status === "failed" && item.metadata?._receiptReviewRequired ? "Needs review" : item.status}</AdminStatus><AdminStatus tone="info">{item.direction}</AdminStatus></div><p>{item.body}</p>{item.metadata?._receiptResolution ? <p>Receipt review resolved. See Notes and activity for the recorded outcome and reason.</p> : null}{item.failureReason ? <p role="status">{item.failureReason}</p> : null}{item.status === "failed" && item.metadata?._receiptReviewRequired ? <div><p>Check delivery with your email provider before sending another copy.</p>{canManage ? <details><summary>Resolve receipt review</summary><form onSubmit={(event) => { event.preventDefault(); void resolveReceipt(item.id, new FormData(event.currentTarget)); }}>
                <label>Review outcome<select name="outcome" required disabled={saving}><option value="">Choose an outcome</option><option value="confirmed_delivered">Confirmed delivered</option><option value="do_not_resend">Do not resend</option></select></label>
                <label>Delivery evidence or reason<textarea name="reason" required maxLength={2000} disabled={saving} /></label>
                <p>This records your decision and closes automatic retries for this receipt. It does not send an email.</p>
                <AdminButton type="submit" disabled={saving}>Record resolution</AdminButton>
              </form></details> : null}</div> : null}<small>{item.contactName || item.contactEmail || "Internal"} · {dateLabel(item.occurredAt)}{item.actorEmail ? ` · ${item.actorEmail}` : ""}</small></div></article>)}</div>}
          </AdminAccordion>
        </div>

        <div className="crm-job-operations-column">


          {clientPortalEnabled ? (
          <div
            id="job-questionnaires"
            className="scroll-mt-5"
          >
            <AdminAccordion
              title="Questionnaires"
              icon={ClipboardList}
              summary={
                <AdminStatus tone="neutral">
                  {workspace.questionnaires.length}
                </AdminStatus>
              }
            >
              <div className="crm-job-questionnaire-readonly">
                <div className="crm-job-questionnaire-readonly__toolbar">
                  <Link
                    className="admin-button admin-button--secondary admin-button--sm"
                    to="/admin/crm?view=questionnaires"
                  >
                    <ExternalLink
                      className="admin-button__icon"
                      aria-hidden="true"
                    />
                    Open Questionnaires
                  </Link>
                </div>

                {!workspace.questionnaires.length ? (
                  <AdminEmptyState
                    icon={ClipboardList}
                    title="No questionnaires assigned"
                    description="Questionnaires assigned to this Job will appear here."
                  />
                ) : (
                  <div className="crm-job-questionnaire-readonly__list">
                    {workspace.questionnaires.map(
                      (item) => {
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
                            className="questionnaire-instance-card crm-job-questionnaire-readonly__card"
                          >
                            <header className="crm-job-questionnaire-readonly__header">
                              <div>
                                <strong>
                                  {item.title}
                                </strong>

                                <p>
                                  {item.assignedContactName
                                    || "Client not assigned"}
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
                                  </small>
                                ) : (
                                  <small>
                                    No answers saved yet.
                                  </small>
                                )}
                              </div>

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
                            </header>

                            {item.introduction ? (
                              <p className="crm-job-questionnaire-readonly__intro">
                                {item.introduction}
                              </p>
                            ) : null}

                            <div className="crm-job-questionnaire-readonly__responses">
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
                                      key={field.id}
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
                          </article>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </AdminAccordion>
          </div>
          ) : null}

          <AdminAccordion
            title="Supplier team"
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

            {clientPortalEnabled && workspace.supplierSubmissions.some((item) => item.status !== "pending") ? (
              <details className="crm-supplier-review">
                <summary>Supplier review history</summary>
                {workspace.supplierSubmissions.filter((item) => item.status !== "pending").map((submission) => (
                  <article key={submission.id} className="crm-supplier-review__item">
                    <strong>{submission.name || "Supplier"}</strong>
                    {submission.resolvedSupplierId ? <p>Resolved supplier: {workspace.supplierDirectory.find((item) => item.id === submission.resolvedSupplierId)?.name || "Supplier record unavailable"}</p> : null}
                    <div className="crm-supplier-review__meta">
                      <AdminStatus tone="neutral">{submission.status === "rejected" && submission.resolvedSupplierId ? "Withdrawn" : submission.status}</AdminStatus>
                      <span>{submission.role}</span>
                      {submission.responseIndex < 0 ? <span>Previous questionnaire answer</span> : null}
                    </div>
                    <p>{workspace.questionnaires.find((item) => item.id === submission.instanceId)?.title || "Questionnaire"}</p>
                    {submission.reviewNotes ? <p>{submission.reviewNotes}</p> : null}
                    {submission.reviewedAt ? <p>Reviewed {new Date(submission.reviewedAt.includes("T") ? submission.reviewedAt : submission.reviewedAt.replace(" ", "T") + "Z").toLocaleString()}</p> : null}
                    {canManage && submission.status === "rejected" && submission.resolvedSupplierId && !workspace.supplierSubmissions.some((item) =>
                      ["approved", "linked"].includes(item.status) && item.resolvedSupplierId === submission.resolvedSupplierId && item.role === submission.role) ? (
                      <details>
                        <summary>Reapprove supplier</summary>
                        <form onSubmit={(event) => {
                          event.preventDefault();
                          void reapproveSupplier(submission, String(new FormData(event.currentTarget).get("reason") || ""));
                        }}>
                          <p>Restore this supplier with the original role. The withdrawn review will remain in history.</p>
                          <label>Reason for reapproval<input name="reason" required maxLength={2000} disabled={saving} /></label>
                          <AdminButton type="submit" disabled={saving}>Reapprove and link supplier</AdminButton>
                        </form>
                      </details>
                    ) : null}
                  </article>
                ))}
              </details>
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
                      {canManage && workspace.supplierSubmissions.some((source) =>
                        source.resolvedSupplierId === supplier.id && source.role === supplier.role && ["approved", "linked"].includes(source.status)
                      ) ? (
                        <details>
                          <summary>Change link</summary>
                          <form onSubmit={(event) => {
                            event.preventDefault();
                            const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") || "";
                            void changeSupplierLink(supplier.id, supplier.role, action, new FormData(event.currentTarget));
                          }}>
                            <p>Unlink this supplier, or replace the supplier and role. Original reviews remain in history.</p>
                            <AdminField label="Reason for change">
                              <input name="reason" className="admin-input" required maxLength={2000} disabled={saving} />
                            </AdminField>
                            <AdminField label="Replacement supplier (for reassignment)">
                              <select name="replacementSupplierId" className="admin-input" disabled={saving} defaultValue="">
                                <option value="">Choose Supplier Master record…</option>
                                {workspace.supplierDirectory.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                              </select>
                            </AdminField>
                            <AdminField label="Replacement role">
                              <input name="replacementRole" className="admin-input" maxLength={120} defaultValue={supplier.role} disabled={saving} />
                            </AdminField>
                            <button type="submit" value="unlink" className="admin-button admin-button--danger" disabled={saving}>Unlink supplier</button>
                            <button type="submit" value="reassign" className="admin-button admin-button--secondary" disabled={saving}>Reassign supplier</button>
                          </form>
                        </details>
                      ) : null}
                    </article>
                  ),
                )}
              </div>
            )}
          </AdminAccordion>

          {clientPortalEnabled ? (
          <AdminAccordion
            title="Files"
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
          ) : null}

          <AdminAccordion title="Notes and activity" icon={MessageSquareText} summary={<AdminStatus tone="neutral">{workspace.activities.length} events</AdminStatus>}>
            {workspace.enquiry?.notes ? <div className="crm-job-note"><strong>{workspace.enquiry.reference}</strong><p>{workspace.enquiry.notes}</p><small>{workspace.enquiry.source}{workspace.enquiry.campaign ? ` · ${workspace.enquiry.campaign}` : ""} · {dateLabel(workspace.enquiry.createdAt)}</small></div> : <p className="text-[10px] text-neutral-500">No enquiry notes recorded.</p>}
            <div className="crm-activity-list crm-activity-list--spaced">{workspace.activities.map((item) => <div key={item.id}><span></span><section><strong>{item.summary}</strong><p>{dateLabel(item.createdAt)}{item.actorEmail ? ` · ${item.actorEmail}` : ""}</p></section></div>)}</div>
          </AdminAccordion>
        </div>
      </div>


      {canManageCommercial ? (
        <AdminAccordion
          title="Record actions"
          icon={Trash2}
        >
          <div className="crm-lead-close-actions crm-job-record-actions">
            <article className="crm-lead-close-option crm-lead-close-option--danger">
              <div>
                <strong>
                  Permanently delete CRM Job
                </strong>

                <p>
                  Use cancellation or archival for normal retained
                  business records. Permanent deletion removes this
                  CRM Job and its originating Lead only when the
                  protected dependency check allows it.
                </p>

                <small>
                  Wedding Workspace, Wedding Story, Client Galleries,
                  photographs and Website assignments are preserved.
                </small>
              </div>

              <AdminButton
                variant="danger"
                size="sm"
                icon={Trash2}
                disabled={
                  saving
                  || jobDeleteBusy
                }
                onClick={() =>
                  void openJobDeleteDialog()
                }
              >
                {jobDeleteBusy
                  ? "Checking…"
                  : "Delete permanently"}
              </AdminButton>
            </article>
          </div>
        </AdminAccordion>
      ) : null}


      {jobDeleteOpen
      && jobDeletePreflight ? (
        <div
          className="crm-delete-dialog"
          role="presentation"
        >
          <button
            type="button"
            className="crm-delete-dialog__backdrop"
            aria-label="Close permanent deletion dialog"
            disabled={jobDeleteBusy}
            onClick={
              closeJobDeleteDialog
            }
          />

          <section
            className="crm-delete-dialog__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-job-delete-title"
          >
            <header className="crm-delete-dialog__header">
              <div>
                <span>
                  Permanent CRM deletion
                </span>

                <h2 id="crm-job-delete-title">
                  Delete{" "}
                  {jobDeletePreflight.reference
                    || job.reference}
                  ?
                </h2>

                <p>
                  The server has checked the Job dependencies below.
                  This removes only the permitted CRM lifecycle.
                </p>
              </div>

              <button
                type="button"
                className="admin-icon-control"
                aria-label="Close permanent deletion dialog"
                title="Close"
                disabled={jobDeleteBusy}
                onClick={
                  closeJobDeleteDialog
                }
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <div className="crm-delete-preflight">
              <JobDeletePreflightGroup
                title="Will be deleted"
                tone="delete"
                items={
                  jobDeletePreflight
                    .willDelete
                }
              />

              <JobDeletePreflightGroup
                title="Will be preserved"
                tone="preserve"
                items={
                  jobDeletePreflight
                    .willPreserve
                }
              />

              <JobDeletePreflightGroup
                title="Cannot delete until resolved"
                tone="blocker"
                items={
                  jobDeletePreflight
                    .blockers
                }
              />
            </div>

            {jobDeletePreflight.canDelete ? (
              <div className="crm-delete-dialog__confirmation">
                <label htmlFor="crm-job-delete-confirmation">
                  Type{" "}
                  <strong>
                    DELETE
                  </strong>{" "}
                  to confirm
                </label>

                <input
                  id="crm-job-delete-confirmation"
                  className="admin-input"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="DELETE"
                  value={
                    jobDeleteConfirmation
                  }
                  disabled={
                    jobDeleteBusy
                  }
                  onChange={(event) =>
                    setJobDeleteConfirmation(
                      event.target.value,
                    )
                  }
                />
              </div>
            ) : (
              <div className="crm-delete-dialog__blocked">
                Permanent deletion is unavailable until every
                blocker above has been resolved.
              </div>
            )}

            <footer className="crm-delete-dialog__actions">
              <AdminButton
                variant="secondary"
                size="sm"
                disabled={
                  jobDeleteBusy
                }
                onClick={
                  closeJobDeleteDialog
                }
              >
                Cancel
              </AdminButton>

              <AdminButton
                variant="danger"
                size="sm"
                icon={Trash2}
                disabled={
                  jobDeleteBusy
                  || !jobDeletePreflight
                    .canDelete
                  || jobDeleteConfirmation
                    !== "DELETE"
                }
                onClick={() =>
                  void permanentlyDeleteJob()
                }
              >
                {jobDeleteBusy
                  ? "Deleting…"
                  : "Permanently delete Job"}
              </AdminButton>
            </footer>
          </section>
        </div>
      ) : null}

      {contractsEnabled
      && contractPreviewOpen
      && commercialContract ? (
        <div
          className="crm-job-contract-preview"
          role="presentation"
        >
          <button
            type="button"
            className="crm-job-contract-preview__backdrop"
            aria-label="Close contract preview"
            onClick={() =>
              setContractPreviewOpen(
                false,
              )
            }
          />

          <section
            className="crm-job-contract-preview__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-job-contract-preview-title"
          >
            <header className="crm-job-contract-preview__header">
              <div>
                <strong id="crm-job-contract-preview-title">
                  {commercialContract.title
                    || "Booking contract"}
                </strong>

                <small>
                  {commercialContract.reference}
                  {" · "}
                  Version{" "}
                  {commercialContract.versionNumber
                    || 1}
                </small>
              </div>

              <AdminStatus
                tone={
                  commercialContract.status === "signed"
                    ? "success"
                    : commercialContract.status === "void"
                      ? "danger"
                      : commercialContract.status === "draft"
                        ? "warning"
                        : "info"
                }
              >
                {commercialContract.status.replace(
                  /_/g,
                  " ",
                )}
              </AdminStatus>

              <AdminIconButton
                icon={X}
                label="Close contract preview"
                title="Close contract preview"
                variant="secondary"
                onClick={() =>
                  setContractPreviewOpen(
                    false,
                  )
                }
              />
            </header>

            <div className="crm-job-contract-preview__body">
              {contractPreview.length ? (
                contractPreview.map(
                  (block, index) => (
                    <section
                      key={`${block.heading}-${index}`}
                      className="crm-job-contract-preview__block"
                    >
                      {block.heading ? (
                        <h3>
                          {block.heading}
                        </h3>
                      ) : null}

                      <p>
                        {block.body}
                      </p>
                    </section>
                  ),
                )
              ) : (
                <p className="crm-job-contract-preview__empty">
                  No contract text is available for this generated version.
                </p>
              )}
            </div>
          </section>
        </div>
      ) : null}

    </AdminPage>
  );
}

function JobDeletePreflightGroup({
  title,
  tone,
  items,
}: {
  title: string;
  tone:
    | "delete"
    | "preserve"
    | "blocker";
  items:
    CrmDeletePreflight["willDelete"];
}) {
  if (!items.length) {
    return null;
  }

  return (
    <section
      className={
        `crm-delete-preflight-group crm-delete-preflight-group--${tone}`
      }
    >
      <h3>
        {title}
      </h3>

      <ul>
        {items.map(
          (item) => (
            <li key={item.key}>
              <div>
                <strong>
                  {item.label}
                </strong>

                <p>
                  {item.detail}
                </p>
              </div>

              {item.count != null ? (
                <span>
                  {item.count}
                </span>
              ) : null}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
