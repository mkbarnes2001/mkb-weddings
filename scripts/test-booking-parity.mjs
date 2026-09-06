import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: `export * from './serverless/booking-confirmation-data'; export * from './serverless/booking-configuration'; export * from './serverless/crm-booking-confirmations'; export * from './serverless/calendar-credentials'; export {onRequest as middleware} from './functions/_middleware'; export {verifyStripeWebhook} from './serverless/stripe-payments'; export * from './shared/online-booking'; export * from './serverless/crm-online-booking-d1'; export * from './serverless/crm-online-booking-payments'; export * from './serverless/crm-calendar-google'; export {processStripeInvoicePaymentEvent} from './serverless/crm-connected-payments-d1'; export {onRequest as publicRoute} from './functions/api/online-booking/[[path]]';`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  plugins: [
    {
      name: "no-cloudflare-sockets",
      setup(build) {
        build.onResolve({ filter: /^cloudflare:sockets$/ }, () => ({
          path: "cloudflare:sockets",
          namespace: "mock",
        }));
        build.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents:
            "export function connect(){throw Error('Live SMTP forbidden in this test')}",
        }));
      },
    },
  ],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
mkdirSync(".wrangler/booking-parity", { recursive: true });
writeFileSync(".wrangler/booking-parity/parity-api.mjs", outputFiles[0].text);
const api = await import(
  "../.wrangler/booking-parity/parity-api.mjs?" + Date.now()
);
const sql = new DatabaseSync(":memory:");
sql.exec("PRAGMA foreign_keys=OFF");
sql.exec(readFileSync("d1/schema.sql", "utf8"));
sql.exec("PRAGMA foreign_keys=ON");
const run = (q, ...args) => sql.prepare(q).run(...args),
  one = (q, ...args) => sql.prepare(q).get(...args);
let beforeBatch;
const db = {
  prepare(query) {
    return {
      query,
      args: [],
      bind(...args) {
        this.args = args;
        return this;
      },
      async first(column) {
        const row = sql.prepare(query).get(...this.args);
        return column ? (row?.[column] ?? null) : (row ?? null);
      },
      async all() {
        return { results: sql.prepare(query).all(...this.args) };
      },
      async run() {
        const r = run(query, ...this.args);
        return { meta: { changes: Number(r.changes) } };
      },
    };
  },
  async batch(statements) {
    if (beforeBatch) {
      const hook = beforeBatch;
      beforeBatch = null;
      hook();
    }
    sql.exec("SAVEPOINT booking");
    try {
      const result = statements.map((s) => ({
        meta: { changes: Number(run(s.query, ...s.args).changes) },
      }));
      sql.exec("RELEASE booking");
      return result;
    } catch (e) {
      sql.exec("ROLLBACK TO booking");
      sql.exec("RELEASE booking");
      throw e;
    }
  },
};
const ws = "workspace_mkb_weddings",
  actor = {
    workspaceId: ws,
    permissions: ["crm:read", "crm:manage"],
    authenticated: true,
    mode: "session",
    accessMode: "membership",
    userId: "booking-owner",
    membershipId: "booking-member",
  };
