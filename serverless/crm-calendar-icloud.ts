import ICAL from "ical.js";
import {
  bookingError,
  bookingLocalParts,
  validBookingDate,
  type BookingSettings,
  type BusyTime,
} from "../shared/online-booking";
import { bookingHash, sealCalendarCredential } from "./calendar-credentials";
import {
  DAV,
  CALDAV,
  child,
  children,
  responseProps,
  parseCalendarXml,
  xmlEscape,
  iCloudUrl,
  iCloudCredentials,
  discoverICloudCalendars,
  iCloudRequest,
  boundedCalendarText,
  calendarUnavailable,
} from "./calendar-icloud-transport";

export function calendarICloudConfigured(env: any) {
  return String(env.CRM_CALENDAR_CREDENTIAL_KEY || "").length >= 32;
}
function requireConnectionActor(env: any, actor: any) {
  if (!calendarICloudConfigured(env))
    throw bookingError(
      "iCloud Calendar needs to be configured on this deployment.",
      503,
    );
  if (
    !actor.authenticated ||
    actor.mode !== "session" ||
    actor.accessMode !== "membership" ||
    !actor.membershipId ||
    !actor.permissions?.includes("crm:manage")
  )
    throw bookingError("A signed-in workspace manager is required.", 403);
}
async function requireResource(
  db: any,
  workspaceId: string,
  resourceId: string,
) {
  const row = await db
    .prepare(
      "SELECT document_json FROM crm_online_booking_pages WHERE workspace_id=?",
    )
    .bind(workspaceId)
    .first();
  const settings: BookingSettings | undefined =
    row && JSON.parse(row.document_json);
  if (!settings?.resources.some((r) => r.id === resourceId && r.active))
    throw bookingError("Active team member not found.", 404);
  return settings;
}
async function leaseICloud(db: any, workspaceId: string) {
  const token = crypto.randomUUID(),
    key = `icloud:${workspaceId}`,
    now = Date.now();
  const acquired = await db
    .prepare(
      "INSERT INTO crm_calendar_sync_leases(workspace_id,token,expires_at) VALUES(?,?,?) ON CONFLICT(workspace_id) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at WHERE expires_at<? RETURNING token",
    )
    .bind(key, token, now + 120000, now)
    .first();
  return acquired ? { token, key } : null;
}
async function releaseICloud(db: any, lease: { token: string; key: string }) {
  await db
    .prepare(
      "DELETE FROM crm_calendar_sync_leases WHERE workspace_id=? AND token=?",
    )
    .bind(lease.key, lease.token)
    .run();
}
export async function discoverCalendarICloud(
  db: any,
  env: any,
  actor: any,
  resourceId: string,
  input: any,
) {
  requireConnectionActor(env, actor);
  await requireResource(db, actor.workspaceId, resourceId);
  return { calendars: await discoverICloudCalendars(iCloudCredentials(input)) };
}
export async function connectCalendarICloud(
  db: any,
  env: any,
  actor: any,
  resourceId: string,
  input: any,
) {
  requireConnectionActor(env, actor);
  await requireResource(db, actor.workspaceId, resourceId);
  const credentials = iCloudCredentials(input);
  // Re-discover on save. A browser cannot supply an arbitrary destination or
  // claim write privileges for another calendar.
  const calendars = await discoverICloudCalendars(credentials),
    selected = calendars.find((c) => c.url === input.calendarUrl && c.writable);
  if (!selected)
    throw bookingError(
      "Choose an editable calendar from this iCloud account.",
      409,
    );
  const lease = await leaseICloud(db, actor.workspaceId);
  if (!lease)
    throw bookingError(
      "Calendar sync is running. Try connecting again shortly.",
      409,
    );
  try {
    const settings = await requireResource(db, actor.workspaceId, resourceId);
    const previous = await db
      .prepare(
        "SELECT calendar_url FROM crm_icloud_calendar_connections WHERE workspace_id=? AND resource_id=?",
      )
      .bind(actor.workspaceId, resourceId)
      .first();
    if (previous && previous.calendar_url !== selected.url)
      throw bookingError(
        "Disconnect the previous iCloud calendar before choosing another.",
        409,
      );
    const assigned = await db
      .prepare(
        "SELECT resource_id FROM crm_icloud_calendar_connections WHERE workspace_id=? AND calendar_url=? AND resource_id<>?",
      )
      .bind(actor.workspaceId, selected.url, resourceId)
      .first();
    if (assigned)
      throw bookingError(
        "This iCloud calendar is already connected to another team member. Choose a separate calendar.",
        409,
      );
    const credential = await sealCalendarCredential(
      env,
      actor.workspaceId,
      resourceId,
      credentials,
      false,
      "icloud",
    );
    await db.batch([
      db
        .prepare(
          "INSERT INTO crm_icloud_calendar_connections(workspace_id,resource_id,calendar_url,calendar_name,timezone,credential_json,connected_by) VALUES(?,?,?,?,?,?,?) ON CONFLICT(workspace_id,resource_id) DO UPDATE SET calendar_url=excluded.calendar_url,calendar_name=excluded.calendar_name,timezone=excluded.timezone,credential_json=excluded.credential_json,connected_by=excluded.connected_by,updated_at=CURRENT_TIMESTAMP",
        )
        .bind(
          actor.workspaceId,
          resourceId,
          selected.url,
          selected.name,
          selected.timezone || settings.timezone,
          JSON.stringify(credential),
          actor.userId,
        ),
      db
        .prepare(
          "UPDATE crm_calendar_events SET icloud_sync_status='pending',icloud_sync_error='' WHERE workspace_id=? AND (resource_id=? OR resource_id='*')",
        )
        .bind(actor.workspaceId, resourceId),
    ]);
    return { ok: true };
  } finally {
    await releaseICloud(db, lease);
  }
}
export async function disconnectCalendarICloud(
  db: any,
  env: any,
  actor: any,
  resourceId: string,
) {
  // Allow disconnect when the deployment key is unavailable or has changed.
  requireConnectionActor(
    { ...env, CRM_CALENDAR_CREDENTIAL_KEY: "x".repeat(32) },
    actor,
  );
  const lease = await leaseICloud(db, actor.workspaceId);
  if (!lease)
    throw bookingError(
      "Calendar sync is running. Try disconnecting again shortly.",
      409,
    );
  try {
    await db.batch([
      db
        .prepare(
          "DELETE FROM crm_icloud_calendar_connections WHERE workspace_id=? AND resource_id=?",
        )
        .bind(actor.workspaceId, resourceId),
      db
        .prepare(
          "DELETE FROM crm_calendar_icloud_links WHERE workspace_id=? AND resource_id=?",
        )
        .bind(actor.workspaceId, resourceId),
    ]);
    return { ok: true };
  } finally {
    await releaseICloud(db, lease);
  }
}
async function credentialsFor(env: any, row: any): Promise<ICloudCredentials> {
  if (!calendarICloudConfigured(env)) throw calendarUnavailable();
  try {
    return await sealCalendarCredential(
      env,
      row.workspace_id,
      row.resource_id,
      JSON.parse(row.credential_json),
      true,
      "icloud",
    );
  } catch {
    throw calendarUnavailable();
  }
}
const stamp = (ms: number) =>
  new Date(ms)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
