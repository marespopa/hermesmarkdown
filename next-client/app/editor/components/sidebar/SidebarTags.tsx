"use client";

import React, { useMemo, useState } from "react";
import { HiChevronRight } from "react-icons/hi";
import { TbPinned } from "react-icons/tb";
import Button from "@/app/components/Button";
import CountBadge from "@/app/components/CountBadge";
import { usePins } from "@/app/hooks/use-pins";
import type { TagNode } from "../../tags/tag-index";
import { useTagIndex } from "../../tags/use-tag-index";
import TabContextMenu from "../TabContextMenu";
import SidebarSection from "./SidebarSection";
import { SIDEBAR_ICON_CLASS, sidebarItemClass } from "./sidebar-classes";
import type { TagIcons } from "./tag-icons";
import { useTagIcons } from "./use-tag-icons";
import { useTagNavigation } from "./use-tag-navigation";

interface TagRowProps {
  node: TagNode;
  depth: number;
  icons: TagIcons;
  current: string | null;
  onOpen: (path: string) => void;
  onMenu: (path: string, x: number, y: number) => void;
}

// One tag: a disclosure for its children, its icon (`.hermes/tags.json`) or
// #, its name and its rolled-up count. A click opens its notes; a right-click
// opens its menu.
function TagRow({ node, depth, icons, current, onOpen, onMenu }: TagRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const Icon = icons[node.path];
  return (
    <div role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={current === node.path}>
      <div className="flex items-center" style={{ paddingLeft: depth * 12 }}>
        {hasChildren ? (
          <Button
            variant="unstyled"
            onClick={() => setExpanded((open) => !open)}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.name}`}
            className="flex h-7 w-5 shrink-0 items-center justify-center text-fg-faint"
          >
            <HiChevronRight size={12} aria-hidden="true" className={`transition-transform motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`} />
          </Button>
        ) : (
          <span aria-hidden="true" className="w-5 shrink-0" />
        )}
        <Button
          variant="unstyled"
          onClick={() => onOpen(node.path)}
          onContextMenu={(event) => {
            event.preventDefault();
            onMenu(node.path, event.clientX, event.clientY);
          }}
          title={`#${node.path}`}
          className={`${sidebarItemClass(current === node.path)} min-w-0 flex-1`}
        >
          <span aria-hidden="true" className={`${SIDEBAR_ICON_CLASS} flex w-[15px] justify-center`}>{Icon ? <Icon size={14} /> : "#"}</span>
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
          <CountBadge count={node.count} />
        </Button>
      </div>
      {hasChildren && expanded && (
        <div role="group">
          {node.children.map((child) => <TagRow key={child.path} {...{ icons, current, onOpen, onMenu }} node={child} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

const flatten = (nodes: TagNode[]): TagNode[] => nodes.flatMap((node) => [node, ...flatten(node.children)]);

// The Tags view of the sidebar: the vault's tags nested on `/` (#work/projects
// sits under work), each with the notes under it and its sub-tags counted.
// A pinned tag is listed first in Pinned, apart from the alphabetical tree.
// Right-click a tag to Pin or Unpin it. Reads the URL, so it needs a
// Suspense boundary above it.
export default function SidebarTags() {
  const { tree } = useTagIndex();
  const icons = useTagIcons();
  const { tag, openTag } = useTagNavigation();
  const { pins, isPinned, togglePin } = usePins();
  const [menu, setMenu] = useState<{ path: string; x: number; y: number } | null>(null);

  const pinned = useMemo(() => {
    const byPath = new Map(flatten(tree).map((node) => [node.path, node]));
    return pins.flatMap((pin) => (pin.kind === "tag" && byPath.has(pin.target) ? [byPath.get(pin.target)!] : []));
  }, [tree, pins]);

  const onMenu = (path: string, x: number, y: number) => setMenu({ path, x, y });
  const rowProps = { icons, current: tag, onOpen: openTag, onMenu };

  return (
    <>
      {pinned.length > 0 && (
        <SidebarSection title="Pinned tags">
          <div role="tree" aria-label="Pinned tags">
            {pinned.map((node) => <TagRow key={node.path} {...rowProps} node={{ ...node, children: [] }} depth={0} />)}
          </div>
        </SidebarSection>
      )}
      <SidebarSection title="Tags">
        {tree.length === 0 ? (
          <p className="px-2 py-1 text-ui-caption text-fg-muted">No tags yet. Add one anywhere in a file, like #idea.</p>
        ) : (
          <div role="tree" aria-label="Tags">
            {tree.map((node) => <TagRow key={node.path} {...rowProps} node={node} depth={0} />)}
          </div>
        )}
      </SidebarSection>
      {menu && (
        <TabContextMenu
          x={menu.x}
          y={menu.y}
          label={`#${menu.path} actions`}
          items={[{
            label: isPinned("tag", menu.path) ? "Unpin" : "Pin",
            icon: <TbPinned size={15} aria-hidden="true" />,
            onClick: () => void togglePin("tag", menu.path),
          }]}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}
