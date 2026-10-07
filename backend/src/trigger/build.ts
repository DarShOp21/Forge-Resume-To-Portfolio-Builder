import { logger, task } from "@trigger.dev/sdk";
import { FileArtifact } from "../types/fileArtifact";
import fs from 'fs/promises';
import path from "path";
import crypto from "crypto";

export const buildTask = task({
  id : "build-website",

  run : async (payload : {files : FileArtifact[]}) => {

    const projectId = crypto.randomUUID();

    const projDir = path.join(process.cwd(),"generated",projectId);

    logger.info("Creating project", {
      projectId,
      projDir
    });

    await fs.mkdir(projDir , {
      recursive : true
    })

    for(const file of payload.files){
      const filePath = path.join(projDir,file.path);

      await fs.mkdir(path.dirname(filePath), {
        recursive: true,
      });

      logger.info("Writing file", {
        file: file.path,
      });

      await fs.writeFile(filePath, file.content, "utf-8");    
    }

    await fs.writeFile(
      path.join(projDir, "metadata.json"),
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          files: payload.files.map((f) => f.path),
        },
        null,
        2
      )
    );

    logger.info("Project created successfully");

    return {
      projectId
    }
  }  
}) 
