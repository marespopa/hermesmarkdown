"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { atom_frontmatterCollapsedByDefault, atom_wordWrap, atom_isEditorFocused } from "@/app/atoms/atoms";
import { atom_activeEditorView, atom_activeFileHasFrontmatter, atom_aiBuilderRequest, atom_flowMode, atom_isAiConfigured, atom_lineNumbers, atom_viewMode, atom_vimMode } from "@/app/atoms/ui-atoms";
import { useAtom } from "jotai";
import { EditorView } from "@codemirror/view";
import DatePickerCallout from "./DatePickerCallout";
import WikiLinkDialog from "./WikiLinkDialog";
import TaskDialog from "./TaskDialog";
import { TEMPLATES } from "./constants";
import { applyTemplate } from "../codemirror/slash-menu";
import useKeyboardInset from "@/app/hooks/use-keyboard-inset";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useEditorAppearance } from "../hooks/use-editor-appearance";
import { useCodeMirrorEditor } from "../hooks/use-codemirror-editor";
import { useCodeMirrorFeatures } from "../hooks/use-codemirror-features";
import { useCodeMirrorTemplates } from "../hooks/use-codemirror-templates";
import { useCodeMirrorTable } from "../hooks/use-codemirror-table";
import { useCrossFileTables } from "../hooks/use-cross-file-tables";
import { formulaFileTablesField, setFormulaFileTables } from "../codemirror/table-formulas";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { openRenderedBlockAtCaret } from "../codemirror/rendered-block";
import { useCodeMirrorCodeLanguagePicker } from "../hooks/use-codemirror-code-language-picker";
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
// (link/date/workflow pills, language picker, dialogs). Mermaid and math
// blocks render inline via codemirror/rendered-block.ts.
export default function MarkdownEditor(props: MarkdownEditorProps) {
  const { onChange } = props;
  const wordWrap = useAtomValue(atom_wordWrap);
  const lineNumbers = useAtomValue(atom_lineNumbers);
  const vimMode = useAtomValue(atom_vimMode);
  const flowMode = useAtomValue(atom_flowMode);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const setAiBuilderRequest = useSetAtom(atom_aiBuilderRequest);
  const [frontmatterCollapsedByDefault, setFrontmatterCollapsedByDefault] = useAtom(atom_frontmatterCollapsedByDefault);
  const [, setIsEditorFocused] = useAtom(atom_isEditorFocused);
  const filePath = props.filePath || "draft";
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  // Edit / Preview is one app-wide mode.
  const [viewMode, setViewMode] = useAtom(atom_viewMode);
  const previewMode = viewMode === "preview";
  const exitPreview = useCallback(() => setViewMode("edit"), [setViewMode]);

  const editorValue = props.value;
  const editorOnChange = useCallback((newVal: string) => {
    onChange(newVal);
  }, [onChange]);

  const { fontFamily, readingFontFamily, displayFontSize, lineHeight, paneRef, contentPaddingX } =
    useEditorAppearance(props.isSplit);

  const keyboardInset = useKeyboardInset();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  const { createWikiLinkFile } = useFileSystem();
  const { csvConfirmRef, pasteImageRef } = useEditorPasteHandlers();

  const features = useCodeMirrorFeatures({ viewRef, containerRef, onWikiLinkClick: props.onWikiLinkClick });
  const { pillUrl, pillType, dismissPill, dateMatch, setIsDateExpanded, onCursorActivity } = features;

  const languagePicker = useCodeMirrorCodeLanguagePicker({ viewRef, containerRef });
  const { activate: activateCodeLanguagePicker, onCursorActivity: onCodeLanguagePickerCursorActivity } = languagePicker;

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
        props.onWikiLinkClick?.(pillUrl);
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
      chevrons: frontmatterChevrons,
      collapsed: frontmatterCollapsed,
      toggle: toggleFrontmatterFold,
      onCursorActivity: onFrontmatterFoldCursorActivity,
      onViewCreated: onFrontmatterFoldViewCreated,
    } = useCodeMirrorFrontmatterFold({
      viewRef,
      containerRef,
      collapseByDefault: frontmatterCollapsedByDefault,
    });

  const setActiveEditorView = useSetAtom(atom_activeEditorView);
  const registeredActiveViewRef = useRef<EditorView | null>(null);

  // Feeds the pane header's metadata toggle while this pane is active.
  const hasFrontmatter = frontmatterCollapsed !== null;
  const setActiveFileHasFrontmatter = useSetAtom(atom_activeFileHasFrontmatter);
  useEffect(() => {
    if (props.isActivePane === false) return;
    setActiveFileHasFrontmatter(hasFrontmatter);
    return () => setActiveFileHasFrontmatter(false);
  }, [hasFrontmatter, props.isActivePane, setActiveFileHasFrontmatter]);

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
    onFrontmatterFoldCursorActivity(view);
  }, [onFoldCursorActivity, onFrontmatterFoldCursorActivity]);

  useCodeMirrorEditor({
    value: editorValue,
    onChange: editorOnChange,
    wordWrap,
    lineNumbers,
    vimMode,
    flowMode,
    previewMode,
    onExitPreview: exitPreview,
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

  useEffect(() => {
    if (!editorView) return;
    if (formulaFileTables.size === 0 && editorView.state.field(formulaFileTablesField, false)?.size === 0) return;
    editorView.dispatch({ effects: setFormulaFileTables.of(formulaFileTables) });
  }, [editorView, formulaFileTables]);

  useScrollToPendingTarget(editorView, filePath);

  // Back from Preview: only the active pane takes focus, so typing resumes there.
  const wasPreviewRef = useRef(previewMode);
  useEffect(() => {
    if (wasPreviewRef.current && !previewMode && props.isActivePane !== false) viewRef.current?.focus();
    wasPreviewRef.current = previewMode;
  }, [previewMode, props.isActivePane]);

  // The global voice-input hook (use-global-voice-input.ts) is a single
  // instance shared by the whole app, not one per pane. It inserts a
  // committed dictation into whichever view this atom currently points at,
  // so this pane only needs to claim that slot while it's the active one.
  useEffect(() => {
    if (props.isActivePane === false) return;
    const view = viewRef.current;
    if (view) {
      registeredActiveViewRef.current = view;
      setActiveEditorView(view);
    }
    // Cleared on unmount/deactivation so a later dictation commit can't
    // target a torn-down view.
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
      className={`editor-canvas relative w-full h-full overflow-auto ${previewMode ? "cursor-default" : "cursor-text"} ${
        props.isSplit ? "editor-canvas-split" : ""
      }`}
      translate="no"
    >
      <div
        className={`editor-sheet editor-container relative min-h-full antialiased normal-nums [font-variant-ligatures:none] [font-feature-settings:'liga'_0,'calt'_0]
          transition-[padding,max-width] duration-700 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]
          ${props.isSplit
            ? "mt-3 mb-5 pt-4 pb-8 sm:mt-4 sm:mb-7 sm:pt-5"
            : "mt-6 mb-10 pt-6 pb-12 sm:mt-8 sm:mb-14 sm:pt-8"}
          mx-auto w-full
          text-ui-body
        `}
        style={{
          fontFamily,
          "--preview-font-family": readingFontFamily,
          "--editor-font-size": displayFontSize,
          "--editor-line-height": lineHeight,
          paddingLeft: contentPaddingX,
          paddingRight: contentPaddingX,
          paddingBottom: keyboardInset > 0 ? `calc(3rem + ${keyboardInset}px)` : undefined,
        } as React.CSSProperties}
      >
        <div className="relative h-full">
          <label htmlFor="md-editor" className="sr-only">Markdown editor</label>
          <div
            id="md-editor"
            ref={containerRef}
            className={`h-full ${wordWrap ? "" : "editor-no-wrap-viewport"}`}
            tabIndex={0}
          />

          <FoldChevrons
            chevrons={[
              ...chevrons.map((chevron) => ({ ...chevron, kind: "callout" as const })),
              ...frontmatterChevrons.filter((chevron) => !chevron.collapsed).map((chevron) => ({ ...chevron, kind: "frontmatter" as const })),
            ]}
            onToggle={(chevron) => {
              const view = viewRef.current;
              if (!view) return;
              if (chevron.kind === "frontmatter") {
                // × hides metadata app-wide, like the header ⓘ. Collapse this
                // view directly too: it may be expanded with the preference
                // already on (caret moved in), where setting it is a no-op.
                toggleFrontmatterFold(view);
                setFrontmatterCollapsedByDefault(true);
              } else toggleCalloutFold(view, chevron.blockId);
            }}
          />

          {!previewMode && (
            <EditorPills
              features={features}
              languagePicker={languagePicker}
              image={image}
              containerRef={containerRef}
              onWikiLinkClick={props.onWikiLinkClick}
            />
          )}


          <WikiLinkDialog
            isOpen={wikiLinkDialogOpen}
            onClose={() => setWikiLinkDialogOpen(false)}
            onConfirm={insertWikiLink}
            onCreateAndConfirm={createWikiLinkFile}
            title="Insert WikiLink"
          />

          <DatePickerCallout
            isOpen={templateDatePickerOpen}
            initialDate={new Date()}
            onSelectDate={insertTemplateDate}
            onClose={() => setTemplateDatePickerOpen(false)}
          />

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
    </div>
  );
}
