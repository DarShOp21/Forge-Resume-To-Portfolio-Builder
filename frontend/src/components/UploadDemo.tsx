import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "../lib/gsap";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

type Stage = "idle" | "dragging" | "parsing" | "done" | "error";

const PARSE_STEPS = ["Reading resume", "Mapping structure", "Writing your site"];
const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function UploadDemo() {
  const [stage, setStage] = useState<Stage>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [fileName, setFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const dropRef = useRef<HTMLDivElement | null>(null);
  const checkRef = useRef<SVGPathElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  function runParse(file: File) {
    setFileName(file.name);
    setStage("parsing");
    setStepIndex(0);
    const stepDuration = 900;
    PARSE_STEPS.forEach((_, i) => {
      setTimeout(() => setStepIndex(i), i * stepDuration);
    });
    setTimeout(() => {
      setStage("done");
      if (!reducedMotion && checkRef.current) {
        const length = checkRef.current.getTotalLength();
        gsap.fromTo(
          checkRef.current,
          { strokeDasharray: length, strokeDashoffset: length },
          { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }
        );
      }
    }, PARSE_STEPS.length * stepDuration);
  }

  function showError(message: string) {
    setErrorMessage(message);
    setStage("error");
    if (!reducedMotion && dropRef.current) {
      gsap.fromTo(
        dropRef.current,
        { x: -6 },
        { x: 0, duration: 0.4, ease: "elastic.out(1, 0.4)" }
      );
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return;

    if (!isAcceptedFile(file)) {
      showError("That file type isn't supported. Upload a PDF or DOCX.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      showError(
        `That file is ${formatSize(file.size)} — Forge accepts resumes up to 3MB.`
      );
      return;
    }
    runParse(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0]);
    // Reset so selecting the same file again still fires onChange
    e.target.value = "";
  }

  function reset() {
    setStage("idle");
    setErrorMessage("");
    setFileName("");
  }

  return (
    <section className="upload-demo">
      <div className="container">
        <div className="section-heading">
          <div className="eyebrow">Try it</div>
          <h2>This is the whole process.</h2>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleInputChange}
          className="upload-zone__input"
          aria-hidden="true"
          tabIndex={-1}
        />

        <div
          ref={dropRef}
          className={`upload-zone upload-zone--${stage}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (stage !== "parsing") setStage("dragging");
          }}
          onDragLeave={() => stage === "dragging" && setStage("idle")}
          onDrop={handleDrop}
        >
          {stage === "idle" && (
            <>
              <div className="upload-zone__icon">↑</div>
              <p className="upload-zone__title">Drag your resume here</p>
              <p className="upload-zone__hint">or</p>
              <button
                className="btn btn--primary"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose a file
              </button>
              <p className="upload-zone__format">PDF or DOCX, up to 3MB</p>
            </>
          )}

          {stage === "dragging" && (
            <>
              <div className="upload-zone__icon upload-zone__icon--active">↓</div>
              <p className="upload-zone__title">Drop it right here</p>
            </>
          )}

          {stage === "parsing" && (
            <div className="upload-progress">
              <div className="upload-progress__spinner" aria-hidden="true" />
              <p className="upload-progress__step">{PARSE_STEPS[stepIndex]}…</p>
              {fileName && <p className="upload-zone__filename">{fileName}</p>}
              <div className="upload-progress__bar">
                <div
                  className="upload-progress__fill"
                  style={{
                    width: `${((stepIndex + 1) / PARSE_STEPS.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {stage === "done" && (
            <div className="upload-success">
              <svg viewBox="0 0 52 52" className="upload-success__ring">
                <circle cx="26" cy="26" r="24" />
                <path
                  ref={checkRef}
                  d="M15 27l7 7 15-15"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="upload-zone__title">yourname.forge.site is live</p>
              <div className="upload-success__actions">
                <Link to="/generate" className="btn btn--primary">
                  Try it with your real resume
                </Link>
                <button className="btn btn--ghost" onClick={reset}>
                  Replay demo
                </button>
              </div>
            </div>
          )}

          {stage === "error" && (
            <div className="upload-error">
              <div className="upload-zone__icon upload-zone__icon--error">!</div>
              <p className="upload-zone__title">Couldn't use that file</p>
              <p className="upload-error__message">{errorMessage}</p>
              <button
                className="btn btn--ghost"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose another file
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