run(
  "INSERT INTO platform_users(id,email_normalized,email,display_name) VALUES('booking-owner','owner@example.test','owner@example.test','Owner')",
);
run(
  "INSERT INTO business_memberships(id,workspace_id,user_id,email_normalized,email,role,status) VALUES('booking-member',?,'booking-owner','owner@example.test','owner@example.test','owner','active')",
  ws,
);
run(
  "INSERT INTO workspace_payment_settings(workspace_id,card_payments_enabled,stripe_account_id,stripe_connection_status,stripe_charges_enabled,stripe_payouts_enabled) VALUES(?,1,'acct_booking','ready',1,1) ON CONFLICT(workspace_id) DO UPDATE SET card_payments_enabled=1,stripe_account_id='acct_booking',stripe_connection_status='ready',stripe_charges_enabled=1,stripe_payouts_enabled=1",
  ws,
);
const env = {
  CRM_ONLINE_BOOKING_ENABLED: "true",
  CRM_ONLINE_BOOKING_PUBLIC_ENABLED: "true",
  WEDPLANNED_STRIPE_SECRET_KEY: "sk_test_mock_only",
};
globalThis.fetch = async () => {
  throw Error("Unexpected external request: blocked");
};
const settings = api.defaultBookingSettings();
settings.noticeHours = 0;
settings.resources = [
  {
    id: "artist-one",
    name: "Artist One",
    userId: "booking-owner",
    active: true,
    hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      day,
      from: "09:00",
      to: "18:00",
    })),
  },
  {
    id: "artist-two",
    name: "Artist Two",
    userId: "",
    active: true,
    hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      day,
      from: "09:00",
      to: "18:00",
    })),
  },
];
settings.addons = [
  {
    id: "addon-lashes",
    name: "Lashes",
    amount: 2000,
    minutes: 15,
    active: true,
  },
];
settings.services = [
  {
    id: "trial-service",
    name: "Makeup trial",
    description: "Trial",
    imageUrl: "",
    amount: 10000,
    minutes: 60,
    bufferBefore: 15,
    bufferAfter: 15,
    mode: "instant",
    payment: "deposit",
    depositPercent: 25,
    resourceIds: ["artist-one", "artist-two"],
    addonIds: ["addon-lashes"],
    active: true,
    jobType: "makeup",
  },
];
run(
  "INSERT INTO crm_workflow_templates(id,workspace_id,name) VALUES('parity-flow',?,'Booking welcome')",
  ws,
);
run(
  "INSERT INTO crm_workflow_template_steps(id,workspace_id,template_id,name,relative_to,offset_days) VALUES('parity-step',?,'parity-flow','Prepare trial','event_date',-2)",
  ws,
);
run(
  "INSERT INTO crm_payment_schedule_presets(id,workspace_id,name,deposit_type,deposit_value,deposit_due_days_after_acceptance,final_balance_due_days_before_event) VALUES('parity-schedule',?,'Quarter deposit', 'percentage',25,0,2)",
  ws,
);
run(
  "INSERT INTO crm_email_templates(id,workspace_id,name,purpose,status,subject_template,body_text) VALUES('parity-email',?,'Booking message','booking','active','{{session_name}}: %booking_status%','Hi %first_name%, %session_date% at %session_start_time%. %invoice_link%')",
  ws,
);
run(
  "INSERT INTO crm_email_settings(workspace_id,sender_name,signature_json) VALUES(?,'Test Business',?) ON CONFLICT(workspace_id) DO UPDATE SET signature_json=excluded.signature_json",
  ws,
  JSON.stringify({
    name: "Sam",
    businessName: "Test Business",
    text: "See you soon",
  }),
);
const date = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
settings.slotMinutes = 30;
settings.resources[0].overrides = [
  { date, hours: [{ from: "10:10", to: "13:10" }] },
];
settings.resources[1].overrides = [{ date, hours: [] }];
settings.fields = [
  ["first", "first_name", "First name", true],
  ["last", "last_name", "Last name", true],
  ["mail", "email", "Email", true],
  ["source", "lead_source", "How did you hear?", true],
  ["note", "short", "Access needs", false],
  ["detail", "long", "Anything else?", false],
].map(([id, kind, label, required]) => ({
  id,
  kind,
  label,
  required,
  placeholder: "Enter " + label,
}));
settings.messages = {
  ...api.defaultBookingMessages(),
  enabled: true,
  templateId: "parity-email",
  subject: "{{session_name}}: %booking_status%",
  body: "Hello %first_name% %last_name%.\n%invoice_link%",
  thankYou: "Thank you %first_name%; your booking is %booking_status%.",
};
settings.services[0] = {
  ...settings.services[0],
  workflowId: "parity-flow",
  payment: "later",
  bufferBefore: 0,
  bufferAfter: 0,
};
let saved = await api.saveOnlineBookingPage(db, env, actor, {
  settings,
  publicSlug: "booking-parity",
  enabled: true,
  revision: 0,
});
let page = await api.publicBookingPage(db, env, "booking-parity");
assert.equal(
  saved.workflows.find((w) => w.id === "parity-flow").name,
  "Booking welcome",
);
assert.equal(
  saved.emailTemplates.find((e) => e.id === "parity-email").appendSignature,
  1,
);
assert.ok(!("workflow" in api.publicBookingView(page).services[0]));
let slots = await api.getPublicBookingSlots(db, env, page, {
  date,
  serviceId: "trial-service",
  addonIds: [],
});
assert.deepEqual(
  slots.map((s) => api.bookingLocalParts(s.start, settings.timezone).time),
  ["10:10", "10:40", "11:10", "11:40", "12:10"],
);
assert.ok(slots.every((s) => s.resourceId === "artist-one"));
assert.throws(
  () =>
    api.cleanBookingSettings({
      ...settings,
      fields: [...settings.fields, settings.fields[0]],
    }),
  /unique/,
);
assert.throws(
  () =>
    api.cleanBookingSettings({
      ...settings,
      messages: { ...settings.messages, subject: "%unknown%" },
    }),
  /Unknown/,
);
const input = {
  revision: page.revision,
  firstName: "Alex",
  lastName: "Taylor",
  email: "alex@example.test",
  leadSource: "Instagram",
  answers: { note: "Step-free access", detail: "Longer message" },
  consent: true,
  serviceId: "trial-service",
  addonIds: [],
  resourceId: slots[0].resourceId,
  start: slots[0].start,
  idempotencyKey: crypto.randomUUID(),
};
await assert.rejects(
  api.reserveOnlineBooking(db, env, page, { ...input, lastName: "" }),
  /Last name/,
);
const booking = await api.reserveOnlineBooking(db, env, page, input);
assert.equal(booking.status, "confirmed");
assert.equal(booking.dueNow, 0);
assert.match(booking.thankYou, /Thank you Alex/);
const event = one("SELECT * FROM crm_calendar_events WHERE id=?", booking.id);
assert.equal(
  one("SELECT lead_source FROM crm_enquiries WHERE id=?", event.enquiry_id)
    .lead_source,
  "Instagram",
);
assert.equal(
  one(
    "SELECT first_name,last_name FROM crm_contacts WHERE email_normalized=?",
    "alex@example.test",
  ).last_name,
  "Taylor",
);
assert.equal(
  one("SELECT due_date FROM crm_invoices WHERE id=?", event.invoice_id)
    .due_date,
  date,
);
assert.equal(
  one("SELECT title FROM crm_tasks WHERE job_id=?", event.job_id).title,
  "Prepare trial",
);
await api.applyBookingWorkflows(db, ws);
await api.applyBookingWorkflows(db, ws);
assert.equal(
  one("SELECT COUNT(*) n FROM crm_tasks WHERE job_id=?", event.job_id).n,
  1,
);
run(
  "UPDATE crm_workflow_template_steps SET name='Changed later' WHERE id='parity-step'",
);
assert.equal(
  one("SELECT title FROM crm_tasks WHERE job_id=?", event.job_id).title,
  "Prepare trial",
);
let mailRequests = [],
  failMail = false;
