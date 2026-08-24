import {
  useState,
  useEffect,
  type ReactNode,
  } from "react";

import {
  CalendarDays,
  Check,
  User,
  Users,
  Workflow,
  Save,
  Settings2,
  X,
  BriefcaseBusiness,
} from "lucide-react";

import {
  Link,
  } from "react-router-dom";

import {
  AdminPanel,
  AdminField,
  AdminIconButton,
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



export type CRMDetailsMode =
  | "lead"
  | "wedding";


export type CRMLeadStageOption = {
  id: string;
  name: string;
};


export type CRMWeddingDetailsInput = {
  jobName: string;
  eventDate: string;
  venue: string;
  leadSource: string;
  stageId: string;
  service: string;
  campaign: string;
  notes: string;
};


export function CRMWeddingDetailsPanel({
  mode = "wedding",
  jobName,
  eventDate,
  venue,
  leadSource,
  stageId,
  stageName,
  stageOptions = [],
  service,
  technicalSource,
  campaign,
  notes,
  formatDate,
  canEdit = false,
  busy = false,
  onSave,
}: {
  mode?: CRMDetailsMode;
  jobName?: string | null;
  eventDate?: string | null;
  venue?: string | null;
  leadSource?: string | null;
  stageId?: string | null;
  stageName?: string | null;
  stageOptions?: CRMLeadStageOption[];
  service?: string | null;
  technicalSource?: string | null;
  campaign?: string | null;
  notes?: string | null;
  formatDate: (value: string) => string;
  canEdit?: boolean;
  busy?: boolean;
  onSave?: (
    input: CRMWeddingDetailsInput,
  ) => Promise<void>;
}) {
  const isLead =
    mode === "lead";

  const panelLabel =
    isLead
      ? "Lead details"
      : "Wedding details";

  const [editing, setEditing] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [draft, setDraft] =
    useState<CRMWeddingDetailsInput>({
      jobName: jobName || "",
      eventDate: eventDate || "",
      venue: venue || "",
      leadSource: leadSource || "",
      stageId: stageId || "",
      service: service || "",
      campaign: campaign || "",
      notes: notes || "",
    });

  useEffect(
    () => {
      if (editing) return;

      setDraft({
        jobName: jobName || "",
        eventDate: eventDate || "",
        venue: venue || "",
        leadSource: leadSource || "",
        stageId: stageId || "",
        service: service || "",
        campaign: campaign || "",
        notes: notes || "",
      });
    },
    [
      editing,
      jobName,
      eventDate,
      venue,
      leadSource,
      stageId,
      service,
      campaign,
      notes,
    ],
  );

  function cancel() {
    setDraft({
      jobName: jobName || "",
      eventDate: eventDate || "",
      venue: venue || "",
      leadSource: leadSource || "",
      stageId: stageId || "",
      service: service || "",
      campaign: campaign || "",
      notes: notes || "",
    });

    setEditing(false);
  }

  async function save() {
    if (
      !onSave
      || !draft.eventDate.trim()
      || (
        !isLead
        && !draft.jobName.trim()
      )
    ) {
      return;
    }

    setSubmitting(true);

    try {
      await onSave({
        jobName:
          draft.jobName.trim(),
        eventDate:
          draft.eventDate.trim(),
        venue:
          draft.venue.trim(),
        leadSource:
          draft.leadSource.trim(),
        stageId:
          draft.stageId.trim(),
        service:
          draft.service.trim(),
        campaign:
          draft.campaign.trim(),
        notes:
          draft.notes.trim(),
      });

      setEditing(false);
    } catch {
      /*
       * Owning page displays the API error.
       * Keep edit mode open after failure.
       */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminPanel
      title={panelLabel}
      icon={
        isLead
          ? BriefcaseBusiness
          : CalendarDays
      }
      className="crm-wedding-details-panel"
      actions={
        canEdit && onSave ? (
          editing ? (
            <div className="crm-wedding-details-actions">
              <AdminIconButton
                icon={Save}
                label={`Save ${panelLabel}`}
                title={`Save ${panelLabel}`}
                variant="secondary"
                disabled={
                  busy
                  || submitting
                  || !draft.eventDate.trim()
                  || (
                    !isLead
                    && !draft.jobName.trim()
                  )
                }
                onClick={() =>
                  void save()
                }
              />

              <AdminIconButton
                icon={X}
                label="Cancel editing"
                title="Cancel editing"
                variant="secondary"
                disabled={
                  busy
                  || submitting
                }
                onClick={cancel}
              />
            </div>
          ) : (
            <AdminIconButton
              icon={Settings2}
              label={`Edit ${panelLabel}`}
              title={`Edit ${panelLabel}`}
              variant="secondary"
              disabled={busy}
              onClick={() =>
                setEditing(true)
              }
            />
          )
        ) : null
      }
    >
      {editing ? (
        <div className="crm-wedding-details-edit">
          {isLead ? (
            <>
              <AdminField label="Pipeline stage">
                <select
                  className="admin-select"
                  value={draft.stageId}
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        stageId:
                          event.target.value,
                      }),
                    )
                  }
                >
                  {stageOptions.map(
                    (option) => (
                      <option
                        key={option.id}
                        value={option.id}
                      >
                        {option.name}
                      </option>
                    ),
                  )}
                </select>
              </AdminField>

              <AdminField label="Service">
                <input
                  className="admin-input"
                  value={draft.service}
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        service:
                          event.target.value,
                      }),
                    )
                  }
                />
              </AdminField>
            </>
          ) : (
            <AdminField label="Job name">
              <input
                className="admin-input"
                value={draft.jobName}
                onChange={(event) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      jobName:
                        event.target.value,
                    }),
                  )
                }
              />
            </AdminField>
          )}

          <AdminField label="Wedding date">
            <input
              className="admin-input"
              type="date"
              required
              value={draft.eventDate}
              onChange={(event) =>
                setDraft(
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
              value={draft.venue}
              placeholder="Venue or TBC"
              onChange={(event) =>
                setDraft(
                  (current) => ({
                    ...current,
                    venue:
                      event.target.value,
                  }),
                )
              }
            />
          </AdminField>

          <AdminField label="Lead source">
            <input
              className="admin-input"
              value={draft.leadSource}
              placeholder="Website, referral, Instagram…"
              onChange={(event) =>
                setDraft(
                  (current) => ({
                    ...current,
                    leadSource:
                      event.target.value,
                  }),
                )
              }
            />
          </AdminField>

          {isLead ? (
            <>
              <AdminField label="Campaign">
                <input
                  className="admin-input"
                  value={draft.campaign}
                  placeholder="Optional"
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        campaign:
                          event.target.value,
                      }),
                    )
                  }
                />
              </AdminField>

              <div className="crm-wedding-details-readonly-field">
                <span>
                  Technical source
                </span>

                <strong>
                  {technicalSource
                    || "Not recorded"}
                </strong>
              </div>

              <AdminField label="Notes">
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        notes:
                          event.target.value,
                      }),
                    )
                  }
                />
              </AdminField>
            </>
          ) : null}
        </div>
      ) : (
        <dl className="crm-wedding-details-summary">
          {isLead ? (
            <>
              <div>
                <dt>Pipeline stage</dt>
                <dd>
                  {stageName
                    || "Not recorded"}
                </dd>
              </div>

              <div>
                <dt>Service</dt>
                <dd>
                  {service
                    || "Not recorded"}
                </dd>
              </div>
            </>
          ) : (
            <div>
              <dt>Job name</dt>
              <dd>
                {jobName
                  || "Not recorded"}
              </dd>
            </div>
          )}

          <div>
            <dt>Wedding date</dt>
            <dd>
              {eventDate
                ? formatDate(eventDate)
                : "Date TBC"}
            </dd>
          </div>

          <div>
            <dt>Venue</dt>
            <dd>
              {venue
                || "Venue TBC"}
            </dd>
          </div>

          <div>
            <dt>Lead source</dt>
            <dd>
              {leadSource
                || "Not recorded"}
            </dd>
          </div>
        </dl>
      )}
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
