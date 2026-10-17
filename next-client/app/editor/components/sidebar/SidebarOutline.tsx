"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { IoCaretForward } from "react-icons/io5";
import { atom_activeEditorView, atom_fileContent } from "@/app/atoms/atoms";
import { buildOutlineTree, extractOutline, type OutlineNode } from "@/app/utils/markdown-outline";
import SidebarSection from "./SidebarSection";
import { SIDEBAR_ACCENT_FILL } from "./sidebar-classes";

// The Files tree's metrics (vault-tree/FileRow), so both read as one tree.
const LEVEL_INDENT_PX = 16;
const ROW_INSET_PX = 12;

interface VisibleRow {
  node: OutlineNode;
  depth: number;
  parentLine: number | null;
}

// The headings from the root down to the one holding `line` (the caret's):
// the section you're in, then the ones it sits in.
function sectionChain(nodes: OutlineNode[], line: number | null): number[] {
  if (line === null) return [];
  let holder: OutlineNode | undefined;
  for (const node of nodes) if (node.heading.line <= line) holder = node;
  return holder ? [holder.heading.line, ...sectionChain(holder.children, line)] : [];
}

// The rows a reader sees: folded headings hide what's under them.
function visibleRows(nodes: OutlineNode[], collapsed: ReadonlySet<number>, depth = 0, parentLine: number | null = null): VisibleRow[] {
  return nodes.flatMap((node) => [
    { node, depth, parentLine },
    ...(collapsed.has(node.heading.line) ? [] : visibleRows(node.children, collapsed, depth + 1, node.heading.line)),
  ]);
}

// The note in front's outline, drawn as the Files tree is: 28px rows
// indented by level, a caret to fold a heading that holds deeper ones
// (click it, or Left / Right), and in the icon's place the heading's level
// (H1, H2, H3), so the top of the outline reads at a glance. The section the
// caret is in is the current row (the Files tree's active-row fill), the
// headings it sits in a little bolder. A click on a heading calls `onJump`
// with its 1-based line. Keyboard: Up / Down move between
// visible headings, Right unfolds or steps into the first child, Left folds
// or steps out to the parent, Enter or Space jumps. Folds reset when the
// note changes. Renders nothing for a note without headings.
export default function SidebarOutline({ path, onJump }: { path: string; onJump: (line: number) => void }) {
  const content = useAtomValue(atom_fileContent(path));
  const tree = useMemo(() => buildOutlineTree(extractOutline(content)), [content]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set());
  const [focusedLine, setFocusedLine] = useState<number | null>(null);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());

  // The caret's line in the active editor, read once per frame as the
  // selection moves (typing, clicks, jumps from here).
  const view = useAtomValue(atom_activeEditorView);
  const [caretLine, setCaretLine] = useState<number | null>(null);
  useEffect(() => {
    if (!view) {
      setCaretLine(null);
      return;
    }
    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (view.dom.isConnected) setCaretLine(view.state.doc.lineAt(view.state.selection.main.head).number);
      });
    };
    read();
    document.addEventListener("selectionchange", read);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", read);
    };
  }, [view]);

  useEffect(() => {
    setCollapsed(new Set());
    setFocusedLine(null);
  }, [path]);

  const rows = useMemo(() => visibleRows(tree, collapsed), [tree, collapsed]);
  const chain = useMemo(() => sectionChain(tree, caretLine), [tree, caretLine]);
  if (rows.length === 0) return null;
  // One row is in the tab order (roving tabindex): the focused one, else the first.
  const tabStop = rows.some((row) => row.node.heading.line === focusedLine) ? focusedLine : rows[0].node.heading.line;

  const setFolded = (line: number, folded: boolean) =>
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (folded) next.add(line);
      else next.delete(line);
      return next;
    });

  const focusRow = (line: number) => {
    setFocusedLine(line);
    rowRefs.current.get(line)?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const { node, parentLine } = rows[index];
    const line = node.heading.line;
    const hasChildren = node.children.length > 0;
    const isFolded = collapsed.has(line);
    switch (event.key) {
      case "ArrowDown":
        if (rows[index + 1]) focusRow(rows[index + 1].node.heading.line);
        break;
      case "ArrowUp":
        if (rows[index - 1]) focusRow(rows[index - 1].node.heading.line);
        break;
      case "ArrowRight":
        if (hasChildren && isFolded) setFolded(line, false);
        else if (hasChildren) focusRow(node.children[0].heading.line);
        break;
      case "ArrowLeft":
        if (hasChildren && !isFolded) setFolded(line, true);
        else if (parentLine !== null) focusRow(parentLine);
        break;
      case "Enter":
      case " ":
        onJump(line);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  // The current row: the caret's section, or its nearest heading still in
  // view when a fold hides it.
  const visibleLines = new Set(rows.map((row) => row.node.heading.line));
  const currentLine = [...chain].reverse().find((line) => visibleLines.has(line)) ?? null;

  return (
    <SidebarSection title="Outline">
      <div role="tree" aria-label="Outline" className="flex flex-col">
        {rows.map(({ node, depth }, index) => {
          const { heading } = node;
          const hasChildren = node.children.length > 0;
          const isFolded = collapsed.has(heading.line);
          const isCurrent = heading.line === currentLine;
          const inChain = chain.includes(heading.line);
          return (
            <div
              key={heading.line}
              ref={(element) => {
                if (element) rowRefs.current.set(heading.line, element);
                else rowRefs.current.delete(heading.line);
              }}
              role="treeitem"
              aria-level={depth + 1}
              aria-expanded={hasChildren ? !isFolded : undefined}
              aria-selected={isCurrent}
              aria-current={isCurrent ? "location" : undefined}
              tabIndex={heading.line === tabStop ? 0 : -1}
              title={heading.text}
              onClick={() => {
                setFocusedLine(heading.line);
                onJump(heading.line);
              }}
              onKeyDown={(event) => onKeyDown(event, index)}
              style={{ paddingLeft: ROW_INSET_PX + depth * LEVEL_INDENT_PX }}
              className={`flex h-7 items-center gap-1.5 rounded-md pr-2 text-ui-subhead text-fg cursor-default select-none outline-none transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-accent/50 ${
                isCurrent ? SIDEBAR_ACCENT_FILL : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              } ${inChain ? "font-medium" : ""}`}
            >
              {/* The Files tree's caret: its own click folds without
                  jumping. A heading with nothing under it keeps the slot,
                  so names line up. */}
              {hasChildren ? (
                <IoCaretForward
                  size={10}
                  aria-hidden="true"
                  onClick={(event) => {
                    event.stopPropagation();
                    setFolded(heading.line, !isFolded);
                  }}
                  className={`w-3 shrink-0 text-fg-faint transition-transform duration-150 motion-reduce:transition-none ${isFolded ? "" : "rotate-90"}`}
                />
              ) : (
                <span aria-hidden="true" className="w-3 shrink-0" />
              )}
              {/* The heading's level, where a file's icon would be. */}
              <span aria-hidden="true" className="w-4 shrink-0 text-center font-mono text-[10px] font-semibold leading-none text-fg-faint">
                H{heading.level}
              </span>
              <span className="min-w-0 flex-1 truncate">{heading.text}</span>
            </div>
          );
        })}
      </div>
    </SidebarSection>
  );
}
