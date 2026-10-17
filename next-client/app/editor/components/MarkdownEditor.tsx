"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { atom_wordWrap, atom_isEditorFocused } from "@/app/atoms/atoms";
import { atom_activeEditorView, atom_aiBuilderRequest, atom_focusMode, atom_fullWidth, atom_isAiConfigured, atom_lineNumbers, atom_showInvisibles, atom_showWordCount, atom_vimMode } from "@/app/atoms/ui-atoms";
import { useAtom } from "jotai";
import { EditorView } from "@codemirror/view";
import DatePickerCallout from "./DatePickerCallout";
import CalloutTypeMenu from "./CalloutTypeMenu";
import WikiLinkDialog from "./WikiLinkDialog";
import TaskDialog from "./TaskDialog";
import { TEMPLATES } from "./constants";
import { applyTemplate } from "../codemirror/slash-menu";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useEditorAppearance } from "../hooks/use-editor-appearance";
import { useCodeMirrorEditor } from "../hooks/use-codemirror-editor";
import { useCodeMirrorFeatures } from "../hooks/use-codemirror-features";
import { useCodeMirrorTemplates } from "../hooks/use-codemirror-templates";
import { useVaultTemplateInsert } from "../hooks/use-vault-template-insert";
import { useEmptyNoteBoard } from "../hooks/use-empty-note-board";
import { useInsertBoardLink } from "../hooks/use-insert-board-link";
import { useCodeMirrorTable } from "../hooks/use-codemirror-table";
import { useCrossFileTables } from "../hooks/use-cross-file-tables";
import { formulaFileTablesField, setFormulaFileTables } from "../codemirror/table-formulas";
import { useNoteEmbeds } from "../hooks/use-note-embeds";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { openRenderedBlockAtCaret } from "../codemirror/rendered-block";
import { useCodeMirrorCodeLanguagePicker } from "../hooks/use-codemirror-code-language-picker";
import { useCodeMirrorCalloutType } from "../hooks/use-codemirror-callout-type";
import { useCodeMirrorImage } from "../hooks/use-codemirror-image";
import { useCodeMirrorCalloutFold } from "../hooks/use-codemirror-callout-fold";
import { useCodeMirrorFrontmatterFold } from "../hooks/use-codemirror-frontmatter-fold";
import { insertOrRevealFrontmatter } from "../codemirror/frontmatter-fold";
import { useEditorPasteHandlers } from "../hooks/use-editor-paste-handlers";
import { useScrollToPendingTarget } from "../hooks/use-scroll-to-pending-target";
import { openImageDialog } from "../utils/open-helper-dialogs";
import EditorPills from "./markdown-editor/EditorPills";
import FoldChevrons from "./markdown-editor/FoldChevrons";
import LinkInsertDialog from "./markdown-editor/LinkInsertDialog";
import VimStatusPill from "./markdown-editor/VimStatusPill";
import WordCountPill from "./markdown-editor/WordCountPill";
import { useVimStatus } from "../hooks/use-vim-status";
import TemplateStrip from "./TemplateStrip";
import EmptyNoteTemplates from "./EmptyNoteTemplates";
import { useTemplateNote } from "../hooks/use-template-note";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  filePath?: string;
  placeholder?: string;
  onWikiLinkClick?: (name: string) => void;
  isActivePane?: boolean;
  isSplit?: boolean;
}

