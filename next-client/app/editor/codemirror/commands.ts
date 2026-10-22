import { EditorView } from "@codemirror/view";
import { KeyBinding } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { insertNewline, redo } from "@codemirror/commands";
import { REGEX_CHECKBOX } from "../components/regex";
import { taskStatusFromChar, toggledStatus, type TaskStatus } from "@/app/utils/task-status";
import { statusLineEdits } from "@/app/utils/task-line";
import { detectDelimitedTable, delimitedTextToMarkdownTable } from "../utils/table-manipulation";
import { indentSubtree, outdentSubtree, setTaskStatus, toggleTaskStatus } from "./lineMutations";
import { indentListOrLines, listItemHome, outdentListOrLines } from "./list-commands";
import { insertTable, setHeading, toggleCodeBlock, wrapAsLink } from "./format-shortcuts";
import { setBlockType, toggleBlockType } from "./block-type";

function wrapSelection(marker: string, userEvent: string) {
  return (view: EditorView): boolean => {
    const changes = view.state.changeByRange((range) => {
      const selected = view.state.sliceDoc(range.from, range.to);
      const insert = `${marker}${selected}${marker}`;
      return {
        changes: { from: range.from, to: range.to, insert },
        range: range.empty
          ? EditorSelection.cursor(range.from + marker.length)
          : EditorSelection.range(range.from + marker.length, range.to + marker.length),
      };
    });
    view.dispatch(view.state.update(changes, { userEvent, scrollIntoView: true }));
    return true;
  };
}

export const toggleBold = wrapSelection("**", "input.format.bold");
export const toggleItalic = wrapSelection("_", "input.format.italic");
export const toggleStrikethrough = wrapSelection("~~", "input.format.strikethrough");
export const toggleInlineCode = wrapSelection("`", "input.format.code");

export function indentCurrentSubtree(view: EditorView): boolean {
  return indentSubtree(view, view.state.doc.lineAt(view.state.selection.main.head).number);
}

export function outdentCurrentSubtree(view: EditorView): boolean {
  return outdentSubtree(view, view.state.doc.lineAt(view.state.selection.main.head).number);
}

export function cycleTaskStatusOnCurrentLine(view: EditorView): boolean {
  return toggleTaskStatus(view, view.state.doc.lineAt(view.state.selection.main.head).number);
}

// Sets the current line's task box to one status (palette commands).
export function setTaskStatusOnCurrentLine(status: TaskStatus) {
  return (view: EditorView): boolean =>
    setTaskStatus(view, view.state.doc.lineAt(view.state.selection.main.head).number, status);
}

// Toggle the checkbox on the current line: an open task ([ ], [/], [!])
// becomes [x], a done or cancelled one [ ], with the stamps (task-line.ts).
export function toggleCheckboxOnLine(view: EditorView, lineNumber?: number): boolean {
  const line = view.state.doc.line(lineNumber ?? view.state.doc.lineAt(view.state.selection.main.head).number);
  const match = REGEX_CHECKBOX.exec(line.text);
  if (!match) return false;

  const edits = statusLineEdits(line.text, toggledStatus(taskStatusFromChar(match[2])));
  if (!edits) return false;
  view.dispatch(view.state.update({
    changes: edits.map((edit) => ({ from: line.from + edit.from, to: line.from + edit.to, insert: edit.insert })),
    userEvent: "input.format.checkbox",
  }));
  return true;
}

// Pasting CSV/TSV-shaped text asks (via onConfirmCSV) whether to convert it
// into a Markdown table before inserting; anything else pastes as it is.
export function handlePasteTransform(
  view: EditorView,
  event: ClipboardEvent,
  onConfirmCSV?: (preview: string) => Promise<boolean>,
): boolean {
  const pastedText = event.clipboardData?.getData("text") ?? "";
  if (!pastedText) return false;
  const range = view.state.selection.main;

  if (onConfirmCSV) {
    const delimiter = detectDelimitedTable(pastedText.trim());
    if (delimiter) {
      event.preventDefault();
      onConfirmCSV(pastedText.trim()).then((confirmed) => {
        const insert = confirmed
          ? delimitedTextToMarkdownTable(pastedText.trim(), delimiter)
          : pastedText;
        view.dispatch(
          view.state.update({
            changes: { from: range.from, to: range.to, insert },
            userEvent: confirmed ? "input.paste.csvtable" : "input.paste",
            scrollIntoView: true,
          }),
        );
      });
      return true;
    }
  }

  return false;
}

