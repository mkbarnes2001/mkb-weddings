import { useState } from "react";
import { BookingField } from "../pages/CRMOnlineBooking";
import {
  bookingMergeFields,
  mergeBookingText,
  type BookingMessages,
} from "../../../shared/online-booking";
export function BookingMessageEditor({
  value,
  onChange,
  templates,
}: {
  value: BookingMessages;
  onChange: (v: BookingMessages) => void;
  templates: any[];
}) {
  const [status, setStatus] = useState("confirmed"),
    values = {
      client_name: "Alex Taylor",
      first_name: "Alex",
      last_name: "Taylor",
      session_name: "Makeup trial",
      session_date: "12 September 2026",
      session_start_time: "10:00",
      company_name: "Your business",
      team_member: "Sam",
      booking_status:
        status === "confirmed" ? "confirmed" : "awaiting approval",
      invoice_link: "[Secure invoice link]",
      booking_link: "[Secure booking link]",
    };
  return (
    <section className="ob-panel">
      <div className="ob-section-heading">
        <h2>Booking confirmations</h2>
      </div>
      <BookingField label="Thank-you message">
        <textarea
          rows={3}
          value={value.thankYou}
          onChange={(e) => onChange({ ...value, thankYou: e.target.value })}
        />
      </BookingField>
      <label className="ob-check">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        Send booking confirmation email
      </label>
      <BookingField label="Use CRM email template">
        <select
          value={value.templateId}
          onChange={(e) => {
            const t = templates.find((t) => t.id === e.target.value);
            onChange(
              t
                ? {
                    ...value,
                    templateId: t.id,
                    subject: t.subject,
                    body: t.body,
                    appendSignature: Boolean(t.appendSignature),
                  }
                : { ...value, templateId: "" },
            );
          }}
        >
          <option value="">Custom booking message</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </BookingField>
      <BookingField label="Confirmation email subject">
        <input
          value={value.subject}
          onChange={(e) => onChange({ ...value, subject: e.target.value })}
        />
      </BookingField>
      <BookingField label="Confirmation email message">
        <textarea
          rows={9}
          value={value.body}
          onChange={(e) => onChange({ ...value, body: e.target.value })}
        />
      </BookingField>
      <label className="ob-check">
        <input
          type="checkbox"
          checked={value.appendSignature}
          onChange={(e) =>
            onChange({ ...value, appendSignature: e.target.checked })
          }
        />
        Append signature from Email Settings
      </label>
      <details className="ob-merge-fields">
        <summary>Available merge fields</summary>
        <p>{bookingMergeFields.map((f) => `%${f}%`).join(" · ")}</p>
      </details>
      <div className="ob-message-preview">
        <BookingField label="Preview booking status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="confirmed">Confirmed</option>
            <option value="requested">Awaiting approval</option>
          </select>
        </BookingField>
        <strong>{mergeBookingText(value.subject, values)}</strong>
        <p>{mergeBookingText(value.body, values)}</p>
        {value.appendSignature && (
          <p className="ob-muted">[Business email signature]</p>
        )}
      </div>
    </section>
  );
}
