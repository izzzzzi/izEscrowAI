import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchGroup, type GroupStat } from "../lib/api";

export default function GroupDashboardPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    fetchGroup(parseInt(groupId))
      .then(setGroup)
      .catch(() => setError("Group not found"))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400 mb-4">{error || "Group not found"}</p>
        <button onClick={() => navigate("/groups")} className="text-blue-400 underline bg-transparent border-none cursor-pointer">
          View Leaderboard
        </button>
      </div>
    );
  }

  const stats = [
    { label: "Offers", value: group.total_offers, icon: "solar:clipboard-list-linear" },
    { label: "Deals", value: group.completed_deals, icon: "solar:check-circle-linear" },
    { label: "Volume", value: `${group.total_volume.toFixed(1)} TON`, icon: "solar:wallet-linear" },
    { label: "Avg Check", value: group.avg_check ? `${group.avg_check.toFixed(1)} TON` : "—", icon: "solar:chart-linear" },
    { label: "Conversion", value: group.conversion_rate ? `${(group.conversion_rate * 100).toFixed(0)}%` : "—", icon: "solar:sort-linear" },
    { label: "Members", value: group.member_count ?? "—", icon: "solar:users-group-rounded-linear" },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/groups")} className="text-slate-400 bg-transparent border-none cursor-pointer">
          <iconify-icon icon="solar:arrow-left-linear" width="24" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">{group.title || `Group ${group.group_id}`}</h1>
          {group.username && <p className="text-xs text-slate-400">@{group.username}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-3 rounded-xl">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <iconify-icon icon={s.icon} width="16" />
              <span className="text-xs">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {group.category && (
        <div className="glass-card p-3 rounded-xl">
          <span className="text-xs text-slate-400">Category</span>
          <p className="text-sm text-white font-medium">{group.category}</p>
        </div>
      )}

      {group.last_activity_at && (
        <p className="text-xs text-slate-500 text-center">
          Last activity: {new Date(group.last_activity_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
