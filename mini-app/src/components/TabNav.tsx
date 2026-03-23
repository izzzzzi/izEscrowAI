import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { path: "/deals", label: "Deals", icon: "solar:clipboard-list-linear" },
  { path: "/market", label: "Market", icon: "solar:bag-4-linear" },
  { path: "/spec/new", label: "Spec", icon: "solar:document-text-linear" },
  { path: "/groups", label: "Groups", icon: "solar:users-group-rounded-linear" },
  { path: "/profile", label: "Profile", icon: "solar:user-linear" },
];

export default function TabNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0f172a]/90 backdrop-blur-xl border-t border-white/5 safe-area-bottom" aria-label="Main navigation">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path || location.pathname.startsWith(tab.path.replace(/\/new$/, "/"));
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 transition-colors bg-transparent border-none cursor-pointer ${
                active ? "tab-active" : "text-slate-500"
              }`}
            >
              <iconify-icon icon={tab.icon} width="22" />
              <span className="text-[0.6rem] font-medium tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
