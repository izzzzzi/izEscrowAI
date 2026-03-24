import { useEffect, lazy, Suspense, Component, type ReactNode, type ErrorInfo } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import TabNav from "./components/TabNav";
import WebNavbar from "./components/WebNavbar";
import AnimatedPage from "./components/AnimatedPage";
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
          <iconify-icon icon="solar:danger-triangle-linear" width="48" class="text-amber-400 mb-4" />
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

  // Sync auth data to API client
  useEffect(() => {
    setTelegramAuthData(authData);
  }, [authData]);

  return (
    <div className="overflow-x-hidden page-shell" style={{ fontFamily: "'Inter', sans-serif" }}>
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
        <Route path="/wallet" element={<Navigate to="/profile" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
      </PageErrorBoundary>
    </div>
  );
}

function MiniApp() {
  const navigate = useNavigate();

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
