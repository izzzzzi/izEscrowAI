import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { fetchJobs, type ParsedJob, type JobFilters } from "../lib/api";
import { useIsMiniApp } from "../hooks/useIsMiniApp";
import AppHeader from "../components/AppHeader";
import JobCard from "../components/JobCard";
import JobFiltersPanel from "../components/JobFilters";
import { useT } from "../i18n/context";
import Icon from "../components/Icon";

export default function MarketPage() {
  const isMini = useIsMiniApp();
  const t = useT();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<ParsedJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Initialize filters from URL query params (e.g., ?skills=React)
  const [filters, setFilters] = useState<JobFilters>(() => {
    const skillsParam = searchParams.get("skills");
    return skillsParam ? { skills: skillsParam.split(",").map(s => s.trim()) } : {};
  });

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJobs({ ...filters, page, limit: 20 });
      if (page === 1) {
        setJobs(res.data);
      } else {
        setJobs((prev) => [...prev, ...res.data]);
      }
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleFilterChange = (newFilters: JobFilters) => {
    setFilters(newFilters);
    setPage(1);
    setJobs([]);
  };

  const handleLoadMore = () => {
    if (jobs.length < total) {
      setPage((p) => p + 1);
    }
  };

  return (
    <div className={isMini ? "mini-page" : "min-h-screen page-shell pt-28 pb-16 px-6"}>
      {isMini && <AppHeader />}
      <Helmet>
        <title>Job Marketplace — izEscrowAI</title>
        <meta name="description" content="Browse freelance jobs parsed from Telegram groups. AI pricing, skill matching, and escrow protection." />
      </Helmet>
      <div className={isMini ? "px-5" : "max-w-4xl mx-auto"}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{t("market.title")}</h1>
            <p className="text-sm text-slate-400 mt-1">
              {total > 0 ? `${total} ${t("market.activeJobs")}` : t("market.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters */}
          <div className="md:w-64 flex-shrink-0">
            <JobFiltersPanel
              filters={filters}
              onChange={handleFilterChange}
              totalJobs={total}
              shownJobs={jobs.length}
            />
          </div>

          {/* Job list */}
          <div className="flex-1 space-y-3">
            {loading && jobs.length === 0 ? (
              <div className="space-y-3" role="status" aria-label="Loading jobs">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse h-24" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="space-y-6 py-8">
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Icon icon="solar:cpu-linear" size={18} className="text-[#0098EA]" />
                    {t("market.empty.title")}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t("market.empty.description")}
                  </p>
                  <ol className="space-y-2 text-xs text-slate-400">
                    <li className="flex gap-2"><span className="text-[#0098EA] font-semibold">1.</span>{t("market.empty.step1")}</li>
                    <li className="flex gap-2"><span className="text-[#0098EA] font-semibold">2.</span>{t("market.empty.step2")}</li>
                    <li className="flex gap-2"><span className="text-[#0098EA] font-semibold">3.</span>{t("market.empty.step3")}</li>
                  </ol>
                  <a href="https://t.me/izEscrowAIBot" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#0098EA] font-medium no-underline hover:underline">
                    <Icon icon="solar:chat-round-dots-linear" size={14} />
                    {t("market.empty.linkGithub")}
                  </a>
                </div>
                <p className="text-center text-[10px] text-slate-600">{t("market.empty.hint")}</p>
              </div>
            ) : (
              <>
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
                {jobs.length < total && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="w-full py-3 text-sm text-slate-400 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    {loading ? t("market.loading") : t("market.showMore")}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
