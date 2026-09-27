"use client";

import React from "react";
import { HiOutlineCollection, HiOutlineDocument, HiOutlineFolder } from "react-icons/hi";
import Button from "@/app/components/Button";
import type { MentionOption } from "./chat-helpers";

interface MentionMenuProps {
  options: MentionOption[];
  activeIndex: number;
  query: string;
  onSelect: (option: MentionOption) => void;
}

// The @mention dropdown floating above the AI Chat input: whole-vault index,
// folder indexes, then single notes.
export default function MentionMenu({ options, activeIndex, query, onSelect }: MentionMenuProps) {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-paper-light dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden z-50">
      {options.map((option, i) => {
        const key = option.kind === "vault" ? "@vault" : option.kind === "folder" ? `folder:${option.path}` : option.file.path;
        const rowClass = `w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
          i === activeIndex
            ? "bg-sage/10 text-sage"
            : "text-ink-light dark:text-ink-dark hover:bg-neutral-50 dark:hover:bg-neutral-800"
        }`;
        // mousedown (not click) so the textarea keeps focus
        const select = (e: React.MouseEvent) => { e.preventDefault(); onSelect(option); };
        if (option.kind === "vault") {
          return (
            <Button variant="unstyled" key={key} onMouseDown={select} className={rowClass}>
              <HiOutlineCollection size={14} className="shrink-0 text-neutral-400" />
              <span className="text-ui-footnote font-medium truncate">vault</span>
              <span className="text-ui-caption text-neutral-400 dark:text-neutral-500 truncate ml-auto">whole-vault index</span>
            </Button>
          );
        }
        if (option.kind === "folder") {
          return (
            <Button variant="unstyled" key={key} onMouseDown={select} className={rowClass}>
              <HiOutlineFolder size={14} className="shrink-0 text-neutral-400" />
              <span className="text-ui-footnote font-medium truncate">folder:{option.path}</span>
              <span className="text-ui-caption text-neutral-400 dark:text-neutral-500 truncate ml-auto">folder index</span>
            </Button>
          );
        }
        const file = option.file;
        return (
          <Button variant="unstyled" key={key} onMouseDown={select} className={rowClass}>
            <HiOutlineDocument size={14} className="shrink-0 text-neutral-400" />
            <span className="text-ui-footnote font-medium truncate">{file.name.replace(/\.md$/, "")}</span>
            {file.path.includes("/") && (
              <span className="text-ui-caption text-neutral-400 dark:text-neutral-500 truncate ml-auto">
                {file.path.split("/").slice(0, -1).join("/")}
              </span>
            )}
          </Button>
        );
      })}
      {query && options.length === 0 && (
        <p className="px-3 py-2 text-ui-caption text-neutral-400">No files found</p>
      )}
    </div>
  );
}
