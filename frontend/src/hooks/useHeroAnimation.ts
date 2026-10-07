import { useLayoutEffect, useRef } from "react";
import { gsap } from "../lib/gsap";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Page-load entrance for the hero: eyebrow → heading → subheading → CTAs
 * → visual, each staggered slightly behind the last. Transform/opacity
 * only. Returns refs to attach to each piece.
 */
export function useHeroAnimation() {
  const scope = useRef<HTMLDivElement | null>(null);
  const eyebrowRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const subheadingRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const visualRef = useRef<HTMLDivElement | null>(null);

  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (eyebrowRef.current) {
        tl.from(eyebrowRef.current, { opacity: 0, y: 10, duration: 0.5 });
      }
      if (headingRef.current) {
        // Heading slides up while fading — the signature "premium SaaS" beat
        tl.from(
          headingRef.current,
          { opacity: 0, y: 28, duration: 0.75 },
          "-=0.25"
        );
      }
      if (subheadingRef.current) {
        tl.from(
          subheadingRef.current,
          { opacity: 0, y: 16, duration: 0.6 },
          "-=0.35"
        );
      }
      if (ctaRef.current) {
        const buttons = ctaRef.current.children;
        tl.from(
          buttons,
          { opacity: 0, y: 14, duration: 0.5, stagger: 0.08 },
          "-=0.3"
        );
      }
      if (visualRef.current) {
        tl.from(
          visualRef.current,
          { opacity: 0, y: 20, scale: 0.98, duration: 0.9 },
          "-=0.5"
        );

        // Gentle infinite float, starts once the entrance settles
        gsap.to(visualRef.current, {
          y: "-=10",
          duration: 3.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: 1.2,
        });
      }
    }, scope);

    return () => ctx.revert();
  }, [reducedMotion]);

  return { scope, eyebrowRef, headingRef, subheadingRef, ctaRef, visualRef };
}
