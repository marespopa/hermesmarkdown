// The Markdown Cleaner's fix rules, in report order, with the label each
// count is shown under ("3 list indents").

export const FIX_IDS = [
  "list-indent",
  "list-marker",
  "heading",
  "setext",
  "blank-lines",
  "trailing-space",
  "inline-html",
  "table",
  "rule",
  "fence",
  "invisible",
  "line-endings",
] as const;

export type FixId = (typeof FIX_IDS)[number];

const LABELS: Record<FixId, [singular: string, plural: string]> = {
  "list-indent": ["list indent", "list indents"],
  "list-marker": ["list marker", "list markers"],
  heading: ["heading", "headings"],
  setext: ["underlined heading", "underlined headings"],
  "blank-lines": ["blank line", "blank lines"],
  "trailing-space": ["trailing space", "trailing spaces"],
  "inline-html": ["HTML tag", "HTML tags"],
  table: ["table aligned", "tables aligned"],
  rule: ["horizontal rule", "horizontal rules"],
  fence: ["unclosed code block", "unclosed code blocks"],
  invisible: ["invisible character", "invisible characters"],
  "line-endings": ["Windows line ending", "Windows line endings"],
};

export function fixLabel(id: FixId, count: number): string {
  const [singular, plural] = LABELS[id];
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}

export class FixCounter {
  private counts = new Map<FixId, number>();

  add(id: FixId, count = 1) {
    if (count > 0) this.counts.set(id, (this.counts.get(id) ?? 0) + count);
  }

  // The fixes that fired, in report order.
  list(): { id: FixId; count: number }[] {
    return FIX_IDS.filter((id) => this.counts.has(id)).map((id) => ({ id, count: this.counts.get(id)! }));
  }
}
