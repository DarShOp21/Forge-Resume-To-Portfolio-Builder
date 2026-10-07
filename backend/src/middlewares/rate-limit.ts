import rateLimit from "express-rate-limit";

// Auth endpoints: guard against credential-stuffing/brute force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later." },
});

// Generation endpoint: each call kicks off paid model calls + a Vercel
// deploy, so this is deliberately tighter than the auth limiter.
export const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "anonymous",
  message: { message: "Generation limit reached, please try again later." },
});
