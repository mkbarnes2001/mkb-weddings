import { bookingError } from "../shared/online-booking";
export async function bookingHash(value: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export const b64 = (v: Uint8Array) =>
  btoa(String.fromCharCode(...v))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const bytes = (v: string) =>
  Uint8Array.from(atob(v.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
export async function sealCalendarCredential(
  env: any,
  workspaceId: string,
  resourceId: string,
  input: any,
  decrypt = false,
  provider = "google",
) {
  if (String(env.CRM_CALENDAR_CREDENTIAL_KEY || "").length < 32)
    throw bookingError("Calendar connection is not configured.", 503);
  const key = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(env.CRM_CALENDAR_CREDENTIAL_KEY),
    ),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  const additionalData = new TextEncoder().encode(
    provider === "google"
      ? `${workspaceId}:${resourceId}`
      : `${provider}:${workspaceId}:${resourceId}`,
  );
  if (decrypt)
    return JSON.parse(
      new TextDecoder().decode(
        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: bytes(input.iv), additionalData },
          key,
          bytes(input.ciphertext),
        ),
      ),
    );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return {
    iv: b64(iv),
    ciphertext: b64(
      new Uint8Array(
        await crypto.subtle.encrypt(
          { name: "AES-GCM", iv, additionalData },
          key,
          new TextEncoder().encode(JSON.stringify(input)),
        ),
      ),
    ),
  };
}
