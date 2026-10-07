import { useLayoutEffect, useRef } from "react";
import { gsap, ensureGsapRegistered } from "../lib/gsap";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Builds a scroll-scrubbed timeline across a section: as the section moves
 * through the viewport, each pipeline node appears in turn and the
 * connecting line to it draws progressively (via a clip-path / scaleY,
 * transform-only — no stroke-dashoffset layout recalculation).
 *
 * Expects, inside the scoped container:
 *  - elements matching `nodeSelector`, in document order
 *  - elements matching `lineSelector`, one fewer than nodes, in order
 */
export function useScrollTimeline(nodeSelector: string, lineSelector: string) {
  const scope = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (!scope.current) return;

    const nodes = scope.current.querySelectorAll(nodeSelector);
    const lines = scope.current.querySelectorAll(lineSelector);

    if (reducedMotion) {
      gsap.set(nodes, { opacity: 1, y: 0, scale: 1, rotate: 0 });
      gsap.set(lines, { scaleY: 1, scaleX: 1 });
      return;
    }

    ensureGsapRegistered();

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scope.current,
          start: "top 70%",
          end: "bottom 60%",
          scrub: 0.6,
        },
      });

      nodes.forEach((node, i) => {
        tl.from(
          node,
          {
            opacity: 0,
            y: 18,
            duration: 0.4,
          },
          i * 0.5
        );
        // Icon settles with a slight rotation-in, not a spin — restrained
        const icon = node.querySelector<HTMLElement>("[data-node-icon]");
        if (icon) {
          tl.from(icon, { rotate: -8, duration: 0.4 }, i * 0.5);
        }
        const connector = lines[i];
        if (connector) {
          tl.from(
            connector,
            { scaleX: 0, transformOrigin: "left center", duration: 0.4 },
            i * 0.5 + 0.2
          );
        }
      });
    }, scope);

    return () => ctx.revert();
  }, [nodeSelector, lineSelector, reducedMotion]);

  return scope;
}
