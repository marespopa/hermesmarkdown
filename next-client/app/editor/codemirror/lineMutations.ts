import { ChangeSet, EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

const LIST_LINE = /^(\s*)([-*+]\s+|\d+[.)]\s+)(.*)$/;
const TASK_LINE = /^(\s*)(?:[-*+]\s+|\d+[.)]\s+)\[([ xX/\-])\]/;
const INDENT = "  ";

function subtreeEnd(lines: string[], lineNumber: number): number {
  const source = lines[lineNumber]?.match(LIST_LINE);
  if (!source) return lineNumber + 1;
  const baseIndent = source[1].replace(/\t/g, "    ").length;
  let end = lineNumber + 1;
  while (end < lines.length) {
    const match = lines[end].match(LIST_LINE);
    if (!match) {
      if (lines[end].trim() !== "") break;
      end += 1;
      continue;
    }
    const indent = match[1].replace(/\t/g, "    ").length;
    if (indent <= baseIndent) break;
    end += 1;
  }
  return end;
}

function replaceLines(content: string, start: number, end: number, transform: (line: string) => string): string {
  const lines = content.split("\n");
  lines.splice(start, end - start, ...lines.slice(start, end).map(transform));
  return lines.join("\n");
}

export function indentSubtreeInContent(content: string, lineNumber: number): string {
  const lines = content.split("\n");
  if (!lines[lineNumber]?.match(LIST_LINE)) return content;
  return replaceLines(content, lineNumber, subtreeEnd(lines, lineNumber), (line) =>
    line.trim() ? `${INDENT}${line}` : line,
  );
}

export function outdentSubtreeInContent(content: string, lineNumber: number): string {
  const lines = content.split("\n");
  if (!lines[lineNumber]?.match(LIST_LINE)) return content;
  return replaceLines(content, lineNumber, subtreeEnd(lines, lineNumber), (line) =>
    line.startsWith(INDENT) ? line.slice(INDENT.length) : line.replace(/^\t/, ""),
  );
}

export function toggleTaskStatusInContent(content: string, lineNumber: number): string {
  const lines = content.split("\n");
  const line = lines[lineNumber];
  const match = line?.match(TASK_LINE);
  if (!match) return content;

  const markerOffset = (match.index ?? 0) + match[0].lastIndexOf("[") + 1;
  const current = line[markerOffset]?.toLowerCase();
  const next = current === " " ? "/" : current === "/" ? "x" : " ";
  lines[lineNumber] = `${line.slice(0, markerOffset)}${next}${line.slice(markerOffset + 1)}`;
  return lines.join("\n");
}

export function insertChildInContent(content: string, lineNumber: number): string {
  const lines = content.split("\n");
  const parent = lines[lineNumber]?.match(LIST_LINE);
  if (!parent) return content;
  const childIndent = `${parent[1]}${INDENT}`;
  lines.splice(lineNumber + 1, 0, `${childIndent}${parent[2]}[ ] `);
  return lines.join("\n");
}

export function moveSubtreeInContent(content: string, lineNumber: number, direction: "up" | "down"): string {
  const lines = content.split("\n");
  const current = lines[lineNumber]?.match(LIST_LINE);
  if (!current) return content;
  const end = subtreeEnd(lines, lineNumber);
  const indent = current[1].replace(/\t/g, "    ").length;
  let siblingStart = direction === "up" ? lineNumber - 1 : end;
  if (direction === "up") {
    while (siblingStart >= 0) {
      const candidate = lines[siblingStart].match(LIST_LINE);
      if (candidate && candidate[1].replace(/\t/g, "    ").length <= indent) break;
      siblingStart -= 1;
    }
    const sibling = lines[siblingStart]?.match(LIST_LINE);
    if (!sibling || sibling[1].replace(/\t/g, "    ").length !== indent) return content;
    const siblingEnd = subtreeEnd(lines, siblingStart);
    const block = lines.splice(lineNumber, end - lineNumber);
    lines.splice(siblingStart, 0, ...block);
    return lines.join("\n");
  }

  while (siblingStart < lines.length && lines[siblingStart].trim() === "") siblingStart += 1;
  const sibling = lines[siblingStart]?.match(LIST_LINE);
  if (!sibling || sibling[1].replace(/\t/g, "    ").length !== indent) return content;
  const siblingEnd = subtreeEnd(lines, siblingStart);
  const block = lines.splice(lineNumber, end - lineNumber);
  lines.splice(siblingEnd - block.length, 0, ...block);
  return lines.join("\n");
}

