import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, Building2, Check, ChevronDown, ChevronRight, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminModuleWordmark } from "../components/ui/AdminUI";
import { AdminApiService } from "../services/AdminApiService";
import type { PlatformBrandingIdentity, PlatformModuleConfiguration } from "../types/platform";
import {
  adminModules,
  defaultAdminModuleConfigurations,
  isAdminNavigationItemActive,
  isWeddingWorkspacePath,
  platformAdminItems,
  resolveAdminModule,
  resolveAdminModuleAppearance,
  resolveAdminModuleIcon,
  resolveAdminNavigationItem,
  resolvePlatformAdminNavigationItem,
  visibleModuleItems,
} from "../navigation/adminModules";

const DEFAULT_PLATFORM_IDENTITY: PlatformBrandingIdentity = {
  platformName: "WedPlanned",
  wordmarkUrl: "",
  darkWordmarkUrl: "",
  compactWordmarkUrl: "",
  iconUrl: "",
  adminFontScale: 100,
  adminHeadingFontScale: 100,
  adminButtonFontScale: 100,
  adminNavigationFontScale: 100,
  adminMetaFontScale: 100,
  pageHeaderLogoScale: 100,
  sidebarLogoScale: 100,
  mobileLogoScale: 100,
};

type BrandingUpdatedDetail = {
  modules: PlatformModuleConfiguration[];
  platformIdentity: PlatformBrandingIdentity;
};

function ModuleGlyph({ configuration, Icon }: { configuration: PlatformModuleConfiguration; Icon: typeof ShieldCheck }) {
  if (configuration.markUrl) return <img src={configuration.markUrl} alt="" aria-hidden="true" className="admin-module-mark" />;
  return <Icon />;
}

function PlatformIdentityAsset({
  identity,
  variant,
}: {
  identity: PlatformBrandingIdentity;
  variant: "desktop" | "compact" | "icon";
}) {
  const source = variant === "desktop"
    ? identity.darkWordmarkUrl
      || identity.wordmarkUrl
      || identity.compactWordmarkUrl
      || identity.iconUrl
    : variant === "compact"
      ? identity.compactWordmarkUrl
        || identity.wordmarkUrl
      : identity.iconUrl
        || identity.compactWordmarkUrl
        || identity.wordmarkUrl;

  if (source) {
    return (
      <img
        src={source}
        alt={identity.platformName}
        className={`admin-platform-identity-asset admin-platform-identity-asset--${variant}`}
      />
    );
  }

  if (variant === "icon") {
    return (
      <span
        className="admin-platform-identity-fallback"
        aria-label={identity.platformName}
      >
        {initials(identity.platformName)}
      </span>
    );
  }

  return (
    <AdminModuleWordmark
      label={identity.platformName}
      className={`admin-platform-identity-fallback-wordmark admin-platform-identity-fallback-wordmark--${variant}`}
    />
  );
}

function ModuleIdentityWordmark({
  configuration,
  label,
  compact = false,
}: {
  configuration: PlatformModuleConfiguration;
  label: string;
  compact?: boolean;
}) {
  const source = compact
    ? configuration.compactWordmarkUrl
      || configuration.darkWordmarkUrl
      || configuration.wordmarkUrl
    : configuration.darkWordmarkUrl
      || configuration.wordmarkUrl;

  if (source) {
    return (
      <img
        src={source}
        alt={label}
        className={`admin-module-wordmark-asset ${
          compact
            ? "admin-module-wordmark-asset--compact"
            : "admin-module-wordmark-asset--desktop"
        }`}
      />
    );
  }

  return <AdminModuleWordmark label={label} />;
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part.trim().slice(0, 1))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "WP";
}

