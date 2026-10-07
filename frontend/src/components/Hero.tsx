import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useHeroAnimation } from "../hooks/useHeroAnimation";
import { useParallax } from "../hooks/useParallax";
import { gsap } from "../lib/gsap";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

export function Hero() {
  const { scope, eyebrowRef, headingRef, subheadingRef, ctaRef, visualRef } =
    useHeroAnimation();
  const { scope: parallaxScope, target: parallaxTarget } = useParallax(10);
  const scanRef = useRef<HTMLDivElement | null>(null);
  const resumeRef = useRef<HTMLDivElement | null>(null);
  const siteRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  // The signature moment: a scanline sweeps down the resume card; as it
  // passes, the resume dissolves and the live site mockup takes its place.
  // Loops slowly and quietly — this is the whole product in four seconds.
  useLayoutEffect(() => {
    if (reducedMotion) return;
    if (!scanRef.current || !resumeRef.current || !siteRef.current) return;

    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 1.4,
      delay: 2,
      defaults: { ease: "power2.inOut" },
    });

    tl.set(scanRef.current, { top: "0%", opacity: 1 })
      .set(siteRef.current, { opacity: 0 })
      .set(resumeRef.current, { opacity: 1 })
      .to(scanRef.current, { top: "100%", duration: 2.2 })
      .to(resumeRef.current, { opacity: 0, duration: 0.6 }, "-=0.9")
      .to(siteRef.current, { opacity: 1, duration: 0.6 }, "-=0.6")
      .to(scanRef.current, { opacity: 0, duration: 0.3 })
      .to({}, { duration: 1.6 }); // hold on the finished site

    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  return (
    <section id="top" className="hero" ref={scope}>
      <div className="hero__aurora" aria-hidden="true" />
      <div className="container hero__inner">
        <div className="hero__copy">
          <div className="eyebrow" ref={eyebrowRef}>
            resume.pdf → deployed
          </div>
          <h1 ref={headingRef} className="hero__heading">
            Your resume, rebuilt as a site worth sharing.
          </h1>
          <p ref={subheadingRef} className="hero__subheading">
            Upload a resume. Forge writes the copy, designs the layout, and
            ships it to a live URL — usually before your coffee's done.
          </p>
          <div ref={ctaRef} className="hero__cta">
            <Link to="/generate" className="btn btn--primary btn--lg">
              Upload your resume
              <span className="btn__arrow" aria-hidden="true">→</span>
            </Link>
            <a href="#how-it-works" className="btn btn--ghost btn--lg">
              See how it works
            </a>
          </div>
        </div>

        <div className="hero__visual" ref={visualRef}>
          <div className="hero__parallax" ref={parallaxScope}>
            <div className="hero__morph-frame" ref={parallaxTarget}>
              <div className="morph-card morph-card--resume" ref={resumeRef}>
                <div className="morph-card__header">
                  <span className="morph-dot" />
                  resume.pdf
                </div>
                <div className="morph-card__body">
                  <div className="morph-line morph-line--name" />
                  <div className="morph-line morph-line--role" />
                  <div className="morph-block" />
                  <div className="morph-line morph-line--sm" />
                  <div className="morph-line morph-line--sm" />
                  <div className="morph-line morph-line--sm short" />
                </div>
              </div>

              <div className="morph-card morph-card--site" ref={siteRef}>
                <div className="morph-card__header">
                  <span className="morph-dot morph-dot--live" />
                  yourname.forge.site
                </div>
                <div className="morph-card__body morph-card__body--site">
                  <div className="site-hero" />
                  <div className="site-grid">
                    <div className="site-tile" />
                    <div className="site-tile" />
                    <div className="site-tile" />
                  </div>
                </div>
              </div>

              <div className="morph-scanline" ref={scanRef} aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
