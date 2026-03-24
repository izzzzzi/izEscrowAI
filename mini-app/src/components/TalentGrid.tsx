import { useT } from "../i18n/context";

interface TalentGridProps {
  languages: Array<{ name: string; count: number }>;
  categories: Array<{ name: string; count: number; coming_soon?: boolean }>;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "from-blue-500 to-blue-400",
  JavaScript: "from-yellow-500 to-amber-400",
  Python: "from-green-500 to-emerald-400",
  Go: "from-cyan-500 to-sky-400",
  Rust: "from-orange-500 to-red-400",
  Java: "from-red-500 to-rose-400",
  C: "from-slate-400 to-slate-300",
  "C++": "from-purple-500 to-violet-400",
  Ruby: "from-red-600 to-red-400",
  PHP: "from-indigo-500 to-blue-400",
  Kotlin: "from-purple-500 to-pink-400",
  Swift: "from-orange-500 to-orange-400",
  Shell: "from-green-600 to-green-400",
};

const CAT_ICONS: Record<string, string> = {
  Development: "solar:code-linear",
  Design: "solar:palette-linear",
  Marketing: "solar:megaphone-linear",
  Content: "solar:document-text-linear",
  Data: "solar:chart-2-linear",
  DevOps: "solar:server-linear",
  Mobile: "solar:smartphone-linear",
  Blockchain: "solar:link-round-linear",
};

function getGradient(name: string, idx: number): string {
  if (LANG_COLORS[name]) return LANG_COLORS[name];
  const fallbacks = ["from-blue-500 to-cyan-400", "from-emerald-500 to-green-400", "from-violet-500 to-purple-400", "from-amber-500 to-yellow-400", "from-rose-500 to-pink-400", "from-cyan-500 to-sky-400", "from-fuchsia-500 to-pink-400", "from-lime-500 to-green-400"];
  return fallbacks[idx % fallbacks.length];
}

export default function TalentGrid({ languages, categories }: TalentGridProps) {
  const t = useT();
  const topLanguages = languages.slice(0, 8);
  const maxCount = Math.max(...topLanguages.map((l) => l.count), 1);
  const totalDevs = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-6">
      {/* Language chart */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            {t("talent.topLanguages" as any)}
          </h3>
          <span className="text-xs text-slate-500">
            {totalDevs} {t("talent.verified" as any)}
          </span>
        </div>
        <div className="space-y-2.5">
          {topLanguages.map((lang, i) => (
            <div key={lang.name} className="flex items-center gap-3 group">
              <span className="text-xs text-slate-300 w-20 text-right shrink-0 truncate font-medium group-hover:text-white transition-colors">
                {lang.name}
              </span>
              <div className="flex-1 h-6 rounded-lg bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-lg bg-gradient-to-r ${getGradient(lang.name, i)} transition-all duration-500 group-hover:opacity-90`}
                  style={{ width: `${(lang.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-500 w-8 shrink-0 text-right">
                {lang.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const icon = CAT_ICONS[cat.name] || "solar:widget-linear";
          return (
            <div
              key={cat.name}
              className={`glass-card rounded-xl p-4 hover-lift ${cat.coming_soon ? "opacity-40" : ""}`}
            >
              <iconify-icon icon={icon} width="20" class="text-[#0098EA] mb-2" />
              <div className="text-sm font-medium mb-0.5">{cat.name}</div>
              <div className="text-lg font-bold tracking-tight">
                {cat.count}
                {cat.coming_soon && (
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-amber-400 ml-2">
                    soon
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
