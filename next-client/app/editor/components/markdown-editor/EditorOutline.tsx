"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import Button from "@/app/components/Button";
import { extractOutline } from "@/app/utils/markdown-outline";
import { sidebarItemClass } from "../sidebar/sidebar-classes";

// How far down the pane a heading counts as reached (a quarter of its
// height), and where a jump puts it, so the jumped-to heading is current.
const READ_LINE = 0.25;
// Each level's extra indent (H2, H3), in px.
const LEVEL_INDENT_PX = 12;

// The pane's scroll offset of the document's top (the editor scrolls in its
// pane, not in itself).
function documentTop(view: EditorView, scroller: HTMLElement): number {
  return view.documentTop - scroller.getBoundingClientRect().top + scroller.scrollTop;
}

// The note's outline, off by default (atom_showOutline; Ctrl/Cmd+Shift+M,
// Settings → Editor → View): a small box fixed in the pane's bottom-right
// corner listing its H1–H3 headings (extractOutline) as text, indented by
// level. The section read now (the last heading above a quarter of the pane)
// is the current row, kept in view inside the box, which scrolls on its own
// for a long outline. A click puts the caret on that heading and scrolls it
// to where the current section is read. Renders nothing for a note without
// headings; hidden on narrow screens.
export default function EditorOutline({ view, scrollerRef, text }: { view: EditorView | null; scrollerRef: React.RefObject<HTMLDivElement | null>; text: string }) {
  const headings = useMemo(() => extractOutline(text), [text]);
  const [current, setCurrent] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<number, HTMLElement>());

  // The current heading's line, from the pane's scroll.
  const updateCurrent = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!view || !scroller) return;
    const y = scroller.scrollTop + scroller.clientHeight * READ_LINE - documentTop(view, scroller);
    const line = view.state.doc.lineAt(view.lineBlockAtHeight(Math.max(0, y)).from).number;
    let at: number | null = null;
    for (const heading of headings) if (heading.line <= line) at = heading.line;
    setCurrent(at);
  }, [view, scrollerRef, headings]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const frame = requestAnimationFrame(updateCurrent);
    scroller.addEventListener("scroll", updateCurrent, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", updateCurrent);
    };
  }, [scrollerRef, updateCurrent]);

  // Keeps the current row in view inside the box (never scrolls the pane).
  useEffect(() => {
    const list = listRef.current;
    const row = current === null ? undefined : rowRefs.current.get(current);
    if (!list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
  }, [current]);

  const jump = (line: number) => {
    const scroller = scrollerRef.current;
    if (!view || !scroller || line > view.state.doc.lines) return;
    const from = view.state.doc.line(line).from;
    view.dispatch({ selection: { anchor: from } });
    scroller.scrollTop = documentTop(view, scroller) + view.lineBlockAt(from).top - scroller.clientHeight * READ_LINE;
    view.focus();
  };

  if (!headings.length) return null;

  return (
    // A zero-height sticky box at the bottom of the scrolling pane (rendered
    // after the sheet) holds the outline in its corner while the note scrolls.
    <div className="pointer-events-none sticky bottom-0 z-10 h-0 max-md:hidden">
      <nav
        aria-label="Outline"
        className="pointer-events-auto absolute bottom-4 right-4 w-52 rounded-xl glass-panel"
      >
        <div ref={listRef} className="relative flex max-h-60 flex-col gap-px overflow-y-auto p-1">
          {headings.map((heading) => (
            <Button
              key={heading.line}
              variant="unstyled"
              ref={(node: HTMLButtonElement | null) => {
                if (node) rowRefs.current.set(heading.line, node);
                else rowRefs.current.delete(heading.line);
              }}
              aria-current={heading.line === current ? "location" : undefined}
              onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
              onClick={() => jump(heading.line)}
              style={{ paddingLeft: 8 + (heading.level - 1) * LEVEL_INDENT_PX }}
              className={`${sidebarItemClass(heading.line === current)} w-full shrink-0 ${heading.level === 1 ? "font-medium" : ""}`}
            >
              <span className="truncate">{heading.text}</span>
            </Button>
          ))}
        </div>
      </nav>
    </div>
  );
}
