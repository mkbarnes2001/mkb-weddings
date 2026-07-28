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
        .admin-toolbar-actions {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          white-space: nowrap;
        }
        .admin-page-action-slot {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 6px;
        }
        .admin-toolbar-button {
          width: 84px;
          height: 32px;
          flex: 0 0 84px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          border: 1px solid rgba(17,17,17,.12);
          border-radius: 8px;
          background: #fff;
          color: #262626;
          padding: 0 8px;
          font-size: 9px;
          font-weight: 650;
          line-height: 1;
          text-decoration: none;
          transition: background-color .15s ease, border-color .15s ease, transform .15s ease;
        }
        .admin-toolbar-button:hover {
          border-color: rgba(17,17,17,.26);
          background: #fafafa;
          transform: translateY(-1px);
        }
        .admin-toolbar-button[data-primary="true"] {
          border-color: #111;
          background: #111;
          color: #fff;
        }
        .admin-toolbar-button[aria-disabled="true"] {
          pointer-events: none;
          opacity: .38;
        }
        .admin-toolbar-button-icon {
          width: 13px;
          height: 13px;
          flex: 0 0 13px;
        }
        .admin-toolbar-button-label {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (max-width: 1080px) {
          .admin-toolbar-button {
            width: 32px;
            flex-basis: 32px;
            padding: 0;
          }
          .admin-toolbar-button-label { display: none; }
        }
        @media (max-width: 640px) {
          .admin-toolbar-actions,
          .admin-page-action-slot { gap: 4px; }
          .admin-toolbar-button {
            width: 30px;
            height: 30px;
            flex-basis: 30px;
            border-radius: 7px;
          }
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

          <div className="border-t border-white/10 p-3">
            <a
              href="https://www.mkbweddings.co.uk/"
              className="flex h-8 items-center justify-center gap-2 rounded-lg bg-white px-3 text-[10px] font-semibold text-black hover:bg-white/90"
            >
              <Globe2 className="h-3.5 w-3.5" /> Website
            </a>
          </div>
        </aside>

        <section className="admin-main-region">
          <header className="admin-topbar sticky top-0 z-40 border-b border-black/10 bg-[#f5f3ef] shadow-[0_4px_18px_rgba(17,17,17,0.04)]">
            <div className="flex min-h-[62px] items-center justify-between gap-3 px-4 sm:px-6">
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-[9px] uppercase tracking-[0.2em] text-neutral-500">Photography Intelligence</p>
                <p className="mt-0.5 truncate text-[10px] text-neutral-500">Wedding content, assets, AI and publishing</p>
              </div>

              <div className="admin-toolbar-actions ml-auto">
                <div id="admin-page-actions" className="admin-page-action-slot" />
                <a
                  href="https://www.mkbweddings.co.uk/blog"
                  title="Open MKB Weddings blog"
                  aria-label="Open MKB Weddings blog"
                  className="admin-toolbar-button"
                >
                  <FileText className="admin-toolbar-button-icon" />
                  <span className="admin-toolbar-button-label">Blog</span>
                </a>
                <a
                  href="https://www.mkbweddings.co.uk/"
                  title="Open MKB Weddings website"
                  aria-label="Open MKB Weddings website"
                  className="admin-toolbar-button"
                >
                  <Globe2 className="admin-toolbar-button-icon" />
                  <span className="admin-toolbar-button-label">Website</span>
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
