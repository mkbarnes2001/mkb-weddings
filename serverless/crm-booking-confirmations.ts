import { getCrmEmailSettings } from "./crm-email-settings-d1";
import { sendCrmEmail } from "./crm-email-delivery-d1";
import {
  claimCommunication,
  prepareReceiptRequest,
  markCommunicationSent,
  markCommunicationFailed,
} from "./crm-payment-receipts-d1";
import { bookingMessageValues } from "./booking-confirmation-data";
import { bookingHash } from "./calendar-credentials";
import { mergeBookingText } from "../shared/online-booking";

export function bookingEmailConfigured(env: any) {
  try {
    const u = new URL(env.CRM_BOOKING_PUBLIC_ORIGIN);
    return (
      env.CRM_BOOKING_EMAIL_ENABLED === "true" &&
      (u.protocol === "https:" ||
        (u.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(u.hostname))) &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
}
export async function deliverBookingConfirmations(
  db: any,
  env: any,
  workspaceId: string,
  eventId = "",
) {
  if (!bookingEmailConfigured(env))
    return { sent: 0, failed: 0, disabled: true };
  const origin = new URL(env.CRM_BOOKING_PUBLIC_ORIGIN).origin;
  const { results } = await db
    .prepare(
      `SELECT e.*,p.public_slug,(SELECT contact_id FROM crm_job_contacts c WHERE c.workspace_id=e.workspace_id AND c.job_id=e.job_id ORDER BY c.role='primary' DESC LIMIT 1) AS primary_contact_id FROM crm_calendar_events e JOIN crm_online_booking_pages p ON p.workspace_id=e.workspace_id JOIN crm_jobs j ON j.workspace_id=e.workspace_id AND j.id=e.job_id WHERE e.workspace_id=? AND (?='' OR e.id=?) AND e.status IN ('confirmed','requested') AND json_extract(e.document_json,'$.messages.enabled')=1 AND NOT EXISTS(SELECT 1 FROM crm_communications c WHERE c.workspace_id=e.workspace_id AND c.id='booking_confirmation_'||e.id||'_'||e.status AND c.status='sent') ORDER BY e.updated_at LIMIT 50`,
    )
    .bind(workspaceId, eventId, eventId)
    .all();
  let sent = 0,
    failed = 0;
  const actor = {
    workspaceId,
    accessMode: "system",
    permissions: ["crm:read", "crm:manage"],
  };
  for (const e of results) {
    const id = "booking_confirmation_" + e.id + "_" + e.status,
      d = JSON.parse(e.document_json),
      messages = d.messages;
    const previous = await db
      .prepare(
        "SELECT id FROM crm_communications WHERE workspace_id=? AND id=?",
      )
      .bind(workspaceId, id)
      .first();
    let subject = "",
      body = "";
    if (!previous) {
      const cap = crypto.randomUUID() + crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO crm_booking_document_tokens(workspace_id,event_id,token_hash,expires_at) VALUES(?,?,?,?)",
        )
        .bind(
          workspaceId,
          e.id,
          await bookingHash(cap),
          Math.max(Date.now() + 30 * 86400000, e.ends_at + 90 * 86400000),
        )
        .run();
      const base =
        origin +
        "/book/" +
        encodeURIComponent(e.public_slug) +
        "?booking=" +
        encodeURIComponent(e.id);
      const links = {
        booking: base + "#document=" + cap,
        invoice: e.invoice_id ? base + "&invoice=1#document=" + cap : "",
      };
      const values = bookingMessageValues(e, links);
      subject = mergeBookingText(messages.subject, values)
        .replace(/[\r\n]+/g, " ")
        .slice(0, 240);
      body = mergeBookingText(messages.body, values);
      // Always state the recorded result, even if a custom template omits it.
      body += "\n\nBooking " + d.reference + ": " + values.booking_status + ".";
      if (links.invoice && !body.includes(links.invoice))
        body += "\nView your invoice: " + links.invoice;
      if (!body.includes(links.booking))
        body += "\nView your booking: " + links.booking;
      if (messages.appendSignature) {
        const settings = await getCrmEmailSettings(db, actor),
          sig = settings.signature;
        if (settings.signatureEnabled && sig)
          body +=
            "\n\n" +
            [
              [sig.name, sig.jobTitle, sig.businessName]
                .filter(Boolean)
                .join(" · "),
              [sig.phone, sig.website].filter(Boolean).join(" · "),
              sig.text,
            ]
              .filter(Boolean)
              .join("\n");
      }
    }
    const claim = await claimCommunication(db, {
      id,
      workspaceId,
      contactId: e.primary_contact_id,
      jobId: e.job_id,
      direction: "outbound",
      subject,
      body,
      occurredAt: new Date().toISOString(),
      metadata: {
        kind: "booking_confirmation",
        bookingEventId: e.id,
        bookingStatus: e.status,
        bookingVersion: e.version,
        clientEmail: d.email,
        businessName: d.businessName,
      },
    });
    if (!claim.claimed) continue;
    const common = { id, workspaceId, leaseToken: claim.leaseToken };
    try {
      const metadata = claim.snapshot.metadata;
      const prepare = prepareReceiptRequest(
        db,
        workspaceId,
        id,
        claim.leaseToken,
      );
      const delivery = await sendCrmEmail(db, env, actor, {
        to: metadata.clientEmail,
        subject: claim.snapshot.subject,
        body: claim.snapshot.body,
        businessName: metadata.businessName,
        idempotencyKey: id,
        prepareRequest: async (transport, body, identity) => {
          const current = await db
            .prepare(
              "SELECT status,version FROM crm_calendar_events WHERE workspace_id=? AND id=?",
            )
            .bind(workspaceId, e.id)
            .first();
          if (
            current?.status !== metadata.bookingStatus ||
            current?.version !== metadata.bookingVersion
          )
            throw Error(
              "Booking changed before confirmation delivery. Review this message in the Job.",
            );
          return prepare(transport, body, identity);
        },
      });
      await markCommunicationSent(db, {
        ...common,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId,
        metadata: { deliveryState: "sent" },
      });
      sent++;
    } catch (error: any) {
      await markCommunicationFailed(db, {
        ...common,
        provider: "",
        reason: error.message || "Booking confirmation could not be delivered.",
        metadata: { deliveryState: "failed" },
      });
      failed++;
    }
  }
  return { sent, failed };
}
