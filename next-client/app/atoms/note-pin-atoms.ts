import { atom } from "jotai";
import { atom_notePins } from "./ui-atoms";
import { atom_vaultKey } from "./vault-atoms";
import { remapPath } from "./utils";

const NO_PINS: string[] = [];

// The open vault's pinned notes, newest first: first in the command palette
// (with nothing typed) and at the top of the sidebar's Files.
export const atom_pinnedNotePaths = atom((get) => {
  const vaultKey = get(atom_vaultKey);
  return (vaultKey && get(atom_notePins)[vaultKey]) || NO_PINS;
});

// Pins a note, or unpins it. No-op without a vault.
export const atom_toggleNotePin = atom(null, (get, set, path: string) => {
  const vaultKey = get(atom_vaultKey);
  if (!vaultKey || !path) return;
  set(atom_notePins, (prev) => {
    const current = prev[vaultKey] ?? [];
    const pins = current.includes(path) ? current.filter((p) => p !== path) : [path, ...current];
    const next = { ...prev, [vaultKey]: pins };
    if (!pins.length) delete next[vaultKey];
    return next;
  });
});

// Unpins a deleted note, or every note under a deleted folder.
export const atom_forgetNotePins = atom(null, (get, set, deletedPath: string) => {
  const vaultKey = get(atom_vaultKey);
  if (!vaultKey || !deletedPath) return;
  set(atom_notePins, (prev) => {
    const pins = prev[vaultKey];
    if (!pins) return prev;
    const kept = pins.filter((p) => remapPath(p, deletedPath, deletedPath) === null);
    if (kept.length === pins.length) return prev;
    const next = { ...prev, [vaultKey]: kept };
    if (!kept.length) delete next[vaultKey];
    return next;
  });
});
