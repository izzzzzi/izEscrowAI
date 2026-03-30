import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { fetchProfile, fetchUserProfile, fetchOffers, fetchMyJobs, fetchGithubUnlink, registerWallet, type ProfileWithGithub, type Offer, type MyJob, API_URL } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useT } from "../i18n/context";
import LoginGate from "../components/LoginGate";
import GitHubCard from "../components/GitHubCard";
import MyJobCard from "../components/MyJobCard";
import ReputationCard from "../components/ReputationCard";

export default function WebProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const t = useT();
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
          <h2 className="text-xl font-medium mb-4">{t("webProfile.title")}</h2>
          <LoginGate fallbackText={t("webProfile.loginPrompt")} />
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
        <p className="text-slate-400 mt-20">{t("webProfile.notFound")}</p>
      </div>
    );
  }

  const displayName = isOwnProfile && user
    ? `${user.first_name || ""}${user.last_name ? " " + user.last_name : ""}`
    : t("webProfile.user").replace("{id}", String(profile.user_id));

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
              <div className="flex items-center gap-3 mt-0.5">
                {isOwnProfile && user?.username && (
                  <span className="text-sm text-slate-400 flex items-center gap-1">
                    <iconify-icon icon="simple-icons:telegram" width="12" class="text-[#0098EA]" />
                    @{user.username}
                  </span>
                )}
                {profile?.github && (
                  <a href={`https://github.com/${profile.github.username}`} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1 no-underline">
                    <iconify-icon icon="simple-icons:github" width="12" />
                    @{profile.github.username}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reputation Card */}
        <div className="mb-6">
          <ReputationCard
            trustScore={profile.trust_score}
            breakdown={profile.trust_breakdown}
            reputation={{ completed_deals: profile.reputation.completed_deals, rating: profile.reputation.rating }}
            github={profile.github ? { username: profile.github.username, public_repos: profile.github.public_repos } : null}
            walletConnected={!!(hasWallet && tonAddress)}
            walletAddress={tonAddress || undefined}
            isOwnProfile={isOwnProfile}
            onConnectGithub={() => window.open(`${API_URL}/api/github/auth?userId=${profile.user_id}`, "_blank")}
            onConnectWallet={() => tonConnectUI.openModal()}
          />
        </div>

        {/* GitHub Card */}
        {profile.github ? (
          <div className="mb-6 space-y-3">
            <GitHubCard profile={profile.github} flags={profile.github.flags} />
            {isOwnProfile && (
              <button
                onClick={async () => {
                  if (!confirm(t("profile.github.unlinkConfirm"))) return;
                  await fetchGithubUnlink();
                  setProfile((p) => p ? { ...p, github: null } : p);
                }}
                className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg px-4 py-2 cursor-pointer hover:bg-red-500/10 transition-colors"
              >
                {t("profile.github.unlink")}
              </button>
            )}
          </div>
        ) : null}

        {/* My Jobs from Groups */}
        {isOwnProfile && myJobs.length > 0 && (
          <div className="glass-card rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">{t("profile.myJobs")}</h3>
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
            <h3 className="text-lg font-medium mb-4">{t("webProfile.yourOffers")}</h3>
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
                      {t("common.from")} {o.min_price} {o.currency}
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
