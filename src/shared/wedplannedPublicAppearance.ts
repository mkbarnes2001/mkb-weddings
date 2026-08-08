export const WEDPLANNED_PUBLIC_THEME_SCHEMA_VERSION = 1 as const;

export type WedPlannedFontKey =
  | "montserrat"
  | "inter"
  | "manrope"
  | "dm-sans"
  | "system-sans"
  | "system-serif"
  | "playfair-display"
  | "cormorant-garamond";

export type WedPlannedProductThemeKey =
  | "wednav"
  | "wedcrm"
  | "wedstudio"
  | "wedstore";

export type WedPlannedShadowStrength = 0 | 1 | 2 | 3;

export type WedPlannedPublicTheme = {
  schemaVersion: typeof WEDPLANNED_PUBLIC_THEME_SCHEMA_VERSION;

  branding: {
    lightWordmarkUrl: string;
    darkWordmarkUrl: string;
    mobileWordmarkUrl: string;
    iconUrl: string;
    faviconUrl: string;
    socialImageUrl: string;

    desktopLogoWidthPx: number;
    mobileLogoWidthPx: number;
    footerLogoWidthPx: number;
  };

  typography: {
    bodyFont: WedPlannedFontKey;
    headingFont: WedPlannedFontKey;
    displayFont: WedPlannedFontKey;

    bodyDesktopPx: number;
    bodyMobilePx: number;

    navigationDesktopPx: number;
    navigationMobilePx: number;
    buttonPx: number;
    metaPx: number;

    h1DesktopPx: number;
    h1MobilePx: number;
    h2DesktopPx: number;
    h2MobilePx: number;
    h3DesktopPx: number;
    h3MobilePx: number;

    bodyWeight: number;
    navigationWeight: number;
    buttonWeight: number;
    headingWeight: number;

    bodyLineHeight: number;
    headingLineHeight: number;

    headingLetterSpacingEm: number;
    navigationLetterSpacingEm: number;
  };

  colours: {
    pageBackground: string;
    sectionBackground: string;
    alternateSectionBackground: string;
    darkSectionBackground: string;

    text: string;
    mutedText: string;
    border: string;

    headerBackground: string;
    headerText: string;
    headerActiveText: string;

    mobileMenuBackground: string;
    mobileMenuText: string;
    mobileMenuActiveText: string;

    primaryButtonBackground: string;
    primaryButtonText: string;
    primaryButtonBorder: string;

    secondaryButtonBackground: string;
    secondaryButtonText: string;
    secondaryButtonBorder: string;

    cardBackground: string;
    cardText: string;
    cardMutedText: string;
    cardBorder: string;

    heroBackground: string;
    heroText: string;
    heroMutedText: string;

    footerBackground: string;
    footerText: string;
    footerMutedText: string;
  };

  layout: {
    contentWidthPx: number;

    desktopSectionSpacingPx: number;
    mobileSectionSpacingPx: number;

    desktopHorizontalPaddingPx: number;
    mobileHorizontalPaddingPx: number;

    cardGapPx: number;
    cardRadiusPx: number;
    buttonRadiusPx: number;
    heroRadiusPx: number;

    headerHeightPx: number;

    cardShadowStrength: WedPlannedShadowStrength;
  };

  behaviour: {
    stickyHeader: boolean;
    headerOpacityPercent: number;
    headerBlurPx: number;
    enableCardHoverLift: boolean;
  };

  products: Record<
    WedPlannedProductThemeKey,
    {
      accentColour: string;
      wordmarkUrl: string;
      compactWordmarkUrl: string;
      logoWidthPx: number;
      compactLogoWidthPx: number;
    }
  >;
};

