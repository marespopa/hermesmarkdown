"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { atom_frontmatterWizardOpen, atom_isAiConfigured, atom_isAiBusy } from "@/app/atoms/atoms";
import Editor from "react-simple-code-editor";
import { HiOutlineCalendar, HiChevronDown, HiChevronRight } from "react-icons/hi";
import DatePickerCallout from "./DatePickerCallout";
import WikiLinkDialog from "./WikiLinkDialog";
import DialogModal from "../../components/DialogModal/DialogModal";
import { LinkPill } from "./LinkPill";
import { WorkflowPill } from "./WorkflowPill";
import { FormulaResultOverlay } from "./FormulaResultOverlay";
import { TableCallout } from "./TableCallout";
import { TableDialog } from "./TableDialog";
import { AIThinkingOverlay } from "./AIThinkingOverlay";
import { AIReviewDialog } from "./AIReviewDialog";
import AIChatDialog from "./AIChatDialog";
import { useMarkdownEditor } from "../hooks/useMarkdownEditor";
import Button from "../../components/Button";
import Input from "../../components/Input";
import FrontmatterPanel from "./FrontmatterPanel";
import { PILL_CONTAINER_CLASSES } from "./constants";
import { FM_REGEX } from "@/app/utils/frontmatter-utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  filePath?: string;
  placeholder?: string;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
  setMatchCount?: (count: number) => void;
  onWikiLinkClick?: (name: string) => void;
  isActivePane?: boolean;
}