function dispatchContentMutation(
  view: EditorView,
  nextContent: string,
  userEvent: string,
  selection?: EditorSelection,
): boolean {
  const current = view.state.doc.toString();
  if (current === nextContent) return false;

  let from = 0;
  while (from < current.length && from < nextContent.length && current[from] === nextContent[from]) from += 1;
  let currentEnd = current.length;
  let nextEnd = nextContent.length;
  while (currentEnd > from && nextEnd > from && current[currentEnd - 1] === nextContent[nextEnd - 1]) {
    currentEnd -= 1;
    nextEnd -= 1;
  }
  const changes = ChangeSet.of(
    { from, to: currentEnd, insert: nextContent.slice(from, nextEnd) },
    current.length,
  );

  view.dispatch({
    changes,
    selection: selection ?? view.state.selection.map(changes),
    userEvent,
    scrollIntoView: true,
  });
  return true;
}

export function indentSubtree(view: EditorView, lineNumber: number): boolean {
  const line = view.state.doc.line(lineNumber);
  const selection = EditorSelection.create(
    view.state.selection.ranges.map((range) =>
      EditorSelection.range(
        range.anchor >= line.from && range.anchor <= line.to ? range.anchor + INDENT.length : range.anchor,
        range.head >= line.from && range.head <= line.to ? range.head + INDENT.length : range.head,
      ),
    ),
    view.state.selection.mainIndex,
  );
  return dispatchContentMutation(
    view,
    indentSubtreeInContent(view.state.doc.toString(), lineNumber - 1),
    "input.outline.indent",
    selection,
  );
}

export function outdentSubtree(view: EditorView, lineNumber: number): boolean {
  const line = view.state.doc.line(lineNumber);
  const removableIndent = line.text.startsWith(INDENT) ? INDENT.length : line.text.startsWith("\t") ? 1 : 0;
  const selection = EditorSelection.create(
    view.state.selection.ranges.map((range) =>
      EditorSelection.range(
        range.anchor >= line.from && range.anchor <= line.to ? Math.max(line.from, range.anchor - removableIndent) : range.anchor,
        range.head >= line.from && range.head <= line.to ? Math.max(line.from, range.head - removableIndent) : range.head,
      ),
    ),
    view.state.selection.mainIndex,
  );
  return dispatchContentMutation(
    view,
    outdentSubtreeInContent(view.state.doc.toString(), lineNumber - 1),
    "input.outline.outdent",
    selection,
  );
}

export function toggleTaskStatus(view: EditorView, lineNumber: number): boolean {
  return dispatchContentMutation(view, toggleTaskStatusInContent(view.state.doc.toString(), lineNumber - 1), "input.outline.task");
}

export function moveSubtree(view: EditorView, lineNumber: number, direction: "up" | "down"): boolean {
  return dispatchContentMutation(view, moveSubtreeInContent(view.state.doc.toString(), lineNumber - 1, direction), `input.outline.move.${direction}`);
}

export function insertChildTask(view: EditorView, lineNumber: number): boolean {
  const nextContent = insertChildInContent(view.state.doc.toString(), lineNumber - 1);
  const changed = dispatchContentMutation(view, nextContent, "input.outline.insert-child");
  if (changed) {
    const line = view.state.doc.line(lineNumber + 1);
    view.dispatch({ selection: EditorSelection.cursor(line.from + line.length), scrollIntoView: true });
  }
  return changed;
}