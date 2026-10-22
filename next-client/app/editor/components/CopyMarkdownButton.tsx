"use client";

import React from "react";
import { useAtomValue } from "jotai";
import { HiOutlineDocumentDuplicate } from "react-icons/hi";
import { atom_activePaneId, atom_fileContent, atom_workspaceLayout, findLeaf } from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { copyMarkdownToClipboard } from "../hooks/use-pane-file-actions";
import { PILL_BUTTON_CLASS } from "./pane-header-classes";
import { SEARCH_PILL_WIDTH } from "./SearchPill";

// The editor corner's width: this button (2rem), its gap (0.375rem) and the
// SearchPill, so the pane's floating title keeps clear of both.
export const EDITOR_CORNER_WIDTH = `calc(${SEARCH_PILL_WIDTH} + 2.375rem)`;

// Copies the active pane's note, as Markdown, to the clipboard: the palette's
// "Copy Markdown", one click away. It sits just left of the SearchPill in the
// editor's top-right corner (EditorShell), in the pill's look and height.
export default function CopyMarkdownButton({ className = "" }: { className?: string }) {
  const layout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const leaf = activePaneId ? findLeaf(layout.rootContainer, activePaneId) : null;
  const hasNote = !!leaf && leaf.openFilePaths.length > 0;
  const content = useAtomValue(atom_fileContent(leaf?.activeFilePath || "draft"));

  return (
    <Tooltip label="Copy Markdown" position="bottom" portal>
      <Button
        variant="unstyled"
        onClick={() => { void copyMarkdownToClipboard(content); }}
        isDisabled={!hasNote || !content.trim()}
        aria-label="Copy Markdown"
        className={`${PILL_BUTTON_CLASS} ${className}`}
      >
        <HiOutlineDocumentDuplicate size={14} aria-hidden="true" />
      </Button>
    </Tooltip>
  );
}
