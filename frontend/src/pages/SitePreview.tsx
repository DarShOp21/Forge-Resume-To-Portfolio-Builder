import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { useRunPolling } from "../hooks/useRunPolling";
import { STAGE_LABELS } from "../lib/api";

export default function SitePreview() {
  const { runId = "" } = useParams();
  const { run, pollError } = useRunPolling(runId || null);
  const [copied, setCopied] = useState(false);

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — link is still
      // visible and selectable, so this fails quietly rather than erroring.
    }
  }

  return (
    <>
      <AppHeader variant="preview" />
      <main className="site-preview">
        <div className="site-preview__banner">
          <div className="container site-preview__banner-inner">
            <span>Your generated portfolio</span>
            <Link to="/generate" className="site-preview__banner-link">
              Generate another →
            </Link>
          </div>
        </div>

        <div className="container site-preview__body">
          {pollError && (
            <p className="build-progress__error">Couldn't load this build: {pollError}</p>
          )}

          {!pollError && !run && <p className="site-preview__status">Loading…</p>}

          {run && (run.status === "QUEUED" || run.status === "RUNNING") && (
            <div className="build-progress site-preview__progress">
              <p className="build-progress__stage">
                {run.stage ? STAGE_LABELS[run.stage] : "Queued"}…
              </p>
              <progress className="build-progress__bar" value={run.progressPercent} max={100} />
            </div>
          )}

          {run && run.status === "FAILED" && (
            <div className="build-progress">
              <p className="build-progress__error">
                Generation failed
                {run.errorStage ? ` while ${STAGE_LABELS[run.errorStage].toLowerCase()}` : ""}.
              </p>
              {run.errorMessage && <p className="build-progress__error">{run.errorMessage}</p>}
              <Link to="/generate" className="btn btn--primary btn--sm">
                Try again
              </Link>
            </div>
          )}

          {run && run.status === "CANCELED" && (
            <p className="build-progress__error">Generation was canceled.</p>
          )}

          {run && run.status === "COMPLETED" && run.deployedUrl && (
            <>
              <div className="site-preview__url-bar">
                <span className="site-preview__url">{run.deployedUrl}</span>
                <div className="site-preview__url-actions">
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => copyLink(run.deployedUrl!)}
                  >
                    {copied ? "Copied ✓" : "Copy link"}
                  </button>
                  <a
                    className="btn btn--primary btn--sm"
                    href={run.deployedUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open live site ↗
                  </a>
                </div>
              </div>

              <div className="site-preview__frame-wrap">
                <iframe
                  className="site-preview__frame"
                  src={run.deployedUrl}
                  title="Portfolio live preview"
                />
              </div>
            </>
          )}
        </div>

        <footer className="site-preview__footer">
          <div className="container">
            <Link to="/" className="site-preview__made-with">
              Made with Forge
            </Link>
          </div>
        </footer>
      </main>
    </>
  );
}
