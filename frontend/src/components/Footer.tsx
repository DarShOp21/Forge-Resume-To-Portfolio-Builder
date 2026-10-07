import { Link } from "react-router-dom";
import { useRevealAnimation } from "../hooks/useRevealAnimation";

export function Footer() {
  const scope = useRevealAnimation({ itemsSelector: ".footer__col", y: 16, stagger: 0.06 });

  return (
    <footer id="waitlist" className="footer" ref={scope as React.RefObject<HTMLElement>}>
      <div className="footer__glow" aria-hidden="true" />
      <div className="container footer__inner">
        <div className="footer__col footer__col--cta">
          <h2>Your resume is already written. Let it do more.</h2>
          <Link to="/generate" className="btn btn--primary btn--lg">
            Upload your resume
          </Link>
        </div>

        <div className="footer__col footer__links">
          <div>
            <span className="footer__heading">Product</span>
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div>
            <span className="footer__heading">Company</span>
            <a href="#faq">FAQ</a>
            <a href="#top">Contact</a>
            <a href="#top">Privacy</a>
          </div>
        </div>

        <div className="footer__col footer__brand">
          <span className="navbar__mark" aria-hidden="true" />
          <span>Forge</span>
          <p className="footer__copyright">© {new Date().getFullYear()} Forge. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
