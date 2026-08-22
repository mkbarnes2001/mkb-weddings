import {
  useEffect,
  useMemo,
  useState } from "react";
import { Link,
  useNavigate,
  useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileText,
  FolderOpen,
  Mail,
  MapPin,
  PackageCheck,
  Plus,
  Save,
  UserRound,
  XCircle,
  } from "lucide-react";
import {
  AdminButton,
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
  CrmCommunication,
  CrmEnquiryDetail,
  CrmEnquiryInput,
  CrmJobWorkspace,
  CrmOverview,
  CrmQuote,
} from "../types/crm";

function dateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function splitName(value = "") {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts.shift() || "", lastName: parts.join(" ") };
}

function dateOnly(
  value?: string,
) {
  if (!value) return "Date TBC";

  const parsed = new Date(
    value.length <= 10
      ? `${value}T12:00:00`
      : value,
  );

  return Number.isNaN(
    parsed.getTime(),
  )
    ? value
    : parsed.toLocaleDateString(
        "en-GB",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
      );
}

function money(
  value: number | null | undefined,
  currency = "GBP",
) {
  if (value == null) return "Not set";

  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency,
    },
  ).format(
    value / 100,
  );
}

function statusLabel(
  value?: string,
) {
  const source =
    String(value || "")
      .trim();

  if (!source) {
    return "Not started";
  }

  const label =
    source.replace(
      /_/g,
      " ",
    );

  return (
    label.charAt(0)
      .toUpperCase()
    + label.slice(1)
  );
}

function mailPresentation(
  item: CrmCommunication,
): {
  label: string;
  tone:
    | "neutral"
    | "success"
    | "warning"
    | "danger"
    | "info";
  at: string;
} {
  if (item.status === "failed") {
    return {
      label: "Failed",
      tone: "danger",
      at: item.occurredAt,
    };
  }

  if (item.clickedAt) {
    return {
      label: "Link clicked",
      tone: "info",
      at: item.clickedAt,
    };
  }

  if (item.openedAt) {
    return {
      label: "Opened",
      tone: "success",
      at: item.openedAt,
    };
  }

  if (item.deliveredAt) {
    return {
      label: "Delivered",
      tone: "warning",
      at: item.deliveredAt,
    };
  }

  if (item.status === "sent") {
    return {
      label: "Sent",
      tone: "warning",
      at: item.occurredAt,
    };
  }

  return {
    label:
      statusLabel(
        item.status,
      ),
    tone: "neutral",
    at: item.occurredAt,
  };
}

