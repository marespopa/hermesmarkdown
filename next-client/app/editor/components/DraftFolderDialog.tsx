"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import { atom_draftFolderRequest } from "@/app/atoms/ui-atoms";
import { normalizeFolderPath } from "@/app/hooks/file-system/unique-file";

interface FolderOption {
  path: string;
  isNew?: boolean;
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// Asks where an untitled draft's first save goes: the vault's folders
// (the "new notes" folder preselected), filterable, with the typed path
// offered as a new folder when it doesn't exist yet.
export default function DraftFolderDialog() {
  const request = useAtomValue(atom_draftFolderRequest);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const options = useMemo<FolderOption[]>(() => {
    if (!request) return [];
    const all = ["", ...request.folders];
    const needle = query.trim().toLowerCase();
    if (!needle) return all.map((path) => ({ path }));
    const typed = normalizeFolderPath(query);
    const matches = all.filter((path) => path.toLowerCase().includes(needle)).map((path) => ({ path }));
    return typed && !all.includes(typed) ? [...matches, { path: typed, isNew: true }] : matches;
  }, [request, query]);

  useEffect(() => {
    if (!request) return;
    setQuery("");
    setHighlighted(Math.max(0, ["", ...request.folders].indexOf(request.defaultFolder)));
  }, [request]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  if (!request) return null;

  const current = options[highlighted] ?? options[0];
  const choose = (option?: FolderOption) => {
    if (option) request.resolve(option.path);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlighted((index) => (index + step + options.length) % Math.max(options.length, 1));
    }
  };

  return (
    <DialogModal
      isOpened
      onClose={() => request.resolve(null)}
      onConfirm={() => choose(current)}
      ariaLabelledBy="draft-folder-title"
      mobileSheet
    >
      <div className="space-y-4">
        <h3 id="draft-folder-title" className="text-ui-title-3 font-bold font-mono tracking-tight">
          Save note to…
        </h3>
        <input
          aria-label="Filter folders"
          className="w-full rounded-xl border border-edge-subtle bg-paper-pale dark:bg-paper-dark px-3 py-2.5 text-ui-subhead text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-sage/40"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Filter folders, or type a new one"
          autoFocus
        />
        <div ref={listRef} role="listbox" aria-label="Folders" className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto">
          {options.map((option, index) => (
            <Button
              key={`${option.isNew ? "new:" : ""}${option.path}`}
              variant="menu-item"
              role="option"
              aria-selected={index === highlighted}
              data-index={index}
              onClick={() => choose(option)}
              onMouseEnter={() => setHighlighted(index)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-ui-subhead text-left transition-colors border ${
                index === highlighted
                  ? "text-ink-light dark:text-ink-dark bg-paper-softgray dark:bg-paper-dark-surface border-zinc-200/60 dark:border-zinc-700/60"
                  : "text-ink-muted dark:text-stone border-transparent"
              }`}
            >
              <FolderIcon />
              <span className="truncate">
                {option.isNew ? <>Create folder <span className="font-medium">{option.path}</span></> : option.path || "Vault root"}
              </span>
              {!option.isNew && option.path === request.defaultFolder && (
                <span className="ml-auto shrink-0 text-ui-caption text-fg-faint">default</span>
              )}
            </Button>
          ))}
          {options.length === 0 && <p className="px-4 py-2.5 text-ui-caption text-fg-muted">No matching folders</p>}
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="primary" onClick={() => choose(current)} isDisabled={!current} className="w-full">
            Save
          </Button>
          <Button variant="secondary" onClick={() => request.resolve(null)} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </DialogModal>
  );
}
