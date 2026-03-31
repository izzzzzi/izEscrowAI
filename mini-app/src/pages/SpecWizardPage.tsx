import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSpec, generateSpecAI } from "../lib/api";
import AppHeader from "../components/AppHeader";
import PriceRange from "../components/PriceRange";
import SpecChecklist from "../components/SpecChecklist";
import { useT } from "../i18n/context";
import Icon from "../components/Icon";

interface Requirement {
  description: string;
  acceptance_criteria: string[];
}

interface GeneratedResult {
  title: string;
  category: string;
  requirements: string[];
  budget_range: { min: number; max: number; currency: string } | null;
}

const CURRENCIES = ["USD", "EUR", "TON", "USDT", "RUB"];

export default function SpecWizardPage() {
  const navigate = useNavigate();
  const t = useT();
  const [step, setStep] = useState(1);

  // Step 1
  const [description, setDescription] = useState("");

  // Step 2 — AI generated
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);

  // Step 3
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [deadline, setDeadline] = useState("");

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 -> Step 2: Generate spec via AI
  const handleGenerate = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setQuestions([]);
    try {
      const result = await generateSpecAI(description);
      if (result.type === "questions") {
        setQuestions(result.questions);
      } else {
        const spec = result as GeneratedResult & { type: "spec" };
        setTitle(spec.title);
        setCategory(spec.category);
        setRequirements(
          spec.requirements.map((r: string) => ({
            description: r,
            acceptance_criteria: [],
          })),
        );
        if (spec.budget_range) {
          setBudgetMin(String(spec.budget_range.min));
          setBudgetMax(String(spec.budget_range.max));
          setCurrency(spec.budget_range.currency);
        }
        setStep(2);
      }
    } catch (e: any) {
      setError(e.message || t("spec.error.generateFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Edit requirement
  const updateRequirement = (idx: number, field: keyof Requirement, value: string | string[]) => {
    setRequirements((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  };

  const addRequirement = () => {
    setRequirements((prev) => [...prev, { description: "", acceptance_criteria: [] }]);
  };

  const removeRequirement = (idx: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== idx));
  };

  // Add acceptance criterion to a requirement
  const addCriterion = (reqIdx: number) => {
    setRequirements((prev) =>
      prev.map((r, i) =>
        i === reqIdx ? { ...r, acceptance_criteria: [...r.acceptance_criteria, ""] } : r,
      ),
    );
  };

  const updateCriterion = (reqIdx: number, critIdx: number, value: string) => {
    setRequirements((prev) =>
      prev.map((r, i) =>
        i === reqIdx
          ? {
              ...r,
              acceptance_criteria: r.acceptance_criteria.map((c, j) =>
                j === critIdx ? value : c,
              ),
            }
          : r,
      ),
    );
  };

  const removeCriterion = (reqIdx: number, critIdx: number) => {
    setRequirements((prev) =>
      prev.map((r, i) =>
        i === reqIdx
          ? { ...r, acceptance_criteria: r.acceptance_criteria.filter((_, j) => j !== critIdx) }
          : r,
      ),
    );
  };

  // Step 4: Submit
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const spec = await createSpec({
        title,
        category,
        requirements,
        budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
        budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
        budget_currency: currency,
      });
      navigate(`/spec/${spec.id}`, { replace: true });
    } catch (e: any) {
      setError(e.message || t("spec.error.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = [t("spec.step.describe"), t("spec.step.requirements"), t("spec.step.budget"), t("spec.step.review")];

  return (
    <div className="mini-page">
      <AppHeader />
      <main className="px-5 pb-32 space-y-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-widest pl-1">
          {t("spec.pageTitle")}
        </h2>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {stepLabels.map((label, i) => {
            const s = i + 1;
            const active = s === step;
            const done = s < step;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    active
                      ? "bg-gradient-to-r from-[#0098EA] to-[#00D1FF] text-white"
                      : done
                      ? "bg-green-500/20 text-green-400 border border-green-500/20"
                      : "bg-white/5 text-slate-500 border border-white/10"
                  }`}
                >
                  {done ? (
                    <Icon icon="solar:check-read-linear" size={14} />
                  ) : (
                    s
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium tracking-wide hidden sm:block ${
                    active ? "text-white" : "text-slate-500"
                  }`}
                >
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <div className={`flex-1 h-px ${done ? "bg-green-500/30" : "bg-white/5"}`} />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Step 1: Describe */}
        {step === 1 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-1">{t("spec.describe.title")}</h3>
              <p className="text-xs text-slate-400">
                {t("spec.describe.subtitle")}
              </p>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("spec.describe.placeholder")}
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#0098EA]/50 resize-none placeholder:text-slate-600"
            />

            {/* AI clarifying questions */}
            {questions.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
                <p className="text-xs font-medium text-amber-400">
                  <Icon icon="solar:chat-round-dots-linear" size={14} />{" "}
                  {t("spec.describe.aiQuestions")}
                </p>
                <ul className="space-y-1.5">
                  {questions.map((q, i) => (
                    <li key={i} className="text-sm text-slate-300 pl-4 relative">
                      <span className="absolute left-0 text-amber-400/60">{i + 1}.</span>
                      {q}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-slate-500">
                  {t("spec.describe.updateHint")}
                </p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!description.trim() || loading}
              className="w-full ton-gradient py-3 rounded-xl text-sm font-medium cursor-pointer border-none text-white disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Icon icon="solar:refresh-linear" size={16} className="animate-spin" />
                  {t("spec.describe.generating")}
                </>
              ) : (
                <>
                  <Icon icon="solar:magic-stick-3-linear" size={16} />
                  {t("spec.describe.generateBtn")}
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Requirements */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">{t("spec.req.projectTitle")}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#0098EA]/50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">{t("spec.req.category")}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#0098EA]/50 appearance-none"
                >
                  {["frontend", "backend", "mobile", "blockchain", "devops", "data", "design", "ai", "fullstack", "other"].map(
                    (c) => (
                      <option key={c} value={c} className="bg-[#0f172a] text-white">
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-300">{t("spec.req.requirements")}</h3>
                <button
                  onClick={addRequirement}
                  className="text-xs text-[#0098EA] bg-transparent border-none cursor-pointer flex items-center gap-1"
                >
                  <Icon icon="solar:add-circle-linear" size={14} />
                  {t("spec.req.add")}
                </button>
              </div>

              {requirements.map((req, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/5">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-slate-500 font-mono mt-3 shrink-0">#{i + 1}</span>
                    <input
                      type="text"
                      value={req.description}
                      onChange={(e) => updateRequirement(i, "description", e.target.value)}
                      placeholder={t("spec.req.placeholder")}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#0098EA]/50"
                    />
                    <button
                      onClick={() => removeRequirement(i)}
                      className="text-red-400/60 hover:text-red-400 bg-transparent border-none cursor-pointer mt-2"
                    >
                      <Icon icon="solar:trash-bin-minimalistic-linear" size={14} />
                    </button>
                  </div>

                  {/* Acceptance criteria */}
                  <div className="ml-6 space-y-2">
                    {req.acceptance_criteria.map((c, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span className="text-slate-600 text-xs">-</span>
                        <input
                          type="text"
                          value={c}
                          onChange={(e) => updateCriterion(i, j, e.target.value)}
                          placeholder={t("spec.req.criterionPlaceholder")}
                          className="flex-1 bg-transparent border-b border-white/5 px-1 py-1 text-xs text-slate-300 outline-none focus:border-[#0098EA]/30"
                        />
                        <button
                          onClick={() => removeCriterion(i, j)}
                          className="text-slate-600 hover:text-red-400 bg-transparent border-none cursor-pointer"
                        >
                          <Icon icon="solar:close-circle-linear" size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addCriterion(i)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer flex items-center gap-1"
                    >
                      <Icon icon="solar:add-circle-linear" size={12} />
                      {t("spec.req.addCriterion")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer border border-white/10 text-slate-300 bg-transparent"
              >
                {t("spec.btn.back")}
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!title.trim() || requirements.length === 0}
                className="flex-1 ton-gradient py-3 rounded-xl text-sm font-medium cursor-pointer border-none text-white disabled:opacity-50 whitespace-nowrap"
              >
                {t("spec.btn.next")}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Budget & Deadline */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-medium">{t("spec.budget.title")}</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">{t("spec.budget.min")}</label>
                  <input
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder={t("spec.budget.minPlaceholder")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#0098EA]/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">{t("spec.budget.max")}</label>
                  <input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder={t("spec.budget.maxPlaceholder")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#0098EA]/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">{t("spec.budget.currency")}</label>
                <div className="flex gap-2 flex-wrap">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-colors ${
                        currency === c
                          ? "bg-[#0098EA]/20 text-[#0098EA]"
                          : "bg-white/5 text-slate-400"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget visualization */}
              {budgetMin && budgetMax && parseFloat(budgetMin) < parseFloat(budgetMax) && (
                <div className="pt-2">
                  <PriceRange
                    min={parseFloat(budgetMin)}
                    max={parseFloat(budgetMax)}
                    median={Math.round((parseFloat(budgetMin) + parseFloat(budgetMax)) / 2)}
                    currency={currency}
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 mb-1 block">{t("spec.budget.deadline")}</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#0098EA]/50"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer border border-white/10 text-slate-300 bg-transparent"
              >
                {t("spec.btn.back")}
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 ton-gradient py-3 rounded-xl text-sm font-medium cursor-pointer border-none text-white whitespace-nowrap"
              >
                {t("spec.btn.review")}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-medium">{title}</h3>
              <span className="inline-block px-2 py-0.5 rounded-full bg-[#0098EA]/10 text-[#0098EA] text-[10px] font-medium uppercase">
                {category}
              </span>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">
                  {t("spec.review.requirements")}
                </p>
                <SpecChecklist requirements={requirements} />
              </div>

              {(budgetMin || budgetMax) && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">
                    {t("spec.review.budget")}
                  </p>
                  {budgetMin && budgetMax ? (
                    <PriceRange
                      min={parseFloat(budgetMin)}
                      max={parseFloat(budgetMax)}
                      median={Math.round((parseFloat(budgetMin) + parseFloat(budgetMax)) / 2)}
                      currency={currency}
                    />
                  ) : (
                    <p className="text-sm text-white">
                      {budgetMin || budgetMax} {currency}
                    </p>
                  )}
                </div>
              )}

              {deadline && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">
                    {t("spec.review.deadline")}
                  </p>
                  <p className="text-sm text-white">{deadline}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer border border-white/10 text-slate-300 bg-transparent"
              >
                {t("spec.btn.back")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 ton-gradient py-3 rounded-xl text-sm font-medium cursor-pointer border-none text-white disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {submitting ? (
                  <>
                    <Icon icon="solar:refresh-linear" size={16} className="animate-spin" />
                    {t("spec.btn.creating")}
                  </>
                ) : (
                  <>
                    <Icon icon="solar:check-read-linear" size={16} />
                    {t("spec.btn.createSpec")}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
