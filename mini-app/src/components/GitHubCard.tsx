import type { GithubProfile } from "../lib/api";
import { useT } from "../i18n/context";

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

function langColor(lang: string): string {
  return LANG_COLORS[lang] ?? "#6b7280";
}

export default function GitHubCard({ profile }: GitHubCardProps) {
  const t = useT();
  const { languages, top_repos, total_stars, total_forks, public_repos } = profile;

  const langEntries = languages
    ? Object.entries(languages).sort((a, b) => b[1] - a[1])
    : [];
  const langTotal = langEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      {/* Languages */}
      {langEntries.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t("github.languages" as any)}</h3>
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
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t("github.topRepos" as any)}</h3>
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

      {/* Stats */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div className="flex gap-4 text-center">
          <div>
            <div className="text-sm font-semibold text-white">{total_stars}</div>
            <div className="text-[10px] text-slate-500">{t("github.stars" as any)}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{total_forks}</div>
            <div className="text-[10px] text-slate-500">{t("github.forks" as any)}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{public_repos}</div>
            <div className="text-[10px] text-slate-500">{t("github.repos" as any)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
