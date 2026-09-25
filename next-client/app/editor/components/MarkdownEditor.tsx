"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAtomValue, useSetAtom } from "jotai";
import { atom_frontmatterCollapsedByDefault, atom_wordWrap, atom_isEditorFocused, atom_vaultHandle, atom_currentDirectoryHandle, atom_pendingScrollTarget } from "@/app/atoms/atoms";
import { atom_activeEditorView, atom_aiBuilderRequest, atom_editorContentWidth, atom_isAiConfigured, atom_lineNumbers, atom_vimMode } from "@/app/atoms/ui-atoms";
import { useAtom } from "jotai";
import { savePastedImage } from "@/app/utils/paste-image";
import { EditorView } from "@codemirror/view";
import { HiOutlineCalendar, HiChevronDown, HiChevronRight, HiOutlineArrowsExpand } from "react-icons/hi";
import Button from "../../components/Button";
import Input from "../../components/Input";
import DialogModal from "../../components/DialogModal/DialogModal";
import DatePickerCallout from "./DatePickerCallout";
import WikiLinkDialog from "./WikiLinkDialog";
import TaskDialog from "./TaskDialog";
import { LinkPill } from "./LinkPill";
import { WorkflowPill } from "./WorkflowPill";
import { TableCallout } from "./TableCallout";
import { PILL_CONTAINER_CLASSES, TEMPLATES } from "./constants";
import { applyTemplate } from "../codemirror/slash-menu";
import useKeyboardInset from "@/app/hooks/use-keyboard-inset";
import { useDialog } from "@/app/hooks/use-dialog";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useEditorAppearance } from "../hooks/use-editor-appearance";
import { useCodeMirrorEditor } from "../hooks/use-codemirror-editor";
import { useCodeMirrorFeatures } from "../hooks/use-codemirror-features";
import { useCodeMirrorTemplates } from "../hooks/use-codemirror-templates";
import { useCodeMirrorTable } from "../hooks/use-codemirror-table";
import { useCodeMirrorMermaid } from "../hooks/use-codemirror-mermaid";
import { useCodeMirrorCodeLanguagePicker } from "../hooks/use-codemirror-code-language-picker";
import { useCodeMirrorImage } from "../hooks/use-codemirror-image";
import { useCodeMirrorCalloutFold } from "../hooks/use-codemirror-callout-fold";
import { useCodeMirrorFrontmatterFold } from "../hooks/use-codemirror-frontmatter-fold";
import { findFrontmatterFoldRange, toggleFrontmatterFold as setFrontmatterFold } from "../codemirror/frontmatter-fold";
import { HiOutlinePhotograph } from "react-icons/hi";
import Typeahead from "../../components/Typeahead/Typeahead";
import { languages } from "@codemirror/language-data";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  filePath?: string;
  placeholder?: string;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
  setMatchCount?: (count: number) => void;
  onWikiLinkClick?: (name: string) => void;
  isActivePane?: boolean;
  isSplit?: boolean;
}

