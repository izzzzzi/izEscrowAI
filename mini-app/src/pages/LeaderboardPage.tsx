import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLeaderboard, type GroupStat } from "../lib/api";

type SortKey = "completed_deals" | "total_volume" | "avg_check";

const sortTabs: { key: SortKey; label: string }[] = [
  { key: "completed_deals", label: "Deals" },
  { key: "total_volume", label: "Volume" },
  { key: "avg_check", label: "Avg Check" },
];

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("completed_deals");

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard(sort, 20)
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [sort]);

  const medal = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-white">Group Leaderboard</h1>

      <div className="flex gap-2">
        {sortTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSort(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-colors ${
              sort === tab.key
                ? "bg-blue-500/20 text-blue-400"
                : "bg-white/5 text-slate-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12">
          <iconify-icon icon="solar:users-group-rounded-linear" width="48" class="text-slate-600" />
          <p className="text-slate-400 mt-3">No groups with escrow activity yet</p>
          <p className="text-xs text-slate-500 mt-1">Add the bot to a group to start tracking</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g, i) => (
            <button
              key={g.group_id}
              onClick={() => navigate(`/groups/${g.group_id}`)}
              className="glass-card w-full p-3 rounded-xl flex items-center gap-3 border-none cursor-pointer text-left"
            >
              <span className="text-lg w-8 text-center">{medal(i)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {g.title || `Group ${g.group_id}`}
                </p>
                {g.username && <p className="text-xs text-slate-400">@{g.username}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">
                  {sort === "total_volume"
                    ? `${g.total_volume.toFixed(1)} TON`
                    : sort === "avg_check"
                    ? g.avg_check ? `${g.avg_check.toFixed(1)} TON` : "—"
                    : g.completed_deals}
                </p>
                <p className="text-xs text-slate-400">
                  {sort === "completed_deals" ? "deals" : sort === "total_volume" ? "volume" : "avg"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
