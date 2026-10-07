import { Link } from "react-router-dom";
import { useRevealAnimation } from "../hooks/useRevealAnimation";

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "One site, to see if it's for you.",
    features: ["1 generated site", "Forge subdomain", "Core sections", "Community support"],
    featured: false,
  },
  {
    name: "Pro",
    price: "₹499",
    period: "/month",
    description: "For an active job search.",
    features: [
      "Unlimited regenerations",
      "Custom domain",
      "Priority build queue",
      "Section-level editing",
      "Email support",
    ],
    featured: true,
  },
  {
    name: "Career",
    price: "₹1,999",
    period: "/year",
    description: "One price, renewed yearly.",
    features: [
      "Everything in Pro",
      "Version history",
      "Analytics on your site",
      "Priority support",
    ],
    featured: false,
  },
];

export function Pricing() {
  const scope = useRevealAnimation({
    itemsSelector: ".pricing-card",
    y: 20,
    scaleFrom: 0.97,
  });

  return (
    <section id="pricing" className="pricing">
      <div className="container">
        <div className="section-heading">
          <div className="eyebrow">Pricing</div>
          <h2>Simple, while you're job hunting.</h2>
        </div>

        <div className="pricing-grid" ref={scope as React.RefObject<HTMLDivElement>}>
          {PLANS.map((plan) => (
            <div
              className={`pricing-card${plan.featured ? " pricing-card--featured" : ""}`}
              key={plan.name}
            >
              {plan.featured && <span className="pricing-card__badge">Most popular</span>}
              <h3>{plan.name}</h3>
              <p className="pricing-card__description">{plan.description}</p>
              <div className="pricing-card__price">
                <span className="pricing-card__amount">{plan.price}</span>
                <span className="pricing-card__period">{plan.period}</span>
              </div>
              <ul className="pricing-card__features">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link
                to="/generate"
                className={`btn ${plan.featured ? "btn--primary" : "btn--ghost"} btn--block`}
              >
                {plan.featured ? "Start with Pro" : "Get started"}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
