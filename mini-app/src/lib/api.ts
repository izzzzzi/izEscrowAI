export const API_URL = import.meta.env.VITE_BOT_API_URL || "http://localhost:3000";

export function getInitData(): string {
  try {
    // @ts-expect-error - Telegram WebApp global
    return window.Telegram?.WebApp?.initData || "";
  } catch {
    return "";
  }
}
