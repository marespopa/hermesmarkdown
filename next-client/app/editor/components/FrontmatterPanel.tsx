"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  atom_frontmatterDefaultMode,
  atom_frontmatterWizardOpen,
  atom_openFiles,
} from "@/app/atoms/atoms";
import { HiChevronRight, HiChevronDown } from "react-icons/hi";
import { FM_REGEX, parseFmFields, updateFmFields } from "@/app/utils/frontmatter-utils";
import useKeyboardInset from "@/app/hooks/use-keyboard-inset";
import DialogModal from "../../components/DialogModal/DialogModal";
import Button from "../../components/Button";
import {
  TitleField,
  EnumField,
  TagsChipInput,
  GenericField,
} from "./frontmatter";

const STATUS_VALUES = ["draft", "review", "active", "archived"];

interface FrontmatterPanelProps {
  filePath: string;
  content: string;
  onChange: (next: string) => void;
  fontFamily: string;
  displayFontSize: number | string;
  isMobile: boolean;
  frontmatterCollapsed?: boolean;
  onToggleFrontmatter?: () => void;
}

interface SummaryBarProps {
  displayFontSize: number | string;
  displayTitle: string;
  fontFamily: string;
  hasFrontmatter: boolean;
  hasTitle: boolean;
  onOpen: () => void;
  sticky?: boolean;
  summaryLine: string;
}

function SummaryBar({
  displayFontSize,
  displayTitle,
  fontFamily,
  hasFrontmatter,
  hasTitle,
  onOpen,
  sticky = false,
  summaryLine,
}: SummaryBarProps) {
  return (
    <button
      type="button"
      disabled={!hasFrontmatter}
      onClick={onOpen}
      className={`group flex items-center gap-2 w-full text-left select-none rounded-xl px-3 py-2 transition-colors ${
        hasFrontmatter ? "" : "cursor-default"
      } ${
        sticky
          ? "sticky top-0 z-30 bg-chrome/95 backdrop-blur-xl border border-edge-subtle shadow-sm"
          : "mb-1 hover:bg-chrome/60 dark:hover:bg-paper-dark-surface/60"
      }`}
      style={{ fontFamily, fontSize: displayFontSize }}
    >
      {displayTitle && (
        <span
          className={`shrink min-w-0 max-w-[30ch] truncate text-[0.72em] ${
            hasTitle ? "opacity-50 font-medium" : "opacity-35"
          }`}
        >
          {displayTitle}
        </span>
      )}
      {summaryLine && <span className="flex-1 min-w-0 truncate text-right opacity-30 text-[0.72em]">{summaryLine}</span>}
      {hasFrontmatter && (
        <HiChevronRight
          size={13}
          className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 dark:text-fg-faint"
        />
      )}
    </button>
  );
}

