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
  { to: "/admin/ai", label: "AI Centre", icon: Bot },
  { to: "/admin/seo", label: "SEO", icon: BarChart3 },
  { to: "/admin/publishing", label: "Publishing", icon: Truck },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminLayout() {
  return (
    <div className="admin-shell min-h-screen bg-[#f5f3ef] text-neutral-950">
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
          <header className="admin-topbar sticky top-0 z-20 border-b border-black/10 bg-[#f5f3ef]/92 backdrop-blur-xl">
            <div className="flex min-h-[54px] items-center justify-between gap-4 px-6">
              <div className="min-w-0">
                <p className="truncate text-[9px] uppercase tracking-[0.2em] text-neutral-500">Photography Intelligence</p>
                <p className="mt-0.5 truncate text-[10px] text-neutral-500">Wedding content, assets, AI and publishing</p>
              </div>

              <div className="flex items-center gap-1.5">
                <a
                  href="https://www.mkbweddings.co.uk/blog"
                  title="Open MKB Weddings blog"
                  className="admin-button admin-button--secondary admin-button--sm"
                >
                  <FileText className="admin-button__icon" /> Blog
                </a>
                <a
                  href="https://www.mkbweddings.co.uk/"
                  title="Open MKB Weddings website"
                  className="admin-button admin-button--primary admin-button--sm"
                >
                  <Globe2 className="admin-button__icon" /> Website
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
