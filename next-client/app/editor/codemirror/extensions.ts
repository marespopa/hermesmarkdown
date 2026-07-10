import { Extension } from "@codemirror/state";
import { EditorView, keymap, drawSelection, placeholder as placeholderExt } from "@codemirror/view";
import { history, historyKeymap, defaultKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { ViewUpdate } from "@codemirror/view";
import { autocompletion } from "@codemirror/autocomplete";
import { codeFolding } from "@codemirror/language";
import { editorTheme } from "./theme";
import { formatKeymap, toggleCheckboxOnLine, handlePasteTransform } from "./commands";
import { REGEX_CHECKBOX } from "../components/regex";
import { markdownHighlightPlugin } from "./highlight";
import { shortcodeExpandPlugin } from "./shortcode-expand";
import { createSlashMenuSource, SlashMenuCallbacks } from "./slash-menu";
import { createWikiLinkTriggerPlugin, WikiLinkTriggerCallback } from "./wikilink-trigger";
import {
  tableTabCommand,
  tableShiftTabCommand,
  tablePipeEscapeCommand,
  tableEnterCommand,
  tableArrowVerticalCommand,
} from "./table-commands";

interface BuildExtensionsOptions {
  wordWrap: boolean;
  placeholder?: string;
  readOnly: boolean;
  onFocusChange: (focused: boolean) => void;
  onCursorActivity?: (view: EditorView) => void;
  slashMenuCallbacksRef: { current: SlashMenuCallbacks };
  wikiLinkTriggerRef: { current: WikiLinkTriggerCallback | null };
  csvConfirmRef?: { current: ((preview: string) => Promise<boolean>) | null };
}

export function buildExtensions(opts: BuildExtensionsOptions): Extension[] {
  const extensions: Extension[] = [
    editorTheme(),
    history(),
    drawSelection(),
    // addKeymap: false — lang-markdown's built-in Enter continuation for
    // lists/blockquotes stacks with our own continueQuoteOnEnter command
    // (formatKeymap), producing doubled "> " prefixes. We own continuation
    // logic explicitly instead (matches the old app, which never
    // auto-continued plain "- " list items either).
    markdown({ base: markdownLanguage, codeLanguages: undefined, addKeymap: false }),
    codeFolding(),
    markdownHighlightPlugin,
    shortcodeExpandPlugin,
    createWikiLinkTriggerPlugin(opts.wikiLinkTriggerRef),
    autocompletion({
      override: [createSlashMenuSource(opts.slashMenuCallbacksRef)],
      activateOnTyping: true,
      icons: false,
    }),
    // Table shortcuts take priority over formatKeymap's plain quote-continue
    // Enter binding — mirrors the old handleGlobalKeyDown, which checked
    // onTableKeyDown?.() first. Each table command returns false (falling
    // through to the next binding) when the cursor isn't inside a table.
    keymap.of([
      { key: "Tab", run: tableTabCommand },
      { key: "Shift-Tab", run: tableShiftTabCommand },
      { key: "|", run: tablePipeEscapeCommand },
      { key: "Enter", run: tableEnterCommand },
      { key: "ArrowDown", run: (view) => tableArrowVerticalCommand(view, 1) },
      { key: "ArrowUp", run: (view) => tableArrowVerticalCommand(view, -1) },
    ]),
    keymap.of([...formatKeymap, ...historyKeymap, ...defaultKeymap]),
    EditorView.editable.of(!opts.readOnly),
    EditorView.domEventHandlers({
      paste: (event, view) =>
        handlePasteTransform(view, event, opts.csvConfirmRef?.current ?? undefined),
      mousedown: (event, view) => {
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos == null) return false;
        const line = view.state.doc.lineAt(pos);
        const match = REGEX_CHECKBOX.exec(line.text);
        if (!match) return false;
        const boxStart = line.from + match[0].indexOf("[");
        const boxEnd = line.from + match[0].indexOf("]") + 1;
        if (pos < boxStart || pos > boxEnd) return false;
        event.preventDefault();
        toggleCheckboxOnLine(view, line.number);
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
      if (update.selectionSet || update.docChanged) {
        opts.onCursorActivity?.(update.view);
      }
    }),
  ];

  if (opts.wordWrap) extensions.push(EditorView.lineWrapping);
  if (opts.placeholder) extensions.push(placeholderExt(opts.placeholder));

  return extensions;
}
