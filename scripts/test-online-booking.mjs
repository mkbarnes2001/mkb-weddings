import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: `export {onRequest as middleware} from './functions/_middleware'; export {verifyStripeWebhook} from './serverless/stripe-payments'; export * from './shared/online-booking'; export * from './serverless/crm-online-booking-d1'; export * from './serverless/crm-online-booking-payments'; export * from './serverless/crm-calendar-google'; export {processStripeInvoicePaymentEvent} from './serverless/crm-connected-payments-d1'; export {onRequest as publicRoute} from './functions/api/online-booking/[[path]]';`,
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
mkdirSync(".wrangler/online-booking", { recursive: true });
writeFileSync(".wrangler/online-booking/test-api.mjs", outputFiles[0].text);
const api = await import(
  "../.wrangler/online-booking/test-api.mjs?" + Date.now()
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
const saved = await api.saveOnlineBookingPage(db, env, actor, {
  settings,
  publicSlug: "booking-test",
  enabled: true,
  revision: 0,
});
assert.equal(saved.revision, 1);
let page = await api.publicBookingPage(db, env, "booking-test");
const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const slots = await api.getPublicBookingSlots(db, env, page, {
  date,
  serviceId: "trial-service",
  addonIds: ["addon-lashes"],
});
assert.ok(slots.length > 2);
const input = {
  revision: page.revision,
  name: "Test Client",
  email: "client@example.test",
  consent: true,
  serviceId: "trial-service",
  addonIds: ["addon-lashes"],
  resourceId: slots[0].resourceId,
  start: slots[0].start,
  idempotencyKey: crypto.randomUUID(),
};
const booking = await api.reserveOnlineBooking(db, env, page, input);
assert.equal(booking.status, "held");
assert.equal(booking.amount, 12000);
assert.equal(booking.dueNow, 3000);
assert.equal(
  (await api.reserveOnlineBooking(db, env, page, input)).id,
  booking.id,
);
await assert.rejects(
  api.reserveOnlineBooking(db, env, page, { ...input, name: "Different" }),
  { statusCode: 409 },
);
const counts = () =>
  [
    "crm_jobs",
    "crm_enquiries",
    "crm_contacts",
    "crm_invoices",
    "crm_calendar_events",
  ].map((table) => one(`SELECT COUNT(*) AS n FROM ${table}`).n);
const before = counts();
await assert.rejects(
  api.reserveOnlineBooking(db, env, page, {
    ...input,
    email: "second@example.test",
    idempotencyKey: crypto.randomUUID(),
  }),
  { statusCode: 409 },
);
assert.deepEqual(counts(), before);
await assert.rejects(
  api.bookingWithToken(db, "booking-test", booking.id, "wrong-token"),
  { statusCode: 404 },
);
await assert.rejects(
  api.bookingWithToken(db, "another-business", booking.id, booking.token),
  { statusCode: 404 },
);
assert.equal(
  (
    await api.getBookingReceipt(
      db,
      env,
      "booking-test",
      booking.id,
      booking.token,
    )
  ).status,
  "held",
);
let stripeCalls = 0,
  stripeBody;
globalThis.fetch = async (url, options) => {
  assert.equal(url, "https://api.stripe.com/v1/checkout/sessions");
  stripeCalls++;
  stripeBody = new URLSearchParams(options.body);
  assert.equal(options.headers["Stripe-Account"], "acct_booking");
  return Response.json({
    id: "cs_booking_mock",
    url: "https://checkout.stripe.com/c/pay/mock",
  });
};
await api.beginOnlineBookingCheckout(
  db,
  env,
  "booking-test",
  booking.id,
  booking.token,
  "https://admin.example.test/api/online-booking/booking-test/checkout",
);
await api.beginOnlineBookingCheckout(
  db,
  env,
  "booking-test",
  booking.id,
  booking.token,
  "https://admin.example.test",
);
assert.equal(stripeCalls, 1);
assert.equal(stripeBody.get("line_items[0][price_data][unit_amount]"), "3000");
assert.equal(stripeBody.get("payment_method_types[0]"), "card");
const attempt = one(
  "SELECT * FROM crm_invoice_payment_attempts WHERE id=?",
  "obpay_" + booking.id,
);
assert.equal(
  attempt.client_identity_id,
  null,
  "Public booking must not assert a verified portal identity",
);
const settlement = {
  id: "evt_booking_mock",
  type: "checkout.session.completed",
  account: "acct_booking",
  data: {
    object: {
      id: "cs_booking_mock",
      mode: "payment",
      payment_status: "paid",
      payment_intent: "pi_booking_mock",
      amount_total: 3000,
      currency: "gbp",
      metadata: Object.fromEntries(
        [...stripeBody]
          .filter(([k]) => /^metadata\[/.test(k))
          .map(([k, v]) => [k.slice(9, -1), v]),
      ),
    },
  },
};
const paid = await api.processStripeInvoicePaymentEvent(db, settlement);
assert.ok(paid.paymentId);
await api.reconcileBookingPayments(db, env, ws);
assert.equal(
  (
    await api.getBookingReceipt(
      db,
      env,
      "booking-test",
      booking.id,
      booking.token,
    )
  ).status,
  "confirmed",
);
await api.processStripeInvoicePaymentEvent(db, settlement);
assert.equal(
  one(
    "SELECT COUNT(*) AS n FROM crm_invoice_payments WHERE invoice_id=?",
    attempt.invoice_id,
  ).n,
  1,
);
assert.equal(
  one("SELECT status FROM crm_invoices WHERE id=?", attempt.invoice_id).status,
  "part_paid",
);
const event = one("SELECT * FROM crm_calendar_events WHERE id=?", booking.id);
assert.equal(
  one("SELECT status FROM crm_jobs WHERE id=?", event.job_id).status,
  "booked",
);
await assert.rejects(
  api.changeCalendarEvent(db, env, actor, event.id, {
    action: "cancel",
    version: 1,
  }),
  { statusCode: 409 },
);
assert.equal(api.validBookingDate("2026-99-99"), false);
assert.equal(api.validBookingDate("2026-02-30"), false);
assert.throws(
  () => api.bookingLocalInstant("2026-03-29", "01:30", "Europe/London"),
  { statusCode: 400 },
);
assert.throws(
  () => api.bookingLocalInstant("2026-10-25", "01:30", "Europe/London"),
  { statusCode: 400 },
);
assert.equal(
  new Date(
    api.bookingLocalInstant("2026-10-25", "02:30", "Europe/London"),
  ).toISOString(),
  "2026-10-25T02:30:00.000Z",
);
await assert.rejects(
  api.saveOnlineBookingPage(
    db,
    env,
    { ...actor, accessMode: "support" },
    { settings },
  ),
  { statusCode: 403 },
);
await assert.rejects(api.getOnlineBookingAdmin(db, {}, actor), {
  statusCode: 503,
});
assert.equal(
  one("SELECT value FROM schema_meta WHERE key='schema_version'").value,
  "54",
);
// Two clients read availability concurrently; only one atomic reservation wins.
globalThis.fetch = async () => {
  throw Error("Unexpected external request: blocked");
};
const nextSlot = (
  await api.getPublicBookingSlots(db, env, page, {
    date,
    serviceId: "trial-service",
    addonIds: [],
  })
).find((x) => x.resourceId === "artist-two");
const pair = await Promise.allSettled(
  [1, 2].map((n) =>
    api.reserveOnlineBooking(db, env, page, {
      ...input,
      addonIds: [],
      email: `parallel-${n}@example.test`,
      resourceId: nextSlot.resourceId,
      start: nextSlot.start,
      idempotencyKey: crypto.randomUUID(),
    }),
  ),
);
assert.equal(pair.filter((x) => x.status === "fulfilled").length, 1);
assert.equal(
  pair.filter((x) => x.status === "rejected")[0].reason.statusCode,
  409,
);
const concurrent = pair.find((x) => x.status === "fulfilled").value;
assert.equal(
  counts()[0],
  before[0] + 1,
  "Failed concurrent reservation must roll back its Job and financial records",
);
const failedClient =
  pair[0].status === "rejected"
    ? "parallel-1@example.test"
    : "parallel-2@example.test";
assert.equal(
  one(
    "SELECT COUNT(*) AS n FROM crm_contacts WHERE email_normalized=?",
    failedClient,
  ).n,
  0,
);
await assert.rejects(
  api.saveOnlineBookingPage(db, env, actor, {
    settings,
    enabled: true,
    revision: 1,
    publicSlug: "renamed-address",
  }),
  { statusCode: 409 },
);
await assert.rejects(
  api.reserveOnlineBooking(db, env, page, {
    ...input,
    start: "bad",
    idempotencyKey: crypto.randomUUID(),
  }),
  { statusCode: 400 },
);
assert.throws(
  () =>
    run("UPDATE crm_jobs SET event_date='2030-01-01' WHERE id=?", event.job_id),
  /Manage this appointment/,
);
// A stale admin write must not update the associated Job after failing its calendar version.
beforeBatch = () =>
  run(
    "UPDATE crm_calendar_events SET status='confirmed',version=version+1 WHERE id=?",
    event.id,
  );
await assert.rejects(
  api.changeCalendarEvent(db, env, actor, event.id, {
    action: "cancel",
    version: event.version,
  }),
  { statusCode: 409 },
);
assert.equal(
  one("SELECT status FROM crm_jobs WHERE id=?", event.job_id).status,
  "booked",
);
// No-payment holds expire atomically. Verified money arriving later requires review.
const held = one("SELECT * FROM crm_calendar_events WHERE id=?", concurrent.id);
let lateParams;
globalThis.fetch = async (url, options) => {
  assert.equal(url, "https://api.stripe.com/v1/checkout/sessions");
  lateParams = new URLSearchParams(options.body);
  return Response.json({
    id: "cs_late_mock",
    url: "https://checkout.stripe.com/c/pay/mock-late",
  });
};
await api.beginOnlineBookingCheckout(
  db,
  env,
  "booking-test",
  held.id,
  concurrent.token,
  "https://admin.example.test",
);
globalThis.fetch = async () => {
  throw Error("Unexpected external request: blocked");
};
run(
  "UPDATE crm_calendar_events SET expires_at=? WHERE id=?",
  Date.now() - 1000,
  held.id,
);
await api.expireBookingHolds(db, ws);
assert.equal(
  one("SELECT status FROM crm_calendar_events WHERE id=?", held.id).status,
  "expired",
);
assert.equal(
  one("SELECT status FROM crm_jobs WHERE id=?", held.job_id).status,
  "cancelled",
);
assert.equal(
  one("SELECT status FROM crm_invoices WHERE id=?", held.invoice_id).status,
  "void",
);
const lateSettlement = {
  id: "evt_late_mock",
  type: "checkout.session.completed",
  account: "acct_booking",
  data: {
    object: {
      object: "checkout.session",
      id: "cs_late_mock",
      payment_status: "paid",
      payment_intent: "pi_late_mock",
      amount_total: held.required_amount,
      currency: "gbp",
      metadata: Object.fromEntries(
        [...lateParams]
          .filter(([k]) => /^metadata\[/.test(k))
          .map(([k, v]) => [k.slice(9, -1), v]),
      ),
    },
  },
};
const wrongAccount = structuredClone(lateSettlement);
wrongAccount.account = "acct_someone_else";
assert.equal(
  (await api.processStripeInvoicePaymentEvent(db, wrongAccount)).rejected,
  true,
);
const wrongAmount = structuredClone(lateSettlement);
wrongAmount.data.object.amount_total += 100;
assert.equal(
  (await api.processStripeInvoicePaymentEvent(db, wrongAmount)).rejected,
  true,
);
assert.equal(
  one("SELECT status FROM crm_invoices WHERE id=?", held.invoice_id).status,
  "void",
  "Rejected provider evidence must not reopen an invoice",
);
assert.ok(
  (await api.processStripeInvoicePaymentEvent(db, lateSettlement)).paymentId,
);
assert.equal(
  one("SELECT status FROM crm_invoices WHERE id=?", held.invoice_id).status,
  "part_paid",
);
await api.reconcileBookingPayments(db, env, ws);
assert.equal(
  one("SELECT status FROM crm_calendar_events WHERE id=?", held.id).status,
  "payment_review",
);
// Approval requests remain provisional after full payment, and can be approved explicitly.
const requestSettings = structuredClone(settings);
requestSettings.services[0].mode = "request";
requestSettings.services[0].payment = "full";
await api.saveOnlineBookingPage(db, env, actor, {
  settings: requestSettings,
  publicSlug: "booking-test",
  enabled: true,
  revision: 1,
});
page = await api.publicBookingPage(db, env, "booking-test");
const laterDate = new Date(Date.parse(date) + 86400000)
  .toISOString()
  .slice(0, 10);
const requestSlot = (
  await api.getPublicBookingSlots(db, env, page, {
    date: laterDate,
    serviceId: "trial-service",
  })
)[0];
const requested = await api.reserveOnlineBooking(db, env, page, {
  ...input,
  revision: page.revision,
  addonIds: [],
  start: requestSlot.start,
  resourceId: requestSlot.resourceId,
  idempotencyKey: crypto.randomUUID(),
});
const requestEvent = one(
  "SELECT * FROM crm_calendar_events WHERE id=?",
  requested.id,
);
assert.equal(requestEvent.required_amount, 10000);
run(
  "INSERT INTO crm_invoice_payments(id,workspace_id,invoice_id,amount,currency) VALUES(?,?,?,?,?)",
  "request-payment",
  ws,
  requestEvent.invoice_id,
  10000,
  "GBP",
);
await api.reconcileBookingPayments(db, env, ws);
assert.equal(
  one("SELECT status FROM crm_calendar_events WHERE id=?", requested.id).status,
  "requested",
);
assert.equal(
  one("SELECT status FROM crm_jobs WHERE id=?", requestEvent.job_id).status,
  "provisional",
);
await api.changeCalendarEvent(db, env, actor, requested.id, {
  action: "confirm",
  version: 2,
});
assert.equal(
  one("SELECT status FROM crm_enquiries WHERE id=?", requestEvent.enquiry_id)
    .status,
  "won",
);
await api.changeCalendarEvent(db, env, actor, requested.id, {
  action: "cancel",
  version: 3,
});
await api.reconcileBookingPayments(db, env, ws);
assert.equal(
  one("SELECT status FROM crm_calendar_events WHERE id=?", requested.id).status,
  "cancelled",
  "An intentional paid cancellation stays cancelled",
);
assert.equal(
  one(
    "SELECT COUNT(*) AS n FROM crm_invoice_payments WHERE invoice_id=?",
    requestEvent.invoice_id,
  ).n,
  1,
  "Cancellation must preserve payment ledger",
);
// New configuration revision invalidates an already loaded booking page.
const freeSlot = (
    await api.getPublicBookingSlots(db, env, page, {
      date: laterDate,
      serviceId: "trial-service",
    })
  )[0],
  orphanCounts = counts();
beforeBatch = () =>
  run(
    "UPDATE crm_online_booking_pages SET revision=revision+1 WHERE workspace_id=?",
    ws,
  );
await assert.rejects(
  api.reserveOnlineBooking(db, env, page, {
    ...input,
    addonIds: [],
    start: freeSlot.start,
    revision: page.revision,
    resourceId: freeSlot.resourceId,
    idempotencyKey: crypto.randomUUID(),
  }),
  { statusCode: 409 },
);
assert.deepEqual(counts(), orphanCounts);
// Existing all-day Jobs block precisely their local date, not adjacent dates.
const legacyDate = new Date(Date.parse(laterDate) + 3 * 86400000)
  .toISOString()
  .slice(0, 10);
run(
  "INSERT INTO crm_jobs(id,workspace_id,reference,title,event_date,status) VALUES('legacy-busy',?,'LEGACY','Existing job',?,'booked')",
  ws,
  legacyDate,
);
assert.equal(
  (
    await api.getPublicBookingSlots(db, env, page, {
      date: legacyDate,
      serviceId: "trial-service",
    })
  ).length,
  0,
);
assert.ok(
  (
    await api.getPublicBookingSlots(db, env, page, {
      date: new Date(Date.parse(legacyDate) + 86400000)
        .toISOString()
        .slice(0, 10),
      serviceId: "trial-service",
    })
  ).length,
);
// Workspace boundaries and rate limits also apply to anonymous route access.
const publicContext = (path, method = "GET", body, headers = {}) => ({
  env: { ...env, MKB_DB: db },
  params: { path },
  request: new Request(
    "https://admin.example.test/api/online-booking/" + path.join("/"),
    {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  ),
  waitUntil: () => {},
});
const publicData = await (
  await api.publicRoute(publicContext(["booking-test"]))
).json();
assert.ok(!JSON.stringify(publicData).includes("booking-owner"));
assert.ok(!JSON.stringify(publicData).includes("client@example.test"));
const privateResponse = await api.publicRoute(
  publicContext(
    ["booking-test", "status"],
    "POST",
    { id: booking.id },
    { Authorization: "Bearer not-the-token" },
  ),
);
assert.equal(privateResponse.status, 404);
run(
  "INSERT INTO workspaces(id,slug,name) VALUES('booking-other','booking-other','Other tenant')",
);
await assert.rejects(
  api.changeCalendarEvent(
    db,
    env,
    { ...actor, workspaceId: "booking-other" },
    booking.id,
    { action: "cancel", version: 3 },
  ),
);
for (let i = 0; i < 20; i++)
  await api.bookingRateLimit(
    db,
    new Request("https://test", {
      headers: { "CF-Connecting-IP": "192.0.2.42" },
    }),
    "booking-test",
    true,
  );
await assert.rejects(
  api.bookingRateLimit(
    db,
    new Request("https://test", {
      headers: { "CF-Connecting-IP": "192.0.2.42" },
    }),
    "booking-test",
    true,
  ),
  { statusCode: 429 },
);

// Partial money after a hold expires must not leave a permanently held reservation.
page = await api.publicBookingPage(db, env, "booking-test");
const partialDate = new Date(Date.parse(legacyDate) + 86400000)
  .toISOString()
  .slice(0, 10);
const partialSlot = (
  await api.getPublicBookingSlots(db, env, page, {
    date: partialDate,
    serviceId: "trial-service",
  })
)[0];
const staleCounts = counts();
await assert.rejects(
  api.reserveOnlineBooking(db, env, page, {
    ...input,
    revision: page.revision - 1,
    start: partialSlot.start,
    resourceId: partialSlot.resourceId,
    idempotencyKey: crypto.randomUUID(),
  }),
  { statusCode: 409 },
);
assert.deepEqual(
  counts(),
  staleCounts,
  "Changed prices require a fresh customer review before any records are written",
);
const partial = await api.reserveOnlineBooking(db, env, page, {
  ...input,
  revision: page.revision,
  addonIds: [],
  start: partialSlot.start,
  resourceId: partialSlot.resourceId,
  idempotencyKey: crypto.randomUUID(),
});
const partialEvent = one(
  "SELECT * FROM crm_calendar_events WHERE id=?",
  partial.id,
);
run(
  "INSERT INTO crm_invoice_payments(id,workspace_id,invoice_id,amount,currency) VALUES(?,?,?,?,?)",
  "partial-underpayment",
  ws,
  partialEvent.invoice_id,
  5000,
  "GBP",
);
run(
  "UPDATE crm_calendar_events SET expires_at=? WHERE id=?",
  Date.now() - 1000,
  partial.id,
);
await api.reconcileBookingPayments(db, env, ws);
assert.equal(
  one("SELECT status FROM crm_calendar_events WHERE id=?", partial.id).status,
  "payment_review",
);
await assert.rejects(
  api.changeCalendarEvent(db, env, actor, partial.id, {
    action: "confirm",
    version: 2,
  }),
  { statusCode: 409 },
);
// Google OAuth is tested with fake tokens; every external request is intercepted.
const googleEnv = {
  ...env,
  CRM_CALENDAR_GOOGLE_CLIENT_ID: "mock-client",
  CRM_CALENDAR_GOOGLE_CLIENT_SECRET: "mock-secret",
  CRM_CALENDAR_CREDENTIAL_KEY: "only-a-local-test-key-never-use-in-production",
};
let googleEvents = [],
  googleFail = false,
  googleWrites = [];
globalThis.fetch = async (url, options = {}) => {
  assert.ok(
    String(url).startsWith("https://oauth2.googleapis.com/") ||
      String(url).startsWith("https://www.googleapis.com/calendar/"),
    "Unexpected external endpoint",
  );
  if (String(url).includes("oauth2.googleapis.com")) {
    const params = new URLSearchParams(options.body);
    if (params.get("grant_type") === "authorization_code") {
      assert.ok(params.get("code_verifier"));
      return Response.json({
        refresh_token: "mock-refresh-" + params.get("code"),
        scope: "https://www.googleapis.com/auth/calendar.events",
      });
    }
    return Response.json({
      access_token: "mock-access-" + params.get("refresh_token"),
    });
  }
  if (googleFail)
    return Response.json({ error: "Unavailable" }, { status: 503 });
  if (!options.method)
    return Response.json({ items: googleEvents, timeZone: "Europe/London" });
  assert.ok(String(url).includes("sendUpdates=none"));
  googleWrites.push({
    url,
    method: options.method,
    body: options.body ? JSON.parse(options.body) : null,
    auth: options.headers.Authorization,
  });
  return Response.json({}, { status: 200 });
};
const oauth = await api.beginCalendarGoogle(
  db,
  googleEnv,
  actor,
  "artist-one",
  "https://admin.example.test/api/crm/calendar/google/artist-one/connect",
);
const state = new URL(oauth.authorizationUrl).searchParams.get("state");
assert.equal(
  new URL(oauth.authorizationUrl).searchParams.get("code_challenge_method"),
  "S256",
);
const callback =
  "https://admin.example.test/api/crm/calendar/google/callback?state=" +
  state +
  "&code=one";
await assert.rejects(
  api.completeCalendarGoogle(
    db,
    googleEnv,
    { ...actor, userId: "someone-else" },
    callback,
  ),
  { statusCode: 403 },
);
await api.completeCalendarGoogle(db, googleEnv, actor, callback);
await assert.rejects(
  api.completeCalendarGoogle(db, googleEnv, actor, callback),
  { statusCode: 403 },
);
assert.ok(
  !one(
    "SELECT credential_json FROM crm_google_calendar_connections WHERE workspace_id=?",
    ws,
  ).credential_json.includes("mock-refresh"),
);
const oauthTwo = await api.beginCalendarGoogle(
  db,
  googleEnv,
  actor,
  "artist-two",
  "https://admin.example.test",
);
await api.completeCalendarGoogle(
  db,
  googleEnv,
  actor,
  "https://admin.example.test/api/crm/calendar/google/callback?state=" +
    new URL(oauthTwo.authorizationUrl).searchParams.get("state") +
    "&code=two",
);
googleEvents = [
  {
    id: "external-busy",
    start: { dateTime: new Date(event.busy_from).toISOString() },
    end: { dateTime: new Date(event.busy_to).toISOString() },
  },
];
assert.equal(
  (
    await api.googleCalendarBusy(
      db,
      googleEnv,
      ws,
      settings,
      event.busy_from,
      event.busy_to,
    )
  ).length,
  2,
);
googleFail = true;
await assert.rejects(
  api.getPublicBookingSlots(db, googleEnv, page, {
    date: laterDate,
    serviceId: "trial-service",
  }),
  { statusCode: 502 },
);
googleFail = false;
googleEvents = [];
await api.syncCalendarGoogle(db, googleEnv, ws);
assert.ok(
  googleWrites.some(
    (x) => x.method === "PUT" && x.body.summary.includes("Makeup trial"),
  ),
);
assert.ok(
  googleWrites.every((x) => !x.body || !x.body.attendees),
  "Google sync must not send calendar invitations",
);
googleWrites = [];
const liveEvent = one("SELECT * FROM crm_calendar_events WHERE id=?", event.id),
  movedStart = api.bookingLocalInstant(laterDate, "14:00", "Europe/London");
await api.changeCalendarEvent(db, googleEnv, actor, event.id, {
  action: "reschedule",
  version: liveEvent.version,
  start: movedStart,
  end: movedStart + 75 * 60000,
  resourceId: "artist-two",
});
assert.ok(
  googleWrites.some((x) => x.method === "DELETE" && x.auth.endsWith("one")),
  "Staff reassignment removes the old Google event",
);
assert.ok(
  googleWrites.some((x) => x.method === "PUT" && x.auth.endsWith("two")),
  "Staff reassignment updates the new Google calendar",
);
run(
  "UPDATE crm_calendar_events SET google_sync_status='pending' WHERE id=?",
  event.id,
);
googleFail = true;
const failed = await api.syncCalendarGoogle(db, googleEnv, ws);
assert.ok(failed.failed);
assert.equal(
  one("SELECT google_sync_status FROM crm_calendar_events WHERE id=?", event.id)
    .google_sync_status,
  "error",
);
googleFail = false;
await api.syncCalendarGoogle(db, googleEnv, ws);
assert.equal(
  one("SELECT google_sync_status FROM crm_calendar_events WHERE id=?", event.id)
    .google_sync_status,
  "synced",
);
// Middleware preserves exact anonymous boundaries; payment proof uses the original raw body.
const mctx = publicContext(["booking-test"]);
mctx.env.WEDPLANNED_AUTH_ENFORCED = "true";
mctx.next = () => api.publicRoute(mctx);
assert.equal((await api.middleware(mctx)).status, 200);
for (const path of [
  "/api/crm/calendar",
  "/api/crm/online-booking",
  "/api/online-booking/booking-test/unexpected",
  "/api/webhooks/not-a-public-hook",
]) {
  const response = await api.middleware({
    ...mctx,
    request: new Request("https://admin.example.test" + path),
    next: () => {
      throw Error("Private route bypassed authentication");
    },
  });
  assert.equal(response.status, 401, path);
}
let reached = false;
await api.middleware({
  ...mctx,
  request: new Request(
    "https://admin.example.test/api/webhooks/wedplanned-stripe",
    { method: "POST" },
  ),
  next: () => {
    reached = true;
    return Response.json({});
  },
});
assert.equal(reached, true);
const raw = JSON.stringify(settlement),
  ts = Math.floor(Date.now() / 1000),
  secret = "whsec_mock_only";
const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(secret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"],
);
const digest = await crypto.subtle.sign(
  "HMAC",
  key,
  new TextEncoder().encode(ts + "." + raw),
);
const signature = "t=" + ts + ",v1=" + Buffer.from(digest).toString("hex");
assert.equal(
  (
    await api.verifyStripeWebhook(
      { STRIPE_WEBHOOK_SECRET: secret },
      raw,
      signature,
    )
  ).id,
  settlement.id,
);
await assert.rejects(
  api.verifyStripeWebhook(
    { STRIPE_WEBHOOK_SECRET: secret },
    raw + " ",
    signature,
  ),
);
await assert.rejects(
  api.verifyStripeWebhook({ STRIPE_WEBHOOK_SECRET: secret }, raw, ""),
);
assert.throws(
  () =>
    run(
      "INSERT INTO crm_jobs(id,workspace_id,reference,title,event_date,status) VALUES('manual-conflict',?,'MANUAL','Overlapping all-day Job',?,'booked')",
      ws,
      laterDate,
    ),
  /calendar booking occupies/,
);
run(
  "INSERT INTO workspace_entitlements(workspace_id,feature_key,source,enabled) VALUES(?,'bookings','manual',0) ON CONFLICT(workspace_id,feature_key) DO UPDATE SET enabled=0",
  ws,
);
assert.equal(
  (await api.publicRoute(publicContext(["booking-test"]))).status,
  403,
);
assert.equal(
  one("SELECT value FROM schema_meta WHERE key='schema_version'").value,
  "54",
);
console.log(
  "PASS: atomic concurrent booking/rollback, deposits/full payment, idempotency, payment review, approval/cancellation, immutable price and ledger, DST/local-day availability, version races, tenant/auth/entitlement/rate boundaries, OAuth state/encryption, fail-closed Google busy checks, staff reassignment cleanup/retry, no invitations, schema 54",
);
