import { normalise } from "../utils/format";
import { AdminApiService } from "./AdminApiService";

export type SupplierRecord = {
  blogSlug?: string;
  role?: string;
  name?: string;
  website?: string;
  instagram?: string;
  sortOrder?: string;
};

export class SupplierService {
  private rows: SupplierRecord[];

  constructor(rows: SupplierRecord[]) {
    this.rows = rows;
  }

  static async load() {
    const rows = await AdminApiService.listSuppliers();
    return new SupplierService(rows);
  }

  getAllSuppliers() {
    return [...this.rows].sort((a, b) => {
      const slugSort = normalise(a.blogSlug).localeCompare(normalise(b.blogSlug));
      if (slugSort !== 0) return slugSort;
      return Number(a.sortOrder || 999) - Number(b.sortOrder || 999);
    });
  }

  getSuppliersForWedding(blogSlug: string) {
    return this.rows
      .filter((row) => normalise(row.blogSlug) === normalise(blogSlug))
      .sort((a, b) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999));
  }

  getSupplierCountForWedding(blogSlug: string) {
    return this.getSuppliersForWedding(blogSlug).length;
  }
}
