interface OfferCardProps {
  id: string;
  description: string;
  minPrice?: number | null;
  currency: string;
  status: string;
  applicationCount: number;
  expanded?: boolean;
  onClick?: () => void;
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: "Open", bg: "bg-green-500/10", text: "text-green-400" },
  closed: { label: "Closed", bg: "bg-slate-500/10", text: "text-slate-400" },
  cancelled: { label: "Cancelled", bg: "bg-red-500/10", text: "text-red-400" },
};

export default function OfferCard({ id, description, minPrice, currency, status, applicationCount, expanded, onClick }: OfferCardProps) {
  const s = statusConfig[status] ?? { label: status, bg: "bg-slate-500/10", text: "text-slate-400" };

  return (
    <div
      className={`glass-card rounded-2xl p-4 flex flex-col gap-3 ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">#{id.slice(0, 12)}</span>
            <span className={`status-pill ${s.bg} ${s.text}`}>{s.label}</span>
          </div>
          <h3 className="text-sm font-medium leading-tight truncate">{description}</h3>
        </div>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-white/5">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {minPrice && (
            <span>
              from {minPrice} {currency}
            </span>
          )}
          <span className="flex items-center gap-1">
            <iconify-icon icon="solar:users-group-rounded-linear" width="14" />
            {applicationCount} bids
          </span>
        </div>
        {onClick && (
          <span className="text-xs text-[#0098EA] font-medium">
            {expanded ? "Collapse" : "Details"}
          </span>
        )}
      </div>
    </div>
  );
}
