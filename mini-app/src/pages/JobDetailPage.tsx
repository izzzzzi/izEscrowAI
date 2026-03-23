import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { fetchJob, type ParsedJob } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useIsMiniApp } from "../hooks/useIsMiniApp";
import AppHeader from "../components/AppHeader";
import PriceRange from "../components/PriceRange";
import ProposalModal from "../components/ProposalModal";

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isMasked(value: string | null | undefined): boolean {
  return !!value && value.includes("\u2588\u2588\u2588\u2588");
}

/* ---------- skeleton shimmer blocks ---------- */

function PageSkeleton() {
  return (
    <div className="min-h-screen page-shell pt-28 pb-16 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* back button */}
        <div className="h-4 w-40 bg-white/5 rounded animate-pulse" />
        {/* title */}
        <div className="space-y-3">
          <div className="h-7 w-3/4 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
        </div>
        {/* description card */}
        <div className="bg-white/5 rounded-2xl p-6 space-y-3 animate-pulse">
          <div className="h-4 w-full bg-white/10 rounded" />
          <div className="h-4 w-5/6 bg-white/10 rounded" />
          <div className="h-4 w-4/6 bg-white/10 rounded" />
          <div className="h-4 w-3/6 bg-white/10 rounded" />
        </div>
        {/* price insight */}
        <div className="bg-white/5 rounded-2xl p-6 space-y-3 animate-pulse">
          <div className="h-5 w-40 bg-white/10 rounded" />
          <div className="h-2 w-full bg-white/10 rounded-full" />
          <div className="h-4 w-3/4 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );
}

function PriceInsightSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-white/10" />
        <div className="h-5 w-36 bg-white/10 rounded" />
      </div>
      <div className="h-2 w-full bg-white/10 rounded-full" />
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-white/10 rounded" />
        <div className="h-3 w-20 bg-white/10 rounded" />
      </div>
      <div className="h-4 w-3/4 bg-white/10 rounded" />
      <div className="space-y-2">
        <div className="h-3 w-5/6 bg-white/10 rounded" />
        <div className="h-3 w-4/6 bg-white/10 rounded" />
        <div className="h-3 w-3/6 bg-white/10 rounded" />
      </div>
    </div>
  );
}

