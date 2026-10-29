import type { Extension } from "@codemirror/state";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, drawSelection, rectangularSelection, crosshairCursor, placeholder as placeholderExt, type ViewUpdate } from "@codemirror/view";
import { history, historyKeymap, defaultKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { loadedVim } from "./vim-loader";
import { editorTheme } from "./theme";
import { CODE_FONT } from "./live-markers-theme";
import { codeEditing, codeGutters } from "./code-editing";
import { editorFilePath, formatCodeKeymap } from "./format-code-command";
import { invisibles } from "./invisibles";
import { findReplace } from "./find-replace";
import type { BuildExtensionsOptions } from "./extensions";

// Code and other text files (utils/file-kinds.ts) in the same editor, as
// plain text: the file's language highlights it (in the notes' code
// colours), in the code font, and nothing else of a note's applies: no
// Markdown rendering or mark reveal, slash menu, shortcodes, wikilinks,
// tables, Markdown paste or images, so typing and pasting are never
// rewritten. Tab indents; lines are always numbered (the Line Numbers
// setting is the notes'); word wrap, invisibles, Vim and find work as in
// notes. Flow mode is a note's, so it's left out. A file
// with a recognised language also gets code editing (code-editing.ts):
// bracket pairs, re-indent and folding.
const codeFontTheme = EditorView.theme({
  ".cm-content, .cm-gutters": { fontFamily: CODE_FONT },
});

export function buildPlainTextExtensions(opts: BuildExtensionsOptions): Extension[] {
  const extensions: Extension[] = [
    editorTheme(),
    codeFontTheme,
    opts.codeLanguage ?? [],
    opts.codeLanguage ? codeEditing() : [],
    editorFilePath.of(opts.filePath ?? ""),
    opts.wordWrapCompartment.of(opts.wordWrap ? EditorView.lineWrapping : []),
    opts.lineNumbersCompartment.of(codeGutters(!!opts.codeLanguage)),
    opts.invisiblesCompartment.of(opts.showInvisibles ? invisibles() : []),
    opts.flowModeCompartment.of([]),
    EditorView.scrollMargins.of((view) => ({
      top: parseFloat(getComputedStyle(view.dom).getPropertyValue("--pane-top-room")) || 0,
    })),
    history(),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
    rectangularSelection(),
    crosshairCursor(),
    opts.vimModeCompartment.of(opts.vimMode ? loadedVim()?.vim() ?? [] : []),
    findReplace(),
    keymap.of(formatCodeKeymap(false)),
    keymap.of([...searchKeymap, ...historyKeymap, indentWithTab, ...defaultKeymap.filter((binding) => binding.key !== "Mod-[" && binding.key !== "Mod-]")]),
    EditorView.domEventHandlers({
      keydown: (event, view) => {
        if (event.key !== "Escape") return false;
        const vimModule = loadedVim();
        const cm = vimModule?.getCM(view);
        if (!vimModule || !cm) return false;
        vimModule.Vim.handleKey(cm, "<Esc>", "user");
        event.preventDefault();
        event.stopPropagation();
        return true;
      },
      focus: () => {
        opts.onFocusChange(true);
        return false;
      },
      blur: () => {
        opts.onFocusChange(false);
        return false;
      },
    }),
    EditorView.updateListener.of((update: ViewUpdate) => {
      const hasEffects = update.transactions.some((transaction) => transaction.effects.length > 0);
      if (update.selectionSet || update.docChanged || hasEffects) {
        opts.onCursorActivity?.(update.view);
      } else if (update.viewportChanged || update.geometryChanged) {
        opts.onViewportChange?.(update.view);
      }
    }),
  ];
  if (opts.placeholder) extensions.push(placeholderExt(opts.placeholder));
  return extensions;
}
