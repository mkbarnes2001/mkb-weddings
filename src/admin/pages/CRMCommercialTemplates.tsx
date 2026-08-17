import {
  useEffect,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  FileText,
  Mail,
  PackageCheck,
  Plus,
  Save,
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
  CrmEmailTemplate,
  CrmEmailTemplateInput,
  CrmEmailTemplatePurpose,
  CrmPackage,
  CrmQuoteTemplate,
  CrmQuoteTemplateInput,
} from "../types/crm";

type View =
  | "quotes"
  | "emails";

function money(
  value: number,
  currency = "GBP",
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    },
  ).format(
    (value || 0) / 100,
  );
}

const emptyQuoteTemplate:
  CrmQuoteTemplateInput = {
    name: "",
    description: "",
    clientIntroduction: "",
    clientNotes: "",
    status: "draft",
    default: false,
    expiryDays: 14,
    discountType: "none",
    discountValue: 0,
    taxTreatment: "none",
    taxRateBasisPoints: 0,
    contractTemplateId: "",
    questionnaireTemplateId: "",
    paymentSchedule: {},
    autoCreateInvoice: true,
    packages: [],
    addons: [],
  };

const emptyEmailTemplate:
  CrmEmailTemplateInput = {
    name: "",
    description: "",
    purpose: "quote",
    subjectTemplate: "",
    bodyHtml: "",
    bodyText: "",
    attachments: [],
    appendSignature: true,
    status: "draft",
    default: false,
  };

function quoteTemplateInput(
  template: CrmQuoteTemplate,
): CrmQuoteTemplateInput {
  return {
    name: template.name,
    description:
      template.description,
    clientIntroduction:
      template.clientIntroduction,
    clientNotes:
      template.clientNotes,
    status:
      template.status,
    default:
      template.default,
    expiryDays:
      template.expiryDays,
    discountType:
      template.discountType,
    discountValue:
      template.discountValue,
    taxTreatment:
      template.taxTreatment,
    taxRateBasisPoints:
      template.taxRateBasisPoints,
    contractTemplateId:
      template.contractTemplateId,
    questionnaireTemplateId:
      template.questionnaireTemplateId,
    paymentSchedule:
      template.paymentSchedule,
    autoCreateInvoice:
      template.autoCreateInvoice,
    packages:
      template.packages.map(
        (item) => ({
          id: item.id,
          packageId:
            item.packageId,
          displayOrder:
            item.displayOrder,
          recommended:
            item.recommended,
          override:
            item.override,
        }),
      ),
    addons:
      template.addons.map(
        (item) => ({
          id: item.id,
          addonId:
            item.addonId,
          displayOrder:
            item.displayOrder,
          defaultSelected:
            item.defaultSelected,
          override:
            item.override,
        }),
      ),
  };
}

function emailTemplateInput(
  template: CrmEmailTemplate,
): CrmEmailTemplateInput {
  return {
    name: template.name,
    description:
      template.description,
    purpose:
      template.purpose,
    subjectTemplate:
      template.subjectTemplate,
    bodyHtml:
      template.bodyHtml,
    bodyText:
      template.bodyText,
    attachments:
      template.attachments,
    appendSignature:
      template.appendSignature,
    status:
      template.status,
    default:
      template.default,
  };
}

