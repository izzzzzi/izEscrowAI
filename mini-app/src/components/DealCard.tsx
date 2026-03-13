interface DealCardProps {
  id: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  originalAmount?: number | null;
  originalCurrency?: string | null;
  onClick?: () => void;
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  created: { label: "Created", bg: "bg-slate-500/10", text: "text-slate-400" },
  confirmed: { label: "Confirmed", bg: "bg-blue-500/10", text: "text-blue-400" },
  funded: { label: "Funded", bg: "bg-green-500/10", text: "text-green-400" },
  delivered: { label: "Delivered", bg: "bg-amber-500/10", text: "text-amber-400" },
  completed: { label: "Completed", bg: "bg-green-500/10", text: "text-green-400" },
  disputed: { label: "Disputed", bg: "bg-red-500/10", text: "text-red-400" },
  resolved: { label: "Resolved", bg: "bg-slate-500/10", text: "text-slate-400" },
  cancelled: { label: "Cancelled", bg: "bg-slate-500/10", text: "text-slate-400" },
};

export default function DealCard({ id, description, amount, currency, status, originalAmount, originalCurrency, onClick }: DealCardProps) {
  const s = statusConfig[status] ?? { label: status, bg: "bg-slate-500/10", text: "text-slate-400" };

  return (
    <div
      className={`glass-card rounded-2xl p-4 flex flex-col gap-3 ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1 min-w-0">
          <span className="text-xs font-mono text-slate-500">#{id}</span>
          <h3 className="text-sm font-medium leading-tight truncate">{description}</h3>
        </div>
        <span className={`status-pill ${s.bg} ${s.text} shrink-0 ml-2`}>{s.label}</span>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-white/5">
        <span className="text-lg font-semibold tracking-tight">
          {originalAmount && originalCurrency ? (
            <>
              {originalAmount}{" "}
              <span className="text-xs font-medium text-slate-400">{originalCurrency}</span>
              <span className="text-xs text-slate-500 ml-1">= {amount} TON</span>
            </>
          ) : (
            <>
              {amount}{" "}
              <span className="text-xs font-medium text-slate-400">{currency}</span>
            </>
          )}
        </span>
        {onClick && <iconify-icon icon="solar:alt-arrow-right-linear" class="text-slate-600" width="18" />}
      </div>
    </div>
  );
}
