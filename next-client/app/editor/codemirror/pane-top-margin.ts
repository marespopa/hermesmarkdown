import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

// The room kept at the top of a pane for its floating title (--pane-top-room,
// PaneLeaf; unset on a phone). CodeMirror uses the margin twice: to keep the
// caret clear of the title when scrolling it into view, and to decide which
// lines are covered, whose menus (the `/` commands, emoji, fields) it hides.
//
// The note scrolls in the pane (`.editor-canvas`), not in CodeMirror, and
// the sheet already starts the text below the title. So at the top of the
// note nothing is covered and the margin is 0: with the room there, the
// first lines counted as hidden and `/` showed nothing on them. Once the
// text has scrolled under the title, the margin is the room.
export function paneTopMargin(view: EditorView): number {
  const room = parseFloat(getComputedStyle(view.dom).getPropertyValue("--pane-top-room")) || 0;
  if (!room) return 0;
  const canvas = view.dom.closest(".editor-canvas");
  if (!canvas) return room;
  const textTop = view.scrollDOM.getBoundingClientRect().top - canvas.getBoundingClientRect().top;
  return textTop >= room - 0.5 ? 0 : room;
}

export const paneTopScrollMargin: Extension = EditorView.scrollMargins.of((view) => ({ top: paneTopMargin(view) }));
