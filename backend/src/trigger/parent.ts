import { batch, logger, task } from "@trigger.dev/sdk";
import { architectTask } from "./architect";
import { blueprintTask } from "./blueprint";
import { htmlTask } from "./html";
import { validateTask } from "./validate";
import { buildTask } from "./build";
import { deployTask } from "./deploy";
import { db } from "../lib/db";
import type { RunStage } from "@prisma/client";

async function markStage(runId: string, stage: RunStage, progressPercent: number) {
  await db.run.update({
    where: { id: runId },
    data: { status: "RUNNING", stage, progressPercent },
  });
  await db.runEvent.create({
    data: { runId, stage, status: "started" },
  });
}

async function markStageDone(runId: string, stage: RunStage, metadata?: object) {
  await db.runEvent.create({
    data: { runId, stage, status: "succeeded", metadata },
  });
}

export const websiteTask = task({
  id: "generate-website",

  queue: {
    concurrencyLimit: 1,
  },

  run: async (payload: { runId: string; userId: string; prompt: string }) => {
    const { runId } = payload;
    logger.info("Starting website generation", { runId });

    try {
      await markStage(runId, "ARCHITECTING", 20);
      const architectureRun = await architectTask.triggerAndWait({ prompt: payload.prompt });
      if (!architectureRun.ok) throw architectureRun.error;
      const architecture = architectureRun.output.plan;
      await markStageDone(runId, "ARCHITECTING");

      await markStage(runId, "BLUEPRINTING", 35);
      const blueprintRun = await blueprintTask.triggerAndWait({
        prompt: payload.prompt,
        architecture,
      });
      if (!blueprintRun.ok) throw blueprintRun.error;
      const blueprint = blueprintRun.output.blueprint;
      await markStageDone(runId, "BLUEPRINTING");

      await markStage(runId, "GENERATING_HTML", 50);
      const htmlRun = await htmlTask.triggerAndWait({
        prompt: payload.prompt,
        architecture,
        blueprint,
      });
      if (!htmlRun.ok) throw htmlRun.error;
      const html = htmlRun.output.file.content;
      await markStageDone(runId, "GENERATING_HTML");

      await markStage(runId, "GENERATING_CSS", 65);
      const result = await batch.triggerAndWait([
        {
          id: "generate-css",
          payload: { prompt: payload.prompt, architecture, blueprint, html },
        },
        {
          id: "generate-js",
          payload: { prompt: payload.prompt, architecture, blueprint, html },
        },
      ]);

      const cssRun = result.runs.find((run) => run.taskIdentifier === "generate-css");
      if (!cssRun) throw new Error("generate-css task not found");
      if (!cssRun.ok) throw cssRun.error;

      const jsRun = result.runs.find((run) => run.taskIdentifier === "generate-js");
      if (!jsRun) throw new Error("generate-js task not found");
      if (!jsRun.ok) throw jsRun.error;

      const css = cssRun.output.file.content;
      const js = jsRun.output.file.content;
      await markStageDone(runId, "GENERATING_CSS");
      await markStageDone(runId, "GENERATING_JS");

      await markStage(runId, "VALIDATING", 80);
      // Non-fatal: logs warnings if HTML/CSS/JS disagree on selectors, but
      // doesn't block generation. See trigger/validate.ts for why this is a
      // best-effort static check rather than a hard gate.
      const validation = await validateTask.triggerAndWait({ html, css, js });
      if (validation.ok && validation.output.warnings.length) {
        logger.warn("Generated site has consistency warnings", {
          warnings: validation.output.warnings,
        });
      }
      await markStageDone(runId, "VALIDATING", {
        warnings: validation.ok ? validation.output.warnings : [],
      });

      const files = [htmlRun.output.file, cssRun.output.file, jsRun.output.file];
      logger.log("Generated files", { files });

      await markStage(runId, "BUILDING", 90);
      const build = await buildTask.triggerAndWait({ files });
      if (!build.ok) throw build.error;
      await markStageDone(runId, "BUILDING");

      await markStage(runId, "DEPLOYING", 95);
      const deployment = await deployTask.triggerAndWait({ projectId: build.output.projectId });
      if (!deployment.ok) throw deployment.error;
      await markStageDone(runId, "DEPLOYING");

      logger.info("Website generated successfully", { runId });

      await db.run.update({
        where: { id: runId },
        data: {
          status: "COMPLETED",
          stage: null,
          progressPercent: 100,
          deployedUrl: deployment.output.deploymentUrl,
          completedAt: new Date(),
        },
      });

      return {
        url: deployment.output.deploymentUrl,
        warnings: validation.ok ? validation.output.warnings : [],
      };
    } catch (error) {
      const current = await db.run.findUnique({ where: { id: runId }, select: { stage: true } });
      await db.run.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          errorStage: current?.stage ?? null,
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });
      throw error; // still fail the Trigger.dev run/attempt normally
    }
  },
});
