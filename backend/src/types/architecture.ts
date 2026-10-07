/**
 * Re-exports the Architecture type inferred from the Zod schema in
 * schemas/architecture.ts, which is now the single source of truth (see
 * that file for why). Kept as a separate file/path so every existing
 * `import { Architecture } from "../types/architecture"` across prompts/
 * and trigger/ keeps working unchanged.
 */
export type { ArchitectureSchemaType as Architecture } from "../schemas/architecture";
