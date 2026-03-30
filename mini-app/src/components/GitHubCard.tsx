import type { GithubProfile } from "../lib/api";
interface GitHubCardProps {
  profile: GithubProfile;
  flags?: { green: string[]; red: string[] } | null;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d",
  Ruby: "#701516", PHP: "#4F5D95", Swift: "#F05138", Kotlin: "#A97BFF",
  Solidity: "#AA6746", HTML: "#e34c26", CSS: "#563d7c", Shell: "#89e051",
  C: "#555555", "C#": "#178600", Dart: "#00B4AB",
};

const FLAG_LABELS: Record<string, { en: string; ru: string; icon: string; color: "green" | "red" }> = {
  established: { en: "Established", ru: "Опытный", icon: "solar:verified-check-bold", color: "green" },
  starred_repos: { en: "Popular repos", ru: "Популярные репо", icon: "solar:star-bold", color: "green" },
  external_prs: { en: "Open source", ru: "Open source", icon: "solar:code-scan-linear", color: "green" },
  org_member: { en: "Org member", ru: "В организации", icon: "solar:buildings-linear", color: "green" },
  new_account: { en: "New account", ru: "Новый аккаунт", icon: "solar:danger-triangle-linear", color: "red" },
  all_forks: { en: "All forks", ru: "Только форки", icon: "solar:danger-triangle-linear", color: "red" },
  empty_activity: { en: "No activity", ru: "Нет активности", icon: "solar:danger-triangle-linear", color: "red" },
  burst_activity: { en: "Sudden activity", ru: "Всплеск", icon: "solar:danger-triangle-linear", color: "red" },
};

function langColor(lang: string): string {
  return LANG_COLORS[lang] ?? "#6b7280";
}

export default function GitHubCard({ profile, flags }: GitHubCardProps) {
  const { languages, top_repos, total_stars, total_forks, public_repos } = profile;
  const mergedFlags = flags ?? profile.flags;

  const langEntries = languages
    ? Object.entries(languages).sort((a, b) => b[1] - a[1])
    : [];
  const langTotal = langEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      {/* Languages */}
      {langEntries.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Languages</h3>
          <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
            {langEntries.map(([lang, count]) => (
              <div
                key={lang}
                title={`${lang} ${((count / langTotal) * 100).toFixed(0)}%`}
                style={{ width: `${(count / langTotal) * 100}%`, backgroundColor: langColor(lang) }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {langEntries.slice(0, 6).map(([lang, count]) => (
              <span key={lang} className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: langColor(lang) }} />
                {lang} {((count / langTotal) * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top Repos */}
      {top_repos && top_repos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Top Repos</h3>
          <div className="space-y-1.5">
            {top_repos.slice(0, 5).map((repo) => (
              <div key={repo.name} className="flex items-center justify-between text-xs">
                <span className="text-slate-200 truncate max-w-[55%]">{repo.name}</span>
                <span className="flex items-center gap-2 text-slate-500 shrink-0">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: langColor(repo.language) }} />
                      <span className="text-slate-400">{repo.language}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <iconify-icon icon="solar:star-bold" width="10" class="text-amber-400" />
                    {repo.stars}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats + Flags */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div className="flex gap-4 text-center">
          <div>
            <div className="text-sm font-semibold text-white">{total_stars}</div>
            <div className="text-[10px] text-slate-500">Stars</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{total_forks}</div>
            <div className="text-[10px] text-slate-500">Forks</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{public_repos}</div>
            <div className="text-[10px] text-slate-500">Repos</div>
          </div>
        </div>

        {mergedFlags && (mergedFlags.green.length > 0 || mergedFlags.red.length > 0) && (
          <div className="flex flex-wrap gap-1 justify-end">
            {[...mergedFlags.green, ...mergedFlags.red].map((f) => {
              const cfg = FLAG_LABELS[f];
              if (!cfg) return null;
              const isGreen = cfg.color === "green";
              return (
                <span
                  key={f}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isGreen
                      ? "bg-green-500/10 text-green-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  <iconify-icon icon={cfg.icon} width="11" />
                  {cfg.en}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
