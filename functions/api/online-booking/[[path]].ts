import { deliverBookingConfirmations } from "../../../serverless/crm-booking-confirmations";
import { getBookingInvoice } from "../../../serverless/booking-confirmation-data";
import { syncConnectedCalendars } from "../../../serverless/crm-calendar-providers";
import {
  bookingRateLimit,
  getBookingReceipt,
  getPublicBookingSlots,
  publicBookingPage,
  publicBookingView,
  reserveOnlineBooking,
} from "../../../serverless/crm-online-booking-d1";
import { beginOnlineBookingCheckout } from "../../../serverless/crm-online-booking-payments";
import {
  bookingBody,
  bookingFailure,
  bookingResponse,
} from "../../../serverless/online-booking-http";
export const onRequest: PagesFunction<any> = async (context) => {
  try {
    const path = Array.isArray(context.params.path)
        ? context.params.path
        : String(context.params.path || "")
            .split("/")
            .filter(Boolean),
      slug = String(path[0] || ""),
      action = String(path[1] || ""),
      url = new URL(context.request.url),
      db = context.env.MKB_DB;
    if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(slug) || path.length > 2)
      return bookingResponse({ error: "Booking page not found." }, 404);
    if (
      context.env.CRM_ONLINE_BOOKING_ENABLED !== "true" ||
      context.env.CRM_ONLINE_BOOKING_PUBLIC_ENABLED !== "true"
    )
      return bookingResponse({ error: "Online booking is unavailable." }, 503);
    if (context.request.method === "GET" && !action)
      return bookingResponse({
        ok: true,
        ...publicBookingView(await publicBookingPage(db, context.env, slug)),
      });
    if (
      context.request.method === "POST" &&
      ["status", "checkout", "invoice"].includes(action)
    ) {
      await bookingRateLimit(db, context.request, slug, false);
      const body = await bookingBody(context.request),
        token =
          context.request.headers
            .get("Authorization")
            ?.replace(/^Bearer /, "") || "";
      if (action === "invoice")
        return bookingResponse({
          ok: true,
          invoice: await getBookingInvoice(
            db,
            slug,
            String(body.id || ""),
            token,
          ),
        });
      if (action === "status") {
        const booking = await getBookingReceipt(
          db,
          context.env,
          slug,
          String(body.id || ""),
          token,
        );
        const event = await db
          .prepare("SELECT workspace_id FROM crm_calendar_events WHERE id=?")
          .bind(booking.id)
          .first();
        context.waitUntil(
          deliverBookingConfirmations(
            db,
            context.env,
            event.workspace_id,
            booking.id,
          ),
        );
        return bookingResponse({ ok: true, booking });
      }
      return bookingResponse({
        ok: true,
        ...(await beginOnlineBookingCheckout(
          db,
          context.env,
          slug,
          String(body.id || ""),
          token,
          context.request.url,
        )),
      });
    }
    const page = await publicBookingPage(db, context.env, slug);
    if (context.request.method === "GET" && action === "slots") {
      await bookingRateLimit(db, context.request, slug, false);
      const slots = await getPublicBookingSlots(db, context.env, page, {
        date: url.searchParams.get("date"),
        serviceId: url.searchParams.get("serviceId"),
        addonIds: url.searchParams.getAll("addon"),
      });
      return bookingResponse({ ok: true, slots });
    }
    if (context.request.method === "POST" && action === "reserve") {
      await bookingRateLimit(db, context.request, slug, true);
      const booking = await reserveOnlineBooking(
        db,
        context.env,
        page,
        await bookingBody(context.request),
      );
      context.waitUntil(
        Promise.all([
          syncConnectedCalendars(db, context.env, page.workspace_id),
          deliverBookingConfirmations(
            db,
            context.env,
            page.workspace_id,
            booking.id,
          ),
        ]),
      );
      return bookingResponse({ ok: true, booking }, 201);
    }
    return bookingResponse({ error: "Booking action not found." }, 404);
  } catch (e) {
    return bookingFailure(e);
  }
};
