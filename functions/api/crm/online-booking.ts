import {
  getOnlineBookingAdmin,
  saveOnlineBookingPage,
} from "../../../serverless/crm-online-booking-d1";
import { requireProfessionalContext } from "../../../serverless/platform-auth-d1";
import {
  bookingBody,
  bookingFailure,
  bookingResponse,
  bookingSameOrigin,
} from "../../../serverless/online-booking-http";
export const onRequest: PagesFunction<any> = async (context) => {
  try {
    const actor =
      context.data?.professionalContext ||
      (await requireProfessionalContext(
        context.env.MKB_DB,
        context.request,
        context.env,
      ));
    if (context.request.method === "GET")
      return bookingResponse({
        ok: true,
        ...(await getOnlineBookingAdmin(
          context.env.MKB_DB,
          context.env,
          actor,
        )),
      });
    if (context.request.method === "PUT") {
      bookingSameOrigin(context.request);
      return bookingResponse({
        ok: true,
        ...(await saveOnlineBookingPage(
          context.env.MKB_DB,
          context.env,
          actor,
          await bookingBody(context.request, 128000),
        )),
      });
    }
    return bookingResponse({ error: "Method not allowed." }, 405);
  } catch (e) {
    return bookingFailure(e);
  }
};
