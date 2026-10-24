"use client";

import { useCallback, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_pinnedNotePaths } from "@/app/atoms/pin-atoms";
import { atom_palettePinnedItems, type PalettePinnedItem } from "@/app/atoms/ui-atoms";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";
import { showErrorToast } from "@/app/components/Toastr";
import { usePins } from "@/app/hooks/use-pins";
import { MAX_PINS, pinnedKey, type Row } from "./palette-model";

// The palette's pins. Notes are the vault's pinned notes (pin-atoms.ts), in
// pin order, the same ones the sidebar's Pinned section lists, so a note
// pinned here, from a tab or from the More menu is pinned everywhere.
// Commands are the palette's own (`atom_palettePinnedItems`, up to MAX_PINS).
export function usePalettePins() {
  const pinnedNotePaths = useAtomValue(atom_pinnedNotePaths);
  const { togglePin: togglePinAs } = usePins();
  const [paletteItems, setPaletteItems] = useAtom(atom_palettePinnedItems);
  const vaultKey = useAtomValue(atom_vaultKey);
  // Notes first (in pin order), then commands.
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
        showErrorToast("Open a vault to pin files");
        return;
      }
      void togglePinAs("note", row.id);
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
  }, [vaultKey, togglePinAs, setPaletteItems]);

  return { pinnedItems, isPinned, togglePin };
}
