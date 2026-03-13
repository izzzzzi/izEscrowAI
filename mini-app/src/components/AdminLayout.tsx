import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: "solar:chart-square-linear", exact: true },
  { path: "/admin/sources", label: "Sources", icon: "solar:database-linear" },
  { path: "/admin/jobs", label: "Jobs", icon: "solar:suitcase-linear" },
  { path: "/admin/users", label: "Users", icon: "solar:users-group-rounded-linear" },
  { path: "/admin/disputes", label: "Disputes", icon: "solar:shield-warning-linear" },
  { path: "/admin/settings", label: "Settings", icon: "solar:settings-linear" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function isActive(item: (typeof navItems)[number]) {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#0f0f1a", color: "#fff" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 flex flex-col
          border-r border-white/5 bg-[#0a0a14]
          transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className="w-8 h-8 ton-gradient rounded-lg flex items-center justify-center">
            <iconify-icon icon="solar:shield-check-linear" width="18" height="18" />
          </div>
          <span className="text-base font-semibold tracking-tight">izEscrow Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors no-underline
                  ${active
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }
                `}
              >
                <iconify-icon icon={item.icon} width="20" height="20" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors no-underline"
          >
            <iconify-icon icon="solar:arrow-left-linear" width="14" />
            <span>Back to site</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#0a0a14]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors bg-transparent border-none cursor-pointer"
          >
            <iconify-icon icon="solar:hamburger-menu-linear" width="22" height="22" />
          </button>
          <span className="text-sm font-semibold">Admin Panel</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
