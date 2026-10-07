import { useEffect, useRef, useState } from "react";
import { fetchPortfolioStatus, type RunStatusResponse } from "../lib/api";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELED"]);
const POLL_INTERVAL_MS = 2000;

interface UseRunPollingResult {
  run: RunStatusResponse | null;
  isPolling: boolean;
  pollError: string | null;
}

/** Polls run status while `runId` is set; stops automatically once the run
 *  reaches a terminal state, or if `runId` is cleared/unmounted. */
export function useRunPolling(runId: string | null): UseRunPollingResult {
  const [run, setRun] = useState<RunStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRun(null);
    setPollError(null);

    if (!runId) {
      setIsPolling(false);
      return;
    }

    let cancelled = false;
    setIsPolling(true);

    async function poll() {
      try {
        const data = await fetchPortfolioStatus(runId!);
        if (cancelled) return;

        setRun(data);

        if (TERMINAL_STATUSES.has(data.status)) {
          setIsPolling(false);
          return;
        }
        timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        setPollError(err instanceof Error ? err.message : "Failed to fetch run status");
        setIsPolling(false);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [runId]);

  return { run, isPolling, pollError };
}
