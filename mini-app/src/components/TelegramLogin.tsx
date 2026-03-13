import { useEffect, useRef, useCallback } from "react";
import { useAuth, type TelegramUser } from "../contexts/AuthContext";

const BOT_USERNAME = "izEscrowAIBot";

export default function TelegramLogin() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setLoginUser, isAuthenticated, user } = useAuth();

  // Global callback for Telegram Login Widget
  const handleAuth = useCallback(
    (data: TelegramUser) => {
      setLoginUser(data);
    },
    [setLoginUser],
  );

  useEffect(() => {
    // Expose callback globally
    (window as any).onTelegramAuth = handleAuth;

    if (!containerRef.current || isAuthenticated) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(script);

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [handleAuth, isAuthenticated]);

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2">
        {user.photo_url && (
          <img
            src={user.photo_url}
            alt=""
            className="w-8 h-8 rounded-full"
          />
        )}
        <span className="text-sm font-medium">
          {user.first_name}
          {user.username && (
            <span className="text-slate-400 ml-1">@{user.username}</span>
          )}
        </span>
      </div>
    );
  }

  return <div ref={containerRef} />;
}
