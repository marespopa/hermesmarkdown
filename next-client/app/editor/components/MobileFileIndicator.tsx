"use client";

import React, { useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  atom_workspaceLayout,
  atom_activePaneId,
  atom_openFiles,
  atom_activeFilePath,
  findLeaf,
} from "@/app/atoms/atoms";
import useKeyboardInset from "@/app/hooks/use-keyboard-inset";
import { HiOutlineChevronDown } from "react-icons/hi";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";

export default function MobileFileIndicator() {
  const isKeyboardOpen = useKeyboardInset() > 0;
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const [activePaneId, setActivePaneId] = useAtom(atom_activePaneId);
  const openFiles = useAtomValue(atom_openFiles);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [showList, setShowList] = useState(false);
  const { open: openCommandPalette } = useCommandPalette();

  if (isKeyboardOpen) return null;

  const leaf = activePaneId ? findLeaf(workspaceLayout.rootContainer, activePaneId) : null;
  if (!leaf || leaf.openFilePaths.length === 0) return null;

  const activePath = leaf.activeFilePath;
  const activeName = activePath ? (openFiles[activePath]?.fileName || activePath.split("/").pop()) : "untitled";
  const hasMultipleTabs = leaf.openFilePaths.length > 1;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => (hasMultipleTabs ? setShowList((v) => !v) : openCommandPalette())}
        aria-label={hasMultipleTabs ? "Switch file" : "Search files"}
        className="w-full flex items-center justify-center gap-1.5 h-9 bg-chrome border-b border-edge-subtle text-ui-footnote text-fg-muted px-3"
      >
        <span className="truncate">{activeName}</span>
        {hasMultipleTabs && <HiOutlineChevronDown size={12} />}
      </button>
      {showList && (
        <div className="absolute top-full left-0 right-0 z-50 bg-overlay border border-edge max-h-[40vh] overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              setShowList(false);
              openCommandPalette();
            }}
            className="w-full text-left px-4 py-2.5 text-ui-subhead truncate text-fg-muted border-b border-edge-subtle"
          >
            Search all files…
          </button>
          {leaf.openFilePaths.map((path) => {
            const fileState = openFiles[path];
            return (
              <button
                key={path}
                type="button"
                onClick={() => {
                  setActivePaneId(leaf.id);
                  setActiveFilePath(path);
                  setShowList(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-ui-subhead truncate ${
                  path === activePath ? "text-accent" : "text-fg-muted"
                }`}
              >
                {fileState?.fileName || path.split("/").pop()}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
