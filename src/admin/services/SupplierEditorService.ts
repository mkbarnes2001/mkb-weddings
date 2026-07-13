import type { SupplierRecord } from "./SupplierService";

export type SupplierDirectoryEntry = {
  name: string;
  role: string;
  website: string;
  instagram: string;
  usageCount: number;
};

function normalise(value?: string) {
  return (value || "").trim().toLowerCase();
}

function cleanInstagram(value?: string) {
  return (value || "").trim().replace(/^@/, "");
}

export function buildSupplierDirectory(rows: SupplierRecord[]): SupplierDirectoryEntry[] {
  const map = new Map<string, SupplierDirectoryEntry>();

  for (const row of rows) {
    const name = (row.name || "").trim();
    if (!name) continue;

    const key = normalise(name);
    const existing = map.get(key);

    if (existing) {
      existing.usageCount += 1;
      if (!existing.role && row.role) existing.role = row.role;
      if (!existing.website && row.website) existing.website = row.website;
      if (!existing.instagram && row.instagram) existing.instagram = cleanInstagram(row.instagram);
      continue;
    }

    map.set(key, {
      name,
      role: (row.role || "").trim(),
      website: (row.website || "").trim(),
      instagram: cleanInstagram(row.instagram),
      usageCount: 1,
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return a.name.localeCompare(b.name);
  });
}

export function validateSupplier(row: SupplierRecord) {
  const errors: string[] = [];
  if (!(row.role || "").trim()) errors.push("Role is required.");
  if (!(row.name || "").trim()) errors.push("Supplier name is required.");
  const website = (row.website || "").trim();
  if (website && !/^https?:\/\//i.test(website)) {
    errors.push("Website must begin with http:// or https://");
  }
  return errors;
}

function csvEscape(value?: string) {
  const text = value || "";
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function suppliersToCsv(rows: SupplierRecord[]) {
  const header = "blogSlug,role,name,website,instagram,sortOrder";
  const body = rows.map((row, index) =>
    [row.blogSlug, row.role, row.name, row.website, cleanInstagram(row.instagram), row.sortOrder || String(index + 1)]
      .map(csvEscape)
      .join(","),
  );
  return [header, ...body].join("\n") + "\n";
}