// NOTE: this is the CM6 migration (through Step 4 of the migration plan).
// It intentionally does not yet include the template/slash menu, table
// editor, formula badges, or callout folding — those are ported in later
// steps (see task list). Behavior covered so far: typing, undo/redo (CM6
// history), bold/italic/strikethrough/inline-code wrap, checkbox toggle
// (click), quote-continue on Enter, quote-aware paste, URL-paste-as-link,
// full markdown syntax highlighting, link pill (cursor-driven, Ctrl/Cmd+
// click to open/navigate), date picker (click the calendar icon),
// workflow/todo tag cycling pills.
export default function MarkdownEditor(props: MarkdownEditorProps) {
  const { onChange } = props;
  const wordWrap = useAtomValue(atom_wordWrap);
  const lineNumbers = useAtomValue(atom_lineNumbers);
  const vimMode = useAtomValue(atom_vimMode);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const setAiBuilderRequest = useSetAtom(atom_aiBuilderRequest);
  const frontmatterCollapsedByDefault = useAtomValue(atom_frontmatterCollapsedByDefault);
  const [, setEditorContentWidth] = useAtom(atom_editorContentWidth);
  const [, setIsEditorFocused] = useAtom(atom_isEditorFocused);
  const [pendingScrollTarget, setPendingScrollTarget] = useAtom(atom_pendingScrollTarget);
  const filePath = props.filePath || "draft";
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  const editorValue = props.value;
  const editorOnChange = useCallback((newVal: string) => {
    onChange(newVal);
  }, [onChange]);

  const { fontFamily, displayFontSize, lineHeight, windowWidth, paneRef, maxContentWidth, contentPaddingX, noWrapPaddingX } =
    useEditorAppearance(props.isSplit);

  const keyboardInset = useKeyboardInset();
  const isMobile = windowWidth < 768;
  const resizeRef = useRef<{ center: number } | null>(null);

  const handleEditorResizeStart = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!maxContentWidth || isMobile) return;
    const parent = event.currentTarget.parentElement;
    if (!parent) return;
    event.preventDefault();
    const rect = parent.getBoundingClientRect();
    resizeRef.current = { center: rect.left + rect.width / 2 };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [isMobile, maxContentWidth]);

  const handleEditorResize = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!resizeRef.current) return;
    const width = Math.max(600, Math.min(1200, Math.abs(event.clientX - resizeRef.current.center) * 2));
    setEditorContentWidth(width);
  }, [setEditorContentWidth]);

  const handleEditorResizeEnd = useCallback(() => {
    resizeRef.current = null;
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  const dialog = useDialog();
  const { createWikiLinkFile } = useFileSystem();
  const csvConfirmRef = useRef<((preview: string) => Promise<boolean>) | null>(null);
  csvConfirmRef.current = useCallback(
    (preview: string) =>
      dialog.confirm(
        `Pasted content looks like tabular data (${preview.split("\n").length} rows). Convert it into a Markdown table?`,
        "Convert to table?",
        "Convert to table",
        "Paste as text",
      ),
    [dialog],
  );

  const vaultHandle = useAtomValue(atom_vaultHandle);
  const currentDirectoryHandle = useAtomValue(atom_currentDirectoryHandle);
  const pasteImageRef = useRef<((file: File) => Promise<string | null>) | null>(null);
  pasteImageRef.current = useCallback(
    async (file: File) => {
      if (!vaultHandle) {
        toast.error("Open a vault folder before pasting images");
        return null;
      }
      try {
        return await savePastedImage(vaultHandle, currentDirectoryHandle, file);
      } catch (err: any) {
        console.warn("Failed to save pasted image:", err?.message || err);
        toast.error("Failed to save pasted image");
        return null;
      }
    },
    [vaultHandle, currentDirectoryHandle],
  );

  const {
    pillUrl, pillLabel, pillPos, pillType, dismissPill, handleSaveLink,
    dateMatch, isDateExpanded, setIsDateExpanded, dateMenuPos, handleDateSelect,
    workflowMatch, workflowMenuPos, handleWorkflowCycle,
    todoMatch, todoMenuPos, handleTodoCycle,
    onCursorActivity,
  } = useCodeMirrorFeatures({ viewRef, containerRef, onWikiLinkClick: props.onWikiLinkClick });

  const {
    languagePickerInfo,
    pickerPos,
    query,
    pickerRef,
    activate: activateCodeLanguagePicker,
    onCursorActivity: onCodeLanguagePickerCursorActivity,
    changeQuery,
    selectLanguage,
    deactivate: deactivateCodeLanguagePicker,
  } = useCodeMirrorCodeLanguagePicker({ viewRef, containerRef });

  const handleCodeBlockInserted = useCallback((pos: number) => {
    const view = viewRef.current;
    if (view) activateCodeLanguagePicker(view, pos);
  }, [activateCodeLanguagePicker, viewRef]);

  const handleFrontmatterCommand = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;

    const existing = findFrontmatterFoldRange(view.state.doc.toString());
    if (existing) {
      setFrontmatterFold(view, existing, false);
      const titleLineEnd = view.state.doc.line(2).to;
      view.dispatch({
        selection: { anchor: titleLineEnd },
        effects: EditorView.scrollIntoView(titleLineEnd, { y: "center" }),
      });
      view.focus();
      return;
    }

    const frontmatter = '---\ntitle: \ntags: []\n---\n\n';
    const titleLineEnd = frontmatter.indexOf("title: ") + "title: ".length;
    view.dispatch({
      changes: { from: 0, insert: frontmatter },
      selection: { anchor: titleLineEnd },
      userEvent: "input.replace.template",
    });
    view.focus();
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

  const {
    tableInfo, calloutPos, currentAlignment, isOnHeader, canRemoveRow, canRemoveCol, cursorDataRowNumber,
    handleRemoveTable, handleCycleAlign, handleCopyCSV, handleAddRow, handleRemoveRow,
    handleAddColumn, handleRemoveColumn, handleSortColumn,
    onCursorActivity: onTableCursorActivity,
  } = useCodeMirrorTable({ viewRef, containerRef });

  const {
    mermaidInfo,
    buttonPos: mermaidButtonPos,
    onCursorActivity: onMermaidCursorActivity,
  } = useCodeMirrorMermaid({ viewRef, containerRef });

  const {
    imageInfo,
    buttonPos: imageButtonPos,
    onCursorActivity: onImageCursorActivity,
  } = useCodeMirrorImage({ viewRef, containerRef });

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
    if (mermaidInfo) {
      const theme = document.documentElement.classList.contains("dark") ? "dark" : "default";
      document.dispatchEvent(new CustomEvent("hermes:open-mermaid-dialog", {
        detail: { source: mermaidInfo.source, theme },
        bubbles: true,
      }));
      return true;
    }
    if (imageInfo) {
      document.dispatchEvent(new CustomEvent("hermes:open-image-dialog", {
        detail: { src: imageInfo.src, alt: imageInfo.alt },
        bubbles: true,
      }));
      return true;
    }
    return false;
  };

  const { chevrons, toggle: toggleCalloutFold, onCursorActivity: onFoldCursorActivity, onViewCreated } =
    useCodeMirrorCalloutFold({ containerRef });
    const {
      chevrons: frontmatterChevrons,
      toggle: toggleFrontmatterFold,
      onCursorActivity: onFrontmatterFoldCursorActivity,
      onViewCreated: onFrontmatterFoldViewCreated,
    } = useCodeMirrorFrontmatterFold({
      containerRef,
      collapseByDefault: frontmatterCollapsedByDefault,
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
    onMermaidCursorActivity(view);
    onCodeLanguagePickerCursorActivity(view);
    onImageCursorActivity(view);
    onFoldCursorActivity(view);
    onFrontmatterFoldCursorActivity(view);
  }, [onCursorActivity, onTableCursorActivity, onMermaidCursorActivity, onCodeLanguagePickerCursorActivity, onImageCursorActivity, onFoldCursorActivity, onFrontmatterFoldCursorActivity]);

  useCodeMirrorEditor({
    value: editorValue,
    onChange: editorOnChange,
    wordWrap,
    lineNumbers,
    vimMode,
    onOpenActiveHelperRef: openActiveHelperRef,
    placeholder: props.placeholder || "Type / for templates",
    readOnly: false,
    onFocusChange: setIsEditorFocused,
    onCursorActivity: onCombinedCursorActivity,
    containerRef,
    viewRef,
    slashMenuCallbacksRef,
    wikiLinkTriggerRef,
    csvConfirmRef,
    pasteImageRef,
    onViewCreated: handleViewCreated,
  });

  useEffect(() => {
    if (!editorView || !pendingScrollTarget || pendingScrollTarget.path !== filePath) return;

    const lineNumber = Math.min(
      Math.max(1, pendingScrollTarget.line),
      editorView.state.doc.lines,
    );
    const line = editorView.state.doc.line(lineNumber);
    editorView.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: "center" }),
    });
    editorView.focus();
    requestAnimationFrame(() => {
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      const node = editorView.domAtPos(line.from).node;
      const lineElement = (node instanceof HTMLElement ? node : node.parentElement)?.closest(".cm-line");
      lineElement?.animate?.(
        [
          { backgroundColor: "rgba(107, 142, 35, 0.24)" },
          { backgroundColor: "rgba(107, 142, 35, 0)" },
        ],
        { duration: 1400, easing: "ease-out" },
      );
    });
    setPendingScrollTarget(null);
  }, [editorView, filePath, pendingScrollTarget, setPendingScrollTarget]);

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

  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const linkUrlInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (linkDialogOpen) {
      setLinkLabel("");
      setLinkUrl("");
    }
  }, [linkDialogOpen]);

  return (
    <div
      ref={paneRef}
      className={`editor-canvas relative w-full h-full overflow-auto cursor-text ${
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
          ${wordWrap ? "mx-auto w-full" : "w-max min-w-full"}
          text-ui-body
        `}
        style={{
          fontFamily,
          "--editor-font-size": displayFontSize,
          "--editor-line-height": lineHeight,
          maxWidth: wordWrap ? maxContentWidth : undefined,
          paddingLeft: wordWrap ? contentPaddingX : noWrapPaddingX,
          paddingRight: wordWrap ? contentPaddingX : noWrapPaddingX,
          paddingBottom: keyboardInset > 0 ? `calc(3rem + ${keyboardInset}px)` : undefined,
        } as React.CSSProperties}
      >
        {wordWrap && maxContentWidth && !isMobile && (
          <button
            type="button"
            aria-label="Resize editor width"
            title="Resize editor width"
            className="absolute top-0 bottom-0 z-10 w-2 -translate-x-1/2 cursor-col-resize opacity-0 hover:opacity-100 focus:opacity-100 bg-sage/20 transition-opacity"
            style={{ left: `calc(50% + ${maxContentWidth / 2}px)` }}
            onPointerDown={handleEditorResizeStart}
            onPointerMove={handleEditorResize}
            onPointerUp={handleEditorResizeEnd}
            onPointerCancel={handleEditorResizeEnd}
          />
        )}
        <div className="relative h-full">
          <label htmlFor="md-editor" className="sr-only">Markdown editor</label>
          <div id="md-editor" ref={containerRef} className="h-full" tabIndex={0} />

          {[...chevrons.map((chevron) => ({ ...chevron, kind: "callout" as const })), ...frontmatterChevrons.filter((chevron) => !chevron.collapsed).map((chevron) => ({ ...chevron, kind: "frontmatter" as const }))].map((chevron) => (
            <button
              key={chevron.blockId}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (viewRef.current) {
                  if (chevron.kind === "frontmatter") toggleFrontmatterFold(viewRef.current);
                  else toggleCalloutFold(viewRef.current, chevron.blockId);
                }
              }}
              className="absolute right-1 z-20 p-0.5 rounded text-ink-muted dark:text-fg-faint hover:text-sage dark:hover:text-sage"
              style={{ top: chevron.top }}
              title={chevron.collapsed
                ? `Expand ${chevron.kind === "frontmatter" ? "frontmatter" : "callout"}`
                : `Collapse ${chevron.kind === "frontmatter" ? "frontmatter" : "callout"}`}
              aria-label={chevron.collapsed
                ? `Expand ${chevron.kind === "frontmatter" ? "frontmatter" : "callout"}`
                : `Collapse ${chevron.kind === "frontmatter" ? "frontmatter" : "callout"}`}
            >
              {chevron.collapsed ? <HiChevronRight size={13} /> : <HiChevronDown size={13} />}
            </button>
          ))}

          {dateMatch && (
            <Button
              variant="pill-icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDateExpanded(!isDateExpanded);
              }}
              className={PILL_CONTAINER_CLASSES}
              style={{
                top: dateMenuPos.top - 2,
                left: Math.min(dateMenuPos.endLeft + 8, (containerRef.current?.clientWidth || 500) - 30),
              }}
              title="Toggle calendar (Ctrl/Cmd+Shift+Enter)"
              aria-label="Toggle calendar (Ctrl/Cmd+Shift+Enter)"
            >
              <HiOutlineCalendar size={16} />
            </Button>
          )}

          {dateMatch && (
            <DatePickerCallout
              isOpen={isDateExpanded}
              initialDate={dateMatch.date}
              onSelectDate={handleDateSelect}
              onClose={() => setIsDateExpanded(false)}
            />
          )}

          {pillUrl && (
            <LinkPill
              url={pillUrl}
              label={pillLabel}
              pos={pillPos}
              type={pillType || "url"}
              onOpen={() => {
                if (pillType === "wiki") {
                  props.onWikiLinkClick?.(pillUrl);
                } else {
                  window.open(pillUrl, "_blank", "noopener,noreferrer");
                }
                dismissPill();
              }}
              onSave={handleSaveLink}
              onDismiss={dismissPill}
            />
          )}

          {workflowMatch && (
            <WorkflowPill
              tag={workflowMatch.tag}
              pos={workflowMenuPos}
              onPrev={() => handleWorkflowCycle("prev")}
              onNext={() => handleWorkflowCycle("next")}
              noHash={workflowMatch.isFmStatus}
            />
          )}

          {todoMatch && (
            <WorkflowPill
              tag={todoMatch.tag}
              pos={todoMenuPos}
              onPrev={() => handleTodoCycle("prev")}
              onNext={() => handleTodoCycle("next")}
            />
          )}

          {mermaidInfo && (
            <div
              style={{ top: mermaidButtonPos.top, left: mermaidButtonPos.left }}
              className={PILL_CONTAINER_CLASSES}
              onMouseDown={(e) => e.preventDefault()}
            >
              <Button
                variant="pill-icon"
                onClick={() => {
                  const theme = typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "default";
                  document.dispatchEvent(new CustomEvent("hermes:open-mermaid-dialog", {
                    detail: { source: mermaidInfo.source, theme },
                    bubbles: true,
                  }));
                }}
                title="View Mermaid diagram (Ctrl/Cmd+Shift+Enter)"
              >
                <HiOutlineArrowsExpand size={14} aria-hidden="true" />
              </Button>
            </div>
          )}

          {languagePickerInfo && (
            <div
              ref={pickerRef}
              style={{ top: pickerPos.top, left: pickerPos.left }}
              className={`${PILL_CONTAINER_CLASSES} w-48`}
              onMouseDown={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === "Escape") deactivateCodeLanguagePicker();
              }}
            >
              <Typeahead
                name="code-block-language"
                value={query}
                onChange={changeQuery}
                onOptionSelect={selectLanguage}
                onDismiss={deactivateCodeLanguagePicker}
                options={languages.map((language) => language.name.toLowerCase())}
                autoFocus
                placeholder="Language..."
              />
            </div>
          )}

          {imageInfo && (
            <div
              style={{ top: imageButtonPos.top, left: imageButtonPos.left }}
              className={PILL_CONTAINER_CLASSES}
              onMouseDown={(e) => e.preventDefault()}
            >
              <Button
                variant="pill-icon"
                onClick={() => {
                  document.dispatchEvent(new CustomEvent("hermes:open-image-dialog", {
                    detail: { src: imageInfo.src, alt: imageInfo.alt },
                    bubbles: true,
                  }));
                }}
                title="View actual image (Ctrl/Cmd+Shift+Enter)"
                aria-label="View actual image (Ctrl/Cmd+Shift+Enter)"
              >
                <HiOutlinePhotograph size={14} />
              </Button>
            </div>
          )}

          {tableInfo && (
            <TableCallout
              pos={calloutPos}
              isMobile={isMobile}
              currentAlignment={currentAlignment}
              isOnHeader={isOnHeader}
              canRemoveRow={canRemoveRow}
              canRemoveCol={canRemoveCol}
              cursorDataRowNumber={cursorDataRowNumber}
              onAddRow={handleAddRow}
              onRemoveRow={handleRemoveRow}
              onAddColumn={handleAddColumn}
              onRemoveColumn={handleRemoveColumn}
              onSortAsc={() => handleSortColumn("asc")}
              onSortDesc={() => handleSortColumn("desc")}
              onCycleAlign={handleCycleAlign}
              onRemoveTable={handleRemoveTable}
              onCopyCSV={handleCopyCSV}
              onEditDialog={() => {}}
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

          {linkDialogOpen && (
            <DialogModal
              isOpened={linkDialogOpen}
              onClose={() => setLinkDialogOpen(false)}
              styles="!max-w-sm"
              ariaLabelledBy="link-insert-heading"
            >
              <div className="flex flex-col gap-5">
                <h2 id="link-insert-heading" className="text-ui-body font-semibold text-ink-light dark:text-ink-dark">
                  Add Link
                </h2>

                <Input
                  name="link-label"
                  label="Text"
                  value={linkLabel}
                  handleChange={(e) => setLinkLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); linkUrlInputRef.current?.focus(); }
                    if (e.key === "Escape") setLinkDialogOpen(false);
                  }}
                  autoFocus
                  placeholder="Link text"
                  className="my-0"
                />

                <Input
                  ref={linkUrlInputRef}
                  name="link-url"
                  label="URL"
                  type="text"
                  value={linkUrl}
                  handleChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); insertLink(linkLabel || "link", linkUrl); }
                    if (e.key === "Escape") setLinkDialogOpen(false);
                  }}
                  placeholder="https://"
                  className="my-0"
                />

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outlined" onClick={() => setLinkDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={() => insertLink(linkLabel || "link", linkUrl)}>
                    Insert
                  </Button>
                </div>
              </div>
            </DialogModal>
          )}
        </div>
      </div>
    </div>
  );
}