const eventUid = async (workspaceId: string, eventId: string) =>
  `wp-${await bookingHash(`${workspaceId}:${eventId}`)}@wedplanned`;
const eventUrl = async (
  calendarUrl: string,
  workspaceId: string,
  eventId: string,
) =>
  iCloudUrl(
    `${calendarUrl}wp-${await bookingHash(`${workspaceId}:${eventId}`)}.ics`,
  );

function expandedInstant(time: any, property: any, timezone: string) {
  if (!time) throw calendarUnavailable();
  if (time.zone?.tzid === "UTC") return time.toUnixTime() * 1000;
  // RFC 4791 expansion returns zoned values in UTC. Date-only and floating
  // values use the selected calendar's timezone (business timezone if absent).
  if (property?.getParameter("tzid")) throw calendarUnavailable();
  const date = `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
  if (!validBookingDate(date)) throw calendarUnavailable();
  const wallTime = time.isDate
    ? "00:00"
    : `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
  const base = Date.parse(`${date}T${wallTime}:00Z`),
    matches = new Set<number>();
  // Candidate UTC offsets on either side of a clock change avoid a minute-by-
  // minute scan for every all-day/floating event. Verify each candidate, and
  // reject ambiguous/nonexistent local wall times instead of guessing.
  for (const hours of [-48, -24, 0, 24, 48]) {
    const sample = base + hours * 3600000,
      local = bookingLocalParts(sample, timezone);
    const offset = Date.parse(`${local.date}T${local.time}:00Z`) - sample;
    const candidate = base - offset,
      check = bookingLocalParts(candidate, timezone);
    if (check.date === date && check.time === wallTime) matches.add(candidate);
  }
  if (matches.size !== 1) throw calendarUnavailable();
  return [...matches][0] + (time.isDate ? 0 : time.second * 1000);
}
export function expandedICloudBusy(
  ics: string,
  timezone: string,
  resourceId: string,
  from: number,
  to: number,
): BusyTime[] {
  try {
    const component = new ICAL.Component(ICAL.parse(ics));
    if (component.name !== "vcalendar") throw calendarUnavailable();
    const events = component.getAllSubcomponents("vevent");
    if (!events.length || events.length > 10000) throw calendarUnavailable();
    const busy: BusyTime[] = [];
    for (const c of events) {
      if (["rrule", "rdate", "exrule", "exdate"].some((p) => c.hasProperty(p)))
        throw calendarUnavailable();
      if (
        String(c.getFirstPropertyValue("status")).toUpperCase() ===
          "CANCELLED" ||
        String(c.getFirstPropertyValue("transp")).toUpperCase() ===
          "TRANSPARENT"
      )
        continue;
      if (
        c.getAllProperties("dtstart").length !== 1 ||
        c.getAllProperties("dtend").length > 1 ||
        (c.hasProperty("dtend") && c.hasProperty("duration"))
      )
        throw calendarUnavailable();
      const event = new ICAL.Event(c),
        startTime = event.startDate,
        endTime = event.endDate;
      if (!startTime || !endTime || startTime.isDate !== endTime.isDate)
        throw calendarUnavailable();
      const start = expandedInstant(
          startTime,
          c.getFirstProperty("dtstart"),
          timezone,
        ),
        end = expandedInstant(
          endTime,
          c.getFirstProperty("dtend") || c.getFirstProperty("dtstart"),
          timezone,
        );
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
        throw calendarUnavailable();
      if (end > from && start < to && end > start)
        busy.push({ start, end, resourceId });
    }
    return busy;
  } catch {
    throw calendarUnavailable();
  }
}
export async function iCloudCalendarBusy(
  db: any,
  env: any,
  workspaceId: string,
  settings: BookingSettings,
  from: number,
  to: number,
  skipEventId = "",
  omitOwned = false,
): Promise<BusyTime[]> {
  const { results: connections } = await db
    .prepare(
      "SELECT * FROM crm_icloud_calendar_connections WHERE workspace_id=?",
    )
    .bind(workspaceId)
    .all();
  const busy: BusyTime[] = [];
  for (const primaryConnection of connections) {
    const extras = JSON.parse(primaryConnection.busy_calendars_json || "[]");
    if (extras.length > 9) throw calendarUnavailable();
    const targets = [
      primaryConnection,
      ...extras
        .filter((c: any) => c.url !== primaryConnection.calendar_url)
        .map((c: any) => ({
          ...primaryConnection,
          calendar_url: c.url,
          timezone: c.timezone || primaryConnection.timezone,
        })),
    ];
    for (const connection of targets) {
      if (
        !settings.resources.some(
          (r) => r.id === connection.resource_id && r.active,
        )
      )
        continue;
      const credentials = await credentialsFor(env, connection),
        range = `start="${stamp(from)}" end="${stamp(to)}"`;
      const body = `<?xml version="1.0" encoding="utf-8"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-data><c:expand ${range}/></c:calendar-data></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range ${range}/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`;
      const { res, url } = await iCloudRequest(
        credentials,
        connection.calendar_url,
        "REPORT",
        body,
        { Depth: "1", "Content-Type": "application/xml; charset=utf-8" },
      );
      if (res.status !== 207) {
        await res.body?.cancel();
        throw calendarUnavailable();
      }
      const responses = children(
        parseCalendarXml(await boundedCalendarText(res)),
        DAV,
        "response",
      );
      const { results: links } = await db
        .prepare(
          "SELECT event_id FROM crm_calendar_icloud_links WHERE workspace_id=? AND resource_id=? AND calendar_url=?",
        )
        .bind(workspaceId, connection.resource_id, connection.calendar_url)
        .all();
      const owned = new Map<string, string>();
      for (const link of links)
        if (omitOwned || skipEventId === link.event_id)
          owned.set(
            await eventUrl(connection.calendar_url, workspaceId, link.event_id),
            await eventUid(workspaceId, link.event_id),
          );
      for (const response of responses) {
        const props = responseProps(response),
          data = child(props, CALDAV, "calendar-data")?.text,
          href = child(response, DAV, "href")?.text;
        if (!data || !href) throw calendarUnavailable();
        const resourceUrl = iCloudUrl(href, url);
        if (!resourceUrl.startsWith(connection.calendar_url))
          throw calendarUnavailable();
        const uid = owned.get(resourceUrl);
        if (uid) {
          try {
            const events = new ICAL.Component(
              ICAL.parse(data),
            ).getAllSubcomponents("vevent");
            if (
              events.length &&
              events.every((e) => e.getFirstPropertyValue("uid") === uid)
            )
              continue;
          } catch {
            throw calendarUnavailable();
          }
        }
        busy.push(
          ...expandedICloudBusy(
            data,
            connection.timezone,
            connection.resource_id,
            from,
            to,
          ),
        );
        if (busy.length > 10000) throw calendarUnavailable();
      }
    }
  }
  return busy;
}
async function writeICloudEvent(
  env: any,
  connection: any,
  workspaceId: string,
  e: any,
  remove: boolean,
) {
  const credentials = await credentialsFor(env, connection),
    url = await eventUrl(connection.calendar_url, workspaceId, e.id),
    uid = await eventUid(workspaceId, e.id);
  // Conditional writes only replace our own UID. An externally edited event
  // with attendees is left for review, so sync cannot send invitations.
  const current = await iCloudRequest(credentials, url, "GET");
  let etag = "";
  if (current.res.status === 200) {
    etag = current.res.headers.get("etag") || "";
    const component = new ICAL.Component(
        ICAL.parse(await boundedCalendarText(current.res)),
      ),
      events = component.getAllSubcomponents("vevent");
    if (
      !etag ||
      !events.length ||
      events.some(
        (c) =>
          c.getFirstPropertyValue("uid") !== uid ||
          c.hasProperty("attendee") ||
          c.hasProperty("organizer"),
      )
    )
      throw calendarUnavailable();
  } else {
    await current.res.body?.cancel();
    if (![404, 410].includes(current.res.status)) throw calendarUnavailable();
    if (remove) return;
  }
  let body: string | undefined;
  if (!remove) {
    const doc = JSON.parse(e.document_json),
      calendar = new ICAL.Component("vcalendar"),
      event = new ICAL.Component("vevent");
    calendar.addPropertyWithValue("version", "2.0");
    calendar.addPropertyWithValue(
      "prodid",
      "-//WedPlanned//Booking Calendar//EN",
    );
    event.addPropertyWithValue("uid", uid);
    event.addPropertyWithValue(
      "dtstamp",
      ICAL.Time.fromJSDate(new Date(), true),
    );
    event.addPropertyWithValue(
      "dtstart",
      ICAL.Time.fromJSDate(new Date(e.starts_at), true),
    );
    event.addPropertyWithValue(
      "dtend",
      ICAL.Time.fromJSDate(new Date(e.ends_at), true),
    );
    event.addPropertyWithValue(
      "summary",
      (e.status === "requested" ? "[Requested] " : "") +
        (doc.title || doc.serviceName || "Booking"),
    );
    event.addPropertyWithValue("sequence", e.version);
    event.addPropertyWithValue(
      "status",
      e.status === "requested" ? "TENTATIVE" : "CONFIRMED",
    );
    event.addPropertyWithValue("transp", "OPAQUE");
    event.addPropertyWithValue("class", "PRIVATE");
    calendar.addSubcomponent(event);
    body = calendar.toString() + "\r\n";
  }
  const { res } = await iCloudRequest(
    credentials,
    url,
    remove ? "DELETE" : "PUT",
    body,
    {
      "Content-Type": "text/calendar; charset=utf-8",
      ...(etag ? { "If-Match": etag } : { "If-None-Match": "*" }),
    },
  );
  await res.body?.cancel();
  if (!res.ok && !(remove && [404, 410].includes(res.status)))
    throw calendarUnavailable();
}
export async function syncCalendarICloud(
  db: any,
  env: any,
  workspaceId: string,
) {
  const lease = await leaseICloud(db, workspaceId);
  if (!lease) return { synced: 0, failed: 0, pending: true };
  let synced = 0,
    failed = 0;
  try {
    const { results: connections } = await db
      .prepare(
        "SELECT * FROM crm_icloud_calendar_connections WHERE workspace_id=?",
      )
      .bind(workspaceId)
      .all();
    if (!connections.length) return { synced, failed };
    const { results: events } = await db
      .prepare(
        "SELECT * FROM crm_calendar_events WHERE workspace_id=? AND status<>'held' AND icloud_sync_status IN ('pending','error') ORDER BY updated_at LIMIT 50",
      )
      .bind(workspaceId)
      .all();
    for (const e of events) {
      let eventFailed = false;
      const { results: links } = await db
        .prepare(
          "SELECT resource_id,calendar_url FROM crm_calendar_icloud_links WHERE workspace_id=? AND event_id=?",
        )
        .bind(workspaceId, e.id)
        .all();
      for (const connection of connections.filter(
        (c: any) =>
          c.resource_id === e.resource_id ||
          e.resource_id === "*" ||
          links.some(
            (l: any) =>
              l.resource_id === c.resource_id &&
              l.calendar_url === c.calendar_url,
          ),
      )) {
        const held = await db
          .prepare(
            "UPDATE crm_calendar_sync_leases SET expires_at=? WHERE workspace_id=? AND token=? RETURNING token",
          )
          .bind(Date.now() + 120000, lease.key, lease.token)
          .first();
        if (!held) return { synced, failed, pending: true };
        const remove =
          ["cancelled", "declined", "expired", "payment_review"].includes(
            e.status,
          ) ||
          (e.resource_id !== "*" && connection.resource_id !== e.resource_id);
        try {
          if (!remove)
            await db
              .prepare(
                "INSERT OR IGNORE INTO crm_calendar_icloud_links(workspace_id,event_id,resource_id,calendar_url) VALUES(?,?,?,?)",
              )
              .bind(
                workspaceId,
                e.id,
                connection.resource_id,
                connection.calendar_url,
              )
              .run();
          await writeICloudEvent(env, connection, workspaceId, e, remove);
          if (remove)
            await db
              .prepare(
                "DELETE FROM crm_calendar_icloud_links WHERE workspace_id=? AND event_id=? AND resource_id=?",
              )
              .bind(workspaceId, e.id, connection.resource_id)
              .run();
        } catch {
          eventFailed = true;
        }
      }
      const result = await db
        .prepare(
          "UPDATE crm_calendar_events SET icloud_sync_status=?,icloud_sync_error=? WHERE workspace_id=? AND id=? AND version=?",
        )
        .bind(
          eventFailed ? "error" : "synced",
          eventFailed ? "iCloud sync failed. Retry from Calendar." : "",
          workspaceId,
          e.id,
          e.version,
        )
        .run();
      if (result.meta?.changes) {
        if (eventFailed) failed++;
        else synced++;
      }
    }
    return { synced, failed };
  } finally {
    await releaseICloud(db, lease);
  }
}

