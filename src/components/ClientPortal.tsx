import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Helmet } from "react-helmet-async";
import { ClientPortalCommercialDocument } from "./ClientPortalCommercialDocument";
import { ArrowLeft, CalendarDays, CheckCircle2, Download, FileText, Home, Images, LogOut, Mail, PackageCheck, Paperclip, Plus, Save, Search, Send, Trash2, XCircle } from "lucide-react";

type SupplierDirectoryOption = {
  id: string;
  name: string;
  category: string;
  website: string;
  instagram: string;
  email: string;
  phone: string;
  location: string;
  county: string;
};

type SupplierAnswer = {
  mode: "existing" | "unlisted";
  supplierId: string;
  name: string;
  role: string;
  website: string;
  instagram: string;
  email: string;
  phone: string;
  location: string;
  county: string;
};

type PortalQuestionField = {
  id: string;
  type: string;
  label: string;
  help: string;
  required: boolean;
  options: string[];
  supplierRole?: string;
  supplierCategory?: string;
  allowUnlisted?: boolean;
  multiple?: boolean;
};

type PortalQuestionnaire = {
  id: string;
  jobId: string;
  title: string;
  introduction: string;
  status: string;
  dueAt: string;
  fields: PortalQuestionField[];
  responses: Record<string, unknown>;
  files: Array<{ id: string; fieldKey: string; filename: string; fileSize: number; uploadedAt: string }>;
  lastSavedAt?: string;
  completedAt?: string;
};

type PortalCommercialScheduleSummary = {
  id: string;
  scheduleType: string;
  label: string;
  amount: number;
  dueDate: string;
  displayOrder: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
};

type PortalCommercialContractSummary = {
  id: string;
  reference: string;
  title: string;
  status: string;
  versionId: string;
  requiredSignatures: number;
  signatureCount: number;
  sentAt: string;
  viewedAt: string;
  signedAt: string;
};

type PortalCommercialInvoiceSummary = {
  id: string;
  reference: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  nextPayment: PortalCommercialScheduleSummary | null;
  issuedAt: string;
  sentAt: string;
  paidAt: string;
};

type PortalCommercialSummary = {
  contracts: PortalCommercialContractSummary[];
  invoices: PortalCommercialInvoiceSummary[];
};

type PortalJobFile = {
  id: string;
  jobId: string;
  identityId: string;
  actorUserId: string;
  source: "client" | "workspace";
  filename: string;
  mimeType: string;
  fileSize: number;
  status: "active" | "deleted";
  uploadedAt: string;
};

type PortalJob = {
  id: string;
  reference: string;
  title: string;
  status: string;
  eventDate: string;
  serviceName: string;
  venueText: string;
  weddingSlug: string;
  contactName: string;
  files: PortalJobFile[];
  questionnaires: PortalQuestionnaire[];
  commercial: PortalCommercialSummary;
};


type PortalQuoteAddon = { id: string; addonId: string; name: string; description: string; unitPriceAmount: number; currency: string; minimumQuantity: number; maximumQuantity: number; defaultQuantity: number; requirement: "optional" | "recommended" | "mandatory"; displayOrder: number };
type PortalQuoteOption = { id: string; name: string; description: string; serviceType: string; basePriceAmount: number; currency: string; coverageMinutes: number | null; deliverables: string[]; includedItems: string[]; clientNotes: string; recommended: boolean; items: Array<{ id: string; name: string; quantity: number; unitPriceAmount: number }>; addons: PortalQuoteAddon[] };
type PortalQuoteAcceptance = { optionId: string; acceptedAt: string; subtotalAmount: number; discountAmount: number; taxAmount: number; totalAmount: number; currency: string; selectedPackage: Record<string, unknown>; selectedAddons: Array<PortalQuoteAddon & { quantity: number; lineTotalAmount: number }> };
type PortalQuote = { id: string; reference: string; status: string; quoteType: "pick_and_choose" | "fixed"; clientName: string; partnerName: string; eventDate: string; venueText: string; acceptedJobId: string; acceptance?: PortalQuoteAcceptance | null; currentVersion: { id: string; versionNumber: number; status: string; expiresAt: string; clientNotes: string; discountType: "none" | "fixed" | "percentage"; discountValue: number; taxTreatment: "none" | "inclusive" | "exclusive"; taxRateBasisPoints: number; currency: string; options: PortalQuoteOption[] } };
type PortalQuoteSummary = { id: string; reference: string; status: string; eventDate: string; venueText: string; acceptedJobId: string; updatedAt: string };

type PortalGallery = {
  id: string;
  slug: string;
  title: string;
  clientName: string;
  intro: string;
  expiresAt: string;
  allowFavourites: boolean;
  allowDownloads: boolean;
  couple: string;
  venue: string;
  weddingDate: string;
  coverUrl: string;
};

type PortalPayload = {
  authenticated: boolean;
  identity: { id: string; email: string; displayName: string } | null;
  business?: {
    name: string;
    logoUrl: string;
    accentColor: string;
    secondaryColor: string;
    backgroundColor: string;
    bannerUrl: string;
    welcomeHeading: string;
    welcomeMessage: string;
    footerText: string;
    contactEmail: string;
  };
  jobs: PortalJob[];
  quotes: PortalQuoteSummary[];
  galleries: PortalGallery[];
};

