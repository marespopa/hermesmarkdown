"use client";

import React from "react";
import Editor from "react-simple-code-editor";
import { HiOutlineCalendar } from "react-icons/hi";
import DatePickerCallout from "./DatePickerCallout";
import DialogModal from "../../components/DialogModal/DialogModal";
import { useMarkdownEditor } from "../hooks/useMarkdownEditor";

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
  } = useMarkdownEditor(props);

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
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDateExpanded(!isDateExpanded);
              }}
              className="absolute z-40 p-1 text-zinc-400 hover:text-blue-600 dark:text-zinc-500 dark:hover:text-blue-400 transition-colors bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800 shadow-sm"
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
            </button>
          )}

          {dateMatch && isDateExpanded && (
            <>
              {windowWidth < 768 ? (
                <DialogModal
                  isOpened={isDateExpanded}
                  onClose={() => setIsDateExpanded(false)}
                  styles="!max-w-[340px] !rounded-3xl"
                >
                  <div className="-m-6 sm:-m-8">
                    <DatePickerCallout
                      initialDate={dateMatch.date}
                      onSelectDate={handleDateSelect}
                      onClose={() => setIsDateExpanded(false)}
                    />
                  </div>
                </DialogModal>
              ) : (
                <div
                  className="absolute z-50 pointer-events-auto"
                  style={{
                    top: dateMenuPos.top + 32,
                    left: Math.max(
                      10,
                      Math.min(
                        dateMenuPos.left,
                        (textareaRef.current?.clientWidth || 800) - 400,
                      ),
                    ),
                  }}
                >
                  <DatePickerCallout
                    initialDate={dateMatch.date}
                    onSelectDate={handleDateSelect}
                    onClose={() => setIsDateExpanded(false)}
                  />
                </div>
              )}
            </>
          )}

          {menuOpen && filteredTemplates.length > 0 && (
            <div
              className="absolute z-50 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl py-1 overflow-hidden"
              style={{ top: menuPos.top, left: menuPos.left, fontFamily }}
            >
              {filteredTemplates.map((t, i) => (
                <div
                  key={t.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertTemplate(t.content);
                  }}
                  className={`px-3 py-2 cursor-pointer text-ui-footnote transition-colors ${
                    i === selectedIndex
                      ? "bg-amber-100 dark:bg-neutral-900 text-amber-900 dark:text-zinc-100"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {t.label}
                </div>
              ))}
            </div>
          )}

          <Editor
            value={value}
            onValueChange={handleValueChange}
            highlight={highlight}
            padding={0}
            onClick={handleEditorClick}
            onPaste={handlePaste}
            onMouseMove={handleMouseMove}
            onFocus={() => setIsEditorFocused(true)}
            onBlur={() => setIsEditorFocused(false)}
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
