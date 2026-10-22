import { Compartment, EditorState, Extension } from "@codemirror/state";
import { EditorView, keymap, drawSelection, rectangularSelection, crosshairCursor, placeholder as placeholderExt } from "@codemirror/view";
import { history, historyKeymap, defaultKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { ViewUpdate } from "@codemirror/view";
import { autocompletion } from "@codemirror/autocomplete";
import { codeFolding } from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { loadedVim } from "./vim-loader";
import { editorTheme } from "./theme";
import { formatKeymap, handlePasteTransform, insertPastedImage } from "./commands";
import { handleHtmlPaste } from "./html-paste";
import { getImageFile, getImageFromClipboardItems } from "@/app/utils/paste-image";
import { horizontalRuleCursorPlugin, markdownHighlightPlugin } from "./highlight";
import { tagPillPlugin } from "./tag-pills";
import { linkDisplayPlugin } from "./link-display";
import { annotationDisplayPlugin } from "./annotation-display";
import { tableDisplayExtension } from "./table-display";
import { renderedBlockExtension } from "./rendered-block";
import { noteEmbedsExtension } from "./note-embeds";
import { embedGhost } from "./embed-ghost";
import { shortcodeExpandPlugin } from "./shortcode-expand";
import { noteCalcExtension } from "./note-calc";
import { createSlashMenuSource, SlashMenuCallbacks } from "./slash-menu";
import { createEmojiSource } from "./emoji-completion";
import { createTemplateFieldSource } from "./template-field-completion";
import { templateFieldPills } from "./template-field-pills";
import { templateBlanks } from "./template-blanks";
import { createWikiLinkTriggerPlugin, WikiLinkTriggerCallback } from "./wikilink-trigger";
import { tableKeyBindings } from "./table-keymap";
import { frontmatterCollapse } from "./frontmatter-fold";
import { markdownProblems } from "./markdown-problems";
import { flowMode, type FlowLevel } from "./flow-mode";
import { liveMarkers } from "./live-markers";
import { invisibles } from "./invisibles";
import { editorLineNumbers } from "./line-numbers";
import { findReplace } from "./find-replace";
import { collapsedCalloutCorners } from "./callout-fold";
import { syntaxReveal } from "./syntax-reveal";
import { detailsMarks } from "./details-fold";

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
  /** Flow mode level, or false when off. */
  flowMode: FlowLevel | false;
  flowModeCompartment: Compartment;
  onOpenActiveHelperRef: { current: () => boolean };
  placeholder?: string;
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
    opts.flowModeCompartment.of(opts.flowMode ? flowMode(opts.flowMode) : []),
    // Keep the caret clear of the editor's floating SearchPill when
    // scrolling it into view (--pane-top-room, PaneLeaf; unset on mobile).
    EditorView.scrollMargins.of((view) => ({
      top: parseFloat(getComputedStyle(view.dom).getPropertyValue("--pane-top-room")) || 0,
    })),
    history(),
    drawSelection(),
    // Multi-cursor: Mod-d adds the next match, Mod-Shift-l selects every
    // match (searchKeymap), Mod-click adds a caret, Alt-drag selects a column.
    EditorState.allowMultipleSelections.of(true),
    rectangularSelection(),
    crosshairCursor(),
    // addKeymap: false — no list or quote continuation on Enter, and
    // Backspace deletes one character: typing is never rewritten
    // (formatKeymap binds Enter to a plain line break).
    markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: false }),
    codeFolding(),
    frontmatterCollapse,
    // Invalid frontmatter, unclosed code / math blocks: a notice above them.
    markdownProblems,
    markdownHighlightPlugin,
    collapsedCalloutCorners,
    detailsMarks,
    horizontalRuleCursorPlugin,
    tagPillPlugin,
    linkDisplayPlugin,
    liveMarkers,
    // Markdown marks show only on the caret's lines.
    syntaxReveal,
    templateFieldPills,
    annotationDisplayPlugin,
    tableDisplayExtension,
    renderedBlockExtension,
    noteEmbedsExtension,
    // `/name` at the start of a line: the rest of the best note as faded text.
    embedGhost(() => opts.slashMenuCallbacksRef.current.embedFiles?.() ?? []),
    noteCalcExtension,
    shortcodeExpandPlugin,
    createWikiLinkTriggerPlugin(opts.wikiLinkTriggerRef),
    opts.vimModeCompartment.of(opts.vimMode ? loadedVim()?.vim() ?? [] : []),
    autocompletion({
      override: [createSlashMenuSource(opts.slashMenuCallbacksRef), createTemplateFieldSource(opts.slashMenuCallbacksRef), createEmojiSource()],
      activateOnTyping: true,
      icons: false,
      // The menu draws only this many options around the selected one, so the
      // emoji menu's ~1,900 options don't each become a DOM row.
      maxRenderedOptions: 50,
    }),
    // Table shortcuts take priority over formatKeymap's plain quote-continue
    // Enter binding — mirrors the old handleGlobalKeyDown, which checked
    // onTableKeyDown?.() first. Each table command returns false (falling
    // through to the next binding) when the cursor isn't inside a table.
    keymap.of(tableKeyBindings),
    // Tab / Shift-Tab between template blanks, after the table bindings so a
    // table cell keeps its own Tab.
    templateBlanks,
    findReplace(),
    // Without defaultKeymap's Ctrl/Cmd+[ / ] (indent less / more, which Tab
    // and Shift+Tab do): Ctrl+[ shows / hides the sidebar (EditorShell).
    keymap.of([...formatKeymap, ...searchKeymap, ...historyKeymap, ...defaultKeymap.filter((binding) => binding.key !== "Mod-[" && binding.key !== "Mod-]")]),
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
        // Rich text (a web page, Docs, Word) arrives as Markdown (html-paste.ts).
        if (handleHtmlPaste(view, event)) return true;
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
