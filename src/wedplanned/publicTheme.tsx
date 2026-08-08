import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  cloneDefaultWedPlannedPublicTheme,
  normaliseWedPlannedPublicTheme,
  wedPlannedFontOption,
  type WedPlannedPublicTheme,
} from "../shared/wedplannedPublicAppearance";

type PublishedThemePayload = {
  ok?: boolean;
  siteKey?: string;
  publishedVersion?: number;
  publishedAt?: string;
  theme?: unknown;
};

type WedPlannedPublicThemeRuntime = {
  theme: WedPlannedPublicTheme;
  publishedVersion: number;
  publishedAt: string;
  publishedThemeActive: boolean;
};

const DEFAULT_RUNTIME: WedPlannedPublicThemeRuntime = {
  theme: cloneDefaultWedPlannedPublicTheme(),
  publishedVersion: 0,
  publishedAt: "",
  publishedThemeActive: false,
};

const RuntimeContext =
  createContext<WedPlannedPublicThemeRuntime>(
    DEFAULT_RUNTIME,
  );

function px(value: number) {
  return `${value}px`;
}

function shadowForStrength(
  strength: WedPlannedPublicTheme["layout"]["cardShadowStrength"],
) {
  if (strength === 0) {
    return "none";
  }

  if (strength === 1) {
    return "0 12px 32px rgba(17, 17, 17, .06)";
  }

  if (strength === 2) {
    return "0 18px 44px rgba(17, 17, 17, .10)";
  }

  return "0 24px 60px rgba(17, 17, 17, .14)";
}

