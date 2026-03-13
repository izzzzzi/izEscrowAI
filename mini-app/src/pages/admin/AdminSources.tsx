import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import DataTable, { type Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  fetchAdminSources,
  createAdminSource,
  updateAdminSource,
  deleteAdminSource,
  type AdminSource,
} from "../../lib/api";

export default function AdminSources() {
  const [sources, setSources] = useState<AdminSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add source modal
  const [showAdd, setShowAdd] = useState(false);
  const [newSource, setNewSource] = useState({ telegram_id: "", title: "", username: "" });
  const [creating, setCreating] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<AdminSource | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchAdminSources()
      .then(setSources)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleStatus = async (source: AdminSource) => {
    const newStatus = source.status === "active" ? "paused" : "active";
    try {
      await updateAdminSource(source.id, { status: newStatus });
      setSources((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, status: newStatus } : s)),
      );
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAdminSource(deleteTarget.id);
      setSources((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    } catch (e: any) {
      setError(e.message);
    }
    setDeleteTarget(null);
  };

  const handleCreate = async () => {
    if (!newSource.title.trim() || !newSource.telegram_id.trim()) return;
    setCreating(true);
    try {
      const created = await createAdminSource({
        telegram_id: Number(newSource.telegram_id),
        title: newSource.title,
        username: newSource.username || undefined,
      });
      setSources((prev) => [created, ...prev]);
      setShowAdd(false);
      setNewSource({ telegram_id: "", title: "", username: "" });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const columns: Column<AdminSource>[] = [
    { key: "title", label: "Name", sortable: true },
    { key: "type", label: "Type", sortable: true },
    { key: "telegram_id", label: "Telegram ID", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (row) => new Date(row.created_at).toLocaleDateString("en-US"),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Sources</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium hover:bg-blue-500/30 transition-colors cursor-pointer"
          >
            <iconify-icon icon="solar:add-circle-linear" width="16" />
            Add Source
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
            Loading...
          </div>
        ) : (
          <DataTable<AdminSource>
            columns={columns}
            data={sources}
            total={sources.length}
            page={1}
            limit={sources.length || 10}
            onPageChange={() => {}}
            actions={(row) => (
              <>
                <button
                  onClick={() => handleToggleStatus(row)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                    row.status === "active"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                      : "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                  }`}
                >
                  {row.status === "active" ? "Pause" : "Activate"}
                </button>
                <button
                  onClick={() => setDeleteTarget(row)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </>
            )}
          />
        )}
      </div>

      {/* Add source modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAdd(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] shadow-2xl p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Add Source
              </h3>
              <button
                onClick={() => setShowAdd(false)}
                className="text-slate-500 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Name"
                value={newSource.title}
                onChange={(e) => setNewSource((p) => ({ ...p, title: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
              <input
                type="number"
                placeholder="Telegram ID"
                value={newSource.telegram_id}
                onChange={(e) => setNewSource((p) => ({ ...p, telegram_id: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
              <input
                type="text"
                placeholder="Username (optional)"
                value={newSource.username}
                onChange={(e) => setNewSource((p) => ({ ...p, username: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={creating || !newSource.title.trim() || !newSource.telegram_id.trim()}
              className="w-full py-2.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-sm font-medium hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Source"
        message={`Are you sure you want to delete source "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </AdminLayout>
  );
}
