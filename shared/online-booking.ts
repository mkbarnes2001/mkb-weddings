export type BookingHours = { day: number; from: string; to: string };
export type BookingDateHours = {
  date: string;
  hours: { from: string; to: string }[];
};
export type BookingFieldDefinition = {
  id: string;
  kind:
    | "name"
    | "first_name"
    | "last_name"
    | "email"
    | "phone"
    | "lead_source"
    | "short"
    | "long";
  label: string;
  placeholder: string;
  required: boolean;
};
export type BookingSchedule = {
  id: string;
  name: string;
  depositType: "none" | "fixed" | "percentage";
  depositValue: number;
  depositDueDaysAfterAcceptance: number;
  finalBalanceDueDaysBeforeEvent: number;
};
export type BookingMessages = {
  thankYou: string;
  enabled: boolean;
  subject: string;
  body: string;
  appendSignature: boolean;
  templateId: string;
};
export type BookingResource = {
  id: string;
  name: string;
  userId: string;
  active: boolean;
  hours: BookingHours[];
  overrides?: BookingDateHours[];
};
export type BookingAddon = {
  id: string;
  name: string;
  amount: number;
  minutes: number;
  active: boolean;
};
export type BookingService = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  amount: number;
  minutes: number;
  bufferBefore: number;
  bufferAfter: number;
  mode: "instant" | "request";
  payment: "full" | "deposit" | "later" | "schedule";
  workflowId?: string;
  scheduleId?: string;
  schedule?: BookingSchedule;
  depositPercent: number;
  resourceIds: string[];
  addonIds: string[];
  active: boolean;
  jobType: string;
};
export type BookingSettings = {
  title: string;
  slotMinutes?: number;
  conflicts?: { jobs: boolean; leads: boolean };
  fields?: BookingFieldDefinition[];
  messages?: BookingMessages;
  timezone: string;
  currency: string;
  noticeHours: number;
  horizonDays: number;
  privacyUrl: string;
  terms: string;
  phoneRequired: boolean;
  questions: { id: string; label: string; required: boolean }[];
  services: BookingService[];
  addons: BookingAddon[];
  resources: BookingResource[];
};
export type BusyTime = { start: number; end: number; resourceId: string };
export type BookingSlot = {
  start: number;
  end: number;
  resourceId: string;
  label: string;
};
export const defaultBookingSettings = (
  timezone = "Europe/London",
  currency = "GBP",
): BookingSettings => ({
  title: "Book an appointment",
  timezone,
  currency,
  noticeHours: 24,
  horizonDays: 180,
  privacyUrl: "",
  terms: "",
  phoneRequired: false,
  questions: [],
  services: [],
  addons: [],
  resources: [],
});
export const defaultBookingHours = (): BookingHours[] =>
  [1, 2, 3, 4, 5].map((day) => ({ day, from: "09:00", to: "17:00" }));
export function bookingError(
  message: string,
  statusCode = 400,
): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}
const txt = (value: unknown, max = 300) =>
  String(value ?? "")
    .trim()
    .slice(0, max);
