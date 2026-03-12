import { useParams } from "react-router-dom";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { useState, useEffect } from "react";
import { toNano, beginCell } from "@ton/core";
import { API_URL, getInitData } from "../lib/api";

interface DealInfo {
  id: string;
  amount: number;
  currency: string;
  description: string;
  contract_address: string;
  status: string;
}

export default function PaymentPage() {
  const { dealId } = useParams<{ dealId: string }>();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [deal, setDeal] = useState<DealInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "sending" | "sent" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!dealId) return;

    fetch(`${API_URL}/api/deals/${dealId}`, {
      headers: { "X-Init-Data": getInitData() },
    })
      .then((r) => r.json())
      .then((data) => {
        setDeal(data);
        setStatus("ready");
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
      <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <span className="text-sm text-slate-500">Loading deal...</span>
      </div>
    );
  }

  if (status === "error" || !deal) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <p className="text-sm text-red-400">Error loading deal. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a]/95 text-white flex flex-col p-5" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xs mx-auto space-y-8">
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

        {/* Deal Details */}
        <div className="glass-card w-full rounded-2xl p-5 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Deal</span>
            <span className="font-mono text-slate-300">#{deal.id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Amount</span>
            <span className="font-semibold">{deal.amount} {deal.currency}</span>
          </div>
          <div className="pt-3 border-t border-white/5 flex justify-between items-center">
            <span className="text-sm text-white font-medium">Total to Pay</span>
            <span className="text-xl font-bold text-[#0098EA]">
              {deal.amount} {deal.currency}
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
            {status === "sending" ? "Sending..." : `Pay ${deal.amount} ${deal.currency}`}
          </button>
        )}
      </div>
    </div>
  );
}
