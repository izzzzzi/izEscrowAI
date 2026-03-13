import { useEffect, useRef, useState } from "react";

interface StatCounterProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export default function StatCounter({
  value,
  label,
  prefix = "",
  suffix = "",
}: StatCounterProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const duration = 1500; // ms
    let start: number | null = null;

    function tick(timestamp: number) {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);

      setDisplay(eased * value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl font-bold tracking-tight text-white">
        {prefix}
        {formatNumber(display)}
        {suffix}
      </span>
      <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
        {label}
      </span>
    </div>
  );
}
