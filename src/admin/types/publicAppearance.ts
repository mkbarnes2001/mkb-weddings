import type {
  WedPlannedPublicTheme,
} from "../../shared/wedplannedPublicAppearance";

export type WedPlannedPublicAppearanceVersion = {
  id: string;
  version: number;
  theme: WedPlannedPublicTheme;
  publishedByEmail: string;
  createdAt: string;
};

export type WedPlannedPublicAppearanceAdministration = {
  siteKey: "wedplanned";
  draftTheme: WedPlannedPublicTheme;
  publishedTheme: WedPlannedPublicTheme;
  publishedVersion: number;
  updatedByEmail: string;
  publishedByEmail: string;
  updatedAt: string;
  publishedAt: string;
  versions: WedPlannedPublicAppearanceVersion[];
};

export type {
  WedPlannedPublicTheme,
};
