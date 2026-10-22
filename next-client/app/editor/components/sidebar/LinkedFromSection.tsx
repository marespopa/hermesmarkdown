"use client";

import React, { useMemo } from "react";
import { useAtomValue, useStore } from "jotai";
import { HiOutlineDocumentText } from "react-icons/hi";
import { atom_backlinkIndex } from "@/app/atoms/link-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_noteDisplayItems } from "@/app/atoms/privacy-atoms";
import Button from "@/app/components/Button";
import SidebarSection from "./SidebarSection";
import { jumpToFirstLink } from "./link-jump";
import { SIDEBAR_ICON_CLASS, sidebarItemClass } from "./sidebar-classes";

function parentLabel(path: string): string {
  const parts = path.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") : "/";
}

// The notes linking to the note in front ([[wikilinks]] and embeds), by
// title. A click opens the source with the caret on its first link here.
export default function LinkedFromSection({
  path,
  onOpen,
}: {
  path: string;
  onOpen: (handle: FileSystemFileHandle, path: string) => Promise<void>;
}) {
  const store = useStore();
  const index = useAtomValue(atom_backlinkIndex);
  const display = useAtomValue(atom_noteDisplayItems);
  const metadata = useAtomValue(atom_fileMetadata);

  const rows = useMemo(() => {
    const list = (index.get(path) ?? [])
      .map((source) => ({ source, title: display.get(source)?.title }))
      .filter((row): row is { source: string; title: string } => row.title !== undefined);
    list.sort(
      (a, b) =>
        a.title.toLowerCase().localeCompare(b.title.toLowerCase()) || a.source.localeCompare(b.source),
    );
    const counts = new Map<string, number>();
    for (const row of list) counts.set(row.title, (counts.get(row.title) ?? 0) + 1);
    return list.map((row) => ({ ...row, duplicate: (counts.get(row.title) ?? 0) > 1 }));
  }, [index, display, path]);

  const open = async (source: string) => {
    const meta = metadata[source];
    if (!meta) return;
    await onOpen(meta.handle, source);
    jumpToFirstLink(store, source, path);
  };

  // Shown only when some note links here.
  if (rows.length === 0) return null;

  return (
    <SidebarSection title="Linked from">
      {rows.map(({ source, title, duplicate }) => (
        <Button
          key={source}
          variant="unstyled"
          title={source}
          onClick={() => void open(source)}
          className={`${sidebarItemClass(false)} w-full`}
        >
          <HiOutlineDocumentText size={14} aria-hidden="true" className={SIDEBAR_ICON_CLASS} />
          <span className="min-w-0 truncate">{title}</span>
          {duplicate && <span className="shrink-0 text-fg-faint">{parentLabel(source)}</span>}
        </Button>
      ))}
    </SidebarSection>
  );
}
