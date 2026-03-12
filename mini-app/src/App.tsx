import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import WalletPage from "./pages/WalletPage";
import PaymentPage from "./pages/PaymentPage";
import DealsPage from "./pages/DealsPage";
import LandingPage from "./pages/LandingPage";
import TabNav from "./components/TabNav";

function App() {
  // @ts-expect-error - Telegram WebApp global
  const isTelegram = !!window.Telegram?.WebApp;

  if (!isTelegram) {
    return (
      <Routes>
        <Route path="*" element={<LandingPage />} />
      </Routes>
    );
  }

  return <MiniApp />;
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

        // Handle Mini App deep link: startapp=pay_<dealId>
        const startParam = tg.initDataUnsafe?.start_param as string | undefined;
        if (startParam?.startsWith("pay_")) {
          const dealId = startParam.replace("pay_", "");
          navigate(`/pay/${dealId}`, { replace: true });
        }
      }
    } catch {
      console.log("Not running inside Telegram");
    }
  }, [navigate]);

  return (
    <div className="app" style={{ paddingBottom: "56px" }}>
      <Routes>
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/pay/:dealId" element={<PaymentPage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="*" element={<Navigate to="/wallet" replace />} />
      </Routes>
      <TabNav />
    </div>
  );
}

export default App;
