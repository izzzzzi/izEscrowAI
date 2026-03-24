import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { I18nProvider } from "./i18n/context.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import App from "./App.tsx";
import "./index.css";

const manifestUrl =
  import.meta.env.VITE_TON_CONNECT_MANIFEST_URL ||
  `${window.location.origin}/tonconnect-manifest.json`;

// Easter egg for devs who open the console
console.log(
  "%c🛡 izEscrowAI",
  "font-size:24px;font-weight:700;color:#0098EA",
);
console.log(
  "%cAI-powered P2P escrow on TON. Non-custodial. 12 AI capabilities.\nhttps://github.com/izzzzzi/izEscrowAI",
  "font-size:12px;color:#94a3b8",
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <HelmetProvider>
          <BrowserRouter>
            <AuthProvider>
              <TonConnectUIProvider manifestUrl={manifestUrl}>
                <App />
              </TonConnectUIProvider>
            </AuthProvider>
          </BrowserRouter>
        </HelmetProvider>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
);
