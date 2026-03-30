import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useT, useLang, useSetLang, type Lang } from "../i18n/context";
import TelegramLogin from "./TelegramLogin";
import Icon from "./Icon";

export default function WebNavbar() {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  // Close on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { path: "/#how-it-works", label: t("nav.howItWorks") },
    { path: "/market", label: t("nav.market") },
    ...(isAuthenticated ? [
      { path: "/groups", label: t("nav.groups") },
      { path: "/offers", label: t("nav.offers") },
    ] : []),
    ...(isAdmin ? [{ path: "/admin", label: t("nav.admin") }] : []),
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 px-6 py-4">
      <nav className="max-w-7xl mx-auto flex items-center justify-between glass-panel px-6 py-3 rounded-full">
        <Link to="/" className="flex items-center gap-2 no-underline text-white">
          <div className="w-8 h-8 ton-gradient rounded-lg flex items-center justify-center">
            <Icon icon="solar:shield-check-linear" size={20} className="text-white" />
          </div>
          <span className="text-lg font-medium tracking-tight">izEscrowAI</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400 font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`hover:text-white transition-colors no-underline ${
                location.pathname === link.path ? "text-white" : "text-slate-400"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <LangToggle />
          {isAuthenticated && user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 bg-transparent border-none cursor-pointer text-white p-0"
                aria-label="User menu"
                aria-expanded={menuOpen}
              >
                {user.photo_url ? (
                  <img src={user.photo_url} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <Icon icon="solar:user-linear" size={16} />
                  </div>
                )}
                <span className="text-sm font-medium hidden sm:inline">
                  {user.first_name}
                </span>
                <Icon
                  icon="solar:alt-arrow-down-linear"
                  size={14}
                  className={`text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {menuOpen && (
                <div role="menu" className="absolute right-0 top-12 w-48 rounded-xl border border-white/10 bg-[#1a1a2e] shadow-2xl overflow-hidden">
                  <button
                    role="menuitem"
                    onClick={() => navigate("/profile")}
                    className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center gap-2"
                  >
                    <Icon icon="solar:user-linear" size={16} />
                    {t("nav.menu.profile")}
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => navigate("/offers")}
                    className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center gap-2"
                  >
                    <Icon icon="solar:tag-linear" size={16} />
                    {t("nav.menu.myOffers")}
                  </button>
                  <div className="border-t border-white/5" />
                  <button
                    role="menuitem"
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors bg-transparent border-none cursor-pointer flex items-center gap-2"
                  >
                    <Icon icon="solar:logout-2-linear" size={16} />
                    {t("nav.menu.logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <TelegramLogin />
          )}
        </div>
      </nav>
    </header>
  );
}

function LangToggle() {
  const lang = useLang();
  const setLang = useSetLang();
  const langs: Lang[] = ["en", "ru"];

  return (
    <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider border-none cursor-pointer transition-colors ${
            lang === l
              ? "bg-[#0098EA]/20 text-[#0098EA]"
              : "bg-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
