import { EditorSelection, type Text } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

const HEADING_PREFIX = /^(#{1,6})(?:[ \t]+|$)/;
const FENCE = /^\s*(```|~~~)/;

// Sets every line the selection touches to a heading of `level`; if they're
// all already that level, removes the heading instead. Lines keep their text,
// only the leading `#`s change.
export function setHeading(level: number) {
  return (view: EditorView): boolean => {
    const { state } = view;
    const lineNumbers = new Set<number>();
    for (const range of state.selection.ranges) {
      const last = state.doc.lineAt(range.to).number;
      for (let n = state.doc.lineAt(range.from).number; n <= last; n++) lineNumbers.add(n);
    }
    const lines = [...lineNumbers].map((n) => {
      const line = state.doc.line(n);
      const match = HEADING_PREFIX.exec(line.text);
      return { from: line.from, level: match ? match[1].length : 0, prefixLength: match ? match[0].length : 0 };
    });
    const insert = lines.every((line) => line.level === level) ? "" : `${"#".repeat(level)} `;
    const changes = state.changes(lines.map((line) => ({ from: line.from, to: line.from + line.prefixLength, insert })));
    view.dispatch({
      changes,
      selection: state.selection.map(changes, 1),
      userEvent: "input.format.heading",
      scrollIntoView: true,
    });
    return true;
  };
}

// Wraps the selection as `[text]()` with the cursor between the parens, ready
// for the URL; with nothing selected the cursor goes between the brackets.
export function wrapAsLink(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const text = view.state.sliceDoc(from, to);
  const insert = `[${text}]()`;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from === to ? from + 1 : from + insert.length - 1 },
    userEvent: "input.format.link",
    scrollIntoView: true,
  });
  return true;
}

// The fenced code block containing `lineNumber`, as its fence line numbers.
export function fencedBlockAt(doc: Text, lineNumber: number): { open: number; close: number } | null {
  let open = 0;
  for (let n = 1; n <= doc.lines; n++) {
    if (!FENCE.test(doc.line(n).text)) {
      if (open === 0 && n > lineNumber) return null;
      continue;
    }
    if (open === 0) {
      if (n > lineNumber) return null;
      open = n;
    } else {
      if (lineNumber <= n) return { open, close: n };
      open = 0;
    }
  }
  return null;
}

// Inside a fenced code block: removes its fences. Otherwise: wraps the lines
// the selection touches in a new block, with the cursor after the opening
// fence so the language can be typed (an empty line gets the cursor inside).
export function toggleCodeBlock(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  const first = state.doc.lineAt(range.from);
  const last = state.doc.lineAt(range.to);

  const block = fencedBlockAt(state.doc, first.number);
  if (block) {
    const open = state.doc.line(block.open);
    const close = state.doc.line(block.close);
    const changes = [
      { from: open.from, to: Math.min(open.to + 1, close.from) },
      { from: block.close > block.open + 1 ? close.from - 1 : close.from, to: close.to },
    ];
    view.dispatch({ changes, userEvent: "delete.format.codeblock", scrollIntoView: true });
    return true;
  }

  const body = state.sliceDoc(first.from, last.to);
  const insert = `\`\`\`\n${body}\n\`\`\``;
  const anchor = body.trim() === "" ? first.from + 4 : first.from + 3;
  view.dispatch({
    changes: { from: first.from, to: last.to, insert },
    selection: EditorSelection.cursor(anchor),
    userEvent: "input.format.codeblock",
    scrollIntoView: true,
  });
  return true;
}
