import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 30;

if (!ACCESS_TOKEN_SECRET) {
  // Fail fast at boot, not on the first request that needs a token -
  // same lesson as the missing-env-var bug found in tools/langchain.ts.
  throw new Error(
    "ACCESS_TOKEN_SECRET is not set. Add it to your .env before starting the server."
  );
}

export interface AccessTokenPayload {
  sub: string; // user id
  username: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as AccessTokenPayload;
}

// Refresh tokens are opaque random strings, not JWTs - we store only a
// hash of them (refresh_tokens.token_hash), same reasoning as passwords:
// a leaked DB shouldn't hand out usable session tokens.
export function generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(48).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, hash, expiresAt };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
