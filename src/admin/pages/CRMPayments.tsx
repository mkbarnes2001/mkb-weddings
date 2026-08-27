import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarClock,
  PoundSterling,
  ExternalLink,
  RefreshCw,
  Search,
  Settings2,
  TriangleAlert,
  WalletCards,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  AdminButton,
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminHeaderRouterLink,
  AdminPanel,
  AdminStatus,
} from "../components/ui/AdminUI";

import {
  AdminApiService,
} from "../services/AdminApiService";

import type {
  CrmPaymentOverviewRow,
  CrmPaymentOverviewStatus,
  CrmPaymentsOverview,
} from "../types/crm";


type Filter =
  | "outstanding"
  | "overdue"
  | "due_soon"
  | "paid"
  | "all";


function money(
  amount: number,
  currency: string,
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency:
        currency || "GBP",
    },
  ).format(
    amount / 100,
  );
}


function dateLabel(
  value: string,
) {
  if (!value) {
    return "No due date";
  }

  const date =
    new Date(
      `${value}T12:00:00Z`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}


function statusLabel(
  status:
    CrmPaymentOverviewStatus,
) {
  if (status === "overdue") {
    return "Overdue";
  }

  if (status === "due_soon") {
    return "Due soon";
  }

  if (status === "paid") {
    return "Paid";
  }

  return "Outstanding";
}


function statusTone(
  status:
    CrmPaymentOverviewStatus,
):
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info" {
  if (status === "paid") {
    return "success";
  }

  if (status === "overdue") {
    return "danger";
  }

  if (status === "due_soon") {
    return "warning";
  }

  return "neutral";
}


function rowMatchesFilter(
  row:
    CrmPaymentOverviewRow,
  filter: Filter,
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "outstanding") {
    return row.status !== "paid";
  }

  return row.status === filter;
}


