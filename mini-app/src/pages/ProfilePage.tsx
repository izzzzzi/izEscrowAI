import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchProfile, fetchUserProfile, fetchMyJobs, fetchGithubUnlink, type ProfileWithGithub, type MyJob, API_URL } from "../lib/api";
import AppHeader from "../components/AppHeader";
import GitHubCard from "../components/GitHubCard";
import MyJobCard from "../components/MyJobCard";

export default function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileWithGithub | null>(null);
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = !userId;

  useEffect(() => {
    const load = userId ? fetchUserProfile(parseInt(userId)) : fetchProfile();
    load
      .then((p) => setProfile(p as ProfileWithGithub))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    if (isOwnProfile) {
      fetchMyJobs().then(setMyJobs).catch(() => {});
    }
  }, [userId, isOwnProfile]);

  const trustLabel = (score: number | null) => {
    if (score === null) return { text: "Not rated", color: "text-slate-500" };
    if (score >= 80) return { text: "Excellent", color: "text-green-400" };
    if (score >= 60) return { text: "Good", color: "text-blue-400" };
    if (score >= 40) return { text: "Average", color: "text-amber-400" };
    return { text: "Low", color: "text-red-400" };
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <AppHeader />
      <main className="px-5 pb-32 space-y-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-widest pl-1">
          {isOwnProfile ? "My Profile" : "User Profile"}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm text-slate-500">Loading profile...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm text-red-400">{error}</span>
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Trust Score Card */}
            <div className="glass-card rounded-2xl p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                <iconify-icon icon="solar:shield-check-linear" width="32" class="text-[#0098EA]" />
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight">
                  {profile.trust_score !== null ? profile.trust_score : "—"}
                </div>
                <div className={`text-sm font-medium ${trustLabel(profile.trust_score).color}`}>
                  Trust Score {trustLabel(profile.trust_score).text !== "Not rated" && `— ${trustLabel(profile.trust_score).text}`}
                </div>
              </div>
              {profile.trust_score !== null && (
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                    style={{ width: `${profile.trust_score}%` }}
                  />
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Deals" value={profile.reputation.completed_deals} icon="solar:clipboard-check-linear" />
              <StatCard label="Avg Days" value={profile.reputation.avg_completion_days?.toFixed(1) ?? "—"} icon="solar:clock-circle-linear" />
              <StatCard label="Cancelled" value={profile.reputation.cancelled_deals} icon="solar:close-circle-linear" />
              <StatCard label="Disputes" value={profile.reputation.disputes_opened} icon="solar:danger-triangle-linear" />
              <StatCard label="Repeat Clients" value={profile.reputation.repeat_clients} icon="solar:users-group-rounded-linear" />
              <StatCard
                label="Rating"
                value={profile.reputation.rating > 0 ? `${profile.reputation.rating.toFixed(1)}/5` : "—"}
                icon="solar:star-linear"
              />
            </div>

            {/* Trust Score Breakdown */}
            {profile.trust_breakdown && (
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Trust Breakdown</h3>
                {[
                  { label: "Platform", value: profile.trust_breakdown.platform, weight: "40%", color: "bg-blue-500" },
                  { label: "GitHub", value: profile.trust_breakdown.github, weight: "30%", color: "bg-green-500" },
                  { label: "Wallet", value: profile.trust_breakdown.wallet, weight: "20%", color: "bg-purple-500" },
                  { label: "Verification", value: profile.trust_breakdown.verification, weight: "10%", color: "bg-cyan-500" },
                ].map((c) => (
                  <div key={c.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{c.label} ({c.weight})</span>
                      <span className="text-white font-medium">{c.value}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.color} transition-all`} style={{ width: `${c.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* GitHub Card */}
            {profile.github ? (
              <div className="space-y-3">
                <GitHubCard profile={profile.github} flags={profile.github.flags} />
                {isOwnProfile && (
                  <button
                    onClick={async () => {
                      if (!confirm("Unlink your GitHub account?")) return;
                      await fetchGithubUnlink();
                      setProfile((p) => p ? { ...p, github: null } : p);
                    }}
                    className="w-full py-2 text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl cursor-pointer hover:bg-red-500/10 transition-colors"
                  >
                    Unlink GitHub
                  </button>
                )}
              </div>
            ) : isOwnProfile ? (
              <a
                href={`${API_URL}/api/github/auth?userId=${profile.user_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 text-center text-sm font-medium glass-card rounded-2xl hover:bg-white/5 transition-colors"
              >
                <iconify-icon icon="logos:github-icon" width="18" style={{ verticalAlign: "middle" }} />{" "}
                Link GitHub Account
              </a>
            ) : null}

            {/* Red/Green Flags */}
            {profile.github?.flags && (
              <div className="flex flex-wrap gap-2">
                {profile.github.flags.green.map((f) => (
                  <span key={f} className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-medium">
                    {f === "established" ? "Established developer" : f === "starred_repos" ? "Popular repos" : f === "external_prs" ? "Open source contributor" : f === "org_member" ? "Org member" : f}
                  </span>
                ))}
                {profile.github.flags.red.map((f) => (
                  <span key={f} className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-medium">
                    {f === "new_account" ? "New account" : f === "all_forks" ? "All repos forked" : f === "empty_activity" ? "No activity" : f === "burst_activity" ? "Sudden activity" : f}
                  </span>
                ))}
              </div>
            )}

            {/* My Jobs from Groups */}
            {isOwnProfile && myJobs.length > 0 && (
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">My Jobs from Groups</h3>
                <div className="space-y-3">
                  {myJobs.map((job) => (
                    <MyJobCard
                      key={job.id}
                      job={job}
                      onClick={() => navigate(`/my-jobs/${job.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {isOwnProfile && profile.deal_count !== undefined && (
              <div className="text-center text-xs text-slate-500 pt-2">
                Total deals: {profile.deal_count}
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-2">
      <iconify-icon icon={icon} width="20" class="text-slate-500" />
      <div className="text-lg font-semibold tracking-tight">{value}</div>
      <div className="text-[0.6rem] text-slate-500 uppercase tracking-wider font-medium">{label}</div>
    </div>
  );
}