export function CRMEnquiry() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { auth } = useProfessionalAuth();

  const [detail, setDetail] =
    useState<CrmEnquiryDetail | null>(null);

  const [overview, setOverview] =
    useState<CrmOverview | null>(null);

  const [form, setForm] =
    useState<CrmEnquiryInput>({});

  const [jobWorkspace, setJobWorkspace] =
    useState<CrmJobWorkspace | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [lostReason, setLostReason] =
    useState("");

  const [quotes, setQuotes] =
    useState<CrmQuote[]>([]);

  const canManage =
    auth.permissions.includes(
      "crm:manage",
    )
    && auth.accessMode !== "support";

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [
        nextDetail,
        nextOverview,
        quoteOverview,
      ] = await Promise.all([
        AdminApiService
          .getCrmEnquiry(id),
        AdminApiService
          .getCrmOverview(),
        AdminApiService
          .getCrmQuoteOverview(),
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
        try {
          nextJobWorkspace =
            await AdminApiService
              .getCrmJobWorkspace(
                nextDetail.job.id,
              );
        } catch {
          nextJobWorkspace = null;
        }
      }

      setDetail(nextDetail);
      setOverview(nextOverview);
      setQuotes(nextQuotes);
      setJobWorkspace(
        nextJobWorkspace,
      );

      const primary =
        nextDetail.contacts.find(
          (contact) =>
            contact.role === "primary",
        );

      const partner =
        nextDetail.contacts.find(
          (contact) =>
            contact.role === "partner",
        );

      const primaryName =
        splitName(
          primary?.displayName
          || nextDetail.enquiry
            .primaryContact
            ?.displayName
          || "",
        );

      const partnerName =
        splitName(
          partner?.displayName
          || nextDetail.enquiry
            .partnerContact
            ?.displayName
          || "",
        );

      setForm({
        stageId:
          nextDetail.enquiry.stageId,
        source:
          nextDetail.enquiry.source,
        campaign:
          nextDetail.enquiry.campaign,
        eventType:
          nextDetail.enquiry.eventType,
        eventDate:
          nextDetail.enquiry.eventDate,
        dateFlexibility:
          nextDetail.enquiry
            .dateFlexibility,
        venueText:
          nextDetail.enquiry.venueText,
        venueId:
          nextDetail.enquiry.venueId,
        venueSlug:
          nextDetail.enquiry.venueSlug,
        serviceInterest:
          nextDetail.enquiry
            .serviceInterest,
        packageInterest:
          nextDetail.enquiry
            .packageInterest,
        budgetMin:
          nextDetail.enquiry.budgetMin,
        budgetMax:
          nextDetail.enquiry.budgetMax,
        currency:
          nextDetail.enquiry.currency,
        notes:
          nextDetail.enquiry.notes,
        primaryContact: {
          id:
            primary?.id
            || nextDetail.enquiry
              .primaryContact?.id
            || "",
          ...primaryName,
          email:
            primary?.email
            || nextDetail.enquiry
              .primaryContact?.email
            || "",
          phone:
            primary?.phone
            || nextDetail.enquiry
              .primaryContact?.phone
            || "",
        },
        partnerContact: {
          id:
            partner?.id
            || nextDetail.enquiry
              .partnerContact?.id
            || "",
          ...partnerName,
          email:
            partner?.email
            || nextDetail.enquiry
              .partnerContact?.email
            || "",
          phone:
            partner?.phone
            || nextDetail.enquiry
              .partnerContact?.phone
            || "",
        },
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load lead.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(
    () => {
      void load();
    },
    [
      id,
      auth.workspaceId,
    ],
  );

  const stage =
    useMemo(
      () =>
        overview?.stages.find(
          (item) =>
            item.id === form.stageId,
        ),
      [
        form.stageId,
        overview?.stages,
      ],
    );

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await AdminApiService
        .updateCrmEnquiry(
          id,
          form,
        );

      setMessage(
        "Lead saved.",
      );

      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save lead.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function markLost() {
    if (
      !window.confirm(
        "Mark this lead as lost or unavailable?",
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await AdminApiService
        .markCrmEnquiryLost(
          id,
          lostReason,
        );

      setMessage(
        "Lead marked as lost.",
      );

      await load();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to mark lead as lost.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadLeadPlanningFile(
    file: File | undefined,
  ) {
    const jobId =
      detail?.job?.id;

    if (
      !file
      || !jobId
      || !canManage
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result =
        await AdminApiService.uploadCrmJobFile(
            jobId,
            file,
          );

      setJobWorkspace(
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


  function createQuote() {
    navigate(
      `/admin/crm/quotes?enquiryId=${encodeURIComponent(id)}`,
    );
  }

  if (
    loading
    && !detail
  ) {
    return (
      <AdminPage>
        <p className="text-sm text-neutral-500">
          Loading client journey…
        </p>
      </AdminPage>
    );
  }

  if (!detail) {
    return (
      <AdminPage>
        <div className="admin-alert admin-alert--error">
          {error || "Lead not found."}
        </div>
      </AdminPage>
    );
  }

  const enquiry =
    detail.enquiry;

  const journeyQuote =
    quotes.find(
      (quote) =>
        quote.status === "accepted",
    )
    || quotes.find(
      (quote) =>
        quote.status === "viewed"
        || quote.status === "sent",
    )
    || quotes[0]
    || null;

  const contract =
    jobWorkspace?.commercial
      .contract
    || null;

  const invoice =
    jobWorkspace?.commercial
      .invoice
    || null;

  const questionnaires =
    jobWorkspace?.questionnaires
    || [];

  const completedQuestionnaires =
    questionnaires.filter(
      (item) =>
        item.status === "completed",
    ).length;

  const questionnaireComplete =
    questionnaires.length > 0
    && completedQuestionnaires
      === questionnaires.length;

  const questionnaireFiles =
    questionnaires.flatMap(
      (item) =>
        item.files.map(
          (file) => ({
            ...file,
            questionnaireId:
              item.id,
            questionnaireTitle:
              item.title,
          }),
        ),
    );

  const planningFiles =
    jobWorkspace?.files
    || [];

  const workspaceFileCount =
    planningFiles.length
    + questionnaireFiles.length;

  const mailCommunications =
    detail.communications.filter(
      (item) =>
        item.channel === "email",
    );

  const eventPassed =
    Boolean(
      enquiry.eventDate
      && new Date(
        `${enquiry.eventDate}T23:59:59`,
      ).getTime() < Date.now(),
    );

  const quoteProgressed =
    Boolean(
      journeyQuote
      && [
        "sent",
        "viewed",
        "accepted",
      ].includes(
        journeyQuote.status,
      ),
    );

  const contractComplete =
    Boolean(
      contract?.signedAt
      || contract?.status
        === "signed",
    );

  const paymentRecorded =
    Boolean(
      invoice
      && Number(
        invoice.paidAmount
        || 0,
      ) > 0,
    );

  const jobStatus =
    jobWorkspace?.job.status
    || detail.job?.status
    || "";

  const lifecycle =
    enquiry.status === "lost"
    || jobStatus === "cancelled"
      ? "Lost"
      : jobStatus === "completed"
        ? "Complete"
        : jobStatus === "active"
          ? "In production"
          : detail.job
            ? "Booked"
            : journeyQuote?.status
                === "accepted"
              ? "Quote accepted"
              : quoteProgressed
                ? "Quoted"
                : "Lead";

  const lifecycleTone:
    | "neutral"
    | "success"
    | "warning"
    | "danger"
    | "info" =
    lifecycle === "Lost"
      ? "danger"
      : lifecycle === "Complete"
        || lifecycle === "Booked"
        ? "success"
        : lifecycle === "In production"
          ? "info"
          : lifecycle === "Quoted"
            || lifecycle
              === "Quote accepted"
            ? "warning"
            : "neutral";

    const journey = [
      {
        label: "Lead created",
        detail:
          dateOnly(
            enquiry.createdAt,
          ),
        complete: true,
      },
      {
        label: "Quote",
        detail:
          journeyQuote
            ? statusLabel(
                journeyQuote.status,
              )
            : "Not started",
        complete:
          quoteProgressed,
      },
      {
        label: "Quote accepted",
        detail:
          journeyQuote?.status
            === "accepted"
          || detail.job
            ? "Accepted"
            : "Pending",
        complete:
          journeyQuote?.status
            === "accepted"
          || Boolean(
            detail.job,
          ),
      },
      {
        label: "Job accepted",
        detail:
          detail.job
            ? "Booked"
            : "Pending",
        complete:
          Boolean(
            detail.job,
          ),
      },
    ];

  return (
    <AdminPage className="crm-lead-workspace-page">
      <AdminPageHeader
        title={
          enquiry.primaryContact
            ?.displayName
          || enquiry.reference
        }
        description={`${enquiry.reference} · ${enquiry.serviceInterest || enquiry.eventType || "Client enquiry"} · ${dateOnly(enquiry.eventDate)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {quotes[0] ? (
              <AdminHeaderRouterLink
                to={`/admin/crm/quotes/${quotes[0].id}`}
                className="admin-button admin-button--secondary"
              >
                <PackageCheck className="admin-button__icon" />
                Open quote
              </AdminHeaderRouterLink>
            ) : canManage
              && !detail.job ? (
              <AdminButton
                variant="primary"
                icon={Plus}
                disabled={saving}
                onClick={() =>
                  void createQuote()
                }
              >
                Create quote
              </AdminButton>
            ) : null}

            <AdminHeaderRouterLink
              to={`/admin/crm/enquiries/${id}/client-portal`}
              target="_blank"
              rel="noreferrer"
              className="admin-button admin-button--secondary"
            >
              <ExternalLink className="admin-button__icon" />
              Client Portal
            </AdminHeaderRouterLink>

            {detail.job ? (
              <AdminHeaderRouterLink
                to={`/admin/crm/jobs/${detail.job.id}`}
                className="admin-button admin-button--secondary"
              >
                <BriefcaseBusiness className="admin-button__icon" />
                Job operations
              </AdminHeaderRouterLink>
            ) : null}
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

      <div className="crm-lead-primary-grid">
        <div className="crm-lead-primary-grid__journey">
<AdminPanel
        title="Client journey"
        description="Lead → quote → accepted booking"
        icon={Check}
        className="crm-lead-workspace-overview-panel crm-lead-workspace-overview-panel--compact crm-lead-journey-panel"
        compact
      >
        <div className="crm-lead-workspace-overview">
          <div
            className="crm-lead-workspace-journey"
            aria-label="Client journey"
          >
            {journey.map(
              (
                item,
                index,
              ) => (
                <div
                  key={item.label}
                  className={
                    item.complete
                      ? "complete"
                      : ""
                  }
                >
                  <span>
                    {item.complete
                      ? <Check />
                      : index + 1}
                  </span>

                  <div>
                    <strong>
                      {item.label}
                    </strong>

                    <small>
                      {item.detail}
                    </small>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </AdminPanel>
        </div>
        <div className="crm-lead-primary-grid__client">
<AdminPanel
              title="Client"
              description="Contact details for this Lead."
              icon={UserRound}
              className="crm-lead-client-panel"
              actions={
                canManage ? (
                  <AdminButton
                    size="sm"
                    variant="secondary"
                    icon={Save}
                    disabled={saving}
                    onClick={() =>
                      void save()
                    }
                  >
                    Save
                  </AdminButton>
                ) : undefined
              }
            >
              <div className="crm-lead-contact-editors">
                <ContactEditor
                  title="Primary client"
                  value={
                    form.primaryContact
                    || {}
                  }
                  disabled={!canManage}
                  onChange={(value) =>
                    setForm(
                      (current) => ({
                        ...current,
                        primaryContact:
                          value,
                      }),
                    )
                  }
                />

                <ContactEditor
                  title="Partner / second client"
                  value={
                    form.partnerContact
                    || {}
                  }
                  disabled={!canManage}
                  onChange={(value) =>
                    setForm(
                      (current) => ({
                        ...current,
                        partnerContact:
                          value,
                      }),
                    )
                  }
                />
              </div>
            </AdminPanel>
        </div>
      </div>

      <div className="crm-lead-workspace-layout">
        <main className="crm-lead-workspace-main">
          <div className="crm-lead-summary-grid">
            <div className="crm-lead-summary-grid__details">
<AdminPanel
              title="Lead details"
              description="Core details used for quoting and booking."
              icon={BriefcaseBusiness}
              className="crm-lead-details-panel"
              actions={
                canManage ? (
                  <AdminButton
                    size="sm"
                    variant="primary"
                    icon={Save}
                    disabled={saving}
                    onClick={() =>
                      void save()
                    }
                  >
                    Save
                  </AdminButton>
                ) : undefined
              }
            >
              <div className="crm-lead-details-grid">
                <AdminField label="Pipeline stage">
                  <select
                    className="admin-select"
                    value={
                      form.stageId
                      || ""
                    }
                    disabled={
                      !canManage
                      || enquiry.status
                        === "won"
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          stageId:
                            event.target.value,
                        }),
                      )
                    }
                  >
                    {(overview?.stages || [])
                      .filter(
                        (item) =>
                          item.type === "open"
                          || item.id
                            === form.stageId,
                      )
                      .map(
                        (item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.name}
                          </option>
                        ),
                      )}
                  </select>
                </AdminField>

                <AdminField label="Service">
                  <input
                    className="admin-input"
                    disabled={!canManage}
                    value={
                      form.serviceInterest
                      || ""
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          serviceInterest:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </AdminField>

                <AdminField label="Wedding date">
                  <input
                    className="admin-input"
                    type="date"
                    disabled={
                      !canManage
                      || enquiry.status
                        === "won"
                    }
                    value={
                      form.eventDate
                      || ""
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          eventDate:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </AdminField>

                <AdminField label="Venue">
                  <input
                    className="admin-input"
                    disabled={!canManage}
                    value={
                      form.venueText
                      || ""
                    }
                    placeholder="Venue or TBC"
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          venueText:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </AdminField>

                <AdminField label="Source">
                  <input
                    className="admin-input"
                    disabled={!canManage}
                    value={
                      form.source
                      || ""
                    }
                    placeholder="Website, referral, Instagram…"
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          source:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </AdminField>

                <AdminField label="Campaign">
                  <input
                    className="admin-input"
                    disabled={!canManage}
                    value={
                      form.campaign
                      || ""
                    }
                    placeholder="Optional"
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          campaign:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </AdminField>

                <AdminField
                  label="Notes"
                  className="crm-lead-details-grid__wide"
                >
                  <textarea
                    className="admin-textarea"
                    rows={3}
                    disabled={!canManage}
                    value={
                      form.notes
                      || ""
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          notes:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </AdminField>
              </div>
            </AdminPanel>
            </div>
            <div className="crm-lead-summary-grid__quotes">
<AdminPanel
              title="Quotes"
              description="Pricing sent during this Lead journey."
              icon={PackageCheck}
              className="crm-lead-quotes-panel"
              actions={
                canManage
                && !detail.job
                && !quotes.length ? (
                  <AdminButton
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    disabled={saving}
                    onClick={() =>
                      void createQuote()
                    }
                  >
                    Create quote
                  </AdminButton>
                ) : undefined
              }
            >
              {!quotes.length ? (
                <AdminEmptyState
                  icon={PackageCheck}
                  title="No quote created"
                  description="Create a quote when the lead is ready for pricing."
                />
              ) : (
                <div className="crm-lead-quote-list">
                  {quotes.map(
                    (quote) => (
                      <article
                        key={quote.id}
                        className="crm-lead-quote-row"
                      >
                        <div className="crm-lead-quote-row__copy">
                          <strong>
                            {quote.reference}
                          </strong>

                          <small>
                            {quote.quoteType
                              === "fixed"
                              ? "Fixed"
                              : "Pick & Choose"}
                            {" · "}
                            v
                            {quote.currentVersion
                              ?.versionNumber
                              || 1}
                          </small>
                        </div>

                        <span
                          className={
                            `crm-lead-quote-row__state is-${quote.status}`
                          }
                        >
                          {statusLabel(
                            quote.status,
                          )}
                        </span>

                        <strong className="crm-lead-quote-row__value">
                          {money(
                            quote.currentVersion
                              ?.totalAmount
                              || 0,
                            quote.currency
                              || "GBP",
                          )}
                        </strong>

                        <Link
                          className="admin-icon-control crm-lead-quote-row__action"
                          to={`/admin/crm/quotes/${quote.id}`}
                          aria-label={`Open quote ${quote.reference}`}
                          title="Open quote"
                        >
                          <ExternalLink aria-hidden="true" />
                        </Link>
                      </article>
                    ),
                  )}
                </div>
              )}
            </AdminPanel>
            </div>
          </div>



          <AdminPanel
            title="Mail"
            description="Delivery and engagement are independent from quote-document views."
            icon={Mail}
          >
            {!mailCommunications.length ? (
              <AdminEmptyState
                icon={Mail}
                title="No mail history"
                description="Quote emails and recorded email correspondence will appear here."
              />
            ) : (
              <div className="crm-communication-list">
                {mailCommunications.map(
                  (item) => {
                    const state =
                      mailPresentation(
                        item,
                      );

                    return (
                      <article key={item.id}>
                        <div className="crm-communication-list__icon">
                          <Mail />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <strong>
                              {item.subject
                                || "Email"}
                            </strong>

                            <AdminStatus
                              tone={state.tone}
                            >
                              {state.label}
                            </AdminStatus>

                            <AdminStatus tone="neutral">
                              {statusLabel(
                                item.direction,
                              )}
                            </AdminStatus>
                          </div>

                          {item.body ? (
                            <p>
                              {item.body}
                            </p>
                          ) : null}

                          <small>
                            {dateTime(
                              state.at,
                            )}
                            {item.actorEmail
                              ? ` · ${item.actorEmail}`
                              : ""}
                          </small>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </AdminPanel>



          <div className="crm-lead-workspace-document-grid">
            <AdminPanel
              title="Contracts"
              description="Contract progress from the accepted booking."
              icon={BookOpen}
              compact
            >
              {contract ? (
                <div className="crm-lead-document-summary">
                  <div>
                    <span>Contract</span>
                    <strong>
                      {contract.title
                        || contract.reference}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <AdminStatus
                      tone={
                        contractComplete
                          ? "success"
                          : contract.sentAt
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {contractComplete
                        ? "Signed"
                        : statusLabel(
                            contract.status,
                          )}
                    </AdminStatus>
                  </div>

                  <div>
                    <span>Signatures</span>
                    <strong>
                      {contract.signatureCount}
                      {" / "}
                      {contract.requiredSignatures}
                    </strong>
                  </div>
                </div>
              ) : (
                <AdminEmptyState
                  icon={BookOpen}
                  title="No contract yet"
                  description={
                    detail.job
                      ? "No contract is currently attached to this booking."
                      : "Contract progression begins after quote acceptance."
                  }
                />
              )}
            </AdminPanel>

            <AdminPanel
              title="Questionnaires"
              description="Assigned questionnaires remain part of the same client journey."
              icon={ClipboardList}
              compact
            >
              {!questionnaires.length ? (
                <AdminEmptyState
                  icon={ClipboardList}
                  title="No questionnaire yet"
                  description={
                    detail.job
                      ? "No questionnaire is currently assigned."
                      : "Questionnaire progression begins after booking."
                  }
                />
              ) : (
                <div className="crm-lead-document-list">
                  {questionnaires.map(
                    (item) => (
                      <article key={item.id}>
                        <div>
                          <strong>
                            {item.title}
                          </strong>
                          <small>
                            {item.assignedContactName
                              || "Client"}
                            {item.dueAt
                              ? ` · due ${dateOnly(item.dueAt)}`
                              : ""}
                          </small>
                        </div>

                        <AdminStatus
                          tone={
                            item.status === "completed"
                              ? "success"
                              : item.status === "opened"
                                || item.status === "in_progress"
                                || item.status === "sent"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {statusLabel(
                            item.status,
                          )}
                        </AdminStatus>
                      </article>
                    ),
                  )}
                </div>
              )}
            </AdminPanel>

            <AdminPanel
              title="Invoices"
              description="Invoice, payment and deposit progress from the accepted booking."
              icon={FileText}
              compact
            >
              {invoice ? (
                <div className="crm-lead-document-summary">
                  <div>
                    <span>Invoice</span>
                    <strong>
                      {invoice.reference}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <AdminStatus
                      tone={
                        invoice.balanceAmount <= 0
                          ? "success"
                          : invoice.paidAmount > 0
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {statusLabel(
                        invoice.status,
                      )}
                    </AdminStatus>
                  </div>

                  <div>
                    <span>Total</span>
                    <strong>
                      {money(
                        invoice.totalAmount,
                        invoice.currency,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Paid</span>
                    <strong>
                      {money(
                        invoice.paidAmount,
                        invoice.currency,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Balance</span>
                    <strong>
                      {money(
                        invoice.balanceAmount,
                        invoice.currency,
                      )}
                    </strong>
                  </div>

                  {invoice.nextPayment ? (
                    <div>
                      <span>Next payment</span>
                      <strong>
                        {invoice.nextPayment.label}
                        {invoice.nextPayment.dueDate
                          ? ` · ${dateOnly(invoice.nextPayment.dueDate)}`
                          : ""}
                      </strong>
                    </div>
                  ) : null}
                </div>
              ) : (
                <AdminEmptyState
                  icon={FileText}
                  title="Not invoiced"
                  description={
                    detail.job
                      ? "No invoice is currently attached to this booking."
                      : "Invoice and deposit progression begins after acceptance."
                  }
                />
              )}
            </AdminPanel>

            <AdminPanel
              title="Files"
              description="Private planning files shared across the booked client journey."
              icon={FolderOpen}
              compact
            >
              {jobWorkspace
              && canManage ? (
                <div className="crm-lead-files-upload">
                  <div>
                    <strong>
                      Add planning file
                    </strong>
                    <span>
                      Images, schedules, venue documents,
                      PDFs and other references.
                    </span>
                  </div>

                  <label className="admin-button admin-button--primary admin-button--sm">
                    <Plus className="admin-button__icon" />
                    {saving
                      ? "Working…"
                      : "Upload"}
                    <input
                      type="file"
                      disabled={saving}
                      onChange={(event) => {
                        const file =
                          event.target.files?.[0];

                        void uploadLeadPlanningFile(
                          file,
                        );

                        event.currentTarget.value =
                          "";
                      }}
                    />
                  </label>
                </div>
              ) : null}

              {!detail.job ? (
                <AdminEmptyState
                  icon={FolderOpen}
                  title="Files begin after booking"
                  description="The shared planning-file area becomes available when the lead converts into a Job."
                />
              ) : !workspaceFileCount ? (
                <AdminEmptyState
                  icon={FolderOpen}
                  title="No files uploaded yet"
                  description="The business or client can add private planning files after booking."
                />
              ) : (
                <div className="crm-lead-file-groups">
                  {planningFiles.length ? (
                    <section>
                      <header>
                        <strong>
                          Planning files
                        </strong>
                        <AdminStatus tone="info">
                          {planningFiles.length}
                        </AdminStatus>
                      </header>

                      <div className="crm-job-files">
                        {planningFiles.map(
                          (file) => (
                            <a
                              key={file.id}
                              href={
                                AdminApiService.jobFileUrl(
                                    detail.job!.id,
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
                                      file.fileSize
                                        / 1024,
                                    ),
                                  )}
                                  {" KB"}
                                </small>
                              </span>
                            </a>
                          ),
                        )}
                      </div>
                    </section>
                  ) : null}

                  {questionnaireFiles.length ? (
                    <section>
                      <header>
                        <strong>
                          Questionnaire attachments
                        </strong>
                        <AdminStatus tone="neutral">
                          {questionnaireFiles.length}
                        </AdminStatus>
                      </header>

                      <div className="crm-job-files">
                        {questionnaireFiles.map(
                          (file) => (
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
                                      file.fileSize
                                        / 1024,
                                    ),
                                  )}
                                  {" KB"}
                                </small>
                              </span>
                            </a>
                          ),
                        )}
                      </div>
                    </section>
                  ) : null}
                </div>
              )}
            </AdminPanel>
          </div>
        </main>

        <aside className="crm-lead-workspace-aside">
          <AdminPanel
            title="Journey"
            description="Current client state"
            icon={Check}
            compact
          >
            <dl className="admin-compact-details">
              <div>
                <dt>Lifecycle</dt>
                <dd>{lifecycle}</dd>
              </div>

              <div>
                <dt>Stage</dt>
                <dd>
                  {stage?.name
                    || enquiry.stageName}
                </dd>
              </div>

              <div>
                <dt>Mail</dt>
                <dd>
                  {statusLabel(
                    enquiry.mailStatus,
                  )}
                </dd>
              </div>

              <div>
                <dt>Created</dt>
                <dd>
                  {dateTime(
                    enquiry.createdAt,
                  )}
                </dd>
              </div>

              <div>
                <dt>Updated</dt>
                <dd>
                  {dateTime(
                    enquiry.updatedAt,
                  )}
                </dd>
              </div>
            </dl>

            {detail.job ? (
              <div className="mt-4">
                <Link
                  className="admin-button admin-button--secondary admin-button--sm"
                  to={`/admin/crm/jobs/${detail.job.id}`}
                >
                  <BriefcaseBusiness className="admin-button__icon" />
                  Open Job operations
                </Link>
              </div>
            ) : null}
          </AdminPanel>

          <AdminPanel
            title="History"
            description="Detailed CRM events are kept separate from the concise Journey."
            icon={Clock3}
            compact
          >
            {!detail.activities.length ? (
              <AdminEmptyState
                icon={Clock3}
                title="No history yet"
                description="CRM events will appear here."
              />
            ) : (
              <div className="crm-activity-list">
                {detail.activities.map(
                  (item) => (
                    <div key={item.id}>
                      <span />
                      <section>
                        <strong>
                          {item.summary}
                        </strong>
                        <p>
                          {dateTime(
                            item.createdAt,
                          )}
                          {item.actorEmail
                            ? ` · ${item.actorEmail}`
                            : ""}
                        </p>
                      </section>
                    </div>
                  ),
                )}
              </div>
            )}
          </AdminPanel>

          {canManage
          && enquiry.status !== "won"
          && !detail.job ? (
            <AdminPanel
              title="Close lead"
              description="Lost leads remain part of the client history."
              icon={XCircle}
              compact
            >
              <AdminField label="Reason">
                <textarea
                  className="admin-textarea"
                  value={lostReason}
                  onChange={(event) =>
                    setLostReason(
                      event.target.value,
                    )
                  }
                  placeholder="Unavailable date, no response, chose another supplier…"
                />
              </AdminField>

              <div className="mt-3">
                <AdminButton
                  variant="danger"
                  size="sm"
                  disabled={saving}
                  onClick={() =>
                    void markLost()
                  }
                >
                  Mark lost
                </AdminButton>
              </div>
            </AdminPanel>
          ) : null}
        </aside>
      </div>
    </AdminPage>
  );
}

function ContactEditor({
  title,
  value,
  disabled,
  onChange,
}: {
  title: string;
  value: NonNullable<
    CrmEnquiryInput["primaryContact"]
  >;
  disabled: boolean;
  onChange: (
    value: NonNullable<
      CrmEnquiryInput["primaryContact"]
    >,
  ) => void;
}) {
  return (
    <section className="crm-lead-contact-editor">
      <h3>
        {title}
      </h3>

      <div className="crm-lead-contact-editor__grid">
        <AdminField label="First name">
          <input
            className="admin-input"
            disabled={disabled}
            value={value.firstName || ""}
            onChange={(event) =>
              onChange({
                ...value,
                firstName:
                  event.target.value,
              })
            }
          />
        </AdminField>

        <AdminField label="Last name">
          <input
            className="admin-input"
            disabled={disabled}
            value={value.lastName || ""}
            onChange={(event) =>
              onChange({
                ...value,
                lastName:
                  event.target.value,
              })
            }
          />
        </AdminField>

        <AdminField label="Email">
          <input
            className="admin-input"
            type="email"
            disabled={disabled}
            value={value.email || ""}
            onChange={(event) =>
              onChange({
                ...value,
                email:
                  event.target.value,
              })
            }
          />
        </AdminField>

        <AdminField label="Phone">
          <input
            className="admin-input"
            disabled={disabled}
            value={value.phone || ""}
            onChange={(event) =>
              onChange({
                ...value,
                phone:
                  event.target.value,
              })
            }
          />
        </AdminField>
      </div>
    </section>
  );
}
