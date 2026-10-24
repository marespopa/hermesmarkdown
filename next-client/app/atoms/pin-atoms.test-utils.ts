import type { createStore } from "jotai";
import type { Pin } from "@/app/services/pins-model";
import { atom_pinsByVault, atom_pinsVaultKey } from "./pin-atoms";

// A store with `pins` as the open vault's (`key`) pins.
export function seedPins(store: ReturnType<typeof createStore>, pins: readonly Pin[], key = "local:Notes"): void {
  store.set(atom_pinsByVault, (prev) => ({ ...prev, [key]: pins.map(({ kind, target, icon }) => ({ kind, target, icon })) }));
  store.set(atom_pinsVaultKey, key);
}
