import { AdminActionButton, AdminActionLabel, AdminActionLink, AdminActionRouterLink } from "../components/ui/AdminActionControl";
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
  Globe2,
  Images,
  LayoutDashboard,
  MessageCircle,
  MessageSquareText,
  Users,
  Trash2,
  X,
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
  AdminAccordion,
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
  CrmDeletePreflight,
  CrmDeletePreflightItem,
} from "../types/crm";
import {
  CRMClientsPanel,
  CRMWeddingWorkflowPanel,
  CRMWeddingDetailsPanel,
} from "../components/crm/CRMWeddingWorkspaceShared";


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

  const [
    deleteOpen,
    setDeleteOpen,
  ] = useState(false);

  const [
    deleteBusy,
    setDeleteBusy,
  ] = useState(false);

  const [
    deleteConfirm,
    setDeleteConfirm,
  ] = useState("");

  const [
    deleteError,
    setDeleteError,
  ] = useState("");

  const [
    deletePreflight,
    setDeletePreflight,
  ] =
    useState<
      CrmDeletePreflight | null
    >(null);

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


  async function saveContextualDetails(
    input: {
      jobName: string;
      eventDate: string;
      venue: string;
      leadSource: string;
      stageId: string;
      service: string;
      campaign: string;
      notes: string;
    },
  ) {
    setSaving(true);
    setError("");
    setMessage("");

    const booked =
      Boolean(
        detail?.job?.id,
      );

    try {
      if (
        booked
        && detail?.job?.id
      ) {
        await AdminApiService
          .updateCrmJobWeddingDetails(
            detail.job.id,
            {
              title:
                input.jobName,
              eventDate:
                input.eventDate,
              venueText:
                input.venue,
              leadSource:
                input.leadSource,
            },
          );
      } else {
        await AdminApiService
          .updateCrmEnquiry(
            id,
            {
              stageId:
                input.stageId,
              serviceInterest:
                input.service,
              eventDate:
                input.eventDate,
              venueText:
                input.venue,
              leadSource:
                input.leadSource,
              campaign:
                input.campaign,
              notes:
                input.notes,
            },
          );
      }

      await load();

      setMessage(
        booked
          ? "Wedding details saved."
          : "Lead details saved.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : booked
            ? "Unable to save Wedding details."
            : "Unable to save Lead details.",
      );

      throw saveError;
    } finally {
      setSaving(false);
    }
  }


  async function openLeadDeleteDialog() {
    setDeleteOpen(true);
    setDeleteBusy(true);
    setDeleteConfirm("");
    setDeleteError("");
    setDeletePreflight(null);

    try {
      setDeletePreflight(
        await AdminApiService
          .getCrmEnquiryDeletePreflight(
            id,
          ),
      );
    } catch (preflightError) {
      setDeleteError(
        preflightError
          instanceof Error
          ? preflightError.message
          : "Unable to check whether this Lead can be deleted.",
      );
    } finally {
      setDeleteBusy(false);
    }
  }


  function closeLeadDeleteDialog() {
    if (deleteBusy) {
      return;
    }

    setDeleteOpen(false);
    setDeleteConfirm("");
    setDeleteError("");
    setDeletePreflight(null);
  }


  async function permanentlyDeleteLead() {
    if (
      deleteBusy
      || !deletePreflight
      || !deletePreflight.canDelete
      || deleteConfirm
        !== deletePreflight
          .confirmationText
    ) {
      return;
    }

    setDeleteBusy(true);
    setDeleteError("");

    try {
      await AdminApiService
        .deleteCrmEnquiryPermanently(
          id,
          deleteConfirm,
        );

      setDeleteOpen(false);

      navigate(
        "/admin/crm",
        {
          replace: true,
        },
      );
    } catch (deleteActionError) {
      setDeleteError(
        deleteActionError
          instanceof Error
          ? deleteActionError.message
          : "Unable to permanently delete this Lead.",
      );

      /*
       * The server re-runs preflight immediately
       * before deletion. Refresh the visible policy
       * if a blocker appeared after the dialog opened.
       */
      try {
        setDeletePreflight(
          await AdminApiService
            .getCrmEnquiryDeletePreflight(
              id,
            ),
        );
      } catch {
        // Keep the original deletion error visible.
      }
    } finally {
      setDeleteBusy(false);
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


  async function createLeadClientGallery() {
    const jobId =
      detail?.job?.id;

    if (
      !jobId
      || !canManage
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result =
        await AdminApiService
          .createCrmJobClientGallery(
            jobId,
          );

      setJobWorkspace(
        result.workspace,
      );

      setMessage(
        result.idempotent
          ? "The existing linked client gallery is ready to open."
          : "Client gallery created from this Wedding workspace.",
      );
    } catch (galleryError) {
      setError(
        galleryError instanceof Error
          ? galleryError.message
          : "Unable to create the client gallery.",
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

    const leadPreviewsTask =
      jobWorkspace?.tasks.find(
        (task) =>
          task.status !== "cancelled"
          && task.taskType === "milestone"
          && task.title.trim().toLowerCase()
            === "previews sent",
      );

    const leadDeliveryTask =
      jobWorkspace?.tasks.find(
        (task) =>
          task.status !== "cancelled"
          && task.taskType === "milestone"
          && task.title.trim().toLowerCase()
            === "client photos delivered",
      );

    const leadPreviewsComplete =
      leadPreviewsTask?.status
        === "completed";

    const leadDeliveryComplete =
      leadDeliveryTask?.status
        === "completed";


    const leadLifecycle =
      jobWorkspace?.lifecycle
      || null;

    const leadPrimaryGallery =
      leadLifecycle
        ?.primaryClientGallery
      || null;

    const leadStoryLabel =
      leadLifecycle
        ? leadLifecycle.story.state
            === "not_started"
          ? "Not started"
          : statusLabel(
              leadLifecycle.story.state,
            )
        : "After booking";

    const leadBookingQuestionnaire =
      questionnaires.find(
        (item) =>
          item.status !== "completed",
      )
      || questionnaires[0]
      || null;

  return (
    <AdminPage className="crm-lead-workspace-page crm-job-operations-page">
      <AdminPageHeader
        className="crm-job-page-header"
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

      <div className="crm-job-primary-grid">
        <div className="crm-job-primary-grid__workflow">
          <CRMWeddingWorkflowPanel
            leadCreatedAt={
              enquiry.createdAt
            }
            jobAccepted={
              Boolean(
                detail.job,
              )
            }
            jobAcceptedAt={
              detail.job?.bookingDate
              || detail.job?.createdAt
              || ""
            }
            eventDate={
              enquiry.eventDate
              || ""
            }
            venue={
              enquiry.venueText
              || ""
            }
            previewsComplete={
              leadPreviewsComplete
            }
            previewsCompletedAt={
              leadPreviewsTask?.completedAt
              || ""
            }
            deliveryComplete={
              leadDeliveryComplete
            }
            deliveryCompletedAt={
              leadDeliveryTask?.completedAt
              || ""
            }
            formatDate={
              dateOnly
            }
          />
        </div>


        <div className="crm-job-primary-grid__wedding">
          <CRMWeddingDetailsPanel
              mode={
                detail.job?.id
                  ? "wedding"
                  : "lead"
              }
              jobName={
                detail.job?.title
                || ""
              }
              eventDate={
                detail.job?.eventDate
                || enquiry.eventDate
                || ""
              }
              venue={
                detail.job?.venueText
                || enquiry.venueText
                || ""
              }
              leadSource={
                detail.job?.leadSource
                || enquiry.leadSource
                || ""
              }
              stageId={
                form.stageId
                || enquiry.stageId
                || ""
              }
              stageName={
                stage?.name
                || ""
              }
              stageOptions={
                (overview?.stages || [])
                  .filter(
                    (item) =>
                      item.type === "open"
                      || item.id
                        === (
                          form.stageId
                          || enquiry.stageId
                        ),
                  )
                  .map(
                    (item) => ({
                      id: item.id,
                      name: item.name,
                    }),
                  )
              }
              service={
                form.serviceInterest
                || enquiry.serviceInterest
                || ""
              }
              technicalSource={
                form.source
                || enquiry.source
                || ""
              }
              campaign={
                form.campaign
                || enquiry.campaign
                || ""
              }
              notes={
                form.notes
                || enquiry.notes
                || ""
              }
              formatDate={dateOnly}
              canEdit={canManage}
              busy={saving}
              onSave={
                saveContextualDetails
              }
            />
        </div>

        <div className="crm-job-primary-grid__clients">
          <CRMClientsPanel
            contacts={
              detail.contacts
            }
            getPortalState={(
              contact,
            ) => {
              if (!contact.email) {
                return {
                  status:
                    "email-required",
                  label:
                    "Email required",
                };
              }

              if (!detail.job) {
                return {
                  status:
                    "not-invited",
                  label:
                    "Begins after booking",
                };
              }

              const access =
                jobWorkspace
                  ?.portalAccess
                  .find(
                    (item) =>
                      item.contactId
                        === contact.id
                      && item.status
                        === "active",
                  );

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
          />
        </div>
      </div>

      <div className="crm-job-summary-grid">
        <div className="crm-job-summary-grid__column crm-job-summary-grid__column--commercial">
          <AdminPanel
            title="Booking and payments"
            icon={BriefcaseBusiness}
            className="crm-booking-summary-panel"
          >
            <div className="crm-booking-summary-list">
              {invoice ? (
                <article className="crm-booking-summary-row">

                  <div className="crm-booking-summary-row__copy">
                    <div className="crm-booking-summary-row__heading">
                      <span>
                        Invoice
                      </span>

                      <strong>
                        {invoice.reference}
                      </strong>
                    </div>

                    <p className="crm-booking-summary-row__detail">
                      Total{" "}
                      {money(
                        invoice.totalAmount,
                        invoice.currency,
                      )}
                      {" · "}
                      Paid{" "}
                      {money(
                        invoice.paidAmount,
                        invoice.currency,
                      )}
                      {" · "}
                      Balance{" "}
                      {money(
                        invoice.balanceAmount,
                        invoice.currency,
                      )}
                    </p>

                    {invoice.nextPayment ? (
                      <small className="crm-booking-summary-row__detail crm-commercial-card__next">
                        Next payment ·{" "}
                        {invoice.nextPayment.label}
                        {invoice.nextPayment.dueDate
                          ? ` · Due ${dateOnly(
                              invoice.nextPayment.dueDate,
                            )}`
                          : ""}
                      </small>
                    ) : null}
                  </div>

                  <span
                    className={
                      `crm-commercial-summary-state crm-booking-summary-row__state is-${invoice.status}`
                    }
                  >
                    {statusLabel(
                      invoice.status,
                    )}
                  </span>

                  {detail.job ? (
                    <AdminActionRouterLink
                      className="admin-icon-control crm-commercial-card__open crm-booking-summary-row__action"
                      to={`/admin/crm/jobs/${detail.job.id}/invoices/${invoice.id}`}
                      aria-label={`Open invoice ${invoice.reference}`}
                      title="Open invoice"
                    >
                      <ExternalLink aria-hidden="true" />
                    </AdminActionRouterLink>
                  ) : (
                    <span className="crm-commercial-summary-action-spacer crm-booking-summary-row__action-spacer" />
                  )}
                </article>
              ) : (
                <article className="crm-booking-summary-row">

                  <div className="crm-booking-summary-row__copy">
                    <div className="crm-booking-summary-row__heading">
                      <span>
                        Invoice
                      </span>

                      <strong>
                        No invoice yet
                      </strong>
                    </div>

                    <small className="crm-booking-summary-row__detail">
                      After booking
                    </small>
                  </div>

                  <span className="crm-commercial-summary-state crm-booking-summary-row__state is-inactive">
                    Not generated
                  </span>

                  <span className="crm-commercial-summary-action-spacer crm-booking-summary-row__action-spacer" />
                </article>
              )}

              <article className="crm-booking-summary-row">

                <div className="crm-booking-summary-row__copy">
                  <div className="crm-booking-summary-row__heading">
                    <span>
                      Contract
                    </span>

                    <strong>
                      {contract?.reference
                        || "No contract yet"}
                    </strong>
                  </div>

                  {contract ? (
                    <p className="crm-booking-summary-row__detail">
                      {contract.title}
                      {" · "}
                      Signatures{" "}
                      {contract.signatureCount}
                      /{contract.requiredSignatures}
                    </p>
                  ) : (
                    <small className="crm-booking-summary-row__detail">
                      After booking
                    </small>
                  )}
                </div>

                <span
                  className={
                    `crm-commercial-summary-state crm-booking-summary-row__state ${
                      contract
                        ? `is-${contract.status}`
                        : "is-inactive"
                    }`
                  }
                >
                  {contract
                    ? contractComplete
                      ? "Signed"
                      : statusLabel(
                          contract.status,
                        )
                    : "Not generated"}
                </span>

                <span className="crm-commercial-summary-action-spacer crm-booking-summary-row__action-spacer" />
              </article>

              <article className="crm-booking-summary-row">

                <div className="crm-booking-summary-row__copy">
                  <div className="crm-booking-summary-row__heading">
                    <span>
                      Questionnaire
                    </span>

                    <strong>
                      {leadBookingQuestionnaire?.title
                        || "No booking questionnaire"}
                    </strong>
                  </div>

                  <small className="crm-booking-summary-row__detail">
                    {leadBookingQuestionnaire
                      ? leadBookingQuestionnaire.dueAt
                        ? `Planning target ${dateOnly(
                            leadBookingQuestionnaire.dueAt,
                          )}`
                        : "Assigned with no due date"
                      : detail.job
                        ? "No questionnaire currently assigned"
                        : "After booking"}
                  </small>
                </div>

                <span
                  className={
                    `crm-commercial-summary-state crm-booking-summary-row__state ${
                      leadBookingQuestionnaire
                        ? `is-${leadBookingQuestionnaire.status}`
                        : "is-inactive"
                    }`
                  }
                >
                  {leadBookingQuestionnaire
                    ? statusLabel(
                        leadBookingQuestionnaire.status,
                      )
                    : "Not assigned"}
                </span>

                <AdminActionLink
                  className="admin-icon-control crm-commercial-card__open crm-booking-summary-row__action"
                  href="#lead-questionnaires"
                  aria-label="Open Questionnaire section"
                  title="Open questionnaire"
                >
                  <ExternalLink aria-hidden="true" />
                </AdminActionLink>
              </article>

              {journeyQuote ? (
                <article className="crm-booking-summary-row">

                  <div className="crm-booking-summary-row__copy">
                    <div className="crm-booking-summary-row__heading">
                      <span>
                        {detail.job
                          ? "Accepted quote"
                          : "Quote"}
                      </span>

                      <strong>
                        {journeyQuote.reference}
                      </strong>
                    </div>

                    <p className="crm-booking-summary-row__detail">
                      {journeyQuote.quoteType
                        === "fixed"
                        ? "Fixed"
                        : "Pick & Choose"}
                      {" · "}
                      Total{" "}
                      {money(
                        journeyQuote.currentVersion
                          ?.totalAmount
                          || 0,
                        journeyQuote.currency
                          || "GBP",
                      )}
                    </p>
                  </div>

                  <span
                    className={
                      `crm-commercial-summary-state crm-booking-summary-row__state is-${journeyQuote.status}`
                    }
                  >
                    {statusLabel(
                      journeyQuote.status,
                    )}
                  </span>

                  <AdminActionRouterLink
                    className="admin-icon-control crm-commercial-card__open crm-booking-summary-row__action"
                    to={`/admin/crm/quotes/${journeyQuote.id}`}
                    aria-label={`Open quote ${journeyQuote.reference}`}
                    title="Open quote"
                  >
                    <ExternalLink aria-hidden="true" />
                  </AdminActionRouterLink>
                </article>
              ) : (
                <article className="crm-booking-summary-row">

                  <div className="crm-booking-summary-row__copy">
                    <div className="crm-booking-summary-row__heading">
                      <span>
                        Quote
                      </span>

                      <strong>
                        No quote created
                      </strong>
                    </div>

                    <small className="crm-booking-summary-row__detail">
                      Create a quote when the Lead is ready for pricing
                    </small>
                  </div>

                  <span className="crm-commercial-summary-state crm-booking-summary-row__state is-inactive">
                    Not created
                  </span>

                  <span className="crm-commercial-summary-action-spacer crm-booking-summary-row__action-spacer" />
                </article>
              )}
            </div>
          </AdminPanel>
        </div>

        <div className="crm-job-summary-grid__column crm-job-summary-grid__column--delivery">
          <AdminPanel
            title="Wedding delivery and content"
            icon={LayoutDashboard}
            className="crm-delivery-summary-panel"
          >
            <div className="crm-delivery-summary-list">
              <article className="crm-delivery-summary-row">
                <strong>
                  Wedding Workspace
                </strong>

                <span
                  className={
                  `crm-delivery-summary-state ${
                    leadLifecycle?.wedding.exists
                      ? "is-ready"
                      : ""
                  }`
                }
                >
                  {leadLifecycle?.wedding.exists
                                        ? "Ready"
                                        : "After booking"}
                </span>

                {leadLifecycle?.wedding.exists ? (
                  <AdminActionRouterLink
                    className="admin-icon-control crm-delivery-summary-action"
                    to={`/admin/weddings/${leadLifecycle.wedding.slug}/workspace`}
                    aria-label="Open Wedding Workspace"
                    title="Open Wedding Workspace"
                  >
                    <ExternalLink aria-hidden="true" />
                  </AdminActionRouterLink>
                ) : (
                  <span className="crm-delivery-summary-action-spacer" />
                )}
              </article>

              <article className="crm-delivery-summary-row">
                <strong>
                  Wedding assets
                </strong>

                <span
                  className="crm-delivery-summary-state"
                >
                  {leadLifecycle?.wedding.exists
                                        ? `${leadLifecycle.wedding.assetCount} photographs`
                                        : "After booking"}
                </span>

                {leadLifecycle?.wedding.exists ? (
                  <AdminActionRouterLink
                    className="admin-icon-control crm-delivery-summary-action"
                    to={`/admin/weddings/${leadLifecycle.wedding.slug}/workspace#preview-upload`}
                    aria-label="Manage Wedding assets"
                    title="Manage Wedding assets"
                  >
                    <ExternalLink aria-hidden="true" />
                  </AdminActionRouterLink>
                ) : (
                  <span className="crm-delivery-summary-action-spacer" />
                )}
              </article>

              <article className="crm-delivery-summary-row">
                <strong>
                  Client Gallery
                </strong>

                <span
                  className="crm-delivery-summary-state"
                >
                  {leadPrimaryGallery
                                        ? leadPrimaryGallery.title
                                        : detail.job
                                          ? "Not created"
                                          : "After booking"}
                </span>

                {leadPrimaryGallery ? (
                  <AdminActionRouterLink
                    className="admin-icon-control crm-delivery-summary-action"
                    to={`/admin/client-galleries/${leadPrimaryGallery.id}`}
                    aria-label="Open Client Gallery"
                    title="Open Client Gallery"
                  >
                    <ExternalLink aria-hidden="true" />
                  </AdminActionRouterLink>
                ) : detail.job
                  && leadLifecycle?.wedding.exists
                  && canManage ? (
                  <AdminActionButton
                    type="button"
                    className="admin-icon-control crm-delivery-summary-action"
                    disabled={saving}
                    onClick={() =>
                      void createLeadClientGallery()
                    }
                    aria-label="Create Client Gallery"
                    title="Create Client Gallery"
                  >
                    <Plus aria-hidden="true" />
                  </AdminActionButton>
                ) : (
                  <span className="crm-delivery-summary-action-spacer" />
                )}
              </article>

              <article className="crm-delivery-summary-row">
                <strong>
                  Wedding Story
                </strong>

                <span
                  className="crm-delivery-summary-state"
                >
                  {leadStoryLabel}
                </span>

                {leadLifecycle?.wedding.exists ? (
                  <AdminActionRouterLink
                    className="admin-icon-control crm-delivery-summary-action"
                    to={`/admin/weddings/${leadLifecycle.wedding.slug}/content`}
                    aria-label={
                      leadLifecycle.story.state
                        === "not_started"
                        ? "Start Wedding Story"
                        : "Edit Wedding Story"
                    }
                    title={
                      leadLifecycle.story.state
                        === "not_started"
                        ? "Start Wedding Story"
                        : "Edit Wedding Story"
                    }
                  >
                    {leadLifecycle.story.state
                      === "not_started"
                      ? <Plus aria-hidden="true" />
                      : <ExternalLink aria-hidden="true" />}
                  </AdminActionRouterLink>
                ) : (
                  <span className="crm-delivery-summary-action-spacer" />
                )}
              </article>

              <article className="crm-delivery-summary-row">
                <strong>
                  Website galleries
                </strong>

                <span
                  className="crm-delivery-summary-state"
                >
                  {leadLifecycle?.wedding.exists
                                        ? `${leadLifecycle.publicAssignments.total} assignments`
                                        : "After booking"}
                </span>

                {leadLifecycle?.wedding.exists ? (
                  <AdminActionRouterLink
                    className="admin-icon-control crm-delivery-summary-action"
                    to={`/admin/weddings/${leadLifecycle.wedding.slug}/workspace#publishing-destinations`}
                    aria-label="Manage Website galleries"
                    title="Manage Website galleries"
                  >
                    <ExternalLink aria-hidden="true" />
                  </AdminActionRouterLink>
                ) : (
                  <span className="crm-delivery-summary-action-spacer" />
                )}
              </article>
            </div>
          </AdminPanel>
        </div>
      </div>

      <div className="crm-job-operations-grid">
        <div className="crm-job-operations-column">
          <AdminAccordion
            title="Quote and package"
            icon={PackageCheck}
            defaultOpen
            summary={
              <AdminStatus
                tone={
                  journeyQuote?.status === "accepted"
                    ? "success"
                    : journeyQuote
                      ? "info"
                      : "neutral"
                }
              >
                {journeyQuote
                  ? statusLabel(
                      journeyQuote.status,
                    )
                  : "Not created"}
              </AdminStatus>
            }
          >
            {canManage
            && !detail.job
            && !quotes.length ? (
              <div className="mb-3 flex justify-end">
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
              </div>
            ) : null}

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

                        <AdminActionRouterLink
                          className="admin-icon-control crm-lead-quote-row__action"
                          to={`/admin/crm/quotes/${quote.id}`}
                          aria-label={`Open quote ${quote.reference}`}
                          title="Open quote"
                        >
                          <ExternalLink aria-hidden="true" />
                        </AdminActionRouterLink>
                      </article>
                    ),
                  )}
                </div>
              )}

          </AdminAccordion>

          <AdminAccordion
            title="Communication"
            icon={MessageCircle}
            summary={
              <AdminStatus tone="neutral">
                {mailCommunications.length} records
              </AdminStatus>
            }
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

          </AdminAccordion>
        </div>

        <div className="crm-job-operations-column">
          <div
            id="lead-questionnaires"
            className="scroll-mt-5"
          >
            <AdminAccordion
              title="Questionnaires"
              icon={ClipboardList}
              summary={
                <AdminStatus tone="neutral">
                  {questionnaires.length}
                </AdminStatus>
              }
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

            </AdminAccordion>
          </div>

          <AdminAccordion
            title="Supplier team"
            icon={Users}
            summary={
              <AdminStatus tone="neutral">
                {jobWorkspace?.linkedSuppliers.length || 0} linked
              </AdminStatus>
            }
          >
            {!detail.job ? (
              <AdminEmptyState
                icon={Users}
                title="After booking"
                description="The Wedding supplier team becomes available when this Lead converts to a Job."
              />
            ) : !jobWorkspace?.linkedSuppliers.length ? (
              <AdminEmptyState
                icon={Users}
                title="No suppliers linked"
                description="Supplier records linked to this Wedding will appear here."
              />
            ) : (
              <div className="crm-lead-document-list">
                {jobWorkspace.linkedSuppliers.map(
                  (supplier) => (
                    <article key={supplier.id}>
                      <div>
                        <strong>
                          {supplier.displayName
                            || supplier.name}
                        </strong>

                        <small>
                          {supplier.role
                            || supplier.category
                            || "Supplier"}
                        </small>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </AdminAccordion>

          <AdminAccordion
            title="Files"
            icon={FolderOpen}
            summary={
              <AdminStatus tone="neutral">
                {workspaceFileCount}
              </AdminStatus>
            }
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

                  <AdminActionLabel className="admin-button admin-button--primary admin-button--sm">
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
                  </AdminActionLabel>
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

          </AdminAccordion>

          <AdminAccordion
            title="Notes and activity"
            icon={MessageSquareText}
            summary={
              <AdminStatus tone="neutral">
                {detail.activities.length} events
              </AdminStatus>
            }
          >
            {enquiry.notes ? (
              <div className="mb-4">
                <strong className="block text-[10px] font-semibold text-neutral-700">
                  Original enquiry notes
                </strong>

                <p className="mt-1 whitespace-pre-wrap text-[10px] leading-5 text-neutral-500">
                  {enquiry.notes}
                </p>
              </div>
            ) : null}

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

          </AdminAccordion>
        </div>
      </div>

      {canManage
      && enquiry.status !== "won"
      && !detail.job ? (
        <AdminAccordion
          title="Close lead"
          icon={XCircle}
        >
          <div className="crm-lead-close-actions">
            <section className="crm-lead-close-option">
              <div className="crm-lead-close-option__heading">
                <strong>
                  Mark lost
                </strong>

                <p>
                  Use this for a normal business outcome such as no response,
                  unavailable date or the client choosing another supplier.
                  The Lead and its history remain in CRM.
                </p>
              </div>

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

              <div>
                <AdminButton
                  variant="danger"
                  size="sm"
                  disabled={
                    saving
                    || deleteBusy
                  }
                  onClick={() =>
                    void markLost()
                  }
                >
                  Mark lost
                </AdminButton>
              </div>
            </section>

            <section className="crm-lead-close-option crm-lead-close-option--danger">
              <div className="crm-lead-close-option__heading">
                <strong>
                  Delete permanently
                </strong>

                <p>
                  Use only for duplicate, test or incorrectly created Leads.
                  WedCRM checks dependencies first. Master client records are
                  preserved.
                </p>
              </div>

              <div>
                <AdminButton
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  disabled={
                    saving
                    || deleteBusy
                  }
                  onClick={() =>
                    void openLeadDeleteDialog()
                  }
                >
                  {deleteBusy
                    ? "Checking…"
                    : "Delete permanently"}
                </AdminButton>
              </div>
            </section>
          </div>
        </AdminAccordion>
      ) : null}


      {deleteOpen ? (
        <div
          className="crm-delete-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="crm-lead-delete-title"
        >
          <button
            type="button"
            className="crm-delete-dialog__backdrop"
            aria-label="Close permanent deletion dialog"
            disabled={deleteBusy}
            onClick={
              closeLeadDeleteDialog
            }
          />

          <section className="crm-delete-dialog__panel">
            <header className="crm-delete-dialog__header">
              <div>
                <span>
                  Permanent deletion
                </span>

                <h2 id="crm-lead-delete-title">
                  Delete{" "}
                  {deletePreflight?.displayName
                    || enquiry.reference}
                  ?
                </h2>

                <p>
                  This action cannot be undone.
                  WedCRM checks the record immediately
                  before deletion so newly linked work
                  cannot be removed accidentally.
                </p>
              </div>

              <AdminActionButton
                type="button"
                className="admin-icon-control"
                aria-label="Close delete dialog"
                title="Close"
                disabled={deleteBusy}
                onClick={
                  closeLeadDeleteDialog
                }
              >
                <X aria-hidden="true" />
              </AdminActionButton>
            </header>

            {deleteBusy
            && !deletePreflight ? (
              <div className="crm-delete-dialog__loading">
                Checking Lead dependencies…
              </div>
            ) : null}

            {deleteError ? (
              <div className="admin-alert admin-alert--error">
                {deleteError}
              </div>
            ) : null}

            {deletePreflight ? (
              <>
                <div className="crm-delete-preflight">
                  <DeletePreflightGroup
                    title="Will be deleted"
                    tone="delete"
                    items={
                      deletePreflight
                        .willDelete
                    }
                  />

                  <DeletePreflightGroup
                    title="Will be preserved"
                    tone="preserve"
                    items={
                      deletePreflight
                        .willPreserve
                    }
                  />

                  <DeletePreflightGroup
                    title="Cannot delete until resolved"
                    tone="blocker"
                    items={
                      deletePreflight
                        .blockers
                    }
                  />
                </div>

                {deletePreflight.canDelete ? (
                  <div className="crm-delete-dialog__confirmation">
                    <label htmlFor="crm-lead-delete-confirmation">
                      Type{" "}
                      <strong>
                        DELETE
                      </strong>{" "}
                      to confirm
                    </label>

                    <input
                      id="crm-lead-delete-confirmation"
                      className="admin-input"
                      autoFocus
                      autoComplete="off"
                      value={deleteConfirm}
                      disabled={deleteBusy}
                      placeholder="DELETE"
                      onChange={(event) =>
                        setDeleteConfirm(
                          event.target.value,
                        )
                      }
                    />
                  </div>
                ) : (
                  <div className="crm-delete-dialog__blocked">
                    Permanent deletion is unavailable
                    until every blocker above has been
                    resolved.
                  </div>
                )}
              </>
            ) : null}

            <footer className="crm-delete-dialog__actions">
              <AdminButton
                variant="secondary"
                disabled={deleteBusy}
                onClick={
                  closeLeadDeleteDialog
                }
              >
                Cancel
              </AdminButton>

              <AdminButton
                variant="danger"
                icon={Trash2}
                disabled={
                  deleteBusy
                  || !deletePreflight
                  || !deletePreflight
                    .canDelete
                  || deleteConfirm
                    !== deletePreflight
                      .confirmationText
                }
                onClick={() =>
                  void permanentlyDeleteLead()
                }
              >
                {deleteBusy
                  ? "Deleting…"
                  : "Delete permanently"}
              </AdminButton>
            </footer>
          </section>
        </div>
      ) : null}
    </AdminPage>
  );
}

function DeletePreflightGroup({
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
    CrmDeletePreflightItem[];
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
