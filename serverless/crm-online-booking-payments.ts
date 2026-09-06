import { bookingError } from "../shared/online-booking";
import {
  bookingWithToken,
  requireBookingFeature,
} from "./crm-online-booking-d1";
import { requireWorkspaceEntitlement } from "./platform-entitlements-d1";

// Booking capabilities authorise only this reservation's immutable invoice obligation.
// They never create a verified Client Portal identity or grant general invoice access.
export async function beginOnlineBookingCheckout(
  db: any,
  env: any,
  slug: string,
  id: string,
  token: string,
  requestUrl: string,
) {
  const event = await bookingWithToken(db, slug, id, token);
  await requireBookingFeature(db, env, event.workspace_id);
  await requireWorkspaceEntitlement(db, event.workspace_id, "invoices");
  await requireWorkspaceEntitlement(
    db,
    event.workspace_id,
    "connected-payments",
  );
  if (
    event.status !== "held" ||
    event.expires_at <= Date.now() ||
    !event.invoice_id ||
    event.required_amount <= 0
  )
    throw bookingError("This reservation is no longer awaiting checkout.", 409);
  const ps = await db
    .prepare(
      "SELECT * FROM workspace_payment_settings WHERE workspace_id=? AND card_payments_enabled=1 AND stripe_connection_status='ready' AND stripe_charges_enabled=1 AND stripe_payouts_enabled=1",
    )
    .bind(event.workspace_id)
    .first();
  if (
    !ps ||
    !String(ps.stripe_account_id).startsWith("acct_") ||
    !env.WEDPLANNED_STRIPE_SECRET_KEY
  )
    throw bookingError("Card payments are unavailable for this business.", 503);
  const invoice = await db
    .prepare(
      "SELECT * FROM crm_invoices WHERE workspace_id=? AND id=? AND job_id=? AND status IN ('issued','part_paid')",
    )
    .bind(event.workspace_id, event.invoice_id, event.job_id)
    .first();
  if (!invoice) throw bookingError("The booking invoice is unavailable.", 409);
  const doc = JSON.parse(event.document_json),
    attemptId = "obpay_" + id,
    expiresAt = event.expires_at - 5 * 60000;
  const origin = new URL(env.CRM_BOOKING_PUBLIC_ORIGIN || requestUrl).origin;
  const success = new URL(
    `/book/${encodeURIComponent(slug)}?booking=${encodeURIComponent(id)}`,
    origin,
  );
  success.hash = "token=" + encodeURIComponent(token);
  const cancel = new URL(success);
  cancel.searchParams.set("checkout", "cancelled");
  const meta = {
    source: "online_booking",
    jobId: event.job_id,
    calendarEventId: id,
    successUrl: success.href,
    cancelUrl: cancel.href,
    expiresAt,
  };
  await db
    .prepare(
      "INSERT OR IGNORE INTO crm_invoice_payment_attempts(id,workspace_id,invoice_id,schedule_item_id,provider_account_id,idempotency_key,status,amount,currency,client_email,expires_at,metadata_json) VALUES(?,?,?,?,?,?,'created',?,?,?,?,?)",
    )
    .bind(
      attemptId,
      event.workspace_id,
      event.invoice_id,
      event.invoice_id + "_due",
      ps.stripe_account_id,
      attemptId,
      event.required_amount,
      invoice.currency,
      doc.email,
      new Date(expiresAt).toISOString(),
      JSON.stringify(meta),
    )
    .run();
  const attempt = await db
      .prepare(
        "SELECT * FROM crm_invoice_payment_attempts WHERE id=? AND workspace_id=?",
      )
      .bind(attemptId, event.workspace_id)
      .first(),
    saved = JSON.parse(attempt.metadata_json);
  if (attempt.status === "succeeded")
    throw bookingError(
      "Payment is already being confirmed. Refresh the booking.",
      409,
    );
  if (
    saved.checkoutUrl &&
    attempt.status === "open" &&
    Date.parse(attempt.expires_at) > Date.now()
  )
    return { checkoutUrl: saved.checkoutUrl };
  if (
    !["created", "open"].includes(attempt.status) ||
    Date.parse(attempt.expires_at) <= Date.now() + 30 * 60000
  )
    throw bookingError(
      "The checkout preparation window expired. Please select another time.",
      409,
    );
  const params = new URLSearchParams({
    mode: "payment",
    success_url: saved.successUrl,
    cancel_url: saved.cancelUrl,
    expires_at: String(Math.floor(saved.expiresAt / 1000)),
    "payment_method_types[0]": "card",
    customer_email: attempt.client_email,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": attempt.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(attempt.amount),
    "line_items[0][price_data][product_data][name]": (
      doc.serviceName +
      " — " +
      (attempt.amount < doc.amount ? "deposit" : "full payment")
    ).slice(0, 120),
  });
  for (const [key, value] of Object.entries({
    wedplanned_attempt_id: attempt.id,
    wedplanned_workspace_id: event.workspace_id,
    wedplanned_invoice_id: event.invoice_id,
    wedplanned_schedule_item_id: attempt.schedule_item_id,
  })) {
    params.set(`metadata[${key}]`, String(value));
    params.set(`payment_intent_data[metadata][${key}]`, String(value));
  }
  const response = await fetch(
    `${String(env.WEDPLANNED_STRIPE_API_BASE || "https://api.stripe.com").replace(/\/$/, "")}/v1/checkout/sessions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WEDPLANNED_STRIPE_SECRET_KEY}`,
        "Stripe-Account": attempt.provider_account_id,
        "Idempotency-Key": attempt.idempotency_key,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      signal: AbortSignal.timeout(15000),
    },
  );
  const session: any = await response.json().catch(() => ({}));
  if (!response.ok)
    throw bookingError(
      "Unable to start payment. Retry while this time is held.",
      502,
    );
  if (
    !String(session.id || "").startsWith("cs_") ||
    !/^https:\/\/checkout\.stripe\.com\//.test(String(session.url || ""))
  )
    throw bookingError("Payment provider returned an invalid checkout.", 502);
  await db
    .prepare(
      "UPDATE crm_invoice_payment_attempts SET provider_checkout_id=?,status='open',metadata_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND workspace_id=? AND status='created'",
    )
    .bind(
      session.id,
      JSON.stringify({ ...saved, checkoutUrl: session.url }),
      attempt.id,
      event.workspace_id,
    )
    .run();
  return { checkoutUrl: session.url };
}
