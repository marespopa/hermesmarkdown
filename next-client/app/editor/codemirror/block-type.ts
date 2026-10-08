import type { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

// Block types a line can be turned into from the selection toolbar's
// "Turn into" menu. h4–h6 are only ever detected, never offered.
export type BlockType = "text" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "bullet" | "numbered" | "todo" | "quote";

// Leading whitespace, then at most one block marker: heading, quote, task,
// bullet or number. Tasks come before bullets so `- [ ] ` isn't read as `- `.
const BLOCK_PREFIX = /^([ \t]*)(?:(#{1,6})(?:[ \t]+|$)|(>[ \t]?)|([-*+][ \t]+\[[ xX/-]\](?:[ \t]+|$))|([-*+](?:[ \t]+|$))|(\d+[.)](?:[ \t]+|$)))?/;

interface ParsedLine {
  type: BlockType;
  indent: string;
  /** Length of indent plus marker, i.e. where the line's text starts. */
  prefixLength: number;
}

export function parseBlockLine(text: string): ParsedLine {
  const match = BLOCK_PREFIX.exec(text)!;
  const [whole, indent, hashes, quote, task, bullet, number] = match;
  const type: BlockType = hashes ? (`h${hashes.length}` as BlockType)
    : quote ? "quote"
    : task ? "todo"
    : bullet ? "bullet"
    : number ? "numbered"
    : "text";
  return { type, indent, prefixLength: whole.length };
}

// The block type of the line holding the main selection's head.
export function blockTypeAt(state: EditorState): BlockType {
  return parseBlockLine(state.doc.lineAt(state.selection.main.head).text).type;
}

function markerFor(type: BlockType, indent: string, index: number): string {
  if (type === "text") return "";
  if (type === "quote") return "> ";
  if (type.startsWith("h")) return `${"#".repeat(Number(type.slice(1)))} `;
  // Lists keep their nesting; everything else starts at the margin.
  if (type === "bullet") return `${indent}- `;
  if (type === "todo") return `${indent}- [ ] `;
  return `${indent}${index}. `;
}

// Turns every line the selection touches into `type`, replacing whatever
// marker each had and keeping its text; lines already of that type are left
// alone. Numbered lines count up from 1.
export function setBlockType(type: BlockType) {
  return (view: EditorView): boolean => {
    const { state } = view;
    const lineNumbers = new Set<number>();
    for (const range of state.selection.ranges) {
      const last = state.doc.lineAt(range.to).number;
      for (let n = state.doc.lineAt(range.from).number; n <= last; n++) lineNumbers.add(n);
    }
    const changes = state.changes([...lineNumbers].sort((a, b) => a - b).flatMap((n, index) => {
      const line = state.doc.line(n);
      const parsed = parseBlockLine(line.text);
      if (parsed.type === type) return [];
      return [{ from: line.from, to: line.from + parsed.prefixLength, insert: markerFor(type, parsed.indent, index + 1) }];
    }));
    view.dispatch({
      changes,
      selection: state.selection.map(changes, 1),
      userEvent: "input.format.block",
      scrollIntoView: true,
    });
    return true;
  };
}
