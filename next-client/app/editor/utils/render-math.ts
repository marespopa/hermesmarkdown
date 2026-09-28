// Display-mode LaTeX rendering with KaTeX. Like Mermaid, KaTeX and its
// stylesheet are only loaded the first time a formula is rendered.

let katexLoad: Promise<typeof import("katex").default> | null = null;

function loadKatex() {
  katexLoad ??= Promise.all([
    import("katex"),
    import("katex/dist/katex.min.css"),
  ]).then(([module]) => module.default);
  return katexLoad;
}

// Throws on invalid input so callers can show the error next to the source.
export async function renderMath(source: string): Promise<string> {
  const katex = await loadKatex();
  return katex.renderToString(source, {
    displayMode: true,
    throwOnError: true,
    output: "htmlAndMathml",
  });
}