globalThis.fetch = async (url, init) => {
  assert.equal(String(url), "https://api.resend.com/emails");
  mailRequests.push({ body: init.body, headers: init.headers });
  if (failMail) throw Error("Synthetic transport failure");
  return new Response(JSON.stringify({ id: "mail_" + mailRequests.length }), {
    headers: { "Content-Type": "application/json" },
  });
};
const mailEnv = {
  ...env,
  CRM_BOOKING_EMAIL_ENABLED: "true",
  CRM_BOOKING_PUBLIC_ORIGIN: "https://booking.example.test",
  RESEND_API_KEY: "synthetic-key",
  WEDPLANNED_AUTH_FROM_EMAIL: "bookings@example.test",
};
assert.equal(
  (await api.deliverBookingConfirmations(db, env, ws)).disabled,
  true,
);
assert.equal(mailRequests.length, 0);
assert.equal(
  (await api.deliverBookingConfirmations(db, mailEnv, ws, booking.id)).sent,
  1,
);
await api.deliverBookingConfirmations(db, mailEnv, ws, booking.id);
assert.equal(mailRequests.length, 1);
const sent = JSON.parse(mailRequests[0].body);
assert.match(sent.text, /Hello Alex Taylor/);
assert.match(sent.text, /See you soon/);
assert.match(sent.text, /confirmed/);
const invoiceUrl = new URL(
  sent.text.match(
    /https:\/\/booking\.example\.test\/book\/[^\s]+&invoice=1#document=[^\s]+/,
  )[0],
);
const cap = new URLSearchParams(invoiceUrl.hash.slice(1)).get("document");
const invoice = await api.getBookingInvoice(
  db,
  "booking-parity",
  booking.id,
  cap,
);
assert.equal(invoice.total, 10000);
assert.equal(invoice.clientName, "Alex Taylor");
assert.equal(
  (await api.getBookingInvoice(db, "booking-parity", booking.id, booking.token))
    .reference,
  invoice.reference,
);
await assert.rejects(
  api.getBookingInvoice(db, "another-business", booking.id, cap),
  { statusCode: 404 },
);
await assert.rejects(
  api.bookingWithToken(db, "booking-parity", booking.id, cap),
  { statusCode: 404 },
); // document capability cannot pay
run(
  "UPDATE crm_booking_document_tokens SET expires_at=0 WHERE token_hash=?",
  await api.bookingHash(cap),
);
await assert.rejects(
  api.getBookingInvoice(db, "booking-parity", booking.id, cap),
  { statusCode: 404 },
);
// Requested appointments attach their saved workflow only after approval.
settings.services[0].mode = "request";
settings.services[0].payment = "schedule";
settings.services[0].scheduleId = "parity-schedule";
saved = await api.saveOnlineBookingPage(db, env, actor, {
  settings,
  publicSlug: "booking-parity",
  enabled: true,
  revision: saved.revision,
});
page = await api.publicBookingPage(db, env, "booking-parity");
assert.equal(api.bookingDueNow(page.settings.services[0], 12000), 3000);
const nextDate = new Date(Date.now() + 16 * 86400000)
  .toISOString()
  .slice(0, 10);
