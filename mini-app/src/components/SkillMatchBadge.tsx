import { useState } from "react";

interface SkillMatchBadgeProps {
  matchPercent: number;
  matched: string[];
  missing: string[];
}

export default function SkillMatchBadge({ matchPercent, matched, missing }: SkillMatchBadgeProps) {
  const [open, setOpen] = useState(false);

  const config =
    matchPercent > 70
      ? { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20", ring: "ring-green-500/30" }
      : matchPercent >= 40
        ? { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", ring: "ring-amber-500/30" }
        : { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", ring: "ring-red-500/30" };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${config.bg} ${config.text} ${config.border} hover:ring-1 ${config.ring}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        {matchPercent}% match
      </button>

      {open && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-xl border border-white/10 bg-zinc-900 p-3 shadow-xl text-xs">
          {/* arrow */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-zinc-900 border-l border-t border-white/10" />

          {matched.length > 0 && (
            <div className="mb-2">
              <p className="text-green-400 font-semibold mb-1">Matched</p>
              <ul className="space-y-0.5">
                {matched.map((s) => (
                  <li key={s} className="text-green-300/80 flex items-center gap-1">
                    <span className="text-green-400">&#10003;</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missing.length > 0 && (
            <div>
              <p className="text-red-400 font-semibold mb-1">Missing</p>
              <ul className="space-y-0.5">
                {missing.map((s) => (
                  <li key={s} className="text-red-300/80 flex items-center gap-1">
                    <span className="text-red-400">&#10007;</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
