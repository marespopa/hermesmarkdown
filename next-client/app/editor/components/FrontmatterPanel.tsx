"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { HiChevronRight, HiChevronDown } from "react-icons/hi";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultSchema } from "@/app/atoms/schema-atoms";
import { DEFAULT_SCHEMA, type SchemaField } from "@/app/services/vault-schema";
import { FM_REGEX, parseFmFields, updateFmFields } from "@/app/utils/frontmatter-utils";
import DialogModal from "../../components/DialogModal/DialogModal";
import Button from "../../components/Button";
import {
  TitleField,
  EnumField,
  ScopeField,
  ReadWhenField,
  TagsChipInput,
  RelatedField,
  DateField,
  GenericField,
} from "./frontmatter";

const REQUIRED_KEYS = ["title", "scope", "read_when"];

interface FrontmatterPanelProps {
  filePath: string;
  content: string;
  onChange: (next: string) => void;
  fontFamily: string;
  displayFontSize: number | string;
  isMobile: boolean;
}

// Detects the on-screen keyboard via visualViewport height shrinking, same
// heuristic used by MobileBottomNav, so the bottom sheet can shrink to fit.
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleResize = () => {
      const shrink = window.innerHeight - vv.height;
      setInset(shrink > 150 ? shrink : 0);
    };
    handleResize();
    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);
  return inset;
}

