import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { fetchProfile, fetchUserProfile, fetchOffers, fetchMyJobs, fetchGithubUnlink, registerWallet, type ProfileWithGithub, type Offer, type MyJob, API_URL } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import LoginGate from "../components/LoginGate";
import GitHubCard from "../components/GitHubCard";
import MyJobCard from "../components/MyJobCard";

export default function WebProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, hasWallet, setWallet } = useAuth();
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress(false);
  const [profile, setProfile] = useState<ProfileWithGithub | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = !userId;

  useEffect(() => {
    if (isOwnProfile && !isAuthenticated) {
      setLoading(false);
      return;
    }

    const loadProfile = userId
      ? fetchUserProfile(parseInt(userId))
      : fetchProfile();

    loadProfile
      .then((p) => setProfile(p as ProfileWithGithub))
      .catch((e) => console.error("[Profile] fetch failed:", e))
      .finally(() => setLoading(false));

    if (isOwnProfile && isAuthenticated) {
      fetchOffers().then(setOffers).catch((e) => console.error("[Profile] offers fetch failed:", e));
      fetchMyJobs().then(setMyJobs).catch((e) => console.error("[Profile] myJobs fetch failed:", e));
    }
  }, [userId, isAuthenticated, isOwnProfile]);

  // Sync TonConnect wallet state with AuthContext and backend
  useEffect(() => {
    if (tonAddress) {
      setWallet(tonAddress);
      registerWallet(tonAddress).catch((e) => console.error("[Profile] wallet register failed:", e));
    } else {
      setWallet(null);
    }
  }, [tonAddress, setWallet]);

  if (isOwnProfile && !isAuthenticated) {
    return (
      <div className="min-h-screen page-shell pt-28 pb-16 px-6 text-center">
        <div className="max-w-md mx-auto mt-20">
          <iconify-icon icon="solar:user-linear" width="48" class="text-slate-600 mb-4" />
          <h2 className="text-xl font-medium mb-4">Your Profile</h2>
          <LoginGate fallbackText="Login with Telegram to view your profile" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen page-shell pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="glass-card rounded-2xl p-8 animate-pulse h-48" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen page-shell pt-28 pb-16 px-6 text-center">
        <p className="text-slate-400 mt-20">Profile not found</p>
      </div>
    );
  }

  const rep = profile.reputation;
  const displayName = isOwnProfile && user
    ? `${user.first_name || ""}${user.last_name ? " " + user.last_name : ""}`
    : `User #${profile.user_id}`;

  return (
    <div className="min-h-screen page-shell pt-28 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Profile Card */}
        <div className="glass-card rounded-2xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            {isOwnProfile && user?.photo_url ? (
              <img src={user.photo_url} alt="" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center">
                <iconify-icon icon="solar:user-linear" width="28" class="text-slate-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-medium">{displayName}</h2>
              {isOwnProfile && user?.username && (
                <span className="text-sm text-slate-400">@{user.username}</span>
              )}
            </div>
          </div>

          {/* Trust Score */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-full border-3 flex items-center justify-center ${
                profile.trust_score === null
                  ? "border-slate-600"
                  : profile.trust_score >= 70
                    ? "border-green-500/40"
                    : profile.trust_score >= 40
                      ? "border-amber-500/40"
                      : "border-red-500/40"
              }`}>
                <span className={`text-lg font-bold ${
                  profile.trust_score === null ? "text-slate-500" : "text-white"
                }`}>
                  {profile.trust_score ?? "?"}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium">Trust Score</div>
                <div className="text-xs text-slate-400">
                  {profile.trust_score === null ? "New user" : profile.trust_score >= 70 ? "Excellent" : profile.trust_score >= 40 ? "Good" : "Low"}
                </div>
              </div>
            </div>

          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Deals", value: rep.completed_deals },
              { label: "Avg Rating", value: rep.completed_deals > 0 ? `${(rep.rating || 0).toFixed(1)}/5` : "N/A" },
              { label: "Cancelled", value: rep.cancelled_deals },
              { label: "Disputes", value: rep.disputes_opened },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-lg font-semibold">{s.value}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Score Breakdown */}
        {profile.trust_breakdown && (
          <div className="glass-card rounded-2xl p-6 mb-6">
            <h3 className="text-sm font-medium text-slate-400 mb-4">Trust Score Breakdown</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Platform", value: profile.trust_breakdown.platform, weight: "40%", color: "bg-blue-500" },
                { label: "GitHub", value: profile.trust_breakdown.github, weight: "30%", color: "bg-green-500" },
                { label: "Wallet", value: profile.trust_breakdown.wallet, weight: "20%", color: "bg-purple-500" },
                { label: "Verification", value: profile.trust_breakdown.verification, weight: "10%", color: "bg-cyan-500" },
              ].map((c) => (
                <div key={c.label} className="text-center">
                  <div className="text-lg font-semibold">{c.value}</div>
                  <div className="text-xs text-slate-400">{c.label} ({c.weight})</div>
                  <div className="h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GitHub Card */}
        {profile.github ? (
          <div className="mb-6 space-y-3">
            <GitHubCard profile={profile.github} flags={profile.github.flags} />
            {isOwnProfile && (
              <button
                onClick={async () => {
                  if (!confirm("Unlink your GitHub account?")) return;
                  await fetchGithubUnlink();
                  setProfile((p) => p ? { ...p, github: null } : p);
                }}
                className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg px-4 py-2 cursor-pointer hover:bg-red-500/10 transition-colors"
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
            className="block glass-card rounded-2xl p-6 mb-6 text-center hover:bg-white/5 transition-colors"
          >
            <iconify-icon icon="logos:github-icon" width="32" class="mb-3" />
            <div className="text-sm font-medium">Link GitHub Account</div>
            <div className="text-xs text-slate-400 mt-1">Verify your skills and boost your Trust Score</div>
          </a>
        ) : null}

        {/* Wallet Card */}
        {isOwnProfile && (hasWallet && tonAddress ? (
          <div className="glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <iconify-icon icon="solar:wallet-2-bold" width="22" class="text-purple-400" />
              </div>
              <div>
                <div className="text-sm font-medium">TON Wallet Connected</div>
                <div className="text-xs text-slate-400 font-mono">
                  {tonAddress.slice(0, 6)}...{tonAddress.slice(-4)}
                </div>
              </div>
            </div>
            <button
              onClick={() => tonConnectUI.disconnect()}
              className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg px-4 py-2 cursor-pointer hover:bg-red-500/10 transition-colors"
            >
              Disconnect Wallet
            </button>
          </div>
        ) : (
          <button
            onClick={() => tonConnectUI.openModal()}
            className="block w-full glass-card rounded-2xl p-6 mb-6 text-center hover:bg-white/5 transition-colors cursor-pointer bg-transparent border-none text-white"
          >
            <iconify-icon icon="solar:wallet-2-bold" width="32" class="text-purple-400 mb-3" />
            <div className="text-sm font-medium">Connect TON Wallet</div>
            <div className="text-xs text-slate-400 mt-1">Secure your deals and boost your Trust Score</div>
          </button>
        ))}

        {/* My Jobs from Groups */}
        {isOwnProfile && myJobs.length > 0 && (
          <div className="glass-card rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">My Jobs from Groups</h3>
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

        {/* User's Offers */}
        {isOwnProfile && offers.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-medium mb-4">Your Offers</h3>
            <div className="space-y-3">
              {offers.map((o) => (
                <div
                  key={o.id}
                  onClick={() => navigate(`/offers/${o.id}`)}
                  className="bg-white/5 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium truncate flex-1">{o.description}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      o.status === "open" ? "bg-green-500/10 text-green-400" : "bg-slate-500/10 text-slate-400"
                    }`}>
                      {o.status}
                    </span>
                  </div>
                  {o.min_price && (
                    <span className="text-xs text-slate-400 mt-1 block">
                      from {o.min_price} {o.currency}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
