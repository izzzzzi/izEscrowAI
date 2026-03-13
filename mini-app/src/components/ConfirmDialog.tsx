interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  variant?: "normal" | "danger";
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  variant = "normal",
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const confirmBtnClass =
    variant === "danger"
      ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
      : "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f1a] shadow-2xl p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 -mr-1 -mt-1 bg-transparent border-none cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message */}
        <p className="text-sm text-slate-400 leading-relaxed">{message}</p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${confirmBtnClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
