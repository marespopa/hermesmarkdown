import { ChangeSpec, EditorSelection, EditorState, Line } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { indentLess, indentMore } from "@codemirror/commands";

// indent, bullet or "1." / "1)", spacing, optional task box.
const LIST_ITEM = /^(\s*)([-*+]|(\d+)([.)]))(\s+)(\[[ xX/-]\]\s+)?/;
const INDENT = "  ";

interface ListItem {
  line: Line;
  /** Width of the leading whitespace (a tab counts as 4). */
  indent: number;
  /** Width up to where the item's text starts, task box excluded: a nested item lines up here. */
  contentColumn: number;
  /** Length of indent + marker + spacing + task box, in characters. */
  prefixLength: number;
  markerFrom: number;
  markerTo: number;
  number?: number;
  delimiter?: string;
  bullet: string;
  spacing: string;
  task?: string;
}

function width(whitespace: string): number {
  return whitespace.replace(/\t/g, "    ").length;
}

function parseItem(line: Line): ListItem | null {
  const match = LIST_ITEM.exec(line.text);
  if (!match) return null;
  const [prefix, indent, bullet, number, delimiter, spacing, task] = match;
  const markerFrom = line.from + indent.length;
  return {
    line,
    indent: width(indent),
    contentColumn: width(indent) + bullet.length + spacing.length,
    prefixLength: prefix.length,
    markerFrom,
    markerTo: markerFrom + bullet.length,
    number: number !== undefined ? Number(number) : undefined,
    delimiter,
    bullet,
    spacing,
    task,
  };
}

function lineIndent(text: string): number {
  return width(/^\s*/.exec(text)![0]);
}

// The item's own line plus everything nested under it: deeper lines and the
// blank lines between them (trailing blank lines are left alone).
function subtreeLastLine(state: EditorState, item: ListItem): number {
  let last = item.line.number;
  for (let n = item.line.number + 1; n <= state.doc.lines; n++) {
    const text = state.doc.line(n).text;
    if (text.trim() === "") continue;
    if (lineIndent(text) <= item.indent) break;
    last = n;
  }
  return last;
}

// The closest earlier item at an indent `accept` likes, looking past blank and
// deeper lines; stops at a line shallower than `floor` (another block).
function findPrevious(state: EditorState, item: ListItem, accept: (indent: number) => boolean, floor: number) {
  for (let n = item.line.number - 1; n >= 1; n--) {
    const line = state.doc.line(n);
    if (line.text.trim() === "") continue;
    const indent = lineIndent(line.text);
    const candidate = parseItem(line);
    if (candidate && accept(candidate.indent)) return candidate;
    if (indent < floor) return null;
  }
  return null;
}

// Shift every non-blank line of the subtree by `delta` columns and give the
// item a new number when it's ordered.
function reindent(view: EditorView, item: ListItem, delta: number, number: number | undefined, userEvent: string) {
  const { state } = view;
  const changes: ChangeSpec[] = [];
  for (let n = item.line.number; n <= subtreeLastLine(state, item); n++) {
    const line = state.doc.line(n);
    if (line.text.trim() === "") continue;
    if (delta > 0) {
      changes.push({ from: line.from, insert: " ".repeat(delta) });
    } else {
      let removed = 0;
      let chars = 0;
      while (removed < -delta && /\s/.test(line.text[chars] ?? "")) {
        removed += line.text[chars] === "\t" ? 4 : 1;
        chars += 1;
      }
      if (chars) changes.push({ from: line.from, to: line.from + chars });
    }
  }
  if (number !== undefined && item.delimiter && number !== item.number) {
    changes.push({ from: item.markerFrom, to: item.markerTo, insert: `${number}${item.delimiter}` });
  }
  const changeSet = state.changes(changes);
  view.dispatch({
    changes: changeSet,
    selection: state.selection.map(changeSet, 1),
    userEvent,
    scrollIntoView: true,
  });
}

// Tab on a list item nests it, with its children, under the item above: it
// lines up with that item's text (two columns under "- ", three under "1. ")
// and an ordered item continues the numbering at its new level. The first
// item of a list has nothing to nest under, so it just moves two columns.
function indentListItem(view: EditorView, item: ListItem): boolean {
  const { state } = view;
  const sibling = findPrevious(state, item, (indent) => indent <= item.indent, item.indent);
  if (!sibling || sibling.indent !== item.indent) {
    reindent(view, item, INDENT.length, undefined, "input.indent.list");
    return true;
  }
  const target = sibling.contentColumn;
  let number: number | undefined;
  if (item.number !== undefined) {
    const before = findPrevious(state, item, (indent) => indent <= target, target);
    number = before && before.indent === target && before.number !== undefined ? before.number + 1 : 1;
  }
  reindent(view, item, target - item.indent, number, "input.indent.list");
  return true;
}

