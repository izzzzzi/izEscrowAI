const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  // Green statuses
  active:    { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  new:       { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  open:      { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  completed: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  verified:  { bg: "bg-blue-500/10",  text: "text-blue-400",  border: "border-blue-500/20"  },

  // Yellow statuses
  paused:    { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  pending:   { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  review:    { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },

  // Red statuses
  disabled:  { bg: "bg-red-500/10",   text: "text-red-400",   border: "border-red-500/20"   },
  expired:   { bg: "bg-red-500/10",   text: "text-red-400",   border: "border-red-500/20"   },
  spam:      { bg: "bg-red-500/10",   text: "text-red-400",   border: "border-red-500/20"   },
  banned:    { bg: "bg-red-500/10",   text: "text-red-400",   border: "border-red-500/20"   },
  rejected:  { bg: "bg-red-500/10",   text: "text-red-400",   border: "border-red-500/20"   },
  closed:    { bg: "bg-red-500/10",   text: "text-red-400",   border: "border-red-500/20"   },
};

const defaultColors = { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" };

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "outline";
}

export default function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
  const colors = statusColors[status.toLowerCase()] ?? defaultColors;

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full
        text-[0.65rem] font-semibold uppercase tracking-wider whitespace-nowrap
        ${colors.bg} ${colors.text}
        ${variant === "outline" ? `border ${colors.border}` : ""}
      `}
    >
      {status}
    </span>
  );
}
