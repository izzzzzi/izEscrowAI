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
      // OP_DEPOSIT = 0x1, queryId = 0
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
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading deal...</p>
      </div>
    );
  }

  if (status === "error" || !deal) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p style={{ color: "var(--tg-theme-destructive-text-color, #ff3b30)" }}>
          Error loading deal. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Payment</h2>

      <div
        style={{
          background: "var(--tg-theme-secondary-bg-color, #1c1c1e)",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "20px",
        }}
      >
        <p style={{ color: "var(--tg-theme-hint-color, #999)", margin: "0 0 8px" }}>
          Deal #{deal.id}
        </p>
        <p style={{ margin: "0 0 8px", color: "var(--tg-theme-text-color, #fff)" }}>
          {deal.description}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "24px",
            fontWeight: "bold",
            color: "var(--tg-theme-text-color, #fff)",
          }}
        >
          {deal.amount} {deal.currency}
        </p>
      </div>

      {!wallet ? (
        <button
          onClick={() => tonConnectUI.openModal()}
          style={{
            padding: "14px 24px",
            background: "var(--tg-theme-button-color, #3390ec)",
            color: "var(--tg-theme-button-text-color, #fff)",
            border: "none",
            borderRadius: "12px",
            fontSize: "16px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Connect Wallet to Pay
        </button>
      ) : status === "sent" ? (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "48px", margin: "0 0 8px" }}>&#10003;</p>
          <p style={{ color: "var(--tg-theme-text-color, #fff)" }}>
            Transaction sent! Waiting for confirmation...
          </p>
        </div>
      ) : (
        <button
          onClick={handlePay}
          disabled={status === "sending"}
          style={{
            padding: "14px 24px",
            background:
              status === "sending"
                ? "var(--tg-theme-hint-color, #999)"
                : "var(--tg-theme-button-color, #3390ec)",
            color: "var(--tg-theme-button-text-color, #fff)",
            border: "none",
            borderRadius: "12px",
            fontSize: "16px",
            cursor: status === "sending" ? "not-allowed" : "pointer",
            width: "100%",
          }}
        >
          {status === "sending" ? "Sending..." : `Pay ${deal.amount} ${deal.currency}`}
        </button>
      )}
    </div>
  );
}