export function wedPlannedPublicThemeVariables(
  theme: WedPlannedPublicTheme,
): Record<string, string> {
  const bodyFont = wedPlannedFontOption(
    theme.typography.bodyFont,
  ).stack;

  const headingFont = wedPlannedFontOption(
    theme.typography.headingFont,
  ).stack;

  const displayFont = wedPlannedFontOption(
    theme.typography.displayFont,
  ).stack;

  return {
    "--wp-theme-page":
      theme.colours.pageBackground,
    "--wp-theme-section":
      theme.colours.sectionBackground,
    "--wp-theme-soft":
      theme.colours.alternateSectionBackground,
    "--wp-theme-dark":
      theme.colours.darkSectionBackground,

    "--wp-theme-text":
      theme.colours.text,
    "--wp-theme-muted":
      theme.colours.mutedText,
    "--wp-theme-border":
      theme.colours.border,

    "--wp-theme-header-bg":
      theme.colours.headerBackground,
    "--wp-theme-header-text":
      theme.colours.headerText,
    "--wp-theme-header-active":
      theme.colours.headerActiveText,

    "--wp-theme-mobile-bg":
      theme.colours.mobileMenuBackground,
    "--wp-theme-mobile-text":
      theme.colours.mobileMenuText,
    "--wp-theme-mobile-active":
      theme.colours.mobileMenuActiveText,

    "--wp-theme-primary-bg":
      theme.colours.primaryButtonBackground,
    "--wp-theme-primary-text":
      theme.colours.primaryButtonText,
    "--wp-theme-primary-border":
      theme.colours.primaryButtonBorder,

    "--wp-theme-secondary-bg":
      theme.colours.secondaryButtonBackground,
    "--wp-theme-secondary-text":
      theme.colours.secondaryButtonText,
    "--wp-theme-secondary-border":
      theme.colours.secondaryButtonBorder,

    "--wp-theme-card-bg":
      theme.colours.cardBackground,
    "--wp-theme-card-text":
      theme.colours.cardText,
    "--wp-theme-card-muted":
      theme.colours.cardMutedText,
    "--wp-theme-card-border":
      theme.colours.cardBorder,

    "--wp-theme-hero-bg":
      theme.colours.heroBackground,
    "--wp-theme-hero-text":
      theme.colours.heroText,
    "--wp-theme-hero-muted":
      theme.colours.heroMutedText,

    "--wp-theme-footer-bg":
      theme.colours.footerBackground,
    "--wp-theme-footer-text":
      theme.colours.footerText,
    "--wp-theme-footer-muted":
      theme.colours.footerMutedText,

    "--wp-body-font":
      bodyFont,
    "--wp-heading-font":
      headingFont,
    "--wp-display-font":
      displayFont,

    "--wp-body-desktop":
      px(theme.typography.bodyDesktopPx),
    "--wp-body-mobile":
      px(theme.typography.bodyMobilePx),

    "--wp-nav-desktop":
      px(theme.typography.navigationDesktopPx),
    "--wp-nav-mobile":
      px(theme.typography.navigationMobilePx),

    "--wp-button-font-size":
      px(theme.typography.buttonPx),
    "--wp-meta-font-size":
      px(theme.typography.metaPx),

    "--wp-h1-desktop":
      px(theme.typography.h1DesktopPx),
    "--wp-h1-mobile":
      px(theme.typography.h1MobilePx),

    "--wp-h2-desktop":
      px(theme.typography.h2DesktopPx),
    "--wp-h2-mobile":
      px(theme.typography.h2MobilePx),

    "--wp-h3-desktop":
      px(theme.typography.h3DesktopPx),
    "--wp-h3-mobile":
      px(theme.typography.h3MobilePx),

    "--wp-body-weight":
      String(theme.typography.bodyWeight),
    "--wp-nav-weight":
      String(theme.typography.navigationWeight),
    "--wp-button-weight":
      String(theme.typography.buttonWeight),
    "--wp-heading-weight":
      String(theme.typography.headingWeight),

    "--wp-body-line-height":
      String(theme.typography.bodyLineHeight),
    "--wp-heading-line-height":
      String(theme.typography.headingLineHeight),

    "--wp-heading-letter-spacing":
      `${theme.typography.headingLetterSpacingEm}em`,
    "--wp-nav-letter-spacing":
      `${theme.typography.navigationLetterSpacingEm}em`,

    "--wp-shell":
      px(theme.layout.contentWidthPx),

    "--wp-section-desktop":
      px(theme.layout.desktopSectionSpacingPx),
    "--wp-section-mobile":
      px(theme.layout.mobileSectionSpacingPx),

    "--wp-side-desktop":
      px(theme.layout.desktopHorizontalPaddingPx),
    "--wp-side-mobile":
      px(theme.layout.mobileHorizontalPaddingPx),

    "--wp-card-gap":
      px(theme.layout.cardGapPx),
    "--wp-card-radius":
      px(theme.layout.cardRadiusPx),
    "--wp-button-radius":
      px(theme.layout.buttonRadiusPx),
    "--wp-hero-radius":
      px(theme.layout.heroRadiusPx),
    "--wp-header-height":
      px(theme.layout.headerHeightPx),

    "--wp-card-shadow":
      shadowForStrength(
        theme.layout.cardShadowStrength,
      ),

    "--wp-header-position":
      theme.behaviour.stickyHeader
        ? "sticky"
        : "relative",

    "--wp-header-opacity":
      `${theme.behaviour.headerOpacityPercent}%`,

    "--wp-header-blur":
      px(theme.behaviour.headerBlurPx),

    "--wp-card-hover-transform":
      theme.behaviour.enableCardHoverLift
        ? "translateY(-3px)"
        : "none",

    "--wp-card-hover-shadow":
      theme.behaviour.enableCardHoverLift
        ? "0 18px 42px rgba(17, 17, 17, .09)"
        : shadowForStrength(
            theme.layout.cardShadowStrength,
          ),

    "--wp-nav":
      theme.products.wednav.accentColour,
    "--wp-crm":
      theme.products.wedcrm.accentColour,
    "--wp-studio":
      theme.products.wedstudio.accentColour,
    "--wp-store":
      theme.products.wedstore.accentColour,
  };
}

const VARIABLE_NAMES = Object.keys(
  wedPlannedPublicThemeVariables(
    cloneDefaultWedPlannedPublicTheme(),
  ),
);

function clearThemeVariables() {
  const style = document.documentElement.style;

  VARIABLE_NAMES.forEach((name) => {
    style.removeProperty(name);
  });

  document.documentElement.removeAttribute(
    "data-wp-theme",
  );
}

function applyThemeVariables(
  theme: WedPlannedPublicTheme,
) {
  const style = document.documentElement.style;

  for (
    const [name, value]
    of Object.entries(
      wedPlannedPublicThemeVariables(theme),
    )
  ) {
    style.setProperty(name, value);
  }

  document.documentElement.setAttribute(
    "data-wp-theme",
    "published",
  );
}

