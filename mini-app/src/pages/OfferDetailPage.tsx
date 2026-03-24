import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPublicOffer, applyToOffer, type PublicOfferDetail } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useT } from "../i18n/context";
import LoginGate from "../components/LoginGate";
import WalletGate from "../components/WalletGate";
import { useIsMiniApp } from "../hooks/useIsMiniApp";
import AppHeader from "../components/AppHeader";

export default function OfferDetailPage() {
  const isMini = useIsMiniApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [offer, setOffer] = useState<PublicOfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidPrice, setBidPrice] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    if (!id) return;
    fetchPublicOffer(id)
      .then(setOffer)
      .catch(() => setError(t("offerDetail.notFound")))
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
      <div className={isMini ? "mini-page" : "min-h-screen page-shell pt-28 pb-16 px-6"}>
        {isMini && <AppHeader />}
        <div className={isMini ? "px-5" : "max-w-3xl mx-auto"}>
          <div className="glass-card rounded-2xl p-8 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  if (!offer || error) {
    return (
      <div className={isMini ? "mini-page text-center" : "min-h-screen page-shell pt-28 pb-16 px-6 text-center"}>
        {isMini && <AppHeader />}
        <p className="text-slate-400 mt-20">{error || t("offerDetail.notFound")}</p>
        <button onClick={() => navigate("/offers")} className="mt-4 text-[#0098EA] text-sm bg-transparent border-none cursor-pointer">
          {t("offerDetail.back")}
        </button>
      </div>
    );
  }

  const isOwner = isAuthenticated && user?.id === offer.creator_id;
  const roleLabel = offer.role === "seller" ? t("offerDetail.role.seller") : t("offerDetail.role.buyer");

  return (
    <div className={isMini ? "mini-page" : "min-h-screen page-shell pt-28 pb-16 px-6"}>
      {isMini && <AppHeader />}
      <div className={isMini ? "px-5" : "max-w-3xl mx-auto"}>
        <button
          onClick={() => navigate("/offers")}
          className="text-sm text-slate-400 hover:text-white mb-6 bg-transparent border-none cursor-pointer flex items-center gap-1"
        >
          <iconify-icon icon="solar:arrow-left-linear" width="16" /> {t("offerDetail.back")}
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
              {offer.application_count} {t("deals.offer.bids")}
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
            <h3 className="text-lg font-medium mb-4">{t("offerDetail.bid.title")}</h3>
            <LoginGate>
              <WalletGate>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">{t("offerDetail.bid.price")} ({offer.currency})</label>
                    <input
                      type="number"
                      value={bidPrice}
                      onChange={(e) => setBidPrice(e.target.value)}
                      placeholder={t("offerDetail.bid.pricePlaceholder")}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#0098EA]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">{t("offerDetail.bid.message")}</label>
                    <textarea
                      value={bidMessage}
                      onChange={(e) => setBidMessage(e.target.value)}
                      placeholder={t("offerDetail.bid.messagePlaceholder")}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#0098EA]/50 resize-none"
                    />
                  </div>
                  <button
                    onClick={handleApply}
                    disabled={!bidPrice || submitting}
                    className="w-full ton-gradient py-3 rounded-xl text-sm font-medium cursor-pointer border-none text-white disabled:opacity-50"
                  >
                    {submitting ? t("offerDetail.bid.submitting") : t("offerDetail.bid.submit")}
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
