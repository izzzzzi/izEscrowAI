import { useState, useEffect } from "react";
import { API_URL, getInitData } from "../lib/api";

interface Deal {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  seller_id: number;
  buyer_id: number;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  created: { label: "Created", color: "#999" },
  confirmed: { label: "Confirmed", color: "#3390ec" },
  funded: { label: "Funded", color: "#34c759" },
  delivered: { label: "Delivered", color: "#ff9500" },
  completed: { label: "Completed", color: "#34c759" },
  disputed: { label: "Disputed", color: "#ff3b30" },
  resolved: { label: "Resolved", color: "#8e8e93" },
  cancelled: { label: "Cancelled", color: "#8e8e93" },
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

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading deals...</p>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p style={{ color: "var(--tg-theme-hint-color, #999)" }}>No deals yet.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>My Deals</h2>

      {deals.map((deal) => {
        const s = statusLabels[deal.status] || { label: deal.status, color: "#999" };
        return (
          <div
            key={deal.id}
            style={{
              background: "var(--tg-theme-secondary-bg-color, #1c1c1e)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--tg-theme-hint-color, #999)", fontSize: "14px" }}>
                #{deal.id}
              </span>
              <span
                style={{
                  color: s.color,
                  fontSize: "12px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </span>
            </div>
            <p style={{ margin: "8px 0 4px", color: "var(--tg-theme-text-color, #fff)" }}>
              {deal.description}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: "bold",
                color: "var(--tg-theme-text-color, #fff)",
              }}
            >
              {deal.amount} {deal.currency}
            </p>
          </div>
        );
      })}
    </div>
  );
}
