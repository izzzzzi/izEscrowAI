import { useState } from "react";
import { useT } from "../i18n/context";
import Icon from "./Icon";

interface Props {
  onComplete: () => void;
}

export default function OnboardingSlides({ onComplete }: Props) {
  const t = useT();
  const [current, setCurrent] = useState(0);

  const slides = [
    {
      icon: "solar:shield-check-bold",
      title: t("onboarding.slide1.title"),
      text: t("onboarding.slide1.text"),
      accent: "from-[#0098EA] to-[#0070B8]",
    },
    {
      icon: "solar:chat-round-dots-bold",
      title: t("onboarding.slide2.title"),
      text: t("onboarding.slide2.text"),
      accent: "from-[#0098EA] to-[#22d3ee]",
    },
    {
      icon: "solar:verified-check-bold",
      title: t("onboarding.slide3.title"),
      text: t("onboarding.slide3.text"),
      accent: "from-emerald-500 to-emerald-400",
    },
  ];
  const isLast = current === slides.length - 1;

  const next = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const slide = slides[current];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0f172a] text-white px-8 py-12"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Skip */}
      <div className="w-full flex justify-end">
        <button
          onClick={onComplete}
          className="text-xs text-slate-500 bg-transparent border-none cursor-pointer hover:text-slate-300 transition-colors"
        >
          {t("onboarding.skip")}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm">
        <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${slide.accent} flex items-center justify-center mb-8 animate-fade-up`}>
          <Icon icon={slide.icon} size={40} className="text-white" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight mb-3 animate-fade-up delay-100">
          {slide.title}
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed animate-fade-up delay-200">
          {slide.text}
        </p>
      </div>

      {/* Bottom: dots + button */}
      <div className="w-full max-w-sm space-y-6">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-[#0098EA]" : "w-1.5 bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={next}
          className="w-full py-4 rounded-2xl text-sm font-semibold text-white ton-gradient border-none cursor-pointer transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
        >
          {isLast ? t("onboarding.getStarted") : t("onboarding.next")}
        </button>
      </div>
    </div>
  );
}
