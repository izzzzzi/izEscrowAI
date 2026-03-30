import { useT } from "../i18n/context";

interface ReputationCardProps {
  trustScore: number | null;
  breakdown: { platform: number; github: number; wallet: number; verification: number } | null;
  reputation: { completed_deals: number; rating: number };
  github: { username: string; public_repos: number } | null;
  walletConnected: boolean;
  walletAddress?: string;
  isOwnProfile: boolean;
  onConnectGithub?: () => void;
  onConnectWallet?: () => void;
}

function scoreColor(s: number | null): string {
  if (s === null) return "text-slate-500";
  if (s >= 80) return "text-green-400";
  if (s >= 60) return "text-blue-400";
  if (s >= 40) return "text-amber-400";
  return "text-red-400";
}

function barBg(s: number | null): string {
  if (s === null) return "bg-slate-600";
  if (s >= 80) return "bg-green-500";
  if (s >= 60) return "bg-blue-500";
  if (s >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function CategoryRow({
  label,
  detail,
  score,
  color,
  action,
}: {
  label: string;
  detail?: string;
  score: number | null;
  color: string;
  action?: { text: string; onClick: () => void };
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-slate-300 min-w-0">
          <span className="font-medium shrink-0">{label}</span>
          {detail && (
            <>
              <span className="text-slate-600">&middot;</span>
              <span className="text-slate-400 truncate">{detail}</span>
            </>
          )}
        </div>
        {action ? (
          <button
            onClick={action.onClick}
            className="text-xs text-[#0098EA] hover:text-white transition-colors bg-transparent border-none cursor-pointer shrink-0 ml-2"
          >
            {action.text} &rarr;
          </button>
        ) : (
          <span className="text-sm font-medium shrink-0 ml-2">{score ?? "—"}</span>
        )}
      </div>
      {score !== null && (
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color} transition-all`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function ReputationCard({
  trustScore,
  breakdown,
  reputation,
  github,
  walletConnected,
  walletAddress,
  isOwnProfile,
  onConnectGithub,
  onConnectWallet,
}: ReputationCardProps) {
  const t = useT();

  const platformDetail = `${reputation.completed_deals} ${t("reputation.deals")}${reputation.rating > 0 ? ` \u00b7 ${reputation.rating.toFixed(1)} \u2605` : ""}`;
  const githubDetail = github
    ? `@${github.username} \u00b7 ${github.public_repos} ${t("reputation.repos")}`
    : undefined;
  const walletDetail = walletConnected && walletAddress
    ? walletAddress.slice(0, 4) + "\u2026" + walletAddress.slice(-4)
    : undefined;

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      {/* Header: title + total score */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {t("reputation.title")}
        </h3>
        <span className={`text-2xl font-bold ${scoreColor(trustScore)}`}>
          {trustScore ?? "—"}
        </span>
      </div>

      {/* Total progress bar */}
      {trustScore !== null && (
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barBg(trustScore)} transition-all`}
            style={{ width: `${trustScore}%` }}
          />
        </div>
      )}

      {/* Category rows */}
      <div className="space-y-3">
        {/* Platform */}
        <CategoryRow
          label={t("reputation.platform")}
          detail={platformDetail}
          score={breakdown?.platform ?? null}
          color="bg-blue-500"
        />

        {/* GitHub */}
        {github ? (
          <CategoryRow
            label={t("reputation.github")}
            detail={githubDetail}
            score={breakdown?.github ?? null}
            color="bg-green-500"
          />
        ) : (
          <CategoryRow
            label={t("reputation.github")}
            score={null}
            color="bg-green-500"
            action={isOwnProfile && onConnectGithub ? { text: t("reputation.connectGithub"), onClick: onConnectGithub } : undefined}
          />
        )}

        {/* Wallet */}
        {walletConnected && walletAddress ? (
          <CategoryRow
            label={t("reputation.wallet")}
            detail={walletDetail}
            score={breakdown?.wallet ?? null}
            color="bg-purple-500"
          />
        ) : (
          <CategoryRow
            label={t("reputation.wallet")}
            score={null}
            color="bg-purple-500"
            action={isOwnProfile && onConnectWallet ? { text: t("reputation.connectWallet"), onClick: onConnectWallet } : undefined}
          />
        )}

        {/* Verification */}
        <CategoryRow
          label={t("reputation.verification")}
          detail={t("reputation.telegram")}
          score={breakdown?.verification ?? null}
          color="bg-cyan-500"
        />
      </div>
    </div>
  );
}
