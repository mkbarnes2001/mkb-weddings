import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  FolderOpen,
  Home,
  LockKeyhole,
  PackageCheck,
  ScrollText,
} from "lucide-react";
import {
  AdminApiService,
  type WorkspaceRecord,
} from "../services/AdminApiService";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { ProfessionalQuestionnaireField } from "./CRMJob";
import type {
  CrmEnquiryDetail,
  CrmJobWorkspace,
  CrmQuote,
} from "../types/crm";

type PreviewView =
  | "home"
  | "quotes"
  | "contract"
  | "questionnaires"
  | "invoice"
  | "files";

function displayStatus(value?: string) {
  const raw =
    String(value || "")
      .trim();

  if (!raw) {
    return "Not started";
  }

  const label =
    raw.replace(/_/g, " ");

  return (
    label.charAt(0).toUpperCase()
    + label.slice(1)
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "Date TBC";
  }

  const parsed =
    new Date(
      value.length <= 10
        ? `${value}T12:00:00`
        : value,
    );

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
}

function quoteTypeLabel(quote: CrmQuote) {
  return quote.quoteType === "fixed"
    ? "Fixed quote"
    : "Pick & Choose";
}

function portalAccessLabel(
  workspace: CrmJobWorkspace | null,
) {
  const active =
    workspace?.portalAccess.filter(
      (item) =>
        item.status === "active",
    ) || [];

  if (
    active.some(
      (item) =>
        Boolean(item.acceptedAt),
    )
  ) {
    return "Client access active";
  }

  if (active.length) {
    return "Invitation sent";
  }

  return "Client access not active";
}

