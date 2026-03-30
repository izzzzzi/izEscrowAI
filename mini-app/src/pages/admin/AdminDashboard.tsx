import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { fetchAdminDashboard } from "../../lib/api";
import { useT } from "../../i18n/context";
import Icon from "../../components/Icon";

interface DashboardStats {
  total_users: number;
  active_users_7d: number;
  total_deals: number;
  active_deals: number;
  total_volume: number;
  active_disputes: number;
  total_sources: number;
  active_sources: number;
  github_verified_count: number;
}

type MetricCard = {
  key: keyof DashboardStats;
  labelKey: "admin.dashboard.totalUsers" | "admin.dashboard.activeUsers7d" | "admin.dashboard.totalDeals" | "admin.dashboard.activeDeals" | "admin.dashboard.totalVolume" | "admin.dashboard.activeDisputes" | "admin.dashboard.totalSources" | "admin.dashboard.activeSources" | "admin.dashboard.githubVerified";
  icon: string;
  format?: "currency";
};

const metricCards: MetricCard[] = [
  { key: "total_users", labelKey: "admin.dashboard.totalUsers", icon: "solar:users-group-rounded-linear" },
  { key: "active_users_7d", labelKey: "admin.dashboard.activeUsers7d", icon: "solar:user-check-linear" },
  { key: "total_deals", labelKey: "admin.dashboard.totalDeals", icon: "solar:document-text-linear" },
  { key: "active_deals", labelKey: "admin.dashboard.activeDeals", icon: "solar:clipboard-check-linear" },
  { key: "total_volume", labelKey: "admin.dashboard.totalVolume", icon: "solar:wallet-money-linear", format: "currency" },
  { key: "active_disputes", labelKey: "admin.dashboard.activeDisputes", icon: "solar:shield-warning-linear" },
  { key: "total_sources", labelKey: "admin.dashboard.totalSources", icon: "solar:database-linear" },
  { key: "active_sources", labelKey: "admin.dashboard.activeSources", icon: "solar:server-linear" },
  { key: "github_verified_count", labelKey: "admin.dashboard.githubVerified", icon: "mdi:github" },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function AdminDashboard() {
  const t = useT();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminDashboard()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("admin.dashboard.title")}
        </h1>

        {loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/5 p-5 animate-pulse"
              >
                <div className="h-3 w-20 bg-white/10 rounded mb-3" />
                <div className="h-7 w-16 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metricCards.map((card) => {
              const value = stats[card.key];
              return (
                <div
                  key={card.key}
                  className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 flex flex-col gap-2 hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex items-center gap-2 text-slate-400">
                    <Icon icon={card.icon} size={18} />
                    <span className="text-xs font-medium">{t(card.labelKey)}</span>
                  </div>
                  <span className="text-2xl font-bold tracking-tight text-white">
                    {card.format === "currency"
                      ? formatCurrency(value)
                      : formatNumber(value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
