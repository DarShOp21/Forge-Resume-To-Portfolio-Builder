// Base URL for the upload worker (Cloudflare Worker → R2). Empty string
// means "same origin, relative path" — this is what you want when Vite's
// dev proxy (see vite.config.ts) forwards /api/* to the local wrangler dev
// server, or when the worker is deployed behind the same domain/reverse
// proxy as the frontend in production. Set VITE_API_URL to override (e.g.
// a separate *.workers.dev domain) at build time.
const API_BASE = import.meta.env.VITE_API_URL ?? "";

// Base URL for the Express backend (auth, portfolio generation/status).
// A separate host from the upload worker above by design.
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "";

export interface UploadMetadata {
  key: string;
  fileName: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

export interface UploadResult {
  success: true;
  url: string;
  metadata: UploadMetadata;
}

export interface BuildResult {
  runId: string;
  statusUrl: string;
}

/**
 * Uploads a resume file to the Forge upload worker, which validates it and
 * stores it in Cloudflare R2. Throws with the server's error message on
 * rejection (bad type, over the size limit, or a network/server failure).
 */
export async function uploadResume(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(
      "Couldn't reach the upload service. Check your connection and try again."
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Upload service returned an unexpected response.");
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: unknown }).error)
        : "Upload failed.";
    throw new Error(message);
  }

  return data as UploadResult;
}

// ─────────────────────────────────────────────────────────────────────────
// Auth-aware fetch wrapper for the Express backend
// ─────────────────────────────────────────────────────────────────────────

// Access token lives in memory only (not localStorage), so it isn't
// reachable by an XSS-injected script reading storage. The refresh token
// is a separate httpOnly cookie the browser sends automatically - losing
// the access token on a hard refresh is fine, refreshAccessToken() below
// re-derives one from that cookie on app load.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

// Serializes concurrent refresh attempts so two requests that both hit a
// 401 at the same time don't each fire their own /auth/refresh call and
// race to rotate the same refresh token.
let refreshInFlight: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${SERVER_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return false;
        const data = await res.json();
        setAccessToken(data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

interface RequestOptions extends RequestInit {
  skipAuthRetry?: boolean;
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuthRetry, headers, ...rest } = options;

  const doFetch = () =>
    fetch(`${SERVER_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
    });

  let res = await doFetch();

  // One retry after a silent refresh - covers the common case of an
  // expired 15-minute access token mid-session.
  if (res.status === 401 && !skipAuthRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch();
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────
// Auth endpoints
// ─────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
}

export function signup(username: string, email: string, password: string) {
  return apiFetch<{ user: User; accessToken: string }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
    skipAuthRetry: true,
  });
}

export function login(identifier: string, password: string) {
  return apiFetch<{ user: User; accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
    skipAuthRetry: true,
  });
}

export function logout() {
  return apiFetch<void>("/auth/logout", { method: "POST", skipAuthRetry: true }).catch(() => {});
}

export function fetchCurrentUser() {
  return apiFetch<User>("/auth/me");
}

// ─────────────────────────────────────────────────────────────────────────
// Portfolio generation + status polling
// ─────────────────────────────────────────────────────────────────────────

export async function triggerPortfolioBuild(resumeUrl: string): Promise<BuildResult> {
  return apiFetch<BuildResult>("/api/portfolio/generate", {
    method: "POST",
    body: JSON.stringify({ resumeUrl }),
  });
}

export type RunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELED";

export type RunStage =
  | "EXTRACTING_TEXT"
  | "PARSING_RESUME"
  | "ARCHITECTING"
  | "BLUEPRINTING"
  | "GENERATING_HTML"
  | "GENERATING_CSS"
  | "GENERATING_JS"
  | "VALIDATING"
  | "BUILDING"
  | "DEPLOYING"
  | null;

export interface RunStatusResponse {
  id: string;
  status: RunStatus;
  stage: RunStage;
  progressPercent: number;
  deployedUrl: string | null;
  errorMessage: string | null;
  errorStage: RunStage;
}

export const STAGE_LABELS: Record<NonNullable<RunStage>, string> = {
  EXTRACTING_TEXT: "Reading your resume",
  PARSING_RESUME: "Extracting structured data",
  ARCHITECTING: "Planning the site structure",
  BLUEPRINTING: "Deciding layout & design",
  GENERATING_HTML: "Writing the markup",
  GENERATING_CSS: "Writing the styles",
  GENERATING_JS: "Writing the interactivity",
  VALIDATING: "Checking everything lines up",
  BUILDING: "Assembling the site",
  DEPLOYING: "Publishing your portfolio",
};

export function fetchPortfolioStatus(runId: string) {
  return apiFetch<RunStatusResponse>(`/api/portfolio/status/${runId}`);
}
