import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { fetchJobs, type ParsedJob, type JobFilters } from "../lib/api";
import JobCard from "../components/JobCard";
import JobFiltersPanel from "../components/JobFilters";

export default function MarketPage() {
  const [jobs, setJobs] = useState<ParsedJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<JobFilters>({});

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
    <div className="min-h-screen pt-28 pb-16 px-6" style={{ background: "#0f0f1a", color: "#fff" }}>
      <Helmet>
        <title>Job Marketplace — izEscrowAI</title>
        <meta name="description" content="Browse freelance jobs parsed from Telegram groups. AI pricing, skill matching, and escrow protection." />
      </Helmet>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Job Marketplace</h1>
            <p className="text-sm text-slate-400 mt-1">
              {total > 0 ? `${total} active jobs` : "Jobs from Telegram groups"}
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
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse h-24" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-20">
                <iconify-icon icon="solar:document-linear" width="48" class="text-slate-600 mb-4" />
                <p className="text-slate-400">No jobs yet</p>
                <p className="text-xs text-slate-500 mt-1">They will appear once the bot starts parsing groups</p>
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
                    {loading ? "Loading..." : "Show more"}
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
