import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/auth/tokens";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; username: string };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing bearer token" });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
}
