"use client";

import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { Compartment, EditorState, StateEffect } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { atom_verifyingNotePath } from "@/app/atoms/ui-atoms";

// The editor takes no typing while its note, shown at once from memory, is
// checked against the disk (atom_verifyingNotePath, use-show-open-note.ts):
// a newer disk text then replaces it before any keystroke lands.
export function useVerifyingReadOnly(view: EditorView | null, filePath: string): void {
  const verifying = useAtomValue(atom_verifyingNotePath) === filePath;
  const [compartment] = useState(() => new Compartment());
  useEffect(() => {
    if (!view) return;
    const extension = EditorState.readOnly.of(verifying);
    if (compartment.get(view.state) === undefined) {
      if (!verifying) return;
      view.dispatch({ effects: StateEffect.appendConfig.of(compartment.of(extension)) });
    } else {
      view.dispatch({ effects: compartment.reconfigure(extension) });
    }
  }, [view, verifying, compartment]);
}
