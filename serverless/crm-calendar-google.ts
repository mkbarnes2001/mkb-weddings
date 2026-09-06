import {
  b64,
  bookingHash,
  sealCalendarCredential as seal,
} from "./calendar-credentials";
export { bookingHash } from "./calendar-credentials";
import {
  bookingError,
  bookingLocalInstant,
  type BookingSettings,
  type BusyTime,
} from "../shared/online-booking";
export function calendarGoogleConfigured(env: any) {
  return Boolean(
    env.CRM_CALENDAR_GOOGLE_CLIENT_ID &&
      env.CRM_CALENDAR_GOOGLE_CLIENT_SECRET &&
      String(env.CRM_CALENDAR_CREDENTIAL_KEY || "").length >= 32,
  );
}
function config(env: any, url: string) {
  if (!calendarGoogleConfigured(env))
    throw bookingError(
      "Google Calendar connection is not configured on this deployment.",
      503,
    );
  const origin = new URL(env.CRM_CALENDAR_GOOGLE_REDIRECT_ORIGIN || url).origin;
  const parsed = new URL(origin);
  if (
    parsed.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(parsed.hostname)
  )
    throw bookingError("Google Calendar requires an HTTPS callback.", 503);
  return {
    client_id: env.CRM_CALENDAR_GOOGLE_CLIENT_ID,
    client_secret: env.CRM_CALENDAR_GOOGLE_CLIENT_SECRET,
    redirect_uri: origin + "/api/crm/calendar/google/callback",
  };
}
async function google(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(10000),
  });
  const payload: any = await res.json().catch(() => ({}));
  if (!res.ok)
    throw bookingError(
      res.status === 401 || res.status === 403
        ? "Reconnect Google Calendar to restore availability checks."
        : "Google Calendar is unavailable. Try again shortly.",
      502,
    );
  return payload;
}
export async function beginCalendarGoogle(
  db: any,
  env: any,
  actor: any,
  resourceId: string,
  requestUrl: string,
) {
  if (
    !actor.authenticated ||
    actor.mode !== "session" ||
    actor.accessMode !== "membership" ||
    !actor.membershipId
  )
    throw bookingError("A signed-in workspace membership is required.", 403);
  const c = config(env, requestUrl),
    state = b64(crypto.getRandomValues(new Uint8Array(32))),
    verifier = b64(crypto.getRandomValues(new Uint8Array(32)));
  await db
    .prepare("DELETE FROM crm_calendar_oauth_states WHERE expires_at<?")
    .bind(Date.now())
    .run();
  await db
    .prepare(
      "INSERT INTO crm_calendar_oauth_states(state_hash,workspace_id,user_id,membership_id,resource_id,verifier,expires_at) VALUES(?,?,?,?,?,?,?)",
    )
    .bind(
      await bookingHash(state),
      actor.workspaceId,
      actor.userId,
      actor.membershipId,
      resourceId,
      verifier,
      Date.now() + 600000,
    )
    .run();
  const challenge = b64(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  const params = new URLSearchParams({
    client_id: c.client_id,
    redirect_uri: c.redirect_uri,
    response_type: "code",
    scope:
      "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?" + params,
  };
}
export async function completeCalendarGoogle(
  db: any,
  env: any,
  actor: any,
  requestUrl: string,
) {
  const url = new URL(requestUrl),
    c = config(env, requestUrl);
  if (
    !actor.authenticated ||
    actor.mode !== "session" ||
    actor.accessMode !== "membership"
  )
    throw bookingError("Sign in to complete Google Calendar connection.", 403);
  const state = await db
    .prepare(
      "DELETE FROM crm_calendar_oauth_states WHERE state_hash=? AND workspace_id=? AND user_id=? AND membership_id=? AND expires_at>? RETURNING *",
    )
    .bind(
      await bookingHash(url.searchParams.get("state") || ""),
      actor.workspaceId,
      actor.userId,
      actor.membershipId,
      Date.now(),
    )
    .first();
  if (!state)
    throw bookingError(
      "This Google connection request expired or was already used.",
      403,
    );
  if (url.searchParams.has("error") || !url.searchParams.get("code"))
    throw bookingError("Google Calendar connection was cancelled.");
  const token = await google("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...c,
      code: url.searchParams.get("code")!,
      code_verifier: state.verifier,
      grant_type: "authorization_code",
    }),
  });
  if (
    !token.refresh_token ||
    !String(token.scope || "")
      .split(" ")
      .includes("https://www.googleapis.com/auth/calendar.events")
  )
    throw bookingError(
      "Approve Calendar access, including offline access, and reconnect.",
      409,
    );
  const resource = await db
    .prepare(
      "SELECT 1 AS found FROM crm_online_booking_pages p,json_each(p.document_json,'$.resources') r WHERE p.workspace_id=? AND json_extract(r.value,'$.id')=? AND json_extract(r.value,'$.active')=1",
    )
    .bind(actor.workspaceId, state.resource_id)
    .first();
  if (!resource)
    throw bookingError("This team member is no longer active.", 409);
  const credential = await seal(env, actor.workspaceId, state.resource_id, {
    refreshToken: token.refresh_token,
  });
  await db
    .prepare(
      `INSERT INTO crm_google_calendar_connections(workspace_id,resource_id,credential_json,connected_by) VALUES(?,?,?,?) ON CONFLICT(workspace_id,resource_id) DO UPDATE SET credential_json=excluded.credential_json,connected_by=excluded.connected_by,updated_at=CURRENT_TIMESTAMP`,
    )
    .bind(
      actor.workspaceId,
      state.resource_id,
      JSON.stringify(credential),
      actor.userId,
    )
    .run();
  await db
    .prepare(
      "UPDATE crm_calendar_events SET google_sync_status='pending' WHERE workspace_id=? AND resource_id=?",
    )
    .bind(actor.workspaceId, state.resource_id)
    .run();
  return state.resource_id;
}
async function accessToken(env: any, row: any) {
  if (!calendarGoogleConfigured(env))
    throw bookingError("Google Calendar connection is unavailable.", 503);
  const secret = await seal(
    env,
    row.workspace_id,
    row.resource_id,
    JSON.parse(row.credential_json),
    true,
  );
  const payload = await google("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.CRM_CALENDAR_GOOGLE_CLIENT_ID,
      client_secret: env.CRM_CALENDAR_GOOGLE_CLIENT_SECRET,
      refresh_token: secret.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!payload.access_token)
    throw bookingError("Reconnect Google Calendar.", 502);
  return payload.access_token;
}
const googleEventId = async (id: string) =>
  "cb" + (await bookingHash(id)).slice(0, 40);
