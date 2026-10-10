import { Request, Response } from "express";
import { db } from "../lib/db";
import { extractPdfText } from "../services/pdf/extract";
import { parseResume } from "../services/resume/parser";
import { websiteTask } from "../trigger/parent";

// Only fetch resumes from storage hosts you control - without this, an
// attacker can point resumeUrl at an internal service (metadata endpoints,
// internal admin ports, etc.) and have your server fetch it on their
// behalf. Comma-separated in env so staging/prod can differ.
const ALLOWED_RESUME_HOSTS = (process.env.RESUME_STORAGE_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

function isAllowedResumeUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return ALLOWED_RESUME_HOSTS.includes(parsed.hostname);
}

export async function generatePortfolio(req: Request, res: Response) {
  const userId = req.user!.id; // requireAuth ran before this handler

  try {
    console.log("=== START generatePortfolio ===");
    const { resumeUrl } = req.body;
    console.log("Received resumeUrl:", resumeUrl);

    if (!resumeUrl || typeof resumeUrl !== "string") {
      console.log("Validation failed: resumeUrl missing or not string");
      return res.status(400).json({ message: "resumeUrl is required" });
    }
    console.log("Resume URL validation passed");

    if (!isAllowedResumeUrl(resumeUrl)) {
      console.log("Validation failed: resumeUrl not from allowed host");
      return res.status(400).json({ message: "resumeUrl is not from an allowed storage host" });
    }
    console.log("Resume URL host validation passed");

    // Create the run row *before* triggering, so we have our own stable id
    // to hand back to the client and to pass into the task payload - every
    // pipeline stage updates this row directly instead of the API having
    // to re-poll Trigger.dev's own run object.
    console.log("Creating run record in DB");
    const run = await db.run.create({
      data: { userId, resumeUrl, status: "QUEUED" },
    });
    console.log("Run record created with ID:", run.id);

    console.log("Fetching resume from URL:", resumeUrl);
    const fileResponse = await fetch(resumeUrl);
    console.log("Fetch response status:", fileResponse.status);
    if (!fileResponse.ok) {
      console.log("Failed to fetch resume: HTTP", fileResponse.status);
      await db.run.update({
        where: { id: run.id },
        data: { status: "FAILED", errorMessage: "Could not download resume from the provided URL." },
      });
      return res.status(400).json({ message: "Could not download resume from the provided URL." });
    }
    console.log("Resume fetched successfully");

    console.log("Converting response to buffer");
    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("Buffer size:", buffer.length, "bytes");

    console.log("Updating run status to EXTRACTING_TEXT");
    await db.run.update({
      where: { id: run.id },
      data: { status: "RUNNING", stage: "EXTRACTING_TEXT", progressPercent: 5, startedAt: new Date() },
    });
    console.log("Calling extractPdfText");
    const text = await extractPdfText(buffer);
    console.log("Text extraction complete, length:", text.length, "characters");

    console.log("Updating run status to PARSING_RESUME");
    await db.run.update({
      where: { id: run.id },
      data: { stage: "PARSING_RESUME", progressPercent: 10 },
    });
    console.log("Calling parseResume");
    const resume = await parseResume(text);
    console.log("Resume parsing complete");

    console.log("Triggering websiteTask");
    const handle = await websiteTask.trigger({
      runId: run.id,
      userId,
      prompt: JSON.stringify(resume),
    });
    console.log("websiteTask triggered with handle ID:", handle.id);

    console.log("Updating run with triggerRunId");
    await db.run.update({
      where: { id: run.id },
      data: { triggerRunId: handle.id },
    });
    console.log("Run updated with triggerRunId");

    console.log("=== END generatePortfolio (SUCCESS) ===");
    return res.status(202).json({
      runId: run.id,
      statusUrl: `/api/portfolio/status/${run.id}`,
    });
  } catch (error) {
    console.error("===== BUILD ERROR =====", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : undefined
    );
    return res.status(500).json({
      message: "Failed to generate portfolio",
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
}

export async function getPortfolioStatus(req: Request, res: Response) {
  const { runId } = req.params;

  if (typeof runId !== "string") {
    return res.status(404).json({ message: "Run not found" });
  }

  const run = await db.run.findUnique({ where: { id: runId } });

  if (!run) {
    return res.status(404).json({ message: "Run not found" });
  }
  // Ownership check - without this, any authenticated user could poll any
  // other user's run just by guessing/incrementing a runId.
  if (run.userId !== req.user!.id) {
    return res.status(404).json({ message: "Run not found" });
  }

  return res.json({
    id: run.id,
    status: run.status,
    stage: run.stage,
    progressPercent: run.progressPercent,
    deployedUrl: run.deployedUrl,
    errorMessage: run.errorMessage,
    errorStage: run.errorStage,
  });
}