export function AdminLayout() {
  const { auth, signOut, switchWorkspace } = useProfessionalAuth();
  const location = useLocation();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaceLogoUrl, setWorkspaceLogoUrl] = useState("");
  const [platformIdentity, setPlatformIdentity] =
    useState<PlatformBrandingIdentity>(DEFAULT_PLATFORM_IDENTITY);
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null);
  const [moduleConfigurations, setModuleConfigurations] = useState<PlatformModuleConfiguration[]>(defaultAdminModuleConfigurations);
  const isPlatformRoute = location.pathname === "/admin/platform" || location.pathname.startsWith("/admin/platform/");
  const currentModule = resolveAdminModule(location.pathname);
  const currentAppearance = resolveAdminModuleAppearance(currentModule.key, moduleConfigurations);
  const CurrentModuleIcon = resolveAdminModuleIcon(currentModule, currentAppearance);
  const normalModuleItems = visibleModuleItems(currentModule, auth.permissions);
  const navItems = isPlatformRoute ? platformAdminItems : normalModuleItems;
  const currentItem = isPlatformRoute
    ? resolvePlatformAdminNavigationItem(location.pathname, location.search)
    : resolveAdminNavigationItem(currentModule, location.pathname, location.search, auth.permissions);
  const currentSectionLabel = isWeddingWorkspacePath(location.pathname) ? "Wedding Workspace" : currentItem?.label || "Detail";
  const currentContextLabel = isPlatformRoute ? "Platform administration" : currentModule.label;
  const ContextIcon = isPlatformRoute ? ShieldCheck : CurrentModuleIcon;
  const isPlatformAdmin = auth.platformRole === "platform_admin";
  const userType = isPlatformAdmin
    ? "Platform administrator"
    : auth.accessMode === "support"
      ? `${auth.supportScope || "read"} support`
      : (auth.role || "member").replace(/_/g, " ");

  const crmMobilePrimary = [
    { key: "clients", label: "Clients" },
    { key: "leads", label: "Leads" },
    { key: "jobs", label: "Jobs" },
    { key: "schedule", label: "Schedule" },
  ];
  const mobileItems = isPlatformRoute
    ? platformAdminItems.filter((item) => item.mobilePrimary).slice(0, 4)
    : currentModule.key === "crm"
      ? crmMobilePrimary.map(({ key }) => normalModuleItems.find((item) => item.key === key)).filter((item): item is NonNullable<typeof item> => Boolean(item))
      : normalModuleItems.filter((item) => item.mobilePrimary).slice(0, 4);

  useEffect(() => {
    let active = true;

    AdminApiService.getWedPlannedPlatform()
      .then((platform) => {
        if (!active) return;

        if (platform.moduleConfigurations?.length) {
          setModuleConfigurations(platform.moduleConfigurations);
        }

        setPlatformIdentity(
          platform.platformIdentity || DEFAULT_PLATFORM_IDENTITY,
        );
        setWorkspaceLogoUrl(platform.business.logoUrl || "");
      })
      .catch(() => {
        if (!active) return;

        setModuleConfigurations(defaultAdminModuleConfigurations);
        setPlatformIdentity(DEFAULT_PLATFORM_IDENTITY);
        setWorkspaceLogoUrl("");
      });

    return () => {
      active = false;
    };
  }, [auth.workspaceId]);

  useEffect(() => {
    const applyBrandingUpdate = (event: Event) => {
      const detail = (
        event as CustomEvent<BrandingUpdatedDetail>
      ).detail;

      if (!detail) return;

      if (detail.modules?.length) {
        setModuleConfigurations(
          detail.modules.map((module) => ({ ...module })),
        );
      }

      if (detail.platformIdentity) {
        setPlatformIdentity({ ...detail.platformIdentity });
      }
    };

    window.addEventListener(
      "wedplanned:branding-updated",
      applyBrandingUpdate,
    );

    return () => {
      window.removeEventListener(
        "wedplanned:branding-updated",
        applyBrandingUpdate,
      );
    };
  }, []);

  useEffect(() => {
    document.title = `${currentSectionLabel} · ${currentContextLabel} · ${isPlatformRoute ? platformIdentity.platformName : auth.businessName || platformIdentity.platformName}`;
    setMobileMoreOpen(false);
    setWorkspaceMenuOpen(false);
  }, [auth.businessName, currentContextLabel, currentSectionLabel, isPlatformRoute, location.pathname, location.search, platformIdentity.platformName]);

  useEffect(() => {
    if (!workspaceMenuOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (!workspaceMenuRef.current?.contains(event.target as Node)) setWorkspaceMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWorkspaceMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [workspaceMenuOpen]);

  const accent = isPlatformRoute ? "#0F172A" : currentAppearance.accentColor;
  const pageBackground = isPlatformRoute ? "#F4F5F7" : currentAppearance.pageBackgroundColor;
  const sectionBackground = isPlatformRoute ? "#FFFFFF" : currentAppearance.sectionBackgroundColor;
  const recordBackground = isPlatformRoute ? "#FFFFFF" : currentAppearance.recordBackgroundColor;

  const globalFontScale =
    (platformIdentity.adminFontScale || 100) / 100;

  const baseFontScale = globalFontScale;

  const headingFontScale =
    baseFontScale
    * ((platformIdentity.adminHeadingFontScale || 100) / 100);

  const buttonFontScale =
    baseFontScale
    * ((platformIdentity.adminButtonFontScale || 100) / 100);

  const navigationFontScale =
    baseFontScale
    * ((platformIdentity.adminNavigationFontScale || 100) / 100);

  const metaFontScale =
    baseFontScale
    * ((platformIdentity.adminMetaFontScale || 100) / 100);

  const pageHeaderLogoScale =
    ((platformIdentity.pageHeaderLogoScale || 100) / 100)
    * (isPlatformRoute
      ? 1
      : (currentAppearance.pageHeaderLogoScale || 100) / 100);

  const sidebarLogoScale =
    ((platformIdentity.sidebarLogoScale || 100) / 100)
    * (isPlatformRoute
      ? 1
      : (currentAppearance.sidebarLogoScale || 100) / 100);

  const mobileLogoScale =
    ((platformIdentity.mobileLogoScale || 100) / 100)
    * (isPlatformRoute
      ? 1
      : (currentAppearance.mobileLogoScale || 100) / 100);

  const shellStyle = {
    "--admin-module-accent": accent,
    "--admin-module-accent-soft": `color-mix(in srgb, ${accent} 14%, transparent)`,
    "--admin-module-page-background": pageBackground,
    "--admin-module-section-background": sectionBackground,
    "--admin-module-record-background": recordBackground,

    "--admin-font-scale-effective": baseFontScale,
    "--admin-heading-scale-effective": headingFontScale,
    "--admin-button-scale-effective": buttonFontScale,
    "--admin-navigation-scale-effective": navigationFontScale,
    "--admin-meta-scale-effective": metaFontScale,

    "--admin-page-header-logo-scale-effective": pageHeaderLogoScale,
    "--admin-sidebar-logo-scale-effective": sidebarLogoScale,
    "--admin-mobile-logo-scale-effective": mobileLogoScale,

    "--admin-desktop-nav-background-color":
      currentAppearance.desktopNavBackgroundColor || "#111111",
    "--admin-desktop-nav-text-color":
      currentAppearance.desktopNavTextColor || "#FFFFFF",
    "--admin-desktop-nav-button-color":
      currentAppearance.desktopNavButtonColor || "#191919",
    "--admin-desktop-nav-active-color":
      currentAppearance.desktopNavActiveColor || accent,
    "--admin-desktop-nav-active-text-color":
      currentAppearance.desktopNavActiveTextColor || "#FFFFFF",

    "--admin-mobile-nav-background-color":
      currentAppearance.mobileNavBackgroundColor || "#FFFFFF",
    "--admin-mobile-nav-text-color":
      currentAppearance.mobileNavTextColor || "#222222",
    "--admin-mobile-nav-button-color":
      currentAppearance.mobileNavButtonColor || "#FAF9F7",
    "--admin-mobile-nav-active-color":
      currentAppearance.mobileNavActiveColor || accent,
    "--admin-mobile-nav-active-text-color":
      currentAppearance.mobileNavActiveTextColor || "#FFFFFF",

    "--admin-bg": pageBackground,
    "--admin-surface": sectionBackground,
    backgroundColor: pageBackground,
  } as CSSProperties;
  const activeButtonStyle = isPlatformRoute ? "solid" : currentAppearance.activeButtonStyle;
  const panelAccentStyle = isPlatformRoute ? "header" : currentAppearance.panelAccentStyle;

  const activeBusinessName = auth.businessName || "MKB Weddings";
  const workspaceTriggerLabel = isPlatformRoute
    ? `${platformIdentity.platformName} platform`
    : activeBusinessName;
  const workspaceTriggerDetail = isPlatformRoute
    ? activeBusinessName
    : userType;
  const userName = auth.displayName
    || auth.email
    || `${platformIdentity.platformName} user`;

  async function chooseWorkspace(workspaceId: string) {
    setWorkspaceMenuOpen(false);
    if (workspaceId === auth.workspaceId) return;
    await switchWorkspace(workspaceId);
  }

  return (
    <div
      className={`admin-shell min-h-screen text-neutral-950 ${isPlatformRoute ? "admin-shell--platform" : ""}`}
      style={shellStyle}
      data-active-button-style={activeButtonStyle}
      data-panel-accent={panelAccentStyle}
      data-desktop-nav-background-custom={
        !isPlatformRoute && Boolean(currentAppearance.desktopNavBackgroundColor)
          ? "true"
          : "false"
      }
      data-desktop-nav-text-custom={
        !isPlatformRoute && Boolean(currentAppearance.desktopNavTextColor)
          ? "true"
          : "false"
      }
      data-desktop-nav-button-custom={
        !isPlatformRoute && Boolean(currentAppearance.desktopNavButtonColor)
          ? "true"
          : "false"
      }
      data-desktop-nav-active-custom={
        !isPlatformRoute && Boolean(currentAppearance.desktopNavActiveColor)
          ? "true"
          : "false"
      }
      data-desktop-nav-active-text-custom={
        !isPlatformRoute && Boolean(currentAppearance.desktopNavActiveTextColor)
          ? "true"
          : "false"
      }
      data-mobile-nav-background-custom={
        !isPlatformRoute && Boolean(currentAppearance.mobileNavBackgroundColor)
          ? "true"
          : "false"
      }
      data-mobile-nav-text-custom={
        !isPlatformRoute && Boolean(currentAppearance.mobileNavTextColor)
          ? "true"
          : "false"
      }
      data-mobile-nav-button-custom={
        !isPlatformRoute && Boolean(currentAppearance.mobileNavButtonColor)
          ? "true"
          : "false"
      }
      data-mobile-nav-active-custom={
        !isPlatformRoute && Boolean(currentAppearance.mobileNavActiveColor)
          ? "true"
          : "false"
      }
      data-mobile-nav-active-text-custom={
        !isPlatformRoute && Boolean(currentAppearance.mobileNavActiveTextColor)
          ? "true"
          : "false"
      }
    >
      <div className="admin-layout-grid">
        <aside
            className="admin-sidebar border-r border-black"
            style={{
              backgroundColor: "var(--admin-desktop-nav-background-color)",
              color: "var(--admin-desktop-nav-text-color)",
            }}
          >
          <div className="admin-sidebar-identity border-b border-white/10 px-4 py-4">
            <Link
              to={isPlatformRoute ? "/admin/platform" : "/admin"}
              className="admin-sidebar-brand"
              aria-label={
                isPlatformRoute
                  ? "Open Platform overview"
                  : "Open WedNav overview"
              }
            >
              <PlatformIdentityAsset
                identity={platformIdentity}
                variant="desktop"
              />
            </Link>

            <div ref={workspaceMenuRef} className={`admin-workspace-menu ${isPlatformRoute ? "admin-workspace-menu--platform" : ""}`}>
              <button
                type="button"
                className="admin-workspace-menu__trigger"
                aria-haspopup="menu"
                aria-expanded={workspaceMenuOpen}
                onClick={() => setWorkspaceMenuOpen((current) => !current)}
              >
                <span className="admin-workspace-menu__mark">
                  {workspaceLogoUrl ? <img src={workspaceLogoUrl} alt="" /> : <span>{initials(activeBusinessName)}</span>}
                </span>
                <span className="admin-workspace-menu__trigger-copy">
                  <strong>{workspaceTriggerLabel}</strong>
                  <small>{workspaceTriggerDetail}</small>
                </span>
                <ChevronDown className={workspaceMenuOpen ? "open" : ""} aria-hidden="true" />
              </button>

              {workspaceMenuOpen ? <div className="admin-workspace-menu__flyout" role="menu" aria-label="Workspace and account">
                <header className="admin-workspace-menu__identity">
                  <span className="admin-workspace-menu__avatar">{initials(userName)}</span>
                  <div>
                    <strong>{userName}</strong>
                    <small>{auth.email}</small>
                    <em>{userType}</em>
                  </div>
                </header>

                <section className="admin-workspace-menu__section">
                  <p>Companies</p>
                  <div className="admin-workspace-menu__companies">
                    {auth.memberships.map((membership) => {
                      const active = membership.workspaceId === auth.workspaceId;
                      const membershipDetail = membership.accessMode === "support"
                        ? `${membership.supportScope || "read"} support`
                        : (membership.role || "member").replace(/_/g, " ");
                      return <button key={membership.id || membership.workspaceId} type="button" role="menuitem" className={active ? "active" : ""} onClick={() => void chooseWorkspace(membership.workspaceId)}>
                        <span className="admin-workspace-menu__company-mark">{initials(membership.businessName)}</span>
                        <span><strong>{membership.businessName}</strong><small>{membershipDetail}</small></span>
                        {active ? <Check aria-label="Current business" /> : null}
                      </button>;
                    })}
                  </div>
                </section>

                {isPlatformAdmin ? <section className="admin-workspace-menu__section">
                  <p>Administration</p>
                  <Link role="menuitem" to={isPlatformRoute ? "/admin" : "/admin/platform"} onClick={() => setWorkspaceMenuOpen(false)} className="admin-workspace-menu__admin-link">
                    {isPlatformRoute ? <ArrowLeft /> : <ShieldCheck />}
                    <span><strong>{isPlatformRoute ? "Business workspace" : "Platform administration"}</strong><small>{isPlatformRoute ? "Return to the active company" : "Global businesses, modules and access"}</small></span>
                  </Link>
                </section> : null}

                {auth.authenticated ? <button type="button" role="menuitem" className="admin-workspace-menu__signout" onClick={() => { setWorkspaceMenuOpen(false); void signOut(); }}><LogOut /><span>Sign out</span></button> : null}
              </div> : null}
            </div>
          </div>

          {!isPlatformRoute ? <div className="admin-module-switcher-wrap border-b border-white/10 p-3">
            <p className="admin-sidebar-section-label">Modules</p>
            <div className="admin-module-switcher" aria-label="Application modules">
              {adminModules.map((module) => {
                const appearance = resolveAdminModuleAppearance(module.key, moduleConfigurations);
                const Icon = resolveAdminModuleIcon(module, appearance);
                const active = module.key === currentModule.key;
                return <Link key={module.key} to={module.to} className={`admin-module-link ${active ? "admin-module-link--active" : ""}`} aria-current={active ? "page" : undefined} style={{ "--module-link-accent": appearance.accentColor } as CSSProperties}><ModuleGlyph configuration={appearance} Icon={Icon} /><ModuleIdentityWordmark configuration={appearance} label={module.shortLabel} /></Link>;
              })}
            </div>
          </div> : null}

          <nav className="admin-module-navigation min-h-0 flex-1 overflow-y-auto p-3" aria-label={`${currentContextLabel} navigation`}>
            <div className="admin-module-navigation__header"><ContextIcon /><div><strong>{isPlatformRoute ? currentContextLabel : <ModuleIdentityWordmark configuration={currentAppearance} label={currentModule.label} />}</strong><span>{isPlatformRoute ? "Global businesses, taxonomy, modules, assets, operations and access" : currentModule.description}</span></div></div>
            <div className="admin-module-navigation__items mt-3" data-layout="list">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isAdminNavigationItemActive(item, location.pathname, location.search);
                return <Link key={item.key} to={item.to} className={`admin-nav-link ${active ? "admin-nav-link--active" : ""}`} aria-current={active ? "page" : undefined}><span className="admin-nav-link__icon" aria-hidden="true"><Icon strokeWidth={1.65} /></span><span className="whitespace-nowrap">{item.label}</span></Link>;
              })}
            </div>
          </nav>
        </aside>

        <section className="admin-main-region">
          <header className="admin-topbar admin-mobile-header">
            <div className="admin-mobile-header__inner">
              <span className="admin-mobile-platform-mark">
                <PlatformIdentityAsset
                  identity={platformIdentity}
                  variant="icon"
                />
              </span>
              <div className="admin-mobile-header__workspace">
                <strong>
                  {isPlatformRoute ? (
                    <PlatformIdentityAsset
                      identity={platformIdentity}
                      variant="compact"
                    />
                  ) : auth.businessName || "MKB Weddings"}
                </strong>
                <span>
                  {currentContextLabel} · {currentSectionLabel}
                </span>
              </div>
              <button type="button" onClick={() => setMobileMoreOpen(true)} aria-label="Open Admin menu"><Menu /></button>
            </div>
          </header>

          <main className="admin-main-content">
            <div className="admin-context-bar" aria-label="Breadcrumb">
              <Link to={isPlatformRoute ? "/admin/platform" : currentModule.to}><ContextIcon />{currentContextLabel}</Link>
              <ChevronRight aria-hidden="true" />
              <span>{currentSectionLabel}</span>
            </div>
            <Outlet
              context={{
                moduleAppearance: currentAppearance,
                moduleLabel: currentModule.label,
                platformIdentity,
                isPlatformRoute,
              }}
            />
          </main>

          {mobileMoreOpen ? <div className="admin-mobile-more" role="dialog" aria-modal="true" aria-label="Admin navigation"><button className="admin-mobile-more__backdrop" type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close menu"></button><section><header><div><strong>{currentContextLabel}</strong><span>{isPlatformRoute ? `${platformIdentity.platformName} platform` : auth.businessName}</span></div><button type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close menu"><X /></button></header>{!isPlatformRoute ? <div className="admin-mobile-module-switcher">{adminModules.map((module) => { const appearance = resolveAdminModuleAppearance(module.key, moduleConfigurations); const Icon = resolveAdminModuleIcon(module, appearance); const active = module.key === currentModule.key; return <Link key={module.key} to={module.to} onClick={() => setMobileMoreOpen(false)} className={active ? "active" : ""} style={{ "--module-link-accent": appearance.accentColor } as CSSProperties}><ModuleGlyph configuration={appearance} Icon={Icon} /><ModuleIdentityWordmark configuration={appearance} label={module.shortLabel} compact /></Link>; })}</div> : null}<nav>{navItems.map((item) => { const Icon = item.icon; const active = isAdminNavigationItemActive(item, location.pathname, location.search); return <Link key={item.key} to={item.to} onClick={() => setMobileMoreOpen(false)} className={active ? "active" : ""}><Icon /><span>{item.label}</span></Link>; })}</nav><footer className="admin-mobile-control-footer">{isPlatformAdmin ? <Link to={isPlatformRoute ? "/admin" : "/admin/platform"} onClick={() => setMobileMoreOpen(false)}><ShieldCheck />{isPlatformRoute ? "Business workspace" : "Platform administration"}</Link> : null}{auth.authenticated ? <div className="admin-mobile-control-footer__user"><span><strong>{auth.displayName || auth.email}</strong><small>{userType}</small></span><button type="button" onClick={() => void signOut()} title="Sign out" aria-label="Sign out"><LogOut /></button></div> : null}</footer></section></div> : null}

          <nav className="admin-mobile-bottom-nav" aria-label={`${currentContextLabel} primary navigation`}>
            {mobileItems.map((item) => { const Icon = item.icon; const active = isAdminNavigationItemActive(item, location.pathname, location.search); return <Link key={item.key} to={item.to} className={active ? "active" : ""}><Icon /><span>{item.label}</span></Link>; })}
            <button type="button" onClick={() => setMobileMoreOpen(true)} className={mobileMoreOpen ? "active" : ""}><Menu /><span>More</span></button>
          </nav>
        </section>
      </div>
    </div>
  );
}
