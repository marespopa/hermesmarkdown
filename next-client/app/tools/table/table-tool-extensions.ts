import type { Extension } from "@codemirror/state";
import { drawSelection, EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { tableDisplayExtension } from "@/app/editor/codemirror/table-display";
import { tableKeyBindings } from "@/app/editor/codemirror/table-keymap";
import { editorTheme } from "@/app/editor/codemirror/theme";

// The editor's table grid, alone: the same widget, menus and keyboard model
// as in a note, without the workspace. No code-language data, so the chunk
// stays small.
export function tableToolExtensions(onDocChange: (doc: string) => void): Extension[] {
  return [
    editorTheme(),
    history(),
    drawSelection(),
    markdown({ base: markdownLanguage, addKeymap: false }),
    tableDisplayExtension,
    keymap.of(tableKeyBindings),
    keymap.of([...historyKeymap, ...defaultKeymap]),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onDocChange(update.state.doc.toString());
    }),
  ];
}