function formatDate(value: string) {
  if (!value) return "Date TBC";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function money(value: number, currency = "GBP") { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format((value || 0) / 100); }

function quoteTotals(option: PortalQuoteOption | undefined, quote: PortalQuote | null, quantities: Record<string, number>) {
  if (!option || !quote) return { subtotal: 0, discount: 0, tax: 0, total: 0 };
  const items = option.items.reduce((sum, item) => sum + item.quantity * item.unitPriceAmount, 0);
  const addons = option.addons.reduce((sum, addon) => { let quantity = quantities[addon.id] ?? addon.defaultQuantity; if (addon.requirement === "mandatory") quantity = Math.max(quantity, 1, addon.minimumQuantity); else if (quantity > 0) quantity = Math.max(quantity, addon.minimumQuantity); quantity = Math.min(addon.maximumQuantity, Math.max(0, quantity)); return sum + quantity * addon.unitPriceAmount; }, 0);
  const subtotal = option.basePriceAmount + items + addons;
  const version = quote.currentVersion;
  const discount = version.discountType === "fixed" ? Math.min(subtotal, version.discountValue) : version.discountType === "percentage" ? Math.round(subtotal * version.discountValue / 10000) : 0;
  const discounted = Math.max(0, subtotal - discount);
  const tax = version.taxTreatment === "exclusive" ? Math.round(discounted * version.taxRateBasisPoints / 10000) : version.taxTreatment === "inclusive" && version.taxRateBasisPoints ? Math.round(discounted - discounted / (1 + version.taxRateBasisPoints / 10000)) : 0;
  return { subtotal, discount, tax, total: version.taxTreatment === "exclusive" ? discounted + tax : discounted };
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function portalApiPath(path: string) {
  const url = new URL(path, window.location.origin);
  const workspace = new URLSearchParams(window.location.search).get("workspace");
  if (workspace) url.searchParams.set("workspace", workspace);
  return `${url.pathname}${url.search}`;
}

function portalGalleryPath(gallery: PortalGallery) {
  const url = new URL(
    `/client-gallery/${encodeURIComponent(gallery.slug)}`,
    window.location.origin,
  );
  const workspace = new URLSearchParams(window.location.search).get("workspace");
  if (workspace) url.searchParams.set("workspace", workspace);
  return `${url.pathname}${url.search}`;
}

async function jsonRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
  return body as T;
}

function emptySupplier(field: PortalQuestionField): SupplierAnswer {
  return {
    mode: "existing",
    supplierId: "",
    name: "",
    role: field.supplierRole || field.supplierCategory || "Supplier",
    website: "",
    instagram: "",
    email: "",
    phone: "",
    location: "",
    county: "",
  };
}

function supplierAnswers(value: unknown, field: PortalQuestionField) {
  if (Array.isArray(value)) return value.map((item) => ({ ...emptySupplier(field), ...(item as Partial<SupplierAnswer>) }));
  if (value && typeof value === "object") return [{ ...emptySupplier(field), ...(value as Partial<SupplierAnswer>) }];
  return [];
}

function SupplierQuestion({
  field,
  value,
  suppliers,
  categories,
  disabled,
  onChange,
}: {
  field: PortalQuestionField;
  value: unknown;
  suppliers: SupplierDirectoryOption[];
  categories: string[];
  disabled: boolean;
  onChange: (value: SupplierAnswer[]) => void;
}) {
  const [queries, setQueries] =
    useState<Record<number, string>>({});

  const values =
    supplierAnswers(
      value,
      field,
    );

  const categoryOptions =
    Array.from(
      new Set(
        [
          ...categories,
          ...suppliers.map(
            (supplier) =>
              supplier.category,
          ),
          "Other",
        ]
          .map(
            (item) =>
              String(item || "").trim(),
          )
          .filter(Boolean),
      ),
    );

  const defaultCategory =
    categoryOptions.find(
      (item) =>
        item.toLowerCase()
        === "other",
    )
    || categoryOptions[0]
    || "Other";

  function supplierForAnswer(
    answer: SupplierAnswer,
  ) {
    return suppliers.find(
      (supplier) =>
        supplier.id
        === answer.supplierId,
    );
  }

  function categoryForAnswer(
    answer: SupplierAnswer,
  ) {
    const selected =
      supplierForAnswer(
        answer,
      );

    if (selected?.category) {
      return selected.category;
    }

    if (
      categoryOptions.includes(
        answer.role,
      )
    ) {
      return answer.role;
    }

    if (
      field.supplierCategory
      && categoryOptions.includes(
        field.supplierCategory,
      )
    ) {
      return field.supplierCategory;
    }

    return defaultCategory;
  }

  function directoryForCategory(
    category: string,
  ) {
    return suppliers.filter(
      (supplier) =>
        !category
        || supplier.category
          .toLowerCase()
          === category
            .toLowerCase(),
    );
  }

  function replaceAnswer(
    index: number,
    next: SupplierAnswer,
  ) {
    onChange(
      values.map(
        (item, itemIndex) =>
          itemIndex === index
            ? next
            : item,
      ),
    );
  }

  function chooseSupplier(
    index: number,
    supplier:
      SupplierDirectoryOption,
  ) {
    setQueries(
      (current) => ({
        ...current,
        [index]:
          supplier.name,
      }),
    );

    replaceAnswer(
      index,
      {
        mode:
          "existing",
        supplierId:
          supplier.id,
        name:
          supplier.name,
        role:
          supplier.category
          || categoryForAnswer(
            values[index],
          ),
        website:
          supplier.website
          || "",
        instagram:
          supplier.instagram
          || "",
        email:
          supplier.email
          || "",
        phone:
          supplier.phone
          || "",
        location:
          supplier.location
          || "",
        county:
          supplier.county
          || "",
      },
    );
  }

  function changeCategory(
    index: number,
    category: string,
  ) {
    const current =
      values[index];

    if (
      category
      === categoryForAnswer(
        current,
      )
    ) {
      return;
    }

    setQueries(
      (queries) => ({
        ...queries,
        [index]:
          "",
      }),
    );

    replaceAnswer(
      index,
      {
        ...emptySupplier(
          field,
        ),
        mode:
          field.allowUnlisted
          === false
            ? "existing"
            : "unlisted",
        role:
          category
          || defaultCategory,
      },
    );
  }

  function changeSupplierText(
    index: number,
    input: string,
  ) {
    const current =
      values[index];

    const category =
      categoryForAnswer(
        current,
      );

    setQueries(
      (queries) => ({
        ...queries,
        [index]:
          input,
      }),
    );

    const match =
      directoryForCategory(
        category,
      ).find(
        (supplier) =>
          supplier.name
            .trim()
            .toLowerCase()
          === input
            .trim()
            .toLowerCase(),
      );

    if (match) {
      chooseSupplier(
        index,
        match,
      );

      return;
    }

    const empty = {
      ...emptySupplier(
        field,
      ),
      role:
        category
        || defaultCategory,
    };

    if (
      field.allowUnlisted
      === false
    ) {
      replaceAnswer(
        index,
        {
          ...empty,
          mode:
            "existing",
        },
      );

      return;
    }

    replaceAnswer(
      index,
      {
        ...empty,
        mode:
          "unlisted",
        name:
          input,
      },
    );
  }

  function add() {
    if (
      !field.multiple
      && values.length
    ) {
      return;
    }

    onChange([
      ...values,
      {
        ...emptySupplier(
          field,
        ),
        mode:
          field.allowUnlisted
          === false
            ? "existing"
            : "unlisted",
        role:
          defaultCategory,
      },
    ]);
  }

  function remove(
    index: number,
  ) {
    onChange(
      values.filter(
        (_, itemIndex) =>
          itemIndex !== index,
      ),
    );

    setQueries(
      (current) => {
        const next = {
          ...current,
        };

        delete next[index];

        return next;
      },
    );
  }

  return (
    <div className="portal-supplier-field supplier-questionnaire-table">
      {values.length ? (
        <div
          className="supplier-questionnaire-header"
          aria-hidden="true"
        >
          <span>
            Category
          </span>
          <span>
            Supplier
          </span>
          <span />
        </div>
      ) : null}

      {values.map(
        (answer, index) => {
          const category =
            categoryForAnswer(
              answer,
            );

          const directory =
            directoryForCategory(
              category,
            );

          const query =
            queries[index]
            ?? answer.name
            ?? "";

          const masterSupplier =
            supplierForAnswer(
              answer,
            );

          const datalistId =
            `portal_supplier_${field.id}_${index}`;

          return (
            <div
              key={`${field.id}_${index}`}
              className="supplier-questionnaire-row"
            >
              <label className="supplier-questionnaire-category">
                <span>
                  Category
                </span>

                <select
                  value={
                    category
                  }
                  disabled={
                    disabled
                  }
                  onChange={(
                    event,
                  ) =>
                    changeCategory(
                      index,
                      event.target
                        .value,
                    )
                  }
                >
                  {categoryOptions.map(
                    (option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="supplier-questionnaire-supplier">
                <span>
                  Supplier
                </span>

                <input
                  list={
                    datalistId
                  }
                  value={query}
                  disabled={
                    disabled
                  }
                  placeholder="Start typing a supplier name"
                  autoComplete="off"
                  onChange={(
                    event,
                  ) =>
                    changeSupplierText(
                      index,
                      event.target
                        .value,
                    )
                  }
                />

                <datalist
                  id={
                    datalistId
                  }
                >
                  {directory.map(
                    (supplier) => (
                      <option
                        key={
                          supplier.id
                        }
                        value={
                          supplier.name
                        }
                        label={
                          supplier.location
                          || supplier.county
                          || supplier.category
                        }
                      />
                    ),
                  )}
                </datalist>

                <small className="supplier-questionnaire-state">
                  {masterSupplier
                    ? [
                        "Supplier Master",
                        masterSupplier
                          .location
                          || masterSupplier
                            .county,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : answer.name
                      ? "Not in Supplier Master — will be sent for review."
                      : "Search Supplier Master, or type a name if it is not listed."}
                </small>
              </label>

              {!disabled ? (
                <button
                  type="button"
                  className="supplier-questionnaire-remove"
                  aria-label={`Remove supplier row ${index + 1}`}
                  title="Remove supplier"
                  onClick={() =>
                    remove(index)
                  }
                >
                  <Trash2 />
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        },
      )}

      {!disabled
      && (
        field.multiple
        || !values.length
      ) ? (
        <div className="supplier-questionnaire-add">
          <button
            type="button"
            onClick={add}
          >
            <Plus />
            Add supplier
          </button>

          {field.allowUnlisted !== false ? (
            <small>
              Supplier not listed? Type the business name and it will be sent for review.
            </small>
          ) : (
            <small>
              Choose a supplier already held in Supplier Master.
            </small>
          )}
        </div>
      ) : null}

      {disabled
      && values.some(
        (item) =>
          item.mode
          === "unlisted",
      ) ? (
        <p className="portal-supplier-review-note">
          Supplier names not yet in Supplier Master are awaiting business review.
        </p>
      ) : null}
    </div>
  );
}

type PortalView = "home" | "quotes" | "contracts" | "invoices" | "questionnaires" | "files" | "galleries";

function contrastColour(hex: string) {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "111111";
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#171717" : "#ffffff";
}

export function ClientPortal() {
  const initialQuestionnaire = new URLSearchParams(window.location.search).get("questionnaire") || "";
  const initialQuote = new URLSearchParams(window.location.search).get("quote") || "";
  const initialContract = new URLSearchParams(window.location.search).get("contract") || "";
  const initialInvoice = new URLSearchParams(window.location.search).get("invoice") || "";
  const [portal, setPortal] = useState<PortalPayload | null>(null);
  const [view, setView] = useState<PortalView>(
    initialInvoice
      ? "invoices"
      : initialContract
        ? "contracts"
        : initialQuote
          ? "quotes"
          : initialQuestionnaire
            ? "questionnaires"
            : "home",
  );
  const [selectedId, setSelectedId] = useState(initialQuestionnaire);
  const [selectedQuoteId, setSelectedQuoteId] = useState(initialQuote);
  const [selectedContractId, setSelectedContractId] = useState(initialContract);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoice);
  const [quote, setQuote] = useState<PortalQuote | null>(null);
  const questionnaireLoadRequestRef = useRef(0);
  const quoteLoadRequestRef = useRef(0);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [questionnaire, setQuestionnaire] = useState<PortalQuestionnaire | null>(null);
  const [supplierDirectory, setSupplierDirectory] = useState<SupplierDirectoryOption[]>([]);
  const [supplierCategories, setSupplierCategories] = useState<string[]>([]);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadPortal() {
    setLoading(true);
    setError("");
    try {
      const result = await jsonRequest<{ ok: true; portal: PortalPayload }>(portalApiPath("/api/public/client-portal"));
      setPortal(result.portal);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load client portal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPortal(); }, []);

  useEffect(() => {
    const requestId =
      ++questionnaireLoadRequestRef.current;

    if (!selectedId || !portal?.authenticated) {
      setQuestionnaire(null);
      setSupplierDirectory([]);
      setSupplierCategories([]);
      setSaving(false);
      return;
    }

    setSaving(true);
    setError("");

    jsonRequest<{
      ok: true;
      questionnaire: PortalQuestionnaire;
      suppliers?: SupplierDirectoryOption[];
      supplierCategories?: string[];
    }>(
      portalApiPath(
        `/api/public/client-portal/questionnaires/${encodeURIComponent(selectedId)}`,
      ),
    )
      .then((result) => {
        if (
          requestId
          !== questionnaireLoadRequestRef.current
        ) {
          return;
        }

        setQuestionnaire(result.questionnaire);
        setResponses(
          result.questionnaire.responses || {},
        );
        setSupplierDirectory(
          result.suppliers || [],
        );

        setSupplierCategories(
          result.supplierCategories
          || [],
        );
      })
      .catch((loadError) => {
        if (
          requestId
          !== questionnaireLoadRequestRef.current
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load questionnaire.",
        );
      })
      .finally(() => {
        if (
          requestId
          === questionnaireLoadRequestRef.current
        ) {
          setSaving(false);
        }
      });
  }, [selectedId, portal?.authenticated]);

  useEffect(() => {
    const requestId =
      ++quoteLoadRequestRef.current;

    if (!selectedQuoteId || !portal?.authenticated) {
      setQuote(null);
      setSaving(false);
      return;
    }

    setSaving(true);
    setError("");

    jsonRequest<{ ok: true; quote: PortalQuote }>(
      portalApiPath(
        `/api/public/client-portal/quotes/${encodeURIComponent(selectedQuoteId)}`,
      ),
    )
      .then((result) => {
        if (
          requestId
          !== quoteLoadRequestRef.current
        ) {
          return;
        }

        setQuote(result.quote);

        const accepted =
          result.quote.acceptance;

        const option =
          (
            accepted
              ? result.quote.currentVersion.options.find(
                  (item) =>
                    item.id
                    === accepted.optionId,
                )
              : null
          )
          || result.quote.currentVersion.options.find(
            (item) =>
              item.recommended,
          )
          || result.quote.currentVersion.options[0];

        setSelectedOptionId(
          option?.id || "",
        );

        const quantities:
          Record<string, number> = {};

        for (
          const addon
          of option?.addons || []
        ) {
          const acceptedAddon =
            accepted?.selectedAddons.find(
              (item) =>
                item.id === addon.id
                || (
                  item.addonId
                  && item.addonId
                    === addon.addonId
                ),
            );

          quantities[addon.id] =
            acceptedAddon?.quantity
            ?? (
              addon.requirement
              === "mandatory"
                ? Math.max(
                    1,
                    addon.minimumQuantity,
                    addon.defaultQuantity,
                  )
                : addon.defaultQuantity
            );
        }

        setAddonQuantities(
          quantities,
        );
      })
      .catch((loadError) => {
        if (
          requestId
          !== quoteLoadRequestRef.current
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load quote.",
        );
      })
      .finally(() => {
        if (
          requestId
          === quoteLoadRequestRef.current
        ) {
          setSaving(false);
        }
      });
  }, [selectedQuoteId, portal?.authenticated]);

  const selectedJob = useMemo(() => portal?.jobs.find((job) => job.questionnaires.some((item) => item.id === selectedId)) || null, [portal?.jobs, selectedId]);


  function openNextBookingStep(
    nextPortal: any,
    jobId: string,
  ) {
    const jobs =
      Array.isArray(nextPortal?.jobs)
        ? nextPortal.jobs
        : [];

    const job =
      jobs.find(
        (item: any) =>
          String(item?.id || "")
          === String(jobId || ""),
      )
      || jobs[0]
      || null;

    if (!job) {
      setSelectedId("");
      setSelectedQuoteId("");
      setSelectedContractId("");
      setSelectedInvoiceId("");
      setQuestionnaire(null);
      setQuote(null);
      setView("home");
      return;
    }

    const pendingQuestionnaire =
      (job.questionnaires || []).find(
        (item: any) =>
          String(item?.status || "")
          !== "completed",
      );

    if (pendingQuestionnaire) {
      setSelectedId(
        String(
          pendingQuestionnaire.id
          || "",
        ),
      );
      setSelectedQuoteId("");
      setSelectedContractId("");
      setSelectedInvoiceId("");
      setQuestionnaire(null);
      setQuote(null);
      setView("questionnaires");
      return;
    }

    const pendingContract =
      (
        job.commercial?.contracts
        || []
      ).find(
        (item: any) =>
          String(item?.status || "")
          !== "signed",
      );

    if (pendingContract) {
      setSelectedId("");
      setSelectedQuoteId("");
      setSelectedContractId(
        String(
          pendingContract.id
          || "",
        ),
      );
      setSelectedInvoiceId("");
      setQuestionnaire(null);
      setQuote(null);
      setView("contracts");
      return;
    }

    const unpaidInvoice =
      (
        job.commercial?.invoices
        || []
      ).find(
        (item: any) =>
          Number(
            item?.balanceAmount
            || 0,
          ) > 0,
      );

    if (unpaidInvoice) {
      setSelectedId("");
      setSelectedQuoteId("");
      setSelectedContractId("");
      setSelectedInvoiceId(
        String(
          unpaidInvoice.id
          || "",
        ),
      );
      setQuestionnaire(null);
      setQuote(null);
      setView("invoices");
      return;
    }

    setSelectedId("");
    setSelectedQuoteId("");
    setSelectedContractId("");
    setSelectedInvoiceId("");
    setQuestionnaire(null);
    setQuote(null);
    setView("home");
  }

  useEffect(() => {
    if (!portal?.authenticated) {
      return;
    }

    const stored =
      window.sessionStorage.getItem(
        "wedplanned:booking-next",
      );

    if (!stored) {
      return;
    }

    window.sessionStorage.removeItem(
      "wedplanned:booking-next",
    );

    try {
      const continuation =
        JSON.parse(stored);

      openNextBookingStep(
        portal,
        String(
          continuation?.jobId
          || "",
        ),
      );
    } catch {
      // Ignore malformed or stale continuation state.
    }
  }, [portal]);

  async function refreshQuestionnaire() {
    if (!questionnaire) return;
    const refreshed = await jsonRequest<{ ok: true; questionnaire: PortalQuestionnaire; suppliers?: SupplierDirectoryOption[] }>(portalApiPath(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}`));
    setQuestionnaire(refreshed.questionnaire);
    setResponses(refreshed.questionnaire.responses || {});
    setSupplierDirectory(refreshed.suppliers || supplierDirectory);
  }

  async function requestLink() {
    setSaving(true); setError(""); setMessage("");
    try {
      const quoteId =
        new URLSearchParams(
          window.location.search,
        ).get("quote")
        || "";

      const result = await jsonRequest<{ ok: true; message: string }>(
        portalApiPath(
          "/api/public/client-portal/request-link",
        ),
        {
          method: "POST",
          body: JSON.stringify({
            email,
            quoteId,
          }),
        },
      );

      setMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send sign-in link.");
    } finally { setSaving(false); }
  }

  async function save(submit = false) {
    if (!questionnaire) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await jsonRequest<{ ok: true; questionnaire: PortalQuestionnaire }>(portalApiPath(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}`), { method: "PUT", body: JSON.stringify({ responses, submit }) });
      setQuestionnaire(result.questionnaire);
      setResponses(result.questionnaire.responses || {});
      setMessage(
        submit
          ? "Planning details marked complete. You can continue updating them at any time."
          : result.questionnaire.status === "completed"
            ? "Changes saved. Your planning details remain marked complete."
            : "Changes saved. You can safely return later.",
      );
      if (submit) {
        window.sessionStorage.setItem(
          "wedplanned:booking-next",
          JSON.stringify({
            jobId:
              String(
                selectedJob?.id
                || "",
              ),
          }),
        );

        window.location.reload();
        return;
      }

      await loadPortal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save questionnaire.");
    } finally { setSaving(false); }
  }

  async function upload(fieldKey: string, file: File | undefined) {
    if (!questionnaire || !file) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const form = new FormData();
      form.set("fieldKey", fieldKey);
      form.set("file", file);
      const response = await fetch(portalApiPath(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}/files`), { method: "POST", credentials: "include", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Unable to upload file.");
      await refreshQuestionnaire();
      setMessage(`${file.name} uploaded.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload file.");
    } finally { setSaving(false); }
  }

  async function removeFile(fileId: string) {
    if (!questionnaire || !window.confirm("Remove this file?")) return;
    setSaving(true); setError("");
    try {
      await jsonRequest(portalApiPath(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}/files/${encodeURIComponent(fileId)}`), { method: "DELETE" });
      await refreshQuestionnaire();
      setMessage("File removed.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove file.");
    } finally { setSaving(false); }
  }

  async function uploadJobFile(
    jobId: string,
    file: File | undefined,
  ) {
    if (!file) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const form =
        new FormData();

      form.set(
        "file",
        file,
      );

      const response =
        await fetch(
          portalApiPath(
            `/api/public/client-portal/jobs/${encodeURIComponent(jobId)}/files`,
          ),
          {
            method: "POST",
            credentials: "include",
            body: form,
          },
        );

      const body: any =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          body?.error
          || "Unable to upload file.",
        );
      }

      await loadPortal();

      setMessage(
        `${file.name} uploaded.`,
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload file.",
      );
    } finally {
      setSaving(false);
    }
  }


  function chooseQuoteOption(option: PortalQuoteOption) {
    setSelectedOptionId(option.id);
    const quantities: Record<string, number> = {};
    for (const addon of option.addons) quantities[addon.id] = addon.requirement === "mandatory" ? Math.max(1, addon.minimumQuantity, addon.defaultQuantity) : addon.defaultQuantity;
    setAddonQuantities(quantities);
  }

  async function acceptQuote() {
    const optionId =
      quote?.quoteType === "fixed"
        ? quote.currentVersion.options[0]?.id || ""
        : selectedOptionId;

    const confirmation =
      quote?.quoteType === "fixed"
        ? "Accept this fixed quote as presented?"
        : "Accept this quote and confirm your selected package and extras?";

    if (
      !quote
      || !optionId
      || !window.confirm(
        confirmation,
      )
    ) {
      return;
    }

    setSaving(true); setError(""); setMessage("");

    try {
      const addons =
        quote.quoteType === "fixed"
          ? []
          : Object.entries(
              addonQuantities,
            ).map(
              ([id, quantity]) => ({
                id,
                quantity,
              }),
            );

      const result = await jsonRequest<{ ok: true; conversion: { jobId: string; jobReference: string } }>(portalApiPath(`/api/public/client-portal/quotes/${encodeURIComponent(quote.id)}/accept`), { method: "POST", body: JSON.stringify({ optionId, addons, confirmed: true }) });
      window.sessionStorage.setItem(
        "wedplanned:booking-next",
        JSON.stringify({
          jobId:
            String(
              result.conversion.jobId
              || "",
            ),
        }),
      );

      window.location.reload();
    } catch (acceptError) { setError(acceptError instanceof Error ? acceptError.message : "Unable to accept quote."); }
    finally { setSaving(false); }
  }

  async function declineQuote() {
    if (!quote || !window.confirm("Decline this quote? The business will be notified.")) return;
    const reason = window.prompt("Optional reason for declining:", "") || "";
    setSaving(true); setError(""); setMessage("");
    try { await jsonRequest(portalApiPath(`/api/public/client-portal/quotes/${encodeURIComponent(quote.id)}/decline`), { method: "POST", body: JSON.stringify({ reason }) }); setMessage("Quote declined. The business has been notified."); await loadPortal(); setQuote({ ...quote, status: "declined", currentVersion: { ...quote.currentVersion, status: "declined" } }); }
    catch (declineError) { setError(declineError instanceof Error ? declineError.message : "Unable to decline quote."); }
    finally { setSaving(false); }
  }

  async function signOut() {
    await fetch("/api/public/client-auth/sign-out", { method: "POST", credentials: "include" }).catch(() => {});
    setPortal({ authenticated: false, identity: null, jobs: [], quotes: [], galleries: [] });
    setView("home");
    setSelectedId("");
    setSelectedQuoteId("");
    setSelectedContractId("");
    setSelectedInvoiceId("");
    setQuestionnaire(null);
    setQuote(null);
  }

  const accent = portal?.business?.accentColor || "#111111";
  const secondary = portal?.business?.secondaryColor || "#f1efe9";
  const background = portal?.business?.backgroundColor || "#f7f6f3";
  const portalStyle = {
    "--portal-accent": accent,
    "--portal-secondary": secondary,
    "--portal-background": background,
    "--portal-on-accent": contrastColour(accent),
  } as CSSProperties;
  const allQuestionnaires = portal?.jobs.flatMap((job) => job.questionnaires.map((item) => ({ ...item, job }))) || [];
  const allJobFiles =
    portal?.jobs.flatMap(
      (job) =>
        (job.files || []).map(
          (file) => ({
            ...file,
            job,
          }),
        ),
    )
    || [];

  const galleries = portal?.galleries || [];
  const allContracts = portal?.jobs.flatMap((job) => (job.commercial?.contracts || []).map((item) => ({ ...item, job }))) || [];
  const allInvoices = portal?.jobs.flatMap((job) => (job.commercial?.invoices || []).map((item) => ({ ...item, job }))) || [];
  const completedQuestionnaires = allQuestionnaires.filter((item) => item.status === "completed").length;
  const pendingQuestionnaires = allQuestionnaires.length - completedQuestionnaires;
  const primaryJob = portal?.jobs[0] || null;
  const acceptedQuotes = portal?.quotes.filter((item) => item.status === "accepted").length || 0;
  const signedContracts = allContracts.filter((item) => item.status === "signed").length;
  const unpaidInvoices = allInvoices.filter((item) => item.balanceAmount > 0).length;
  const primaryContract = primaryJob?.commercial?.contracts?.[0] || null;
  const primaryInvoice = primaryJob?.commercial?.invoices?.find((item) => item.balanceAmount > 0)
    || primaryJob?.commercial?.invoices?.[0]
    || null;
  const primaryPendingQuestionnaire = primaryJob?.questionnaires.find((item) => item.status !== "completed") || null;
  const primaryQuoteAccepted = Boolean(
    primaryJob
    && portal?.quotes.some((item) => item.status === "accepted" && item.acceptedJobId === primaryJob.id),
  );
  const clientFirstName = (portal?.identity?.displayName || portal?.identity?.email || "there").split(/[ @]/)[0];
  const selectedQuoteOption =
    quote?.quoteType === "fixed"
      ? quote.currentVersion.options[0]
      : quote?.currentVersion.options.find(
          (option) =>
            option.id
            === selectedOptionId,
        );

  const fixedAddonQuantities:
    Record<string, number> =
    Object.fromEntries(
      (
        selectedQuoteOption?.addons
        || []
      ).map(
        (addon) => [
          addon.id,
          addon.requirement
          === "mandatory"
            ? Math.max(
                1,
                addon.minimumQuantity,
                addon.defaultQuantity,
              )
            : addon.defaultQuantity,
        ],
      ),
    );

  const displayedAddonQuantities =
    quote?.quoteType === "fixed"
      ? fixedAddonQuantities
      : addonQuantities;

  const selectedQuoteTotals =
    quoteTotals(
      selectedQuoteOption,
      quote,
      displayedAddonQuantities,
    );

  const acceptedQuote =
    quote?.currentVersion.status
      === "accepted"
      ? quote.acceptance
      : null;

  const displayedQuoteTotals =
    acceptedQuote
      ? {
          subtotal:
            acceptedQuote
              .subtotalAmount,
          discount:
            acceptedQuote
              .discountAmount,
          tax:
            acceptedQuote
              .taxAmount,
          total:
            acceptedQuote
              .totalAmount,
        }
      : selectedQuoteTotals;

  const displayedQuoteAddons =
    selectedQuoteOption
      ?.addons.filter(
        (addon) =>
          quote?.quoteType
            === "fixed"
            ? (
                displayedAddonQuantities[
                  addon.id
                ]
                ?? 0
              ) > 0
            : !acceptedQuote
              || (
                addonQuantities[
                  addon.id
                ]
                ?? 0
              ) > 0,
      )
    || [];

  if (loading && !portal) return <div className="client-portal-shell"><div className="client-portal-loading">Loading client portal…</div></div>;

  if (!portal?.authenticated) {
    return (
      <div className="client-portal-shell" style={portalStyle}>
        <Helmet><title>Client portal</title><meta name="robots" content="noindex,nofollow" /></Helmet>
        <main className="client-portal-signin">
          <div className="client-portal-brand">{portal?.business?.logoUrl ? <img src={portal.business.logoUrl} alt="" /> : <span>WP</span>}</div>
          <p className="client-portal-eyebrow">Secure client portal</p>
          <h1>Open your wedding workspace</h1>
          <p>
            {new URLSearchParams(
              window.location.search,
            ).get("reauth") === "1"
              ? "For security, this email sign-in link is no longer active. Enter your email address and we will send a fresh secure link so you can continue where you left off."
              : "Enter the email address linked to your quote or booking. We will send a one-time sign-in link."}
          </p>
          {error ? <div className="client-portal-alert client-portal-alert--error">{error}</div> : null}
          {message ? <div className="client-portal-alert client-portal-alert--success">{message}</div> : null}
          <label><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <button onClick={() => void requestLink()} disabled={saving || !email.trim()}><Mail />Send secure sign-in link</button>
        </main>
      </div>
    );
  }

  return (
    <div className="client-portal-shell" style={portalStyle}>
      <Helmet><title>{portal.business?.name || "WedPlanned"} client portal</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <header
        className="client-portal-hero"
        style={portal.business?.bannerUrl ? { backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.36), rgba(0,0,0,.08)), url(${portal.business.bannerUrl})` } : undefined}
      >
        <div className="client-portal-hero__identity">
          <div className="client-portal-hero__logo">{portal.business?.logoUrl ? <img src={portal.business.logoUrl} alt={`${portal.business?.name || "Business"} logo`} /> : <span>{(portal.business?.name || "WP").slice(0, 2).toUpperCase()}</span>}</div>
          <div><strong>{portal.business?.name || "WedPlanned"}</strong><small>Client portal</small></div>
        </div>
        <div className="client-portal-user"><span>{portal.identity?.displayName || portal.identity?.email}</span><button onClick={() => void signOut()}><LogOut />Sign out</button></div>
      </header>
      <nav className="client-portal-nav" aria-label="Client portal sections">
        <button className={view === "home" ? "active" : ""} onClick={() => { setView("home"); setSelectedId(""); setSelectedQuoteId(""); setQuestionnaire(null); setQuote(null); }}><Home />Home</button>
        {portal.quotes.length ? <button className={view === "quotes" ? "active" : ""} onClick={() => { setView("quotes"); setSelectedId(""); setQuestionnaire(null); }}><PackageCheck />Quotes</button> : null}
        {allQuestionnaires.length ? <button className={view === "questionnaires" ? "active" : ""} onClick={() => { setView("questionnaires"); setSelectedQuoteId(""); setQuote(null); }}><FileText />Questionnaires</button> : null}
        {allContracts.length ? <button className={view === "contracts" ? "active" : ""} onClick={() => { setView("contracts"); setSelectedContractId((current) => current || allContracts[0]?.id || ""); setSelectedId(""); setSelectedQuoteId(""); setQuestionnaire(null); setQuote(null); }}><FileText />Contracts</button> : null}
        {allInvoices.length ? <button className={view === "invoices" ? "active" : ""} onClick={() => { setView("invoices"); setSelectedInvoiceId((current) => current || allInvoices[0]?.id || ""); setSelectedId(""); setSelectedQuoteId(""); setQuestionnaire(null); setQuote(null); }}><PackageCheck />Invoices</button> : null}
        {portal.jobs.length ? <button className={view === "files" ? "active" : ""} onClick={() => { setView("files"); setSelectedId(""); setSelectedQuoteId(""); setSelectedContractId(""); setSelectedInvoiceId(""); setQuestionnaire(null); setQuote(null); }}><Paperclip />Files</button> : null}
        {galleries.length ? <button className={view === "galleries" ? "active" : ""} onClick={() => { setView("galleries"); setSelectedId(""); setSelectedQuoteId(""); setQuestionnaire(null); setQuote(null); }}><Images />Galleries</button> : null}
      </nav>
      {view === "home" ? <main className="client-portal-home">
        {error ? <div className="client-portal-alert client-portal-alert--error">{error}</div> : null}
        {message ? <div className="client-portal-alert client-portal-alert--success">{message}</div> : null}
        <section className="client-portal-welcome">
          <p className="client-portal-eyebrow">Welcome, {clientFirstName}</p>
          <h1>{portal.business?.welcomeHeading || "Welcome to your client portal"}</h1>
          <p>{portal.business?.welcomeMessage || "Everything for your booking is organised here in one secure place."}</p>
        </section>
        {primaryJob ? <section className="client-portal-event-card">
          <div><small>Your booking</small><h2>{primaryJob.title}</h2><p><CalendarDays />{formatDate(primaryJob.eventDate)}{primaryJob.venueText ? ` · ${primaryJob.venueText}` : ""}</p></div>
          <span>{primaryJob.status.replace(/_/g, " ")}</span>
        </section> : null}

        {primaryJob ? <section className="client-portal-booking-checklist">
          <header>
            <div><small>Booking progress</small><h2>Your booking checklist</h2></div>
            <p>Key commercial and planning steps for this booking.</p>
          </header>
          <div className="client-portal-booking-checklist__items">
            <article className={`client-portal-checklist-item ${primaryQuoteAccepted ? "complete" : ""}`}>
              <span>{primaryQuoteAccepted ? <CheckCircle2 /> : <XCircle />}</span>
              <div><strong>Quote accepted</strong><small>{primaryQuoteAccepted ? "Your package and selected extras are confirmed." : "Review the available quote before the booking can progress."}</small></div>
              {!primaryQuoteAccepted && portal.quotes.length ? <button type="button" onClick={() => setView("quotes")}>Review</button> : <em>Complete</em>}
            </article>

            <article className={`client-portal-checklist-item ${primaryJob.questionnaires.length > 0 && !primaryPendingQuestionnaire ? "complete" : ""}`}>
              <span>{primaryJob.questionnaires.length > 0 && !primaryPendingQuestionnaire ? <CheckCircle2 /> : <XCircle />}</span>
              <div><strong>Questionnaire</strong><small>{primaryJob.questionnaires.length ? primaryPendingQuestionnaire ? `${primaryPendingQuestionnaire.title} is waiting to be completed.` : "Your assigned questionnaire is complete." : "No questionnaire has been assigned yet."}</small></div>
              {primaryPendingQuestionnaire ? <button type="button" onClick={() => { setSelectedId(primaryPendingQuestionnaire.id); setView("questionnaires"); }}>Complete</button> : <em>{primaryJob.questionnaires.length ? "Complete" : "Pending"}</em>}
            </article>

            <article className={`client-portal-checklist-item ${primaryContract?.status === "signed" ? "complete" : ""}`}>
              <span>{primaryContract?.status === "signed" ? <CheckCircle2 /> : <XCircle />}</span>
              <div><strong>Contract signature</strong><small>{primaryContract ? primaryContract.status === "signed" ? "The required contract signature has been recorded." : `${primaryContract.signatureCount} of ${primaryContract.requiredSignatures} signatures recorded.` : "No client-visible contract has been issued yet."}</small></div>
              {primaryContract ? <button type="button" onClick={() => { setSelectedContractId(primaryContract.id); setView("contracts"); }}>View</button> : <em>Pending</em>}
            </article>

            <article className={`client-portal-checklist-item ${primaryInvoice && primaryInvoice.balanceAmount <= 0 ? "complete" : ""}`}>
              <span>{primaryInvoice && primaryInvoice.balanceAmount <= 0 ? <CheckCircle2 /> : <XCircle />}</span>
              <div><strong>Payment schedule</strong><small>{primaryInvoice ? primaryInvoice.balanceAmount <= 0 ? "The invoice balance is paid." : primaryInvoice.nextPayment ? `${primaryInvoice.nextPayment.label}: ${money(primaryInvoice.nextPayment.balanceAmount, primaryInvoice.currency)} remaining${primaryInvoice.nextPayment.dueDate ? ` · due ${formatDate(primaryInvoice.nextPayment.dueDate)}` : ""}.` : `${money(primaryInvoice.balanceAmount, primaryInvoice.currency)} remains due.` : "No client-visible invoice has been issued yet."}</small></div>
              {primaryInvoice ? <button type="button" onClick={() => { setSelectedInvoiceId(primaryInvoice.id); setView("invoices"); }}>View</button> : <em>Pending</em>}
            </article>
          </div>
        </section> : null}

        <section className="client-portal-home-grid">
          {portal.quotes.length ? <button onClick={() => setView("quotes")}><PackageCheck /><span><small>Quotes</small><strong>{acceptedQuotes ? `${acceptedQuotes} accepted` : `${portal.quotes.length} available`}</strong><em>Review package options and booking details</em></span></button> : null}
          {allQuestionnaires.length ? <button onClick={() => setView("questionnaires")}><FileText /><span><small>Questionnaires</small><strong>{pendingQuestionnaires ? `${pendingQuestionnaires} to complete` : "Complete"}</strong><em>{completedQuestionnaires} of {allQuestionnaires.length} completed</em></span></button> : null}
          {allContracts.length ? <button onClick={() => { setSelectedContractId((current) => current || allContracts[0]?.id || ""); setView("contracts"); }}><FileText /><span><small>Contracts</small><strong>{signedContracts === allContracts.length ? "Signed" : `${signedContracts} of ${allContracts.length} signed`}</strong><em>Review the contract attached to your booking</em></span></button> : null}
          {allInvoices.length ? <button onClick={() => { setSelectedInvoiceId((current) => current || allInvoices[0]?.id || ""); setView("invoices"); }}><PackageCheck /><span><small>Invoices</small><strong>{unpaidInvoices ? `${unpaidInvoices} with balance due` : "Paid"}</strong><em>View totals, instalments and payment history</em></span></button> : null}
          {portal.jobs.length ? <button onClick={() => setView("files")}><Paperclip /><span><small>Files</small><strong>{allJobFiles.length ? `${allJobFiles.length} shared` : "Ready for uploads"}</strong><em>Share planning images, schedules, documents and other references</em></span></button> : null}
          {galleries.length ? <button onClick={() => setView("galleries")}><Images /><span><small>Galleries</small><strong>{galleries.length === 1 ? "1 gallery ready" : `${galleries.length} galleries ready`}</strong><em>View photographs, favourites, selections and downloads</em></span></button> : null}
        </section>
        {!portal.jobs.length && !portal.quotes.length && !galleries.length ? <div className="client-portal-empty"><FileText /><h2>Nothing is waiting for you</h2><p>No active quotes, bookings or galleries are linked to this email.</p></div> : null}
      </main> : <div className="client-portal-layout">
        <aside className="client-portal-sidebar">
          {view === "quotes" ? <><p className="client-portal-eyebrow">Your quotes</p><div className="client-portal-quote-links">{portal.quotes.map((item) => <button key={item.id} className={selectedQuoteId === item.id ? "active" : ""} onClick={() => { setSelectedQuoteId(item.id); setSelectedId(""); setQuestionnaire(null); }}><PackageCheck /><span><strong>{item.reference}</strong><small>{item.status.replace(/_/g, " ")} · {formatDate(item.eventDate)}</small></span>{item.status === "accepted" ? <CheckCircle2 /> : null}</button>)}</div></> : null}
          {view === "contracts" ? <><p className="client-portal-eyebrow">Your contracts</p><div className="client-portal-quote-links">{portal.jobs.flatMap((job) => (job.commercial?.contracts || []).map((item) => ({ ...item, job }))).map((item) => <button key={item.id} className={selectedContractId === item.id ? "active" : ""} onClick={() => { setSelectedContractId(item.id); setSelectedInvoiceId(""); setSelectedId(""); setSelectedQuoteId(""); setQuestionnaire(null); setQuote(null); }}><FileText /><span><strong>{item.title || item.reference}</strong><small>{item.status.replace(/_/g, " ")} · {item.job.title}</small></span>{item.status === "signed" ? <CheckCircle2 /> : null}</button>)}</div></> : null}
          {view === "invoices" ? <><p className="client-portal-eyebrow">Your invoices</p><div className="client-portal-quote-links">{portal.jobs.flatMap((job) => (job.commercial?.invoices || []).map((item) => ({ ...item, job }))).map((item) => <button key={item.id} className={selectedInvoiceId === item.id ? "active" : ""} onClick={() => { setSelectedInvoiceId(item.id); setSelectedContractId(""); setSelectedId(""); setSelectedQuoteId(""); setQuestionnaire(null); setQuote(null); }}><PackageCheck /><span><strong>{item.reference}</strong><small>{item.balanceAmount > 0 ? `${money(item.balanceAmount, item.currency)} due` : "paid"} · {item.job.title}</small></span>{item.balanceAmount <= 0 ? <CheckCircle2 /> : null}</button>)}</div></> : null}
          {view === "questionnaires" ? <><p className="client-portal-eyebrow">Your questionnaires</p>{portal.jobs.map((job) => <section key={job.id} className="client-portal-job"><h2>{job.title}</h2><p><CalendarDays />{formatDate(job.eventDate)}</p><p>{job.venueText || "Venue TBC"}</p><div>{job.questionnaires.map((item) => <button key={item.id} className={selectedId === item.id ? "active" : ""} onClick={() => { setSelectedId(item.id); setSelectedQuoteId(""); setQuote(null); }}><FileText /><span>{item.title}<small>{item.status.replace(/_/g, " ")}</small></span>{item.status === "completed" ? <CheckCircle2 /> : null}</button>)}</div></section>)}</> : null}
          {view === "files" ? <><p className="client-portal-eyebrow">Planning files</p>{portal.jobs.map((job) => <section key={job.id} className="client-portal-job"><h2>{job.title}</h2><p><CalendarDays />{formatDate(job.eventDate)}</p><p>{job.venueText || "Venue TBC"}</p><div className="client-portal-file-job-summary"><Paperclip /><span><strong>{job.files?.length || 0} file{job.files?.length === 1 ? "" : "s"}</strong><small>Secure planning workspace</small></span></div></section>)}</> : null}
          {view === "galleries" ? <><p className="client-portal-eyebrow">Your galleries</p><div className="client-portal-gallery-links">{galleries.map((gallery) => <a key={gallery.id} href={portalGalleryPath(gallery)}><Images /><span><strong>{gallery.title}</strong><small>{gallery.weddingDate ? formatDate(gallery.weddingDate) : "Gallery ready"}</small></span></a>)}</div></> : null}
        </aside>
        <main className="client-portal-main">
          {error ? <div className="client-portal-alert client-portal-alert--error">{error}</div> : null}
          {message ? <div className="client-portal-alert client-portal-alert--success">{message}</div> : null}
          {view === "files" ? <section className="client-portal-files-view">
            <div className="client-portal-section-heading">
              <span>Planning workspace</span>
              <h1>Your files</h1>
              <p>Share inspiration images, schedules, venue documents, planning PDFs and other references securely with the business.</p>
            </div>

            <div className="client-portal-files-jobs">
              {portal.jobs.map((job) => <article key={job.id} className="client-portal-files-job">
                <header>
                  <div>
                    <small>{formatDate(job.eventDate)}</small>
                    <h2>{job.title}</h2>
                    <p>{job.venueText || "Venue TBC"}</p>
                  </div>
                  <span>{job.files?.length || 0} file{job.files?.length === 1 ? "" : "s"}</span>
                </header>

                <label className="client-portal-files-upload">
                  <Paperclip />
                  <span>
                    <strong>{saving ? "Working…" : "Upload a planning file"}</strong>
                    <small>Maximum file size 10 MB</small>
                  </span>
                  <input
                    type="file"
                    disabled={saving}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      void uploadJobFile(job.id, file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>

                {job.files?.length ? <div className="client-portal-files-list">
                  {job.files.map((file) => <a
                    key={file.id}
                    href={portalApiPath(`/api/public/client-portal/jobs/${encodeURIComponent(job.id)}/files/${encodeURIComponent(file.id)}`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Paperclip />
                    <span>
                      <strong>{file.filename}</strong>
                      <small>{file.source === "client" ? "Client upload" : "Business upload"} · {formatBytes(file.fileSize)}</small>
                    </span>
                    <Download />
                  </a>)}
                </div> : <div className="client-portal-files-empty"><Paperclip /><strong>No planning files yet</strong><p>Use the upload area above when you have something to share.</p></div>}
              </article>)}
            </div>
          </section> : view === "galleries" ? <section className="client-portal-gallery-view">
            <div className="client-portal-section-heading">
              <span>Gallery delivery</span>
              <h1>Your galleries</h1>
              <p>Open a gallery to view photographs, create favourites, complete selections, download permitted files and access print ordering.</p>
            </div>

            <div className="client-portal-gallery-grid">
              {galleries.map((gallery) => <a
                key={gallery.id}
                href={portalGalleryPath(gallery)}
                className="client-portal-gallery-card"
              >
                <div className="client-portal-gallery-card__cover">
                  {gallery.coverUrl ? <img src={gallery.coverUrl} alt="" /> : <Images />}
                </div>

                <div className="client-portal-gallery-card__body">
                  <small>{gallery.weddingDate ? formatDate(gallery.weddingDate) : "Client gallery"}</small>
                  <h2>{gallery.title}</h2>
                  <p>{gallery.venue || gallery.intro || "Your private photographs are ready to view."}</p>
                  <div>
                    {gallery.allowFavourites ? <span>Favourites</span> : null}
                    {gallery.allowDownloads ? <span>Downloads</span> : null}
                    <strong>Open gallery</strong>
                  </div>
                </div>
              </a>)}
            </div>
          </section> : view === "contracts" ? <ClientPortalCommercialDocument kind="contract" id={selectedContractId} /> : view === "invoices" ? <ClientPortalCommercialDocument kind="invoice" id={selectedInvoiceId} /> : quote ? <article className="portal-quote-card">
            <div className="portal-quote-heading"><button className="client-portal-back" onClick={() => setSelectedQuoteId("")}><ArrowLeft />Back</button><span>{portal.business?.name || "WedPlanned"}</span><h1>Your quote</h1><p className="portal-quote-client">Prepared for {quote.clientName}{quote.partnerName ? ` and ${quote.partnerName}` : ""}</p><div className="portal-quote-meta"><strong>{quote.reference}</strong><span>{quote.quoteType === "fixed" ? "Fixed quote" : "Pick & Choose"}</span><span>Version {quote.currentVersion.versionNumber}</span><span>{formatDate(quote.eventDate)}</span><span>{quote.venueText || "Venue TBC"}</span>{quote.currentVersion.expiresAt ? <span>Expires {formatDate(quote.currentVersion.expiresAt)}</span> : null}</div>{quote.currentVersion.clientNotes ? <p>{quote.currentVersion.clientNotes}</p> : null}</div>
            <div className="portal-package-grid">{quote.currentVersion.options.map((option) => <button type="button" key={option.id} className={`portal-package-card ${(quote.quoteType === "fixed" || selectedOptionId === option.id) ? "selected" : ""}`} disabled={quote.quoteType === "fixed" || ["accepted", "declined", "expired"].includes(quote.currentVersion.status)} onClick={() => { if (quote.quoteType !== "fixed") chooseQuoteOption(option); }}>{option.recommended ? <em>Recommended</em> : null}<span className="portal-package-check">{selectedOptionId === option.id ? <CheckCircle2 /> : null}</span><h2>{option.name}</h2>{option.description ? <p>{option.description}</p> : null}<strong>{money(option.basePriceAmount, option.currency)}</strong>{option.coverageMinutes ? <small>{Math.round(option.coverageMinutes / 60)} hours coverage</small> : null}<ul>{option.includedItems.map((item) => <li key={item}>{item}</li>)}</ul>{option.deliverables.length ? <div className="portal-package-deliverables"><b>Deliverables</b>{option.deliverables.map((item) => <span key={item}>{item}</span>)}</div> : null}</button>)}</div>
            {displayedQuoteAddons.length ? <section className="portal-quote-addons"><h2>{quote.quoteType === "fixed" ? "Included extras" : acceptedQuote ? "Selected extras" : "Optional extras"}</h2><p>{quote.quoteType === "fixed" ? "These required extras are already included in the fixed quote total." : acceptedQuote ? "Extras included in your accepted booking." : "Select permitted extras for your chosen package."}</p>{displayedQuoteAddons.map((addon) => { const quantity = addonQuantities[addon.id] ?? addon.defaultQuantity; const mandatory = addon.requirement === "mandatory"; return <div key={addon.id} className="portal-quote-addon"><div><strong>{addon.name}{mandatory ? <small>Required</small> : addon.requirement === "recommended" ? <small>Recommended</small> : null}</strong><p>{addon.description}</p></div><span>{money(addon.unitPriceAmount, addon.currency)}</span>{acceptedQuote || quote.quoteType === "fixed" ? <strong className="portal-quote-addon-accepted">× {quantity}</strong> : <label><span>Quantity</span><input type="number" min={mandatory ? Math.max(1, addon.minimumQuantity) : 0} max={addon.maximumQuantity} value={quantity} onChange={(event) => { const raw = Math.max(0, Math.min(addon.maximumQuantity, Number(event.target.value) || 0)); const next = mandatory ? Math.max(1, addon.minimumQuantity, raw) : raw > 0 ? Math.max(addon.minimumQuantity, raw) : 0; setAddonQuantities((current) => ({ ...current, [addon.id]: next })); }} /></label>}</div>; })}</section> : null}
            <section className="portal-quote-summary"><h2>Price summary</h2><dl><div><dt>Subtotal</dt><dd>{money(displayedQuoteTotals.subtotal, acceptedQuote?.currency || quote.currentVersion.currency)}</dd></div>{displayedQuoteTotals.discount ? <div><dt>Discount</dt><dd>−{money(displayedQuoteTotals.discount, acceptedQuote?.currency || quote.currentVersion.currency)}</dd></div> : null}{quote.currentVersion.taxTreatment !== "none" ? <div><dt>Tax {quote.currentVersion.taxTreatment === "inclusive" ? "included" : ""}</dt><dd>{money(displayedQuoteTotals.tax, acceptedQuote?.currency || quote.currentVersion.currency)}</dd></div> : null}<div className="total"><dt>Total</dt><dd>{money(displayedQuoteTotals.total, acceptedQuote?.currency || quote.currentVersion.currency)}</dd></div></dl></section>
            <footer className="portal-quote-actions">{quote.currentVersion.status === "accepted" ? <div className="client-portal-complete"><CheckCircle2 /><span>Quote accepted. Your booking is active.</span></div> : quote.currentVersion.status === "declined" ? <div className="client-portal-complete muted"><XCircle /><span>This quote was declined.</span></div> : quote.currentVersion.status === "expired" ? <div className="client-portal-complete muted"><XCircle /><span>This quote has expired.</span></div> : <><button className="secondary" disabled={saving} onClick={() => void declineQuote()}><XCircle />Decline quote</button><button disabled={saving || (quote.quoteType !== "fixed" && !selectedOptionId)} onClick={() => void acceptQuote()}><CheckCircle2 />Accept quote</button></>}</footer>
          </article> : !questionnaire ? <div className="client-portal-empty"><FileText /><h2>Select a quote or questionnaire</h2><p>Choose an item from the sidebar to continue.</p></div> : (
            <article className="portal-questionnaire-card">
              <div className="portal-questionnaire-heading"><button className="client-portal-back" onClick={() => setSelectedId("")}><ArrowLeft />Back</button><span>{selectedJob?.title}</span><h1>{questionnaire.title}</h1>{questionnaire.introduction ? <p>{questionnaire.introduction}</p> : null}<div className="portal-questionnaire-meta"><span>{questionnaire.status.replace(/_/g, " ")}</span>{questionnaire.dueAt ? <span>Planning target {formatDate(questionnaire.dueAt)}</span> : null}{questionnaire.lastSavedAt ? <span>Saved {new Date(questionnaire.lastSavedAt).toLocaleString("en-GB")}</span> : null}</div></div>
              <div className="portal-questionnaire-fields">
                {questionnaire.fields.map((field) => {
                  if (field.type === "heading") return <h2 key={field.id}>{field.label}</h2>;
                  if (field.type === "description") return <p key={field.id} className="portal-question-description">{field.label}</p>;
                  const value = responses[field.id];
                  const files = questionnaire.files.filter((file) => file.fieldKey === field.id);
                  if (field.type === "supplier") return <div key={field.id} className="portal-question-field"><span>{field.label}{field.required ? <b> *</b> : null}</span>{field.help ? <small>{field.help}</small> : null}<SupplierQuestion field={field} value={value} suppliers={supplierDirectory} categories={supplierCategories} disabled={saving} onChange={(next) => setResponses((current) => ({ ...current, [field.id]: next }))} /></div>;
                  return <label key={field.id} className="portal-question-field"><span>{field.label}{field.required ? <b> *</b> : null}</span>{field.help ? <small>{field.help}</small> : null}{field.type === "short_text" ? <input value={String(value ?? "")} disabled={saving} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.value }))} /> : null}{field.type === "long_text" ? <textarea value={String(value ?? "")} disabled={saving} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.value }))} /> : null}{field.type === "select" ? <select value={String(value ?? "")} disabled={saving} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.value }))}><option value="">Choose an option</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : null}{field.type === "radio" ? <div className="portal-choice-list">{field.options.map((option) => <label key={option}><input type="radio" name={field.id} checked={value === option} disabled={saving} onChange={() => setResponses((current) => ({ ...current, [field.id]: option }))} />{option}</label>)}</div> : null}{field.type === "checkbox" ? <div className="portal-choice-list">{field.options.map((option) => { const selected = Array.isArray(value) ? value as string[] : []; return <label key={option}><input type="checkbox" checked={selected.includes(option)} disabled={saving} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.checked ? [...selected, option] : selected.filter((item) => item !== option) }))} />{option}</label>; })}</div> : null}{field.type === "file" ? <div className="portal-file-field"><input type="file" disabled={saving} onChange={(event) => { const file = event.target.files?.[0]; void upload(field.id, file); event.currentTarget.value = ""; }} /><div className="portal-file-list">{files.map((file) => <div key={file.id}><Paperclip /><a href={portalApiPath(`/api/public/client-portal/questionnaires/${encodeURIComponent(questionnaire.id)}/files/${encodeURIComponent(file.id)}`)} target="_blank" rel="noreferrer"><span>{file.filename}</span><small>{formatBytes(file.fileSize)}</small></a><button type="button" disabled={saving} onClick={() => void removeFile(file.id)}><Trash2 /></button></div>)}</div></div> : null}</label>;
                })}
              </div>
              <footer className="portal-questionnaire-actions">
                {questionnaire.status === "completed" ? (
                  <div className="client-portal-complete">
                    <CheckCircle2 />
                    <span>
                      Planning details marked complete
                      {questionnaire.completedAt
                        ? ` ${new Date(questionnaire.completedAt).toLocaleString("en-GB")}`
                        : ""}.
                      {" "}
                      You can continue updating them at any time.
                    </span>
                  </div>
                ) : null}

                <button
                  className="secondary"
                  disabled={saving}
                  onClick={() =>
                    void save(false)
                  }
                >
                  <Save />
                  {questionnaire.status === "completed"
                    ? "Submit updates"
                    : "Save changes"}
                </button>

                {questionnaire.status !== "completed" ? (
                  <button
                    disabled={saving}
                    onClick={() =>
                      void save(true)
                    }
                  >
                    <CheckCircle2 />
                    Mark as complete
                  </button>
                ) : null}
              </footer>
            </article>
          )}
        </main>
      </div>}
      {portal.business?.footerText || portal.business?.contactEmail ? <footer className="client-portal-footer"><span>{portal.business?.footerText || `Need help? Contact ${portal.business?.name || "the business"}.`}</span>{portal.business?.contactEmail ? <a href={`mailto:${portal.business.contactEmail}`}>{portal.business.contactEmail}</a> : null}</footer> : null}
    </div>
  );
}
