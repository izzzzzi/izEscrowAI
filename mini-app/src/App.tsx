import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import WalletPage from "./pages/WalletPage";
import PaymentPage from "./pages/PaymentPage";
import DealsPage from "./pages/DealsPage";
import ProfilePage from "./pages/ProfilePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import GroupDashboardPage from "./pages/GroupDashboardPage";
import LandingPage from "./pages/LandingPage";
import OffersPage from "./pages/OffersPage";
import OfferDetailPage from "./pages/OfferDetailPage";
import WebProfilePage from "./pages/WebProfilePage";
import MarketPage from "./pages/MarketPage";
import JobDetailPage from "./pages/JobDetailPage";
import MyJobResponsesPage from "./pages/MyJobResponsesPage";
import SpecWizardPage from "./pages/SpecWizardPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminSources from "./pages/admin/AdminSources";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDisputes from "./pages/admin/AdminDisputes";
import AdminSettings from "./pages/admin/AdminSettings";
import TabNav from "./components/TabNav";
import WebNavbar from "./components/WebNavbar";
import AnimatedPage from "./components/AnimatedPage";
import { useAuth } from "./contexts/AuthContext";
import { setTelegramAuthData } from "./lib/api";

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
    <div className="overflow-x-hidden" style={{ background: "#0f0f1a", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
      <WebNavbar />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
      <Routes>
        <Route path="/wallet" element={<AnimatedPage><WalletPage /></AnimatedPage>} />
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
        <Route path="*" element={<Navigate to="/wallet" replace />} />
      </Routes>
      <TabNav />
    </div>
  );
}

export default App;
