import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  Bot,
  Database,
  FileText,
  Gauge,
  Globe2,
  Images,
  LockKeyhole,
  MapPinned,
  Settings,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: Gauge, end: true },
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
          <div className="border-b border-white/10 px-4 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.24em] text-white/45">Photography</p>
                <h1 className="truncate text-lg leading-tight">Intelligence</h1>
              </div>
            </div>

            <p className="mt-3 text-[10px] text-white/42">Powered by MKB Weddings</p>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
              <p className="text-[9px] uppercase tracking-[0.12em] text-white/40">Workspace</p>
              <p className="mt-1 truncate text-xs font-medium">MKB Weddings</p>
              <p className="mt-1 text-[10px] text-white/40">Wedding Engine v0.2</p>
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
                    `group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs transition-all ${
                      isActive
                        ? "bg-white text-black shadow-sm"
                        : "text-white/62 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5 flex-none" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="admin-sidebar-external border-t border-white/10 p-3">
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
