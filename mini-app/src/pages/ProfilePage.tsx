import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTonConnectUI, useTonWallet, useTonAddress } from "@tonconnect/ui-react";
import { fetchProfile, fetchUserProfile, fetchMyJobs, fetchGithubUnlink, type ProfileWithGithub, type MyJob, API_URL, getInitData } from "../lib/api";
import { useT } from "../i18n/context";
import AppHeader from "../components/AppHeader";
import GitHubCard from "../components/GitHubCard";
import MyJobCard from "../components/MyJobCard";
import ReputationCard from "../components/ReputationCard";
import Icon from "../components/Icon";

function ProfileSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-white/5" />
        <div className="h-8 w-16 bg-white/5 rounded" />
        <div className="h-4 w-32 bg-white/5 rounded" />
      </div>
      <div className="glass-card rounded-2xl p-5 h-48" />
    </div>
  );
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const t = useT();
  const [profile, setProfile] = useState<ProfileWithGithub | null>(null);
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = !userId;
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const walletAddress = useTonAddress();

  useEffect(() => {
    if (walletAddress && isOwnProfile) {
      fetch(`${API_URL}/api/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Init-Data": getInitData() },
        body: JSON.stringify({ wallet_address: walletAddress }),
      }).catch(() => {});
    }
  }, [walletAddress, isOwnProfile]);

  useEffect(() => {
    (userId ? fetchUserProfile(parseInt(userId)) : fetchProfile())
      .then((p) => setProfile(p as ProfileWithGithub))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    if (isOwnProfile) fetchMyJobs().then(setMyJobs).catch(() => {});
  }, [userId, isOwnProfile]);

  return (
    <div className="mini-page">
      <AppHeader />
      <main className="px-5 pb-32 space-y-4">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-widest pl-1">
          {isOwnProfile ? t("profile.myProfile") : t("profile.userProfile")}
        </h2>

        {loading ? <ProfileSkeleton /> : error ? (
          <div className="glass-card rounded-2xl p-8 text-center space-y-3">
            <Icon icon="solar:danger-triangle-linear" size={32} className="text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => window.location.reload()} className="text-xs text-slate-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer">
              {t("common.retry")}
            </button>
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Reputation Card */}
            <ReputationCard
              trustScore={profile.trust_score}
              breakdown={profile.trust_breakdown}
              reputation={{ completed_deals: profile.reputation.completed_deals, rating: profile.reputation.rating }}
              github={profile.github ? { username: profile.github.username, public_repos: profile.github.public_repos } : null}
              walletConnected={!!wallet}
              walletAddress={walletAddress}
              isOwnProfile={isOwnProfile}
              onConnectGithub={() => window.open(`${API_URL}/api/github/auth?userId=${profile.user_id}`, "_blank")}
              onConnectWallet={() => tonConnectUI.openModal()}
            />

            {/* GitHub */}
            {profile.github ? (
              <div className="space-y-3">
                <GitHubCard profile={profile.github} flags={profile.github.flags} />
                {isOwnProfile && (
                  <button
                    onClick={async () => { if (!confirm(t("profile.github.unlinkConfirm"))) return; await fetchGithubUnlink(); setProfile((p) => p ? { ...p, github: null } : p); }}
                    className="w-full py-2.5 text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl cursor-pointer hover:bg-red-500/10 transition-colors"
                  >
                    {t("profile.github.unlink")}
                  </button>
                )}
              </div>
            ) : null}

            {/* My Jobs */}
            {isOwnProfile && myJobs.length > 0 && (
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t("profile.myJobs")}</h3>
                <div className="space-y-3">
                  {myJobs.map((job) => (
                    <MyJobCard key={job.id} job={job} onClick={() => navigate(`/my-jobs/${job.id}`)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
