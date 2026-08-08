import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Monitor,
  RotateCcw,
  Save,
  Smartphone,
  Undo2,
  UploadCloud,
} from "lucide-react";

import {
  AdminButton,
  AdminPanel,
  AdminStatus,
} from "./ui/AdminUI";

import { AdminApiService } from "../services/AdminApiService";

import type {
  PlatformBrandAsset,
} from "../types/platform";

import type {
  WedPlannedPublicAppearanceAdministration,
  WedPlannedPublicTheme,
} from "../types/publicAppearance";

import {
  cloneDefaultWedPlannedPublicTheme,
  WEDPLANNED_PUBLIC_FONT_OPTIONS,
  wedPlannedFontOption,
} from "../../shared/wedplannedPublicAppearance";

type PreviewMode = "desktop" | "mobile";

type NumericField = {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
};

type ColourField = {
  key: string;
  label: string;
};

const TYPOGRAPHY_SIZE_FIELDS: NumericField[] = [
  { key: "bodyDesktopPx", label: "Body · desktop", min: 10, max: 24 },
  { key: "bodyMobilePx", label: "Body · mobile", min: 10, max: 24 },
  { key: "navigationDesktopPx", label: "Navigation · desktop", min: 9, max: 22 },
  { key: "navigationMobilePx", label: "Navigation · mobile", min: 9, max: 22 },
  { key: "buttonPx", label: "Buttons", min: 9, max: 22 },
  { key: "metaPx", label: "Eyebrows / helper text", min: 8, max: 18 },
  { key: "h1DesktopPx", label: "H1 · desktop", min: 32, max: 110 },
  { key: "h1MobilePx", label: "H1 · mobile", min: 28, max: 80 },
  { key: "h2DesktopPx", label: "H2 · desktop", min: 24, max: 80 },
  { key: "h2MobilePx", label: "H2 · mobile", min: 22, max: 64 },
  { key: "h3DesktopPx", label: "H3 · desktop", min: 16, max: 48 },
  { key: "h3MobilePx", label: "H3 · mobile", min: 16, max: 42 },
];

const TYPOGRAPHY_WEIGHT_FIELDS: NumericField[] = [
  { key: "bodyWeight", label: "Body weight", min: 300, max: 800, step: 50 },
  { key: "navigationWeight", label: "Navigation weight", min: 300, max: 800, step: 50 },
  { key: "buttonWeight", label: "Button weight", min: 300, max: 800, step: 50 },
  { key: "headingWeight", label: "Heading weight", min: 300, max: 800, step: 50 },
];

const TYPOGRAPHY_DETAIL_FIELDS: NumericField[] = [
  { key: "bodyLineHeight", label: "Body line height", min: 1, max: 2.2, step: 0.05, suffix: "" },
  { key: "headingLineHeight", label: "Heading line height", min: 0.85, max: 1.6, step: 0.05, suffix: "" },
  { key: "headingLetterSpacingEm", label: "Heading letter spacing", min: -0.12, max: 0.12, step: 0.005, suffix: "em" },
  { key: "navigationLetterSpacingEm", label: "Navigation letter spacing", min: -0.08, max: 0.2, step: 0.005, suffix: "em" },
];

const SURFACE_COLOURS: ColourField[] = [
  { key: "pageBackground", label: "Page background" },
  { key: "sectionBackground", label: "Section background" },
  { key: "alternateSectionBackground", label: "Alternate section" },
  { key: "darkSectionBackground", label: "Dark section" },
  { key: "text", label: "Main text" },
  { key: "mutedText", label: "Secondary text" },
  { key: "border", label: "Borders" },
];

const NAVIGATION_COLOURS: ColourField[] = [
  { key: "headerBackground", label: "Desktop header background" },
  { key: "headerText", label: "Desktop menu text" },
  { key: "headerActiveText", label: "Desktop active / hover" },
  { key: "mobileMenuBackground", label: "Mobile menu background" },
  { key: "mobileMenuText", label: "Mobile menu text" },
  { key: "mobileMenuActiveText", label: "Mobile active / hover" },
];

const BUTTON_COLOURS: ColourField[] = [
  { key: "primaryButtonBackground", label: "Primary background" },
  { key: "primaryButtonText", label: "Primary text" },
  { key: "primaryButtonBorder", label: "Primary border" },
  { key: "secondaryButtonBackground", label: "Secondary background" },
  { key: "secondaryButtonText", label: "Secondary text" },
  { key: "secondaryButtonBorder", label: "Secondary border" },
];

const CARD_COLOURS: ColourField[] = [
  { key: "cardBackground", label: "Card background" },
  { key: "cardText", label: "Card text" },
  { key: "cardMutedText", label: "Card secondary text" },
  { key: "cardBorder", label: "Card border" },
];

const HERO_COLOURS: ColourField[] = [
  { key: "heroBackground", label: "Hero background" },
  { key: "heroText", label: "Hero heading" },
  { key: "heroMutedText", label: "Hero supporting text" },
];

