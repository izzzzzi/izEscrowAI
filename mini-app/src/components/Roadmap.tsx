import { useState } from "react";

interface RoadmapItem {
  title: string;
  status: "done" | "in-progress" | "planned";
  features: string[];
}

interface Quarter {
  label: string;
  items: RoadmapItem[];
}

const roadmapData: Quarter[] = [
  {
    label: "Q1 2026",
    items: [
      {
        title: "Core Platform",
        status: "done",
        features: [
          "P2P Escrow on TON",
          "AI Deal Parsing",
          "Inline Offers in Groups",
          "Reputation System",
        ],
      },
      {
        title: "Web Marketplace",
        status: "done",
        features: [
          "Public offer browsing",
          "Dual auth (Mini App + Web)",
          "Progressive gating",
        ],
      },
    ],
  },
  {
    label: "Q2 2026",
    items: [
      {
        title: "GitHub Verification",
        status: "in-progress",
        features: [
          "OAuth profile linking",
          "Skill-based matching",
          "Trust Score v2",
          "Fake account detection",
        ],
      },
      {
        title: "Enhanced Landing",
        status: "in-progress",
        features: [
          "Live stats & activity feed",
          "Developer talent grid",
          "Animated hero section",
        ],
      },
    ],
  },
  {
    label: "Q3 2026",
    items: [
      {
        title: "Portfolio Integration",
        status: "planned",
        features: [
          "Behance/Dribbble linking",
          "LinkedIn verification",
          "Portfolio showcase",
        ],
      },
      {
        title: "Communication",
        status: "planned",
        features: [
          "In-app chat",
          "File sharing",
          "Milestone tracking",
        ],
      },
    ],
  },
  {
    label: "Q4 2026",
    items: [
      {
        title: "Marketplace 2.0",
        status: "planned",
        features: [
          "Category browsing",
          "Advanced search & filters",
          "PWA support",
        ],
      },
      {
        title: "Scale & Trust",
        status: "planned",
        features: [
          "Review system",
          "Multi-language UI",
          "Arbitration DAO",
        ],
      },
    ],
  },
];

const statusColors: Record<string, string> = {
  done: "bg-green-500/20 text-green-400 border-green-500/30",
  "in-progress": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  planned: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const statusLabels: Record<string, string> = {
  done: "Completed",
  "in-progress": "In Progress",
  planned: "Planned",
};

export default function Roadmap() {
  const [expandedQ, setExpandedQ] = useState<number | null>(1); // Q2 expanded by default

  return (
    <div className="w-full">
      {/* Desktop: horizontal timeline */}
      <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
        {roadmapData.map((q, qi) => (
          <div key={qi} className="flex-1 min-w-[260px]">
            <div className="text-center mb-4">
              <span className="text-lg font-bold text-white">{q.label}</span>
            </div>
            <div className="relative">
              {/* Timeline connector */}
              <div className="absolute top-0 left-1/2 -translate-x-px w-0.5 h-full bg-white/10" />
              <div className="absolute top-0 left-1/2 -translate-x-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-[#1a1a2e]" />
              <div className="space-y-3 pt-6">
                {q.items.map((item, ii) => (
                  <div
                    key={ii}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-blue-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white text-sm">{item.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[item.status]}`}>
                        {statusLabels[item.status]}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {item.features.map((f, fi) => (
                        <li key={fi} className="text-xs text-gray-400 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-gray-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: vertical accordion */}
      <div className="md:hidden space-y-3">
        {roadmapData.map((q, qi) => (
          <div key={qi} className="border border-white/10 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedQ(expandedQ === qi ? null : qi)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-bold text-white">{q.label}</span>
              <div className="flex items-center gap-2">
                {q.items.map((item, ii) => (
                  <span
                    key={ii}
                    className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[item.status]}`}
                  >
                    {statusLabels[item.status]}
                  </span>
                ))}
                <span className="text-gray-400">{expandedQ === qi ? "▲" : "▼"}</span>
              </div>
            </button>
            {expandedQ === qi && (
              <div className="px-4 pb-4 space-y-3">
                {q.items.map((item, ii) => (
                  <div key={ii} className="bg-white/5 rounded-lg p-3">
                    <h4 className="font-semibold text-white text-sm mb-2">{item.title}</h4>
                    <ul className="space-y-1">
                      {item.features.map((f, fi) => (
                        <li key={fi} className="text-xs text-gray-400 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-gray-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