// The CM6 editor pane. Editing behavior lives in CodeMirror extensions
// (app/editor/codemirror/) — including tables, which render as an inline
// editable grid — while this component owns the floating React helpers
// (link/date pills, language picker, dialogs). Mermaid and math
// blocks render inline via codemirror/rendered-block.ts.
export default function MarkdownEditor(props: MarkdownEditorProps) {
  const { onChange } = props;
  const wordWrap = useAtomValue(atom_wordWrap);
  const lineNumbers = useAtomValue(atom_lineNumbers);
  const showWordCount = useAtomValue(atom_showWordCount);
  const showInvisibles = useAtomValue(atom_showInvisibles);
  const vimMode = useAtomValue(atom_vimMode);
  // Paragraph or sentence dimming and typewriter scrolling: the two
  // strongest Focus levels.
  const focusMode = useAtomValue(atom_focusMode);
  const flowMode = focusMode === "dim" ? "paragraph" : focusMode === "sentence" ? "sentence" : false;
  const fullWidth = useAtomValue(atom_fullWidth);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const setAiBuilderRequest = useSetAtom(atom_aiBuilderRequest);
  const [, setIsEditorFocused] = useAtom(atom_isEditorFocused);
  const filePath = props.filePath || "draft";
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  const editorValue = props.value;
  const editorOnChange = useCallback((newVal: string) => {
    onChange(newVal);
  }, [onChange]);

  const { fontFamily, displayFontSize, lineHeight, paneRef, contentPaddingX, contentPaddingLeft } =
    useEditorAppearance(props.isSplit);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  const { createWikiLinkFile, vaultHandle, saveAsTemplate, createLinkedNoteFromTemplate, createLinkedBoard } = useFileSystem();
  const insertBoardLink = useInsertBoardLink({ viewRef, createLinkedBoard });
  const insertVaultTemplate = useVaultTemplateInsert({ viewRef, filePath });
  const insertTemplate = useCallback(() => { void insertVaultTemplate(); }, [insertVaultTemplate]);
  const startBoard = useEmptyNoteBoard({ viewRef, filePath });
  const { isTemplateNote, insertTemplateField, askTemplateQuestion, saveNoteAsTemplate } = useTemplateNote({
    viewRef,
    editorView,
    filePath,
    isActivePane: props.isActivePane !== false,
    insertTemplate,
    saveAsTemplate: vaultHandle ? saveAsTemplate : undefined,
  });
  const { csvConfirmRef, pasteImageRef } = useEditorPasteHandlers();

  const onWikiLinkClick = useCallback((name: string) => props.onWikiLinkClick?.(name), [props.onWikiLinkClick]);
  const features = useCodeMirrorFeatures({ viewRef, editorView, containerRef, onWikiLinkClick });
  const { pillUrl, pillType, dismissPill, dateMatch, setIsDateExpanded, onCursorActivity } = features;

  const languagePicker = useCodeMirrorCodeLanguagePicker({ viewRef, containerRef });
  const { activate: activateCodeLanguagePicker, onCursorActivity: onCodeLanguagePickerCursorActivity } = languagePicker;

  const calloutType = useCodeMirrorCalloutType({ viewRef, containerRef });

  const handleCodeBlockInserted = useCallback((pos: number) => {
    const view = viewRef.current;
    if (view) activateCodeLanguagePicker(view, pos);
  }, [activateCodeLanguagePicker, viewRef]);

  const handleFrontmatterCommand = useCallback(() => {
    if (viewRef.current) insertOrRevealFrontmatter(viewRef.current);
  }, [viewRef]);

  const {
    linkDialogOpen, setLinkDialogOpen, insertLink,
    wikiLinkDialogOpen, setWikiLinkDialogOpen, insertWikiLink,
    templateDatePickerOpen, setTemplateDatePickerOpen, insertTemplateDate,
    taskDialogOpen, setTaskDialogOpen, insertTask,
    slashMenuCallbacksRef, wikiLinkTriggerRef,
  } = useCodeMirrorTemplates({
    viewRef,
    onCodeBlockInserted: handleCodeBlockInserted,
    onFrontmatterWizard: handleFrontmatterCommand,
    onOpenAIChat: isAiConfigured ? () => setAiBuilderRequest((value) => value + 1) : undefined,
    onInsertVaultTemplate: vaultHandle ? () => { void insertVaultTemplate(); } : undefined,
    onInsertTemplateField: isTemplateNote ? insertTemplateField : undefined,
    onAskTemplateQuestion: askTemplateQuestion,
    onSaveAsTemplate: saveNoteAsTemplate,
    onInsertBoard: vaultHandle ? () => { void insertBoardLink(); } : undefined,
  });

  useEffect(() => {
    if (props.isActivePane === false) return;
    const handleTemplateCommand = (event: Event) => {
      const label = (event as CustomEvent<{ label?: string }>).detail?.label;
      const template = TEMPLATES.find((item) => item.label === label && !item.aiOnly);
      const view = viewRef.current;
      if (!template || !view) return;
      const { from, to } = view.state.selection.main;
      applyTemplate(view, from, to, template.content, slashMenuCallbacksRef.current);
      view.focus();
    };
    document.addEventListener("hermes:insert-template", handleTemplateCommand);
    return () => document.removeEventListener("hermes:insert-template", handleTemplateCommand);
  }, [props.isActivePane, slashMenuCallbacksRef]);

  const { onCursorActivity: onTableCursorActivity } = useCodeMirrorTable();

  // `[[Note]]!B5` formula references read other notes' tables; hand the
  // (async-loaded) snapshot to the table grid so results can resolve.
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const formulaFileTables = useCrossFileTables(props.value, fileMetadata, props.isActivePane !== false, props.filePath);

  const image = useCodeMirrorImage({ viewRef, containerRef });
  const { imageInfo, onCursorActivity: onImageCursorActivity } = image;

  const openActiveHelperRef = useRef<() => boolean>(() => false);
  openActiveHelperRef.current = () => {
    if (pillUrl) {
      if (pillType === "wiki") {
        onWikiLinkClick(pillUrl);
      } else {
        window.open(pillUrl, "_blank", "noopener,noreferrer");
      }
      dismissPill();
      return true;
    }
    if (dateMatch) {
      setIsDateExpanded(true);
      return true;
    }
    if (viewRef.current && openRenderedBlockAtCaret(viewRef.current)) return true;
    if (imageInfo) {
      openImageDialog(imageInfo.src, imageInfo.alt);
      return true;
    }
    return false;
  };

  const { chevrons, toggle: toggleCalloutFold, onCursorActivity: onFoldCursorActivity, onViewCreated } =
    useCodeMirrorCalloutFold({ containerRef });
    const {
      onCursorActivity: onFrontmatterFoldCursorActivity,
      onViewCreated: onFrontmatterFoldViewCreated,
    } = useCodeMirrorFrontmatterFold({
      viewRef,
      filePath,
    });

  const setActiveEditorView = useSetAtom(atom_activeEditorView);
  const registeredActiveViewRef = useRef<EditorView | null>(null);

  // Auto-focus so typing works immediately after opening the editor, no
  // click required. Skipped for inactive split panes.
  const handleViewCreated = useCallback((view: EditorView) => {
    onViewCreated(view);
    onFrontmatterFoldViewCreated(view);
    setEditorView(view);
    if (props.isActivePane !== false) {
      registeredActiveViewRef.current = view;
      setActiveEditorView(view);
      view.focus();
    }
  }, [onFrontmatterFoldViewCreated, onViewCreated, props.isActivePane, setActiveEditorView]);

  const onCombinedCursorActivity = useCallback((view: EditorView) => {
    onCursorActivity(view);
    onTableCursorActivity(view);
    onCodeLanguagePickerCursorActivity(view);
    onImageCursorActivity(view);
    onFoldCursorActivity(view);
    onFrontmatterFoldCursorActivity(view);
  }, [onCursorActivity, onTableCursorActivity,onCodeLanguagePickerCursorActivity, onImageCursorActivity, onFoldCursorActivity, onFrontmatterFoldCursorActivity]);

  // Fold chevrons follow scrolling: callouts get one as they're rendered.
  const onViewportChange = useCallback((view: EditorView) => {
    onFoldCursorActivity(view);
  }, [onFoldCursorActivity]);

  useCodeMirrorEditor({
    value: editorValue,
    onChange: editorOnChange,
    wordWrap,
    lineNumbers,
    showInvisibles,
    vimMode,
    flowMode,
    onOpenActiveHelperRef: openActiveHelperRef,
    placeholder: props.placeholder || "Type / for templates",
    readOnly: false,
    onFocusChange: setIsEditorFocused,
    onCursorActivity: onCombinedCursorActivity,
    onViewportChange,
    containerRef,
    viewRef,
    slashMenuCallbacksRef,
    wikiLinkTriggerRef,
    csvConfirmRef,
    pasteImageRef,
    onViewCreated: handleViewCreated,
  });
  // After useCodeMirrorEditor, so the Vim compartment is live (see the hook).
  const { hostRef: vimStatusHostRef, status: vimStatus } = useVimStatus(editorView, vimMode);

  useEffect(() => {
    if (!editorView) return;
    if (formulaFileTables.size === 0 && editorView.state.field(formulaFileTablesField, false)?.size === 0) return;
    editorView.dispatch({ effects: setFormulaFileTables.of(formulaFileTables) });
  }, [editorView, formulaFileTables]);
  // `![[Note]]`, `/Note.md` and `/data.csv` lines show the file under them.
  useNoteEmbeds(editorView, props.value, fileMetadata, props.filePath, onWikiLinkClick);

  useScrollToPendingTarget(editorView, filePath);

  // AI actions and palette editor commands are single app-wide instances,
  // not one per pane: they act on whichever view this atom points at, so
  // this pane claims that slot while it's the active one.
  useEffect(() => {
    if (props.isActivePane === false) return;
    const view = viewRef.current;
    if (view) {
      registeredActiveViewRef.current = view;
      setActiveEditorView(view);
    }
    // Cleared on unmount/deactivation so a later command can't target a
    // torn-down view.
    return () => {
      const registeredView = registeredActiveViewRef.current;
      if (registeredView) {
        setActiveEditorView((current) => current === registeredView ? null : current);
      }
      registeredActiveViewRef.current = null;
    };
  }, [props.isActivePane, setActiveEditorView, viewRef]);


  return (
    <div
      ref={paneRef}
      // The pane header floats over this scroller: the sheet starts below it
      // and scrolls under its glass (--pane-header-inset, PaneLeaf).
      className={`editor-canvas relative w-full h-full overflow-auto cursor-text pt-[var(--pane-header-inset,0px)] scroll-pt-[var(--pane-header-inset,0px)]`}
      translate="no"
    >
      <div
        className={`editor-sheet editor-container relative min-h-full antialiased normal-nums [font-variant-ligatures:none] [font-feature-settings:'liga'_0,'calt'_0]
          transition-[padding,max-width] duration-700 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]
          ${/* No margins: the page has no card of its own to set apart (it sits
               on the content sheet), so only a little air above and below. */
            props.isSplit
            ? "[--sheet-pad-top:0.75rem] pb-6 sm:[--sheet-pad-top:1rem]"
            : "[--sheet-pad-top:1rem] pb-8 sm:[--sheet-pad-top:1.25rem]"}
          pt-[var(--sheet-pad-top)]
          mx-auto w-full
          text-ui-body
        `}
        data-font={fontFamily.includes("--font-geist-mono") || fontFamily.includes("--font-duospace") ? "mono" : undefined}
        data-full-width={fullWidth ? "" : undefined}
        style={{
          fontFamily,
          "--editor-font-size": displayFontSize,
          "--editor-line-height": lineHeight,
          "--sheet-pad-left": contentPaddingLeft,
          paddingLeft: "var(--sheet-pad-left)",
          paddingRight: contentPaddingX,
        } as React.CSSProperties}
      >
        {isTemplateNote && <TemplateStrip name={filePath.split("/").pop()!.replace(/\.md$/i, "")} doc={editorValue} onAddField={insertTemplateField} />}
        <div className="editor-measure relative h-full">
          <label htmlFor="md-editor" className="sr-only">Markdown editor</label>
          <div
            id="md-editor"
            ref={containerRef}
            className={`h-full ${wordWrap ? "" : "editor-no-wrap-viewport"}`}
            tabIndex={0}
          />

          <FoldChevrons
            chevrons={chevrons}
            onToggle={(chevron) => {
              const view = viewRef.current;
              if (!view) return;
              toggleCalloutFold(view, chevron.blockId);
              // Back to the text: the chevron took focus on press.
              view.focus();
            }}
          />

          <EmptyNoteTemplates
            isEmpty={!isTemplateNote && editorValue.trim() === ""}
            onPick={(source) => { void insertVaultTemplate(source); }}
            onMore={vaultHandle ? () => { void insertVaultTemplate(); } : undefined}
            onBoard={startBoard}
          />

          <EditorPills
            features={features}
            languagePicker={languagePicker}
            image={image}
            containerRef={containerRef}
            onWikiLinkClick={onWikiLinkClick}
          />

          <WikiLinkDialog
            isOpen={wikiLinkDialogOpen}
            onClose={() => setWikiLinkDialogOpen(false)}
            onConfirm={insertWikiLink}
            onCreateAndConfirm={createWikiLinkFile}
            onCreateFromTemplate={vaultHandle ? createLinkedNoteFromTemplate : undefined}
            title="Insert WikiLink"
          />

          <DatePickerCallout
            isOpen={templateDatePickerOpen}
            initialDate={new Date()}
            onSelectDate={insertTemplateDate}
            onClose={() => setTemplateDatePickerOpen(false)}
          />

          {calloutType.menu && (
            <CalloutTypeMenu
              x={calloutType.menu.x}
              y={calloutType.menu.y}
              current={calloutType.menu.current}
              onSelect={calloutType.select}
              onClose={calloutType.close}
            />
          )}

          <TaskDialog
            isOpen={taskDialogOpen}
            onClose={() => setTaskDialogOpen(false)}
            onConfirm={insertTask}
          />

          <LinkInsertDialog
            isOpen={linkDialogOpen}
            onClose={() => setLinkDialogOpen(false)}
            onInsert={insertLink}
          />
        </div>
      </div>
      {vimMode && <VimStatusPill status={vimStatus} hostRef={vimStatusHostRef} />}
      {showWordCount && props.isActivePane !== false && <WordCountPill view={editorView} text={editorValue} />}
    </div>
  );
}
