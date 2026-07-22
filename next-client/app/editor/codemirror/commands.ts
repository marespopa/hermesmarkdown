import { EditorView } from "@codemirror/view";
import { KeyBinding } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import {
  REGEX_CHECKBOX,
  REGEX_QUOTE_PREFIX,
  REGEX_TODO_STATUS_TAGS,
  REGEX_URL_PASTE,
} from "../components/regex";
import { detectDelimitedTable, delimitedTextToMarkdownTable } from "../utils/table-manipulation";

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

// Toggle the checkbox on the current line: [ ] <-> [x], keeping any
// #todo/#done status tag on the same line in sync — mirrors the click
// behavior previously in use-editor-handlers.ts's handleEditorClick.
export function toggleCheckboxOnLine(view: EditorView, lineNumber?: number): boolean {
  const line = view.state.doc.line(lineNumber ?? view.state.doc.lineAt(view.state.selection.main.head).number);
  const match = REGEX_CHECKBOX.exec(line.text);
  if (!match) return false;

  const charIdx = line.from + match[1].length;
  const isChecking = line.text[match[1].length].toLowerCase() !== "x";
  const nextChar = isChecking ? "x" : " ";

  const changes = [{ from: charIdx, to: charIdx + 1, insert: nextChar }];

  REGEX_TODO_STATUS_TAGS.lastIndex = 0;
  const statusMatch = REGEX_TODO_STATUS_TAGS.exec(line.text);
  if (statusMatch) {
    const desiredTag = isChecking ? "done" : "todo";
    if (statusMatch[1].toLowerCase() !== desiredTag) {
      const tagStart = line.from + statusMatch.index;
      const tagEnd = tagStart + statusMatch[0].length;
      changes.push({ from: tagStart, to: tagEnd, insert: `#${desiredTag}` });
    }
  }

  view.dispatch(view.state.update({ changes, userEvent: "input.format.checkbox" }));
  return true;
}

// Enter on a quoted/callout line continues the "> " prefix; on an empty
// quoted line it exits the block by stripping the prefix instead.
export function continueQuoteOnEnter(view: EditorView): boolean {
  const { state } = view;
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const match = REGEX_QUOTE_PREFIX.exec(line.text);
  if (!match) return false;

  const prefix = match[0];
  const isEmpty = line.text.slice(prefix.length).trim() === "";

  if (isEmpty) {
    view.dispatch(
      state.update({
        changes: { from: line.from, to: line.to, insert: "" },
        userEvent: "delete.format.quote",
      }),
    );
  } else {
    view.dispatch(
      state.update({
        changes: { from: pos, to: pos, insert: `\n${prefix}` },
        selection: EditorSelection.cursor(pos + 1 + prefix.length),
        userEvent: "input.format.quote",
        scrollIntoView: true,
      }),
    );
  }
  return true;
}

// Pasting a multi-line block onto a quoted line re-prefixes each pasted
// line; pasting a bare URL wraps it as [link](url) with "link" selected;
// pasting CSV/TSV-shaped text asks (via onConfirmCSV) whether to convert it
// into a Markdown table before inserting.
export function handlePasteTransform(
  view: EditorView,
  event: ClipboardEvent,
  onConfirmCSV?: (preview: string) => Promise<boolean>,
): boolean {
  const pastedText = event.clipboardData?.getData("text") ?? "";
  if (!pastedText) return false;
  const { state } = view;
  const range = state.selection.main;

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

  if (REGEX_URL_PASTE.test(pastedText.trim())) {
    const url = pastedText.trim();
    const insert = `[link](${url})`;
    const linkWordStart = range.from + 1;
    const linkWordEnd = linkWordStart + 4;
    view.dispatch(
      state.update({
        changes: { from: range.from, to: range.to, insert },
        selection: EditorSelection.range(linkWordStart, linkWordEnd),
        userEvent: "input.paste.link",
        scrollIntoView: true,
      }),
    );
    event.preventDefault();
    return true;
  }

  if (pastedText.includes("\n")) {
    const line = state.doc.lineAt(range.from);
    const quoteMatch = REGEX_QUOTE_PREFIX.exec(line.text);
    if (quoteMatch) {
      const prefix = quoteMatch[0];
      const insert = pastedText
        .split("\n")
        .map((l, i) => (i === 0 ? l : `${prefix}${l}`))
        .join("\n");
      view.dispatch(
        state.update({
          changes: { from: range.from, to: range.to, insert },
          userEvent: "input.paste.quote",
          scrollIntoView: true,
        }),
      );
      event.preventDefault();
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
  { key: "Mod-b", run: toggleBold, preventDefault: true },
  { key: "Mod-i", run: toggleItalic, preventDefault: true },
  { key: "Mod-Shift-x", run: toggleStrikethrough, preventDefault: true },
  { key: "Mod-e", run: toggleInlineCode, preventDefault: true },
  { key: "Enter", run: continueQuoteOnEnter },
];
