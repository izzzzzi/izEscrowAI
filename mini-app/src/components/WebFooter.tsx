import { useT } from "../i18n/context";

export default function WebFooter() {
  const t = useT();

  return (
    <footer className="py-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 ton-gradient rounded-md flex items-center justify-center">
            <iconify-icon icon="solar:shield-check-linear" width="14" height="14" class="text-white" />
          </div>
          <span className="text-sm font-medium tracking-tight">izEscrowAI</span>
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs font-medium text-slate-500 uppercase tracking-widest">
          <a href="https://github.com/izzzzzi/izEscrowAI" target="_blank" rel="noopener noreferrer" className="hover:text-[#0098EA] transition-colors no-underline text-slate-500">GitHub</a>
          <a href="https://t.me/izEscrowAIBot" target="_blank" rel="noopener noreferrer" className="hover:text-[#0098EA] transition-colors no-underline text-slate-500">Bot</a>
        </div>

        <a
          href="https://identityhub.app/contests/ai-hackathon"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-medium hover:bg-blue-500/20 transition-colors no-underline"
        >
          <iconify-icon icon="simple-icons:ton" width="14" />
          {t("landing.footer.hackathon" as any)}
        </a>
      </div>
    </footer>
  );
}
