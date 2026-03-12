import { useEffect, useRef } from "react";

export default function LandingPage() {
  const mainRef = useRef<HTMLElement>(null);

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
      {/* Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 px-6 py-4">
        <nav className="max-w-7xl mx-auto flex items-center justify-between glass-panel px-6 py-3 rounded-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 ton-gradient rounded-lg flex items-center justify-center">
              <iconify-icon icon="solar:shield-check-linear" width="20" height="20" class="text-white" />
            </div>
            <span className="text-lg font-medium tracking-tight">izEscrowAI</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400 font-medium">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="https://github.com/izzzzzi/izEscrowAI" className="hover:text-white transition-colors">GitHub</a>
          </div>

          <a
            href="https://t.me/izEscrowAIBot"
            className="ton-gradient px-5 py-2 rounded-full text-xs font-medium tracking-wide uppercase hover:opacity-90 transition-all shadow-lg shadow-blue-500/10"
          >
            Launch Bot
          </a>
        </nav>
      </header>

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
                Live on Testnet
              </div>
              <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1] mb-6">
                AI-Powered P2P <br />
                <span className="text-[#0098EA]">Safe Deals</span> on TON.
              </h1>
              <p className="text-lg text-slate-400 font-light leading-relaxed max-w-xl mb-10">
                Describe your deal in natural language. Our AI parses the terms, and funds are locked
                in a non-custodial smart contract. No middlemen, total trust.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="https://t.me/izEscrowAIBot"
                  className="ton-gradient px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-medium transition-transform hover:-translate-y-0.5"
                >
                  <iconify-icon icon="solar:paper-plane-linear" width="20" height="20" />
                  Open Telegram Bot
                </a>
                <a
                  href="#how-it-works"
                  className="glass-panel px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-medium hover:bg-white/5 transition-all"
                >
                  Learn Workflow
                </a>
              </div>
            </div>

            {/* Animated Deal Card */}
            <div className="relative animate-float">
              <div className="glass-panel rounded-[2.5rem] p-8 border-white/10 glow-blue max-w-[480px] mx-auto">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                    <iconify-icon icon="solar:user-linear" width="20" height="20" class="text-[#0098EA]" />
                  </div>
                  <div className="deal-bubble px-4 py-3 text-sm font-light leading-relaxed">
                    "Selling logo design to @ivan for 50 TON"
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 mb-8">
                  <div className="h-12 w-px bg-gradient-to-b from-blue-500/50 to-transparent" />
                  <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <iconify-icon icon="solar:cpu-linear" width="18" height="18" class="text-[#0098EA]" />
                    <span className="text-xs font-medium uppercase tracking-widest text-slate-300">
                      AI Parsing Deal Terms...
                    </span>
                  </div>
                  <div className="h-12 w-px bg-gradient-to-t from-blue-500/50 to-transparent" />
                </div>

                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                      Escrow Contract
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-medium uppercase">
                      Active
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Amount:</span>
                      <span className="font-medium">50.00 TON</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Counterparty:</span>
                      <span className="font-medium">@ivan</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Service:</span>
                      <span className="font-medium italic">Logo Design</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-white/5 flex gap-3">
                    <div className="flex-1 py-2 text-xs font-medium uppercase tracking-wider bg-white/5 border border-white/10 rounded-lg text-center">
                      Details
                    </div>
                    <div className="flex-1 py-2 text-xs font-medium uppercase tracking-wider ton-gradient rounded-lg shadow-lg text-center">
                      Confirm
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 px-6 relative">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Simple Workflow</h2>
            <p className="text-slate-400 font-light">From zero to protected in under 60 seconds.</p>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: "solar:chat-line-linear", title: "1. Describe", desc: "Type your deal terms naturally in Telegram to the izEscrowAI Bot." },
              { icon: "solar:magic-stick-linear", title: "2. AI Parsing", desc: "AI instantly converts your words into structured escrow conditions." },
              { icon: "solar:wallet-2-linear", title: "3. Deposit", desc: "Connect your TON wallet via the Mini App to lock funds in the contract." },
              { icon: "solar:hand-stars-linear", title: "4. Deliver", desc: "Funds are released upon delivery or via AI-mediated fair dispute split." },
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
            {/* AI Dispute Mediation — wide */}
            <div className="md:col-span-2 glass-panel p-10 rounded-[2.5rem] relative overflow-hidden group">
              <div className="relative z-10">
                <iconify-icon icon="solar:scale-linear" width="40" height="40" class="text-[#0098EA] mb-6" />
                <h3 className="text-2xl font-medium tracking-tight mb-4">AI Dispute Mediation</h3>
                <p className="text-slate-400 font-light max-w-md">
                  If things go wrong, our AI mediator reviews the proof of work and chat history to
                  propose a fair split, ensuring no one is left behind.
                </p>
              </div>
              <div className="absolute right-[-40px] bottom-[-40px] w-64 h-64 bg-blue-500/5 rounded-full blur-[60px] group-hover:bg-blue-500/10 transition-colors" />
            </div>

            {/* Non-Custodial */}
            <div className="glass-panel p-10 rounded-[2.5rem] flex flex-col justify-between">
              <div>
                <iconify-icon icon="solar:verified-check-linear" width="40" height="40" class="text-emerald-400 mb-6" />
                <h3 className="text-xl font-medium tracking-tight mb-4">Non-Custodial</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                Funds stay in a Tolk smart contract on TON. We never touch your private keys or hold
                your money.
              </p>
            </div>

            {/* Auto-Release */}
            <div className="glass-panel p-10 rounded-[2.5rem] flex flex-col justify-between">
              <div>
                <iconify-icon icon="solar:history-linear" width="40" height="40" class="text-[#0098EA] mb-6" />
                <h3 className="text-xl font-medium tracking-tight mb-4">Auto-Release</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                Built-in 7-day timeout for inactive deals. Security and efficiency integrated into the
                core contract.
              </p>
            </div>

            {/* Deep Link Integration — wide */}
            <div className="md:col-span-2 glass-panel p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <iconify-icon icon="solar:share-circle-linear" width="40" height="40" class="text-purple-400 mb-6" />
                <h3 className="text-2xl font-medium tracking-tight mb-4">Deep Link Integration</h3>
                <p className="text-slate-400 font-light">
                  Invite your counterparty instantly. Create a deal and share a simple link that opens
                  the Mini App for them to confirm and start.
                </p>
              </div>
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="bg-white p-3 rounded-2xl shadow-xl shadow-blue-500/5">
                  <div className="w-32 h-32 bg-[#0f0f1a] rounded-xl flex items-center justify-center text-white font-bold">
                    QR
                  </div>
                </div>
              </div>
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
                { icon: "solar:database-linear", label: "SQLite", cls: "text-white" },
              ].map((t) => (
                <div key={t.label} className={`flex items-center gap-2 ${t.cls ?? ""}`}>
                  <iconify-icon icon={t.icon} width="24" />
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
              ))}
            </div>
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
              Start your first escrow deal on the TON Testnet today. Safe, fast, and intelligent.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://t.me/izEscrowAIBot"
                className="ton-gradient px-10 py-5 rounded-2xl flex items-center justify-center gap-3 font-medium text-lg hover:shadow-2xl transition-all"
              >
                Launch Telegram Bot
              </a>
              <a
                href="https://iz-escrow-ai.vercel.app"
                className="bg-white/5 border border-white/10 px-10 py-5 rounded-2xl flex items-center justify-center gap-3 font-medium text-lg hover:bg-white/10 transition-all"
              >
                Open Mini App
              </a>
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

            <p className="text-xs text-slate-600">Built for TON Ecosystem</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
