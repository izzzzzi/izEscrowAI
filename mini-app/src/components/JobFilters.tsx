import { useState } from "react";
import { type JobFilters } from "../lib/api";

const POPULAR_SKILLS = [
  "React",
  "TypeScript",
  "Python",
  "Node.js",
  "Go",
  "Rust",
  "Java",
  "PHP",
  "Solidity",
  "Figma",
];

interface JobFiltersProps {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
}

export default function JobFiltersPanel({ filters, onChange }: JobFiltersProps) {
  const [open, setOpen] = useState(false);
  const selectedSkills = filters.skills ?? [];

  function toggleSkill(skill: string) {
    const next = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    onChange({ ...filters, skills: next.length ? next : undefined, page: 1 });
  }

  function setBudgetMin(value: string) {
    const num = value ? Number(value) : undefined;
    onChange({ ...filters, min_budget: num, page: 1 });
  }

  function setBudgetMax(value: string) {
    const num = value ? Number(value) : undefined;
    onChange({ ...filters, max_budget: num, page: 1 });
  }

  function clearAll() {
    onChange({ page: 1, limit: filters.limit });
  }

  const activeCount =
    (selectedSkills.length > 0 ? 1 : 0) +
    (filters.min_budget ? 1 : 0) +
    (filters.max_budget ? 1 : 0);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-semibold">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
          {/* Skills */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SKILLS.map((skill) => {
                const active = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget range */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Budget range</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.min_budget ?? ""}
                onChange={(e) => setBudgetMin(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500/40"
              />
              <span className="text-slate-500 text-xs">&ndash;</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.max_budget ?? ""}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500/40"
              />
            </div>
          </div>

          {/* Clear */}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
