interface PriceRangeProps {
  min: number;
  max: number;
  median?: number;
  recommended?: number;
  currency?: string;
}

export default function PriceRange({ min, max, median, recommended, currency = "USD" }: PriceRangeProps) {
  const range = max - min;
  if (range <= 0) {
    return (
      <div className="text-sm text-slate-400">
        {min} {currency}
      </div>
    );
  }

  const medianPos = median !== undefined ? ((median - min) / range) * 100 : null;
  const recommendedPos = recommended !== undefined ? ((recommended - min) / range) * 100 : null;

  return (
    <div className="space-y-2">
      {/* Labels row */}
      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
        <span>{min.toLocaleString()} {currency}</span>
        <span>{max.toLocaleString()} {currency}</span>
      </div>

      {/* Bar */}
      <div className="relative h-2 bg-white/5 rounded-full overflow-visible">
        {/* Gradient fill */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600/40 via-cyan-500/40 to-blue-600/40" />

        {/* Median marker */}
        {medianPos !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-400 border-2 border-[#0f172a] z-10"
            style={{ left: `${Math.max(0, Math.min(100, medianPos))}%`, transform: "translate(-50%, -50%)" }}
            title={`Median: ${median} ${currency}`}
          />
        )}

        {/* Recommended marker */}
        {recommendedPos !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-gradient-to-r from-[#0098EA] to-[#00D1FF] border-2 border-[#0f172a] z-20 shadow-lg shadow-cyan-500/30"
            style={{ left: `${Math.max(0, Math.min(100, recommendedPos))}%`, transform: "translate(-50%, -50%)" }}
            title={`Recommended: ${recommended} ${currency}`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500">
        {medianPos !== null && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            Median: {median?.toLocaleString()} {currency}
          </span>
        )}
        {recommendedPos !== null && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-[#0098EA] to-[#00D1FF] inline-block" />
            Recommended: {recommended?.toLocaleString()} {currency}
          </span>
        )}
      </div>
    </div>
  );
}
