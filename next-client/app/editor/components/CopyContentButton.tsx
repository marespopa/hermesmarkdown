"use client";

import React from "react";
import { useAtomValue } from "jotai";
import { HiOutlineDocumentDuplicate } from "react-icons/hi";
import { atom_activePaneId, atom_fileContent, atom_workspaceLayout, findLeaf } from "@/app/atoms/atoms";
import { copyContentToClipboard } from "../hooks/use-pane-file-actions";
import CornerButton from "./CornerButton";

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
    <CornerButton
      icon={<HiOutlineDocumentDuplicate size={14} aria-hidden="true" />}
      label="Copy Contents"
      onClick={() => { void copyContentToClipboard(content); }}
      isDisabled={!hasNote || !content.trim()}
      className={className}
    />
  );
}
