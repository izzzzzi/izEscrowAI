interface UserCardProps {
  userId: number;
  name?: string;
  rating: number;
  dealCount: number;
  trustScore: number | null;
  compact?: boolean;
  onClick?: () => void;
}

export default function UserCard({ name, rating, dealCount, trustScore, compact, onClick }: UserCardProps) {
  const trustBadge = trustScore !== null
    ? trustScore >= 80 ? { label: "Excellent", color: "text-green-400 bg-green-500/10" }
    : trustScore >= 60 ? { label: "Good", color: "text-blue-400 bg-blue-500/10" }
    : trustScore >= 40 ? { label: "Average", color: "text-amber-400 bg-amber-500/10" }
    : { label: "Low", color: "text-red-400 bg-red-500/10" }
    : null;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer text-left p-0"
      >
        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
          <iconify-icon icon="solar:user-linear" width="14" class="text-slate-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-white">{name || "User"}</span>
          <span className="text-[0.6rem] text-slate-500">{dealCount} deals</span>
        </div>
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-xl p-3 flex items-center gap-3 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
        <iconify-icon icon="solar:user-linear" width="20" class="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{name || "User"}</span>
          {trustBadge && (
            <span className={`text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full ${trustBadge.color}`}>
              {trustBadge.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
          {rating > 0 && (
            <span className="flex items-center gap-0.5">
              <iconify-icon icon="solar:star-bold" width="10" class="text-amber-400" />
              {rating.toFixed(1)}
            </span>
          )}
          <span>{dealCount} deals</span>
        </div>
      </div>
    </div>
  );
}
