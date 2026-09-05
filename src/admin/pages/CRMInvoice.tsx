import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
} from "lucide-react";

import {
  CrmInvoicePaymentForm,
} from "../components/CrmInvoicePaymentForm";

import {
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
import {
  CRMRecordBackLink,
} from "../components/crm/CRMRecordBackLink";

import type {
  CrmJobWorkspace,
} from "../types/crm";


function money(
  minor: number,
  currency = "GBP",
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency,
    },
  ).format(
    (Number(minor) || 0) / 100,
  );
}


function dateLabel(
  value?: string,
) {
  if (!value) return "Not set";

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


function invoiceTone(
  status: string,
):
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info" {
  if (status === "paid") {
    return "success";
  }

  if (status === "void") {
    return "danger";
  }

  if (status === "part_paid") {
    return "info";
  }

  if (status === "issued") {
    return "warning";
  }

  return "neutral";
}


export function CRMInvoice() {
  const {
    jobId = "",
    invoiceId = "",
  } = useParams();

  const {
    auth,
  } = useProfessionalAuth();

  const [
    workspace,
    setWorkspace,
  ] = useState<
    CrmJobWorkspace | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

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
    && auth.accessMode !== "support";


  async function load() {
    setLoading(true);
    setError("");

    try {
      const result =
        await AdminApiService
          .getCrmJobWorkspace(
            jobId,
          );

      setWorkspace(
        result,
      );

      if (
        !result.commercial.invoice
        || result
          .commercial
          .invoice
          .id
          !== invoiceId
      ) {
        setError(
          "Invoice not found for this Job.",
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load invoice.",
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
      jobId,
      invoiceId,
      auth.workspaceId,
    ],
  );


  if (
    loading
    && !workspace
  ) {
    return (
      <AdminPage>
        <p className="text-sm text-neutral-500">
          Loading invoice…
        </p>
      </AdminPage>
    );
  }


  const invoice =
    workspace
      ?.commercial
      .invoice
    || null;


  if (
    !workspace
    || !invoice
    || invoice.id !== invoiceId
  ) {
    return (
      <AdminPage>
        <div className="admin-alert admin-alert--error">
          {error
            || "Invoice not found."}
        </div>
      </AdminPage>
    );
  }


  const job =
    workspace.job;


  return (
    <AdminPage className="crm-invoice-page">
      <AdminPageHeader
        title={invoice.reference}
        description={[
          job.title,
          dateLabel(job.eventDate),
          job.venueText
            || "Venue TBC",
        ].join(" · ")}
        actions={
          <CRMRecordBackLink
            jobId={job.id}
            fallbackTo="/admin/crm?view=jobs"
            fallbackLabel="Back to Jobs"
          />
        }
        meta={
          <AdminStatus
            tone={
              invoiceTone(
                invoice.status,
              )
            }
          >
            {invoice.status.replace(
              /_/g,
              " ",
            )}
          </AdminStatus>
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

      <section
        className="crm-invoice-summary"
        aria-label="Invoice summary"
      >
        <article>
          <span>Total</span>
          <strong>
            {money(
              invoice.totalAmount,
              invoice.currency,
            )}
          </strong>
        </article>

        <article>
          <span>Paid</span>
          <strong>
            {money(
              invoice.paidAmount,
              invoice.currency,
            )}
          </strong>
        </article>

        <article>
          <span>Balance</span>
          <strong>
            {money(
              invoice.balanceAmount,
              invoice.currency,
            )}
          </strong>
        </article>

        <article>
          <span>Due</span>
          <strong>
            {dateLabel(
              invoice.dueDate,
            )}
          </strong>
        </article>
      </section>

      <AdminPanel
        title="Payment schedule"
        description="The booking schedule frozen from the accepted quote. Payments and refunds are allocated against these instalments."
        icon={CalendarDays}
      >
        {!invoice.schedule.length ? (
          <AdminEmptyState
            icon={FileText}
            title="No payment schedule"
            description="This invoice does not currently contain scheduled instalments."
          />
        ) : (
          <div className="crm-invoice-schedule">
            {invoice.schedule.map(
              (item) => (
                <article
                  key={item.id}
                >
                  <div>
                    <span>
                      {item.scheduleType.replace(
                        /_/g,
                        " ",
                      )}
                    </span>

                    <strong>
                      {item.label}
                    </strong>

                    <small>
                      {item.dueDate
                        ? `Due ${dateLabel(
                            item.dueDate,
                          )}`
                        : "No due date"}
                    </small>
                  </div>

                  <div>
                    <span>Amount</span>
                    <strong>
                      {money(
                        item.amount,
                        invoice.currency,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Paid</span>
                    <strong>
                      {money(
                        item.paidAmount,
                        invoice.currency,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Balance</span>
                    <strong>
                      {money(
                        item.balanceAmount,
                        invoice.currency,
                      )}
                    </strong>
                  </div>

                  <AdminStatus
                    tone={
                      item.status === "paid"
                        ? "success"
                        : item.status === "overdue"
                          ? "danger"
                          : item.status === "part_paid"
                            ? "info"
                            : "warning"
                    }
                  >
                    {item.status.replace(
                      /_/g,
                      " ",
                    )}
                  </AdminStatus>
                </article>
              ),
            )}
          </div>
        )}
      </AdminPanel>

      <CrmInvoicePaymentForm
        jobId={job.id}
        invoice={invoice}
        canManage={canManage}
        onSaved={(
          nextWorkspace,
          successMessage,
        ) => {
          setWorkspace(
            nextWorkspace,
          );

          setError("");

          setMessage(
            successMessage,
          );
        }}
        onError={(
          nextError,
        ) => {
          setMessage("");

          setError(
            nextError,
          );
        }}
      />
    </AdminPage>
  );
}
