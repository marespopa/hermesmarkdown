"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { atom_frontmatterWizardOpen, atom_isAiConfigured, atom_currency } from "@/app/atoms/atoms";
import Editor from "react-simple-code-editor";
import { HiOutlineCalendar, HiChevronRight, HiChevronDown, HiOutlinePencil } from "react-icons/hi";
import DatePickerCallout from "./DatePickerCallout";
import WikiLinkDialog from "./WikiLinkDialog";
import DialogModal from "../../components/DialogModal/DialogModal";
import { LinkPill } from "./LinkPill";
import { WorkflowPill } from "./WorkflowPill";
import { TableCallout } from "./TableCallout";
import { TableDialog } from "./TableDialog";
import { AISelectionToolbar } from "./AISelectionToolbar";
import { AIThinkingOverlay } from "./AIThinkingOverlay";
import { useMarkdownEditor } from "../hooks/useMarkdownEditor";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { PILL_CONTAINER_CLASSES } from "./constants";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  filePath?: string;
  placeholder?: string;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
  setMatchCount?: (count: number) => void;
  onWikiLinkClick?: (name: string) => void;
}

const FM_REGEX = /^---\n[\s\S]*?\n---\n?/;

function parseFmFields(fm: string): Record<string, string> {
  const fields: Record<string, string> = {};
  fm.split("\n").forEach((line) => {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (m) fields[m[1]] = m[2].replace(/^"|"$/g, "").trim();
  });
  return fields;
}

