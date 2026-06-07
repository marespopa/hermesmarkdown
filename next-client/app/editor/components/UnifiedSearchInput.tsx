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
}

function TagDot({ tag }: { tag: string }) {
  const colorClass = TAG_COLORS[tag];
  if (colorClass) {
    return (
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        tag === "todo" ? "bg-blue-500" :
        tag === "prog" ? "bg-amber-500" :
        tag === "done" ? "bg-green-500" :
        tag === "urgn" ? "bg-red-500" :
        "bg-purple-500"
      }`} />
    );
  }
  return <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400" />;
}

export default function UnifiedSearchInput({
  tokens,
  text,
  allTags,
  onTokenAdd,
  onTokenRemove,
  onTextChange,
}: UnifiedSearchInputProps) {
  const [inputValue, setInputValue] = useState(text);
  const [tagInputActive, setTagInputActive] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const [highlightedToken, setHighlightedToken] = useState<string | null>(null);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external text changes into local input
  useEffect(() => {
    if (text !== inputValue && !tagInputActive) {
      setInputValue(text);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const filteredSuggestions = React.useMemo(() => {
    if (!tagInputActive || !tagQuery) return allTags.slice(0, 6);
    const q = tagQuery.toLowerCase();
    return allTags
      .filter(t => t.toLowerCase().includes(q) && !tokens.includes(t))
      .slice(0, 6);
  }, [tagInputActive, tagQuery, allTags, tokens]);

  const showPopover = tagInputActive && filteredSuggestions.length > 0;

  function parseInput(value: string) {
    // Check if there's an active #tag being typed (no space after the # sequence)
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
    setHighlightedToken(null);
    parseInput(val);

    // Strip out any partial #tag from the value when computing text search
    const textOnly = val.replace(/(^|\s)#[^\s]*$/, "").trim();
    onTextChange(textOnly);
  }

  function commitSuggestion(tag: string) {
    onTokenAdd(tag);
    // Remove the partial #tag from input
    const cleaned = inputValue.replace(/(^|\s)#[^\s]*$/, "").trimEnd();
    setInputValue(cleaned);
    onTextChange(cleaned.trim());
    setTagInputActive(false);
    setTagQuery("");
    setHighlightedToken(null);
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
        if (best) commitSuggestion(best);
        return;
      }
      if (e.key === "Escape") {
        setTagInputActive(false);
        setTagQuery("");
        return;
      }
    }

    if (e.key === "Backspace" && inputValue === "") {
      if (highlightedToken) {
        onTokenRemove(highlightedToken);
        setHighlightedToken(null);
      } else if (tokens.length > 0) {
        setHighlightedToken(tokens[tokens.length - 1]);
      }
      return;
    }

    if (highlightedToken && e.key !== "Backspace") {
      setHighlightedToken(null);
    }
  }

  // Dismiss popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTagInputActive(false);
        setTagQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isEmpty = tokens.length === 0 && !inputValue;

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex items-center gap-1.5 flex-wrap min-h-[36px] px-3 py-1.5 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-300/40 dark:border-zinc-700/40 cursor-text transition-colors focus-within:border-blue-500/50 focus-within:bg-white/60 dark:focus-within:bg-zinc-800/80"
      >
        <HiOutlineSearch size={14} className="shrink-0 text-zinc-400 dark:text-zinc-500" />

        {tokens.map((token) => (
          <span
            key={token}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-ui-caption font-medium bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 transition-all ${
              highlightedToken === token ? "ring-2 ring-red-400 ring-offset-1" : ""
            }`}
          >
            <TagDot tag={token} />
            {token}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onTokenRemove(token); }}
              className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity"
            >
              <HiX size={10} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isEmpty ? "Search files or #tags..." : ""}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-ui-footnote text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
        />

        {(inputValue || tokens.length > 0) && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setInputValue("");
              onTextChange("");
              tokens.forEach(t => onTokenRemove(t));
              setTagInputActive(false);
              setTagQuery("");
              setHighlightedToken(null);
              inputRef.current?.focus();
            }}
            className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            <HiX size={12} />
          </button>
        )}
      </div>

      {showPopover && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
          {filteredSuggestions.map((tag, idx) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); commitSuggestion(tag); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-ui-footnote font-medium transition-colors ${
                idx === selectedSuggestionIdx
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60"
              }`}
            >
              <TagDot tag={tag} />
              <span>#{tag}</span>
              {WORKFLOW_TAGS.includes(tag) && (
                <span className={`ml-auto text-ui-caption opacity-60 ${TAG_COLORS[tag]}`}>
                  workflow
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
