import { useTonConnectUI, useTonWallet, useTonAddress } from "@tonconnect/ui-react";
import { useEffect } from "react";
import { API_URL, getInitData } from "../lib/api";

export default function WalletPage() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const address = useTonAddress();

  useEffect(() => {
    if (address) {
      // Send wallet address to bot backend
      fetch(`${API_URL}/api/wallet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Init-Data": getInitData(),
        },
        body: JSON.stringify({ wallet_address: address }),
      }).catch(console.error);
    }
  }, [address]);

  return (
    <div style={{ padding: "20px" }}>
      <div style={{
        background: "#1a3a5c",
        color: "#7eb8f7",
        padding: "8px 12px",
        borderRadius: "8px",
        fontSize: "12px",
        marginBottom: "16px",
        textAlign: "center",
      }}>
        Testnet mode — no real funds
      </div>
      <h2>TON Wallet</h2>

      {wallet ? (
        <div>
          <p style={{ color: "var(--tg-theme-hint-color, #999)" }}>Connected:</p>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: "14px",
              wordBreak: "break-all",
              color: "var(--tg-theme-text-color, #fff)",
            }}
          >
            {address}
          </p>
          <button
            onClick={() => tonConnectUI.disconnect()}
            style={{
              marginTop: "16px",
              padding: "12px 24px",
              background: "var(--tg-theme-destructive-text-color, #ff3b30)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div>
          <p style={{ color: "var(--tg-theme-hint-color, #999)", marginBottom: "16px" }}>
            Connect your TON wallet to use escrow deals.
          </p>
          <button
            onClick={() => tonConnectUI.openModal()}
            style={{
              padding: "14px 24px",
              background: "var(--tg-theme-button-color, #3390ec)",
              color: "var(--tg-theme-button-text-color, #fff)",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  );
}