const FOOTER_COLOURS: ColourField[] = [
  { key: "footerBackground", label: "Footer background" },
  { key: "footerText", label: "Footer primary text" },
  { key: "footerMutedText", label: "Footer secondary text" },
];

const LAYOUT_FIELDS: NumericField[] = [
  { key: "contentWidthPx", label: "Maximum content width", min: 760, max: 1600 },
  { key: "desktopSectionSpacingPx", label: "Section spacing · desktop", min: 32, max: 180 },
  { key: "mobileSectionSpacingPx", label: "Section spacing · mobile", min: 24, max: 120 },
  { key: "desktopHorizontalPaddingPx", label: "Side padding · desktop", min: 12, max: 80 },
  { key: "mobileHorizontalPaddingPx", label: "Side padding · mobile", min: 10, max: 40 },
  { key: "cardGapPx", label: "Card gap", min: 4, max: 60 },
  { key: "cardRadiusPx", label: "Card corner radius", min: 0, max: 40 },
  { key: "buttonRadiusPx", label: "Button corner radius", min: 0, max: 40 },
  { key: "heroRadiusPx", label: "Hero corner radius", min: 0, max: 60 },
  { key: "headerHeightPx", label: "Header height", min: 52, max: 110 },
];

const PRODUCT_META = [
  { key: "wednav", label: "WedNav" },
  { key: "wedcrm", label: "WedCRM" },
  { key: "wedstudio", label: "WedStudio" },
  { key: "wedstore", label: "WedStore" },
] as const;

function cloneTheme(
  theme: WedPlannedPublicTheme,
): WedPlannedPublicTheme {
  return JSON.parse(JSON.stringify(theme));
}

function NumberControl({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = "px",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="public-appearance-number-control">
      <span>{label}</span>

      <div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) =>
            onChange(Number(event.target.value))
          }
        />

        <label>
          <input
            className="admin-input"
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) =>
              onChange(Number(event.target.value))
            }
          />
          {suffix ? <span>{suffix}</span> : null}
        </label>
      </div>
    </label>
  );
}

function ColourControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="public-appearance-colour-control">
      <span>{label}</span>

      <div>
        <input
          type="color"
          value={value}
          onChange={(event) =>
            onChange(event.target.value.toUpperCase())
          }
        />

        <input
          className="admin-input"
          value={value}
          maxLength={7}
          onChange={(event) =>
            onChange(event.target.value.toUpperCase())
          }
        />
      </div>
    </label>
  );
}

function AssetSelect({
  label,
  value,
  assets,
  emptyLabel,
  onChange,
}: {
  label: string;
  value: string;
  assets: PlatformBrandAsset[];
  emptyLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="public-appearance-field">
      <span>{label}</span>

      <select
        className="admin-select"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        <option value="">{emptyLabel}</option>

        {value && !assets.some(
          (asset) => asset.url === value,
        ) ? (
          <option value={value}>
            Current assigned asset
          </option>
        ) : null}

        {assets.map((asset) => (
          <option
            key={asset.id}
            value={asset.url}
          >
            {asset.name} · {asset.assetType}
          </option>
        ))}
      </select>
    </label>
  );
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="public-appearance-field">
      <span>{label}</span>

      <select
        className="admin-select"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {WEDPLANNED_PUBLIC_FONT_OPTIONS.map(
          (option) => (
            <option
              key={option.key}
              value={option.key}
            >
              {option.label}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

function ControlGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="public-appearance-control-group">
      <header>
        <div>
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
      </header>

      {children}
    </section>
  );
}

function luminance(hex: string) {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)
    ?.map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.03928
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });

  if (!channels || channels.length !== 3) {
    return 0;
  }

  return (
    channels[0] * 0.2126
    + channels[1] * 0.7152
    + channels[2] * 0.0722
  );
}

