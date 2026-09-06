import { useState } from "react";
import { CalendarDays, Check, X } from "lucide-react";
import { AdminActionButton as Action } from "./ui/AdminActionControl";
import { bookingRequest } from "../services/OnlineBookingService";
export function BookingConflictCalendars({
  provider,
  resourceId,
  name,
  disabled,
  onChange,
}: {
  provider: "google" | "icloud";
  resourceId: string;
  name: string;
  disabled: boolean;
  onChange: () => Promise<void>;
}) {
  const [data, setData] = useState<{
      calendars: { id: string; name: string; required: boolean }[];
      selected: string[];
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function request(save = false) {
    setBusy(true);
    setError("");
    try {
      const result = await bookingRequest(
        `calendar/${provider}/${encodeURIComponent(resourceId)}/${save ? "busy" : "calendars"}`,
        save ? { selected: data?.selected } : {},
      );
      if (save) {
        setData(null);
        await onChange();
      } else setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ob-conflict-calendars">
      <Action
        icon={CalendarDays}
        disabled={disabled || busy}
        onClick={() => request()}
      >
        Choose {provider === "icloud" ? "iCloud" : "Google"} conflict calendars
        for {name}
      </Action>
      {error && (
        <p className="ob-message ob-message--error" role="alert">
          {error}
        </p>
      )}
      {data && (
        <section
          className="ob-conflict-choices"
          aria-label={`Conflict calendars for ${name}`}
        >
          <h4>Check for conflicts</h4>
          {data.calendars.map((c) => (
            <label className="ob-check" key={c.id}>
              <input
                type="checkbox"
                disabled={busy || c.required}
                checked={data.selected.includes(c.id)}
                onChange={(e) =>
                  setData({
                    ...data,
                    selected: e.target.checked
                      ? [...data.selected, c.id]
                      : data.selected.filter((id) => id !== c.id),
                  })
                }
              />
              {c.name}
              {c.required ? " · Booking calendar" : ""}
            </label>
          ))}
          <div className="ob-actions">
            <Action icon={Check} disabled={busy} onClick={() => request(true)}>
              Save conflict calendars
            </Action>
            <Action icon={X} disabled={busy} onClick={() => setData(null)}>
              Cancel calendar selection
            </Action>
          </div>
        </section>
      )}
    </div>
  );
}
