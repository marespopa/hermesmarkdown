import { atom } from "jotai";
import { atom_homePins } from "./ui-atoms";
import { atom_vaultKey } from "./vault-atoms";
import { remapPath } from "./utils";

const NO_PINS: string[] = [];

// The open vault's Home pins, newest first.
export const atom_homePinnedPaths = atom((get) => {
  const vaultKey = get(atom_vaultKey);
  return (vaultKey && get(atom_homePins)[vaultKey]) || NO_PINS;
});

// Pins a note to the top of the Home feed, or unpins it. No-op without a vault.
export const atom_toggleHomePin = atom(null, (get, set, path: string) => {
  const vaultKey = get(atom_vaultKey);
  if (!vaultKey || !path) return;
  set(atom_homePins, (prev) => {
    const current = prev[vaultKey] ?? [];
    const pins = current.includes(path) ? current.filter((p) => p !== path) : [path, ...current];
    const next = { ...prev, [vaultKey]: pins };
    if (!pins.length) delete next[vaultKey];
    return next;
  });
});

// Unpins a deleted note, or every note under a deleted folder.
export const atom_forgetHomePins = atom(null, (get, set, deletedPath: string) => {
  const vaultKey = get(atom_vaultKey);
  if (!vaultKey || !deletedPath) return;
  set(atom_homePins, (prev) => {
    const pins = prev[vaultKey];
    if (!pins) return prev;
    const kept = pins.filter((p) => remapPath(p, deletedPath, deletedPath) === null);
    if (kept.length === pins.length) return prev;
    const next = { ...prev, [vaultKey]: kept };
    if (!kept.length) delete next[vaultKey];
    return next;
  });
});

// The Home feed's tag filter, per vault: notes must carry every tag. Kept for
// the session only, so it survives opening a note and coming back, but never
// greets you as a forgotten filter on the next launch.
const atom_homeTagFilters = atom<Record<string, string[]>>({});
const NO_TAGS: string[] = [];

export const atom_homeTagFilter = atom(
  (get) => {
    const vaultKey = get(atom_vaultKey);
    return (vaultKey && get(atom_homeTagFilters)[vaultKey]) || NO_TAGS;
  },
  (get, set, tags: string[]) => {
    const vaultKey = get(atom_vaultKey);
    if (!vaultKey) return;
    set(atom_homeTagFilters, (prev) => ({ ...prev, [vaultKey]: tags }));
  },
);
