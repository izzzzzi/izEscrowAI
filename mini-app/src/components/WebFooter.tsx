import { useT } from "../i18n/context";
import Icon from "./Icon";

export default function WebFooter() {
  const t = useT();

  return (
    <footer className="py-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 ton-gradient rounded-md flex items-center justify-center">
            <Icon icon="solar:shield-check-linear" size={14} className="text-white" />
          </div>
          <span className="text-sm font-medium tracking-tight">izEscrowAI</span>
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs font-medium text-slate-500 uppercase tracking-widest">
          <a href="https://github.com/izzzzzi/izEscrowAI" target="_blank" rel="noopener noreferrer" className="hover:text-[#0098EA] transition-colors no-underline text-slate-500">GitHub</a>
          <a href="https://t.me/izEscrowAIBot" target="_blank" rel="noopener noreferrer" className="hover:text-[#0098EA] transition-colors no-underline text-slate-500">Bot</a>
          <a href="/terms" className="hover:text-[#0098EA] transition-colors no-underline text-slate-500">{t("legal.footer.terms" as any)}</a>
          <a href="/privacy" className="hover:text-[#0098EA] transition-colors no-underline text-slate-500">{t("legal.footer.privacy" as any)}</a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://ton.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-colors no-underline"
          >
            <Icon icon="simple-icons:ton" size={14} className="text-[#0098EA]" />
            <span className="text-[10px] text-blue-400 font-medium">{t("landing.footer.built" as any)}</span>
          </a>
          <a
            href="https://identityhub.app/contests/ai-hackathon"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] text-slate-400 font-medium hover:text-white transition-colors no-underline"
          >
            {t("landing.footer.hackathon" as any)}
          </a>
        </div>
      </div>
    </footer>
  );
}