export async function googleCalendarBusy(
  db: any,
  env: any,
  workspaceId: string,
  settings: BookingSettings,
  from: number,
  to: number,
  skipEventId = "",
  omitOwned = false,
): Promise<BusyTime[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM crm_google_calendar_connections WHERE workspace_id=?",
    )
    .bind(workspaceId)
    .all();
  const busy: BusyTime[] = [];
  for (const row of results) {
    if (!settings.resources.some((r) => r.id === row.resource_id && r.active))
      continue;
    const token = await accessToken(env, row),
      skip = skipEventId ? await googleEventId(skipEventId) : "";
    const calendars = [
      ...new Set([
        row.calendar_id,
        ...JSON.parse(row.checked_calendar_ids_json || "[]"),
      ]),
    ] as string[];
    if (calendars.length > 10)
      throw bookingError("Too many conflict calendars.", 502);
    for (const calendarId of calendars) {
      let next = "";
      let pages = 0;
      do {
        const q = new URLSearchParams({
          timeMin: new Date(from).toISOString(),
          timeMax: new Date(to).toISOString(),
          singleEvents: "true",
          maxResults: "2500",
          showDeleted: "false",
        });
        if (next) q.set("pageToken", next);
        const data = await google(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${q}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!Array.isArray(data.items))
          throw bookingError("Google availability could not be verified.", 502);
        for (const e of data.items) {
          if (
            calendarId === row.calendar_id &&
            omitOwned &&
            e.extendedProperties?.private?.wedplannedWorkspace ===
              workspaceId &&
            e.extendedProperties?.private?.wedplannedEvent &&
            e.id ===
              (await googleEventId(
                e.extendedProperties.private.wedplannedEvent,
              ))
          )
            continue;
          if (
            (calendarId === row.calendar_id && e.id === skip) ||
            e.status === "cancelled" ||
            e.transparency === "transparent"
          )
            continue;
          const start = e.start?.dateTime
            ? Date.parse(e.start.dateTime)
            : e.start?.date
              ? bookingLocalInstant(
                  e.start.date,
                  "00:00",
                  data.timeZone || settings.timezone,
                )
              : NaN;
          const end = e.end?.dateTime
            ? Date.parse(e.end.dateTime)
            : e.end?.date
              ? bookingLocalInstant(
                  e.end.date,
                  "00:00",
                  data.timeZone || settings.timezone,
                )
              : NaN;
          if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
            throw bookingError(
              "Google returned an invalid calendar interval.",
              502,
            );
          busy.push({ start, end, resourceId: row.resource_id });
        }
        next = data.nextPageToken || "";
        if (++pages >= 20 && next)
          throw bookingError(
            "Too many Google events to verify this date range.",
            502,
          );
      } while (next);
    }
  }
  return busy;
}
export async function syncCalendarGoogle(
  db: any,
  env: any,
  workspaceId: string,
) {
  const { results: connections } = await db
    .prepare(
      "SELECT * FROM crm_google_calendar_connections WHERE workspace_id=?",
    )
    .bind(workspaceId)
    .all();
  if (!connections.length) return { synced: 0, failed: 0 };
  const lease = crypto.randomUUID(),
    now = Date.now();
  const acquired = await db
    .prepare(
      "INSERT INTO crm_calendar_sync_leases(workspace_id,token,expires_at) VALUES(?,?,?) ON CONFLICT(workspace_id) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at WHERE expires_at<? RETURNING token",
    )
    .bind(workspaceId, lease, now + 120000, now)
    .first();
  if (!acquired) return { synced: 0, failed: 0, pending: true };
  let synced = 0,
    failed = 0;
  try {
    const { results: events } = await db
      .prepare(
        "SELECT * FROM crm_calendar_events WHERE workspace_id=? AND status<>'held' AND google_sync_status IN ('pending','error') ORDER BY updated_at LIMIT 50",
      )
      .bind(workspaceId)
      .all();
    const tokens = new Map<string, string>();
    for (const e of events) {
      const held = await db
        .prepare(
          "UPDATE crm_calendar_sync_leases SET expires_at=? WHERE workspace_id=? AND token=? RETURNING token",
        )
        .bind(Date.now() + 120000, workspaceId, lease)
        .first();
      if (!held) break;
      let eventFailed = false;
      const { results: links } = await db
        .prepare(
          "SELECT resource_id FROM crm_calendar_google_links WHERE workspace_id=? AND event_id=?",
        )
        .bind(workspaceId, e.id)
        .all();
      for (const c of connections.filter(
        (c: any) =>
          c.resource_id === e.resource_id ||
          e.resource_id === "*" ||
          links.some((l: any) => l.resource_id === c.resource_id),
      )) {
        try {
          let token = tokens.get(c.resource_id);
          if (!token) {
            token = await accessToken(env, c);
            tokens.set(c.resource_id, token);
          }
          const id = await googleEventId(e.id),
            base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.calendar_id)}/events`,
            headers = {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            doc = JSON.parse(e.document_json);
          const remove =
            ["cancelled", "declined", "expired", "payment_review"].includes(
              e.status,
            ) ||
            (c.resource_id !== e.resource_id && e.resource_id !== "*");
          if (remove) {
            const res = await fetch(`${base}/${id}?sendUpdates=none`, {
              method: "DELETE",
              headers,
              signal: AbortSignal.timeout(10000),
            });
            if (!res.ok && ![404, 410].includes(res.status))
              throw Error("delete");
            await db
              .prepare(
                "DELETE FROM crm_calendar_google_links WHERE workspace_id=? AND event_id=? AND resource_id=?",
              )
              .bind(workspaceId, e.id, c.resource_id)
              .run();
          } else {
            // Record the target before the network write, so an unknown response can be retried or removed after reassignment.
            await db
              .prepare(
                "INSERT OR IGNORE INTO crm_calendar_google_links(workspace_id,event_id,resource_id) VALUES(?,?,?)",
              )
              .bind(workspaceId, e.id, c.resource_id)
              .run();
            const body = JSON.stringify({
              id,
              summary:
                (e.status === "requested" ? "[Requested] " : "") +
                (doc.title || doc.serviceName || "Booking"),
              start: { dateTime: new Date(e.starts_at).toISOString() },
              end: { dateTime: new Date(e.ends_at).toISOString() },
              transparency: "opaque",
              extendedProperties: {
                private: {
                  wedplannedEvent: e.id,
                  wedplannedWorkspace: workspaceId,
                },
              },
            });
            let res = await fetch(`${base}/${id}?sendUpdates=none`, {
              method: "PUT",
              headers,
              body,
              signal: AbortSignal.timeout(10000),
            });
            if (res.status === 404)
              res = await fetch(`${base}?sendUpdates=none`, {
                method: "POST",
                headers,
                body,
                signal: AbortSignal.timeout(10000),
              });
            if (res.status === 409)
              res = await fetch(`${base}/${id}?sendUpdates=none`, {
                method: "PUT",
                headers,
                body,
                signal: AbortSignal.timeout(10000),
              });
            if (!res.ok) throw Error("write");
          }
        } catch {
          eventFailed = true;
        }
      }
      const result = await db
        .prepare(
          "UPDATE crm_calendar_events SET google_sync_status=?,google_sync_error=? WHERE workspace_id=? AND id=? AND version=?",
        )
        .bind(
          eventFailed ? "error" : "synced",
          eventFailed ? "Google sync failed. Retry from Calendar." : "",
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
  } finally {
    await db
      .prepare(
        "DELETE FROM crm_calendar_sync_leases WHERE workspace_id=? AND token=?",
      )
      .bind(workspaceId, lease)
      .run();
  }
  return { synced, failed };
}

export async function googleConflictCalendars(
  db: any,
  env: any,
  actor: any,
  resourceId: string,
  selected?: unknown,
) {
  if (
    !actor.authenticated ||
    actor.mode !== "session" ||
    actor.accessMode !== "membership" ||
    !actor.membershipId ||
    !actor.permissions?.includes("crm:manage")
  )
    throw bookingError("A signed-in workspace manager is required.", 403);
  const row = await db
    .prepare(
      "SELECT * FROM crm_google_calendar_connections WHERE workspace_id=? AND resource_id=?",
    )
    .bind(actor.workspaceId, resourceId)
    .first();
  if (!row) throw bookingError("Connect Google Calendar first.", 404);
  const token = await accessToken(env, row),
    calendars: any[] = [];
  let next = "",
    pages = 0;
  do {
    const q = new URLSearchParams({
      maxResults: "250",
      minAccessRole: "reader",
      showHidden: "true",
    });
    if (next) q.set("pageToken", next);
    const result = await google(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?" + q,
      { headers: { Authorization: "Bearer " + token } },
    );
    if (!Array.isArray(result.items))
      throw bookingError("Google calendars could not be verified.", 502);
    calendars.push(
      ...result.items
        .filter((c: any) => !c.deleted)
        .map((c: any) => ({
          id: c.primary && row.calendar_id === "primary" ? "primary" : c.id,
          name: c.summaryOverride || c.summary || c.id,
          required:
            (c.primary && row.calendar_id === "primary") ||
            c.id === row.calendar_id,
        })),
    );
    next = result.nextPageToken || "";
    if (++pages >= 10 && next)
      throw bookingError("Too many calendars to load.", 502);
  } while (next);
  if (!calendars.some((c) => c.id === row.calendar_id))
    throw bookingError(
      "The connected calendar is no longer accessible. Reconnect Google Calendar.",
      409,
    );
  let ids = [
    ...new Set([
      row.calendar_id,
      ...JSON.parse(row.checked_calendar_ids_json || "[]"),
    ]),
  ];
  if (selected !== undefined) {
    if (
      !Array.isArray(selected) ||
      selected.some((id) => typeof id !== "string")
    )
      throw bookingError("Choose conflict calendars.");
    ids = [...new Set([row.calendar_id, ...selected])];
    if (
      ids.length > 10 ||
      ids.some((id) => !calendars.some((c) => c.id === id))
    )
      throw bookingError(
        "Choose up to ten calendars from this Google account.",
        409,
      );
    const [result] = await db.batch([
      db
        .prepare(
          "UPDATE crm_google_calendar_connections SET checked_calendar_ids_json=?,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND resource_id=? AND credential_json=?",
        )
        .bind(
          JSON.stringify(ids),
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
