import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import DataTable, { type Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import {
  fetchAdminJobs,
  updateAdminJobStatus,
  type AdminJob,
} from "../../lib/api";
import { useT } from "../../i18n/context";
import type { TranslationKey } from "../../i18n/en";

const STATUS_TAB_KEYS: { key: string; labelKey: TranslationKey }[] = [
  { key: "all", labelKey: "admin.jobs.all" },
  { key: "new", labelKey: "admin.jobs.new" },
  { key: "verified", labelKey: "admin.jobs.verified" },
  { key: "spam", labelKey: "admin.jobs.spam" },
  { key: "expired", labelKey: "admin.jobs.expired" },
];

const PAGE_LIMIT = 20;

export default function AdminJobs() {
  const t = useT();
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchAdminJobs({
      status: statusFilter === "all" ? undefined : statusFilter,
      page,
      limit: PAGE_LIMIT,
    })
      .then((res) => {
        setJobs(res.data);
        setTotal(res.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (job: AdminJob, newStatus: string) => {
    try {
      await updateAdminJobStatus(job.id, newStatus);
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j)),
      );
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleTabChange = (key: string) => {
    setStatusFilter(key);
    setPage(1);
  };

  const columns: Column<AdminJob>[] = [
    {
      key: "title",
      label: t("admin.jobs.colTitle"),
      sortable: true,
      render: (row) => (
        <span className="max-w-[200px] truncate block" title={row.title}>
          {row.title}
        </span>
      ),
    },
    {
      key: "status",
      label: t("admin.jobs.colStatus"),
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "budget",
      label: t("admin.jobs.colBudget"),
      render: (row) => {
        if (row.budget_min == null && row.budget_max == null) return "—";
        const min = row.budget_min != null ? row.budget_min : "?";
        const max = row.budget_max != null ? row.budget_max : "?";
        return (
          <span className="text-slate-300">
            {min}–{max}{" "}
            <span className="text-slate-500 text-xs">{row.currency}</span>
          </span>
        );
      },
    },
    {
      key: "required_skills",
      label: t("admin.jobs.colSkills"),
      render: (row) =>
        row.required_skills && row.required_skills.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {row.required_skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[0.6rem] font-medium whitespace-nowrap"
              >
                {skill}
              </span>
            ))}
            {row.required_skills.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-500 text-[0.6rem] font-medium">
                +{row.required_skills.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-500">—</span>
        ),
    },
    {
      key: "created_at",
      label: t("admin.jobs.colCreated"),
      sortable: true,
      render: (row) => new Date(row.created_at).toLocaleDateString("en-US"),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">{t("admin.jobs.title")}</h1>

        {/* Status filter tabs */}
        <div className="flex gap-1 flex-wrap bg-white/[0.03] p-1 rounded-xl border border-white/5">
          {STATUS_TAB_KEYS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border-none cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
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
          <DataTable<AdminJob>
            columns={columns}
            data={jobs}
            total={total}
            page={page}
            limit={PAGE_LIMIT}
            onPageChange={setPage}
            actions={(row) => (
              <>
                {row.status !== "verified" && (
                  <button
                    onClick={() => handleStatusChange(row, "verified")}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors cursor-pointer"
                  >
                    {t("admin.jobs.verify")}
                  </button>
                )}
                {row.status !== "spam" && (
                  <button
                    onClick={() => handleStatusChange(row, "spam")}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    {t("admin.jobs.markSpam")}
                  </button>
                )}
              </>
            )}
          />
        )}
      </div>
    </AdminLayout>
  );
}
