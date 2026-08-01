import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  Building2,
  Bot,
  Database,
  FileText,
  ContactRound,
  Gauge,
  Globe2,
  Images,
  LockKeyhole,
  LogOut,
  MapPinned,
  Settings,
  ShoppingBag,
  Truck,
  Users,
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

  return (
    <div className="admin-shell min-h-screen bg-[#f5f3ef] text-neutral-950">
      <style>{`
        .admin-external-links {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }
        .admin-external-link {
          min-width: 0;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 8px;
          background: rgba(255,255,255,.06);
          color: #fff;
          padding: 0 8px;
          font-size: 9px;
          font-weight: 600;
          line-height: 1;
          text-decoration: none;
          transition: background-color .15s ease, border-color .15s ease;
        }
        .admin-external-link:hover {
          border-color: rgba(255,255,255,.28);
          background: rgba(255,255,255,.12);
        }
        .admin-external-link svg {
          width: 13px;
          height: 13px;
          flex: 0 0 13px;
        }
        .admin-mobile-external-actions {
          display: none;
          align-items: center;
          gap: 6px;
        }
        .admin-shell select.admin-workspace-switcher {
          background: #1b1b1b !important;
          color: #ffffff !important;
          border-color: rgba(255,255,255,.18) !important;
          color-scheme: dark;
        }
        .admin-shell select.admin-workspace-switcher option {
          background: #ffffff;
          color: #111111;
        }
        .admin-mobile-external-link {
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          border: 1px solid rgba(17,17,17,.12);
          border-radius: 8px;
          background: #fff;
          color: #262626;
          padding: 0 9px;
          font-size: 9px;
          font-weight: 600;
          line-height: 1;
          text-decoration: none;
        }
        .admin-mobile-external-link svg {
          width: 13px;
          height: 13px;
          flex: 0 0 13px;
        }
        .admin-topbar {
          display: none;
          position: relative;
          z-index: 30;
          background: #f5f3ef;
        }
        @media (max-width: 760px) {
          .admin-sidebar-external { display: none; }
          .admin-mobile-external-actions { display: flex; }
          .admin-topbar-copy { display: block !important; }
          .admin-topbar-copy p:first-child { font-size: 8px !important; }
          .admin-topbar-copy p:last-child { display: none; }
          .admin-topbar {
            display: block;
            position: sticky;
            top: 0;
            z-index: 40;
            border-bottom: 1px solid rgba(17,17,17,.08);
          }
        }
        @media (max-width: 420px) {
          .admin-mobile-external-link {
            width: 32px;
            padding: 0;
          }
          .admin-mobile-external-link span { display: none; }
        }
      `}</style>
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
              {auth.memberships.length > 1 ? (
                <select
                  value={auth.workspaceId}
                  onChange={(event) => void switchWorkspace(event.target.value)}
                  className="admin-workspace-switcher mt-3 h-8 w-full rounded-lg border px-2 text-[10px] outline-none"
                  aria-label="Switch business workspace"
                >
                  {auth.memberships.map((membership) => <option key={membership.workspaceId} value={membership.workspaceId} className="text-black">{membership.businessName}</option>)}
                </select>
              ) : null}
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `admin-nav-link ${isActive ? "admin-nav-link--active" : ""}`
                  }
                >
                  <span className="admin-nav-link__icon" aria-hidden="true">
                    <Icon strokeWidth={1.65} />
                  </span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="admin-sidebar-external border-t border-white/10 p-3">
            {auth.authenticated ? (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-2.5 py-2">
                <div className="min-w-0"><p className="truncate text-[10px] font-medium text-white/80">{auth.displayName || auth.email}</p><p className="truncate text-[9px] text-white/38">{auth.email}</p></div>
                <button onClick={() => void signOut()} className="rounded-md p-1.5 text-white/45 hover:bg-white/10 hover:text-white" title="Sign out" aria-label="Sign out"><LogOut size={13} /></button>
              </div>
            ) : null}
            <div className="admin-external-links">
              <a href="https://www.mkbweddings.co.uk/blog" className="admin-external-link" target="_blank" rel="noreferrer">
                <FileText /> <span>Blog</span>
              </a>
              <a href="https://www.mkbweddings.co.uk/" className="admin-external-link" target="_blank" rel="noreferrer">
                <Globe2 /> <span>Website</span>
              </a>
            </div>
          </div>
        </aside>

        <section className="admin-main-region">
          <header className="admin-topbar">
            <div className="flex min-h-[46px] items-center justify-between gap-3 px-4 sm:px-5">
              <div className="admin-topbar-copy hidden min-w-0 sm:block">
                <p className="truncate text-[9px] uppercase tracking-[0.2em] text-neutral-500">Photography Intelligence</p>
                <p className="mt-0.5 truncate text-[10px] text-neutral-500">Wedding content, assets, AI and publishing</p>
              </div>

              <div className="admin-mobile-external-actions ml-auto">
                <a
                  href="https://www.mkbweddings.co.uk/blog"
                  target="_blank"
                  rel="noreferrer"
                  className="admin-mobile-external-link"
                  aria-label="Open MKB Weddings blog"
                >
                  <FileText /> <span>Blog</span>
                </a>
                <a
                  href="https://www.mkbweddings.co.uk/"
                  target="_blank"
                  rel="noreferrer"
                  className="admin-mobile-external-link"
                  aria-label="Open MKB Weddings website"
                >
                  <Globe2 /> <span>Website</span>
                </a>
              </div>
            </div>
          </header>

          <main className="admin-main-content">
            <Outlet />
          </main>
        </section>
      </div>
    </div>
  );
}
