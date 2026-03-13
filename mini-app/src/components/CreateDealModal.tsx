import { useState, useEffect } from "react";

interface CreateDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, currency: string) => void;
  defaultAmount?: number;
  defaultCurrency?: string;
}

export default function CreateDealModal({
  isOpen,
  onClose,
  onConfirm,
  defaultAmount,
  defaultCurrency = "USDT",
}: CreateDealModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState(defaultCurrency);

  useEffect(() => {
    if (isOpen) {
      setAmount(defaultAmount ? String(defaultAmount) : "");
      setCurrency(defaultCurrency);
    }
  }, [isOpen, defaultAmount, defaultCurrency]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] shadow-2xl p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Создать эскроу-сделку</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 -mr-1 -mt-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Amount input */}
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Сумма</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm p-3 focus:outline-none focus:border-blue-500/40 placeholder-slate-500"
          />
        </div>

        {/* Currency selector */}
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Валюта</label>
          <div className="flex gap-2">
            {["TON", "USDT"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  currency === c
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              const parsed = parseFloat(amount);
              if (!parsed || parsed <= 0) return;
              onConfirm(parsed, currency);
            }}
            disabled={!amount || parseFloat(amount) <= 0}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}
