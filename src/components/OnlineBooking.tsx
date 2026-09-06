import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
  ImagePlus,
  LockKeyhole,
} from "lucide-react";
import {
  bookingLocalParts,
  bookingMoney,
  bookingDueNow,
  bookingClientFields,
  type BookingSlot,
  type BookingService,
  type BookingAddon,
} from "../../shared/online-booking";
import { bookingInvoiceSchedule } from "../../shared/booking-invoice-schedule";
import "../admin/online-booking.css";

async function publicRequest(
  slug: string,
  action = "",
  body?: any,
  token = "",
  signal?: AbortSignal,
) {
  const response = await fetch(
    "/api/online-booking/" +
      encodeURIComponent(slug) +
      (action ? "/" + action : ""),
    {
      method: body === undefined ? "GET" : "POST",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal,
    },
  );
  const data = await response
    .json()
    .catch(() => ({ error: "Unable to complete your booking." }));
  if (!response.ok)
    throw Error(data.error || "Unable to complete your booking.");
  return data;
}
const statusText: Record<string, { title: string; body: string }> = {
  confirmed: {
    title: "Your appointment is confirmed",
    body: "Your time is reserved. Keep this page for your booking reference.",
  },
  requested: {
    title: "Your request has been received",
    body: "Your payment has been recorded where required. The business will review your request before confirming your appointment.",
  },
  held: {
    title: "Complete your booking",
    body: "Your time is held temporarily while you pay. Your appointment is confirmed only after payment is received and any required approval is complete.",
  },
  expired: {
    title: "This reservation has expired",
    body: "Please choose an available time and try again.",
  },
  payment_review: {
    title: "Your payment needs review",
    body: "Payment has been recorded, but the appointment could not be confirmed automatically. Please contact the business with your booking reference.",
  },
  cancelled: {
    title: "This booking was cancelled",
    body: "Contact the business about any payment or refund.",
  },
  declined: {
    title: "This request was declined",
    body: "Contact the business about an alternative time and any payment or refund.",
  },
};
export function OnlineBooking() {
  const { slug = "" } = useParams(),
    [data, setData] = useState<any>(null),
    [step, setStep] = useState(0),
    [serviceId, setServiceId] = useState(""),
    [addonIds, setAddonIds] = useState<string[]>([]);
  const [resourceId, setResourceId] = useState(""),
    [date, setDate] = useState(""),
    [slots, setSlots] = useState<BookingSlot[]>([]),
    [slot, setSlot] = useState<BookingSlot | null>(null);
  const [client, setClient] = useState({
    name: "",
    firstName: "",
    lastName: "",
    leadSource: "",
    email: "",
    phone: "",
    website: "",
    consent: false,
    answers: {} as Record<string, string>,
  });
  const [invoice, setInvoice] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null),
    [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [slotsLoading, setSlotsLoading] = useState(false),
    [error, setError] = useState("");
  const submitting = useRef(false),
    retry = useRef<{ payload: string; key: string } | null>(null);
  const service: BookingService | undefined = data?.services.find(
      (s: any) => s.id === serviceId,
    ),
    addons: BookingAddon[] =
      data?.addons.filter((a: any) => addonIds.includes(a.id)) || [];
  const amount =
      (service?.amount || 0) + addons.reduce((n, a) => n + a.amount, 0),
    dueNow = service ? bookingDueNow(service, amount) : 0;
  const minutes =
    (service?.minutes || 0) + addons.reduce((n, a) => n + a.minutes, 0);
  const money = (n: number) =>
    bookingMoney(n, booking?.currency || data?.currency || "GBP");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const url = new URL(window.location.href),
      id = url.searchParams.get("booking"),
      invoiceMode = url.searchParams.get("invoice") === "1";
    const hash = new URLSearchParams(url.hash.slice(1)),
      cap =
        hash.get("document") ||
        hash.get("token") ||
        (id ? sessionStorage.getItem("booking-token:" + id) : "");
    if (invoiceMode) {
      if (id && cap) {
        sessionStorage.setItem("booking-token:" + id, cap);
        url.hash = "";
        window.history.replaceState(null, "", url);
        publicRequest(slug, "invoice", { id }, cap, controller.signal)
          .then((d) => setInvoice(d.invoice))
          .catch((e) => {
            if (e.name !== "AbortError") setError(e.message);
          })
          .finally(() => setLoading(false));
      } else {
        setError(
          "Open the secure invoice link from your booking confirmation.",
        );
        setLoading(false);
      }
      return () => controller.abort();
    }
    publicRequest(slug, "", undefined, "", controller.signal)
      .then((d) => {
        setData(d);
        setDate(
          bookingLocalParts(Date.now() + d.noticeHours * 3600000, d.timezone)
            .date,
        );
      })
      .catch((e) => {
        if (e.name !== "AbortError" && !id) setError(e.message);
      })
      .finally(() => setLoading(false));
    if (id && cap) {
      setToken(cap);
      sessionStorage.setItem("booking-token:" + id, cap);
      url.hash = "";
      window.history.replaceState(null, "", url);
      publicRequest(slug, "status", { id }, cap, controller.signal)
        .then((d) => setBooking(d.booking))
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        });
    } else if (id)
      setError(
        "Open the original booking link in this browser to view your reservation.",
      );
    return () => controller.abort();
  }, [slug]);
  useEffect(() => {
    if (step !== 1 || !service || !date) return;
    const controller = new AbortController();
    setSlotsLoading(true);
    setError("");
    setSlot(null);
    setSlots([]);
    const q = new URLSearchParams({ serviceId, date });
    addonIds.forEach((id) => q.append("addon", id));
    publicRequest(slug, "slots?" + q, undefined, "", controller.signal)
      .then((d) => setSlots(d.slots))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSlotsLoading(false);
      });
    return () => controller.abort();
  }, [step, serviceId, date, addonIds, slug]);
  useEffect(() => {
    if (booking?.status !== "held" || !token) return;
    let active = true,
      count = 0;
    const timer = setInterval(async () => {
      if (++count > 30) {
        clearInterval(timer);
        return;
      }
      try {
        const d = await publicRequest(
          slug,
          "status",
          { id: booking.id },
          token,
        );
        if (active) setBooking(d.booking);
      } catch {
        /* Manual refresh remains available after a temporary connection failure. */
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [booking?.id, booking?.status, token, slug]);
  async function pay(receipt = booking, cap = token) {
    setBusy(true);
    setError("");
    try {
      const result = await publicRequest(
        slug,
        "checkout",
        { id: receipt.id },
        cap,
      );
      if (!/^https:\/\/checkout\.stripe\.com\//.test(result.checkoutUrl))
        throw Error("Payment could not be opened. Please retry.");
      window.location.assign(result.checkoutUrl);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function reserve() {
    if (!service || !slot || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = {
          ...client,
          serviceId,
          addonIds,
          resourceId: slot.resourceId,
          start: slot.start,
        },
        serial = JSON.stringify(payload);
      if (retry.current?.payload !== serial)
        retry.current = { payload: serial, key: crypto.randomUUID() };
      const result = await publicRequest(slug, "reserve", {
        ...payload,
        idempotencyKey: retry.current.key,
        revision: data.revision,
      });
      const receipt = result.booking,
        cap = receipt.token;
      sessionStorage.setItem("booking-token:" + receipt.id, cap);
      setToken(cap);
      setBooking(receipt);
      window.history.replaceState(
        null,
        "",
        "/book/" + encodeURIComponent(slug) + "?booking=" + receipt.id,
      );
      if (receipt.status === "held") await pay(receipt, cap);
      else setBusy(false);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    } finally {
      submitting.current = false;
    }
  }
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setBooking(
        (await publicRequest(slug, "status", { id: booking.id }, token))
          .booking,
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function details(e: FormEvent) {
    e.preventDefault();
    setStep(3);
    setError("");
  }
  function restart() {
    if (booking) sessionStorage.removeItem("booking-token:" + booking.id);
    setBooking(null);
    setToken("");
    setSlot(null);
    setStep(1);
    retry.current = null;
    window.history.replaceState(null, "", "/book/" + encodeURIComponent(slug));
  }
  const when = (start: number, end: number, zone: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(start) +
    " – " +
    new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(end);
  return (
    <main className="online-booking-public">
      <header className="ob-public-header">
        <span className="ob-public-mark">
          <CalendarDays size={21} />
        </span>
        <strong>
          {data?.businessName || invoice?.businessName || "Online booking"}
        </strong>
        <span>Powered by WedPlanned</span>
      </header>
      {error && (
        <p role="alert" className="ob-message ob-message--error">
          {error}
        </p>
      )}
      {invoice ? (
        <section className="ob-public-panel ob-invoice">
          <h1>Invoice {invoice.reference}</h1>
          <p>{invoice.businessName}</p>
          <p>{invoice.clientName}</p>
          <p>Issued {invoice.issued}</p>
          {invoice.items.map((item: any, i: number) => (
            <div className="ob-price-row" key={i}>
              <span>
                {item.name}
                {item.quantity > 1 ? " × " + item.quantity : ""}
              </span>
              <strong>
                {bookingMoney(item.line_total_amount, invoice.currency)}
              </strong>
            </div>
          ))}
          <div className="ob-price-row">
            <span>Total</span>
            <strong>{bookingMoney(invoice.total, invoice.currency)}</strong>
          </div>
          <div className="ob-price-row">
            <span>Paid</span>
            <strong>{bookingMoney(invoice.paid, invoice.currency)}</strong>
          </div>
          <div className="ob-price-row">
            <span>Balance</span>
            <strong>
              {bookingMoney(
                Math.max(0, invoice.total - invoice.paid),
                invoice.currency,
              )}
            </strong>
          </div>
          <h2>Payment schedule</h2>
          {invoice.schedule.map((item: any, i: number) => (
            <div className="ob-price-row" key={i}>
              <span>
                {item.label} · {item.due_date}
              </span>
              <strong>{bookingMoney(item.amount, invoice.currency)}</strong>
            </div>
          ))}
        </section>
      ) : booking ? (
        <section className="ob-receipt">
          <div className="ob-receipt-icon">
            {booking.status === "confirmed" ? <Check /> : <CalendarDays />}
          </div>
          <h1>{statusText[booking.status]?.title || "Your booking"}</h1>
          <p>{booking.thankYou || statusText[booking.status]?.body}</p>
          <dl>
            <div>
              <dt>Reference</dt>
              <dd>{booking.reference}</dd>
            </div>
            <div>
              <dt>Session</dt>
              <dd>{booking.serviceName}</dd>
            </div>
            <div>
              <dt>Team member</dt>
              <dd>{booking.resourceName}</dd>
            </div>
            <div>
              <dt>When</dt>
              <dd>{when(booking.start, booking.end, booking.timezone)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{money(booking.amount)}</dd>
            </div>
            {booking.dueNow > 0 && (
              <div>
                <dt>
                  {booking.status === "held" ? "Due now" : "Payment recorded"}
                </dt>
                <dd>
                  {money(
                    booking.status === "held"
                      ? booking.dueNow
                      : booking.paidAmount || 0,
                  )}
                </dd>
              </div>
            )}
            {booking.amount > booking.dueNow &&
              ["requested", "confirmed"].includes(booking.status) && (
                <div>
                  <dt>Remaining invoice balance</dt>
                  <dd>
                    {money(
                      Math.max(0, booking.amount - (booking.paidAmount || 0)),
                    )}
                  </dd>
                </div>
              )}
          </dl>
          {booking.invoiceSchedule?.length > 0 && (
            <details className="ob-public-terms">
              <summary>Payment schedule</summary>
              {booking.invoiceSchedule.map((item: any, i: number) => (
                <div className="ob-price-row" key={i}>
                  <span>
                    {item.label} · {item.date}
                  </span>
                  <strong>{money(item.amount)}</strong>
                </div>
              ))}
            </details>
          )}
          <div className="ob-public-actions">
            {booking.hasInvoice && (
              <a
                href={
                  "/book/" +
                  encodeURIComponent(slug) +
                  "?booking=" +
                  encodeURIComponent(booking.id) +
                  "&invoice=1"
                }
              >
                View invoice
              </a>
            )}
            <button disabled={busy} onClick={refresh}>
              Refresh status
            </button>
            {booking.status === "held" && (
              <button
                className="ob-primary"
                disabled={busy}
                onClick={() => pay()}
              >
                {busy ? "Opening payment…" : "Continue to payment"}
              </button>
            )}
            {["expired", "cancelled", "declined"].includes(booking.status) &&
              data && (
                <button className="ob-primary" onClick={restart}>
                  Choose another time
                </button>
              )}
          </div>
        </section>
      ) : loading ? (
        <p role="status">Loading booking page…</p>
      ) : data ? (
        <>
          <div className="ob-public-title">
            <h1>{data.title}</h1>
            <p>
              {
                [
                  "Choose your session",
                  "Choose a time",
                  "Your details",
                  "Review your booking",
                ][step]
              }
            </p>
          </div>
          <ol className="ob-public-progress" aria-label="Booking progress">
            {["Session", "Date & time", "Your details", "Payment"].map(
              (name, i) => (
                <li key={name} aria-current={i === step ? "step" : undefined}>
                  <span>{i < step ? <Check size={14} /> : i + 1}</span>
                  {name}
                </li>
              ),
            )}
          </ol>
          {step === 0 ? (
            <>
              <div className="ob-public-services">
                {data.services.map((s: BookingService) => (
                  <button
                    key={s.id}
                    className={
                      "ob-public-service " +
                      (s.id === serviceId ? "is-selected" : "")
                    }
                    onClick={() => {
                      setServiceId(s.id);
                      setAddonIds([]);
                      setSlot(null);
                    }}
                    aria-pressed={s.id === serviceId}
                  >
                    {s.imageUrl ? (
                      <img src={s.imageUrl} alt="" />
                    ) : (
                      <div className="ob-image-placeholder">
                        <ImagePlus size={30} />
                      </div>
                    )}
                    <div>
                      <h2>{s.name}</h2>
                      <div className="ob-service-meta">
                        <strong>{money(s.amount)}</strong>
                        <span>
                          <Clock size={14} />
                          {s.minutes} min
                        </span>
                      </div>
                      <p>{s.description}</p>
                      <span className="ob-public-mode">
                        {s.mode === "instant"
                          ? "Instant confirmation"
                          : "Approval required"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {!data.services.length && (
                <p>
                  No sessions are currently available. Please contact the
                  business.
                </p>
              )}
              {service &&
                data.addons.some((a: any) =>
                  service.addonIds.includes(a.id),
                ) && (
                  <section className="ob-public-panel">
                    <h2>Add-ons</h2>
                    {data.addons
                      .filter((a: any) => service.addonIds.includes(a.id))
                      .map((a: BookingAddon) => (
                        <label key={a.id} className="ob-public-addon">
                          <input
                            type="checkbox"
                            checked={addonIds.includes(a.id)}
                            onChange={(e) =>
                              setAddonIds(
                                e.target.checked
                                  ? [...addonIds, a.id]
                                  : addonIds.filter((id) => id !== a.id),
                              )
                            }
                          />
                          <span>
                            {a.name}
                            {a.minutes > 0 && (
                              <small>+ {a.minutes} minutes</small>
                            )}
                          </span>
                          <strong>{money(a.amount)}</strong>
                        </label>
                      ))}
                  </section>
                )}
              <div className="ob-public-actions">
                <span>
                  {service ? money(amount) + " · " + minutes + " minutes" : ""}
                </span>
                <button
                  className="ob-primary"
                  disabled={!service}
                  onClick={() => setStep(1)}
                >
                  Choose a time
                </button>
              </div>
            </>
          ) : null}
          {step === 1 ? (
            <section className="ob-public-panel">
              <div className="ob-public-form-grid">
                <label>
                  Team member
                  <select
                    value={resourceId}
                    onChange={(e) => {
                      setResourceId(e.target.value);
                      setSlot(null);
                    }}
                  >
                    <option value="">Any available team member</option>
                    {data.resources
                      .filter((r: any) => service?.resourceIds.includes(r.id))
                      .map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={date}
                    min={bookingLocalParts(Date.now(), data.timezone).date}
                    max={new Date(
                      Date.parse(
                        bookingLocalParts(Date.now(), data.timezone).date +
                          "T12:00:00Z",
                      ) +
                        data.horizonDays * 86400000,
                    )
                      .toISOString()
                      .slice(0, 10)}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
              </div>
              <p className="ob-public-zone">Times shown in {data.timezone}</p>
              {slotsLoading ? (
                <p role="status">Checking availability…</p>
              ) : (
                <div className="ob-slots">
                  {slots
                    .filter((s) => !resourceId || s.resourceId === resourceId)
                    .map((s) => (
                      <button
                        key={s.start + s.resourceId}
                        className={
                          slot?.start === s.start &&
                          slot.resourceId === s.resourceId
                            ? "is-selected"
                            : ""
                        }
                        aria-pressed={
                          slot?.start === s.start &&
                          slot.resourceId === s.resourceId
                        }
                        onClick={() => setSlot(s)}
                      >
                        <strong>{s.label}</strong>
                        {!resourceId && (
                          <span>
                            {
                              data.resources.find(
                                (r: any) => r.id === s.resourceId,
                              )?.name
                            }
                          </span>
                        )}
                      </button>
                    ))}
                  {!slots.filter(
                    (s) => !resourceId || s.resourceId === resourceId,
                  ).length &&
                    !error && (
                      <p>
                        No times available on this date. Try another date or
                        team member.
                      </p>
                    )}
                </div>
              )}
              <div className="ob-public-actions">
                <button onClick={() => setStep(0)}>
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button
                  className="ob-primary"
                  disabled={!slot || slotsLoading}
                  onClick={() => setStep(2)}
                >
                  Your details
                </button>
              </div>
            </section>
          ) : null}
          {step === 2 ? (
            <form className="ob-public-panel" onSubmit={details}>
              <div className="ob-public-form-grid">
                {bookingClientFields(data).map((field) => {
                  const key =
                    (
                      {
                        first_name: "firstName",
                        last_name: "lastName",
                        lead_source: "leadSource",
                      } as Record<string, string>
                    )[field.kind] || field.kind;
                  const custom =
                    field.kind === "short" || field.kind === "long";
                  const props = {
                    required: field.required,
                    placeholder: field.placeholder,
                    maxLength:
                      field.kind === "long"
                        ? 2000
                        : field.kind === "short"
                          ? 500
                          : field.kind === "email"
                            ? 254
                            : 120,
                    value: custom
                      ? client.answers[field.id] || ""
                      : (client as any)[key] || "",
                    onChange: (e: any) =>
                      setClient(
                        custom
                          ? {
                              ...client,
                              answers: {
                                ...client.answers,
                                [field.id]: e.target.value,
                              },
                            }
                          : { ...client, [key]: e.target.value },
                      ),
                  };
                  return (
                    <label key={field.id}>
                      {field.label}
                      {!field.required ? " (optional)" : ""}
                      {field.kind === "long" ? (
                        <textarea rows={3} {...props} />
                      ) : (
                        <input
                          type={
                            field.kind === "email"
                              ? "email"
                              : field.kind === "phone"
                                ? "tel"
                                : "text"
                          }
                          autoComplete={
                            (
                              {
                                first_name: "given-name",
                                last_name: "family-name",
                                name: "name",
                                email: "email",
                                phone: "tel",
                              } as Record<string, string>
                            )[field.kind] || "off"
                          }
                          {...props}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
              <div className="ob-honeypot" aria-hidden="true">
                <label>
                  Website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={client.website}
                    onChange={(e) =>
                      setClient({ ...client, website: e.target.value })
                    }
                  />
                </label>
              </div>
              {data.terms && (
                <details className="ob-public-terms">
                  <summary>Booking terms</summary>
                  <p>{data.terms}</p>
                </details>
              )}
              <label className="ob-public-consent">
                <input
                  type="checkbox"
                  required
                  checked={client.consent}
                  onChange={(e) =>
                    setClient({ ...client, consent: e.target.checked })
                  }
                />
                <span>
                  I agree to the booking terms and to this business using my
                  details to manage my appointment.
                  {data.privacyUrl && (
                    <>
                      {" "}
                      <a
                        href={data.privacyUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Privacy policy
                      </a>
                      .
                    </>
                  )}
                </span>
              </label>
              <div className="ob-public-actions">
                <button type="button" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="submit" className="ob-primary">
                  Review booking
                </button>
              </div>
            </form>
          ) : null}
          {step === 3 && service && slot ? (
            <section className="ob-public-panel ob-review">
              <h2>{service.name}</h2>
              <p>{when(slot.start, slot.end, data.timezone)}</p>
              <p>
                {
                  data.resources.find((r: any) => r.id === slot.resourceId)
                    ?.name
                }{" "}
                ·{" "}
                {client.name ||
                  [client.firstName, client.lastName].filter(Boolean).join(" ")}
              </p>
              <div className="ob-price-row">
                <span>{service.name}</span>
                <strong>{money(service.amount)}</strong>
              </div>
              {addons.map((a) => (
                <div className="ob-price-row" key={a.id}>
                  <span>{a.name}</span>
                  <strong>{money(a.amount)}</strong>
                </div>
              ))}
              <div className="ob-price-row">
                <span>Total</span>
                <strong>{money(amount)}</strong>
              </div>
              <div className="ob-price-row ob-due-now">
                <span>
                  {dueNow > 0 && dueNow < amount
                    ? "Deposit due now"
                    : "Due now"}
                </span>
                <strong>{money(dueNow)}</strong>
              </div>
              {amount > dueNow && (
                <div className="ob-payment-summary">
                  {bookingInvoiceSchedule(
                    service,
                    amount,
                    dueNow,
                    bookingLocalParts(Date.now(), data.timezone).date,
                    bookingLocalParts(slot.start, data.timezone).date,
                  ).map((item: any, i: number) => (
                    <div className="ob-price-row" key={i}>
                      <span>
                        {item.label} · {item.date}
                      </span>
                      <strong>{money(item.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
              {service.mode === "request" && (
                <p className="ob-message">
                  This session needs approval.
                  {dueNow > 0
                    ? " Payment is collected now. The business will confirm your request and arrange any refund if it is declined."
                    : " The business will review your request before confirming."}
                </p>
              )}
              {dueNow > 0 && (
                <p className="ob-secure">
                  <LockKeyhole size={15} />
                  Secure card payment with Stripe
                </p>
              )}
              <div className="ob-public-actions">
                <button disabled={busy} onClick={() => setStep(2)}>
                  Back
                </button>
                <button
                  className="ob-primary"
                  disabled={busy}
                  onClick={reserve}
                >
                  {busy
                    ? "Reserving your time…"
                    : dueNow > 0
                      ? dueNow < amount
                        ? "Pay deposit"
                        : "Pay " + money(dueNow)
                      : service.mode === "request"
                        ? "Request booking"
                        : "Confirm booking"}
                </button>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
