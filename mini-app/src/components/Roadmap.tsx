import { useT } from "../i18n/context";

interface RoadmapItem {
  titleKey: string;
  status: "done" | "in-progress" | "planned";
  featureKeys: string[];
}

interface Quarter {
  label: string;
  items: RoadmapItem[];
}

const roadmapData: Quarter[] = [
  {
    label: "Q1 2026",
    items: [
      { titleKey: "roadmap.q1.core.title", status: "done", featureKeys: ["roadmap.q1.core.f1", "roadmap.q1.core.f2", "roadmap.q1.core.f3", "roadmap.q1.core.f4"] },
      { titleKey: "roadmap.q1.ai.title", status: "done", featureKeys: ["roadmap.q1.ai.f1", "roadmap.q1.ai.f2", "roadmap.q1.ai.f3", "roadmap.q1.ai.f4"] },
    ],
  },
  {
    label: "Q2 2026",
    items: [
      { titleKey: "roadmap.q2.github.title", status: "in-progress", featureKeys: ["roadmap.q2.github.f1", "roadmap.q2.github.f2", "roadmap.q2.github.f3", "roadmap.q2.github.f4"] },
      { titleKey: "roadmap.q2.web.title", status: "in-progress", featureKeys: ["roadmap.q2.web.f1", "roadmap.q2.web.f2", "roadmap.q2.web.f3"] },
    ],
  },
  {
    label: "Q3 2026",
    items: [
      { titleKey: "roadmap.q3.portfolio.title", status: "planned", featureKeys: ["roadmap.q3.portfolio.f1", "roadmap.q3.portfolio.f2", "roadmap.q3.portfolio.f3"] },
      { titleKey: "roadmap.q3.comms.title", status: "planned", featureKeys: ["roadmap.q3.comms.f1", "roadmap.q3.comms.f2", "roadmap.q3.comms.f3"] },
    ],
  },
  {
    label: "Q4 2026",
    items: [
      { titleKey: "roadmap.q4.market.title", status: "planned", featureKeys: ["roadmap.q4.market.f1", "roadmap.q4.market.f2", "roadmap.q4.market.f3"] },
      { titleKey: "roadmap.q4.scale.title", status: "planned", featureKeys: ["roadmap.q4.scale.f1", "roadmap.q4.scale.f2", "roadmap.q4.scale.f3"] },
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

function StatusIcon({ status }: { status: string }) {
  if (status === "done") return <span className="text-green-400 flex-shrink-0">&#10003;</span>;
  if (status === "in-progress") return <span className="text-[#0098EA] flex-shrink-0">&rarr;</span>;
  return <span className="text-slate-600 flex-shrink-0">&middot;</span>;
}

export default function Roadmap() {
  const t = useT();

  const statusLabel = (status: string) =>
    status === "done" ? t("roadmap.completed")
    : status === "in-progress" ? t("roadmap.inProgress")
    : t("roadmap.planned");

  return (
    <div className="w-full max-w-3xl mx-auto">
      {roadmapData.map((q, qi) => {
        const progress = getQuarterProgress(q);
        const isDone = q.items.every((i) => i.status === "done");
        const isActive = q.items.some((i) => i.status === "in-progress");
        const isPlanned = q.items.every((i) => i.status === "planned");

        return (
          <div key={qi} className="flex gap-4 md:gap-6">
            {/* Timeline column */}
            <div className="flex flex-col items-center w-8 flex-shrink-0">
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-1 ${
                  isPlanned
                    ? "border-slate-600 bg-transparent"
                    : "border-[#0098EA] bg-[#0098EA]"
                }`}
              />
              {qi < roadmapData.length - 1 && (
                <div
                  className={`w-0.5 flex-1 min-h-[2rem] ${
                    isDone ? "bg-gradient-to-b from-[#0098EA] to-[#0098EA]" : isActive ? "bg-gradient-to-b from-[#0098EA] to-white/10" : "bg-white/10"
                  }`}
                />
              )}
            </div>

            {/* Content column */}
            <div className={`flex-1 ${qi < roadmapData.length - 1 ? "pb-8 md:pb-10" : "pb-0"}`}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-bold text-white">{q.label}</h3>
                <div className="flex-1 max-w-[160px] h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: progress === 100
                        ? "#22c55e"
                        : "linear-gradient(90deg, #0098EA, #00D1FF)",
                    }}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  progress === 100 ? "text-green-400" : progress > 0 ? "text-[#0098EA]" : "text-slate-600"
                }`}>
                  {progress}%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.items.map((item, ii) => (
                  <div
                    key={ii}
                    className={`rounded-xl p-4 border transition-colors ${
                      item.status === "done"
                        ? "bg-green-500/5 border-green-500/15"
                        : item.status === "in-progress"
                          ? "bg-[#0098EA]/5 border-[#0098EA]/15"
                          : "bg-white/[0.02] border-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="font-semibold text-white text-sm">{t(item.titleKey as any)}</h4>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        item.status === "done"
                          ? "bg-green-500/15 text-green-400"
                          : item.status === "in-progress"
                            ? "bg-[#0098EA]/15 text-[#0098EA]"
                            : "bg-white/5 text-slate-500"
                      }`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {item.featureKeys.map((fk) => (
                        <li key={fk} className="text-xs text-slate-400 flex items-center gap-2">
                          <StatusIcon status={item.status} />
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
