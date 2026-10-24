import { atom } from "jotai";
import { selectAtom } from "jotai/utils";
import toast from "react-hot-toast";
import { PinsFileInvalidError, PinsFileNewerError, updatePinsFile } from "@/app/services/vault-pins";
import { forgetPinPaths, remapPinPaths, samePins, type Pin } from "@/app/services/vault-pins-format";
import { remapPath } from "./utils";

// The open vault's pins, as last read from its `.hermes/pins.yaml`
// (usePinsSync keeps them in step with the file) or written by the app
// (atom_updatePins, the only writer). `vault` is the vault they were read
// from: writes go there, so this module never imports vault-atoms (which
// calls atom_remapPins) and there's no import cycle.
export interface PinsState {
  vault: FileSystemDirectoryHandle | null;
  status: "none" | "loading" | "ok" | "invalid";
  pins: readonly Pin[];
}
export const NO_PINS_STATE: PinsState = { vault: null, status: "none", pins: [] };
export const atom_pinsState = atom<PinsState>(NO_PINS_STATE);
export const atom_pins = atom((get) => get(atom_pinsState).pins);

const sameStrings = (a: string[], b: string[]) => a.length === b.length && a.every((value, i) => value === b[i]);

// Note paths in pin order: first in the empty command palette, and what the
// tree's and the note menu's Pin / Unpin read. The same array while they're
// unchanged (an icon change doesn't re-render the palette).
export const atom_pinnedNotePaths = selectAtom(
  atom_pins,
  (pins) => pins.filter((pin) => pin.kind === "note").map((pin) => pin.target),
  sameStrings,
);

export const PINS_INVALID_MESSAGE = "“.hermes/pins.yaml” isn't valid YAML. Fix it, then try again.";
export const PINS_NEWER_MESSAGE = "“.hermes/pins.yaml” was saved by a newer version of HermesMarkdown.";
export const PINS_ERROR_MESSAGE = "Couldn't save pins";

export type PinsWriteResult = "ok" | "unchanged" | "no-vault" | "invalid" | "newer" | "error";
export type PinsEdit = Parameters<typeof updatePinsFile>[1];

// Applies one edit to the file (read fresh, refused when it's invalid or
// newer, toasting why), then shows the pins it wrote, unless the vault
// changed meanwhile. No-op without a vault.
export const atom_updatePins = atom(null, async (get, set, edit: PinsEdit): Promise<PinsWriteResult> => {
  const { vault } = get(atom_pinsState);
  if (!vault) return "no-vault";
  try {
    const { pins, changed } = await updatePinsFile(vault, edit);
    const current = get(atom_pinsState);
    if (current.vault === vault && (current.status !== "ok" || !samePins(current.pins, pins))) {
      set(atom_pinsState, { vault, status: "ok", pins });
    }
    return changed ? "ok" : "unchanged";
  } catch (err) {
    if (err instanceof PinsFileInvalidError) {
      const current = get(atom_pinsState);
      if (current.vault === vault) set(atom_pinsState, { ...current, status: "invalid" });
      toast.error(PINS_INVALID_MESSAGE);
      return "invalid";
    }
    if (err instanceof PinsFileNewerError) {
      toast.error(PINS_NEWER_MESSAGE);
      return "newer";
    }
    console.warn("Couldn't save pins:", err);
    toast.error(PINS_ERROR_MESSAGE);
    return "error";
  }
});

const touchesPath = (pins: readonly Pin[], path: string, newPath: string) =>
  pins.some((pin) => (pin.kind === "note" || pin.kind === "folder") && remapPath(pin.target, path, newPath) !== null);

// A note or folder renamed or moved in the app (atom_remapVaultPaths): its
// pins, and those under it, follow. Writes nothing when no pin is affected.
export const atom_remapPins = atom(null, async (get, set, { oldPath, newPath }: { oldPath: string; newPath: string }) => {
  if (!oldPath || !newPath || oldPath === newPath || !touchesPath(get(atom_pins), oldPath, newPath)) return;
  await set(atom_updatePins, (doc) => remapPinPaths(doc, oldPath, newPath));
});

// A note or folder moved to the Trash in the app: its pins, and those under
// it, are removed.
export const atom_forgetPins = atom(null, async (get, set, deletedPath: string) => {
  if (!deletedPath || !touchesPath(get(atom_pins), deletedPath, deletedPath)) return;
  await set(atom_updatePins, (doc) => forgetPinPaths(doc, deletedPath));
});