function NotFoundState() {
  const navigate = useNavigate();
  return (
    <div className={isMini ? "mini-page flex items-center justify-center" : "min-h-screen page-shell flex items-center justify-center"}>
      <div className="text-center space-y-4">
        <iconify-icon icon="solar:file-remove-linear" width="64" class="text-slate-600" />
        <h2 className="text-xl font-semibold text-white">Job not found</h2>
        <p className="text-sm text-slate-400">This job may have been removed or expired.</p>
        <button
          onClick={() => navigate("/market")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          <iconify-icon icon="solar:arrow-left-linear" width="16" />
          Back to marketplace
        </button>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const isMini = useIsMiniApp();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [job, setJob] = useState<ParsedJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    setNotFound(false);
    fetchJob(jobId)
      .then((data) => setJob(data))
      .catch((err) => {
        if (err instanceof Error && err.message === "NOT_FOUND") {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) return <PageSkeleton />;
  if (notFound || !job) return <NotFoundState />;

  const matchPercent = job.skill_match?.match_percent;
  const matchColor =
    matchPercent != null
      ? matchPercent >= 70
        ? "bg-green-500/10 text-green-400 border-green-500/20"
        : matchPercent >= 40
          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
          : "bg-red-500/10 text-red-400 border-red-500/20"
      : null;

  const priceEstimate = job.ai_price_estimate;
  const rawAuthor = job.poster_username || job.contact_username;
  const author = rawAuthor?.replace(/^@+/, "") || null; // strip leading @
  const authorMasked = isMasked(rawAuthor);

  return (
    <div className={isMini ? "mini-page" : "min-h-screen page-shell pt-28 pb-16 px-6"}>
      {isMini && <AppHeader />}
      <Helmet>
        <title>{job.title} — izEscrowAI</title>
        <meta name="description" content={job.description?.slice(0, 160) || job.title} />
      </Helmet>
      <div className={isMini ? "px-5 space-y-6" : "max-w-3xl mx-auto space-y-6"}>
        {/* 4.4 — Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors -mb-2"
        >
          <iconify-icon icon="solar:arrow-left-linear" width="16" />
          Back to marketplace
        </button>

        {/* 2.1 — Header */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-white">{job.title}</h1>
            <span className="text-xs text-slate-500 whitespace-nowrap mt-1">
              {timeAgo(job.created_at)}
            </span>
          </div>

          {/* Budget + currency (prefer TON) */}
          <div className="mt-2 text-sm text-slate-400">
            {job.budget_min_ton || job.budget_max_ton ? (
              <span>
                {job.budget_min_ton && job.budget_max_ton && job.budget_min_ton === job.budget_max_ton
                  ? <>{job.budget_min_ton.toLocaleString()} TON</>
                  : <>
                      {job.budget_min_ton ? `from ${job.budget_min_ton.toLocaleString()}` : ""}
                      {job.budget_max_ton ? ` to ${job.budget_max_ton.toLocaleString()}` : ""} TON
                    </>
                }
                {job.budget_min && job.budget_max && (
                  <span className="text-slate-600 ml-1">
                    ({job.budget_min === job.budget_max
                      ? `${job.budget_min.toLocaleString()} ${job.currency}`
                      : `${job.budget_min.toLocaleString()}–${job.budget_max.toLocaleString()} ${job.currency}`
                    })
                  </span>
                )}
              </span>
            ) : job.budget_min || job.budget_max ? (
              <span>
                {job.budget_min && job.budget_max && job.budget_min === job.budget_max
                  ? `${job.budget_min.toLocaleString()} ${job.currency}`
                  : <>
                      {job.budget_min ? `from ${job.budget_min.toLocaleString()}` : ""}
                      {job.budget_max ? ` to ${job.budget_max.toLocaleString()}` : ""} {job.currency}
                    </>
                }
              </span>
            ) : (
              <span>No budget specified</span>
            )}
          </div>
        </div>

        {/* 2.6 — Match score (auth only, hidden for guests) */}
        {isAuthenticated && matchColor && matchPercent != null && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${matchColor}`}>
            <iconify-icon icon="solar:star-bold" width="14" />
            {matchPercent}% skill match
          </div>
        )}

        {/* 2.1 — Description card */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Description</h2>
          <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
            {job.description}
          </p>
        </div>

        {/* 2.1 — Skills chips */}
        {job.required_skills && job.required_skills.length > 0 && (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.required_skills.map((skill) => (
                <button
                  key={skill}
                  onClick={() => navigate(`/market?skills=${encodeURIComponent(skill)}`)}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-colors"
                >
                  {skill}
                </button>
              ))}
            </div>
            {/* Matched / missing skills for auth users */}
            {isAuthenticated && job.skill_match && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                {job.skill_match.matched.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-green-400 mr-1">Matched:</span>
                    {job.skill_match.matched.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {job.skill_match.missing.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-red-400 mr-1">Missing:</span>
                    {job.skill_match.missing.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2.2 — AI Insights section */}
        {priceEstimate && isAuthenticated ? (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <iconify-icon icon="solar:magic-stick-3-bold" width="20" class="text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">AI Price Insights</h2>
            </div>

            <PriceRange
              min={job.price_estimate_ton?.min ?? priceEstimate.min}
              max={job.price_estimate_ton?.max ?? priceEstimate.max}
              median={job.price_estimate_ton?.median ?? priceEstimate.median}
              recommended={job.price_estimate_ton?.recommended ?? priceEstimate.recommended}
              currency={job.price_estimate_ton ? "TON" : priceEstimate.currency}
            />
            {job.price_estimate_ton && priceEstimate.currency !== "TON" && (
              <p className="text-[10px] text-slate-600">
                Original estimate: {priceEstimate.min.toLocaleString()}–{priceEstimate.max.toLocaleString()} {priceEstimate.currency}
              </p>
            )}

            {priceEstimate.reasoning && (
              <p className="text-xs text-slate-400 leading-relaxed">
                {priceEstimate.reasoning}
              </p>
            )}

            {priceEstimate.factors && priceEstimate.factors.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-2 uppercase tracking-wider">
                  Factors
                </p>
                <ul className="space-y-1">
                  {priceEstimate.factors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <iconify-icon icon="solar:check-circle-linear" width="14" class="text-cyan-500 mt-0.5 flex-shrink-0" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : !isAuthenticated ? (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-2">
              <iconify-icon icon="solar:magic-stick-3-bold" width="20" class="text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">AI Price Insights</h2>
            </div>
            <div className="space-y-3 blur-md select-none pointer-events-none opacity-40">
              <div className="h-2 w-full bg-white/10 rounded-full" />
              <div className="h-2 w-3/4 bg-white/10 rounded-full" />
              <div className="h-2 w-1/2 bg-white/10 rounded-full" />
            </div>
          </div>
        ) : loading ? (
          <PriceInsightSkeleton />
        ) : null}

        {/* 2.3 — Source section */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <iconify-icon icon="solar:user-circle-linear" width="20" class="text-slate-400" />
            <h2 className="text-sm font-semibold text-white">Source</h2>
          </div>

          <div className="space-y-2">
            {/* Author */}
            {author && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 text-xs w-16">Author</span>
                {authorMasked ? (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <iconify-icon icon="solar:lock-keyhole-linear" width="14" class="text-slate-500" />
                    {author}
                  </span>
                ) : (
                  <a
                    href={`https://t.me/${author}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    @{author}
                  </a>
                )}
              </div>
            )}

            {/* Contact URL — skip if same as channel or same as author */}
            {job.contact_url && !isMasked(job.contact_url) && job.contact_url !== author && (() => {
              const url = job.contact_url!.startsWith("http") ? job.contact_url! : `https://${job.contact_url}`;
              // Skip if contact_url points to same channel as source
              if (job.source_username && url.includes(job.source_username)) return null;
              return (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 text-xs w-16">Contact</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors truncate"
                  >
                    {job.contact_url}
                  </a>
                </div>
              );
            })()}
            {job.contact_url && isMasked(job.contact_url) && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 text-xs w-16">Contact</span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <iconify-icon icon="solar:lock-keyhole-linear" width="14" class="text-slate-500" />
                  {job.contact_url}
                </span>
              </div>
            )}

            {/* Source channel */}
            {job.source_title && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 text-xs w-16">Channel</span>
                {isMasked(job.source_title) ? (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <iconify-icon icon="solar:lock-keyhole-linear" width="14" class="text-slate-500" />
                    {job.source_title}
                  </span>
                ) : job.source_username ? (
                  <a
                    href={`https://t.me/${job.source_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {job.source_title}
                  </a>
                ) : (
                  <span className="text-slate-400">{job.source_title}</span>
                )}
              </div>
            )}
          </div>

        </div>

        {/* 2.4 — Craft Your Proposal button (auth users) */}
        {isAuthenticated && (
          <button
            onClick={() => setProposalOpen(true)}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#0098EA] to-[#00D1FF] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <iconify-icon icon="solar:rocket-2-bold" width="18" />
            Craft Your Proposal
          </button>
        )}

        {/* 2.5 — Single auth CTA for guests */}
        {!isAuthenticated && (
          <div className="bg-gradient-to-br from-[#0098EA]/10 to-transparent backdrop-blur-lg rounded-2xl border border-[#0098EA]/20 p-6 space-y-3">
            <h3 className="text-sm font-semibold text-white">Interested in this job?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sign in to see AI pricing, contact the author, and craft a personalized proposal.
            </p>
            <a
              href="https://t.me/izEscrowAIBot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#0098EA] to-[#00D1FF] hover:opacity-90 transition-opacity"
            >
              Sign in with Telegram
              <iconify-icon icon="solar:arrow-right-linear" width="16" />
            </a>
          </div>
        )}
        {/* Similar Jobs */}
        {job.related && job.related.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Similar Jobs</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {job.related.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/market/${r.id}`)}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-left cursor-pointer hover:border-blue-500/30 transition-colors"
                >
                  <h3 className="text-sm font-medium text-white truncate mb-1">{r.title}</h3>
                  {r.required_skills && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {r.required_skills.slice(0, 3).map((s: string) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">{s}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-slate-400">
                    {r.budget_min_ton || r.budget_max_ton ? (
                      <span>
                        {r.budget_min_ton ? `from ${r.budget_min_ton}` : ""}
                        {r.budget_max_ton ? ` to ${r.budget_max_ton}` : ""} TON
                      </span>
                    ) : r.budget_min || r.budget_max ? (
                      <span>
                        {r.budget_min ? `from ${r.budget_min.toLocaleString()}` : ""}
                        {r.budget_max ? ` to ${r.budget_max.toLocaleString()}` : ""} {r.currency}
                      </span>
                    ) : (
                      <span className="text-slate-600">No budget</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Proposal Modal */}
      {job && (
        <ProposalModal
          isOpen={proposalOpen}
          onClose={() => setProposalOpen(false)}
          jobId={job.id}
          jobTitle={job.title}
        />
      )}
    </div>
  );
}
