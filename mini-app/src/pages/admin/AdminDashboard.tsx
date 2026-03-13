import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { fetchAdminDashboard } from "../../lib/api";

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

const metricCards: {
  key: keyof DashboardStats;
  label: string;
  icon: string;
  format?: "currency";
}[] = [
  { key: "total_users", label: "Всего пользователей", icon: "solar:users-group-rounded-linear" },
  { key: "active_users_7d", label: "Активные (7 дней)", icon: "solar:user-check-linear" },
  { key: "total_deals", label: "Всего сделок", icon: "solar:document-text-linear" },
  { key: "active_deals", label: "Активные сделки", icon: "solar:clipboard-check-linear" },
  { key: "total_volume", label: "Общий объём", icon: "solar:wallet-money-linear", format: "currency" },
  { key: "active_disputes", label: "Активные споры", icon: "solar:shield-warning-linear" },
  { key: "total_sources", label: "Всего источников", icon: "solar:database-linear" },
  { key: "active_sources", label: "Активные источники", icon: "solar:server-linear" },
  { key: "github_verified_count", label: "GitHub верифицированных", icon: "mdi:github" },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export default function AdminDashboard() {
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
          Панель управления
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
                    <iconify-icon icon={card.icon} width="18" height="18" />
                    <span className="text-xs font-medium">{card.label}</span>
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
