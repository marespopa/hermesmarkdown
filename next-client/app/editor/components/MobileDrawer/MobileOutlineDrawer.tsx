"use client";

import React, { useCallback, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { EditorView } from "@codemirror/view";
import { HiOutlineX } from "react-icons/hi";
import { atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_mobileOutlineOpen } from "@/app/atoms/mobile-drawer-atoms";
import { atom_activeEditorView } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import OverlayPanel from "@/app/components/OverlayLayer/OverlayPanel";
import { isPlainTextPath } from "@/app/utils/file-kinds";
import { countWords } from "../../utils/count-words";
import { flashLine } from "../../utils/flash-line";
import { useOutlineHeadings } from "../markdown-editor/use-outline-headings";
import { SymbolIcon } from "../markdown-editor/SymbolIcon";
import { useSwipeToClose } from "./use-edge-swipe";

const LEVEL_INDENT_PX = 16;
const WORDS_PER_MINUTE = 200;

export function readingMinutes(words: number): number {
  return words === 0 ? 0 : Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-lg bg-fill px-3 py-2">
      <dt className="text-ui-caption text-fg-muted">{label}</dt>
      <dd className="text-ui-subhead font-medium tabular-nums text-fg">{value}</dd>
    </div>
  );
}

// The body, mounted only while open: the note's text is read once when it
// opens (the drawer covers the page, so it can't change under it).
function OutlineBody({ view, filePath, onJump }: { view: EditorView | null; filePath: string | null; onJump: () => void }) {
  const text = useMemo(() => view?.state.doc.toString() ?? "", [view]);
  const headings = useOutlineHeadings(view, text, !!filePath && isPlainTextPath(filePath), filePath);
  const words = useMemo(() => countWords(text), [text]);

  const jump = (line: number) => {
    onJump();
    if (!view || line > view.state.doc.lines) return;
    const from = view.state.doc.line(line).from;
    view.dispatch({ selection: { anchor: from }, effects: EditorView.scrollIntoView(from, { y: "start", yMargin: 80 }) });
    flashLine(view, from);
  };

  if (!view) return <p className="px-4 py-3 text-ui-footnote text-fg-muted">Open a note to see its outline.</p>;
  return (
    <>
      <section aria-label="Metrics" className="shrink-0 border-b border-edge-subtle p-3">
        <dl className="grid grid-cols-2 gap-2">
          <Metric label="Words" value={words.toLocaleString()} />
          <Metric label="Characters" value={text.length.toLocaleString()} />
          <Metric label="Lines" value={view.state.doc.lines.toLocaleString()} />
          <Metric label="Reading time" value={`${readingMinutes(words)} min`} />
        </dl>
      </section>
      <nav aria-label="Outline" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {headings.length === 0 ? (
          <p className="px-2 py-1 text-ui-footnote text-fg-muted">No headings in this note.</p>
        ) : (
          headings.map((heading, index) => (
            <Button
              key={`${index}:${heading.line}`}
              variant="unstyled"
              onClick={() => jump(heading.line)}
              style={{ paddingLeft: 12 + (heading.level - 1) * LEVEL_INDENT_PX }}
              className={`flex min-h-11 w-full items-center gap-2 rounded-lg pr-3 text-left text-ui-subhead text-fg transition-colors hover:bg-fill active:bg-fill-hover ${heading.level === 1 ? "font-medium" : ""}`}
            >
              {heading.kind && <SymbolIcon kind={heading.kind} />}
              <span className="truncate">{heading.text}</span>
            </Button>
          ))
        )}
      </nav>
    </>
  );
}

// The phone's Outline & metrics drawer, from the right edge: the note's
// headings (a code file's symbols), each jumping there and putting the drawer
// away first, and its word, character and line counts with a reading time.
export default function MobileOutlineDrawer() {
  const [open, setOpen] = useAtom(atom_mobileOutlineOpen);
  const view = useAtomValue(atom_activeEditorView);
  const filePath = useAtomValue(atom_workspaceLayout).rootContainer.activeFilePath ?? null;
  const close = useCallback(() => setOpen(false), [setOpen]);
  const swipe = useSwipeToClose("right", close);

  return (
    <OverlayPanel
      isOpen={open}
      onClose={close}
      variant="edge-panel"
      exitDurationMs={200}
      lockScroll
      containerClassName="right-0 justify-end"
      backdropClassName={`backdrop-blur-none duration-overlay-backdrop motion-reduce:animate-none ${open ? "animate-in fade-in" : "animate-out fade-out"}`}
      panelClassName={`flex h-full w-[85vw] max-w-sm flex-col bg-overlay border-l border-edge-subtle font-sans duration-overlay-panel ease-layout motion-reduce:animate-none ${open ? "animate-in slide-in-from-right" : "animate-out slide-out-to-right"}`}
      ariaLabelledBy="mobile-outline-title"
    >
      <div className="flex h-full min-h-0 flex-col" {...swipe}>
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-edge-subtle px-4 py-2.5">
          <h2 id="mobile-outline-title" className="text-ui-subhead font-semibold">Outline</h2>
          <Button variant="close" onClick={close} aria-label="Close outline" title="Close">
            <HiOutlineX size={16} aria-hidden="true" />
          </Button>
        </div>
        <OutlineBody view={view} filePath={filePath} onJump={close} />
      </div>
    </OverlayPanel>
  );
}