export const WEDPLANNED_PUBLIC_FONT_OPTIONS: ReadonlyArray<{
  key: WedPlannedFontKey;
  label: string;
  stack: string;
  googleFamily?: string;
}> = [
  {
    key: "montserrat",
    label: "Montserrat",
    stack: '"Montserrat", "Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif',
    googleFamily: "Montserrat:wght@400;500;600;650;700",
  },
  {
    key: "inter",
    label: "Inter",
    stack: '"Inter", "Helvetica Neue", Arial, sans-serif',
    googleFamily: "Inter:wght@400;500;600;700",
  },
  {
    key: "manrope",
    label: "Manrope",
    stack: '"Manrope", "Helvetica Neue", Arial, sans-serif',
    googleFamily: "Manrope:wght@400;500;600;700",
  },
  {
    key: "dm-sans",
    label: "DM Sans",
    stack: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
    googleFamily: "DM+Sans:wght@400;500;600;700",
  },
  {
    key: "system-sans",
    label: "System Sans",
    stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  {
    key: "system-serif",
    label: "System Serif",
    stack: 'Georgia, "Times New Roman", Times, serif',
  },
  {
    key: "playfair-display",
    label: "Playfair Display",
    stack: '"Playfair Display", Georgia, "Times New Roman", serif',
    googleFamily: "Playfair+Display:wght@400;500;600;700",
  },
  {
    key: "cormorant-garamond",
    label: "Cormorant Garamond",
    stack: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
    googleFamily: "Cormorant+Garamond:wght@400;500;600;700",
  },
];

export const DEFAULT_WEDPLANNED_PUBLIC_THEME: WedPlannedPublicTheme = {
  schemaVersion: WEDPLANNED_PUBLIC_THEME_SCHEMA_VERSION,

  branding: {
    lightWordmarkUrl: "",
    darkWordmarkUrl: "",
    mobileWordmarkUrl: "",
    iconUrl: "",
    faviconUrl: "",
    socialImageUrl: "",

    desktopLogoWidthPx: 150,
    mobileLogoWidthPx: 132,
    footerLogoWidthPx: 150,
  },

  typography: {
    bodyFont: "montserrat",
    headingFont: "montserrat",
    displayFont: "system-serif",

    bodyDesktopPx: 14,
    bodyMobilePx: 14,

    navigationDesktopPx: 13,
    navigationMobilePx: 13,
    buttonPx: 12,
    metaPx: 10,

    h1DesktopPx: 70,
    h1MobilePx: 54,
    h2DesktopPx: 46,
    h2MobilePx: 38,
    h3DesktopPx: 23,
    h3MobilePx: 20,

    bodyWeight: 400,
    navigationWeight: 600,
    buttonWeight: 700,
    headingWeight: 650,

    bodyLineHeight: 1.6,
    headingLineHeight: 1.05,

    headingLetterSpacingEm: -0.04,
    navigationLetterSpacingEm: 0,
  },

  colours: {
    pageBackground: "#FFFFFF",
    sectionBackground: "#FFFFFF",
    alternateSectionBackground: "#F5F3EF",
    darkSectionBackground: "#111111",

    text: "#161616",
    mutedText: "#66645F",
    border: "#DEDBD5",

    headerBackground: "#FFFFFF",
    headerText: "#4D4B47",
    headerActiveText: "#111111",

    mobileMenuBackground: "#FFFFFF",
    mobileMenuText: "#222222",
    mobileMenuActiveText: "#111111",

    primaryButtonBackground: "#111111",
    primaryButtonText: "#FFFFFF",
    primaryButtonBorder: "#111111",

    secondaryButtonBackground: "#FFFFFF",
    secondaryButtonText: "#111111",
    secondaryButtonBorder: "#D6D2CB",

    cardBackground: "#FFFFFF",
    cardText: "#161616",
    cardMutedText: "#68655F",
    cardBorder: "#DEDBD5",

    heroBackground: "#FFFFFF",
    heroText: "#111111",
    heroMutedText: "#55524D",

    footerBackground: "#111111",
    footerText: "#FFFFFF",
    footerMutedText: "#AAA59D",
  },

  layout: {
    contentWidthPx: 1180,

    desktopSectionSpacingPx: 92,
    mobileSectionSpacingPx: 66,

    desktopHorizontalPaddingPx: 20,
    mobileHorizontalPaddingPx: 16,

    cardGapPx: 12,
    cardRadiusPx: 14,
    buttonRadiusPx: 9,
    heroRadiusPx: 28,

    headerHeightPx: 68,

    cardShadowStrength: 1,
  },

  behaviour: {
    stickyHeader: true,
    headerOpacityPercent: 94,
    headerBlurPx: 16,
    enableCardHoverLift: true,
  },

  products: {
    wednav: {
      accentColour: "#B45309",
      wordmarkUrl: "",
      compactWordmarkUrl: "",
      logoWidthPx: 110,
      compactLogoWidthPx: 78,
    },
    wedcrm: {
      accentColour: "#2563EB",
      wordmarkUrl: "",
      compactWordmarkUrl: "",
      logoWidthPx: 110,
      compactLogoWidthPx: 78,
    },
    wedstudio: {
      accentColour: "#0F766E",
      wordmarkUrl: "",
      compactWordmarkUrl: "",
      logoWidthPx: 110,
      compactLogoWidthPx: 78,
    },
    wedstore: {
      accentColour: "#7C3AED",
      wordmarkUrl: "",
      compactWordmarkUrl: "",
      logoWidthPx: 110,
      compactLogoWidthPx: 78,
    },
  },
};

const FONT_KEYS = new Set<WedPlannedFontKey>(
  WEDPLANNED_PUBLIC_FONT_OPTIONS.map((option) => option.key),
);

const PRODUCT_KEYS: WedPlannedProductThemeKey[] = [
  "wednav",
  "wedcrm",
  "wedstudio",
  "wedstore",
];

function object(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function boundedNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, numeric));
}

