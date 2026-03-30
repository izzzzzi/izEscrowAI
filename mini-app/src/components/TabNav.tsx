import { useNavigate, useLocation } from "react-router-dom";
import { useT } from "../i18n/context";
import Icon from "./Icon";

export default function TabNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();

  const tabs = [
    { path: "/deals", label: t("tab.deals"), icon: "solar:clipboard-list-linear" },
    { path: "/market", label: t("tab.market"), icon: "solar:bag-4-linear" },
    { path: "/spec/new", label: t("tab.spec"), icon: "solar:document-text-linear" },
    { path: "/groups", label: t("tab.groups"), icon: "solar:users-group-rounded-linear" },
    { path: "/profile", label: t("tab.profile"), icon: "solar:user-linear" },
  ];

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
              className={`flex flex-col items-center gap-1 transition-colors bg-transparent border-none cursor-pointer px-2 py-1 min-w-[44px] min-h-[44px] justify-center ${
                active ? "tab-active" : "text-slate-500"
              }`}
            >
              <Icon icon={tab.icon} size={22} />
              <span className="text-[0.6rem] font-medium tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