slots = await api.getPublicBookingSlots(db, env, page, {
  date: nextDate,
  serviceId: "trial-service",
  addonIds: ["addon-lashes"],
});
const paid = await api.reserveOnlineBooking(db, env, page, {
  ...input,
  revision: page.revision,
  start: slots[0].start,
  resourceId: slots[0].resourceId,
  addonIds: ["addon-lashes"],
  email: "paid@example.test",
  idempotencyKey: crypto.randomUUID(),
});
assert.equal(paid.status, "held");
assert.equal(paid.dueNow, 3000);
const paidEvent = one("SELECT * FROM crm_calendar_events WHERE id=?", paid.id);
assert.equal(
  one(
    "SELECT COUNT(*) n FROM crm_job_workflows WHERE job_id=?",
    paidEvent.job_id,
  ).n,
  0,
);
assert.deepEqual(
  sql
    .prepare(
      "SELECT amount FROM crm_invoice_schedule_items WHERE invoice_id=? ORDER BY display_order",
    )
    .all(paidEvent.invoice_id)
    .map((x) => x.amount),
  [3000, 9000],
);
// Real reconciliation uses the ledger; no live Stripe request occurs.
run(
  "INSERT INTO crm_invoice_payments(id,workspace_id,invoice_id,payment_type,amount,currency,paid_at) VALUES('parity-payment',?,?,'payment',3000,'GBP',CURRENT_TIMESTAMP)",
  ws,
  paidEvent.invoice_id,
);
await api.reconcileBookingPayments(db, env, ws, paidEvent.invoice_id);
assert.equal(
  one("SELECT status FROM crm_calendar_events WHERE id=?", paid.id).status,
  "requested",
);
failMail = true;
assert.equal(
  (await api.deliverBookingConfirmations(db, mailEnv, ws, paid.id)).failed,
  1,
);
const failedRequest = mailRequests.at(-1).body;
failMail = false;
assert.equal(
  (await api.deliverBookingConfirmations(db, mailEnv, ws, paid.id)).sent,
  1,
);
assert.equal(mailRequests.at(-1).body, failedRequest);
assert.match(JSON.parse(failedRequest).text, /awaiting approval/);
let current = one("SELECT * FROM crm_calendar_events WHERE id=?", paid.id);
await api.changeCalendarEvent(db, env, actor, paid.id, {
  action: "confirm",
  version: current.version,
});
assert.equal(
  one(
    "SELECT COUNT(*) n FROM crm_job_workflows WHERE job_id=?",
    paidEvent.job_id,
  ).n,
  1,
);
assert.equal(
  (await api.deliverBookingConfirmations(db, mailEnv, ws, paid.id)).sent,
  1,
);
assert.match(JSON.parse(mailRequests.at(-1).body).text, /confirmed/);
// Tenant-scoped template references cannot be forged in a save.
await assert.rejects(
  api.saveOnlineBookingPage(db, env, actor, {
    settings: {
      ...settings,
      services: [
        { ...settings.services[0], workflowId: "missing-foreign-flow" },
      ],
    },
    publicSlug: "booking-parity",
    enabled: true,
    revision: saved.revision,
  }),
  { statusCode: 409 },
);
assert.equal(
  api.mergeBookingText("Hi {{first_name}} %last_name%", {
    first_name: "Alex",
    last_name: "Taylor",
  }),
  "Hi Alex Taylor",
);
console.log(
  "PASS: date overrides/closed staff/anchored intervals, client fields and lead source, immutable workflows and idempotent tasks, pay-later and preset invoice schedules, confirmation status/signature/merge fields, durable mock email retries, scoped expiring invoice links, no real network, schema 54",
);

