"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atom_pinnedNotePaths, atom_pinsState, atom_updatePins } from "@/app/atoms/pin-atoms";
import { atom_palettePinnedItems, type PalettePinnedItem } from "@/app/atoms/ui-atoms";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";
import { showErrorToast } from "@/app/components/Toastr";
import { usePins } from "@/app/hooks/use-pins";
import { addPins } from "@/app/services/vault-pins-format";
import { MAX_PINS, pinnedKey, type Row } from "./palette-model";

// The palette's pins. Notes are the vault's pinned notes (`.hermes/pins.yaml`,
// pin-atoms.ts), in pin order, the same ones the sidebar's Pinned section
// lists, so a note pinned here, from a tab or from the More menu is pinned
// everywhere. Commands are the palette's own (`atom_palettePinnedItems`, up
// to MAX_PINS). Notes the palette pinned itself before are added to the
// vault's pins once a vault is open, in one write, and dropped from the
// palette's own list only once that write went through.
export function usePalettePins() {
  const pinnedNotePaths = useAtomValue(atom_pinnedNotePaths);
  const { togglePin: togglePinAs } = usePins();
  const updatePins = useSetAtom(atom_updatePins);
  const [paletteItems, setPaletteItems] = useAtom(atom_palettePinnedItems);
  const vaultKey = useAtomValue(atom_vaultKey);
  // Once the open vault's pins file has been read (and is valid).
  const pinsReady = useAtomValue(atom_pinsState).status === "ok";
  const migrating = useRef(false);

  useEffect(() => {
    if (!pinsReady || migrating.current) return;
    const notes = paletteItems.filter((item) => item.kind === "file").map((item) => item.id);
    if (!notes.length) return;
    migrating.current = true;
    void updatePins((doc) => addPins(doc, notes.map((target) => ({ kind: "note" as const, target })))).then((result) => {
      migrating.current = false;
      if (result !== "ok" && result !== "unchanged") return;
      setPaletteItems((previous) => previous.filter((item) => item.kind !== "file" || !notes.includes(item.id)));
    });
  }, [pinsReady, paletteItems, updatePins, setPaletteItems]);

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
        showErrorToast("Open a vault to pin notes");
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