export default function MarkdownEditor(props: MarkdownEditorProps) {
  const setFrontmatterWizardOpen = useSetAtom(atom_frontmatterWizardOpen);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const isAiBusy = useAtomValue(atom_isAiBusy);
  const filePath = props.filePath || "draft";

  // Frontmatter is now entirely owned by <FrontmatterPanel/> — it never
  // appears in the body textarea, so the editable value always excludes it.
  const fmResult = FM_REGEX.exec(props.value);
  const rawFrontmatter = fmResult ? fmResult[0] : null;
  const editorValue = rawFrontmatter ? props.value.slice(rawFrontmatter.length) : props.value;

  // Stable ref so the onChange callback doesn't need to re-create on every render
  const rawFmRef = useRef<string | null>(null);
  rawFmRef.current = rawFrontmatter;

  const editorOnChange = useCallback((newVal: string) => {
    props.onChange((rawFmRef.current ?? "") + newVal);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.onChange]);

  const {
    value,
    handleValueChange,
    fontFamily,
    displayFontSize,
    lineHeight,
    letterSpacing,
    wordWrap,
    windowWidth,
    menuOpen,
    menuPos,
    selectedIndex,
    isCtrlPressed,
    isOverLink,
    dateMatch,
    setDateMatch,
    dateMenuPos,
    isDateExpanded,
    setIsDateExpanded,
    toggleObsidianCallout,
    calloutChevrons,
    wrapperRef,
    textareaRef,
    handleMouseMove,
    handlePaste,
    handleDateSelect,
    handleEditorClick,
    handleGlobalKeyDown,
    insertTemplate,
    filteredTemplates,
    highlight,
    widthClass,
    paddingClass,
    setIsEditorFocused,
    pillUrl,
    pillLabel,
    pillPos,
    pillType,
    setPillUrl,
    handleSaveLink,
    handleSaveWikiLink,
    linkDialogOpen,
    setLinkDialogOpen,
    wikiLinkDialogOpen,
    setWikiLinkDialogOpen,
    insertWikiLink,
    wikiLinkInsertPos,
    insertLink,
    datePickerOpen,
    setDatePickerOpen,
    insertDate,
    tableInfo,
    setTableInfo,
    calloutPos,
    currentAlignment,
    isOnHeader,
    canRemoveRow,
    canRemoveCol,
    cursorDataRowNumber,
    formulaBadges,

    handleRemoveTable,
    handleCycleAlign,
    handleCopyCSV,
    handleAddRow,
    handleRemoveRow,
    handleAddColumn,
    handleRemoveColumn,
    handleSortColumn,
    tableDialog,
    handleOpenEditDialog,
    workflowMatch,
    workflowMenuPos,
    handleWorkflowCycle,
    todoMatch,
    todoMenuPos,
    handleTodoCycle,
    isAiLoading,
    aiReview,
    isChatOpen,
    chatSelectedText,
    openChat,
    closeChat,
    applyFromChat,
    applyReplace,
    applyInsertBelow,
    dismissReview,
  } = useMarkdownEditor({
    ...props,
    value: editorValue,
    onChange: editorOnChange,
    onFrontmatterWizard: useCallback(() => setFrontmatterWizardOpen(filePath), [setFrontmatterWizardOpen, filePath]),
  });

  const isEditorBlocked = isAiLoading || isAiBusy;

  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const linkUrlInputRef = useRef<HTMLInputElement>(null);
  const templateContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (linkDialogOpen) {
      setLinkLabel("");
      setLinkUrl("");
    }
  }, [linkDialogOpen]);

  useEffect(() => {
    if (menuOpen && selectedIndex !== -1 && templateContainerRef.current) {
      const container = templateContainerRef.current;
      const selectedItem = container.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, menuOpen]);

  const isMobile = windowWidth < 768;

  function renderFuzzyLabel(label: string, matchIndices: number[]) {
    const indexSet = new Set(matchIndices);
    return label.split("").map((char, i) =>
      indexSet.has(i)
        ? <strong key={i} className="font-bold not-italic">{char}</strong>
        : <span key={i}>{char}</span>
    );
  }

  const templateList = (
    <div
      ref={templateContainerRef}
      id="cmd-listbox"
      role="listbox"
      aria-label="Insert command"
      className={`overflow-y-auto py-1 ${isMobile ? "max-h-[55vh]" : "max-h-52"}`}
    >
      {filteredTemplates.length === 0 ? (
        <div className="px-3 py-2 text-ui-footnote text-ink-muted dark:text-fg-faint">
          No results
        </div>
      ) : (
        filteredTemplates.map((t, i) => {
          const isActive = i === selectedIndex;
          return (
            <div
              key={t.label}
              role="option"
              aria-selected={isActive}
              id={`cmd-item-${i}`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertTemplate(t.content);
              }}
              className={`flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-colors ${
                isActive
                  ? "bg-beige/40 dark:bg-sage/20"
                  : "hover:bg-paper-softgray dark:hover:bg-paper-dark-surface"
              }`}
            >
              <span className="shrink-0 w-6 text-center text-base leading-none select-none" aria-hidden="true">
                {t.icon}
              </span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className={`text-ui-footnote font-medium leading-tight truncate ${isActive ? "text-ink-light dark:text-ink-dark" : "text-ink-light dark:text-ink-dark"}`}>
                  {renderFuzzyLabel(t.label, t.matchIndices)}
                </span>
                <span className="text-[10px] leading-tight text-ink-muted dark:text-fg-faint truncate mt-0.5">
                  {t.description}
                </span>
              </div>
              {t.keybind && (
                <kbd className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-paper-softgray dark:bg-paper-dark-surface text-ink-muted dark:text-fg-faint border border-edge">
                  {t.keybind}
                </kbd>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div
      ref={wrapperRef}
      onKeyDown={handleGlobalKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget && textareaRef.current) {
          textareaRef.current.focus();
        }
      }}
      className="relative w-full h-full overflow-auto bg-white dark:bg-paper-dark cursor-text"
      translate="no"
    >
      {rawFrontmatter && (
        <div className={`mx-auto ${widthClass} ${paddingClass} pt-1`} style={{ fontFamily }}>
          <FrontmatterPanel
            filePath={filePath}
            content={props.value}
            onChange={props.onChange}
            fontFamily={fontFamily}
            displayFontSize={displayFontSize}
            isMobile={isMobile}
          />
        </div>
      )}

      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && textareaRef.current) {
            const textarea = textareaRef.current;
            // Preserve any active drag-selection that ended outside the textarea
            if (textarea.selectionStart !== textarea.selectionEnd) {
              textarea.focus();
              return;
            }
            textarea.focus();
            const rect = textarea.getBoundingClientRect();
            if (e.clientY < rect.top) {
              textarea.setSelectionRange(0, 0);
            } else {
              const length = textarea.value.length;
              textarea.setSelectionRange(length, length);
            }
          }
        }}
        className={`editor-container relative min-h-full antialiased normal-nums [font-variant-ligatures:none] [font-feature-settings:'liga'_0,'calt'_0]
          transition-[padding,max-width] duration-700 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]
          pt-1 pb-12
          ${wordWrap ? `mx-auto ${widthClass} ${paddingClass}` : "px-4 sm:px-6 md:px-10"}
          ${wordWrap ? "w-full" : "w-max min-w-full"}
          text-ui-body
          [&_textarea]:!bg-transparent [&_textarea]:!text-transparent [&_textarea]:!caret-sage
          [&_textarea]:!z-10 [&_pre]:!z-0 [&_pre]:!pointer-events-none
          [&_textarea]:!outline-none [&_textarea]:!p-0 [&_pre]:!p-0
          [&_textarea]:![border-radius:inherit] [&_pre]:![border-radius:inherit]
          [&_textarea]:!border-none [&_pre]:!border-none
          [&_textarea]:!m-0 [&_pre]:!m-0
          ${wordWrap ? "[&_textarea]:!white-space-pre-wrap [&_pre]:!white-space-pre-wrap" : "[&_textarea]:!white-space-pre [&_pre]:!white-space-pre"}
        `}
        style={{
          fontFamily,
          "--editor-font-size": displayFontSize,
          "--editor-line-height": lineHeight,
          "--editor-letter-spacing": letterSpacing,
        } as React.CSSProperties}
      >
        <div className="relative">
          {calloutChevrons.map((chevron) => (
            <button
              key={chevron.blockId}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleObsidianCallout(chevron.blockId, chevron.collapsed);
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
                left: Math.min(
                  dateMenuPos.endLeft + 8,
                  (textareaRef.current?.clientWidth || 500) - 30,
                ),
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

          {menuOpen && (
            <div
              role="combobox"
              aria-expanded="true"
              aria-controls="cmd-listbox"
              aria-haspopup="listbox"
              aria-activedescendant={selectedIndex !== -1 ? `cmd-item-${selectedIndex}` : undefined}
              className="absolute z-50 w-[min(18rem,_calc(100vw_-_2rem))] bg-paper-light dark:bg-paper-dark-surface border border-edge rounded-xl overflow-hidden"
              style={{ top: menuPos.top, left: menuPos.left, fontFamily }}
            >
              {templateList}
            </div>
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
              onEdit={() => {
                if (pillType === "wiki") {
                  setWikiLinkDialogOpen(true);
                }
              }}
              onDismiss={() => {
                setPillUrl(null);
                textareaRef.current?.focus();
              }}
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

          <FormulaResultOverlay badges={formulaBadges} />

          {isEditorBlocked && <AIThinkingOverlay />}

          <AIReviewDialog
            review={aiReview}
            onClose={dismissReview}
            onReplace={applyReplace}
            onInsertBelow={applyInsertBelow}
          />

          <AIChatDialog
            isOpen={isChatOpen}
            onClose={closeChat}
            documentContent={value}
            selectedText={chatSelectedText}
            currentFilePath={filePath}
            onApply={applyFromChat}
          />

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
              onEditDialog={handleOpenEditDialog}
            />
          )}

          <TableDialog
            isOpen={tableDialog.isOpen}
            mode={tableDialog.mode}
            headers={tableDialog.headers}
            rows={tableDialog.rows}
            alignments={tableDialog.alignments}
            sortState={tableDialog.sortState}
            focusRow={tableDialog.editCtx?.cursorRow}
            focusCol={tableDialog.editCtx?.cursorCol}
            pendingRemoveCol={tableDialog.pendingRemoveCol}
            pendingRemoveRow={tableDialog.pendingRemoveRow}
            markdownPreview={tableDialog.getMarkdownPreview()}
            onHeaderChange={tableDialog.handleHeaderChange}
            onCellChange={tableDialog.handleCellChange}
            onAlignmentChange={tableDialog.handleAlignmentChange}
            onSortColumn={tableDialog.handleSortColumn}
            onAddColumn={tableDialog.handleAddColumn}
            onRemoveColumn={tableDialog.handleRemoveColumn}
            onConfirmRemoveColumn={tableDialog.handleConfirmRemoveColumn}
            onCancelRemoveColumn={tableDialog.handleCancelRemoveColumn}
            onAddRow={(atIndex) => tableDialog.handleAddRow(tableDialog.headers.length, atIndex)}
            onRemoveRow={tableDialog.handleRemoveRow}
            onConfirmRemoveRow={tableDialog.handleConfirmRemoveRow}
            onCancelRemoveRow={tableDialog.handleCancelRemoveRow}
            onInsert={tableDialog.handleInsert}
            onUpdate={tableDialog.handleUpdate}
            onClose={tableDialog.close}
          />

          <WikiLinkDialog
            isOpen={wikiLinkDialogOpen}
            onClose={() => {
              setWikiLinkDialogOpen(false);
              textareaRef.current?.focus();
            }}
            onConfirm={wikiLinkInsertPos ? insertWikiLink : handleSaveWikiLink}
            initialValue={wikiLinkInsertPos ? "" : pillLabel}
            title={wikiLinkInsertPos ? "Insert WikiLink" : "Edit WikiLink"}
          />

          {linkDialogOpen && (
            <DialogModal
              isOpened={linkDialogOpen}
              onClose={() => { setLinkDialogOpen(false); textareaRef.current?.focus(); }}
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
                    if (e.key === "Escape") { setLinkDialogOpen(false); textareaRef.current?.focus(); }
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
                    if (e.key === "Escape") { setLinkDialogOpen(false); textareaRef.current?.focus(); }
                  }}
                  placeholder="https://"
                  className="my-0"
                />

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outlined" onClick={() => { setLinkDialogOpen(false); textareaRef.current?.focus(); }}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={() => insertLink(linkLabel || "link", linkUrl)}>
                    Insert
                  </Button>
                </div>
              </div>
            </DialogModal>
          )}

          <DatePickerCallout
            isOpen={datePickerOpen}
            initialDate={new Date()}
            onSelectDate={(date) => insertDate(date)}
            onClose={() => { setDatePickerOpen(false); textareaRef.current?.focus(); }}
          />

          <label htmlFor="md-editor-textarea" className="sr-only">Markdown editor</label>
          <Editor
            value={value}
            onValueChange={handleValueChange}
            highlight={highlight}
            padding={0}
            readOnly={isEditorBlocked}
            onClick={handleEditorClick}
            onPaste={handlePaste}
            onMouseMove={handleMouseMove}
            onFocus={() => setIsEditorFocused(true)}
            onBlur={() => {
              setIsEditorFocused(false);
              // Dismiss pill when focus leaves the editor, unless focus moved into a
              // dialog (e.g. the mobile action sheet or the desktop edit modal).
              setTimeout(() => {
                if (!document.activeElement?.closest('[role="dialog"]')) {
                  setPillUrl(null);
                  setDateMatch(null);
                  setIsDateExpanded(false);
                  setTableInfo(null);
                }
              }, 150);
            }}
            onKeyDown={handleGlobalKeyDown}
            textareaId="md-editor-textarea"
            textareaClassName={
              isCtrlPressed && isOverLink ? "!cursor-pointer" : "!cursor-text"
            }
            {...({ autoComplete: "off" } as any)}
          />

          {!value && (
            <div className="absolute top-0 left-0 right-0 opacity-20 pointer-events-none italic">
              {props.placeholder || "Type / for templates"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
