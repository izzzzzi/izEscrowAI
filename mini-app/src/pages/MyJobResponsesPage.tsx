import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchMyJobResponses, createDealFromJob, type ParsedJob, type JobResponse } from "../lib/api";
import { useT } from "../i18n/context";
import RespondentCard from "../components/RespondentCard";
import CreateDealModal from "../components/CreateDealModal";
import { useIsMiniApp } from "../hooks/useIsMiniApp";
import AppHeader from "../components/AppHeader";

export default function MyJobResponsesPage() {
  const isMini = useIsMiniApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const [job, setJob] = useState<ParsedJob | null>(null);
  const [responses, setResponses] = useState<JobResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deal creation state
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [selectedRespondent, setSelectedRespondent] = useState<JobResponse | null>(null);
  const [dealCreating, setDealCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchMyJobResponses(id)
      .then((data) => {
        setJob(data.job);
        setResponses(data.responses);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function handleCreateDeal(resp: JobResponse) {
    setSelectedRespondent(resp);
    setDealModalOpen(true);
  }

  async function handleConfirmDeal(amount: number, currency: string) {
    if (!id || !selectedRespondent?.executor) return;
    setDealCreating(true);
    try {
      await createDealFromJob(id, selectedRespondent.executor.user_id, amount, currency);
      setDealModalOpen(false);
      setSuccessMsg(t("myJobResponses.success"));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create deal");
    } finally {
      setDealCreating(false);
    }
  }

  if (loading) {
    return (
      <div className={isMini ? "mini-page" : "min-h-screen page-shell px-5 pt-8 pb-16"}>
        {isMini && <AppHeader />}
        <div className={isMini ? "px-5" : "max-w-3xl mx-auto"}>
          <div className="glass-card rounded-2xl p-8 animate-pulse h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={isMini ? "mini-page text-center" : "min-h-screen page-shell px-5 pt-8 pb-16 text-center"}>
        {isMini && <AppHeader />}
        <p className="text-sm text-red-400 mt-20">{error}</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className={isMini ? "mini-page text-center" : "min-h-screen page-shell px-5 pt-8 pb-16 text-center"}>
        {isMini && <AppHeader />}
        <p className="text-sm text-slate-400 mt-20">{t("myJobResponses.notFound")}</p>
      </div>
    );
  }

  return (
    <div className={isMini ? "mini-page" : "min-h-screen page-shell px-5 pt-8 pb-16"}>
      {isMini && <AppHeader />}
      <div className={isMini ? "px-5 space-y-6" : "max-w-3xl mx-auto space-y-6"}>
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("myJobResponses.back")}
        </button>

        {/* Job details */}
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <h1 className="text-lg font-semibold text-white">{job.title}</h1>
          <p className="text-sm text-slate-300 leading-relaxed">{job.description}</p>

          <div className="flex flex-wrap items-center gap-3">
            {(job.budget_min || job.budget_max) && (
              <span className="text-xs text-slate-400">
                {job.budget_min ? `from ${job.budget_min.toLocaleString()}` : ""}
                {job.budget_max ? ` to ${job.budget_max.toLocaleString()}` : ""} {job.currency}
              </span>
            )}
          </div>

          {job.required_skills && job.required_skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.required_skills.map((skill) => (
                <span key={skill} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Success message */}
        {successMsg && (
          <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-center text-sm text-green-400 font-medium">
            {successMsg}
          </div>
        )}

        {/* Responses */}
        <div>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            {t("myJobResponses.title")} ({responses.length})
          </h2>

          {responses.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <p className="text-sm text-slate-500">{t("myJobResponses.empty")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {responses.map((resp) => (
                <RespondentCard
                  key={resp.id}
                  response={resp}
                  onCreateDeal={() => handleCreateDeal(resp)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Deal Modal */}
      <CreateDealModal
        isOpen={dealModalOpen}
        onClose={() => {
          if (!dealCreating) setDealModalOpen(false);
        }}
        onConfirm={handleConfirmDeal}
        defaultAmount={job.budget_min ?? job.budget_max ?? undefined}
        defaultCurrency={job.currency || "USDT"}
      />
    </div>
  );
}
