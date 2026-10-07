import { convert } from "@opendataloader/pdf";
import { mkdtemp, readFile, readdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

/**
 * Switched from `unpdf` (plain text extraction, no layout awareness) to
 * `@opendataloader/pdf` (deterministic, local, layout-aware parser - #1 in
 * public benchmarks for reading order/heading/table accuracy as of writing,
 * see https://github.com/opendataloader-project/opendataloader-pdf).
 *
 * WHY THIS SHOULD HELP THE SLOW/UNRELIABLE RESUME PARSING:
 * `unpdf` gives back a flat text blob with no heading/list/section
 * structure - a two-column resume, in particular, can come out with lines
 * interleaved from both columns. Feeding that into an LLM and asking it to
 * reconstruct "which bullet belongs to which job" is exactly the kind of
 * ambiguity that produces slow, retried, or failed structured-output calls
 * in services/resume/parser.ts. `@opendataloader/pdf`'s Markdown output
 * preserves heading hierarchy and reading order (via its XY-Cut++ layout
 * analysis) BEFORE the LLM ever sees it, so parseResume() gets a much
 * cleaner, already-segmented input to work from.
 *
 * REQUIREMENTS - READ BEFORE DEPLOYING:
 * - Requires Java 11+ on whatever machine actually runs this (the core
 *   engine is a Java library under the hood). Run `java -version` on your
 *   Trigger.dev worker's machine/container - if it's missing, install a JDK
 *   (e.g. via https://adoptium.net) there, not just in your local dev
 *   environment. This is a real new infra dependency, not just an npm
 *   package.
 * - `convert()` is file-path based, not buffer-in/buffer-out - it reads a
 *   PDF from disk and writes output files to a directory. Since multer
 *   gives us the upload as an in-memory Buffer, this writes it to a temp
 *   file first and reads the generated Markdown back after.
 * - Each `convert()` call spawns a JVM process. For one resume per request
 *   this is a small, roughly constant startup cost (not the multi-minute
 *   variety the LLM calls were hitting) - if you ever batch multiple
 *   resumes, batch them into a single `convert()` call rather than looping
 *   calls, since the library's own docs warn repeated invocations are slow
 *   specifically because of repeated JVM startup.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "resume-pdf-"));
  const inputPath = path.join(workDir, "resume.pdf");
  const outputDir = path.join(workDir, "output");

  try {
    await writeFile(inputPath, buffer);

    await convert([inputPath], {
      outputDir,
      format: "markdown",
    });

    const outputFiles = await readdir(outputDir);
    const markdownFile = outputFiles.find((f) => f.endsWith(".md"));

    if (!markdownFile) {
      throw new Error(
        `@opendataloader/pdf did not produce a markdown file. Files found: ${outputFiles.join(", ") || "(none)"}`
      );
    }

    return (await readFile(path.join(outputDir, markdownFile), "utf-8")).trim();
  } finally {
    // Best-effort cleanup - don't let a cleanup failure mask the real result/error.
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
