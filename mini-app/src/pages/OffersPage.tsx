import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { fetchPublicOffers, createOffer, type PublicOffer } from "../lib/api";
import OfferCard from "../components/OfferCard";
import LoginGate from "../components/LoginGate";
import { useIsMiniApp } from "../hooks/useIsMiniApp";
import AppHeader from "../components/AppHeader";

export default function OffersPage() {
  const isMini = useIsMiniApp();
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newOffer, setNewOffer] = useState({ description: "", min_price: "", currency: "TON", role: "buyer" });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPublicOffers()
      .then(setOffers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newOffer.description.trim()) return;
    setCreating(true);
    try {
      await createOffer({
        description: newOffer.description,
        min_price: newOffer.min_price ? Number(newOffer.min_price) : undefined,
        currency: newOffer.currency,
        role: newOffer.role,
      });
      setShowCreate(false);
      setNewOffer({ description: "", min_price: "", currency: "TON", role: "buyer" });
      // Refresh offers
      const fresh = await fetchPublicOffers();
      setOffers(fresh);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={isMini ? "mini-page" : "min-h-screen page-shell pt-28 pb-16 px-6"}>
      {isMini && <AppHeader />}
      <Helmet>
        <title>Offers — izEscrowAI</title>
        <meta name="description" content="Browse public offers on izEscrowAI. Find freelance work or post your own offer with AI-powered escrow protection." />
      </Helmet>
      <div className={isMini ? "px-5" : "max-w-5xl mx-auto"}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Marketplace</h1>
            <p className="text-slate-400 text-sm">Browse open offers and find work or freelancers</p>
          </div>
          <LoginGate fallbackText="Login to create offers">
            <button
              onClick={() => setShowCreate(true)}
              className="ton-gradient px-6 py-3 rounded-xl text-sm font-medium cursor-pointer border-none text-white"
            >
              Create Offer
            </button>
          </LoginGate>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-4 animate-pulse h-32" />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div className="space-y-6 py-8">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <iconify-icon icon="solar:tag-linear" width="18" class="text-[#0098EA]" />
                Inline Marketplace
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Need something done? Type <span className="text-white font-medium">@izEscrowAIBot</span> in any Telegram chat and describe what you need.
                Freelancers see it, bid their price, and you pick the one you like. Payment goes straight into escrow.
              </p>
              <ol className="space-y-2 text-xs text-slate-400">
                <li className="flex gap-2"><span className="text-[#0098EA] font-semibold">1.</span>Describe what you need — in any Telegram chat</li>
                <li className="flex gap-2"><span className="text-[#0098EA] font-semibold">2.</span>Freelancers bid with their price</li>
                <li className="flex gap-2"><span className="text-[#0098EA] font-semibold">3.</span>You pick the best — escrow handles the rest</li>
              </ol>
              <button onClick={() => setShowCreate(true)} className="w-full py-2.5 rounded-xl text-xs font-semibold text-white ton-gradient border-none cursor-pointer">
                Create Your First Offer
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-600">Offers will appear here once created</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((offer) => (
              <div key={offer.id} className="relative">
                <OfferCard
                  id={offer.id}
                  description={offer.description}
                  minPrice={offer.min_price}
                  currency={offer.currency}
                  status={offer.status}
                  applicationCount={offer.application_count ?? 0}
                  onClick={() => navigate(`/offers/${offer.id}`)}
                />
                {offer.creator_trust_score !== null && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-semibold">
                    TS: {offer.creator_trust_score}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Offer Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] shadow-2xl p-6 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-label="Create new offer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">New Offer</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 bg-transparent border-none cursor-pointer">
                <iconify-icon icon="solar:close-circle-linear" width="24" />
              </button>
            </div>

            <div className="space-y-3">
              <textarea
                value={newOffer.description}
                onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                placeholder="Describe your offer..."
                rows={3}
                className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm p-3 resize-none focus:outline-none focus:border-blue-500/40 placeholder-slate-500"
              />

              <div className="flex gap-2">
                <input
                  type="number"
                  value={newOffer.min_price}
                  onChange={(e) => setNewOffer({ ...newOffer, min_price: e.target.value })}
                  placeholder="Min price"
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 text-white text-sm p-3 focus:outline-none focus:border-blue-500/40 placeholder-slate-500"
                />
                <select
                  value={newOffer.currency}
                  onChange={(e) => setNewOffer({ ...newOffer, currency: e.target.value })}
                  className="rounded-xl bg-white/5 border border-white/10 text-white text-sm p-3 focus:outline-none"
                >
                  <option value="TON">TON</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="RUB">RUB</option>
                </select>
              </div>

              <div className="flex gap-2">
                {["buyer", "seller"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setNewOffer({ ...newOffer, role: r })}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border cursor-pointer transition-colors ${
                      newOffer.role === r
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-white/5 text-slate-400 border-white/10"
                    }`}
                  >
                    {r === "buyer" ? "Looking for" : "Offering"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating || !newOffer.description.trim()}
              className="w-full py-3 rounded-xl bg-[#0098EA] text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer"
            >
              {creating ? "Creating..." : "Create Offer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
