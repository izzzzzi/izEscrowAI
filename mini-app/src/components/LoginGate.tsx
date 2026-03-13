import { type ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import TelegramLogin from "./TelegramLogin";

interface LoginGateProps {
  children: ReactNode;
  fallbackText?: string;
}

export default function LoginGate({ children, fallbackText }: LoginGateProps) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {fallbackText && (
        <p className="text-sm text-slate-400">{fallbackText}</p>
      )}
      <TelegramLogin />
    </div>
  );
}
