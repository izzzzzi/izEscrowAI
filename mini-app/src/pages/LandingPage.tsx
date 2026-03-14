import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { fetchStats, fetchPublicOffers, fetchTalent, fetchTopGroups, type PlatformStats, type PublicOffer, type TalentData, type GroupStat } from "../lib/api";
import StatCounter from "../components/StatCounter";
import TalentGrid from "../components/TalentGrid";
import ActivityFeed from "../components/ActivityFeed";
import Roadmap from "../components/Roadmap";

export default function LandingPage() {
  const mainRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentOffers, setRecentOffers] = useState<PublicOffer[]>([]);
  const [talent, setTalent] = useState<TalentData | null>(null);
  const [topGroups, setTopGroups] = useState<GroupStat[]>([]);

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
    fetchPublicOffers().then((offers) => setRecentOffers(offers.slice(0, 6))).catch(() => {});
    fetchTalent().then(setTalent).catch(() => {});
    fetchTopGroups(5).then(setTopGroups).catch(() => {});
  }, []);

  useEffect(() => {
    const sections = mainRef.current?.querySelectorAll("section");
    if (!sections) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "translateY(0)";
          }
        });
      },
      { threshold: 0.1 },
    );

    sections.forEach((section, i) => {
      if (i === 0) return; // Hero visible immediately
      const el = section as HTMLElement;
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = "all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)";
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="overflow-x-hidden"
      style={{ background: "#0f0f1a", color: "#fff", fontFamily: "'Inter', sans-serif" }}
    >
      <Helmet>
        <title>izEscrowAI — AI-Powered P2P Escrow on TON</title>
      </Helmet>
      <main ref={mainRef} className="relative">
        {/* Background Orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none -z-10">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-[#0098EA]/10 rounded-full blur-[120px]" />
          <div className="absolute top-40 right-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px]" />
        </div>

        {/* Hero Section */}
        <section className="pt-40 pb-20 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-medium tracking-widest uppercase text-[#0098EA] mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0098EA] animate-pulse" />
                Live on TON
              </div>
              <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1] mb-6">
                Dev Freelance <br />
                <span className="text-[#0098EA]">Exchange</span> on TON.
              </h1>
              <p className="text-lg text-slate-400 font-light leading-relaxed max-w-xl mb-10">
                Find developers, verify skills via GitHub, and lock payments in a smart contract.
                AI parses deals from natural language — no middlemen, total trust.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="https://t.me/izEscrowAIBot"
                  className="ton-gradient px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-medium transition-transform hover:-translate-y-0.5"
                >
                  <iconify-icon icon="solar:paper-plane-linear" width="20" height="20" />
                  Open Telegram Bot
                </a>
                <button
                  onClick={() => navigate("/offers")}
                  className="glass-panel px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-medium hover:bg-white/5 transition-all cursor-pointer border-none text-white text-base"
                >
                  <iconify-icon icon="solar:tag-linear" width="20" height="20" />
                  Browse Offers
                </button>
              </div>
            </div>

            {/* Telegram Chat Mockup — iPhone frame */}
            <div className="relative animate-float">
              <div className="mockup-phone mx-auto">
                <div className="mockup-phone-camera"></div>
                <div className="mockup-phone-display">
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5" style={{ background: "rgba(23, 33, 48, 0.9)" }}>
                  <div className="w-9 h-9 rounded-full ton-gradient flex items-center justify-center">
                    <iconify-icon icon="solar:shield-check-linear" width="18" height="18" class="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">izEscrowAI Bot</div>
                    <div className="text-[10px] text-[#0098EA]">online</div>
                  </div>
                  <iconify-icon icon="solar:phone-linear" width="18" class="text-slate-500" />
                  <iconify-icon icon="solar:menu-dots-bold" width="18" class="text-slate-500" />
                </div>

                {/* Chat messages */}
                <div className="px-3 py-4 space-y-3 min-h-[380px]">
                  {/* Step 1: User sends /start */}
                  <div className="flex justify-end chat-step chat-step-1">
                    <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-br-md text-sm" style={{ background: "#2B5278" }}>
                      /start
                      <div className="text-[10px] text-slate-400 text-right mt-1">12:01</div>
                    </div>
                  </div>

                  {/* Step 2: Bot welcome message */}
                  <div className="flex items-end gap-2 chat-step chat-step-2">
                    <div className="w-7 h-7 rounded-full ton-gradient flex items-center justify-center flex-shrink-0">
                      <iconify-icon icon="solar:shield-check-linear" width="14" class="text-white" />
                    </div>
                    <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md text-[13px] leading-relaxed" style={{ background: "rgba(30, 41, 59, 0.8)" }}>
                      Welcome to izEscrowAI!{"\n\n"}
                      <span className="text-slate-400">I'm an AI-powered escrow agent for safe P2P deals. Funds are held by a smart contract on TON.</span>{"\n\n"}
                      <span className="text-slate-400">Just write something like:</span>{"\n"}
                      <span className="text-[#0098EA]">"Selling logo design to @ivan for 50 TON"</span>
                      <div className="text-[10px] text-slate-500 text-right mt-1">12:01</div>
                    </div>
                  </div>

                  {/* Step 3: User typing */}
                  <div className="flex justify-end chat-step chat-step-3">
                    <div className="px-3 py-2 rounded-2xl rounded-br-md text-xs text-slate-400" style={{ background: "#2B5278" }}>
                      <span className="typing-bubble"><span /><span /><span /></span>
                    </div>
                  </div>

                  {/* Step 4: User sends deal message */}
                  <div className="flex justify-end chat-step chat-step-4">
                    <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-br-md text-sm" style={{ background: "#2B5278" }}>
                      Selling logo design to @ivan for 50 TON
                      <div className="text-[10px] text-slate-400 text-right mt-1">12:02</div>
                    </div>
                  </div>

                  {/* Step 5: Bot parsing */}
                  <div className="flex items-end gap-2 chat-step chat-step-5">
                    <div className="w-7 h-7 rounded-full ton-gradient flex items-center justify-center flex-shrink-0">
                      <iconify-icon icon="solar:shield-check-linear" width="14" class="text-white" />
                    </div>
                    <div className="px-3 py-2 rounded-2xl rounded-bl-md text-xs text-slate-400 flex items-center gap-1.5" style={{ background: "rgba(30, 41, 59, 0.8)" }}>
                      <iconify-icon icon="solar:cpu-linear" width="14" class="text-[#0098EA] animate-spin-slow" />
                      <span className="typing-dots">Parsing deal terms</span>
                    </div>
                  </div>

                  {/* Step 6: Bot parsed deal confirmation */}
                  <div className="flex items-end gap-2 chat-step chat-step-6">
                    <div className="w-7 h-7 rounded-full ton-gradient flex items-center justify-center flex-shrink-0">
                      <iconify-icon icon="solar:shield-check-linear" width="14" class="text-white" />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md overflow-hidden" style={{ background: "rgba(30, 41, 59, 0.8)" }}>
                      <div className="px-3 pt-2 pb-1 text-[13px] leading-relaxed">
                        Parsed deal:{"\n\n"}
                        <span className="text-slate-400">Seller:</span> @you <span className="text-slate-500">(3 deals, 4.5)</span>{"\n"}
                        <span className="text-slate-400">Buyer:</span> @ivan <span className="text-slate-500">(0 deals)</span>{"\n"}
                        <span className="text-slate-400">Amount:</span> 50 TON{"\n"}
                        <span className="text-slate-400">Description:</span> Logo design{"\n\n"}
                        <span className="text-slate-400">Is this correct?</span>
                      </div>
                      <div className="px-2 pb-2 flex gap-1.5">
                        <div className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider ton-gradient rounded-lg text-center text-white shadow-lg shadow-blue-500/20">
                          Confirm
                        </div>
                        <div className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider bg-white/5 border border-white/10 rounded-lg text-center text-slate-300">
                          Cancel
                        </div>
                      </div>
                      <div className="px-3 pb-2">
                        <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <iconify-icon icon="solar:shield-check-linear" width="11" />
                          Trust Score: 87 — Low Risk
                        </div>
                        <div className="text-[10px] text-slate-500 text-right">12:02</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat input bar */}
                <div className="flex items-center gap-2 px-3 py-2 border-t border-white/5" style={{ background: "rgba(23, 33, 48, 0.9)" }}>
                  <iconify-icon icon="solar:smile-circle-linear" width="22" class="text-slate-500" />
                  <div className="flex-1 bg-white/5 rounded-full px-4 py-2 text-xs text-slate-500">
                    Message...
                  </div>
                  <iconify-icon icon="solar:microphone-linear" width="22" class="text-slate-500" />
                </div>
                </div>{/* /mockup-phone-display */}
              </div>{/* /mockup-phone */}
            </div>{/* /animate-float */}
          </div>
        </section>

        {/* Live Stats Bar */}
        <section className="py-12 px-6 border-y border-white/5">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-6">
            {stats ? (
              <>
                <StatCounter value={stats.active_jobs} label="Active Jobs" />
                <StatCounter value={stats.total_deals} label="Total Deals" />
                <StatCounter value={stats.total_users} label="Users" />
                <StatCounter value={stats.github_verified} label="GitHub Verified" />
                <StatCounter value={stats.success_rate} label="Success Rate" suffix="%" />
              </>
            ) : (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="text-center">
                    <div className="h-8 w-20 mx-auto bg-white/5 rounded animate-pulse mb-2" />
                    <div className="h-3 w-16 mx-auto bg-white/5 rounded animate-pulse" />
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 px-6 relative">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Simple Workflow</h2>
            <p className="text-slate-400 font-light">From zero to protected in under 60 seconds.</p>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: "solar:chat-line-linear", title: "1. Describe", desc: "Describe your task in natural language — AI understands context." },
              { icon: "solar:document-add-linear", title: "2. AI Spec", desc: "AI generates a structured spec with acceptance criteria." },
              { icon: "solar:dollar-minimalistic-linear", title: "3. AI Price", desc: "AI estimates fair price range based on spec complexity." },
              { icon: "solar:users-group-rounded-linear", title: "4. AI Match", desc: "AI finds the best executors and ranks them by fit." },
              { icon: "solar:wallet-2-linear", title: "5. Escrow", desc: "Lock funds in a TON smart contract. Non-custodial." },
              { icon: "solar:shield-check-linear", title: "6. AI Verify", desc: "AI checks delivery against spec criteria point by point." },
            ].map((step) => (
              <div key={step.title} className="glass-panel p-8 rounded-3xl group hover:-translate-y-2 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                  <iconify-icon icon={step.icon} width="24" height="24" class="text-[#0098EA]" />
                </div>
                <h3 className="text-lg font-medium mb-3 tracking-tight">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-light">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="py-24 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* AI Spec Generator — wide */}
            <div className="md:col-span-2 glass-panel p-10 rounded-[2.5rem] relative overflow-hidden group">
              <div className="relative z-10">
                <iconify-icon icon="solar:document-add-linear" width="40" height="40" class="text-[#0098EA] mb-6" />
                <h3 className="text-2xl font-medium tracking-tight mb-4">AI Spec Generator</h3>
                <p className="text-slate-400 font-light max-w-md">
                  Describe your task in natural language. AI generates a structured specification with
                  acceptance criteria, asks clarifying questions, and creates a verifiable contract.
                </p>
              </div>
              <div className="absolute right-[-40px] bottom-[-40px] w-64 h-64 bg-blue-500/5 rounded-full blur-[60px] group-hover:bg-blue-500/10 transition-colors" />
            </div>

            {/* AI Pricing */}
            <div className="glass-panel p-10 rounded-[2.5rem] flex flex-col justify-between">
              <div>
                <iconify-icon icon="solar:tag-price-linear" width="40" height="40" class="text-emerald-400 mb-6" />
                <h3 className="text-xl font-medium tracking-tight mb-4">AI Pricing</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                AI estimates fair price range based on spec complexity. Min, median, max with a
                recommended price and reasoning.
              </p>
            </div>

            {/* AI Matching */}
            <div className="glass-panel p-10 rounded-[2.5rem] flex flex-col justify-between">
              <div>
                <iconify-icon icon="solar:users-group-rounded-linear" width="40" height="40" class="text-[#0098EA] mb-6" />
                <h3 className="text-xl font-medium tracking-tight mb-4">AI Matching</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                AI finds the best executors from the platform. Ranked by reputation, skills, trust,
                and price fit.
              </p>
            </div>

            {/* Non-Custodial + AI Arbitration — wide */}
            <div className="md:col-span-2 glass-panel p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <iconify-icon icon="solar:scale-linear" width="40" height="40" class="text-purple-400 mb-6" />
                <h3 className="text-2xl font-medium tracking-tight mb-4">AI Arbitration</h3>
                <p className="text-slate-400 font-light">
                  Disputes are resolved objectively: AI checks delivery against each spec criterion,
                  scores compliance, and proposes a fair split. Transparent and auditable.
                </p>
              </div>
              <div className="w-full md:w-1/3 flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full border-4 border-emerald-500/30 flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-400">92%</span>
                </div>
                <span className="text-xs text-emerald-400 font-semibold">Compliance</span>
              </div>
            </div>

            {/* Inline Offers */}
            <div className="glass-panel p-10 rounded-[2.5rem] flex flex-col justify-between group">
              <div>
                <iconify-icon icon="solar:chat-square-arrow-linear" width="40" height="40" class="text-cyan-400 mb-6" />
                <h3 className="text-xl font-medium tracking-tight mb-4">Inline Offers</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                Post offers directly into any Telegram chat via inline mode. Anyone can bid — no need to join a channel.
              </p>
            </div>

            {/* Auction & Bidding — wide */}
            <div className="md:col-span-2 glass-panel p-10 rounded-[2.5rem] relative overflow-hidden group">
              <div className="relative z-10">
                <iconify-icon icon="solar:sort-by-time-linear" width="40" height="40" class="text-amber-400 mb-6" />
                <h3 className="text-2xl font-medium tracking-tight mb-4">Auction & Bidding</h3>
                <p className="text-slate-400 font-light max-w-md">
                  Create public offers, collect bids from multiple applicants, review Trust Scores, and select the best deal.
                  Full P2P marketplace built into Telegram.
                </p>
              </div>
              <div className="absolute right-[-40px] bottom-[-40px] w-64 h-64 bg-amber-500/5 rounded-full blur-[60px] group-hover:bg-amber-500/10 transition-colors" />
            </div>

            {/* GitHub Skill Verification — full width */}
            <div className="md:col-span-3 glass-panel p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <iconify-icon icon="logos:github-icon" width="40" height="40" class="mb-6" />
                <h3 className="text-2xl font-medium tracking-tight mb-4">GitHub Skill Verification</h3>
                <p className="text-slate-400 font-light max-w-lg">
                  Link your GitHub to prove your skills. Languages, repos, and contribution history are analyzed
                  to build a verifiable developer profile. AI matches your stack to job requirements automatically.
                </p>
              </div>
              <div className="w-full md:w-1/3 flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full border-4 border-green-500/30 flex items-center justify-center">
                  <span className="text-3xl font-bold text-green-400">87</span>
                </div>
                <span className="text-xs text-green-400 font-semibold uppercase tracking-wider">Trust Score</span>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px]">Established</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px]">Org Member</span>
                </div>
              </div>
            </div>

            {/* AI Risk Score */}
            <div className="md:col-span-2 glass-panel p-10 rounded-[2.5rem] relative overflow-hidden group">
              <div className="relative z-10">
                <iconify-icon icon="solar:shield-check-linear" width="40" height="40" class="text-green-400 mb-6" />
                <h3 className="text-2xl font-medium tracking-tight mb-4">AI Risk Score</h3>
                <p className="text-slate-400 font-light max-w-md">
                  Composite Trust Score: Platform (40%) + GitHub (30%) + Wallet (20%) + Verification (10%).
                  Red/green flags detect fake accounts before you commit.
                </p>
              </div>
              <div className="absolute right-[-40px] bottom-[-40px] w-64 h-64 bg-green-500/5 rounded-full blur-[60px] group-hover:bg-green-500/10 transition-colors" />
            </div>

            {/* Group Analytics */}
            <div className="glass-panel p-10 rounded-[2.5rem] flex flex-col justify-between">
              <div>
                <iconify-icon icon="solar:users-group-rounded-linear" width="40" height="40" class="text-violet-400 mb-6" />
                <h3 className="text-xl font-medium tracking-tight mb-4">Group Analytics</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                Track which Telegram groups generate the most deals. Leaderboard, stats, and conversion metrics built in.
              </p>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="py-24 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6 overflow-hidden">
            <p className="text-center text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-12">
              Powered by modern crypto stack
            </p>
            <div className="flex flex-wrap justify-center gap-10 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all">
              {[
                { icon: "logos:typescript-icon", label: "TypeScript" },
                { icon: "logos:react", label: "React" },
                { icon: "simple-icons:telegram", label: "TON Connect", cls: "text-[#0088cc]" },
                { icon: "solar:database-linear", label: "PostgreSQL", cls: "text-white" },
                { icon: "solar:chart-2-linear", label: "tonapi.io", cls: "text-white" },
              ].map((t) => (
                <div key={t.label} className={`flex items-center gap-2 ${t.cls ?? ""}`}>
                  <iconify-icon icon={t.icon} width="24" />
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Available Talent */}
        {talent && (
          <section className="py-24 px-6">
            <div className="max-w-7xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Available Talent</h2>
              <p className="text-slate-400 font-light">GitHub-verified developers ready to work.</p>
            </div>
            <div className="max-w-4xl mx-auto">
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
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">Live Offers</h2>
                  <p className="text-slate-400 font-light">Browse and apply — no account needed to start.</p>
                </div>
                <button
                  onClick={() => navigate("/offers")}
                  className="text-[#0098EA] text-sm font-medium bg-transparent border-none cursor-pointer hover:underline"
                >
                  View All →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentOffers.map((offer) => (
                  <div
                    key={offer.id}
                    onClick={() => navigate(`/offers/${offer.id}`)}
                    className="glass-panel p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all"
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
                        <span>Price negotiable</span>
                      )}
                      <span>{offer.application_count ?? 0} bids</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Group Leaderboard (11.4) */}
        {topGroups.length > 0 && (
          <section className="py-24 px-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">Top Groups</h2>
                  <p className="text-slate-400 font-light">Most active Telegram communities.</p>
                </div>
                <button
                  onClick={() => navigate("/groups")}
                  className="text-[#0098EA] text-sm font-medium bg-transparent border-none cursor-pointer hover:underline"
                >
                  Full Leaderboard →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topGroups.map((group, i) => (
                  <div
                    key={group.group_id}
                    onClick={() => navigate(`/groups/${group.group_id}`)}
                    className="glass-panel p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl font-bold text-slate-600">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </span>
                      <h3 className="text-sm font-medium truncate">
                        {group.username ? `@${group.username}` : group.title || `Group`}
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                      <div>
                        <div className="text-white font-medium">{group.completed_deals}</div>
                        <div>Deals</div>
                      </div>
                      <div>
                        <div className="text-white font-medium">{group.total_volume?.toFixed(0) ?? 0}</div>
                        <div>Volume</div>
                      </div>
                      <div>
                        <div className="text-white font-medium">{group.avg_check?.toFixed(0) ?? "—"}</div>
                        <div>Avg Check</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Live Activity */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Live Activity</h2>
            <p className="text-slate-400 font-light">Recent deals on the platform — auto-refreshes every 30s.</p>
          </div>
          <div className="max-w-2xl mx-auto">
            <ActivityFeed />
          </div>
        </section>

        {/* Roadmap */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Roadmap</h2>
            <p className="text-slate-400 font-light">Where we're headed next.</p>
          </div>
          <div className="max-w-5xl mx-auto">
            <Roadmap />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 text-center">
          <div className="max-w-3xl mx-auto glass-panel p-12 md:p-20 rounded-[3rem] border-white/10 glow-blue relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0098EA]/10 rounded-full blur-[80px]" />

            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Ready for safer P2P?
            </h2>
            <p className="text-lg text-slate-400 font-light mb-10">
              Start your first escrow deal on TON today. Safe, fast, and intelligent.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://t.me/izEscrowAIBot"
                className="ton-gradient px-8 py-5 rounded-2xl flex items-center justify-center gap-3 font-medium hover:shadow-2xl transition-all"
              >
                Join as Developer
              </a>
              <button
                onClick={() => navigate("/offers")}
                className="bg-white/5 border border-white/10 px-8 py-5 rounded-2xl flex items-center justify-center gap-3 font-medium hover:bg-white/10 transition-all cursor-pointer text-white"
              >
                Post a Job
              </button>
              <button
                onClick={() => navigate("/offers")}
                className="bg-purple-500/10 border border-purple-500/20 px-8 py-5 rounded-2xl flex items-center justify-center gap-3 font-medium text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer"
              >
                I'm a Designer
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 ton-gradient rounded-md flex items-center justify-center">
                <iconify-icon icon="solar:shield-check-linear" width="14" height="14" class="text-white" />
              </div>
              <span className="text-sm font-medium tracking-tight">izEscrowAI</span>
            </div>

            <div className="flex gap-8 text-xs font-medium text-slate-500 uppercase tracking-widest">
              <a href="https://github.com/izzzzzi/izEscrowAI" className="hover:text-[#0098EA] transition-colors">
                GitHub
              </a>
              <a href="https://t.me/izEscrowAIBot" className="hover:text-[#0098EA] transition-colors">
                Bot
              </a>
              <a href="https://iz-escrow-ai.vercel.app" className="hover:text-[#0098EA] transition-colors">
                Web App
              </a>
            </div>

            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-medium">
                TON Hackathon 2026
              </span>
              <p className="text-xs text-slate-600">Built for TON Ecosystem</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
