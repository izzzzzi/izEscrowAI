import { type JobResponse } from "../lib/api";

interface RespondentCardProps {
  response: JobResponse;
  onCreateDeal: () => void;
}

export default function RespondentCard({ response, onCreateDeal }: RespondentCardProps) {
  const executor = response.executor;
  if (!executor) return null;

  const topLanguages = executor.github?.languages
    ? Object.entries(executor.github.languages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([lang]) => lang)
    : [];

  const matchPercent = executor.skill_match?.percent;
  const matchColor = matchPercent != null
    ? matchPercent >= 70 ? "bg-green-500/10 text-green-400 border-green-500/20"
      : matchPercent >= 40 ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
        : "bg-red-500/10 text-red-400 border-red-500/20"
    : null;

  return (
    <div className="bg-white/5 rounded-xl p-4 space-y-3">
      {/* Header: avatar + username + trust */}
      <div className="flex items-center gap-3">
        {executor.github?.avatar_url ? (
          <img src={executor.github.avatar_url} alt="" className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
            <iconify-icon icon="solar:user-linear" width="20" class="text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">
              {executor.github?.username || `User #${executor.user_id}`}
            </span>
            {matchColor && matchPercent != null && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${matchColor}`}>
                {matchPercent}% match
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {executor.trust_score !== null && (
              <span>Trust: {executor.trust_score}</span>
            )}
            <span>{executor.reputation.completed_deals} deals</span>
            {executor.reputation.avg_rating > 0 && (
              <span>{executor.reputation.avg_rating.toFixed(1)}/5</span>
            )}
          </div>
        </div>
      </div>

      {/* Languages */}
      {topLanguages.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {topLanguages.map((lang) => (
            <span key={lang} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium">
              {lang}
            </span>
          ))}
        </div>
      )}

      {/* Proposal preview */}
      <p className="text-xs text-slate-300 leading-relaxed">
        {response.proposal_text.length > 100
          ? response.proposal_text.slice(0, 100) + "..."
          : response.proposal_text}
      </p>

      {/* Create Deal button */}
      <button
        type="button"
        onClick={onCreateDeal}
        className="w-full py-2 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors cursor-pointer"
      >
        Create Deal
      </button>
    </div>
  );
}
