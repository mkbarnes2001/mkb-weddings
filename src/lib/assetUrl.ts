const DEFAULT_PUBLIC_ASSET_ORIGIN = "https://www.mkbweddings.co.uk";

export function resolveAssetUrl(value: string | null | undefined, baseOrigin?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(?:https?:)?\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }

  const origin = String(baseOrigin || DEFAULT_PUBLIC_ASSET_ORIGIN).replace(/\/$/, "");
  return raw.startsWith("/") ? `${origin}${raw}` : `${origin}/${raw}`;
}
