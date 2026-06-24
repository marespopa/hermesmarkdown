"use client";

import React, { useState, useRef, useEffect } from "react";
import { HiOutlineSearch, HiX } from "react-icons/hi";
import { TAG_COLORS, WORKFLOW_TAGS } from "./constants";

interface UnifiedSearchInputProps {
  tokens: string[];
  text: string;
  allTags: string[];
  onTokenAdd: (tag: string) => void;
  onTokenRemove: (tag: string) => void;
  onTextChange: (text: string) => void;
  autoFocus?: boolean;
}

function TagDot({ tag }: { tag: string }) {
  return (
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
      tag === "todo" ? "bg-sage"   :
      tag === "prog" ? "bg-amber-500"  :
      tag === "done" ? "bg-green-500"  :
      tag === "urgn" ? "bg-red-500"    :
      TAG_COLORS[tag] ? "bg-sage" : "bg-sage"
    }`} />
  );
}

export default function UnifiedSearchInput({
  tokens,
  text,
  allTags,
  onTokenAdd,
  onTokenRemove,
  onTextChange,
  autoFocus = false,
}: UnifiedSearchInputProps) {
  const [inputValue, setInputValue]               = useState(text);
  const [tagInputActive, setTagInputActive]       = useState(false);
  const [tagQuery, setTagQuery]                   = useState("");
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);
  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external text resets (e.g. clearing from parent)
  useEffect(() => {
    if (text !== inputValue && !tagInputActive) setInputValue(text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSuggestions = React.useMemo(() => {
    if (!tagInputActive) return [];
    if (!tagQuery) return allTags.filter(t => !tokens.includes(t)).slice(0, 6);
    const q = tagQuery.toLowerCase();
    return allTags
      .filter(t => t.toLowerCase().includes(q) && !tokens.includes(t))
      .slice(0, 6);
  }, [tagInputActive, tagQuery, allTags, tokens]);

  const showPopover = tagInputActive && filteredSuggestions.length > 0;
  const hasContent  = inputValue.length > 0 || tokens.length > 0;

  function parseInput(value: string) {
    const hashMatch = value.match(/(^|\s)#([^\s]*)$/);
    if (hashMatch) {
      setTagInputActive(true);
      setTagQuery(hashMatch[2]);
      setSelectedSuggestionIdx(0);
    } else {
      setTagInputActive(false);
      setTagQuery("");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    parseInput(val);
    const textOnly = val.replace(/(^|\s)#[^\s]*$/, "").trim();
    onTextChange(textOnly);
  }

  function commitSuggestion(tag: string) {
    onTokenAdd(tag);
    const cleaned = inputValue.replace(/(^|\s)#[^\s]*$/, "").trimEnd();
    setInputValue(cleaned);
    onTextChange(cleaned.trim());
    setTagInputActive(false);
    setTagQuery("");
    inputRef.current?.focus();
  }

  function handleClearAll() {
    setInputValue("");
    onTextChange("");
    tokens.forEach(t => onTokenRemove(t));
    setTagInputActive(false);
    setTagQuery("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showPopover) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIdx(i => Math.min(i + 1, filteredSuggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIdx(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const best = filteredSuggestions[selectedSuggestionIdx] ?? filteredSuggestions[0];
        if (best) { commitSuggestion(best); return; }
      }
      if (e.key === "Escape") {
        setTagInputActive(false);
        setTagQuery("");
        return;
      }
    }

    if (e.key === "Backspace" && inputValue === "" && tokens.length > 0) {
      onTokenRemove(tokens[tokens.length - 1]);
      return;
    }
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTagInputActive(false);
        setTagQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">

      {/* ── Zone 1: Text input ─────────────────────────────────────────
          Fixed height — always 44px on mobile (Apple HIG touch target),
          36px on sm+. Never grows, never shifts.                       */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={[
          "flex items-center h-11 sm:h-9 px-3 gap-2 cursor-text",
          "rounded-xl",
          "bg-paper-light dark:bg-paper-dark",
          "border border-edge",
          "focus-within:ring-2 focus-within:ring-sage/20",
          "transition-all duration-150",
        ].join(" ")}
      >
        <HiOutlineSearch
          size={15}
          className="shrink-0 text-stone"
          aria-hidden
        />

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search or #tag…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Search files"
          className={[
            "flex-1 min-w-0 bg-transparent outline-none focus-visible:outline-none border-none",
            "text-[13px] sm:text-xs leading-none",
            "text-ink-light dark:text-ink-dark",
            "placeholder:text-stone dark:placeholder:text-stone",
            "caret-sage",
          ].join(" ")}
        />

        {/* Clear — always in DOM so width is reserved, no layout shift */}
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); handleClearAll(); }}
          aria-label="Clear search"
          className={[
            "shrink-0 w-4 h-4 flex items-center justify-center",
            "rounded-full",
            "text-stone hover:text-ink-muted dark:hover:text-ink-dark",
            "bg-beige/60 hover:bg-beige dark:bg-clay/60 dark:hover:bg-clay",
            "transition-all duration-150",
            hasContent ? "opacity-100" : "opacity-0 pointer-events-none",
          ].join(" ")}
        >
          <HiX size={8} />
        </button>
      </div>

      {/* ── Zone 2: Active tag filters ─────────────────────────────────
          Only rendered when tags are selected so text input always has
          full width. Both zones are simultaneously readable.           */}
      {tokens.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap px-0.5">
          {tokens.map((token) => (
            <span
              key={token}
              className={[
                "inline-flex items-center gap-1 shrink-0",
                "pl-2 pr-1 py-1 sm:py-0.5 rounded-full",
                "text-[11px] font-medium leading-none",
                "bg-beige dark:bg-clay/80",
                "text-ink-muted dark:text-ink-dark",
              ].join(" ")}
            >
              <TagDot tag={token} />
              <span>{token}</span>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => { e.preventDefault(); onTokenRemove(token); }}
                className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full opacity-50 hover:opacity-100 hover:bg-beige-light dark:hover:bg-clay transition-all"
                aria-label={`Remove ${token}`}
              >
                <HiX size={8} />
              </button>
            </span>
          ))}

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); tokens.forEach(t => onTokenRemove(t)); }}
            className="ml-auto text-[11px] text-stone hover:text-ink-muted dark:hover:text-ink-dark transition-colors"
          >
            clear filters
          </button>
        </div>
      )}

      {/* ── Tag suggestion popover ────────────────────────────────────── */}
      {showPopover && (
        <div className="absolute top-[calc(theme(spacing.11)+theme(spacing.1))] sm:top-[calc(theme(spacing.9)+theme(spacing.1))] left-0 right-0 z-50 bg-paper-light/95 dark:bg-paper-dark/95 backdrop-blur-xl border border-beige/60 dark:border-clay/60 rounded-2xl py-1 overflow-hidden">
          {filteredSuggestions.map((tag, idx) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); commitSuggestion(tag); }}
              className={[
                "w-full flex items-center gap-2.5 px-3.5 py-2.5 sm:py-2",
                "text-[13px] font-medium text-left",
                "transition-colors duration-100",
                idx === selectedSuggestionIdx
                  ? "bg-sage/10 text-sage dark:text-sage"
                  : "text-ink-muted dark:text-stone hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/60",
              ].join(" ")}
            >
              <TagDot tag={tag} />
              <span>#{tag}</span>
              {WORKFLOW_TAGS.includes(tag) && (
                <span className="ml-auto text-[11px] opacity-50">workflow</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
