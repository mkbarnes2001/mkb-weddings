import { deliverBookingConfirmations } from "../../../../serverless/crm-booking-confirmations";
import { syncConnectedCalendars } from "../../../../serverless/crm-calendar-providers";
import {
  discoverCalendarICloud,
  iCloudConflictCalendars,
  connectCalendarICloud,
  disconnectCalendarICloud,
} from "../../../../serverless/crm-calendar-icloud";
import {
  bookingPage,
  changeCalendarEvent,
  getBookingCalendar,
  requireBookingActor,
  requireBookingFeature,
} from "../../../../serverless/crm-online-booking-d1";
import {
  beginCalendarGoogle,
  googleConflictCalendars,
  completeCalendarGoogle,
} from "../../../../serverless/crm-calendar-google";
import { requireProfessionalContext } from "../../../../serverless/platform-auth-d1";
import {
  bookingBody,
  bookingFailure,
  bookingResponse,
  bookingSameOrigin,
} from "../../../../serverless/online-booking-http";
export const onRequest: PagesFunction<any> = async (context) => {
  try {
    const db = context.env.MKB_DB,
      actor: any =
        context.data?.professionalContext ||
        (await requireProfessionalContext(db, context.request, context.env)),
      url = new URL(context.request.url),
      path = Array.isArray(context.params.path)
        ? context.params.path
        : String(context.params.path || "")
            .split("/")
            .filter(Boolean);
    requireBookingActor(
      actor,
      context.request.method !== "GET" || path[0] === "google",
    );
    await requireBookingFeature(db, context.env, actor.workspaceId);
    if (context.request.method === "GET" && !path.length) {
      const calendar = await getBookingCalendar(
        db,
        context.env,
        actor,
        url.searchParams.get("from") || "",
        url.searchParams.get("to") || "",
      );
      context.waitUntil(
        Promise.all([
          syncConnectedCalendars(db, context.env, actor.workspaceId),
          deliverBookingConfirmations(db, context.env, actor.workspaceId),
        ]),
      );
      return bookingResponse({ ok: true, ...calendar });
    }
    if (
      context.request.method === "GET" &&
      path.join("/") === "google/callback"
    ) {
      try {
        await completeCalendarGoogle(
          db,
          context.env,
          actor,
          context.request.url,
        );
        return Response.redirect(
          url.origin + "/admin/crm/calendar?google=connected",
          303,
        );
      } catch (e: any) {
        return Response.redirect(
          url.origin +
            "/admin/crm/calendar?googleError=" +
            encodeURIComponent(
              e.statusCode < 500
                ? e.message
                : "Google Calendar connection failed.",
            ),
          303,
        );
      }
    }
    if (context.request.method !== "POST")
      return bookingResponse({ error: "Method not allowed." }, 405);
    bookingSameOrigin(context.request);
    const body = await bookingBody(context.request);
    if (path[0] === "events" && path[1]) {
      const result = await changeCalendarEvent(
        db,
        context.env,
        actor,
        String(path[1]),
        body,
      );
      context.waitUntil(
        deliverBookingConfirmations(
          db,
          context.env,
          actor.workspaceId,
          String(path[1]),
        ),
      );
      return bookingResponse(result);
    }
    if (path.join("/") === "blocks")
      return bookingResponse(
        await changeCalendarEvent(db, context.env, actor, "", {
          ...body,
          action: "block",
        }),
      );
    if (["sync", "google/sync"].includes(path.join("/")))
      return bookingResponse({
        ok: true,
        ...(await syncConnectedCalendars(db, context.env, actor.workspaceId)),
      });
    if (path[0] === "icloud" && path.length === 3) {
      if (
        url.protocol !== "https:" &&
        !["localhost", "127.0.0.1"].includes(url.hostname)
      )
        return bookingResponse(
          { error: "Use HTTPS to connect iCloud Calendar." },
          400,
        );
      const resourceId = String(path[1]);
      if (["calendars", "busy"].includes(path[2]))
        return bookingResponse(
          await iCloudConflictCalendars(
            db,
            context.env,
            actor,
            resourceId,
            path[2] === "busy" ? body.selected : undefined,
          ),
        );
      if (path[2] === "discover")
        return bookingResponse(
          await discoverCalendarICloud(
            db,
            context.env,
            actor,
            resourceId,
            body,
          ),
        );
      if (path[2] === "connect") {
        const result = await connectCalendarICloud(
          db,
          context.env,
          actor,
          resourceId,
          body,
        );
        context.waitUntil(
          syncConnectedCalendars(db, context.env, actor.workspaceId),
        );
        return bookingResponse(result);
      }
      if (path[2] === "disconnect")
        return bookingResponse(
          await disconnectCalendarICloud(db, context.env, actor, resourceId),
        );
    }
    if (path[0] === "google" && path.length === 3) {
      const resourceId = String(path[1]),
        page = await bookingPage(db, actor.workspaceId);
      if (!page?.settings.resources.some((r: any) => r.id === resourceId))
        return bookingResponse({ error: "Team member not found." }, 404);
      if (["calendars", "busy"].includes(path[2]))
        return bookingResponse(
          await googleConflictCalendars(
            db,
            context.env,
            actor,
            resourceId,
            path[2] === "busy" ? body.selected : undefined,
          ),
        );
      if (path[2] === "connect")
        return bookingResponse(
          await beginCalendarGoogle(
            db,
            context.env,
            actor,
            resourceId,
            context.request.url,
          ),
        );
      if (path[2] === "disconnect") {
        await db
          .prepare(
            "DELETE FROM crm_google_calendar_connections WHERE workspace_id=? AND resource_id=?",
          )
          .bind(actor.workspaceId, resourceId)
          .run();
        return bookingResponse({ ok: true });
      }
    }
    return bookingResponse({ error: "Calendar action not found." }, 404);
  } catch (e) {
    return bookingFailure(e);
  }
};