export default function FrontmatterPanel({
  filePath,
  content,
  onChange,
  fontFamily,
  displayFontSize,
  isMobile,
  frontmatterCollapsed = false,
  onToggleFrontmatter,
}: FrontmatterPanelProps) {
  const defaultMode = useAtomValue(atom_frontmatterDefaultMode);
  const [wizardPath, setWizardPath] = useAtom(atom_frontmatterWizardOpen);
  const openFiles = useAtomValue(atom_openFiles);

  const match = FM_REGEX.exec(content);
  const rawFrontmatter = match ? match[0] : null;
  const fields = useMemo(() => parseFmFields(content), [content]);

  // Fields are recommended, never enforced — the panel always opens collapsed
  // so an incomplete frontmatter block never interrupts the editing flow.
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"fields" | "raw">(defaultMode);
  const [rawDraft, setRawDraft] = useState(rawFrontmatter ?? "");
  const [rawError, setRawError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inView, setInView] = useState(true);
  const lastFocusedKeyRef = useRef<string | null>(null);
  const panelRootRef = useRef<HTMLDivElement>(null);
  const prevFilePathRef = useRef(filePath);
  const keyboardInset = useKeyboardInset();

  // Reset open/raw state when switching files — always starts collapsed.
  useEffect(() => {
    if (prevFilePathRef.current !== filePath) {
      prevFilePathRef.current = filePath;
      setExpanded(false);
      setMode(defaultMode);
      setSheetOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  useEffect(() => {
    if (mode === "raw") setRawDraft(rawFrontmatter ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Opening the wizard for this file (new-file flow, slash command) just
  // expands the panel — there's no separate step-by-step dialog anymore,
  // the fixed 3-field form is the whole thing.
  useEffect(() => {
    if (wizardPath !== filePath) return;
    if (isMobile) setSheetOpen(true);
    else setExpanded(true);
    setWizardPath(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardPath, filePath, isMobile]);

  // Desktop sticky-bar: observe whether the panel root is in view within its
  // nearest scroll ancestor, so a slim summary bar can pin below the tab bar.
  useEffect(() => {
    if (isMobile || !expanded || !panelRootRef.current) return;
    const root = panelRootRef.current.closest(".overflow-auto") as HTMLElement | null;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { root, threshold: 0 },
    );
    observer.observe(panelRootRef.current);
    return () => observer.disconnect();
  }, [isMobile, expanded]);

  // Restore focus to the last-active field when the panel re-expands.
  useEffect(() => {
    if (!expanded || !lastFocusedKeyRef.current || !panelRootRef.current) return;
    const key = lastFocusedKeyRef.current;
    const el = panelRootRef.current.querySelector(
      `[data-fm-field="${key}"] input, [data-fm-field="${key}"] textarea`,
    ) as HTMLElement | null;
    el?.focus();
  }, [expanded]);

  const set = (key: string, val: string) => {
    onChange(updateFmFields(content, { [key]: val }));
  };

  const applyRawDraft = (text: string) => {
    setRawDraft(text);

    // Clearing the textarea entirely is how you remove frontmatter — treat
    // it as "delete the block", not as invalid YAML.
    if (text.trim() === "") {
      setRawError(null);
      onChange(content.slice(rawFrontmatter?.length ?? 0).replace(/^\n+/, ""));
      return;
    }

    const candidate = text.endsWith("\n") ? text : `${text}\n`;
    if (!FM_REGEX.test(candidate)) {
      setRawError("Invalid frontmatter — must be a YAML block between `---` lines.");
      return;
    }
    setRawError(null);
    onChange(candidate + content.slice(rawFrontmatter?.length ?? 0));
  };

  const fileState = openFiles[filePath];
  const title = fields.title ?? "";
  // Same fallback chain the tabs use — a filename is always something to
  // show, and frontmatter stays entirely optional either way.
  const fallbackName = (fileState?.fileName || filePath.split("/").pop() || "").replace(/\.md$/, "");
  const displayTitle = title || fallbackName;
  const tagCount = (fields.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean).length;
  const summaryLine = [fields.status, tagCount > 0 ? `${tagCount} tag${tagCount === 1 ? "" : "s"}` : null]
    .filter(Boolean)
    .join("  ·  ");

  // Frontmatter is optional — the bar is purely informational (save status +
  // title) for a file that doesn't have any. Only files that already have a
  // frontmatter block are clickable into the fields/YAML editor.
  const summaryBarProps = {
    displayFontSize,
    displayTitle,
    fontFamily,
    hasFrontmatter: Boolean(rawFrontmatter),
    hasTitle: Boolean(title),
    onOpen: () => {
      if (!rawFrontmatter) return;
      if (isMobile) setSheetOpen(true);
      else setExpanded(true);
    },
    summaryLine,
  };

  const FIXED_KEYS = ["title", "status", "tags"];
  const customKeys = Object.keys(fields).filter((k) => !FIXED_KEYS.includes(k));

  const fieldList = [
    <div key="title" data-fm-field="title" onFocusCapture={() => (lastFocusedKeyRef.current = "title")}>
      <TitleField value={fields.title ?? ""} onChange={(v) => set("title", v)} />
    </div>,
    <div key="status" data-fm-field="status" onFocusCapture={() => (lastFocusedKeyRef.current = "status")}>
      <EnumField fieldKey="status" values={STATUS_VALUES} value={fields.status ?? "draft"} onChange={(v) => set("status", v)} />
    </div>,
    <div key="tags" data-fm-field="tags" onFocusCapture={() => (lastFocusedKeyRef.current = "tags")}>
      <TagsChipInput value={fields.tags ?? ""} onChange={(v) => set("tags", v)} />
    </div>,
    // Custom/unknown keys — preserved verbatim, never dropped, rendered as a
    // plain fallback input so they remain editable without fixed-field knowledge.
    ...customKeys.map((key) => (
      <div key={key} data-fm-field={key} onFocusCapture={() => (lastFocusedKeyRef.current = key)}>
        <GenericField fieldKey={key} value={fields[key] ?? ""} onChange={(v) => set(key, v)} autoFocus={false} />
      </div>
    )),
  ];

  const PanelBody = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block font-display text-ui-footnote font-medium text-fg">Document metadata</span>
          <span className="block text-ui-caption text-fg-faint">Stored at the top of this Markdown file</span>
        </div>
        <button
          type="button"
          onClick={() => setMode((m) => (m === "fields" ? "raw" : "fields"))}
          className="shrink-0 rounded-lg border border-edge-subtle bg-chrome/70 px-2.5 py-1.5 text-ui-caption font-medium text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
        >
          {mode === "fields" ? "Raw YAML" : "Fields"}
        </button>
        {rawFrontmatter && onToggleFrontmatter && (
          <Button
            variant="bare"
            onClick={onToggleFrontmatter}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-ui-caption font-medium text-fg-muted hover:bg-surface-raised hover:text-fg"
          >
            {frontmatterCollapsed ? "Show in editor" : "Collapse in editor"}
          </Button>
        )}
      </div>
      {mode === "fields" ? (
        <>
          <fieldset className="grid grid-cols-1 gap-3 border-0 m-0 p-0 sm:grid-cols-2">
            <div className="sm:col-span-2">{fieldList[0]}</div>
            {fieldList.slice(1)}
          </fieldset>
          <Button
            variant="bare"
            onClick={() => (isMobile ? setSheetOpen(false) : setExpanded(false))}
            className="self-end rounded-lg px-2.5 py-1.5 text-ui-caption font-medium text-fg-muted hover:bg-surface-raised hover:text-fg"
          >
            Done
          </Button>
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <textarea
            aria-label="Raw frontmatter YAML"
            value={rawDraft}
            onChange={(e) => applyRawDraft(e.target.value)}
            rows={Math.max(6, rawDraft.split("\n").length)}
            className="w-full rounded-xl border border-edge-subtle bg-surface/70 px-3.5 py-3 text-ui-footnote text-fg outline-none resize-none focus:ring-2 focus:ring-sage/15 dark:bg-paper-dark-surface/50 dark:focus:ring-sage/20"
            style={{ fontFamily: "var(--font-ibm-mono), ui-monospace, monospace" }}
          />
          {rawError && <span className="text-ui-caption text-red-500 dark:text-red-400 px-0.5">{rawError}</span>}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <SummaryBar {...summaryBarProps} />
        <DialogModal
          isOpened={sheetOpen}
          onClose={() => setSheetOpen(false)}
          styles="sm:!max-w-md"
          mobileSheet
          ariaLabelledBy="fm-panel-heading"
        >
          <div
            ref={panelRootRef}
            style={{ maxHeight: keyboardInset ? `calc(70vh - ${keyboardInset}px)` : "70vh", overflowY: "auto" }}
          >
            {/* Drag handle — swipe down to dismiss */}
            <div
              className="w-10 h-1 rounded-full bg-beige dark:bg-clay mx-auto mb-4 cursor-grab"
              onTouchStart={(e) => ((e.currentTarget as any)._startY = e.touches[0].clientY)}
              onTouchEnd={(e) => {
                const startY = (e.currentTarget as any)._startY ?? 0;
                const deltaY = e.changedTouches[0].clientY - startY;
                if (deltaY > 60) setSheetOpen(false);
              }}
            />
            <h2 id="fm-panel-heading" className="sr-only">Frontmatter</h2>
            {PanelBody}
          </div>
        </DialogModal>
      </>
    );
  }

  return (
    <div ref={panelRootRef}>
      {!expanded && <SummaryBar {...summaryBarProps} />}
      {expanded && !inView && <SummaryBar {...summaryBarProps} sticky />}
      {expanded && (
        <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-edge-subtle bg-chrome/65 px-4 py-3 shadow-sm backdrop-blur-xl dark:bg-paper-dark-surface/55">
          <div className="flex items-center justify-end">
            <Button
              variant="pill-icon"
              onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault()}
              onClick={() => setExpanded(false)}
              className="rounded-lg p-1.5 -mr-1.5 shrink-0 text-ink-muted transition-colors hover:bg-surface-raised hover:text-fg dark:text-fg-faint"
              title="Collapse frontmatter"
              aria-label="Collapse frontmatter"
            >
              <HiChevronDown size={13} />
            </Button>
          </div>
          {PanelBody}
        </div>
      )}
    </div>
  );
}