export async function iCloudConflictCalendars(
  db: any,
  env: any,
  actor: any,
  resourceId: string,
  selected?: unknown,
) {
  requireConnectionActor(env, actor);
  await requireResource(db, actor.workspaceId, resourceId);
  const row = await db
    .prepare(
      "SELECT * FROM crm_icloud_calendar_connections WHERE workspace_id=? AND resource_id=?",
    )
    .bind(actor.workspaceId, resourceId)
    .first();
  if (!row) throw bookingError("Connect iCloud Calendar first.", 404);
  const discovered = await discoverICloudCalendars(
    await credentialsFor(env, row),
  );
  const calendars = discovered.map((c) => ({
    id: c.url,
    name: c.name,
    required: c.url === row.calendar_url,
  }));
  if (!calendars.some((c) => c.id === row.calendar_url))
    throw bookingError(
      "The connected calendar is no longer accessible. Reconnect iCloud Calendar.",
      409,
    );
  let ids = [
    row.calendar_url,
    ...JSON.parse(row.busy_calendars_json || "[]").map((c: any) => c.url),
  ];
  if (selected !== undefined) {
    if (
      !Array.isArray(selected) ||
      selected.some((id) => typeof id !== "string")
    )
      throw bookingError("Choose conflict calendars.");
    ids = [...new Set([row.calendar_url, ...selected])];
    if (
      ids.length > 10 ||
      ids.some((id) => !calendars.some((c) => c.id === id))
    )
      throw bookingError(
        "Choose up to ten calendars from this iCloud account.",
        409,
      );
    const extras = discovered
      .filter((c) => c.url !== row.calendar_url && ids.includes(c.url))
      .map((c) => ({
        url: c.url,
        name: c.name,
        timezone: c.timezone || row.timezone,
      }));
    const [result] = await db.batch([
      db
        .prepare(
          "UPDATE crm_icloud_calendar_connections SET busy_calendars_json=?,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND resource_id=? AND credential_json=?",
        )
        .bind(
          JSON.stringify(extras),
          actor.workspaceId,
          resourceId,
          row.credential_json,
        ),
      db
        .prepare(
          "UPDATE crm_online_booking_pages SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND changes()=1",
        )
        .bind(actor.workspaceId),
    ]);
    if (!result.meta.changes)
      throw bookingError(
        "The calendar connection changed. Reload and try again.",
        409,
      );
  }
  return { calendars, selected: ids };
}
