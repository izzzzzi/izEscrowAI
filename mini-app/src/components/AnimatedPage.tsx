import { useEffect, useRef, type ReactNode } from "react";

export default function AnimatedPage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("page-enter");
    requestAnimationFrame(() => {
      el.classList.add("page-enter-active");
      el.classList.remove("page-enter");
    });
  }, []);

  return <div ref={ref}>{children}</div>;
}
