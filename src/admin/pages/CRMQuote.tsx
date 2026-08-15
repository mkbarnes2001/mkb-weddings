import {
  useEffect,
  useMemo,
  useState,
} from "react";
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
} from "react-router-dom";
import {
  AdminButton,
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
    sendContractTemplateId,
    setSendContractTemplateId,
  ] = useState("");

  const [
    sendQuestionnaireTemplateId,
    setSendQuestionnaireTemplateId,
  ] = useState("");

  const [
    sendAutoCreateInvoice,
    setSendAutoCreateInvoice,
  ] = useState(false);

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

  function payloadForSave() {
    const addonIds = [
      ...new Set([
        ...draft.globalAddonIds,
        ...mandatoryAddonIds,
      ]),
    ];

    return {
      ...draft,
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

  function applySendPreview(
    preview: CrmQuoteSendPreview,
    preserveBookingPack = false,
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

    if (
      !preserveBookingPack
      || preview.bookingPack.frozen
      || preview.bookingPack.legacyFallback
    ) {
      setSendContractTemplateId(
        preview.bookingPack
          .contractTemplateId,
      );

      setSendQuestionnaireTemplateId(
        preview.bookingPack
          .questionnaireTemplateId,
      );

      setSendAutoCreateInvoice(
        preview.bookingPack
          .autoCreateInvoice,
      );
    }
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
        true,
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
              bookingPack: {
                contractTemplateId:
                  sendContractTemplateId,
                questionnaireTemplateId:
                  sendQuestionnaireTemplateId,
                autoCreateInvoice:
                  sendAutoCreateInvoice,
              },
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

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow={
          <Link
            to="/admin/crm/quotes"
            className="admin-inline-link inline-flex items-center gap-1"
          >
            <ArrowLeft size={13} />
            Quotes
          </Link>
        }
        title={quote.reference}
        description={`${quote.clientName} · ${quote.enquiryReference} · version ${version?.versionNumber || 1}`}
        actions={
          <div className="flex flex-wrap gap-2">
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

                <AdminButton
                  variant="secondary"
                  icon={Sparkles}
                  disabled={
                    saving
                    || !canManage
                    || !applyTemplateId
                  }
                  onClick={() =>
                    void applyTemplate()
                  }
                >
                  Apply Template
                </AdminButton>
              </div>
            ) : null}

            {editable ? (
              <AdminButton
                variant="primary"
                icon={Save}
                disabled={
                  saving
                  || !canManage
                }
                onClick={() =>
                  void save()
                }
              >
                Save draft
              </AdminButton>
            ) : (
              <AdminButton
                icon={CopyPlus}
                disabled={
                  saving
                  || !canManage
                  || quote.status
                    === "accepted"
                }
                onClick={() =>
                  void revise()
                }
              >
                Create revision
              </AdminButton>
            )}

            <AdminButton
              variant="primary"
              icon={Send}
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
            >
              {version?.sentAt
                ? "Resend link"
                : "Send quote"}
            </AdminButton>
          </div>
        }
        meta={
          <div className="flex flex-wrap gap-2">
            <AdminStatus
              tone={
                tone(
                  quote.status,
                ) as any
              }
            >
              {quote.status}
            </AdminStatus>

            <AdminStatus
              tone={
                quote.quoteType
                  === "fixed"
                  ? "neutral"
                  : "info"
              }
            >
              {quote.quoteType
                === "fixed"
                ? "Fixed"
                : "Pick & Choose"}
            </AdminStatus>

            <AdminStatus tone="neutral">
              v
              {version
                ?.versionNumber
                || 1}
            </AdminStatus>

            {version?.expiresAt ? (
              <AdminStatus tone="warning">
                expires{" "}
                {String(
                  version.expiresAt,
                ).slice(0, 10)}
              </AdminStatus>
            ) : null}
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

      <section className="crm-quote-client-strip">
        <div>
          <span>Client</span>
          <strong>
            {quote.clientName}
          </strong>
          <small>
            {quote.clientEmail}
          </small>
        </div>

        <div>
          <span>Wedding</span>
          <strong>
            {quote.eventDate
              || "Date TBC"}
          </strong>
          <small>
            {quote.venueText
              || "Venue TBC"}
          </small>
        </div>

        <div>
          <span>Packages</span>
          <strong>
            {draft.options.length}
          </strong>
          <small>
            {quote.quoteType
              === "fixed"
              ? "One fixed option"
              : "Client chooses one"}
          </small>
        </div>

        <div>
          <span>
            {quote.quoteType
              === "fixed"
              ? "Quoted total"
              : "Starting from"}
          </span>
          <strong>
            {money(
              representative.total,
              draft.currency,
            )}
          </strong>
          <small>
            {quote.quoteType
              === "fixed"
              ? "Exact quoted scope"
              : "Before optional extras"}
          </small>
        </div>
      </section>

      <div className="crm-quote-workspace">
        <main className="crm-quote-workspace__main">
          <AdminPanel
            title={
              quote.quoteType
                === "fixed"
                ? "Fixed package"
                : "Package choices"
            }
            description={
              quote.quoteType
                === "fixed"
                ? "Build one exact package. Add quote-specific line items inside the package when the scope needs itemised quantities or charges."
                : "Present the client with clear package choices. Detailed editing stays tucked away until you need it."
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
                      className={
                        option.recommended
                          ? "crm-quote-package-card crm-quote-package-card--recommended"
                          : "crm-quote-package-card"
                      }
                    >
                      <div
                        className={
                          option.imageUrl
                            ? "crm-quote-package-card__image"
                            : "crm-quote-package-card__image crm-quote-package-card__image--empty"
                        }
                      >
                        {option.imageUrl ? (
                          <img
                            src={option.imageUrl}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <PackageCheck />
                        )}
                      </div>

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

                        {option.recommended ? (
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
                                      <button
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
                                      </button>
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

                    const selected =
                      mandatory
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
                          <strong>
                            {addon.name}
                          </strong>

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
            description="Control expiry, discount and tax without mixing commercial terms into the package content."
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
            title="Client message"
            description="Keep the client-facing introduction separate from internal team notes."
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
          <AdminPanel
            title="Quote summary"
            icon={FileText}
            compact
          >
            <dl className="crm-quote-summary">
              <div>
                <dt>Packages</dt>
                <dd>
                  {draft.options.length}
                </dd>
              </div>

              <div>
                <dt>
                  Additional options
                </dt>
                <dd>
                  {
                    new Set([
                      ...draft
                        .globalAddonIds,
                      ...mandatoryAddonIds,
                    ]).size
                  }
                </dd>
              </div>

              <div>
                <dt>Starting price</dt>
                <dd>
                  {money(
                    representative
                      .subtotal,
                    draft.currency,
                  )}
                </dd>
              </div>

              {representative.discount ? (
                <div>
                  <dt>Discount</dt>
                  <dd>
                    -
                    {money(
                      representative
                        .discount,
                      draft.currency,
                    )}
                  </dd>
                </div>
              ) : null}

              {representative.tax ? (
                <div>
                  <dt>Tax</dt>
                  <dd>
                    {money(
                      representative
                        .tax,
                      draft.currency,
                    )}
                  </dd>
                </div>
              ) : null}

              <div className="crm-quote-summary__total">
                <dt>From</dt>
                <dd>
                  {money(
                    representative
                      .total,
                    draft.currency,
                  )}
                </dd>
              </div>
            </dl>

            <p className="crm-quote-summary__note">
              Optional additional options are chosen by the client after selecting a package and are not included in the starting price.
            </p>

            {version
              ?.providerMessageId ? (
              <div className="crm-quote-provider-id">
                Resend ID:{" "}
                {
                  version
                    .providerMessageId
                }
              </div>
            ) : null}
          </AdminPanel>

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

          <AdminPanel
            title="Version history"
            icon={CopyPlus}
            compact
          >
            <div className="crm-version-list">
              {quote.versions.map(
                (item) => (
                  <div
                    key={item.id}
                  >
                    <span>
                      v
                      {
                        item
                          .versionNumber
                      }
                    </span>

                    <AdminStatus
                      tone={
                        tone(
                          item.status,
                        ) as any
                      }
                    >
                      {item.status}
                    </AdminStatus>

                    <small>
                      {item.sentAt
                        ? `Sent ${String(item.sentAt).slice(0, 10)}`
                        : `Created ${String(item.createdAt).slice(0, 10)}`}
                    </small>
                  </div>
                ),
              )}
            </div>
          </AdminPanel>

          {quote.acceptedJobId ? (
            <AdminPanel
              title="Booked Job"
              icon={ExternalLink}
              compact
            >
              <Link
                className="admin-button admin-button--primary"
                to={`/admin/crm/jobs/${quote.acceptedJobId}`}
              >
                <ExternalLink className="admin-button__icon" />
                Open Job
              </Link>
            </AdminPanel>
          ) : null}
        </aside>
      </div>

      {sendOpen && sendPreview ? (
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

              <button
                type="button"
                aria-label="Close email preview"
                disabled={saving}
                onClick={() =>
                  setSendOpen(false)
                }
              >
                ×
              </button>
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
                        What happens after acceptance
                      </strong>
                      <p>
                        Choose the contract and questionnaire that will be created when the client accepts this quote.
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
                        Configurable
                      </AdminStatus>
                    )}
                  </header>

                  {sendPreview.bookingPack.legacyFallback ? (
                    <div className="crm-quote-send-booking-pack__notice">
                      This quote was sent before booking-pack snapshots were introduced. Its existing workspace booking settings remain authoritative.
                    </div>
                  ) : null}

                  <div className="crm-quote-send-booking-pack__grid">
                    <AdminField
                      label="Contract"
                      help="Created from this exact template after quote acceptance."
                    >
                      <select
                        className="admin-select"
                        value={
                          sendContractTemplateId
                        }
                        disabled={
                          saving
                          || sendPreviewLoading
                          || sendPreview.bookingPack.frozen
                          || sendPreview.bookingPack.legacyFallback
                        }
                        onChange={(event) =>
                          setSendContractTemplateId(
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          None
                        </option>

                        {sendPreview.bookingPack.contractTemplates.map(
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
                      help="Assigned to the booking after the quote is accepted."
                    >
                      <select
                        className="admin-select"
                        value={
                          sendQuestionnaireTemplateId
                        }
                        disabled={
                          saving
                          || sendPreviewLoading
                          || sendPreview.bookingPack.frozen
                          || sendPreview.bookingPack.legacyFallback
                        }
                        onChange={(event) =>
                          setSendQuestionnaireTemplateId(
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          None
                        </option>

                        {sendPreview.bookingPack.questionnaireTemplates.map(
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

                  <label className="crm-quote-send-booking-pack__invoice">
                    <input
                      type="checkbox"
                      checked={
                        sendAutoCreateInvoice
                      }
                      disabled={
                        saving
                        || sendPreviewLoading
                        || sendPreview.bookingPack.frozen
                        || sendPreview.bookingPack.legacyFallback
                      }
                      onChange={(event) =>
                        setSendAutoCreateInvoice(
                          event.target.checked,
                        )
                      }
                    />

                    <span>
                      <strong>
                        Create invoice when quote is accepted
                      </strong>
                      <small>
                        The invoice and payment schedule use the commercial settings shown below.
                      </small>
                    </span>
                  </label>

                  <div className="crm-quote-send-booking-pack__summary">
                    <div>
                      <span>Deposit</span>

                      <strong>
                        {!sendAutoCreateInvoice
                          ? "Not created"
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
                        {!sendAutoCreateInvoice
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
                        {!sendAutoCreateInvoice
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
                    These choices are frozen into this quote version only after the email is sent successfully. A failed send leaves the draft editable.
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
                  <Link
                    to="/admin/crm/email-settings"
                    className="admin-button admin-button--secondary admin-button--md"
                  >
                    <Mail className="admin-button__icon" />
                    Email settings
                  </Link>
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
      ) : null}

    </AdminPage>
  );
}
