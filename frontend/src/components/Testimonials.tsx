const QUOTES = [
  {
    quote:
      "Uploaded my resume on a Sunday night, had a live site before I finished my coffee Monday.",
    name: "Priya N.",
    role: "Backend Engineer",
  },
  {
    quote:
      "The copy actually sounded like me. I only had to change two lines before sharing it.",
    name: "Marcus T.",
    role: "Product Designer",
  },
  {
    quote:
      "Recruiters started replying faster once I had a real site instead of just a PDF attached.",
    name: "Ines D.",
    role: "Data Analyst",
  },
  {
    quote:
      "I've rebuilt my portfolio three times by hand. This took four minutes and looked better.",
    name: "Sam O.",
    role: "Frontend Developer",
  },
];

// Duplicated once so the CSS keyframe can loop seamlessly at -50%.
const LOOPED = [...QUOTES, ...QUOTES];

export function Testimonials() {
  return (
    <section className="testimonials" aria-label="What people are saying">
      <div className="testimonials__fade testimonials__fade--left" aria-hidden="true" />
      <div className="testimonials__fade testimonials__fade--right" aria-hidden="true" />
      <div className="testimonials__track">
        {LOOPED.map((t, i) => (
          <figure className="testimonial-card" key={`${t.name}-${i}`}>
            <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
            <figcaption>
              <span className="testimonial-card__name">{t.name}</span>
              <span className="testimonial-card__role">{t.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
