import { useState, useEffect } from "react";
import { API_URL, getInitData } from "../lib/api";
import AppHeader from "../components/AppHeader";

interface Deal {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  seller_id: number;
  buyer_id: number;
}

const statusStyles: Record<string, { label: string; bg: string; text: string }> = {
  created: { label: "Created", bg: "bg-slate-500/10", text: "text-slate-400" },
  confirmed: { label: "Confirmed", bg: "bg-blue-500/10", text: "text-blue-400" },
  funded: { label: "Funded", bg: "bg-green-500/10", text: "text-green-400" },
  delivered: { label: "Delivered", bg: "bg-amber-500/10", text: "text-amber-400" },
  completed: { label: "Completed", bg: "bg-green-500/10", text: "text-green-400" },
  disputed: { label: "Disputed", bg: "bg-red-500/10", text: "text-red-400" },
  resolved: { label: "Resolved", bg: "bg-slate-500/10", text: "text-slate-400" },
  cancelled: { label: "Cancelled", bg: "bg-slate-500/10", text: "text-slate-400" },
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/deals`, {
      headers: { "X-Init-Data": getInitData() },
    })
      .then((r) => r.json())
      .then(setDeals)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <AppHeader />
      <main className="px-5 pb-32 space-y-4">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-widest pl-1">
          My Deals
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm text-slate-500">Loading deals...</span>
          </div>
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <iconify-icon icon="solar:box-minimalistic-linear" class="text-slate-700 mb-4" width="64" />
            <p className="text-sm text-slate-500">No deals yet</p>
          </div>
        ) : (
          deals.map((deal) => {
            const s = statusStyles[deal.status] ?? {
              label: deal.status,
              bg: "bg-slate-500/10",
              text: "text-slate-400",
            };
            return (
              <div key={deal.id} className="glass-card rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-slate-500">ID: #{deal.id}</span>
                    <h3 className="text-sm font-medium leading-tight">{deal.description}</h3>
                  </div>
                  <span className={`status-pill ${s.bg} ${s.text}`}>{s.label}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="text-lg font-semibold tracking-tight">
                    {deal.amount}{" "}
                    <span className="text-xs font-medium text-slate-400">{deal.currency}</span>
                  </span>
                  <iconify-icon icon="solar:alt-arrow-right-linear" class="text-slate-600" width="18" />
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
