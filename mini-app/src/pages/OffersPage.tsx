import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPublicOffers, type PublicOffer } from "../lib/api";
import OfferCard from "../components/OfferCard";
import LoginGate from "../components/LoginGate";
import { useAuth } from "../contexts/AuthContext";

export default function OffersPage() {
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchPublicOffers()
      .then(setOffers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pt-28 pb-16 px-6" style={{ background: "#0f0f1a", color: "#fff" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Marketplace</h1>
            <p className="text-slate-400 text-sm">Browse open offers and find work or freelancers</p>
          </div>
          <LoginGate fallbackText="Login to create offers">
            <button
              onClick={() => navigate("/offers/create")}
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
          <div className="text-center py-20">
            <iconify-icon icon="solar:box-minimalistic-linear" width="48" height="48" class="text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-400 mb-2">No offers yet</h3>
            <p className="text-sm text-slate-500">
              Be the first to post an offer! Use the bot or create one here.
            </p>
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
    </div>
  );
}
