import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import TelegramLogin from "./TelegramLogin";

export default function WebNavbar() {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const navLinks = [
    { path: "/offers", label: "Offers" },
    { path: "/market", label: "Market" },
    { path: "/#how-it-works", label: "How it works" },
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
          <a
            href="https://github.com/izzzzzi/izEscrowAI"
            className="hover:text-white transition-colors text-slate-400 no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link to="/profile" className="flex items-center gap-2 no-underline text-white">
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
              </Link>
              <button
                onClick={logout}
                className="text-xs text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <TelegramLogin />
          )}
        </div>
      </nav>
    </header>
  );
}
