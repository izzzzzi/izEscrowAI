import { type MyJob } from "../lib/api";

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function MyJobCard({ job, onClick }: { job: MyJob; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-blue-500/30 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-white truncate flex-1">{job.title}</h3>
        <span className="text-[10px] text-slate-500 whitespace-nowrap">{timeAgo(job.created_at)}</span>
      </div>

      {job.required_skills && job.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {job.required_skills.slice(0, 3).map((skill) => (
            <span key={skill} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium">
              {skill}
            </span>
          ))}
          {job.required_skills.length > 3 && (
            <span className="text-[10px] text-slate-500">+{job.required_skills.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">
          {job.budget_min || job.budget_max ? (
            <span>
              {job.budget_min ? `от ${job.budget_min.toLocaleString()}` : ""}
              {job.budget_max ? ` до ${job.budget_max.toLocaleString()}` : ""} {job.currency}
            </span>
          ) : (
            <span>Бюджет не указан</span>
          )}
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20">
          {job.response_count} {job.response_count === 1 ? "отклик" : "откликов"}
        </span>
      </div>
    </div>
  );
}
