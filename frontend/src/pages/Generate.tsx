import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "../lib/gsap";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { useRunPolling } from "../hooks/useRunPolling";
import { uploadResume, triggerPortfolioBuild, STAGE_LABELS, type UploadMetadata } from "../lib/api";
import { AppHeader } from "../components/AppHeader";

type Stage = "idle" | "dragging" | "uploading" | "done" | "error";

const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export default function Generate() {
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [metadata, setMetadata] = useState<UploadMetadata | null>(null);
  const [copied, setCopied] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState("");
  const [runId, setRunId] = useState<string | null>(null);

  const { run, pollError } = useRunPolling(runId);

  const dropRef = useRef<HTMLDivElement | null>(null);
  const checkRef = useRef<SVGPathElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const navigate = useNavigate();

  useEffect(() => {
    if (run?.status === "COMPLETED" && runId) {
      navigate(`/site/${runId}`);
    }
  }, [run?.status, runId, navigate]);

  function playSuccessCheck() {
    if (reducedMotion || !checkRef.current) return;
    const length = checkRef.current.getTotalLength();
    gsap.fromTo(
      checkRef.current,
      { strokeDasharray: length, strokeDashoffset: length },
      { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }
    );
  }

  async function handleStartBuild() {
    setIsTriggering(true);
    setTriggerError("");
    try {
      const result = await triggerPortfolioBuild(uploadedUrl);
      setRunId(result.runId);
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : "Build failed.");
    } finally {
      setIsTriggering(false);
    }
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

  async function handleFile(file: File | undefined) {
    if (!file) return;

    // Client-side checks first — fast feedback without a round trip. The
    // worker re-validates both regardless, since these are trivial to bypass.
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

    setStage("uploading");
    try {
      const result = await uploadResume(file);
      setUploadedUrl(result.url);
      setMetadata(result.metadata);
      setStage("done");
      // Let the "done" markup mount before animating its check mark in.
      requestAnimationFrame(() => requestAnimationFrame(playSuccessCheck));
    } catch (err) {
      showError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    void handleFile(e.dataTransfer.files?.[0]);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    void handleFile(e.target.files?.[0]);
    e.target.value = "";
  }

  function reset() {
    setStage("idle");
    setErrorMessage("");
    setUploadedUrl("");
    setMetadata(null);
    setCopied(false);
    setRunId(null);
    setTriggerError("");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(uploadedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — link is still
      // visible and selectable, so this fails quietly rather than erroring.
    }
  }

  return (
    <>
      <AppHeader />
      <main className="generate-page">
        <div className="container generate-page__inner">
          {stage !== "done" && (
            <div className="generate-page__intro">
              <div className="eyebrow">Upload</div>
              <h1>Upload your resume.</h1>
              <p>
                Drop in a PDF or DOCX. It's stored securely and you'll get a
                link back.
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleInputChange}
            className="upload-zone__input"
            aria-hidden="true"
            tabIndex={-1}
          />

          {stage !== "done" && (
            <div
              ref={dropRef}
              className={`upload-zone upload-zone--lg upload-zone--${stage}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (stage !== "uploading") setStage("dragging");
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

              {stage === "uploading" && (
                <div className="upload-progress">
                  <div className="upload-progress__spinner" aria-hidden="true" />
                  <p className="upload-progress__step">Uploading…</p>
                </div>
              )}

              {stage === "error" && (
                <div className="upload-error">
                  <div className="upload-zone__icon upload-zone__icon--error">!</div>
                  <p className="upload-zone__title">Couldn't upload that file</p>
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
          )}

          {stage === "done" && metadata && (
            <div className="result-panel">
              <svg viewBox="0 0 52 52" className="upload-success__ring result-panel__ring">
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

              <h1 className="result-panel__heading">Uploaded.</h1>
              <p className="result-panel__sub">
                {metadata.fileName} · {formatSize(metadata.size)}
              </p>

              <div className="result-panel__link">
                <span className="result-panel__link-text">{uploadedUrl}</span>
                <button className="btn btn--ghost btn--sm" onClick={copyLink}>
                  {copied ? "Copied ✓" : "Copy link"}
                </button>
              </div>

              {!runId && (
                <div className="result-panel__actions">
                  <button
                    className="btn btn--primary btn--lg"
                    onClick={handleStartBuild}
                    disabled={isTriggering}
                  >
                    {isTriggering ? "Initializing..." : "Build Portfolio"}
                    <span className="btn__arrow" aria-hidden="true">→</span>
                  </button>
                  <button className="btn btn--ghost btn--lg" onClick={reset}>
                    Upload another
                  </button>
                </div>
              )}

              {triggerError && !runId && (
                <p className="auth-form__error">{triggerError}</p>
              )}

              {runId && run?.status !== "FAILED" && run?.status !== "CANCELED" && (
                <div className="build-progress">
                  {pollError ? (
                    <p className="build-progress__error">Couldn't check progress: {pollError}</p>
                  ) : (
                    <>
                      <p className="build-progress__stage">
                        {run?.stage ? STAGE_LABELS[run.stage] : "Queued"}…
                      </p>
                      <progress className="build-progress__bar" value={run?.progressPercent ?? 0} max={100} />
                    </>
                  )}
                </div>
              )}

              {run && (run.status === "FAILED" || run.status === "CANCELED") && (
                <div className="build-progress">
                  <p className="build-progress__error">
                    {run.status === "FAILED"
                      ? `Generation failed${run.errorStage ? ` while ${STAGE_LABELS[run.errorStage].toLowerCase()}` : ""}.`
                      : "Generation was canceled."}
                  </p>
                  {run.errorMessage && <p className="build-progress__error">{run.errorMessage}</p>}
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setRunId(null);
                      setTriggerError("");
                    }}
                  >
                    Try again
                  </button>
                </div>
              )}
          </div>
          )}
        </div>
      </main>
    </>
  );
}
