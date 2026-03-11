import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { path: "/wallet", label: "Wallet" },
  { path: "/deals", label: "Deals" },
];

export default function TabNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        background: "var(--tg-theme-secondary-bg-color, #1c1c1e)",
        borderTop: "1px solid var(--tg-theme-hint-color, #333)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              padding: "12px 0",
              border: "none",
              background: "transparent",
              color: active
                ? "var(--tg-theme-button-color, #3390ec)"
                : "var(--tg-theme-hint-color, #999)",
              fontSize: "14px",
              fontWeight: active ? "bold" : "normal",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
