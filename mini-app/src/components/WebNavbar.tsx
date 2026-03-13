import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import TelegramLogin from "./TelegramLogin";

export default function WebNavbar() {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
    { path: "/#how-it-works", label: "How it works" },
    { path: "/market", label: "Market" },
    ...(isAuthenticated ? [{ path: "/offers", label: "Offers" }] : []),
    ...(isAdmin ? [{ path: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 px-6 py-4">
      <nav className="max-w-7xl mx-auto flex items-center justify-between glass-panel px-6 py-3 rounded-full">
        <Link to="/" className="flex items-center gap-2 no-underline text-white">
          <div className="w-8 h-8 ton-gradient rounded-lg flex items-center justify-center">
            <iconify-icon icon="solar:shield-check-linear" width="20" height="20" class="text-white" />
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
          {isAuthenticated && user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 bg-transparent border-none cursor-pointer text-white p-0"
              >
                {user.photo_url ? (
                  <img src={user.photo_url} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <iconify-icon icon="solar:user-linear" width="16" height="16" />
                  </div>
                )}
                <span className="text-sm font-medium hidden sm:inline">
                  {user.first_name}
                </span>
                <iconify-icon
                  icon="solar:alt-arrow-down-linear"
                  width="14"
                  height="14"
                  class={`text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-48 rounded-xl border border-white/10 bg-[#1a1a2e] shadow-2xl overflow-hidden">
                  <button
                    onClick={() => navigate("/profile")}
                    className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center gap-2"
                  >
                    <iconify-icon icon="solar:user-linear" width="16" height="16" />
                    Profile
                  </button>
                  <button
                    onClick={() => navigate("/offers")}
                    className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center gap-2"
                  >
                    <iconify-icon icon="solar:tag-linear" width="16" height="16" />
                    My Offers
                  </button>
                  <div className="border-t border-white/5" />
                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors bg-transparent border-none cursor-pointer flex items-center gap-2"
                  >
                    <iconify-icon icon="solar:logout-2-linear" width="16" height="16" />
                    Logout
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
