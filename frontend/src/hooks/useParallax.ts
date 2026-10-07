import { useEffect, useRef } from "react";
import { gsap } from "../lib/gsap";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Subtle parallax on pointer movement, scoped to a container. Attach the
 * returned `scope` ref to the area that should track the pointer, and
 * `target` to the element that should shift (usually the hero visual or
 * background glow). Movement is small and eased — this is atmosphere,
 * not a game.
 */
export function useParallax(strength = 14) {
  const scope = useRef<HTMLDivElement | null>(null);
  const target = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const el = scope.current;
    const moveTarget = target.current;
    if (!el || !moveTarget) return;

    const quickX = gsap.quickTo(moveTarget, "x", {
      duration: 0.9,
      ease: "power3.out",
    });
    const quickY = gsap.quickTo(moveTarget, "y", {
      duration: 0.9,
      ease: "power3.out",
    });

    function handlePointerMove(e: PointerEvent) {
      const rect = el!.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      quickX(relX * strength);
      quickY(relY * strength);
    }

    function handlePointerLeave() {
      quickX(0);
      quickY(0);
    }

    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerleave", handlePointerLeave);
    return () => {
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [strength, reducedMotion]);

  return { scope, target };
}
