import { atom } from "jotai";
import { selectAtom } from "jotai/utils";
import toast from "react-hot-toast";
import { PinsFileInvalidError, PinsFileNewerError, updatePinsFile } from "@/app/services/vault-pins";
import { forgetPinPaths, listedPins, remapPinPaths, samePins, type Pin, type PinsDocument } from "@/app/services/vault-pins-format";
import { remapPath } from "./utils";

// The open vault's pins, as last read from its `.hermesmarkdown/pins.yaml`
// (usePinsSync keeps them in step with the file) or written by the app
// (atom_updatePins, the only writer). `vault` is the vault they were read
// from: writes go there, so this module never imports vault-atoms (which
// calls atom_remapPins) and there's no import cycle.
// While "loading", `pins` are the ones this device last read for the vault
// (pins-cache.ts) when `cached` is set, else none yet.
export interface PinsState {
  vault: FileSystemDirectoryHandle | null;
  status: "none" | "loading" | "ok" | "invalid";
  pins: readonly Pin[];
  cached?: boolean;
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

export const PINS_INVALID_MESSAGE = "“.hermesmarkdown/pins.yaml” isn't valid YAML. Fix it, then try again.";
export const PINS_NEWER_MESSAGE = "“.hermesmarkdown/pins.yaml” was saved by a newer version of HermesMarkdown.";
export const PINS_ERROR_MESSAGE = "Couldn't save pins";

export type PinsWriteResult = "ok" | "unchanged" | "no-vault" | "invalid" | "newer" | "error";
export type PinsEdit = Parameters<typeof updatePinsFile>[1];

// The app's pin writes still in flight. While any is, usePinsSync doesn't
// apply what it reads: the file may not have the change shown yet.
let pendingWrites = 0;
export const pinsWritePending = () => pendingWrites > 0;

// The pins on screen as a document: the same edits apply to it as to the file
// for every listed pin (the file's hidden entries only keep their places).
const docOf = (pins: readonly Pin[]): PinsDocument => ({
  root: {},
  items: pins.map(({ kind, target, icon }) => (icon ? { [kind]: target, icon } : { [kind]: target })),
});

// Applies one edit to the file (read fresh, refused when it's invalid or
// newer, toasting why). The edit shows at once, applied to the pins on
// screen, and once the last write in flight lands the pins it wrote show
// (the file always wins), unless the vault changed meanwhile; a refused or
// failed write puts back the pins from before. No-op without a vault.
export const atom_updatePins = atom(null, async (get, set, edit: PinsEdit): Promise<PinsWriteResult> => {
  const before = get(atom_pinsState);
  const { vault } = before;
  if (!vault) return "no-vault";
  let shown: PinsState | null = null;
  if (before.status === "ok") {
    const next = edit(docOf(before.pins), [...before.pins]);
    if (next) {
      shown = { vault, status: "ok", pins: listedPins(next) };
      set(atom_pinsState, shown);
    }
  }
  // Puts back the pins from before when nothing changed them since.
  const undo = (state: PinsState) => {
    if (shown && get(atom_pinsState) === shown) set(atom_pinsState, state);
  };
  pendingWrites++;
  try {
    const { pins, changed } = await updatePinsFile(vault, edit);
    pendingWrites--;
    const current = get(atom_pinsState);
    if (!pendingWrites && current.vault === vault && (current.status !== "ok" || !samePins(current.pins, pins))) {
      set(atom_pinsState, { vault, status: "ok", pins });
    }
    return changed ? "ok" : "unchanged";
  } catch (err) {
    pendingWrites--;
    if (err instanceof PinsFileInvalidError) {
      undo(before);
      const current = get(atom_pinsState);
      if (current.vault === vault) set(atom_pinsState, { ...current, status: "invalid" });
      toast.error(PINS_INVALID_MESSAGE);
      return "invalid";
    }
    undo(before);
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
