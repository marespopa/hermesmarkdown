import { Compartment, Extension } from "@codemirror/state";
import { EditorView, keymap, drawSelection, placeholder as placeholderExt } from "@codemirror/view";
import { history, historyKeymap, defaultKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { ViewUpdate } from "@codemirror/view";
import { autocompletion } from "@codemirror/autocomplete";
import { codeFolding } from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { loadedVim } from "./vim-loader";
import { editorTheme } from "./theme";
import { formatKeymap, toggleCheckboxOnLine, handlePasteTransform, insertPastedImage } from "./commands";
import { getImageFile, getImageFromClipboardItems } from "@/app/utils/paste-image";
import { REGEX_CHECKBOX } from "../components/regex";
import { horizontalRuleCursorPlugin, markdownHighlightPlugin } from "./highlight";
import { tagPillPlugin } from "./tag-pills";
import { linkDisplayPlugin } from "./link-display";
import { annotationDisplayPlugin } from "./annotation-display";
import { tableDisplayExtension } from "./table-display";
import { renderedBlockExtension } from "./rendered-block";
import { shortcodeExpandPlugin } from "./shortcode-expand";
import { noteCalcExtension } from "./note-calc";
import { createSlashMenuSource, SlashMenuCallbacks } from "./slash-menu";
import { createTemplateFieldSource } from "./template-field-completion";
import { templateFieldPills } from "./template-field-pills";
import { templateBlanks } from "./template-blanks";
import { createWikiLinkTriggerPlugin, WikiLinkTriggerCallback } from "./wikilink-trigger";
import {
  tableTabCommand,
  tableShiftTabCommand,
  tablePipeEscapeCommand,
  tableEnterCommand,
  tableArrowVerticalCommand,
  tableMoveRowCommand,
  tableMoveColumnCommand,
  tableInsertRowCommand,
  tableDeleteRowCommand,
} from "./table-commands";
import { frontmatterCollapse } from "./frontmatter-fold";
import { flowMode } from "./flow-mode";
import { liveMarkers } from "./live-markers";
import { invisibles } from "./invisibles";
import { editorLineNumbers } from "./line-numbers";
import { findReplace } from "./find-replace";
import { collapsedCalloutCorners } from "./callout-fold";

interface BuildExtensionsOptions {
  wordWrap: boolean;
  wordWrapCompartment: Compartment;
  lineNumbers: boolean;
  lineNumbersCompartment: Compartment;
  showInvisibles: boolean;
  invisiblesCompartment: Compartment;
  /** Vim mode on; the caller has already awaited `loadVim()`. */
  vimMode: boolean;
  vimModeCompartment: Compartment;
  flowMode: boolean;
  flowModeCompartment: Compartment;
  onOpenActiveHelperRef: { current: () => boolean };
  placeholder?: string;
  readOnly: boolean;
  onFocusChange: (focused: boolean) => void;
  onCursorActivity?: (view: EditorView) => void;
  // Scrolling or layout changes (rendered viewport, line heights, size):
  // overlays positioned from coordsAtPos need recomputing.
  onViewportChange?: (view: EditorView) => void;
  slashMenuCallbacksRef: { current: SlashMenuCallbacks };
  wikiLinkTriggerRef: { current: WikiLinkTriggerCallback | null };
  csvConfirmRef?: { current: ((preview: string) => Promise<boolean>) | null };
  pasteImageRef?: { current: ((file: File) => Promise<string | null>) | null };
}

export function buildExtensions(opts: BuildExtensionsOptions): Extension[] {
  const extensions: Extension[] = [
    editorTheme(),
    opts.wordWrapCompartment.of(opts.wordWrap ? EditorView.lineWrapping : []),
    opts.lineNumbersCompartment.of(opts.lineNumbers ? editorLineNumbers() : []),
    opts.invisiblesCompartment.of(opts.showInvisibles ? invisibles() : []),
    opts.flowModeCompartment.of(opts.flowMode ? flowMode() : []),
    history(),
    drawSelection(),
    // addKeymap: false — lang-markdown's built-in Enter continuation for
    // lists/blockquotes stacks with our own continueQuoteOnEnter command
    // (formatKeymap), producing doubled "> " prefixes. We own continuation
    // logic explicitly instead: formatKeymap continues quotes and list items.
    markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: false }),
    codeFolding(),
    frontmatterCollapse,
    markdownHighlightPlugin,
    collapsedCalloutCorners,
    horizontalRuleCursorPlugin,
    tagPillPlugin,
    linkDisplayPlugin,
    liveMarkers,
    templateFieldPills,
    annotationDisplayPlugin,
    tableDisplayExtension,
    renderedBlockExtension,
    noteCalcExtension,
    shortcodeExpandPlugin,
    createWikiLinkTriggerPlugin(opts.wikiLinkTriggerRef),
    opts.vimModeCompartment.of(opts.vimMode ? loadedVim()?.vim() ?? [] : []),
    autocompletion({
      override: [createSlashMenuSource(opts.slashMenuCallbacksRef), createTemplateFieldSource(opts.slashMenuCallbacksRef)],
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
      { key: "Alt-ArrowUp", run: (view) => tableMoveRowCommand(view, -1) },
      { key: "Alt-ArrowDown", run: (view) => tableMoveRowCommand(view, 1) },
      { key: "Mod-Alt-ArrowLeft", run: (view) => tableMoveColumnCommand(view, -1) },
      { key: "Mod-Alt-ArrowRight", run: (view) => tableMoveColumnCommand(view, 1) },
      { key: "Mod-Enter", run: tableInsertRowCommand },
      { key: "Mod-Shift-Backspace", run: tableDeleteRowCommand },
    ]),
    // Tab / Shift-Tab between template blanks, after the table bindings so a
    // table cell keeps its own Tab.
    templateBlanks,
    findReplace(),
    // formatKeymap first: its Mod-Shift-l (link) wins over searchKeymap's
    // select-all-matches binding.
    keymap.of([...formatKeymap, ...searchKeymap, ...historyKeymap, ...defaultKeymap]),
    EditorView.editable.of(!opts.readOnly),
    EditorView.domEventHandlers({
      keydown: (event, view) => {
        if (event.key === "Enter" && event.shiftKey && (event.ctrlKey || event.metaKey)) {
          if (!opts.onOpenActiveHelperRef.current()) return false;
          event.preventDefault();
          event.stopPropagation();
          return true;
        }
        if (event.key !== "Escape") return false;
        const vimModule = loadedVim();
        const cm = vimModule?.getCM(view);
        if (!vimModule || !cm) return false;
        vimModule.Vim.handleKey(cm, "<Esc>", "user");
        event.preventDefault();
        event.stopPropagation();
        return true;
      },
      paste: (event, view) => {
        const saveImage = opts.pasteImageRef?.current;
        const imageFile = saveImage ? getImageFromClipboardItems(event.clipboardData?.items ?? null) : null;
        if (imageFile && saveImage) {
          event.preventDefault();
          insertPastedImage(view, imageFile, saveImage);
          return true;
        }
        return handlePasteTransform(view, event, opts.csvConfirmRef?.current ?? undefined);
      },
      drop: (event, view) => {
        const saveImage = opts.pasteImageRef?.current;
        const imageFile = saveImage ? getImageFile(event.dataTransfer ?? null) : null;
        if (!imageFile || !saveImage) return false;
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos == null) return false;
        event.preventDefault();
        insertPastedImage(view, imageFile, saveImage, pos);
        return true;
      },
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