function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  return Math.round(
    boundedNumber(value, fallback, minimum, maximum),
  );
}

function colour(value: unknown, fallback: string) {
  const candidate = String(value ?? "").trim().toUpperCase();

  return /^#[0-9A-F]{6}$/.test(candidate)
    ? candidate
    : fallback;
}

function assetUrl(value: unknown, fallback = "") {
  const candidate = String(value ?? "").trim();

  if (!candidate) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
}

function font(
  value: unknown,
  fallback: WedPlannedFontKey,
): WedPlannedFontKey {
  const candidate = String(value ?? "") as WedPlannedFontKey;

  return FONT_KEYS.has(candidate)
    ? candidate
    : fallback;
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function weight(value: unknown, fallback: number) {
  return boundedInteger(value, fallback, 300, 800);
}

function productTheme(
  incoming: unknown,
  fallback: WedPlannedPublicTheme["products"][WedPlannedProductThemeKey],
) {
  const value = object(incoming);

  return {
    accentColour: colour(
      value.accentColour,
      fallback.accentColour,
    ),
    wordmarkUrl: assetUrl(
      value.wordmarkUrl,
      fallback.wordmarkUrl,
    ),
    compactWordmarkUrl: assetUrl(
      value.compactWordmarkUrl,
      fallback.compactWordmarkUrl,
    ),
    logoWidthPx: boundedInteger(
      value.logoWidthPx,
      fallback.logoWidthPx,
      40,
      320,
    ),
    compactLogoWidthPx: boundedInteger(
      value.compactLogoWidthPx,
      fallback.compactLogoWidthPx,
      32,
      220,
    ),
  };
}

export function normaliseWedPlannedPublicTheme(
  incoming: unknown,
): WedPlannedPublicTheme {
  const value = object(incoming);
  const branding = object(value.branding);
  const typography = object(value.typography);
  const colours = object(value.colours);
  const layout = object(value.layout);
  const behaviour = object(value.behaviour);
  const products = object(value.products);

  const fallback = DEFAULT_WEDPLANNED_PUBLIC_THEME;

  return {
    schemaVersion: WEDPLANNED_PUBLIC_THEME_SCHEMA_VERSION,

    branding: {
      lightWordmarkUrl: assetUrl(
        branding.lightWordmarkUrl,
        fallback.branding.lightWordmarkUrl,
      ),
      darkWordmarkUrl: assetUrl(
        branding.darkWordmarkUrl,
        fallback.branding.darkWordmarkUrl,
      ),
      mobileWordmarkUrl: assetUrl(
        branding.mobileWordmarkUrl,
        fallback.branding.mobileWordmarkUrl,
      ),
      iconUrl: assetUrl(
        branding.iconUrl,
        fallback.branding.iconUrl,
      ),
      faviconUrl: assetUrl(
        branding.faviconUrl,
        fallback.branding.faviconUrl,
      ),
      socialImageUrl: assetUrl(
        branding.socialImageUrl,
        fallback.branding.socialImageUrl,
      ),

      desktopLogoWidthPx: boundedInteger(
        branding.desktopLogoWidthPx,
        fallback.branding.desktopLogoWidthPx,
        60,
        420,
      ),
      mobileLogoWidthPx: boundedInteger(
        branding.mobileLogoWidthPx,
        fallback.branding.mobileLogoWidthPx,
        48,
        300,
      ),
      footerLogoWidthPx: boundedInteger(
        branding.footerLogoWidthPx,
        fallback.branding.footerLogoWidthPx,
        60,
        420,
      ),
    },

    typography: {
      bodyFont: font(
        typography.bodyFont,
        fallback.typography.bodyFont,
      ),
      headingFont: font(
        typography.headingFont,
        fallback.typography.headingFont,
      ),
      displayFont: font(
        typography.displayFont,
        fallback.typography.displayFont,
      ),

      bodyDesktopPx: boundedNumber(
        typography.bodyDesktopPx,
        fallback.typography.bodyDesktopPx,
        10,
        24,
      ),
      bodyMobilePx: boundedNumber(
        typography.bodyMobilePx,
        fallback.typography.bodyMobilePx,
        10,
        24,
      ),

      navigationDesktopPx: boundedNumber(
        typography.navigationDesktopPx,
        fallback.typography.navigationDesktopPx,
        9,
        22,
      ),
      navigationMobilePx: boundedNumber(
        typography.navigationMobilePx,
        fallback.typography.navigationMobilePx,
        9,
        22,
      ),
      buttonPx: boundedNumber(
        typography.buttonPx,
        fallback.typography.buttonPx,
        9,
        22,
      ),
      metaPx: boundedNumber(
        typography.metaPx,
        fallback.typography.metaPx,
        8,
        18,
      ),

      h1DesktopPx: boundedNumber(
        typography.h1DesktopPx,
        fallback.typography.h1DesktopPx,
        32,
        110,
      ),
      h1MobilePx: boundedNumber(
        typography.h1MobilePx,
        fallback.typography.h1MobilePx,
        28,
        80,
      ),
      h2DesktopPx: boundedNumber(
        typography.h2DesktopPx,
        fallback.typography.h2DesktopPx,
        24,
        80,
      ),
      h2MobilePx: boundedNumber(
        typography.h2MobilePx,
        fallback.typography.h2MobilePx,
        22,
        64,
      ),
      h3DesktopPx: boundedNumber(
        typography.h3DesktopPx,
        fallback.typography.h3DesktopPx,
        16,
        48,
      ),
      h3MobilePx: boundedNumber(
        typography.h3MobilePx,
        fallback.typography.h3MobilePx,
        16,
        42,
      ),

      bodyWeight: weight(
        typography.bodyWeight,
        fallback.typography.bodyWeight,
      ),
      navigationWeight: weight(
        typography.navigationWeight,
        fallback.typography.navigationWeight,
      ),
      buttonWeight: weight(
        typography.buttonWeight,
        fallback.typography.buttonWeight,
      ),
      headingWeight: weight(
        typography.headingWeight,
        fallback.typography.headingWeight,
      ),

      bodyLineHeight: boundedNumber(
        typography.bodyLineHeight,
        fallback.typography.bodyLineHeight,
        1,
        2.2,
      ),
      headingLineHeight: boundedNumber(
        typography.headingLineHeight,
        fallback.typography.headingLineHeight,
        0.85,
        1.6,
      ),

      headingLetterSpacingEm: boundedNumber(
        typography.headingLetterSpacingEm,
        fallback.typography.headingLetterSpacingEm,
        -0.12,
        0.12,
      ),
      navigationLetterSpacingEm: boundedNumber(
        typography.navigationLetterSpacingEm,
        fallback.typography.navigationLetterSpacingEm,
        -0.08,
        0.2,
      ),
    },

    colours: {
      pageBackground: colour(
        colours.pageBackground,
        fallback.colours.pageBackground,
      ),
      sectionBackground: colour(
        colours.sectionBackground,
        fallback.colours.sectionBackground,
      ),
      alternateSectionBackground: colour(
        colours.alternateSectionBackground,
        fallback.colours.alternateSectionBackground,
      ),
      darkSectionBackground: colour(
        colours.darkSectionBackground,
        fallback.colours.darkSectionBackground,
      ),

      text: colour(
        colours.text,
        fallback.colours.text,
      ),
      mutedText: colour(
        colours.mutedText,
        fallback.colours.mutedText,
      ),
      border: colour(
        colours.border,
        fallback.colours.border,
      ),

      headerBackground: colour(
        colours.headerBackground,
        fallback.colours.headerBackground,
      ),
      headerText: colour(
        colours.headerText,
        fallback.colours.headerText,
      ),
      headerActiveText: colour(
        colours.headerActiveText,
        fallback.colours.headerActiveText,
      ),

      mobileMenuBackground: colour(
        colours.mobileMenuBackground,
        fallback.colours.mobileMenuBackground,
      ),
      mobileMenuText: colour(
        colours.mobileMenuText,
        fallback.colours.mobileMenuText,
      ),
      mobileMenuActiveText: colour(
        colours.mobileMenuActiveText,
        fallback.colours.mobileMenuActiveText,
      ),

      primaryButtonBackground: colour(
        colours.primaryButtonBackground,
        fallback.colours.primaryButtonBackground,
      ),
      primaryButtonText: colour(
        colours.primaryButtonText,
        fallback.colours.primaryButtonText,
      ),
      primaryButtonBorder: colour(
        colours.primaryButtonBorder,
        fallback.colours.primaryButtonBorder,
      ),

      secondaryButtonBackground: colour(
        colours.secondaryButtonBackground,
        fallback.colours.secondaryButtonBackground,
      ),
      secondaryButtonText: colour(
        colours.secondaryButtonText,
        fallback.colours.secondaryButtonText,
      ),
      secondaryButtonBorder: colour(
        colours.secondaryButtonBorder,
        fallback.colours.secondaryButtonBorder,
      ),

      cardBackground: colour(
        colours.cardBackground,
        fallback.colours.cardBackground,
      ),
      cardText: colour(
        colours.cardText,
        fallback.colours.cardText,
      ),
      cardMutedText: colour(
        colours.cardMutedText,
        fallback.colours.cardMutedText,
      ),
      cardBorder: colour(
        colours.cardBorder,
        fallback.colours.cardBorder,
      ),

      heroBackground: colour(
        colours.heroBackground,
        fallback.colours.heroBackground,
      ),
      heroText: colour(
        colours.heroText,
        fallback.colours.heroText,
      ),
      heroMutedText: colour(
        colours.heroMutedText,
        fallback.colours.heroMutedText,
      ),

      footerBackground: colour(
        colours.footerBackground,
        fallback.colours.footerBackground,
      ),
      footerText: colour(
        colours.footerText,
        fallback.colours.footerText,
      ),
      footerMutedText: colour(
        colours.footerMutedText,
        fallback.colours.footerMutedText,
      ),
    },

    layout: {
      contentWidthPx: boundedInteger(
        layout.contentWidthPx,
        fallback.layout.contentWidthPx,
        760,
        1600,
      ),

      desktopSectionSpacingPx: boundedInteger(
        layout.desktopSectionSpacingPx,
        fallback.layout.desktopSectionSpacingPx,
        32,
        180,
      ),
      mobileSectionSpacingPx: boundedInteger(
        layout.mobileSectionSpacingPx,
        fallback.layout.mobileSectionSpacingPx,
        24,
        120,
      ),

      desktopHorizontalPaddingPx: boundedInteger(
        layout.desktopHorizontalPaddingPx,
        fallback.layout.desktopHorizontalPaddingPx,
        12,
        80,
      ),
      mobileHorizontalPaddingPx: boundedInteger(
        layout.mobileHorizontalPaddingPx,
        fallback.layout.mobileHorizontalPaddingPx,
        10,
        40,
      ),

      cardGapPx: boundedInteger(
        layout.cardGapPx,
        fallback.layout.cardGapPx,
        4,
        60,
      ),
      cardRadiusPx: boundedInteger(
        layout.cardRadiusPx,
        fallback.layout.cardRadiusPx,
        0,
        40,
      ),
      buttonRadiusPx: boundedInteger(
        layout.buttonRadiusPx,
        fallback.layout.buttonRadiusPx,
        0,
        40,
      ),
      heroRadiusPx: boundedInteger(
        layout.heroRadiusPx,
        fallback.layout.heroRadiusPx,
        0,
        60,
      ),

      headerHeightPx: boundedInteger(
        layout.headerHeightPx,
        fallback.layout.headerHeightPx,
        52,
        110,
      ),

      cardShadowStrength: boundedInteger(
        layout.cardShadowStrength,
        fallback.layout.cardShadowStrength,
        0,
        3,
      ) as WedPlannedShadowStrength,
    },

    behaviour: {
      stickyHeader: bool(
        behaviour.stickyHeader,
        fallback.behaviour.stickyHeader,
      ),
      headerOpacityPercent: boundedInteger(
        behaviour.headerOpacityPercent,
        fallback.behaviour.headerOpacityPercent,
        60,
        100,
      ),
      headerBlurPx: boundedInteger(
        behaviour.headerBlurPx,
        fallback.behaviour.headerBlurPx,
        0,
        30,
      ),
      enableCardHoverLift: bool(
        behaviour.enableCardHoverLift,
        fallback.behaviour.enableCardHoverLift,
      ),
    },

    products: PRODUCT_KEYS.reduce(
      (result, key) => {
        result[key] = productTheme(
          products[key],
          fallback.products[key],
        );

        return result;
      },
      {} as WedPlannedPublicTheme["products"],
    ),
  };
}

export function cloneDefaultWedPlannedPublicTheme() {
  return normaliseWedPlannedPublicTheme(
    DEFAULT_WEDPLANNED_PUBLIC_THEME,
  );
}

export function wedPlannedFontOption(
  key: WedPlannedFontKey,
) {
  return WEDPLANNED_PUBLIC_FONT_OPTIONS.find(
    (option) => option.key === key,
  ) || WEDPLANNED_PUBLIC_FONT_OPTIONS[0];
}