export function CRMCommercialTemplates() {

  const {
    id: quoteTemplateRouteId,
  } = useParams();

  const navigate =
    useNavigate();

  const { auth } =
    useProfessionalAuth();

  const canManage =
    auth.permissions.includes(
      "crm:manage",
    )
    && auth.accessMode !== "support";

  const [view, setView] =
    useState<View>("quotes");

  const [
    quoteTemplates,
    setQuoteTemplates,
  ] = useState<
    CrmQuoteTemplate[]
  >([]);

  const [
    emailTemplates,
    setEmailTemplates,
  ] = useState<
    CrmEmailTemplate[]
  >([]);

  const [
    packages,
    setPackages,
  ] = useState<CrmPackage[]>([]);

  const [
    addons,
    setAddons,
  ] = useState<CrmAddon[]>([]);

  const [
    quoteId,
    setQuoteId,
  ] = useState("");

  const [
    emailId,
    setEmailId,
  ] = useState("");

  const [
    quoteDraft,
    setQuoteDraft,
  ] = useState<
    CrmQuoteTemplateInput
  >({
    ...emptyQuoteTemplate,
  });

  const [
    emailDraft,
    setEmailDraft,
  ] = useState<
    CrmEmailTemplateInput
  >({
    ...emptyEmailTemplate,
  });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function load(
    preferredQuoteId = "",
    preferredEmailId = "",
  ) {
    setLoading(true);
    setError("");

    try {
      const [
        nextQuoteTemplates,
        nextEmailTemplates,
        catalogue,
      ] = await Promise.all([
        AdminApiService
          .getCrmQuoteTemplates(),
        AdminApiService
          .getCrmEmailTemplates(),
        AdminApiService
          .getCrmQuoteCatalogue(),
      ]);

      setQuoteTemplates(
        nextQuoteTemplates,
      );

      setEmailTemplates(
        nextEmailTemplates,
      );

      setPackages(
        catalogue.packages,
      );

      setAddons(
        catalogue.addons,
      );

      const routeQuoteId =
        quoteTemplateRouteId
        && quoteTemplateRouteId
          !== "new"
          ? quoteTemplateRouteId
          : "";

      const requestedQuoteId =
        preferredQuoteId
        || routeQuoteId
        || (
          quoteTemplateRouteId
            ? ""
            : quoteId
        );

      const resolvedQuote =
        nextQuoteTemplates.find(
          (item) =>
            item.id
            === requestedQuoteId,
        )
        || (
          quoteTemplateRouteId
            ? undefined
            : nextQuoteTemplates[0]
        );

      if (resolvedQuote) {
        setQuoteId(
          resolvedQuote.id,
        );

        setQuoteDraft(
          quoteTemplateInput(
            resolvedQuote,
          ),
        );
      } else {
        setQuoteId("");

        setQuoteDraft({
          ...emptyQuoteTemplate,
          packages: [],
          addons: [],
        });

        if (
          quoteTemplateRouteId
          && quoteTemplateRouteId
            !== "new"
        ) {
          setError(
            "Quote template not found.",
          );
        }
      }

      const resolvedEmail =
        nextEmailTemplates.find(
          (item) =>
            item.id
            === (
              preferredEmailId
              || emailId
            ),
        )
        || nextEmailTemplates[0];

      if (resolvedEmail) {
        setEmailId(
          resolvedEmail.id,
        );
        setEmailDraft(
          emailTemplateInput(
            resolvedEmail,
          ),
        );
      } else {
        setEmailId("");
        setEmailDraft({
          ...emptyEmailTemplate,
        });
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load commercial templates.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [
    auth.workspaceId,
    quoteTemplateRouteId,
  ]);

  function newEmailTemplate() {
    setEmailId("");
    setEmailDraft({
      ...emptyEmailTemplate,
    });
    setMessage("");
    setError("");
  }

  function selectEmailTemplate(
    template: CrmEmailTemplate,
  ) {
    setEmailId(template.id);
    setEmailDraft(
      emailTemplateInput(
        template,
      ),
    );
    setMessage("");
    setError("");
  }

  function togglePackage(
    packageId: string,
    checked: boolean,
  ) {
    setQuoteDraft(
      (current) => {
        const selected =
          current.packages
          || [];

        if (checked) {
          if (
            selected.some(
              (item) =>
                item.packageId
                === packageId,
            )
          ) {
            return current;
          }

          return {
            ...current,
            packages: [
              ...selected,
              {
                packageId,
                displayOrder:
                  (
                    selected.length
                    + 1
                  ) * 10,
                recommended:
                  false,
                override: {},
              },
            ],
          };
        }

        return {
          ...current,
          packages:
            selected
              .filter(
                (item) =>
                  item.packageId
                  !== packageId,
              )
              .map(
                (item, index) => ({
                  ...item,
                  displayOrder:
                    (
                      index
                      + 1
                    ) * 10,
                }),
              ),
        };
      },
    );
  }

  function recommendPackage(
    packageId: string,
  ) {
    setQuoteDraft(
      (current) => ({
        ...current,
        packages:
          (
            current.packages
            || []
          ).map(
            (item) => ({
              ...item,
              recommended:
                item.packageId
                === packageId,
            }),
          ),
      }),
    );
  }

  function toggleAddon(
    addonId: string,
    checked: boolean,
  ) {
    setQuoteDraft(
      (current) => {
        const selected =
          current.addons
          || [];

        if (checked) {
          if (
            selected.some(
              (item) =>
                item.addonId
                === addonId,
            )
          ) {
            return current;
          }

          return {
            ...current,
            addons: [
              ...selected,
              {
                addonId,
                displayOrder:
                  (
                    selected.length
                    + 1
                  ) * 10,
                defaultSelected:
                  false,
                override: {},
              },
            ],
          };
        }

        return {
          ...current,
          addons:
            selected
              .filter(
                (item) =>
                  item.addonId
                  !== addonId,
              )
              .map(
                (item, index) => ({
                  ...item,
                  displayOrder:
                    (
                      index
                      + 1
                    ) * 10,
                }),
              ),
        };
      },
    );
  }

  async function saveQuoteTemplate() {
    if (
      !String(
        quoteDraft.name
        || "",
      ).trim()
    ) {
      setError(
        "Enter a quote template name.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const creating =
        !quoteId;

      const saved =
        quoteId
          ? await AdminApiService
              .saveCrmQuoteTemplate(
                quoteId,
                quoteDraft,
              )
          : await AdminApiService
              .createCrmQuoteTemplate(
                quoteDraft,
              );

      await load(
        saved.id,
        emailId,
      );

      setMessage(
        quoteId
          ? "Quote template saved."
          : "Quote template created.",
      );
      if (
        creating
        && quoteTemplateRouteId
          === "new"
      ) {
        navigate(
          `/admin/crm/templates/quotes/${saved.id}`,
          {
            replace: true,
          },
        );
      }

    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save quote template.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function archiveQuoteTemplate() {
    if (
      !quoteId
      || !window.confirm(
        "Archive this quote template? Existing quotes created from it remain unchanged.",
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await AdminApiService
        .archiveCrmQuoteTemplate(
          quoteId,
        );

      setMessage(
        "Quote template archived.",
      );

      navigate(
        "/admin/crm/templates",
        {
          replace: true,
        },
      );
    } catch (archiveError) {
      setError(
        archiveError
          instanceof Error
          ? archiveError.message
          : "Unable to archive quote template.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveEmailTemplate() {
    if (
      !String(
        emailDraft.name
        || "",
      ).trim()
    ) {
      setError(
        "Enter an email template name.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved =
        emailId
          ? await AdminApiService
              .saveCrmEmailTemplate(
                emailId,
                emailDraft,
              )
          : await AdminApiService
              .createCrmEmailTemplate(
                emailDraft,
              );

      await load(
        quoteId,
        saved.id,
      );

      setMessage(
        emailId
          ? "Email template saved."
          : "Email template created.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save email template.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function archiveEmailTemplate() {
    if (
      !emailId
      || !window.confirm(
        "Archive this email template?",
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await AdminApiService
        .archiveCrmEmailTemplate(
          emailId,
        );

      await load(
        quoteId,
        "",
      );

      setMessage(
        "Email template archived.",
      );
    } catch (archiveError) {
      setError(
        archiveError
          instanceof Error
          ? archiveError.message
          : "Unable to archive email template.",
      );
    } finally {
      setSaving(false);
    }
  }

  const activePackages =
    packages.filter(
      (item) =>
        item.status
        !== "archived",
    );

  const activeAddons =
    addons.filter(
      (item) =>
        item.status
        !== "archived",
    );

  if (
    loading
    && !quoteTemplates.length
    && !emailTemplates.length
  ) {
    return (
      <AdminPage>
        <p className="text-sm text-neutral-500">
          Loading commercial templates…
        </p>
      </AdminPage>
    );
  }

  if (quoteTemplateRouteId) {
    if (
      loading
      && !quoteTemplates.length
    ) {
      return (
        <AdminPage className="crm-quote-template-page">
          <p className="text-sm text-neutral-500">
            Loading quote template…
          </p>
        </AdminPage>
      );
    }

    const missingTemplate =
      quoteTemplateRouteId
      !== "new"
      && !quoteId;

    return (
      <AdminPage className="crm-quote-template-page">
        <AdminPageHeader
          eyebrow={
            <Link
              to="/admin/crm/templates"
              className="admin-inline-link inline-flex items-center gap-1"
            >
              <ArrowLeft size={13} />
              Quote templates
            </Link>
          }
          title={
            quoteTemplateRouteId
            === "new"
              ? "New quote template"
              : (
                  quoteDraft.name
                  || "Quote template"
                )
          }
          description="Configure reusable quote defaults, package choices and additional options. Quotes created from this template keep independent immutable snapshots."
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

        {missingTemplate ? (
          <AdminPanel>
            <AdminEmptyState
              icon={Sparkles}
              title="Quote template unavailable"
              description="This template could not be found in the current workspace."
              action={
                <Link
                  to="/admin/crm/templates"
                  className="admin-button admin-button--primary admin-button--sm"
                >
                  Back to quote templates
                </Link>
              }
            />
          </AdminPanel>
        ) : (
<div className="space-y-4">
            <AdminPanel
              title={
                quoteId
                  ? "Edit quote template"
                  : "New quote template"
              }
              description="The package catalogue remains the source. This template controls which choices appear together on a new quote."
              icon={FileText}
              actions={
                canManage ? (
                  <div className="flex flex-wrap gap-2">
                    {quoteId ? (
                      <AdminButton
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        disabled={saving}
                        onClick={() =>
                          void archiveQuoteTemplate()
                        }
                      >
                        Archive
                      </AdminButton>
                    ) : null}

                    <AdminButton
                      variant="primary"
                      icon={Save}
                      disabled={
                        saving
                        || !String(
                          quoteDraft.name
                          || "",
                        ).trim()
                      }
                      onClick={() =>
                        void saveQuoteTemplate()
                      }
                    >
                      {saving
                        ? "Saving…"
                        : "Save template"}
                    </AdminButton>
                  </div>
                ) : undefined
              }
            >
              <div className="crm-template-editor-grid">
                <AdminField label="Template name">
                  <input
                    className="admin-input"
                    disabled={!canManage}
                    value={
                      quoteDraft.name
                      || ""
                    }
                    onChange={(event) =>
                      setQuoteDraft(
                        (current) => ({
                          ...current,
                          name:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="2025 Packages"
                  />
                </AdminField>

                <AdminField label="Status">
                  <select
                    className="admin-select"
                    disabled={!canManage}
                    value={
                      quoteDraft.status
                      || "draft"
                    }
                    onChange={(event) => {
                      const status =
                        event.target.value as CrmQuoteTemplateInput["status"];

                      setQuoteDraft(
                        (current) => ({
                          ...current,
                          status,
                          default:
                            status === "active"
                              ? current.default
                              : false,
                        }),
                      );
                    }}
                  >
                    <option value="draft">
                      Draft
                    </option>
                    <option value="active">
                      Active
                    </option>
                    <option value="archived">
                      Archived
                    </option>
                  </select>
                </AdminField>

                <AdminField label="Quote expiry">
                  <div className="crm-template-number-control">
                    <input
                      className="admin-input"
                      type="number"
                      min="0"
                      max="3650"
                      disabled={!canManage}
                      value={
                        quoteDraft
                          .expiryDays
                        ?? 14
                      }
                      onChange={(event) =>
                        setQuoteDraft(
                          (current) => ({
                            ...current,
                            expiryDays:
                              Math.max(
                                0,
                                Number(
                                  event
                                    .target
                                    .value
                                  || 0,
                                ),
                              ),
                          }),
                        )
                      }
                    />
                    <span>
                      days
                    </span>
                  </div>
                </AdminField>
              </div>

              <AdminField
                label="Description"
                help="Internal description to help your team choose the correct template."
              >
                <textarea
                  className="admin-textarea min-h-20"
                  disabled={!canManage}
                  value={
                    quoteDraft
                      .description
                    || ""
                  }
                  onChange={(event) =>
                    setQuoteDraft(
                      (current) => ({
                        ...current,
                        description:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                />
              </AdminField>

              <AdminField
                label="Client introduction"
                help="Shown at the start of quotes created from this template."
              >
                <textarea
                  className="admin-textarea min-h-28"
                  disabled={!canManage}
                  value={
                    quoteDraft
                      .clientIntroduction
                    || ""
                  }
                  onChange={(event) =>
                    setQuoteDraft(
                      (current) => ({
                        ...current,
                        clientIntroduction:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="Thanks for getting in touch. Choose the package that best fits your wedding day."
                />
              </AdminField>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="admin-choice-row">
                  <div>
                    <strong>
                      Default quote template
                    </strong>
                    <p>
                      Preselect this template when creating a new quote.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    disabled={
                      !canManage
                      || quoteDraft.status
                      !== "active"
                    }
                    checked={
                      Boolean(
                        quoteDraft.default,
                      )
                    }
                    onChange={(event) =>
                      setQuoteDraft(
                        (current) => ({
                          ...current,
                          default:
                            event
                              .target
                              .checked,
                        }),
                      )
                    }
                  />
                </label>

                <label className="admin-choice-row">
                  <div>
                    <strong>
                      Create invoice after acceptance
                    </strong>
                    <p>
                      Keep automatic invoice creation enabled for bookings made from this template.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    disabled={!canManage}
                    checked={
                      quoteDraft
                        .autoCreateInvoice
                      !== false
                    }
                    onChange={(event) =>
                      setQuoteDraft(
                        (current) => ({
                          ...current,
                          autoCreateInvoice:
                            event
                              .target
                              .checked,
                        }),
                      )
                    }
                  />
                </label>
              </div>
            </AdminPanel>

            <AdminPanel
              title="Package choices"
              description="Choose every package the client should be able to compare. One package may be highlighted as recommended."
              icon={PackageCheck}
            >
              {!activePackages.length ? (
                <AdminEmptyState
                  icon={PackageCheck}
                  title="No catalogue packages"
                  description="Create packages in the catalogue before building a quote template."
                  action={
                    <Link
                      to="/admin/crm/catalogue"
                      className="admin-button admin-button--primary admin-button--sm"
                    >
                      Open catalogue
                    </Link>
                  }
                />
              ) : (
                <div className="crm-template-package-grid">
                  {activePackages.map(
                    (item) => {
                      const selected =
                        (
                          quoteDraft
                            .packages
                          || []
                        ).some(
                          (link) =>
                            link
                              .packageId
                            === item.id,
                        );

                      const recommended =
                        (
                          quoteDraft
                            .packages
                          || []
                        ).some(
                          (link) =>
                            link
                              .packageId
                            === item.id
                            && Boolean(
                              link
                                .recommended,
                            ),
                        );

                      return (
                        <article
                          key={item.id}
                          className={
                            selected
                              ? "selected"
                              : ""
                          }
                        >
                          <header>
                            <label>
                              <input
                                type="checkbox"
                                disabled={!canManage}
                                checked={
                                  selected
                                }
                                onChange={
                                  (
                                    event,
                                  ) =>
                                    togglePackage(
                                      item.id,
                                      event
                                        .target
                                        .checked,
                                    )
                                }
                              />

                              <span>
                                Include
                              </span>
                            </label>

                            {recommended ? (
                              <AdminStatus tone="info">
                                Recommended
                              </AdminStatus>
                            ) : null}
                          </header>

                          <div>
                            <strong>
                              {item.name}
                            </strong>

                            <span className="crm-template-package-price">
                              {money(
                                item.priceAmount,
                                item.currency,
                              )}
                            </span>

                            <p>
                              {
                                item.description
                                || item
                                  .serviceType
                              }
                            </p>
                          </div>

                          {selected ? (
                            <button
                              type="button"
                              className={
                                recommended
                                  ? "crm-template-recommend active"
                                  : "crm-template-recommend"
                              }
                              disabled={!canManage}
                              onClick={() =>
                                recommendPackage(
                                  item.id,
                                )
                              }
                            >
                              <Check />
                              {recommended
                                ? "Recommended package"
                                : "Mark as recommended"}
                            </button>
                          ) : null}
                        </article>
                      );
                    },
                  )}
                </div>
              )}
            </AdminPanel>

            <AdminPanel
              title="Additional options"
              description="Extras are configured once for the quote template. They are not repeated beneath every package in this editor."
              icon={Plus}
            >
              {!activeAddons.length ? (
                <AdminEmptyState
                  icon={Plus}
                  title="No additional options"
                  description="Create add-ons in the package catalogue before adding them to a template."
                />
              ) : (
                <div className="crm-template-addon-grid">
                  {activeAddons.map(
                    (item) => {
                      const selected =
                        (
                          quoteDraft
                            .addons
                          || []
                        ).some(
                          (link) =>
                            link
                              .addonId
                            === item.id,
                        );

                      return (
                        <label
                          key={item.id}
                          className={
                            selected
                              ? "selected"
                              : ""
                          }
                        >
                          <input
                            type="checkbox"
                            disabled={!canManage}
                            checked={
                              selected
                            }
                            onChange={
                              (
                                event,
                              ) =>
                                toggleAddon(
                                  item.id,
                                  event
                                    .target
                                    .checked,
                                )
                            }
                          />

                          <span>
                            <strong>
                              {item.name}
                            </strong>

                            <small>
                              {money(
                                item.priceAmount,
                                item.currency,
                              )}
                              {" · "}
                              {item.requirement}
                            </small>
                          </span>
                        </label>
                      );
                    },
                  )}
                </div>
              )}
            </AdminPanel>
          </div>
        )}
      </AdminPage>
    );
  }


  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow={
          <Link
            to="/admin/crm"
            className="admin-inline-link inline-flex items-center gap-1"
          >
            <ArrowLeft size={13} />
            WedCRM
          </Link>
        }
        title="Commercial templates"
        description="Build reusable quote and email templates for this business. Templates remain editable while quotes created from them keep immutable snapshots."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/crm/catalogue"
              className="admin-button admin-button--secondary"
            >
              <PackageCheck className="admin-button__icon" />
              Package catalogue
            </Link>

            <Link
              to="/admin/crm/quotes"
              className="admin-button admin-button--primary"
            >
              <FileText className="admin-button__icon" />
              Open quotes
            </Link>
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

      <div
        className="crm-template-type-switcher"
        aria-label="Commercial template type"
      >
        <button
          type="button"
          className={
            view === "quotes"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("quotes")
          }
        >
          <Sparkles />
          <span>
            <strong>
              Quote templates
            </strong>
            <small>
              Packages, extras and quote defaults
            </small>
          </span>
        </button>

        <button
          type="button"
          className={
            view === "emails"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("emails")
          }
        >
          <Mail />
          <span>
            <strong>
              Email templates
            </strong>
            <small>
              Reusable client messages
            </small>
          </span>
        </button>
      </div>

      {view === "quotes" ? (
        <AdminPanel
          title="Quote templates"
          description={`${quoteTemplates.length} reusable template${quoteTemplates.length === 1 ? "" : "s"}`}
          icon={Sparkles}
          className="crm-template-list-page"
          actions={
            canManage ? (
              <Link
                to="/admin/crm/templates/quotes/new"
                className="admin-button admin-button--primary admin-button--sm"
              >
                <Plus className="admin-button__icon" />
                New template
              </Link>
            ) : undefined
          }
        >
          {!quoteTemplates.length ? (
            <AdminEmptyState
              icon={Sparkles}
              title="No quote templates"
              description="Create a reusable quote template, then configure its packages and additional options on the template editor."
              action={
                canManage ? (
                  <Link
                    to="/admin/crm/templates/quotes/new"
                    className="admin-button admin-button--primary admin-button--sm"
                  >
                    Create quote template
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="crm-template-list crm-template-list--links">
              {quoteTemplates.map(
                (template) => (
                  <Link
                    key={template.id}
                    to={`/admin/crm/templates/quotes/${template.id}`}
                    aria-label={`Edit quote template ${template.name}`}
                  >
                    <span>
                      <strong>
                        {template.name}
                      </strong>

                      <small>
                        {template.packages.length}
                        {" "}
                        package
                        {template.packages.length === 1
                          ? ""
                          : "s"}
                        {" · "}
                        {template.addons.length}
                        {" "}
                        additional option
                        {template.addons.length === 1
                          ? ""
                          : "s"}
                      </small>
                    </span>

                    <span className="crm-template-list__status">
                      {template.default ? (
                        <AdminStatus tone="success">
                          default
                        </AdminStatus>
                      ) : null}

                      <AdminStatus
                        tone={
                          template.status === "active"
                            ? "success"
                            : template.status === "draft"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {template.status}
                      </AdminStatus>
                    </span>
                  </Link>
                ),
              )}
            </div>
          )}
        </AdminPanel>
      ) : (
        <div className="crm-template-layout">
          <AdminPanel
            title="Email templates"
            description={`${emailTemplates.length} reusable template${emailTemplates.length === 1 ? "" : "s"}`}
            icon={Mail}
            actions={
              canManage ? (
                <AdminButton
                  size="sm"
                  icon={Plus}
                  onClick={
                    newEmailTemplate
                  }
                >
                  New template
                </AdminButton>
              ) : undefined
            }
          >
            {!emailTemplates.length ? (
              <AdminEmptyState
                icon={Mail}
                title="No email templates"
                description="Create reusable client messages for quotes, bookings, questionnaires and other CRM communication."
              />
            ) : (
              <div className="crm-template-list">
                {emailTemplates.map(
                  (template) => (
                    <button
                      key={template.id}
                      type="button"
                      className={
                        emailId
                        === template.id
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        selectEmailTemplate(
                          template,
                        )
                      }
                    >
                      <span>
                        <strong>
                          {template.name}
                        </strong>
                        <small>
                          {template.purpose}
                          {" · "}
                          version{" "}
                          {template.version}
                        </small>
                      </span>

                      <span className="crm-template-list__status">
                        {template.default ? (
                          <AdminStatus tone="success">
                            default
                          </AdminStatus>
                        ) : null}

                        <AdminStatus
                          tone={
                            template.status
                            === "active"
                              ? "success"
                              : template.status
                                === "draft"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {template.status}
                        </AdminStatus>
                      </span>
                    </button>
                  ),
                )}
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title={
              emailId
                ? "Edit email template"
                : "New email template"
            }
            description="Reusable content is independent from the mail provider. Delivery settings will decide whether the message uses WedPlanned, Google or SMTP."
            icon={Mail}
            actions={
              canManage ? (
                <div className="flex flex-wrap gap-2">
                  {emailId ? (
                    <AdminButton
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      disabled={saving}
                      onClick={() =>
                        void archiveEmailTemplate()
                      }
                    >
                      Archive
                    </AdminButton>
                  ) : null}

                  <AdminButton
                    variant="primary"
                    icon={Save}
                    disabled={
                      saving
                      || !String(
                        emailDraft.name
                        || "",
                      ).trim()
                    }
                    onClick={() =>
                      void saveEmailTemplate()
                    }
                  >
                    {saving
                      ? "Saving…"
                      : "Save template"}
                  </AdminButton>
                </div>
              ) : undefined
            }
          >
            <div className="crm-template-editor-grid">
              <AdminField label="Template name">
                <input
                  className="admin-input"
                  disabled={!canManage}
                  value={
                    emailDraft.name
                    || ""
                  }
                  onChange={(event) =>
                    setEmailDraft(
                      (current) => ({
                        ...current,
                        name:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="Wedding Quotes"
                />
              </AdminField>

              <AdminField label="Purpose">
                <select
                  className="admin-select"
                  disabled={!canManage}
                  value={
                    emailDraft.purpose
                    || "quote"
                  }
                  onChange={(event) => {
                    const purpose =
                      event.target.value as CrmEmailTemplatePurpose;

                    setEmailDraft(
                      (current) => ({
                        ...current,
                        purpose,
                      }),
                    );
                  }}
                >
                  <option value="quote">
                    Quote
                  </option>
                  <option value="general">
                    General
                  </option>
                  <option value="booking">
                    Booking
                  </option>
                  <option value="questionnaire">
                    Questionnaire
                  </option>
                  <option value="invoice">
                    Invoice
                  </option>
                  <option value="autoresponder">
                    Autoresponder
                  </option>
                </select>
              </AdminField>

              <AdminField label="Status">
                <select
                  className="admin-select"
                  disabled={!canManage}
                  value={
                    emailDraft.status
                    || "draft"
                  }
                  onChange={(event) => {
                    const status =
                      event.target.value as CrmEmailTemplateInput["status"];

                    setEmailDraft(
                      (current) => ({
                        ...current,
                        status,
                        default:
                          status === "active"
                            ? current.default
                            : false,
                      }),
                    );
                  }}
                >
                  <option value="draft">
                    Draft
                  </option>
                  <option value="active">
                    Active
                  </option>
                  <option value="archived">
                    Archived
                  </option>
                </select>
              </AdminField>
            </div>

            <AdminField label="Subject">
              <input
                className="admin-input"
                disabled={!canManage}
                value={
                  emailDraft
                    .subjectTemplate
                  || ""
                }
                onChange={(event) =>
                  setEmailDraft(
                    (current) => ({
                      ...current,
                      subjectTemplate:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                placeholder="Your wedding quote is ready"
              />
            </AdminField>

            <AdminField
              label="Message"
              help="Merge-field controls and rich formatting will be added to the sending workflow. Plain text remains the safe fallback."
            >
              <textarea
                className="admin-textarea crm-template-email-body"
                disabled={!canManage}
                value={
                  emailDraft.bodyText
                  || ""
                }
                onChange={(event) =>
                  setEmailDraft(
                    (current) => ({
                      ...current,
                      bodyText:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                placeholder="Hi {{first_name}},&#10;&#10;Thanks for getting in touch..."
              />
            </AdminField>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="admin-choice-row">
                <div>
                  <strong>
                    Default for this purpose
                  </strong>
                  <p>
                    Use this template automatically when preparing this type of email.
                  </p>
                </div>

                <input
                  type="checkbox"
                  disabled={
                    !canManage
                    || emailDraft.status
                    !== "active"
                  }
                  checked={
                    Boolean(
                      emailDraft.default,
                    )
                  }
                  onChange={(event) =>
                    setEmailDraft(
                      (current) => ({
                        ...current,
                        default:
                          event
                            .target
                            .checked,
                      }),
                    )
                  }
                />
              </label>

              <label className="admin-choice-row">
                <div>
                  <strong>
                    Append email signature
                  </strong>
                  <p>
                    Add the business signature configured in Email Settings.
                  </p>
                </div>

                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={
                    emailDraft
                      .appendSignature
                    !== false
                  }
                  onChange={(event) =>
                    setEmailDraft(
                      (current) => ({
                        ...current,
                        appendSignature:
                          event
                            .target
                            .checked,
                      }),
                    )
                  }
                />
              </label>
            </div>
          </AdminPanel>
        </div>
      )}
    </AdminPage>
  );
}