export default function FrontmatterPanel({
  filePath,
  content,
  onChange,
  fontFamily,
  displayFontSize,
  isMobile,
}: FrontmatterPanelProps) {
  const metadata = useAtomValue(atom_fileMetadata);
  const rawSchema = useAtomValue(atom_vaultSchema);
  const schema = rawSchema ?? DEFAULT_SCHEMA;
  const notePaths = useMemo(() => Object.keys(metadata).map((p) => p.replace(/\.md$/, "")), [metadata]);

  const match = FM_REGEX.exec(content);
  const rawFrontmatter = match ? match[0] : null;
  const fields = useMemo(() => parseFmFields(content), [content]);

  const missingRequired = REQUIRED_KEYS.some((k) => !fields[k]?.trim());

  const [expanded, setExpanded] = useState(missingRequired);
  const [mode, setMode] = useState<"fields" | "raw">("fields");
  const [rawDraft, setRawDraft] = useState(rawFrontmatter ?? "");
  const [rawError, setRawError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inView, setInView] = useState(true);
  const lastFocusedKeyRef = useRef<string | null>(null);
  const panelRootRef = useRef<HTMLDivElement>(null);
  const prevFilePathRef = useRef(filePath);
  const keyboardInset = useKeyboardInset();

  // Reset open/raw state when switching files — each file's required-field
  // completeness decides the default state independently.
  useEffect(() => {
    if (prevFilePathRef.current !== filePath) {
      prevFilePathRef.current = filePath;
      setExpanded(missingRequired);
      setMode("fields");
      setSheetOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  useEffect(() => {
    if (mode === "raw") setRawDraft(rawFrontmatter ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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

  if (!rawFrontmatter) return null;

  const set = (key: string, val: string) => {
    onChange(updateFmFields(content, { [key]: val }, schema));
  };

  const applyRawDraft = (text: string) => {
    setRawDraft(text);
    const candidate = text.endsWith("\n") ? text : `${text}\n`;
    if (!FM_REGEX.test(candidate)) {
      setRawError("Invalid frontmatter — must be a YAML block between `---` lines.");
      return;
    }
    setRawError(null);
    onChange(candidate + content.slice(rawFrontmatter.length));
  };

  const title = fields.title ?? "";
  const tagCount = (fields.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean).length;
  const summaryText = [fields.scope, fields.read_when]
    .filter(Boolean)
    .map((s) => (s.length > 40 ? `${s.slice(0, 40)}…` : s))
    .join("  ·  ");
  const summaryLine = [summaryText, tagCount > 0 ? `${tagCount} tag${tagCount === 1 ? "" : "s"}` : null]
    .filter(Boolean)
    .join("  ·  ");

  const SummaryBar = ({ sticky = false }: { sticky?: boolean }) => (
    <button
      type="button"
      onClick={() => (isMobile ? setSheetOpen(true) : setExpanded(true))}
      className={`flex items-center gap-2 w-full text-left select-none px-0.5 ${
        sticky ? "sticky top-0 z-30 bg-chrome/95 backdrop-blur-sm py-1.5 border-b border-edge-subtle" : "mb-1"
      }`}
      style={{ fontFamily, fontSize: displayFontSize }}
    >
      {title && <span className="shrink min-w-0 max-w-[30ch] truncate opacity-50 text-[0.72em] font-medium">{title}</span>}
      {summaryLine && <span className="flex-1 min-w-0 truncate text-right opacity-30 text-[0.72em]">{summaryLine}</span>}
      <HiChevronRight size={13} className="shrink-0 text-ink-muted dark:text-fg-faint" />
    </button>
  );

  const schemaKeys = new Set(schema.fields.map((f) => f.key));
  const customKeys = Object.keys(fields).filter((k) => !schemaKeys.has(k));

  const fieldList = [
    ...schema.fields.map((field) => (
      <div key={field.key} data-fm-field={field.key} onFocusCapture={() => (lastFocusedKeyRef.current = field.key)}>
        {renderSchemaField(field, fields, set, { autoFocus: false, notePaths })}
      </div>
    )),
    // Custom/unknown keys — preserved verbatim, never dropped, rendered as a
    // plain fallback input so they remain editable without schema knowledge.
    ...customKeys.map((key) => (
      <div key={key} data-fm-field={key} onFocusCapture={() => (lastFocusedKeyRef.current = key)}>
        <GenericField fieldKey={key} value={fields[key] ?? ""} onChange={(v) => set(key, v)} autoFocus={false} />
      </div>
    )),
  ];

  const PanelBody = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-ui-caption font-medium text-stone uppercase tracking-wider">Frontmatter</span>
        <button
          type="button"
          onClick={() => setMode((m) => (m === "fields" ? "raw" : "fields"))}
          className="text-ui-caption font-medium text-sage dark:text-sage hover:underline"
        >
          {mode === "fields" ? "Raw YAML" : "Fields"}
        </button>
      </div>
      {mode === "fields" ? (
        <>
          <fieldset className="flex flex-col gap-4 border-0 m-0 p-0">{fieldList}</fieldset>
          <Button
            variant="primary"
            onClick={() => (isMobile ? setSheetOpen(false) : setExpanded(false))}
            className="self-end"
          >
            Save & Close
          </Button>
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <textarea
            value={rawDraft}
            onChange={(e) => applyRawDraft(e.target.value)}
            rows={Math.max(6, rawDraft.split("\n").length)}
            className="w-full px-4 py-2.5 text-ui-footnote font-mono border rounded-xl outline-none resize-none bg-paper-softgray border-beige text-ink-light dark:bg-paper-dark-surface/50 dark:border-clay dark:text-ink-dark focus:ring-2 focus:ring-sage/15 dark:focus:ring-sage/20"
          />
          {rawError && <span className="text-ui-caption text-red-500 dark:text-red-400 px-0.5">{rawError}</span>}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <SummaryBar />
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
      {!expanded && <SummaryBar />}
      {expanded && !inView && <SummaryBar sticky />}
      {expanded && (
        <div className="flex flex-col gap-2 mb-2 border-b border-edge-subtle pb-3">
          <div className="flex items-center justify-end">
            <Button
              variant="pill-icon"
              onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault()}
              onClick={() => setExpanded(false)}
              className="p-1.5 -mr-1.5 shrink-0 text-ink-muted dark:text-fg-faint hover:text-sage dark:hover:text-sage"
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

function renderSchemaField(
  field: SchemaField,
  fields: Record<string, string>,
  set: (key: string, val: string) => void,
  opts: { autoFocus: boolean; notePaths: string[] },
): React.ReactNode {
  const value = fields[field.key] ?? "";
  if (field.key === "title") return <TitleField value={value} onChange={(v) => set("title", v)} />;
  if (field.key === "scope") {
    return (
      <ScopeField
        value={value}
        onChange={(v) => set("scope", v)}
        error={fields.status === "active" && !value.trim()}
        errorMessage="Required for active files"
      />
    );
  }
  if (field.key === "read_when") {
    return (
      <ReadWhenField
        value={value}
        onChange={(v) => set("read_when", v)}
        warning={fields.status === "active" && !value.trim()}
      />
    );
  }
  if (field.key === "related") {
    return <RelatedField value={value} onChange={(v) => set("related", v)} notePaths={opts.notePaths} />;
  }
  if (field.key === "tags") return <TagsChipInput value={value} onChange={(v) => set("tags", v)} />;
  if (field.type === "enum") {
    return <EnumField fieldKey={field.key} values={field.values ?? []} value={value} onChange={(v) => set(field.key, v)} />;
  }
  if (field.type === "date") return <DateField value={value} onChange={(v) => set(field.key, v)} />;
  return (
    <GenericField
      fieldKey={field.key}
      value={value}
      onChange={(v) => set(field.key, v)}
      type={field.type === "list" ? "list" : "string"}
      description={field.description}
      autoFocus={false}
    />
  );
}