// Selectable legacy sources still enforce conflicts atomically if a Lead arrives mid-reservation.
const conflictDate = new Date(Date.now() + 20 * 86400000)
  .toISOString()
  .slice(0, 10);
settings.conflicts = { jobs: false, leads: true };
settings.services[0].payment = "later";
saved = await api.saveOnlineBookingPage(db, env, actor, {
  settings,
  publicSlug: "booking-parity",
  enabled: true,
  revision: saved.revision,
});
page = await api.publicBookingPage(db, env, "booking-parity");
run(
  "INSERT INTO crm_jobs(id,workspace_id,reference,title,event_date) VALUES('legacy-job',?,'LEGACY','Existing job',?)",
  ws,
  conflictDate,
);
slots = await api.getPublicBookingSlots(db, env, page, {
  date: conflictDate,
  serviceId: "trial-service",
  addonIds: [],
});
assert.ok(slots.length > 0, "Legacy Jobs can be excluded");
const countBefore = one("SELECT count(*) n FROM crm_jobs").n;
beforeBatch = () =>
  run(
    "INSERT INTO crm_enquiries(id,workspace_id,reference,event_date,status,stage_id) VALUES('racing-lead',?,'RACE',?,'open','crm_stage_workspace_mkb_weddings_new')",
    ws,
    conflictDate,
  );
await assert.rejects(
  api.reserveOnlineBooking(db, env, page, {
    ...input,
    revision: page.revision,
    start: slots[0].start,
    resourceId: slots[0].resourceId,
    idempotencyKey: crypto.randomUUID(),
  }),
  { statusCode: 409 },
);
assert.equal(one("SELECT count(*) n FROM crm_jobs").n, countBefore);
assert.equal(
  (
    await api.getPublicBookingSlots(db, env, page, {
      date: conflictDate,
      serviceId: "trial-service",
      addonIds: [],
    })
  ).length,
  0,
);
settings.conflicts = { jobs: true, leads: false };
saved = await api.saveOnlineBookingPage(db, env, actor, {
  settings,
  publicSlug: "booking-parity",
  enabled: true,
  revision: saved.revision,
});
page = await api.publicBookingPage(db, env, "booking-parity");
assert.equal(
  (
    await api.getPublicBookingSlots(db, env, page, {
      date: conflictDate,
      serviceId: "trial-service",
      addonIds: [],
    })
  ).length,
  0,
  "Jobs still block when selected",
);
// Verified Google selections stay scoped to this connected account and invalidate stale slots.
Object.assign(env, {
  CRM_CALENDAR_GOOGLE_CLIENT_ID: "mock-client",
  CRM_CALENDAR_GOOGLE_CLIENT_SECRET: "mock-secret",
  CRM_CALENDAR_CREDENTIAL_KEY: "mock-encryption-key-at-least-32-characters",
});
const credential = await api.sealCalendarCredential(env, ws, "artist-one", {
  refreshToken: "mock-refresh",
});
run(
  "INSERT INTO crm_google_calendar_connections(workspace_id,resource_id,credential_json,connected_by) VALUES(?,?,?,?)",
  ws,
  "artist-one",
  JSON.stringify(credential),
  actor.userId,
);
let checked = [];
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u === "https://oauth2.googleapis.com/token")
    return new Response(JSON.stringify({ access_token: "mock-access" }));
  if (u.includes("/users/me/calendarList"))
    return new Response(
      JSON.stringify({
        items: [
          { id: "owner@example.test", summary: "Work", primary: true },
          { id: "personal@example.test", summary: "Personal" },
        ],
      }),
    );
  if (u.includes("/calendars/")) {
    const id = decodeURIComponent(u.match(/calendars\/([^/]+)\/events/)[1]);
    checked.push(id);
    return new Response(
      JSON.stringify({
        timeZone: "Europe/London",
        items:
          id === "personal@example.test"
            ? [
                {
                  id: "private",
                  start: { dateTime: new Date(input.start).toISOString() },
                  end: {
                    dateTime: new Date(input.start + 3600000).toISOString(),
                  },
                },
              ]
            : [],
      }),
    );
  }
  throw Error("Unmocked network blocked");
};
const beforeRevision = (await api.bookingPage(db, ws)).revision;
const calendars = await api.googleConflictCalendars(
  db,
  env,
  actor,
  "artist-one",
  ["personal@example.test"],
);
assert.deepEqual(calendars.selected, ["primary", "personal@example.test"]);
assert.equal((await api.bookingPage(db, ws)).revision, beforeRevision + 1);
const busy = await api.googleCalendarBusy(
  db,
  env,
  ws,
  settings,
  input.start,
  input.start + 3600000,
);
assert.equal(busy.length, 1);
assert.deepEqual(checked, ["primary", "personal@example.test"]);
await assert.rejects(
  api.googleConflictCalendars(db, env, actor, "artist-one", [
    "foreign@example.test",
  ]),
  { statusCode: 409 },
);
await assert.rejects(
  api.googleConflictCalendars(
    db,
    env,
    { ...actor, accessMode: "support" },
    "artist-one",
    [],
  ),
  { statusCode: 403 },
);
console.log(
  "PASS: Google multi-calendar selection, external busy aggregation, tenant/role/source validation and revision invalidation",
);
// Shared links must use the public host, not Admin's host or a caller's supplied field.
const shareAdmin = await api.getOnlineBookingAdmin(
  db,
  { ...env, CRM_BOOKING_PUBLIC_ORIGIN: "https://book.example.test/" },
  actor,
);
assert.equal(shareAdmin.publicBookingOrigin, "https://book.example.test");
assert.equal(shareAdmin.bookingShareIssue, "");
assert.equal(
  (await api.getOnlineBookingAdmin(db, env, actor)).publicBookingOrigin,
  "",
);
const invalidShare = await api.getOnlineBookingAdmin(
  db,
  { ...env, CRM_BOOKING_PUBLIC_ORIGIN: "https://user:private@example.test/" },
  actor,
);
assert.equal(invalidShare.publicBookingOrigin, "");
assert.match(invalidShare.bookingShareIssue, /setup/);
assert.ok(!JSON.stringify(invalidShare).includes("private@"));
const button = api.bookingWebsiteButton(
  "https://book.example.test/book/test-business",
  'Book <now> & "save"',
);
assert.ok(
  button.includes('href="https://book.example.test/book/test-business"'),
);
assert.ok(button.includes("Book &lt;now&gt; &amp; &quot;save&quot;"));
assert.ok(button.includes('rel="noopener noreferrer"'));
assert.throws(
  () => api.bookingWebsiteButton("javascript:alert(1)"),
  /public booking/,
);
assert.throws(
  () => api.bookingWebsiteButton("https://book.example.test/admin"),
  /valid public booking/,
);
console.log(
  "PASS: canonical public sharing origin, safe invalid-config handling and escaped website button HTML",
);

