import type { GithubProfile } from "../lib/api";

interface GitHubCardProps {
  profile: GithubProfile;
  flags?: { green: string[]; red: string[] } | null;
}

const FLAG_LABELS: Record<string, string> = {
  established: "Established \u2705",
  starred_repos: "Popular repos \u2B50",
  external_prs: "Open source contributor \uD83D\uDD00",
  org_member: "Org member \uD83C\uDFE2",
  new_account: "New account \u26A0\uFE0F",
  all_forks: "All repos forked \u26A0\uFE0F",
  empty_activity: "No activity \u26A0\uFE0F",
  burst_activity: "Sudden activity \u26A0\uFE0F",
};

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Solidity: "#AA6746",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Dart: "#00B4AB",
  Lua: "#000080",
};

function langColor(lang: string): string {
  return LANG_COLORS[lang] ?? "#6b7280";
}

export default function GitHubCard({ profile, flags }: GitHubCardProps) {
  const {
    avatar_url,
    username,
    profile_url,
    bio,
    languages,
    top_repos,
    total_stars,
    total_forks,
    public_repos,
    github_score,
  } = profile;

  const mergedFlags = flags ?? profile.flags;

  // Build language segments
  const langEntries = languages
    ? Object.entries(languages).sort((a, b) => b[1] - a[1])
    : [];
  const langTotal = langEntries.reduce((s, [, v]) => s + v, 0);

  // Score ring
  const score = github_score ?? 0;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  const scoreColor =
    score >= 70
      ? "text-green-400"
      : score >= 40
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {avatar_url ? (
          <img
            src={avatar_url}
            alt={username}
            className="w-12 h-12 rounded-full border border-slate-600"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
            <iconify-icon icon="mdi:github" width="24" class="text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <a
            href={profile_url ?? `https://github.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-white hover:text-blue-400 transition-colors"
          >
            @{username}
          </a>
          {bio && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{bio}</p>
          )}
        </div>
      </div>

      {/* Languages bar */}
      {langEntries.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[0.65rem] font-medium text-slate-400 uppercase tracking-wide">
            Languages
          </span>
          <div className="flex h-2 rounded-full overflow-hidden bg-slate-700">
            {langEntries.map(([lang, count]) => (
              <div
                key={lang}
                title={`${lang} ${((count / langTotal) * 100).toFixed(1)}%`}
                style={{
                  width: `${(count / langTotal) * 100}%`,
                  backgroundColor: langColor(lang),
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {langEntries.slice(0, 6).map(([lang, count]) => (
              <span key={lang} className="flex items-center gap-1 text-[0.6rem] text-slate-400">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: langColor(lang) }}
                />
                {lang} {((count / langTotal) * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top repos */}
      {top_repos && top_repos.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[0.65rem] font-medium text-slate-400 uppercase tracking-wide">
            Top Repos
          </span>
          <ul className="space-y-1">
            {top_repos.slice(0, 5).map((repo) => (
              <li
                key={repo.name}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-slate-200 truncate max-w-[60%]">
                  {repo.name}
                </span>
                <span className="flex items-center gap-2 text-slate-500 shrink-0">
                  {repo.language && (
                    <span className="flex items-center gap-0.5">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: langColor(repo.language) }}
                      />
                      {repo.language}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <iconify-icon icon="solar:star-bold" width="10" class="text-amber-400" />
                    {repo.stars}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats row + Score */}
      <div className="flex items-center gap-4">
        <div className="flex-1 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-semibold text-white">{total_stars}</div>
            <div className="text-[0.6rem] text-slate-500">Stars</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{total_forks}</div>
            <div className="text-[0.6rem] text-slate-500">Forks</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{public_repos}</div>
            <div className="text-[0.6rem] text-slate-500">Repos</div>
          </div>
        </div>

        {/* Circular score */}
        {github_score !== null && (
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-slate-700"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={scoreColor}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-sm font-bold ${scoreColor}`}>{score}</span>
              <span className="text-[0.5rem] text-slate-500">/ 100</span>
            </div>
          </div>
        )}
      </div>

      {/* Flags */}
      {mergedFlags && (mergedFlags.green.length > 0 || mergedFlags.red.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {mergedFlags.green.map((f) => (
            <span
              key={f}
              className="text-[0.6rem] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20"
            >
              {FLAG_LABELS[f] ?? f}
            </span>
          ))}
          {mergedFlags.red.map((f) => (
            <span
              key={f}
              className="text-[0.6rem] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20"
            >
              {FLAG_LABELS[f] ?? f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
