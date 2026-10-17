"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atom_pinnedNotePaths, atom_toggleNotePin } from "@/app/atoms/note-pin-atoms";
import { atom_palettePinnedItems, type PalettePinnedItem } from "@/app/atoms/ui-atoms";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";
import { showErrorToast } from "@/app/components/Toastr";
import { MAX_PINS, pinnedKey, type Row } from "./palette-model";

// The palette's pins. Notes are the app's one set of pinned notes (per vault,
// note-pin-atoms.ts), the same ones the sidebar lists first in Files, so a
// note pinned here, from a tab or from the More menu is pinned everywhere.
// Commands are the palette's own (`atom_palettePinnedItems`, up to MAX_PINS).
// Notes the palette pinned itself before the two were one move over once a
// vault is open.
export function usePalettePins() {
  const pinnedNotePaths = useAtomValue(atom_pinnedNotePaths);
  const toggleNotePin = useSetAtom(atom_toggleNotePin);
  const [paletteItems, setPaletteItems] = useAtom(atom_palettePinnedItems);
  const vaultKey = useAtomValue(atom_vaultKey);

  useEffect(() => {
    if (!vaultKey || !paletteItems.some((item) => item.kind === "file")) return;
    for (const item of paletteItems) {
      if (item.kind === "file" && !pinnedNotePaths.includes(item.id)) toggleNotePin(item.id);
    }
    setPaletteItems((previous) => previous.filter((item) => item.kind !== "file"));
  }, [vaultKey, paletteItems, pinnedNotePaths, toggleNotePin, setPaletteItems]);

  // Notes first (newest pin first), then commands.
  const pinnedItems = useMemo<PalettePinnedItem[]>(() => [
    ...pinnedNotePaths.map((path): PalettePinnedItem => ({ kind: "file", id: path })),
    ...paletteItems.filter((item) => item.kind === "command"),
  ], [pinnedNotePaths, paletteItems]);

  const isPinned = useCallback(
    (row: Row) => (row.kind === "file" || row.kind === "command") && pinnedItems.some((item) => pinnedKey(item) === `${row.kind}:${row.id}`),
    [pinnedItems],
  );

  const togglePin = useCallback((row: Row | undefined) => {
    if (!row) return;
    if (row.kind === "file") {
      if (!vaultKey) {
        showErrorToast("Open a vault to pin notes");
        return;
      }
      toggleNotePin(row.id);
      return;
    }
    if (row.kind !== "command") return;
    const item: PalettePinnedItem = { kind: "command", id: row.id };
    setPaletteItems((previous) => {
      if (previous.some((candidate) => pinnedKey(candidate) === pinnedKey(item))) {
        return previous.filter((candidate) => pinnedKey(candidate) !== pinnedKey(item));
      }
      if (previous.length >= MAX_PINS) {
        showErrorToast(`You can pin up to ${MAX_PINS} commands`);
        return previous;
      }
      return [...previous, item];
    });
  }, [vaultKey, toggleNotePin, setPaletteItems]);

  return { pinnedItems, isPinned, togglePin };
}
