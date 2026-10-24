import { atom } from "jotai";
import { atomWithStorage, createJSONStorage, selectAtom } from "jotai/utils";
import toast from "react-hot-toast";
import { forgetPinPaths, listedPins, pinsDocument, remapPinPaths, type Pin, type PinsDocument } from "@/app/services/pins-model";
import { remapPath } from "./utils";

// Pins are kept on this device only, never in the vault: every vault's pins,
// keyed by vault (atom_vaultKey), in localStorage. A browser that won't
// store them still shows them this session, and says so once.
type StoredPins = Record<string, { kind: string; target: string; icon: string | null }[]>;
const storage = createJSONStorage<StoredPins>(() => ({
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      toast.error("Couldn't save pins: this browser's storage is blocked or full.", { id: "pins-save" });
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Blocked: nothing to remove.
    }
  },
}));
export const PINS_STORAGE_KEY = "hermes_pins";
export const atom_pinsByVault = atomWithStorage<StoredPins>(PINS_STORAGE_KEY, {}, storage, { getOnInit: true });

// The open vault's key, set by useVaultPins (null without a vault). Kept
// here rather than read from vault-atoms, which calls atom_remapPins: no
// import cycle.
export const atom_pinsVaultKey = atom<string | null>(null);

const NO_PINS: readonly Pin[] = [];

// The open vault's pins, in order; anything odd in storage is dropped.
export const atom_pins = atom((get): readonly Pin[] => {
  const key = get(atom_pinsVaultKey);
  const stored = key ? get(atom_pinsByVault)[key] : undefined;
  if (!Array.isArray(stored)) return NO_PINS;
  return listedPins({
    items: stored.map((entry) => (entry && typeof entry === "object" && typeof entry.kind === "string"
      ? { [entry.kind]: entry.target, ...(entry.icon ? { icon: entry.icon } : {}) }
      : null)),
  });
});

const sameStrings = (a: string[], b: string[]) => a.length === b.length && a.every((value, i) => value === b[i]);

// Note paths in pin order: first in the empty command palette, and what the
// tree's and the note menu's Pin / Unpin read. The same array while they're
// unchanged (an icon change doesn't re-render the palette).
export const atom_pinnedNotePaths = selectAtom(
  atom_pins,
  (pins) => pins.filter((pin) => pin.kind === "note").map((pin) => pin.target),
  sameStrings,
);

export type PinsWriteResult = "ok" | "unchanged" | "no-vault";
// An edit of the pins as a document (pins-model.ts), given the pins too;
// null when nothing changes.
export type PinsEdit = (doc: PinsDocument, pins: Pin[]) => PinsDocument | null;

// Applies one edit to the open vault's pins, shown and saved at once.
export const atom_updatePins = atom(null, async (get, set, edit: PinsEdit): Promise<PinsWriteResult> => {
  const key = get(atom_pinsVaultKey);
  if (!key) return "no-vault";
  const current = get(atom_pins);
  const next = edit(pinsDocument(current), [...current]);
  if (!next) return "unchanged";
  const pins = listedPins(next).map(({ kind, target, icon }) => ({ kind, target, icon }));
  set(atom_pinsByVault, (prev) => ({ ...prev, [key]: pins }));
  return "ok";
});

const touchesPath = (pins: readonly Pin[], path: string, newPath: string) =>
  pins.some((pin) => (pin.kind === "note" || pin.kind === "folder") && remapPath(pin.target, path, newPath) !== null);

// A note or folder renamed or moved in the app (atom_remapVaultPaths): its
// pins, and those under it, follow. Changes nothing when no pin is affected.
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
