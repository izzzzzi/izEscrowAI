import { useEffect, useState, useCallback } from "react";
import { fetchJobProposal, respondToJob, checkHasResponded } from "../lib/api";

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
}

export default function ProposalModal({ isOpen, onClose, jobId, jobTitle }: ProposalModalProps) {
  const [proposal, setProposal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [responding, setResponding] = useState(false);

  const loadProposal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJobProposal(jobId);
      setProposal(res.proposal_text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate proposal");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (isOpen && jobId) {
      setProposal("");
      setCopied(false);
      setHasResponded(false);
      setResponding(false);
      loadProposal();
      checkHasResponded(jobId)
        .then((res) => setHasResponded(res.responded))
        .catch(() => {});
    }
  }, [isOpen, jobId, loadProposal]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(proposal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = proposal;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Generate Proposal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f1a] shadow-2xl p-5 flex flex-col gap-4 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white truncate">Generate Proposal</h2>
            <p className="text-xs text-slate-500 truncate mt-0.5">{jobTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-500 hover:text-white transition-colors p-1 -mr-1 -mt-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Analyzing your GitHub profile against job requirements...</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-center">
              <p className="text-sm text-red-400 mb-2">{error}</p>
              <button
                type="button"
                onClick={loadProposal}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <textarea
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              rows={12}
              className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm p-3 resize-y focus:outline-none focus:border-blue-500/40 placeholder-slate-500"
              placeholder="Proposal will appear here..."
            />
          )}
        </div>

        {/* Footer */}
        {!loading && !error && proposal && (
          <div className="space-y-2 pt-2 border-t border-white/5">
            {hasResponded && (
              <div className="text-center text-xs text-green-400 font-medium py-1">
                Already responded
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 border border-white/10 hover:bg-white/5 transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                type="button"
                disabled={hasResponded || responding}
                onClick={async () => {
                  setResponding(true);
                  try {
                    await respondToJob(jobId, proposal);
                    setHasResponded(true);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to respond");
                  } finally {
                    setResponding(false);
                  }
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {responding ? "..." : "Respond"}
              </button>
            </div>
          </div>
        )}

        {/* Toast */}
        {copied && (
          <div className="absolute bottom-[-3rem] left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium animate-pulse">
            Copied to clipboard
          </div>
        )}
      </div>
    </div>
  );
}
