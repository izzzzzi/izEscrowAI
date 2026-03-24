import { Helmet } from "react-helmet-async";
import { useT } from "../i18n/context";
import type { TranslationKey } from "../i18n/en";

const sections: { titleKey: string; textKey: string }[] = [
  { titleKey: "legal.terms.service.title", textKey: "legal.terms.service.text" },
  { titleKey: "legal.terms.custody.title", textKey: "legal.terms.custody.text" },
  { titleKey: "legal.terms.ai.title", textKey: "legal.terms.ai.text" },
  { titleKey: "legal.terms.fees.title", textKey: "legal.terms.fees.text" },
  { titleKey: "legal.terms.user.title", textKey: "legal.terms.user.text" },
  { titleKey: "legal.terms.ip.title", textKey: "legal.terms.ip.text" },
  { titleKey: "legal.terms.disclaimer.title", textKey: "legal.terms.disclaimer.text" },
  { titleKey: "legal.terms.contact.title", textKey: "legal.terms.contact.text" },
];

export default function TermsPage() {
  const t = useT();
  return (
    <div className="min-h-screen page-shell pt-28 pb-16 px-6">
      <Helmet><title>{t("legal.terms.title" as TranslationKey)} — izEscrowAI</title></Helmet>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">{t("legal.terms.title" as TranslationKey)}</h1>
          <p className="text-xs text-slate-500">{t("legal.terms.updated" as TranslationKey)}</p>
        </div>
        <p className="text-sm text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          {t("legal.terms.intro" as TranslationKey)}
        </p>
        {sections.map((s) => (
          <div key={s.titleKey} className="space-y-2">
            <h2 className="text-lg font-semibold text-white">{t(s.titleKey as TranslationKey)}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{t(s.textKey as TranslationKey)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
