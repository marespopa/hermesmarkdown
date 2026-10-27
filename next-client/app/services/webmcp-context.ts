// WebMCP (webmachinelearning.github.io/webmcp): the page offers tools to AI
// agents running in the browser through `document.modelContext`. Only the
// parts used here are typed; the draft spec may still change, so early
// previews (`navigator.modelContext`, `unregisterTool`) are covered too.
// Kept apart from webmcp.ts so checking support loads no schemas.
export type WebMcpTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<string>;
};

export type ModelContextLike = {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => Promise<void> | void;
  unregisterTool?: (name: string) => void;
};

/** The browser's model context, or null where WebMCP isn't offered. */
export function getModelContext(): ModelContextLike | null {
  if (typeof document === "undefined") return null;
  const candidate =
    (document as unknown as { modelContext?: unknown }).modelContext ??
    (navigator as unknown as { modelContext?: unknown }).modelContext;
  const context = candidate as ModelContextLike | undefined;
  return typeof context?.registerTool === "function" ? context : null;
}

export const isWebMcpSupported = () => getModelContext() !== null;
