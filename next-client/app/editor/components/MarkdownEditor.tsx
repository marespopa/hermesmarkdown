"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAtomValue, useSetAtom } from "jotai";
import { atom_frontmatterWizardOpen, atom_wordWrap, atom_isEditorFocused, atom_vaultHandle, atom_currentDirectoryHandle } from "@/app/atoms/atoms";
import { atom_activeEditorView, atom_activeEditorKind } from "@/app/atoms/ui-atoms";
import { useAtom } from "jotai";
import { savePastedImage } from "@/app/utils/paste-image";
import type { EditorView } from "@codemirror/view";
import { HiOutlineCalendar, HiChevronDown, HiChevronRight } from "react-icons/hi";
import FrontmatterPanel from "./FrontmatterPanel";
import Button from "../../components/Button";
import Input from "../../components/Input";
import DialogModal from "../../components/DialogModal/DialogModal";
import DatePickerCallout from "./DatePickerCallout";
import WikiLinkDialog from "./WikiLinkDialog";
import { LinkPill } from "./LinkPill";
import { WorkflowPill } from "./WorkflowPill";
import { TableCallout } from "./TableCallout";
import { PILL_CONTAINER_CLASSES } from "./constants";
import { FM_REGEX } from "@/app/utils/frontmatter-utils";
import useKeyboardInset from "@/app/hooks/use-keyboard-inset";
import { useDialog } from "@/app/hooks/use-dialog";
import { useEditorAppearance } from "../hooks/use-editor-appearance";
import { useCodeMirrorEditor } from "../hooks/use-codemirror-editor";
import { useCodeMirrorFeatures } from "../hooks/use-codemirror-features";
import { useCodeMirrorTemplates } from "../hooks/use-codemirror-templates";
import { useCodeMirrorTable } from "../hooks/use-codemirror-table";
import { useCodeMirrorMermaid } from "../hooks/use-codemirror-mermaid";
import { useCodeMirrorCalloutFold } from "../hooks/use-codemirror-callout-fold";

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
// click to open/navigate), date picker (Alt+ArrowDown), workflow/todo tag
// cycling pills.
export default function MarkdownEditor(props: MarkdownEditorProps) {
  const setFrontmatterWizardOpen = useSetAtom(atom_frontmatterWizardOpen);
  const wordWrap = useAtomValue(atom_wordWrap);
  const [, setIsEditorFocused] = useAtom(atom_isEditorFocused);
  const filePath = props.filePath || "draft";

  // Frontmatter is entirely owned by <FrontmatterPanel/> — it never appears
  // in the CM6 doc, so the editable value always excludes it.
  const fmResult = FM_REGEX.exec(props.value);
  const rawFrontmatter = fmResult ? fmResult[0] : null;
  const editorValue = rawFrontmatter ? props.value.slice(rawFrontmatter.length) : props.value;

  const rawFmRef = useRef<string | null>(null);
  rawFmRef.current = rawFrontmatter;

  const editorOnChange = useCallback((newVal: string) => {
    props.onChange((rawFmRef.current ?? "") + newVal);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.onChange]);

  const { fontFamily, displayFontSize, lineHeight, windowWidth, paneRef, maxContentWidth, contentPaddingX, noWrapPaddingX } =
    useEditorAppearance(props.isSplit);

  const keyboardInset = useKeyboardInset();
  const isMobile = windowWidth < 768;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  const dialog = useDialog();
  const csvConfirmRef = useRef<((preview: string) => Promise<boolean>) | null>(null);
  csvConfirmRef.current = useCallback(
    (preview: string) =>
      dialog.confirm(
        `Pasted content looks like tabular data (${preview.split("\n").length} rows). Convert it into a Markdown table?`,
        "Convert to table?",
        "Convert to table",
        "Paste as text",
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    pillUrl, pillLabel, pillPos, pillType, setPillUrl, handleSaveLink,
    dateMatch, isDateExpanded, setIsDateExpanded, dateMenuPos, handleDateSelect,
    workflowMatch, workflowMenuPos, handleWorkflowCycle,
    todoMatch, todoMenuPos, handleTodoCycle,
    onCursorActivity,
  } = useCodeMirrorFeatures({ viewRef, containerRef, onWikiLinkClick: props.onWikiLinkClick });

  const {
    linkDialogOpen, setLinkDialogOpen, insertLink,
    wikiLinkDialogOpen, setWikiLinkDialogOpen, insertWikiLink,
    templateDatePickerOpen, setTemplateDatePickerOpen, insertTemplateDate,
    slashMenuCallbacksRef, wikiLinkTriggerRef,
  } = useCodeMirrorTemplates({
    viewRef,
    onFrontmatterWizard: useCallback(() => setFrontmatterWizardOpen(filePath), [setFrontmatterWizardOpen, filePath]),
  });

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

  const { chevrons, toggle: toggleCalloutFold, onCursorActivity: onFoldCursorActivity, onViewCreated } =
    useCodeMirrorCalloutFold({ containerRef });

  const onCombinedCursorActivity = useCallback((view: EditorView) => {
    onCursorActivity(view);
    onTableCursorActivity(view);
    onMermaidCursorActivity(view);
    onFoldCursorActivity(view);
  }, [onCursorActivity, onTableCursorActivity, onMermaidCursorActivity, onFoldCursorActivity]);

  useCodeMirrorEditor({
    value: editorValue,
    onChange: editorOnChange,
    wordWrap,
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
    onViewCreated,
  });

  // The global voice-input hook (use-global-voice-input.ts) is a single
  // instance shared by the whole app, not one per pane. It inserts a
  // committed dictation into whichever view this atom currently points at,
  // so this pane only needs to claim that slot while it's the active one.
  const setActiveEditorView = useSetAtom(atom_activeEditorView);
  const setActiveEditorKind = useSetAtom(atom_activeEditorKind);
  useEffect(() => {
    if (!props.isActivePane) return;
    setActiveEditorView(viewRef.current);
    setActiveEditorKind("cm6");
    // Cleared on unmount/deactivation so a later dictation commit can't
    // target a torn-down view — see atom_activeEditorKind's role in
    // use-global-voice-input.ts picking between this and the Milkdown view.
    return () => {
      setActiveEditorView(null);
      setActiveEditorKind((prev) => (prev === "cm6" ? null : prev));
    };
  }, [props.isActivePane, setActiveEditorView, setActiveEditorKind, viewRef]);

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
      className="relative w-full h-full overflow-auto bg-white dark:bg-paper-dark cursor-text"
      translate="no"
    >
      <div
        className="mx-auto w-full pt-1"
        style={{ fontFamily, maxWidth: maxContentWidth, paddingLeft: contentPaddingX, paddingRight: contentPaddingX }}
      >
        <FrontmatterPanel
          filePath={filePath}
          content={props.value}
          onChange={props.onChange}
          fontFamily={fontFamily}
          displayFontSize={displayFontSize}
          isMobile={isMobile}
        />
      </div>

      <div
        className={`editor-container relative min-h-full antialiased normal-nums [font-variant-ligatures:none] [font-feature-settings:'liga'_0,'calt'_0]
          transition-[padding,max-width] duration-700 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]
          pt-3 pb-12
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
        <div className="relative h-full">
          <label htmlFor="md-editor" className="sr-only">Markdown editor</label>
          <div id="md-editor" ref={containerRef} className="h-full" />

          {chevrons.map((chevron) => (
            <button
              key={chevron.blockId}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (viewRef.current) toggleCalloutFold(viewRef.current, chevron.blockId);
              }}
              className="absolute right-1 z-20 p-0.5 rounded text-ink-muted dark:text-fg-faint hover:text-sage dark:hover:text-sage"
              style={{ top: chevron.top }}
              title={chevron.collapsed ? "Expand callout" : "Collapse callout"}
              aria-label={chevron.collapsed ? "Expand callout" : "Collapse callout"}
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
              title="Toggle calendar"
              aria-label="Toggle calendar"
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
                setPillUrl(null);
              }}
              onSave={handleSaveLink}
              onDismiss={() => setPillUrl(null)}
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
                title="View Mermaid diagram"
              >
                ⎇
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
            title="Insert WikiLink"
          />

          <DatePickerCallout
            isOpen={templateDatePickerOpen}
            initialDate={new Date()}
            onSelectDate={insertTemplateDate}
            onClose={() => setTemplateDatePickerOpen(false)}
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
