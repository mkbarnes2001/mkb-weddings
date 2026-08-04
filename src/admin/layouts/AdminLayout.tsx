import { useEffect, useState, type CSSProperties } from "react";
import { ArrowLeft, ChevronRight, FileText, Globe2, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { PlatformModuleConfiguration } from "../types/platform";
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

function ModuleGlyph({ configuration, Icon }: { configuration: PlatformModuleConfiguration; Icon: typeof ShieldCheck }) {
  if (configuration.markUrl) return <img src={configuration.markUrl} alt="" aria-hidden="true" className="admin-module-mark" />;
  return <Icon />;
}

export function AdminLayout() {
  const { auth, signOut, switchWorkspace } = useProfessionalAuth();
  const location = useLocation();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
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
  const sessionLabel = auth.mode === "bootstrap"
    ? "Setup mode · authentication not enforced"
    : auth.accessMode === "support"
      ? `${auth.supportScope || "read"} support · time bounded`
      : `${auth.role || "member"} · secure session`;

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
        if (active && platform.moduleConfigurations?.length) setModuleConfigurations(platform.moduleConfigurations);
      })
      .catch(() => {
        if (active) setModuleConfigurations(defaultAdminModuleConfigurations);
      });
    return () => { active = false; };
  }, [auth.workspaceId]);

  useEffect(() => {
    document.title = `${currentSectionLabel} · ${currentContextLabel} · ${isPlatformRoute ? "WedPlanned" : auth.businessName || "WedPlanned"}`;
    setMobileMoreOpen(false);
  }, [auth.businessName, currentContextLabel, currentSectionLabel, isPlatformRoute, location.pathname, location.search]);

  const accent = isPlatformRoute ? "#0F172A" : currentAppearance.accentColor;
  const shellStyle = {
    "--admin-module-accent": accent,
    "--admin-module-accent-soft": `color-mix(in srgb, ${accent} 14%, transparent)`,
  } as CSSProperties;
  const activeButtonStyle = isPlatformRoute ? "solid" : currentAppearance.activeButtonStyle;
  const panelAccentStyle = isPlatformRoute ? "header" : currentAppearance.panelAccentStyle;

  return (
    <div
      className={`admin-shell min-h-screen bg-[#f5f3ef] text-neutral-950 ${isPlatformRoute ? "admin-shell--platform" : ""}`}
      style={shellStyle}
      data-active-button-style={activeButtonStyle}
      data-panel-accent={panelAccentStyle}
    >
      <div className="admin-layout-grid">
        <aside className="admin-sidebar flex flex-col border-r border-black" style={{ backgroundColor: "#111111", color: "#ffffff" }}>
          <div className="admin-sidebar-identity border-b border-white/10 px-4 py-4">
            <Link to={isPlatformRoute ? "/admin/platform" : "/admin"} className="admin-sidebar-brand" aria-label={isPlatformRoute ? "Open Platform overview" : "Open Website overview"}>
              <img src="/favicon-32x32.png" alt="MKB Weddings" />
            </Link>
            <div className={`mt-3 rounded-xl border px-3 py-3 ${isPlatformRoute ? "admin-platform-identity-card" : "border-white/10 bg-white/[0.04]"}`}>
              <p className="text-[9px] uppercase tracking-[0.12em] text-white/40">{isPlatformRoute ? "WedPlanned control plane" : "Business workspace"}</p>
              <p className="mt-1 truncate text-xs font-medium">{isPlatformRoute ? "Platform administration" : auth.businessName || "MKB Weddings"}</p>
              <div className="admin-sidebar-session">
                <p>{isPlatformRoute ? "Global configuration · restricted access" : sessionLabel}</p>
                {isPlatformAdmin ? <span>Platform administrator</span> : null}
              </div>
              {!isPlatformRoute && auth.memberships.length > 1 ? <select value={auth.workspaceId} onChange={(event) => void switchWorkspace(event.target.value)} className="admin-workspace-switcher mt-3 h-8 w-full rounded-lg border px-2 text-[10px] outline-none" aria-label="Switch business workspace">{auth.memberships.map((membership) => <option key={membership.workspaceId} value={membership.workspaceId} className="text-black">{membership.businessName}</option>)}</select> : null}
            </div>
          </div>

          {isPlatformRoute ? (
            <div className="admin-platform-return-wrap border-b border-white/10 p-3">
              <Link to="/admin/business" className="admin-platform-return"><ArrowLeft /><span>Return to business workspace</span></Link>
            </div>
          ) : (
            <div className="admin-module-switcher-wrap border-b border-white/10 p-3">
              <p className="admin-sidebar-section-label">Modules</p>
              <div className="admin-module-switcher" aria-label="Application modules">
                {adminModules.map((module) => {
                  const appearance = resolveAdminModuleAppearance(module.key, moduleConfigurations);
                  const Icon = resolveAdminModuleIcon(module, appearance);
                  const active = module.key === currentModule.key;
                  return <Link key={module.key} to={module.to} className={`admin-module-link ${active ? "admin-module-link--active" : ""}`} aria-current={active ? "page" : undefined} style={{ "--module-link-accent": appearance.accentColor } as CSSProperties}><ModuleGlyph configuration={appearance} Icon={Icon} /><span>{module.shortLabel}</span></Link>;
                })}
              </div>
            </div>
          )}

          <nav className="admin-module-navigation min-h-0 flex-1 overflow-y-auto p-3" aria-label={`${currentContextLabel} navigation`}>
            <div className="admin-module-navigation__header"><ContextIcon /><div><strong>{currentContextLabel}</strong><span>{isPlatformRoute ? "Global businesses, taxonomy, modules, operations and access" : currentModule.description}</span></div></div>
            <div className="admin-module-navigation__items mt-3" data-layout={!isPlatformRoute && (currentModule.key === "website" || currentModule.key === "crm") ? "grid" : "list"}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isAdminNavigationItemActive(item, location.pathname, location.search);
                return <Link key={item.key} to={item.to} className={`admin-nav-link ${active ? "admin-nav-link--active" : ""}`} aria-current={active ? "page" : undefined}><span className="admin-nav-link__icon" aria-hidden="true"><Icon strokeWidth={1.65} /></span><span className="whitespace-nowrap">{item.label}</span></Link>;
              })}
            </div>
          </nav>

          <div className="admin-sidebar-external border-t border-white/10 p-3">
            {isPlatformAdmin ? <Link to={isPlatformRoute ? "/admin/business" : "/admin/platform"} className="admin-platform-entry"><ShieldCheck /><span>{isPlatformRoute ? "Business workspace" : "Platform administration"}</span></Link> : null}
            {auth.authenticated ? <div className="admin-sidebar-account">
              <div className="min-w-0">
                <p>{auth.displayName || auth.email}</p>
                <small>{auth.email}</small>
                {isPlatformAdmin ? <span>Platform administrator</span> : null}
              </div>
              <button type="button" onClick={() => void signOut()} className="admin-sidebar-signout" title="Sign out" aria-label="Sign out">
                <LogOut /><span>Sign out</span>
              </button>
            </div> : null}
            <div className="admin-external-links"><a href="https://www.mkbweddings.co.uk/blog" className="admin-external-link" target="_blank" rel="noreferrer"><FileText /> <span>Blog</span></a><a href="https://www.mkbweddings.co.uk/" className="admin-external-link" target="_blank" rel="noreferrer"><Globe2 /> <span>Website</span></a></div>
          </div>
        </aside>

        <section className="admin-main-region">
          <header className="admin-topbar admin-mobile-header">
            <div className="admin-mobile-header__inner">
              <img src="/favicon-32x32.png" alt="" aria-hidden="true" />
              <div className="admin-mobile-header__workspace"><strong>{isPlatformRoute ? "WedPlanned platform" : auth.businessName || "MKB Weddings"}</strong><span>{currentContextLabel} · {currentSectionLabel}</span></div>
              <button type="button" onClick={() => setMobileMoreOpen(true)} aria-label="Open Admin menu"><Menu /></button>
            </div>
          </header>

          <main className="admin-main-content">
            <div className="admin-context-bar" aria-label="Breadcrumb">
              <Link to={isPlatformRoute ? "/admin/platform" : currentModule.to}><ContextIcon />{currentContextLabel}</Link>
              <ChevronRight aria-hidden="true" />
              <span>{currentSectionLabel}</span>
            </div>
            <Outlet />
          </main>

          {mobileMoreOpen ? <div className="admin-mobile-more" role="dialog" aria-modal="true" aria-label="Admin navigation"><button className="admin-mobile-more__backdrop" type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close menu"></button><section><header><div><strong>{currentContextLabel}</strong><span>{isPlatformRoute ? "WedPlanned platform" : auth.businessName}</span></div><button type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close menu"><X /></button></header>{isPlatformRoute ? <div className="admin-mobile-platform-return"><Link to="/admin/business" onClick={() => setMobileMoreOpen(false)}><ArrowLeft /><span>Return to business workspace</span></Link></div> : <div className="admin-mobile-module-switcher">{adminModules.map((module) => { const appearance = resolveAdminModuleAppearance(module.key, moduleConfigurations); const Icon = resolveAdminModuleIcon(module, appearance); const active = module.key === currentModule.key; return <Link key={module.key} to={module.to} onClick={() => setMobileMoreOpen(false)} className={active ? "active" : ""} style={{ "--module-link-accent": appearance.accentColor } as CSSProperties}><ModuleGlyph configuration={appearance} Icon={Icon} /><span>{module.shortLabel}</span></Link>; })}</div>}<nav>{navItems.map((item) => { const Icon = item.icon; const active = isAdminNavigationItemActive(item, location.pathname, location.search); return <Link key={item.key} to={item.to} onClick={() => setMobileMoreOpen(false)} className={active ? "active" : ""}><Icon /><span>{item.label}</span></Link>; })}</nav><footer>{isPlatformAdmin ? <Link to={isPlatformRoute ? "/admin/business" : "/admin/platform"} onClick={() => setMobileMoreOpen(false)}><ShieldCheck />{isPlatformRoute ? "Business workspace" : "Platform administration"}</Link> : null}<a href="https://www.mkbweddings.co.uk/" target="_blank" rel="noreferrer"><Globe2 />Website</a><a href="https://www.mkbweddings.co.uk/blog" target="_blank" rel="noreferrer"><FileText />Blog</a>{auth.authenticated ? <button type="button" onClick={() => void signOut()}><LogOut />Sign out</button> : null}</footer></section></div> : null}

          <nav className="admin-mobile-bottom-nav" aria-label={`${currentContextLabel} primary navigation`}>
            {mobileItems.map((item) => { const Icon = item.icon; const active = isAdminNavigationItemActive(item, location.pathname, location.search); return <Link key={item.key} to={item.to} className={active ? "active" : ""}><Icon /><span>{item.label}</span></Link>; })}
            <button type="button" onClick={() => setMobileMoreOpen(true)} className={mobileMoreOpen ? "active" : ""}><Menu /><span>More</span></button>
          </nav>
        </section>
      </div>
    </div>
  );
}