function contrastRatio(
  foreground: string,
  background: string,
) {
  const first = luminance(foreground);
  const second = luminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

function PublicAppearancePreview({
  theme,
  mode,
}: {
  theme: WedPlannedPublicTheme;
  mode: PreviewMode;
}) {
  const bodyFont = wedPlannedFontOption(
    theme.typography.bodyFont,
  ).stack;

  const headingFont = wedPlannedFontOption(
    theme.typography.headingFont,
  ).stack;

  const displayFont = wedPlannedFontOption(
    theme.typography.displayFont,
  ).stack;

  const logoWidth = mode === "mobile"
    ? theme.branding.mobileLogoWidthPx
    : theme.branding.desktopLogoWidthPx;

  const lightLogo =
    mode === "mobile"
      ? theme.branding.mobileWordmarkUrl
        || theme.branding.lightWordmarkUrl
      : theme.branding.lightWordmarkUrl;

  const style = {
    "--preview-body-font": bodyFont,
    "--preview-heading-font": headingFont,
    "--preview-display-font": displayFont,
    "--preview-page": theme.colours.pageBackground,
    "--preview-section": theme.colours.sectionBackground,
    "--preview-alt": theme.colours.alternateSectionBackground,
    "--preview-text": theme.colours.text,
    "--preview-muted": theme.colours.mutedText,
    "--preview-border": theme.colours.border,
    "--preview-header": theme.colours.headerBackground,
    "--preview-header-text": theme.colours.headerText,
    "--preview-primary": theme.colours.primaryButtonBackground,
    "--preview-primary-text": theme.colours.primaryButtonText,
    "--preview-primary-border": theme.colours.primaryButtonBorder,
    "--preview-secondary": theme.colours.secondaryButtonBackground,
    "--preview-secondary-text": theme.colours.secondaryButtonText,
    "--preview-secondary-border": theme.colours.secondaryButtonBorder,
    "--preview-card": theme.colours.cardBackground,
    "--preview-card-text": theme.colours.cardText,
    "--preview-card-muted": theme.colours.cardMutedText,
    "--preview-card-border": theme.colours.cardBorder,
    "--preview-hero": theme.colours.heroBackground,
    "--preview-hero-text": theme.colours.heroText,
    "--preview-hero-muted": theme.colours.heroMutedText,
    "--preview-footer": theme.colours.footerBackground,
    "--preview-footer-text": theme.colours.footerText,
    "--preview-footer-muted": theme.colours.footerMutedText,
    "--preview-card-radius": `${theme.layout.cardRadiusPx}px`,
    "--preview-button-radius": `${theme.layout.buttonRadiusPx}px`,
    "--preview-hero-radius": `${theme.layout.heroRadiusPx}px`,
    "--preview-card-gap": `${theme.layout.cardGapPx}px`,
    "--preview-body-size": `${
      mode === "mobile"
        ? theme.typography.bodyMobilePx
        : theme.typography.bodyDesktopPx
    }px`,
    "--preview-nav-size": `${
      mode === "mobile"
        ? theme.typography.navigationMobilePx
        : theme.typography.navigationDesktopPx
    }px`,
    "--preview-h1-size": `${
      mode === "mobile"
        ? theme.typography.h1MobilePx
        : theme.typography.h1DesktopPx
    }px`,
    "--preview-h2-size": `${
      mode === "mobile"
        ? theme.typography.h2MobilePx
        : theme.typography.h2DesktopPx
    }px`,
    "--preview-heading-weight":
      theme.typography.headingWeight,
    "--preview-body-weight":
      theme.typography.bodyWeight,
    "--preview-nav-weight":
      theme.typography.navigationWeight,
    "--preview-button-weight":
      theme.typography.buttonWeight,
    "--preview-body-line":
      theme.typography.bodyLineHeight,
    "--preview-heading-line":
      theme.typography.headingLineHeight,
  } as CSSProperties;

  return (
    <div
      className="public-appearance-preview-frame"
      data-preview-mode={mode}
    >
      <div
        className="public-appearance-preview"
        style={style}
      >
        <header className="public-appearance-preview__header">
          {lightLogo ? (
            <img
              src={lightLogo}
              alt="WedPlanned"
              style={{
                width: Math.min(
                  logoWidth,
                  mode === "mobile" ? 155 : 190,
                ),
              }}
            />
          ) : (
            <strong className="public-appearance-preview__brand">
              <em>Wed</em>Planned
            </strong>
          )}

          {mode === "desktop" ? (
            <nav>
              <span>Products</span>
              <span>Pricing</span>
              <span>About</span>
            </nav>
          ) : (
            <span className="public-appearance-preview__menu">
              ☰
            </span>
          )}

          {mode === "desktop" ? (
            <button type="button">Get started</button>
          ) : null}
        </header>

        <section className="public-appearance-preview__hero">
          <div>
            <small>ONE CONNECTED PLATFORM</small>
            <h1>
              Run your wedding business in one place.
            </h1>
            <p>
              A practical preview of the draft WedPlanned
              public-site appearance.
            </p>

            <div className="public-appearance-preview__actions">
              <button type="button">
                Get started
              </button>
              <button
                type="button"
                className="secondary"
              >
                Explore products
              </button>
            </div>
          </div>
        </section>

        <section className="public-appearance-preview__products">
          <div>
            <small>THE WEDPLANNED SUITE</small>
            <h2>Four connected products.</h2>
          </div>

          <div className="public-appearance-preview__product-grid">
            {PRODUCT_META.map((product) => {
              const productTheme =
                theme.products[product.key];

              return (
                <article
                  key={product.key}
                  style={{
                    borderTopColor:
                      productTheme.accentColour,
                  }}
                >
                  {productTheme.wordmarkUrl ? (
                    <img
                      src={productTheme.wordmarkUrl}
                      alt={product.label}
                      style={{
                        maxWidth: Math.min(
                          productTheme.logoWidthPx,
                          125,
                        ),
                      }}
                    />
                  ) : (
                    <strong
                      style={{
                        color:
                          productTheme.accentColour,
                      }}
                    >
                      {product.label}
                    </strong>
                  )}

                  <p>
                    Connected tools for the professional
                    wedding-business workflow.
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="public-appearance-preview__footer">
          {theme.branding.darkWordmarkUrl
            || theme.branding.lightWordmarkUrl ? (
            <img
              src={
                theme.branding.darkWordmarkUrl
                || theme.branding.lightWordmarkUrl
              }
              alt="WedPlanned"
              style={{
                maxWidth: Math.min(
                  theme.branding.footerLogoWidthPx,
                  170,
                ),
              }}
            />
          ) : (
            <strong>WedPlanned</strong>
          )}

          <span>
            One platform for wedding professionals.
          </span>
        </footer>
      </div>
    </div>
  );
}

export function PublicSiteAppearanceEditor({
  brandAssets,
}: {
  brandAssets: PlatformBrandAsset[];
}) {
  const [
    appearance,
    setAppearance,
  ] = useState<
    WedPlannedPublicAppearanceAdministration | null
  >(null);

  const [
    draft,
    setDraft,
  ] = useState<WedPlannedPublicTheme>(
    cloneDefaultWedPlannedPublicTheme(),
  );

  const [
    savedDraft,
    setSavedDraft,
  ] = useState<WedPlannedPublicTheme>(
    cloneDefaultWedPlannedPublicTheme(),
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    publishing,
    setPublishing,
  ] = useState(false);

  const [
    previewMode,
    setPreviewMode,
  ] = useState<PreviewMode>("desktop");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const logoAssets = brandAssets.filter(
    (asset) => asset.assetType === "logo",
  );

  const iconAssets = brandAssets.filter(
    (asset) => asset.assetType === "icon",
  );

  function applyAppearance(
    next: WedPlannedPublicAppearanceAdministration,
  ) {
    const nextDraft = cloneTheme(next.draftTheme);

    setAppearance(next);
    setDraft(nextDraft);
    setSavedDraft(cloneTheme(nextDraft));
  }

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    AdminApiService.getWedPlannedPublicAppearance()
      .then((next) => {
        if (active) {
          applyAppearance(next);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load WedPlanned public appearance.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const dirty = useMemo(
    () =>
      JSON.stringify(draft)
      !== JSON.stringify(savedDraft),
    [draft, savedDraft],
  );

  useEffect(() => {
    if (!dirty) {
      return;
    }

    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener(
      "beforeunload",
      beforeUnload,
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        beforeUnload,
      );
    };
  }, [dirty]);

  useEffect(() => {
    const keys = [
      draft.typography.bodyFont,
      draft.typography.headingFont,
      draft.typography.displayFont,
    ];

    const families = [
      ...new Set(
        keys
          .map((key) =>
            WEDPLANNED_PUBLIC_FONT_OPTIONS.find(
              (option) => option.key === key,
            )?.googleFamily,
          )
          .filter(Boolean),
      ),
    ];

    const elementId =
      "wedplanned-public-theme-preview-fonts";

    const existing =
      document.getElementById(elementId);

    if (!families.length) {
      existing?.remove();
      return;
    }

    const link = existing
      || document.createElement("link");

    link.id = elementId;
    link.setAttribute("rel", "stylesheet");
    link.setAttribute(
      "href",
      `https://fonts.googleapis.com/css2?${families
        .map(
          (family) =>
            `family=${encodeURIComponent(
              String(family),
            ).replace(/%3A/g, ":")}`,
        )
        .join("&")}&display=swap`,
    );

    if (!existing) {
      document.head.appendChild(link);
    }
  }, [
    draft.typography.bodyFont,
    draft.typography.headingFont,
    draft.typography.displayFont,
  ]);

  function updateGroup(
    group:
      | "branding"
      | "typography"
      | "colours"
      | "layout"
      | "behaviour",
    key: string,
    value: unknown,
  ) {
    setDraft((current) => ({
      ...current,
      [group]: {
        ...(current as any)[group],
        [key]: value,
      },
    }));

    setMessage("");
    setError("");
  }

  function updateProduct(
    productKey: keyof WedPlannedPublicTheme["products"],
    key: string,
    value: unknown,
  ) {
    setDraft((current) => ({
      ...current,
      products: {
        ...current.products,
        [productKey]: {
          ...current.products[productKey],
          [key]: value,
        },
      },
    }));

    setMessage("");
    setError("");
  }

  const contrastWarnings = useMemo(() => {
    const checks = [
      [
        "Header navigation",
        draft.colours.headerText,
        draft.colours.headerBackground,
      ],
      [
        "Primary button",
        draft.colours.primaryButtonText,
        draft.colours.primaryButtonBackground,
      ],
      [
        "Secondary button",
        draft.colours.secondaryButtonText,
        draft.colours.secondaryButtonBackground,
      ],
      [
        "Cards",
        draft.colours.cardText,
        draft.colours.cardBackground,
      ],
      [
        "Hero",
        draft.colours.heroText,
        draft.colours.heroBackground,
      ],
      [
        "Footer",
        draft.colours.footerText,
        draft.colours.footerBackground,
      ],
    ] as const;

    return checks
      .map(([label, foreground, background]) => ({
        label,
        ratio: contrastRatio(
          foreground,
          background,
        ),
      }))
      .filter((check) => check.ratio < 4.5);
  }, [draft.colours]);

  async function saveDraft() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const next =
        await AdminApiService
          .saveWedPlannedPublicAppearanceDraft(
            draft,
          );

      applyAppearance(next);
      setMessage(
        "WedPlanned public website appearance draft saved.",
      );

      return next;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the public appearance draft.",
      );

      return null;
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setMessage("");
    setError("");

    try {
      if (dirty) {
        const saved =
          await AdminApiService
            .saveWedPlannedPublicAppearanceDraft(
              draft,
            );

        applyAppearance(saved);
      }

      const next =
        await AdminApiService
          .publishWedPlannedPublicAppearance();

      applyAppearance(next);

      setMessage(
        `Published WedPlanned public appearance version ${next.publishedVersion}.`,
      );
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish the public appearance.",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function restoreVersion(version: number) {
    if (
      !window.confirm(
        `Restore version ${version} to the editable draft? The live website will not change until you publish it.`,
      )
    ) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const next =
        await AdminApiService
          .restoreWedPlannedPublicAppearanceVersionToDraft(
            version,
          );

      applyAppearance(next);

      setMessage(
        `Version ${version} restored to draft. Review it before publishing.`,
      );
    } catch (restoreError) {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "Unable to restore the appearance version.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="admin-panel__body">
          Loading WedPlanned public website appearance…
        </div>
      </div>
    );
  }

  if (!appearance) {
    return (
      <div className="admin-alert admin-alert--error">
        {error
          || "WedPlanned public website appearance is unavailable."}
      </div>
    );
  }

  return (
    <div className="public-appearance-editor">
      <header className="public-appearance-editor__toolbar">
        <div>
          <p className="admin-eyebrow">
            WedPlanned public website
          </p>

          <h2>Appearance & branding</h2>

          <p>
            Design the public WedPlanned website without
            changing source code. Draft changes remain private
            until they are published.
          </p>
        </div>

        <div className="public-appearance-editor__toolbar-actions">
          <AdminStatus
            tone={dirty ? "warning" : "info"}
          >
            {dirty ? "Unsaved draft" : "Draft saved"}
          </AdminStatus>

          <AdminStatus tone="success">
            Live v{appearance.publishedVersion}
          </AdminStatus>

          <AdminButton
            variant="secondary"
            icon={RotateCcw}
            disabled={!dirty || saving || publishing}
            onClick={() => {
              setDraft(cloneTheme(savedDraft));
              setMessage("");
              setError("");
            }}
          >
            Reset draft
          </AdminButton>

          <AdminButton
            variant="secondary"
            icon={Save}
            disabled={!dirty || saving || publishing}
            onClick={saveDraft}
          >
            {saving ? "Saving…" : "Save draft"}
          </AdminButton>

          <AdminButton
            variant="primary"
            icon={UploadCloud}
            disabled={saving || publishing}
            onClick={publish}
          >
            {publishing
              ? "Publishing…"
              : "Publish changes"}
          </AdminButton>
        </div>
      </header>

      {message ? (
        <div className="admin-alert admin-alert--success">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="admin-alert admin-alert--error">
          {error}
        </div>
      ) : null}

      <section className="public-appearance-editor__workspace">
        <aside className="public-appearance-editor__controls">
          <ControlGroup
            title="Branding"
            description="Desktop, mobile and sharing artwork plus independent logo sizing."
          >
            <div className="public-appearance-field-grid">
              <AssetSelect
                label="Desktop / light wordmark"
                value={draft.branding.lightWordmarkUrl}
                assets={logoAssets}
                emptyLabel="Use text WedPlanned fallback"
                onChange={(value) =>
                  updateGroup(
                    "branding",
                    "lightWordmarkUrl",
                    value,
                  )
                }
              />

              <AssetSelect
                label="Dark-background wordmark"
                value={draft.branding.darkWordmarkUrl}
                assets={logoAssets}
                emptyLabel="Use light wordmark"
                onChange={(value) =>
                  updateGroup(
                    "branding",
                    "darkWordmarkUrl",
                    value,
                  )
                }
              />

              <AssetSelect
                label="Mobile / compact wordmark"
                value={draft.branding.mobileWordmarkUrl}
                assets={logoAssets}
                emptyLabel="Use desktop wordmark"
                onChange={(value) =>
                  updateGroup(
                    "branding",
                    "mobileWordmarkUrl",
                    value,
                  )
                }
              />

              <AssetSelect
                label="Platform icon"
                value={draft.branding.iconUrl}
                assets={iconAssets}
                emptyLabel="Use built-in fallback"
                onChange={(value) =>
                  updateGroup(
                    "branding",
                    "iconUrl",
                    value,
                  )
                }
              />

              <AssetSelect
                label="Browser favicon"
                value={draft.branding.faviconUrl}
                assets={iconAssets}
                emptyLabel="Use platform icon"
                onChange={(value) =>
                  updateGroup(
                    "branding",
                    "faviconUrl",
                    value,
                  )
                }
              />

              <AssetSelect
                label="Social-share artwork"
                value={draft.branding.socialImageUrl}
                assets={brandAssets}
                emptyLabel="No custom social artwork"
                onChange={(value) =>
                  updateGroup(
                    "branding",
                    "socialImageUrl",
                    value,
                  )
                }
              />
            </div>

            <div className="public-appearance-field-grid public-appearance-field-grid--numbers">
              <NumberControl
                label="Desktop logo width"
                value={draft.branding.desktopLogoWidthPx}
                min={60}
                max={420}
                onChange={(value) =>
                  updateGroup(
                    "branding",
                    "desktopLogoWidthPx",
                    value,
                  )
                }
              />

              <NumberControl
                label="Mobile logo width"
                value={draft.branding.mobileLogoWidthPx}
                min={48}
                max={300}
                onChange={(value) =>
                  updateGroup(
                    "branding",
                    "mobileLogoWidthPx",
                    value,
                  )
                }
              />

              <NumberControl
                label="Footer logo width"
                value={draft.branding.footerLogoWidthPx}
                min={60}
                max={420}
                onChange={(value) =>
                  updateGroup(
                    "branding",
                    "footerLogoWidthPx",
                    value,
                  )
                }
              />
            </div>

            <a
              href="/admin/platform?section=assets"
              className="admin-button admin-button--secondary admin-button--sm"
            >
              Manage platform artwork
              <ExternalLink className="admin-button__icon" />
            </a>
          </ControlGroup>

          <ControlGroup
            title="Typography"
            description="Choose independent body, heading and display families plus exact responsive sizes."
          >
            <div className="public-appearance-field-grid">
              <FontSelect
                label="Body font"
                value={draft.typography.bodyFont}
                onChange={(value) =>
                  updateGroup(
                    "typography",
                    "bodyFont",
                    value,
                  )
                }
              />

              <FontSelect
                label="Heading font"
                value={draft.typography.headingFont}
                onChange={(value) =>
                  updateGroup(
                    "typography",
                    "headingFont",
                    value,
                  )
                }
              />

              <FontSelect
                label="Display / brand font"
                value={draft.typography.displayFont}
                onChange={(value) =>
                  updateGroup(
                    "typography",
                    "displayFont",
                    value,
                  )
                }
              />
            </div>

            <h3 className="public-appearance-subheading">
              Font sizes
            </h3>

            <div className="public-appearance-field-grid public-appearance-field-grid--numbers">
              {TYPOGRAPHY_SIZE_FIELDS.map((field) => (
                <NumberControl
                  key={field.key}
                  label={field.label}
                  value={
                    (draft.typography as any)[field.key]
                  }
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  suffix={field.suffix}
                  onChange={(value) =>
                    updateGroup(
                      "typography",
                      field.key,
                      value,
                    )
                  }
                />
              ))}
            </div>

            <h3 className="public-appearance-subheading">
              Weight, line height & spacing
            </h3>

            <div className="public-appearance-field-grid public-appearance-field-grid--numbers">
              {[
                ...TYPOGRAPHY_WEIGHT_FIELDS,
                ...TYPOGRAPHY_DETAIL_FIELDS,
              ].map((field) => (
                <NumberControl
                  key={field.key}
                  label={field.label}
                  value={
                    (draft.typography as any)[field.key]
                  }
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  suffix={field.suffix}
                  onChange={(value) =>
                    updateGroup(
                      "typography",
                      field.key,
                      value,
                    )
                  }
                />
              ))}
            </div>
          </ControlGroup>

          <ControlGroup
            title="Core colours"
            description="Page surfaces, global text and border colours."
          >
            <div className="public-appearance-field-grid">
              {SURFACE_COLOURS.map((field) => (
                <ColourControl
                  key={field.key}
                  label={field.label}
                  value={
                    (draft.colours as any)[field.key]
                  }
                  onChange={(value) =>
                    updateGroup(
                      "colours",
                      field.key,
                      value,
                    )
                  }
                />
              ))}
            </div>
          </ControlGroup>

          <ControlGroup
            title="Header & mobile navigation"
            description="Independent desktop and mobile menu colour systems."
          >
            <div className="public-appearance-field-grid">
              {NAVIGATION_COLOURS.map((field) => (
                <ColourControl
                  key={field.key}
                  label={field.label}
                  value={
                    (draft.colours as any)[field.key]
                  }
                  onChange={(value) =>
                    updateGroup(
                      "colours",
                      field.key,
                      value,
                    )
                  }
                />
              ))}
            </div>
          </ControlGroup>

          <ControlGroup
            title="Buttons"
            description="Primary and secondary call-to-action colours."
          >
            <div className="public-appearance-field-grid">
              {BUTTON_COLOURS.map((field) => (
                <ColourControl
                  key={field.key}
                  label={field.label}
                  value={
                    (draft.colours as any)[field.key]
                  }
                  onChange={(value) =>
                    updateGroup(
                      "colours",
                      field.key,
                      value,
                    )
                  }
                />
              ))}
            </div>
          </ControlGroup>

          <ControlGroup
            title="Cards"
            description="Product cards and supporting content surfaces."
          >
            <div className="public-appearance-field-grid">
              {CARD_COLOURS.map((field) => (
                <ColourControl
                  key={field.key}
                  label={field.label}
                  value={
                    (draft.colours as any)[field.key]
                  }
                  onChange={(value) =>
                    updateGroup(
                      "colours",
                      field.key,
                      value,
                    )
                  }
                />
              ))}
            </div>

            <NumberControl
              label="Shadow strength"
              value={draft.layout.cardShadowStrength}
              min={0}
              max={3}
              suffix=""
              onChange={(value) =>
                updateGroup(
                  "layout",
                  "cardShadowStrength",
                  value,
                )
              }
            />
          </ControlGroup>

          <ControlGroup
            title="Hero"
            description="Homepage and product-page hero surface."
          >
            <div className="public-appearance-field-grid">
              {HERO_COLOURS.map((field) => (
                <ColourControl
                  key={field.key}
                  label={field.label}
                  value={
                    (draft.colours as any)[field.key]
                  }
                  onChange={(value) =>
                    updateGroup(
                      "colours",
                      field.key,
                      value,
                    )
                  }
                />
              ))}
            </div>
          </ControlGroup>

          <ControlGroup
            title="Footer"
            description="Dark or light footer presentation with independent text colours."
          >
            <div className="public-appearance-field-grid">
              {FOOTER_COLOURS.map((field) => (
                <ColourControl
                  key={field.key}
                  label={field.label}
                  value={
                    (draft.colours as any)[field.key]
                  }
                  onChange={(value) =>
                    updateGroup(
                      "colours",
                      field.key,
                      value,
                    )
                  }
                />
              ))}
            </div>
          </ControlGroup>

          <ControlGroup
            title="Layout & sizing"
            description="Control width, whitespace, card gaps and corner treatment across desktop and mobile."
          >
            <div className="public-appearance-field-grid public-appearance-field-grid--numbers">
              {LAYOUT_FIELDS.map((field) => (
                <NumberControl
                  key={field.key}
                  label={field.label}
                  value={
                    (draft.layout as any)[field.key]
                  }
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  suffix={field.suffix}
                  onChange={(value) =>
                    updateGroup(
                      "layout",
                      field.key,
                      value,
                    )
                  }
                />
              ))}
            </div>
          </ControlGroup>

          <ControlGroup
            title="Product identities"
            description="Give WedNav, WedCRM, WedStudio and WedStore independent colours and responsive artwork."
          >
            <div className="public-appearance-product-controls">
              {PRODUCT_META.map((product) => {
                const value =
                  draft.products[product.key];

                return (
                  <article key={product.key}>
                    <header>
                      <strong>{product.label}</strong>
                      <span
                        style={{
                          background:
                            value.accentColour,
                        }}
                      />
                    </header>

                    <div className="public-appearance-field-grid">
                      <ColourControl
                        label="Accent colour"
                        value={value.accentColour}
                        onChange={(colour) =>
                          updateProduct(
                            product.key,
                            "accentColour",
                            colour,
                          )
                        }
                      />

                      <AssetSelect
                        label="Desktop wordmark"
                        value={value.wordmarkUrl}
                        assets={logoAssets}
                        emptyLabel={`Use ${product.label} text`}
                        onChange={(assetUrl) =>
                          updateProduct(
                            product.key,
                            "wordmarkUrl",
                            assetUrl,
                          )
                        }
                      />

                      <AssetSelect
                        label="Compact / mobile wordmark"
                        value={value.compactWordmarkUrl}
                        assets={logoAssets}
                        emptyLabel="Use desktop identity"
                        onChange={(assetUrl) =>
                          updateProduct(
                            product.key,
                            "compactWordmarkUrl",
                            assetUrl,
                          )
                        }
                      />
                    </div>

                    <div className="public-appearance-field-grid public-appearance-field-grid--numbers">
                      <NumberControl
                        label="Desktop logo width"
                        value={value.logoWidthPx}
                        min={40}
                        max={320}
                        onChange={(number) =>
                          updateProduct(
                            product.key,
                            "logoWidthPx",
                            number,
                          )
                        }
                      />

                      <NumberControl
                        label="Compact logo width"
                        value={value.compactLogoWidthPx}
                        min={32}
                        max={220}
                        onChange={(number) =>
                          updateProduct(
                            product.key,
                            "compactLogoWidthPx",
                            number,
                          )
                        }
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </ControlGroup>

          <ControlGroup
            title="Behaviour"
            description="Small interaction and header behaviours that affect the feel of the public site."
          >
            <div className="public-appearance-toggle-grid">
              <label>
                <input
                  type="checkbox"
                  checked={draft.behaviour.stickyHeader}
                  onChange={(event) =>
                    updateGroup(
                      "behaviour",
                      "stickyHeader",
                      event.target.checked,
                    )
                  }
                />
                <span>
                  <strong>Sticky header</strong>
                  <small>
                    Keep navigation visible while scrolling.
                  </small>
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={
                    draft.behaviour.enableCardHoverLift
                  }
                  onChange={(event) =>
                    updateGroup(
                      "behaviour",
                      "enableCardHoverLift",
                      event.target.checked,
                    )
                  }
                />
                <span>
                  <strong>Card hover lift</strong>
                  <small>
                    Allow subtle card movement on pointer devices.
                  </small>
                </span>
              </label>
            </div>

            <div className="public-appearance-field-grid public-appearance-field-grid--numbers">
              <NumberControl
                label="Header opacity"
                value={
                  draft.behaviour.headerOpacityPercent
                }
                min={60}
                max={100}
                suffix="%"
                onChange={(value) =>
                  updateGroup(
                    "behaviour",
                    "headerOpacityPercent",
                    value,
                  )
                }
              />

              <NumberControl
                label="Header blur"
                value={draft.behaviour.headerBlurPx}
                min={0}
                max={30}
                onChange={(value) =>
                  updateGroup(
                    "behaviour",
                    "headerBlurPx",
                    value,
                  )
                }
              />
            </div>
          </ControlGroup>

          <ControlGroup
            title="Accessibility check"
            description="Automatic WCAG-style contrast warnings for the main foreground/background pairs."
          >
            {contrastWarnings.length ? (
              <div className="public-appearance-contrast-list">
                {contrastWarnings.map((warning) => (
                  <div key={warning.label}>
                    <AlertTriangle />
                    <span>
                      <strong>{warning.label}</strong>
                      <small>
                        Contrast {warning.ratio.toFixed(2)}:1
                        · aim for at least 4.5:1 for normal text.
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="public-appearance-contrast-pass">
                <CheckCircle2 />
                <span>
                  Main text/background combinations pass
                  the 4.5:1 contrast check.
                </span>
              </div>
            )}
          </ControlGroup>

          <ControlGroup
            title="Defaults"
            description="Return the editable draft to the built-in v1.10.2a-compatible design without publishing it."
          >
            <AdminButton
              variant="secondary"
              icon={Undo2}
              disabled={saving || publishing}
              onClick={() => {
                setDraft(
                  cloneDefaultWedPlannedPublicTheme(),
                );
                setMessage(
                  "Built-in defaults loaded into the draft. Save or publish when ready.",
                );
                setError("");
              }}
            >
              Load built-in defaults
            </AdminButton>
          </ControlGroup>
        </aside>

        <section className="public-appearance-editor__preview-column">
          <div className="public-appearance-preview-toolbar">
            <div>
              <strong>Live draft preview</strong>
              <span>
                Preview only. Publishing controls the actual
                public website.
              </span>
            </div>

            <div>
              <button
                type="button"
                className={
                  previewMode === "desktop"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setPreviewMode("desktop")
                }
              >
                <Monitor />
                Desktop
              </button>

              <button
                type="button"
                className={
                  previewMode === "mobile"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setPreviewMode("mobile")
                }
              >
                <Smartphone />
                Mobile
              </button>
            </div>
          </div>

          <PublicAppearancePreview
            theme={draft}
            mode={previewMode}
          />

          <AdminPanel
            title="Publishing"
            description="Draft changes are isolated from the live WedPlanned website until Publish changes is used."
            actions={
              <AdminStatus tone="success">
                Version {appearance.publishedVersion}
              </AdminStatus>
            }
          >
            <div className="public-appearance-publish-summary">
              <div>
                <span>Last published</span>
                <strong>
                  {appearance.publishedAt
                    ? new Date(
                        appearance.publishedAt,
                      ).toLocaleString()
                    : "Not yet published"}
                </strong>
              </div>

              <div>
                <span>Published by</span>
                <strong>
                  {appearance.publishedByEmail
                    || "—"}
                </strong>
              </div>

              <div>
                <span>Draft updated</span>
                <strong>
                  {appearance.updatedAt
                    ? new Date(
                        appearance.updatedAt,
                      ).toLocaleString()
                    : "—"}
                </strong>
              </div>
            </div>

            <a
              href="https://wedplanned.com/"
              target="_blank"
              rel="noreferrer"
              className="admin-button admin-button--secondary admin-button--sm"
            >
              Open live WedPlanned site
              <ExternalLink className="admin-button__icon" />
            </a>
          </AdminPanel>

          <AdminPanel
            title="Version history"
            description="Restore any recent published design back into the draft for review. Restoring never changes the live site automatically."
          >
            {appearance.versions.length ? (
              <div className="public-appearance-version-list">
                {appearance.versions.map((version) => (
                  <div key={version.id}>
                    <div>
                      <strong>
                        Version {version.version}
                      </strong>
                      <span>
                        {version.createdAt
                          ? new Date(
                              version.createdAt,
                            ).toLocaleString()
                          : ""}
                      </span>
                      <small>
                        {version.publishedByEmail
                          || "Platform administrator"}
                      </small>
                    </div>

                    <AdminButton
                      size="sm"
                      variant="secondary"
                      icon={Undo2}
                      disabled={
                        saving || publishing
                      }
                      onClick={() =>
                        restoreVersion(
                          version.version,
                        )
                      }
                    >
                      Restore to draft
                    </AdminButton>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-empty-state">
                <h3>No published versions yet</h3>
                <p>
                  The first publication will create
                  version 1.
                </p>
              </div>
            )}
          </AdminPanel>
        </section>
      </section>
    </div>
  );
}
