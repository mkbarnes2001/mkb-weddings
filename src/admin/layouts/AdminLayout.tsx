import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Bot,
  CalendarDays,
  ContactRound,
  Database,
  FileText,
  Gauge,
  Globe2,
  Images,
  LockKeyhole,
  LogOut,
  MapPinned,
  Menu,
  Settings,
  ShoppingBag,
  Target,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: Gauge, end: true },
  { to: "/admin/wedplanned", label: "WedPlanned", icon: Building2 },
  { to: "/admin/crm", label: "CRM", icon: ContactRound },
  { to: "/admin/weddings", label: "Weddings", icon: FileText },
  { to: "/admin/gallery", label: "Gallery Management", icon: Images },
  { to: "/admin/venues", label: "Venues", icon: Globe2 },
  { to: "/admin/locations", label: "Locations", icon: MapPinned },
  { to: "/admin/suppliers", label: "Suppliers", icon: Users },
  { to: "/admin/assets", label: "Asset Library", icon: Database },
  { to: "/admin/client-galleries", label: "Client Galleries", icon: LockKeyhole },
  { to: "/admin/print-store", label: "Print Store", icon: ShoppingBag },
  { to: "/admin/ai", label: "AI Centre", icon: Bot },
  { to: "/admin/seo", label: "SEO", icon: BarChart3 },
  { to: "/admin/publishing", label: "Publishing", icon: Truck },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminLayout() {
  const { auth, signOut, switchWorkspace } = useProfessionalAuth();
  const location = useLocation();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const crmView = new URLSearchParams(location.search).get("view") || "pipeline";

  const mobileItems = [
    { to: "/admin/crm?view=contacts", label: "Clients", icon: UserRound, active: (location.pathname === "/admin/crm" && crmView === "contacts") || location.pathname.startsWith("/admin/crm/contacts/") },
    { to: "/admin/crm", label: "Leads", icon: Target, active: location.pathname === "/admin/crm" && crmView === "pipeline" },
    { to: "/admin/crm?view=jobs", label: "Jobs", icon: BriefcaseBusiness, active: (location.pathname === "/admin/crm" && crmView === "jobs") || location.pathname.startsWith("/admin/crm/jobs/") },
    { to: "/admin/crm?view=schedule", label: "Schedule", icon: CalendarDays, active: location.pathname === "/admin/crm" && crmView === "schedule" },
  ];

  return (
    <div className="admin-shell min-h-screen bg-[#f5f3ef] text-neutral-950">
      <div className="admin-layout-grid">
        <aside className="admin-sidebar flex flex-col border-r border-black" style={{ backgroundColor: "#111111", color: "#ffffff" }}>
          <div className="border-b border-white/10 px-4 py-4">
            <div className="flex items-center justify-center py-1">
              <img src="/favicon-32x32.png" alt="MKB Weddings" className="h-11 w-11 object-contain opacity-95" style={{ filter: "brightness(0) invert(1)" }} />
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
              <p className="text-[9px] uppercase tracking-[0.12em] text-white/40">Business workspace</p>
              <p className="mt-1 truncate text-xs font-medium">{auth.businessName || "MKB Weddings"}</p>
              <p className="mt-1 text-[10px] capitalize text-white/40">{auth.mode === "bootstrap" ? "Setup mode · authentication not enforced" : auth.accessMode === "support" ? `${auth.supportScope || "read"} support · time bounded` : `${auth.role || "member"} · secure session`}</p>
              {auth.memberships.length > 1 ? <select value={auth.workspaceId} onChange={(event) => void switchWorkspace(event.target.value)} className="admin-workspace-switcher mt-3 h-8 w-full rounded-lg border px-2 text-[10px] outline-none" aria-label="Switch business workspace">{auth.memberships.map((membership) => <option key={membership.workspaceId} value={membership.workspaceId} className="text-black">{membership.businessName}</option>)}</select> : null}
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `admin-nav-link ${isActive ? "admin-nav-link--active" : ""}`}><span className="admin-nav-link__icon" aria-hidden="true"><Icon strokeWidth={1.65} /></span><span className="whitespace-nowrap">{item.label}</span></NavLink>; })}
          </nav>

          <div className="admin-sidebar-external border-t border-white/10 p-3">
            {auth.authenticated ? <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-2.5 py-2"><div className="min-w-0"><p className="truncate text-[10px] font-medium text-white/80">{auth.displayName || auth.email}</p><p className="truncate text-[9px] text-white/38">{auth.email}</p></div><button onClick={() => void signOut()} className="rounded-md p-1.5 text-white/45 hover:bg-white/10 hover:text-white" title="Sign out" aria-label="Sign out"><LogOut size={13} /></button></div> : null}
            <div className="admin-external-links"><a href="https://www.mkbweddings.co.uk/blog" className="admin-external-link" target="_blank" rel="noreferrer"><FileText /> <span>Blog</span></a><a href="https://www.mkbweddings.co.uk/" className="admin-external-link" target="_blank" rel="noreferrer"><Globe2 /> <span>Website</span></a></div>
          </div>
        </aside>

        <section className="admin-main-region">
          <header className="admin-topbar admin-mobile-header">
            <div className="admin-mobile-header__inner">
              <img src="/favicon-32x32.png" alt="" aria-hidden="true" />
              <div className="admin-mobile-header__workspace"><strong>{auth.businessName || "MKB Weddings"}</strong>{auth.memberships.length > 1 ? <select value={auth.workspaceId} onChange={(event) => void switchWorkspace(event.target.value)} aria-label="Switch business workspace">{auth.memberships.map((membership) => <option key={membership.workspaceId} value={membership.workspaceId}>{membership.businessName}</option>)}</select> : <span>{auth.role || "member"}</span>}</div>
              <button type="button" onClick={() => setMobileMoreOpen(true)} aria-label="Open Admin menu"><Menu /></button>
            </div>
          </header>

          <main className="admin-main-content"><Outlet /></main>

          {mobileMoreOpen ? <div className="admin-mobile-more" role="dialog" aria-modal="true" aria-label="Admin navigation"><button className="admin-mobile-more__backdrop" type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close menu"></button><section><header><div><strong>Admin menu</strong><span>{auth.businessName}</span></div><button type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close menu"><X /></button></header><nav>{navItems.map((item) => { const Icon = item.icon; return <Link key={item.to} to={item.to} onClick={() => setMobileMoreOpen(false)}><Icon /><span>{item.label}</span></Link>; })}</nav><footer><a href="https://www.mkbweddings.co.uk/" target="_blank" rel="noreferrer"><Globe2 />Website</a><a href="https://www.mkbweddings.co.uk/blog" target="_blank" rel="noreferrer"><FileText />Blog</a>{auth.authenticated ? <button type="button" onClick={() => void signOut()}><LogOut />Sign out</button> : null}</footer></section></div> : null}

          <nav className="admin-mobile-bottom-nav" aria-label="CRM navigation">
            {mobileItems.map((item) => { const Icon = item.icon; return <Link key={item.to} to={item.to} className={item.active ? "active" : ""}><Icon /><span>{item.label}</span></Link>; })}
            <button type="button" onClick={() => setMobileMoreOpen(true)} className={mobileMoreOpen ? "active" : ""}><Menu /><span>More</span></button>
          </nav>
        </section>
      </div>
    </div>
  );
}