function uniqueGoogleFamilies(
  theme: WedPlannedPublicTheme,
) {
  return [
    ...new Set(
      [
        theme.typography.bodyFont,
        theme.typography.headingFont,
        theme.typography.displayFont,
      ]
        .map(
          (key) =>
            wedPlannedFontOption(key).googleFamily,
        )
        .filter(
          (family): family is string =>
            Boolean(family),
        ),
    ),
  ];
}

function applyFonts(
  theme: WedPlannedPublicTheme,
) {
  const id =
    "wedplanned-published-theme-fonts";

  const families = uniqueGoogleFamilies(theme);

  const existing =
    document.getElementById(
      id,
    ) as HTMLLinkElement | null;

  if (!families.length) {
    existing?.remove();
    return;
  }

  const link =
    existing
    || document.createElement("link");

  link.id = id;
  link.rel = "stylesheet";

  link.href =
    "https://fonts.googleapis.com/css2?"
    + families
      .map(
        (family) =>
          `family=${family}`,
      )
      .join("&")
    + "&display=swap";

  if (!existing) {
    document.head.appendChild(link);
  }
}

function setMetaProperty(
  property: string,
  content: string,
) {
  let element =
    document.head.querySelector(
      `meta[property="${property}"]`,
    ) as HTMLMetaElement | null;

  if (!content) {
    return;
  }

  if (!element) {
    element =
      document.createElement("meta");

    element.setAttribute(
      "property",
      property,
    );

    document.head.appendChild(element);
  }

  element.content = content;
}

function applyBrandMetadata(
  theme: WedPlannedPublicTheme,
) {
  const favicon =
    theme.branding.faviconUrl
    || theme.branding.iconUrl;

  if (favicon) {
    let link =
      document.head.querySelector(
        'link[data-wp-runtime-favicon="true"]',
      ) as HTMLLinkElement | null;

    if (!link) {
      link =
        document.createElement("link");

      link.rel = "icon";

      link.setAttribute(
        "data-wp-runtime-favicon",
        "true",
      );

      document.head.appendChild(link);
    }

    link.href = favicon;
  }

  if (theme.branding.socialImageUrl) {
    setMetaProperty(
      "og:image",
      theme.branding.socialImageUrl,
    );
  }
}

async function loadPublishedTheme(
  signal: AbortSignal,
): Promise<WedPlannedPublicThemeRuntime> {
  const response = await fetch(
    "/api/theme",
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      `WedPlanned theme request failed: ${response.status}`,
    );
  }

  const payload =
    await response.json() as PublishedThemePayload;

  const publishedVersion =
    Number(payload.publishedVersion || 0);

  if (
    !Number.isInteger(publishedVersion)
    || publishedVersion < 0
  ) {
    throw new Error(
      "WedPlanned theme returned an invalid publication version.",
    );
  }

  return {
    theme:
      normaliseWedPlannedPublicTheme(
        payload.theme,
      ),
    publishedVersion,
    publishedAt:
      String(payload.publishedAt || ""),
    publishedThemeActive:
      publishedVersion > 0,
  };
}

export function WedPlannedPublicThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    runtime,
    setRuntime,
  ] = useState<WedPlannedPublicThemeRuntime>(
    DEFAULT_RUNTIME,
  );

  useEffect(() => {
    const controller =
      new AbortController();

    loadPublishedTheme(
      controller.signal,
    )
      .then((next) => {
        if (next.publishedThemeActive) {
          applyThemeVariables(next.theme);
          applyFonts(next.theme);
          applyBrandMetadata(next.theme);
        } else {
          clearThemeVariables();
        }

        setRuntime(next);
      })
      .catch((error) => {
        if (
          error instanceof DOMException
          && error.name === "AbortError"
        ) {
          return;
        }

        clearThemeVariables();

        setRuntime(DEFAULT_RUNTIME);
      });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <RuntimeContext.Provider
      value={runtime}
    >
      {children}
    </RuntimeContext.Provider>
  );
}

export function useWedPlannedPublicTheme() {
  return useContext(RuntimeContext);
}
