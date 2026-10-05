"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import DialogModal from "@/app/components/DialogModal";
import Button from "@/app/components/Button";
import { BareInput } from "@/app/components/Input";
export const BLANK_NOTE_LABEL = "Blank note";

/** A vault template ({ name, path }) or a starter ({ name, description }). */
export interface TemplatePickerEntry {
  name: string;
  path?: string;
  description?: string;
}

interface TemplatePickerProps<T extends TemplatePickerEntry> {
  isOpen: boolean;
  title: string;
  templates: T[];
  /** Templates folder in use, for the empty state. */
  folder: string;
  includeBlank: boolean;
  onPick: (value: T | "blank") => void;
  onCancel: () => void;
}

type Row<T> = { kind: "blank" } | { kind: "template"; entry: T };

// Searchable list of vault templates or starters (plus "Blank note" first
// when asked); each row shows the entry's description, else its path.
// Case-insensitive substring filter; ↑/↓ move, Enter picks, Esc cancels.
export default function TemplatePicker<T extends TemplatePickerEntry>({
  isOpen,
  title,
  templates,
  folder,
  includeBlank,
  onPick,
  onCancel,
}: TemplatePickerProps<T>) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo<Row<T>[]>(() => {
    const q = query.trim().toLowerCase();
    const matches = (label: string) => !q || label.toLowerCase().includes(q);
    return [
      ...(includeBlank && matches(BLANK_NOTE_LABEL) ? [{ kind: "blank" } as Row<T>] : []),
      ...templates.filter((t) => matches(t.name)).map((entry) => ({ kind: "template", entry }) as Row<T>),
    ];
  }, [includeBlank, query, templates]);

  useEffect(() => setHighlight(0), [query]);
  // The overlay focuses its first control a frame after opening; take it back for the search field.
  useEffect(() => {
    if (!isOpen) return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => inputRef.current?.focus());
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  const pick = (row: Row<T> | undefined) => {
    if (!row) return;
    onPick(row.kind === "blank" ? "blank" : row.entry);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (rows.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlight((i) => (i + step + rows.length) % rows.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(rows[highlight]);
    }
  };

  const isEmptyVault = templates.length === 0 && !includeBlank;

  return (
    <DialogModal isOpened={isOpen} onClose={onCancel} hideCloseButton ariaLabelledBy="template-picker-title">
      <div className="space-y-3">
        <h3 id="template-picker-title" className="text-ui-title-3 font-bold font-mono tracking-tight">
          {title}
        </h3>
        {isEmptyVault ? (
          <div className="space-y-1 py-2">
            <p className="text-ui-subhead text-fg">No templates in {folder}/</p>
            <p className="text-ui-footnote text-fg-muted">
              Templates are .md files in that folder. Add one to use it here.
            </p>
          </div>
        ) : (
          <>
            <BareInput
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search templates…"
              aria-label="Search templates"
              aria-controls="template-picker-list"
              aria-activedescendant={rows[highlight] ? `template-row-${highlight}` : undefined}
              className="h-11 w-full rounded-xl border border-edge bg-input-bg px-3 text-ui-subhead text-fg outline-none placeholder:text-fg-faint focus:ring-4 focus:ring-sage/10"
            />
            <div id="template-picker-list" role="listbox" aria-label="Templates" className="flex max-h-80 flex-col gap-1 overflow-y-auto">
              {rows.length === 0 && (
                <p className="px-3 py-2 text-ui-footnote text-fg-muted">No matching templates</p>
              )}
              {rows.map((row, index) => (
                <Button
                  key={row.kind === "blank" ? "__blank__" : row.entry.path ?? row.entry.name}
                  id={`template-row-${index}`}
                  variant="menu-item"
                  role="option"
                  aria-selected={index === highlight}
                  tabIndex={-1}
                  onClick={() => pick(row)}
                  onMouseEnter={() => setHighlight(index)}
                  className={`min-h-11 text-left ${
                    index === highlight ? "bg-paper-softgray dark:bg-paper-dark-surface" : ""
                  }`}
                >
                  <span className="truncate text-ui-subhead text-fg">
                    {row.kind === "blank" ? BLANK_NOTE_LABEL : row.entry.name}
                  </span>
                  {row.kind === "template" && (
                    <span className="ml-auto truncate text-ui-caption text-fg-faint">
                      {row.entry.description ?? row.entry.path}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </>
        )}
        <Button variant="secondary" onClick={onCancel} className="w-full">
          Cancel
        </Button>
      </div>
    </DialogModal>
  );
}
