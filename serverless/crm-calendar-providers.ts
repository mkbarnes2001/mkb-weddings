import { googleCalendarBusy, syncCalendarGoogle } from "./crm-calendar-google";
import { iCloudCalendarBusy, syncCalendarICloud } from "./crm-calendar-icloud";
import type { BookingSettings, BusyTime } from "../shared/online-booking";

export async function externalCalendarBusy(
  db: any,
  env: any,
  workspaceId: string,
  settings: BookingSettings,
  from: number,
  to: number,
  skipEventId = "",
  omitOwned = false,
): Promise<BusyTime[]> {
  const results = await Promise.all([
    googleCalendarBusy(
      db,
      env,
      workspaceId,
      settings,
      from,
      to,
      skipEventId,
      omitOwned,
    ),
    iCloudCalendarBusy(
      db,
      env,
      workspaceId,
      settings,
      from,
      to,
      skipEventId,
      omitOwned,
    ),
  ]);
  return results.flat();
}
export async function syncConnectedCalendars(
  db: any,
  env: any,
  workspaceId: string,
) {
  const google = await syncCalendarGoogle(db, env, workspaceId);
  const icloud = await syncCalendarICloud(db, env, workspaceId);
  return {
    synced: google.synced + icloud.synced,
    failed: google.failed + icloud.failed,
    pending: Boolean(google.pending || icloud.pending),
  };
}
