import { z } from "zod";
import { COMPANION_TOOL_DEFS, COMPANION_WRITE_TOOL_NAMES, type CompanionToolName } from "./companion-tool-defs";
import { NOTE_TOOL_DEFS } from "./note-tool-defs";
import type { ModelContextLike } from "./webmcp-context";

// Registers the note tools with WebMCP (see webmcp-context.ts), and with
// `writes` the AI companion's file reads and writes too. Loaded on demand by
// hooks/use-webmcp-tools.ts, so zod stays out of the editor bundle.

// JSON Schema for a tool's input, without the `$schema` line.
function jsonSchemaOf(schema: z.ZodType): object {
  const json = { ...(z.toJSONSchema(schema) as Record<string, unknown>) };
  delete json.$schema;
  return json;
}

// The companion's other reads, offered with the writes: an agent that edits
// a file needs its exact text.
const WRITE_READS: CompanionToolName[] = ["list_folder", "read_file", "search_files", "find_files", "check_file", "git_status", "git_diff", "get_active_note"];

/**
 * Offers the read-only note tools to the browser's agents until `signal`
 * aborts; with `writes`, also the companion's file reads and its write tools
 * (edit, create, rename, move, templates; never the Trash). Each call goes to
 * `run`, which answers with the tool's text. The text is the user's notes:
 * untrusted for the agent.
 */
export async function registerNoteTools(
  context: ModelContextLike,
  run: (toolName: string, input: Record<string, unknown>) => Promise<string>,
  signal: AbortSignal,
  { writes = false }: { writes?: boolean } = {},
): Promise<void> {
  const readNames = [...Object.keys(NOTE_TOOL_DEFS), ...(writes ? WRITE_READS : [])];
  const writeNames: string[] = writes ? COMPANION_WRITE_TOOL_NAMES : [];
  const names = [...readNames, ...writeNames];
  signal.addEventListener("abort", () => {
    // Early previews unregister by name; the spec aborts the registration.
    for (const name of names) {
      try {
        context.unregisterTool?.(name);
      } catch {
        // Already gone.
      }
    }
  }, { once: true });
  await Promise.all(names.map(async (name) => {
    if (signal.aborted) return;
    const { title, description, inputSchema } = COMPANION_TOOL_DEFS[name as CompanionToolName];
    const readOnly = readNames.includes(name);
    try {
      await context.registerTool({
        name,
        title,
        description,
        inputSchema: jsonSchemaOf(inputSchema),
        annotations: readOnly ? { readOnlyHint: true, untrustedContentHint: true } : { readOnlyHint: false },
        execute: (input) => run(name, input ?? {}),
      }, { signal });
    } catch (err) {
      console.warn("WebMCP: couldn't offer", name, err);
    }
  }));
}
