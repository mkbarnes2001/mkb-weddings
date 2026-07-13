export function normalise(value?: string) {
  return (value || "").trim().toLowerCase();
}

export function normaliseFilename(value?: string) {
  return (value || "")
    .trim()
    .replace(/_2000(\.[a-z0-9]+)$/i, "_500$1")
    .replace(/%20/g, " ");
}

export function percentage(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

export function formatDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}
