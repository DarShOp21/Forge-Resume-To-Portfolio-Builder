
import { skills } from "../generated/skills";
export function loadSkill(name: keyof typeof skills) { 
  console.log("Requested:", name);
  console.log("Available:", Object.keys(skills));
  console.log("Value:", skills[name]);
  return skills[name];
}


export function extractSection(body: string, heading: string): string {
  const regex = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
  const match = body.match(regex);
  return match ? match[1].trim() : "";
}
