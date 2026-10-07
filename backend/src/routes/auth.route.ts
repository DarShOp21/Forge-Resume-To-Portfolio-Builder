import { Router } from "express";
import { signup, login, refresh, logout, me } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/require-auth";
import { authLimiter } from "../middlewares/rate-limit";

const router = Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
