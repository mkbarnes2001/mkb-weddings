import { BookingConflictCalendars } from "../components/BookingConflictCalendars";
import { ICloudCalendarConnections } from "../components/ICloudCalendarConnections";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  RefreshCw,
  Settings,
  Check,
  X,
  Save,
  Link2,
  Unlink,
  ExternalLink,
} from "lucide-react";
import { AdminPage, AdminPageHeader } from "../components/ui/AdminUI";
import {
  AdminActionButton as Action,
  AdminActionRouterLink as ActionLink,
} from "../components/ui/AdminActionControl";
import {
  bookingRequest,
  type OnlineBookingAdmin,
} from "../services/OnlineBookingService";
import {
  bookingLocalInstant,
  bookingLocalParts,
  bookingMoney,
} from "../../../shared/online-booking";
import { BookingField } from "./CRMOnlineBooking";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import "../online-booking.css";

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const shift = (date: string, days: number) =>
  dateKey(new Date(Date.parse(date + "T12:00:00Z") + days * 86400000));
const statusLabels: Record<string, string> = {
  held: "Awaiting payment",
  requested: "Awaiting approval",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  declined: "Declined",
  expired: "Expired",
  payment_review: "Payment needs review",
};
export function CRMCalendar() {
  const { auth } = useProfessionalAuth(),
    [params] = useSearchParams();
  const [config, setConfig] = useState<OnlineBookingAdmin | null>(null),
    [data, setData] = useState<{
      events: any[];
      jobs: any[];
      googleBusy?: any[];
      googleError?: string;
      icloudBusy?: any[];
      icloudError?: string;
    }>({ events: [], jobs: [] });
  const [anchor, setAnchor] = useState(dateKey(new Date())),
    [view, setView] = useState("month"),
    [resource, setResource] = useState("*"),
    [connections, setConnections] = useState(false);
  const [selected, setSelected] = useState<any>(null),
    [edit, setEdit] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(params.get("googleError") || ""),
    [notice, setNotice] = useState(
      params.has("google") ? "Google Calendar connected." : "",
    );
  const canWrite =
    auth.permissions.includes("crm:manage") && auth.accessMode !== "support";
  const timezone = config?.settings.timezone || "Europe/London";
  const days = useMemo(() => {
    const a = new Date(anchor + "T12:00:00Z");
    let from = anchor,
      count = 7;
    if (view === "month" || view === "agenda") {
      a.setUTCDate(1);
      from = shift(dateKey(a), -((a.getUTCDay() + 6) % 7));
      count = 42;
    } else from = shift(anchor, -((a.getUTCDay() + 6) % 7));
    return Array.from({ length: count }, (_, i) => shift(from, i));
  }, [anchor, view]);
  async function load() {
    setLoading(true);
    try {
      const [c, d] = await Promise.all([
        bookingRequest<OnlineBookingAdmin>("online-booking"),
        bookingRequest(
          "calendar?from=" + days[0] + "&to=" + days[days.length - 1],
        ),
      ]);
      setConfig(c);
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([
      bookingRequest<OnlineBookingAdmin>("online-booking"),
      bookingRequest(
        "calendar?from=" + days[0] + "&to=" + days[days.length - 1],
      ),
    ])
      .then(([c, d]) => {
        if (live) {
          setConfig(c);
          setData(d);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [days]);
  const entries = useMemo(
    () =>
      [
        ...[
          ...(data.googleBusy || []).map((e) => ({ ...e, provider: "Google" })),
          ...(data.icloudBusy || []).map((e) => ({ ...e, provider: "iCloud" })),
        ]
          .filter((e) => resource === "*" || e.resourceId === resource)
          .map((e, i) => ({
            ...e,
            id: "external-" + i,
            date: bookingLocalParts(e.start, timezone).date,
            title: `${e.provider} Calendar · Busy`,
            resourceName:
              config?.settings.resources.find((r) => r.id === e.resourceId)
                ?.name || "",
            external: true,
            status: "busy",
          })),
        ...data.events
          .filter(
            (e) => !["expired", "cancelled", "declined"].includes(e.status),
          )
          .filter(
            (e) =>
              resource === "*" ||
              e.resourceId === resource ||
              e.resourceId === "*",
          ),
        ...data.jobs
          .filter(
            (j) =>
              resource === "*" ||
              !j.userId ||
              config?.settings.resources.some(
                (r) => r.id === resource && r.userId === j.userId,
              ),
          )
          .map((j) => ({
            ...j,
            legacy: true,
            kind: "job",
            resourceName: "",
            status: j.status,
          })),
      ].sort(
        (a, b) =>
          a.date.localeCompare(b.date) || (a.start || 0) - (b.start || 0),
      ),
    [data, resource, config, timezone],
  );
  function move(direction: number) {
    if (view === "week") setAnchor(shift(anchor, 7 * direction));
    else {
      const d = new Date(anchor + "T12:00:00Z");
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + direction);
      setAnchor(dateKey(d));
    }
  }
  function open(item: any) {
    setSelected(item);
    setEdit({
      title: item.title,
      resourceId: item.resourceId,
      startDate: item.date,
      startTime: bookingLocalParts(item.start, timezone).time,
      endDate: bookingLocalParts(item.end, timezone).date,
      endTime: bookingLocalParts(item.end, timezone).time,
    });
    setError("");
  }
  function newBlock() {
    setSelected({ kind: "blocked", version: 0 });
    setEdit({
      title: "Unavailable",
      resourceId: resource,
      startDate: anchor,
      startTime: "09:00",
      endDate: anchor,
      endTime: "17:00",
    });
  }
  async function action(kind: string) {
    if (!edit) return;
    setBusy(true);
    setError("");
    try {
      const body: any = { action: kind, version: selected.version };
      if (kind === "reschedule" || kind === "block")
        Object.assign(body, {
          title: edit.title,
          resourceId: edit.resourceId,
          start: bookingLocalInstant(edit.startDate, edit.startTime, timezone),
          end: bookingLocalInstant(edit.endDate, edit.endTime, timezone),
        });
      const result = await bookingRequest(
        selected.id ? "calendar/events/" + selected.id : "calendar/blocks",
        body,
      );
      setSelected(null);
      setEdit(null);
      setNotice(
        result.sync?.failed
          ? "Calendar updated. Calendar sync needs a retry."
          : "Calendar updated.",
      );
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function google(id: string, action: string) {
    setBusy(true);
    setError("");
    try {
      const result = await bookingRequest(
        action === "sync" ? "calendar/sync" : `calendar/google/${id}/${action}`,
        {},
      );
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
        return;
      }
      setNotice(
        action === "sync"
          ? `${result.synced} calendar updates synced${result.failed ? `; ${result.failed} need a retry` : ""}.`
          : "Google Calendar disconnected.",
      );
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const time = (ms: number) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(ms);
  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(anchor + "T12:00:00Z"));
  return (
    <AdminPage className="ob-admin">
      <AdminPageHeader
        title="Calendar"
        actions={
          <>
            <Action
              onClick={newBlock}
              disabled={!canWrite || !config?.revision}
              icon={Plus}
            >
              Block time
            </Action>
            <Action
              onClick={() => {
                setConnections((v) => !v);
              }}
              icon={Link2}
              aria-expanded={connections}
            >
              Calendar connections
            </Action>
            <Action onClick={load} disabled={loading} icon={RefreshCw}>
              Refresh calendar
            </Action>
            <ActionLink to="/admin/crm/online-booking" icon={Settings}>
              Online booking settings
            </ActionLink>
          </>
        }
      />
      {(data.googleError || data.icloudError) && (
        <p className="ob-message ob-message--error" role="status">
          {[data.googleError, data.icloudError].filter(Boolean).join(" ")}
        </p>
      )}
      {error && (
        <p className="ob-message ob-message--error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="ob-message" role="status">
          {notice}
        </p>
      )}
      {config && !config.revision && (
        <div className="ob-panel">
          <Link to="/admin/crm/online-booking">
            Set up services and team availability
          </Link>
        </div>
      )}
      {connections && config && (
        <section className="ob-panel">
          <div className="ob-section-heading">
            <h2>Calendar connections</h2>
            <Action
              icon={RefreshCw}
              onClick={() => google("", "sync")}
              disabled={
                busy ||
                !canWrite ||
                !(config.google.length || config.icloud.length)
              }
            >
              Sync connected calendars
            </Action>
          </div>
          <div className="ob-section-heading">
            <h3>Google Calendar</h3>
          </div>
          {!config.googleConfigured && (
            <p className="ob-message">
              Google Calendar needs to be configured before accounts can
              connect.
            </p>
          )}
          {config.settings.resources.map((r) => {
            const connected = config.google.some((c) => c.resourceId === r.id);
            return (
              <div className="ob-connection" key={r.id}>
                <div>
                  <strong>{r.name}</strong>
                  <span>
                    {connected
                      ? "Connected · Primary calendar"
                      : "Not connected"}
                  </span>
                </div>
                {connected && (
                  <BookingConflictCalendars
                    provider="google"
                    resourceId={r.id}
                    name={r.name}
                    disabled={!canWrite || busy}
                    onChange={load}
                  />
                )}
                <Action
                  icon={connected ? Unlink : Link2}
                  disabled={!canWrite || busy || !config.googleConfigured}
                  onClick={() =>
                    google(r.id, connected ? "disconnect" : "connect")
                  }
                >
                  {connected ? "Disconnect" : "Connect"} Google Calendar for{" "}
                  {r.name}
                </Action>
              </div>
            );
          })}
          <ICloudCalendarConnections
            config={config}
            canWrite={canWrite}
            onChange={load}
          />
        </section>
      )}
      {selected && edit && (
        <section
          className="ob-panel ob-calendar-editor"
          aria-label="Calendar entry editor"
        >
          <div className="ob-section-heading">
            <h2>
              {selected.id
                ? selected.kind === "booking"
                  ? "Appointment"
                  : "Blocked time"
                : "Block time"}
            </h2>
            <Action
              icon={X}
              onClick={() => {
                setSelected(null);
                setEdit(null);
              }}
            >
              Close calendar entry
            </Action>
          </div>
          {selected.id && (
            <div className="ob-booking-summary">
              <strong>{selected.title}</strong>
              <span className={"ob-status is-" + selected.status}>
                {statusLabels[selected.status] || selected.status}
              </span>
              {selected.name && (
                <span>
                  {selected.name} · {selected.email}
                  {selected.phone ? " · " + selected.phone : ""}
                </span>
              )}
              {selected.amount !== undefined && (
                <span>
                  {bookingMoney(selected.amount, selected.currency)} total
                </span>
              )}
              {selected.jobId && (
                <Link to={"/admin/crm/jobs/" + selected.jobId}>Open Job</Link>
              )}
              {selected.invoiceId && (
                <Link
                  to={`/admin/crm/jobs/${selected.jobId}/invoices/${selected.invoiceId}`}
                >
                  Open invoice & payments
                </Link>
              )}
              {(selected.googleStatus === "error" ||
                selected.icloudStatus === "error") && (
                <span className="ob-message--error">
                  Calendar sync needs a retry.
                </span>
              )}
            </div>
          )}
          <fieldset
            disabled={!canWrite || busy || selected.status === "held"}
            className="ob-fieldset"
          >
            <div className="ob-form-grid">
              {selected.kind === "blocked" && (
                <BookingField label="Title">
                  <input
                    value={edit.title}
                    onChange={(e) =>
                      setEdit({ ...edit, title: e.target.value })
                    }
                  />
                </BookingField>
              )}
              <BookingField label="Team member">
                <select
                  value={edit.resourceId}
                  onChange={(e) =>
                    setEdit({ ...edit, resourceId: e.target.value })
                  }
                >
                  {selected.kind === "blocked" && (
                    <option value="*">Whole business</option>
                  )}
                  {config?.settings.resources
                    .filter((r) => r.active)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </BookingField>
              <BookingField label="Start date">
                <input
                  type="date"
                  value={edit.startDate}
                  onChange={(e) =>
                    setEdit({ ...edit, startDate: e.target.value })
                  }
                />
              </BookingField>
              <BookingField label="Start time">
                <input
                  type="time"
                  value={edit.startTime}
                  onChange={(e) =>
                    setEdit({ ...edit, startTime: e.target.value })
                  }
                />
              </BookingField>
              <BookingField label="End date">
                <input
                  type="date"
                  value={edit.endDate}
                  onChange={(e) =>
                    setEdit({ ...edit, endDate: e.target.value })
                  }
                />
              </BookingField>
              <BookingField label="End time">
                <input
                  type="time"
                  value={edit.endTime}
                  onChange={(e) =>
                    setEdit({ ...edit, endTime: e.target.value })
                  }
                />
              </BookingField>
            </div>
          </fieldset>
          <div className="ob-section-heading">
            <span className="ob-muted">{timezone}</span>
            <div className="ob-inline">
              {["requested", "payment_review"].includes(selected.status) && (
                <>
                  <Action
                    icon={Check}
                    disabled={!canWrite || busy}
                    onClick={() => action("confirm")}
                  >
                    Approve appointment
                  </Action>
                  <Action
                    icon={X}
                    disabled={!canWrite || busy}
                    onClick={() => action("decline")}
                  >
                    Decline appointment
                  </Action>
                </>
              )}
              {selected.id && (
                <Action
                  icon={X}
                  disabled={!canWrite || busy}
                  onClick={() => action("cancel")}
                >
                  Cancel{" "}
                  {selected.kind === "booking" ? "appointment" : "blocked time"}
                </Action>
              )}
              <Action
                icon={Save}
                disabled={!canWrite || busy || selected.status === "held"}
                onClick={() => action(selected.id ? "reschedule" : "block")}
              >
                Save calendar entry
              </Action>
            </div>
          </div>
          {selected.invoiceId && (
            <p className="ob-muted">
              Cancelling or declining does not refund a payment. Review payments
              in the Job invoice.
            </p>
          )}
        </section>
      )}
      <div className="ob-calendar-toolbar">
        <div className="ob-inline">
          <Action icon={ChevronLeft} onClick={() => move(-1)}>
            Previous {view === "week" ? "week" : "month"}
          </Action>
          <h2>{monthLabel}</h2>
          <Action icon={ChevronRight} onClick={() => move(1)}>
            Next {view === "week" ? "week" : "month"}
          </Action>
          <Action
            icon={CalendarDays}
            onClick={() =>
              setAnchor(bookingLocalParts(Date.now(), timezone).date)
            }
          >
            Today
          </Action>
        </div>
        <div className="ob-inline">
          <label className="ob-sr-only" htmlFor="calendar-staff">
            Team member filter
          </label>
          <select
            id="calendar-staff"
            value={resource}
            onChange={(e) => setResource(e.target.value)}
          >
            <option value="*">All team members</option>
            {config?.settings.resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <label className="ob-sr-only" htmlFor="calendar-view">
            Calendar view
          </label>
          <select
            id="calendar-view"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="agenda">Agenda</option>
          </select>
        </div>
      </div>
      {loading && <p role="status">Loading calendar…</p>}
      <div className="ob-calendar-caption">
        <span>{timezone}</span>
        <div className="ob-inline">
          <span className="ob-status is-confirmed">Confirmed</span>
          <span className="ob-status is-requested">Awaiting approval</span>
          <span className="ob-status is-held">Awaiting payment</span>
        </div>
      </div>
      {view === "agenda" ? (
        <div className="ob-panel ob-agenda">
          {entries.length ? (
            entries.map((item) => (
              <div className="ob-agenda-row" key={item.id}>
                <time>
                  {item.date}
                  <span>{item.legacy ? "All day" : time(item.start)}</span>
                </time>
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.resourceName} ·{" "}
                    {statusLabels[item.status] || item.status}
                  </span>
                </div>
                {item.external ? (
                  <span className="ob-muted">{item.provider}</span>
                ) : item.legacy ? (
                  <ActionLink
                    icon={ExternalLink}
                    to={"/admin/crm/jobs/" + item.id}
                  >
                    Open {item.title}
                  </ActionLink>
                ) : (
                  <Action icon={CalendarDays} onClick={() => open(item)}>
                    View {item.title}
                  </Action>
                )}
              </div>
            ))
          ) : (
            <div className="ob-empty">No bookings in this period.</div>
          )}
        </div>
      ) : (
        <div className="ob-calendar-scroll">
          <div
            className={"ob-calendar ob-calendar--" + view}
            role="region"
            aria-label={monthLabel + " calendar"}
          >
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="ob-calendar-day-name">
                {d}
              </div>
            ))}
            {days.map((day) => (
              <section
                key={day}
                className={
                  "ob-calendar-day " +
                  (day.slice(0, 7) !== anchor.slice(0, 7)
                    ? "is-outside "
                    : "") +
                  (day === bookingLocalParts(Date.now(), timezone).date
                    ? "is-today"
                    : "")
                }
                aria-label={day}
              >
                <time dateTime={day}>{Number(day.slice(-2))}</time>
                {entries
                  .filter(
                    (e) =>
                      e.date <= day &&
                      (e.legacy
                        ? e.date === day
                        : bookingLocalParts(e.end - 1, timezone).date >= day),
                  )
                  .map((item) =>
                    item.external ? (
                      <div
                        key={item.id}
                        className="ob-calendar-event is-blocked"
                      >
                        <strong>{item.title}</strong>
                        <span>
                          {time(item.start)} · {item.resourceName}
                        </span>
                      </div>
                    ) : item.legacy ? (
                      <Link
                        key={item.id}
                        className="ob-calendar-event is-job"
                        to={"/admin/crm/jobs/" + item.id}
                      >
                        <strong>{item.title}</strong>
                        <span>All day</span>
                      </Link>
                    ) : (
                      <button
                        key={item.id}
                        className={
                          "ob-calendar-event is-" +
                          item.status +
                          (item.kind === "blocked" ? " is-blocked" : "")
                        }
                        onClick={() => open(item)}
                      >
                        <strong>{item.title}</strong>
                        <span>
                          {time(item.start)} ·{" "}
                          {item.resourceName || "Whole business"}
                        </span>
                        {["requested", "held", "payment_review"].includes(
                          item.status,
                        ) && <small>{statusLabels[item.status]}</small>}
                      </button>
                    ),
                  )}
              </section>
            ))}
          </div>
        </div>
      )}
    </AdminPage>
  );
}
