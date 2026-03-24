import { createContext, useContext, type ReactNode } from "react";
import en, { type TranslationKey } from "./en";
import ru from "./ru";

type Lang = "en" | "ru";

const locales: Record<Lang, Record<TranslationKey, string>> = { en, ru };

function detectLanguage(): Lang {
  try {
    // @ts-expect-error - Telegram WebApp global
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    if (typeof tgLang === "string" && tgLang.startsWith("ru")) return "ru";
  } catch { /* ignore */ }
  try {
    if (navigator.language?.startsWith("ru")) return "ru";
  } catch { /* ignore */ }
  return "en";
}

type TFunction = (key: TranslationKey) => string;

const I18nContext = createContext<{ t: TFunction; lang: Lang }>({
  t: (key) => en[key],
  lang: "en",
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = detectLanguage();
  const strings = locales[lang];
  const t: TFunction = (key) => strings[key] ?? en[key] ?? key;

  return (
    <I18nContext.Provider value={{ t, lang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT(): TFunction {
  return useContext(I18nContext).t;
}

export function useLang(): Lang {
  return useContext(I18nContext).lang;
}
