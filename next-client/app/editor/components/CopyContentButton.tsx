"use client";

import React from "react";
import { useAtomValue } from "jotai";
import { HiOutlineDocumentDuplicate } from "react-icons/hi";
import { atom_activePaneId, atom_fileContent, atom_workspaceLayout, findLeaf } from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { copyContentToClipboard } from "../hooks/use-pane-file-actions";
import { PILL_BUTTON_CLASS } from "./pane-header-classes";
import { SEARCH_PILL_WIDTH } from "./SearchPill";

// The editor corner's width: the outline toggle and this button (2rem each),
// their gaps (0.375rem each) and the SearchPill, so the pane's floating
// title keeps clear of them.
export const EDITOR_CORNER_WIDTH = `calc(${SEARCH_PILL_WIDTH} + 4.75rem)`;

// Copies the active pane's file as it is (a note's Markdown, a code file's
// source) to the clipboard: the palette's
// "Copy Contents", one click away. It sits just left of the SearchPill in the
// editor's top-right corner (EditorShell), in the pill's look and height.
export default function CopyContentButton({ className = "" }: { className?: string }) {
  const layout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const leaf = activePaneId ? findLeaf(layout.rootContainer, activePaneId) : null;
  const hasNote = !!leaf && leaf.openFilePaths.length > 0;
  const content = useAtomValue(atom_fileContent(leaf?.activeFilePath || "draft"));

  return (
    <Tooltip label="Copy Contents" position="bottom" portal>
      <Button
        variant="unstyled"
        onClick={() => { void copyContentToClipboard(content); }}
        isDisabled={!hasNote || !content.trim()}
        aria-label="Copy Contents"
        className={`${PILL_BUTTON_CLASS} ${className}`}
      >
        <HiOutlineDocumentDuplicate size={14} aria-hidden="true" />
      </Button>
    </Tooltip>
  );
}
