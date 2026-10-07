/**
 * Re-exports the Blueprint type inferred from the Zod schema in
 * schemas/blueprint.ts, which is the single source of truth (same pattern
 * as types/architecture.ts). Kept as a separate path so imports read
 * `import { Blueprint } from "../types/blueprint"` alongside the existing
 * `import { Architecture } from "../types/architecture"`.
 */
export type { BlueprintSchemaType as Blueprint } from "../schemas/blueprint";
