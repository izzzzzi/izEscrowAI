interface TrustBadgeProps {
  score: number | null;
  size?: "sm" | "md";
}

export default function TrustBadge({ score, size = "sm" }: TrustBadgeProps) {
  if (score === null || score === undefined) {
    // "New" variant for users with 0 deals / no score
    const dim = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
    return (
      <span
        className={`${dim} inline-flex items-center justify-center rounded-full bg-slate-500/20 text-slate-400 font-semibold border border-slate-500/20`}
        title="New user"
      >
        N
      </span>
    );
  }

  const color =
    score >= 70
      ? "bg-green-500/20 text-green-400 border-green-500/20"
      : score >= 40
      ? "bg-amber-500/20 text-amber-400 border-amber-500/20"
      : "bg-red-500/20 text-red-400 border-red-500/20";

  const dim = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";

  return (
    <span
      className={`${dim} ${color} inline-flex items-center justify-center rounded-full font-semibold border`}
      title={`Trust Score: ${score}`}
    >
      {score}
    </span>
  );
}
