import { AdminActionButton, AdminActionRouterLink } from "../components/ui/AdminActionControl";
import { PackageImage } from "../../components/PackageImage";
import { packagePresentation } from "../../../shared/package-presentation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CopyPlus,
  ExternalLink,
  FileText,
  MessageSquareText,
  Mail,
  PackageCheck,
  PackagePlus,
  Plus,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  AdminButton,
  AdminIconButton,
  AdminEmptyState,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
} from "../components/ui/AdminUI";
import {
  useProfessionalAuth,
} from "../auth/ProfessionalAuth";
import {
  AdminApiService,
} from "../services/AdminApiService";
import {
  CRMRecordBackLink,
} from "../components/crm/CRMRecordBackLink";
import type {
  CrmAddon,
  CrmPackage,
  CrmQuote,
  CrmQuoteItem,
  CrmQuoteOption,
  CrmQuoteSendPreview,
  CrmQuoteTemplate,
} from "../types/crm";

type DraftOption =
  Partial<CrmQuoteOption> & {
    tempId: string;
    addonIds: string[];
    items: CrmQuoteItem[];
  };

type Draft = {
  clientNotes: string;
  internalNotes: string;
  expiresAt: string;
  discountType:
    | "none"
    | "fixed"
    | "percentage";
  discountValue: number;
  taxTreatment:
    | "none"
    | "inclusive"
    | "exclusive";
  taxRateBasisPoints: number;
  currency: string;
  globalAddonIds: string[];
  options: DraftOption[];
};

function money(
  value: number,
  currency = "GBP",
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    },
  ).format(
    (value || 0) / 100,
  );
}

function tone(status: string) {
  return status === "accepted"
    ? "success"
    : status === "declined"
      || status === "expired"
      ? "danger"
      : status === "sent"
        || status === "viewed"
        ? "info"
        : status === "superseded"
          ? "neutral"
          : "warning";
}

function emptyDraft(
  currency = "GBP",
): Draft {
  return {
    clientNotes: "",
    internalNotes: "",
    expiresAt: "",
    discountType: "none",
    discountValue: 0,
    taxTreatment: "none",
    taxRateBasisPoints: 0,
    currency,
    globalAddonIds: [],
    options: [],
  };
}

function emptyBespoke(
  currency: string,
): DraftOption {
  return {
    tempId:
      crypto.randomUUID(),
    packageId: "",
    optionType: "bespoke",
    name: "Bespoke package",
    description: "",
    serviceType: "wedding",
    internalCode: "",
    basePriceAmount: 0,
    currency,
    coverageMinutes: null,
    deliverables: [],
    includedItems: [],
    clientNotes: "",
    imageUrl: "",
    recommended: false,
    displayOrder: 10,
    addonIds: [],
    items: [],
  };
}

function lines(
  value: string[] | undefined,
) {
  return (value || []).join("\n");
}

function splitLines(
  value: string,
) {
  return value
    .split(/\r?\n/)
    .map((item) =>
      item.trim(),
    )
    .filter(Boolean);
}

function coverageLabel(
  value: number | null | undefined,
) {
  if (!value) return "Flexible coverage";

  const hours = value / 60;

  return Number.isInteger(hours)
    ? `${hours} hour${hours === 1 ? "" : "s"}`
    : `${hours.toFixed(1)} hours`;
}

