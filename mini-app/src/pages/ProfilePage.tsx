import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTonConnectUI, useTonWallet, useTonAddress } from "@tonconnect/ui-react";
import { fetchProfile, fetchUserProfile, fetchMyJobs, fetchGithubUnlink, type ProfileWithGithub, type MyJob, API_URL, getInitData } from "../lib/api";
import { useT } from "../i18n/context";
import AppHeader from "../components/AppHeader";
import GitHubCard from "../components/GitHubCard";
import MyJobCard from "../components/MyJobCard";

function ProfileSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-white/5" />
        <div className="h-8 w-16 bg-white/5 rounded" />
        <div className="h-4 w-32 bg-white/5 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => <div key={i} className="glass-card rounded-xl p-4 h-20" />)}
      </div>
      <div className="glass-card rounded-2xl p-5 h-24" />
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

  const scoreColor = (s: number | null) =>
    s === null ? "text-slate-500" : s >= 80 ? "text-green-400" : s >= 60 ? "text-blue-400" : s >= 40 ? "text-amber-400" : "text-red-400";

  const barColor = (s: number | null) =>
    s === null ? "bg-slate-600" : s >= 80 ? "bg-green-500" : s >= 60 ? "bg-blue-500" : s >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="mini-page">
      <AppHeader />
      <main className="px-5 pb-32 space-y-4">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-widest pl-1">
          {isOwnProfile ? t("profile.myProfile") : t("profile.userProfile")}
        </h2>

        {loading ? <ProfileSkeleton /> : error ? (
          <div className="glass-card rounded-2xl p-8 text-center space-y-3">
            <iconify-icon icon="solar:danger-triangle-linear" width="32" class="text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => window.location.reload()} className="text-xs text-slate-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer">
              {t("common.retry")}
            </button>
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Trust Score */}
            <div className="glass-card rounded-2xl p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#0098EA]/10 flex items-center justify-center mx-auto">
                <iconify-icon icon="solar:shield-check-linear" width="32" class="text-[#0098EA]" />
              </div>
              <div className="text-3xl font-bold tracking-tight">
                {profile.trust_score ?? "—"}
              </div>
              <div className={`text-sm font-medium ${scoreColor(profile.trust_score)}`}>
                {t("profile.trustScore")}
              </div>
              {profile.trust_score !== null && (
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full ${barColor(profile.trust_score)} transition-all`} style={{ width: `${profile.trust_score}%` }} />
                </div>
              )}
            </div>

            {/* Key Stats — only 3 */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label={t("profile.stat.deals")} value={profile.reputation.completed_deals} icon="solar:clipboard-check-linear" color="text-blue-400" />
              <StatCard label={t("profile.stat.rating")} value={profile.reputation.rating > 0 ? profile.reputation.rating.toFixed(1) : "—"} icon="solar:star-linear" color="text-amber-400" />
              <StatCard label={t("profile.stat.repeatClients")} value={profile.reputation.repeat_clients} icon="solar:users-group-rounded-linear" color="text-purple-400" />
            </div>

            {/* Wallet */}
            {isOwnProfile && (
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t("profile.wallet.title")}</h3>
                {wallet ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <iconify-icon icon="solar:wallet-2-linear" width="18" class="text-green-400" />
                      <code className="text-xs font-mono text-slate-300">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</code>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigator.clipboard.writeText(walletAddress)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors bg-white/5 rounded-lg border-none cursor-pointer">
                        {t("profile.wallet.copy")}
                      </button>
                      <button onClick={() => tonConnectUI.disconnect()} className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors bg-red-500/5 rounded-lg border-none cursor-pointer">
                        {t("profile.wallet.disconnect")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => tonConnectUI.openModal()} className="w-full py-3 rounded-xl text-sm font-medium bg-[#0098EA]/10 text-[#0098EA] border border-[#0098EA]/20 cursor-pointer hover:bg-[#0098EA]/20 transition-colors flex items-center justify-center gap-2">
                    <iconify-icon icon="solar:wallet-2-linear" width="18" />
                    {t("profile.wallet.connect")}
                  </button>
                )}
              </div>
            )}

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
            ) : isOwnProfile ? (
              <button
                onClick={() => window.open(`${API_URL}/api/github/auth?userId=${profile.user_id}`, "_blank")}
                className="w-full py-3 text-sm font-medium glass-card rounded-2xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2 cursor-pointer border-none text-white"
              >
                <iconify-icon icon="logos:github-icon" width="18" />
                {t("profile.github.link")}
              </button>
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

function StatCard({ label, value, icon, color = "text-slate-500" }: { label: string; value: string | number; icon: string; color?: string }) {
  return (
    <div className="glass-card rounded-xl p-3 flex flex-col items-center gap-1.5">
      <iconify-icon icon={icon} width="18" class={color} />
      <div className="text-base font-semibold tracking-tight">{value}</div>
      <div className="text-[0.55rem] text-slate-500 uppercase tracking-wider font-medium text-center leading-tight">{label}</div>
    </div>
  );
}
