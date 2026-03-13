import { useEffect, useState } from "react";
import { fetchActivity, type ActivityItem } from "../lib/api";

const statusIcon: Record<string, string> = {
  completed: "\u2705",
  funded: "\uD83D\uDCB0",
  created: "\uD83D\uDCDD",
  delivered: "\uD83D\uDCE6",
  dispute: "\u26A0\uFE0F",
};

function getIcon(status: string): string {
  return statusIcon[status] ?? "\uD83D\uDCCB";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2 animate-pulse">
          <div className="w-6 h-6 rounded-full bg-white/5" />
          <div className="flex-1 h-4 rounded bg-white/5" />
          <div className="w-16 h-4 rounded bg-white/5" />
          <div className="w-12 h-3 rounded bg-white/5" />
        </div>
      ))}
    </>
  );
}

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchActivity();
        if (!cancelled) {
          setItems(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Recent Activity</h2>
        <span className="text-[0.6rem] text-slate-500 uppercase tracking-wider">Live</span>
      </div>

      <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
        {loading ? (
          <SkeletonRows />
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            No recent activity
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-base shrink-0" role="img">
                {getIcon(item.status)}
              </span>
              <span className="flex-1 min-w-0 text-sm text-slate-300 line-clamp-1">
                {item.description}
              </span>
              <span className="text-sm font-medium whitespace-nowrap">
                {item.amount}{" "}
                <span className="text-xs text-slate-500">{item.currency}</span>
              </span>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {relativeTime(item.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
