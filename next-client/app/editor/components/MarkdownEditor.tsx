"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "react-simple-code-editor";
import { HiOutlineCalendar } from "react-icons/hi";
import DatePickerCallout from "./DatePickerCallout";
import WikiLinkDialog from "./WikiLinkDialog";
import DialogModal from "../../components/DialogModal/DialogModal";
import { LinkPill } from "./LinkPill";
import { useMarkdownEditor } from "../hooks/useMarkdownEditor";
import Button from "../../components/Button";
import { PILL_CONTAINER_CLASSES } from "./constants";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
  setMatchCount?: (count: number) => void;
  onWikiLinkClick?: (name: string) => void;
}

export default function MarkdownEditor(props: MarkdownEditorProps) {
  const {
    value,
    handleValueChange,
    fontFamily,
    displayFontSize,
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
  } = useMarkdownEditor(props);

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
  const displayedTemplates = filteredTemplates;

  const templateList = (
    <div ref={templateContainerRef} className={`overflow-y-auto py-1 ${isMobile ? "max-h-[55vh]" : "max-h-52"}`}>
      {displayedTemplates.length === 0 ? (
        <div className="px-3 py-2 text-ui-footnote text-zinc-400 dark:text-zinc-600">
          No results
        </div>
      ) : (
        displayedTemplates.map((t, i) => (
          <div
            key={t.label}
            onMouseDown={(e) => {
              e.preventDefault();
              insertTemplate(t.content);
            }}
            className={`px-3 py-2 cursor-pointer text-ui-footnote transition-colors ${
              i === selectedIndex
                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {t.label}
          </div>
        ))
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
      className={`relative w-full h-full overflow-auto cursor-text ${isZenModeActive ? "no-scrollbar" : "p-2"}`}
      translate="no"
    >
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && textareaRef.current) {
            const textarea = textareaRef.current;
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
          transition-[padding,max-width,opacity] duration-700 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]
          ${isZenModeActive ? "max-w-[85ch] w-full mx-auto pt-8 pb-32 px-4 md:px-12" : `pt-1 pb-12 mx-auto ${widthClass} ${paddingClass}`}
          ${wordWrap ? "w-full" : "w-max min-w-full"}
          text-ui-body
          [&_textarea]:!bg-transparent [&_textarea]:!text-transparent [&_textarea]:!caret-blue-500
          [&_textarea]:!z-10 [&_pre]:!z-0 [&_pre]:!pointer-events-none
          [&_textarea]:!outline-none [&_textarea]:!p-0 [&_pre]:!p-0
          [&_textarea]:!leading-[1.8] [&_pre]:!leading-[1.8]
          [&_textarea]:!tracking-normal [&_pre]:!tracking-normal
          ${wordWrap ? "[&_textarea]:!white-space-pre-wrap [&_pre]:!white-space-pre-wrap" : "[&_textarea]:!white-space-pre [&_pre]:!white-space-pre"}
        `}
        style={{ fontFamily, fontSize: displayFontSize }}
      >
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
              className="absolute z-50 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl overflow-hidden"
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
                <h2 id="link-insert-heading" className="text-ui-body font-semibold text-zinc-900 dark:text-zinc-100">
                  Add Link
                </h2>

                <div className="flex flex-col gap-1.5">
                  <label className="text-ui-footnote text-zinc-500 dark:text-zinc-400">Text</label>
                  <input
                    type="text"
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); linkUrlInputRef.current?.focus(); }
                      if (e.key === "Escape") { setLinkDialogOpen(false); textareaRef.current?.focus(); }
                    }}
                    autoFocus
                    placeholder="Link text"
                    className="px-3 py-2 text-ui-footnote rounded-xl border border-zinc-200 dark:border-zinc-700
                      bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                      outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500
                      transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-ui-footnote text-zinc-500 dark:text-zinc-400">URL</label>
                  <input
                    ref={linkUrlInputRef}
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); insertLink(linkLabel || "link", linkUrl); }
                      if (e.key === "Escape") { setLinkDialogOpen(false); textareaRef.current?.focus(); }
                    }}
                    placeholder="https://"
                    className="px-3 py-2 text-ui-footnote rounded-xl border border-zinc-200 dark:border-zinc-700
                      bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono
                      outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500
                      transition-colors"
                  />
                </div>

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
                }
              }, 150);
            }}
            onKeyDown={handleGlobalKeyDown}
            textareaClassName={
              isCtrlPressed && isOverLink ? "!cursor-pointer" : "!cursor-text"
            }
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
