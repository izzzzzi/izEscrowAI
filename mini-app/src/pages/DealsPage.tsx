import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDeals, fetchOffers, fetchOffer, createOffer, type Deal, type Offer, type OfferWithApps } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { useT } from "../i18n/context";

const statusStyles: Record<string, { labelKey: string; bg: string; text: string }> = {
  created: { labelKey: "deals.status.created", bg: "bg-slate-500/10", text: "text-slate-400" },
  confirmed: { labelKey: "deals.status.confirmed", bg: "bg-blue-500/10", text: "text-blue-400" },
  funded: { labelKey: "deals.status.funded", bg: "bg-green-500/10", text: "text-green-400" },
  delivered: { labelKey: "deals.status.delivered", bg: "bg-amber-500/10", text: "text-amber-400" },
  completed: { labelKey: "deals.status.completed", bg: "bg-green-500/10", text: "text-green-400" },
  disputed: { labelKey: "deals.status.disputed", bg: "bg-red-500/10", text: "text-red-400" },
  resolved: { labelKey: "deals.status.resolved", bg: "bg-slate-500/10", text: "text-slate-400" },
  cancelled: { labelKey: "deals.status.cancelled", bg: "bg-slate-500/10", text: "text-slate-400" },
};

const offerStatusStyles: Record<string, { labelKey: string; bg: string; text: string }> = {
  open: { labelKey: "deals.offer.open", bg: "bg-green-500/10", text: "text-green-400" },
  closed: { labelKey: "deals.offer.closed", bg: "bg-slate-500/10", text: "text-slate-400" },
  cancelled: { labelKey: "deals.status.cancelled", bg: "bg-red-500/10", text: "text-red-400" },
};

type Tab = "deals" | "offers";

