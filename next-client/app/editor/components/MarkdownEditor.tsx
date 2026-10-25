"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { atom_wordWrap, atom_isEditorFocused } from "@/app/atoms/atoms";
import { atom_showGitChanges } from "@/app/atoms/git-atoms";
import { atom_isVaultPending, atom_vaultDescriptor } from "@/app/atoms/vault-atoms";
import { atom_aiBuilderRequest, atom_focusMode, atom_fullWidth, atom_isAiConfigured, atom_lineNumbers, atom_showInvisibles, atom_showOutline, atom_showWordCount, atom_vimMode } from "@/app/atoms/ui-atoms";
import type { TemplateEntry } from "@/app/utils/templates/template-registry";
import { useAtom } from "jotai";
import { EditorView } from "@codemirror/view";
import DatePickerCallout from "./DatePickerCallout";
import CalloutTypeMenu from "./CalloutTypeMenu";
import FrontmatterHeaderMenus from "./markdown-editor/FrontmatterHeaderMenus";
import { requestFrontmatterChipAtCaret } from "../codemirror/frontmatter-header";
import WikiLinkDialog from "./WikiLinkDialog";
import TaskDialog from "./TaskDialog";
import { TEMPLATES } from "./constants";
import { applyTemplate } from "../codemirror/slash-menu";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useEditorAppearance } from "../hooks/use-editor-appearance";
import { useActiveEditorView } from "../hooks/use-active-editor-view";
import { useCodeMirrorEditor } from "../hooks/use-codemirror-editor";
import { useGitBaseline } from "../hooks/use-git-baseline";
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
import { useCodeMirrorHeadingFold } from "../hooks/use-codemirror-heading-fold";
import { insertOrRevealFrontmatter } from "../codemirror/frontmatter-block";
import { useEditorPasteHandlers } from "../hooks/use-editor-paste-handlers";
import { useScrollToPendingTarget } from "../hooks/use-scroll-to-pending-target";
import { openImageDialog } from "../utils/open-helper-dialogs";
import EditorPills from "./markdown-editor/EditorPills";
import FoldChevrons from "./markdown-editor/FoldChevrons";
import LinkInsertDialog from "./markdown-editor/LinkInsertDialog";
import VimStatusPill from "./markdown-editor/VimStatusPill";
import EditorOutline from "./markdown-editor/EditorOutline";
import { isPlainTextPath } from "@/app/utils/file-kinds";
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
  onFileLinkClick?: (href: string) => void;
  isActivePane?: boolean;
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
  const showOutline = useAtomValue(atom_showOutline);
  const showInvisibles = useAtomValue(atom_showInvisibles);
  const showGitChanges = useAtomValue(atom_showGitChanges);
  const isDiskVault = useAtomValue(atom_vaultDescriptor)?.kind === "local";
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
  // Not before the user allows access to a restored vault: HEAD can't be read until then.
  const isVaultPending = useAtomValue(atom_isVaultPending);
  const gitEnabled = showGitChanges && isDiskVault && !isVaultPending && filePath !== "draft";
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  const editorValue = props.value;
  const editorOnChange = useCallback((newVal: string) => {
    onChange(newVal);
  }, [onChange]);

  const { fontFamily, displayFontSize, lineHeight, paneRef, contentPaddingX, contentPaddingLeft } =
    useEditorAppearance();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  const { createWikiLinkFile, vaultHandle, saveAsTemplate, createLinkedNoteFromTemplate, createLinkedBoard } = useFileSystem();
  const insertBoardLink = useInsertBoardLink({ viewRef, createLinkedBoard });
  const insertVaultTemplate = useVaultTemplateInsert({ viewRef, filePath });
  const insertTemplate = useCallback((entry?: TemplateEntry) => { void insertVaultTemplate(entry); }, [insertVaultTemplate]);
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
  const onFileLinkClick = useCallback((href: string) => props.onFileLinkClick?.(href), [props.onFileLinkClick]);
  const features = useCodeMirrorFeatures({ viewRef, editorView, containerRef, onWikiLinkClick, onFileLinkClick });
  const { openPillLink, dateMatch, setIsDateExpanded, onCursorActivity } = features;

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
    if (openPillLink()) return true;
    if (viewRef.current && requestFrontmatterChipAtCaret(viewRef.current)) return true;
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
  const { onViewCreated: onHeadingFoldViewCreated, onCursorActivity: onHeadingFoldCursorActivity } =
    useCodeMirrorHeadingFold(filePath);

  const registerActiveView = useActiveEditorView(viewRef, {
    isActivePane: props.isActivePane !== false,
  });

  const handleViewCreated = useCallback((view: EditorView) => {
    onViewCreated(view);
    onHeadingFoldViewCreated(view);
    setEditorView(view);
    registerActiveView(view);
  }, [onHeadingFoldViewCreated, onViewCreated, registerActiveView]);

  const onCombinedCursorActivity = useCallback((view: EditorView) => {
    onCursorActivity(view);
    onTableCursorActivity(view);
    onCodeLanguagePickerCursorActivity(view);
    onImageCursorActivity(view);
    onFoldCursorActivity(view);
    onHeadingFoldCursorActivity(view);
  }, [onCursorActivity, onTableCursorActivity,onCodeLanguagePickerCursorActivity, onImageCursorActivity, onFoldCursorActivity, onHeadingFoldCursorActivity]);

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
    gitChanges: gitEnabled,
    vimMode,
    flowMode,
    onOpenActiveHelperRef: openActiveHelperRef,
    placeholder: props.placeholder || "Type / for templates",
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
    filePath,
  });
  useGitBaseline({ viewRef, vaultHandle, filePath, enabled: gitEnabled });
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

  return (
    <div
      ref={paneRef}
      // The editor's SearchPill floats over the sheet's top margin
      // (PaneLeaf); nothing else sits above the text.
      className="editor-canvas relative w-full h-full overflow-auto cursor-text"
      translate="no"
    >
      <div
        // A page's margins: room above the first line as on a sheet of
        // paper, and room below the last so it can be written in the middle
        // of the window rather than at its bottom edge. The top is never less
        // than the pane title's room (--pane-top-room), so the first line, the
        // frontmatter's included, starts below the title.
        className={`editor-sheet editor-container relative min-h-full antialiased normal-nums [font-variant-ligatures:none] [font-feature-settings:'liga'_0,'calt'_0]
          transition-[padding,max-width] duration-layout ease-layout motion-reduce:transition-none
          [--sheet-pad-top:2rem] pb-[40vh] sm:[--sheet-pad-top:3rem]
          pt-[max(var(--sheet-pad-top),var(--pane-top-room,0px))]
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

          <FrontmatterHeaderMenus viewRef={viewRef} containerRef={containerRef} />

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
      {/* After the sheet, so its sticky box holds the pane's bottom corner. */}
      {showOutline && <EditorOutline view={editorView} scrollerRef={paneRef} text={editorValue} isCode={isPlainTextPath(filePath)} filePath={filePath} />}
      {vimMode && <VimStatusPill status={vimStatus} hostRef={vimStatusHostRef} besideOutline={showOutline} />}
      {showWordCount && props.isActivePane !== false && <WordCountPill view={editorView} text={editorValue} />}
    </div>
  );
}
