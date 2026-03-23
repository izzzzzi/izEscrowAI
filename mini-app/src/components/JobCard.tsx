import { useNavigate } from "react-router-dom";
import { type ParsedJob } from "../lib/api";

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function JobCard({ job, onClick }: { job: ParsedJob; onClick?: () => void }) {
  const navigate = useNavigate();
  const matchPercent = job.skill_match?.match_percent;
  const matchColor = matchPercent != null
    ? matchPercent >= 70 ? "bg-green-500/10 text-green-400 border-green-500/20"
      : matchPercent >= 40 ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
        : "bg-red-500/10 text-red-400 border-red-500/20"
    : null;

  return (
    <button
      type="button"
      onClick={() => {
        navigate(`/market/${job.id}`);
        onClick?.();
      }}
      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-blue-500/30 transition-colors cursor-pointer text-left w-full"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-white truncate flex-1">{job.title}</h3>
        <span className="text-[10px] text-slate-500 whitespace-nowrap">{timeAgo(job.created_at)}</span>
      </div>

      {job.required_skills && job.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {job.required_skills.slice(0, 5).map((skill) => (
            <span key={skill} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium">
              {skill}
            </span>
          ))}
          {job.required_skills.length > 5 && (
            <span className="text-[10px] text-slate-500">+{job.required_skills.length - 5}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">
          {job.budget_min_ton || job.budget_max_ton ? (
            <span>
              {job.budget_min_ton && job.budget_max_ton && job.budget_min_ton === job.budget_max_ton
                ? `${job.budget_min_ton.toLocaleString()} TON`
                : <>
                    {job.budget_min_ton ? `from ${job.budget_min_ton.toLocaleString()}` : ""}
                    {job.budget_max_ton ? ` to ${job.budget_max_ton.toLocaleString()}` : ""} TON
                  </>
              }
            </span>
          ) : job.budget_min || job.budget_max ? (
            <span>
              {job.budget_min && job.budget_max && job.budget_min === job.budget_max
                ? `${job.budget_min.toLocaleString()} ${job.currency}`
                : <>
                    {job.budget_min ? `from ${job.budget_min.toLocaleString()}` : ""}
                    {job.budget_max ? ` to ${job.budget_max.toLocaleString()}` : ""} {job.currency}
                  </>
              }
            </span>
          ) : (
            <span>No budget specified</span>
          )}
        </div>
        {matchColor && matchPercent != null && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${matchColor}`}>
            {matchPercent}% match
          </span>
        )}
      </div>
    </button>
  );
}
