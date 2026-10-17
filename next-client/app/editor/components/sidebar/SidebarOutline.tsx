"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { HiChevronRight } from "react-icons/hi";
import { atom_fileContent } from "@/app/atoms/atoms";
import { buildOutlineTree, extractOutline, type OutlineNode } from "@/app/utils/markdown-outline";
import SidebarSection from "./SidebarSection";
import { sidebarItemClass } from "./sidebar-classes";

// Indent per tree level: the disclosure chevron's slot.
const LEVEL_INDENT_PX = 14;

interface VisibleRow {
  node: OutlineNode;
  depth: number;
  parentLine: number | null;
}

// The rows a reader sees: folded headings hide what's under them.
function visibleRows(nodes: OutlineNode[], collapsed: ReadonlySet<number>, depth = 0, parentLine: number | null = null): VisibleRow[] {
  return nodes.flatMap((node) => [
    { node, depth, parentLine },
    ...(collapsed.has(node.heading.line) ? [] : visibleRows(node.children, collapsed, depth + 1, node.heading.line)),
  ]);
}

// The note in front's outline as a tree, as in a Finder or Xcode outline: each
// H1–H3 holds the deeper headings under it, behind a disclosure chevron
// (click it, or Left / Right, to fold or unfold). A click on a heading
// calls `onJump` with its 1-based line. Keyboard: Up / Down move between
// visible headings, Right unfolds or steps into the first child, Left folds
// or steps out to the parent, Enter or Space jumps. Folds reset when the
// note changes. Renders nothing for a note without headings.
export default function SidebarOutline({ path, onJump }: { path: string; onJump: (line: number) => void }) {
  const content = useAtomValue(atom_fileContent(path));
  const tree = useMemo(() => buildOutlineTree(extractOutline(content)), [content]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set());
  const [focusedLine, setFocusedLine] = useState<number | null>(null);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());

  useEffect(() => {
    setCollapsed(new Set());
    setFocusedLine(null);
  }, [path]);

  const rows = useMemo(() => visibleRows(tree, collapsed), [tree, collapsed]);
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

  return (
    <SidebarSection title="Outline">
      <div role="tree" aria-label="Outline" className="flex flex-col gap-px">
        {rows.map(({ node, depth }, index) => {
          const { heading } = node;
          const hasChildren = node.children.length > 0;
          const isFolded = collapsed.has(heading.line);
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
              tabIndex={heading.line === tabStop ? 0 : -1}
              title={heading.text}
              onClick={() => {
                setFocusedLine(heading.line);
                onJump(heading.line);
              }}
              onKeyDown={(event) => onKeyDown(event, index)}
              style={{ paddingLeft: 4 + depth * LEVEL_INDENT_PX }}
              className={`${sidebarItemClass(false)} !gap-1 cursor-default select-none outline-none focus-visible:ring-1 focus-visible:ring-sage ${heading.level === 1 ? "font-medium" : "text-fg-muted"}`}
            >
              {/* Disclosure chevron, as in Finder: rotates down when open. Its
                  own click folds without jumping. A leaf keeps the slot so
                  names line up. */}
              <span className="shrink-0 flex items-center justify-center w-3.5 h-3.5">
                {hasChildren && (
                  <HiChevronRight
                    size={11}
                    aria-hidden="true"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFolded(heading.line, !isFolded);
                    }}
                    className={`text-fg-faint transition-transform duration-150 motion-reduce:transition-none ${isFolded ? "" : "rotate-90"}`}
                  />
                )}
              </span>
              <span className="flex-1 min-w-0 truncate">{heading.text}</span>
            </div>
          );
        })}
      </div>
    </SidebarSection>
  );
}
