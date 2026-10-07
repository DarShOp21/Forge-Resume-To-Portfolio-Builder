import { useLayoutEffect, useRef } from "react";
import { gsap, ensureGsapRegistered } from "../lib/gsap";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface RevealOptions {
  /** CSS selector, scoped to the returned ref, for the items to stagger in. */
  itemsSelector: string;
  y?: number;
  stagger?: number;
  duration?: number;
  /** Scale-in instead of / in addition to translateY (used sparingly — pricing's featured card). */
  scaleFrom?: number;
}

/**
 * Scroll-triggered reveal: fade + translateY (+ optional scale), staggered
 * across matched children. One ScrollTrigger per section, killed on unmount.
 */
export function useRevealAnimation({
  itemsSelector,
  y = 24,
  stagger = 0.08,
  duration = 0.7,
  scaleFrom,
}: RevealOptions) {
  const scope = useRef<HTMLElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (!scope.current) return;

    if (reducedMotion) {
      // Land in final state immediately, no animation constructed.
      gsap.set(scope.current.querySelectorAll(itemsSelector), {
        opacity: 1,
        y: 0,
        scale: 1,
      });
      return;
    }

    ensureGsapRegistered();

    const ctx = gsap.context(() => {
      const items = scope.current!.querySelectorAll(itemsSelector);
      if (!items.length) return;

      gsap.from(items, {
        opacity: 0,
        y,
        scale: scaleFrom ?? 1,
        duration,
        stagger,
        ease: "power3.out",
        scrollTrigger: {
          trigger: scope.current,
          start: "top 78%",
          once: true,
        },
      });
    }, scope);

    return () => ctx.revert();
  }, [itemsSelector, y, stagger, duration, scaleFrom, reducedMotion]);

  return scope;
}
