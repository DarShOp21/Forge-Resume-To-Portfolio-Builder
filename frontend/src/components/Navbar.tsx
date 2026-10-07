import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap, ScrollTrigger, ensureGsapRegistered } from "../lib/gsap";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const navRef = useRef<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Transparent -> blurred glass, driven by scroll position, not by class
  // toggling on every scroll event — ScrollTrigger only touches the DOM
  // (via the .is-scrolled class) when it actually crosses the threshold.
  useLayoutEffect(() => {
    if (!navRef.current) return;
    ensureGsapRegistered();
    const st = ScrollTrigger.create({
      start: 8,
      onUpdate: (self) => {
        navRef.current?.classList.toggle("is-scrolled", self.scroll() > 8);
      },
    });
    return () => st.kill();
  }, []);

  useLayoutEffect(() => {
    if (!mobileMenuRef.current) return;

    if (reducedMotion) {
      gsap.set(mobileMenuRef.current, { height: menuOpen ? "auto" : 0 });
      return;
    }

    const tl = gsap.timeline();
    if (menuOpen) {
      tl.set(mobileMenuRef.current, { display: "flex" }).fromTo(
        mobileMenuRef.current,
        { height: 0, opacity: 0 },
        { height: "auto", opacity: 1, duration: 0.4, ease: "power2.out" }
      );
      const items = mobileMenuRef.current.querySelectorAll("a");
      tl.from(
        items,
        { opacity: 0, y: 8, duration: 0.3, stagger: 0.05 },
        "-=0.2"
      );
    } else {
      tl.to(mobileMenuRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
      }).set(mobileMenuRef.current, { display: "none" });
    }
    return () => {
      tl.kill();
    };
  }, [menuOpen, reducedMotion]);

  return (
    <header ref={navRef} className="navbar">
      <div className="container navbar__inner">
        <a href="#top" className="navbar__brand">
          <span className="navbar__mark" aria-hidden="true" />
          Forge
        </a>

        <nav className="navbar__links" aria-label="Primary">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="navbar__link">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="navbar__actions">
          <a href="#waitlist" className="btn btn--ghost">
            Sign in
          </a>
          <Link to="/generate" className="btn btn--primary">
            Get started
          </Link>
        </div>

        <button
          className="navbar__burger"
          aria-expanded={menuOpen}
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </div>

      <div ref={mobileMenuRef} className="navbar__mobile-menu">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </a>
        ))}
        <Link
          to="/generate"
          className="btn btn--primary"
          onClick={() => setMenuOpen(false)}
        >
          Get started
        </Link>
      </div>
    </header>
  );
}
