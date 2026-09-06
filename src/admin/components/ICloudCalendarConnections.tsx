import { BookingConflictCalendars } from "./BookingConflictCalendars";
import { useState } from "react";
import { Check, Link2, RefreshCw, Search, Unlink, X } from "lucide-react";
import { AdminActionButton as Action } from "./ui/AdminActionControl";
import {
  bookingRequest,
  type OnlineBookingAdmin,
} from "../services/OnlineBookingService";
import { BookingField } from "../pages/CRMOnlineBooking";

type CalendarChoice = { url: string; name: string; writable: boolean };
export function ICloudCalendarConnections({
  config,
  canWrite,
  onChange,
}: {
  config: OnlineBookingAdmin;
  canWrite: boolean;
  onChange: () => Promise<void>;
}) {
  const [form, setForm] = useState<{
      resourceId: string;
      email: string;
      password: string;
      calendarUrl: string;
    } | null>(null),
    [calendars, setCalendars] = useState<CalendarChoice[] | null>(null),
    [disconnect, setDisconnect] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  function open(resourceId: string) {
    setForm({ resourceId, email: "", password: "", calendarUrl: "" });
    setCalendars(null);
    setError("");
    setNotice("");
    setDisconnect("");
  }
  async function submit(action: "discover" | "connect" | "disconnect") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const id = action === "disconnect" ? disconnect : form?.resourceId;
      if (!id) return;
      const result = await bookingRequest(
        `calendar/icloud/${encodeURIComponent(id)}/${action}`,
        action === "disconnect" ? {} : form,
      );
      if (action === "discover") {
        setCalendars(result.calendars);
        setForm(
          (current) =>
            current && {
              ...current,
              calendarUrl:
                result.calendars.find((c: CalendarChoice) => c.writable)?.url ||
                "",
            },
        );
      } else {
        // Secrets live only in this transient form and are cleared on success,
        // cancellation and unmount. They never enter browser storage or a URL.
        setForm(null);
        setCalendars(null);
        setDisconnect("");
        setNotice(
          action === "connect"
            ? "iCloud Calendar connected."
            : "iCloud Calendar disconnected. Existing entries remain in iCloud.",
        );
        await onChange();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ob-icloud-connections">
      <div className="ob-section-heading">
        <h3>Apple iCloud</h3>
      </div>
      {!config.icloudConfigured && (
        <p className="ob-message">
          iCloud Calendar needs to be configured before accounts can connect.
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
      {config.settings.resources.map((resource) => {
        const connected = config.icloud.find(
          (c) => c.resourceId === resource.id,
        );
        return (
          <div key={resource.id}>
            <div className="ob-connection">
              <div>
                <strong>{resource.name}</strong>
                <span>
                  {connected
                    ? `Connected · ${connected.calendarName}`
                    : "Not connected"}
                </span>
              </div>
              <div className="ob-actions">
                <Action
                  icon={connected ? RefreshCw : Link2}
                  disabled={
                    !canWrite ||
                    busy ||
                    !config.icloudConfigured ||
                    !resource.active
                  }
                  onClick={() => open(resource.id)}
                >
                  {connected ? "Reconnect" : "Connect"} iCloud Calendar for{" "}
                  {resource.name}
                </Action>
                {connected && (
                  <BookingConflictCalendars
                    provider="icloud"
                    resourceId={resource.id}
                    name={resource.name}
                    disabled={!canWrite || busy}
                    onChange={onChange}
                  />
                )}
                {connected && (
                  <Action
                    icon={Unlink}
                    disabled={!canWrite || busy}
                    onClick={() => {
                      setDisconnect(resource.id);
                      setForm(null);
                      setError("");
                      setNotice("");
                    }}
                  >
                    Disconnect iCloud Calendar for {resource.name}
                  </Action>
                )}
              </div>
            </div>
            {disconnect === resource.id && (
              <div className="ob-icloud-form">
                <p>
                  Disconnect {resource.name}’s iCloud calendar? It will stop
                  blocking availability. Existing exported entries stay in
                  iCloud.
                </p>
                <div className="ob-actions">
                  <Action
                    icon={Unlink}
                    disabled={busy}
                    onClick={() => submit("disconnect")}
                  >
                    Confirm iCloud disconnection
                  </Action>
                  <Action
                    icon={X}
                    disabled={busy}
                    onClick={() => setDisconnect("")}
                  >
                    Keep iCloud connected
                  </Action>
                </div>
              </div>
            )}
            {form?.resourceId === resource.id && (
              <form
                className="ob-icloud-form"
                aria-label={`Connect iCloud for ${resource.name}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(calendars ? "connect" : "discover");
                }}
              >
                <div className="ob-form-grid">
                  <BookingField label="Apple Account email">
                    <input
                      type="email"
                      required
                      value={form.email}
                      autoComplete="username"
                      disabled={busy}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          email: e.target.value,
                          calendarUrl: "",
                        });
                        setCalendars(null);
                      }}
                    />
                  </BookingField>
                  <BookingField label="App-specific password">
                    <input
                      type="password"
                      required
                      value={form.password}
                      autoComplete="new-password"
                      spellCheck={false}
                      disabled={busy}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          password: e.target.value,
                          calendarUrl: "",
                        });
                        setCalendars(null);
                      }}
                    />
                  </BookingField>
                </div>
                <p className="ob-muted">
                  <a
                    href="https://support.apple.com/en-us/102654"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Create an app-specific password
                  </a>{" "}
                  in your Apple Account. Use it here instead of your normal
                  password.
                </p>
                {calendars && (
                  <BookingField label="iCloud calendar">
                    <select
                      required
                      value={form.calendarUrl}
                      disabled={busy}
                      onChange={(e) =>
                        setForm({ ...form, calendarUrl: e.target.value })
                      }
                    >
                      <option value="">Choose a calendar</option>
                      {calendars.map((c) => (
                        <option
                          key={c.url}
                          value={c.url}
                          disabled={!c.writable}
                        >
                          {c.name}
                          {!c.writable ? " · Read only" : ""}
                        </option>
                      ))}
                    </select>
                  </BookingField>
                )}
                {calendars && !calendars.some((c) => c.writable) && (
                  <p className="ob-message">
                    No editable calendars were found. Create a calendar in
                    iCloud, then try again.
                  </p>
                )}
                {calendars && (
                  <p className="ob-muted">
                    This calendar’s busy times block bookings for{" "}
                    {resource.name}. WedCRM appointments and time off are added
                    here; make booking changes in WedCRM.
                  </p>
                )}
                <div className="ob-actions">
                  <Action
                    type="submit"
                    icon={calendars ? Check : Search}
                    disabled={
                      busy ||
                      !form.email ||
                      !form.password ||
                      (Boolean(calendars) && !form.calendarUrl)
                    }
                  >
                    {calendars
                      ? "Connect selected iCloud calendar"
                      : "Find iCloud calendars"}
                  </Action>
                  <Action
                    icon={X}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setForm(null);
                      setCalendars(null);
                      setError("");
                    }}
                  >
                    Cancel iCloud connection
                  </Action>
                </div>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
