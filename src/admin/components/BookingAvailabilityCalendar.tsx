import { useState, useEffect, useRef } from "react";
import {
  Plus,
  CalendarDays,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { AdminActionButton as Action } from "./ui/AdminActionControl";
import { BookingField } from "../pages/CRMOnlineBooking";
import {
  validBookingDate,
  type BookingResource,
} from "../../../shared/online-booking";
const shift = (date: string, days: number) =>
  new Date(Date.parse(date + "T12:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
export function BookingAvailabilityCalendar({
  resources,
  onChange,
}: {
  resources: BookingResource[];
  onChange: (value: BookingResource[]) => void;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)),
    [staff, setStaff] = useState(""),
    [edit, setEdit] = useState<{
      date: string;
      hours: { from: string; to: string }[];
    } | null>(null);
  useEffect(() => {
    if (edit)
      editor.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [edit?.date]);
  const resource = resources.find((r) => r.id === staff) || resources[0],
    first = month + "-01",
    offset = (new Date(first + "T12:00:00Z").getUTCDay() + 6) % 7,
    days = Array.from({ length: 42 }, (_, i) => shift(first, i - offset));
  const hours = (date: string) =>
    resource?.overrides?.find((o) => o.date === date)?.hours ||
    resource?.hours.filter(
      (h) => h.day === new Date(date + "T12:00:00Z").getUTCDay(),
    ) ||
    [];
  function move(n: number) {
    const d = new Date(first + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  }
  function apply(reset = false) {
    if (!resource || !edit) return;
    onChange(
      resources.map((r) =>
        r.id === resource.id
          ? {
              ...r,
              overrides: [
                ...(r.overrides || []).filter((o) => o.date !== edit.date),
                ...(reset ? [] : [edit]),
              ].sort((a, b) => a.date.localeCompare(b.date)),
            }
          : r,
      ),
    );
    setEdit(null);
  }
  return (
    <section
      className="ob-panel ob-availability-editor"
      aria-label="Availability calendar"
    >
      <div className="ob-calendar-toolbar">
        <div className="ob-inline">
          <Action icon={ChevronLeft} onClick={() => move(-1)}>
            Previous availability month
          </Action>
          <h3>
            {new Intl.DateTimeFormat("en-GB", {
              month: "long",
              year: "numeric",
            }).format(new Date(first + "T12:00:00Z"))}
          </h3>
          <Action
            icon={CalendarDays}
            onClick={() => setMonth(new Date().toISOString().slice(0, 7))}
          >
            Current availability month
          </Action>
          <Action icon={ChevronRight} onClick={() => move(1)}>
            Next availability month
          </Action>
        </div>
        <BookingField label="Availability team member">
          <select
            value={resource?.id || ""}
            onChange={(e) => {
              setStaff(e.target.value);
              setEdit(null);
            }}
          >
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </BookingField>
      </div>
      {!resource ? (
        <p className="ob-empty">Add a team member to set availability.</p>
      ) : (
        <div className="ob-availability-scroll">
          <div className="ob-availability-grid">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <strong className="ob-availability-weekday" key={d}>
                {d}
              </strong>
            ))}
            {days.map((date) => (
              <div
                key={date}
                className={`ob-availability-day ${date.startsWith(month) ? "" : "is-outside"} ${resource.overrides?.some((o) => o.date === date) ? "is-override" : ""}`}
              >
                <div>
                  <time dateTime={date}>{Number(date.slice(-2))}</time>
                  <Action
                    icon={Plus}
                    onClick={() =>
                      setEdit({
                        date,
                        hours: hours(date).map((h) => ({
                          from: h.from,
                          to: h.to,
                        })),
                      })
                    }
                  >
                    Edit availability for {resource.name} on {date}
                  </Action>
                </div>
                {hours(date).length ? (
                  hours(date).map((h, i) => (
                    <span key={i}>
                      {h.from}–{h.to}
                    </span>
                  ))
                ) : (
                  <span className="ob-muted">Closed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {edit && resource && (
        <div
          className="ob-panel ob-date-hours"
          aria-label="Date availability editor"
          ref={editor}
        >
          <div className="ob-section-heading">
            <h3>
              {resource.name} · {edit.date}
            </h3>
            <div className="ob-inline">
              <Action
                icon={Check}
                disabled={
                  !validBookingDate(edit.date) ||
                  edit.hours.some((h) => !h.from || !h.to || h.from >= h.to)
                }
                onClick={() => apply()}
              >
                Apply date availability
              </Action>
              <Action icon={RotateCcw} onClick={() => apply(true)}>
                Use weekly hours for this date
              </Action>
              <Action icon={X} onClick={() => setEdit(null)}>
                Cancel date availability edit
              </Action>
            </div>
          </div>
          <BookingField label="Availability date">
            <input
              type="date"
              value={edit.date}
              onChange={(e) =>
                setEdit({
                  date: e.target.value,
                  hours: hours(e.target.value).map((h) => ({
                    from: h.from,
                    to: h.to,
                  })),
                })
              }
            />
          </BookingField>
          <label className="ob-check">
            <input
              type="checkbox"
              checked={!edit.hours.length}
              onChange={(e) =>
                setEdit({
                  ...edit,
                  hours: e.target.checked
                    ? []
                    : [{ from: "09:00", to: "17:00" }],
                })
              }
            />
            Closed for this date
          </label>
          {edit.hours.map((h, i) => (
            <div className="ob-hours" key={i}>
              <BookingField label="Date opening time">
                <input
                  type="time"
                  value={h.from}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      hours: edit.hours.map((x, n) =>
                        n === i ? { ...x, from: e.target.value } : x,
                      ),
                    })
                  }
                />
              </BookingField>
              <BookingField label="Date closing time">
                <input
                  type="time"
                  value={h.to}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      hours: edit.hours.map((x, n) =>
                        n === i ? { ...x, to: e.target.value } : x,
                      ),
                    })
                  }
                />
              </BookingField>
              <Action
                icon={Trash2}
                onClick={() =>
                  setEdit({
                    ...edit,
                    hours: edit.hours.filter((_, n) => n !== i),
                  })
                }
              >
                Remove date hours {i + 1}
              </Action>
            </div>
          ))}
          <Action
            icon={Plus}
            disabled={edit.hours.length >= 8}
            onClick={() =>
              setEdit({
                ...edit,
                hours: [...edit.hours, { from: "09:00", to: "17:00" }],
              })
            }
          >
            Add date hours
          </Action>
        </div>
      )}
    </section>
  );
}