export default function MarkdownEditor(props: MarkdownEditorProps) {
  const [isFmCollapsed, setIsFmCollapsed] = useState(true);
  const setFrontmatterWizardOpen = useSetAtom(atom_frontmatterWizardOpen);
  const wizardPath = useAtomValue(atom_frontmatterWizardOpen);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const currencyCode = useAtomValue(atom_currency);
  const filePath = props.filePath || "draft";

  const fmResult = FM_REGEX.exec(props.value);
  const rawFrontmatter = fmResult ? fmResult[0] : null;

  const bodyContent = rawFrontmatter ? props.value.slice(rawFrontmatter.length) : props.value;
  const editorValue = rawFrontmatter && isFmCollapsed ? bodyContent : props.value;

  // Stable refs so the onChange callback doesn't need to re-create on every render
  const rawFmRef = useRef<string | null>(null);
  rawFmRef.current = rawFrontmatter;
  const isFmCollapsedRef = useRef(isFmCollapsed);
  isFmCollapsedRef.current = isFmCollapsed;

  // Set by the expand/collapse toggle button — cursor goes to position 0 on next render
  const pendingFmCursorRef = useRef(false);
  // Set by wizard close — cursor goes into frontmatter, but only once isFmCollapsed=false
  const wizardJustClosedRef = useRef(false);
  // Set by a body-area click while frontmatter is expanded — restores cursor after collapse
  const pendingBodyCursorRef = useRef<number | null>(null);

  const prevWizardPathRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevWizardPathRef.current;
    prevWizardPathRef.current = wizardPath;
    if (prev === filePath && wizardPath === null && rawFrontmatter) {
      if (!isFmCollapsedRef.current) {
        wizardJustClosedRef.current = true;
      }
    }
  }, [wizardPath, filePath, rawFrontmatter]);

  useEffect(() => {
    // After wizard closes: expand frontmatter and focus first field.
    // Use rAF so the focus wins over any dialog-unmount focus side-effects.
    if (wizardJustClosedRef.current && !isFmCollapsed && textareaRef.current) {
      wizardJustClosedRef.current = false;
      const ta = textareaRef.current;
      requestAnimationFrame(() => {
        ta.focus();
        // Position 4 = after the opening "---\n", landing on the first field line
        ta.setSelectionRange(4, 4);
      });
      return;
    }
    // After body-click collapse: restore cursor position inside the body.
    if (pendingBodyCursorRef.current !== null && isFmCollapsed && textareaRef.current) {
      const pos = pendingBodyCursorRef.current;
      pendingBodyCursorRef.current = null;
      const ta = textareaRef.current;
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(pos, pos);
      });
      return;
    }
    if (pendingFmCursorRef.current && textareaRef.current) {
      pendingFmCursorRef.current = false;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(0, 0);
    }
  });

  const editorOnChange = useCallback((newVal: string) => {
    if (rawFmRef.current && isFmCollapsedRef.current) {
      props.onChange(rawFmRef.current + newVal);
    } else {
      props.onChange(newVal);
    }
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
    isZenModeActive,
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

    handleRemoveTable,
    handleCopyCSV,
    tableDialog,
    handleOpenEditDialog,
    workflowMatch,
    workflowMenuPos,
    handleWorkflowCycle,
    todoMatch,
    todoMenuPos,
    handleTodoCycle,
    isAiLoading,
    improveWriting,
    expandIdea,
    runPrompt,
  } = useMarkdownEditor({
    ...props,
    value: editorValue,
    onChange: editorOnChange,
    onFrontmatterWizard: useCallback(() => setFrontmatterWizardOpen(filePath), [setFrontmatterWizardOpen, filePath]),
  });

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
      className={`relative w-full h-full overflow-auto bg-paper-pale dark:bg-paper-dark cursor-text ${isZenModeActive ? "no-scrollbar" : ""}`}
      translate="no"
    >
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
          ${isZenModeActive ? "max-w-[85ch] w-full mx-auto pt-8 pb-32 px-4 md:px-12" : `pt-1 pb-12 mx-auto ${widthClass} ${paddingClass}`}
          ${wordWrap ? "w-full" : "w-max min-w-full"}
          bg-white dark:bg-[#1E1C1A]
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
        {rawFrontmatter && (() => {
            const fields = parseFmFields(rawFrontmatter);
            const title = fields["title"] ?? "";
            const meta = ["status", "scope"]
              .filter((k) => fields[k])
              .map((k) => fields[k])
              .join("  ·  ");
            return (
              <div
                className="flex items-center gap-2 mb-1 select-none"
                style={{ fontFamily, fontSize: displayFontSize }}
              >
                {/* Pencil + title — left group */}
                <Button
                  variant="pill-icon"
                  onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault()}
                  onClick={() => setFrontmatterWizardOpen(filePath)}
                  className="p-1.5 -ml-1.5 shrink-0 text-ink-muted dark:text-fg-faint hover:text-sage dark:hover:text-sage"
                  title="Edit frontmatter"
                  aria-label="Edit frontmatter"
                >
                  <HiOutlinePencil size={12} />
                </Button>
                {isFmCollapsed && title && (
                  <Button
                    variant="bare"
                    onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault()}
                    onClick={() => setFrontmatterWizardOpen(filePath)}
                    className="justify-start shrink min-w-0 max-w-[40ch] opacity-30 text-[0.72em] hover:opacity-60 transition-opacity"
                    title="Edit frontmatter"
                  >
                    <span className="truncate block min-w-0 text-left">
                      {title}
                    </span>
                  </Button>
                )}

                {/* Spacer */}
                <span className="flex-1" />

                {/* Meta + chevron — right group */}
                {isFmCollapsed && meta && (
                  <span className="shrink min-w-0 truncate text-right opacity-20 text-[0.72em]">
                    {meta}
                  </span>
                )}
                <Button
                  variant="pill-icon"
                  onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault()}
                  onClick={() => {
                    pendingFmCursorRef.current = true;
                    setIsFmCollapsed((c) => !c);
                  }}
                  className="p-1.5 -mr-1.5 shrink-0 text-ink-muted dark:text-fg-faint hover:text-sage dark:hover:text-sage"
                  title={isFmCollapsed ? "Expand frontmatter" : "Collapse frontmatter"}
                  aria-label={isFmCollapsed ? "Expand frontmatter" : "Collapse frontmatter"}
                >
                  {isFmCollapsed
                    ? <HiChevronRight size={13} />
                    : <HiChevronDown size={13} />}
                </Button>
              </div>
            );
          })()}

        <div className="relative">
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
              className="absolute z-50 w-[min(18rem,_calc(100vw_-_2rem))] bg-paper-light dark:bg-paper-dark-surface border border-edge rounded-xl shadow-2xl overflow-hidden"
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

          {isAiConfigured && (
            <AISelectionToolbar
              textareaRef={textareaRef}
              isAiLoading={isAiLoading}
              onImprove={improveWriting}
              onExpand={expandIdea}
              onPrompt={runPrompt}
            />
          )}

          {isAiLoading && <AIThinkingOverlay />}

          {tableInfo && (
            <TableCallout
              pos={calloutPos}
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
            onAddRow={() => tableDialog.handleAddRow(tableDialog.headers.length)}
            onRemoveRow={tableDialog.handleRemoveRow}
            onConfirmRemoveRow={tableDialog.handleConfirmRemoveRow}
            onCancelRemoveRow={tableDialog.handleCancelRemoveRow}
            onInsert={tableDialog.handleInsert}
            onUpdate={tableDialog.handleUpdate}
            onClose={tableDialog.close}
            currencyCode={currencyCode}
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

          <Editor
            value={value}
            onValueChange={handleValueChange}
            highlight={highlight}
            padding={0}
            readOnly={isAiLoading}
            onClick={(e) => {
              handleEditorClick(e);
              // Collapse frontmatter when clicking into the body area
              if (!isFmCollapsedRef.current && rawFmRef.current && textareaRef.current) {
                const pos = textareaRef.current.selectionStart;
                if (pos >= rawFmRef.current.length) {
                  pendingBodyCursorRef.current = pos - rawFmRef.current.length;
                  setIsFmCollapsed(true);
                }
              }
            }}
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
