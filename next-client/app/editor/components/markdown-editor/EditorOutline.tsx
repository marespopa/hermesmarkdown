"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { useSetAtom } from "jotai";
import { useVirtualizer } from "@tanstack/react-virtual";
import { IoClose } from "react-icons/io5";
import { atom_showOutline } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { useOutlineHeadings } from "./use-outline-headings";
import { SymbolIcon } from "./SymbolIcon";
import { flashLine } from "../../utils/flash-line";
import { sidebarItemClass } from "../sidebar/sidebar-classes";
import { VIRTUALIZE_THRESHOLD } from "../vault-tree/tree-model";

// How far down the pane a heading counts as reached (a quarter of its
// height), and where a jump puts it, so the jumped-to heading is current.
const READ_LINE = 0.25;
// Each level's extra indent (H2, H3), in px.
const LEVEL_INDENT_PX = 12;
// A row (the sidebar's 28px) and the 1px gap below it, for the virtual list.
const ROW_SIZE = 29;

// The last heading at or above `line` (headings are in document order).
function headingAt(headings: { line: number }[], line: number): number | null {
  let low = 0;
  let high = headings.length - 1;
  let at: number | null = null;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (headings[mid].line <= line) {
      at = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  return at;
}

// The pane's scroll offset of the document's top (the editor scrolls in its
// pane, not in itself).
function documentTop(view: EditorView, scroller: HTMLElement): number {
  return view.documentTop - scroller.getBoundingClientRect().top + scroller.scrollTop;
}

// The note's outline, off by default (atom_showOutline; Ctrl/Cmd+Shift+M,
// Settings → Editor → View): a small box fixed in the pane's bottom-right
// corner listing its H1–H3 headings as text, indented by level; for a code
// file (`isCode`), its functions, classes and other symbols instead, each
// with its kind's icon (useOutlineHeadings). The section read now (the last heading above a quarter of the pane)
// is the current row, kept in view inside the box, which scrolls on its own
// for a long outline. A click puts the caret on that heading and scrolls it
// to where the current section is read, briefly flashing its line. Past
// VIRTUALIZE_THRESHOLD rows (a big code or data file) only the rows in view
// are rendered; the pane's scroll is read once a frame. A small ×
// on its top-right corner (shown on hover or focus) turns the outline off.
// Renders nothing for a note without headings; hidden on narrow screens.
export default function EditorOutline({ view, scrollerRef, text, isCode = false, filePath }: { view: EditorView | null; scrollerRef: React.RefObject<HTMLDivElement | null>; text: string; isCode?: boolean; filePath?: string | null }) {
  const headings = useOutlineHeadings(view, text, isCode, filePath);
  const setShowOutline = useSetAtom(atom_showOutline);
  // The current row's index (several symbols can share a line).
  const [current, setCurrent] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<number, HTMLElement>());
  // The clicked row stays current until the pane scrolls away from where the
  // jump left it: near the file's ends (or with symbols sharing a line) the
  // reading point can't land on it, and would mark a neighbour.
  const pinRef = useRef<{ line: number; text: string; scrollTop: number } | null>(null);

  // The current heading, from the pane's scroll (or the clicked one).
  const updateCurrent = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!view || !scroller) return;
    const pin = pinRef.current;
    if (pin) {
      const index = headings.findIndex((heading) => heading.line === pin.line && heading.text === pin.text);
      if (index >= 0 && Math.abs(scroller.scrollTop - pin.scrollTop) <= 1) {
        setCurrent(index);
        return;
      }
      pinRef.current = null;
    }
    const y = scroller.scrollTop + scroller.clientHeight * READ_LINE - documentTop(view, scroller);
    const line = view.state.doc.lineAt(view.lineBlockAtHeight(Math.max(0, y)).from).number;
    setCurrent(headingAt(headings, line));
  }, [view, scrollerRef, headings]);

  // Once a frame at most, however fast the pane scrolls.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let frame = requestAnimationFrame(updateCurrent);
    let pending = false;
    const onScroll = () => {
      if (pending) return;
      pending = true;
      frame = requestAnimationFrame(() => {
        pending = false;
        updateCurrent();
      });
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
    };
  }, [scrollerRef, updateCurrent]);

  const virtualize = headings.length > VIRTUALIZE_THRESHOLD;
  const virtualizer = useVirtualizer({
    count: virtualize ? headings.length : 0,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_SIZE,
    overscan: 10,
  });

  // Keeps the current row in view inside the box (never scrolls the pane).
  useEffect(() => {
    if (virtualize) {
      if (current !== null) virtualizer.scrollToIndex(current, { align: "auto" });
      return;
    }
    const list = listRef.current;
    const row = current === null ? undefined : rowRefs.current.get(current);
    if (!list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
  }, [current, virtualize, virtualizer]);

  const jump = (index: number) => {
    const scroller = scrollerRef.current;
    const { line, text } = headings[index];
    if (!view || !scroller || line > view.state.doc.lines) return;
    const from = view.state.doc.line(line).from;
    view.dispatch({ selection: { anchor: from } });
    scroller.scrollTop = documentTop(view, scroller) + view.lineBlockAt(from).top - scroller.clientHeight * READ_LINE;
    // Where the pane actually stopped (clamped at the file's ends).
    pinRef.current = { line, text, scrollTop: scroller.scrollTop };
    setCurrent(index);
    view.focus();
    flashLine(view, from);
  };

  if (!headings.length) return null;

  const renderRow = (heading: (typeof headings)[number], index: number) => (
    <Button
      key={`${index}:${heading.line}`}
      variant="unstyled"
      ref={(node: HTMLButtonElement | null) => {
        if (node) rowRefs.current.set(index, node);
        else rowRefs.current.delete(index);
      }}
      aria-current={index === current ? "location" : undefined}
      onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
      onClick={() => jump(index)}
      style={{ paddingLeft: 8 + (heading.level - 1) * LEVEL_INDENT_PX }}
      className={`${sidebarItemClass(index === current)} w-full shrink-0 ${heading.level === 1 ? "font-medium" : ""}`}
    >
      {heading.kind && <SymbolIcon kind={heading.kind} />}
      <span className="truncate">{heading.text}</span>
    </Button>
  );

  return (
    // A zero-height sticky box at the bottom of the scrolling pane (rendered
    // after the sheet) holds the outline in its corner while the note scrolls.
    <div className="pointer-events-none sticky bottom-0 z-10 h-0 max-md:hidden">
      <nav
        aria-label="Outline"
        className="group/outline pointer-events-auto absolute bottom-4 right-4 w-52 rounded-xl glass-panel"
      >
        {/* On the corner, clear of the rows. */}
        <Button
          variant="close"
          aria-label="Close outline"
          title="Close outline"
          onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
          onClick={() => setShowOutline(false)}
          className="absolute -top-2 -right-2 z-10 !h-5 !w-5 shadow-sm opacity-0 group-hover/outline:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <IoClose size={16} aria-hidden="true" />
        </Button>
        <div ref={listRef} className="relative flex max-h-60 flex-col gap-px overflow-y-auto p-1">
          {virtualize ? (
            <div role="presentation" className="relative w-full shrink-0" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((item) => (
                <div
                  key={item.key}
                  role="presentation"
                  className="absolute inset-x-0 top-0 pb-px"
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  {renderRow(headings[item.index], item.index)}
                </div>
              ))}
            </div>
          ) : (
            headings.map(renderRow)
          )}
        </div>
      </nav>
    </div>
  );
}