export function CRMQuote() {
  const { id = "" } =
    useParams();

  const navigate =
    useNavigate();

  const [searchParams] =
    useSearchParams();

  const { auth } =
    useProfessionalAuth();

  const canManage =
    auth.permissions.includes(
      "crm:manage",
    )
    && auth.accessMode !== "support";

  const [
    quote,
    setQuote,
  ] = useState<CrmQuote | null>(
    null,
  );

  const [
    packages,
    setPackages,
  ] = useState<CrmPackage[]>(
    [],
  );

  const [
    addons,
    setAddons,
  ] = useState<CrmAddon[]>(
    [],
  );

  const [
    templates,
    setTemplates,
  ] = useState<CrmQuoteTemplate[]>(
    [],
  );

  const [
    applyTemplateId,
    setApplyTemplateId,
  ] = useState("");

  const [
    draft,
    setDraft,
  ] = useState<Draft>(
    emptyDraft(),
  );

  const [
    offlineOptionId,
    setOfflineOptionId,
  ] = useState("");

  const [
    offlineAddonQuantities,
    setOfflineAddonQuantities,
  ] = useState<
    Record<string, number>
  >({});

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    sendOpen,
    setSendOpen,
  ] = useState(false);

  const [
    sendPreview,
    setSendPreview,
  ] = useState<
    CrmQuoteSendPreview | null
  >(null);

  const [
    sendTemplateId,
    setSendTemplateId,
  ] = useState("");

  const [
    sendSubject,
    setSendSubject,
  ] = useState("");

  const [
    sendBody,
    setSendBody,
  ] = useState("");

  const [
    bookingPackPreview,
    setBookingPackPreview,
  ] = useState<
    CrmQuoteSendPreview["bookingPack"] | null
  >(null);

  const [
    bookingContractTemplateId,
    setBookingContractTemplateId,
  ] = useState("");

  const [
    bookingQuestionnaireTemplateId,
    setBookingQuestionnaireTemplateId,
  ] = useState("");

  const [
    bookingAutoCreateInvoice,
    setBookingAutoCreateInvoice,
  ] = useState(false);

  const [
    bookingPaymentScheduleId,
    setBookingPaymentScheduleId,
  ] = useState("");

  const [
    sendPreviewLoading,
    setSendPreviewLoading,
  ] = useState(false);

  function hydrateDraft(
    current: CrmQuote,
  ) {
    const version =
      current.currentVersion;

    if (!version) {
      setDraft(
        emptyDraft(
          current.currency,
        ),
      );
      return;
    }

    const globalAddonIds = [
      ...new Set(
        version.options.flatMap(
          (option) =>
            option.addons.map(
              (addon) =>
                addon.addonId,
            ),
        ),
      ),
    ];

    setDraft({
      clientNotes:
        version.clientNotes,
      internalNotes:
        version.internalNotes,
      expiresAt:
        version.expiresAt
          ? String(
              version.expiresAt,
            ).slice(0, 10)
          : "",
      discountType:
        version.discountType,
      discountValue:
        version.discountValue,
      taxTreatment:
        version.taxTreatment,
      taxRateBasisPoints:
        version.taxRateBasisPoints,
      currency:
        version.currency,
      globalAddonIds,
      options:
        version.options.map(
          (option) => ({
            ...option,
            tempId:
              option.id
              || crypto.randomUUID(),
            addonIds:
              option.addons.map(
                (addon) =>
                  addon.addonId,
              ),
            items:
              option.items || [],
          }),
        ),
    });

    const firstOption =
      version.options[0];

    setOfflineOptionId(
      firstOption?.id || "",
    );

    setOfflineAddonQuantities(
      Object.fromEntries(
        (
          firstOption?.addons
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
      ),
    );
  }

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [
        current,
        catalogue,
        quoteTemplates,
      ] = await Promise.all([
        AdminApiService
          .getCrmQuote(id),
        AdminApiService
          .getCrmQuoteCatalogue(),
        AdminApiService
          .getCrmQuoteTemplates(),
      ]);

      setQuote(current);
      setPackages(
        catalogue.packages,
      );
      setAddons(
        catalogue.addons,
      );

      setTemplates(
        quoteTemplates,
      );

      setApplyTemplateId(
        (currentTemplateId) =>
          quoteTemplates.some(
            (template) =>
              template.id
                === currentTemplateId
              && template.status
                === "active"
              && template.quoteType
                === current.quoteType,
          )
            ? currentTemplateId
            : "",
      );

      hydrateDraft(current);

      try {
        const bookingPreview =
          await AdminApiService
            .getCrmQuoteSendPreview(
              id,
            );

        applyBookingPackPreview(
          bookingPreview.bookingPack,
        );
      } catch {
        setBookingPackPreview(
          null,
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load quote.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id, auth.workspaceId]);

  const editable =
    quote?.currentVersion
      ?.status === "draft";

  function addPackage(
    packageId: string,
  ) {
    const item =
      packages.find(
        (pkg) =>
          pkg.id === packageId,
      );

    if (!item) return;

    setDraft(
      (current) => ({
        ...current,
        options: [
          ...current.options,
          {
            tempId:
              crypto.randomUUID(),
            packageId:
              item.id,
            optionType:
              "catalogue",
            name:
              item.name,
            description:
              item.description,
            serviceType:
              item.serviceType,
            internalCode:
              item.internalCode,
            basePriceAmount:
              item.priceAmount,
            currency:
              item.currency,
            coverageMinutes:
              item.coverageMinutes,
            deliverables:
              item.deliverables,
            includedItems:
              item.includedItems,
            clientNotes:
              item.clientNotes,
            imageUrl:
              item.imageUrl,
            imagePresentation: item.imagePresentation,
            recommended:
              item.recommended,
            displayOrder:
              (
                current.options.length
                + 1
              ) * 10,
            addonIds:
              current
                .globalAddonIds,
            items: [],
          },
        ],
      }),
    );
  }

  function updateOption(
    tempId: string,
    patch:
      Partial<DraftOption>,
  ) {
    setDraft(
      (current) => ({
        ...current,
        options:
          current.options.map(
            (option) =>
              option.tempId
              === tempId
                ? {
                    ...option,
                    ...patch,
                  }
                : option,
          ),
      }),
    );
  }

  function addItem(
    tempId: string,
  ) {
    setDraft(
      (current) => ({
        ...current,
        options:
          current.options.map(
            (option) =>
              option.tempId
              === tempId
                ? {
                    ...option,
                    items: [
                      ...option.items,
                      {
                        name:
                          "Custom item",
                        description:
                          "",
                        quantity: 1,
                        unitPriceAmount:
                          0,
                        displayOrder:
                          (
                            option
                              .items
                              .length
                            + 1
                          ) * 10,
                      },
                    ],
                  }
                : option,
          ),
      }),
    );
  }

  function updateItem(
    tempId: string,
    index: number,
    patch:
      Partial<CrmQuoteItem>,
  ) {
    setDraft(
      (current) => ({
        ...current,
        options:
          current.options.map(
            (option) =>
              option.tempId
              === tempId
                ? {
                    ...option,
                    items:
                      option.items.map(
                        (
                          item,
                          itemIndex,
                        ) =>
                          itemIndex
                          === index
                            ? {
                                ...item,
                                ...patch,
                              }
                            : item,
                      ),
                  }
                : option,
          ),
      }),
    );
  }

  function removeItem(
    tempId: string,
    index: number,
  ) {
    setDraft(
      (current) => ({
        ...current,
        options:
          current.options.map(
            (option) =>
              option.tempId
              === tempId
                ? {
                    ...option,
                    items:
                      option.items.filter(
                        (
                          _,
                          itemIndex,
                        ) =>
                          itemIndex
                          !== index,
                      ),
                  }
                : option,
          ),
      }),
    );
  }

  function toggleGlobalAddon(
    addonId: string,
    checked: boolean,
  ) {
    setDraft(
      (current) => ({
        ...current,
        globalAddonIds:
          checked
            ? [
                ...new Set([
                  ...current
                    .globalAddonIds,
                  addonId,
                ]),
              ]
            : current
                .globalAddonIds
                .filter(
                  (idValue) =>
                    idValue
                    !== addonId,
                ),
      }),
    );
  }

  function chooseOfflineOption(
    optionId: string,
  ) {
    setOfflineOptionId(
      optionId,
    );

    const option =
      quote
        ?.currentVersion
        ?.options.find(
          (item) =>
            item.id === optionId,
        );

    setOfflineAddonQuantities(
      Object.fromEntries(
        (
          option?.addons
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
      ),
    );
  }

  const selectedPackageIds =
    useMemo(
      () =>
        new Set(
          draft.options
            .map(
              (option) =>
                option.packageId,
            )
            .filter(Boolean),
        ),
      [draft.options],
    );

  const globalAddons =
    useMemo(
      () =>
        addons.filter(
          (addon) => {
            const alreadySelected =
              draft.globalAddonIds
                .includes(
                  addon.id,
                );

            if (
              addon.status
              !== "active"
              && !alreadySelected
            ) {
              return false;
            }

            if (
              addon
                .availabilityScope
              === "all"
            ) {
              return true;
            }

            if (
              !selectedPackageIds
                .size
            ) {
              return true;
            }

            return packages.some(
              (pkg) =>
                selectedPackageIds
                  .has(pkg.id)
                && pkg.addonIds
                  .includes(
                    addon.id,
                  ),
            );
          },
        ),
      [
        addons,
        packages,
        selectedPackageIds,
        draft.globalAddonIds,
      ],
    );

  const mandatoryAddonIds =
    useMemo(
      () =>
        new Set(
          globalAddons
            .filter(
              (addon) =>
                addon.requirement
                === "mandatory",
            )
            .map(
              (addon) =>
                addon.id,
            ),
        ),
      [globalAddons],
    );

  const representative =
    useMemo(() => {
      const optionTotals =
        draft.options.map(
          (option) =>
            (
              option
                .basePriceAmount
              || 0
            )
            + option.items.reduce(
                (
                  sum,
                  item,
                ) =>
                  sum
                  + item.quantity
                    * item
                      .unitPriceAmount,
                0,
              ),
        );

      const subtotal =
        optionTotals.length
          ? Math.min(
              ...optionTotals,
            )
          : 0;

      const discount =
        draft.discountType
        === "fixed"
          ? Math.min(
              subtotal,
              draft.discountValue,
            )
          : draft.discountType
            === "percentage"
            ? Math.round(
                subtotal
                * Math.min(
                    10000,
                    draft
                      .discountValue,
                  )
                / 10000,
              )
            : 0;

      const discounted =
        subtotal - discount;

      const rate =
        draft
          .taxRateBasisPoints
        / 10000;

      const tax =
        draft.taxTreatment
        === "exclusive"
          ? Math.round(
              discounted
              * rate,
            )
          : draft.taxTreatment
              === "inclusive"
            && rate
            ? Math.round(
                discounted
                - discounted
                  / (1 + rate),
              )
            : 0;

      return {
        subtotal,
        discount,
        tax,
        total:
          draft.taxTreatment
          === "exclusive"
            ? discounted
              + tax
            : discounted,
      };
    }, [draft]);

  async function applyTemplate() {
    if (
      !quote
      || !applyTemplateId
    ) {
      return;
    }

    const template =
      templates.find(
        (item) =>
          item.id
            === applyTemplateId,
      );

    if (!template) {
      setError(
        "Choose an active quote template.",
      );
      return;
    }

    if (
      template.quoteType
      !== quote.quoteType
    ) {
      setError(
        "Choose a template that matches this quote type.",
      );
      return;
    }

    if (
      draft.options.length
      && !window.confirm(
        "Apply this template and replace the current draft package choices and commercial settings? The source template will not be changed.",
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const applied =
        await AdminApiService
          .createCrmQuote(
            quote.enquiryId,
            applyTemplateId,
          );

      setQuote(
        applied,
      );

      hydrateDraft(
        applied,
      );

      setMessage(
        `Applied ${template.name}. The quote is now an independent editable snapshot.`,
      );
    } catch (applyError) {
      setError(
        applyError instanceof Error
          ? applyError.message
          : "Unable to apply quote template.",
      );
    } finally {
      setSaving(false);
    }
  }

  const acceptedOptionId =
    quote?.acceptance?.optionId || "";

  const acceptedAddonIds =
    useMemo(
      () =>
        new Set(
          (
            quote?.acceptance
              ?.selectedAddons
            || []
          )
            .map(
              (addon) =>
                String(
                  addon.addonId
                  || "",
                ),
            )
            .filter(Boolean),
        ),
      [quote?.acceptance],
    );

  function payloadForSave() {
    const addonIds = [
      ...new Set([
        ...draft.globalAddonIds,
        ...mandatoryAddonIds,
      ]),
    ];

    return {
      ...draft,
      ...(bookingPackPreview
        ? {
            bookingPack: {
              contractTemplateId:
                bookingContractTemplateId,
              questionnaireTemplateId:
                bookingQuestionnaireTemplateId,
              autoCreateInvoice:
                bookingAutoCreateInvoice,
              paymentScheduleId:
                bookingPaymentScheduleId,
            },
          }
        : {}),
      options:
        draft.options.map(
          (option) => ({
            ...option,
            addonIds,
          }),
        ),
    } as unknown as
      Record<string, unknown>;
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved =
        await AdminApiService
          .saveCrmQuote(
            id,
            payloadForSave(),
          );

      setQuote(saved);
      hydrateDraft(saved);
      setMessage(
        "Quote draft saved.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save quote.",
      );
    } finally {
      setSaving(false);
    }
  }

  function applyBookingPackPreview(
    preview:
      CrmQuoteSendPreview["bookingPack"],
  ) {
    setBookingPackPreview(
      preview,
    );

    setBookingContractTemplateId(
      preview.contractTemplateId,
    );

    setBookingQuestionnaireTemplateId(
      preview.questionnaireTemplateId,
    );

    setBookingAutoCreateInvoice(
      preview.autoCreateInvoice,
    );

    setBookingPaymentScheduleId(
      preview.paymentScheduleId,
    );
  }

  function applySendPreview(
    preview: CrmQuoteSendPreview,
  ) {
    setSendPreview(preview);

    setSendTemplateId(
      preview.templateId,
    );

    setSendSubject(
      preview.subject,
    );

    setSendBody(
      preview.body,
    );
  }

  async function refreshSendPreview(
    templateId = "",
  ) {
    setSendPreviewLoading(true);
    setError("");

    try {
      const preview =
        await AdminApiService
          .getCrmQuoteSendPreview(
            id,
            templateId,
          );

      applySendPreview(
        preview,
      );
    } catch (previewError) {
      setError(
        previewError
          instanceof Error
          ? previewError.message
          : "Unable to prepare the quote email.",
      );
    } finally {
      setSendPreviewLoading(false);
    }
  }

  async function openSendPreview() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editable) {
        const saved =
          await AdminApiService
            .saveCrmQuote(
              id,
              payloadForSave(),
            );

        setQuote(saved);
        hydrateDraft(saved);
      }

      const preview =
        await AdminApiService
          .getCrmQuoteSendPreview(
            id,
          );

      applySendPreview(
        preview,
      );

      applyBookingPackPreview(
        preview.bookingPack,
      );

      setSendOpen(true);
    } catch (previewError) {
      setError(
        previewError
          instanceof Error
          ? previewError.message
          : "Unable to prepare the quote email.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function sendQuote() {
    if (!sendPreview) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const sent =
        await AdminApiService
          .sendCrmQuote(
            id,
            {
              templateId:
                sendTemplateId
                || undefined,
              subject:
                sendSubject,
              body:
                sendBody,
            },
          );

      setQuote(sent);
      hydrateDraft(sent);

      setSendOpen(false);
      setSendPreview(null);

      setMessage(
        `Quote sent to ${sent.clientEmail}.`,
      );
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Unable to send quote.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function revise() {
    setSaving(true);
    setError("");

    try {
      const revised =
        await AdminApiService
          .reviseCrmQuote(id);

      setQuote(revised);
      hydrateDraft(revised);

      const bookingPreview =
        await AdminApiService
          .getCrmQuoteSendPreview(
            id,
          );

      applyBookingPackPreview(
        bookingPreview.bookingPack,
      );

      setMessage(
        `Version ${revised.currentVersion?.versionNumber} created.`,
      );
    } catch (reviseError) {
      setError(
        reviseError instanceof Error
          ? reviseError.message
          : "Unable to revise quote.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function acceptOffline() {
    if (
      !offlineOptionId
      || !window.confirm(
        "Confirm the client accepted this quote offline. This creates the booked Job and locks the accepted version.",
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const conversion =
        await AdminApiService
          .acceptCrmQuote(
            id,
            {
              optionId:
                offlineOptionId,
              addons:
                Object.entries(
                  offlineAddonQuantities,
                ).map(
                  ([
                    addonId,
                    quantity,
                  ]) => ({
                    id:
                      addonId,
                    quantity,
                  }),
                ),
              confirmed: true,
            },
          );

      setMessage(
        `Quote accepted. ${conversion.jobReference} created.`,
      );

      navigate(
        `/admin/crm/jobs/${conversion.jobId}`,
      );
    } catch (acceptError) {
      setError(
        acceptError
          instanceof Error
          ? acceptError.message
          : "Unable to accept quote.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    loading
    && !quote
  ) {
    return (
      <AdminPage>
        <p className="text-sm text-neutral-500">
          Loading quote…
        </p>
      </AdminPage>
    );
  }

  if (!quote) {
    return (
      <AdminPage>
        <div className="admin-alert admin-alert--error">
          {error
            || "Quote not found."}
        </div>
      </AdminPage>
    );
  }

  const version =
    quote.currentVersion;

  const requestedJobId =
    searchParams.get("jobId") || "";

  const contextualJobId =
    requestedJobId
    && quote.acceptedJobId === requestedJobId
      ? requestedJobId
      : "";

  return (
    <AdminPage>
      <AdminPageHeader
        className="crm-quote-page-header"
        backLink={
          <CRMRecordBackLink
            jobId={contextualJobId}
            fallbackTo={`/admin/crm/enquiries/${encodeURIComponent(quote.enquiryId)}`}
            fallbackLabel="Back to Lead"
          />
        }
        title={quote.reference}
        description={[
          quote.clientName,
          quote.eventDate || "Date TBC",
          quote.venueText || "Venue TBC",
        ].join(" · ")}
        actions={
          <div className="crm-quote-header-actions">
            {editable ? (
              <div className="crm-quote-template-apply">
                <select
                  className="admin-select"
                  aria-label="Apply quote template"
                  disabled={
                    saving
                    || !canManage
                  }
                  value={
                    applyTemplateId
                  }
                  onChange={(event) =>
                    setApplyTemplateId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Apply template…
                  </option>

                  {templates
                    .filter(
                      (template) =>
                        template.status
                          === "active"
                        && template.quoteType
                          === quote.quoteType,
                    )
                    .map(
                      (template) => (
                        <option
                          key={template.id}
                          value={template.id}
                        >
                          {template.name}
                          {template.default
                            ? " · default"
                            : ""}
                        </option>
                      ),
                    )}
                </select>

                <AdminIconButton
                  icon={Sparkles}
                  label="Apply Template"
                  disabled={
                    saving
                    || !canManage
                    || !applyTemplateId
                  }
                  onClick={() =>
                    void applyTemplate()
                  }
                />
              </div>
            ) : null}

            {editable ? (
              <AdminIconButton
                icon={Save}
                label="Save draft"
                disabled={
                  saving
                  || !canManage
                }
                onClick={() =>
                  void save()
                }
              />
            ) : (
              <AdminIconButton
                icon={CopyPlus}
                label="Create revision"
                data-admin-action="duplicate"
                className="crm-quote-header-revision"
                disabled={
                  saving
                  || !canManage
                  || quote.status
                    === "accepted"
                }
                onClick={() =>
                  void revise()
                }
              />
            )}

            <AdminIconButton
              icon={Send}
              label={
                version?.sentAt
                  ? "Resend quote"
                  : "Send quote"
              }
              data-admin-action="send"
              className="crm-quote-header-send"
              disabled={
                saving
                || !canManage
                || !draft
                  .options
                  .length
                || quote.status
                  === "accepted"
              }
              onClick={() =>
                void openSendPreview()
              }
            />
          </div>
        }
      />

      {error ? (
        <div className="admin-alert admin-alert--error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="admin-alert admin-alert--success">
          {message}
        </div>
      ) : null}

      <div className={`crm-quote-workspace${quote.acceptedJobId || (version && ["sent", "viewed"].includes(version.status) && canManage) ? "" : " crm-quote-workspace--single-column"}`}>
        <main className="crm-quote-workspace__main">
          <AdminPanel
            title={
              quote.quoteType
                === "fixed"
                ? "Fixed package"
                : "Package choices"
            }
            icon={PackageCheck}
            actions={
              editable
              && (
                quote.quoteType
                  !== "fixed"
                || !draft.options.length
              ) ? (
                <div className="crm-quote-package-actions">
                  <select
                    className="admin-select"
                    id="add-package-select"
                    defaultValue=""
                  >
                    <option value="">
                      Choose catalogue package
                    </option>

                    {packages
                      .filter(
                        (item) =>
                          item.status
                          === "active",
                      )
                      .filter(
                        (item) =>
                          !draft.options.some(
                            (option) =>
                              option
                                .packageId
                              === item.id,
                          ),
                      )
                      .map(
                        (item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.name}
                            {" · "}
                            {money(
                              item
                                .priceAmount,
                              item.currency,
                            )}
                          </option>
                        ),
                      )}
                  </select>

                  <AdminButton
                    size="sm"
                    icon={Plus}
                    disabled={!canManage}
                    onClick={() => {
                      const select =
                        document.querySelector<HTMLSelectElement>(
                          "#add-package-select",
                        );

                      addPackage(
                        select?.value
                        || "",
                      );

                      if (select) {
                        select.value = "";
                      }
                    }}
                  >
                    Add package
                  </AdminButton>

                  <AdminButton
                    size="sm"
                    icon={Plus}
                    disabled={!canManage}
                    onClick={() =>
                      setDraft(
                        (current) => ({
                          ...current,
                          options: [
                            ...current.options,
                            {
                              ...emptyBespoke(
                                current
                                  .currency,
                              ),
                              displayOrder:
                                (
                                  current
                                    .options
                                    .length
                                  + 1
                                ) * 10,
                            },
                          ],
                        }),
                      )
                    }
                  >
                    Bespoke
                  </AdminButton>
                </div>
              ) : undefined
            }
          >
            {!draft.options.length ? (
              <AdminEmptyState
                icon={PackagePlus}
                title={
                  quote.quoteType
                    === "fixed"
                    ? "No fixed package"
                    : "No package choices"
                }
                description={
                  quote.quoteType
                    === "fixed"
                    ? "Choose one catalogue package or create one bespoke fixed option."
                    : "Add catalogue packages or create a bespoke option."
                }
              />
            ) : (
              <div className="crm-quote-package-grid">
                {draft.options.map(
                  (
                    option,
                    optionIndex,
                  ) => (
                    <article
                      key={
                        option.tempId
                      }
                      className={[
                        "crm-quote-package-card",
                        option.recommended
                          ? "crm-quote-package-card--recommended"
                          : "",
                        quote.status === "accepted"
                          && option.id === acceptedOptionId
                          ? "crm-quote-package-card--selected"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {option.imageUrl && packagePresentation(option.imagePresentation).placement === "above" ? <PackageImage url={option.imageUrl} presentation={option.imagePresentation} /> : null}

                      <header className="crm-quote-package-card__header">
                        <div>
                          <span className="crm-quote-package-card__eyebrow">
                            Option{" "}
                            {optionIndex
                              + 1}
                          </span>

                          <strong>
                            {option.name
                              || "Unnamed package"}
                          </strong>
                        </div>

                        {quote.status === "accepted"
                        && option.id === acceptedOptionId ? (
                          <AdminStatus tone="success">
                            Selected
                          </AdminStatus>
                        ) : option.recommended ? (
                          <AdminStatus tone="info">
                            Recommended
                          </AdminStatus>
                        ) : null}
                      </header>

                      <div className="crm-quote-package-card__price">
                        {money(
                          option
                            .basePriceAmount
                          || 0,
                          option.currency
                          || draft.currency,
                        )}
                      </div>

                      <div className="crm-quote-package-card__coverage">
                        <Clock3 />
                        {coverageLabel(
                          option
                            .coverageMinutes,
                        )}
                      </div>

                      <p className="crm-quote-package-card__description">
                        {option.description
                          || "No package description."}
                      </p>
                      {option.imageUrl && packagePresentation(option.imagePresentation).placement === "below" ? <PackageImage url={option.imageUrl} presentation={option.imagePresentation} /> : null}

                      {(option
                        .includedItems
                        || []
                      ).length ? (
                        <ul className="crm-quote-package-card__included">
                          {(option
                            .includedItems
                            || []
                          )
                            .slice(0, 5)
                            .map(
                              (
                                item,
                              ) => (
                                <li
                                  key={
                                    item
                                  }
                                >
                                  <Check />
                                  <span>
                                    {item}
                                  </span>
                                </li>
                              ),
                            )}
                        </ul>
                      ) : null}

                      {(option
                        .includedItems
                        || []
                      ).length > 5 ? (
                        <small className="crm-quote-package-card__more">
                          +
                          {(option
                            .includedItems
                            || []
                          ).length - 5}{" "}
                          more included
                        </small>
                      ) : null}

                      <div className="crm-quote-package-card__footer">
                        {editable ? (
                          <label className="crm-quote-recommended-toggle">
                            <input
                              type="checkbox"
                              disabled={
                                !canManage
                              }
                              checked={
                                Boolean(
                                  option
                                    .recommended,
                                )
                              }
                              onChange={
                                (
                                  event,
                                ) =>
                                  setDraft(
                                    (
                                      current,
                                    ) => ({
                                      ...current,
                                      options:
                                        current
                                          .options
                                          .map(
                                            (
                                              item,
                                            ) => ({
                                              ...item,
                                              recommended:
                                                item.tempId
                                                === option.tempId
                                                  ? event
                                                      .target
                                                      .checked
                                                  : event
                                                      .target
                                                      .checked
                                                    ? false
                                                    : item
                                                        .recommended,
                                            }),
                                          ),
                                    }),
                                  )
                              }
                            />

                            <span>
                              Recommended
                            </span>
                          </label>
                        ) : (
                          <span />
                        )}

                        {editable ? (
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            onClick={() =>
                              setDraft(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  options:
                                    current
                                      .options
                                      .filter(
                                        (
                                          item,
                                        ) =>
                                          item.tempId
                                          !== option.tempId,
                                      )
                                      .map(
                                        (
                                          item,
                                          index,
                                        ) => ({
                                          ...item,
                                          displayOrder:
                                            (
                                              index
                                              + 1
                                            ) * 10,
                                        }),
                                      ),
                                }),
                              )
                            }
                          >
                            Remove
                          </AdminButton>
                        ) : null}
                      </div>

                      <details className="crm-quote-package-editor">
                        <summary>
                          <Settings2 />
                          Edit package details
                          <ChevronDown />
                        </summary>

                        <div className="crm-quote-package-editor__body">
                          <div className="grid gap-3 md:grid-cols-2">
                            <AdminField label="Name">
                              <input
                                className="admin-input"
                                disabled={
                                  !editable
                                  || !canManage
                                }
                                value={
                                  option.name
                                  || ""
                                }
                                onChange={
                                  (
                                    event,
                                  ) =>
                                    updateOption(
                                      option.tempId,
                                      {
                                        name:
                                          event
                                            .target
                                            .value,
                                      },
                                    )
                                }
                              />
                            </AdminField>

                            <AdminField label="Base price (£)">
                              <input
                                className="admin-input"
                                type="number"
                                min="0"
                                disabled={
                                  !editable
                                  || !canManage
                                }
                                value={
                                  (
                                    option
                                      .basePriceAmount
                                    || 0
                                  ) / 100
                                }
                                onChange={
                                  (
                                    event,
                                  ) =>
                                    updateOption(
                                      option.tempId,
                                      {
                                        basePriceAmount:
                                          Math.round(
                                            Number(
                                              event
                                                .target
                                                .value
                                              || 0,
                                            )
                                            * 100,
                                          ),
                                      },
                                    )
                                }
                              />
                            </AdminField>

                            <AdminField label="Description">
                              <textarea
                                className="admin-textarea min-h-24"
                                disabled={
                                  !editable
                                  || !canManage
                                }
                                value={
                                  option
                                    .description
                                  || ""
                                }
                                onChange={
                                  (
                                    event,
                                  ) =>
                                    updateOption(
                                      option.tempId,
                                      {
                                        description:
                                          event
                                            .target
                                            .value,
                                      },
                                    )
                                }
                              />
                            </AdminField>

                            <AdminField label="Client notes">
                              <textarea
                                className="admin-textarea min-h-24"
                                disabled={
                                  !editable
                                  || !canManage
                                }
                                value={
                                  option
                                    .clientNotes
                                  || ""
                                }
                                onChange={
                                  (
                                    event,
                                  ) =>
                                    updateOption(
                                      option.tempId,
                                      {
                                        clientNotes:
                                          event
                                            .target
                                            .value,
                                      },
                                    )
                                }
                              />
                            </AdminField>

                            <AdminField
                              label="Included items"
                              help="One per line"
                            >
                              <textarea
                                className="admin-textarea min-h-32"
                                disabled={
                                  !editable
                                  || !canManage
                                }
                                value={
                                  lines(
                                    option
                                      .includedItems,
                                  )
                                }
                                onChange={
                                  (
                                    event,
                                  ) =>
                                    updateOption(
                                      option.tempId,
                                      {
                                        includedItems:
                                          splitLines(
                                            event
                                              .target
                                              .value,
                                          ),
                                      },
                                    )
                                }
                              />
                            </AdminField>

                            <AdminField
                              label="Deliverables"
                              help="One per line"
                            >
                              <textarea
                                className="admin-textarea min-h-32"
                                disabled={
                                  !editable
                                  || !canManage
                                }
                                value={
                                  lines(
                                    option
                                      .deliverables,
                                  )
                                }
                                onChange={
                                  (
                                    event,
                                  ) =>
                                    updateOption(
                                      option.tempId,
                                      {
                                        deliverables:
                                          splitLines(
                                            event
                                              .target
                                              .value,
                                          ),
                                      },
                                    )
                                }
                              />
                            </AdminField>
                          </div>

                          <section className="crm-quote-custom-items">
                            <header>
                              <div>
                                <strong>
                                  Custom line items
                                </strong>
                                <small>
                                  Add quote-specific charges to this package only.
                                </small>
                              </div>

                              {editable ? (
                                <AdminButton
                                  size="sm"
                                  icon={Plus}
                                  onClick={() =>
                                    addItem(
                                      option
                                        .tempId,
                                    )
                                  }
                                >
                                  Add line
                                </AdminButton>
                              ) : null}
                            </header>

                            {!option
                              .items
                              .length ? (
                              <p>
                                No custom line items.
                              </p>
                            ) : (
                              option.items.map(
                                (
                                  item,
                                  itemIndex,
                                ) => (
                                  <div
                                    className="crm-quote-line-item"
                                    key={`${option.tempId}_${itemIndex}`}
                                  >
                                    <input
                                      className="admin-input"
                                      disabled={
                                        !editable
                                        || !canManage
                                      }
                                      value={
                                        item.name
                                      }
                                      onChange={
                                        (
                                          event,
                                        ) =>
                                          updateItem(
                                            option.tempId,
                                            itemIndex,
                                            {
                                              name:
                                                event
                                                  .target
                                                  .value,
                                            },
                                          )
                                      }
                                      placeholder="Item"
                                    />

                                    <input
                                      className="admin-input"
                                      type="number"
                                      min="1"
                                      disabled={
                                        !editable
                                        || !canManage
                                      }
                                      value={
                                        item.quantity
                                      }
                                      onChange={
                                        (
                                          event,
                                        ) =>
                                          updateItem(
                                            option.tempId,
                                            itemIndex,
                                            {
                                              quantity:
                                                Number(
                                                  event
                                                    .target
                                                    .value
                                                  || 1,
                                                ),
                                            },
                                          )
                                      }
                                      aria-label="Quantity"
                                    />

                                    <input
                                      className="admin-input"
                                      type="number"
                                      min="0"
                                      disabled={
                                        !editable
                                        || !canManage
                                      }
                                      value={
                                        item
                                          .unitPriceAmount
                                        / 100
                                      }
                                      onChange={
                                        (
                                          event,
                                        ) =>
                                          updateItem(
                                            option.tempId,
                                            itemIndex,
                                            {
                                              unitPriceAmount:
                                                Math.round(
                                                  Number(
                                                    event
                                                      .target
                                                      .value
                                                    || 0,
                                                  )
                                                  * 100,
                                                ),
                                            },
                                          )
                                      }
                                      aria-label="Price"
                                    />

                                    {editable ? (
                                      <AdminActionButton
                                        type="button"
                                        onClick={() =>
                                          removeItem(
                                            option.tempId,
                                            itemIndex,
                                          )
                                        }
                                        aria-label="Remove line item"
                                      >
                                        <Trash2 />
                                      </AdminActionButton>
                                    ) : null}
                                  </div>
                                ),
                              )
                            )}
                          </section>
                        </div>
                      </details>
                    </article>
                  ),
                )}
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title="Additional options"
            description="Extras are presented once for the whole quote. The system still keeps package eligibility and immutable acceptance snapshots behind the scenes."
            icon={Plus}
          >
            {!globalAddons.length ? (
              <AdminEmptyState
                icon={Plus}
                title="No additional options"
                description="There are no active add-ons available for the selected package choices."
              />
            ) : (
              <div className="crm-quote-addon-grid">
                {globalAddons.map(
                  (addon) => {
                    const mandatory =
                      addon.requirement
                      === "mandatory";

                    const acceptedSelected =
                      quote.status === "accepted"
                      && acceptedAddonIds.has(
                        addon.id,
                      );

                    const selected =
                      quote.status === "accepted"
                        ? acceptedSelected
                        : mandatory
                          || draft
                            .globalAddonIds
                            .includes(
                              addon.id,
                            );

                    const eligiblePackages =
                      addon
                        .availabilityScope
                      === "all"
                        ? draft
                            .options
                            .length
                        : draft.options
                            .filter(
                              (
                                option,
                              ) => {
                                const pkg =
                                  packages.find(
                                    (
                                      item,
                                    ) =>
                                      item.id
                                      === option
                                        .packageId,
                                  );

                                return Boolean(
                                  pkg
                                    ?.addonIds
                                    .includes(
                                      addon.id,
                                    ),
                                );
                              },
                            )
                            .length;

                    return (
                      <label
                        key={
                          addon.id
                        }
                        className={
                          selected
                            ? "selected"
                            : ""
                        }
                      >
                        <input
                          type="checkbox"
                          disabled={
                            !editable
                            || !canManage
                            || mandatory
                          }
                          checked={
                            selected
                          }
                          onChange={
                            (
                              event,
                            ) =>
                              toggleGlobalAddon(
                                addon.id,
                                event
                                  .target
                                  .checked,
                              )
                          }
                        />

                        <span
                          className={
                            addon.imageUrl
                              ? "crm-quote-addon-grid__image"
                              : "crm-quote-addon-grid__image crm-quote-addon-grid__image--empty"
                          }
                        >
                          {addon.imageUrl ? (
                            <img
                              src={addon.imageUrl}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <PackageCheck />
                          )}
                        </span>

                        <span className="crm-quote-addon-grid__body">
                          <span className="crm-quote-addon-grid__title">
                            <strong>
                              {addon.name}
                            </strong>

                            {quote.status === "accepted"
                            && acceptedSelected ? (
                              <AdminStatus tone="success">
                                Selected
                              </AdminStatus>
                            ) : null}
                          </span>

                          <small>
                            {addon.description
                              || addon
                                .serviceType}
                          </small>
                        </span>

                        <span className="crm-quote-addon-grid__price">
                          <strong>
                            {money(
                              addon
                                .priceAmount,
                              addon.currency,
                            )}
                          </strong>

                          <small>
                            {mandatory
                              ? "Required"
                              : addon.requirement
                                === "recommended"
                                ? "Recommended"
                                : "Optional"}
                            {draft
                              .options
                              .length
                            && addon
                              .availabilityScope
                              !== "all"
                              ? ` · ${eligiblePackages}/${draft.options.length} packages`
                              : ""}
                          </small>
                        </span>
                      </label>
                    );
                  },
                )}
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title="Commercial settings"
            icon={Settings2}
          >
            <div className="crm-quote-settings-grid">
              <AdminField label="Expiry date">
                <input
                  className="admin-input"
                  type="date"
                  disabled={
                    !editable
                    || !canManage
                  }
                  value={
                    draft.expiresAt
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setDraft(
                        (
                          current,
                        ) => ({
                          ...current,
                          expiresAt:
                            event
                              .target
                              .value,
                        }),
                      )
                  }
                />
              </AdminField>

              <AdminField label="Discount">
                <select
                  className="admin-select"
                  disabled={
                    !editable
                    || !canManage
                  }
                  value={
                    draft.discountType
                  }
                  onChange={(event) => {
                    const discountType =
                      event.target.value as Draft["discountType"];

                    setDraft(
                      (current) => ({
                        ...current,
                        discountType,
                      }),
                    );
                  }}
                >
                  <option value="none">
                    No discount
                  </option>
                  <option value="fixed">
                    Fixed amount
                  </option>
                  <option value="percentage">
                    Percentage
                  </option>
                </select>
              </AdminField>

              <AdminField
                label={
                  draft.discountType
                  === "percentage"
                    ? "Discount (%)"
                    : "Discount (£)"
                }
              >
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  disabled={
                    !editable
                    || !canManage
                    || draft
                      .discountType
                      === "none"
                  }
                  value={
                    draft.discountValue
                    / 100
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setDraft(
                        (
                          current,
                        ) => ({
                          ...current,
                          discountValue:
                            Math.round(
                              Number(
                                event
                                  .target
                                  .value
                                || 0,
                              )
                              * 100,
                            ),
                        }),
                      )
                  }
                />
              </AdminField>

              <AdminField label="Tax treatment">
                <select
                  className="admin-select"
                  disabled={
                    !editable
                    || !canManage
                  }
                  value={
                    draft.taxTreatment
                  }
                  onChange={(event) => {
                    const taxTreatment =
                      event.target.value as Draft["taxTreatment"];

                    setDraft(
                      (current) => ({
                        ...current,
                        taxTreatment,
                      }),
                    );
                  }}
                >
                  <option value="none">
                    No tax
                  </option>
                  <option value="inclusive">
                    Tax included
                  </option>
                  <option value="exclusive">
                    Tax added
                  </option>
                </select>
              </AdminField>

              <AdminField label="Tax rate (%)">
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  disabled={
                    !editable
                    || !canManage
                    || draft
                      .taxTreatment
                      === "none"
                  }
                  value={
                    draft
                      .taxRateBasisPoints
                    / 100
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setDraft(
                        (
                          current,
                        ) => ({
                          ...current,
                          taxRateBasisPoints:
                            Math.round(
                              Number(
                                event
                                  .target
                                  .value
                                || 0,
                              )
                              * 100,
                            ),
                        }),
                      )
                  }
                />
              </AdminField>
            </div>
          </AdminPanel>

      <AdminPanel
        title="Booking & payment"
        icon={ShieldCheck}
      >
        {bookingPackPreview ? (
          <div className="crm-quote-booking-panel">
            <div className="crm-quote-booking-panel__grid">
              <AdminField
                label="Payment schedule"
              >
                <select
                  className="admin-select"
                  value={
                    bookingPaymentScheduleId
                  }
                  disabled={
                    !editable
                    || !canManage
                    || saving
                    || bookingPackPreview.frozen
                    || bookingPackPreview.legacyFallback
                  }
                  onChange={(event) =>
                    setBookingPaymentScheduleId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Workspace fallback
                  </option>

                  {bookingPackPreview.paymentSchedules.map(
                    (schedule) => (
                      <option
                        key={schedule.id}
                        value={schedule.id}
                      >
                        {schedule.name}
                        {schedule.default
                          ? " · default"
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </AdminField>

              <AdminField
                label="Contract"
              >
                <select
                  className="admin-select"
                  value={
                    bookingContractTemplateId
                  }
                  disabled={
                    !editable
                    || !canManage
                    || saving
                    || bookingPackPreview.frozen
                    || bookingPackPreview.legacyFallback
                  }
                  onChange={(event) =>
                    setBookingContractTemplateId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    None
                  </option>

                  {bookingPackPreview.contractTemplates.map(
                    (template) => (
                      <option
                        key={template.id}
                        value={template.id}
                      >
                        {template.name}
                      </option>
                    ),
                  )}
                </select>
              </AdminField>

              <AdminField
                label="Questionnaire"
              >
                <select
                  className="admin-select"
                  value={
                    bookingQuestionnaireTemplateId
                  }
                  disabled={
                    !editable
                    || !canManage
                    || saving
                    || bookingPackPreview.frozen
                    || bookingPackPreview.legacyFallback
                  }
                  onChange={(event) =>
                    setBookingQuestionnaireTemplateId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    None
                  </option>

                  {bookingPackPreview.questionnaireTemplates.map(
                    (template) => (
                      <option
                        key={template.id}
                        value={template.id}
                      >
                        {template.name}
                      </option>
                    ),
                  )}
                </select>
              </AdminField>
            </div>

            <label className="crm-quote-booking-panel__invoice">
              <input
                type="checkbox"
                checked={
                  bookingAutoCreateInvoice
                }
                disabled={
                  !editable
                  || !canManage
                  || saving
                  || bookingPackPreview.frozen
                  || bookingPackPreview.legacyFallback
                }
                onChange={(event) =>
                  setBookingAutoCreateInvoice(
                    event.target.checked,
                  )
                }
              />

              <span>
                <strong>
                  Create invoice automatically when quote is accepted
                </strong>

                <small>
                  The deposit and balance schedule below is derived from WedCRM Commercial Settings.
                </small>
              </span>
            </label>

            <div className="crm-quote-booking-panel__summary">
              <div>
                <span>Deposit</span>
                <strong>
                  {!bookingAutoCreateInvoice
                    ? "Not created"
                    : (
                        bookingPackPreview.paymentSchedules.find(
                          (schedule) =>
                            schedule.id
                            === bookingPaymentScheduleId,
                        )?.depositType
                        || bookingPackPreview.invoice.depositType
                      )
                      === "fixed"
                      ? money(
                          (
                            bookingPackPreview.paymentSchedules.find(
                              (schedule) =>
                                schedule.id
                                === bookingPaymentScheduleId,
                            )?.depositValue
                            ?? bookingPackPreview.invoice.depositValue
                          ),
                          quote?.currency
                            || draft.currency,
                        )
                      : (
                        bookingPackPreview.paymentSchedules.find(
                          (schedule) =>
                            schedule.id
                            === bookingPaymentScheduleId,
                        )?.depositType
                        || bookingPackPreview.invoice.depositType
                      )
                        === "percentage"
                        ? `${
                            (
                            bookingPackPreview.paymentSchedules.find(
                              (schedule) =>
                                schedule.id
                                === bookingPaymentScheduleId,
                            )?.depositValue
                            ?? bookingPackPreview.invoice.depositValue
                          )
                            / 100
                          }%`
                        : "No deposit"}
                </strong>
              </div>

              <div>
                <span>Deposit due</span>
                <strong>
                  {!bookingAutoCreateInvoice
                    ? "—"
                    : `${
                        (
                        bookingPackPreview.paymentSchedules.find(
                          (schedule) =>
                            schedule.id
                            === bookingPaymentScheduleId,
                        )?.depositDueDaysAfterAcceptance
                        ?? bookingPackPreview.invoice
                          .depositDueDaysAfterAcceptance
                      )
                      } day${
                        (
                        bookingPackPreview.paymentSchedules.find(
                          (schedule) =>
                            schedule.id
                            === bookingPaymentScheduleId,
                        )?.depositDueDaysAfterAcceptance
                        ?? bookingPackPreview.invoice
                          .depositDueDaysAfterAcceptance
                      )
                        === 1
                          ? ""
                          : "s"
                      } after acceptance`}
                </strong>
              </div>

              <div>
                <span>Final balance</span>
                <strong>
                  {!bookingAutoCreateInvoice
                    ? "—"
                    : `${
                        (
                        bookingPackPreview.paymentSchedules.find(
                          (schedule) =>
                            schedule.id
                            === bookingPaymentScheduleId,
                        )?.finalBalanceDueDaysBeforeEvent
                        ?? bookingPackPreview.invoice
                          .finalBalanceDueDaysBeforeEvent
                      )
                      } day${
                        (
                        bookingPackPreview.paymentSchedules.find(
                          (schedule) =>
                            schedule.id
                            === bookingPaymentScheduleId,
                        )?.finalBalanceDueDaysBeforeEvent
                        ?? bookingPackPreview.invoice
                          .finalBalanceDueDaysBeforeEvent
                      )
                        === 1
                          ? ""
                          : "s"
                      } before event`}
                </strong>
              </div>
            </div>

            <p className="crm-quote-booking-panel__footnote">
              These settings control the booking documents, invoice creation and payment schedule. They do not enable online payment collection.
            </p>
          </div>
        ) : (
          <p className="crm-quote-booking-panel__unavailable">
            Booking configuration could not be loaded. Saving the quote will preserve any existing draft booking choices.
          </p>
        )}
      </AdminPanel>


          <AdminPanel
            title="Client message"
            icon={MessageSquareText}
          >
            <div className="crm-quote-message-grid">
              <AdminField
                label="Client-facing message"
                help="Visible on the quote."
              >
                <textarea
                  className="admin-textarea min-h-36"
                  disabled={
                    !editable
                    || !canManage
                  }
                  value={
                    draft.clientNotes
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setDraft(
                        (
                          current,
                        ) => ({
                          ...current,
                          clientNotes:
                            event
                              .target
                              .value,
                        }),
                      )
                  }
                />
              </AdminField>

              <AdminField
                label="Internal notes"
                help="Never shown to the client."
              >
                <textarea
                  className="admin-textarea min-h-36"
                  disabled={
                    !editable
                    || !canManage
                  }
                  value={
                    draft.internalNotes
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setDraft(
                        (
                          current,
                        ) => ({
                          ...current,
                          internalNotes:
                            event
                              .target
                              .value,
                        }),
                      )
                  }
                />
              </AdminField>
            </div>
          </AdminPanel>
        </main>

        <aside className="crm-quote-workspace__aside">


          {version
            && [
              "sent",
              "viewed",
            ].includes(
              version.status,
            )
            && canManage ? (
            <AdminPanel
              title="Offline acceptance"
              description="Use only when the client accepted outside the portal."
              icon={CheckCircle2}
              compact
            >
              <AdminField label="Accepted package">
                <select
                  className="admin-select"
                  value={
                    offlineOptionId
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      chooseOfflineOption(
                        event
                          .target
                          .value,
                      )
                  }
                >
                  {version.options.map(
                    (option) => (
                      <option
                        key={
                          option.id
                        }
                        value={
                          option.id
                        }
                      >
                        {option.name}
                      </option>
                    ),
                  )}
                </select>
              </AdminField>

              {version.options.find(
                (option) =>
                  option.id
                  === offlineOptionId,
              )?.addons.length ? (
                <div className="crm-offline-addon-list">
                  <strong>
                    Accepted add-ons
                  </strong>

                  {version.options
                    .find(
                      (
                        option,
                      ) =>
                        option.id
                        === offlineOptionId,
                    )
                    ?.addons.map(
                      (addon) => {
                        const mandatory =
                          addon.requirement
                          === "mandatory";

                        const quantity =
                          offlineAddonQuantities[
                            addon.id
                          ]
                          ?? addon
                            .defaultQuantity;

                        return (
                          <label
                            key={
                              addon.id
                            }
                          >
                            <span>
                              {addon.name}
                              <small>
                                {money(
                                  addon
                                    .unitPriceAmount,
                                  addon.currency,
                                )}
                                {" · "}
                                {mandatory
                                  ? "required"
                                  : addon.requirement}
                              </small>
                            </span>

                            <input
                              className="admin-input"
                              type="number"
                              min={
                                mandatory
                                  ? Math.max(
                                      1,
                                      addon
                                        .minimumQuantity,
                                    )
                                  : 0
                              }
                              max={
                                addon
                                  .maximumQuantity
                              }
                              value={
                                quantity
                              }
                              onChange={
                                (
                                  event,
                                ) => {
                                  const raw =
                                    Math.max(
                                      0,
                                      Math.min(
                                        addon
                                          .maximumQuantity,
                                        Number(
                                          event
                                            .target
                                            .value,
                                        )
                                        || 0,
                                      ),
                                    );

                                  const next =
                                    mandatory
                                      ? Math.max(
                                          1,
                                          addon
                                            .minimumQuantity,
                                          raw,
                                        )
                                      : raw > 0
                                        ? Math.max(
                                            addon
                                              .minimumQuantity,
                                            raw,
                                          )
                                        : 0;

                                  setOfflineAddonQuantities(
                                    (
                                      current,
                                    ) => ({
                                      ...current,
                                      [
                                        addon.id
                                      ]:
                                        next,
                                    }),
                                  );
                                }
                              }
                            />
                          </label>
                        );
                      },
                    )}
                </div>
              ) : null}

              <div className="mt-3">
                <AdminButton
                  variant="primary"
                  icon={
                    CheckCircle2
                  }
                  disabled={
                    saving
                    || !offlineOptionId
                  }
                  onClick={() =>
                    void acceptOffline()
                  }
                >
                  Accept quote and create Job
                </AdminButton>
              </div>
            </AdminPanel>
          ) : null}



          {quote.acceptedJobId ? (
            <AdminPanel
              title="Booked Job"
              icon={ExternalLink}
              compact
            >
              <AdminActionRouterLink
                className="admin-button admin-button--primary"
                to={`/admin/crm/jobs/${quote.acceptedJobId}`}
              >
                <ExternalLink className="admin-button__icon" />
                Open Job
              </AdminActionRouterLink>
            </AdminPanel>
          ) : null}
        </aside>
      </div>

      {sendOpen && sendPreview
        ? createPortal(
            (
        <div
          className="crm-quote-send-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target
              === event.currentTarget
              && !saving
            ) {
              setSendOpen(false);
            }
          }}
        >
          <section
            className="crm-quote-send-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-quote-send-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <header className="crm-quote-send-dialog__header">
              <div>
                <span>
                  Send quote
                </span>

                <h2 id="crm-quote-send-title">
                  Email preview
                </h2>

                <p>
                  Review the email before it is sent. The secure quote link is generated only when you press Send.
                </p>
              </div>

              <AdminActionButton
                type="button"
                aria-label="Close email preview"
                disabled={saving}
                onClick={() =>
                  setSendOpen(false)
                }
              >
                ×
              </AdminActionButton>
            </header>

            <div className="crm-quote-send-dialog__content">
              <main className="crm-quote-send-compose">
                <div className="crm-quote-send-addresses">
                  <div>
                    <span>From</span>
                    <strong>
                      {sendPreview.fromName}
                    </strong>
                    <small>
                      {sendPreview.fromEmail
                        || sendPreview.providerLabel}
                    </small>
                  </div>

                  <div>
                    <span>To</span>
                    <strong>
                      {sendPreview.clientName}
                    </strong>
                    <small>
                      {sendPreview.to}
                    </small>
                  </div>

                  <div>
                    <span>Reply to</span>
                    <strong>
                      {sendPreview.replyToEmail
                        || "Managed sender"}
                    </strong>
                    <small>
                      Client replies
                    </small>
                  </div>
                </div>

                <AdminField
                  label="Email template"
                  help="Changing template refreshes the subject and message."
                >
                  <select
                    className="admin-select"
                    value={sendTemplateId}
                    disabled={
                      saving
                      || sendPreviewLoading
                    }
                    onChange={(event) => {
                      const next =
                        event.target.value;

                      setSendTemplateId(
                        next,
                      );

                      void refreshSendPreview(
                        next,
                      );
                    }}
                  >
                    {!sendPreview.templates.length ? (
                      <option value="">
                        Standard quote email
                      </option>
                    ) : null}

                    {sendPreview.templates.map(
                      (template) => (
                        <option
                          key={template.id}
                          value={template.id}
                        >
                          {template.name}
                          {template.default
                            ? " · Default"
                            : ""}
                        </option>
                      ),
                    )}
                  </select>
                </AdminField>

                <AdminField label="Subject">
                  <input
                    className="admin-input"
                    value={sendSubject}
                    disabled={
                      saving
                      || sendPreviewLoading
                    }
                    onChange={(event) =>
                      setSendSubject(
                        event.target.value,
                      )
                    }
                  />
                </AdminField>

                <AdminField
                  label="Message"
                  help="The {{quote_link}} merge field is replaced with a new secure client link when sent."
                >
                  <textarea
                    className="admin-textarea crm-quote-send-message"
                    value={sendBody}
                    disabled={
                      saving
                      || sendPreviewLoading
                    }
                    onChange={(event) =>
                      setSendBody(
                        event.target.value,
                      )
                    }
                  />
                </AdminField>

                <section className="crm-quote-send-booking-pack">
                  <header className="crm-quote-send-booking-pack__header">
                    <div>
                      <span>
                        Booking pack
                      </span>

                      <strong>
                        Ready with this quote
                      </strong>

                      <p>
                        Review the booking configuration already saved on this quote before sending the email.
                      </p>
                    </div>

                    {sendPreview.bookingPack.frozen ? (
                      <AdminStatus tone="success">
                        Sent version locked
                      </AdminStatus>
                    ) : sendPreview.bookingPack.legacyFallback ? (
                      <AdminStatus tone="neutral">
                        Legacy sent version
                      </AdminStatus>
                    ) : (
                      <AdminStatus tone="info">
                        From quote draft
                      </AdminStatus>
                    )}
                  </header>

                  <div className="crm-quote-send-booking-pack__summary crm-quote-send-booking-pack__summary--booking">
                    <div>
                      <span>Payment schedule</span>
                      <strong>
                        {sendPreview.bookingPack.paymentScheduleId
                          ? sendPreview.bookingPack.paymentSchedules.find(
                              (schedule) =>
                                schedule.id
                                === sendPreview.bookingPack.paymentScheduleId,
                            )?.name
                            || "Selected schedule"
                          : "Workspace fallback"}
                      </strong>
                    </div>

                    <div>
                      <span>Contract</span>
                      <strong>
                        {sendPreview.bookingPack.contractTemplateId
                          ? sendPreview.bookingPack.contractTemplates.find(
                              (template) =>
                                template.id
                                === sendPreview.bookingPack.contractTemplateId,
                            )?.name
                            || "Selected contract"
                          : "None"}
                      </strong>
                    </div>

                    <div>
                      <span>Questionnaire</span>
                      <strong>
                        {sendPreview.bookingPack.questionnaireTemplateId
                          ? sendPreview.bookingPack.questionnaireTemplates.find(
                              (template) =>
                                template.id
                                === sendPreview.bookingPack.questionnaireTemplateId,
                            )?.name
                            || "Selected questionnaire"
                          : "None"}
                      </strong>
                    </div>

                    <div>
                      <span>Invoice</span>
                      <strong>
                        {sendPreview.bookingPack.autoCreateInvoice
                          ? "Created on acceptance"
                          : "Not created"}
                      </strong>
                    </div>
                  </div>

                  <div className="crm-quote-send-booking-pack__summary">
                    <div>
                      <span>Deposit</span>
                      <strong>
                        {!sendPreview.bookingPack.autoCreateInvoice
                          ? "—"
                          : sendPreview.bookingPack.invoice.depositType
                            === "fixed"
                            ? money(
                                sendPreview.bookingPack.invoice.depositValue,
                                quote?.currency
                                  || draft.currency,
                              )
                            : sendPreview.bookingPack.invoice.depositType
                              === "percentage"
                              ? `${
                                  sendPreview.bookingPack.invoice.depositValue
                                  / 100
                                }%`
                              : "No deposit"}
                      </strong>
                    </div>

                    <div>
                      <span>Deposit due</span>
                      <strong>
                        {!sendPreview.bookingPack.autoCreateInvoice
                          ? "—"
                          : `${
                              sendPreview.bookingPack.invoice
                                .depositDueDaysAfterAcceptance
                            } day${
                              sendPreview.bookingPack.invoice
                                .depositDueDaysAfterAcceptance
                              === 1
                                ? ""
                                : "s"
                            } after acceptance`}
                      </strong>
                    </div>

                    <div>
                      <span>Final balance</span>
                      <strong>
                        {!sendPreview.bookingPack.autoCreateInvoice
                          ? "—"
                          : `${
                              sendPreview.bookingPack.invoice
                                .finalBalanceDueDaysBeforeEvent
                            } day${
                              sendPreview.bookingPack.invoice
                                .finalBalanceDueDaysBeforeEvent
                              === 1
                                ? ""
                                : "s"
                            } before event`}
                      </strong>
                    </div>
                  </div>

                  <p className="crm-quote-send-booking-pack__footnote">
                    Booking choices are edited on the quote, not in this send window. For a draft version they become immutable only after this email is delivered successfully.
                  </p>
                </section>

                <div className="crm-quote-send-link-note">
                  <ShieldCheck />
                  <div>
                    <strong>
                      Secure quote link
                    </strong>
                    <p>
                      No client access token exists in this preview. A fresh single-use verification link is generated server-side at send time.
                    </p>
                  </div>
                </div>

                {sendPreview.attachments.length ? (
                  <div className="admin-alert admin-alert--warning">
                    This template contains{" "}
                    {sendPreview.attachments.length}{" "}
                    attachment
                    {sendPreview.attachments.length === 1
                      ? ""
                      : "s"}.
                    Attachment delivery is not enabled yet, so this email cannot be sent until the attachment is removed or attachment delivery is added.
                  </div>
                ) : null}
              </main>

              <aside className="crm-quote-send-sidebar">
                <div className="crm-quote-send-provider">
                  <span>
                    Delivery
                  </span>

                  <strong>
                    {sendPreview.providerLabel}
                  </strong>

                  <AdminStatus
                    tone={
                      sendPreview.deliveryReady
                        ? "success"
                        : "warning"
                    }
                  >
                    {sendPreview.deliveryReady
                      ? "Ready"
                      : "Not ready"}
                  </AdminStatus>

                  {sendPreview.deliveryIssue ? (
                    <p>
                      {sendPreview.deliveryIssue}
                    </p>
                  ) : null}
                </div>

                <div className="crm-quote-send-summary">
                  <div>
                    <span>Quote</span>
                    <strong>
                      {sendPreview.reference}
                    </strong>
                  </div>

                  <div>
                    <span>Template</span>
                    <strong>
                      {sendPreview.templateName}
                    </strong>
                  </div>

                  <div>
                    <span>Recipient</span>
                    <strong>
                      {sendPreview.to}
                    </strong>
                  </div>
                </div>

                {!sendPreview.deliveryReady ? (
                  <AdminActionRouterLink
                    to="/admin/crm/email-settings"
                    className="admin-button admin-button--secondary admin-button--md"
                  >
                    <Mail className="admin-button__icon" />
                    Email settings
                  </AdminActionRouterLink>
                ) : null}
              </aside>
            </div>

            <footer className="crm-quote-send-dialog__footer">
              <AdminButton
                variant="ghost"
                disabled={saving}
                onClick={() =>
                  setSendOpen(false)
                }
              >
                Cancel
              </AdminButton>

              <AdminButton
                variant="primary"
                icon={Send}
                disabled={
                  saving
                  || sendPreviewLoading
                  || !sendPreview.deliveryReady
                  || !sendSubject.trim()
                  || !sendBody.trim()
                }
                onClick={() =>
                  void sendQuote()
                }
              >
                {saving
                  ? "Sending…"
                  : `Send to ${sendPreview.clientName}`}
              </AdminButton>
            </footer>
          </section>
        </div>
            ),
            document.querySelector<HTMLElement>(
              ".admin-shell",
            ) || document.body,
          )
        : null}

    </AdminPage>
  );
}
