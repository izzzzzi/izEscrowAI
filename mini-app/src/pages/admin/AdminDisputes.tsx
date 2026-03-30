import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  fetchAdminDisputes,
  resolveDispute,
  type AdminDispute,
} from "../../lib/api";
import { useT } from "../../i18n/context";
import Icon from "../../components/Icon";

type ResolutionAction = {
  disputeId: string;
  type: "refund_buyer" | "pay_seller";
};

export default function AdminDisputes() {
  const t = useT();
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolution state
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<ResolutionAction | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchAdminDisputes()
      .then(setDisputes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleResolve = async () => {
    if (!confirmAction) return;
    setResolving(true);
    try {
      await resolveDispute(confirmAction.disputeId, {
        resolution_type: confirmAction.type,
        resolution_note: resolutionNotes[confirmAction.disputeId] || "",
      });
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === confirmAction.disputeId
            ? { ...d, status: "resolved" }
            : d,
        ),
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResolving(false);
      setConfirmAction(null);
    }
  };

  const confirmLabel =
    confirmAction?.type === "refund_buyer"
      ? t("admin.disputes.refundBuyer")
      : t("admin.disputes.paySeller");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">{t("admin.disputes.title")}</h1>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
            {t("admin.common.loading")}
          </div>
        ) : disputes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Icon icon="solar:shield-check-linear" size={64} className="text-slate-700 mb-4" />
            <p className="text-sm text-slate-500">{t("admin.disputes.noActive")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {disputes.map((dispute) => (
              <div
                key={dispute.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-5 flex flex-col gap-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-xs font-mono text-slate-500">
                      #{dispute.id.slice(0, 12)}
                    </span>
                    <span
                      className={`inline-flex items-center self-start px-2 py-0.5 rounded-full text-[0.65rem] font-semibold uppercase tracking-wider whitespace-nowrap ${
                        dispute.status === "resolved"
                          ? "bg-slate-500/10 text-slate-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {dispute.status}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-white whitespace-nowrap">
                    {dispute.amount}{" "}
                    <span className="text-xs font-medium text-slate-400">
                      {dispute.currency}
                    </span>
                  </span>
                </div>

                {/* Parties */}
                <div className="flex gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Icon icon="solar:user-linear" size={14} />
                    <span>{t("admin.disputes.buyer")} <span className="text-slate-300">{dispute.buyer_id}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon icon="solar:user-check-linear" size={14} />
                    <span>{t("admin.disputes.seller")} <span className="text-slate-300">{dispute.seller_id}</span></span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-300 leading-relaxed">
                  {dispute.description}
                </p>

                {/* Dates */}
                <div className="flex gap-4 text-[0.65rem] text-slate-500">
                  <span>
                    {t("admin.disputes.created")} {new Date(dispute.created_at).toLocaleDateString("en-US")}
                  </span>
                  <span>
                    {t("admin.disputes.updated")} {new Date(dispute.updated_at).toLocaleDateString("en-US")}
                  </span>
                </div>

                {/* Resolution note + actions */}
                {dispute.status !== "resolved" && (
                  <>
                    <textarea
                      placeholder={t("admin.disputes.resolutionNote")}
                      value={resolutionNotes[dispute.id] || ""}
                      onChange={(e) =>
                        setResolutionNotes((prev) => ({
                          ...prev,
                          [dispute.id]: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 transition-colors resize-none h-16"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setConfirmAction({
                            disputeId: dispute.id,
                            type: "refund_buyer",
                          })
                        }
                        className="flex-1 py-2 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
                      >
                        {t("admin.disputes.refundBuyer")}
                      </button>
                      <button
                        onClick={() =>
                          setConfirmAction({
                            disputeId: dispute.id,
                            type: "pay_seller",
                          })
                        }
                        className="flex-1 py-2 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors cursor-pointer"
                      >
                        {t("admin.disputes.paySeller")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleResolve}
        title={t("admin.disputes.confirmTitle")}
        message={t("admin.disputes.confirmMessage").replace("{action}", confirmLabel)}
        confirmText={resolving ? t("admin.disputes.processing") : confirmLabel}
        variant="danger"
      />
    </AdminLayout>
  );
}
