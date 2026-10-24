import React from "react";
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it } from "vitest";
import { atom_pins, atom_pinsVaultKey } from "@/app/atoms/pin-atoms";
import { seedPins } from "@/app/atoms/pin-atoms.test-utils";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useVaultPins } from "./use-vault-pins";

const vault = { kind: "directory", name: "Notes" } as unknown as FileSystemDirectoryHandle;

function setup(enabled: boolean) {
  const store = createStore();
  store.set(atom_vaultHandle, vault);
  store.set(atom_vaultDescriptor, { kind: "local" });
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const hook = renderHook(({ on }) => useVaultPins(on), { wrapper, initialProps: { on: enabled } });
  return { store, ...hook };
}

describe("useVaultPins", () => {
  it("shows the open vault's pins, none while it's locked or closed", () => {
    const { store, rerender } = setup(false);
    expect(store.get(atom_pinsVaultKey)).toBeNull();

    rerender({ on: true });
    const key = store.get(atom_pinsVaultKey);
    expect(key).toBeTruthy();
    seedPins(store, [{ kind: "tag", target: "release", icon: null }], key!);
    expect(store.get(atom_pins)).toEqual([{ kind: "tag", target: "release", icon: null }]);

    store.set(atom_vaultHandle, null);
    store.set(atom_vaultDescriptor, null);
    rerender({ on: true });
    expect(store.get(atom_pins)).toEqual([]);
  });
});
