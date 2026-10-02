"use client";

import React, { useEffect, useRef } from "react";
import Button from "@/app/components/Button";
import SensitiveBadge from "@/app/components/SensitiveBadge";

interface SensitiveNoteVeilProps {
  title: string;
  /** Focus "Show note" when this pane is the active one. */
  isActivePane: boolean;
  onShowNote: () => void;
  onShowAll: () => void;
}

// Shown in place of the editor for a sensitive note until it's revealed. The
// note's text is never rendered here, only its title.
export default function SensitiveNoteVeil({ title, isActivePane, onShowNote, onShowAll }: SensitiveNoteVeilProps) {
  const showNoteRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isActivePane) showNoteRef.current?.focus({ preventScroll: true });
  }, [isActivePane]);

  return (
    <div className="flex h-full items-center justify-center p-6" data-testid="sensitive-note-veil">
      <section
        aria-label="Sensitive note"
        className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-edge bg-surface p-6 text-center"
      >
        <div className="flex flex-col items-center gap-1.5">
          <span className="flex items-center gap-1.5 text-ui-footnote font-medium text-fg-muted">
            <SensitiveBadge />
            Sensitive note
          </span>
          <h2 className="max-w-full truncate text-ui-body font-semibold text-fg">{title}</h2>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button ref={showNoteRef} variant="secondary" onClick={onShowNote} className="min-h-11 w-full">
            Show note
          </Button>
          <Button variant="tertiary" onClick={onShowAll} className="min-h-11 w-full">
            Show all sensitive notes this session
          </Button>
        </div>
      </section>
    </div>
  );
}
