import { ChangeSpec, EditorSelection, EditorState, Line } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { indentLess, indentMore } from "@codemirror/commands";

// indent, bullet or "1." / "1)", spacing, optional task box.
const LIST_ITEM = /^(\s*)([-*+]|(\d+)([.)]))(\s+)(\[[ xX/!-]\]\s+)?/;
// One nesting level, as in most Markdown editors: four spaces.
const INDENT = "    ";

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

// A list line: an item, or a blank or indented line between items.
function inList(line: Line): boolean {
  return line.text.trim() === "" || lineIndent(line.text) > 0 || parseItem(line) !== null;
}

// Number every run of ordered siblings in the list around line `around`
// straight on from the run's first item, so moving an item in or out never
// leaves a gap or a repeat ("1. 3." after nesting the 2.).
function renumberList(state: EditorState, around: number): ChangeSpec[] {
  let first = around;
  while (first > 1 && inList(state.doc.line(first - 1))) first--;
  let last = around;
  while (last < state.doc.lines && inList(state.doc.line(last + 1))) last++;
  const changes: ChangeSpec[] = [];
  // The last item seen at each open level, outermost first.
  const levels: ListItem[] = [];
  for (let n = first; n <= last; n++) {
    const line = state.doc.line(n);
    if (line.text.trim() === "") continue;
    const indent = lineIndent(line.text);
    const item = parseItem(line);
    while (levels.length && levels[levels.length - 1].indent > indent) levels.pop();
    if (!item) continue;
    const previous = levels[levels.length - 1];
    if (previous?.indent === indent) levels.pop();
    let number = item.number;
    if (number !== undefined && previous?.indent === indent && previous.number !== undefined && previous.delimiter === item.delimiter) {
      number = previous.number + 1;
      if (number !== item.number) changes.push({ from: item.markerFrom, to: item.markerTo, insert: `${number}${item.delimiter}` });
    }
    levels.push({ ...item, number });
  }
  return changes;
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
  const moved = state.changes(changes);
  const after = state.update({ changes: moved }).state;
  const changeSet = moved.compose(after.changes(renumberList(after, after.doc.lineAt(moved.mapPos(item.line.from)).number)));
  view.dispatch({
    changes: changeSet,
    selection: state.selection.map(changeSet, 1),
    userEvent,
    scrollIntoView: true,
  });
}

// The column `sibling`'s children start at: where its existing children
// already are, so a list keeps one indent per level, else one level (four
// spaces) in, and never short of the sibling's text, which a child needs to
// stay in the item ("100. " is five wide).
function childColumn(state: EditorState, sibling: ListItem, item: ListItem): number {
  for (let n = sibling.line.number + 1; n < item.line.number; n++) {
    const child = parseItem(state.doc.line(n));
    if (child && child.indent > sibling.indent) return child.indent;
  }
  return Math.max(sibling.indent + INDENT.length, sibling.contentColumn);
}

// Tab on a list item nests it, with its children, under the item above, one
// level (four spaces) in, and an ordered item continues the numbering at its
// new level. The first item of a list, or of a nested level, has nothing to
// nest under and stays put: one more level would skip one, and Markdown reads
// an item that deep as a code block.
function indentListItem(view: EditorView, item: ListItem): boolean {
  const { state } = view;
  const sibling = findPrevious(state, item, (indent) => indent <= item.indent, item.indent);
  if (!sibling || sibling.indent !== item.indent) return true;
  const target = childColumn(state, sibling, item);
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

// Home on a list item goes to where its text starts (a task's `[`), and from
// there, or from in front of it, to the start of the line. Other lines, and
// Shift-Home, keep the editor's own Home.
export function listItemHome(view: EditorView): boolean {
  const { main } = view.state.selection;
  if (!main.empty) return false;
  const item = currentItem(view);
  if (!item) return false;
  const textStart = item.task ? item.markerTo + item.spacing.length : item.line.from + item.prefixLength;
  const target = main.head > textStart ? textStart : item.line.from;
  if (target === main.head) return false;
  view.dispatch({ selection: EditorSelection.cursor(target), userEvent: "select", scrollIntoView: true });
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
