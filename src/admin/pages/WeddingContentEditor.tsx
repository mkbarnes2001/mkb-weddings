import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { WeddingDocument } from "../../lib/weddingEngine";
import { AdminApiService } from "../services/AdminApiService";
import {
  SupplierService,
  type MasterSupplier,
  type SupplierRecord,
} from "../services/SupplierService";

type WeddingFactsRecord = {
  season?: string;
  ceremonyType?: string;
  ceremonyLocation?: string;
  receptionLocation?: string;
  celebrant?: string;
  photographer?: string;
  [key: string]: unknown;
};

type WeddingSeoRecord = {
  title?: string;
  description?: string;
  [key: string]: unknown;
};

export function WeddingContentEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [wedding, setWedding] = useState<WeddingDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [masterSuppliers, setMasterSuppliers] = useState<MasterSupplier[]>([]);
  const [weddingSuppliers, setWeddingSuppliers] = useState<SupplierRecord[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierRole, setSupplierRole] = useState("");
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [supplierMessage, setSupplierMessage] = useState("");
  const [supplierError, setSupplierError] = useState("");

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    Promise.all([
      AdminApiService.getJsonWedding(slug),
      SupplierService.load(),
    ])
      .then(([record, supplierService]) => {
        setWedding({
          ...record,
          facts: record.facts || {},
          seo: record.seo || {},
          story: Array.isArray(record.story) ? record.story : [],
        });
        setMasterSuppliers(
          supplierService
            .getMasterSuppliers()
            .filter((supplier) => supplier.status !== "archived"),
        );
        setWeddingSuppliers(supplierService.getSuppliersForWedding(slug));
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load wedding.",
        );
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const validationErrors = useMemo(() => {
    if (!wedding) return [];

    const errors: string[] = [];

    if (!wedding.title?.trim()) errors.push("Title is required.");
    if (!wedding.couple?.trim()) errors.push("Couple is required.");
    if (!wedding.venue?.trim()) errors.push("Venue is required.");
    if (!wedding.weddingDate?.trim()) {
      errors.push("Wedding date is required.");
    }
    if (!wedding.slug?.trim()) errors.push("Slug is required.");

    if (
      wedding.slug &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(wedding.slug)
    ) {
      errors.push(
        "Slug can contain lowercase letters, numbers and hyphens only.",
      );
    }

    return errors;
  }, [wedding]);

  const supplierOptions = useMemo(() => {
    return [...masterSuppliers].sort((a, b) =>
      String(a.displayName || a.name).localeCompare(String(b.displayName || b.name)),
    );
  }, [masterSuppliers]);

  const selectedSupplier = useMemo(
    () => supplierOptions.find((supplier) => supplier.id === selectedSupplierId) || null,
    [selectedSupplierId, supplierOptions],
  );

  function syncWeddingSupplierDocument(rows: SupplierRecord[]) {
    setWedding((current) =>
      current
        ? {
            ...current,
            suppliers: rows.map((row) => ({
              role: row.role || "Supplier",
              name: row.name || "",
              website: row.website || "",
              instagram: row.instagram || "",
            })),
          }
        : current,
    );
  }

  async function saveSupplierRows(nextRows: SupplierRecord[], successMessage: string) {
    if (!slug) return;

    setSupplierSaving(true);
    setSupplierMessage("");
    setSupplierError("");

    const normalized = nextRows.map((row, index) => ({
      ...row,
      blogSlug: slug,
      sortOrder: String(index + 1),
    }));

    try {
      await AdminApiService.saveWeddingSuppliers(slug, normalized);
      setWeddingSuppliers(normalized);
      syncWeddingSupplierDocument(normalized);
      setSupplierMessage(successMessage);
    } catch (saveError) {
      setSupplierError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update wedding suppliers.",
      );
    } finally {
      setSupplierSaving(false);
    }
  }

  async function addSupplier(supplier: MasterSupplier) {
    const role = supplierRole.trim() || supplier.category || "Supplier";
    const duplicate = weddingSuppliers.some(
      (row) =>
        row.supplierId === supplier.id &&
        String(row.role || "").trim().toLowerCase() === role.toLowerCase(),
    );

    if (duplicate) {
      setSupplierError(`${supplier.name} is already assigned as ${role}.`);
      setSupplierMessage("");
      return;
    }

    const nextRows = [
      ...weddingSuppliers,
      {
        supplierId: supplier.id,
        blogSlug: slug || "",
        role,
        name: supplier.name,
        website: supplier.website,
        instagram: supplier.instagram,
        email: supplier.email,
        phone: supplier.phone,
        location: supplier.location,
        county: supplier.county,
        sortOrder: String(weddingSuppliers.length + 1),
      },
    ];

    await saveSupplierRows(nextRows, `${supplier.name} added to this wedding.`);
    setSelectedSupplierId("");
    setSupplierRole("");
  }

  async function removeSupplier(index: number) {
    const supplier = weddingSuppliers[index];
    const nextRows = weddingSuppliers.filter((_, rowIndex) => rowIndex !== index);
    await saveSupplierRows(
      nextRows,
      `${supplier?.name || "Supplier"} removed from this wedding.`,
    );
  }

  function updateWedding(patch: Partial<WeddingDocument>) {
    setWedding((current) =>
      current ? { ...current, ...patch } : current,
    );
    setDirty(true);
    setMessage("");
    setError("");
  }

  function updateFact(key: string, value: string) {
    if (!wedding) return;

    const facts = (wedding.facts || {}) as WeddingFactsRecord;

    updateWedding({
      facts: {
        ...facts,
        [key]: value,
      } as WeddingDocument["facts"],
    });
  }

  function updateSeo(key: string, value: string) {
    if (!wedding) return;

    const seo = (wedding.seo || {}) as WeddingSeoRecord;

    updateWedding({
      seo: {
        ...seo,
        [key]: value,
      } as WeddingDocument["seo"],
    });
  }

  function updateParagraph(index: number, value: string) {
    if (!wedding) return;

    const story = [...(wedding.story || [])];
    story[index] = value;
    updateWedding({ story });
  }

  function addParagraph() {
    if (!wedding) return;
    updateWedding({ story: [...(wedding.story || []), ""] });
  }

  function removeParagraph(index: number) {
    if (!wedding) return;

    updateWedding({
      story: (wedding.story || []).filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    });
  }

  async function saveWedding() {
    if (!wedding || validationErrors.length > 0 || !slug) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const result = await AdminApiService.updateJsonWedding(
        slug,
        wedding,
      );

      setWedding(result.wedding);
      setDirty(false);
      setMessage(
        result.backupPath
          ? `Saved. Backup created at ${result.backupPath}.`
          : "Saved.",
      );

      if (slug !== result.wedding.slug) {
        navigate(
          `/admin/weddings/${result.wedding.slug}/content`,
          { replace: true },
        );
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save wedding.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-neutral-500">Loading wedding content…</div>;
  }

  if (!wedding) {
    return (
      <section className="rounded-[28px] border border-black/10 bg-white p-8">
        <h1 className="font-serif text-3xl">Wedding JSON not found</h1>
        <p className="mt-3 text-neutral-600">{error}</p>
        <Link
          to="/admin/weddings"
          className="mt-6 inline-flex underline underline-offset-4"
        >
          Back to weddings
        </Link>
      </section>
    );
  }

  const facts = (wedding.facts || {}) as WeddingFactsRecord;
  const seo = (wedding.seo || {}) as WeddingSeoRecord;

  return (
    <div className="space-y-7">
      <Link
        to={`/admin/weddings/${wedding.slug}`}
        className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to wedding
      </Link>

      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">
              Master Wedding Record
            </p>
            <h1 className="font-serif text-4xl leading-tight md:text-6xl">
              {wedding.couple || "Untitled wedding"}
            </h1>
            <p className="mt-4 text-white/60">
              Content saved directly to wedding.json.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {dirty ? (
              <span className="rounded-full bg-amber-300/15 px-4 py-2 text-sm text-amber-100">
                Unsaved changes
              </span>
            ) : null}

            <button
              type="button"
              onClick={saveWedding}
              disabled={
                saving ||
                !dirty ||
                validationErrors.length > 0
              }
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-black disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save wedding"}
            </button>
          </div>
        </div>
      </section>

      {message ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4" />
            <p>{message}</p>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <p>{error}</p>
          </div>
        </section>
      ) : null}

      {validationErrors.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {validationErrors.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </section>
      ) : null}

      <EditorSection eyebrow="Wedding" title="Basic information">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TextField
            label="Couple"
            value={wedding.couple || ""}
            onChange={(value) => updateWedding({ couple: value })}
          />
          <TextField
            label="Venue"
            value={wedding.venue || ""}
            onChange={(value) => updateWedding({ venue: value })}
          />
          <TextField
            label="Wedding date"
            value={wedding.weddingDate || ""}
            onChange={(value) =>
              updateWedding({ weddingDate: value })
            }
          />
          <SelectField
            label="Status"
            value={wedding.status || "draft"}
            options={[
              ["draft", "Draft"],
              ["published", "Published"],
              ["archived", "Archived"],
            ]}
            onChange={(value) =>
              updateWedding({
                status: value as WeddingDocument["status"],
              })
            }
          />
          <TextField
            label="Slug"
            value={wedding.slug || ""}
            onChange={(value) =>
              updateWedding({
                slug: value
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, ""),
              })
            }
            mono
            wide
          />
          <TextField
            label="Title"
            value={wedding.title || ""}
            onChange={(value) => updateWedding({ title: value })}
            wide
          />
        </div>
      </EditorSection>

      <EditorSection eyebrow="Suppliers" title="Wedding suppliers">
        <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm text-neutral-600">
                Assign suppliers directly from the reusable master supplier database. Changes save immediately.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                The same supplier can be added more than once when they have different roles.
              </p>
            </div>
            <Link
              to={`/admin/weddings/${slug}/suppliers/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm"
            >
              <Users className="h-4 w-4" />
              Full supplier editor
            </Link>
          </div>

          {supplierMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              {supplierMessage}
            </div>
          ) : null}
          {supplierError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {supplierError}
            </div>
          ) : null}

          <div className="space-y-2">
            {weddingSuppliers.length ? (
              weddingSuppliers.map((row, index) => (
                <div
                  key={`${row.supplierId || row.name}-${row.role}-${index}`}
                  className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {row.role || "Supplier"}
                      {row.instagram ? ` · @${String(row.instagram).replace(/^@/, "")}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSupplier(index)}
                    disabled={supplierSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm text-red-700 disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-black/15 bg-neutral-50 p-5 text-sm text-neutral-500">
                No suppliers assigned yet. Search the master database below to add them.
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-end">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                  Add supplier
                </span>
                <select
                  value={selectedSupplierId}
                  onChange={(event) => {
                    setSelectedSupplierId(event.target.value);
                    setSupplierError("");
                    setSupplierMessage("");
                  }}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                >
                  <option value="">Select a supplier…</option>
                  {supplierOptions.map((supplier) => {
                    const alreadyAssigned = weddingSuppliers.some(
                      (row) => row.supplierId === supplier.id,
                    );
                    const detail = [supplier.category, supplier.location || supplier.county]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.displayName || supplier.name}
                        {detail ? ` — ${detail}` : ""}
                        {alreadyAssigned ? " — already assigned" : ""}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                  Role for this wedding
                </span>
                <input
                  value={supplierRole}
                  onChange={(event) => setSupplierRole(event.target.value)}
                  placeholder={selectedSupplier?.category || "Uses supplier category if blank"}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                />
              </label>

              <button
                type="button"
                onClick={() => selectedSupplier && addSupplier(selectedSupplier)}
                disabled={!selectedSupplier || supplierSaving}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                {supplierSaving
                  ? "Saving…"
                  : selectedSupplier && weddingSuppliers.some((row) => row.supplierId === selectedSupplier.id)
                    ? "Add another role"
                    : "Add supplier"}
              </button>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              Suppliers already assigned remain selectable only when you need to add a second role for the same wedding.
            </p>
          </div>
        </div>
      </EditorSection>

      <EditorSection eyebrow="Story" title="Public wedding story">
        <div className="space-y-5">
          <TextAreaField
            label="Excerpt"
            value={wedding.excerpt || ""}
            onChange={(value) => updateWedding({ excerpt: value })}
            rows={3}
          />
          <TextAreaField
            label="Introduction"
            value={wedding.intro || ""}
            onChange={(value) => updateWedding({ intro: value })}
            rows={5}
          />

          <div className="space-y-4">
            {(wedding.story || []).map((paragraph, index) => (
              <div
                key={index}
                className="rounded-2xl border border-black/10 bg-neutral-50 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Paragraph {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeParagraph(index)}
                    className="inline-flex items-center gap-2 text-sm text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
                <textarea
                  value={paragraph}
                  onChange={(event) =>
                    updateParagraph(index, event.target.value)
                  }
                  rows={6}
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-black/30"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addParagraph}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add paragraph
            </button>
          </div>
        </div>
      </EditorSection>

      <EditorSection eyebrow="Details" title="Wedding facts">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TextField
            label="Season"
            value={String(facts.season || "")}
            onChange={(value) => updateFact("season", value)}
          />
          <TextField
            label="Ceremony type"
            value={String(facts.ceremonyType || "")}
            onChange={(value) => updateFact("ceremonyType", value)}
          />
          <TextField
            label="Ceremony location"
            value={String(facts.ceremonyLocation || "")}
            onChange={(value) =>
              updateFact("ceremonyLocation", value)
            }
          />
          <TextField
            label="Reception location"
            value={String(facts.receptionLocation || "")}
            onChange={(value) =>
              updateFact("receptionLocation", value)
            }
          />
          <TextField
            label="Celebrant"
            value={String(facts.celebrant || "")}
            onChange={(value) => updateFact("celebrant", value)}
          />
          <TextField
            label="Photographer"
            value={String(facts.photographer || "")}
            onChange={(value) =>
              updateFact("photographer", value)
            }
          />
        </div>
      </EditorSection>

      <EditorSection eyebrow="SEO" title="Search metadata">
        <div className="space-y-5">
          <TextField
            label="SEO title"
            value={String(seo.title || "")}
            onChange={(value) => updateSeo("title", value)}
            wide
          />
          <TextAreaField
            label="SEO description"
            value={String(seo.description || "")}
            onChange={(value) =>
              updateSeo("description", value)
            }
            rows={4}
          />
        </div>
      </EditorSection>
    </div>
  );
}

function EditorSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white/80 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)] md:p-8">
      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 mb-7 font-serif text-3xl">{title}</h2>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  mono = false,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "lg:col-span-2" : ""}>
      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30 ${
          mono ? "font-mono" : ""
        }`}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-black/30"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
