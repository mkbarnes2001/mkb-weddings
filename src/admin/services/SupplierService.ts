import { normalise } from "../utils/format";
import { AdminApiService } from "./AdminApiService";

export type SupplierRecord = {
  supplierId?: string;
  blogSlug?: string;
  role?: string;
  category?: string;
  name?: string;
  website?: string;
  instagram?: string;
  email?: string;
  phone?: string;
  location?: string;
  county?: string;
  sortOrder?: string;
};

export type MasterSupplier = {
  id: string;
  name: string;
  displayName: string;
  category: string;
  website: string;
  instagram: string;
  email: string;
  phone: string;
  location: string;
  county: string;
  description: string;
  notes: string;
  status: "active" | "archived" | string;
  linkedWeddingCount: number;
  linkedWeddings: Array<{
    slug: string;
    title: string;
    couple: string;
    weddingDate: string;
    role: string;
    sortOrder: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

export class SupplierService {
  private rows: SupplierRecord[];
  private master: MasterSupplier[];

  constructor(rows: SupplierRecord[], master: MasterSupplier[]) {
    this.rows = rows;
    this.master = master;
  }

  static async load() {
    const [rows, master] = await Promise.all([
      AdminApiService.listSuppliers(),
      AdminApiService.listMasterSuppliers(),
    ]);
    return new SupplierService(rows, master);
  }

  getAllSuppliers() {
    return [...this.rows].sort((a, b) => {
      const slugSort = normalise(a.blogSlug).localeCompare(normalise(b.blogSlug));
      if (slugSort !== 0) return slugSort;
      return Number(a.sortOrder || 999) - Number(b.sortOrder || 999);
    });
  }

  getMasterSuppliers() {
    return [...this.master].sort((a, b) => {
      if (a.status === "archived" && b.status !== "archived") return 1;
      if (a.status !== "archived" && b.status === "archived") return -1;
      return a.name.localeCompare(b.name);
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
