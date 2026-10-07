import { logger, task } from "@trigger.dev/sdk";
import { deployToVercel } from "../services/vercel/deploy";
import path from "path";

export const deployTask = task({
  id : "deploy-project",

  run : async (payload : {
    projectId : string;
  }) => {
    logger.log(`Deploying project ${payload.projectId}`);

    const projDir = path.join(
      process.cwd(),
      "generated",
      payload.projectId
    );

    const deployment = await deployToVercel(projDir);

    logger.info("Deployment completed", {
      url: deployment.deploymentUrl,
    });

    return deployment;
  }
}) 
