import { useRef, useState } from "react";
import { gsap } from "../lib/gsap";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { useRevealAnimation } from "../hooks/useRevealAnimation";

const FAQS = [
  {
    q: "What file formats does Forge accept?",
    a: "PDF and DOCX. If your resume is in another format, export it to PDF first — most word processors and Google Docs can do this in a couple of clicks.",
  },
  {
    q: "Can I edit the site after it's generated?",
    a: "Yes. Every section — copy, layout, and images — can be edited or regenerated individually after the first build, on the Pro and Career plans.",
  },
  {
    q: "Does Forge write the copy, or just the design?",
    a: "Both. Forge reads your resume and writes site-appropriate copy for each section, then designs the layout and styling to match your field.",
  },
  {
    q: "Where does my site get hosted?",
    a: "On a Forge subdomain by default (yourname.forge.site), or your own custom domain on the Pro plan and above.",
  },
  {
    q: "Is my resume data kept private?",
    a: "Your resume is used only to generate your site and is never shared with third parties or used to train models without your consent.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (!bodyRef.current) return;

    if (reducedMotion) {
      gsap.set(bodyRef.current, { height: next ? "auto" : 0 });
      if (iconRef.current) gsap.set(iconRef.current, { rotate: next ? 45 : 0 });
      return;
    }

    if (next) {
      gsap.fromTo(
        bodyRef.current,
        { height: 0 },
        { height: "auto", duration: 0.4, ease: "power2.out" }
      );
    } else {
      gsap.to(bodyRef.current, { height: 0, duration: 0.3, ease: "power2.in" });
    }
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        rotate: next ? 45 : 0,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  }

  return (
    <div className={`faq-item${open ? " faq-item--open" : ""}`}>
      <button
        className="faq-item__question"
        onClick={toggle}
        aria-expanded={open}
      >
        <span>{q}</span>
        <span className="faq-item__icon" ref={iconRef}>+</span>
      </button>
      <div className="faq-item__body" ref={bodyRef}>
        <p>{a}</p>
      </div>
    </div>
  );
}

export function FAQ() {
  const scope = useRevealAnimation({ itemsSelector: ".faq-item", y: 14, stagger: 0.05 });

  return (
    <section id="faq" className="faq">
      <div className="container">
        <div className="section-heading">
          <div className="eyebrow">FAQ</div>
          <h2>Good to know.</h2>
        </div>
        <div className="faq-list" ref={scope as React.RefObject<HTMLDivElement>}>
          {FAQS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
