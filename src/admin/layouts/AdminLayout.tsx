import { useEffect, useState } from "react";
import { ChevronRight, FileText, Globe2, LogOut, Menu, X } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import {
  adminModules,
  isAdminNavigationItemActive,
  isWeddingWorkspacePath,
  resolveAdminModule,
  resolveAdminNavigationItem,
  visibleModuleItems,
} from "../navigation/adminModules";

export function AdminLayout() {
  const { auth, signOut, switchWorkspace } = useProfessionalAuth();
  const location = useLocation();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const currentModule = resolveAdminModule(location.pathname);
  const moduleItems = visibleModuleItems(currentModule, auth.permissions);
  const navItems = moduleItems;
  const currentItem = resolveAdminNavigationItem(currentModule, location.pathname, location.search, auth.permissions);
  const currentSectionLabel = isWeddingWorkspacePath(location.pathname) ? "Wedding Workspace" : currentItem?.label || "Detail";
  const crmMobilePrimary = [
    { key: "clients", label: "Clients" },
    { key: "leads", label: "Leads" },
    { key: "jobs", label: "Jobs" },
    { key: "schedule", label: "Schedule" },
  ];
  const mobileItems = currentModule.key === "crm"
    ? crmMobilePrimary.map(({ key }) => moduleItems.find((item) => item.key === key)).filter((item): item is NonNullable<typeof item> => Boolean(item))
    : moduleItems.filter((item) => item.mobilePrimary).slice(0, 4);
  const ModuleIcon = currentModule.icon;
  const isPlatformAdmin = auth.platformRole === "platform_admin";
  const sessionLabel = auth.mode === "bootstrap"
    ? "Setup mode · authentication not enforced"
    : auth.accessMode === "support"
      ? `${auth.supportScope || "read"} support · time bounded`
      : `${auth.role || "member"} · secure session`;

  useEffect(() => {
    document.title = `${currentSectionLabel} · ${currentModule.label} · ${auth.businessName || "WedPlanned"}`;
    setMobileMoreOpen(false);
  }, [auth.businessName, currentModule.label, currentSectionLabel, location.pathname, location.search]);

  return (
    <div className="admin-shell min-h-screen bg-[#f5f3ef] text-neutral-950">
      <div className="admin-layout-grid">
        <aside className="admin-sidebar flex flex-col border-r border-black" style={{ backgroundColor: "#111111", color: "#ffffff" }}>
          <div className="admin-sidebar-identity border-b border-white/10 px-4 py-4">
            <Link to="/admin" className="admin-sidebar-brand" aria-label="Open Website overview">
              <img src="/favicon-32x32.png" alt="MKB Weddings" />
            </Link>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
              <p className="text-[9px] uppercase tracking-[0.12em] text-white/40">Business workspace</p>
              <p className="mt-1 truncate text-xs font-medium">{auth.businessName || "MKB Weddings"}</p>
              <div className="admin-sidebar-session">
                <p>{sessionLabel}</p>
                {isPlatformAdmin ? <span>Platform administrator</span> : null}
              </div>
              {auth.memberships.length > 1 ? <select value={auth.workspaceId} onChange={(event) => void switchWorkspace(event.target.value)} className="admin-workspace-switcher mt-3 h-8 w-full rounded-lg border px-2 text-[10px] outline-none" aria-label="Switch business workspace">{auth.memberships.map((membership) => <option key={membership.workspaceId} value={membership.workspaceId} className="text-black">{membership.businessName}</option>)}</select> : null}
            </div>
          </div>

          <div className="admin-module-switcher-wrap border-b border-white/10 p-3">
            <p className="admin-sidebar-section-label">Modules</p>
            <div className="admin-module-switcher" aria-label="Application modules">
              {adminModules.map((module) => {
                const Icon = module.icon;
                const active = module.key === currentModule.key;
                return <Link key={module.key} to={module.to} className={`admin-module-link ${active ? "admin-module-link--active" : ""}`} aria-current={active ? "page" : undefined}><Icon /><span>{module.shortLabel}</span></Link>;
              })}
            </div>
          </div>

          <nav className="admin-module-navigation min-h-0 flex-1 overflow-y-auto p-3" aria-label={`${currentModule.label} navigation`}>
            <div className="admin-module-navigation__header"><ModuleIcon /><div><strong>{currentModule.label}</strong><span>{currentModule.description}</span></div></div>
            <div className="admin-module-navigation__items mt-3" data-layout={currentModule.key === "website" ? "grid" : "list"}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isAdminNavigationItemActive(item, location.pathname, location.search);
                return <Link key={item.key} to={item.to} className={`admin-nav-link ${active ? "admin-nav-link--active" : ""}`} aria-current={active ? "page" : undefined}><span className="admin-nav-link__icon" aria-hidden="true"><Icon strokeWidth={1.65} /></span><span className="whitespace-nowrap">{item.label}</span></Link>;
              })}
            </div>
          </nav>

          <div className="admin-sidebar-external border-t border-white/10 p-3">
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
              <div className="admin-mobile-header__workspace"><strong>{auth.businessName || "MKB Weddings"}</strong><span>{currentModule.label} · {currentSectionLabel}</span></div>
              <button type="button" onClick={() => setMobileMoreOpen(true)} aria-label="Open Admin menu"><Menu /></button>
            </div>
          </header>

          <main className="admin-main-content">
            <div className="admin-context-bar" aria-label="Breadcrumb">
              <Link to={currentModule.to}><ModuleIcon />{currentModule.label}</Link>
              <ChevronRight aria-hidden="true" />
              <span>{currentSectionLabel}</span>
            </div>
            <Outlet />
          </main>

          {mobileMoreOpen ? <div className="admin-mobile-more" role="dialog" aria-modal="true" aria-label="Admin navigation"><button className="admin-mobile-more__backdrop" type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close menu"></button><section><header><div><strong>{currentModule.label}</strong><span>{auth.businessName}</span></div><button type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close menu"><X /></button></header><div className="admin-mobile-module-switcher">{adminModules.map((module) => { const Icon = module.icon; const active = module.key === currentModule.key; return <Link key={module.key} to={module.to} onClick={() => setMobileMoreOpen(false)} className={active ? "active" : ""}><Icon /><span>{module.shortLabel}</span></Link>; })}</div><nav>{navItems.map((item) => { const Icon = item.icon; const active = isAdminNavigationItemActive(item, location.pathname, location.search); return <Link key={item.key} to={item.to} onClick={() => setMobileMoreOpen(false)} className={active ? "active" : ""}><Icon /><span>{item.label}</span></Link>; })}</nav><footer><a href="https://www.mkbweddings.co.uk/" target="_blank" rel="noreferrer"><Globe2 />Website</a><a href="https://www.mkbweddings.co.uk/blog" target="_blank" rel="noreferrer"><FileText />Blog</a>{auth.authenticated ? <button type="button" onClick={() => void signOut()}><LogOut />Sign out</button> : null}</footer></section></div> : null}

          <nav className="admin-mobile-bottom-nav" aria-label={`${currentModule.label} primary navigation`}>
            {mobileItems.map((item) => { const Icon = item.icon; const active = isAdminNavigationItemActive(item, location.pathname, location.search); return <Link key={item.key} to={item.to} className={active ? "active" : ""}><Icon /><span>{item.label}</span></Link>; })}
            <button type="button" onClick={() => setMobileMoreOpen(true)} className={mobileMoreOpen ? "active" : ""}><Menu /><span>More</span></button>
          </nav>
        </section>
      </div>
    </div>
  );
}
