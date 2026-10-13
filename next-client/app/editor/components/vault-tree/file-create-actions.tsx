"use client";

import React from "react";
import { HiOutlineDocumentAdd, HiOutlineFolderAdd } from "react-icons/hi";

export interface FileCreateAction {
  id: "note" | "folder";
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export interface FileCreateHandlers {
  newNote?: () => void;
  newFolder?: () => void;
}

const ICON = { size: 14, className: "opacity-80 shrink-0" };

// The create actions every file list offers, in one order and wording: the
// Files page's header, the sidebar's Files menu, and a folder's or the empty
// space's menu in the tree. Only the handlers given are listed.
export function fileCreateActions({ newNote, newFolder }: FileCreateHandlers): FileCreateAction[] {
  return [
    ...(newNote ? [{ id: "note" as const, label: "New Note", icon: <HiOutlineDocumentAdd {...ICON} />, onSelect: newNote }] : []),
    ...(newFolder ? [{ id: "folder" as const, label: "New Folder", icon: <HiOutlineFolderAdd {...ICON} />, onSelect: newFolder }] : []),
  ];
}
