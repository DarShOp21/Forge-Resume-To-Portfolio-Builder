import { Router } from "express";
import { generatePortfolio, getPortfolioStatus } from "../controllers/portfolio.controller";
import { requireAuth } from "../middlewares/require-auth";
import { generateLimiter } from "../middlewares/rate-limit";

const router = Router();

router.post("/generate", requireAuth, generateLimiter, generatePortfolio);
router.get("/status/:runId", requireAuth, getPortfolioStatus);

export default router;
