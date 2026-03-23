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

  function isActive(item: (typeof navItems)[number]) {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  }

  return (
    <div className="min-h-screen page-shell pt-28 pb-16">
      {/* Tab bar */}
      <nav className="flex justify-center px-4 mb-8">
        <div className="glass-panel rounded-full px-2 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                  transition-colors no-underline whitespace-nowrap
                  ${active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <iconify-icon icon={item.icon} width="16" height="16" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
