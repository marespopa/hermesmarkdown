// Shared Mermaid rendering for the inline diagram previews and the
// full-size viewer. `mermaid` is large, so it is only loaded the first time
// a diagram is actually rendered.

export type MermaidTheme =
  | "default"
  | "base"
  | "dark"
  | "forest"
  | "neutral"
  | "neo"
  | "neo-dark"
  | "redux"
  | "redux-dark"
  | "redux-color"
  | "redux-dark-color"
  | "null";

const VALID_THEMES: MermaidTheme[] = [
  "default",
  "base",
  "dark",
  "forest",
  "neutral",
  "neo",
  "neo-dark",
  "redux",
  "redux-dark",
  "redux-color",
  "redux-dark-color",
  "null",
];

export const normalizeMermaidTheme = (theme?: string): MermaidTheme =>
  VALID_THEMES.includes(theme as MermaidTheme) ? (theme as MermaidTheme) : "default";

let renderCount = 0;
// mermaid.initialize is global, so renders run one at a time to keep each
// one's theme from leaking into another.
let queue: Promise<unknown> = Promise.resolve();

export function renderMermaid(source: string, theme: MermaidTheme): Promise<string> {
  const run = queue.then(async () => {
    const { default: mermaid } = await import("mermaid");
    // suppressErrorRendering: a syntax error throws (callers show the
    // message) instead of Mermaid also drawing its own error graphic into
    // the page.
    mermaid.initialize({ startOnLoad: false, theme, securityLevel: "strict", suppressErrorRendering: true });
    const { svg } = await mermaid.render(`hermes-mermaid-${++renderCount}`, source);
    return svg;
  });
  queue = run.catch(() => undefined);
  return run;
}
