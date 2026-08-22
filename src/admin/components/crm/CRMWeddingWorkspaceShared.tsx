import type {
  ReactNode,
} from "react";

import {
  Check,
  User,
  Users,
  Workflow,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  AdminPanel,
} from "../ui/AdminUI";


export type CRMWorkspaceContact = {
  id: string;
  displayName: string;
  role: string;
  email?: string | null;
  phone?: string | null;
};


export type CRMClientPortalState = {
  status:
    | "active"
    | "invited"
    | "email-required"
    | "not-invited";
  label: string;
};


export function CRMWeddingWorkflowPanel({
  leadCreatedAt,
  jobAccepted,
  jobAcceptedAt,
  eventDate,
  venue,
  previewsComplete = false,
  previewsCompletedAt,
  deliveryComplete = false,
  deliveryCompletedAt,
  canToggle = false,
  busy = false,
  onTogglePreviews,
  onToggleDelivery,
  formatDate,
}: {
  leadCreatedAt?: string | null;
  jobAccepted: boolean;
  jobAcceptedAt?: string | null;
  eventDate?: string | null;
  venue?: string | null;
  previewsComplete?: boolean;
  previewsCompletedAt?: string | null;
  deliveryComplete?: boolean;
  deliveryCompletedAt?: string | null;
  canToggle?: boolean;
  busy?: boolean;
  onTogglePreviews?: (() => void) | null;
  onToggleDelivery?: (() => void) | null;
  formatDate: (value: string) => string;
}) {
  const previewToggleAvailable =
    jobAccepted
    && Boolean(
      onTogglePreviews,
    );

  const deliveryToggleAvailable =
    jobAccepted
    && Boolean(
      onToggleDelivery,
    );

  return (
    <AdminPanel
      title="Wedding workflow"
      icon={Workflow}
      className="crm-wedding-workflow-panel"
    >
      <ol
        className="crm-wedding-workflow"
        aria-label="Wedding workflow"
      >
        <li className="crm-wedding-workflow__item is-complete">
          <span
            className="crm-wedding-workflow__marker"
            aria-hidden="true"
          >
            <Check />
          </span>

          <div className="crm-wedding-workflow__content">
            <div className="crm-wedding-workflow__heading">
              <strong>
                Lead created
              </strong>
            </div>

            <p>
              {leadCreatedAt
                ? formatDate(
                    leadCreatedAt,
                  )
                : "Lead creation date unavailable"}
            </p>
          </div>
        </li>

        <li
          className={
            `crm-wedding-workflow__item ${
              jobAccepted
                ? "is-complete"
                : ""
            }`
          }
        >
          <span
            className="crm-wedding-workflow__marker"
            aria-hidden="true"
          >
            {jobAccepted
              ? <Check />
              : null}
          </span>

          <div className="crm-wedding-workflow__content">
            <div className="crm-wedding-workflow__heading">
              <strong>
                Job accepted
              </strong>
            </div>

            <p>
              {jobAccepted
                ? jobAcceptedAt
                  ? formatDate(
                      jobAcceptedAt,
                    )
                  : "Acceptance date unavailable"
                : "Pending"}
            </p>
          </div>
        </li>

        <li
          className={
            `crm-wedding-workflow__item ${
              eventDate
                ? "is-scheduled"
                : ""
            }`
          }
        >
          <span
            className={
              `crm-wedding-workflow__marker ${
                eventDate
                  ? "crm-wedding-workflow__marker--scheduled"
                  : ""
              }`
            }
            aria-hidden="true"
          />

          <div className="crm-wedding-workflow__content">
            <div className="crm-wedding-workflow__heading">
              <strong>
                Wedding day
              </strong>
            </div>

            <p>
              {eventDate
                ? formatDate(
                    eventDate,
                  )
                : "Wedding date not set"}
              {" · "}
              {venue || "Venue TBC"}
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
          {previewToggleAvailable ? (
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
                busy
                || !canToggle
              }
              onClick={() =>
                onTogglePreviews?.()
              }
            >
              {previewsComplete
                ? <Check />
                : null}
            </button>
          ) : (
            <span
              className="crm-wedding-workflow__marker"
              aria-hidden="true"
            >
              {previewsComplete
                ? <Check />
                : null}
            </span>
          )}

          <div className="crm-wedding-workflow__content">
            <div className="crm-wedding-workflow__heading">
              <strong>
                Previews sent
              </strong>
            </div>

            <p>
              {!jobAccepted
                ? "After booking."
                : previewsComplete
                  && previewsCompletedAt
                  ? `Completed ${formatDate(
                      previewsCompletedAt,
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
          {deliveryToggleAvailable ? (
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
                busy
                || !canToggle
              }
              onClick={() =>
                onToggleDelivery?.()
              }
            >
              {deliveryComplete
                ? <Check />
                : null}
            </button>
          ) : (
            <span
              className="crm-wedding-workflow__marker"
              aria-hidden="true"
            >
              {deliveryComplete
                ? <Check />
                : null}
            </span>
          )}

          <div className="crm-wedding-workflow__content">
            <div className="crm-wedding-workflow__heading">
              <strong>
                Client photos delivered
              </strong>
            </div>

            <p>
              {!jobAccepted
                ? "After booking."
                : deliveryComplete
                  && deliveryCompletedAt
                  ? `Completed ${formatDate(
                      deliveryCompletedAt,
                    )}`
                  : "Final gallery delivery completes this Job."}
            </p>
          </div>
        </li>
      </ol>
    </AdminPanel>
  );
}


export function CRMClientsPanel({
  contacts,
  getPortalState,
  renderActions,
}: {
  contacts: CRMWorkspaceContact[];
  getPortalState?: (
    contact: CRMWorkspaceContact,
  ) => CRMClientPortalState;
  renderActions?: (
    contact: CRMWorkspaceContact,
  ) => ReactNode;
}) {
  return (
    <AdminPanel
      title="Clients"
      icon={Users}
      className="crm-job-clients-panel"
      actions={
        <span className="crm-job-panel-count">
          {contacts.length}
        </span>
      }
    >
      <div className="crm-job-clients">
        {contacts.map(
          (contact) => {
            const portal =
              getPortalState?.(
                contact,
              )
              || (
                !contact.email
                  ? {
                      status:
                        "email-required" as const,
                      label:
                        "Email required",
                    }
                  : {
                      status:
                        "not-invited" as const,
                      label:
                        "Not invited",
                    }
              );

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
                    {contact.email
                      || "Email required"}
                  </a>

                  {contact.phone ? (
                    <span>
                      {contact.phone}
                    </span>
                  ) : null}

                  <div
                    className={
                      `crm-job-client-portal-state is-${portal.status}`
                    }
                  >
                    <span
                      aria-hidden="true"
                    />

                    <small>
                      Client portal · {portal.label}
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
                    <User aria-hidden="true" />
                  </Link>

                  {renderActions?.(
                    contact,
                  )}
                </div>
              </article>
            );
          },
        )}
      </div>
    </AdminPanel>
  );
}
