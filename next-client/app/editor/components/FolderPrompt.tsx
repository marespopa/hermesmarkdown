"use client";

import React from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_openFiles } from "@/app/atoms/atoms";
import { atom_folderPromptDismissed } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { useFileSystem } from "@/app/hooks/use-file-system";

interface FolderPromptProps {
  onChooseFolder: () => void;
  onDownload: () => void;
}

const bar = "typing-chrome fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 flex justify-center px-4 pointer-events-none";

// Asks where notes live once there is something to keep: shown while no
// vault is open and the draft has text. One sentence, one primary action
// (Choose Folder…, or Keep Notes in This Browser where folders can't be
// opened, or Download where neither works) and Not Now, which shrinks it to
// a quiet "Not saved to a folder" mark that opens it again. It fades with
// the rest of the chrome while you type. The editor page decides when it
// can show (no vault, not locked, not on the home feed).
export default function FolderPrompt({ onChooseFolder, onDownload }: FolderPromptProps) {
  const hasText = !!useAtomValue(atom_openFiles).draft?.content.trim();
  const [dismissed, setDismissed] = useAtom(atom_folderPromptDismissed);
  const { isVaultSupported, isBrowserVaultSupported } = useFileSystem();
  if (!hasText) return null;

  if (dismissed) {
    return (
      <div className={bar}>
        <Button
          variant="unstyled"
          onClick={() => setDismissed(false)}
          className="glass-panel pointer-events-auto h-7 rounded-full px-3 text-ui-caption text-fg-muted hover:text-fg transition-colors"
        >
          Not saved to a folder
        </Button>
      </div>
    );
  }

  const canChoose = isVaultSupported || isBrowserVaultSupported;
  const detail = isVaultSupported
    ? "Until then, this note is kept only in this browser."
    : isBrowserVaultSupported
      ? "This browser can't open folders, so notes are kept in its storage."
      : "This browser can't save notes. Download a copy to keep it.";
  const primaryLabel = isVaultSupported ? "Choose Folder…" : isBrowserVaultSupported ? "Keep Notes in This Browser" : "Download";

  return (
    <div className={bar}>
      <section
        aria-label="Where your notes live"
        className="glass-panel pointer-events-auto flex max-w-xl flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl py-2 pl-4 pr-2"
      >
        <p className="min-w-0 flex-1 basis-56 text-ui-footnote text-fg">
          <span className="font-semibold">Choose where your notes live.</span>{" "}
          <span className="text-fg-muted">{detail}</span>
        </p>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="tertiary" onClick={() => setDismissed(true)} className="!h-9">
            Not Now
          </Button>
          <Button variant="primary" onClick={canChoose ? onChooseFolder : onDownload} className="!h-9 !px-4">
            {primaryLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
