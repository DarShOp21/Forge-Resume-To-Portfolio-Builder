import { Request, Response } from "express";
import { db } from "../lib/db";
import { SignupSchema, LoginSchema } from "../schemas/auth.schema";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../services/auth/tokens";

const REFRESH_COOKIE_NAME = "refresh_token";
const isProd = process.env.NODE_ENV === "production";

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd, // requires HTTPS in prod; allow http in local dev
    sameSite: "lax",
    expires: expiresAt,
    path: "/auth", // only sent to auth endpoints (refresh/logout)
  });
}

export async function signup(req: Request, res: Response) {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
  }
  const { username, email, password } = parsed.data;

  const existing = await db.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true, username: true, email: true },
  });
  if (existing) {
    const field = existing.username === username ? "username" : "email";
    return res.status(409).json({ message: `That ${field} is already taken` });
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { username, email, passwordHash, authProvider: "LOCAL" },
    select: { id: true, username: true, email: true },
  });

  const accessToken = signAccessToken({ sub: user.id, username: user.username });
  const { token: refreshToken, hash, expiresAt } = generateRefreshToken();
  await db.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt,
      userAgent: req.get("user-agent") ?? undefined,
      ipAddress: req.ip,
    },
  });

  setRefreshCookie(res, refreshToken, expiresAt);
  return res.status(201).json({ user, accessToken });
}

export async function login(req: Request, res: Response) {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
  }
  const { identifier, password } = parsed.data;

  const user = await db.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });

  // Same error for "no such user" and "wrong password" - don't leak
  // which one it was, that just makes username/email enumeration easier.
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid username/email or password" });
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const accessToken = signAccessToken({ sub: user.id, username: user.username });
  const { token: refreshToken, hash, expiresAt } = generateRefreshToken();
  await db.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt,
      userAgent: req.get("user-agent") ?? undefined,
      ipAddress: req.ip,
    },
  });

  setRefreshCookie(res, refreshToken, expiresAt);
  return res.json({
    user: { id: user.id, username: user.username, email: user.email },
    accessToken,
  });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: "No refresh token" });
  }

  const tokenHash = hashRefreshToken(token);
  const stored = await db.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return res.status(401).json({ message: "Refresh token invalid or expired" });
  }

  // Rotate: revoke the used token and issue a new one. Prevents a stolen
  // (but not-yet-used) refresh token from being replayed indefinitely.
  const { token: newToken, hash: newHash, expiresAt } = generateRefreshToken();
  await db.$transaction([
    db.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } }),
    db.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: newHash,
        expiresAt,
        userAgent: req.get("user-agent") ?? undefined,
        ipAddress: req.ip,
      },
    }),
  ]);

  setRefreshCookie(res, newToken, expiresAt);
  const accessToken = signAccessToken({ sub: stored.user.id, username: stored.user.username });
  return res.json({ accessToken });
}

export async function me(req: Request, res: Response) {
  const user = await db.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, username: true, email: true },
  });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json(user);
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) {
    const tokenHash = hashRefreshToken(token);
    await db.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/auth" });
  return res.status(204).send();
}
