interface RiskBadgeProps {
  score: number;
  level: "low" | "medium" | "high";
  size?: "sm" | "md";
}

export default function RiskBadge({ score, level, size = "md" }: RiskBadgeProps) {
  const config = {
    low: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
    medium: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
    high: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  }[level];

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[0.6rem] font-semibold ${config.bg} ${config.text}`}>
        {score}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${config.bg} ${config.text} ${config.border}`}>
      <iconify-icon icon="solar:shield-check-linear" width="14" />
      <span className="text-xs font-semibold">{level}</span>
      <span className="text-xs opacity-70">({score})</span>
    </div>
  );
}
