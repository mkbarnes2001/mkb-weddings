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
      <div
        className="min-h-screen"
        style={{
          display: "grid",
          gridTemplateColumns: "292px 1fr",
        }}
      >
        <aside
          className="flex flex-col border-r border-black"
          style={{
            backgroundColor: "#111111",
            color: "#ffffff",
          }}
        >
          <div className="border-b border-white/10 px-6 py-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-black">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
                  Photography
                </p>
                <h1 className="font-serif text-xl leading-tight">
                  Intelligence
                </h1>
              </div>
            </div>

            <p className="mt-4 text-xs text-white/45">
              Powered by MKB Weddings
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-1 text-xs text-white/45">Workspace</p>
              <p className="text-sm">MKB Weddings</p>
              <p className="mt-1 text-xs text-white/45">Wedding Engine v0.2</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all ${
                      isActive
                        ? "bg-white text-black shadow-sm"
                        : "text-white/62 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <a
              href="https://www.mkbweddings.co.uk/"
              className="flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm text-black hover:bg-white/90"
            >
              View website
            </a>
          </div>
        </aside>

        <section
          className="min-w-0"
          style={{
            backgroundColor: "#f5f3ef",
          }}
        >
          <header className="sticky top-0 z-20 border-b border-black/10 bg-[#f5f3ef]/90 backdrop-blur-xl">
            <div className="flex items-center justify-between px-8" style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                  Photography Intelligence
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Wedding content, assets, AI and publishing
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <a
                  href="https://www.mkbweddings.co.uk/blog"
                  title="Open MKB Weddings blog"
                  style={{ height: 32, borderRadius: 8, border: "1px solid rgba(0,0,0,.12)", background: "rgba(255,255,255,.72)", padding: "0 10px", fontSize: 10, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
                >
                  <FileText style={{ width: 13, height: 13 }} /> Blog
                </a>
                <a
                  href="https://www.mkbweddings.co.uk/"
                  title="Open MKB Weddings website"
                  style={{ height: 32, borderRadius: 8, background: "#111", color: "#fff", padding: "0 10px", fontSize: 10, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
                >
                  <Globe2 style={{ width: 13, height: 13 }} /> Website
                </a>
              </div>
            </div>
          </header>

          <main className="p-8">
            <Outlet />
          </main>
        </section>
      </div>
    </div>
  );
}
