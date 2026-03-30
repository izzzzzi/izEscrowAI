import { useTonConnectUI, useTonWallet, useTonAddress } from "@tonconnect/ui-react";
import { useEffect } from "react";
import { API_URL, getInitData } from "../lib/api";
import AppHeader from "../components/AppHeader";
import Icon from "../components/Icon";

export default function WalletPage() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const address = useTonAddress();

  useEffect(() => {
    if (address) {
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

  const shortAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : "";

  return (
    <div className="mini-page">
      <AppHeader />
      <main className="px-5 pb-32 space-y-6">
        {/* Balance Card */}
        <div className="glass-card rounded-[1.25rem] p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#0098EA]/10 rounded-full blur-3xl" />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">
              TON Wallet
            </span>
            {wallet ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight text-green-400">Connected</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight text-slate-500">Not connected</span>
              </div>
            )}
          </div>

          {wallet && (
            <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[0.65rem] text-slate-500 uppercase font-medium">Address</span>
                <code className="text-xs font-mono text-slate-300 mt-0.5">{shortAddress}</code>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(address)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                <Icon icon="solar:copy-linear" size={14} />
                Copy
              </button>
            </div>
          )}
        </div>

        {/* TON Connect */}
        <div className="space-y-3 pt-2">
          {wallet ? (
            <button
              onClick={() => tonConnectUI.disconnect()}
              className="w-full text-red-400 py-3 rounded-xl font-medium text-sm hover:bg-red-500/5 transition-all"
            >
              Disconnect Wallet
            </button>
          ) : (
            <button
              onClick={() => tonConnectUI.openModal()}
              className="w-full bg-[#0098EA] text-white py-4 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Icon icon="solar:wallet-2-linear" size={20} />
              Connect Wallet
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
