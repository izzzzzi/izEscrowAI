import { type ReactNode } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useAuth } from "../contexts/AuthContext";

interface WalletGateProps {
  children: ReactNode;
  fallbackText?: string;
}

export default function WalletGate({ children, fallbackText = "Connect Wallet to continue" }: WalletGateProps) {
  const { hasWallet } = useAuth();
  const [tonConnectUI] = useTonConnectUI();

  if (hasWallet) {
    return <>{children}</>;
  }

  return (
    <button
      onClick={() => tonConnectUI.openModal()}
      className="w-full py-3 rounded-xl bg-[#0098EA]/20 border border-[#0098EA]/30 text-[#0098EA] text-sm font-medium cursor-pointer hover:bg-[#0098EA]/30 transition-colors"
    >
      <iconify-icon icon="solar:wallet-linear" width="16" height="16" style={{ marginRight: "6px", verticalAlign: "middle" }} />
      {fallbackText}
    </button>
  );
}