export default function DealsPage() {
  const navigate = useNavigate();
  const t = useT();
  const [tab, setTab] = useState<Tab>("deals");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [expandedOffer, setExpandedOffer] = useState<OfferWithApps | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [newOffer, setNewOffer] = useState({ description: "", min_price: "", currency: "TON", role: "buyer" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchDeals()
      .then(setDeals)
      .catch(console.error)
      .finally(() => setLoadingDeals(false));
  }, []);

  useEffect(() => {
    if (tab === "offers" && offers.length === 0) {
      setLoadingOffers(true);
      fetchOffers()
        .then(setOffers)
        .catch(console.error)
        .finally(() => setLoadingOffers(false));
    }
  }, [tab]);

  const handleCreateOffer = async () => {
    if (!newOffer.description.trim()) return;
    setCreating(true);
    try {
      const offer = await createOffer({
        description: newOffer.description,
        min_price: newOffer.min_price ? parseFloat(newOffer.min_price) : undefined,
        currency: newOffer.currency,
        role: newOffer.role,
      });
      setOffers((prev) => [{ ...offer, application_count: 0 }, ...prev]);
      setShowCreateOffer(false);
      setNewOffer({ description: "", min_price: "", currency: "TON", role: "buyer" });
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleExpandOffer = async (offerId: string) => {
    if (expandedOffer?.id === offerId) {
      setExpandedOffer(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const detail = await fetchOffer(offerId);
      setExpandedOffer(detail);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="mini-page">
      <AppHeader />
      <main className="px-5 pb-32 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl">
          {(["deals", "offers"] as Tab[]).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border-none cursor-pointer ${
                tab === tb
                  ? "bg-[#0098EA]/20 text-[#0098EA]"
                  : "bg-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {tb === "deals" ? t("deals.tab.deals") : t("deals.tab.offers")}
            </button>
          ))}
        </div>

        {tab === "deals" && (
          <>
            {loadingDeals ? (
              <SkeletonCards />
            ) : deals.length === 0 ? (
              <div className="space-y-6">
                <div className="glass-card rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0098EA] to-[#22d3ee] flex items-center justify-center">
                      <iconify-icon icon="solar:shield-check-linear" width="22" class="text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{t("deals.empty.title")}</h3>
                      <p className="text-xs text-slate-400">{t("deals.empty.subtitle")}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t("deals.empty.description")}
                  </p>
                  <ol className="space-y-2 text-xs text-slate-400">
                    <li className="flex gap-2"><span className="text-[#0098EA] font-semibold">1.</span>{t("deals.empty.step1")}</li>
                    <li className="flex gap-2"><span className="text-[#0098EA] font-semibold">2.</span>{t("deals.empty.step2")}</li>
                    <li className="flex gap-2"><span className="text-[#0098EA] font-semibold">3.</span>{t("deals.empty.step3")}</li>
                  </ol>
                  <div className="flex gap-2 pt-1">
                    <a href="https://t.me/izEscrowAIBot" target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2.5 rounded-xl text-xs font-semibold text-white ton-gradient no-underline">
                      {t("deals.empty.openBot")}
                    </a>
                    <button onClick={() => navigate("/market")} className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 cursor-pointer">
                      {t("deals.empty.browseJobs")}
                    </button>
                  </div>
                </div>
                <p className="text-center text-[10px] text-slate-600">{t("deals.empty.hint")}</p>
              </div>
            ) : (
              deals.map((deal) => <DealCard key={deal.id} deal={deal} />)
            )}
          </>
        )}

        {tab === "offers" && (
          <>
            {/* Create offer button */}
            <button
              onClick={() => setShowCreateOffer(true)}
              className="w-full py-3 rounded-xl border border-dashed border-slate-600 text-slate-400 text-sm font-medium bg-transparent cursor-pointer hover:border-[#0098EA] hover:text-[#0098EA] transition-all flex items-center justify-center gap-2"
            >
              <iconify-icon icon="solar:add-circle-linear" width="18" />
              {t("deals.createOffer")}
            </button>

            {loadingOffers ? (
              <SkeletonCards />
            ) : offers.length === 0 ? (
              <EmptyState icon="solar:tag-linear" text={t("deals.offers.empty")} sub={t("deals.offers.emptyHint")} />
            ) : (
              offers.map((offer) => (
                <OfferCardItem
                  key={offer.id}
                  offer={offer}
                  expanded={expandedOffer?.id === offer.id ? expandedOffer : null}
                  loadingDetail={loadingDetail && expandedOffer?.id !== offer.id}
                  onExpand={() => handleExpandOffer(offer.id)}
                />
              ))
            )}

            {/* Create offer modal */}
            {showCreateOffer && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowCreateOffer(false)}>
                <div
                  className="w-full max-w-md bg-[#1e293b] rounded-t-3xl p-6 space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{t("deals.modal.title")}</h3>
                    <button onClick={() => setShowCreateOffer(false)} className="text-slate-400 bg-transparent border-none cursor-pointer">
                      <iconify-icon icon="solar:close-circle-linear" width="24" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <textarea
                      placeholder={t("deals.modal.placeholder")}
                      value={newOffer.description}
                      onChange={(e) => setNewOffer((p) => ({ ...p, description: e.target.value }))}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-sm text-white resize-none h-20 outline-none focus:border-[#0098EA]"
                    />
                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder={t("deals.modal.minPrice")}
                        value={newOffer.min_price}
                        onChange={(e) => setNewOffer((p) => ({ ...p, min_price: e.target.value }))}
                        className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-[#0098EA]"
                      />
                      <select
                        value={newOffer.currency}
                        onChange={(e) => setNewOffer((p) => ({ ...p, currency: e.target.value }))}
                        className="bg-slate-800/50 border border-slate-700 rounded-xl px-3 text-sm text-white outline-none"
                      >
                        <option value="TON" className="bg-[#0f172a] text-white">TON</option>
                        <option value="USD" className="bg-[#0f172a] text-white">USD</option>
                        <option value="RUB" className="bg-[#0f172a] text-white">RUB</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      {(["buyer", "seller"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setNewOffer((p) => ({ ...p, role: r }))}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase border-none cursor-pointer transition-all ${
                            newOffer.role === r ? "bg-[#0098EA]/20 text-[#0098EA]" : "bg-slate-800/50 text-slate-500"
                          }`}
                        >
                          {r === "buyer" ? t("deals.modal.buying") : t("deals.modal.selling")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleCreateOffer}
                    disabled={creating || !newOffer.description.trim()}
                    className="w-full py-3 rounded-xl bg-[#0098EA] text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer"
                  >
                    {creating ? t("deals.modal.creating") : t("deals.modal.create")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const t = useT();
  const s = statusStyles[deal.status] ?? { labelKey: deal.status, bg: "bg-slate-500/10", text: "text-slate-400" };

  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="text-xs font-mono text-slate-500">ID: #{deal.id}</span>
          <h3 className="text-sm font-medium leading-tight">{deal.description}</h3>
        </div>
        <span className={`status-pill ${s.bg} ${s.text}`}>{t(s.labelKey as any)}</span>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-white/5">
        <span className="text-lg font-semibold tracking-tight">
          {deal.original_amount && deal.original_currency ? (
            <>
              {deal.original_amount}{" "}
              <span className="text-xs font-medium text-slate-400">{deal.original_currency}</span>
              <span className="text-xs text-slate-500 ml-1">= {deal.amount} TON</span>
            </>
          ) : (
            <>
              {deal.amount}{" "}
              <span className="text-xs font-medium text-slate-400">{deal.currency}</span>
            </>
          )}
        </span>
        <iconify-icon icon="solar:alt-arrow-right-linear" class="text-slate-600" width="18" />
      </div>
    </div>
  );
}

function OfferCardItem({
  offer,
  expanded,
  loadingDetail,
  onExpand,
}: {
  offer: Offer;
  expanded: OfferWithApps | null;
  loadingDetail: boolean;
  onExpand: () => void;
}) {
  const t = useT();
  const s = offerStatusStyles[offer.status] ?? { labelKey: offer.status, bg: "bg-slate-500/10", text: "text-slate-400" };

  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">#{offer.id.slice(0, 12)}</span>
            <span className={`status-pill ${s.bg} ${s.text}`}>{t(s.labelKey as any)}</span>
          </div>
          <h3 className="text-sm font-medium leading-tight truncate">{offer.description}</h3>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-white/5">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {offer.min_price && (
            <span>
              from {offer.min_price} {offer.currency}
            </span>
          )}
          <span className="flex items-center gap-1">
            <iconify-icon icon="solar:users-group-rounded-linear" width="14" />
            {offer.application_count ?? 0} {t("deals.offer.bids")}
          </span>
        </div>
        <button
          onClick={onExpand}
          className="text-xs text-[#0098EA] font-medium bg-transparent border-none cursor-pointer"
        >
          {expanded ? t("deals.offer.collapse") : t("deals.offer.details")}
        </button>
      </div>

      {loadingDetail && (
        <div className="text-xs text-slate-500 text-center py-2">{t("deals.offer.loading")}</div>
      )}

      {expanded && (
        <div className="pt-2 border-t border-white/5 space-y-2">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            {t("deals.offer.applications")} ({expanded.applications.length})
          </div>
          {expanded.applications.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">{t("deals.offer.noApps")}</div>
          ) : (
            expanded.applications.map((app) => (
              <div key={app.id} className="bg-slate-800/30 rounded-xl p-3 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">
                    {app.price} {offer.currency}
                  </span>
                  <span className={`text-xs ${app.status === "accepted" ? "text-green-400" : app.status === "rejected" ? "text-red-400" : "text-slate-400"}`}>
                    {app.status}
                  </span>
                </div>
                {app.message && <p className="text-xs text-slate-400">{app.message}</p>}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {app.trust_score !== null && app.trust_score !== undefined && (
                    <span className={`font-medium ${app.trust_score >= 70 ? "text-green-400" : app.trust_score >= 40 ? "text-amber-400" : "text-red-400"}`}>
                      {t("deals.offer.trust")}: {app.trust_score}
                    </span>
                  )}
                  {app.reputation && (
                    <span>{app.reputation.completed_deals} {t("deals.offer.deals")}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
          <div className="h-3 bg-slate-700/50 rounded w-20 mb-3" />
          <div className="h-4 bg-slate-700/50 rounded w-3/4 mb-4" />
          <div className="h-6 bg-slate-700/50 rounded w-24" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <iconify-icon icon={icon} class="text-slate-700 mb-4" width="64" />
      <p className="text-sm text-slate-500">{text}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}
