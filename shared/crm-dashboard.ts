export type DashboardPeriod = "7d" | "30d" | "mtd" | "ytd" | "custom";
export type DashboardDay = { date: string; leads: number; bookings: number; weddings: number; payments: Record<string, number> };
export type DashboardData = {
  range: { from: string; to: string; previousFrom: string; previousTo: string };
  jobTypes: string[];
  capabilities: { bookings: boolean; payments: boolean };
  days: DashboardDay[];
  previousDays: DashboardDay[];
  currencies: string[];
  sources: Array<{ name: string; count: number }>;
  upcoming: Array<{ id: string; title: string; date: string; venue: string; type: string }>;
  tasks: Array<{ id: string; jobId: string; jobTitle: string; title: string; due: string; priority: string }>;
  payments: Array<{ id: string; jobId: string; jobTitle: string; invoiceId: string; reference: string; due: string; amount: number; currency: string }>;
};
const DAY = 86400000;
export function shiftDay(date: string, count: number) { return new Date(Date.parse(`${date}T12:00:00Z`) + count * DAY).toISOString().slice(0, 10); }
export function validDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function dashboardRange(period: Exclude<DashboardPeriod, "custom">, today: string) {
  return { from: period === "7d" ? shiftDay(today, -6) : period === "30d" ? shiftDay(today, -29) : period === "mtd" ? `${today.slice(0, 7)}-01` : `${today.slice(0, 4)}-01-01`, to: today };
}
export function validateDashboardRange(from: string, to: string) {
  if (!validDay(from) || !validDay(to) || from > to) throw Object.assign(new Error("Choose a valid start and end date."), { statusCode: 400 });
  const count = Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
  if (count > 366) throw Object.assign(new Error("Choose a period of one year or less."), { statusCode: 400 });
  return { from, to, previousFrom: shiftDay(from, -count), previousTo: shiftDay(from, -1) };
}
export function dashboardDays(from: string, to: string): DashboardDay[] {
  const days: DashboardDay[] = [];
  for (let date = from; date <= to; date = shiftDay(date, 1)) days.push({ date, leads: 0, bookings: 0, weddings: 0, payments: {} });
  return days;
}
