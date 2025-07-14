import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Block, blockToMarkdown } from "./blockUtils";
import HelpTooltip from "./HelpTooltip";

interface BlockItemProps {
  block: Block;
  isFocused: boolean;
  isHovered: boolean;
  isLast: boolean;
  onBlur: (e: React.FocusEvent<HTMLElement>, id: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>, idx: number, id: string) => void;
  onFocus: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  blockRef: (el: HTMLElement | null) => void;
  BlockControls: React.ReactNode;
  idx: number;
  isSelected?: boolean;
  isPageEmpty?: boolean;
  onEscape?: () => void; // new prop
}

const BlockItem: React.FC<BlockItemProps> = ({
  block,
  isFocused,
  isHovered,
  isLast,
  onBlur,
  onKeyDown,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  blockRef,
  BlockControls,
  idx,
  isSelected,
  isPageEmpty,
  onEscape,
}) => {
  // Show help tooltip only if the page is empty (one empty block) and user hasn't typed
  const [showHelp, setShowHelp] = useState(isPageEmpty && block.content.trim() === "");
  useEffect(() => {
    setShowHelp(isPageEmpty && block.content.trim() === "");
  }, [isPageEmpty, block.content]);
  function handleInput(e: React.FormEvent<HTMLElement>) {
    if (showHelp && (e.currentTarget.textContent || "").trim() !== "") {
      setShowHelp(false);
    }
  }

  function placeCaretAtEnd(el: HTMLElement) {
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function handleClick(e: React.MouseEvent<HTMLElement>) {
    onFocus();
    // Move caret to end after focus
    setTimeout(() => {
      if (blockRef) {
        const el = (blockRef as any).current || (typeof blockRef === 'function' ? null : blockRef);
        if (el) placeCaretAtEnd(el);
      }
    }, 0);
  }

  if (isLast && block.content.trim() === "") {
    return (
      <div key={block.id} className="relative">
        <div
          ref={blockRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          tabIndex={0}
          data-block-id={block.id}
          className={`group flex items-start px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none ${isSelected ? "bg-amber-100 border-2 border-amber-300" : isFocused ? "bg-gray-100 dark:bg-gray-800" : "bg-transparent"}`}
          style={{ minHeight: '1.5em' }}
          onBlur={e => onBlur(e, block.id)}
          onKeyDown={e => onKeyDown(e, idx, block.id)}
          onFocus={onFocus}
          onClick={handleClick}
          onDoubleClick={onFocus}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onInput={handleInput}
          data-placeholder={"Type '/' for commands"}
        >
          {BlockControls}
          {block.content}
        </div>
        {showHelp && <HelpTooltip />}
      </div>
    );
  }
  // Remove the isFocused-only block rendering, always render as editable
  if (block.type === "hr") {
    return (
      <div className="relative flex items-center my-4 group">
        <hr className="border-t border-gray-300 dark:border-gray-600 w-full" />
        {BlockControls}
      </div>
    );
  }

  if (isFocused) {
    // Determine if this is a list item
    const isListItem = block.type === "text" && /^([*\-+]\s|\d+\.\s)/.test(block.content);
    // For heading, show # in the editable field
    const displayContent = block.type === "heading" ? `# ${block.content}` : block.content;
    return (
      <div
        key={block.id}
        ref={blockRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        tabIndex={0}
        data-block-id={block.id}
        className={`group relative flex items-start px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none bg-gray-100 dark:bg-gray-800`}
        onBlur={e => onBlur(e, block.id)}
        onKeyDown={e => {
          // Custom block deletion logic
          if ((e.key === "Backspace" || e.key === "Delete")) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              // Check if selection is inside this block
              const ancestorElem = range.commonAncestorContainer instanceof Element ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
              if (ancestorElem && ancestorElem.closest && ancestorElem.closest('[data-block-id]') === e.currentTarget) {
                if (!sel.isCollapsed) {
                  // Let browser handle text deletion
                  return;
                }
                // If collapsed and block is empty, handle block deletion
                if (e.currentTarget.innerText.trim() === "") {
                  onKeyDown(e, idx, block.id);
                  return;
                }
              }
            }
          }
          onKeyDown(e, idx, block.id);
        }}
        onFocus={onFocus}
        onClick={handleClick}
        onDoubleClick={onFocus}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onInput={handleInput}
        data-placeholder={block.type === "heading" ? "# Heading" : "Start typing..."}
        aria-label={block.type === "heading" ? "Heading" : "Text block"}
      >
        {BlockControls}
        {displayContent}
        {idx === 0 && isFocused && block.content.trim() === "" && <HelpTooltip />}
      </div>
    );
  }
  // Not focused/selected: render markdown preview
  const isListItem = block.type === "text" && /^([*\-+]\s|\d+\.\s)/.test(block.content);
  return (
    <div
      key={block.id}
      className={`group relative flex items-start px-3 ${isListItem ? "py-0" : "py-2"} rounded-md transition-colors duration-200 ${isSelected ? "bg-amber-100 border-2 border-amber-300" : "bg-transparent"}`}
      onClick={onFocus}
      onDoubleClick={onFocus}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ minHeight: isListItem ? '1em' : '1.5em', cursor: 'text' }}
    >
      {BlockControls}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
      >
        {blockToMarkdown(block)}
      </ReactMarkdown>
    </div>
  );
};

export default React.memo(BlockItem, (prevProps, nextProps) => {
  return (
    prevProps.block.id === nextProps.block.id &&
    prevProps.block.content === nextProps.block.content &&
    prevProps.block.type === nextProps.block.type &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isLast === nextProps.isLast
  );
}); 