export function CRMClientPortalPreview() {
  const { id = "" } =
    useParams();

  const { auth } =
    useProfessionalAuth();

  const canEditQuestionnaires =
    auth.permissions.includes(
      "crm:manage",
    )
    && auth.accessMode
      !== "support";

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
    questionnaireSaving,
    setQuestionnaireSaving,
  ] = useState(false);

  const [
    questionnaireError,
    setQuestionnaireError,
  ] = useState("");

  const [
    questionnaireMessage,
    setQuestionnaireMessage,
  ] = useState("");

  const [detail, setDetail] =
    useState<CrmEnquiryDetail | null>(
      null,
    );

  const [quotes, setQuotes] =
    useState<CrmQuote[]>([]);

  const [
    jobWorkspace,
    setJobWorkspace,
  ] =
    useState<CrmJobWorkspace | null>(
      null,
    );

  const [workspace, setWorkspace] =
    useState<WorkspaceRecord | null>(
      null,
    );

  const [view, setView] =
    useState<PreviewView>("home");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(
    () => {
      let active = true;

      async function load() {
        setLoading(true);
        setError("");

        try {
          const [
            nextDetail,
            quoteOverview,
            nextWorkspace,
          ] =
            await Promise.all([
              AdminApiService
                .getCrmEnquiry(id),
              AdminApiService
                .getCrmQuoteOverview(),
              AdminApiService
                .getWorkspace(),
            ]);

          const nextQuotes =
            quoteOverview.quotes.filter(
              (quote) =>
                quote.enquiryId === id,
            );

          let nextJobWorkspace:
            CrmJobWorkspace | null =
            null;

          if (nextDetail.job?.id) {
            nextJobWorkspace =
              await AdminApiService
                .getCrmJobWorkspace(
                  nextDetail.job.id,
                );
          }

          if (!active) {
            return;
          }

          setDetail(nextDetail);
          setQuotes(nextQuotes);
          setWorkspace(nextWorkspace);
          setJobWorkspace(
            nextJobWorkspace,
          );
        } catch (loadError) {
          if (!active) {
            return;
          }

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load Client Portal preview.",
          );
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      void load();

      return () => {
        active = false;
      };
    },
    [id],
  );

  useEffect(
    () => {
      const previous =
        document.title;

      document.title =
        "Client Portal preview";

      return () => {
        document.title =
          previous;
      };
    },
    [],
  );

  function professionalPortalAnswer(
    value: unknown,
  ) {
    if (
      value === null
      || value === undefined
      || value === ""
    ) {
      return "Not answered";
    }

    if (
      typeof value
      === "boolean"
    ) {
      return value
        ? "Yes"
        : "No";
    }

    if (
      Array.isArray(value)
    ) {
      if (!value.length) {
        return "Not answered";
      }

      return value
        .map(
          (item) => {
            if (
              item
              && typeof item
                === "object"
            ) {
              const record =
                item as
                  Record<
                    string,
                    unknown
                  >;

              return String(
                record.name
                || record.label
                || record.role
                || "",
              ).trim()
              || "Supplier";
            }

            return String(item);
          },
        )
        .filter(Boolean)
        .join(", ");
    }

    if (
      typeof value
      === "object"
    ) {
      const record =
        value as
          Record<
            string,
            unknown
          >;

      return String(
        record.name
        || record.label
        || record.value
        || "",
      ).trim()
      || "Answered";
    }

    return String(value);
  }

  function beginQuestionnaireEdit(
    questionnaire:
      CrmJobWorkspace[
        "questionnaires"
      ][number],
  ) {
    if (
      !canEditQuestionnaires
    ) {
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

    setQuestionnaireError("");
    setQuestionnaireMessage("");
  }

  function closeQuestionnaireEditor() {
    setQuestionnaireEditorId("");
    setQuestionnaireDraft({});
    setQuestionnaireError("");
    setQuestionnaireMessage("");
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
      CrmJobWorkspace[
        "questionnaires"
      ][number],
    complete = false,
  ) {
    if (
      !canEditQuestionnaires
    ) {
      return;
    }

    setQuestionnaireSaving(true);
    setQuestionnaireError("");
    setQuestionnaireMessage("");

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

      setJobWorkspace(
        (current) =>
          current
            ? {
                ...current,
                questionnaires:
                  current
                    .questionnaires
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

      setQuestionnaireMessage(
        complete
          ? (
              saved.status
              === "completed"
                ? "Questionnaire submitted. It remains editable for later updates."
                : "Questionnaire submitted."
            )
          : (
              saved.status
              === "completed"
                ? "Changes saved. The questionnaire remains marked complete."
                : "Changes saved."
            ),
      );
    } catch (saveError) {
      setQuestionnaireError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save questionnaire answers.",
      );
    } finally {
      setQuestionnaireSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="crm-client-portal-preview crm-client-portal-preview--loading">
        Loading Client Portal preview…
      </main>
    );
  }

  if (
    error
    || !detail
    || !workspace
  ) {
    return (
      <main className="crm-client-portal-preview crm-client-portal-preview--loading">
        <section className="crm-client-portal-preview__error">
          <strong>
            Client Portal preview unavailable
          </strong>

          <p>
            {error
              || "Unable to load this client record."}
          </p>

          <Link
            to={`/admin/crm/enquiries/${id}`}
          >
            <ArrowLeft />
            Return to lead
          </Link>
        </section>
      </main>
    );
  }

  const settings =
    workspace.settings;

  const businessName =
    settings.businessName
    || workspace.name
    || "WedPlanned";

  const primary =
    detail.contacts.find(
      (contact) =>
        contact.role === "primary",
    )
    || detail.contacts[0]
    || null;

  const partner =
    detail.contacts.find(
      (contact) =>
        contact.role === "partner",
    )
    || null;

  const clientName =
    primary?.displayName
    || detail.enquiry.primaryContact
      ?.displayName
    || detail.enquiry.reference;

  const clientFirstName =
    clientName
      .split(/\s+/)
      .filter(Boolean)[0]
    || "there";

  const coupleName =
    [
      primary?.displayName,
      partner?.displayName,
    ]
      .filter(Boolean)
      .join(" & ")
    || clientName;

  const eventDate =
    jobWorkspace?.job.eventDate
    || detail.enquiry.eventDate;

  const venue =
    jobWorkspace?.job.venueText
    || detail.enquiry.venueText
    || "Venue TBC";

  const quote =
    quotes.find(
      (item) =>
        item.status === "accepted",
    )
    || quotes.find(
      (item) =>
        ["sent", "viewed"].includes(
          item.status,
        ),
    )
    || quotes[0]
    || null;

  const questionnaires =
    jobWorkspace?.questionnaires
      .filter(
        (item) =>
          [
            "sent",
            "opened",
            "in_progress",
            "completed",
          ].includes(
            item.status,
          ),
      )
    || [];

  const files =
    jobWorkspace?.files || [];

  const questionnaireFiles =
    questionnaires.reduce(
      (count, questionnaire) =>
        count
        + questionnaire.files.length,
      0,
    );

  const contract =
    jobWorkspace
      ?.commercial.contract
    || null;

  const invoice =
    jobWorkspace
      ?.commercial.invoice
    || null;

  const jobStatus =
    jobWorkspace
      ? displayStatus(
          jobWorkspace.job.status,
        )
      : "Lead";

  const portalStyle =
    {
      "--portal-preview-accent":
        settings.accentColor
        || "#111111",
      "--portal-preview-secondary":
        settings.portalSecondaryColor
        || "#f1efe9",
      "--portal-preview-background":
        settings.portalBackgroundColor
        || "#f7f6f3",
    } as CSSProperties;

  const heroStyle =
    settings.portalBannerUrl
      ? {
          backgroundImage:
            `linear-gradient(90deg, rgba(0,0,0,.42), rgba(0,0,0,.10)), url(${settings.portalBannerUrl})`,
        }
      : undefined;

  const cards = [
    {
      key: "quotes" as const,
      title: "Quote",
      value: quote
        ? displayStatus(quote.status)
        : "Not started",
      detail: quote
        ? `${quote.reference} · ${quoteTypeLabel(quote)}`
        : "No quote prepared yet.",
    },
    {
      key: "contract" as const,
      title: "Contract",
      value: contract
        ? displayStatus(contract.status)
        : "Not started",
      detail:
        "Agreement and signature progress.",
    },
    {
      key: "questionnaires" as const,
      title: "Questionnaire",
      value: questionnaires.length
        ? `${questionnaires.length} available`
        : "Not started",
      detail:
        "Planning information for the booking.",
    },
    {
      key: "invoice" as const,
      title: "Invoice",
      value: invoice
        ? displayStatus(invoice.status)
        : "Not started",
      detail:
        "Booking and payment information.",
    },
    {
      key: "files" as const,
      title: "Files",
      value:
        files.length + questionnaireFiles
          ? `${files.length + questionnaireFiles} file${files.length + questionnaireFiles === 1 ? "" : "s"}`
          : "No files yet",
      detail:
        "Planning files shared through the client journey.",
    },
  ];

  return (
    <main
      className="crm-client-portal-preview"
      style={portalStyle}
    >
      <div className="crm-client-portal-preview__admin-bar">
        <Link
          to={`/admin/crm/enquiries/${id}`}
        >
          <ArrowLeft />
          Back to {clientName}
        </Link>

        <div>
          <LockKeyhole />
          <span>
            Professional portal view
          </span>
          <strong>
            {portalAccessLabel(
              jobWorkspace,
            )}
          </strong>
        </div>
      </div>

      <section
        className="crm-client-portal-preview__hero"
        style={heroStyle}
      >
        <div className="crm-client-portal-preview__brand">
          <span className="crm-client-portal-preview__logo">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt=""
              />
            ) : (
              businessName
                .slice(0, 2)
                .toUpperCase()
            )}
          </span>

          <div>
            <strong>
              {businessName}
            </strong>

            <small>
              Client Portal
            </small>
          </div>
        </div>

        <div className="crm-client-portal-preview__client">
          <strong>
            {clientName}
          </strong>

          <small>
            {jobStatus}
          </small>
        </div>
      </section>

      <nav
        className="crm-client-portal-preview__nav"
        aria-label="Client Portal preview"
      >
        <button
          type="button"
          className={
            view === "home"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("home")
          }
        >
          Home
        </button>

        <button
          type="button"
          className={
            view === "quotes"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("quotes")
          }
        >
          Quotes
        </button>

        <button
          type="button"
          className={
            view === "contract"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("contract")
          }
        >
          Contract
        </button>

        <button
          type="button"
          className={
            view === "questionnaires"
              ? "active"
              : ""
          }
          onClick={() =>
            setView(
              "questionnaires",
            )
          }
        >
          Questionnaire
        </button>

        <button
          type="button"
          className={
            view === "invoice"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("invoice")
          }
        >
          Invoice
        </button>

        <button
          type="button"
          className={
            view === "files"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("files")
          }
        >
          Files
        </button>
      </nav>

      <aside className="crm-client-portal-preview__notice">
        <LockKeyhole />

        <div>
          <strong>
            Professional controls
          </strong>

          <p>
            This uses your professional Admin access
            and does not sign in as the client or
            create a client session. Questionnaire
            answers can be updated below with
            professional attribution. Quote acceptance,
            contract signing, payments and client file
            actions remain client-only.
          </p>
        </div>
      </aside>

      {view === "home" ? (
        <section className="crm-client-portal-preview__home">
          <header>
            <small>
              Welcome, {clientFirstName}
            </small>

            <h1>
              {settings.portalWelcomeHeading
                || "Welcome to your client portal"}
            </h1>

            <p>
              {settings.portalWelcomeMessage
                || "Everything for your booking is organised here in one secure place."}
            </p>
          </header>

          <article className="crm-client-portal-preview__event">
            <div>
              <small>
                Your event
              </small>

              <h2>
                {coupleName}
              </h2>

              <p>
                <CalendarDays />
                {formatDate(eventDate)}
                <span>·</span>
                {venue}
              </p>
            </div>

            <span>
              {jobStatus}
            </span>
          </article>

          <div className="crm-client-portal-preview__cards">
            {cards.map(
              (card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={() =>
                    setView(card.key)
                  }
                >
                  <small>
                    {card.title}
                  </small>

                  <strong>
                    {card.value}
                  </strong>

                  <p>
                    {card.detail}
                  </p>
                </button>
              ),
            )}
          </div>
        </section>
      ) : null}

      {view === "quotes" ? (
        <section className="crm-client-portal-preview__section">
          <header>
            <PackageCheck />

            <div>
              <small>
                Client Portal
              </small>

              <h1>
                Quotes
              </h1>

              <p>
                Client-facing quote status and commercial choice.
              </p>
            </div>
          </header>

          {!quotes.length ? (
            <div className="crm-client-portal-preview__empty">
              <strong>
                No quote created
              </strong>

              <p>
                A quote will appear here once it is prepared.
              </p>
            </div>
          ) : (
            <div className="crm-client-portal-preview__list">
              {quotes.map(
                (item) => (
                  <article key={item.id}>
                    <div>
                      <small>
                        {item.reference}
                      </small>

                      <strong>
                        {quoteTypeLabel(
                          item,
                        )}
                      </strong>

                      <p>
                        {item.status === "draft"
                          ? "Draft · not yet visible to client"
                          : displayStatus(item.status)}
                      </p>
                    </div>

                    <span>
                      {displayStatus(
                        item.status,
                      )}
                    </span>
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      ) : null}

      {view === "contract" ? (
        <section className="crm-client-portal-preview__section">
          <header>
            <ScrollText />

            <div>
              <small>
                Client Portal
              </small>

              <h1>
                Contract
              </h1>

              <p>
                Booking agreement and signature progress.
              </p>
            </div>
          </header>

          {contract ? (
            <div className="crm-client-portal-preview__document">
              <small>
                Current status
              </small>

              <strong>
                {displayStatus(
                  contract.status,
                )}
              </strong>
            </div>
          ) : (
            <div className="crm-client-portal-preview__empty">
              <strong>
                No contract yet
              </strong>

              <p>
                Contract content will appear here later in the journey.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {view === "questionnaires" ? (
        <section className="crm-client-portal-preview__section crm-client-portal-preview__questionnaires">
          <header>
            <FileText />

            <div>
              <small>
                Client Portal
              </small>

              <h1>
                Questionnaires
              </h1>

              <p>
                Review the same planning answers visible to the client. Professionals with CRM management access can update and submit answers here.
              </p>
            </div>
          </header>

          {questionnaireError ? (
            <div className="admin-alert admin-alert--error">
              {questionnaireError}
            </div>
          ) : null}

          {questionnaireMessage ? (
            <div className="admin-alert admin-alert--success">
              {questionnaireMessage}
            </div>
          ) : null}

          {!canEditQuestionnaires ? (
            <div className="crm-client-portal-preview__professional-note">
              <strong>
                Questionnaire editing is read-only for this session.
              </strong>

              <span>
                CRM management permission is required. Support-mode access cannot change client questionnaire responses.
              </span>
            </div>
          ) : null}

          {!questionnaires.length ? (
            <div className="crm-client-portal-preview__empty">
              <strong>
                No questionnaire available
              </strong>

              <p>
                Assigned and sent questionnaires will appear here.
              </p>
            </div>
          ) : (
            <div className="crm-client-portal-preview__questionnaire-list">
              {questionnaires.map(
                (questionnaire) => {
                  const editing =
                    questionnaireEditorId
                    === questionnaire.id;

                  const lastEditor =
                    questionnaire.lastSavedByLabel
                    || (
                      questionnaire.lastSavedByType
                      === "client"
                        ? (
                            questionnaire
                              .assignedContactName
                            || "Client"
                          )
                        : questionnaire.lastSavedByType
                          === "professional"
                          ? "WedCRM user"
                          : ""
                    );

                  return (
                    <article
                      key={
                        questionnaire.id
                      }
                      className={
                        `crm-client-portal-preview__questionnaire ${
                          editing
                            ? "is-editing"
                            : ""
                        }`
                      }
                    >
                      <header className="crm-client-portal-preview__questionnaire-head">
                        <div>
                          <strong>
                            {questionnaire.title}
                          </strong>

                          <small>
                            {questionnaire.assignedContactName
                              || "Client"}
                            {questionnaire.dueAt
                              ? ` · planning target ${formatDate(
                                  questionnaire.dueAt,
                                )}`
                              : ""}
                          </small>
                        </div>

                        <div className="crm-client-portal-preview__questionnaire-actions">
                          <span className={`admin-status admin-status--${
                            questionnaire.status
                            === "completed"
                              ? "success"
                              : "neutral"
                          }`}>
                            {displayStatus(
                              questionnaire.status,
                            )}
                          </span>

                          {canEditQuestionnaires ? (
                            editing ? (
                              <button
                                type="button"
                                className="admin-button admin-button--ghost admin-button--sm"
                                disabled={
                                  questionnaireSaving
                                }
                                onClick={
                                  closeQuestionnaireEditor
                                }
                              >
                                Close editor
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="admin-button admin-button--secondary admin-button--sm"
                                disabled={
                                  questionnaireSaving
                                }
                                onClick={() =>
                                  beginQuestionnaireEdit(
                                    questionnaire,
                                  )
                                }
                              >
                                Edit answers
                              </button>
                            )
                          ) : null}
                        </div>
                      </header>

                      {questionnaire.introduction ? (
                        <p className="crm-client-portal-preview__questionnaire-intro">
                          {questionnaire.introduction}
                        </p>
                      ) : null}

                      {lastEditor
                        || questionnaire.lastSavedAt ? (
                        <p className="crm-client-portal-preview__questionnaire-updated">
                          Last updated
                          {questionnaire.lastSavedAt
                            ? ` ${formatDate(
                                questionnaire.lastSavedAt,
                              )}`
                            : ""}
                          {lastEditor
                            ? ` by ${lastEditor}`
                            : ""}
                          .
                        </p>
                      ) : null}

                      {editing ? (
                        <div className="crm-questionnaire-editor crm-client-portal-preview__questionnaire-editor">
                          <div className="crm-client-portal-preview__professional-note">
                            <strong>
                              Editing the shared questionnaire
                            </strong>

                            <span>
                              Changes update the same answers visible to the client. They are recorded as a professional edit; no client session is created.
                            </span>
                          </div>

                          <div className="crm-questionnaire-editor__fields">
                            {questionnaire.fields.map(
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
                                    jobWorkspace
                                      ?.supplierDirectory
                                    || []
                                  }
                                  fileCount={
                                    questionnaire.files.filter(
                                      (file) =>
                                        file.fieldKey
                                        === field.id,
                                    ).length
                                  }
                                  disabled={
                                    questionnaireSaving
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

                          <footer className="crm-questionnaire-editor__footer crm-client-portal-preview__questionnaire-footer">
                            <div>
                              {questionnaire.status
                                === "completed" ? (
                                <span>
                                  This questionnaire is complete, but answers can still be updated and submitted again.
                                </span>
                              ) : (
                                <span>
                                  Save work without completing the questionnaire, or submit when the planning details are ready.
                                </span>
                              )}
                            </div>

                            <div>
                              <button
                                type="button"
                                className="admin-button admin-button--secondary"
                                disabled={
                                  questionnaireSaving
                                  || !canEditQuestionnaires
                                }
                                onClick={() =>
                                  void saveQuestionnaireAnswers(
                                    questionnaire,
                                    false,
                                  )
                                }
                              >
                                {questionnaireSaving
                                  ? "Saving…"
                                  : "Save changes"}
                              </button>

                              <button
                                type="button"
                                className="admin-button admin-button--primary"
                                disabled={
                                  questionnaireSaving
                                  || !canEditQuestionnaires
                                }
                                onClick={() =>
                                  void saveQuestionnaireAnswers(
                                    questionnaire,
                                    true,
                                  )
                                }
                              >
                                {questionnaireSaving
                                  ? "Submitting…"
                                  : questionnaire.status
                                    === "completed"
                                    ? "Submit updates"
                                    : "Submit"}
                              </button>
                            </div>
                          </footer>
                        </div>
                      ) : (
                        <div className="crm-client-portal-preview__questionnaire-responses">
                          {questionnaire.fields
                            .filter(
                              (field) =>
                                field.type
                                !== "heading"
                                && field.type
                                  !== "description",
                            )
                            .map(
                              (field) => (
                                <div
                                  key={
                                    field.id
                                  }
                                >
                                  <span>
                                    {field.label}
                                  </span>

                                  <strong>
                                    {field.type
                                      === "file"
                                      ? (
                                          questionnaire.files.filter(
                                            (file) =>
                                              file.fieldKey
                                              === field.id,
                                          ).length
                                            ? `${
                                                questionnaire.files.filter(
                                                  (file) =>
                                                    file.fieldKey
                                                    === field.id,
                                                ).length
                                              } file(s) attached`
                                            : "No file attached"
                                        )
                                      : professionalPortalAnswer(
                                          questionnaire.responses[
                                            field.id
                                          ],
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
        </section>
      ) : null}

      {view === "invoice" ? (
        <section className="crm-client-portal-preview__section">
          <header>
            <FileText />

            <div>
              <small>
                Client Portal
              </small>

              <h1>
                Invoice
              </h1>

              <p>
                Booking payment information.
              </p>
            </div>
          </header>

          {invoice ? (
            <div className="crm-client-portal-preview__document">
              <small>
                Current status
              </small>

              <strong>
                {displayStatus(
                  invoice.status,
                )}
              </strong>
            </div>
          ) : (
            <div className="crm-client-portal-preview__empty">
              <strong>
                No invoice yet
              </strong>

              <p>
                Payment information will appear here once created.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {view === "files" ? (
        <section className="crm-client-portal-preview__section">
          <header>
            <FolderOpen />

            <div>
              <small>
                Client Portal
              </small>

              <h1>
                Files
              </h1>

              <p>
                Planning files shared through this client journey.
              </p>
            </div>
          </header>

          {!files.length
          && !questionnaireFiles ? (
            <div className="crm-client-portal-preview__empty">
              <strong>
                No files yet
              </strong>

              <p>
                Shared planning files will appear here after booking.
              </p>
            </div>
          ) : (
            <div className="crm-client-portal-preview__list">
              {files.map(
                (file) => (
                  <article key={file.id}>
                    <div>
                      <strong>
                        {file.filename}
                      </strong>

                      <p>
                        {file.source === "client"
                          ? "Uploaded by client"
                          : "Shared by business"}
                      </p>
                    </div>

                    <span>
                      File
                    </span>
                  </article>
                ),
              )}

              {questionnaires
                .flatMap(
                  (questionnaire) =>
                    questionnaire.files.map(
                      (file) => ({
                        ...file,
                        questionnaireTitle:
                          questionnaire.title,
                      }),
                    ),
                )
                .map(
                  (file) => (
                    <article
                      key={file.id}
                    >
                      <div>
                        <strong>
                          {file.filename}
                        </strong>

                        <p>
                          {file.questionnaireTitle}
                        </p>
                      </div>

                      <span>
                        Attachment
                      </span>
                    </article>
                  ),
                )}
            </div>
          )}
        </section>
      ) : null}

      <footer className="crm-client-portal-preview__footer">
        <span>
          {settings.portalFooterText
            || `Need help? Contact ${businessName}.`}
        </span>

        {settings.contactEmail ? (
          <a
            href={`mailto:${settings.contactEmail}`}
          >
            {settings.contactEmail}
          </a>
        ) : null}
      </footer>
    </main>
  );
}
