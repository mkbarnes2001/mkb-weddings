import type {
  BookingSettings,
  BookingSchedule,
} from "../../../shared/online-booking";

export type OnlineBookingAdmin = {
  revision: number;
  enabled: boolean;
  publicBookingEnabled: boolean;
  publicSlug: string;
  publicBookingOrigin: string;
  bookingShareIssue: string;
  settings: BookingSettings;
  members: { userId: string; name: string }[];
  google: { resourceId: string; calendarId: string; updatedAt: string }[];
  googleConfigured: boolean;
  icloud: { resourceId: string; calendarName: string; updatedAt: string }[];
  icloudConfigured: boolean;
  workflows: { id: string; name: string; version: number }[];
  schedules: BookingSchedule[];
  emailTemplates: {
    id: string;
    name: string;
    subject: string;
    body: string;
    appendSignature: boolean;
  }[];
  bookingEmailsEnabled: boolean;
  paymentsReady: boolean;
};
export async function bookingRequest<T = any>(
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
): Promise<T> {
  const response = await fetch("/api/crm/" + path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response
    .json()
    .catch(() => ({ error: "Unable to load booking data." }));
  if (!response.ok)
    throw new Error(data.error || "Unable to complete this action.");
  return data;
}
