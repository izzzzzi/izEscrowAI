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
import { useT } from "../../i18n/context";
import Icon from "../../components/Icon";

export default function AdminSources() {
  const t = useT();
  const [sources, setSources] = useState<AdminSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add source modal
  const [showAdd, setShowAdd] = useState(false);
  const [newSource, setNewSource] = useState({ telegram_id: "", title: "", username: "", type: "group" as "group" | "channel_web" });
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

  const isChannelWeb = newSource.type === "channel_web";

  const canCreate = newSource.title.trim() && (
    isChannelWeb ? newSource.username.trim() : newSource.telegram_id.trim()
  );

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const created = await createAdminSource({
        telegram_id: isChannelWeb ? undefined : Number(newSource.telegram_id),
        title: newSource.title,
        username: newSource.username || undefined,
        type: newSource.type,
      });
      setSources((prev) => [created, ...prev]);
      setShowAdd(false);
      setNewSource({ telegram_id: "", title: "", username: "", type: "group" });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const columns: Column<AdminSource>[] = [
    { key: "title", label: t("admin.sources.colName"), sortable: true },
    { key: "type", label: t("admin.sources.colType"), sortable: true },
    { key: "telegram_id", label: t("admin.sources.colTelegramId"), sortable: true },
    {
      key: "status",
      label: t("admin.sources.colStatus"),
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "created_at",
      label: t("admin.sources.colCreated"),
      sortable: true,
      render: (row) => new Date(row.created_at).toLocaleDateString("en-US"),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">{t("admin.sources.title")}</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium hover:bg-blue-500/30 transition-colors cursor-pointer"
          >
            <Icon icon="solar:add-circle-linear" size={16} />
            {t("admin.sources.addSource")}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
            {t("admin.common.loading")}
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
                  {row.status === "active" ? t("admin.sources.pause") : t("admin.sources.activate")}
                </button>
                <button
                  onClick={() => setDeleteTarget(row)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
                >
                  {t("admin.sources.delete")}
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-backdrop" />
          <div
            className="relative animate-modal-content w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] shadow-2xl p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {t("admin.sources.addSource")}
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
              {/* Type toggle */}
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                {(["group", "channel_web"] as const).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setNewSource((p) => ({ ...p, type: tp }))}
                    className={`flex-1 py-2 text-xs font-medium transition-colors cursor-pointer border-none ${
                      newSource.type === tp
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    {tp === "group" ? t("admin.sources.groupBot") : t("admin.sources.channelWeb")}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder={t("admin.sources.namePlaceholder")}
                value={newSource.title}
                onChange={(e) => setNewSource((p) => ({ ...p, title: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
              {isChannelWeb ? (
                <input
                  type="text"
                  placeholder={t("admin.sources.channelUsernamePlaceholder")}
                  value={newSource.username}
                  onChange={(e) => setNewSource((p) => ({ ...p, username: e.target.value.replace(/^@/, "") }))}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 transition-colors"
                />
              ) : (
                <>
                  <input
                    type="number"
                    placeholder={t("admin.sources.telegramIdPlaceholder")}
                    value={newSource.telegram_id}
                    onChange={(e) => setNewSource((p) => ({ ...p, telegram_id: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder={t("admin.sources.usernamePlaceholder")}
                    value={newSource.username}
                    onChange={(e) => setNewSource((p) => ({ ...p, username: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 transition-colors"
                  />
                </>
              )}
              {isChannelWeb && (
                <p className="text-xs text-slate-500">
                  {t("admin.sources.channelWebHint")}
                </p>
              )}
            </div>

            <button
              onClick={handleCreate}
              disabled={creating || !canCreate}
              className="w-full py-2.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-sm font-medium hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {creating ? t("admin.sources.creating") : t("admin.sources.create")}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t("admin.sources.deleteTitle")}
        message={t("admin.sources.deleteMessage").replace("{name}", deleteTarget?.title ?? "")}
        confirmText={t("admin.sources.delete")}
        variant="danger"
      />
    </AdminLayout>
  );
}
