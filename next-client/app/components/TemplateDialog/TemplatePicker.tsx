"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineDocument, HiOutlinePencil } from "react-icons/hi";
import DialogModal from "@/app/components/DialogModal";
import Button from "@/app/components/Button";
import { BareInput } from "@/app/components/Input";
import { isMacPlatform } from "@/app/utils/platform";
import { templateSummary } from "@/app/utils/templates/template-preview";
import TemplateIcon from "./TemplateIcon";
import TemplatePreview from "./TemplatePreview";

export const BLANK_NOTE_LABEL = "Blank note";

/** A vault template ({ name, path }) or a starter ({ name, description }). */
export interface TemplatePickerEntry {
  name: string;
  path?: string;
  description?: string;
}

/** Key of an entry in `bodies`. */
export const pickerEntryKey = (entry: TemplatePickerEntry) => entry.path ?? entry.name;

interface TemplatePickerProps<T extends TemplatePickerEntry> {
  isOpen: boolean;
  title: string;
  templates: T[];
  /** Templates folder in use, for the empty state. */
  folder: string;
  includeBlank: boolean;
  /**
   * Raw text per entry (pickerEntryKey); null while loading. When given, rows
   * get a structure summary and the picker shows a preview pane.
   */
  bodies?: Record<string, string | null>;
  /** Opens a template to edit it (pencil on hover, ⌘/Ctrl+E on the highlighted row). */
  onEdit?: (entry: T) => void;
  onPick: (value: T | "blank") => void;
  onCancel: () => void;
}

type Row<T> = { kind: "blank" } | { kind: "template"; entry: T };

const SHORTCUT_COUNT = 9;

// Searchable list of vault templates or starters (plus "Blank note" first
// when asked). Each row has an icon, the name and a muted summary (the
// entry's description, else its structure, else its path). With `bodies`,
// a read-only preview of the selected template sits beside the list (under
// it below 640px): a click selects a row to preview it, and **Use template**,
// a double-click, Enter or ⌘/Ctrl+1…9 use it. Without `bodies`, a click uses
// the row directly. ↑/↓ move, Esc cancels. With `onEdit`, each template row
// has an Edit button (and ⌘/Ctrl+E).
export default function TemplatePicker<T extends TemplatePickerEntry>({
  isOpen,
  title,
  templates,
  folder,
  includeBlank,
  bodies,
  onEdit,
  onPick,
  onCancel,
}: TemplatePickerProps<T>) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const mod = isMacPlatform() ? "⌘" : "Ctrl+";

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
    const digit = /^[1-9]$/.test(e.key) ? Number(e.key) : 0;
    if (digit && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      pick(rows[digit - 1]);
    } else if (onEdit && e.key.toLowerCase() === "e" && (e.metaKey || e.ctrlKey)) {
      const row = rows[highlight];
      e.preventDefault();
      if (row?.kind === "template") onEdit(row.entry);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (rows.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlight((i) => (i + step + rows.length) % rows.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(rows[highlight]);
    }
  };

  const summary = (entry: T) => {
    if (entry.description) return entry.description;
    const body = bodies?.[pickerEntryKey(entry)];
    return body ? templateSummary(body) : entry.path ?? "";
  };

  const isEmptyVault = templates.length === 0 && !includeBlank;
  const highlighted = rows[highlight];
  const showPreview = bodies !== undefined && !isEmptyVault;

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={onCancel}
      hideCloseButton
      ariaLabelledBy="template-picker-title"
      styles={`template-picker-surface ${showPreview ? "sm:!max-w-3xl" : ""}`}
    >
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
              aria-activedescendant={highlighted ? `template-row-${highlight}` : undefined}
              className="h-11 w-full rounded-xl border border-edge bg-input-bg px-3 text-ui-subhead text-fg outline-none placeholder:text-fg-faint focus:ring-4 focus:ring-sage/10"
            />
            <div className={showPreview ? "grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]" : ""}>
              <div id="template-picker-list" role="listbox" aria-label="Templates" className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                {rows.length === 0 && (
                  <p className="px-3 py-2 text-ui-footnote text-fg-muted">No matching templates</p>
                )}
                {rows.map((row, index) => (
                  <div key={row.kind === "blank" ? "__blank__" : pickerEntryKey(row.entry)} className="group relative">
                  <Button
                    id={`template-row-${index}`}
                    variant="menu-item"
                    role="option"
                    aria-selected={index === highlight}
                    tabIndex={-1}
                    title={row.kind === "template" ? row.entry.path : undefined}
                    onClick={() => (showPreview ? setHighlight(index) : pick(row))}
                    onDoubleClick={() => showPreview && pick(row)}
                    className={`min-h-11 text-left ${onEdit && row.kind === "template" ? "pr-12" : ""} ${
                      index === highlight ? "bg-paper-softgray dark:bg-paper-dark-surface" : ""
                    }`}
                  >
                    {row.kind === "blank" ? (
                      <HiOutlineDocument size={16} className="shrink-0 text-fg-faint" aria-hidden />
                    ) : (
                      <TemplateIcon name={row.entry.name} className="text-fg-muted" />
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-ui-subhead text-fg">
                        {row.kind === "blank" ? BLANK_NOTE_LABEL : row.entry.name}
                      </span>
                      {row.kind === "template" && (
                        <span className="truncate text-[12px] font-normal text-fg-faint">{summary(row.entry)}</span>
                      )}
                    </span>
                    {index < SHORTCUT_COUNT && (
                      <kbd
                        aria-hidden
                        className={`ml-auto hidden shrink-0 font-sans text-[11px] text-fg-faint sm:inline ${onEdit && row.kind === "template" ? "sm:group-hover:invisible" : ""}`}
                      >
                        {mod}{index + 1}
                      </kbd>
                    )}
                  </Button>
                  {onEdit && row.kind === "template" && (
                    <Button
                      variant="unstyled"
                      onClick={() => onEdit(row.entry)}
                      aria-label={`Edit template ${row.entry.name}`}
                      title={`Edit template (${mod}E)`}
                      tabIndex={-1}
                      className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-fg-faint transition-opacity duration-150 hover:bg-paper-softgray hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-paper-dark-surface"
                    >
                      <HiOutlinePencil size={15} aria-hidden />
                    </Button>
                  )}
                  </div>
                ))}
              </div>
              {showPreview && (
                <div className="max-h-48 sm:max-h-80">
                  {highlighted?.kind === "template" ? (
                    <TemplatePreview raw={bodies?.[pickerEntryKey(highlighted.entry)] ?? null} name={highlighted.entry.name} />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-edge-subtle text-ui-caption text-fg-faint">
                      An empty note
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} className={showPreview ? "w-full sm:w-auto" : "w-full"}>
            Cancel
          </Button>
          {showPreview && (
            <Button
              variant="primary"
              onClick={() => pick(highlighted)}
              isDisabled={!highlighted}
              className="w-full sm:w-auto"
            >
              {highlighted?.kind === "blank" ? `Use ${BLANK_NOTE_LABEL.toLowerCase()}` : "Use template"}
            </Button>
          )}
        </div>
      </div>
    </DialogModal>
  );
}
