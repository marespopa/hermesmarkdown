import { renderMath } from "./render-math";
import { renderMermaid } from "./render-mermaid";

// Rendering is async and Mermaid in particular is slow, so rendered output
// is cached by kind + theme + source. Re-creating an editor widget (scrolling
// it back into view, an edit elsewhere in the note) then reuses the result
// instead of flashing a placeholder.

export type RenderedBlockKind = "mermaid" | "math";
export type RenderedBlockTheme = "default" | "dark";

export type RenderResult = { html: string; error?: undefined } | { html?: undefined; error: string };

const MAX_ENTRIES = 100;
const results = new Map<string, RenderResult>();
const pending = new Map<string, Promise<RenderResult>>();
// Last measured widget height per key, so re-created widgets reserve the
// right space before they are drawn (fewer scroll jumps).
const heights = new Map<string, number>();

export const renderKey = (kind: RenderedBlockKind, theme: RenderedBlockTheme, source: string) =>
  `${kind}\u0000${kind === "math" ? "" : theme}\u0000${source}`;

export function currentRenderTheme(): RenderedBlockTheme {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "default";
}

export function peekRendered(key: string): RenderResult | undefined {
  return results.get(key);
}

export function renderBlock(kind: RenderedBlockKind, theme: RenderedBlockTheme, source: string): Promise<RenderResult> {
  const key = renderKey(kind, theme, source);
  const cached = results.get(key);
  if (cached) return Promise.resolve(cached);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const render = kind === "mermaid" ? renderMermaid(source, theme) : renderMath(source);
  const promise = render
    .then((html): RenderResult => ({ html }))
    .catch((error: unknown): RenderResult => ({
      error: error instanceof Error && error.message ? error.message : "Failed to render",
    }))
    .then((result) => {
      pending.delete(key);
      results.set(key, result);
      if (results.size > MAX_ENTRIES) results.delete(results.keys().next().value!);
      return result;
    });
  pending.set(key, promise);
  return promise;
}

export function rememberHeight(key: string, height: number) {
  if (height <= 0) return;
  heights.set(key, height);
  if (heights.size > MAX_ENTRIES) heights.delete(heights.keys().next().value!);
}

export function knownHeight(key: string): number | undefined {
  return heights.get(key);
}
