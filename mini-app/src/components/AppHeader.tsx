import { useT } from "../i18n/context";

export default function AppHeader() {
  const t = useT();

  return (
    <header className="sticky top-0 z-40 px-5 pt-6 pb-4 bg-[#0f172a]/80 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0098EA] to-[#22d3ee] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <iconify-icon icon="solar:shield-check-linear" class="text-white" width="20" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">{t("header.title")}</h1>
        </div>
        <span className="bg-emerald-500/10 text-emerald-400 text-[0.65rem] font-semibold uppercase tracking-widest px-2 py-0.5 rounded border border-emerald-500/20">
          {t("header.live")}
        </span>
      </div>
    </header>
  );
}
