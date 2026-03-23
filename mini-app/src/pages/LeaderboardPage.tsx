import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLeaderboard, type GroupStat } from "../lib/api";
import { useIsMiniApp } from "../hooks/useIsMiniApp";
import AppHeader from "../components/AppHeader";

type SortKey = "completed_deals" | "total_volume" | "avg_check";

const sortTabs: { key: SortKey; label: string }[] = [
  { key: "completed_deals", label: "Deals" },
  { key: "total_volume", label: "Volume" },
  { key: "avg_check", label: "Avg Check" },
];

export default function LeaderboardPage() {
  const isMini = useIsMiniApp();
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
    <div className={isMini ? "mini-page" : "min-h-screen page-shell pt-28 pb-16 px-6"}>
      {isMini && <AppHeader />}
      <div className={isMini ? "px-5 space-y-6" : "max-w-3xl mx-auto space-y-6"}>
        <div>
          <h1 className="text-2xl font-bold text-white">Group Leaderboard</h1>
          <p className="text-sm text-slate-400 mt-1">Telegram groups ranked by escrow activity</p>
        </div>

        <div className="flex gap-2">
          {sortTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSort(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-medium border-none cursor-pointer transition-colors ${
                sort === tab.key
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl h-20 animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="space-y-6">
            <div className="text-center py-16">
              <iconify-icon icon="solar:users-group-rounded-linear" width="56" class="text-slate-600" />
              <p className="text-lg text-slate-400 mt-4">No groups with escrow activity yet</p>
              <p className="text-sm text-slate-500 mt-2">Groups appear here once deals are completed through the bot</p>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <iconify-icon icon="solar:info-circle-linear" width="18" class="text-blue-400" />
                How to get listed
              </h3>
              <ol className="space-y-3 text-sm text-slate-400">
                <li className="flex gap-3">
                  <span className="text-blue-400 font-semibold">1.</span>
                  Add <a href="https://t.me/izEscrowAIBot" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">@izEscrowAIBot</a> to your Telegram group
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-semibold">2.</span>
                  Create deals using inline mode: type <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">@izEscrowAIBot</code> in the group
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-semibold">3.</span>
                  Complete deals — groups with finished escrow transactions appear on the leaderboard
                </li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g, i) => (
              <button
                key={g.group_id}
                onClick={() => navigate(`/groups/${g.group_id}`)}
                className="bg-white/5 border border-white/10 rounded-2xl w-full p-4 flex items-center gap-4 cursor-pointer text-left hover:border-blue-500/30 transition-colors"
              >
                <span className="text-xl w-10 text-center flex-shrink-0">{medal(i)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {g.title || `Group ${g.group_id}`}
                  </p>
                  {g.username && <p className="text-xs text-slate-400">@{g.username}</p>}
                </div>
                <div className="text-right flex-shrink-0">
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
    </div>
  );
}
