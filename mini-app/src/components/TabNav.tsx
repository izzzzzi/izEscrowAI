import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { path: "/wallet", label: "Wallet", icon: "solar:wallet-linear" },
  { path: "/deals", label: "Deals", icon: "solar:clipboard-list-linear" },
];

export default function TabNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0f172a]/90 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
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
