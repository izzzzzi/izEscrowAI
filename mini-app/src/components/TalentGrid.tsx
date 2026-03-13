interface TalentGridProps {
  languages: Array<{ name: string; count: number }>;
  categories: Array<{ name: string; count: number; coming_soon?: boolean }>;
}

const BAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-lime-500",
];

export default function TalentGrid({ languages, categories }: TalentGridProps) {
  const topLanguages = languages.slice(0, 8);
  const maxCount = Math.max(...topLanguages.map((l) => l.count), 1);

  return (
    <div className="space-y-6">
      {/* Language bar chart */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Top Languages
        </h3>
        <div className="space-y-2">
          {topLanguages.map((lang, i) => (
            <div key={lang.name} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-20 text-right shrink-0 truncate">
                {lang.name}
              </span>
              <div className="flex-1 h-5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                  style={{ width: `${(lang.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-500 w-10 shrink-0">
                {lang.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.name}
            className={`glass-card rounded-xl p-4 flex flex-col gap-2 ${
              cat.coming_soon ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{cat.name}</span>
              {cat.coming_soon && (
                <span className="text-[0.6rem] uppercase tracking-wider font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full shrink-0">
                  Coming Soon
                </span>
              )}
            </div>
            <span className="text-lg font-semibold tracking-tight">
              {cat.count}
              <span className="text-xs font-normal text-slate-500 ml-1">
                talents
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
