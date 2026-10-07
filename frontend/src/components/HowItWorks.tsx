import { useScrollTimeline } from "../hooks/useScrollTimeline";

// Structure device: the pipeline's own artifact names, not generic
// "01 / 02 / 03" markers — these are the literal filenames Forge produces
// at each stage, so the labels carry real information about the process.
const STAGES = [
  { file: "resume.pdf", label: "Upload", detail: "Drop in your resume, any format." },
  { file: "architecture.json", label: "Plan", detail: "Forge maps your sections and structure." },
  { file: "index.html", label: "Build", detail: "Layout and copy, written for you." },
  { file: "styles.css", label: "Style", detail: "A visual identity matched to your field." },
  { file: "script.js", label: "Animate", detail: "Interactions and polish, applied." },
  { file: "deployed ✓", label: "Ship", detail: "Live at a URL you can share today." },
];

export function HowItWorks() {
  const scope = useScrollTimeline("[data-pipeline-node]", "[data-pipeline-line]");

  return (
    <section id="how-it-works" className="how-it-works">
      <div className="container">
        <div className="section-heading">
          <div className="eyebrow">The pipeline</div>
          <h2>Six stages. One upload.</h2>
          <p className="section-heading__sub">
            Every resume goes through the same pipeline Forge uses to ship
            your site — no templates picked, no drag-and-drop required.
          </p>
        </div>

        <div className="pipeline" ref={scope as React.RefObject<HTMLDivElement>}>
          {STAGES.map((stage, i) => (
            <div className="pipeline__step" key={stage.file}>
              <div className="pipeline__node" data-pipeline-node>
                <div className="pipeline__icon" data-node-icon>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="pipeline__text">
                  <span className="pipeline__label">{stage.label}</span>
                  <code className="pipeline__file">{stage.file}</code>
                  <p className="pipeline__detail">{stage.detail}</p>
                </div>
              </div>
              {i < STAGES.length - 1 && (
                <div className="pipeline__line" data-pipeline-line />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
