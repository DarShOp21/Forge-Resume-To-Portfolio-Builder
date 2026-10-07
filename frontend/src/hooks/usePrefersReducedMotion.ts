import { useEffect, useState } from "react";

/**
 * Tracks the user's `prefers-reduced-motion` preference reactively.
 * GSAP hooks in this app check this value BEFORE building a timeline —
 * reduced motion means we skip constructing the animation entirely
 * (elements land in their final, visible state via CSS defaults)
 * rather than building it and trying to neuter it after the fact.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  return reduced;
}
