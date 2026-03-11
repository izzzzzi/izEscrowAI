import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import App from "./App.tsx";
import "./index.css";

const manifestUrl =
  import.meta.env.VITE_TON_CONNECT_MANIFEST_URL ||
  `${window.location.origin}/tonconnect-manifest.json`;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <App />
      </TonConnectUIProvider>
    </BrowserRouter>
  </StrictMode>,
);