// Production can expose setup/Calendar before accepting any public bookings.
const setupEnv = { ...env, CRM_ONLINE_BOOKING_PUBLIC_ENABLED: "false" };
const setupAdmin = await api.getOnlineBookingAdmin(db, setupEnv, actor);
assert.equal(setupAdmin.publicBookingEnabled, false);
const savedPage = await api.bookingPage(db, ws);
await assert.rejects(
  api.saveOnlineBookingPage(db, setupEnv, actor, {
    ...setupAdmin,
    enabled: true,
  }),
  { statusCode: 503 },
);
assert.equal((await api.bookingPage(db, ws)).revision, savedPage.revision);
await api.saveOnlineBookingPage(db, setupEnv, actor, {
  ...setupAdmin,
  enabled: false,
});
assert.equal((await api.bookingPage(db, ws)).enabled, 0);
for (const flag of [undefined, "false"]) {
  const disabledEnv = { ...env, CRM_ONLINE_BOOKING_PUBLIC_ENABLED: flag };
  await assert.rejects(
    api.publicBookingPage(db, disabledEnv, savedPage.public_slug),
    { statusCode: 503 },
  );
  for (const action of [
    "",
    "slots",
    "reserve",
    "checkout",
    "status",
    "invoice",
  ]) {
    const method = ["", "slots"].includes(action) ? "GET" : "POST";
    const response = await api.publicRoute({
      env: {
        ...disabledEnv,
        MKB_DB: {
          prepare() {
            throw Error("Setup-only public route touched the database");
          },
        },
      },
      params: { path: [savedPage.public_slug, ...(action ? [action] : [])] },
      request: new Request(
        "https://book.example.test/api/online-booking/" +
          savedPage.public_slug +
          (action ? "/" + action : ""),
        { method },
      ),
      waitUntil() {
        throw Error("Setup-only public route scheduled an external action");
      },
    });
    assert.equal(response.status, 503);
  }
}
console.log(
  "PASS: setup-only draft save, rejected publication and all public routes disabled before database/provider access",
);
