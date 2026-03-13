import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import DataTable, { type Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  fetchAdminUsers,
  toggleUserBan,
  type AdminUser,
} from "../../lib/api";

const PAGE_LIMIT = 20;

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ban/unban confirm
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchAdminUsers({
      search: search || undefined,
      page,
      limit: PAGE_LIMIT,
    })
      .then((res) => {
        setUsers(res.data);
        setTotal(res.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce search: reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleBanToggle = async () => {
    if (!banTarget) return;
    const shouldBan = !banTarget.banned_at;
    try {
      await toggleUserBan(banTarget.telegram_id, shouldBan);
      setUsers((prev) =>
        prev.map((u) =>
          u.telegram_id === banTarget.telegram_id
            ? { ...u, banned_at: shouldBan ? new Date().toISOString() : null }
            : u,
        ),
      );
    } catch (e: any) {
      setError(e.message);
    }
    setBanTarget(null);
  };

  const columns: Column<AdminUser>[] = [
    { key: "telegram_id", label: "Telegram ID", sortable: true },
    {
      key: "username",
      label: "Username",
      sortable: true,
      render: (row) =>
        row.username ? (
          <span className="text-blue-400">@{row.username}</span>
        ) : (
          <span className="text-slate-500">—</span>
        ),
    },
    {
      key: "banned_at",
      label: "Status",
      render: (row) =>
        row.banned_at ? (
          <StatusBadge status="banned" />
        ) : (
          <StatusBadge status="active" />
        ),
    },
    {
      key: "created_at",
      label: "Registered",
      sortable: true,
      render: (row) => new Date(row.created_at).toLocaleDateString("en-US"),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">
          Users
        </h1>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
            Loading...
          </div>
        ) : (
          <DataTable<AdminUser>
            columns={columns}
            data={users}
            total={total}
            page={page}
            limit={PAGE_LIMIT}
            onPageChange={setPage}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by username or Telegram ID..."
            actions={(row) => (
              <button
                onClick={() => setBanTarget(row)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  row.banned_at
                    ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                }`}
              >
                {row.banned_at ? "Unban" : "Ban"}
              </button>
            )}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={!!banTarget}
        onClose={() => setBanTarget(null)}
        onConfirm={handleBanToggle}
        title={banTarget?.banned_at ? "Unban User" : "Ban User"}
        message={
          banTarget?.banned_at
            ? `Are you sure you want to unban ${banTarget?.username ? `@${banTarget.username}` : banTarget?.telegram_id}?`
            : `Are you sure you want to ban ${banTarget?.username ? `@${banTarget.username}` : banTarget?.telegram_id}? They will lose access to the platform.`
        }
        confirmText={banTarget?.banned_at ? "Unban" : "Ban"}
        variant={banTarget?.banned_at ? "normal" : "danger"}
      />
    </AdminLayout>
  );
}
