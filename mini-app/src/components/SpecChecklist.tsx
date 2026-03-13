interface Requirement {
  description: string;
  acceptance_criteria: string[];
  status?: "met" | "partial" | "not_met";
}

interface SpecChecklistProps {
  requirements: Requirement[];
}

function StatusIcon({ status }: { status?: "met" | "partial" | "not_met" }) {
  if (!status) return null;

  if (status === "met") {
    return (
      <iconify-icon
        icon="solar:check-circle-linear"
        width="16"
        class="text-green-400"
      />
    );
  }
  if (status === "partial") {
    return (
      <iconify-icon
        icon="solar:danger-triangle-linear"
        width="16"
        class="text-amber-400"
      />
    );
  }
  return (
    <iconify-icon
      icon="solar:close-circle-linear"
      width="16"
      class="text-red-400"
    />
  );
}

export default function SpecChecklist({ requirements }: SpecChecklistProps) {
  if (!requirements || requirements.length === 0) {
    return (
      <div className="text-sm text-slate-500 text-center py-4">
        No requirements defined
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requirements.map((req, i) => (
        <div
          key={i}
          className="bg-white/5 rounded-xl p-4 border border-white/5"
        >
          {/* Requirement header */}
          <div className="flex items-start gap-2 mb-2">
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 shrink-0">
              #{i + 1}
            </span>
            <p className="text-sm text-white font-medium flex-1">{req.description}</p>
            <StatusIcon status={req.status} />
          </div>

          {/* Acceptance criteria */}
          {req.acceptance_criteria.length > 0 && (
            <div className="ml-5 space-y-1.5">
              {req.acceptance_criteria.map((criterion, j) => (
                <label
                  key={j}
                  className="flex items-start gap-2 text-xs text-slate-400 cursor-default"
                >
                  <input
                    type="checkbox"
                    checked={req.status === "met"}
                    readOnly
                    className="mt-0.5 accent-[#0098EA] pointer-events-none"
                  />
                  <span>{criterion}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
