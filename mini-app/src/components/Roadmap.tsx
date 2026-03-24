import { useT } from "../i18n/context";

interface RoadmapItem {
  titleKey: string;
  status: "done" | "in-progress" | "planned";
  featureKeys: string[];
  icon: string;
}

interface Quarter {
  label: string;
  items: RoadmapItem[];
}

const roadmapData: Quarter[] = [
  {
    label: "Q1 2026",
    items: [
      { titleKey: "roadmap.q1.core.title", status: "done", icon: "solar:shield-check-linear", featureKeys: ["roadmap.q1.core.f1", "roadmap.q1.core.f2", "roadmap.q1.core.f3", "roadmap.q1.core.f4"] },
      { titleKey: "roadmap.q1.ai.title", status: "done", icon: "solar:magic-stick-3-linear", featureKeys: ["roadmap.q1.ai.f1", "roadmap.q1.ai.f2", "roadmap.q1.ai.f3", "roadmap.q1.ai.f4"] },
      { titleKey: "roadmap.q1.parser.title", status: "done", icon: "solar:radar-2-linear", featureKeys: ["roadmap.q1.parser.f1", "roadmap.q1.parser.f2", "roadmap.q1.parser.f3"] },
    ],
  },
  {
    label: "Q2 2026",
    items: [
      { titleKey: "roadmap.q2.github.title", status: "done", icon: "solar:code-scan-linear", featureKeys: ["roadmap.q2.github.f1", "roadmap.q2.github.f2", "roadmap.q2.github.f3", "roadmap.q2.github.f4"] },
      { titleKey: "roadmap.q2.web.title", status: "done", icon: "solar:bag-4-linear", featureKeys: ["roadmap.q2.web.f1", "roadmap.q2.web.f2", "roadmap.q2.web.f3", "roadmap.q2.web.f4"] },
      { titleKey: "roadmap.q2.platform.title", status: "done", icon: "solar:settings-linear", featureKeys: ["roadmap.q2.platform.f1", "roadmap.q2.platform.f2", "roadmap.q2.platform.f3"] },
    ],
  },
  {
    label: "Q3 2026",
    items: [
      { titleKey: "roadmap.q3.cocoon.title", status: "planned", icon: "solar:cpu-bolt-linear", featureKeys: ["roadmap.q3.cocoon.f1", "roadmap.q3.cocoon.f2", "roadmap.q3.cocoon.f3"] },
      { titleKey: "roadmap.q3.comms.title", status: "planned", icon: "solar:chat-round-dots-linear", featureKeys: ["roadmap.q3.comms.f1", "roadmap.q3.comms.f2", "roadmap.q3.comms.f3"] },
    ],
  },
  {
    label: "Q4 2026",
    items: [
      { titleKey: "roadmap.q4.ton.title", status: "planned", icon: "solar:link-round-linear", featureKeys: ["roadmap.q4.ton.f1", "roadmap.q4.ton.f2", "roadmap.q4.ton.f3"] },
      { titleKey: "roadmap.q4.scale.title", status: "planned", icon: "solar:graph-up-linear", featureKeys: ["roadmap.q4.scale.f1", "roadmap.q4.scale.f2", "roadmap.q4.scale.f3"] },
    ],
  },
];

function getQuarterProgress(q: Quarter): number {
  const total = q.items.length;
  if (total === 0) return 0;
  const score = q.items.reduce((sum, item) => {
    if (item.status === "done") return sum + 1;
    if (item.status === "in-progress") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((score / total) * 100);
}

export default function Roadmap() {
  const t = useT();

  const statusLabel = (status: string) =>
    status === "done" ? t("roadmap.completed")
    : status === "in-progress" ? t("roadmap.inProgress")
    : t("roadmap.planned");

  const statusIcon = (status: string) =>
    status === "done" ? "✓" : status === "in-progress" ? "→" : "·";

  const statusColor = (status: string) =>
    status === "done" ? "text-green-400" : status === "in-progress" ? "text-[#6AB3F3]" : "text-slate-600";

  return (
    <div className="w-full">
      {roadmapData.map((q, qi) => {
        const progress = getQuarterProgress(q);
        const isDone = q.items.every((i) => i.status === "done");
        const isActive = q.items.some((i) => i.status === "in-progress");
        const isPlanned = q.items.every((i) => i.status === "planned");

        return (
          <div key={qi} className="flex gap-4 md:gap-6">
            {/* Timeline */}
            <div className="flex flex-col items-center w-8 flex-shrink-0">
              {isActive ? (
                <div className="relative flex-shrink-0 mt-0.5">
                  <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-[#0098EA] opacity-40" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[#0098EA] border-2 border-[#0098EA]" />
                </div>
              ) : (
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                  isPlanned ? "border-slate-600 bg-transparent" : "border-green-500 bg-green-500"
                }`} />
              )}
              {qi < roadmapData.length - 1 && (
                <div className={`w-0.5 flex-1 min-h-[2rem] ${
                  isDone ? "bg-green-500" : isActive ? "bg-gradient-to-b from-[#0098EA] to-white/5" : "bg-white/5"
                }`} />
              )}
            </div>

            {/* Content */}
            <div className={`flex-1 ${qi < roadmapData.length - 1 ? "pb-8 md:pb-10" : "pb-0"}`}>
              {/* Quarter header */}
              <div className="flex items-center gap-3 mb-3">
                <h3 className={`text-lg font-bold ${isActive ? "text-white" : isDone ? "text-green-400" : "text-slate-500"}`}>
                  {q.label}
                </h3>
                <div className="flex-1 max-w-[140px] h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: progress === 100 ? "#22c55e" : "linear-gradient(90deg, #0098EA, #00D1FF)",
                    }}
                  />
                </div>
                <span className={`text-xs font-semibold ${
                  progress === 100 ? "text-green-400" : progress > 0 ? "text-[#0098EA]" : "text-slate-600"
                }`}>
                  {progress}%
                </span>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.items.map((item, ii) => (
                  <div
                    key={ii}
                    className={`rounded-xl p-4 border hover-lift ${
                      item.status === "done"
                        ? "bg-green-500/5 border-green-500/15"
                        : item.status === "in-progress"
                          ? "bg-[#0098EA]/5 border-[#0098EA]/15 shimmer-border"
                          : "bg-white/[0.02] border-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        item.status === "done" ? "bg-green-500/10" : item.status === "in-progress" ? "bg-[#0098EA]/10" : "bg-white/5"
                      }`}>
                        <iconify-icon
                          icon={item.icon}
                          width="18"
                          class={item.status === "done" ? "text-green-400" : item.status === "in-progress" ? "text-[#0098EA]" : "text-slate-500"}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm truncate">{t(item.titleKey as any)}</h4>
                      </div>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        item.status === "done"
                          ? "bg-green-500/15 text-green-400"
                          : item.status === "in-progress"
                            ? "bg-[#0098EA]/15 text-[#0098EA]"
                            : "bg-white/5 text-slate-500"
                      }`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {item.featureKeys.map((fk) => (
                        <li key={fk} className="text-xs text-slate-400 flex items-center gap-2">
                          <span className={`flex-shrink-0 ${statusColor(item.status)}`}>{statusIcon(item.status)}</span>
                          {t(fk as any)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