// Shift+Tab lifts the item, with its children, back to its parent's level;
// an ordered item then follows its parent's number.
function outdentListItem(view: EditorView, item: ListItem): boolean {
  if (item.indent === 0) return true;
  const parent = findPrevious(view.state, item, (indent) => indent < item.indent, item.indent);
  const target = parent ? parent.indent : 0;
  const number = item.number !== undefined && parent?.number !== undefined ? parent.number + 1 : undefined;
  reindent(view, item, target - item.indent, number, "delete.dedent.list");
  return true;
}

function currentItem(view: EditorView): ListItem | null {
  const { from, to } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  if (view.state.doc.lineAt(to).number !== line.number) return null;
  return parseItem(line);
}

// Enter on a list item starts the next item: same bullet, next number, and a
// fresh "[ ] " for task items. Enter on an empty item outdents it one level,
// or ends the list when it's already at the top level, leaving a blank line
// so the text typed next isn't read as part of the last item.
export function continueListOnEnter(view: EditorView): boolean {
  const { state } = view;
  const item = currentItem(view);
  if (!item) return continueFromItemText(view);
  const { from, to } = state.selection.main;
  const prefixEnd = item.line.from + item.prefixLength;
  if (from < prefixEnd) return false; // cursor sits in the marker: plain newline

  if (item.line.text.slice(item.prefixLength).trim() === "") {
    if (item.indent > 0) return outdentListItem(view, item);
    const previous = item.line.number > 1 ? state.doc.line(item.line.number - 1).text : "";
    const insert = previous.trim() === "" ? "" : "\n";
    view.dispatch({
      changes: { from: item.line.from, to: item.line.to, insert },
      selection: EditorSelection.cursor(item.line.from + insert.length),
      userEvent: "delete.format.list",
      scrollIntoView: true,
    });
    return true;
  }

  // Splitting mid-text: the moved text starts right after the new marker.
  let end = to;
  while (end < item.line.to && state.doc.sliceString(end, end + 1) === " ") end += 1;
  const indent = /^\s*/.exec(item.line.text)![0];
  const marker = item.number !== undefined ? `${item.number + 1}${item.delimiter}` : item.bullet;
  const insert = `\n${indent}${marker}${item.spacing}${item.task ? "[ ] " : ""}`;
  view.dispatch({
    changes: { from, to: end, insert },
    selection: EditorSelection.cursor(from + insert.length),
    userEvent: "input.format.list",
    scrollIntoView: true,
  });
  return true;
}

// The item a marker-less line belongs to: a line typed after Shift+Enter,
// lined up with the text of the item above it.
function owningItem(state: EditorState, line: Line): ListItem | null {
  const indent = lineIndent(line.text);
  if (line.text.trim() === "" || indent === 0) return null;
  for (let n = line.number - 1; n >= 1; n--) {
    const above = state.doc.line(n);
    if (above.text.trim() === "") return null;
    const item = parseItem(above);
    if (item) return indent >= item.contentColumn ? item : null;
  }
  return null;
}

// Enter at the end of such a line starts the item's next sibling.
function continueFromItemText(view: EditorView): boolean {
  const { state } = view;
  const { from, to } = state.selection.main;
  const line = state.doc.lineAt(from);
  if (to !== line.to || state.doc.lineAt(to).number !== line.number) return false;
  const item = owningItem(state, line);
  if (!item) return false;
  const indent = /^\s*/.exec(item.line.text)![0];
  const marker = item.number !== undefined ? `${item.number + 1}${item.delimiter}` : item.bullet;
  const insert = `\n${indent}${marker}${item.spacing}${item.task ? "[ ] " : ""}`;
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.cursor(from + insert.length),
    userEvent: "input.format.list",
    scrollIntoView: true,
  });
  return true;
}

// Shift+Enter on a list item breaks the line inside the item: no new marker,
// and the new line lines up with the item's text so it stays in the item.
export function breakLineInListItem(view: EditorView): boolean {
  const item = currentItem(view);
  if (!item) return false;
  const { from, to } = view.state.selection.main;
  if (from < item.line.from + item.prefixLength) return false;
  const insert = `\n${" ".repeat(width(item.line.text.slice(0, item.prefixLength)))}`;
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.cursor(from + insert.length),
    userEvent: "input.format.list",
    scrollIntoView: true,
  });
  return true;
}

// Backspace right after an item's marker: a nested item moves out a level, a
// top-level one turns back into a plain line (its text stays).
export function removeListMarkerOnBackspace(view: EditorView): boolean {
  const { main } = view.state.selection;
  if (!main.empty) return false;
  const item = currentItem(view);
  if (!item || main.head !== item.line.from + item.prefixLength) return false;
  if (item.indent > 0) return outdentListItem(view, item);
  view.dispatch({
    changes: { from: item.line.from, to: main.head },
    userEvent: "delete.format.list",
  });
  return true;
}

// Tab on a list item nests it; on any other line, or a selection spanning
// several lines, it indents the lines.
export function indentListOrLines(view: EditorView): boolean {
  const item = currentItem(view);
  return item ? indentListItem(view, item) : indentMore(view);
}

export function outdentListOrLines(view: EditorView): boolean {
  const item = currentItem(view);
  return item ? outdentListItem(view, item) : indentLess(view);
}