function number(value: unknown, min: number, max: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max)
    throw bookingError(`Enter a whole number between ${min} and ${max}.`);
  return n;
}
export function validBookingDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function clockMinutes(value: string) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) && value !== "24:00")
    throw bookingError("Enter a valid opening or closing time.");
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
export function cleanBookingSettings(input: any): BookingSettings {
  const s = defaultBookingSettings(
    txt(input?.timezone),
    txt(input?.currency).toUpperCase(),
  );
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: s.timezone }).format();
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: s.currency,
    }).format(0);
  } catch {
    throw bookingError("Choose a valid timezone and currency.");
  }
  if (!["GBP", "EUR", "USD", "CAD", "AUD", "NZD"].includes(s.currency))
    throw bookingError("Choose a valid currency.");
  s.slotMinutes = number(input.slotMinutes ?? 15, 5, 120);
  if (![5, 10, 15, 20, 30, 60, 90, 120].includes(s.slotMinutes))
    throw bookingError("Choose a supported timeslot interval.");
  s.conflicts = {
    jobs: input.conflicts?.jobs !== false,
    leads: Boolean(input.conflicts?.leads),
  };
  s.messages = cleanBookingMessages(input.messages);
  s.title = txt(input.title, 120) || "Book an appointment";
  s.noticeHours = number(input.noticeHours, 0, 720);
  s.horizonDays = number(input.horizonDays, 1, 365);
  s.privacyUrl = txt(input.privacyUrl, 1000);
  if (s.privacyUrl && !/^https:\/\//.test(s.privacyUrl))
    throw bookingError("Privacy link must start with https://.");
  s.terms = txt(input.terms, 8000);
  s.phoneRequired = Boolean(input.phoneRequired);
  const list = (x: any, max: number) => {
    if (!Array.isArray(x) || x.length > max)
      throw bookingError("Too many items or an invalid list.");
    return x;
  };
  const ids = new Set<string>();
  const id = (v: any) => {
    const n = txt(v, 100);
    if (!/^[a-zA-Z0-9_-]{3,100}$/.test(n) || ids.has(n))
      throw bookingError("Every item needs a unique identifier.");
    ids.add(n);
    return n;
  };
  s.resources = list(input.resources, 30).map((r) => ({
    id: id(r.id),
    name: txt(r.name, 120),
    userId: txt(r.userId, 120),
    active: Boolean(r.active),
    overrides: list(r.overrides || [], 366).map((o: any) => {
      if (!validBookingDate(o.date))
        throw bookingError("Choose a valid availability date.");
      return {
        date: o.date,
        hours: list(o.hours, 8).map((h: any) => {
          if (clockMinutes(h.from) >= clockMinutes(h.to))
            throw bookingError("Opening time must be before closing time.");
          return { from: h.from, to: h.to };
        }),
      };
    }),
    hours: list(r.hours, 28).map((h: any) => {
      const from = txt(h.from),
        to = txt(h.to);
      if (clockMinutes(from) >= clockMinutes(to))
        throw bookingError("Opening time must be before closing time.");
      return { day: number(h.day, 0, 6), from, to };
    }),
  }));
  for (const r of s.resources)
    if (new Set(r.overrides?.map((o) => o.date)).size !== r.overrides?.length)
      throw bookingError("Each availability date can have only one override.");
  const users = s.resources.map((r) => r.userId).filter(Boolean);
  if (new Set(users).size !== users.length)
    throw bookingError(
      "A workspace member can have only one booking calendar.",
    );
  s.addons = list(input.addons, 50).map((a) => ({
    id: id(a.id),
    name: txt(a.name, 120),
    amount: number(a.amount, 0, 10000000),
    minutes: number(a.minutes, 0, 720),
    active: Boolean(a.active),
  }));
  s.services = list(input.services, 50).map((a) => {
    const imageUrl = txt(a.imageUrl, 2000);
    if (imageUrl && !/^https?:\/\//.test(imageUrl))
      throw bookingError("Use an uploaded image or a valid image URL.");
    if (
      !["instant", "request"].includes(a.mode) ||
      !["full", "deposit", "later", "schedule"].includes(a.payment)
    )
      throw bookingError("Choose confirmation and payment options.");
    const resourceIds = [
        ...new Set(list(a.resourceIds, 30).map((x: any) => txt(x))),
      ],
      addonIds = [...new Set(list(a.addonIds, 50).map((x: any) => txt(x)))];
    if (
      resourceIds.some((x) => !s.resources.some((r) => r.id === x)) ||
      addonIds.some((x) => !s.addons.some((r) => r.id === x))
    )
      throw bookingError("A selected team member or add-on no longer exists.");
    return {
      id: id(a.id),
      name: txt(a.name, 120),
      description: txt(a.description, 4000),
      imageUrl,
      amount: number(a.amount, 0, 10000000),
      minutes: number(a.minutes, 5, 1440),
      bufferBefore: number(a.bufferBefore, 0, 720),
      bufferAfter: number(a.bufferAfter, 0, 720),
      mode: a.mode,
      payment: a.payment,
      workflowId: txt(a.workflowId, 100),
      scheduleId: txt(a.scheduleId, 100),
      depositPercent: number(a.depositPercent, 1, 100),
      resourceIds,
      addonIds,
      active: Boolean(a.active),
      jobType: txt(a.jobType, 60) || "appointment",
    };
  });
  s.questions = list(input.questions, 12).map((q) => ({
    id: id(q.id),
    label: txt(q.label, 200),
    required: Boolean(q.required),
  }));
  s.fields = cleanBookingFields(
    bookingClientFields({ ...s, fields: input.fields }),
  );
  if (
    [...s.services, ...s.resources, ...s.addons].some((i) => !i.name) ||
    s.questions.some((q) => !q.label)
  )
    throw bookingError("Give each item a name.");
  if (
    s.services.some(
      (x) =>
        x.active &&
        !x.resourceIds.some((id) =>
          s.resources.some((r) => r.id === id && r.active),
        ),
    )
  )
    throw bookingError(
      "Assign an available team member to each active service.",
    );
  return s;
}
const formatters = new Map<string, Intl.DateTimeFormat>();
export function bookingLocalParts(ms: number, zone: string) {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(zone, f);
  }
  const p = Object.fromEntries(
    f.formatToParts(new Date(ms)).map((p) => [p.type, p.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}
export function bookingLocalInstant(date: string, time: string, zone: string) {
  if (!validBookingDate(date)) throw bookingError("Choose a valid date.");
  const mins = clockMinutes(time);
  if (mins === 1440) throw bookingError("Choose a time before midnight.");
  const base = Date.parse(date + "T00:00:00Z");
  const matches: number[] = [];
  for (let ms = base - 14 * 3600000; ms < base + 38 * 3600000; ms += 60000) {
    const p = bookingLocalParts(ms, zone);
    if (p.date === date && p.time === time) matches.push(ms);
  }
  if (matches.length !== 1)
    throw bookingError(
      matches.length
        ? "That local time occurs twice during the clock change. Choose a different time."
        : "That local time does not exist during the clock change.",
    );
  return matches[0];
}
export function bookingQuote(
  settings: BookingSettings,
  serviceId: string,
  addonIds: string[] = [],
) {
  const service = settings.services.find((s) => s.id === serviceId && s.active);
  if (!service) throw bookingError("This service is unavailable.", 404);
  if (
    !Array.isArray(addonIds) ||
    new Set(addonIds).size !== addonIds.length ||
    addonIds.length > 50
  )
    throw bookingError("Choose valid add-ons.");
  const addons = addonIds.map((id) => {
    const a = settings.addons.find(
      (a) => a.id === id && a.active && service.addonIds.includes(id),
    );
    if (!a) throw bookingError("An add-on is unavailable.");
    return a;
  });
  const amount = service.amount + addons.reduce((n, a) => n + a.amount, 0),
    minutes = service.minutes + addons.reduce((n, a) => n + a.minutes, 0);
  if (minutes > 1440)
    throw bookingError("This appointment is too long for online booking.");
  const dueNow = bookingDueNow(service, amount);
  if (dueNow > 0 && dueNow < (settings.currency === "GBP" ? 30 : 50))
    throw bookingError(
      "The booking payment is below the minimum card amount. Please contact the business.",
    );
  return { service, addons, amount, dueNow, minutes };
}
export function bookingSlots(
  settings: BookingSettings,
  serviceId: string,
  addonIds: string[],
  date: string,
  busy: BusyTime[],
  now = Date.now(),
): BookingSlot[] {
  if (!validBookingDate(date)) throw bookingError("Choose a valid date.");
  const q = bookingQuote(settings, serviceId, addonIds),
    base = Date.parse(date + "T00:00:00Z");
  const today = bookingLocalParts(now, settings.timezone).date;
  if (
    date < today ||
    base > Date.parse(today + "T00:00:00Z") + settings.horizonDays * 86400000
  )
    return [];
  const day = new Date(base).getUTCDay(),
    result: BookingSlot[] = [];
  const candidates: { ms: number; minutes: number; time: string }[] = [];
  for (let ms = base - 14 * 3600000; ms < base + 38 * 3600000; ms += 60000) {
    if (ms < now + settings.noticeHours * 3600000) continue;
    const p = bookingLocalParts(ms, settings.timezone);
    if (p.date === date)
      candidates.push({ ms, minutes: p.minutes, time: p.time });
  }
  for (const r of settings.resources.filter(
    (r) => r.active && q.service.resourceIds.includes(r.id),
  )) {
    for (const c of candidates) {
      const end = c.ms + q.minutes * 60000,
        from = c.ms - q.service.bufferBefore * 60000,
        to = end + q.service.bufferAfter * 60000;
      const first = bookingLocalParts(from, settings.timezone),
        last = bookingLocalParts(to - 1, settings.timezone);
      if (
        first.date !== date ||
        last.date !== date ||
        !(
          r.overrides?.find((o) => o.date === date)?.hours ||
          r.hours.filter((h) => h.day === day)
        ).some(
          (h) =>
            (c.minutes - clockMinutes(h.from)) %
              (settings.slotMinutes || 15) ===
              0 &&
            first.minutes >= clockMinutes(h.from) &&
            last.minutes < clockMinutes(h.to),
        )
      )
        continue;
      if (
        busy.some(
          (b) =>
            (b.resourceId === "*" || b.resourceId === r.id) &&
            b.start < to &&
            b.end > from,
        )
      )
        continue;
      result.push({
        start: c.ms,
        end,
        resourceId: r.id,
        label: new Intl.DateTimeFormat("en-GB", {
          timeZone: settings.timezone,
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        }).format(c.ms),
      });
    }
  }
  return result.sort(
    (a, b) => a.start - b.start || a.resourceId.localeCompare(b.resourceId),
  );
}
export const bookingMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    amount / 100,
  );

export function bookingDueNow(service: BookingService, amount: number) {
  if (service.payment === "later") return 0;
  if (service.payment === "schedule") {
    const preset = service.schedule;
    if (!preset || preset.id !== service.scheduleId)
      throw bookingError("Refresh the payment schedule before booking.", 409);
    if (preset.depositDueDaysAfterAcceptance > 0) return 0;
    if (preset.depositType === "fixed")
      return Math.min(amount, preset.depositValue);
    if (preset.depositType === "percentage")
      return Math.ceil((amount * preset.depositValue) / 100);
    return 0;
  }
  return service.payment === "deposit"
    ? Math.ceil((amount * service.depositPercent) / 100)
    : amount;
}
export function bookingClientFields(
  s: Pick<BookingSettings, "fields" | "questions" | "phoneRequired">,
): BookingFieldDefinition[] {
  if (s.fields) return s.fields;
  return [
    {
      id: "name",
      kind: "name",
      label: "Your name",
      placeholder: "",
      required: true,
    },
    {
      id: "email",
      kind: "email",
      label: "Email",
      placeholder: "",
      required: true,
    },
    {
      id: "phone",
      kind: "phone",
      label: "Phone",
      placeholder: "",
      required: s.phoneRequired,
    },
    ...s.questions.map((q) => ({
      ...q,
      kind: "long" as const,
      placeholder: "",
    })),
  ];
}
function cleanBookingFields(input: any): BookingFieldDefinition[] {
  if (!Array.isArray(input) || input.length > 24)
    throw bookingError("Choose up to 24 client fields.");
  const ids = new Set<string>(),
    builtins = new Set<string>();
  const fields = input.map((f) => {
    const kind = f.kind,
      id = txt(f.id, 100);
    if (
      ![
        "name",
        "first_name",
        "last_name",
        "email",
        "phone",
        "lead_source",
        "short",
        "long",
      ].includes(kind) ||
      !/^[a-zA-Z0-9_-]{3,100}$/.test(id) ||
      ids.has(id)
    )
      throw bookingError("Choose a valid, unique client field.");
    if (!["short", "long"].includes(kind)) {
      if (builtins.has(kind))
        throw bookingError("Each client field can appear once.");
      builtins.add(kind);
    }
    ids.add(id);
    const label = txt(f.label, 200);
    if (!label) throw bookingError("Give each client field a label.");
    return {
      id,
      kind,
      label,
      placeholder: txt(f.placeholder, 200),
      required:
        ["name", "first_name", "email"].includes(kind) || Boolean(f.required),
    };
  });
  if (
    !builtins.has("email") ||
    (!builtins.has("name") && !builtins.has("first_name")) ||
    (builtins.has("name") &&
      (builtins.has("first_name") || builtins.has("last_name")))
  )
    throw bookingError(
      "Collect an email and either a full name or separate name fields.",
    );
  return fields;
}
export const defaultBookingMessages = (): BookingMessages => ({
  thankYou:
    "Thank you, %client_name%. Your %session_name% booking is %booking_status%.",
  enabled: false,
  subject: "%session_name% — %booking_status%",
  body: "Hi %client_name%,\n\nYour %session_name% booking with %company_name% is %booking_status%.\n\nDate: %session_date%\nTime: %session_start_time%\nTeam member: %team_member%\n\n%invoice_link%\n\nThank you,\n%company_name%",
  appendSignature: true,
  templateId: "",
});
export const bookingMergeFields = [
  "client_name",
  "first_name",
  "last_name",
  "session_name",
  "session_date",
  "session_start_time",
  "company_name",
  "team_member",
  "booking_status",
  "invoice_link",
  "booking_link",
];
function cleanBookingMessages(input: any): BookingMessages {
  const defaults = defaultBookingMessages(),
    value = { ...defaults, ...input };
  for (const key of ["thankYou", "subject", "body"] as const) {
    value[key] = txt(
      value[key],
      key === "subject" ? 200 : key === "thankYou" ? 3000 : 12000,
    );
    for (const token of value[key]
      .replace(/\{\{\s*([a-z_]+)\s*\}\}/g, "%$1%")
      .matchAll(/%([a-z_]+)%/g))
      if (!bookingMergeFields.includes(token[1]))
        throw bookingError("Unknown booking merge field: " + token[1]);
  }
  if (value.enabled && (!value.subject || !value.body))
    throw bookingError("Enter a confirmation email subject and message.");
  return {
    thankYou: value.thankYou,
    subject: value.subject.replace(/[\r\n]+/g, " "),
    body: value.body,
    enabled: Boolean(value.enabled),
    appendSignature: value.appendSignature !== false,
    templateId: txt(value.templateId, 100),
  };
}
export function mergeBookingText(
  template: string,
  values: Record<string, string>,
) {
  return template
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/g, "%$1%")
    .replace(/%([a-z_]+)%/g, (match, key) => values[key] ?? "");
}
export function bookingClientDetails(settings: BookingSettings, input: any) {
  const fields = bookingClientFields(settings),
    answers: Record<string, string> = {};
  const values: Record<string, string> = {
    name: txt(input.name, 120),
    first_name: txt(input.firstName, 120),
    last_name: txt(input.lastName, 120),
    email: txt(input.email, 254).toLowerCase(),
    phone: txt(input.phone, 60),
    lead_source: txt(input.leadSource, 200),
  };
  for (const f of fields) {
    const value = ["short", "long"].includes(f.kind)
      ? txt(input.answers?.[f.id], f.kind === "short" ? 500 : 2000)
      : values[f.kind];
    if (f.required && !value) throw bookingError("Complete " + f.label + ".");
    if (["short", "long"].includes(f.kind)) answers[f.id] = value;
  }
  const split = fields.some((f) => f.kind === "first_name");
  return {
    name: split
      ? [values.first_name, values.last_name].filter(Boolean).join(" ")
      : values.name,
    firstName: split ? values.first_name : values.name,
    lastName: split ? values.last_name : "",
    email: values.email,
    phone: fields.some((f) => f.kind === "phone") ? values.phone : "",
    leadSource: fields.some((f) => f.kind === "lead_source")
      ? values.lead_source
      : "",
    answers,
  };
}

// Use the public deployment origin for sharing, even when Admin runs elsewhere.
export function bookingPublicOrigin(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (
      url.username ||
      url.password ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
        ))
    )
      throw Error();
    return url.origin;
  } catch {
    throw bookingError(
      "The public booking address needs deployment setup.",
      503,
    );
  }
}
export function bookingWebsiteButton(url: string, label = "Book now"): string {
  const parsed = new URL(url);
  bookingPublicOrigin(url);
  if (
    !/^\/book\/[a-z0-9][a-z0-9-]{2,79}$/.test(parsed.pathname) ||
    parsed.search ||
    parsed.hash
  )
    throw bookingError("Choose a valid public booking link.");
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  return `<a href="${escape(parsed.href)}" target="_blank" rel="noopener noreferrer">${escape(label.trim() || "Book now")}</a>`;
}
