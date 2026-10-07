import fs from "fs";
import path from "path";

const skillDir = path.join(process.cwd() , "src" , "skills");
const outputDir = path.join(process.cwd() , "src" , "generated","skills");

fs.mkdirSync(outputDir, {recursive: true});

const skillFolders = fs.readdirSync(skillDir);

for(const folder of skillFolders) {
  const mdPath = path.join(skillDir , folder , "SKILL.md");

  if(!fs.existsSync(mdPath)) continue;

  const content = fs.readFileSync(mdPath , "utf8");

  const ts = `
    //AUTO GENERATED FILE
    
    export const skill = ${JSON.stringify(content)};
  `

  fs.writeFileSync(
    path.join(outputDir , `${folder}.ts`),
    ts
  );

  console.log("\nDone");
}
