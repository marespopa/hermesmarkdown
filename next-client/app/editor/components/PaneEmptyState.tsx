"use client";

import React, { useRef } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { HiOutlineDocumentText, HiOutlineDotsHorizontal, HiOutlineFolderOpen, HiOutlinePlus } from "react-icons/hi";
import { atom_activeFilePath, atom_activePaneId, atom_openDraft, atom_vaultHandle } from "@/app/atoms/atoms";
import { focusPaneEditorWhenReady } from "../utils/focus-pane-editor";
import Button from "@/app/components/Button";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { formatShortcut, isMacPlatform } from "@/app/utils/platform";
import VaultActionButtons from "./VaultActionButtons";

interface PaneEmptyStateProps {
  /** Loads text picked from the device into the draft. */
  onLoadDraft: (text: string) => void;
}

// What a pane shows with no tabs open: new file, open a note (palette) or
// file (device), vault actions when no vault is open, and a palette hint.
export default function PaneEmptyState({ onLoadDraft }: PaneEmptyStateProps) {
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const setActiveFilePath = useSetAtom(atom_activeFilePath);
  const openDraft = useSetAtom(atom_openDraft);
  const store = useStore();
  const { importFile, isVaultSupported, isBrowserVaultSupported } = useFileSystem();
  const { open: openCommandPalette } = useCommandPalette();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newFileShortcut = isMacPlatform() ? "⌃⌥N" : "Ctrl+Alt+N";

  // A blank draft, no dialogs: in a vault it's saved on its first save.
  const handleNewFile = (e: React.MouseEvent<HTMLElement>) => {
    // This click runs before the pane's own click makes it active.
    const paneId = e.currentTarget.closest<HTMLElement>("[data-pane-id]")?.dataset.paneId;
    openDraft(paneId);
    const activePaneId = store.get(atom_activePaneId);
    if (activePaneId) focusPaneEditorWhenReady(activePaneId);
  };

  const handleOpenFile = async () => {
    // With a vault open, "Open File" should pick from the vault, not the
    // local disk — the command palette already does fuzzy vault file search.
    if (vaultHandle) {
      openCommandPalette();
      return;
    }
    const result = await importFile();
    if (result === null) fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      onLoadDraft(event.target?.result as string);
      setActiveFilePath("draft");
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-edge bg-paper-light text-sage dark:bg-paper-dark-surface">
          <HiOutlineDocumentText size={26} />
        </div>
        <h2 className="text-ui-title-3 text-fg">Start writing</h2>
        <p className="mt-2 max-w-sm text-ui-footnote leading-relaxed text-fg-muted">
          {vaultHandle
            ? "Create a new note or open one from your vault."
            : "Create a new note, open a file from your device, or connect a vault."}
        </p>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="primary" onClick={handleNewFile} className="w-full sm:w-auto">
            <HiOutlinePlus size={17} />
            New File
            <kbd className="rounded border border-white/30 bg-white/10 px-1.5 py-0.5 font-mono text-ui-micro font-medium">
              {newFileShortcut}
            </kbd>
          </Button>
          <Button variant="secondary" onClick={handleOpenFile} className="w-full sm:w-auto">
            <HiOutlineFolderOpen size={17} />
            {vaultHandle ? "Open Note" : "Open File"}
          </Button>
        </div>
        {!vaultHandle && (isVaultSupported || isBrowserVaultSupported) && (
          <div className="mt-5 flex w-full flex-col items-center gap-2 border-t border-edge pt-5">
            <p className="text-ui-caption text-fg-muted">
              {isVaultSupported
                ? "Keep your notes together in a local vault."
                : "Keep your notes together in a vault stored in this browser."}
            </p>
            <VaultActionButtons />
          </div>
        )}
        <Button variant="bare" onClick={() => openCommandPalette(">")} className="mt-5 gap-2 text-fg-muted">
          <HiOutlineDotsHorizontal size={16} />
          Browse all commands
          <span className="rounded border border-edge bg-paper-light px-1.5 py-0.5 font-mono text-ui-micro dark:bg-paper-dark">
            {formatShortcut("K", { shift: true })}
          </span>
        </Button>
      </div>
      {/* No component for a hidden file picker; used when the native picker isn't available. */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".md,.txt,.markdown" className="hidden" />
    </div>
  );
}
