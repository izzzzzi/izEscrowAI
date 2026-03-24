import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import en, { type TranslationKey } from "./en";
import ru from "./ru";

export type Lang = "en" | "ru";

const locales: Record<Lang, Record<TranslationKey, string>> = { en, ru };

function detectLanguage(): Lang {
  // 1. Check localStorage override
  try {
    const saved = localStorage.getItem("lang-override");
    if (saved === "en" || saved === "ru") return saved;
  } catch { /* ignore */ }
  // 2. Telegram user language
  try {
    // @ts-expect-error - Telegram WebApp global
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    if (typeof tgLang === "string" && tgLang.startsWith("ru")) return "ru";
  } catch { /* ignore */ }
  // 3. Browser language
  try {
    if (navigator.language?.startsWith("ru")) return "ru";
  } catch { /* ignore */ }
  return "en";
}

type TFunction = (key: TranslationKey) => string;

const I18nContext = createContext<{ t: TFunction; lang: Lang; setLang: (l: Lang) => void }>({
  t: (key) => en[key],
  lang: "en",
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLanguage);
  const strings = locales[lang];
  const t: TFunction = (key) => strings[key] ?? en[key] ?? key;

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang-override", l); } catch { /* ignore */ }
  }, []);

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
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

export function useSetLang(): (l: Lang) => void {
  return useContext(I18nContext).setLang;
}
