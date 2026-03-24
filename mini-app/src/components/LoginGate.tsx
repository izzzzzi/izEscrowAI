import { type ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useT } from "../i18n/context";
import TelegramLogin from "./TelegramLogin";

export interface LoginGateProps {
  children?: ReactNode;
  fallbackText?: string;
}

export default function LoginGate({ children, fallbackText }: LoginGateProps) {
  const { isAuthenticated } = useAuth();
  const t = useT();

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const text = fallbackText ?? t("loginGate.default");

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {text && (
        <p className="text-sm text-slate-400">{text}</p>
      )}
      <TelegramLogin />
    </div>
  );
}
