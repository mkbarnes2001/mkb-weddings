import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Save,
  CalendarDays,
  ImagePlus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { AdminPage, AdminPageHeader } from "../components/ui/AdminUI";
import {
  AdminActionButton as Action,
  AdminActionRouterLink as ActionLink,
} from "../components/ui/AdminActionControl";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import {
  bookingRequest,
  type OnlineBookingAdmin,
} from "../services/OnlineBookingService";
import {
  bookingMoney,
  bookingDueNow,
  bookingClientFields,
  defaultBookingMessages,
  defaultBookingHours,
  type BookingService,
} from "../../../shared/online-booking";
import { BookingAvailabilityCalendar } from "../components/BookingAvailabilityCalendar";
import { BookingClientFieldEditor } from "../components/BookingClientFieldEditor";
import { BookingSharing } from "../components/BookingSharing";
import { BookingMessageEditor } from "../components/BookingMessageEditor";
import "../online-booking.css";

export function BookingField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="ob-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
const uid = () => crypto.randomUUID();
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const stages = [
  "Sessions",
  "Add-ons",
  "Availability",
  "Client info",
  "Payment",
];

export function CRMOnlineBooking() {
  const { auth } = useProfessionalAuth();
  const [data, setData] = useState<OnlineBookingAdmin | null>(null),
    [stage, setStage] = useState(0),
    [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const canWrite =
    auth.permissions.includes("crm:manage") && auth.accessMode !== "support";
  useEffect(() => {
    bookingRequest<OnlineBookingAdmin>("online-booking")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update(patch: Partial<OnlineBookingAdmin>) {
    setData((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
    setNotice("");
  }
  function settings(patch: Partial<OnlineBookingAdmin["settings"]>) {
    if (data) update({ settings: { ...data.settings, ...patch } });
  }
  async function save() {
    if (!data || busy) return;
    setBusy(true);
    setError("");
    try {
      setData(await bookingRequest("online-booking", data, "PUT"));
      setDirty(false);
      setNotice("Changes saved.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const s = data?.settings,
    service = s?.services.find((x) => x.id === selected),
    disabled = !canWrite || busy;
  function changeService(patch: Partial<BookingService>) {
    if (s && service)
      settings({
        services: s.services.map((x) =>
          x.id === service.id ? { ...x, ...patch } : x,
        ),
      });
  }
  function addService() {
    if (!s) return;
    const id = uid();
    settings({
      services: [
        ...s.services,
        {
          id,
          name: "New session",
          description: "",
          imageUrl: "",
          amount: 0,
          minutes: 60,
          bufferBefore: 0,
          bufferAfter: 0,
          mode: "instant",
          payment: "full",
          depositPercent: 25,
          resourceIds: s.resources.filter((r) => r.active).map((r) => r.id),
          addonIds: [],
          active: false,
          jobType: "appointment",
        },
      ],
    });
    setSelected(id);
  }
  async function upload(image?: File) {
    if (!image || !service) return;
    const id = service.id;
    setBusy(true);
    setError("");
    try {
      const asset = await AdminApiService.uploadPackageImage(image);
      setData((d) =>
        d
          ? {
              ...d,
              settings: {
                ...d.settings,
                services: d.settings.services.map((x) =>
                  x.id === id ? { ...x, imageUrl: asset.url } : x,
                ),
              },
            }
          : d,
      );
      setDirty(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }
  const bookingOrigin = data?.publicBookingOrigin || window.location.origin;
  const publicUrl =
    data && /^[a-z0-9][a-z0-9-]{2,79}$/.test(data.publicSlug)
      ? new URL("/book/" + data.publicSlug, bookingOrigin).href
      : "";
  return (
    <AdminPage className="ob-admin">
      <AdminPageHeader
        title="Online booking"
        actions={
          <>
            <ActionLink to="/admin/crm/calendar" icon={CalendarDays}>
              Calendar
            </ActionLink>
            <Action
              onClick={save}
              icon={Save}
              disabled={disabled || !data || !dirty}
            >
              Save booking settings
            </Action>
          </>
        }
      />
      {error && (
        <p role="alert" className="ob-message ob-message--error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="ob-message">
          {notice}
        </p>
      )}
      {!data && !error ? <p role="status">Loading online booking…</p> : null}
      {data && s ? (
        <>
          <div className="ob-publish">
            <BookingField label="Booking address">
              <div className="ob-url">
                <span>{new URL(bookingOrigin).host}/book/</span>
                <input
                  value={data.publicSlug}
                  onChange={(e) => update({ publicSlug: e.target.value })}
                  disabled={disabled}
                  autoCapitalize="none"
                />
              </div>
            </BookingField>
            <label className="ob-check">
              <input
                type="checkbox"
                checked={data.enabled}
                onChange={(e) => update({ enabled: e.target.checked })}
                disabled={disabled || !data.publicBookingEnabled}
              />
              Accept online bookings
            </label>
            <span className="ob-muted">
              {dirty
                ? "Unsaved changes"
                : !data.publicBookingEnabled
                  ? "Setup only"
                  : data.enabled
                    ? "Live"
                    : "Draft"}
            </span>
          </div>
          <BookingSharing
            url={publicUrl}
            available={Boolean(
              data.publicBookingEnabled &&
                data.revision &&
                data.enabled &&
                !dirty,
            )}
            issue={
              data.bookingShareIssue ||
              (!data.publicBookingEnabled
                ? "Client booking is awaiting activation. You can save your setup as a draft."
                : "")
            }
          />
          <nav className="ob-steps" aria-label="Booking setup">
            {stages.map((label, i) => (
              <button
                key={label}
                aria-current={stage === i ? "step" : undefined}
                onClick={() => setStage(i)}
              >
                <span>{i + 1}</span>
                {label}
              </button>
            ))}
          </nav>
          <fieldset className="ob-fieldset" disabled={disabled}>
            {stage === 0 ? (
              <>
                <div className="ob-section-heading">
                  <h2>Sessions</h2>
                  <Action icon={Plus} onClick={addService}>
                    Add session
                  </Action>
                </div>
                <BookingField label="Form name">
                  <input
                    value={s.title}
                    onChange={(e) => settings({ title: e.target.value })}
                    maxLength={120}
                  />
                </BookingField>
                {!s.services.length ? (
                  <div className="ob-empty">
                    Add your first session, then assign a team member and
                    availability.
                  </div>
                ) : (
                  <div
                    className={
                      "ob-editor-layout " +
                      (!service ? "ob-editor-layout--browse" : "")
                    }
                  >
                    <div className="ob-session-list">
                      {s.services.map((item, i) => (
                        <article
                          key={item.id}
                          className={
                            "ob-session-card " +
                            (selected === item.id ? "is-selected" : "")
                          }
                        >
                          <button
                            className="ob-session-select"
                            onClick={() => setSelected(item.id)}
                            aria-label={"Edit " + item.name}
                          >
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt="" />
                            ) : (
                              <div className="ob-image-placeholder">
                                <ImagePlus size={22} />
                              </div>
                            )}
                            <div>
                              <strong>{item.name}</strong>
                              <span>
                                {bookingMoney(item.amount, s.currency)} ·{" "}
                                {item.minutes} min
                              </span>
                              <small>
                                {item.active ? "Available" : "Draft"} ·{" "}
                                {item.mode === "instant"
                                  ? "Instant confirmation"
                                  : "Approval required"}
                              </small>
                            </div>
                          </button>
                          <div className="ob-card-actions">
                            <Action
                              icon={ChevronUp}
                              disabled={i === 0}
                              onClick={() => {
                                const next = [...s.services];
                                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                                settings({ services: next });
                              }}
                            >
                              Move {item.name} up
                            </Action>
                            <Action
                              icon={ChevronDown}
                              disabled={i === s.services.length - 1}
                              onClick={() => {
                                const next = [...s.services];
                                [next[i + 1], next[i]] = [next[i], next[i + 1]];
                                settings({ services: next });
                              }}
                            >
                              Move {item.name} down
                            </Action>
                          </div>
                        </article>
                      ))}
                    </div>
                    {service ? (
                      <section className="ob-panel">
                        <div className="ob-section-heading">
                          <h2>Edit session</h2>
                          <label className="ob-check">
                            <input
                              type="checkbox"
                              checked={service.active}
                              onChange={(e) =>
                                changeService({ active: e.target.checked })
                              }
                            />
                            Available
                          </label>
                        </div>
                        <div className="ob-form-grid">
                          <BookingField label="Session name">
                            <input
                              value={service.name}
                              onChange={(e) =>
                                changeService({ name: e.target.value })
                              }
                            />
                          </BookingField>
                          <BookingField label="Job type">
                            <input
                              value={service.jobType}
                              onChange={(e) =>
                                changeService({ jobType: e.target.value })
                              }
                              placeholder="Makeup, hair, music…"
                            />
                          </BookingField>
                          <BookingField label="Workflow">
                            <select
                              value={service.workflowId || ""}
                              onChange={(e) =>
                                changeService({ workflowId: e.target.value })
                              }
                            >
                              <option value="">No workflow</option>
                              {(data.workflows || []).map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name}
                                </option>
                              ))}
                            </select>
                          </BookingField>
                          <BookingField label={"Price (" + s.currency + ")"}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={service.amount / 100}
                              onChange={(e) =>
                                changeService({
                                  amount: Math.round(
                                    Number(e.target.value) * 100,
                                  ),
                                })
                              }
                            />
                          </BookingField>
                          <BookingField label="Duration (minutes)">
                            <input
                              type="number"
                              min="5"
                              max="1440"
                              value={service.minutes}
                              onChange={(e) =>
                                changeService({
                                  minutes: Number(e.target.value),
                                })
                              }
                            />
                          </BookingField>
                          <BookingField label="Buffer before (minutes)">
                            <input
                              type="number"
                              min="0"
                              value={service.bufferBefore}
                              onChange={(e) =>
                                changeService({
                                  bufferBefore: Number(e.target.value),
                                })
                              }
                            />
                          </BookingField>
                          <BookingField label="Buffer after (minutes)">
                            <input
                              type="number"
                              min="0"
                              value={service.bufferAfter}
                              onChange={(e) =>
                                changeService({
                                  bufferAfter: Number(e.target.value),
                                })
                              }
                            />
                          </BookingField>
                        </div>
                        <BookingField label="Description">
                          <textarea
                            rows={4}
                            value={service.description}
                            onChange={(e) =>
                              changeService({ description: e.target.value })
                            }
                          />
                        </BookingField>
                        <div className="ob-section-heading">
                          <strong>Session image</strong>
                          <div className="ob-inline">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              ref={file}
                              hidden
                              aria-label="Session image file"
                              onChange={(e) => upload(e.target.files?.[0])}
                            />
                            <Action
                              icon={ImagePlus}
                              onClick={() => file.current?.click()}
                            >
                              Upload session image
                            </Action>
                            {service.imageUrl && (
                              <Action
                                icon={Trash2}
                                onClick={() => changeService({ imageUrl: "" })}
                              >
                                Remove session image
                              </Action>
                            )}
                          </div>
                        </div>
                        {service.imageUrl && (
                          <img
                            className="ob-image-preview"
                            src={service.imageUrl}
                            alt="Session preview"
                          />
                        )}
                        <BookingField label="Confirmation">
                          <select
                            value={service.mode}
                            onChange={(e) =>
                              changeService({ mode: e.target.value as any })
                            }
                          >
                            <option value="instant">
                              Instant confirmation
                            </option>
                            <option value="request">Request approval</option>
                          </select>
                        </BookingField>
                        <fieldset className="ob-choice-group">
                          <legend>Team members</legend>
                          {s.resources.map((r) => (
                            <label className="ob-check" key={r.id}>
                              <input
                                type="checkbox"
                                checked={service.resourceIds.includes(r.id)}
                                onChange={(e) =>
                                  changeService({
                                    resourceIds: e.target.checked
                                      ? [...service.resourceIds, r.id]
                                      : service.resourceIds.filter(
                                          (id) => id !== r.id,
                                        ),
                                  })
                                }
                              />
                              {r.name}
                              {!r.active ? " (inactive)" : ""}
                            </label>
                          ))}
                          {!s.resources.length && (
                            <span className="ob-muted">
                              Add team members in Availability.
                            </span>
                          )}
                        </fieldset>
                        <fieldset className="ob-choice-group">
                          <legend>Add-ons</legend>
                          {s.addons.map((a) => (
                            <label className="ob-check" key={a.id}>
                              <input
                                type="checkbox"
                                checked={service.addonIds.includes(a.id)}
                                onChange={(e) =>
                                  changeService({
                                    addonIds: e.target.checked
                                      ? [...service.addonIds, a.id]
                                      : service.addonIds.filter(
                                          (id) => id !== a.id,
                                        ),
                                  })
                                }
                              />
                              {a.name}
                            </label>
                          ))}
                          {!s.addons.length && (
                            <span className="ob-muted">
                              No add-ons created.
                            </span>
                          )}
                        </fieldset>
                      </section>
                    ) : null}
                  </div>
                )}
              </>
            ) : null}
            {stage === 1 ? (
              <>
                <div className="ob-section-heading">
                  <h2>Add-ons</h2>
                  <Action
                    icon={Plus}
                    onClick={() =>
                      settings({
                        addons: [
                          ...s.addons,
                          {
                            id: uid(),
                            name: "New add-on",
                            amount: 0,
                            minutes: 0,
                            active: true,
                          },
                        ],
                      })
                    }
                  >
                    Add add-on
                  </Action>
                </div>
                {!s.addons.length && (
                  <div className="ob-empty">No add-ons yet.</div>
                )}
                {s.addons.map((a) => (
                  <div className="ob-panel ob-form-grid" key={a.id}>
                    <BookingField label="Add-on name">
                      <input
                        value={a.name}
                        onChange={(e) =>
                          settings({
                            addons: s.addons.map((x) =>
                              x.id === a.id
                                ? { ...x, name: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                    </BookingField>
                    <BookingField label={"Price (" + s.currency + ")"}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={a.amount / 100}
                        onChange={(e) =>
                          settings({
                            addons: s.addons.map((x) =>
                              x.id === a.id
                                ? {
                                    ...x,
                                    amount: Math.round(
                                      Number(e.target.value) * 100,
                                    ),
                                  }
                                : x,
                            ),
                          })
                        }
                      />
                    </BookingField>
                    <BookingField label="Extra minutes">
                      <input
                        type="number"
                        min="0"
                        value={a.minutes}
                        onChange={(e) =>
                          settings({
                            addons: s.addons.map((x) =>
                              x.id === a.id
                                ? { ...x, minutes: Number(e.target.value) }
                                : x,
                            ),
                          })
                        }
                      />
                    </BookingField>
                    <label className="ob-check">
                      <input
                        type="checkbox"
                        checked={a.active}
                        onChange={(e) =>
                          settings({
                            addons: s.addons.map((x) =>
                              x.id === a.id
                                ? { ...x, active: e.target.checked }
                                : x,
                            ),
                          })
                        }
                      />
                      Available
                    </label>
                  </div>
                ))}
              </>
            ) : null}
            {stage === 2 ? (
              <>
                <div className="ob-section-heading">
                  <h2>Availability</h2>
                  <Action
                    icon={Plus}
                    onClick={() =>
                      settings({
                        resources: [
                          ...s.resources,
                          {
                            id: uid(),
                            name: "New team member",
                            userId: "",
                            active: true,
                            hours: defaultBookingHours(),
                          },
                        ],
                      })
                    }
                  >
                    Add team member
                  </Action>
                </div>
                <div className="ob-panel ob-form-grid">
                  <BookingField label="Timezone">
                    <input
                      list="ob-zones"
                      value={s.timezone}
                      onChange={(e) => settings({ timezone: e.target.value })}
                    />
                    <datalist id="ob-zones">
                      {[
                        "Europe/London",
                        "Europe/Dublin",
                        "Europe/Paris",
                        "America/New_York",
                        "America/Los_Angeles",
                        "Australia/Sydney",
                        "Pacific/Auckland",
                      ].map((z) => (
                        <option key={z}>{z}</option>
                      ))}
                    </datalist>
                  </BookingField>
                  <BookingField label="Start times every">
                    <select
                      value={s.slotMinutes || 15}
                      onChange={(e) =>
                        settings({ slotMinutes: Number(e.target.value) })
                      }
                    >
                      {[5, 10, 15, 20, 30, 60, 90, 120].map((n) => (
                        <option key={n} value={n}>
                          {n} minutes
                        </option>
                      ))}
                    </select>
                  </BookingField>
                  <BookingField label="Minimum notice (hours)">
                    <input
                      type="number"
                      min="0"
                      max="720"
                      value={s.noticeHours}
                      onChange={(e) =>
                        settings({ noticeHours: Number(e.target.value) })
                      }
                    />
                  </BookingField>
                  <BookingField label="Book ahead (days)">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={s.horizonDays}
                      onChange={(e) =>
                        settings({ horizonDays: Number(e.target.value) })
                      }
                    />
                  </BookingField>
                </div>
                <section className="ob-panel">
                  <h3>Check for conflicts</h3>
                  <div className="ob-inline">
                    {(
                      [
                        ["jobs", "Existing jobs"],
                        ["leads", "Open leads"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="ob-check">
                        <input
                          type="checkbox"
                          checked={s.conflicts?.[key] ?? key === "jobs"}
                          onChange={(e) =>
                            settings({
                              conflicts: {
                                jobs: s.conflicts?.jobs ?? true,
                                leads: s.conflicts?.leads ?? false,
                                [key]: e.target.checked,
                              },
                            })
                          }
                        />
                        {label}
                      </label>
                    ))}
                    <Link to="/admin/crm/calendar">Connected calendars</Link>
                  </div>
                </section>
                <BookingAvailabilityCalendar
                  resources={s.resources}
                  onChange={(resources) => settings({ resources })}
                />
                {s.resources.map((r) => {
                  const patch = (p: any) =>
                    settings({
                      resources: s.resources.map((x) =>
                        x.id === r.id ? { ...x, ...p } : x,
                      ),
                    });
                  return (
                    <section className="ob-panel" key={r.id}>
                      <div className="ob-form-grid">
                        <BookingField label="Team member name">
                          <input
                            value={r.name}
                            onChange={(e) => patch({ name: e.target.value })}
                          />
                        </BookingField>
                        <BookingField label="Workspace member">
                          <select
                            value={r.userId}
                            onChange={(e) => patch({ userId: e.target.value })}
                          >
                            <option value="">No login assigned</option>
                            {data.members.map((m) => (
                              <option key={m.userId} value={m.userId}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </BookingField>
                      </div>
                      <label className="ob-check">
                        <input
                          type="checkbox"
                          checked={r.active}
                          onChange={(e) => patch({ active: e.target.checked })}
                        />
                        Accept bookings for this team member
                      </label>
                      <div className="ob-section-heading">
                        <h3>Working hours</h3>
                        <Action
                          icon={Plus}
                          onClick={() =>
                            patch({
                              hours: [
                                ...r.hours,
                                { day: 1, from: "09:00", to: "17:00" },
                              ],
                            })
                          }
                        >
                          Add working hours for {r.name}
                        </Action>
                      </div>
                      {r.hours.map((h, i) => (
                        <div className="ob-hours" key={i}>
                          <BookingField label="Day">
                            <select
                              value={h.day}
                              onChange={(e) =>
                                patch({
                                  hours: r.hours.map((x, n) =>
                                    n === i
                                      ? { ...x, day: Number(e.target.value) }
                                      : x,
                                  ),
                                })
                              }
                            >
                              {days.map((d, n) => (
                                <option key={d} value={n}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </BookingField>
                          <BookingField label="From">
                            <input
                              type="time"
                              value={h.from}
                              onChange={(e) =>
                                patch({
                                  hours: r.hours.map((x, n) =>
                                    n === i
                                      ? { ...x, from: e.target.value }
                                      : x,
                                  ),
                                })
                              }
                            />
                          </BookingField>
                          <BookingField label="Until">
                            <input
                              type="time"
                              value={h.to === "24:00" ? "23:59" : h.to}
                              onChange={(e) =>
                                patch({
                                  hours: r.hours.map((x, n) =>
                                    n === i ? { ...x, to: e.target.value } : x,
                                  ),
                                })
                              }
                            />
                          </BookingField>
                          <Action
                            icon={Trash2}
                            onClick={() =>
                              patch({
                                hours: r.hours.filter((_, n) => n !== i),
                              })
                            }
                          >
                            Remove {days[h.day]} hours for {r.name}
                          </Action>
                        </div>
                      ))}
                    </section>
                  );
                })}
                <Link to="/admin/crm/calendar">
                  Manage time off and calendar connections in Calendar
                </Link>
              </>
            ) : null}
            {stage === 3 ? (
              <>
                <div className="ob-section-heading">
                  <h2>Client info</h2>
                </div>
                <BookingClientFieldEditor
                  fields={bookingClientFields(s)}
                  onChange={(fields) => settings({ fields })}
                />
                <div className="ob-panel">
                  <BookingField label="Privacy policy link">
                    <input
                      type="url"
                      value={s.privacyUrl}
                      onChange={(e) => settings({ privacyUrl: e.target.value })}
                      placeholder="https://"
                    />
                  </BookingField>
                  <BookingField label="Booking terms">
                    <textarea
                      rows={6}
                      value={s.terms}
                      onChange={(e) => settings({ terms: e.target.value })}
                    />
                  </BookingField>
                </div>
              </>
            ) : null}
            {stage === 4 ? (
              <>
                <div className="ob-section-heading">
                  <h2>Payment</h2>
                  <Link to="/admin/crm/payment-setup">Payment setup</Link>
                </div>
                <div className="ob-panel">
                  <span
                    className={
                      "ob-status " +
                      (data.paymentsReady ? "is-confirmed" : "is-requested")
                    }
                  >
                    {data.paymentsReady
                      ? "Card payments connected"
                      : "Card payments need setup"}
                  </span>
                  <BookingField label="Currency">
                    <select
                      value={s.currency}
                      onChange={(e) => settings({ currency: e.target.value })}
                    >
                      {[
                        ...new Set([
                          s.currency,
                          "GBP",
                          "EUR",
                          "USD",
                          "CAD",
                          "AUD",
                          "NZD",
                        ]),
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </BookingField>
                </div>
                {s.services.map((item) => (
                  <div className="ob-panel" key={item.id}>
                    <h3>{item.name}</h3>
                    <div className="ob-form-grid">
                      <BookingField label="Collect during booking">
                        <select
                          value={item.payment}
                          onChange={(e) =>
                            settings({
                              services: s.services.map((x) =>
                                x.id === item.id
                                  ? { ...x, payment: e.target.value as any }
                                  : x,
                              ),
                            })
                          }
                        >
                          <option value="full">Full payment</option>
                          <option value="deposit">Deposit</option>
                          <option value="later">Book now, pay later</option>
                          <option value="schedule">Payment schedule</option>
                        </select>
                      </BookingField>
                      {item.payment === "schedule" && (
                        <BookingField label="Payment schedule">
                          <select
                            value={item.scheduleId || ""}
                            onChange={(e) =>
                              settings({
                                services: s.services.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        scheduleId: e.target.value,
                                        schedule: data.schedules.find(
                                          (p) => p.id === e.target.value,
                                        ),
                                      }
                                    : x,
                                ),
                              })
                            }
                          >
                            <option value="">Choose a schedule</option>
                            {(data.schedules || []).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </BookingField>
                      )}
                      {item.payment === "deposit" && (
                        <BookingField label="Deposit (%)">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={item.depositPercent}
                            onChange={(e) =>
                              settings({
                                services: s.services.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        depositPercent: Number(e.target.value),
                                      }
                                    : x,
                                ),
                              })
                            }
                          />
                        </BookingField>
                      )}
                    </div>
                    <p>
                      {item.payment === "schedule" && !item.scheduleId
                        ? "Choose a payment schedule."
                        : `${bookingMoney(bookingDueNow({ ...item, schedule: data.schedules?.find((p) => p.id === item.scheduleId) || item.schedule }, item.amount), s.currency)} due at booking`}
                      {item.payment === "later"
                        ? " · Invoice due on the appointment date"
                        : ""}
                    </p>
                    {item.mode === "request" &&
                      (item.payment === "full" ||
                        item.payment === "deposit" ||
                        item.payment === "schedule") && (
                        <p className="ob-muted">
                          Any upfront payment is collected before approval.
                          Review a refund in the Job invoice if you decline.
                        </p>
                      )}
                  </div>
                ))}
                {!data.bookingEmailsEnabled && (
                  <p className="ob-message">
                    Automatic booking emails are awaiting activation. You can
                    prepare your messages below.
                  </p>
                )}
                <BookingMessageEditor
                  value={s.messages || defaultBookingMessages()}
                  onChange={(messages) => settings({ messages })}
                  templates={data.emailTemplates || []}
                />
              </>
            ) : null}
          </fieldset>
        </>
      ) : null}
    </AdminPage>
  );
}
