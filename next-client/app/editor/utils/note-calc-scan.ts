import type { Text } from "@codemirror/state";
import { evaluateMathExpression, normalizeMathName } from "./math-eval";

// Line scanner for the inline note calculator (codemirror/note-calc.ts).
// Pure, no DOM. Each line is classified from the state carried over from
// the line above (open fence / frontmatter / `$$` block, variable scope), so
// a cache of per-line state lets edits rescan only from the first edited
// line down, and only as far as the last visible line.

type FenceState = { fence: "`" | "~"; length: number; quote: string };
type BlockState = null | "frontmatter" | "math" | FenceState;

// Immutable linked chain: an assignment pushes one node, every other line
// shares the previous line's pointer. `value: undefined` marks a name that
// was invalidated by a failed reassignment.
interface ScopeNode {
  name: string;
  value: number | undefined;
  parent: ScopeNode | null;
}

// State *after* the line, plus that line's label.
export interface LineCalc {
  block: BlockState;
  scope: ScopeNode | null;
  label: string | null;
}

export const ASSIGNMENT = /^\s*([A-Za-z_][\w ]*?)\s*=(?!=)(.*)$/;
const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/;
const HEADING = /^\s{0,3}#{1,6}(\s|$)/;
const DATE_LIKE = /^\s*[\d.,]+(?:[-/][\d.,]+)+\s*$/;
const FENCE_OPEN = /^\s{0,3}((?:>\s?)*)(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE = /^\s{0,3}((?:>\s?)*)(`{3,}|~{3,})\s*$/;
const DOLLAR_LINE = /^\s*\$\$\s*$/;
const DOLLAR_SINGLE = /^\s*\$\$/;
const FRONTMATTER = /^---\s*$/;

const quoteKey = (prefix: string) => prefix.replace(/\s/g, "");

function lookup(scope: ScopeNode | null, name: string): number | undefined {
  for (let node = scope; node; node = node.parent) {
    if (node.name === name) return node.value;
  }
  return undefined;
}

function isFence(block: BlockState): block is FenceState {
  return typeof block === "object" && block !== null;
}

export function parseAssignment(content: string): { name: string; expression: string } | null {
  const match = ASSIGNMENT.exec(content);
  if (!match) return null;
  const name = normalizeMathName(match[1]);
  if (!name || name.split(" ").includes("of")) return null;
  return { name, expression: match[2] };
}

export function formatNoteCalcResult(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value * 10_000) / 10_000;
  if (!Number.isFinite(rounded)) return null;
  // toFixed avoids exponent notation for small values; trim trailing zeros.
  const text = Math.abs(rounded) >= 1e21
    ? String(rounded)
    : rounded.toFixed(4).replace(/\.?0+$/, "");
  return `= ${text === "-0" ? "0" : text}`;
}

export function scanLine(text: string, lineNumber: number, prev: LineCalc | null): LineCalc {
  const block = prev?.block ?? null;
  const scope = prev?.scope ?? null;
  const skip = (next: BlockState): LineCalc => ({ block: next, scope, label: null });

  // 1. Inside a block: stay in it, or close it on this line.
  if (block === "frontmatter") return skip(FRONTMATTER.test(text) ? null : "frontmatter");
  if (block === "math") return skip(DOLLAR_LINE.test(text) ? null : "math");
  if (isFence(block)) {
    const close = FENCE_CLOSE.exec(text);
    const closes = close
      && close[2][0] === block.fence
      && close[2].length >= block.length
      && quoteKey(close[1]) === block.quote;
    return skip(closes ? null : block);
  }

  // 2. Open a block.
  if (lineNumber === 1 && FRONTMATTER.test(text)) return skip("frontmatter");
  const open = FENCE_OPEN.exec(text);
  if (open && !(open[2][0] === "`" && open[3].includes("`"))) {
    return skip({ fence: open[2][0] as "`" | "~", length: open[2].length, quote: quoteKey(open[1]) });
  }
  if (DOLLAR_LINE.test(text)) return skip("math");
  if (DOLLAR_SINGLE.test(text)) return skip(null);

  // 3. Blank lines and headings.
  if (!text.trim() || HEADING.test(text)) return skip(null);

  // 4. Math content.
  const content = text.replace(LIST_MARKER, "");
  if (DATE_LIKE.test(content)) return skip(null);

  const resolve = (name: string) => lookup(scope, name);
  const options = { resolve, percent: true, thousandsSeparators: true };
  const assignment = parseAssignment(content);
  const result = evaluateMathExpression(assignment ? assignment.expression : content, options);
  const nextScope = assignment
    ? { name: assignment.name, value: result && Number.isFinite(result.value) ? result.value : undefined, parent: scope }
    : scope;

  // 5. Label: only for evaluated, finite, non-literal expressions.
  const label = result && !result.isLiteral ? formatNoteCalcResult(result.value) : null;
  return { block: null, scope: nextScope, label };
}

export class NoteCalcCache {
  private entries: LineCalc[] = []; // entries[i] is line i + 1
  private scans = 0;

  // Lines 1..size are valid.
  get size(): number {
    return this.entries.length;
  }

  // Total scanLine calls (test hook for incremental behavior).
  get scanCount(): number {
    return this.scans;
  }

  // Drop entries ≥ lineNumber.
  invalidateFrom(lineNumber: number): void {
    if (lineNumber - 1 < this.entries.length) {
      this.entries.length = Math.max(0, lineNumber - 1);
    }
  }

  // Extend from size + 1 to upToLine only.
  ensure(doc: Text, upToLine: number): void {
    const last = Math.min(upToLine, doc.lines);
    if (this.entries.length >= last) return;
    const iter = doc.iterLines(this.entries.length + 1, last + 1);
    let prev = this.entries[this.entries.length - 1] ?? null;
    for (let n = this.entries.length + 1; !iter.next().done; n++) {
      prev = scanLine(iter.value, n, prev);
      this.entries.push(prev);
      this.scans += 1;
    }
  }

  // Requires ensure() first.
  label(lineNumber: number): string | null {
    return this.entries[lineNumber - 1]?.label ?? null;
  }
}

// Ensures the cache up to the last line of the ranges, then returns the
// labels of lines intersecting them.
export function collectNoteCalcLabels(
  doc: Text,
  cache: NoteCalcCache,
  ranges: readonly { from: number; to: number }[],
): { pos: number; label: string }[] {
  if (ranges.length === 0) return [];
  const lastLine = doc.lineAt(Math.max(...ranges.map((range) => range.to))).number;
  cache.ensure(doc, lastLine);

  const labels: { pos: number; label: string }[] = [];
  let seen = 0;
  for (const range of ranges) {
    const first = Math.max(doc.lineAt(range.from).number, seen + 1);
    const end = doc.lineAt(range.to).number;
    for (let n = first; n <= end; n++) {
      const label = cache.label(n);
      if (label) labels.push({ pos: doc.line(n).to, label });
    }
    seen = Math.max(seen, end);
  }
  return labels;
}
