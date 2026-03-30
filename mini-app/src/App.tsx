import { useState, useEffect, useRef, lazy, Suspense, Component, type ReactNode, type ErrorInfo } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import TabNav from "./components/TabNav";
import WebNavbar from "./components/WebNavbar";
import WebFooter from "./components/WebFooter";
import OnboardingSlides from "./components/OnboardingSlides";
import AnimatedPage from "./components/AnimatedPage";
import Icon from "./components/Icon";
import { useAuth } from "./contexts/AuthContext";
import { setTelegramAuthData } from "./lib/api";

// Page-level error boundary — catches crashes in individual routes
class PageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("[PageError]", error, info.componentStack); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <Icon icon="solar:danger-triangle-linear" size={48} className="text-amber-400 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-400 mb-6">This page crashed. Try reloading.</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }} className="ton-gradient px-6 py-3 rounded-xl text-sm font-medium text-white border-none cursor-pointer">
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy-load all pages for code splitting
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const DealsPage = lazy(() => import("./pages/DealsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const GroupDashboardPage = lazy(() => import("./pages/GroupDashboardPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const OffersPage = lazy(() => import("./pages/OffersPage"));
const OfferDetailPage = lazy(() => import("./pages/OfferDetailPage"));
const WebProfilePage = lazy(() => import("./pages/WebProfilePage"));
const MarketPage = lazy(() => import("./pages/MarketPage"));
const JobDetailPage = lazy(() => import("./pages/JobDetailPage"));
const MyJobResponsesPage = lazy(() => import("./pages/MyJobResponsesPage"));
const SpecWizardPage = lazy(() => import("./pages/SpecWizardPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminSources = lazy(() => import("./pages/admin/AdminSources"));
const AdminJobs = lazy(() => import("./pages/admin/AdminJobs"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminDisputes = lazy(() => import("./pages/admin/AdminDisputes"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function App() {
  // @ts-expect-error - Telegram WebApp global
  const isTelegram = window.Telegram?.WebApp?.initData?.length > 0;

  if (isTelegram) {
    return <MiniApp />;
  }

  return <WebApp />;
}

function WebApp() {
  const { authData, isAdmin } = useAuth();
  const shellRef = useRef<HTMLDivElement>(null);

  // Sync auth data to API client
  useEffect(() => {
    setTelegramAuthData(authData);
  }, [authData]);

  // Cursor glow — update CSS custom properties on mousemove
  useEffect(() => {
    const el = shellRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: MouseEvent) => {
      el.style.setProperty("--cursor-x", e.clientX + "px");
      el.style.setProperty("--cursor-y", e.clientY + "px");
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div ref={shellRef} className="overflow-x-hidden page-shell" style={{ fontFamily: "'Inter', sans-serif" }}>
      <WebNavbar />
      <PageErrorBoundary>
      <Suspense fallback={<div className="min-h-screen" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/offers/:id" element={<OfferDetailPage />} />
        <Route path="/profile" element={<WebProfilePage />} />
        <Route path="/profile/:userId" element={<WebProfilePage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/market/:jobId" element={<JobDetailPage />} />
        <Route path="/spec/new" element={<SpecWizardPage />} />
        <Route path="/spec/:specId" element={<SpecWizardPage />} />
        <Route path="/my-jobs/:id" element={<MyJobResponsesPage />} />
        <Route path="/groups" element={<LeaderboardPage />} />
        <Route path="/groups/:groupId" element={<GroupDashboardPage />} />
        {isAdmin && (
          <>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/sources" element={<AdminSources />} />
            <Route path="/admin/jobs" element={<AdminJobs />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/disputes" element={<AdminDisputes />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </>
        )}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/wallet" element={<Navigate to="/profile" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
      </PageErrorBoundary>
      <WebFooter />
      <ScrollToTop />
    </div>
  );
}

function ScrollToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-white/10 border border-white/10 backdrop-blur-lg flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all text-white"
      aria-label="Scroll to top"
    >
      <Icon icon="solar:alt-arrow-up-linear" size={20} />
    </button>
  );
}

function MiniApp() {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem("onboarding-seen"); } catch { return false; }
  });

  const completeOnboarding = () => {
    setShowOnboarding(false);
    try { localStorage.setItem("onboarding-seen", "1"); } catch { /* ignore */ }
  };

  useEffect(() => {
    try {
      // @ts-expect-error - Telegram WebApp global
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();

        // Handle Mini App deep links: startapp=pay_<dealId> or startapp=offer_<offerId>
        const startParam = tg.initDataUnsafe?.start_param as string | undefined;
        if (startParam?.startsWith("pay_")) {
          const dealId = startParam.replace("pay_", "");
          navigate(`/pay/${dealId}`, { replace: true });
        } else if (startParam?.startsWith("offer_")) {
          const offerId = startParam.replace("offer_", "");
          navigate(`/deals?offer=${offerId}`, { replace: true });
        } else if (startParam?.startsWith("group_")) {
          const groupId = startParam.replace("group_", "");
          navigate(`/groups/${groupId}`, { replace: true });
        }
      }
    } catch {
      // not running inside Telegram
    }
  }, [navigate]);

  if (showOnboarding) {
    return <OnboardingSlides onComplete={completeOnboarding} />;
  }

  return (
    <div className="app" style={{ paddingBottom: "56px" }}>
      <PageErrorBoundary>
      <Suspense fallback={<div className="min-h-screen" />}>
      <Routes>
        <Route path="/" element={<Navigate to="/deals" replace />} />
        <Route path="/wallet" element={<Navigate to="/profile" replace />} />
        <Route path="/pay/:dealId" element={<AnimatedPage><PaymentPage /></AnimatedPage>} />
        <Route path="/deals" element={<AnimatedPage><DealsPage /></AnimatedPage>} />
        <Route path="/profile" element={<AnimatedPage><ProfilePage /></AnimatedPage>} />
        <Route path="/profile/:userId" element={<AnimatedPage><ProfilePage /></AnimatedPage>} />
        <Route path="/market" element={<AnimatedPage><MarketPage /></AnimatedPage>} />
        <Route path="/market/:jobId" element={<AnimatedPage><JobDetailPage /></AnimatedPage>} />
        <Route path="/my-jobs/:id" element={<AnimatedPage><MyJobResponsesPage /></AnimatedPage>} />
        <Route path="/spec/new" element={<AnimatedPage><SpecWizardPage /></AnimatedPage>} />
        <Route path="/spec/:specId" element={<AnimatedPage><SpecWizardPage /></AnimatedPage>} />
        <Route path="/groups" element={<AnimatedPage><LeaderboardPage /></AnimatedPage>} />
        <Route path="/groups/:groupId" element={<AnimatedPage><GroupDashboardPage /></AnimatedPage>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
      </PageErrorBoundary>
      <TabNav />
    </div>
  );
}

export default App;
