import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { fetchStats, fetchPublicOffers, fetchTalent, type PlatformStats, type PublicOffer, type TalentData } from "../lib/api";
import TalentGrid from "../components/TalentGrid";
import ActivityFeed from "../components/ActivityFeed";
import Roadmap from "../components/Roadmap";
import { useT } from "../i18n/context";
import Term from "../components/Term";
import Icon from "../components/Icon";

export default function LandingPage() {
  const navigate = useNavigate();
  const t = useT();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentOffers, setRecentOffers] = useState<PublicOffer[]>([]);
  const [talent, setTalent] = useState<TalentData | null>(null);

  const mainRef = useRef<HTMLElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom (simulates Telegram behavior)
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const interval = setInterval(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Rotating hero words
  const rotateWords = [
    t("landing.hero.rotate1" as any),
    t("landing.hero.rotate2" as any),
    t("landing.hero.rotate3" as any),
    t("landing.hero.rotate4" as any),
  ];
  const [rotateIdx, setRotateIdx] = useState(0);
  const [rotateAnim, setRotateAnim] = useState<"in" | "out">("in");

  useEffect(() => {
    const interval = setInterval(() => {
      setRotateAnim("out");
      setTimeout(() => {
        setRotateIdx((i) => (i + 1) % rotateWords.length);
        setRotateAnim("in");
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, [rotateWords.length]);

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
    fetchPublicOffers().then((offers) => setRecentOffers(offers.slice(0, 6))).catch(() => {});
    fetchTalent().then(setTalent).catch(() => {});
  }, []);

  // Scroll-reveal animation (CSS-class based, defaults to visible)
  useEffect(() => {
    const els = mainRef.current?.querySelectorAll(".reveal");
    if (!els || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [stats, recentOffers, talent]);

  const workflowSteps = [
    { icon: "solar:chat-line-linear", title: t("landing.workflow.step1"), desc: t("landing.workflow.step1.desc") },
    { icon: "solar:document-add-linear", title: t("landing.workflow.step2"), desc: t("landing.workflow.step2.desc") },
    { icon: "solar:dollar-minimalistic-linear", title: t("landing.workflow.step3"), desc: t("landing.workflow.step3.desc") },
    { icon: "solar:users-group-rounded-linear", title: t("landing.workflow.step4"), desc: t("landing.workflow.step4.desc") },
    { icon: "solar:wallet-2-linear", title: t("landing.workflow.step5"), desc: t("landing.workflow.step5.desc") },
    { icon: "solar:shield-check-linear", title: t("landing.workflow.step6"), desc: t("landing.workflow.step6.desc") },
  ];

  return (
    <div
      className="overflow-x-hidden page-shell"
    >
      <Helmet>
        <title>izEscrowAI — AI-Powered P2P Escrow on TON</title>
      </Helmet>
      <main ref={mainRef} className="relative">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="text-left">
              <h1 className="animate-fade-up delay-100 text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1] mb-6">
                {t("landing.hero.title1")} <br />
                <span className="inline-grid">
                  <span className="col-start-1 row-start-1 invisible">{rotateWords.reduce((a, b) => a.length > b.length ? a : b, "")}</span>
                  <span
                    className={`col-start-1 row-start-1 text-[#0098EA] transition-[opacity,transform] duration-300 ${
                      rotateAnim === "in"
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-4"
                    }`}
                  >
                    {rotateWords[rotateIdx]}
                  </span>
                </span><br />
                <Term hintKey="term.ton">{t("landing.hero.title3")}</Term>
              </h1>
              <p className="animate-fade-up delay-200 text-lg text-slate-400 font-light leading-relaxed max-w-xl mb-10">
                {t("landing.hero.subtitle")}
              </p>
              <div className="animate-fade-up delay-300 flex flex-col sm:flex-row gap-4">
                <a
                  href="https://t.me/izEscrowAIBot"
                  className="ton-gradient px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-medium text-white no-underline transition-transform hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/20 whitespace-nowrap"
                >
                  <Icon icon="simple-icons:telegram" size={20} />
                  {t("landing.hero.openBot")}
                </a>
                <button
                  onClick={() => navigate("/offers")}
                  className="glass-panel px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-medium hover:bg-white/5 transition-colors cursor-pointer border-none text-white text-base whitespace-nowrap"
                >
                  <Icon icon="solar:tag-linear" size={20} />
                  {t("landing.hero.browseOffers")}
                </button>
              </div>
            </div>

            {/* Telegram Chat Mockup — iPhone frame */}
            <div className="relative" style={{ transform: "scale(0.65)", transformOrigin: "center center" }}>
              <div className="mockup-phone mx-auto">
                <div className="mockup-phone-camera"></div>
                <div className="mockup-phone-display chat-bg">
                {/* Chat header */}
                <div className="chat-header flex items-center gap-3 px-4 py-3 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full ton-gradient flex items-center justify-center">
                    <Icon icon="solar:shield-check-linear" size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[15px] font-medium">{t("landing.chat.botName")}</div>
                    <div className="text-[12px] chat-online">{t("landing.chat.online")}</div>
                  </div>
                  <Icon icon="solar:phone-linear" size={20} className="text-[#6D7883]" />
                  <Icon icon="solar:menu-dots-bold" size={20} className="text-[#6D7883]" />
                </div>

                {/* Chat messages — auto-scrolls to bottom as new messages appear */}
                <div ref={chatRef} className="px-3 py-4 space-y-3 flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                  {/* Step 1: User sends /start */}
                  <div className="flex justify-end chat-step chat-step-1">
                    <div className="chat-bubble-user max-w-[80%] px-3 py-2 rounded-[18px] rounded-br-[6px] text-sm">
                      /start
                      <div className="text-[11px] chat-time text-right mt-1">12:01</div>
                    </div>
                  </div>

                  {/* Step 2: Bot welcome message */}
                  <div className="flex items-end gap-2 chat-step chat-step-2">
                    <div className="w-7 h-7 rounded-full ton-gradient flex items-center justify-center flex-shrink-0">
                      <Icon icon="solar:shield-check-linear" size={14} className="text-white" />
                    </div>
                    <div className="chat-bubble-bot max-w-[85%] px-3 py-2 rounded-[18px] rounded-bl-[6px] text-[13px] leading-relaxed">
                      <div className="font-medium mb-1">{t("landing.chat.welcome")}</div>
                      <div className="text-slate-400 mb-2">{t("landing.chat.welcomeText")}</div>
                      <div className="text-slate-400">{t("landing.chat.prompt")}</div>
                      <div className="chat-link">{t("landing.chat.example")}</div>
                      <div className="text-[11px] chat-time text-right mt-1">12:01</div>
                    </div>
                  </div>

                  {/* Step 3: User typing */}
                  <div className="flex justify-end chat-step chat-step-3">
                    <div className="chat-bubble-user px-3 py-2 rounded-[18px] rounded-br-[6px] text-xs text-slate-400">
                      <span className="typing-bubble"><span /><span /><span /></span>
                    </div>
                  </div>

                  {/* Step 4: User sends deal message */}
                  <div className="flex justify-end chat-step chat-step-4">
                    <div className="chat-bubble-user max-w-[80%] px-3 py-2 rounded-[18px] rounded-br-[6px] text-sm">
                      {t("landing.chat.dealExample")}
                      <div className="text-[11px] chat-time text-right mt-1">12:02</div>
                    </div>
                  </div>

                  {/* Step 5: Bot parsing */}
                  <div className="flex items-end gap-2 chat-step chat-step-5">
                    <div className="w-7 h-7 rounded-full ton-gradient flex items-center justify-center flex-shrink-0">
                      <Icon icon="solar:shield-check-linear" size={14} className="text-white" />
                    </div>
                    <div className="chat-bubble-bot px-3 py-2 rounded-[18px] rounded-bl-[6px] text-xs text-slate-400 flex items-center gap-1.5">
                      <Icon icon="solar:cpu-linear" size={14} className="text-[#0098EA] animate-spin-slow" />
                      <span className="typing-dots">{t("landing.chat.parsing")}</span>
                    </div>
                  </div>

                  {/* Step 6: Bot parsed deal confirmation */}
                  <div className="flex items-end gap-2 chat-step chat-step-6">
                    <div className="w-7 h-7 rounded-full ton-gradient flex items-center justify-center flex-shrink-0">
                      <Icon icon="solar:shield-check-linear" size={14} className="text-white" />
                    </div>
                    <div className="chat-bubble-bot max-w-[85%] rounded-[18px] rounded-bl-[6px] overflow-hidden">
                      <div className="px-3 pt-2 pb-1 text-[13px] leading-relaxed">
                        <div className="font-medium mb-1.5">{t("landing.chat.parsed")}</div>
                        <div className="space-y-0.5 mb-2">
                          <div><span className="text-slate-400">{t("landing.chat.seller")}</span> @you <span className="text-slate-500">(3 deals, 4.5)</span></div>
                          <div><span className="text-slate-400">{t("landing.chat.buyer")}</span> @ivan <span className="text-slate-500">(0 deals)</span></div>
                          <div><span className="text-slate-400">{t("landing.chat.amount")}</span> 50 TON</div>
                          <div><span className="text-slate-400">{t("landing.chat.description")}</span> Logo design</div>
                        </div>
                        <div className="text-slate-400">{t("landing.chat.correct")}</div>
                      </div>
                      <div className="px-2 pb-2 flex gap-1.5">
                        <div className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider ton-gradient rounded-lg text-center text-white shadow-lg shadow-blue-500/20">
                          {t("landing.chat.confirm")}
                        </div>
                        <div className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider bg-white/5 border border-white/10 rounded-lg text-center text-slate-300">
                          {t("landing.chat.cancel")}
                        </div>
                      </div>
                      <div className="px-3 pb-2">
                        <div className="text-[11px] chat-time text-right">12:02</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat input bar */}
                <div className="chat-header flex items-center gap-2 px-3 py-2.5 flex-shrink-0">
                  <Icon icon="solar:smile-circle-linear" size={24} className="text-[#6D7883]" />
                  <div className="flex-1 bg-[#0E1621] rounded-full px-4 py-2 text-xs text-[#6D7883] border border-white/5">
                    {t("landing.chat.message")}
                  </div>
                  <Icon icon="solar:microphone-linear" size={24} className="text-[#6D7883]" />
                </div>
                </div>{/* /mockup-phone-display */}
              </div>{/* /mockup-phone */}
            </div>{/* /mockup-wrapper */}
          </div>
        </section>

        {/* Live Stats */}
        <section className="py-16 px-6 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: stats?.active_jobs ?? 0, label: t("landing.stats.jobs"), icon: "solar:document-text-linear", gradient: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/20", glow: "shadow-blue-500/5" },
                { value: 19, label: t("landing.stats.sources"), icon: "solar:radar-2-linear", gradient: "from-purple-500/20 to-pink-500/20", border: "border-purple-500/20", glow: "shadow-purple-500/5" },
                { value: stats?.total_users ?? 0, label: t("landing.stats.users"), icon: "solar:users-group-rounded-linear", gradient: "from-emerald-500/20 to-green-500/20", border: "border-emerald-500/20", glow: "shadow-emerald-500/5" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`relative overflow-hidden rounded-2xl border ${stat.border} bg-gradient-to-br ${stat.gradient} p-5 shadow-lg ${stat.glow} group hover:-translate-y-1 hover:shadow-xl transition-[transform,box-shadow] duration-300`}
                >
                  <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-25 transition-opacity duration-500">
                    <Icon icon={stat.icon} size={40} />
                  </div>
                  <div className="text-3xl font-bold tracking-tight text-white">{stat.value}</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-medium tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 px-6 relative reveal section-tinted">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">{t("landing.workflow.title")}</h2>
            <p className="text-slate-400 font-light">{t("landing.workflow.subtitle")}</p>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {workflowSteps.map((step) => (
              <div key={step.title} className="bg-white/[0.03] border border-white/[0.06] p-8 rounded-3xl group">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                  <Icon icon={step.icon} size={24} className="text-[#0098EA]" />
                </div>
                <h3 className="text-lg font-medium mb-3 tracking-tight">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-light">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="py-32 px-6 reveal">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Row 1: AI Spec Generator (2col) + AI Pricing (1col) */}
            <div className="md:col-span-2 bg-white/[0.03] border border-white/[0.06] p-10 rounded-[2.5rem] hover-lift relative overflow-hidden group">
              <div className="relative z-10">
                <Icon icon="solar:document-add-linear" size={40} className="text-[#0098EA] mb-6" />
                <h3 className="text-2xl font-medium tracking-tight mb-4"><Term hintKey="term.spec">{t("landing.feature.spec.title")}</Term></h3>
                <p className="text-slate-400 font-light max-w-md">
                  {t("landing.feature.spec.desc")}
                </p>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] p-10 rounded-[2.5rem] hover-lift flex flex-col justify-between">
              <div>
                <Icon icon="solar:tag-price-linear" size={40} className="text-emerald-400 mb-6" />
                <h3 className="text-xl font-medium tracking-tight mb-4">{t("landing.feature.pricing.title")}</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                {t("landing.feature.pricing.desc")}
              </p>
            </div>

            {/* Row 2: AI Matching (1col) + AI Arbitration (2col) */}
            <div className="bg-white/[0.03] border border-white/[0.06] p-10 rounded-[2.5rem] hover-lift flex flex-col justify-between">
              <div>
                <Icon icon="solar:users-group-rounded-linear" size={40} className="text-[#0098EA] mb-6" />
                <h3 className="text-xl font-medium tracking-tight mb-4"><Term hintKey="term.trustScore">{t("landing.feature.matching.title")}</Term></h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                {t("landing.feature.matching.desc")}
              </p>
            </div>

            <div className="md:col-span-2 bg-white/[0.03] border border-white/[0.06] p-10 rounded-[2.5rem] hover-lift relative overflow-hidden group">
              <div className="relative z-10">
                <Icon icon="solar:scale-linear" size={40} className="text-purple-400 mb-6" />
                <h3 className="text-2xl font-medium tracking-tight mb-4"><Term hintKey="term.arbitration">{t("landing.feature.arbitration.title")}</Term></h3>
                <p className="text-slate-400 font-light max-w-md">
                  {t("landing.feature.arbitration.desc")}
                </p>
              </div>
            </div>

            {/* Row 3: Escrow (1col) + GitHub Score (1col) + Job Parser (1col) */}
            <div className="bg-white/[0.03] border border-white/[0.06] p-10 rounded-[2.5rem] hover-lift flex flex-col justify-between group">
              <div>
                <Icon icon="solar:verified-check-linear" size={40} className="text-emerald-400 mb-6" />
                <h3 className="text-xl font-medium tracking-tight mb-4"><Term hintKey="term.escrow">{t("landing.feature.escrow.title")}</Term></h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                {t("landing.feature.escrow.desc")}
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] p-10 rounded-[2.5rem] hover-lift flex flex-col justify-between">
              <div>
                <Icon icon="solar:code-scan-linear" size={40} className="text-green-400 mb-6" />
                <h3 className="text-xl font-medium tracking-tight mb-4">{t("landing.feature.github.title")}</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                {t("landing.feature.github.desc")}
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] p-10 rounded-[2.5rem] hover-lift flex flex-col justify-between">
              <div>
                <Icon icon="solar:radar-2-linear" size={40} className="text-amber-400 mb-6" />
                <h3 className="text-xl font-medium tracking-tight mb-4">{t("landing.feature.parser.title")}</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                {t("landing.feature.parser.desc")}
              </p>
            </div>

            {/* Row 4: Inline Offers (2col) + Trust Score (1col) */}
            <div className="md:col-span-2 bg-white/[0.03] border border-white/[0.06] p-10 rounded-[2.5rem] hover-lift relative overflow-hidden group">
              <div className="relative z-10">
                <Icon icon="solar:chat-square-arrow-linear" size={40} className="text-cyan-400 mb-6" />
                <h3 className="text-2xl font-medium tracking-tight mb-4">{t("landing.feature.inline.title")}</h3>
                <p className="text-slate-400 font-light max-w-md">
                  {t("landing.feature.inline.desc")}
                </p>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] p-10 rounded-[2.5rem] hover-lift flex flex-col justify-between">
              <div>
                <Icon icon="solar:shield-user-linear" size={40} className="text-green-400 mb-6" />
                <h3 className="text-xl font-medium tracking-tight mb-4">{t("landing.feature.risk.title")}</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                {t("landing.feature.risk.desc")}
              </p>
            </div>
          </div>
        </section>

        {/* Available Talent */}
        {talent && (
          <section className="py-20 px-6 reveal section-tinted">
            <div className="max-w-7xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">{t("landing.talent.title")}</h2>
              <p className="text-slate-400 font-light">{t("landing.talent.subtitle")}</p>
            </div>
            <div className="max-w-7xl mx-auto">
              <TalentGrid languages={talent.languages} categories={talent.categories} />
            </div>
          </section>
        )}

        {/* Recent Offers Feed */}
        {recentOffers.length > 0 && (
          <section className="py-24 px-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">{t("landing.offers.title")}</h2>
                  <p className="text-slate-400 font-light">{t("landing.offers.subtitle")}</p>
                </div>
                <button
                  onClick={() => navigate("/offers")}
                  className="text-[#0098EA] text-sm font-medium bg-transparent border-none cursor-pointer hover:underline"
                >
                  {t("landing.offers.viewAll")}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentOffers.map((offer) => (
                  <button
                    key={offer.id}
                    onClick={() => navigate(`/offers/${offer.id}`)}
                    className="glass-panel p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition-transform text-left w-full"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-medium uppercase">
                        Open
                      </span>
                      {offer.creator_trust_score !== null && (
                        <span className="text-[10px] text-slate-500">TS: {offer.creator_trust_score}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium mb-3 line-clamp-2">{offer.description}</h3>
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      {offer.min_price ? (
                        <span>from {offer.min_price} {offer.currency}</span>
                      ) : (
                        <span>{t("offers.price.negotiable")}</span>
                      )}
                      <span>{offer.application_count ?? 0} bids</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Live Activity */}
        <section className="py-16 px-6 reveal border-y border-white/5">
          <div className="max-w-7xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">{t("landing.activity.title")}</h2>
            <p className="text-slate-400 font-light">{t("landing.activity.subtitle")}</p>
          </div>
          <div className="max-w-3xl mx-auto">
            <ActivityFeed />
          </div>
        </section>

        {/* Roadmap */}
        <section className="py-24 px-6 section-tinted">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">{t("landing.roadmap.title")}</h2>
            <p className="text-slate-400 font-light">{t("landing.roadmap.subtitle")}</p>
          </div>
          <div className="max-w-5xl mx-auto">
            <Roadmap />
          </div>
        </section>

        {/* Tech Stack */}
        <section className="py-16 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-8">
              Built with
            </p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-14">
              {[
                { icon: "simple-icons:telegram", label: "grammY Bot" },
                { icon: "simple-icons:ton", label: "Tolk Contracts" },
                { icon: "simple-icons:openai", label: "OpenRouter AI" },
                { icon: "simple-icons:typescript", label: "TypeScript" },
                { icon: "simple-icons:react", label: "React" },
                { icon: "simple-icons:postgresql", label: "Drizzle + PG" },
              ].map((tech) => (
                <div key={tech.label} className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors">
                  <Icon icon={tech.icon} size={20} />
                  <span className="text-xs font-medium">{tech.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 text-center reveal">
          <div className="max-w-4xl mx-auto glass-panel p-12 md:p-20 rounded-[3rem] border-white/10 glow-blue relative overflow-hidden">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              {t("landing.cta.title")}
            </h2>
            <p className="text-lg text-slate-400 font-light mb-10">
              {t("landing.cta.subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://t.me/izEscrowAIBot"
                className="ton-gradient px-10 py-5 rounded-2xl flex items-center justify-center gap-3 font-medium hover:shadow-2xl hover:shadow-blue-500/20 transition-shadow text-white no-underline whitespace-nowrap"
              >
                <Icon icon="simple-icons:telegram" size={20} />
                {t("landing.hero.openBot")}
              </a>
              <button
                onClick={() => navigate("/market")}
                className="glass-panel px-10 py-5 rounded-2xl flex items-center justify-center gap-3 font-medium hover:bg-white/5 transition-colors cursor-pointer text-white border-none text-base whitespace-nowrap"
              >
                <Icon icon="solar:bag-4-linear" size={20} />
                {t("landing.hero.browseOffers")}
              </button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
