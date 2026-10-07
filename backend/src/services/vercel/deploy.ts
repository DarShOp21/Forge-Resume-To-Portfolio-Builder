import {exec} from "child_process";
import {promisify} from "util";
const execAsync = promisify(exec);

export interface DeployResult {
  success : boolean,
  deploymentUrl : string
};

export const deployToVercel = async (
  projDir : string
) : Promise<DeployResult> => {
  const token = process.env.VERCEL_TOKEN;

  if(!token){
    throw new Error("VERCEL TOKEN IS MISSING");
  }

  const command = `vercel --cwd="${projDir}" --yes --token="${token}"`;

  const {stdout , stderr} = await execAsync(command);

  if (stderr.trim()) {
    console.warn(stderr);
  }

  const deploymentUrl = stdout.trim();

  return{
    success : true,
    deploymentUrl
  }
}