// Pasting/dropping an image inserts a placeholder immediately (so the user
// sees feedback before the async write to the vault's assets/ folder
// finishes), then swaps it for the final markdown image link once
// saveImage resolves. Looks the placeholder back up by text rather than
// tracking a position, since typing elsewhere in the doc while the write
// is in flight would otherwise shift a tracked offset out from under it.
export function insertPastedImage(
  view: EditorView,
  file: File,
  saveImage: (file: File) => Promise<string | null>,
  at?: number,
): void {
  const range = view.state.selection.main;
  const from = at ?? range.from;
  const to = at ?? range.to;
  const placeholder = `![Uploading ${file.name || "image"}...]()`;
  view.dispatch(
    view.state.update({
      changes: { from, to, insert: placeholder },
      selection: EditorSelection.cursor(from + placeholder.length),
      userEvent: "input.paste.image",
      scrollIntoView: true,
    }),
  );

  saveImage(file).then((relPath) => {
    const text = view.state.doc.toString();
    const idx = text.indexOf(placeholder);
    if (idx === -1) return;
    const finalText = relPath ? `![](${relPath})` : "";
    view.dispatch(
      view.state.update({
        changes: { from: idx, to: idx + placeholder.length, insert: finalText },
        userEvent: "input.paste.image",
      }),
    );
  });
}

export const formatKeymap: readonly KeyBinding[] = [
  { key: "Tab", run: indentListOrLines, preventDefault: true },
  { key: "Shift-Tab", run: outdentListOrLines, preventDefault: true },
  { key: "Mod-Enter", run: cycleTaskStatusOnCurrentLine, preventDefault: true },
  { key: "Mod-b", run: toggleBold, preventDefault: true },
  { key: "Mod-i", run: toggleItalic, preventDefault: true },
  { key: "Mod-Shift-x", run: toggleStrikethrough, preventDefault: true },
  { key: "Mod-Shift-s", run: toggleStrikethrough, preventDefault: true },
  { key: "Mod-e", run: toggleInlineCode, preventDefault: true },
  { key: "Mod-Shift-m", run: toggleInlineCode, preventDefault: true },
  { key: "Mod-Alt-0", run: setBlockType("text"), preventDefault: true },
  ...[1, 2, 3, 4, 5, 6].map((level) => ({ key: `Mod-Alt-${level}`, run: setHeading(level), preventDefault: true })),
  { key: "Mod-Shift-7", run: toggleBlockType("numbered"), preventDefault: true },
  { key: "Mod-Shift-8", run: toggleBlockType("bullet"), preventDefault: true },
  { key: "Mod-Shift-9", run: toggleBlockType("quote"), preventDefault: true },
  // Mod-k opens the quick switcher; Mod-Shift-l is searchKeymap's select all matches.
  { key: "Mod-Alt-k", run: wrapAsLink, preventDefault: true },
  { key: "Mod-Alt-c", run: toggleCodeBlock, preventDefault: true },
  { key: "Mod-Shift-i", run: insertTable, preventDefault: true },
  // Cmd+Y redoes on macOS too (historyKeymap only binds Cmd+Shift+Z there).
  { mac: "Mod-y", run: redo, preventDefault: true },
  // Enter is a plain line break: no list or quote continuation, no indent.
  { key: "Enter", run: insertNewline },
  { key: "Shift-Enter", run: insertNewline },
  { key: "Home", run: listItemHome },
];
