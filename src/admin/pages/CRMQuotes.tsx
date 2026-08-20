import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  PackageCheck,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  AdminButton,
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
} from "../components/ui/AdminUI";
import {
  useProfessionalAuth,
} from "../auth/ProfessionalAuth";
import {
  AdminApiService,
} from "../services/AdminApiService";
import type {
  CrmOverview,
  CrmQuoteOverview,
  CrmQuoteTemplate,
  CrmQuoteType,
} from "../types/crm";


function dateLabel(
  value: string,
) {
  if (!value) {
    return "Date TBC";
  }

  const parsed =
    new Date(
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
  value: number,
  currency = "GBP",
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    },
  ).format(
    (value || 0) / 100,
  );
}


function tone(
  status: string,
) {
  return status === "accepted"
    ? "success"
    : status === "declined"
      || status === "expired"
      ? "danger"
      : status === "sent"
        || status === "viewed"
        ? "info"
        : status === "superseded"
          ? "neutral"
          : "warning";
}


function quoteTypeLabel(
  value: CrmQuoteType,
) {
  return value === "fixed"
    ? "Fixed"
    : "Pick & Choose";
}


export function CRMQuotes() {
  const { auth } =
    useProfessionalAuth();

  const navigate =
    useNavigate();

  const [searchParams] =
    useSearchParams();

  const canManage =
    auth.permissions.includes(
      "crm:manage",
    )
    && auth.accessMode !== "support";

  const [
    overview,
    setOverview,
  ] =
    useState<CrmQuoteOverview | null>(
      null,
    );

  const [
    crm,
    setCrm,
  ] =
    useState<CrmOverview | null>(
      null,
    );

  const [
    templates,
    setTemplates,
  ] =
    useState<CrmQuoteTemplate[]>(
      [],
    );

  const [
    selectedEnquiryId,
    setSelectedEnquiryId,
  ] =
    useState("");

  const [
    selectedQuoteType,
    setSelectedQuoteType,
  ] =
    useState<CrmQuoteType>(
      "pick_and_choose",
    );

  const [
    selectedTemplateId,
    setSelectedTemplateId,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");


  async function load() {
    setLoading(true);
    setError("");

    try {
      const [
        quotes,
        crmOverview,
        quoteTemplates,
      ] =
        await Promise.all([
          AdminApiService
            .getCrmQuoteOverview(),
          AdminApiService
            .getCrmOverview(),
          AdminApiService.getCrmQuoteTemplates(),
        ]);

      setOverview(
        quotes,
      );

      setCrm(
        crmOverview,
      );

      setTemplates(
        quoteTemplates,
      );

      const activeTemplates =
        quoteTemplates.filter(
          (template) =>
            template.status
              === "active"
            && template.quoteType
              === "pick_and_choose",
        );

      setSelectedTemplateId(
        (current) =>
          activeTemplates.some(
            (template) =>
              template.id
              === current,
          )
            ? current
            : activeTemplates.find(
                (template) =>
                  template.default,
              )?.id
              || activeTemplates[0]?.id
              || "",
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load quotes.",
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
      auth.workspaceId,
    ],
  );


  const requestedEnquiryId =
    searchParams.get(
      "enquiryId",
    )
    || "";


  useEffect(
    () => {
      if (
        requestedEnquiryId
      ) {
        setSelectedEnquiryId(
          requestedEnquiryId,
        );
      }
    },
    [
      requestedEnquiryId,
    ],
  );


  useEffect(
    () => {
      const matching =
        templates.filter(
          (template) =>
            template.status
              === "active"
            && template.quoteType
              === selectedQuoteType,
        );

      setSelectedTemplateId(
        (current) =>
          matching.some(
            (template) =>
              template.id
              === current,
          )
            ? current
            : matching.find(
                (template) =>
                  template.default,
              )?.id
              || "",
      );
    },
    [
      selectedQuoteType,
      templates,
    ],
  );


  const filtered =
    useMemo(
      () =>
        (overview?.quotes || [])
          .filter(
            (quote) =>
              [
                quote.reference,
                quote.clientName,
                quote.enquiryReference,
                quote.venueText,
                quote.status,
                quote.quoteType,
              ].some(
                (value) =>
                  String(
                    value || "",
                  )
                    .toLowerCase()
                    .includes(
                      search
                        .toLowerCase(),
                    ),
              ),
          ),
      [
        overview,
        search,
      ],
    );


  const availableEnquiries =
    (crm?.enquiries || [])
      .filter(
        (enquiry) =>
          enquiry.status
            === "open"
          && !overview?.quotes.some(
            (quote) =>
              quote.enquiryId
                === enquiry.id
              && quote.status
                === "accepted",
          ),
      );


  const matchingTemplates =
    templates.filter(
      (template) =>
        template.status
          === "active"
        && template.quoteType
          === selectedQuoteType,
    );


  async function create(
    enquiryId: string,
    templateId = "",
    quoteType:
      CrmQuoteType =
      "pick_and_choose",
  ) {
    if (!enquiryId) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const quote =
        templateId
          ? await AdminApiService.createCrmQuote(enquiryId, templateId)
          : await AdminApiService.createCrmQuote(
              enquiryId,
              "",
              quoteType,
            );

      navigate(
        `/admin/crm/quotes/${quote.id}`,
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create quote.",
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <AdminPage>
      <AdminPageHeader
        title="Quotes"
        description="Create Pick & Choose or Fixed quotes, send secure client links and keep every version attached to the client journey."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="admin-button admin-button--secondary"
              to="/admin/crm/templates"
            >
              <Sparkles className="admin-button__icon" />
              Templates
            </Link>

            <Link
              className="admin-button admin-button--secondary"
              to="/admin/crm/catalogue"
            >
              <PackageCheck className="admin-button__icon" />
              Package catalogue
            </Link>
          </div>
        }
      />

      {error ? (
        <div className="admin-alert admin-alert--error">
          {error}
        </div>
      ) : null}

      <AdminPanel
        title="Add new quote"
        description="Choose how the client should receive the commercial offer, then optionally start from a reusable template."
        icon={Plus}
      >
        <div className="crm-quote-type-chooser">
          <button
            type="button"
            className={
              selectedQuoteType
                === "pick_and_choose"
                ? "active"
                : ""
            }
            disabled={
              !canManage
              || saving
            }
            onClick={() =>
              setSelectedQuoteType(
                "pick_and_choose",
              )
            }
          >
            <span className="crm-quote-type-chooser__icon">
              <PackageCheck />
            </span>

            <span>
              <strong>
                Pick & Choose
              </strong>

              <small>
                Present package choices and optional extras for the client to select.
              </small>
            </span>

            <AdminStatus
              tone={
                selectedQuoteType
                  === "pick_and_choose"
                  ? "success"
                  : "neutral"
              }
            >
              {selectedQuoteType
                === "pick_and_choose"
                ? "Selected"
                : "Choose"}
            </AdminStatus>
          </button>

          <button
            type="button"
            className={
              selectedQuoteType
                === "fixed"
                ? "active"
                : ""
            }
            disabled={
              !canManage
              || saving
            }
            onClick={() =>
              setSelectedQuoteType(
                "fixed",
              )
            }
          >
            <span className="crm-quote-type-chooser__icon">
              <FileText />
            </span>

            <span>
              <strong>
                Fixed
              </strong>

              <small>
                Build one exact package with business-defined line items, quantities, discount and total.
              </small>
            </span>

            <AdminStatus
              tone={
                selectedQuoteType
                  === "fixed"
                  ? "success"
                  : "neutral"
              }
            >
              {selectedQuoteType
                === "fixed"
                ? "Selected"
                : "Choose"}
            </AdminStatus>
          </button>
        </div>

        <div className="crm-quote-create-grid">
          <label className="admin-field">
            <span className="admin-field__label">
              Lead
            </span>

            <select
              className="admin-select"
              disabled={
                !canManage
                || saving
              }
              value={
                selectedEnquiryId
              }
              onChange={(event) =>
                setSelectedEnquiryId(
                  event.target.value,
                )
              }
            >
              <option value="">
                Choose lead
              </option>

              {availableEnquiries.map(
                (enquiry) => (
                  <option
                    key={enquiry.id}
                    value={enquiry.id}
                  >
                    {enquiry.reference}
                    {" · "}
                    {enquiry
                      .primaryContact
                      ?.displayName
                      || "Client"}
                    {" · "}
                    {dateLabel(
                      enquiry.eventDate,
                    )}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="admin-field">
            <span className="admin-field__label">
              Quote template
            </span>

            <select
              className="admin-select"
              disabled={
                !canManage
                || saving
              }
              value={
                selectedTemplateId
              }
              onChange={(event) =>
                setSelectedTemplateId(
                  event.target.value,
                )
              }
            >
              <option value="">
                Blank {quoteTypeLabel(selectedQuoteType)} quote
              </option>

              {matchingTemplates.map(
                (template) => (
                  <option
                    key={template.id}
                    value={template.id}
                  >
                    {template.name}
                    {template.default
                      ? " · default"
                      : ""}
                  </option>
                ),
              )}
            </select>
          </label>

          <AdminButton
            variant="primary"
            icon={Plus}
            disabled={
              !canManage
              || saving
              || !selectedEnquiryId
            }
            onClick={() =>
              void create(
                selectedEnquiryId,
                selectedTemplateId,
                selectedQuoteType,
              )
            }
          >
            {saving
              ? "Creating…"
              : selectedTemplateId
                ? "Create from template"
                : `Create ${quoteTypeLabel(selectedQuoteType)} quote`}
          </AdminButton>
        </div>

        <div className="crm-quote-create-help">
          <Sparkles />

          <span>
            <strong>
              {selectedTemplateId
                ? templates.find(
                    (template) =>
                      template.id
                      === selectedTemplateId,
                  )?.name
                  || "Template selected"
                : `Blank ${quoteTypeLabel(selectedQuoteType)} quote`}
            </strong>

            <small>
              {selectedTemplateId
                ? "The template is copied into a new editable quote snapshot. Editing this quote will not change the source template."
                : selectedQuoteType
                    === "fixed"
                  ? "Start with one exact package and add quote-specific line items where required."
                  : "Start without predefined package choices and build the client selection manually."}
            </small>
          </span>

          <Link to="/admin/crm/templates">
            Manage templates
          </Link>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Quote register"
        description={`${overview?.quotes.length || 0} quotes across this workspace`}
        icon={FileText}
        actions={
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />

            <input
              className="admin-input pl-9"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search quotes"
            />
          </div>
        }
      >
        {loading ? (
          <p className="text-[10px] text-neutral-500">
            Loading quotes…
          </p>
        ) : !filtered.length ? (
          <AdminEmptyState
            icon={FileText}
            title="No quotes found"
            description="Create a quote from an open lead."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Quote</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Event</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Representative total</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(
                  (quote) => (
                    <tr key={quote.id}>
                      <td>
                        <Link
                          className="admin-inline-link"
                          to={`/admin/crm/quotes/${quote.id}`}
                        >
                          {quote.reference}
                        </Link>

                        <div className="text-[9px] text-neutral-500">
                          {quote.enquiryReference}
                        </div>
                      </td>

                      <td>
                        {quote.clientName}

                        <div className="text-[9px] text-neutral-500">
                          {quote.clientEmail}
                        </div>
                      </td>

                      <td>
                        <AdminStatus
                          tone={
                            quote.quoteType
                              === "fixed"
                              ? "neutral"
                              : "info"
                          }
                        >
                          {quoteTypeLabel(
                            quote.quoteType,
                          )}
                        </AdminStatus>
                      </td>

                      <td>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={11} />
                          {dateLabel(
                            quote.eventDate,
                          )}
                        </span>

                        <div className="text-[9px] text-neutral-500">
                          {quote.venueText
                            || "Venue TBC"}
                        </div>
                      </td>

                      <td>
                        v
                        {quote.currentVersion
                          ?.versionNumber
                          || 1}
                      </td>

                      <td>
                        <AdminStatus
                          tone={
                            tone(
                              quote.status,
                            ) as any
                          }
                        >
                          {quote.status}
                        </AdminStatus>
                      </td>

                      <td>
                        {money(
                          quote.currentVersion
                            ?.totalAmount
                            || 0,
                          quote.currency,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </AdminPage>
  );
}
