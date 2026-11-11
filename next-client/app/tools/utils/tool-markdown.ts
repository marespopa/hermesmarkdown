// The Markdown each tool hands to the editor. Every handoff starts with an
// H1: the editor names a draft's file after its first line, and a fenced
// block's opening line or a table's header row would make a poor name.

export const TABLE_HANDOFF_TITLE = "Markdown table";
export const MERMAID_HANDOFF_TITLE = "Mermaid diagram";

export function tableHandoffMarkdown(table: string): string {
  return `# ${TABLE_HANDOFF_TITLE}\n\n${table.trim()}\n`;
}

// A fence longer than any backtick run in the source, so the block can
// never be closed early; at least three backticks.
export function mermaidFence(source: string): string {
  const longest = Math.max(0, ...(source.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(Math.max(3, longest + 1));
}

export function mermaidHandoffMarkdown(source: string): string {
  const fence = mermaidFence(source);
  return `# ${MERMAID_HANDOFF_TITLE}\n\n${fence}mermaid\n${source.trim()}\n${fence}\n`;
}