export function CRMPayments() {
  const [
    overview,
    setOverview,
  ] =
    useState<CrmPaymentsOverview | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<Filter>(
      "outstanding",
    );

  const [
    search,
    setSearch,
  ] =
    useState("");


  async function load() {
    setLoading(true);
    setError("");

    try {
      setOverview(
        await AdminApiService
          .getCrmPaymentsOverview(),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load payments.",
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    void load();
  }, []);


  const rows =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return (
          overview?.rows || []
        ).filter(
          (row) => {
            if (
              !rowMatchesFilter(
                row,
                filter,
              )
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return [
              row.invoiceReference,
              row.client.name,
              row.client.email,
              row.job.reference,
              row.job.title,
              row.label,
            ]
              .join(" ")
              .toLowerCase()
              .includes(query);
          },
        );
      },
      [
        filter,
        overview?.rows,
        search,
      ],
    );


  const summary =
    overview?.summary;


  return (
    <AdminPage
      className="crm-payments-page"
    >
      <AdminPageHeader
        eyebrow="Finance"
        title="Payments"
        description="Track outstanding instalments, overdue balances and recorded payments across all WedCRM Jobs."
        actions={
          <div className="crm-payments-header-actions">
            <AdminHeaderRouterLink
              to="/admin/crm/payment-setup"
              className="admin-button admin-button--secondary admin-button--sm"
            >
              <Settings2 className="admin-button__icon" />
              Payment setup
            </AdminHeaderRouterLink>

            <AdminButton
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              disabled={loading}
              onClick={() =>
                void load()
              }
            >
              Refresh
            </AdminButton>
          </div>
        }
      />

      {error ? (
        <div className="admin-alert admin-alert--danger">
          {error}
        </div>
      ) : null}

      <section className="crm-payments-summary">
        <button
          type="button"
          className={
            filter === "outstanding"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setFilter(
              "outstanding",
            )
          }
        >
          <span>
            Outstanding
          </span>

          <strong>
            {money(
              summary
                ?.outstandingAmount
                || 0,
              summary?.currency
                || "GBP",
            )}
          </strong>

          <small>
            {summary
              ?.outstandingCount
              || 0} instalments
          </small>
        </button>

        <button
          type="button"
          className={
            filter === "overdue"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setFilter(
              "overdue",
            )
          }
        >
          <span>
            Overdue
          </span>

          <strong>
            {money(
              summary
                ?.overdueAmount
                || 0,
              summary?.currency
                || "GBP",
            )}
          </strong>

          <small>
            {summary
              ?.overdueCount
              || 0} overdue
          </small>
        </button>

        <button
          type="button"
          className={
            filter === "due_soon"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setFilter(
              "due_soon",
            )
          }
        >
          <span>
            Due soon
          </span>

          <strong>
            {money(
              summary
                ?.dueSoonAmount
                || 0,
              summary?.currency
                || "GBP",
            )}
          </strong>

          <small>
            {summary
              ?.dueSoonCount
              || 0} within 30 days
          </small>
        </button>

        <button
          type="button"
          className={
            filter === "paid"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setFilter(
              "paid",
            )
          }
        >
          <span>
            Paid / collected
          </span>

          <strong>
            {money(
              summary
                ?.paidAmount
                || 0,
              summary?.currency
                || "GBP",
            )}
          </strong>

          <small>
            {summary
              ?.paidCount
              || 0} fully paid
          </small>
        </button>
      </section>

      <AdminPanel
        title="Payment schedule"
        description="One row per invoice obligation. Recorded payments and refunds are allocated using the existing invoice ledger."
        icon={WalletCards}
        className="crm-payments-panel"
      >
        <div className="crm-payments-toolbar">
          <label className="crm-payments-search">
            <Search />
            <input
              className="admin-input"
              type="search"
              value={search}
              placeholder="Search invoice, client or Job"
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
            />
          </label>

          <select
            className="admin-select"
            value={filter}
            onChange={(
              event,
            ) =>
              setFilter(
                event.target
                  .value as Filter,
              )
            }
          >
            <option value="outstanding">
              Outstanding
            </option>

            <option value="overdue">
              Overdue
            </option>

            <option value="due_soon">
              Due soon
            </option>

            <option value="paid">
              Paid
            </option>

            <option value="all">
              All
            </option>
          </select>
        </div>

        {loading
        && !overview ? (
          <p className="crm-payments-loading">
            Loading payments…
          </p>
        ) : rows.length ? (
          <div className="admin-table-wrap crm-payments-table-wrap">
            <table className="admin-table crm-payments-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Job</th>
                  <th>Amount</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (row) => (
                    <tr key={row.id}>
                      <td>
                        <AdminStatus
                          tone={
                            statusTone(
                              row.status,
                            )
                          }
                        >
                          {statusLabel(
                            row.status,
                          )}
                        </AdminStatus>
                      </td>

                      <td className="crm-payments-due">
                        <strong>
                          {dateLabel(
                            row.dueDate,
                          )}
                        </strong>

                        <small>
                          {row.label}
                        </small>
                      </td>

                      <td>
                        <Link
                          className="admin-inline-link"
                          to={
                            `/admin/crm/jobs/${
                              encodeURIComponent(
                                row.job.id,
                              )
                            }/invoices/${
                              encodeURIComponent(
                                row.invoiceId,
                              )
                            }`
                          }
                        >
                          {row.invoiceReference}
                        </Link>
                      </td>

                      <td className="crm-payments-client">
                        <strong>
                          {row.client.name
                            || "Client"}
                        </strong>

                        {row.client.email ? (
                          <small>
                            {row.client.email}
                          </small>
                        ) : null}
                      </td>

                      <td className="crm-payments-job">
                        <Link
                          className="admin-inline-link"
                          to={
                            `/admin/crm/jobs/${
                              encodeURIComponent(
                                row.job.id,
                              )
                            }`
                          }
                        >
                          {row.job.title
                            || row.job.reference
                            || "Open Job"}
                        </Link>

                        {row.job.eventDate ? (
                          <small>
                            {dateLabel(
                              row.job.eventDate,
                            )}
                          </small>
                        ) : null}
                      </td>

                      <td className="crm-payments-amount">
                        <strong>
                          {money(
                            row.status === "paid"
                              ? row.amount
                              : row.outstandingAmount,
                            row.currency,
                          )}
                        </strong>

                        {row.paidAmount > 0
                        && row.status !== "paid" ? (
                          <small>
                            {money(
                              row.paidAmount,
                              row.currency,
                            )} paid
                          </small>
                        ) : null}
                      </td>

                      <td className="crm-payments-action">
                        <Link
                          className="admin-icon-control"
                          to={
                            `/admin/crm/jobs/${
                              encodeURIComponent(
                                row.job.id,
                              )
                            }/invoices/${
                              encodeURIComponent(
                                row.invoiceId,
                              )
                            }`
                          }
                          aria-label={
                            `Open invoice ${row.invoiceReference}`
                          }
                          title="Open invoice"
                        >
                          <ExternalLink />
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState
            icon={
              filter === "overdue"
                ? TriangleAlert
                : filter === "due_soon"
                  ? CalendarClock
                  : PoundSterling
            }
            title={
              search
                ? "No matching payments"
                : filter === "paid"
                  ? "No paid instalments"
                  : filter === "overdue"
                    ? "Nothing overdue"
                    : filter === "due_soon"
                      ? "Nothing due soon"
                      : "No outstanding payments"
            }
            description={
              search
                ? "Try a different invoice, client or Job search."
                : "Invoice payment obligations will appear here automatically."
            }
          />
        )}
      </AdminPanel>
    </AdminPage>
  );
}
