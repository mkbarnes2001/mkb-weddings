import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { build } from "esbuild";
import ICAL from "ical.js";

const { outputFiles } = await build({
  stdin: {
    contents: `export * from './serverless/crm-calendar-icloud'; export * from './serverless/calendar-icloud-transport'; export * from './serverless/calendar-credentials'; export * from './serverless/crm-calendar-providers'; export * from './serverless/crm-online-booking-d1'; export * from './shared/online-booking'; export {onRequest as calendarRoute} from './functions/api/crm/calendar/[[path]]';`,
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
mkdirSync(".wrangler/icloud-calendar", { recursive: true });
writeFileSync(".wrangler/icloud-calendar/test-api.mjs", outputFiles[0].text);
const api = await import(
  "../.wrangler/icloud-calendar/test-api.mjs?" + Date.now()
);
const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync("d1/schema.sql", "utf8"));
sql.exec("PRAGMA foreign_keys=ON");
const run = (q, ...args) => sql.prepare(q).run(...args),
  one = (q, ...args) => sql.prepare(q).get(...args);
const db = {
  prepare(query) {
    return {
      query,
      args: [],
      bind(...args) {
        this.args = args;
        return this;
      },
      async first() {
        return one(query, ...this.args) || null;
      },
      async all() {
        return { results: sql.prepare(query).all(...this.args) };
      },
      async run() {
        return { meta: { changes: Number(run(query, ...this.args).changes) } };
      },
    };
  },
  async batch(statements) {
    sql.exec("SAVEPOINT gate");
    try {
      const result = statements.map((s) => ({
        meta: { changes: Number(run(s.query, ...s.args).changes) },
      }));
      sql.exec("RELEASE gate");
      return result;
    } catch (e) {
      sql.exec("ROLLBACK TO gate");
      sql.exec("RELEASE gate");
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
    membershipId: "icloud-member",
    userId: "icloud-owner",
  },
  env = {
    CRM_ONLINE_BOOKING_ENABLED: "true",
    CRM_ONLINE_BOOKING_PUBLIC_ENABLED: "true",
    CRM_CALENDAR_CREDENTIAL_KEY: "local-test-encryption-key-32-chars-minimum",
  };
run(
  "INSERT INTO platform_users(id,email_normalized,email,display_name) VALUES('icloud-owner','owner@example.test','owner@example.test','Owner')",
);
run(
  "INSERT INTO business_memberships(id,workspace_id,user_id,email_normalized,email,role,status) VALUES('icloud-member',?,'icloud-owner','owner@example.test','owner@example.test','owner','active')",
  ws,
);
const settings = api.defaultBookingSettings();
settings.noticeHours = 0;
settings.resources = ["one", "two"].map((id) => ({
  id,
  name: id,
  userId: "",
  active: true,
  hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    from: "09:00",
    to: "18:00",
  })),
}));
settings.services = [
  {
    id: "consultation",
    name: "Consultation",
    description: "",
    imageUrl: "",
    amount: 0,
    minutes: 60,
    bufferBefore: 0,
    bufferAfter: 0,
    mode: "instant",
    payment: "full",
    depositPercent: 25,
    resourceIds: ["one", "two"],
    addonIds: [],
    active: true,
    jobType: "appointment",
  },
];
globalThis.fetch = async () => {
  throw Error("Unmocked network blocked");
};
await api.saveOnlineBookingPage(db, env, actor, {
  settings,
  publicSlug: "icloud-test",
  enabled: true,
  revision: 0,
});
const page = await api.publicBookingPage(db, env, "icloud-test"),
  date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  from = api.bookingLocalInstant(date, "00:00", settings.timezone),
  to = from + 86400000;
const root = "https://caldav.icloud.com/",
  host = "https://p01-caldav.icloud.com",
  home = host + "/123/calendars/",
  urlOne = home + "work/",
  urlTwo = home + "second/",
  password = "aaaa-bbbb-cccc-dddd",
  credentials = { email: "calendar@example.test", password };
const esc = api.xmlEscape;
const propResponse = (href, props, status = "200 OK") =>
  `<d:response><d:href>${esc(href)}</d:href><d:propstat><d:prop>${props}</d:prop><d:status>HTTP/1.1 ${status}</d:status></d:propstat></d:response>`;
const multi = (rows) =>
  `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">${rows.join("")}</d:multistatus>`;
const xml = (body) =>
  new Response(body, {
    status: 207,
    headers: { "Content-Type": "application/xml" },
  });
const calendarProps = (name, writable = true) =>
  `<d:resourcetype><d:collection/><c:calendar/></d:resourcetype><d:displayname>${esc(name)}</d:displayname><d:current-user-privilege-set><d:privilege><d:read/></d:privilege>${writable ? "<d:privilege><d:write/></d:privilege>" : ""}</d:current-user-privilege-set><c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set>`;
const external = new Map(),
  stored = new Map(),
  writes = [];
let failure = false,
  redirect = "",
  malformed = false,
  conflict = false,
  holdWrite;
const requests = [];
globalThis.fetch = async (input, options = {}) => {
  const url = String(input);
  assert.match(
    new URL(url).hostname,
    /^(caldav|p\d+-caldav)\.icloud\.com$/,
    "No third-party credential destination",
  );
  assert.equal(options.redirect, "manual");
  assert.ok(options.headers.Authorization.startsWith("Basic "));
  assert.equal(
    atob(options.headers.Authorization.slice(6)),
    `calendar@example.test:${password}`,
  );
  requests.push({ url, method: options.method });
  if (failure) return new Response("provider offline", { status: 503 });
  if (url === root && redirect)
    return new Response(null, { status: 302, headers: { Location: redirect } });
  if (options.method === "PROPFIND") {
    if (url === root)
      return xml(
        multi([
          propResponse(
            root,
            `<d:current-user-principal><d:href>${host}/123/principal/</d:href></d:current-user-principal>`,
          ),
        ]),
      );
    if (url === host + "/123/principal/")
      return xml(
        multi([
          propResponse(
            url,
            `<c:calendar-home-set><d:href>${home}</d:href></c:calendar-home-set>`,
          ),
        ]),
      );
    if (url === home)
      return xml(
        multi([
          propResponse(urlOne, calendarProps("Work & appointments")),
          propResponse(urlTwo, calendarProps("Second calendar")),
          propResponse(
            home + "readonly/",
            calendarProps("Shared read only", false),
          ),
        ]),
      );
    throw Error("Unexpected discovery request");
  }
  if (options.method === "REPORT") {
    assert.match(
      options.body,
      /<c:expand start="\d{8}T\d{6}Z" end="\d{8}T\d{6}Z"\/>/,
    );
    if (malformed) return xml("<d:multistatus>broken");
    const list = [...external, ...stored].filter(([href]) =>
      href.startsWith(url),
    );
    return xml(
      multi(
        list.map(([href, v]) =>
          propResponse(
            href,
            `<c:calendar-data>${esc(v.data)}</c:calendar-data>`,
          ),
        ),
      ),
    );
  }
  if (options.method === "GET") {
    const entry = stored.get(url);
    return entry
      ? new Response(entry.data, { headers: { ETag: entry.etag } })
      : new Response(null, { status: 404 });
  }
  if (["PUT", "DELETE"].includes(options.method)) {
    writes.push({
      url,
      method: options.method,
      body: options.body,
      headers: options.headers,
    });
    if (holdWrite) {
      const hook = holdWrite;
      holdWrite = null;
      await hook();
    }
    if (conflict) return new Response(null, { status: 412 });
    const previous = stored.get(url);
    if (previous) assert.equal(options.headers["If-Match"], previous.etag);
    else assert.equal(options.headers["If-None-Match"], "*");
    if (options.method === "DELETE") stored.delete(url);
    else stored.set(url, { data: options.body, etag: `"${writes.length}"` });
    return new Response(null, { status: options.method === "PUT" ? 201 : 204 });
  }
  throw Error("Unexpected provider request");
};
// Discovery, safe destinations, encrypted tenant-bound credentials and authorization.
const discovered = await api.discoverCalendarICloud(
  db,
  env,
  actor,
  "one",
  credentials,
);
assert.equal(discovered.calendars.length, 3);
assert.equal(discovered.calendars[0].name, "Work & appointments");
assert.equal(discovered.calendars[2].writable, false);
await assert.rejects(
  api.discoverCalendarICloud(
    db,
    env,
    { ...actor, workspaceId: "other" },
    "one",
    credentials,
  ),
  { statusCode: 404 },
);
await assert.rejects(
  api.discoverCalendarICloud(
    db,
    env,
    { ...actor, accessMode: "support" },
    "one",
    credentials,
  ),
  { statusCode: 403 },
);
await assert.rejects(
  api.discoverCalendarICloud(
    db,
    env,
    { ...actor, permissions: ["crm:read"] },
    "one",
    credentials,
  ),
  { statusCode: 403 },
);
await assert.rejects(
  api.discoverCalendarICloud(db, {}, actor, "one", credentials),
  { statusCode: 503 },
);
assert.throws(() =>
  api.iCloudCredentials({ ...credentials, password: "normal-password" }),
);
for (const unsafe of [
  "http://caldav.icloud.com/",
  "https://caldav.icloud.com.attacker.test/",
  "https://p01-caldav.icloud.com@attacker.test/",
  "https://127.0.0.1/",
  "https://p01-caldav.icloud.com:8804/",
  "https://p01-caldav.icloud.com/?secret=x",
])
  assert.throws(() => api.iCloudUrl(unsafe));
redirect = "https://attacker.test/";
await assert.rejects(
  api.discoverCalendarICloud(db, env, actor, "one", credentials),
);
redirect = "";
assert.throws(() =>
  api.parseCalendarXml(
    '<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]><d:multistatus xmlns:d="DAV:">&x;</d:multistatus>',
  ),
);
assert.throws(() => api.parseCalendarXml('<multistatus xmlns="urn:wrong"/>'));
await assert.rejects(
  api.connectCalendarICloud(db, env, actor, "one", {
    ...credentials,
    calendarUrl: home + "readonly/",
  }),
  { statusCode: 409 },
);
await assert.rejects(
  api.connectCalendarICloud(db, env, actor, "one", {
    ...credentials,
    calendarUrl: "https://attacker.test/",
  }),
  { statusCode: 409 },
);
await api.connectCalendarICloud(db, env, actor, "one", {
  ...credentials,
  calendarUrl: urlOne,
});
const row = one(
    "SELECT * FROM crm_icloud_calendar_connections WHERE workspace_id=?",
    ws,
  ),
  cipher = JSON.parse(row.credential_json);
assert.ok(!row.credential_json.includes(password));
assert.ok(!row.credential_json.includes(credentials.email));
assert.equal(
  (await api.sealCalendarCredential(env, ws, "one", cipher, true, "icloud"))
    .password,
  password,
);
await assert.rejects(
  api.sealCalendarCredential(env, "other", "one", cipher, true, "icloud"),
);
await assert.rejects(
  api.sealCalendarCredential(env, ws, "two", cipher, true, "icloud"),
);
await assert.rejects(
  api.sealCalendarCredential(env, ws, "one", cipher, true, "google"),
);
const admin = await api.getOnlineBookingAdmin(db, env, actor);
assert.equal(admin.icloud[0].calendarName, "Work & appointments");
assert.ok(!JSON.stringify(admin).includes(password));
assert.ok(!JSON.stringify(admin).includes("credential_json"));
assert.ok(!JSON.stringify(api.publicBookingView(page)).includes("icloud"));
await assert.rejects(
  api.connectCalendarICloud(db, env, actor, "two", {
    ...credentials,
    calendarUrl: urlOne,
  }),
  { statusCode: 409 },
);

const utc = (ms) =>
  new Date(ms)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
const ics = (properties) =>
  `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:personal-event\r\n${properties}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
const start = api.bookingLocalInstant(date, "10:00", settings.timezone);
external.set(urlOne + "personal.ics", {
  data: ics(
    `DTSTART:${utc(start)}\r\nDTEND:${utc(start + 3600000)}\r\nSUMMARY:Private personal details`,
  ),
});
const busy = await api.externalCalendarBusy(db, env, ws, settings, from, to);
assert.deepEqual(busy, [{ start, end: start + 3600000, resourceId: "one" }]);
assert.ok(!JSON.stringify(busy).includes("Private"));
const available = await api.getPublicBookingSlots(db, env, page, {
  date,
  serviceId: "consultation",
});
assert.ok(!available.some((s) => s.resourceId === "one" && s.start === start));
assert.ok(available.some((s) => s.resourceId === "two" && s.start === start));
failure = true;
await assert.rejects(
  api.getPublicBookingSlots(db, env, page, { date, serviceId: "consultation" }),
);
failure = false;
malformed = true;
await assert.rejects(api.iCloudCalendarBusy(db, env, ws, settings, from, to));
malformed = false;
const dayIcs = ics("DTSTART;VALUE=DATE:20261025\r\nDTEND;VALUE=DATE:20261026");
const allDay = api.expandedICloudBusy(
  dayIcs,
  "Europe/London",
  "one",
  Date.parse("2026-10-24"),
  Date.parse("2026-10-27"),
);
assert.equal(allDay[0].end - allDay[0].start, 25 * 3600000);
const spring = api.expandedICloudBusy(
  ics("DTSTART;VALUE=DATE:20260329\r\nDTEND;VALUE=DATE:20260330"),
  "Europe/London",
  "one",
  Date.parse("2026-03-28"),
  Date.parse("2026-03-31"),
);
assert.equal(spring[0].end - spring[0].start, 23 * 3600000);
assert.throws(() =>
  api.expandedICloudBusy(
    ics("DTSTART:20261025T013000\r\nDTEND:20261025T023000"),
    "Europe/London",
    "one",
    Date.parse("2026-10-24"),
    Date.parse("2026-10-27"),
  ),
);
assert.equal(
  api.expandedICloudBusy(
    ics(
      `DTSTART:${utc(start)}\r\nDTEND:${utc(start + 3600000)}\r\nTRANSP:TRANSPARENT`,
    ),
    "Europe/London",
    "one",
    from,
    to,
  ).length,
  0,
);
assert.equal(
  api.expandedICloudBusy(
    ics(`DTSTART:${utc(start)}\r\nDURATION:PT1H`),
    "Europe/London",
    "one",
    from,
    to,
  )[0].end,
  start + 3600000,
);
assert.throws(
  () =>
    api.expandedICloudBusy(
      ics(`DTSTART:${utc(start)}\r\nDURATION:PT1H\r\nRRULE:FREQ=DAILY`),
      "Europe/London",
      "one",
      from,
      to,
    ),
  "Unexpanded recurrence must fail closed",
);
assert.throws(() =>
  api.expandedICloudBusy(
    ics(
      "DTSTART;TZID=Europe/London:20261025T013000\r\nDTEND;TZID=Europe/London:20261025T023000",
    ),
    "Europe/London",
    "one",
    from,
    to,
  ),
);
const expanded = ics(
  `DTSTART:${utc(start)}\r\nDTEND:${utc(start + 3600000)}`,
).replace(
  "END:VCALENDAR",
  `BEGIN:VEVENT\r\nUID:personal-event\r\nRECURRENCE-ID:${utc(start + 86400000)}\r\nDTSTART:${utc(start + 86400000)}\r\nDTEND:${utc(start + 90000000)}\r\nEND:VEVENT\r\nEND:VCALENDAR`,
);
assert.equal(
  api.expandedICloudBusy(expanded, "Europe/London", "one", from, to + 86400000)
    .length,
  2,
);
external.clear();

// Real reserve and change services exercise all-provider checks and retained destinations.
const slots = await api.getPublicBookingSlots(db, env, page, {
  date,
  serviceId: "consultation",
});
const slot = slots.find((s) => s.resourceId === "one");
const reservation = await api.reserveOnlineBooking(db, env, page, {
  revision: page.revision,
  name: "Calendar Client",
  email: "client@example.test",
  consent: true,
  serviceId: "consultation",
  resourceId: "one",
  start: slot.start,
  idempotencyKey: crypto.randomUUID(),
});
assert.equal(reservation.status, "confirmed");
let result = await api.syncConnectedCalendars(db, env, ws);
assert.equal(result.failed, 0);
assert.equal(stored.size, 1);
const firstUrl = [...stored.keys()][0];
assert.ok(firstUrl.startsWith(urlOne));
const firstIcs = stored.get(firstUrl).data;
assert.doesNotMatch(firstIcs, /ATTENDEE|ORGANIZER|METHOD|client@example.test/);
assert.match(firstIcs, /CLASS:PRIVATE/);
assert.equal(
  (await api.iCloudCalendarBusy(db, env, ws, settings, from, to)).length,
  1,
);
assert.equal(
  (
    await api.iCloudCalendarBusy(
      db,
      env,
      ws,
      settings,
      from,
      to,
      reservation.id,
    )
  ).length,
  0,
);
assert.equal(
  (await api.getBookingCalendar(db, env, actor, date, date)).icloudBusy.length,
  0,
);
await api.connectCalendarICloud(db, env, actor, "two", {
  ...credentials,
  calendarUrl: urlTwo,
});
let event = one("SELECT * FROM crm_calendar_events WHERE id=?", reservation.id);
await api.changeCalendarEvent(db, env, actor, event.id, {
  action: "reschedule",
  version: event.version,
  resourceId: "two",
  start: event.starts_at + 7200000,
  end: event.ends_at + 7200000,
});
assert.ok(!stored.has(firstUrl));
assert.equal(stored.size, 1);
assert.ok([...stored.keys()][0].startsWith(urlTwo));
assert.ok(writes.some((w) => w.method === "DELETE" && w.url === firstUrl));
event = one("SELECT * FROM crm_calendar_events WHERE id=?", reservation.id);
assert.equal(event.icloud_sync_status, "synced");
// A failed conditional write remains retryable; an edit during sync stays pending.
run(
  "UPDATE crm_calendar_events SET icloud_sync_status='pending' WHERE id=?",
  event.id,
);
conflict = true;
assert.equal((await api.syncCalendarICloud(db, env, ws)).failed, 1);
assert.equal(
  one(
    "SELECT icloud_sync_status s FROM crm_calendar_events WHERE id=?",
    event.id,
  ).s,
  "error",
);
conflict = false;
assert.equal((await api.syncCalendarICloud(db, env, ws)).failed, 0);
run(
  "UPDATE crm_calendar_events SET icloud_sync_status='pending' WHERE id=?",
  event.id,
);
holdWrite = async () => {
  run("UPDATE crm_calendar_events SET version=version+1 WHERE id=?", event.id);
};
await api.syncCalendarICloud(db, env, ws);
assert.equal(
  one(
    "SELECT icloud_sync_status s FROM crm_calendar_events WHERE id=?",
    event.id,
  ).s,
  "pending",
);
await api.syncCalendarICloud(db, env, ws);
// Calendar replacement requires explicit disconnect, so previous targets cannot be orphaned silently.
await assert.rejects(
  api.connectCalendarICloud(db, env, actor, "two", {
    ...credentials,
    calendarUrl: urlOne,
  }),
  { statusCode: 409 },
);
event = one("SELECT * FROM crm_calendar_events WHERE id=?", event.id);
await api.changeCalendarEvent(db, env, actor, event.id, {
  action: "cancel",
  version: event.version,
});
assert.equal(stored.size, 0);
assert.equal(one("SELECT count(*) n FROM crm_calendar_icloud_links").n, 0);

// Staff-independent blocked time exports once to each connected resource.
await api.changeCalendarEvent(db, env, actor, "", {
  action: "block",
  resourceId: "*",
  start: from + 3600000,
  end: from + 7200000,
  title: "Private admin time",
});
assert.equal(stored.size, 2);
run(
  "INSERT INTO crm_calendar_sync_leases(workspace_id,token,expires_at) VALUES(?,?,?)",
  `icloud:${ws}`,
  "lease-other",
  Date.now() + 60000,
);
assert.equal((await api.syncCalendarICloud(db, env, ws)).pending, true);
await assert.rejects(api.disconnectCalendarICloud(db, env, actor, "one"), {
  statusCode: 409,
});
run(
  "DELETE FROM crm_calendar_sync_leases WHERE workspace_id=?",
  `icloud:${ws}`,
);

async function route(path, body, options = {}) {
  const waits = [];
  const response = await api.calendarRoute({
    env: { ...env, MKB_DB: db, ...options.env },
    data: { professionalContext: options.actor || actor },
    params: { path: path.split("/") },
    request: new Request(
      (options.origin || "https://admin.example.test") +
        "/api/crm/calendar/" +
        path,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin:
            options.headerOrigin ||
            options.origin ||
            "https://admin.example.test",
        },
        body: JSON.stringify(body),
      },
    ),
    waitUntil: (p) => waits.push(p),
  });
  await Promise.all(waits);
  return response;
}
assert.equal(
  (
    await route("icloud/one/discover", credentials, {
      headerOrigin: "https://other.test",
    })
  ).status,
  403,
);
assert.equal(
  (
    await route("icloud/one/discover", credentials, {
      actor: { ...actor, permissions: ["crm:read"] },
    })
  ).status,
  403,
);
assert.equal(
  (
    await route("icloud/one/discover", credentials, {
      origin: "http://admin.example.test",
    })
  ).status,
  400,
);
assert.equal(
  (
    await route("icloud/one/discover", credentials, {
      env: { CRM_ONLINE_BOOKING_ENABLED: "false" },
    })
  ).status,
  503,
);
const discoverResponse = await route("icloud/one/discover", credentials);
assert.equal(discoverResponse.status, 200);
assert.match(discoverResponse.headers.get("cache-control"), /no-store/);
assert.ok(!(await discoverResponse.text()).includes(password));
await api.disconnectCalendarICloud(db, env, actor, "one");
assert.equal(stored.size, 2, "Disconnect preserves already exported entries");
assert.equal(
  one(
    "SELECT count(*) n FROM crm_icloud_calendar_connections WHERE workspace_id=?",
    ws,
  ).n,
  1,
);
assert.equal(
  one(
    "SELECT count(*) n FROM crm_calendar_icloud_links WHERE workspace_id=? AND resource_id='one'",
    ws,
  ).n,
  0,
);
failure = true;
const calendar = await api.getBookingCalendar(db, env, actor, date, date);
assert.match(calendar.icloudError, /could not be refreshed/);
failure = false;
await api.disconnectCalendarICloud(db, env, actor, "two");
assert.equal(
  (await api.externalCalendarBusy(db, env, ws, settings, from, to)).length,
  0,
);
assert.equal(
  one("SELECT value FROM schema_meta WHERE key='schema_version'").value,
  "54",
);

// One staff member can check several verified calendars while exporting to one.
await api.connectCalendarICloud(db, env, actor, "one", {
  ...credentials,
  calendarUrl: urlOne,
});
const beforeRevision = (await api.bookingPage(db, ws)).revision;
const choices = await api.iCloudConflictCalendars(db, env, actor, "one");
assert.ok(choices.calendars.some((c) => c.id === urlTwo));
const selected = await api.iCloudConflictCalendars(db, env, actor, "one", [
  urlOne,
  urlTwo,
]);
assert.deepEqual(selected.selected, [urlOne, urlTwo]);
assert.equal((await api.bookingPage(db, ws)).revision, beforeRevision + 1);
assert.equal(
  JSON.parse(
    one(
      "SELECT busy_calendars_json FROM crm_icloud_calendar_connections WHERE workspace_id=? AND resource_id=?",
      ws,
      "one",
    ).busy_calendars_json,
  )[0].url,
  urlTwo,
);
await assert.rejects(
  api.iCloudConflictCalendars(db, env, actor, "one", ["https://evil.test/"]),
  { statusCode: 409 },
);
await assert.rejects(
  api.iCloudConflictCalendars(
    db,
    env,
    { ...actor, accessMode: "support" },
    "one",
    [],
  ),
  { statusCode: 403 },
);

const providerFetch = globalThis.fetch,
  reported = [];
globalThis.fetch = async (url, init) => {
  if (init?.method === "REPORT") reported.push(String(url));
  return providerFetch(url, init);
};
await api.iCloudCalendarBusy(db, env, ws, settings, from, to);
assert.ok(
  reported.includes(urlOne) && reported.includes(urlTwo),
  "Both selected iCloud calendars are checked",
);
globalThis.fetch = providerFetch;
console.log(
  "PASS: iCloud discovery/selection, encrypted provider/tenant credentials, HTTPS/host/redirect/CSRF guards, recurring and DST all-day busy times, fail-closed availability, booking export/reschedule/reassignment/cancel, conditional writes/retry/version races, lease/disconnect, no invitations or real network, schema 54",
);
