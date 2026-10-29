"use client";

import React, { useState } from "react";
import { HiChevronRight } from "react-icons/hi";
import Button from "@/app/components/Button";
import CountBadge from "@/app/components/CountBadge";
import { useTagIndex } from "../../tags/use-tag-index";
import { NOTE_FILTER_LABELS, NOTE_FILTERS, type TagNode } from "../../tags/tag-index";
import { editorNoteFilterHref, editorTagHref } from "../../utils/editor-url";
import { SIDEBAR_ICON_CLASS } from "../sidebar/sidebar-classes";

const ROW_CLASS = "flex w-full items-center gap-2 min-h-11 px-3 rounded-lg text-ui-subhead text-left text-fg transition-colors hover:bg-fill active:bg-fill-hover";

interface TagsPaneProps {
  // Closes the drawer, then goes to the Tags page at `href`.
  onNavigate: (href: string) => void;
}

function TagRow({ node, depth, onNavigate }: { node: TagNode; depth: number; onNavigate: (href: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div className="flex items-center" style={{ paddingLeft: depth * 16 }}>
        {hasChildren ? (
          <Button
            variant="unstyled"
            onClick={() => setExpanded((open) => !open)}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.name}`}
            aria-expanded={expanded}
            className="flex h-11 w-9 shrink-0 items-center justify-center text-fg-faint"
          >
            <HiChevronRight size={14} aria-hidden="true" className={`transition-transform motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`} />
          </Button>
        ) : (
          <span aria-hidden="true" className="w-9 shrink-0" />
        )}
        <Button variant="unstyled" onClick={() => onNavigate(editorTagHref(node.path))} className={`${ROW_CLASS} !pl-1 min-w-0 flex-1`}>
          <span aria-hidden="true" className={`${SIDEBAR_ICON_CLASS} w-[15px] text-center`}>#</span>
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
          <CountBadge count={node.count} />
        </Button>
      </div>
      {hasChildren && expanded && (
        <ul>
          {node.children.map((child) => <TagRow key={child.path} node={child} depth={depth + 1} onNavigate={onNavigate} />)}
        </ul>
      )}
    </li>
  );
}

// The Tags tab: the system filters (All Notes, Untagged, Todo), then the
// vault's tags nested on `/`, with each parent's count rolled up. Picking
// one goes to the Tags page on it.
export default function TagsPane({ onNavigate }: TagsPaneProps) {
  const { tree, filterCounts } = useTagIndex();
  return (
    <div className="flex flex-col gap-3 px-2 py-2">
      <ul aria-label="Filters">
        {NOTE_FILTERS.map((filter) => (
          <li key={filter}>
            <Button variant="unstyled" onClick={() => onNavigate(editorNoteFilterHref(filter))} className={ROW_CLASS}>
              <span className="min-w-0 flex-1 truncate">{NOTE_FILTER_LABELS[filter]}</span>
              <CountBadge count={filterCounts[filter]} />
            </Button>
          </li>
        ))}
      </ul>
      {tree.length === 0 ? (
        <p className="px-3 text-ui-footnote text-fg-muted">No tags yet. Add one anywhere in a file, like <code>#idea</code>.</p>
      ) : (
        <ul aria-label="Tags">
          {tree.map((node) => <TagRow key={node.path} node={node} depth={0} onNavigate={onNavigate} />)}
        </ul>
      )}
    </div>
  );
}
