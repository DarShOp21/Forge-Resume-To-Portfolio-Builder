import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import portfolioRouter from "./routes/portfolio.route";
import authRouter from "./routes/auth.route";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN, // e.g. https://app.example.com
    credentials: true, // required for the refresh-token cookie
  })
);
app.use(cookieParser());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/api/portfolio", portfolioRouter);

export default app;
