import type { MasterSupplier, SupplierRecord } from "./SupplierService";

export type SupplierDirectoryEntry = {
  supplierId: string;
  name: string;
  role: string;
  website: string;
  instagram: string;
  email: string;
  phone: string;
  location: string;
  county: string;
  usageCount: number;
};

function cleanInstagram(value?: string) {
  return (value || "").trim().replace(/^@/, "");
}

export function buildSupplierDirectory(rows: MasterSupplier[]): SupplierDirectoryEntry[] {
  return rows
    .filter((supplier) => supplier.status !== "archived")
    .map((supplier) => ({
      supplierId: supplier.id,
      name: supplier.name,
      role: supplier.category,
      website: supplier.website,
      instagram: cleanInstagram(supplier.instagram),
      email: supplier.email,
      phone: supplier.phone,
      location: supplier.location,
      county: supplier.county,
      usageCount: supplier.linkedWeddingCount || 0,
    }))
    .sort((a, b) => {
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
  const header = "blogSlug,supplierId,role,name,website,instagram,sortOrder";
  const body = rows.map((row, index) =>
    [row.blogSlug, row.supplierId, row.role, row.name, row.website, cleanInstagram(row.instagram), row.sortOrder || String(index + 1)]
      .map(csvEscape)
      .join(","),
  );
  return [header, ...body].join("\n") + "\n";
}
