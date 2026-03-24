import { Helmet } from "react-helmet-async";
import { useT } from "../i18n/context";
import type { TranslationKey } from "../i18n/en";

const collectKeys = [
  "legal.privacy.collect.telegram",
  "legal.privacy.collect.wallet",
  "legal.privacy.collect.github",
  "legal.privacy.collect.deals",
  "legal.privacy.collect.jobs",
  "legal.privacy.collect.technical",
];

const sections: { titleKey: string; textKey?: string; listKeys?: string[] }[] = [
  { titleKey: "legal.privacy.collect.title", listKeys: collectKeys },
  { titleKey: "legal.privacy.purpose.title", textKey: "legal.privacy.purpose.text" },
  { titleKey: "legal.privacy.storage.title", textKey: "legal.privacy.storage.text" },
  { titleKey: "legal.privacy.third.title", textKey: "legal.privacy.third.text" },
  { titleKey: "legal.privacy.rights.title", textKey: "legal.privacy.rights.text" },
  { titleKey: "legal.privacy.changes.title", textKey: "legal.privacy.changes.text" },
  { titleKey: "legal.privacy.contact.title", textKey: "legal.privacy.contact.text" },
];

export default function PrivacyPage() {
  const t = useT();
  return (
    <div className="min-h-screen page-shell pt-28 pb-16 px-6">
      <Helmet><title>{t("legal.privacy.title" as TranslationKey)} — izEscrowAI</title></Helmet>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">{t("legal.privacy.title" as TranslationKey)}</h1>
          <p className="text-xs text-slate-500">{t("legal.privacy.updated" as TranslationKey)}</p>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          {t("legal.privacy.intro" as TranslationKey)}
        </p>
        {sections.map((s) => (
          <div key={s.titleKey} className="space-y-2">
            <h2 className="text-lg font-semibold text-white">{t(s.titleKey as TranslationKey)}</h2>
            {s.textKey && <p className="text-sm text-slate-400 leading-relaxed">{t(s.textKey as TranslationKey)}</p>}
            {s.listKeys && (
              <ul className="space-y-1.5 text-sm text-slate-400">
                {s.listKeys.map((k) => (
                  <li key={k} className="flex gap-2">
                    <span className="text-[#0098EA] mt-1">•</span>
                    <span>{t(k as TranslationKey)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
