import { useParams } from "react-router-dom";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { useState, useEffect } from "react";
import { toNano, beginCell } from "@ton/core";
import { fetchDeal, fetchDealRisk, type Deal, type DealRisk } from "../lib/api";

export default function PaymentPage() {
  const { dealId } = useParams<{ dealId: string }>();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [risk, setRisk] = useState<DealRisk | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "sending" | "sent" | "error">("loading");

  useEffect(() => {
    if (!dealId) return;

    fetchDeal(dealId)
      .then((data) => {
        setDeal(data);
        setStatus("ready");
        // Load risk assessment in background
        fetchDealRisk(dealId).then(setRisk).catch(() => {});
      })
      .catch(() => setStatus("error"));
  }, [dealId]);

  const handlePay = async () => {
    if (!deal?.contract_address || !wallet) return;
    setStatus("sending");

    try {
      const payload = beginCell()
        .storeUint(1, 32)
        .storeUint(0, 64)
        .endCell()
        .toBoc()
        .toString("base64");

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: deal.contract_address,
            amount: toNano(deal.amount.toString()).toString(),
            payload,
          },
        ],
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  if (status === "loading") {
    return (
      <div className="mini-page flex items-center justify-center">
        <span className="text-sm text-slate-500">Loading deal...</span>
      </div>
    );
  }

  if (status === "error" || !deal) {
    return (
      <div className="mini-page flex items-center justify-center">
        <p className="text-sm text-red-400">Error loading deal. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="mini-page flex flex-col p-5">
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xs mx-auto space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-[#0098EA] animate-pulse">
          <iconify-icon icon="solar:card-transfer-linear" width="40" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {status === "sent" ? "Payment Sent" : "Incoming Deal"}
          </h2>
          <p className="text-sm text-slate-400">
            {status === "sent"
              ? "Transaction sent! Waiting for confirmation..."
              : `Fund escrow for "${deal.description}"`}
          </p>
        </div>

        {/* Risk Assessment */}
        {risk && status !== "sent" && <RiskBlock risk={risk} />}

        {/* Deal Details */}
        <div className="glass-card w-full rounded-2xl p-5 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Deal</span>
            <span className="font-mono text-slate-300">#{deal.id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Amount</span>
            <span className="font-semibold">
              {deal.original_amount && deal.original_currency
                ? `${deal.original_amount} ${deal.original_currency}`
                : `${deal.amount} ${deal.currency}`}
            </span>
          </div>
          {deal.original_currency && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">TON Equivalent</span>
              <span className="font-semibold text-[#0098EA]">{deal.amount} TON</span>
            </div>
          )}
          <div className="pt-3 border-t border-white/5 flex justify-between items-center">
            <span className="text-sm text-white font-medium">Total to Pay</span>
            <span className="text-xl font-bold text-[#0098EA]">
              {deal.amount} TON
            </span>
          </div>
        </div>

        {/* Action */}
        {status === "sent" ? (
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <iconify-icon icon="solar:check-circle-linear" width="48" class="text-green-400" />
          </div>
        ) : !wallet ? (
          <button
            onClick={() => tonConnectUI.openModal()}
            className="w-full bg-[#0098EA] text-white py-4 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <iconify-icon icon="solar:wallet-2-linear" width="20" />
            Connect Wallet to Pay
          </button>
        ) : (
          <button
            onClick={handlePay}
            disabled={status === "sending"}
            className={`w-full py-4 rounded-xl font-semibold text-sm shadow-lg flex items-center justify-center gap-2 ${
              status === "sending"
                ? "bg-slate-600 text-slate-300 cursor-not-allowed"
                : "bg-[#0098EA] text-white shadow-blue-500/20"
            }`}
          >
            {status === "sending" ? "Sending..." : `Pay ${deal.amount} TON`}
          </button>
        )}
      </div>
    </div>
  );
}

function RiskBlock({ risk }: { risk: DealRisk }) {
  const levelColor = (l: string) =>
    l === "low" ? "text-green-400" : l === "medium" ? "text-amber-400" : "text-red-400";
  const levelBg = (l: string) =>
    l === "low" ? "bg-green-500/10" : l === "medium" ? "bg-amber-500/10" : "bg-red-500/10";

  return (
    <div className="glass-card w-full rounded-2xl p-4 space-y-3 text-left">
      <div className="flex items-center gap-2">
        <iconify-icon icon="solar:shield-check-linear" width="18" class="text-[#0098EA]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          AI Risk Assessment
        </span>
      </div>
      <div className="flex gap-3">
        <div className={`flex-1 rounded-xl p-3 ${levelBg(risk.buyer_risk.level)}`}>
          <div className="text-[0.6rem] text-slate-400 uppercase mb-1">Buyer</div>
          <div className={`text-sm font-bold ${levelColor(risk.buyer_risk.level)}`}>
            {risk.buyer_risk.level} ({risk.buyer_risk.score})
          </div>
        </div>
        <div className={`flex-1 rounded-xl p-3 ${levelBg(risk.seller_risk.level)}`}>
          <div className="text-[0.6rem] text-slate-400 uppercase mb-1">Seller</div>
          <div className={`text-sm font-bold ${levelColor(risk.seller_risk.level)}`}>
            {risk.seller_risk.level} ({risk.seller_risk.score})
          </div>
        </div>
      </div>
      {risk.deal_recommendations.length > 0 && (
        <div className="text-xs text-slate-400 space-y-1">
          {risk.deal_recommendations.map((r, i) => (
            <div key={i} className="flex gap-1.5">
              <span className="text-amber-400 shrink-0">!</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
