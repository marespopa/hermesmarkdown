"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "jotai";
import { atom_globalDialog, atom_quickJot } from "@/app/atoms/ui-atoms";
import { useCommandPalette, useRegisterCommand } from "@/app/components/CommandPalette/CommandPaletteContext";
import { showErrorToast } from "@/app/components/Toastr";
import { isMacPlatform } from "@/app/utils/platform";
import { isQuickJotShortcut, quickJotShortcutLabel } from "../utils/tab-shortcuts";

// The ways into Quick jot: the "Quick jot" palette command and Ctrl+Alt+J
// (⌃⌥J). `onRefocus` runs when the shortcut is pressed while the input is
// already open. With `disabledReason` the command is disabled and the
// shortcut shows the reason as an error toast.
export function useQuickJotEntry({ disabledReason, onRefocus }: { disabledReason?: string; onRefocus: () => void }) {
  const store = useStore();
  const { isOpen: isPaletteOpen, close: closePalette } = useCommandPalette();
  const open = useCallback(() => store.set(atom_quickJot, (s) => ({ ...s, open: true })), [store]);

  useRegisterCommand({
    id: "quick-jot",
    label: "Quick jot",
    category: "Document",
    shortcut: quickJotShortcutLabel(isMacPlatform()),
    keywords: "jot log capture today daily sheet worklog append quick note",
    disabledReason,
    // The palette closes first so its focus goes back to the editor; the
    // input then returns focus there when it closes.
    action: () => {
      closePalette();
      requestAnimationFrame(open);
    },
  });

  const latest = useRef({ disabledReason, isPaletteOpen, onRefocus, open });
  latest.current = { disabledReason, isPaletteOpen, onRefocus, open };

  useEffect(() => {
    const mac = isMacPlatform();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isQuickJotShortcut(e, mac)) return;
      const { disabledReason: reason, isPaletteOpen: paletteOpen, onRefocus: refocus, open: show } = latest.current;
      if (paletteOpen || store.get(atom_globalDialog)) return;
      e.preventDefault();
      if (reason) {
        showErrorToast(reason);
        return;
      }
      if (store.get(atom_quickJot).open) refocus();
      else show();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [store]);
}
