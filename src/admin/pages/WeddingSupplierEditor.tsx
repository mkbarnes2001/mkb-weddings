import { AdminActionButton } from "../components/ui/AdminActionControl";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { WeddingService } from "../services/WeddingService";
import type { WeddingRecord } from "../types/wedding";
import {
  SupplierService,
  type MasterSupplier,
  type SupplierRecord,
} from "../services/SupplierService";
import {
  buildSupplierDirectory,
  suppliersToCsv,
  validateSupplier,
  type SupplierDirectoryEntry,
} from "../services/SupplierEditorService";
import { SupplierAutocomplete } from "../components/SupplierAutocomplete";
import {
  AdminApiService,
  type SupplierSaveResult,
} from "../services/AdminApiService";
import { AdminPageHeader } from "../components/ui/AdminUI";

const EMPTY_SUPPLIER: SupplierRecord = {
  blogSlug: "",
  role: "",
  name: "",
  website: "",
  instagram: "",
  sortOrder: "",
};

export function WeddingSupplierEditor() {
  const { slug } = useParams();
  const [weddings, setWeddings] = useState<WeddingRecord[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<MasterSupplier[]>([]);
  const [rows, setRows] = useState<SupplierRecord[]>([]);
  const [copied, setCopied] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] =
    useState<SupplierSaveResult | null>(null);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    WeddingService.load().then((service) =>
      setWeddings(service.getWeddings()),
    );

    SupplierService.load().then((service) => {
      setAllSuppliers(service.getMasterSuppliers());
      setRows(service.getSuppliersForWedding(slug || ""));
    });

    AdminApiService.health()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, [slug]);

  const wedding = useMemo(
    () => weddings.find((item) => item.slug === slug),
    [weddings, slug],
  );

  const directory = useMemo(
    () => buildSupplierDirectory(allSuppliers),
    [allSuppliers],
  );

  const csv = useMemo(() => suppliersToCsv(rows), [rows]);

  const allValidationErrors = useMemo(
    () => rows.flatMap((row) => validateSupplier(row)),
    [rows],
  );

  function updateRow(index: number, patch: Partial<SupplierRecord>) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
    setSaveResult(null);
    setSaveError("");
  }

  function selectDirectorySupplier(
    index: number,
    supplier: SupplierDirectoryEntry,
  ) {
    updateRow(index, {
      supplierId: supplier.supplierId,
      name: supplier.name,
      role: rows[index]?.role || supplier.role,
      website: supplier.website,
      instagram: supplier.instagram,
      email: supplier.email,
      phone: supplier.phone,
      location: supplier.location,
      county: supplier.county,
    });
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        ...EMPTY_SUPPLIER,
        blogSlug: slug || "",
        sortOrder: String(current.length + 1),
      },
    ]);
  }

  function deleteRow(index: number) {
    setRows((current) =>
      current
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row, rowIndex) => ({
          ...row,
          sortOrder: String(rowIndex + 1),
        })),
    );
  }

  async function copyCsv() {
    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function saveSuppliers() {
    if (!slug || allValidationErrors.length > 0) return;

    setSaving(true);
    setSaveError("");
    setSaveResult(null);

    try {
      const result = await AdminApiService.saveWeddingSuppliers(
        slug,
        rows.map((row, index) => ({
          ...row,
          blogSlug: slug,
          sortOrder: String(index + 1),
        })),
      );

      setSaveResult(result);
      setApiOnline(true);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save suppliers.",
      );
      setApiOnline(false);
    } finally {
      setSaving(false);
    }
  }

  if (!weddings.length) {
    return <div className="text-neutral-500">Loading supplier editor…</div>;
  }

  if (!wedding) {
    return (
      <div className="admin-surface-card border border-black/10 bg-white">
        <h1 className="admin-section-title mb-4">
          Wedding not found
        </h1>
        <Link
          to="/admin/weddings"
          className="underline underline-offset-4"
        >
          Back to weddings
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-page admin-refined-page space-y-7">
      <AdminPageHeader
        title="Supplier editor"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span>{wedding.couple}</span>
            <span
              className={
                apiOnline
                  ? "admin-status admin-status--success"
                  : "admin-status admin-status--warning"
              }
            >
              {apiOnline
                ? "Admin API connected"
                : "Admin API unavailable"}
            </span>
          </div>
        }
      />

      <section className="space-y-4">
        {rows.map((row, index) => {
          const errors = validateSupplier(row);

          return (
            <article
              key={`${index}-${row.name}`}
              className="admin-surface-card border border-black/10 bg-white/75"
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Supplier {index + 1}
                </p>

                <AdminActionButton
                  type="button"
                  onClick={() => deleteRow(index)}
                  className="rounded-full border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  aria-label="Delete supplier"
                >
                  <Trash2 className="w-4 h-4" />
                </AdminActionButton>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Role
                  </span>
                  <input
                    value={row.role || ""}
                    onChange={(event) =>
                      updateRow(index, { role: event.target.value })
                    }
                    placeholder="Venue, Florist, Band..."
                    className="admin-input"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Supplier name
                  </span>
                  <SupplierAutocomplete
                    value={row.name || ""}
                    directory={directory}
                    onChange={(value) =>
                      updateRow(index, { name: value, supplierId: "" })
                    }
                    onSelect={(supplier) =>
                      selectDirectorySupplier(index, supplier)
                    }
                  />
                  <p className="mt-2 text-xs text-neutral-500">
                    {row.supplierId ? "Linked to master supplier record." : "New supplier — will be added to the master database on save."}
                  </p>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Website
                  </span>
                  <input
                    value={row.website || ""}
                    onChange={(event) =>
                      updateRow(index, {
                        website: event.target.value,
                      })
                    }
                    placeholder="https://..."
                    className="admin-input"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Instagram
                  </span>
                  <input
                    value={row.instagram || ""}
                    onChange={(event) =>
                      updateRow(index, {
                        instagram: event.target.value.replace(/^@/, ""),
                      })
                    }
                    placeholder="supplierhandle"
                    className="admin-input"
                  />
                </label>
              </div>

              {errors.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  {errors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <div className="flex flex-wrap gap-3">
        <AdminActionButton
          type="button"
          onClick={addRow}
          className="admin-button admin-button--secondary inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm hover:bg-neutral-50"
        >
          <Plus className="w-4 h-4" />
          Add supplier
        </AdminActionButton>

        <AdminActionButton
          type="button"
          onClick={saveSuppliers}
          disabled={
            saving || !apiOnline || allValidationErrors.length > 0
          }
          className="admin-button admin-button--primary inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save suppliers"}
        </AdminActionButton>
      </div>

      {saveResult ? (
        <section className="admin-surface-card border border-emerald-200 bg-emerald-50 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">
                Saved {saveResult.savedRows} supplier rows.
              </p>
              {saveResult.backupPath ? (
                <p className="text-sm mt-1">
                  Backup: {saveResult.backupPath}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {saveError ? (
        <section className="admin-surface-card border border-red-200 bg-red-50 text-red-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <p>{saveError}</p>
          </div>
        </section>
      ) : null}

      <section className="admin-surface-card border border-black/10 bg-white/75">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <h2 className="admin-section-title ">Portable supplier export</h2>
          </div>

          <AdminActionButton
            type="button"
            onClick={copyCsv}
            className="admin-button admin-button--secondary inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm hover:bg-neutral-50"
          >
            <Copy className="w-4 h-4" />
            {copied ? "Copied" : "Copy export"}
          </AdminActionButton>
        </div>

        <pre className="max-h-[420px] overflow-auto rounded-2xl bg-[#111111] p-5 text-xs text-white/80">
          {csv}
        </pre>
      </section>

      <section className="admin-surface-card border border-blue-200 bg-blue-50 text-blue-950">
        <div className="flex items-start gap-4">
          <Search className="w-6 h-6 mt-1" />
          <div>
            <h2 className="admin-section-title mb-2">
              External AI supplier search
            </h2>
            <p className="text-sm leading-relaxed">
              The current autocomplete searches your own supplier directory.
              Server-side web enrichment can be added later so new supplier
              details are suggested and approved before saving.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
