import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPublicOffer, applyToOffer, type PublicOfferDetail } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import LoginGate from "../components/LoginGate";
import WalletGate from "../components/WalletGate";

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [offer, setOffer] = useState<PublicOfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidPrice, setBidPrice] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchPublicOffer(id)
      .then(setOffer)
      .catch(() => setError("Offer not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApply = async () => {
    if (!id || !bidPrice) return;
    setSubmitting(true);
    try {
      await applyToOffer(id, { price: parseFloat(bidPrice), message: bidMessage || undefined });
      // Refresh
      const updated = await fetchPublicOffer(id);
      setOffer(updated);
      setBidPrice("");
      setBidMessage("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen page-shell pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="glass-card rounded-2xl p-8 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  if (!offer || error) {
    return (
      <div className="min-h-screen page-shell pt-28 pb-16 px-6 text-center">
        <p className="text-slate-400 mt-20">{error || "Offer not found"}</p>
        <button onClick={() => navigate("/offers")} className="mt-4 text-[#0098EA] text-sm bg-transparent border-none cursor-pointer">
          Back to Offers
        </button>
      </div>
    );
  }

  const isOwner = isAuthenticated && user?.id === offer.creator_id;
  const roleLabel = offer.role === "seller" ? "Offering service" : "Looking for freelancer";

  return (
    <div className="min-h-screen page-shell pt-28 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate("/offers")}
          className="text-sm text-slate-400 hover:text-white mb-6 bg-transparent border-none cursor-pointer flex items-center gap-1"
        >
          <iconify-icon icon="solar:arrow-left-linear" width="16" /> Back to Offers
        </button>

        {/* Offer Card */}
        <div className="glass-card rounded-2xl p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs text-slate-500 font-mono">#{offer.id.slice(0, 16)}</span>
              <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                offer.status === "open" ? "bg-green-500/10 text-green-400" : "bg-slate-500/10 text-slate-400"
              }`}>
                {offer.status}
              </span>
            </div>
            <span className="text-xs text-slate-400">{roleLabel}</span>
          </div>

          <h2 className="text-xl font-medium mb-4">{offer.description}</h2>

          <div className="flex items-center gap-6 text-sm text-slate-400">
            {offer.min_price && (
              <span>
                <iconify-icon icon="solar:dollar-minimalistic-linear" width="14" style={{ verticalAlign: "middle" }} />{" "}
                from {offer.min_price} {offer.currency}
              </span>
            )}
            <span>
              <iconify-icon icon="solar:users-group-rounded-linear" width="14" style={{ verticalAlign: "middle" }} />{" "}
              {offer.application_count} bids
            </span>
          </div>

          {/* Creator info */}
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <iconify-icon icon="solar:user-linear" width="16" />
            </div>
            <div>
              <div className="text-sm font-medium">Creator #{offer.creator_id}</div>
              {offer.creator_trust_score !== null && (
                <div className="text-xs text-green-400">Trust Score: {offer.creator_trust_score}</div>
              )}
            </div>
          </div>
        </div>

        {/* Apply form (not owner, offer open) */}
        {offer.status === "open" && !isOwner && (
          <div className="glass-card rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">Submit your bid</h3>
            <LoginGate fallbackText="Login with Telegram to apply">
              <WalletGate fallbackText="Connect Wallet to apply">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Your price ({offer.currency})</label>
                    <input
                      type="number"
                      value={bidPrice}
                      onChange={(e) => setBidPrice(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#0098EA]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Message (optional)</label>
                    <textarea
                      value={bidMessage}
                      onChange={(e) => setBidMessage(e.target.value)}
                      placeholder="Why you're the best fit..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#0098EA]/50 resize-none"
                    />
                  </div>
                  <button
                    onClick={handleApply}
                    disabled={!bidPrice || submitting}
                    className="w-full ton-gradient py-3 rounded-xl text-sm font-medium cursor-pointer border-none text-white disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Bid"}
                  </button>
                </div>
              </WalletGate>
            </LoginGate>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm mb-4 text-center">{error}</div>
        )}
      </div>
    </div>
  );
}
