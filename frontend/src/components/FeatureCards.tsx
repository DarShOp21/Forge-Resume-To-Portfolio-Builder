import { useEffect, useRef } from "react";
import { useRevealAnimation } from "../hooks/useRevealAnimation";
import { gsap } from "../lib/gsap";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

const FEATURES = [
  {
    title: "Written for you",
    body: "Forge reads your resume like a hiring manager would, then writes site copy that actually sounds like you — not a mad-lib template.",
  },
  {
    title: "Matched to your field",
    body: "A backend engineer's site and a product designer's site shouldn't look the same. Layout and tone shift to fit what you do.",
  },
  {
    title: "Live in minutes",
    body: "No domain shopping, no hosting setup. Forge deploys straight to a shareable URL the moment it's done building.",
  },
  {
    title: "Yours to edit",
    body: "Swap a section, tweak a line, regenerate a page — the site stays yours to adjust long after the first deploy.",
  },
];

export function FeatureCards() {
  const scope = useRevealAnimation({ itemsSelector: ".feature-card", y: 22 });
  const reducedMotion = usePrefersReducedMotion();
  const settledRef = useRef(false);

  // Tilt is the one signature hover treatment on this page — gate it
  // behind the entrance animation finishing so a card isn't fighting its
  // own reveal and a mouse-driven tilt at the same time.
  useEffect(() => {
    const timer = setTimeout(() => {
      settledRef.current = true;
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotion || !settledRef.current) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(card, {
      rotateX: relY * -6,
      rotateY: relX * 8,
      duration: 0.4,
      ease: "power2.out",
      transformPerspective: 700,
    });
  }

  function handleLeave(e: React.PointerEvent<HTMLDivElement>) {
    gsap.to(e.currentTarget, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.6,
      ease: "power3.out",
    });
  }

  return (
    <section id="features" className="feature-section">
      <div className="container">
        <div className="section-heading">
          <div className="eyebrow">Why Forge</div>
          <h2>Built like a person made it — because one did the writing.</h2>
        </div>

        <div className="feature-grid" ref={scope as React.RefObject<HTMLDivElement>}>
          {FEATURES.map((f) => (
            <div
              className="feature-card"
              key={f.title}
              onPointerMove={handleMove}
              onPointerLeave={handleLeave}
            >
              <div className="feature-card__glow" aria-hidden="true" />
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
